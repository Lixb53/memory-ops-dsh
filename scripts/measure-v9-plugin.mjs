/**
 * v9 面板真机量测 —— 在真实 Chrome 里渲染 harness，量三栏 / T0 / 行宽 / 溢出 / diff。
 *
 * ## 为什么不是「看一眼截图」
 *
 * 原型 v8 的教训（docs/product.md §17.14）：机检只证明规则没坏，不证明
 * 「三栏真的是 212/946/360」「首屏真不滚」。所以这里对每个用例做数字断言，
 * 失败即退出码非 0，并保留截图与 metrics.json。
 *
 * ## 覆盖
 *
 * - 5 个分区：三栏宽度、T0 唯一且含数字、判定句 ≤20 字且单行、首屏三处不溢出；
 * - 双面切换：行高不变；
 * - 置顶编辑：diff 上下叠（删除行/新增行 top 不同）、tokens Δ、生效时机；
 * - 深色：T0 对比 ≥3；
 * - error / empty 四态：T0 为「—」/0，顶条与导航保留。
 *
 * 用法：node scripts/measure-v9-plugin.mjs [--out .tmp/preview/shots]
 * 前置：node scripts/build-harness.mjs
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { extname, join, resolve } from 'node:path'

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
const outDir = resolve(opt('out', '.tmp/preview/shots'))
const entry = resolve('.tmp/preview/index.html')

/**
 * 为什么必须走 http 而不是 file://
 *
 * harness 是 ESM `<script type="module">`。file:// 下 Chrome 把模块请求当成
 * 跨源（origin null）直接拦掉，页面白屏且 console 里只有一条 CORS——
 * 看起来像「组件崩了」，实际是加载方式不对。所以这里起一个只读静态服务器。
 */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.map': 'application/json; charset=utf-8',
}

const server = createServer((req, res) => {
  const pathname = decodeURIComponent(String(req.url ?? '/').split('?')[0] ?? '/')
  const root = resolve('.tmp/preview')
  const target = pathname === '/' ? entry : resolve(root, `.${pathname}`)
  /* 只许读输出目录内的文件：路径归一化后必须仍在 root 下。 */
  if (target !== entry && !target.startsWith(`${root}\\`) && !target.startsWith(`${root}/`)) {
    res.writeHead(403)
    res.end('forbidden')
    return
  }
  try {
    const body = readFileSync(target)
    res.writeHead(200, { 'content-type': MIME[extname(target)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404)
    res.end('not found')
  }
})
await new Promise((done) => { server.listen(0, '127.0.0.1', done) })
const srvPort = server.address().port
const url = `http://127.0.0.1:${srvPort}/index.html`

const CANDIDATES = [
  process.env.DSH_CHROME_BIN,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean)
const CHROME = CANDIDATES.find(p => existsSync(p))
if (!existsSync(entry)) {
  console.error('没有 harness：先跑 node scripts/build-harness.mjs')
  process.exit(2)
}
if (CHROME === undefined) {
  console.error('找不到 Chrome/Edge，设置 DSH_CHROME_BIN')
  process.exit(2)
}

mkdirSync(outDir, { recursive: true })
const port = 9900 + Math.floor(Math.random() * 90)
const profile = mkdtempSync(join(tmpdir(), 'mo-v9p-'))

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', '--disable-dev-shm-usage', '--force-device-scale-factor=1',
  `--window-size=${width},${height}`,
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
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })
  return { send, close: () => ws.close() }
}

const failures = []
const record = (name, ok, detail) => {
  if (!ok) failures.push(`${name}: ${detail}`)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`)
}

/** 点一个必须存在的元素；找不到算失败（不静默跳过）。 */
async function clickStrict(page, sel, waitMs = 220) {
  const r = await page.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'missing'; el.click(); return 'ok'; })()`,
  })
  const v = r.result?.result?.value
  if (v !== 'ok') { failures.push(`click ${sel}: ${v}`); return false }
  await wait(waitMs)
  return true
}

