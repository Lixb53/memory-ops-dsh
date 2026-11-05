/**
 * 真实数据巡检脚本（不进 CI，供开发时核对口径）。
 * 用法：node --experimental-strip-types scripts/real-check.ts
 */
import { createStore } from '../src/store.ts'
import { createActions } from '../src/actions.ts'

const store = createStore({ root: process.env.MEMORY_OPS_ROOT ?? `${process.env.HOME}/.memory-ops` })
const actions = createActions({ store })

const snap = await actions.snapshot()
if (!snap.ok) throw new Error(snap.error)
console.log('=== snapshot entries:', snap.entries.length, 'queue:', snap.queue.length)
console.log('domains:', JSON.stringify(snap.stats.domains.map(d => [d.key, d.files, d.tokens])))
console.log('layers:', JSON.stringify(snap.stats.layers))
console.log('overLimit:', snap.stats.overLimit, 'counts:', JSON.stringify(snap.stats.counts))

const ov = await actions.overview()
if (!ov.ok) throw new Error(ov.error)
console.log('=== overview kpi', JSON.stringify(ov.kpi))
console.log('=== rates', JSON.stringify(ov.rates))

const ib = await actions.inbox({ domain: 'personal' })
if (!ib.ok) throw new Error(ib.error)
console.log('=== inbox', ib.entries.length, JSON.stringify(ib.throughput))

for (const query of ['缓存', '假空态 cwd', '临夏 禁毒']) {
  const s = await actions.search({ query, record: false })
  if (!s.ok) throw new Error(s.error)
  console.log(`=== search "${query}" ->`, s.matched, s.total,
    JSON.stringify(s.hits.slice(0, 2).map(h => [h.title, h.path, h.tokens])))
}
