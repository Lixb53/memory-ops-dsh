/**
 * 表面 1：侧栏记忆面板（`sidebar.panellist` + `main`）—— v4 任务导向导航。
 *
 * ## 为什么从数据分区改为任务入口
 *
 * 旧导航是 5 个数据表名（本项目 / 记录流 / 记忆 / 未命中 / 总览）：
 * 「本项目」与「记忆」显示同一份东西、「未命中」在 3 处出现、「总览」一页塞 8 类内容。
 * 用户无法建立「我该去哪个页签做这件事」的心理模型。
 *
 * v4 按意图组织：今天（该做什么）/ 记一条 / 待办（压着的事）/ 记忆（台账）/ 库健康。
 * 能力与 34 条路由一个不删，只是重新归位。
 *
 * ## brand 与 badge
 *
 * 「待办」的 badge 是唯一的红点式提醒（拍板 + 流转 + 补库总和）。
 */

import { createElement, useEffect, useState, type ReactNode } from 'react'

import { MemoryIcon } from './ui.ts'
import { PANEL_ID, consumePaneRequest, usePaneRequest, type PaneId } from './pane-nav.ts'
import { scopeBody, useSessionProject, type ClientContextLike } from './session-context.ts'
import { TodayPane } from './panes/today.ts'
import { CapturePane } from './panes/capture.ts'
import { TodoPane } from './panes/todo.ts'
import { MemoryPane } from './panes/memory.ts'
import { HealthPane } from './panes/health.ts'
import { useBridge } from './data.ts'
import type { SnapshotView } from './api.ts'

/** 面板 id（同时用作 sidebar.panellist 的 id 与 main 的 key）。 */
export { PANEL_ID }

/** v4 的 5 个任务入口。 */
const PANES: { id: PaneId; label: string }[] = [
  { id: 'today', label: '今天' },
  { id: 'capture', label: '记一条' },
  { id: 'todo', label: '待办' },
  { id: 'memory', label: '记忆' },
  { id: 'health', label: '库健康' },
]

/** 侧栏图标。 */
export function PanelIcon({ size }: { size?: number }): ReactNode {
  return createElement(MemoryIcon, { size: typeof size === 'number' ? size : 18 })
}

/** 主面板页面。 */
export function MemoryOpsPage(props: Record<string, unknown>): ReactNode {
  const ctx = (props as { ctx?: ClientContextLike }).ctx
  const { cwd, project } = useSessionProject(ctx)
  const [pane, setPane] = useState<PaneId>('today')
  const [detailPath, setDetailPath] = useState<string | undefined>(undefined)
  const requestedPane = usePaneRequest()

  /**
   * 消费其它表面发来的「跳到某个分区」请求。
   *
   * 会话 tab 的「去未命中工作台」在 v4 落到「待办」分区（补库段在待办页）。
   */
  useEffect(() => {
    const next = consumePaneRequest()
    if (next === undefined) return
    setPane(next)
    if (next !== 'memory') setDetailPath(undefined)
  }, [requestedPane])

  /* badge：待办总数（拍板 + 流转 + 补库），从快照与记录流粗算 */
  const snapshot = useBridge<SnapshotView>('snapshot', scopeBody(cwd, project), [cwd, project])
  const queueCount = snapshot.data?.queue.length ?? 0

  const openDetail = (path: string | null): void => {
    setDetailPath(path ?? undefined)
    if (path !== null) setPane('memory')
  }

  let body: ReactNode
  switch (pane) {
    case 'capture':
      body = createElement(CapturePane)
      break
    case 'todo':
      body = createElement(TodoPane, { onOpenDetail: openDetail })
      break
    case 'memory':
      body = createElement(MemoryPane, { ctx, detailPath, onOpenDetail: openDetail })
      break
    case 'health':
      body = createElement(HealthPane, { onGotoToday: () => { setPane('today') } })
      break
    default:
      body = createElement(TodayPane, { ctx, onOpenDetail: openDetail })
  }

  return createElement('div', { className: 'dmo-root' },
    createElement('div', { className: 'dmo-head' },
      createElement('div', { className: 'dmo-head-row' },
        createElement('h1', { className: 'dmo-app-name' }, '记忆库'),
        createElement('span', { className: 'dmo-scope' }, snapshot.data?.root ?? '')),
      createElement('nav', { className: 'dmo-nav', role: 'tablist' },
        PANES.map(item => createElement('button', {
          key: item.id,
          type: 'button',
          role: 'tab',
          className: 'dmo-nav-item',
          'data-pane': item.id,
          'aria-selected': pane === item.id,
          'aria-controls': 'memory-ops-tabpanel',
          onClick: () => {
            setPane(item.id)
            if (item.id !== 'memory') setDetailPath(undefined)
          },
        },
        item.label,
        item.id === 'todo' && queueCount > 0
          ? createElement('span', { className: 'dmo-nav-count' }, String(queueCount))
          : null)))),
    createElement('div', { className: 'dmo-body', role: 'tabpanel', id: 'memory-ops-tabpanel' }, body))
}
