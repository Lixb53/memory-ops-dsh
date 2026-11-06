/**
 * agent 工具 —— 让模型按索引取用，而不是把整个库塞进上下文。
 *
 * 这是产品主线：**260 token 的索引换回 6 次命中，并让不命中的那 4 次驱动补齐**。
 * 所以 `memory_recall` 命中要记账（cite），未命中也要记账（miss）——
 * 未命中率才是这套系统唯一会自我进化的输入。
 *
 * 证据必填：G2/G3/G4 无 evidence 拒收，挡掉幻觉写入。
 */

import type { Actions } from '@memory-ops/core/actions'
import { ORIGINS, ORIGIN_NEEDS_EVIDENCE, type Origin } from '@memory-ops/core/schema'

/** 工具结果里给模型看的文本块。 */
interface TextBlock { type: 'text'; text: string }

/** 极简工具定义（只声明宿主用到的字段）。 */
interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
  output: {
    schema: Record<string, unknown>
    render(args: unknown, value: never): TextBlock[]
  }
  execute(args: never, exec: never): Promise<unknown>
}

/** 注册工具。 */
export function registerTools({ actions }: { actions: Actions }) {
  /** 把 store 里的一次检索结果渲染成模型可读文本。 */
  function attach(ctx: { tools: { register(definition: ToolDefinition): () => void } }): () => void {
    const disposers: (() => void)[] = []

    // ---- memory_recall ----
    disposers.push(ctx.tools.register({
      name: 'memory_recall',
      description: [
        '在「记忆库」里按关键词检索已沉淀的结论（个人域偏好/原则、工作域架构结论与踩坑台账）。',
        '命中时返回条目路径、标题、tokens 与片段；未命中会记一条 miss 供后续补齐。',
        '先用它判断「该读哪个文件」，再决定要不要读详情——不要一次读整个库。',
      ].join(' '),
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          query: { type: 'string', description: '检索词，可空格分隔多个' },
          project: { type: 'string', description: '限定项目名（work/<project> 的 project 部分），省略表示全部' },
          limit: { type: 'number', description: '返回条数上限，默认 5' },
          cite: {
            type: 'array',
            items: { type: 'string' },
            description: '本次**实际用到**的条目 id。读完详情后回填，用来算命中率（不填则只记 recall）',
          },
        },
        required: ['query'],
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            matched: { type: 'boolean' },
            total: { type: 'number' },
            cost: { type: 'number' },
            text: { type: 'string' },
            hits: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  id: { type: 'string' },
                  path: { type: 'string' },
                  title: { type: 'string' },
                  domainLabel: { type: 'string' },
                  tokens: { type: 'number' },
                  snippet: { type: 'string' },
                },
              },
            },
          },
          required: ['matched', 'total', 'text'],
        },
        render(_args: unknown, value: { text: string }): TextBlock[] {
          return [{ type: 'text', text: value.text }]
        },
      },
      async execute(rawArgs: unknown, exec: unknown) {
        const args = (rawArgs ?? {}) as {
          query?: string; project?: string; limit?: number; cite?: string[]
        }
        const agent = (exec as { agent?: { id?: string } } | undefined)?.agent
        const limit = Number.isFinite(args.limit) ? Number(args.limit) : 5
        const result = await actions.search({
          query: String(args.query ?? ''),
          project: args.project,
          session: agent?.id ?? 'agent',
        })

        /**
         * `cite` = 「这条记忆真的被我用上了」。
         *
         * 这是命中率的**分子**，而 `search` 只记分母（recall）。
         * 早先全仓没有任何地方写 cite，所以命中率恒为 0——
         * 分母一直涨、分子永远是零，那个指标从上线起就没通过。
         *
         * 为什么不在 search 里顺手记 cite：搜到 ≠ 用到。
         * 若搜到就算命中，命中率会虚高到接近 100%，这个指标就失去了意义。
         * 所以必须由模型在真正消费了某条记忆之后显式回填。
         */
        if (result.ok && Array.isArray(args.cite) && args.cite.length > 0) {
          const valid = args.cite.filter(id => result.hits.some(hit => hit.id === id))
          if (valid.length > 0) {
            await actions.store.recordCite({
              ids: valid,
              kind: 'cite',
              session: agent?.id ?? 'agent',
              query: String(args.query ?? ''),
            })
          }
        }
        if (!result.ok) {
          return { matched: false, total: 0, cost: 0, text: `记忆库检索失败：${result.error}` }
        }
        const hits = result.hits.slice(0, Math.max(1, limit)).map(hit => ({
          id: hit.id,
          path: hit.path,
          title: hit.title,
          domainLabel: hit.domainLabel,
          tokens: hit.tokens,
          snippet: hit.snippet,
        }))
        const lines = result.matched
          ? [
            `记忆库命中 ${result.total} 条（显示 ${hits.length} 条）：`,
            ...hits.map(hit => `- [${hit.domainLabel}] ${hit.title}（${hit.path} · ${hit.tokens} tokens）\n  ${hit.snippet}`),
            '',
            '读取详情请用 read 打开上面列出的路径；本层只回答「该读哪个文件」。',
          ]
          : [
            `记忆库未命中：「${String(args.query ?? '')}」。`,
            '这条未命中已记账——如果这次会话得出了结论，用 memory_write 写回，它就会变成下次的命中。',
          ]
        return {
          matched: result.matched,
          total: result.total,
          cost: result.cost,
          hits,
          text: lines.join('\n'),
        }
      },
    }))

    // ---- memory_write ----
    disposers.push(ctx.tools.register({
      name: 'memory_write',
      description: [
        '把一条已确认的结论写进「记忆库」（Markdown 真相源），或快速记一条 INBOX 想法。',
        'mode=inbox 只进记录流等待人工流转；mode=entry 直接落一个带 frontmatter 的条目。',
        '证据必填：origin 为 G2/G3/G4 时必须给 evidence，否则拒收（挡幻觉写入）。',
        '命中隐私闸门（密钥/私钥/身份证/内网 IP）会拒写并返回脱敏文本。',
      ].join(' '),
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          mode: { type: 'string', enum: ['inbox', 'entry'], description: 'inbox=速记进记录流；entry=落正式条目' },
          content: { type: 'string', description: '内容正文' },
          title: { type: 'string', description: 'mode=entry 时的标题' },
          kind: { type: 'string', description: 'inbox 类型：想法/计划/问题/待办/决策' },
          domain: { type: 'string', description: '域：personal 或 work/<project>' },
          path: { type: 'string', description: 'mode=entry 时的相对路径，省略则自动生成' },
          origin: { type: 'string', enum: [...ORIGINS], description: '写入来源闸门，默认 G2' },
          evidence: { type: 'string', description: '证据摘录（origin=G2/G3/G4 必填）' },
        },
        required: ['mode', 'content'],
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            ok: { type: 'boolean' },
            blocked: { type: 'boolean' },
            path: { type: 'string' },
            message: { type: 'string' },
            masked: { type: 'string' },
          },
          required: ['ok', 'message'],
        },
        render(_args: unknown, value: { message: string }): TextBlock[] {
          return [{ type: 'text', text: value.message }]
        },
      },
      async execute(rawArgs: unknown, exec: unknown) {
        const args = (rawArgs ?? {}) as {
          mode?: string; content?: string; title?: string; kind?: string
          domain?: string; path?: string; origin?: string; evidence?: string
        }
        const agent = (exec as { agent?: { id?: string } } | undefined)?.agent
        const session = agent?.id ?? 'agent'
        const mode = String(args.mode ?? 'inbox')
        const content = String(args.content ?? '').trim()
        const origin = String(args.origin ?? 'G2')

        if (content === '') return { ok: false, message: '内容不能为空' }
        if (!ORIGINS.includes(origin as never)) {
          return { ok: false, message: `origin 必须是 ${ORIGINS.join(' / ')}` }
        }

        if (mode === 'inbox') {
          // 捕获只进 INBOX 等人工流转，不直接进常驻——这是「写权限分级」的落地。
          //
          // ⚠️ 诚实声明：product.md §11.3 写的「G2 每日 50 条 / 单会话 15 条熔断」
          // **并未实现**。这里只有「只进 INBOX」这一层语义约束——它保证了
          // 自动写入不会直接变成被信任的结论，但没有任何计数拦截：
          // 模型在一个会话里写 500 条 INBOX 也不会被拒。
          // 单人使用下风险有限，但不要以为有熔断。
          const result = await actions.capture({
            content,
            kind: args.kind ?? '想法',
            domain: args.domain ?? 'personal',
            session,
          })
          if (!result.ok) {
            return {
              ok: false,
              blocked: result.blocked === true,
              masked: result.masked ?? '',
              message: result.blocked === true
                ? `隐私闸门拦截：${result.reason}\n脱敏后建议：${result.masked}`
                : `写入失败：${result.error ?? result.reason ?? '未知原因'}`,
            }
          }
          return {
            ok: true,
            path: result.captured.path,
            message: `已记入 ${result.captured.path}：${content}`,
          }
        }

        // 正式条目：无证据不得入库（挡幻觉写入）
        //
        // 用契约里的 ORIGIN_NEEDS_EVIDENCE 而不是硬编码 `origin !== 'G1'`：
        // 那个常量是 schema.ts 声明的「唯一真相」。硬编码看似等价，
        // 但将来若调整哪个闸门需要证据，改常量不会生效——契约就白写了。
        if (ORIGIN_NEEDS_EVIDENCE[origin as Origin] === true && String(args.evidence ?? '').trim() === '') {
          return { ok: false, message: '证据必填：origin 为 G2/G3/G4 时必须给 evidence（无证据不得入库）' }
        }

        const date = new Date().toISOString().slice(0, 10)
        const domain = String(args.domain ?? 'personal')
        const slug = String(args.title ?? content).slice(0, 24).replace(/[^\w\u4e00-\u9fff-]+/g, '-')
        const relPath = typeof args.path === 'string' && args.path.trim() !== ''
          ? args.path.trim()
          : `${domain.startsWith('work/') ? domain : 'personal'}/notes/${date}-${slug}.md`

        try {
          const entry = await actions.store.createEntry({
            relPath,
            frontmatter: {
              title: args.title ?? slug,
              kind: 'fact',
              layer: 'l2',
              status: origin === 'G1' ? 'confirmed' : 'observed',
              confidence: origin === 'G1' ? 0.9 : 0.5,
              origin,
              evidence: origin === 'G1'
                ? []
                : [{ session, excerpt: String(args.evidence).slice(0, 160), gate: origin }],
            },
            body: `\n# ${args.title ?? slug}\n\n${content}\n`,
          })
          await actions.store.appendEvent({ session, kind: 'write', ids: [entry.id], query: slug })
          return {
            ok: true,
            path: relPath,
            message: `已写入 ${relPath}（${entry.tokens} tokens，状态 ${entry.status}）`,
          }
        } catch (error) {
          return {
            ok: false,
            message: `写入失败：${error instanceof Error ? error.message : String(error)}`,
          }
        }
      },
    }))

    return () => {
      for (const dispose of disposers) dispose()
    }
  }

  return { attach }
}
