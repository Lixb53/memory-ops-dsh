/**
 * 全文检索 —— ripgrep 语义的纯实现，**无向量库**。
 *
 * 为什么拒绝 embedding：knowledge 用 2.4 MB sqlite + 常驻进程换检索，
 * 30 天命中率 62% 已够用；向量库会把常驻成本拉回老路。
 *
 * 检索策略（与 product.md §四 的分层对齐）：
 *   1. 先在**索引层**（index.md、frontmatter title/tags）匹配 → 决定该读哪个文件
 *   2. 再在**详情层**正文里匹配 → 返回命中行上下文
 *   3. 每次检索都记账：命中记 cite，未命中记 miss
 */

import { STALE_WEIGHT, estimateTokens, truncate } from './schema.ts'
import type { MemoryEntry } from './store.ts'

/** 一条命中。 */
export interface SearchHit {
  id: string
  path: string
  title: string
  domain: string
  domainLabel: string
  layer: string
  status: string
  confidence: number | null
  tokens: number
  snippet: string
  score: number
}

/** 检索结果。 */
export interface SearchResult {
  query: string
  terms: string[]
  hits: SearchHit[]
  matched: boolean
}

/** 词项归一：小写、去空白。CJK 不做分词，按子串匹配。 */
function normalize(text: unknown): string {
  return String(text ?? '').toLowerCase()
}

/** 判断一个词项是否是 CJK（子串匹配）还是拉丁词（词边界匹配）。 */
function isCjk(term: string): boolean {
  return /[\u2e80-\u9fff\uac00-\ud7af\u3000-\u303f\uff00-\uffef]/.test(term)
}

/** 转义正则元字符。 */
function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 单条记忆是否命中某词项。 */
function entryMatches(entry: MemoryEntry, terms: string[]): boolean {
  const title = normalize(entry.title)
  const tags = normalize(entry.tags.join(' '))
  const body = normalize(entry.body)
  const id = normalize(entry.id)
  return terms.every((term) => {
    if (isCjk(term)) {
      return title.includes(term) || body.includes(term) || tags.includes(term) || id.includes(term)
    }
    const pattern = new RegExp(`(^|[^a-z0-9_])${escapeRegExp(term)}`, 'i')
    return pattern.test(title) || pattern.test(body) || pattern.test(tags) || pattern.test(id)
  })
}

/** 命中片段：返回第一处命中行的上下文。 */
function snippetOf(entry: MemoryEntry, terms: string[]): string {
  const lines = String(entry.body ?? '').split('\n')
  const lowerTerms = terms.map(normalize)
  for (let index = 0; index < lines.length; index += 1) {
    const line = normalize(lines[index])
    if (lowerTerms.some(term => line.includes(term))) {
      const before = lines[index - 1]?.trim() ?? ''
      const context = before === '' ? lines[index].trim() : `${before} / ${lines[index].trim()}`
      return truncate(context, 120)
    }
  }
  return truncate(entry.title, 120)
}

/**
 * 相关度：标题命中权重最高，其次标签，最后正文；pinned 与层加权。
 *
 * 状态加权：`stale`（待复核）与 `rejected`（已驳回）乘 0.4，见 product.md §11.6。
 * 为什么是乘系数而不是排除：
 *   - 排除 stale 会让用户搜不到自己确认过的东西，比搜到一条过期条目更糟；
 *   - rejected 也不许消失——被驳回的推断仍然是「库里有记录的事实」，
 *     只是不该再被当作结论推荐。乘 0.4 让它自然沉到后面。
 * 这条逻辑在 v3 就写进了文档，但一直没实现，导致「降权」只是文案。
 */
function scoreOf(entry: MemoryEntry, terms: string[]): number {
  const title = normalize(entry.title)
  const tags = normalize(entry.tags.join(' '))
  const body = normalize(entry.body)
  let score = 0
  for (const term of terms.map(normalize)) {
    if (title.includes(term)) score += 10
    if (tags.includes(term)) score += 6
    if (body.includes(term)) score += 2
  }
  if (entry.pinned) score += 3
  if (entry.layer === 'l0') score += 2
  if (entry.layer === 'l1') score += 1
  if (entry.status === 'stale' || entry.status === 'rejected') {
    score = score * STALE_WEIGHT
  }
  return score
}

/**
 * 在条目集合里检索。
 * @param entries - 全量条目（store.scan 的结果）
 * @param query - 检索词
 * @param options - 过滤条件
 * @returns 命中列表 + 是否命中
 */
export function searchEntries(
  entries: MemoryEntry[],
  query: unknown,
  options: { project?: string | null } = {},
): SearchResult {
  const text = String(query ?? '').trim()
  if (text === '') return { query: text, terms: [], hits: [], matched: false }
  const terms = text.split(/\s+/).filter(Boolean)
  const scoped = options.project === undefined || options.project === null || options.project === ''
    ? entries
    : entries.filter(entry => entry.project === options.project)
  const hits = scoped
    .filter(entry => entryMatches(entry, terms))
    .map(entry => ({
      id: entry.id,
      path: entry.path,
      title: entry.title,
      domain: entry.domain,
      domainLabel: entry.domainLabel,
      layer: entry.layer,
      status: entry.status,
      confidence: entry.confidence,
      tokens: entry.tokens,
      snippet: snippetOf(entry, terms),
      score: scoreOf(entry, terms),
    }))
    .sort((a, b) => b.score - a.score)
  return { query: text, terms, hits, matched: hits.length > 0 }
}

/** 计算一次检索的 token 成本（命中内容全部读入的代价）。 */
export function searchCost(hits: SearchHit[]): number {
  return hits.reduce((sum, hit) => sum + estimateTokens(hit.snippet) + 8, 0)
}

/** 把命中结果压成一段可注入的上下文（给 agent 用）。 */
export function renderHits(query: string, hits: SearchHit[], { limit = 5 } = {}): string {
  if (hits.length === 0) return `记忆库未命中：「${query}」。这本身是一条待补信号。`
  const top = hits.slice(0, limit)
  const lines = [`记忆库命中 ${hits.length} 条（显示前 ${top.length} 条）：「${query}」`]
  for (const hit of top) {
    lines.push(`- [${hit.domainLabel}] ${hit.title}（${hit.path} · ${hit.tokens} tokens）`)
    lines.push(`  ${hit.snippet}`)
  }
  return lines.join('\n')
}
