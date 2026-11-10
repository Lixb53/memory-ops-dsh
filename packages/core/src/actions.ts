/**
 * 能力层 —— 30 条能力的**唯一实现**，host 路由与 agent 工具都调这里。
 *
 * 为什么要有这一层：如果 HTTP 桥和工具各写一份「改状态」，
 * 三个月后两条路径的行为必然分叉（Web 端与插件端已经踩过一次）。
 * 所以能力只有一份，两端口只是传输方式不同。
 */

import {
  CONFIDENCE_STATES, INBOX_KINDS, INBOX_STATES, STATE_CONFIDENCE, MISS_VERIFY_DAYS,
  FILE_LINE_LIMIT, FILE_TOKEN_SOFT_LIMIT, RESIDENT_TOKEN_BUDGET, REINFORCE_MIN_SESSIONS,
  canHumanTransition, canTransition, estimateTokens, expiryOf, needsDecision, orEmpty, truncate,
  type InboxKind, type InboxState, type ConfidenceState,
} from './schema.ts'
import { projectAliasesOf, resolveProject, type ProjectResolution } from './project.ts'
import { searchEntries, searchCost, type SearchHit } from './search.ts'
import { inspectText, auditRecord } from './privacy.ts'
import { parseSections } from './parse.ts'
import {
  compactBody, needsCompact, planPromotions, planRepairs, verifyAnchors, weeklyReview,
  type AnchorReader,
} from './maintenance.ts'
import type { MemoryEntry, Store } from './store.ts'

/** 一个常驻 skill 的 description（每请求付费的那部分）。 */
export interface ResidentSkill {
  name: string
  path: string
  description: string
  descriptionTokens: number
}

/**
 * `<available_skills>` 目录的固定框架文字（实测 171 tokens）。
 * 这部分与 skill 数量无关，是宿主注入的固定开销；
 * 记在这里是为了让「常驻前缀」的口径可复算，而不是凭印象。
 */
export const SKILL_CATALOG_FRAME_TOKENS = 171

/** 统一的失败结果。 */
export interface ActionFailure {
  ok: false
  error?: string
  /** 命中隐私闸门。 */
  blocked?: boolean
  /** 拦截原因（人可读）。 */
  reason?: string
  /** 脱敏后的可用文本。 */
  masked?: string
  /** 审计记录（不含原文）。 */
  audit?: ReturnType<typeof auditRecord>
  hint?: string
}

/** 捕获成功的结果。 */
export interface CaptureSuccess {
  ok: true
  captured: { path: string; row: unknown }
  privacy: { blocked: false }
}

/** 捕获结果。 */
export type CaptureOutcome = CaptureSuccess | ActionFailure

/** 批量捕获结果。 */
export interface CaptureBatchOutcome {
  ok: boolean
  accepted?: string[]
  blocked?: { line: string; reason: string }[]
  total?: number
  error?: string
}

