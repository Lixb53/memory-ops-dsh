/**
 * v9 样式表装配与注入。
 *
 * ## 为什么和旧的 `styles.ts` 并存而不是替换
 *
 * 4 个表面里只有主面板迁到 v9。会话记忆 tab、右侧快速捕获、`/remember` 浮层
 * 仍是 v7 的 `dmo-*` 结构（`client/styles.ts`），一并重写会把未评审的表面
 * 带进这次改动的爆炸半径。两份样式表互不覆盖：v9 的类名全部 `mo-` 前缀。
 *
 * ## 注入 id
 *
 * 固定 id 让「热更新后重复注入」变成幂等：已存在就直接返回空卸载函数。
 * 这与旧表的做法一致（那里踩过重复注入导致规则叠两遍的坑）。
 */

import { BASE_CSS } from './styles-base.ts'
import { PANE_CSS } from './styles-panes.ts'

const STYLE_ID = 'dsh-memory-ops-v9-style'

/** 完整样式表（导出供测试断言关键选择器存在）。 */
export const V9_CSS = `${BASE_CSS}\n${PANE_CSS}`

/** 注入 v9 样式，返回卸载函数。 */
export function installV9Styles(): () => void {
  if (typeof document === 'undefined') return () => {}
  const existing = document.getElementById(STYLE_ID)
  if (existing !== null) return () => {}
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = V9_CSS
  document.head.append(style)
  return () => {
    style.remove()
  }
}