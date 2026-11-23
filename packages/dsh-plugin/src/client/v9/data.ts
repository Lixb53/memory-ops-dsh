/**
 * v9 数据层 —— 一次取齐 5 个表面需要的数据，并统一重取。
 *
 * ## 为什么集中取数
 *
 * v4 的写法是「每个 pane 自己 useBridge」。顶条同时要 snapshot / overview /
 * inbox / misses 四个数，5 个 pane 各取自己那份，切一次分区就多打一轮请求，
 * 顶条与中栏还可能读到不同时刻的数据（定稿前实测过「顶条 8、中栏 5」打架）。
 * 这里改成一处取、一处刷新：顶条、左轨计数、中栏、检视栏读同一份快照。
 *
 * ## 四态怎么来的
 *
 * 不造假开关。`loading / error` 由桥的真实状态决定，`empty` 由各页的真实数据
 * 决定（见 `phaseOf`）。原型里的「控制台切态」只属于原型，不进产品。
 */

import { useCallback } from 'react'

import type { InboxView, MissesView, OverviewView, SnapshotView } from '../api.ts'
import { useBridge, type Loaded } from '../data.ts'
import { scopeBody, useSessionProject, type ClientContextLike } from '../session-context.ts'
import type { Phase } from './view-model.ts'

/** 工作台的四个数据源。 */
export interface WorkbenchData {
  snapshot: Loaded<SnapshotView>
  overview: Loaded<OverviewView>
  inbox: Loaded<InboxView>
  misses: Loaded<MissesView>
  /** 项目范围（cwd 优先；空对象表示不过滤）。 */
  scope: Record<string, unknown>
  /** 会话解析出的 cwd（状态条要显示库根，这里给的是「当前目录」）。 */
  cwd: string | undefined
  /** 统一重取：写操作之后调它，避免一处刷新一处不刷新。 */
  reloadAll: () => void
}

/**
 * 取齐工作台数据。
 *
 * deps 固定长度（[cwd, project]）：`useBridge` 会把 deps 展开进依赖数组，
 * 长度在渲染之间变化会触发 React 警告。
 */
export function useWorkbenchData(ctx: ClientContextLike | undefined): WorkbenchData {
  const { cwd, project } = useSessionProject(ctx)
  const scope = scopeBody(cwd, project)

  const snapshot = useBridge<SnapshotView>('snapshot', scope, [cwd, project])
  const overview = useBridge<OverviewView>('overview', {}, [])
  const inbox = useBridge<InboxView>('inbox', { domain: 'personal' }, [])
  const misses = useBridge<MissesView>('misses', {}, [])

  const { reload: reloadSnapshot } = snapshot
  const { reload: reloadOverview } = overview
  const { reload: reloadInbox } = inbox
  const { reload: reloadMisses } = misses

  const reloadAll = useCallback(() => {
    reloadSnapshot()
    reloadOverview()
    reloadInbox()
    reloadMisses()
  }, [reloadSnapshot, reloadOverview, reloadInbox, reloadMisses])

  return { snapshot, overview, inbox, misses, scope, cwd, reloadAll }
}

/**
 * 四态归一。
 *
 * 优先级：error > loading > empty > ready。
 *
 * - error 压过 loading：一个源已经失败，其余还在加载时继续转骨架会让人以为
 *   「马上就好」，而实际上这一屏已经不可能正确。
 * - loading 压过 empty：还没读到就断言「空」，正是 product.md §2.3 里
 *   「假空态」那一类错误。
 * - `data === undefined` 但 phase 已是 ready（桥返回空对象）也按 loading 处理。
 */
export function phaseOf(sources: Loaded<unknown>[], isEmpty: boolean): Phase {
  if (sources.some(source => source.phase === 'error')) return 'error'
  if (sources.some(source => source.phase === 'loading' || source.data === undefined)) return 'loading'
  if (isEmpty) return 'empty'
  return 'ready'
}

/** 五个页面各自依赖哪些数据源。 */
export function sourcesFor(pane: 'today' | 'capture' | 'todo' | 'memory' | 'health', data: WorkbenchData): Loaded<unknown>[] {
  if (pane === 'today') return [data.snapshot, data.overview, data.inbox, data.misses]
  if (pane === 'capture') return [data.inbox]
  if (pane === 'todo') return [data.snapshot, data.inbox, data.misses]
  if (pane === 'memory') return [data.snapshot]
  return [data.overview]
}