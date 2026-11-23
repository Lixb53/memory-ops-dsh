/**
 * v9 外壳 —— 顶条 / 左轨 / 中栏 / 检视栏 / 状态条。
 *
 * ## 可达性（brief §七）
 *
 * - 左轨是竖直 `tablist`，每个 tab 带 `aria-controls="mo-pane-host"`，
 *   被控元素是 `role="tabpanel"`；`←`/`→` 不适用竖直方向，用 `↑`/`↓`/Home/End
 *   做 roving tabindex（只让当前 tab 在 Tab 序列里）。
 * - 检视栏是 `aside`，标题 `id="mo-insp-title"` 供 `aria-labelledby`。
 * - 状态条 `role="status"`；另有一个常驻隐藏 `aria-live` 播报动作结果，
 *   避免「点了有反应但读屏听不到」。
 * - 焦点环全站一种：`outline: 2px` + `offset: 2`（贴边控件 -1），见 styles-base。
 *
 * ## 每页恰好 1 个 T0
 *
 * T0 只在这里出现一次（顶条读数）。中栏与检视栏的标题都是 T1/T2，
 * 组件层面不提供第二个 `mo-t0` 的出口。
 */

import { createElement, type KeyboardEvent, type ReactNode } from 'react'

import { Figure, InlineDone, Lede, num } from './primitives.ts'
import type { InspectorSpec, Notice } from './types.ts'
import { PANES, countDisplay, type Counts, type PaneId, type Phase } from './view-model.ts'

/** 外壳参数。 */
export interface StageProps {
  pane: PaneId
  phase: Phase
  counts: Counts
  lede: string
  figure: number | null
  unit: string
  bandNote: string
  bandFigure: number | null
  bandFolded: boolean
  onToggleBand: () => void
  onGoto: (pane: PaneId) => void
  center: ReactNode
  inspector: ReactNode
  /** 写操作回执：所有分区共用同一条带，撤销按钮因此不会随分区切换消失。 */
  notice?: Notice | null
  statusLeft: string
  statusRight: string
  /** 动作播报（读屏）。 */
  live: string
}

/**
 * 检视栏骨架 —— 每个分区的 Inspector 都用它收口。
 *
 * 为什么由 `aside` 而不是 stride 里直接拼：`aria-labelledby` 需要标题 id 稳定，
 * 而标题由各分区决定。把它包在这里，id 只在一处出现，改名不会漏改。
 */
export function InspectorFrame(spec: InspectorSpec & { phase?: Phase }): ReactNode {
  return createElement('aside', {
    className: 'mo-insp',
    'aria-labelledby': 'mo-insp-title',
    'data-phase': spec.phase,
  },
  createElement('div', { className: 'mo-insp-head' },
    createElement('h2', { className: 'mo-insp-title', id: 'mo-insp-title' }, spec.title),
    createElement('p', { className: 'mo-insp-sub', id: 'mo-insp-sub' }, spec.sub)),
  createElement('div', { className: 'mo-insp-body', id: 'mo-insp-body' }, spec.body),
  spec.foot === undefined
    ? null
    : createElement('div', { className: 'mo-insp-foot', id: 'mo-insp-foot' }, spec.foot))
}

/** 左轨键盘：竖直 tablist 的方向键。 */
function onTabKey(event: KeyboardEvent<HTMLButtonElement>, pane: PaneId, onGoto: (pane: PaneId) => void): void {
  const index = PANES.findIndex(item => item.id === pane)
  let next = index
  if (event.key === 'ArrowDown') next = (index + 1) % PANES.length
  else if (event.key === 'ArrowUp') next = (index - 1 + PANES.length) % PANES.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = PANES.length - 1
  else return
  event.preventDefault()
  const target = PANES[next]!
  onGoto(target.id)
  /* 焦点跟随：roving tabindex 的既有约定是方向键同时移动焦点。 */
  const button = document.getElementById(`mo-tab-${target.id}`)
  if (button !== null) button.focus()
}

