/**
 * 探测宿主 GUI 的 DOM —— 只回答一个问题：v9 面板挂上去了没有、从哪儿进去。
 *
 * 用法：node scripts/probe-gui.mjs [url]
 * 输出：title / 前 800 字正文 / 侧栏可点项 / 是否出现 .mo-app
 *
 * 为什么单独一个探测脚本：在写正式量测脚本前，必须先知道宿主侧栏的
 * 真实结构（类名与 aria 角色都由宿主决定），拍脑袋写选择器必然点不到。
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const url = process.argv[2] ?? 'http://127.0.0.1:64742'

const CANDIDATES = [
  process.env.DSH_CHROME_BIN,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean)
const CHROME = CANDIDATES.find(p => existsSync(p))
if (CHROME === undefined) {
  console.error('找不到 Chrome/Edge，设置 DSH_CHROME_BIN')
  process.exit(2)
}

const port = 9800 + Math.floor(Math.random() * 150)
const profile = mkdtempSync(join(tmpdir(), 'mo-gui-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-dev-shm-usage', '--force-device-scale-factor=1',
  '--window-size=1614,900',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: 'ignore' })

const wait = ms => new Promise(r => setTimeout(r, ms))

async function waitForChrome() {
  for (let i = 0; i < 150; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (r.ok) return
    } catch { /* 还没起来 */ }
    await wait(100)
  }
  throw new Error('Chrome 未在 15s 内启动')
}

async function openPage() {
  const info = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json()
  const ws = new WebSocket(info.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  let seq = 0
  const pending = new Map()
  const logs = []
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.method === 'Runtime.exceptionThrown') {
      logs.push(`EXCEPTION ${msg.params?.exceptionDetails?.text} ${msg.params?.exceptionDetails?.exception?.description ?? ''}`)
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      const args = (msg.params?.args ?? []).map(a => a.value ?? a.description ?? '').join(' ')
      logs.push(`CONSOLE[${msg.params?.type}] ${args}`)
    }
    if (msg.method === 'Log.entryAdded') {
      logs.push(`LOG[${msg.params?.entry?.level}] ${msg.params?.entry?.text}`)
    }
    if (msg.id !== undefined && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    }
  }
  const send = (method, params = {}) => new Promise((res) => {
    const id = ++seq
    pending.set(id, res)
    ws.send(JSON.stringify({ id, method, params }))
  })
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Log.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 1614, height: 900, deviceScaleFactor: 1, mobile: false })
  return { send, logs, close: () => ws.close() }
}

let page
try {
  await waitForChrome()
  page = await openPage()
  await page.send('Page.navigate', { url })
  await wait(4000)

  const probe = await page.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const text = (document.body.innerText || '').slice(0, 800)
      const clickables = Array.from(document.querySelectorAll('button,a,[role=tab],[role=menuitem]'))
        .map(el => ({ tag: el.tagName, role: el.getAttribute('role'), label: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 24) }))
        .filter(item => item.label !== '')
        .slice(0, 60)
      return {
        title: document.title,
        hasApp: document.querySelector('.mo-app') !== null,
        url: location.href,
        text,
        clickables,
      }
    })()`,
  })
  console.log(JSON.stringify({ ...probe.result.result.value, logs: page.logs.slice(-12) }, null, 2))
} finally {
  if (page) page.close()
  chrome.kill()
}