/** 在输入框里真的敲字（React 受控组件要派发 input 事件）。 */
async function typeStrict(page, sel, value) {
  const r = await page.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const el = document.querySelector(${JSON.stringify(sel)});
      if (!el) return 'missing';
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return 'ok';
    })()`,
  })
  const v = r.result?.result?.value
  if (v !== 'ok') { failures.push(`type ${sel}: ${v}`); return false }
  await wait(260)
  return true
}

const METRICS = `(() => {
  const q = s => document.querySelector(s);
  const rect = el => (el ? el.getBoundingClientRect() : null);
  const rail = q('.mo-rail'), center = q('.mo-center'), insp = q('.mo-insp');
  const t0 = document.querySelectorAll('.mo-t0');
  const lede = q('.mo-lede');
  const pane = q('.mo-pane');
  const titles = Array.from(document.querySelectorAll('.mo-row-title')).map(e => rect(e).width);
  const removed = document.querySelectorAll('.mo-diff-removed');
  const added = document.querySelectorAll('.mo-diff-added');
  const t0Style = t0[0] ? getComputedStyle(t0[0]) : null;
  const appStyle = getComputedStyle(q('.mo-app'));
  const parse = c => { const m = c.match(/[\\d.]+/g) || ['0','0','0']; return [Number(m[0]), Number(m[1]), Number(m[2])]; };
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
    inspOverflow: (() => { const b = q('.mo-insp-body'); return b ? b.scrollHeight - b.clientHeight : null; })(),
    pageOverflow: document.documentElement.scrollHeight - window.innerHeight,
    tabs: document.querySelectorAll('[role=tab]').length,
    diffRemoved: removed.length,
    diffAdded: added.length,
    diffStacked: removed.length && added.length ? Math.round(rect(removed[0]).top) !== Math.round(rect(added[0]).top) : null,
    rowH: document.querySelector('.mo-row-button') ? rect(document.querySelector('.mo-row-button')).height : null,
    contrast: Math.round(contrast * 10) / 10,
    textLen: (document.body.innerText || '').length,
    moCapture: q('.mo-capture-box') ? true : false,
  };
})()`

async function metrics(page) {
  const res = await page.send('Runtime.evaluate', { expression: METRICS, returnByValue: true })
  return res.result.result.value
}

async function shot(page, name) {
  const png = await page.send('Page.captureScreenshot', {
    format: 'png',
    clip: { x: 0, y: 0, width, height, scale: 1 },
  })
  writeFileSync(join(outDir, `${name}.png`), Buffer.from(png.result.data, 'base64'))
}

let page
try {
  await waitForChrome()
  page = await openPage()

  /* —— 1. 五个分区：宽度 / T0 / 判定句 / 溢出 —— */
  await page.send('Page.navigate', { url })
  await wait(1400)
  const panes = ['today', 'capture', 'todo', 'memory', 'health']
  const all = []
  for (const pane of panes) {
    if (pane !== 'today' && !(await clickStrict(page, `#mo-tab-${pane}`, 320))) continue
    const m = await metrics(page)
    all.push({ case: pane, ...m })
    record(`${pane} 三栏`, Math.abs(m.railW - 212) <= 1 && Math.abs(m.inspW - 360) <= 1 && Math.abs(m.centerW - 946) <= 4 && Math.abs(m.gap - 24) <= 1,
      `rail=${m.railW} center=${m.centerW} insp=${m.inspW} gap=${m.gap}`)
    record(`${pane} T0`, m.t0Count === 1 && (/\d/.test(m.t0Text) || m.t0Text === '—'), `count=${m.t0Count} text="${m.t0Text}"`)
    record(`${pane} 判定句`, [...m.ledeText].length <= 20 && m.ledeH <= 24, `len=${[...m.ledeText].length} h=${m.ledeH} "${m.ledeText}"`)
    record(`${pane} 行宽`, m.maxTitleW <= 720.5, `maxTitleW=${m.maxTitleW}`)
    record(`${pane} 首屏`, m.paneOverflow <= 1 && m.pageOverflow <= 1, `paneOverflow=${m.paneOverflow} pageOverflow=${m.pageOverflow}`)
    record(`${pane} 渲染`, m.textLen > 150, `textLen=${m.textLen}`)
    /* 选中刻度：不只靠字重，2px 蓝刻度必须在（brief §七-2）。 */
    const tick = await page.send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const tab = document.querySelector('[role=tab][aria-selected=true]');
        if (!tab) return null;
        const s = getComputedStyle(tab, '::before');
        return { w: s.width, bg: s.backgroundColor };
      })()`,
    })
    const tickValue = tick.result.result.value
    record(`${pane} 选中刻度`, tickValue !== null && tickValue.w === '2px' && /rgb\(65, 118, 230\)/.test(tickValue.bg),
      `width=${tickValue?.w} bg=${tickValue?.bg}`)
    await shot(page, `pane-${pane}`)
  }

  /* —— 2. 记忆双面：切换后行高不变 —— */
  await clickStrict(page, '#mo-tab-memory', 260)
  const beforeFace = await metrics(page)
  await clickStrict(page, '[data-face=cost]', 260)
  const afterFace = await metrics(page)
  record('双面切换', Math.abs(beforeFace.rowH - afterFace.rowH) <= 0.5, `before=${beforeFace.rowH} after=${afterFace.rowH}`)
  await shot(page, 'pane-memory-cost')

  /* —— 3. 置顶编辑：diff 上下叠 + Δ + 生效时机 —— */
  await clickStrict(page, '#mo-tab-health', 260)
  await clickStrict(page, '[data-select="b:injected"]', 260)
  await clickStrict(page, '[data-select="p:personal.principles"]', 320)
  await typeStrict(page, '#mo-pin-title', '所有会话一律用中文回答与思考（含代码注释）')
  const edit = await metrics(page)
  record('diff 上下叠', edit.diffRemoved >= 1 && edit.diffAdded >= 1 && edit.diffStacked === true,
    `removed=${edit.diffRemoved} added=${edit.diffAdded} stacked=${edit.diffStacked}`)
  await shot(page, 'health-edit')

  const editText = await page.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => { const b = document.querySelector('.mo-insp-body'); return b ? b.innerText : ''; })()`,
  })
  const editBody = editText.result.result.value
  record('编辑三件', /tokens[\s\S]*→[\s\S]*Δ/.test(editBody) && /生效时机/.test(editBody), 'tokens 前/后/Δ 与生效时机必须同屏')

  /* —— 4. 深色 —— */
  await page.send('Runtime.evaluate', {
    expression: `document.body.setAttribute('data-ds-dark-theme', '')`,
  })
  await wait(260)
  const dark = await metrics(page)
  record('深色对比', dark.contrast >= 3, `contrast=${dark.contrast}`)
  await shot(page, 'health-dark')

  /* —— 5. error 态 —— */
  await page.send('Page.navigate', { url: `${url}?phase=error` })
  await wait(1200)
  const error = await metrics(page)
  record('error T0', error.t0Count === 1 && error.t0Text === '—', `count=${error.t0Count} text="${error.t0Text}"`)
  record('error 导航保留', error.tabs === 5, `tabs=${error.tabs}`)
  await shot(page, 'today-error')

  /* —— 6. empty 态（今天 / 记忆 / 库健康三页都要说真话）—— */
  await page.send('Page.navigate', { url: `${url}?phase=empty` })
  await wait(1200)
  const empty = await metrics(page)
  record('empty T0', empty.t0Count === 1 && empty.t0Text === '0', `count=${empty.t0Count} text="${empty.t0Text}"`)
  record('empty 顶条换文案', /没有压着/.test(empty.ledeText), `lede="${empty.ledeText}"`)
  await shot(page, 'today-empty')

  await clickStrict(page, '#mo-tab-memory', 300)
  const emptyMemory = await metrics(page)
  record('memory empty', emptyMemory.t0Count === 1 && emptyMemory.t0Text === '0' && emptyMemory.textLen > 120,
    `T0=${emptyMemory.t0Text} textLen=${emptyMemory.textLen}`)
  await shot(page, 'memory-empty')

  await clickStrict(page, '#mo-tab-health', 300)
  const emptyHealth = await metrics(page)
  /*
   * 库健康空态**不许**显示 0 tokens/请求：目录框架 171 仍然每请求付费。
   * 早先这里硬回 0，与同屏的「框架 171」互相打架。
   */
  record('health empty 不冒充 0', emptyHealth.t0Count === 1 && emptyHealth.t0Text === '171',
    `T0="${emptyHealth.t0Text}"（应为 171：框架不可关）`)
  await shot(page, 'health-empty')

  /* —— 7. 记一条：主操作常驻 —— */
  await page.send('Page.navigate', { url })
  await wait(1200)
  await clickStrict(page, '#mo-tab-capture', 300)
  const capture = await metrics(page)
  record('记一条输入常驻', capture.moCapture === true, 'capture 框必须在正常态与空态都在')
  await shot(page, 'pane-capture')

  writeFileSync(join(outDir, 'metrics.json'), JSON.stringify({ width, height, cases: all }, null, 2))
  console.log(`\n截图与 metrics：${outDir}`)
} finally {
  if (page) page.close()
  chrome.kill()
  server.close()
}

console.log(`\nTOTAL FAILURES: ${failures.length}`)
failures.forEach(f => console.log(`  - ${f}`))
process.exit(failures.length === 0 ? 0 : 1)