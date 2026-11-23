/**
 * 抓一份真实桥数据当 harness 夹具。
 *
 * 为什么要单独一步而不是把夹具入库：夹具里是**真实个人库内容**
 * （条目标题、路径、未命中问题）。入公开仓库等于把个人记忆一起推上去。
 * 所以夹具写到 `tools/v9-harness/fixtures.json`（已 gitignore），
 * 每次换机器/换库重抓一次即可。
 *
 * 前置：宿主的 HTTP 桥在跑（插件已装好），默认 http://127.0.0.1:64742。
 *
 * 用法：
 *   node scripts/capture-fixtures.mjs [--base http://127.0.0.1:64742] [--cwd G:\\memory-ops-dsh]
 */

import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const outFile = path.join(here, '..', 'tools', 'v9-harness', 'fixtures.json')

const argv = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : fallback
}

const base = opt('base', 'http://127.0.0.1:64742')
const cwd = opt('cwd', process.cwd())

/** 调一条桥路由。 */
async function call(route, body = {}) {
  const response = await fetch(`${base}/api/dsh-memory-ops/${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json()
  if (payload?.ok === false) throw new Error(`${route}: ${payload.error ?? '未知错误'}`)
  return payload
}

const snapshot = await call('snapshot', { cwd })
const overview = await call('overview')
const inbox = await call('inbox', { domain: 'personal' })
const misses = await call('misses')
const health = await call('health')

/* 详情取一条真实存在的条目：优先置顶条目，没有就取第一条。 */
const entries = Array.isArray(snapshot.entries) ? snapshot.entries : []
const target = entries.find(entry => entry.pinned === true) ?? entries[0]
const detail = target === undefined ? { entry: { body: '' } } : await call('detail', { path: target.path })

await fsp.writeFile(outFile, JSON.stringify({ snapshot, overview, inbox, misses, health, detail }, null, 2), 'utf8')
console.log(`夹具已写入 ${outFile}（entry=${target?.id ?? 'none'}）`)
console.log('下一步：node scripts/build-harness.mjs && node scripts/measure-v9-plugin.mjs')