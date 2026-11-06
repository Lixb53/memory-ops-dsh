// 越界元素探针：定位 375 下的横向溢出源
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const file = resolve(process.argv[2]);
const width = parseInt(process.argv[3] || '375', 10);
const CHROME = process.env.DSH_CHROME_BIN;
const port = 9600 + Math.floor(Math.random() * 300);
const dir = mkdtempSync(join(tmpdir(), 'probe-'));
const proc = spawn(CHROME, ['--headless', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, 'about:blank'], { stdio: 'ignore' });

for (let i = 0; i < 80; i++) {
  try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); if (r.ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 100));
}
const info = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(info.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
await send('Page.navigate', { url: pathToFileURL(file).href });
await new Promise((r) => setTimeout(r, 800));

const expr = `(() => {
  const W = ${width};
  const bad = [];
  document.querySelectorAll('body *').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width > W + 1) {
      const cs = getComputedStyle(el);
      bad.push({
        el: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ').join('.') : ''),
        w: Math.round(r.width), left: Math.round(r.left), right: Math.round(r.right),
        overflowX: cs.overflowX,
        text: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 28)
      });
    }
  });
  return JSON.stringify({ docScrollW: document.documentElement.scrollWidth, count: bad.length, bad: bad.slice(0, 14) }, null, 1);
})()`;

const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
if (res.result?.exceptionDetails) console.log('ERR', JSON.stringify(res.result.exceptionDetails).slice(0, 400));
else console.log(res.result.result.value);
ws.close(); try { proc.kill('SIGKILL'); } catch {}
process.exit(0);