/** 统一包装：所有能力都返回 `{ ok, ... }`。 */
async function guard<T extends object>(run: () => Promise<T>): Promise<{ ok: true } & T | ActionFailure> {
  try {
    return { ok: true, ...(await run()) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * 条目的对外投影（UI 只需要这些字段）。
 *
 * `citeCount` 由调用方传入引用计数表——投影本身是纯函数，不读事件流。
 * 设计稿上每张卡片都显示「N 次引用」，那是判断「这条还活着吗」的关键信号，
 * 早先只有详情页里有，列表上看不到。
 */
function projectEntry(entry: MemoryEntry, nowMs: number, citeCounts?: Map<string, number>) {
  return {
    id: entry.id,
    path: entry.path,
    title: entry.title,
    domain: entry.domain,
    domainLabel: entry.domainLabel,
    project: entry.project,
    layer: entry.layer,
    status: entry.status,
    confidence: entry.confidence ?? STATE_CONFIDENCE[entry.status as ConfidenceState] ?? null,
    kind: entry.kind,
    tags: entry.tags,
    tokens: entry.tokens,
    bytes: entry.bytes,
    lines: entry.lines,
    overLineLimit: entry.overLineLimit,
    pinned: entry.pinned,
    updatedAt: entry.updatedAt,
    origin: entry.origin,
    evidence: entry.evidence,
    anchor: entry.anchor,
    expiry: expiryOf(entry, nowMs),
    /** 被 cite 的次数（真正被用上的次数，不含 recall）。 */
    citeCount: citeCounts?.get(entry.id) ?? 0,
  }
}

/** 从事件流统计每个条目的 cite 次数。 */
function citeCountsOf(events: { kind?: string; ids?: string[] }[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const event of events) {
    if (event.kind !== 'cite') continue
    for (const id of event.ids ?? []) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

/** 建能力集合。 */
export function createActions({ store, now = () => Date.now(), readExternal }: {
  store: Store
  now?: () => number
  /**
   * 读「真相源之外」的文件——锚点校验要用。
   *
   * 为什么不直接用 fs：core 的其余部分只碰 `~/.memory-ops/`，
   * 而锚点指向的是**代码仓库**里的文件（`anchor.path` 相对某个仓库根）。
   * 把它抽成注入项，测试就能用假仓库，而不用在真磁盘上造一棵目录树。
   */
  readExternal?: AnchorReader
}) {
  /**
   * 读全量并附派生字段。
   *
   * `cwd` 是**可选**的诊断输入：给了它，返回里会带 `resolution`，
   * 说明「这个 cwd 被解析成了哪个项目、凭什么」。这不是必须的——
   * 显式传 `project` 的老调用方行为完全不变。
   */
  async function snapshot({ project, domain, cwd }: {
    project?: string | null; domain?: string | null; cwd?: string | null
  } = {}) {
    return guard(async () => {
      const entries = await store.scan()
      const events = await store.readEvents()
      const misses = await store.readMisses()

      /**
       * 只给了 cwd 没给 project 时，先把 cwd 解析成项目。
       *
       * 为什么不在客户端解析：别名来自 `work/<project>/index.md`，
       * 那是库里的数据，客户端看不到；放到 core 才能保证
       * 「UI 看到的项目」与「agent 检索用的项目」是同一个判定。
       */
      let resolution: ProjectResolution | null = null
      let effectiveProject = project
      if ((project === undefined || project === null || project === '') && typeof cwd === 'string' && cwd.trim() !== '') {
        resolution = resolveProject(cwd, projectAliasesOf(entries))
        effectiveProject = resolution.project
      }
      const projectFilter = effectiveProject

      const filtered = entries.filter((entry) => {
        if (projectFilter !== undefined && projectFilter !== null && projectFilter !== '' && entry.project !== projectFilter) return false
        if (domain !== undefined && domain !== null && domain !== '' && entry.domain !== domain) return false
        return true
      })

      // **统计必须跟着过滤走**。
      // 早先用全量 entries 算 stats，导致「本项目」分区在该项目 0 条记忆时
      // 仍显示常驻前缀 286——一个自相矛盾的画面（0 条 + 286 tokens）。
      // 项目视图要回答的是「这个项目占多少」，不是「整个库占多少」。
      const scoped = projectFilter !== undefined && projectFilter !== null && projectFilter !== ''
        || domain !== undefined && domain !== null && domain !== ''
      const stats = store.summarize(scoped ? filtered : entries, events, misses, { nowMs: now() })
      // 引用次数给列表用：设计稿每张卡片都显示「N 次引用」
      const citeCounts = citeCountsOf(events)

      const queue = filtered
        .filter(entry => needsDecision(entry, now()) || entry.status === 'stale')
        .map((entry) => {
          const expiry = expiryOf(entry, now())
          const kind = entry.status === 'stale'
            ? 'anchor'
            : expiry.level === 'retire' ? 'retire' : 'confirm'
          return {
            id: entry.id,
            path: entry.path,
            title: entry.title,
            domain: entry.domain,
            domainLabel: entry.domainLabel,
            status: entry.status,
            confidence: entry.confidence ?? STATE_CONFIDENCE[entry.status as ConfidenceState] ?? null,
            kind,
            evidence: (entry.evidence ?? []).slice(0, 1),
            origin: entry.origin,
            days: expiry.days,
            reason: kind === 'retire'
              ? `${expiry.days} 天未被引用`
              : kind === 'anchor' ? '锚点失效，待复核' : '推断待确认',
          }
        })
        .sort((a, b) => (b.days ?? 0) - (a.days ?? 0))

      return {
        root: store.root,
        projectScoped: projectFilter !== undefined && projectFilter !== null && projectFilter !== '',
        project: projectFilter ?? null,
        domain: domain ?? null,
        /**
         * 解析诊断：`null` 表示调用方没给 cwd（不是解析失败）。
         * 给了 cwd 就必须能回答「凭什么」，否则界面只能猜。
         */
        resolution,
        /** 库里有记忆的项目全集，供「你可能想要哪个」提示。 */
        knownProjects: projectAliasesOf(entries).map(item => item.name),
        entries: filtered.map(entry => projectEntry(entry, now(), citeCounts)),
        stats,
        queue,
        /**
         * 统计口径：`all` = 全库；`scoped` = 仅当前 project/domain。
         * UI 据此说明「这个数字覆盖了什么」，避免与总览的全库数字混淆。
         */
        statsScope: scoped ? 'scoped' : 'all',
        /** 当前项目自己的常驻索引（layer: l0）文件，供「本项目」分区展示。 */
        projectIndex: filtered
          .filter(entry => entry.layer === 'l0')
          .map(entry => ({ path: entry.path, title: entry.title, tokens: entry.tokens })),
        generatedAt: new Date(now()).toISOString(),
      }
    })
  }

  /**
   * 常驻前缀逐项拆解 —— 回答「这 N 个 tokens 到底是什么」。
   *
   * 拆成三类，因为它们**付费方式完全不同**，混在一起就会得出错误结论：
   *   1. `catalog`：skill description + `<available_skills>` 框架，**每个请求都付费**
   *   2. `index`：`layer: l0` 的索引文件，只在被 read 时才进上下文
   *   3. `frame`：其余固定文字
   *
   * 为什么必须拆开：product.md 把「两个 skill description」与「L0 索引文件」
   * 都记作「常驻前缀 286 tokens」，但实测前者是 190 + 171 框架 = 361，
   * 后者是 286。两个数字对不上，说明口径本身有歧义——而这个歧义会直接
   * 导致「该优化哪个」判断错。
   */
  function residentBreakdown(entries: MemoryEntry[], skills: ResidentSkill[]) {
    const indexItems = entries
      .filter(entry => entry.layer === 'l0')
      .map(entry => ({
        kind: 'index' as const,
        id: entry.id,
        path: entry.path,
        title: entry.title,
        tokens: entry.tokens,
        bytes: entry.bytes,
        lines: entry.lines,
        overLineLimit: entry.overLineLimit,
        // 索引是否真的进上下文，取决于它有没有被 skill 目录引用
        billed: false,
        note: '仅在被 read 时进上下文',
      }))

    const catalogItems = skills.map(skill => ({
      kind: 'catalog' as const,
      id: `skill.${skill.name}`,
      path: skill.path,
      title: skill.name,
      tokens: skill.descriptionTokens,
      bytes: skill.description.length,
      lines: 1,
      overLineLimit: false,
      billed: true,
      note: 'skill description，每请求付费',
    }))

    const indexTokens = indexItems.reduce((sum, item) => sum + item.tokens, 0)
    const catalogTokens = catalogItems.reduce((sum, item) => sum + item.tokens, 0)

    return {
      items: [...catalogItems, ...indexItems],
      catalogTokens,
      indexTokens,
      frameTokens: SKILL_CATALOG_FRAME_TOKENS,
      /** 真正每请求付费的部分：catalog + 框架。 */
      billedTokens: catalogTokens + SKILL_CATALOG_FRAME_TOKENS,
      /** 标了 l0 但按需加载的部分。 */
      onDemandTokens: indexTokens,
    }
  }

  /** 总览：KPI + 预算账本 + 三率 + 域统计。 */
  async function overview({ skillDescriptions = [], skillsError = '' }: {
    skillDescriptions?: ResidentSkill[]
    /** 为什么没读到 skill（空字符串表示没出问题）。 */
    skillsError?: string
  } = {}) {
    return guard(async () => {
      const entries = await store.scan()
      const events = await store.readEvents()
      const misses = await store.readMisses()
      const stats = store.summarize(entries, events, misses, { nowMs: now() })
      const l0 = stats.layers.l0.tokens
      const resident = residentBreakdown(entries, skillDescriptions)
      return {
        kpi: {
          /**
           * **`residentTokens` 是每请求付费的常驻前缀，不是 L0 索引体积。**
           *
           * 这里曾经取 `l0`（所有 `layer: l0` 文件之和），于是顶栏第一格显示的
           * 是「索引层 286」，而卡片上挂的却是「361」这个基准——两个数字对不上，
           * 且按它去优化会去删索引表，一分钱每请求成本都省不下来。
           * 详见 product.md §十二：361 = catalog 190 + 框架 171；286 = 索引文件之和。
           */
          residentTokens: resident.billedTokens,
          /** 索引层体积单列一格，两个数字各自有名字，不再互相冒充。 */
          indexTokens: l0,
          residentBudget: RESIDENT_TOKEN_BUDGET,
          hitRate: stats.rates.hitRate,
          confirmRate: stats.rates.confirmRate,
          expireRate: stats.rates.expireRate,
          pending: stats.counts.pending,
        },
        resident: {
          ...resident,
          /**
           * 三态，UI 必须区分：
           *   `ok`     有 catalog，数字可信
           *   `empty`  读到了但一个都没有（可能真是没装 skill）
           *   `error`  没读到（宿主没给服务 / list 抛错），此时 171 只是框架开销
           *
           * 不区分三态的话，「读不到」会伪装成「没有」，用户会以为 171 就是全部。
           */
          state: skillsError !== '' ? 'error' : (skillDescriptions.length === 0 ? 'empty' : 'ok'),
          error: skillsError,
        },
        /**
         * 预算账本 —— 三段各自的**付费方式**才是重点，不是数字本身。
         *
         * 这里曾经把 L0 的 `tokens` 填成 `l0` 文件之和（索引层 316），
         * 而 KPI 的「常驻前缀」是 billedTokens（每请求 171）。
         * 同一屏两个 L0 数字对不上，用户没法判断该信哪个、该优化哪个。
         *
         * 现在每段都带 `billing` 与 `advice`：说清「什么时候付费」和「超了该怎么办」。
         * 数字只有在能指导决策时才有价值。
         */
        budget: [
          {
            layer: 'L0',
            name: '常驻前缀',
            tokens: resident.billedTokens,
            files: skillDescriptions.length,
            limit: RESIDENT_TOKEN_BUDGET,
            billing: 'per-request',
            note: 'skill description + 目录框架，每个请求都付费',
            advice: '超了要压缩 skill description（改它才会省每请求成本）',
          },
          {
            layer: 'L1',
            name: '索引层',
            tokens: stats.layers.l1.tokens,
            files: stats.layers.l1.files,
            limit: 2048,
            billing: 'on-demand',
            note: '被 read 时才进上下文，不在每请求前缀里',
            advice: '超了拆索引文件；这只影响检索定位精度，不影响每请求账单',
          },
          {
            layer: 'L2',
            name: '详情层',
            tokens: stats.layers.l2.tokens,
            files: stats.layers.l2.files,
            limit: null,
            billing: 'on-demand',
            note: '单篇命中才读，总量大不直接等于贵',
            advice: '关注单篇体积（超 80 行 / 1200 tokens），而不是总量',
          },
          {
            /** 汇总行：把「L0 索引文件之和」这个容易混淆的数字单独摆出来。 */
            layer: 'L0*',
            name: '索引文件合计',
            tokens: l0,
            files: stats.layers.l0.files,
            limit: null,
            billing: 'on-demand',
            note: '标记 layer: l0 的文件之和，与「常驻前缀」不是同一个数',
            advice: '这个数字大不代表每请求贵；删它不会省每请求成本',
          },
        ],
        /**
         * 域统计**带明细**。
         *
         * 原来只给「sz-web 35 篇 / 63,030 tokens」——用户看到了数字却不知道是哪 35 篇，
         * 这个数字就无法验证、无法下钻、也就无法据此做任何事。
         * 所以每个域都带上自己的文件清单（按 tokens 降序，最重的排前面）。
         */
        domains: stats.domains.map(domain => ({
          ...domain,
          entries: entries
            .filter(entry => entry.domain === domain.key)
            .sort((a, b) => b.tokens - a.tokens)
            .map(entry => ({
              id: entry.id,
              path: entry.path,
              title: entry.title,
              layer: entry.layer,
              status: entry.status,
              tokens: entry.tokens,
              lines: entry.lines,
              overLineLimit: entry.overLineLimit,
              citeCount: citeCountsOf(events).get(entry.id) ?? 0,
            })),
        })),
        rates: stats.rates,
        counts: stats.counts,
        misses: stats.misses,
        files: stats.files,
        bytes: stats.bytes,
        tokens: stats.tokens,
        overLimit: stats.overLimit,
        cacheNote: '改常驻前缀会作废当前会话 KV cache（实测单次 20–57 万 tokens），攒批改。',
      }
    })
  }

  /** 记录流：INBOX 全量 + 吞吐统计。 */
  async function inbox({ domain = 'personal', state, kind }: {
    domain?: string | null; state?: string; kind?: string
  } = {}) {
    return guard(async () => {
      const result = await store.readInbox(domain)
      let entries = result.entries.map((entry, index) => ({ ...entry, index }))
      if (typeof state === 'string' && state !== '') entries = entries.filter(entry => entry.state === state)
      if (typeof kind === 'string' && kind !== '') entries = entries.filter(entry => entry.kind === kind)
      const all = result.entries
      return {
        path: result.path,
        exists: result.exists,
        entries,
        throughput: {
          total: all.length,
          open: all.filter(entry => entry.state === 'open').length,
          todo: all.filter(entry => entry.state === 'todo').length,
          done: all.filter(entry => entry.state === 'done').length,
          dropped: all.filter(entry => entry.state === 'dropped').length,
          toPromote: all.filter(entry => entry.state === 'done'
            && (entry.destination === '' || entry.destination === '—')).length,
          invalidKind: all.filter(entry => !entry.kindValid).length,
          invalidState: all.filter(entry => !entry.stateValid).length,
        },
        kinds: [...INBOX_KINDS],
        states: [...INBOX_STATES],
      }
    })
  }

  /** 捕获一条（带隐私闸门）。 */
  async function capture({ content, kind = '想法', domain = 'personal', session = 'plugin' }: {
    content: string; kind?: string; domain?: string; session?: string
  }): Promise<CaptureOutcome> {
    const text = String(content ?? '').trim()
    if (text === '') return { ok: false, error: '内容不能为空' }
    if (!INBOX_KINDS.includes(kind as InboxKind)) {
      return { ok: false, error: `类型必须是 ${INBOX_KINDS.join(' / ')}` }
    }
    const privacy = inspectText(text)
    if (privacy.blocked) {
      return {
        ok: false,
        blocked: true,
        reason: privacy.reason,
        masked: privacy.masked,
        audit: auditRecord(text, privacy.findings),
        hint: '命中隐私闸门，已拒写。可用脱敏后的文本重存。',
      }
    }
    return guard(async () => {
      const result = await store.appendInbox({ domain, kind, content: text })
      await store.appendEvent({ session, kind: 'capture', query: text.slice(0, 80), ids: [] })
      return { captured: result, privacy: { blocked: false as const } }
    }) as Promise<CaptureOutcome>
  }

  /** 批量捕获（换行或分号分隔）。 */
  async function captureBatch({ text, kind = '想法', domain = 'personal', session = 'plugin' }: {
    text: string; kind?: string; domain?: string; session?: string
  }): Promise<CaptureBatchOutcome> {
    const lines = String(text ?? '')
      .split(/\n|;/)
      .map(line => line.trim())
      .filter(Boolean)
    if (lines.length === 0) return { ok: false as const, error: '没有可捕获的内容' }
    const accepted: string[] = []
    const blocked: { line: string; reason: string }[] = []
    for (const line of lines) {
      const result = await capture({ content: line, kind, domain, session })
      if (result.ok) accepted.push(line)
      else blocked.push({ line, reason: result.reason ?? result.error ?? '未知原因' })
    }
    return { ok: true as const, accepted, blocked, total: lines.length }
  }

  /** 改一条记录流的状态 / 类型 / 去向。 */
  async function updateInbox({ domain, lineIndex, patch = {}, session = 'plugin' }: {
    domain?: string | null
    lineIndex: number
    patch?: Record<string, string>
    session?: string
  }) {
    return guard(async () => {
      if (typeof patch.state === 'string' && !INBOX_STATES.includes(patch.state as InboxState)) {
        throw new Error(`状态必须是 ${INBOX_STATES.join(' / ')}`)
      }
      if (typeof patch.kind === 'string' && !INBOX_KINDS.includes(patch.kind as InboxKind)) {
        throw new Error(`类型必须是 ${INBOX_KINDS.join(' / ')}`)
      }
      const result = await store.updateInboxRow({ domain, lineIndex, patch })
      await store.appendEvent({ session, kind: 'inbox-update', query: String(result.row?.content ?? '').slice(0, 60) })
      return { updated: result }
    })
  }

  /** 删除一条 / 多条记录流（行号从大往小删，不漂移）。 */
  async function deleteInbox({ domain, lineIndexes = [], session = 'plugin' }: {
    domain?: string | null; lineIndexes?: number[]; session?: string
  }) {
    return guard(async () => {
      const result = await store.deleteInboxRows({ domain, lineIndexes })
      await store.appendEvent({ session, kind: 'inbox-delete', query: `删除 ${result.removed} 行` })
      return { removed: result.removed, path: result.path }
    })
  }

  /** 批量流转状态。 */
  async function batchInboxState({ domain, lineIndexes = [], state, session = 'plugin' }: {
    domain?: string | null; lineIndexes?: number[]; state: string; session?: string
  }) {
    if (!INBOX_STATES.includes(state as InboxState)) {
      return { ok: false as const, error: `状态必须是 ${INBOX_STATES.join(' / ')}` }
    }
    const updated: number[] = []
    const failed: { lineIndex: number; error?: string }[] = []
    // 改状态不增删行，行号稳定；倒序只是为了让失败更早暴露
    for (const lineIndex of [...lineIndexes].sort((a, b) => b - a)) {
      const result = await updateInbox({ domain, lineIndex, patch: { state }, session })
      if (result.ok) updated.push(lineIndex)
      else failed.push({ lineIndex, error: result.error })
    }
    return { ok: true as const, updated, failed }
  }

  /** 提升一条记录到档案：在目标域新建/追加条目，并把 INBOX 标 done + 去向。 */
  async function promoteInbox({ domain, lineIndex, target, session = 'plugin' }: {
    domain?: string | null; lineIndex: number; target?: string; session?: string
  }) {
    return guard(async () => {
      const result = await store.readInbox(domain)
      const row = result.entries.find(entry => entry.lineIndex === lineIndex)
      if (row === undefined) throw new Error(`第 ${lineIndex + 1} 行不是 INBOX 条目`)
      const date = new Date(now()).toISOString().slice(0, 10)
      const targetPath = String(target ?? '').trim() !== ''
        ? String(target).trim()
        : `personal/notes/INBOX-提升-${date}.md`
      const relPath = targetPath.endsWith('.md') ? targetPath : `${targetPath}.md`
      const body = `\n# ${row.content}\n\n> 由 INBOX 于 ${date} 提升。类型：${row.kind}。\n\n${row.content}\n`
      let created: MemoryEntry
      try {
        created = await store.createEntry({
          relPath,
          frontmatter: {
            title: truncate(row.content, 40),
            kind: 'fact',
            layer: 'l2',
            status: 'confirmed',
            confidence: 0.9,
            origin: 'G1',
            updated: date,
          },
          body,
        })
      } catch {
        // 目标已存在 → 追加到正文末尾
        const existing = await store.readEntry(relPath)
        created = await store.writeBody(relPath, `${existing.body.trimEnd()}\n\n## ${date} 提升\n\n${row.content}\n`)
      }
      await store.updateInboxRow({ domain, lineIndex, patch: { state: 'done', destination: relPath } })
      await store.appendEvent({ session, kind: 'promote', ids: [created.id], query: row.content.slice(0, 60) })
      return { promoted: { path: relPath, id: created.id }, inbox: { lineIndex, state: 'done', destination: relPath } }
    })
  }

  /** 检索（同样记账未命中）。 */
  async function search({ query, project, session = 'plugin', record = true }: {
    query: string; project?: string | null; session?: string; record?: boolean
  }) {
    return guard(async () => {
      const entries = await store.scan()
      const result = searchEntries(entries, query, { project })
      if (record) {
        if (result.matched) {
          await store.recordCite({ ids: result.hits.map(hit => hit.id), kind: 'recall', session, query: result.query })
          /**
           * 命中时推进「验证期」进度。
           *
           * 未命中流水线的最后一态（验证期内 → 已验证生效）依赖这个计数：
           * 草稿落库后，同一个 query 再被检索且**能命中**，说明补对了。
           * 早先没人写 `hits`，所以最后一态永远是空抽屉。
           */
          await store.recordVerifyHit({ query: result.query })
        } else {
          await store.recordMiss({ query: result.query, session })
        }
      }
      return {
        query: result.query,
        matched: result.matched,
        hits: result.hits.slice(0, 20),
        total: result.hits.length,
        cost: searchCost(result.hits.slice(0, 20)),
      }
    })
  }

  /** 一条记忆的详情（含证据链、锚点、引用记录）。 */
  async function detail({ path }: { path: string }) {
    return guard(async () => {
      const entry = await store.readEntry(path)
      const events = await store.readEvents()
      const refs = events.filter(event => (event.ids ?? []).includes(entry.id))
      const cites = refs.filter(event => event.kind === 'cite')
      const lastCite = cites.length === 0 ? null : cites[cites.length - 1].at
      return {
        entry: {
          ...projectEntry(entry, now()),
          overTokenLimit: entry.tokens > FILE_TOKEN_SOFT_LIMIT,
          body: entry.body,
        },
        trust: {
          confidence: entry.confidence ?? STATE_CONFIDENCE[entry.status as ConfidenceState] ?? null,
          evidenceCount: (entry.evidence ?? []).length,
          citeCount: cites.length,
          recallCount: refs.filter(event => event.kind === 'recall').length,
          lastCitedAt: lastCite,
          anchor: entry.anchor,
          anchorState: entry.status === 'stale' ? 'stale' : entry.anchor === null ? 'none' : 'fresh',
        },
        references: refs.slice(-20).reverse(),
        states: [...CONFIDENCE_STATES],
        sections: parseSections(entry.body).map(section => ({
          title: section.title, level: section.level, lines: section.lines.length,
        })),
      }
    })
  }

  /** 编辑正文（源码单模式）。 */
  async function writeBody({ path, body, session = 'plugin' }: {
    path: string; body: string; session?: string
  }) {
    const privacy = inspectText(body)
    if (privacy.blocked) {
      return {
        ok: false as const,
        blocked: true,
        reason: privacy.reason,
        masked: privacy.masked,
        audit: auditRecord(body, privacy.findings),
      }
    }
    return guard(async () => {
      const entry = await store.writeBody(path, body)
      await store.appendEvent({ session, kind: 'write', ids: [entry.id] })
      return { entry: { id: entry.id, path: entry.path, tokens: entry.tokens, lines: entry.lines } }
    })
  }

  /** 改状态（含驳回、确认、降级）。 */
  async function setStatus({ path, status, reason, session = 'plugin' }: {
    path: string; status: string; reason?: string; session?: string
  }) {
    if (!CONFIDENCE_STATES.includes(status as ConfidenceState)) {
      return { ok: false as const, error: `状态必须是 ${CONFIDENCE_STATES.join(' / ')}` }
    }
    if (status === 'rejected' && String(reason ?? '').trim() === '') {
      return { ok: false as const, error: '驳回必须写一句理由（30 天后可复查）' }
    }
    return guard(async () => {
      const current = await store.readEntry(path)
      /**
       * 这里必须用**人**的迁移表，不是自动爬升的那张。
       *
       * 这一条调用就是 UI 上「确认」按钮的实现。早先用自动表校验，
       * 而队列里最常见的就是 hypothesis——于是每次点确认都报
       * 「非法状态迁移：hypothesis → confirmed」，且总览入口连这句都不显示。
       * 详见 schema.ts `HUMAN_STATE_TRANSITIONS` 的注释。
       */
      if (!canHumanTransition(current.status, status)) {
        throw new Error(`非法状态迁移：${current.status} → ${status}`)
      }
      const patch: Record<string, unknown> = {
        status,
        confidence: STATE_CONFIDENCE[status as ConfidenceState] ?? current.confidence,
      }
      if (status === 'rejected') {
        patch.refuted_reason = String(reason).trim()
        patch.refuted_at = new Date(now()).toISOString()
      }
      if (status === 'confirmed') patch.confirmed_at = new Date(now()).toISOString()
      const entry = await store.patchMeta(path, patch)
      await store.appendEvent({
        session, kind: 'status', ids: [entry.id], query: `${current.status} → ${status}`,
      })
      return { entry: { id: entry.id, path: entry.path, status: entry.status } }
    })
  }

  /** 确认推断。 */
  async function confirm({ path, session = 'plugin' }: { path: string; session?: string }) {
    return setStatus({ path, status: 'confirmed', session })
  }

  /** 驳回推断（30 天静默）。 */
  async function reject({ path, reason, session = 'plugin' }: {
    path: string; reason: string; session?: string
  }) {
    return setStatus({ path, status: 'rejected', reason, session })
  }

  /** 撤销驳回。 */
  async function undoReject({ path, session = 'plugin' }: { path: string; session?: string }) {
    return setStatus({ path, status: 'reinforced', session })
  }

  /** 归档退役。 */
  async function archive({ path, reason = '到期退役', session = 'plugin' }: {
    path: string; reason?: string; session?: string
  }) {
    return guard(async () => {
      const result = await store.archiveEntry({ relPath: path, reason })
      await store.appendEvent({ session, kind: 'archive', ids: [path] })
      return { archived: result }
    })
  }

  /** 再留 90 天。 */
  async function keep({ path, session = 'plugin' }: { path: string; session?: string }) {
    return guard(async () => {
      const entry = await store.keepLonger({ relPath: path })
      await store.appendEvent({ session, kind: 'keep', ids: [entry.id] })
      return { kept: { id: entry.id, path: entry.path, updatedAt: entry.updatedAt } }
    })
  }

  /** 批量归档。 */
  async function batchArchive({ paths = [], reason = '批量退役', session = 'plugin' }: {
    paths?: string[]; reason?: string; session?: string
  }) {
    const archived: { from: string; to: string }[] = []
    const failed: { path: string; error?: string }[] = []
    for (const path of paths) {
      const result = await archive({ path, reason, session })
      if (result.ok) archived.push(result.archived)
      else failed.push({ path, error: result.error })
    }
    return { ok: true as const, archived, failed }
  }

  /** 未命中工作台：全量聚类 + 五态流水线。 */
  /**
   * 未命中工作台。
   *
   * @param sort - 排序口径：frequency（按频率，默认）/ recent（按最近）/ breadth（按会话广度）
   *
   * 为什么排序交给 core 而不是 UI：排序口径只该有一处实现，
   * 否则 Web 端接了之后必然与插件端分叉（这个教训在 §14.4 记过）。
   */
  async function misses({ sort = 'frequency' }: { sort?: string } = {}) {
    return guard(async () => {
      const list = await store.readMisses()
      const pipeline: Record<string, {
        query: string; count: number; at: string; lastAt: string; state: string
        drafts: string[]; wastedTokens: number
        /** 出现过的会话数（比 count 更能说明是不是共性问题）。 */
        sessions: number
        /** 验证期内已命中次数（满 3 次转「已验证生效」）。 */
        hits: number
        /** 验证期剩余天数；不在验证期时为 null。 */
        remainingDays: number | null
        /** 草稿落库路径（验证期内点开能跳过去）。 */
        draftPath: string | null
      }[]> = {
        observing: [], 'should-fill': [], drafting: [], verifying: [], verified: [],
      }
      const nowMs = now()
      for (const miss of list) {
        const state = miss.state ?? 'observing'
        const bucket = pipeline[state] ?? pipeline.observing
        // 验证期剩余天数：从进入验证期的时刻起算，缺字段时退回最近活动时间
        const startedMs = Date.parse(miss.verifyAt ?? miss.stateAt ?? miss.lastAt ?? miss.at)
        const elapsedDays = Number.isFinite(startedMs)
          ? Math.floor((nowMs - startedMs) / 86_400_000)
          : null
        bucket.push({
          query: miss.query,
          count: miss.count ?? 1,
          at: miss.at,
          lastAt: miss.lastAt ?? miss.at,
          state,
          drafts: miss.drafts ?? [],
          // 平均多花多少 token：一次未命中意味着模型多试一轮，按 120 tokens 估
          wastedTokens: (miss.count ?? 1) * 120,
          sessions: (miss.sessions ?? [miss.session]).length,
          hits: miss.hits ?? 0,
          remainingDays: state === 'verifying' && elapsedDays !== null
            ? Math.max(0, MISS_VERIFY_DAYS - elapsedDays)
            : null,
          draftPath: miss.draftPath ?? null,
        })
      }
      /**
       * 排序：三种口径都能回答不同的问题。
       *
       *   frequency  哪条问得最多 → 该先补哪条（默认）
       *   recent     最近在问什么 → 跟当前任务相关的可能性大
       *   breadth    多少会话都在问 → 共性问题优先
       *
       * 早先固定按频率，且注释写着「排序口径只该有一处」——那条原则是对的，
       * 但结论错了：**口径应该可切换，实现应该只有一处**。现在这一处就是这里。
       */
      for (const bucket of Object.values(pipeline)) {
        if (sort === 'recent') {
          bucket.sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)))
        } else if (sort === 'breadth') {
          bucket.sort((a, b) => b.sessions - a.sessions || b.count - a.count)
        } else {
          bucket.sort((a, b) => b.count - a.count || String(b.lastAt).localeCompare(String(a.lastAt)))
        }
      }
      return {
        pipeline,
        /** 五态各自的条数，供 UI 顶部计数条直接消费（不必自己数）。 */
        counts: {
          observing: pipeline.observing.length,
          'should-fill': pipeline['should-fill'].length,
          drafting: pipeline.drafting.length,
          verifying: pipeline.verifying.length,
          verified: pipeline.verified.length,
        },
        total: list.length,
        conversion: list.length === 0 ? null : pipeline.verified.length / list.length,
        verifyDays: MISS_VERIFY_DAYS,
        /** 阈值：问过几次算「该补了」。UI 上要能说清这个数字的来源。 */
        fillThreshold: 3,
        /** 当前排序口径，UI 用来回显选中的那一项。 */
        sort,
      }
    })
  }

  /** 未命中 → 草稿（必须人确认才落库）。 */
  async function missDraft({ query, type = '问题', session = 'plugin' }: {
    query: string; type?: string; session?: string
  }) {
    if (!INBOX_KINDS.includes(type as InboxKind)) {
      return { ok: false as const, error: `类型必须是 ${INBOX_KINDS.join(' / ')}` }
    }
    return guard(async () => {
      const updated = await store.updateMiss({ query, state: 'drafting' })
      const draft = {
        query,
        type,
        title: truncate(query, 40),
        content: `关于「${query}」的结论：`,
        at: new Date(now()).toISOString(),
      }
      await store.updateMiss({ query, draftId: `${query}@${draft.at}` })
      await store.appendEvent({ session, kind: 'miss-draft', query })
      return { draft, miss: updated }
    })
  }

  /** 草稿确认 → 落库 → 进入 7 天验证期。 */
  async function missConfirm({ query, content, type = '问题', domain = 'personal', session = 'plugin' }: {
    query: string; content: string; type?: string; domain?: string; session?: string
  }) {
    return guard(async () => {
      const text = String(content ?? '').trim()
      if (text === '') throw new Error('草稿内容不能为空')
      const privacy = inspectText(text)
      if (privacy.blocked) {
        return {
          ok: false as const,
          blocked: true,
          reason: privacy.reason,
          masked: privacy.masked,
        }
      }
      const date = new Date(now()).toISOString().slice(0, 10)
      const slug = text.slice(0, 24).replace(/[^\w\u4e00-\u9fff-]+/g, '-')
      const relPath = `${domain}/misses/${date}-${slug}.md`
      const entry = await store.createEntry({
        relPath,
        frontmatter: {
          title: truncate(query, 40),
          kind: 'fact',
          layer: 'l2',
          status: 'observed',
          confidence: 0.5,
          origin: 'G2',
          evidence: [{ session, excerpt: text.slice(0, 120), gate: 'G2' }],
        },
        body: `\n# ${query}\n\n${text}\n`,
      })
      const updated = await store.updateMiss({
        query, state: 'verifying', draftId: entry.id, draftPath: relPath,
      })
      await store.appendEvent({ session, kind: 'miss-confirm', ids: [entry.id], query })
      return {
        entry: { id: entry.id, path: relPath },
        miss: updated,
        verifyUntil: new Date(now() + MISS_VERIFY_DAYS * 86_400_000).toISOString(),
        draftType: type,
      }
    })
  }

  /** 批量生成草稿。 */
  async function missBatchDraft({ queries = [], type = '问题', session = 'plugin' }: {
    queries?: string[]; type?: string; session?: string
  }) {
    const drafts: unknown[] = []
    const failed: { query: string; error?: string }[] = []
    for (const query of queries) {
      const result = await missDraft({ query, type, session })
      if (result.ok) drafts.push(result.draft)
      else failed.push({ query, error: result.error })
    }
    return { ok: true as const, drafts, failed }
  }

  /** 删除未命中。 */
  async function missDelete({ query }: { query: string }) {
    return guard(async () => ({ removed: await store.deleteMiss(query) }))
  }

  /** 导出：markdown / json，支持按域过滤。 */
  async function exportData({ format = 'markdown', domain }: {
    format?: string; domain?: string | null
  } = {}) {
    return guard(async () => {
      const entries = await store.scan()
      const scoped = domain === undefined || domain === null || domain === ''
        ? entries
        : entries.filter(entry => entry.domain === domain)
      const stamp = new Date(now()).toISOString().slice(0, 10)
      if (format === 'json') {
        return {
          filename: `memory-ops-${domain ?? 'all'}-${stamp}.json`,
          content: JSON.stringify(scoped.map(entry => ({
            id: entry.id,
            path: entry.path,
            domain: entry.domain,
            title: entry.title,
            layer: entry.layer,
            status: entry.status,
            confidence: entry.confidence,
            tags: entry.tags,
            updatedAt: entry.updatedAt,
            tokens: entry.tokens,
            evidence: entry.evidence,
            body: entry.body,
          })), null, 2),
          count: scoped.length,
        }
      }
      const parts = [`# 记忆库导出 · ${stamp}`, '', `共 ${scoped.length} 条，域：${domain ?? '全部'}`, '']
      for (const entry of scoped) {
        parts.push(
          `## ${entry.title}`, '',
          `- 路径：${entry.path}`,
          `- 域：${entry.domainLabel}`,
          `- 层：${entry.layer}`,
          `- 状态：${entry.status}`,
          `- tokens：${entry.tokens}`, '',
          entry.body.trim(), '',
        )
      }
      return {
        filename: `memory-ops-${domain ?? 'all'}-${stamp}.md`,
        content: parts.join('\n'),
        count: scoped.length,
      }
    })
  }

  /**
   * 会话记忆：本次注入 / 引用 / 未命中 + **为什么注入**。
   *
   * ## 两个真实缺陷
   *
   * ① **没有按会话过滤**。原来取的是「全库最近 200 条事件里的 recall」，
   *    于是任意别的会话搜一次，这个 tab 的数字就会变。它叫「会话记忆 tab」，
   *    却回答的是「整个库最近发生了什么」。
   *
   * ② **「为什么注入」永远为空**。它只在传入 `query` 时才有内容，
   *    而会话 tab 传的是 `{ sessionId, project }`，从来不传 query。
   *    所以那一栏恒定显示「本会话还没有检索记录」——可界面上明明写着
   *    「本次注入 3」。自相矛盾的两个数字摆在同一个面板里。
   *
   * 现在改成从**事件流派生的原因**：这个会话实际发生过哪些 recall，
   * 命中了哪条，那次检索的词是什么。这才是「为什么注入」的证据链——
   * 而不是拿一个界面上并不存在的 query 去反推。
   */
  async function sessionMemory({ query, project, sessionId, cwd }: {
    query?: string; project?: string | null; sessionId?: string; cwd?: string | null
  } = {}) {
    return guard(async () => {
      const entries = await store.scan()

      /**
       * 只给了 cwd 时先解析成项目（与 snapshot 同一套判定）。
       * 解析不出来就退回「不按项目过滤」，而不是过滤成 0 条——
       * 那正是这次要修的假空态形态。
       */
      let resolution: ProjectResolution | null = null
      let projectFilter = project
      if ((project === undefined || project === null || project === '') && typeof cwd === 'string' && cwd.trim() !== '') {
        resolution = resolveProject(cwd, projectAliasesOf(entries))
        projectFilter = resolution.project
      }

      const allEvents = await store.readEvents()
      /** 会话内的全部事件；没给 sessionId 时才退化成「全库最近 200 条」。 */
      const events = sessionId === undefined || sessionId === ''
        ? allEvents.slice(-200)
        : allEvents.filter(event => event.session === sessionId)
      const recent = events.slice(-200)

      const injectedEvents = recent.filter(event => event.kind === 'recall')
      const citedEvents = recent.filter(event => event.kind === 'cite')
      const missesRecent = recent.filter(event => event.kind === 'miss')

      const byId = new Map(entries.map(entry => [entry.id, entry]))
      const reasons: {
        id: string; title: string; why: string
        anchor: Record<string, string> | null
        anchorState: string
        tokens: number
        at: string
      }[] = []

      /**
       * 原因来自 recall 事件本身。
       *
       * 倒序取最近 5 次检索里的命中条目：越新的越靠前，
       * 因为用户此刻关心的是「刚刚这一轮注入了什么」。
       */
      for (const event of [...recent].reverse()) {
        if (event.kind !== 'recall') continue
        const terms = String(event.query ?? '').split(/\s+/).filter(Boolean)
        for (const id of event.ids ?? []) {
          if (reasons.some(reason => reason.id === id)) continue
          const entry = byId.get(id)
          if (entry === undefined) continue
          reasons.push({
            id,
            title: entry.title,
            why: terms.length === 0 ? '检索命中（无关键词记录）' : `关键词命中：${terms.join(' ')}`,
            anchor: entry.anchor,
            /** 锚点状态：让「为什么注入」能说清是命中了内容还是命中了失效锚点。 */
            anchorState: entry.status === 'stale'
              ? 'stale'
              : entry.anchor === null ? 'none' : 'fresh',
            tokens: entry.tokens,
            at: event.at,
          })
          if (reasons.length >= 5) break
        }
        if (reasons.length >= 5) break
      }

      /** 显式 query 仍然可用（agent 诊断路径），此时在库内做一次纯检索。 */
      if (reasons.length === 0 && typeof query === 'string' && query.trim() !== '') {
        const result = searchEntries(entries, query, { project: projectFilter })
        for (const hit of result.hits.slice(0, 5)) {
          const matched = entries.find(entry => entry.id === hit.id)
          reasons.push({
            id: hit.id,
            title: hit.title,
            why: `关键词命中：${result.terms.join(' ')}`,
            anchor: matched?.anchor ?? null,
            anchorState: matched?.status === 'stale'
              ? 'stale'
              : matched?.anchor === null || matched?.anchor === undefined ? 'none' : 'fresh',
            tokens: hit.tokens,
            at: '',
          })
        }
      }

      return {
        sessionId: sessionId ?? null,
        project: projectFilter ?? null,
        resolution,
        injected: injectedEvents.reduce((sum, event) => sum + (event.ids ?? []).length, 0),
        recalled: injectedEvents.length,
        cited: citedEvents.reduce((sum, event) => sum + (event.ids ?? []).length, 0),
        missed: missesRecent.length,
        reasons,
        recentInjected: injectedEvents.slice(-10),
        recentCites: citedEvents.slice(-10),
        recentMisses: missesRecent.slice(-10),
      }
    })
  }

  /** 库健康：待处理 / 超限 / 驳回静默 / 三率。 */
  async function health() {
    return guard(async () => {
      const entries = await store.scan()
      const events = await store.readEvents()
      const misses = await store.readMisses()
      const stats = store.summarize(entries, events, misses, { nowMs: now() })
      const silenced = entries.filter((entry) => {
        if (entry.status !== 'rejected') return false
        const at = Date.parse(entry.refutedAt ?? '')
        return Number.isFinite(at) && now() - at < 30 * 86_400_000
      })
      return {
        rates: stats.rates,
        counts: stats.counts,
        overLimit: stats.overLimit,
        silenced: silenced.map(entry => ({ id: entry.id, path: entry.path, title: entry.title })),
        stale: entries
          .filter(entry => expiryOf(entry, now()).level !== 'fresh')
          .map(entry => ({ id: entry.id, path: entry.path, title: entry.title, ...expiryOf(entry, now()) })),
        lineLimit: FILE_LINE_LIMIT,
        tokenSoftLimit: FILE_TOKEN_SOFT_LIMIT,
      }
    })
  }

  /**
   * 锚点校验作业（product.md §11.7 M3）。
   *
   * 回答的不是「这条记忆对不对」，而是「**它引用的代码还在不在**」。
   * `dryRun=true` 时只报告不改状态——UI 默认走这一步，让人先看清再决定。
   */
  async function verifyAnchorJob({ baseDir = '', apply = false, session = 'plugin' }: {
    baseDir?: string; apply?: boolean; session?: string
  } = {}) {
    return guard(async () => {
      const entries = await store.scan()
      // 没注入 readExternal 时不假装校验过：明确降级为「无法校验」，
      // 而不是把所有锚点判成 fresh（那会让用户以为一切正常）。
      const reader: AnchorReader = readExternal ?? (async () => null)
      const report = await verifyAnchors(entries, reader, { baseDir })
      const changed: { path: string; from: string; to: string }[] = []
      const failed: { path: string; error?: string }[] = []

      if (apply) {
        for (const check of report.checks) {
          // 只处理「明确失效」的两种；unverifiable 不自动降级（缺数据不是证据）
          if (check.state !== 'stale' && check.state !== 'missing') continue
          const entry = entries.find(item => item.path === check.path)
          if (entry === undefined) continue
          if (entry.status === 'stale') continue
          if (!canTransition(entry.status, 'stale')) {
            failed.push({ path: check.path, error: `${entry.status} 不能迁到 stale` })
            continue
          }
          try {
            /**
             * 一次写完，不分两次。
             *
             * 分两次调 `patchMeta` 有真实风险：两次各自取文件锁，
             * 中间若失败（进程被杀、磁盘满），会留下「status 已改 stale、
             * 但没有 anchor_checked_at」的半成品——那条记忆从此说不清
             * 是「锚点校验判的」还是「人手工降的」。
             */
            const updated = await store.patchMeta(check.path, {
              status: 'stale',
              anchor_checked_at: new Date(now()).toISOString(),
              anchor_state: check.state,
            })
            changed.push({ path: updated.path, from: entry.status, to: 'stale' })
          } catch (error) {
            failed.push({ path: check.path, error: error instanceof Error ? error.message : String(error) })
          }
        }
        await store.appendEvent({
          session,
          kind: 'anchor-verify',
          query: `stale ${report.summary.stale} · missing ${report.summary.missing}`,
        })
      }

      return { ...report, applied: apply, changed, failed }
    })
  }

  /** 减重：列超限条目 + 预览/执行机械压缩。 */
  async function compact({ paths = [], apply = false, session = 'plugin' }: {
    paths?: string[]; apply?: boolean; session?: string
  } = {}) {
    return guard(async () => {
      const entries = await store.scan()
      const targets = paths.length > 0
        ? entries.filter(entry => paths.includes(entry.path))
        : entries.filter(entry => needsCompact(entry))

      const previews = targets.map((entry) => {
        const result = compactBody(entry.body)
        return {
          path: entry.path,
          title: entry.title,
          /**
           * 行数一律用**正文口径**（`compactBody.before`），不用 `entry.lines`。
           *
           * `entry.lines` 是整个文件（含 frontmatter + 结尾换行），而
           * `result.removed` 只统计正文。两者混用会让「7 行 → 3 行」看起来
           * 像删掉了 4 行正文——实际一行正文都没删。同一个界面里的数字必须同口径。
           */
          before: result.before,
          after: result.after,
          removed: result.removed,
          changes: result.changes,
          /**
           * 压缩后是否仍超限。
           *
           * 必须用**同一口径**：`before`/`after` 都是正文行数，这里不能用
           * `entry.lines`（含 frontmatter）去减正文口径的 `removed`——
           * 那会算出比实际小 5~10 行的假象，让「压缩后合规了」的判断提前成立。
           */
          stillOverLimit: result.after + (entry.lines - result.before) > FILE_LINE_LIMIT,
          splitSuggestions: result.splitSuggestions,
        }
      })

      const written: { path: string; removed: number }[] = []
      const failed: { path: string; error?: string }[] = []
      if (apply) {
        for (const entry of targets) {
          const result = compactBody(entry.body)
          // 压缩不改变语义，但它确实动了正文——所以有节省才写，没节省就别碰文件时间戳
          if (result.removed <= 0) continue
          try {
            await store.writeBody(entry.path, result.body)
            written.push({ path: entry.path, removed: result.removed })
          } catch (error) {
            failed.push({ path: entry.path, error: error instanceof Error ? error.message : String(error) })
          }
        }
        if (written.length > 0) {
          await store.appendEvent({
            session,
            kind: 'compact',
            query: `${written.length} 篇，去 ${written.reduce((sum, item) => sum + item.removed, 0)} 行`,
          })
        }
      }

      return {
        candidates: previews,
        total: previews.length,
        /** 只做无损压缩，节省通常有限；这里如实报出来，避免让人误以为一键就合规。 */
        removableLines: previews.reduce((sum, item) => sum + item.removed, 0),
        applied: apply,
        written,
        failed,
        lineLimit: FILE_LINE_LIMIT,
      }
    })
  }

  /** 每周复盘：这周动了什么 + 下周该做什么。 */
  async function review({ days = 7 }: { days?: number } = {}) {
    return guard(async () => {
      const entries = await store.scan()
      const events = await store.readEvents()
      const misses = await store.readMisses()
      return weeklyReview(entries, events, misses, { nowMs: now(), days })
    })
  }

  /**
   * 自动爬升：只出计划，`apply=true` 才落库。
   *
   * 为什么默认不自动落：爬升会改 status，而 status 决定这条记忆被不被信任。
   * 一个「自己给自己升可信度」的系统，正是 product.md §11.3 拒绝「自动提取并直接写库」
   * 的同一个理由。所以默认 dry-run，由人点一下。
   */
  async function promote({ apply = false, session = 'plugin' }: {
    apply?: boolean; session?: string
  } = {}) {
    return guard(async () => {
      const entries = await store.scan()
      const events = await store.readEvents()
      const plans = planPromotions(entries, events)
      const changed: { path: string; from: string; to: string }[] = []
      const failed: { path: string; error?: string }[] = []
      if (apply) {
        for (const plan of plans) {
          if (!canTransition(plan.from, plan.to)) {
            failed.push({ path: plan.path, error: `${plan.from} 不能迁到 ${plan.to}` })
            continue
          }
          try {
            await store.patchMeta(plan.path, {
              status: plan.to,
              confidence: STATE_CONFIDENCE[plan.to],
              promoted_at: new Date(now()).toISOString(),
            })
            changed.push({ path: plan.path, from: plan.from, to: plan.to })
          } catch (error) {
            failed.push({ path: plan.path, error: error instanceof Error ? error.message : String(error) })
          }
        }
        if (changed.length > 0) {
          await store.appendEvent({ session, kind: 'promote-auto', query: `${changed.length} 条` })
        }
      }
      return { plans, applied: apply, changed, failed, minSessions: REINFORCE_MIN_SESSIONS }
    })
  }

  /**
   * 修补 frontmatter：把「手写的 Markdown 笔记」变成「可治理的记忆」。
   *
   * 这是「插件装了、数据也在、但什么都不工作」的解药。缺 `status` 会让
   * 待你处理队列永远为空，缺 `layer` 会让预算账本三段全错。
   *
   * **只补空字段与非法的值，绝不覆盖已有值，绝不改正文。** 默认 dry-run。
   */
  async function repairMeta({ apply = false, paths = [], session = 'plugin' }: {
    apply?: boolean; paths?: string[]; session?: string
  } = {}) {
    return guard(async () => {
      const entries = await store.scan()
      const today = new Date(now()).toISOString().slice(0, 10)
      const plan = planRepairs(entries, today)
      const targets = paths.length === 0
        ? plan.fixes
        : plan.fixes.filter(fix => paths.includes(fix.path))

      const written: { path: string; fields: string[] }[] = []
      const failed: { path: string; error?: string }[] = []

      if (apply) {
        for (const fix of targets) {
          try {
            // patchMeta 只改 frontmatter，不动正文——这是本条能力的硬边界
            await store.mergeMeta(fix.path, fix.patch, { overwrite: fix.overwrite })
            written.push({ path: fix.path, fields: Object.keys(fix.patch) })
          } catch (error) {
            failed.push({ path: fix.path, error: error instanceof Error ? error.message : String(error) })
          }
        }
        if (written.length > 0) {
          await store.appendEvent({
            session,
            kind: 'repair-meta',
            query: `${written.length} 篇`,
          })
        }
      }

      return {
        fixes: targets,
        healthy: plan.healthy,
        total: plan.total,
        applied: apply,
        written,
        failed,
      }
    })
  }

  /** 索引表：L1 层，回答「我能查什么 / 该读哪个文件」。 */
  async function index({ domain }: { domain?: string | null } = {}) {
    return guard(async () => {
      const entries = await store.scan()
      const scoped = domain === undefined || domain === null || domain === ''
        ? entries
        : entries.filter(entry => entry.domain === domain)
      const rows = scoped
        .filter(entry => entry.layer === 'l0' || entry.layer === 'l1' || entry.path.endsWith('index.md'))
        .map(entry => ({
          path: entry.path,
          title: entry.title,
          domain: entry.domain,
          layer: entry.layer,
          tokens: entry.tokens,
        }))
      return {
        rows,
        residentTokens: scoped.filter(entry => entry.layer === 'l0').reduce((sum, entry) => sum + entry.tokens, 0),
      }
    })
  }

  return {
    snapshot, overview, inbox, capture, captureBatch, updateInbox, deleteInbox,
    batchInboxState, promoteInbox, search, detail, writeBody, setStatus, confirm,
    reject, undoReject, archive, keep, batchArchive, misses, missDraft, missConfirm,
    missBatchDraft, missDelete, export: exportData, sessionMemory, health, index,
    verifyAnchor: verifyAnchorJob, compact, review, promote, repairMeta,
    store,
  }
}

export type Actions = ReturnType<typeof createActions>
export type { SearchHit }
export { estimateTokens, orEmpty }
