/**
 * 测试入口：把「能在 node 里跑」的客户端逻辑集中导出。
 *
 * 为什么需要它：`remember.ts` 里有 React 组件，整个文件在 node 里加载不了；
 * 但「注册接线是否正确」恰恰是最需要自动化的部分——实测的两个 bug
 * （`'handled'` 形态错、`ctx.get` 拿不到服务）都出在这里，纯函数测试一个都没拦住。
 *
 * 所以本文件只导出不依赖 React 的部分，由构建脚本产出 `lib/client-logic.mjs`
 * 供 `test/wiring.test.mjs` 直接 import。
 */

export {
  COMMAND_NAME, closeRememberDialog, openRememberDialog, parseRememberLine,
  rememberStoreOf, setRememberToast, type RememberState, type RememberStore,
} from './remember-logic.ts'

// registerRemember 本身不返回 JSX（组件是模块内常量），所以可以安全导出。
// 组件渲染由 host 的 slots.register 负责，测试只断言「注册了什么」。
export { registerRemember } from './remember.ts'

/**
 * 跨表面跳转的纯逻辑。
 *
 * 早先「去未命中工作台」按钮点了没反应，是因为它读的回调根本没人传
 * （`undefined?.()`）。这类 bug 逻辑全对、单测全绿，只有接线断了——
 * 所以必须让测试能直接调到 `gotoPane`，断言它真的写了分区请求、
 * 真的调了宿主的 `layout.selectPanel`。
 */
export {
  PANEL_ID, consumePaneRequest, gotoPane, paneRequestStore, requestPane,
  type PaneId, type PaneRequestState, type PaneRequestStore,
} from './pane-nav.ts'
