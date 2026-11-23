/**
 * v9 组件之间的公共契约。
 *
 * 单独成文件是为了打断循环 import：`panel.ts` 引各 pane，各 pane 引这里的
 * 类型；如果类型放在 `panel.ts`，pane → panel → pane 会成环（esbuild 能处理，
 * 但 `tsc --noEmit` 与测试里的静态扫描会读不到）。
 */

import type { ReactNode } from 'react'

import type { WorkbenchData } from './data.ts'
import type { Counts, PaneId, Phase } from './view-model.ts'

/** 就地回执（成功 / 失败各一句，不弹 toast）。 */
export interface Notice {
  ok: boolean
  text: string
  /** 失败分类：决定界面给哪种补救建议（只有 privacy 才提示脱敏重存）。 */
  kind?: 'privacy' | 'lock' | 'missing' | 'unknown'
  /** 真有撤销能力时才带上（承诺可撤销却没有按钮是评审过的伪造承诺）。 */
  undo?: { label: string; act: () => void }
}

/** 撤销入口：真的会调一条写能力。 */
export interface UndoSpec {
  label: string
  run: () => Promise<void>
}

/** 一个分区组件拿到的全部依赖（含动作与反馈通道）。 */
export interface PaneProps {
  data: WorkbenchData
  phase: Phase
  counts: Counts
  /** 当前选中键（每个分区一套，由 panel 持有）。 */
  sel: string
  onSelect: (key: string) => void
  /** 记一条 / 随手记的草稿（切页不丢）。 */
  draft: string
  onDraft: (text: string) => void
  /**
   * 执行一次写动作：统一设置 pending、落回执、成功后重取全部数据。
   *
   * 组件里**不许**直接 `void call(...)`：静默的写失败在界面上与成功无法区分。
   */
  run: (action: () => Promise<void>, success?: string, undo?: UndoSpec) => void
  pending: boolean
  notice: Notice | null
  /** 跳到别的分区（可带选中键）。 */
  goto: (pane: PaneId, key?: string) => void
}

/** 检视栏内容（头 / 体 / 底三件）。 */
export interface InspectorSpec {
  title: string
  sub: string
  body: ReactNode
  foot?: ReactNode
}