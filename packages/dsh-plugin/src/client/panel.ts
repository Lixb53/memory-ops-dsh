/**
 * 表面 1：侧栏记忆面板（`sidebar.panellist` + `main`），内部 5 个分区。
 *
 * 为什么用子导航而不是单屏平铺：侧栏宽度受限，但**能力必须全量对等**——
 * 不允许出现「只能记、不能管」的单向漏斗。差异只允许在承载方式上。
 */

import { createElement, useEffect, useState, type ReactNode } from 'react'

import { MemoryIcon, TabBar } from './ui.ts'
import { PANEL_ID, consumePaneRequest, usePaneRequest, type PaneId } from './pane-nav.ts'
import { scopeBody, useSessionProject, type ClientContextLike } from './session-context.ts'
import { ProjectPane } from './panes/project.ts'
import { StreamPane } from './panes/stream.ts'
import { MemoryPane } from './panes/memory.ts'
import { MissesPane } from './panes/misses.ts'
import { OverviewPane } from './panes/overview.ts'
import { useBridge } from './data.ts'
import type { MissesView, SnapshotView } from './api.ts'

/** 面板 id（同时用作 sidebar.panellist 的 id 与 main 的 key）。 */
export { PANEL_ID }

/** 5 个分区。 */
const PANES = [
  { id: 'project', label: '本项目' },
  { id: 'stream', label: '记录流' },
  { id: 'memory', label: '记忆' },
  { id: 'misses', label: '未命中' },
  { id: 'overview', label: '总览' },
] as const satisfies readonly { id: PaneId; label: string }[]

/** 侧栏图标。 */
export function PanelIcon({ size }: { size?: number }): ReactNode {
  return createElement(MemoryIcon, { size: typeof size === 'number' ? size : 18 })
}

/** 主面板页面。 */
export function MemoryOpsPage(props: Record<string, unknown>): ReactNode {
  const ctx = (props as { ctx?: ClientContextLike }).ctx
  const { cwd, project } = useSessionProject(ctx)
  const [pane, setPane] = useState<PaneId>('project')
  const [detailPath, setDetailPath] = useState<string | undefined>(undefined)
  const requestedPane = usePaneRequest()

  /**
   * 消费其它表面发来的「跳到某个分区」请求。
   *
   * 会话记忆 tab 上的「去未命中工作台」就是靠这条通道落到「未命中」分区的——
   * 早先面板根本没有接收侧，请求即使写下来也没人读。
   */
  useEffect(() => {
    const next = consumePaneRequest()
    if (next === undefined) return
    setPane(next)
    if (next !== 'memory') setDetailPath(undefined)
  }, [requestedPane])

  // 徽标：待处理条数 + 未命中「该补了」条数
  /**
   * 徽标也要跟当前项目走，所以这里和「本项目」分区用同一套范围参数。
   * 早先它只传 `project`（末段目录名），于是徽标和列表可能一个有一个没有。
   */
  const snapshot = useBridge<SnapshotView>('snapshot', scopeBody(cwd, project), [cwd, project])
  const misses = useBridge<MissesView>('misses', {})
  const queueBadge = snapshot.data?.queue.length ?? 0
  const missBadge = (misses.data?.pipeline['should-fill']?.length ?? 0)
    + (misses.data?.pipeline.drafting?.length ?? 0)

  const tabs = PANES.map(item => ({
    id: item.id,
    label: item.label,
    badge: item.id === 'overview'
      ? queueBadge
      : item.id === 'misses' ? missBadge : undefined,
  }))

  function openMemory(path: string): void {
    setDetailPath(path === '' ? undefined : path)
    setPane('memory')
  }

  let body: ReactNode
  switch (pane) {
    case 'stream':
      body = createElement(StreamPane, null)
      break
    case 'memory':
      body = createElement(MemoryPane, { project, cwd, onOpenMemory: openMemory, detailPath })
      break
    case 'misses':
      body = createElement(MissesPane, null)
      break
    case 'overview':
      body = createElement(OverviewPane, { onOpenMemory: openMemory })
      break
    default:
      body = createElement(ProjectPane, {
        project,
        cwd,
        onOpenMemory: openMemory,
        onGoto: (next: string) => {
          setPane(next as PaneId)
          setDetailPath(undefined)
        },
      })
  }

  return createElement('div', { className: 'dmo-root' },
    createElement(TabBar, {
      tabs,
      active: pane,
      onChange: (id: string) => {
        setPane(id as PaneId)
        if (id !== 'memory') setDetailPath(undefined)
      },
    }),
    createElement('div', { className: 'dmo-body' }, body))
}
