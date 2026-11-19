#!/usr/bin/env node
/**
 * shot-prototype.mjs —— 把 prototype/index.html 渲染成 PNG（亮/暗 × 5 分区）。
 *
 * 与 shot.mjs 的区别：那个截的是运行中的 DSH GUI（要 token），
 * 这个截的是本地原型（file://），用于 v5 预览图交付。
 *
 * 用法：node scripts/shot-prototype.mjs [--out prototype/shots-v5]
 * 依赖：本机任一 Chromium（Edge / Chrome）。可用 DSH_CHROME_BIN 指定。
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

/* eslint-disable no-console */

const argv = process.argv.slice(2)
const opt = (name, fallback) => {
  const pref = `--${name}=`
  const eq = argv.find(a => a.startsWith(pref))
  if (eq !== undefined) return eq.slice(pref.length)
  const i = argv.indexOf(`--${name}`)
  return i >= 0 && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback
}

const outDir = resolve(opt('out', 'prototype/shots-v5'))
const width = Number(opt('width', '480'))
const height = Number(opt('height', '1000'))
const root = resolve(opt('root', 'prototype'))

const CANDIDATES = [
  process.env.DSH_CHROME_BIN,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean)
const CHROME = CANDIDATES.find(p => existsSync(p))
if (CHROME === undefined) {
  console.error('找不到 Chromium，设置 DSH_CHROME_BIN')
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

const PANES = ['today', 'capture', 'todo', 'memory', 'health']
const THEMES = ['light', 'dark']

let exitCode = 0
try {
  await waitForChrome()

  /* /remember 弹窗演示：打开弹窗后截浮层（插件 bug 的可视化回归锚点）。 */
  for (const theme of THEMES) {
    const url = `${pathToFileURL(join(root, 'index.html'))}?theme=${theme}#today/ready`
    const page = await openPage(url)
    await new Promise(r => setTimeout(r, 700))
    await page.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('[data-action="open-remember"]');
        if (btn) { btn.click(); return 'opened' }
        return 'missing'
      })()`,
      returnByValue: true,
    })
    await new Promise(r => setTimeout(r, 400))
    const shot = await page.send('Page.captureScreenshot', {
      format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 },
    })
    writeFileSync(join(outDir, `remember-${theme}.png`), Buffer.from(shot.result.data, 'base64'))
    page.close()
    console.log(`✓ ${join(outDir, `remember-${theme}.png`)}`)
  }

  for (const theme of THEMES) {
    for (const pane of PANES) {
      const url = `${pathToFileURL(join(root, 'index.html'))}?theme=${theme}&unfold=1#${pane}/ready`
      const target = url
      const page = await openPage(target)
      await new Promise(r => setTimeout(r, 800))
      // 预览图只要产品面板：隐藏原型控制台
      await page.send('Runtime.evaluate', {
        expression: `(() => {
          const h = document.getElementById('harness');
          if (h !== null) h.style.display = 'none';
          const s = document.querySelector('.stage');
          if (s !== null) s.style.padding = '16px';
          return 'ok';
        })()`,
        returnByValue: true,
      })
      await new Promise(r => setTimeout(r, 200))
      const diag = await page.send('Runtime.evaluate', {
        expression: `(() => {
          const panel = document.querySelector('.panel-body');
          return {
            hasPanel: panel !== null,
            textLength: (document.body.innerText || '').length,
            theme: document.body.hasAttribute('data-ds-dark-theme') ? 'dark' : 'light',
            pane: (window.location.hash || '').split('/')[0],
          };
        })()`,
        returnByValue: true,
      })
      const info = diag.result?.result?.value ?? {}
      if (info.hasPanel !== true || info.textLength < 80 || info.theme !== theme) {
        console.error(`⚠️ ${pane}/${theme} 渲染异常`, JSON.stringify(info))
        exitCode = 1
      }
      const metrics = await page.send('Page.getLayoutMetrics')
      const h = Math.min(Math.ceil(metrics.result.cssContentSize.height), 1400)
      const shot = await page.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width, height: h, scale: 1 },
      })
      const outPath = join(outDir, `${pane}-${theme}.png`)
      writeFileSync(outPath, Buffer.from(shot.result.data, 'base64'))
      page.close()
      console.log(`✓ ${outPath}`)
    }
  }
} finally {
  proc.kill()
}

process.exit(exitCode)
