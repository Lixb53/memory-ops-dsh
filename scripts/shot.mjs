#!/usr/bin/env node
/**
 * 真机截图：把运行中的 DSH Web GUI 渲染成 PNG，用于**肉眼验证插件界面**。
 *
 * ## 为什么需要它
 *
 * 之前所有「界面能工作」的结论都是推断：数据层正确 + 结构正确 ≠ 看起来正确。
 * 实测踩过的白屏事故（hook 顺序违规）就是典型——数据全对、类型全绿，
 * 界面一片空白，而我没有手段发现。
 *
 * ## 用法
 *
 * 先起一个带 token 的 web 实例（token 只有启动时才打印，见下），再截图：
 *
 *   dsh --profile web --port 18080 --no-open
 *   # 输出：dsh web: http://127.0.0.1:18080/?token=XXXX
 *   node scripts/shot.mjs --url 'http://127.0.0.1:18080/?token=XXXX' --out ./shots
 *
 * 可选：
 *   --click '<css>'   截图前先点某个元素（用于切分区/展开面板）
 *   --wait  <ms>      JS 执行完后的额外等待，默认 1200
 *   --width <px>      视口宽度，默认 1440
 *   --full            整页截图（含滚动区），默认只截视口
 *
 * 退出码：出错即 1。
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/* eslint-disable no-console */

const argv = process.argv.slice(2)
const opt = (name, fallback) => {
  const pref = `--${name}=`
  const eq = argv.find(a => a.startsWith(pref))
  if (eq !== undefined) return eq.slice(pref.length)
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback
}
const flag = name => argv.includes(`--${name}`)

const url = opt('url', '')
if (url === '') {
  console.error('缺少 --url。示例：node scripts/shot.mjs --url "http://127.0.0.1:18080/?token=XXX"')
  process.exit(2)
}
const outDir = resolve(opt('out', 'shots'))
const width = Number(opt('width', '1440'))
const height = Number(opt('height', '900'))
const waitMs = Number(opt('wait', '1200'))
const clickSel = opt('click', '')
const name = opt('name', 'shot')
const full = flag('full')

/** 找可用的 Chromium：优先 playwright 自带的 chrome-headless-shell。 */
const CANDIDATES = [
  process.env.DSH_CHROME_BIN,
  join(process.env.HOME ?? '', 'Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell'),
  join(process.env.HOME ?? '', 'Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean)
const CHROME = CANDIDATES.find(p => existsSync(p))
if (CHROME === undefined) {
  console.error('找不到 Chromium，设置 DSH_CHROME_BIN 指向 chrome-headless-shell')
  process.exit(2)
}

mkdirSync(outDir, { recursive: true })
const port = 9500 + Math.floor(Math.random() * 400)
const profile = mkdtempSync(join(tmpdir(), 'memops-shot-'))

const proc = spawn(
  CHROME,
  [
    '--headless', '--no-sandbox', '--in-process-gpu', '--disable-gpu', '--no-first-run',
    '--hide-scrollbars', '--disable-dev-shm-usage',
    `--window-size=${width},${height}`,
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)

/** 等 Chrome 起来（最多 12s）。 */
async function waitForChrome() {
  for (let i = 0; i < 120; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (response.ok) return
    } catch { /* 还没起来 */ }
    await new Promise(r => setTimeout(r, 100))
  }
  throw new Error('Chrome 未在 12s 内启动')
}

/** 开一个 page 并拿到 CDP 通道。 */
async function openPage(target) {
  const info = await (await fetch(
    `http://127.0.0.1:${port}/json/new?${encodeURIComponent(target)}`,
    { method: 'PUT' },
  )).json()
  const ws = new WebSocket(info.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
  let seq = 0
  const pending = new Map()
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
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
  return { send, close: () => ws.close() }
}

let exitCode = 0
try {
  await waitForChrome()
  const page = await openPage(url)
  // 等 SPA 把插件挂上（首屏 JS 执行 + 路由注册）
  await new Promise(r => setTimeout(r, waitMs))

  if (clickSel !== '') {
    const res = await page.send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.querySelector(${JSON.stringify(clickSel)});
        if (el === null) return 'missing';
        el.click();
        return 'clicked';
      })()`,
      returnByValue: true,
    })
    const outcome = res.result?.result?.value
    if (outcome === 'missing') {
      console.error(`⚠️  --click 找不到元素：${clickSel}`)
      exitCode = 1
    } else {
      console.log(`已点击 ${clickSel}`)
      await new Promise(r => setTimeout(r, 600))
    }
  }

  // 抓页面上的 console 错误——白屏类问题通常先在这里露头
  const diag = await page.send('Runtime.evaluate', {
    expression: `(() => {
      const root = document.querySelector('.dmo-root');
      return {
        hasPluginRoot: root !== null,
        bodyTextLength: (document.body.innerText || '').length,
        title: document.title,
      };
    })()`,
    returnByValue: true,
  })
  const info = diag.result?.result?.value ?? {}

  let clip
  if (full) {
    const metrics = await page.send('Page.getLayoutMetrics')
    const h = Math.ceil(metrics.result.cssContentSize.height)
    clip = { x: 0, y: 0, width, height: h, scale: 1 }
  } else {
    clip = { x: 0, y: 0, width, height, scale: 1 }
  }

  const shot = await page.send('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: full, clip,
  })
  const outPath = join(outDir, `${name}-${width}.png`)
  writeFileSync(outPath, Buffer.from(shot.result.data, 'base64'))
  page.close()

  console.log(`截图：${outPath}`)
  console.log(`插件根节点 .dmo-root 存在：${info.hasPluginRoot ? '是' : '否 ← 界面可能没挂载'}`)
  console.log(`页面可见文本长度：${info.bodyTextLength}`)
  if (info.hasPluginRoot !== true) exitCode = 1
} finally {
  proc.kill()
}

process.exit(exitCode)
