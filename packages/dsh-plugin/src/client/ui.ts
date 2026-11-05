/**
 * 共享 UI 原语 —— 不 require 任何 @deepseek-ai/* 客户端包。
 *
 * 宿主 practice 明确：require 宿主客户端包会在它改版时静默崩掉整个 slot entry。
 * 所以按钮、徽标、空态、骨架这些都自己写，只共享 `--dsw-alias-*` token。
 */

import { createElement, type ReactNode } from 'react'

/** 极简 h 简写。 */
export const h = createElement

/** 空值统一「—」。 */
export const EMPTY = '—'

/** 归一空值。 */
export function orEmpty(value: unknown): string {
  if (value === undefined || value === null) return EMPTY
  const text = String(value).trim()
  return text === '' ? EMPTY : text
}

/** 按码点截断。 */
export function truncate(text: unknown, max = 46): string {
  const chars = [...String(text ?? '')]
  if (chars.length <= max) return String(text ?? '')
  return `${chars.slice(0, max - 1).join('')}…`
}

/** 百分比显示；null 显示「—」而不是 0%。 */
export function percent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY
  return `${(value * 100).toFixed(digits)}%`
}

/** 数字千分位。 */
export function count(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY
  return value.toLocaleString('zh-CN')
}

/** 字节数可读化。 */
export function bytes(value: number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(2)} MB`
}

/** 状态 → 徽标语气。 */
export function statusTone(status: string): 'ok' | 'warn' | 'err' | 'idle' | 'brand' {
  switch (status) {
    case 'confirmed': return 'ok'
    case 'hypothesis': case 'observed': case 'stale': return 'warn'
    case 'rejected': return 'err'
    case 'reinforced': return 'brand'
    default: return 'idle'
  }
}

/** 状态 → 中文标签。 */
export const STATUS_LABEL: Record<string, string> = {
  hypothesis: '候选',
  observed: '观察中',
  reinforced: '已强化',
  confirmed: '已确认',
  rejected: '已驳回',
  stale: '待复核',
  archived: '已归档',
  active: '有效',
  pending: '待确认',
}

/** 状态中文名。 */
export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status
}

/** 徽标。 */
export function Badge({ tone = 'idle', children, title }: {
  tone?: 'ok' | 'warn' | 'err' | 'idle' | 'brand'
  children?: ReactNode
  title?: string
}): ReactNode {
  return h('span', { className: `dmo-badge dmo-badge-${tone}`, title }, children)
}

/** 按钮。 */
export function Button({ children, onClick, variant = 'plain', disabled = false, title, small = false }: {
  children?: ReactNode
  onClick?: () => void
  variant?: 'plain' | 'primary' | 'danger'
  disabled?: boolean
  title?: string
  small?: boolean
}): ReactNode {
  const variantClass = variant === 'primary'
    ? ' dmo-btn-primary'
    : variant === 'danger' ? ' dmo-btn-danger' : ''
  return h('button', {
    type: 'button',
    className: `dmo-btn${variantClass}${small ? ' dmo-btn-sm' : ''}`,
    onClick: disabled ? undefined : onClick,
    disabled,
    title,
  }, children)
}

/** 空态：三出口，避免「死胡同」。 */
export function Empty({ title, children }: { title?: string; children?: ReactNode }): ReactNode {
  return h('div', { className: 'dmo-empty' },
    title === undefined ? null : h('div', { className: 'dmo-empty-title' }, title),
    children)
}

/** 读取失败态：明确说「这不是空」，并给重试。 */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }): ReactNode {
  return h('div', { className: 'dmo-error', role: 'alert' },
    h('div', null, message),
    onRetry === undefined ? null : h('div', { style: { marginTop: 7 } },
      h(Button, { onClick: onRetry, small: true }, '重试')))
}

/** 骨架：尺寸与正常行等高，切换不塌陷。 */
export function Skeleton({ rows = 3, height = 52 }: { rows?: number; height?: number }): ReactNode {
  return h('div', { 'aria-busy': 'true', 'aria-live': 'polite' },
    Array.from({ length: rows }, (_, index) => h('div', {
      key: index, className: 'dmo-skeleton', style: { height },
    })))
}

/** KPI 格。 */
export function Kpi({ label, value, note }: {
  label: string; value: ReactNode; note?: ReactNode
}): ReactNode {
  return h('div', { className: 'dmo-kpi' },
    h('div', { className: 'dmo-kpi-label', title: label }, label),
    h('div', { className: 'dmo-kpi-value' }, value),
    note === undefined ? null : h('div', { className: 'dmo-kpi-note' }, note))
}

/** 置信度 stepper：hypothesis → observed → reinforced → confirmed。 */
export function Stepper({ status }: { status: string }): ReactNode {
  const order = ['hypothesis', 'observed', 'reinforced', 'confirmed']
  const at = order.indexOf(status)
  return h('div', {
    className: 'dmo-stepper',
    role: 'img',
    'aria-label': `置信度状态：${statusLabel(status)}`,
  }, order.map((step, index) => h('span', {
    key: step,
    className: `dmo-step${at < 0 ? '' : index < at ? ' dmo-step-on' : index === at ? ' dmo-step-now' : ''}`,
    title: statusLabel(step),
  })))
}

/** 预算条。 */
export function BudgetRow({ name, tokens, limit }: {
  name: string; tokens: number; limit: number | null
}): ReactNode {
  const ratio = limit === null || limit <= 0 ? 0 : Math.min(1, tokens / limit)
  const over = limit !== null && tokens > limit
  return h('div', { className: 'dmo-budget-row' },
    h('span', { className: 'dmo-budget-name' }, name),
    h('div', { className: 'dmo-budget-bar' },
      h('div', {
        className: `dmo-budget-fill${over ? ' dmo-budget-fill-over' : ''}`,
        style: { width: `${Math.max(ratio * 100, tokens > 0 ? 2 : 0)}%` },
      })),
    h('span', { className: 'dmo-budget-num' },
      count(tokens), limit === null ? '' : ` / ${count(limit)}`))
}

/** 分区页签。 */
export function TabBar({ tabs, active, onChange }: {
  tabs: { id: string; label: string; badge?: number }[]
  active: string
  onChange: (id: string) => void
}): ReactNode {
  return h('div', { className: 'dmo-tabs', role: 'tablist' },
    tabs.map(tab => h('button', {
      key: tab.id,
      type: 'button',
      role: 'tab',
      className: 'dmo-tab',
      'aria-selected': tab.id === active,
      onClick: () => { onChange(tab.id) },
    },
    tab.label,
    tab.badge === undefined || tab.badge === 0
      ? null
      : h('span', { className: 'dmo-tab-badge' }, tab.badge > 99 ? '99+' : String(tab.badge)))))
}

/** 侧栏面板图标（品牌无关，用「叠放的记忆卡」意象）。 */
export function MemoryIcon({ size = 18 }: { size?: number }): ReactNode {
  return h('svg', {
    className: 'dmo-icon',
    viewBox: '0 0 20 20',
    width: size,
    height: size,
    'aria-hidden': true,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
  h('rect', { x: 2.5, y: 3, width: 15, height: 11, rx: 2 }),
  h('path', { d: 'M5.5 17h9' }),
  h('path', { d: 'M6.5 7h7M6.5 10h4.5' }))
}