/** 外壳。 */
export function Stage(props: StageProps): ReactNode {
  const {
    pane, phase, counts, lede, figure, unit, bandNote, bandFigure, bandFolded,
    onToggleBand, onGoto, center, inspector, notice, statusLeft, statusRight, live,
  } = props

  const current = PANES.find(item => item.id === pane) ?? PANES[0]!

  const rail = createElement('nav', {
    className: 'mo-rail',
    role: 'tablist',
    'aria-label': '记忆库分区',
    'aria-orientation': 'vertical',
  },
  createElement('ul', { className: 'mo-rail-list' },
    PANES.map(item => createElement('li', { key: item.id },
      createElement('button', {
        type: 'button',
        className: 'mo-tab',
        role: 'tab',
        id: `mo-tab-${item.id}`,
        'data-pane': item.id,
        'aria-controls': 'mo-pane-host',
        'aria-selected': item.id === pane ? 'true' : 'false',
        tabIndex: item.id === pane ? 0 : -1,
        onClick: () => { onGoto(item.id) },
        onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => { onTabKey(event, pane, onGoto) },
      },
      createElement('span', { className: 'mo-tab-idx mo-num' }, item.idx),
      createElement('span', { className: 'mo-tab-label' }, item.label),
      createElement('span', { className: 'mo-tab-count mo-num' },
        countDisplay(item.id, phase, counts) === null ? '—' : num(countDisplay(item.id, phase, counts))))))))

  const topbar = createElement('header', { className: 'mo-topbar', role: 'banner' },
    createElement('div', { className: 'mo-brand' },
      createElement('span', { className: 'mo-brand-name' }, '记忆库'),
      createElement('span', { className: 'mo-brand-scope' }, current.label)),
    createElement(Lede, { text: lede }),
    createElement('div', { className: 'mo-readout' },
      Figure({ value: figure }),
      createElement('span', { className: 'mo-unit' }, unit)))

  const band = createElement('section', {
    className: 'mo-band',
    'data-folded': bandFolded ? 'true' : 'false',
    'aria-label': '每请求都在',
  },
  createElement('span', { className: 'mo-band-tag' }, '每请求都在'),
  createElement('span', { className: 'mo-band-note', id: 'mo-band-note' }, bandNote),
  createElement('button', {
    type: 'button',
    className: 'mo-textlink',
    'data-act': 'fold-budget',
    'aria-expanded': bandFolded ? 'false' : 'true',
    'aria-controls': 'mo-band-note',
    onClick: onToggleBand,
  }, bandFolded ? '展开' : '折起'),
  createElement('span', { className: 'mo-band-figure' },
    createElement('span', { className: 'mo-value mo-num' }, bandFigure === null ? '—' : num(bandFigure)),
    createElement('span', { className: 'mo-band-figure-unit' }, 'tokens')))

  const main = createElement('main', {
    className: 'mo-center',
    id: 'mo-pane-host',
    role: 'tabpanel',
    'aria-labelledby': `mo-tab-${pane}`,
    tabIndex: 0,
    'data-phase': phase,
  },
  band,
  notice === undefined || notice === null
    ? null
    : createElement('div', { className: 'mo-notice-bar', 'data-tone': notice.ok ? 'ok' : 'err' },
      InlineDone({ ok: notice.ok, text: notice.text, undo: notice.undo })),
  createElement('div', { className: 'mo-pane', id: 'mo-pane-body' }, center))

  return createElement('div', { className: 'mo-app', 'data-pane': pane },
    topbar,
    createElement('div', { className: 'mo-workarea' }, rail, main, inspector),
    createElement('footer', { className: 'mo-statusbar', role: 'status' },
      createElement('span', { className: 'mo-status-left' }, statusLeft),
      createElement('span', { className: 'mo-status-right mo-num' }, statusRight)),
    createElement('div', { className: 'mo-sr-only', role: 'status', 'aria-live': 'polite', 'data-live': '' }, live))
}