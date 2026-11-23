/**
 * v9 原语 —— 对应原型 `prototype/ui.js` 的 `MO.*` 与 `pane-*.js` 里的片段。
 *
 * ## 三条不可退让的硬规则（design/brief.md §八）
 *
 * 1. **每页恰好 1 个 T0，且只给数字**：`Figure` 的实参是 `number | null`，
 *    传字符串在类型上就通不过；null 渲染成「—」而不是 0（error ≠ empty ≠ 0）。
 * 2. **判定句 ≤20 字且单行**：`Lede` 只接 string，长度由 `assertLede` 挡，
 *    测试对文案表逐条断言（与原型 lint 的 `MO.lede(` 字面量检查同一目的）。
 * 3. **主操作整页唯一**：墨块按钮 `BtnInk` 只在检视栏底部或记一条的输入框旁出现，
 *    由宿主组件决定落点，原语本身不提供「主按钮」语义。
 *
 * 状态词与 2px 刻度必须同时出现（不只靠颜色）：`Row` 把 tone 画成刻度，
 * 文本状态词走 `state` 字段。
 */

import { createElement, type ReactNode } from 'react'

/** 极简 h 简写。 */
export const h = createElement

/** 空值统一「—」。 */
export const EMPTY = '—'

/** 数字：null / undefined / 非有限值显示「—」，绝不出 0。 */
export function num(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY
  return value.toLocaleString('zh-CN')
}

/** 千分位 + 单位（如 `4,987 tokens`）。 */
export function withUnit(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY
  return `${num(value)} ${unit}`
}

/** 语气归一：未知语气一律 idle（不要凭空造第五种色）。 */
export type Tone = 'ok' | 'warn' | 'err' | 'idle'

/** 语气归一。 */
export function toneOf(tone: string | undefined): Tone {
  if (tone === 'warn' || tone === 'err' || tone === 'ok') return tone
  return 'idle'
}

/** 判定句长度上限（中文按字符计，与 lint 的字面量口径一致）。 */
export const LEDE_MAX = 20

/**
 * 断言判定句合法。
 *
 * 为什么在运行期也断言：原型靠 lint 静态查字面量，插件端的文案由数据拼出来，
 * 静态查不到。超长就抛错，测试会把每个 pane 的正常/空态文案都跑一遍。
 */
export function assertLede(text: string): string {
  if ([...text].length > LEDE_MAX) {
    throw new Error(`判定句超过 ${LEDE_MAX} 字：${text}`)
  }
  if (/[\r\n]/.test(text)) {
    throw new Error(`判定句不许换行：${text}`)
  }
  return text
}

/** T0 读数：只接数字或 null（null → 「—」）。 */
export function Figure({ value }: { value: number | null }): ReactNode {
  return h('span', { className: 'mo-t0 mo-num', 'data-figure': '' }, num(value))
}

/** 判定句。 */
export function Lede({ text }: { text: string }): ReactNode {
  return h('p', { className: 'mo-lede', 'data-lede': '' }, assertLede(text))
}

/** 段落标题 + 右说明。 */
export function SectionHead({ title, note }: { title: string; note?: string }): ReactNode {
  return h('div', { className: 'mo-section-head' },
    h('h2', { className: 'mo-section-title' }, title),
    note === undefined ? null : h('span', { className: 'mo-section-note mo-num' }, note))
}

/** 一行清单的四列。 */
export interface RowSpec {
  id: string
  title: string
  /** 元信息独立行（标题下方），不与标题抢宽度。 */
  meta?: string
  /** 归属列（个人域 / 待拍板…），不是路径。 */
  source?: string
  /** 右列数字：引用次数、tokens、件数。 */
  num?: number | null
  /** 状态词（不只靠颜色）。 */
  state?: string
  tone?: string
  current?: boolean
  /** 单行标题（密排）。 */
  dense?: boolean
}

/** 一行清单。 */
export function Row({ spec, onSelect }: { spec: RowSpec; onSelect: (id: string) => void }): ReactNode {
  const tone = toneOf(spec.tone)
  return h('li', { className: 'mo-row-item' },
    h('button', {
      type: 'button',
      className: 'mo-row-button',
      'data-select': spec.id,
      'aria-current': spec.current === true ? 'true' : undefined,
      onClick: () => { onSelect(spec.id) },
    },
    h('span', { className: `mo-tonebar mo-tone-${tone}` }),
    h('span', { className: 'mo-row-title', 'data-dense': spec.dense === true ? 'true' : undefined }, spec.title),
    h('span', { className: 'mo-row-col mo-row-col-src' }, spec.source ?? ''),
    h('span', { className: 'mo-row-col mo-row-col-num mo-num' },
      spec.num === undefined ? EMPTY : num(spec.num)),
    h('span', { className: 'mo-row-col mo-row-col-state' },
      h('span', { className: `mo-tonebar-inline mo-tone-${tone}` }),
      spec.state ?? ''),
    h('span', { className: 'mo-row-meta' }, spec.meta ?? '')))
}

/** 表头（双面切换时列集变化，行高不变）。 */
export function TableHead({ columns }: { columns: { label: string; num?: boolean }[] }): ReactNode {
  return h('div', { className: 'mo-table-head' },
    columns.map((column, index) => h('span', {
      key: column.label,
      className: column.num === true ? 'mo-is-num' : undefined,
      style: index === 0 ? undefined : undefined,
    }, column.label)))
}

/** 骨架：与真实行等高，不位移。 */
export function Skeleton({ rows = 4, label = '读取中' }: { rows?: number; label?: string }): ReactNode {
  return h('div', { className: 'mo-skel-wrap', role: 'presentation' },
    Array.from({ length: rows }, (_, index) => h('div', { key: index, className: 'mo-skel-row' })),
    h('p', { className: 'mo-skel-note' }, label))
}

