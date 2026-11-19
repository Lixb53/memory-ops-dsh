#!/usr/bin/env node
/**
 * shot-mockup.mjs —— 把 design/mockups-v6.html 逐帧截图（10 张：5 分区 × 亮/暗）。
 * 用法：node scripts/shot-mockup.mjs
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const outDir = resolve('design/shots-v6')
const CANDIDATES = [
  process.env.DSH_CHROME_BIN,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean)
const CHROME = CANDIDATES.find(p => existsSync(p))
if (!CHROME) { console.error('no chromium'); process.exit(2) }

mkdirSync(outDir, { recursive: true })
const port = 9500 + Math.floor(Math.random() * 400)
const profile = mkdtempSync(join(tmpdir(), 'memops-shot-'))
const proc = spawn(CHROME, [
  '--headless', '--no-sandbox', '--in-process-gpu', '--disable-gpu', '--no-first-run',
  '--hide-scrollbars', '--disable-dev-shm-usage',
  '--window-size=440,1400', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: 'ignore' })

async function wait() {
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) return } catch {}
    await new Promise(r => setTimeout(r, 100))
  }
  throw new Error('chrome timeout')
}
async function page(target) {
  const info = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(target)}`, { method: 'PUT' })).json()
  const ws = new WebSocket(info.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  let seq = 0; const pend = new Map()
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id !== undefined && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } }
  const send = (method, params = {}) => new Promise(res => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ id, method, params })) })
  await send('Page.enable'); await send('Runtime.enable')
  return { send, close: () => ws.close() }
}

const frames = ['today', 'capture', 'todo', 'memory', 'health']
  .flatMap(p => [p, `${p}-dark`])

try {
  await wait()
  for (const f of frames) {
    const url = `${pathToFileURL(resolve('design/mockups-v6.html'))}#${f}`
    const p = await page(url)
    await new Promise(r => setTimeout(r, 500))
    const m = await p.send('Page.getLayoutMetrics')
    const h = Math.min(Math.ceil(m.result.cssContentSize.height), 2000)
    const shot = await p.send('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: 440, height: h, scale: 2 },
    })
    writeFileSync(join(outDir, `${f}.png`), Buffer.from(shot.result.data, 'base64'))
    p.close()
    console.log('✓', `${f}.png`, `440x${h}@2x`)
  }
} finally { proc.kill() }
