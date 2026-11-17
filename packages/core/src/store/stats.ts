/**
 * store/stats.ts —— 统计汇总（纯函数）
 *
 * 从 `store.ts` 的 `createStore` 闭包里抽出来。
 *
 * ## 为什么这个模块值得独立
 *
 * `summarize` 是三率的**唯一实现**，而 `docs/product.md` 明确要求
 * 「口径写死一处，两端共用」。它此前藏在 1041 行的闭包里，
 * 好处是能直接读 `now()`，坏处是：
 *   - 无法在不建 store 的情况下测口径；
 *   - 它同时依赖 entries / events / misses 三种数据，
 *     是「一函数吃三种数据」的典型，混在读写层里会让人以为是 IO 逻辑。
 *
 * 抽成纯函数后：入参显式（entries, events, misses, nowMs），
 * 出参显式（MemoryStats），零 IO。任何口径改动都能被单测直接锁住。
 *
 * ⚠️ **口径一个字都没改**。抽取过程中逐行对照原实现，包括：
 *   - `hitRate` 的 `Math.min(1, ...)` 上限（防 cite > recall 时超过 100%）
 *   - `domains` 按 **files 降序**排序（不是 tokens）
 *   - `expireRate` 的 stale 分子**包含 archived**（`stale || archived`）
 *   - `counts.stale` 与 `expireRate` 的 stale **口径不同**（前者只数 stale）
 * 这几处极易在"顺手整理"时被改掉，所以单独写在这里做警示。
 */

import { type Expiry } from '../schema.ts'
import { type MemoryEvent, type MissRecord } from './types.ts'
import { type MemoryEntry } from './paths.ts'

/** 统计汇总。 */
export interface MemoryStats {
  files: number
  bytes: number
  tokens: number
  overLimit: number
  domains: { key: string; label: string; files: number; bytes: number; tokens: number; overLimit: number }[]
  layers: Record<'l0' | 'l1' | 'l2', { files: number; tokens: number }>
  rates: {
    hitRate: number | null
    confirmRate: number | null
    expireRate: number | null
    missRate: number | null
  }
  misses: { total: number; verified: number }
  counts: { pending: number; confirmed: number; rejected: number; stale: number; archived: number }
  expiry: (Expiry & { id: string })[]
}

/**
 * 统计汇总。
 *
 * 原先以闭包内函数形式存在，直接读 `now()` 与 `expiryOf`。
 * 现在改为入参，行为逐字不变。
 *
 * @param nowMs - 时间基准。调用方传 `now()`，测试传固定值。
 * @param expiryOf - 注入而非导入，避免 stats 依赖 schema 的具体实现
 *   （也便于测试替换时间基准）。
 */
export function summarize(
  entries: MemoryEntry[],
  events: MemoryEvent[],
  misses: MissRecord[],
  { nowMs }: { nowMs: number },
  expiryOf: (entry: { lastCitedAt?: string; updatedAt?: string; createdAt?: string }, now: number) => Expiry,
): MemoryStats {
  const byDomain = new Map<string, MemoryStats['domains'][number]>()
  let bytes = 0
  let tokens = 0
  let overLimit = 0
  for (const entry of entries) {
    bytes += entry.bytes
    tokens += entry.tokens
    if (entry.overLineLimit) overLimit += 1
    const bucket = byDomain.get(entry.domain) ?? {
      key: entry.domain, label: entry.domainLabel, files: 0, bytes: 0, tokens: 0, overLimit: 0,
    }
    bucket.files += 1
    bucket.bytes += entry.bytes
    bucket.tokens += entry.tokens
    if (entry.overLineLimit) bucket.overLimit += 1
    byDomain.set(entry.domain, bucket)
  }

  const layers: MemoryStats['layers'] = {
    l0: { files: 0, tokens: 0 },
    l1: { files: 0, tokens: 0 },
    l2: { files: 0, tokens: 0 },
  }
  for (const entry of entries) {
    const key = String(entry.layer).toLowerCase()
    if (key === 'l0' || key === 'l1' || key === 'l2') {
      layers[key].files += 1
      layers[key].tokens += entry.tokens
    }
  }

  // 三率：口径写死在这里，两端共用
  const windowStart = nowMs - 30 * 86_400_000
  const recent = events.filter((event) => {
    const at = Date.parse(event.at ?? '')
    return Number.isFinite(at) && at >= windowStart
  })
  const recallEvents = recent.filter(event => event.kind === 'recall')
  const citedIds = new Set<string>()
  for (const event of recent) {
    if (event.kind !== 'cite') continue
    for (const id of event.ids ?? []) citedIds.add(id)
  }
  const recalledIds = new Set<string>()
  for (const event of recallEvents) {
    for (const id of event.ids ?? []) recalledIds.add(id)
  }
  /**
   * 命中率 = 30 天内 cite 条目数 ÷ recall 条目数。
   *
   * - 搜到 ≠ 用到，所以只在 `cite` 时算命中（否则会虚高到接近 100%，
   *   见 docs/product.md §17.10③）；
   * - `Math.min(1, ...)` 是上限保护：cite 可以引用不在 recall 集合里的条目
   *   （例如 agent 直接 read 后回填），此时比值可能 > 1。
   */
  const hitRate = recalledIds.size === 0 ? null : Math.min(1, citedIds.size / recalledIds.size)

  const confirmed = entries.filter(entry => entry.status === 'confirmed').length
  const rejected = entries.filter(entry => entry.status === 'rejected').length
  const confirmRate = confirmed + rejected === 0 ? null : confirmed / (confirmed + rejected)

  /**
   * 过期率分子 = stale **或** archived。
   * 注意：这个 `stale` 与 `counts.stale` **不是同一个口径**——
   * 这里含 archived，counts 里只数 stale。两处都保留原样。
   */
  const staleOrArchived = entries.filter(
    entry => entry.status === 'stale' || entry.status === 'archived',
  ).length
  const expireRate = entries.length === 0 ? null : staleOrArchived / entries.length

  const missTotal = misses.length
  const missVerified = misses.filter(miss => miss.state === 'verified').length
  const missRate = missTotal === 0 ? null : missVerified / missTotal

  return {
    files: entries.length,
    bytes,
    tokens,
    overLimit,
    /** 按文件数降序（不是 tokens）——保持原口径。 */
    domains: [...byDomain.values()].sort((a, b) => b.files - a.files),
    layers,
    rates: { hitRate, confirmRate, expireRate, missRate },
    misses: { total: missTotal, verified: missVerified },
    counts: {
      pending: entries.filter(entry => entry.status === 'hypothesis' || entry.status === 'observed').length,
      confirmed,
      rejected,
      stale: entries.filter(entry => entry.status === 'stale').length,
      archived: entries.filter(entry => entry.status === 'archived').length,
    },
    expiry: entries.map(entry => ({ id: entry.id, ...expiryOf(entry, nowMs) })),
  }
}
