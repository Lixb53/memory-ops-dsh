/**
 * 四个表面的注册。
 *
 * 每个表面都包了「注册失败不影响其它表面」：宿主改版时最坏情况是某个
 * 表面不出现，而不是整个插件起不来（slot entry 崩掉会连带空白）。
 */

import { createElement, type ReactNode } from 'react'

import type { ClientContext } from './index.ts'
import { MemoryOpsPage, PanelIcon, PANEL_ID } from './panel.ts'
import { SessionMemoryView } from './session-view.ts'
import { CapturePane, CAPTURE_KIND } from './capture-tab.ts'
import { registerRememberSource } from './remember.ts'

/** 注册结果：成功返回 disposer，失败返回空 disposer 并记一条日志。 */
function safe(label: string, run: () => (() => void) | void): () => void {
  try {
    const result = run()
    return typeof result === 'function' ? result : () => {}
  } catch (error) {
    console.error(`[memory-ops] 表面「${label}」注册失败：`, error)
    return () => {}
  }
}

/** 表面 1：侧栏记忆面板 + 主面板页面。 */
export function registerMemoryPanel(ctx: ClientContext): () => void {
  const disposers: (() => void)[] = []

  disposers.push(safe('sidebar.panellist', () => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PANEL_ID,
    order: 30,
    label: () => '记忆库',
  }, PanelIcon))))

  disposers.push(safe('main', () => ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: PANEL_ID,
    inject: (): { ctx: ClientContext } => ({ ctx }),
  }, MemoryOpsPage as unknown as (props: Record<string, unknown>) => ReactNode))))

  return () => {
    for (const dispose of disposers) dispose()
  }
}

/** 表面 2：会话记忆 tab（conversation.view）。 */
export function registerSessionView(ctx: ClientContext): () => void {
  return safe('conversation.view', () => ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view',
    id: PANEL_ID,
    order: 40,
    label: () => '记忆',
    inject: (): { ctx: ClientContext } => ({ ctx }),
  }, SessionMemoryView as unknown as (props: Record<string, unknown>) => ReactNode)))
}

/** 表面 3：右侧栏快速捕获。 */
export function registerCaptureTab(ctx: ClientContext): () => void {
  const disposers: (() => void)[] = []

  // 阶段一：注册 tab 类型
  disposers.push(safe('sidebarRightTabs', () => {
    const service = ctx.get('sidebarRightTabs') as {
      register(definition: Record<string, unknown>): () => void
    } | undefined
    if (service === undefined || typeof service.register !== 'function') return () => {}
    return service.register({
      id: PANEL_ID,
      kind: CAPTURE_KIND,
      title: () => '快速捕获',
      guide: [{
        id: 'capture',
        order: 40,
        title: () => '快速捕获',
        description: () => '一句话赶紧存了，不离开聊天。',
      }],
    })
  }))

  // 阶段二：注册 tab 本体
  disposers.push(safe('sidebar.right.pane.tab', () => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab',
    key: PANEL_ID,
    inject: (): { ctx: ClientContext } => ({ ctx }),
  }, CapturePane as unknown as (props: Record<string, unknown>) => ReactNode))))

  // 标题栏
  disposers.push(safe('sidebar.right.pane.tab.title', () => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab.title',
    key: PANEL_ID,
  }, () => createElement('span', null, '快速捕获')))))

  return () => {
    for (const dispose of disposers) dispose()
  }
}

/** 表面 4：`/remember` 命令。 */
export function registerRememberCommand(ctx: ClientContext): () => void {
  return safe('inputTriggers', () => registerRememberSource(ctx))
}

export { PANEL_ID }
