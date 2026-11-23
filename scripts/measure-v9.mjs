#!/usr/bin/env node
/**
 * measure-v9.mjs —— v9 原型的真机量测 + 截图（验收标准 1–8 + 10）
 *
 * 为什么必须真机：机检（lint / assert）只证明结构与样式规则没坏，
 * 不证明「三栏真的是 212/946/360」「首屏真不滚」「diff 真的是上下叠」。
 * v8 的教训（docs/product.md §17.14）：推断不等于看见。
 *
 * 用法：
 *   node scripts/measure-v9.mjs [--width 1614] [--height 900] [--out prototype/shots-v9]
 *
 * 退出码 = 失败项数。0 表示全部通过。
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

const width = Number(opt('width', '1614'))
const height = Number(opt('height', '900'))
const outDir = resolve(opt('out', 'prototype/shots-v9'))
const entry = resolve('prototype/index.html')
const url = pathToFileURL(entry).href

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

mkdirSync(outDir, { recursive: true })
const port = 9700 + Math.floor(Math.random() * 200)
const profile = mkdtempSync(join(tmpdir(), 'mo-v9-'))

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', '--disable-dev-shm-usage', '--force-device-scale-factor=1',
  `--window-size=${width},${height}`,
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: 'ignore' })

async function waitForChrome() {
  for (let i = 0; i < 150; i += 1) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (r.ok) return
    } catch { /* 还没起来 */ }
    await new Promise(r => setTimeout(r, 100))
  }
  throw new Error('Chrome 未在 15s 内启动')
}

async function openPage() {
  const info = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json()
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
  await send('Emulation.setDeviceMetricsOverride', {
    width, height, deviceScaleFactor: 1, mobile: false,
  })
  return { send, close: () => ws.close() }
}

const wait = ms => new Promise(r => setTimeout(r, ms))

/** 在输入框里真的敲字（触发 input 事件），用来验证 diff 路径。 */
async function typeStrict(page, sel, value) {
  const r = await page.send('Runtime.evaluate', {
    expression: `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'missing'; el.focus(); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('input', { bubbles: true })); return 'ok'; })()`,
    returnByValue: true,
  })
  const v = r.result && r.result.result && r.result.result.value
  if (v !== 'ok') { failures.push(`type ${sel}: ${v}`); return false }
  await wait(260)
  return true
}

/** 点一个必须存在的元素；找不到或抛异常都算失败（v9 评审 A23：静默通过会伪造证据）。 */
async function clickStrict(page, sel, waitMs) {
  const r = await page.send('Runtime.evaluate', {
    expression: `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'missing'; el.click(); return 'ok'; })()`,
    returnByValue: true,
  })
  const ex = r.result && r.result.exceptionDetails
  if (ex) { failures.push(`click ${sel}: ${ex.text}`); return false }
  const v = r.result && r.result.result && r.result.result.value
  if (v !== 'ok') { failures.push(`click ${sel}: ${v}`); return false }
  await wait(waitMs || 250)
  return true
}

const METRICS = `(() => {
  const q = s => document.querySelector(s);
  const rect = el => (el ? el.getBoundingClientRect() : null);
  const rail = q('.rail'), center = q('.center'), insp = q('.insp');
  const t0 = document.querySelectorAll('.t0');
  const lede = q('.lede');
  const pane = q('.pane');
  const titles = Array.from(document.querySelectorAll('.row-title')).map(e => rect(e).width);
  const removed = document.querySelectorAll('.diff-removed');
  const added = document.querySelectorAll('.diff-added');
  const t0Style = t0[0] ? getComputedStyle(t0[0]) : null;
  const appStyle = getComputedStyle(q('.app'));
  const parse = c => {
    const m = c.match(/[\\d.]+/g) || ['0','0','0'];
    return [Number(m[0]), Number(m[1]), Number(m[2])];
  };
  const lum = ([r,g,b]) => {
    const f = v => { const s = v/255; return s <= 0.03928 ? s/12.92 : Math.pow((s+0.055)/1.055, 2.4); };
    return 0.2126*f(r) + 0.7152*f(g) + 0.0722*f(b);
  };
  const c1 = t0Style ? parse(t0Style.color) : [0,0,0];
  const c2 = parse(appStyle.backgroundColor);
  const l1 = lum(c1), l2 = lum(c2);
  const contrast = (Math.max(l1,l2) + 0.05) / (Math.min(l1,l2) + 0.05);
  return {
    railW: rail ? rect(rail).width : null,
    centerW: center ? rect(center).width : null,
    inspW: insp ? rect(insp).width : null,
    gap: rail && center ? rect(center).left - rect(rail).right : null,
    t0Count: t0.length,
    t0Text: t0[0] ? t0[0].textContent.trim() : '',
    ledeText: lede ? lede.textContent : '',
    ledeH: lede ? rect(lede).height : null,
    maxTitleW: titles.length ? Math.max.apply(null, titles) : 0,
    paneOverflow: pane ? pane.scrollHeight - pane.clientHeight : null,
    inspOverflow: document.querySelector('.insp-body') ? document.querySelector('.insp-body').scrollHeight - document.querySelector('.insp-body').clientHeight : null,
    pageOverflow: document.documentElement.scrollHeight - window.innerHeight,
    tabs: document.querySelectorAll('[role=tab]').length,
    diffRemoved: removed.length,
    diffAdded: added.length,
    diffStacked: removed.length && added.length
      ? Math.round(rect(removed[0]).top) !== Math.round(rect(added[0]).top) : null,
    rowH: document.querySelector('.row-button') ? rect(document.querySelector('.row-button')).height : null,
    contrast: Math.round(contrast * 10) / 10,
    textLen: (document.body.innerText || '').length
  };
})()`