/** 空态：说真话 + 给出口，不画插画。 */
export function EmptyBlock({ title, text, hint, action }: {
  title: string
  text: string
  hint?: string
  action?: { label: string; act: () => void; actName: string }
}): ReactNode {
  return h('div', { className: 'mo-state-block mo-state-empty' },
    h('h2', { className: 'mo-state-title' }, title),
    h('p', { className: 'mo-state-text' }, text),
    hint === undefined ? null : h('p', { className: 'mo-state-hint mo-num' }, hint),
    action === undefined ? null : h('div', { className: 'mo-state-actions' },
      h('button', { type: 'button', className: 'mo-btn-ghost', 'data-act': action.actName, onClick: action.act }, action.label)))
}

/** 错误态：原因 + 下一步 + 示例值。 */
export function ErrorBlock({ title, text, example, onRetry }: {
  title: string
  text: string
  example?: string
  onRetry: () => void
}): ReactNode {
  return h('div', { className: 'mo-state-block mo-state-error', role: 'alert' },
    h('h2', { className: 'mo-state-title' }, title),
    h('p', { className: 'mo-state-text' }, text),
    example === undefined ? null : h('p', { className: 'mo-state-hint mo-num' }, `示例：${example}`),
    h('button', { type: 'button', className: 'mo-btn-ghost', 'data-act': 'retry', onClick: onRetry }, '重试'))
}

/** 属性表（检视栏）：dt 固定 84px，dd 等宽可断行。 */
export function Props({ rows }: { rows: { label: string; value: string }[] }): ReactNode {
  return h('dl', { className: 'mo-props' },
    rows.map(row => h('div', { key: row.label, className: 'mo-prop' },
      h('dt', null, row.label),
      h('dd', null, row.value))))
}

/** 结论行（拒 / 警 / 通过 / 注入 / 跳过）。 */
export function Verdict({ tone, tag, children }: {
  tone: 'refuse' | 'warn' | 'ok' | 'plain'
  tag: string
  children?: ReactNode
}): ReactNode {
  const cls = tone === 'plain' ? 'mo-verdict' : `mo-verdict mo-verdict-${tone}`
  return h('div', { className: cls },
    h('span', { className: 'mo-verdict-tag' }, tag),
    children === undefined ? null : h('span', null, children))
}

/** 结论组。 */
export function Verdicts({ children }: { children?: ReactNode }): ReactNode {
  return h('div', { className: 'mo-verdicts' }, children)
}

/** 主操作：墨块。整页唯一，落点由调用方决定。 */
export function BtnInk({ children, onClick, disabled, actName, id }: {
  children?: ReactNode
  onClick?: () => void
  disabled?: boolean
  actName?: string
  id?: string
}): ReactNode {
  return h('button', {
    type: 'button',
    id,
    className: 'mo-btn-ink',
    'data-act': actName,
    disabled,
    onClick: disabled === true ? undefined : onClick,
  }, children)
}

/** 次级按钮：描边。 */
export function BtnGhost({ children, onClick, disabled, actName, id }: {
  children?: ReactNode
  onClick?: () => void
  disabled?: boolean
  actName?: string
  id?: string
}): ReactNode {
  return h('button', {
    type: 'button',
    id,
    className: 'mo-btn-ghost',
    'data-act': actName,
    disabled,
    onClick: disabled === true ? undefined : onClick,
  }, children)
}

/** 文字链。 */
export function TextLink({ children, onClick, actName }: {
  children?: ReactNode
  onClick?: () => void
  actName?: string
}): ReactNode {
  return h('button', { type: 'button', className: 'mo-textlink', 'data-act': actName, onClick }, children)
}

/** 就地反馈：成功 / 失败回执，不弹层。 */
export function InlineDone({ ok, text, undo }: {
  ok: boolean
  text: string
  undo?: { label: string; act: () => void }
}): ReactNode {
  return h('div', { className: 'mo-inline-done', 'data-tone': ok ? 'ok' : 'err', role: 'status' },
    h('span', { className: `mo-tonebar-inline mo-tone-${ok ? 'ok' : 'err'}` }),
    h('span', null, text),
    undo === undefined ? null : TextLink({ children: undo.label, onClick: undo.act, actName: 'undo' }))
}

/** 双面开关（role=switch，不用 tab）。 */
export function FaceSwitch({ face, onChange }: {
  face: 'content' | 'cost'
  onChange: (face: 'content' | 'cost') => void
}): ReactNode {
  const button = (id: 'content' | 'cost', label: string): ReactNode => h('button', {
    type: 'button',
    className: 'mo-face-btn',
    role: 'switch',
    'aria-checked': (face === id) === true ? 'true' : 'false',
    'data-face': id,
    onClick: () => { onChange(id) },
  }, label)
  return h('div', { className: 'mo-faces' },
    h('div', { className: 'mo-face-switch', role: 'group', 'aria-label': '清单视角' },
      button('content', '内容面'),
      button('cost', '成本面')),
    h('span', { className: 'mo-face-note' },
      face === 'cost' ? '按体积降序，回答「哪条最贵」' : '按库内顺序，回答「我存了什么」'))
}

/** 类型签组（记一条的 5 个类型）。 */
export function KindButtons({ kinds, kind, onKind }: {
  kinds: readonly string[]
  kind: string
  onKind: (kind: string) => void
}): ReactNode {
  return h('div', { className: 'mo-toolbar', role: 'group', 'aria-label': '类型' },
    kinds.map(item => h('button', {
      key: item,
      type: 'button',
      className: 'mo-kindbtn',
      'data-kind': item,
      'aria-pressed': item === kind ? 'true' : 'false',
      onClick: () => { onKind(item) },
    }, item)))
}