/**
 * v9 面板的浏览器渲染 harness（验证工具，不属于产品代码）。
 *
 * ## 为什么需要它
 *
 * 宿主 GUI 是桌面版 WebView2，没有开放远程调试端口，自动化抓不到 DOM。
 * 但「三栏真的是 212/946/360」「每页 1 个 T0 且不折行」「首屏 0 滚动」
 * 只能靠真实渲染证明。所以这里用**同一份组件 + 同一份桥数据快照**
 * 在真实 Chrome 里渲染：能证明组件与样式，不证明宿主内嵌（那层需人工看）。
 *
 * ## 四态怎么造
 *
 * `?phase=error` 让所有桥请求返回 500；`?phase=empty` 用空夹具。
 * 这是验证工具的开关，不是产品里的假数据开关——产品侧四态由真实数据派生。
 *
 * 数据来源：`scripts/capture-fixtures.mjs` 调本机桥抓一份 `fixtures.json`
 * （不入库，含个人库内容）。
 */

import { createElement } from 'react'
import { createRoot } from 'react-dom/client'

import { MemoryOpsPage } from '../../packages/dsh-plugin/src/client/panel.ts'
import { installV9Styles } from '../../packages/dsh-plugin/src/client/v9/styles.ts'

/**
 * 真实桥数据的快照。
 *
 * 用 import 而不是 fetch：harness 在 http 下跑（`file://` 会被 CORS 拦），
 * 走 import 由 esbuild 直接内联，少一次请求也少一个 404 的可能——
 * 这一条踩过一次，页面白屏看起来像「组件崩了」。
 */
import fixtures from './fixtures.json'

const params = new URLSearchParams(location.search)
const phase = params.get('phase') ?? 'normal'

/** 空库夹具：条目、记录流、未命中全清，常驻前缀只剩目录框架（171）。 */
const emptyFixtures = {
  ...fixtures,
  snapshot: {
    ...fixtures.snapshot,
    entries: [],
    queue: [],
    stats: {
      ...fixtures.snapshot.stats,
      overLimit: 0,
      files: 0,
      tokens: 0,
      counts: { pending: 0, confirmed: 0, rejected: 0, stale: 0, archived: 0 },
    },
  },
  inbox: {
    ...fixtures.inbox,
    entries: [],
    throughput: { total: 0, open: 0, todo: 0, done: 0, dropped: 0, toPromote: 0, invalidKind: 0, invalidState: 0 },
  },
  misses: {
    ...fixtures.misses,
    total: 0,
    pipeline: {},
    counts: { observing: 0, 'should-fill': 0, drafting: 0, verifying: 0, expired: 0 },
  },
  /*
   * 常驻前缀也要归零，否则 health 页的 empty 态永远不可达
   * （判据是 catalog === 0 && injected === 0），那条「空态顶条别写成 0」
   * 的分支就永远没被量测过。框架 171 保留：它本来就关不掉。
   */
  overview: {
    ...fixtures.overview,
    kpi: { ...fixtures.overview.kpi, residentTokens: 171, indexTokens: 0, pending: 0 },
    resident: {
      ...fixtures.overview.resident,
      items: [],
      catalogTokens: 0,
      injectedTokens: 0,
      billedTokens: 171,
    },
  },
}

const active = phase === 'empty' ? emptyFixtures : fixtures

/** 桥路由 → 夹具。 */
const byRoute = {
  snapshot: active.snapshot,
  overview: active.overview,
  inbox: active.inbox,
  misses: active.misses,
  health: active.health,
  detail: active.detail,
}

/** 拦截 bridge 调用：路径末段就是路由名。 */
const realFetch = window.fetch.bind(window)
window.fetch = async (input, init) => {
  const url = String(input)
  if (!url.includes('/api/dsh-memory-ops/')) return realFetch(input, init)
  const route = url.split('/').pop() ?? ''
  if (!(route in byRoute) || phase === 'error') {
    /*
     * 未知路由一律失败，**不回落真实 fetch**：
     * harness 跑在本机，回落等于「在验证页里点一下『确认』就写真库」。
     */
    return new Response(JSON.stringify({ ok: false, error: 'harness 不代理写操作' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
  return new Response(JSON.stringify(byRoute[route]), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

installV9Styles()

const root = createRoot(document.getElementById('root'))
root.render(createElement(MemoryOpsPage, {}))

/* 给量测脚本一个稳定信号：首帧渲染完成。 */
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.body.setAttribute('data-ready', 'true')
  })
})