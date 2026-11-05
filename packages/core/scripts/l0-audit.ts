/**
 * L0 常驻前缀审计：回答「这 286 tokens 到底是什么」。
 *
 * 用法：node --experimental-strip-types scripts/l0-audit.ts
 */
import { createStore } from '../src/store.ts'
import { createActions } from '../src/actions.ts'

const store = createStore({ root: process.env.MEMORY_OPS_ROOT ?? `${process.env.HOME}/.memory-ops` })
const actions = createActions({ store })
const snap = await actions.snapshot()
if (!snap.ok) throw new Error(snap.error)

const l0 = snap.entries.filter(entry => entry.layer === 'l0')
console.log(`L0 常驻层：${l0.length} 个文件，合计 ${l0.reduce((sum, e) => sum + e.tokens, 0)} tokens\n`)
for (const entry of l0) {
  console.log(`  ${entry.path}`)
  console.log(`    ${entry.tokens} tokens · ${entry.bytes} B · ${entry.lines} 行 · pinned=${entry.pinned} · ${entry.title}`)
}

console.log('\n各层分布：')
for (const layer of ['l0', 'l1', 'l2']) {
  const rows = snap.entries.filter(entry => entry.layer === layer)
  const tokens = rows.reduce((sum, entry) => sum + entry.tokens, 0)
  console.log(`  ${layer}: ${rows.length} 个文件 / ${tokens} tokens`)
}
const other = snap.entries.filter(entry => !['l0', 'l1', 'l2'].includes(entry.layer))
if (other.length > 0) {
  console.log(`  未标层: ${other.length} 个文件 / ${other.reduce((s, e) => s + e.tokens, 0)} tokens`)
}

console.log('\n最重的 8 个条目：')
for (const entry of [...snap.entries].sort((a, b) => b.tokens - a.tokens).slice(0, 8)) {
  console.log(`  ${String(entry.tokens).padStart(5)}  ${entry.layer.padEnd(2)}  ${entry.path}`)
}
