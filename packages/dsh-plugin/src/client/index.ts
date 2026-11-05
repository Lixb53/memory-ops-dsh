/**
 * 浏览器半体入口 —— 4 个表面 + 5 个分区。
 *
 * 4 个表面（插件级）：
 *   1. 侧栏记忆面板（sidebar.panellist + main），内部再分 5 个分区
 *   2. 会话记忆 tab（conversation.view）
 *   3. 右侧栏快速捕获（sidebarRightTabs + sidebar.right.pane.tab）
 *   4. /remember 命令（inputTriggers.registerSource）
 *
 * 5 个分区（侧栏面板内部）：本项目 / 记录流 / 记忆 / 未命中 / 总览
 *
 * 约束（照宿主 practices）：不 require 任何 @deepseek-ai/* 客户端包，
 * 只用 require('react') 与宿主标准 props；样式只用 --dsw-alias-* token。
 */

import {
  registerCaptureTab, registerMemoryPanel, registerRememberCommand, registerSessionView,
} from './register.ts'
import { installStyles } from './styles.ts'

export const inject = ['slots']

/** 客户端插件主体。 */
export function apply(ctx: ClientContext): void {
  const disposers: (() => void)[] = []

  // 样式：一次性注入，卸载时移除
  disposers.push(installStyles())

  // 4 个表面
  disposers.push(registerMemoryPanel(ctx))
  disposers.push(registerSessionView(ctx))
  disposers.push(registerCaptureTab(ctx))
  disposers.push(registerRememberCommand(ctx))

  ctx.effect(() => () => {
    for (const dispose of disposers) dispose()
  }, 'dsh-memory-ops: 4 surfaces')
}

/** 最小 Client Context 形状（不引宿主内部类型）。 */
export interface ClientContext {
  effect(callback: () => (() => void) | void, label?: string): () => void
  inject(services: string[], run: (ctx: ClientContext) => (() => void) | void): (() => void) | undefined
  get(name: string): unknown
  slots: {
    inject(key: string, callback: () => (() => void) | void): () => void
    register(options: Record<string, unknown>, component: unknown): () => void
  }
  locale?: {
    register(namespace: string, dicts: Record<string, Record<string, string>>): () => void
    bind(namespace: string): (key: string, params?: Record<string, string | number>) => string
  }
  [key: string]: unknown
}

export { PANEL_ID } from './register.ts'
