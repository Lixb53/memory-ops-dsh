/**
 * 置顶条目 → 系统提示词段落（纯函数，无 fs、无宿主依赖）。
 *
 * ## 为什么要有这条通道
 *
 * 记忆库一直是**拉取**模型：`memory_recall` 由模型主动调用，命中才注入。
 * 但有一类条目——「所有会话的思考过程和结果全都使用中文」——它的价值恰恰在于
 * **不依赖模型想起来去查**。靠检索生效的原则，等于没有生效：
 * 实测 promote 之后 11 个会话、3 次 recall，其中命中它的只有 2 次。
 *
 * 所以 `pinned: true` 的条目走另一条路：由插件注册成 system prompt 段落，
 * 每个请求都在。这是**推送**，代价是每请求都付费，因此必须有硬预算。
 *
 * ## 只放个人域（默认）
 *
 * 工作域置顶条目按分支变化，塞进所有会话就是 `_shared` 那个老坑的重演
 * （见 `schema.ts` 的 `SHARED_BRANCH` 注释）：一个分支的架构结论
 * 套到另一个分支上就是错的。要跨分支生效的知识本来就该写进个人域。
 *
 * ## 为什么是纯函数
 *
 * 三个调用方各有各的时钟：插件在组装期同步调用它、总览在 HTTP 路由里调用它、
 * 测试直接调用它。把 fs 混进来，同步调用那条路径就必然要缓存，
 * 而缓存一旦和真实文件脱节，注入的就是过时原则——比不注入更糟。
 */

import { estimateTokens, truncate } from './schema.ts'

/** 注入段的默认 token 预算。 */
export const PINNED_MAX_TOKENS = 256

/**
 * 段落在系统提示词里的唯一名字。
 *
 * 名字影响**排序与去重**，不进入模型可见文本，所以改它不会作废 KV cache；
 * 但重复注册同名段落会直接抛错，因此全局只能有一个注册点。
 */
export const PINNED_SECTION_NAME = 'memory-ops:pinned-rules'

/**
 * 排序值：persona 前缀是 0，工具引导从 1000 起。
 *
 * 放在 10 = 「先知道你是谁（0）→ 再知道必须守什么（10）→ 最后才是能调什么（1000）」。
 * 用固定数值而不是 `getSectionOrder()`：那个 API 只接受仓库集中分配的名字，
 * 插件自有的位置不该占那里的名额。
 */
export const PINNED_SECTION_ORDER = 10

/** 段落标题。措辞固定，避免改文案就作废一次会话缓存。 */
const HEADER = '## 记忆库置顶规则'

/** 段落结语。同上：固定。 */
const FOOTER = '以上为用户显式置顶的长期规则，优先级高于默认行为。'

/** 渲染只需要这几个字段，测试因此不必造完整的 `MemoryEntry`。 */
export interface PinnedCandidate {
  id: string
  title: string
  /** 域键：`personal` 或 `work/<project>`。 */
  domain: string
  pinned: boolean
  status: string
}

export interface PinnedRenderOptions {
  /** token 上限（含头尾骨架）。 */
  maxTokens?: number
  /** 是否包含工作域置顶条目。默认 false，见文件头注释。 */
  includeWork?: boolean
}

export interface PinnedRender {
  /** 段落文本。没有可选条目时为 `''`——空段落会被 `renderPrompt` 滤掉。 */
  text: string
  /** 段落自身的 token 估算，供总览计入每请求成本。 */
  tokens: number
  /** 实际注入的条目 id（按出现顺序）。 */
  ids: string[]
  /** 因预算不足被跳过的条目数。 */
  omitted: number
}

/** 压成一行：标题里的换行若透出去，列表结构就散了。 */
function oneLine(text: unknown): string {
  return String(text ?? '').replace(/\s+/g, ' ').trim()
}

/**
 * 挑出该注入的条目。
 *
 * - `pinned !== true` 一律不要：这条通道按请求付费，默认全关。
 * - `rejected` 不要：被驳回的条目已不再被信任，注入它就是让模型照错的做。
 * - `stale` 保留：锚点失效是「待复核」，不是「已证伪」；拿掉一条仍在用的
 *   原则，代价比多付几十 token 大得多。
 */
export function selectPinned<T extends PinnedCandidate>(
  entries: readonly T[],
  options: PinnedRenderOptions = {},
): T[] {
  const includeWork = options.includeWork === true
  const seen = new Set<string>()
  const picked: T[] = []
  for (const entry of entries) {
    if (entry.pinned !== true) continue
    if (entry.status === 'rejected') continue
    if (!includeWork && entry.domain !== 'personal') continue
    if (seen.has(entry.id)) continue
    seen.add(entry.id)
    picked.push(entry)
  }
  return picked
}

/**
 * 渲染注入段落。
 *
 * 预算先扣掉头尾骨架再排条目，否则「预算 256」实际会稳定超出一截。
 * 超预算的条目**跳过而不是截断正文**：半句话的原则比没有原则更危险，
 * 而「跳过了几条」必须写进段落——静默丢弃会让人以为全都注入了。
 */
export function renderPinnedSection(
  entries: readonly PinnedCandidate[],
  options: PinnedRenderOptions = {},
): PinnedRender {
  const maxTokens = options.maxTokens ?? PINNED_MAX_TOKENS
  const picked = selectPinned(entries, options)
  if (picked.length === 0) return { text: '', tokens: 0, ids: [], omitted: 0 }

  const budget = Math.max(0, maxTokens - estimateTokens(`${HEADER}\n\n${FOOTER}`))
  const lines: string[] = []
  const ids: string[] = []
  let used = 0
  let omitted = 0

  for (const entry of picked) {
    const line = `- [${entry.id}] ${oneLine(entry.title)}`
    const cost = estimateTokens(line)
    // 跳过超大条目后继续尝试后面的短条目：预算利用率更高，且顺序仍是库内顺序。
    if (used + cost > budget) {
      omitted += 1
      continue
    }
    lines.push(line)
    ids.push(entry.id)
    used += cost
  }

  // 一条都放不下（预算被调得过小）：至少给出一条，截断标题而不是整段消失。
  if (lines.length === 0) {
    const first = picked[0]!
    lines.push(`- [${first.id}] ${truncate(oneLine(first.title), 40)}`)
    ids.push(first.id)
    omitted = picked.length - 1
  }

  const note = omitted > 0
    ? `\n另有 ${omitted} 条置顶条目超出 ${maxTokens} tokens 预算未注入，见记忆库总览。`
    : ''
  const text = [HEADER, '', ...lines, '', `${FOOTER}${note}`].join('\n')
  return { text, tokens: estimateTokens(text), ids, omitted }
}