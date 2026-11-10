/**
 * 跨表面的「跳到某个分区」——会话记忆 tab 的「去未命中工作台」靠它落地。
 *
 * ## 为什么必须有这个模块
 *
 * 会话记忆 tab（`conversation.view`）与侧栏记忆面板（`sidebar.panellist` + `main`）
 * 是两个独立的 React 树。分区状态是 `MemoryOpsPage` 里的局部 `useState`，
 * 另一个表面**碰不到**它。
 *
 * 早先的写法是给会话 tab 传一个 `onGotoMisses` 回调，但 `registerSessionView`
 * 从来没传过 → 按钮执行 `undefined?.()`，**一点反应都没有**。
 * 这里修的不只是「漏传一个 prop」，还有「就算传了也跳不到位」：
 * 回调必须能让面板真的落在「未命中」分区，而面板很可能压根没被打开。
 *
 * 所以拆成两件事：
 *   1. `requestPane(pane)` 写下待处理请求（模块级单例，面板没挂载也不丢）；
 *   2. `gotoPane(ctx, pane)` 再用 `ctx.layout.selectPanel(PANEL_ID)` 把主面板拉起来。
 */

import { useEffect, useState } from 'react'

/** 面板 id（同时用作 sidebar.panellist 的 id 与 main 的 key）。 */
export const PANEL_ID = 'memory-ops'

/** 5 个分区 id。 */
export type PaneId = 'project' | 'stream' | 'memory' | 'misses' | 'overview'

/** 待处理请求状态。 */
export interface PaneRequestState {
  /** 待消费的目标分区；null 表示没有请求。 */
  pane: PaneId | null
}

/** 可订阅 store（与 remember-logic 的 `RememberStore` 同构）。 */
export interface PaneRequestStore {
  subscribe(listener: () => void): () => void
  getSnapshot(): PaneRequestState
  set(next: PaneRequestState): void
}

let state: PaneRequestState = { pane: null }
const listeners = new Set<() => void>()

const store: PaneRequestStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getSnapshot(): PaneRequestState {
    return state
  },
  set(next: PaneRequestState) {
    // 值未变时不通知，避免无谓重渲染
    if (next.pane === state.pane) return
    state = next
    for (const listener of listeners) listener()
  },
}

/** 取 store（组件与测试共用）。 */
export function paneRequestStore(): PaneRequestStore {
  return store
}

/** 请求跳转到某个分区（面板没挂载时请求会保留）。 */
export function requestPane(pane: PaneId): void {
  store.set({ pane })
}

/** 消费待处理请求：有就返回并清空，没有返回 undefined。 */
export function consumePaneRequest(): PaneId | undefined {
  const pane = store.getSnapshot().pane
  if (pane === null) return undefined
  store.set({ pane: null })
  return pane
}

/**
 * 订阅待处理请求（供面板使用）。
 *
 * 不在渲染期直接消费：消费是副作用，放在 effect 里，避免重复渲染互相打架。
 */
export function usePaneRequest(): PaneId | undefined {
  const [snapshot, setSnapshot] = useState<PaneRequestState>(() => store.getSnapshot())

  useEffect(() => {
    let alive = true
    const sync = (): void => {
      if (alive) setSnapshot(store.getSnapshot())
    }
    sync()
    const unsubscribe = store.subscribe(sync)
    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  return snapshot.pane ?? undefined
}

/** 宿主 layout 服务的最小形状（不引宿主内部类型）。 */
export interface LayoutService {
  selectPanel?: (id: string) => void
}

/**
 * 从任意表面跳到记忆面板的某个分区。
 *
 * `layout` 是宿主服务：拿它的方式有两种，优先级从高到低——
 *   1. 调用方手里已经有服务实例（`ctx.inject(['layout'], …)` 等就绪后传进来）；
 *   2. 退回 `ctx.get('layout')`。
 *
 * 为什么不是只用 `ctx.get`：`remember.ts` 里实测过同一个坑——服务未就绪时
 * `ctx.get` 拿到 undefined，注册被静默跳过。这里同理，只是后果从「命令不生效」
 * 变成「按钮点了没反应」。所以两条路都留着，并且失败时明确返回 false。
 *
 * @param ctx - 客户端 context（从槽位 props 拿到的那个）。
 * @param pane - 目标分区。
 * @param direct - 已就绪的 layout 服务实例（可选，优先使用）。
 * @returns 是否成功把主面板拉起来；false 表示请求已记下但没切过去，调用方应提示。
 */
export function gotoPane(
  ctx: { get?: (name: string) => unknown } | undefined,
  pane: PaneId,
  direct?: LayoutService,
): boolean {
  // 先写请求：即使 selectPanel 失败，面板下次被打开时仍会落在正确的分区
  requestPane(pane)
  let layout: LayoutService | undefined = direct
  if (layout === undefined) {
    try {
      layout = ctx?.get?.('layout') as LayoutService | undefined
    } catch {
      layout = undefined
    }
  }
  if (layout === undefined || typeof layout.selectPanel !== 'function') return false
  try {
    layout.selectPanel(PANEL_ID)
    return true
  } catch {
    // 主面板未注册（插件半体未加载）时宿主会抛错，请求仍保留
    return false
  }
}
