/** 核对「本项目」口径：project 过滤后 l0 到底剩什么。 */
import { createStore } from '../src/store.ts'
import { createActions } from '../src/actions.ts'

const store = createStore({ root: process.env.MEMORY_OPS_ROOT ?? `${process.env.HOME}/.memory-ops` })
const actions = createActions({ store })

for (const project of [undefined, 'sz-web', 'dsh-workspace']) {
  const snap = await actions.snapshot(project === undefined ? {} : { project })
  if (!snap.ok) throw new Error(snap.error)
  const l0 = snap.entries.filter(e => e.layer === 'l0')
  console.log(`project=${String(project)}`)
  console.log(`  条目 ${snap.entries.length} 个 | stats.layers.l0.tokens=${snap.stats.layers.l0.tokens}（全量）`)
  console.log(`  过滤后 l0 文件: ${l0.map(e => `${e.path}(${e.tokens})`).join(', ') || '无'}`)
}
