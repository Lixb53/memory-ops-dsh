/**
 * 表面 1：侧栏记忆面板（`sidebar.panellist` + `main`），内部 5 个分区。
 *
 * 为什么用子导航而不是单屏平铺：侧栏宽度受限，但**能力必须全量对等**——
 * 不允许出现「只能记、不能管」的单向漏斗。差异只允许在承载方式上。
 */

import { createElement, useState, type ReactNode } from 'react'

import { MemoryIcon, TabBar } from './ui.ts'
import { useSessionProject, type ClientContextLike } from './session-context.ts'
import { ProjectPane } from './panes/project.ts'
import { StreamPane } from './panes/stream.ts'
import { MemoryPane } from './panes/memory.ts'
import { MissesPane } from './panes/misses.ts'
import { OverviewPane } from './panes/overview.ts'
import { useBridge } from './data.ts'
import type { MissesView, SnapshotView } from './api.ts'

/** 面板 id（同时用作 sidebar.panellist 的 id 与 main 的 key）。 */
export const PANEL_ID = 'memory-ops'

/** 5 个分区。 */
const PANES = [
  { id: 'project', label: '本项目' },
  { id: 'stream', label: '记录流' },
  { id: 'memory', label: '记忆' },
  { id: 'misses', label: '未命中' },
  { id: 'overview', label: '总览' },
] as const

type PaneId = (typeof PANES)[number]['id']

/** 侧栏图标。 */
export function PanelIcon({ size }: { size?: number }): ReactNode {
  return createElement(MemoryIcon, { size: typeof size === 'number' ? size : 18 })
}

/** 主面板页面。 */
export function MemoryOpsPage(props: Record<string, unknown>): ReactNode {
  const ctx = (props as { ctx?: ClientContextLike }).ctx
  const { project } = useSessionProject(ctx)
  const [pane, setPane] = useState<PaneId>('project')
  const [detailPath, setDetailPath] = useState<string | undefined>(undefined)

  // 徽标：待处理条数 + 未命中「该补了」条数
  const snapshot = useBridge<SnapshotView>('snapshot', project === undefined ? {} : { project }, [project])
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
      body = createElement(MemoryPane, { project, onOpenMemory: openMemory, detailPath })
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