const CASES = [
  { name: 'today-light', hash: '#today', actions: [] },
  { name: 'capture-light', hash: '#capture', actions: [] },
  { name: 'todo-light', hash: '#todo', actions: [] },
  { name: 'memory-light', hash: '#memory', actions: [] },
  { name: 'memory-cost-light', hash: '#memory', actions: [{ click: '[data-face=cost]' }], checkFace: true },
  { name: 'health-light', hash: '#health', actions: [] },
  { name: 'health-edit-light', hash: '#health', actions: [{ click: '[data-act=edit]' }, { type: '#pinTitle', value: '所有会话一律用中文回答与思考（包括代码注释）' }], checkEdit: true },
  { name: 'health-version-host-light', hash: '#health', actions: [{ click: '[data-host]' }, { sel: 'version' }, { click: '[data-act=check-update]', wait: 1400 }] },
  { name: 'health-error-light', hash: '#health/error', actions: [], checkError: true },
  { name: 'today-empty-light', hash: '#today/empty', actions: [], checkEmpty: true },
  { name: 'health-dark', hash: '#health', actions: [{ click: '[data-theme=dark]' }], checkDark: true },
  { name: 'today-loading-light', hash: '#today/loading', actions: [] },
]

const failures = []
let baselineRowH = 0
const record = (name, ok, detail) => {
  if (!ok) failures.push(`${name}: ${detail}`)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`)
}

let page
try {
  await waitForChrome()
  page = await openPage()
  const all = []

  for (const c of CASES) {
    // 用例之间必须先回 about:blank：hash-only 导航不重载页面，状态会跨用例泄漏（v9 评审 P1-A23）
    await page.send('Page.navigate', { url: 'about:blank' })
    await wait(120)
    await page.send('Page.navigate', { url: `${url}${c.hash}` })
    await wait(450)
    let aborted = false
    for (const a of c.actions) {
      if (a.click && !(await clickStrict(page, a.click, a.wait))) { aborted = true; break }
      if (a.sel && !(await clickStrict(page, `[data-select="${a.sel}"]`, 250))) { aborted = true; break }
      if (a.type && !(await typeStrict(page, a.type, a.value))) { aborted = true; break }
    }
    if (aborted) continue
    const res = await page.send('Runtime.evaluate', { expression: METRICS, returnByValue: true })
    const m = res.result.result.value
    all.push({ case: c.name, ...m })

    // 1. 三栏 212 / ~946 / 360，列间距 24
    record(`${c.name} 三栏`, Math.abs(m.railW - 212) <= 1 && Math.abs(m.inspW - 360) <= 1 && Math.abs(m.centerW - 946) <= 4 && Math.abs(m.gap - 24) <= 1,
      `rail=${m.railW} center=${m.centerW} insp=${m.inspW} gap=${m.gap}`)

    // 2. 每页 1 个 T0，且含数字（error 态允许「—」）
    const t0Ok = m.t0Count === 1 && ((c.checkError || c.name.includes('loading')) ? m.t0Text === '—' : /\d/.test(m.t0Text))
    record(`${c.name} T0`, t0Ok, `count=${m.t0Count} text="${m.t0Text}"`)

    // 3. 判定句 ≤20 字且单行
    record(`${c.name} 判定句`, m.ledeText.length <= 20 && m.ledeH <= 24, `len=${m.ledeText.length} h=${m.ledeH}`)

    // 4. 标题列 ≤720
    record(`${c.name} 行宽`, m.maxTitleW <= 720.5, `maxTitleW=${m.maxTitleW}`)

    // 5. 首屏 0 滚动（中栏 + 检视栏 + 整页三处都不许溢出）
    record(`${c.name} 首屏`, m.paneOverflow <= 1 && m.pageOverflow <= 1, `paneOverflow=${m.paneOverflow} pageOverflow=${m.pageOverflow}`)
    record(`${c.name} 检视栏`, m.inspOverflow <= 1, `inspOverflow=${m.inspOverflow}`)

    // 6. 双面切换行高不变（与未切换时对比，不写死像素）
    if (c.checkFace) record(`${c.name} 行高不变`, Math.abs(m.rowH - baselineRowH) <= 0.5, `rowH=${m.rowH} baseline=${baselineRowH}`)
    else if (c.name === 'memory-light') baselineRowH = m.rowH

    // 7. diff 上下叠
    if (c.checkEdit) record(`${c.name} diff`, m.diffRemoved >= 1 && m.diffAdded >= 1 && m.diffStacked === true,
      `removed=${m.diffRemoved} added=${m.diffAdded} stacked=${m.diffStacked}`)

    // 8. error 态保留导航
    if (c.checkError) record(`${c.name} 导航保留`, m.tabs === 5, `tabs=${m.tabs}`)

    // 9. empty 态不出现 0 冒充
    if (c.checkEmpty) record(`${c.name} 空态`, m.textLen > 300, `textLen=${m.textLen}`)

    // 10. 深色对比 ≥3（T0 是大文本）
    if (c.checkDark) record(`${c.name} 对比`, m.contrast >= 3, `contrast=${m.contrast}`)

    // 11. 渲染成功（有内容，不是白屏）
    record(`${c.name} 渲染`, m.textLen > 250, `textLen=${m.textLen}`)

    const shot = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 } })
    writeFileSync(join(outDir, `${c.name}.png`), Buffer.from(shot.result.data, 'base64'))
  }

  writeFileSync(join(outDir, 'metrics.json'), JSON.stringify({ width, height, cases: all }, null, 2))
  console.log(`\n截图与 metrics：${outDir}`)
} finally {
  if (page) page.close()
  chrome.kill()
}

console.log(`\nTOTAL FAILURES: ${failures.length}`)
failures.forEach(f => console.log(`  - ${f}`))
process.exit(failures.length)