#!/usr/bin/env node
// memory-ops 设计稿机器验收：375 / 768 / 1440 三档实渲染
// 检查：结构 / 外链 / emoji 图标 / 横向溢出 / 字号 / 对比度 / 点击目标 / 重复 id / 可访问名称 / 焦点环
// 用法（在本目录下执行）：
//       node qa.mjs web-v3.html
//       node qa.mjs plugin-v3.html
//       node qa.mjs web-v2.html --out screenshots/v2
// 默认截图输出到 ./screenshots/v3（v2 稿请显式 --out screenshots/v2）
// 退出码：有 error 即 1，只有 warn 或全绿为 0

import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const target = resolve(argv.find((a) => !a.startsWith('--')) || 'web-v3.html');
const opt = (name, fallback) => {
  const pref = `--${name}=`;
  const eq = argv.find((a) => a.startsWith(pref));
  if (eq) return eq.slice(pref.length);
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const outDir = resolve(opt('out', 'screenshots/v3'));
const prefix = opt('prefix', target.split('/').pop().replace(/\.html?$/, ''));
const clickSel = opt('click', '');
const widthArg = opt('widths', '375,768,1440');
const widths = widthArg.split(',').map(Number).filter(Boolean);

const CHROME_CANDIDATES = [
  process.env.DSH_CHROME_BIN,
  join(process.env.HOME || '', 'Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell'),
  join(process.env.HOME || '', 'Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const CHROME = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!CHROME) {
  console.error('找不到 Chrome，设置 DSH_CHROME_BIN 指向 chrome-headless-shell');
  process.exit(2);
}
if (!existsSync(target)) {
  console.error('文件不存在：' + target);
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

const port = 9300 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(join(tmpdir(), 'memops-qa-'));
const proc = spawn(
  CHROME,
  ['--headless', '--no-sandbox', '--in-process-gpu', '--disable-gpu', '--no-first-run',
    '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'],
  { stdio: 'ignore' },
);

async function waitForChrome() {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Chrome 未在 12s 内启动');
}

async function openPage(url) {
  const info = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json();
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  const send = (method, params = {}) => new Promise((r) => {
    const i = ++id;
    pending.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  await send('Page.enable');
  await send('Runtime.enable');
  return { send, close: () => ws.close() };
}

// 在页面里跑检查。返回结构化结果，供 CLI 汇总。
const CHECK_JS = String.raw`
(() => {
  const errors = [], warns = [], info = {};
  const vw = window.innerWidth;
  const sel = (el) => {
    if (!el || el === document.documentElement) return 'html';
    const parts = [];
    let n = el;
    while (n && n.nodeType === 1 && n !== document.body && parts.length < 4) {
      let s = n.tagName.toLowerCase();
      if (n.id) s += '#' + n.id;
      const cls = (n.className && typeof n.className === 'string') ? n.className.trim().split(/\s+/).slice(0, 2) : [];
      if (cls.length) s += '.' + cls.join('.');
      parts.unshift(s);
      n = n.parentElement;
    }
    return parts.join(' > ') || el.tagName.toLowerCase();
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0.5 && r.height > 0.5;
  };
  const parseColor = (s) => {
    const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
  };
  const luminance = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const contrast = (a, b) => {
    const L1 = luminance(a), L2 = luminance(b);
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  };
  // 向上找不透明背景；遇到渐变/图片背景返回 null（跳过该元素，另记 warn）
  const bgOf = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return { gradient: true };
      const c = parseColor(cs.backgroundColor);
      if (c && c[3] >= 0.9) return { color: c };
      n = n.parentElement;
    }
    const bodyBg = parseColor(getComputedStyle(document.body).backgroundColor) || [255, 255, 255, 1];
    return { color: bodyBg };
  };

  // ---- 1 结构 ----
  if (!document.title.trim()) errors.push('[结构] 缺少 <title>');
  if (!document.querySelector('meta[name="viewport"]')) errors.push('[结构] 缺少 viewport meta');
  info.lang = document.documentElement.lang || '(空)';
  info.h1 = [...document.querySelectorAll('h1')].filter(visible).length;

  // ---- 2 外链资源 ----
  const ext = [];
  for (const el of document.querySelectorAll('script[src], img[src], iframe[src], video[src], audio[src], source[src]')) {
    const v = el.getAttribute('src') || '';
    if (/^https?:\/\//i.test(v)) ext.push(el.tagName.toLowerCase() + ' src=' + v);
  }
  for (const el of document.querySelectorAll('link[href]')) {
    const v = el.getAttribute('href') || '';
    if (/^https?:\/\//i.test(v)) ext.push('link href=' + v);
  }
  for (const el of document.querySelectorAll('a[href]')) {
    const v = el.getAttribute('href') || '';
    if (/^https?:\/\//i.test(v)) ext.push('a href=' + v);
  }
  const cssText = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n');
  if (/@import\s+(url\()?['"]?https?:/i.test(cssText)) ext.push('CSS @import 外链');
  if (/url\(\s*['"]?https?:/i.test(cssText)) ext.push('CSS url() 外链');
  if (ext.length) errors.push('[外链] ' + ext.length + ' 处：' + ext.slice(0, 4).join(' · '));

  // ---- 3 emoji 图标 ----
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F000}-\u{1F0FF}]/u;
  const emojiHits = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const t = node.nodeValue;
    if (t && EMOJI.test(t)) emojiHits.push(t.trim().slice(0, 24));
  }
  if (emojiHits.length) errors.push('[AI 味] emoji 出现在文本里：' + emojiHits.slice(0, 3).join(' · '));

  // ---- 4 横向溢出 ----
  const de = document.documentElement;
  info.scrollWidth = de.scrollWidth;
  info.clientWidth = de.clientWidth;
  if (de.scrollWidth > de.clientWidth + 1) {
    errors.push('[溢出] 文档横向溢出 ' + (de.scrollWidth - de.clientWidth) + 'px');
    for (const el of document.querySelectorAll('*')) {
      if (!visible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1 || r.left < -1) {
        errors.push('[溢出] ' + sel(el) + ' rect=' + Math.round(r.left) + '..' + Math.round(r.right) + 'px');
        if (errors.length > 12) break;
      }
    }
  }

  // ---- 5 字号 + 对比度 ----
  let textEls = 0, minFont = 99, skippedGradient = 0, worst = { ratio: 99, sel: '' };
  const all = document.querySelectorAll('body *');
  for (const el of all) {
    const hasOwnText = [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim().length > 0);
    if (!hasOwnText) continue;
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'OPTION'].includes(el.tagName)) continue;
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    const fs = parseFloat(cs.fontSize);
    const fw = Number(cs.fontWeight) || 400;
    textEls++;
    if (fs < minFont) minFont = fs;
    if (fs < 12) errors.push('[字号] ' + sel(el) + ' ' + fs + 'px < 12px');
    const fg = parseColor(cs.color);
    if (!fg) continue;
    const bg = bgOf(el);
    if (bg.gradient) { skippedGradient++; continue; }
    let ratio = contrast(fg, bg.color);
    if (ratio < worst.ratio) worst = { ratio, sel: sel(el) };
    const large = fs >= 18.66 || (fs >= 14 && fw >= 700);
    const need = large ? 3 : 4.5;
    if (ratio + 0.01 < need) {
      errors.push('[对比度] ' + sel(el) + ' ' + ratio.toFixed(2) + ':1 < ' + need + ' (fg=' + cs.color + ' bg=' + bg.color.map(Math.round).slice(0, 3).join(',') + ')');
    }
  }
  info.textEls = textEls;
  info.minFont = minFont === 99 ? null : minFont;
  info.worstContrast = worst.sel ? Number(worst.ratio.toFixed(2)) : null;
  info.worstContrastEl = worst.sel || null;
  if (skippedGradient) warns.push('[对比度] 跳过 ' + skippedGradient + ' 处渐变背景元素');

  // ---- 6 点击目标（375 档） ----
  if (vw <= 480) {
    const targets = document.querySelectorAll('button, a[href], select, textarea, input:not([type="checkbox"]):not([type="radio"]), [role="button"]');
    let small = 0;
    for (const el of targets) {
      if (!visible(el) || el.disabled) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 44 || r.height < 44) {
        small++;
        if (small <= 6) errors.push('[点击目标] ' + sel(el) + ' ' + Math.round(r.width) + '×' + Math.round(r.height) + ' < 44×44');
      }
    }
    // 勾选框：看它的 label 或父级命中区
    for (const el of document.querySelectorAll('input[type="checkbox"], input[type="radio"]')) {
      if (!visible(el)) continue;
      const hit = el.closest('label') || el.parentElement;
      const r = hit.getBoundingClientRect();
      if (r.height < 44 || r.width < 44) warns.push('[点击目标] 勾选框命中区 ' + sel(el) + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
    }
  }

  // ---- 7 重复 id + 可访问名称 ----
  const ids = new Map();
  for (const el of document.querySelectorAll('[id]')) ids.set(el.id, (ids.get(el.id) || 0) + 1);
  const dup = [...ids].filter(([, n]) => n > 1).map(([k]) => k);
  if (dup.length) errors.push('[id 重复] ' + dup.join(', '));
  for (const el of document.querySelectorAll('button, [role="button"], a[href]')) {
    if (!visible(el)) continue;
    const name = (el.getAttribute('aria-label') || el.textContent || '').trim();
    if (!name) errors.push('[可访问名称] ' + sel(el) + ' 没有文本也没有 aria-label');
  }

  // ---- 8 焦点环存在 ----
  let focusRule = false;
  const scan = (rules) => {
    for (const r of rules) {
      if (r.cssText && /:focus-visible/.test(r.cssText) && /outline/.test(r.cssText)) focusRule = true;
      if (r.cssRules) scan(r.cssRules);
    }
  };
  for (const sheet of document.styleSheets) {
    try { scan(sheet.cssRules); } catch {}
  }
  if (!focusRule) errors.push('[键盘] 样式里找不到 :focus-visible 可见轮廓规则');

  info.title = document.title;
  info.pageHeight = document.documentElement.scrollHeight;
  return { errors, warns, info };
})()
`;

const results = [];
let failed = false;

try {
  await waitForChrome();
  for (const width of widths) {
    const { send, close } = await openPage('about:blank');
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
    await send('Page.navigate', { url: pathToFileURL(target).href });
    await new Promise((r) => setTimeout(r, 900));
    // 等字体与布局稳定
    await send('Runtime.evaluate', { expression: 'document.fonts ? document.fonts.ready.then(()=>1) : 1', awaitPromise: true });
    if (clickSel) {
      // 切到指定视图后再验收，例如 --click='.nav-item[data-go="misses"]'
      await send('Runtime.evaluate', { expression: `(() => { const el = document.querySelector(${JSON.stringify(clickSel)}); if (el) el.click(); return !!el; })()` });
      await new Promise((r) => setTimeout(r, 250));
    }
    const res = await send('Runtime.evaluate', { expression: CHECK_JS, returnByValue: true });
    const value = res.result?.result?.value || { errors: ['检查脚本执行失败：' + JSON.stringify(res.result?.exceptionDetails?.text || res.result)], warns: [], info: {} };
    results.push({ width, ...value });
    if (value.errors?.length) failed = true;

    // 整页截图
    const m = await send('Page.getLayoutMetrics');
    const h = Math.ceil(m.result.cssContentSize.height);
    const shot = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width, height: h, scale: 1 },
    });
    const out = join(outDir, `${prefix}-${width}.png`);
    writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
    results[results.length - 1].shot = out;
    close();
  }
} finally {
  proc.kill();
}

// ---- 汇总输出 ----
for (const r of results) {
  console.log(`\n=== ${prefix} · ${r.width}px ===`);
  if (r.info) {
    console.log(`  title=${JSON.stringify(r.info.title)} lang=${r.info.lang} h1=${r.info.h1} 文本元素=${r.info.textEls} 最小字号=${r.info.minFont}px`);
    console.log(`  最低对比度=${r.info.worstContrast}:1 (${r.info.worstContrastEl}) 页面高度=${r.info.pageHeight}px`);
    console.log(`  scrollWidth=${r.info.scrollWidth} clientWidth=${r.info.clientWidth}`);
  }
  for (const e of r.errors || []) console.log('  ERROR ' + e);
  for (const w of r.warns || []) console.log('  warn  ' + w);
  if (!(r.errors || []).length) console.log('  ✅ 0 error');
  if (r.shot) console.log('  截图 ' + r.shot);
}
const totalErrors = results.reduce((n, r) => n + (r.errors?.length || 0), 0);
const totalWarns = results.reduce((n, r) => n + (r.warns?.length || 0), 0);
console.log(`\n合计 ${widths.length} 档：${totalErrors} error / ${totalWarns} warn`);
process.exit(failed ? 1 : 0);
