/**
 * 主面板 v9 —— 三栏工作台 · 双车道（design/brief.md 的落地容器）。
 *
 * ## 这一层只管「谁在哪、选了什么、刚发生了什么」
 *
 * - 数据：`useWorkbenchData` 一次取齐，写操作后统一重取；
 * - 状态：当前分区、每个分区各自的选择键、草稿、回执、折叠；
 * - 动作：`run()` 是唯一出口——它保证「pending → 成功回执 → 重取」或
 *   「失败回执」二选一，组件里不许出现静默的写调用。
 *
 * ## 契约（brief §八）
 *
 * 每页恰好 1 个 T0（`stage.ts` 只渲染顶条那一个）；
 * 判定句由 `ledeFor` 按真实数据算且 ≤20 字；
 * 主操作整页唯一——墨块只出现在检视栏底部（记一条例外：输入框旁）。
 */

import { createElement, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import type { ClientContextLike } from './session-context.ts'
import { useWorkbenchData, phaseOf, sourcesFor } from './v9/data.ts'
import { classify, hintOf } from './v9/actions.ts'
import { PANEL_ID, consumePaneRequest, usePaneRequest, type PaneId } from './pane-nav.ts'
import { InspectorFrame, Stage } from './v9/stage.ts'
import { BtnGhost, Skeleton } from './v9/primitives.ts'
import { MemoryIcon } from './ui.ts'
import { CaptureCenter, CaptureInspector } from './v9/panes/capture.ts'
import { HealthCenter, HealthInspector } from './v9/panes/health.ts'
import { MemoryCenter, MemoryInspector } from './v9/panes/memory.ts'
import { TodayCenter, TodayInspector } from './v9/panes/today.ts'
import { TodoCenter, TodoInspector } from './v9/panes/todo.ts'
import type { Notice, PaneProps, UndoSpec } from './v9/types.ts'
import {
  bandFigureFor, bandNoteFor, bucketsOf, cluesOf, countsOf, figureFor, ledeFor,
  memoryEntries, memoryRowsOf, statusRightOf, todoSectionsOf, type Counts, type Phase,
} from './v9/view-model.ts'

export { PANEL_ID }

/** 侧栏图标。 */
export function PanelIcon({ size }: { size?: number }): ReactNode {
  return createElement(MemoryIcon, { size: typeof size === 'number' ? size : 18 })
}

/** 状态条左侧：估算口径必须写明（token 是估算值，不是 tokenizer 精确值）。 */
const STATUS_LEFT = '估算口径：CJK 1 字 ≈ 1 token，其余 4 字符 ≈ 1 token；非 tokenizer 精确值，仅用于相对比较'

/** 每个分区的默认选择键（数据到了才有意义）。 */
function defaultKeyOf(pane: PaneId, props: {
  counts: Counts
  data: ReturnType<typeof useWorkbenchData>
}): string {
  const { counts, data } = props
  if (pane === 'today') {
    const clues = cluesOf({
      snapshot: data.snapshot.data, overview: data.overview.data,
      inbox: data.inbox.data, misses: data.misses.data,
    })
    return clues[0]?.id ?? ''
  }
  if (pane === 'todo') {
    const sections = todoSectionsOf({
      snapshot: data.snapshot.data, inbox: data.inbox.data, misses: data.misses.data,
    })
    for (const section of sections) {
      if (section.rows.length > 0) return section.rows[0]!.key
    }
    return ''
  }
  if (pane === 'memory') {
    const rows = memoryRowsOf(data.snapshot.data, 'content', '')
    return rows[0]?.id ?? ''
  }
  if (pane === 'health') return 'b:injected'
  void counts
  return ''
}

/** 主面板页面。 */
export function MemoryOpsPage(props: Record<string, unknown>): ReactNode {
  const ctx = (props as { ctx?: ClientContextLike }).ctx
  const data = useWorkbenchData(ctx)

  const [pane, setPane] = useState<PaneId>('today')
  const [picked, setPicked] = useState<Record<PaneId, string>>({
    today: '', capture: '', todo: '', memory: '', health: '',
  })
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [pending, setPending] = useState(false)
  const [bandFolded, setBandFolded] = useState(false)
  const [live, setLive] = useState('')

  /* 读屏播报的定时器与「当前分区」都要能跨渲染读取（且卸载后不许再 setState）。 */
  const liveTimer = useRef<number | null>(null)
  const paneRef = useRef<PaneId>('today')

  useEffect(() => {
    paneRef.current = pane
  }, [pane])

  useEffect(() => () => {
    if (liveTimer.current !== null) window.clearTimeout(liveTimer.current)
  }, [])

  /* 跨表面跳转：会话 tab 的「去待办」写请求，这里消费。 */
  const requestedPane = usePaneRequest()
  useEffect(() => {
    const next = consumePaneRequest()
    if (next === undefined) return
    setPane(next)
    setNotice(null)
  }, [requestedPane])

  const counts = countsOf({
    snapshot: data.snapshot.data,
    overview: data.overview.data,
    inbox: data.inbox.data,
    misses: data.misses.data,
  })

  const isEmpty = ((): boolean => {
    if (pane === 'today' || pane === 'todo') return counts.urgent === 0
    if (pane === 'capture') return counts.capturedToday === 0
    if (pane === 'memory') return counts.entries === 0
    return counts.catalog === 0 && counts.injected === 0
  })()

  const phase: Phase = phaseOf(sourcesFor(pane, data), isEmpty)
  const selected = picked[pane] !== '' ? picked[pane] : defaultKeyOf(pane, { counts, data })

  const announce = useCallback((text: string) => {
    /* 同一句话连播两次时读屏不重复读：先清空再写。 */
    if (liveTimer.current !== null) window.clearTimeout(liveTimer.current)
    setLive('')
    liveTimer.current = window.setTimeout(() => { setLive(text); liveTimer.current = null }, 30)
  }, [])

  /* 重入保护：用 ref 而不是 pending state —— 同一 tick 内连点两次时 state 还是旧值。 */
  const busy = useRef(false)

  const run = useCallback((action: () => Promise<void>, success?: string, undo?: UndoSpec) => {
    if (busy.current) return
    busy.current = true
    setPending(true)
    void action()
      .then(() => {
        if (success !== undefined) {
          const next: Notice = { ok: true, text: success }
          if (undo !== undefined) {
            next.undo = {
              label: undo.label,
              act: () => {
                if (busy.current) return
                busy.current = true
                setPending(true)
                void undo.run()
                  .then(() => {
                    setNotice({ ok: true, text: '已撤销' })
                    announce('已撤销')
                    setPicked(prev => ({ ...prev, [paneRef.current]: '' }))
                    data.reloadAll()
                  })
                  .catch((error: unknown) => {
                    setNotice({ ok: false, text: hintOf(error), kind: classify(error) })
                  })
                  .finally(() => { busy.current = false; setPending(false) })
              },
            }
          }
          setNotice(next)
          announce(success)
        }
        /*
         * 动作成功后被操作的那一行会从清单里消失：选择键必须一起清掉，
         * 否则检视栏会停在一个已经不存在的条目上（空白且没有解释）。
         */
        setPicked(prev => ({ ...prev, [paneRef.current]: '' }))
        data.reloadAll()
      })
      .catch((error: unknown) => {
        const text = hintOf(error)
        setNotice({ ok: false, text, kind: classify(error) })
        announce(text)
      })
      .finally(() => { busy.current = false; setPending(false) })
  }, [data, announce])

  const goto = useCallback((next: PaneId, key?: string) => {
    setPane(next)
    setNotice(null)
    if (key !== undefined) setPicked(prev => ({ ...prev, [next]: key }))
  }, [])

  const onSelect = useCallback((key: string) => {
    setPicked(prev => ({ ...prev, [pane]: key }))
    setNotice(null)
  }, [pane])

  const paneProps: PaneProps = {
    data,
    phase,
    counts,
    sel: selected,
    onSelect,
    draft,
    onDraft: setDraft,
    run,
    pending,
    notice,
    goto,
  }

  const lede = ledeFor(pane, phase, counts)

  let center: ReactNode
  let inspector: ReactNode
  if (pane === 'capture') {
    center = createElement(CaptureCenter, { ...paneProps })
    inspector = createElement(CaptureInspector, { ...paneProps })
  } else if (pane === 'todo') {
    center = createElement(TodoCenter, { ...paneProps })
    inspector = createElement(TodoInspector, { ...paneProps })
  } else if (pane === 'memory') {
    center = createElement(MemoryCenter, { ...paneProps })
    inspector = createElement(MemoryInspector, { ...paneProps })
  } else if (pane === 'health') {
    center = createElement(HealthCenter, { ...paneProps })
    inspector = createElement(HealthInspector, { ...paneProps })
  } else {
    center = createElement(TodayCenter, { ...paneProps })
    inspector = createElement(TodayInspector, { ...paneProps })
  }

  /*
   * 读不到 / 读取中时，检视栏统一换成「不展示缓存内容」的说明。
   *
   * 为什么在面板层做而不是每个 pane 各做一遍：error 态下各 pane 的数据是
   * 空的，它们会算出一堆 0（「0 tokens 你能关 0」）——看起来像正常报表，
   * 实际是读不到。这一层统一拦掉，任何 pane 都伪造不了 error 态的内容。
   */
  if (phase === 'error') {
    inspector = InspectorFrame({
      title: '读不到数据',
      sub: 'state = error',
      body: createElement('div', null,
        createElement('p', { className: 'mo-insp-text' },
          '这一屏读不到，检视栏不展示缓存内容——避免用旧内容冒充新事实。中栏有原因与下一步。'),
        createElement('p', { className: 'mo-check-line' },
          '左轨计数与顶条读数同样是「—」：读不到不等于 0，空也不等于 0。')),
      foot: BtnGhost({ children: '重试', actName: 'retry', onClick: () => { data.reloadAll() } }),
      phase,
    })
  } else if (phase === 'loading') {
    inspector = InspectorFrame({
      title: '读取中',
      sub: '正在取这一页',
      body: Skeleton({ rows: 3, label: '读取中：检视栏内容随选中项替换' }),
      phase,
    })
  } else if (phase === 'empty') {
    /* 空态没有条目可选：给出口说明，别在这里伪造一条「详情」。 */
    inspector = InspectorFrame({
      title: '没有可选的条目',
      sub: 'state = empty（不是 error）',
      body: createElement('div', null,
        createElement('p', { className: 'mo-insp-text' },
          '空态下没有条目可选。用中栏给的出口继续，别在这里找不存在的详情。'),
        createElement('p', { className: 'mo-check-line' },
          '空 ≠ 读不到：这里的 0 是数出来的 0，顶条与左轨都显示 0。')),
      phase,
    })
  }

  const unit = ((): string => {
    if (pane === 'capture') return '条今天已记'
    if (pane === 'todo') return '件压着'
    if (pane === 'memory') return '条记忆'
    if (pane === 'health') return 'tokens / 请求'
    return '件要动手'
  })()

  return createElement(Stage, {
    pane,
    phase,
    counts,
    lede,
    figure: figureFor(pane, phase, counts),
    unit,
    bandNote: bandNoteFor(pane, phase, counts),
    bandFigure: bandFigureFor(phase, counts),
    bandFolded,
    onToggleBand: () => { setBandFolded(value => !value) },
    onGoto: (next: PaneId) => { goto(next) },
    center,
    inspector,
    notice,
    statusLeft: STATUS_LEFT,
    statusRight: statusRightOf({ snapshot: data.snapshot.data, overview: data.overview.data, phase }),
    live,
  })
}

/** 供测试：四桶与记忆过滤这两个口径函数的单一出口（不许组件里另算）。 */
export { bucketsOf, memoryEntries }