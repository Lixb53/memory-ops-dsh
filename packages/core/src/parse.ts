/**
 * md ↔ 结构体：frontmatter 与 INBOX 五列表格。
 *
 * 设计立场：**只用最小解析器**。引入 js-yaml 会让「人可审的 Markdown」
 * 变成「需要装依赖才能审的 Markdown」，这正是拒绝 storageDomain per-record 的同一理由。
 * 所以这里手写 frontmatter：只认 `key: value`、`key: [a, b]`、`key:` + `- item` 列表。
 */

import { INBOX_COLUMNS } from './schema.ts'

const FRONTMATTER_FENCE = '---'

/** INBOX 表格骨架：表头 + 分隔行（列是契约，不可随意增删）。 */
export const INBOX_HEADER = `| ${INBOX_COLUMNS.join(' | ')} |\n|${INBOX_COLUMNS.map(() => '---').join('|')}|`

/** frontmatter 值：标量、标量数组、或对象数组（evidence / anchor）。 */
export type FrontmatterValue = string | string[] | Record<string, string>[]
export type Frontmatter = Record<string, FrontmatterValue | number | boolean>

/** 一条 INBOX 表格行。 */
export interface InboxRow {
  date: string
  kind: string
  content: string
  state: string
  destination: string
  raw: string
  kindValid: boolean
  stateValid: boolean
  lineIndex: number
}

/** 拆出 frontmatter 原始文本与正文。 */
export function splitFrontmatter(source: unknown): { frontmatter: string; body: string } {
  const text = String(source ?? '').replace(/\r\n/g, '\n')
  if (!text.startsWith(`${FRONTMATTER_FENCE}\n`)) return { frontmatter: '', body: text }
  const end = text.indexOf(`\n${FRONTMATTER_FENCE}`, FRONTMATTER_FENCE.length)
  if (end < 0) return { frontmatter: '', body: text }
  return {
    frontmatter: text.slice(FRONTMATTER_FENCE.length + 1, end),
    body: text.slice(end + FRONTMATTER_FENCE.length + 2),
  }
}

/** 去掉包裹引号。 */
function unquote(value: string): string {
  const text = String(value ?? '').trim()
  if (text.length >= 2) {
    const first = text[0]
    const last = text[text.length - 1]
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return text.slice(1, -1)
    }
  }
  return text
}

/** 解析行内数组 `[a, b]`。 */
function parseInlineArray(value: string): string[] {
  const inner = value.trim().slice(1, -1).trim()
  if (inner === '') return []
  return inner.split(',').map(item => unquote(item)).filter(item => item !== '')
}

/** 判断 `key: value` 形态的键名。 */
const KEY_PREFIX = /^[A-Za-z_][\w-]*\s*:/

/**
 * 解析 frontmatter 文本为对象。
 * 支持：标量、行内数组、块列表（`- item`）、嵌套对象数组（`- key: value` 续行）。
 */
export function parseFrontmatter(raw: unknown): Frontmatter {
  const result: Record<string, unknown> = {}
  const lines = String(raw ?? '').split('\n')
  let currentKey: string | null = null
  let currentItem: Record<string, string> | null = null

  for (const line of lines) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue

    const itemMatch = /^(\s+)-\s*(.*)$/.exec(line)
    if (itemMatch !== null && currentKey !== null && itemMatch[1].length >= 2) {
      const payload = itemMatch[2]
      if (currentItem !== null && KEY_PREFIX.test(payload)) {
        const colon = payload.indexOf(':')
        currentItem[payload.slice(0, colon).trim()] = unquote(payload.slice(colon + 1))
      } else if (currentItem !== null) {
        // 上一个对象的续行
        const previous = currentItem as Record<string, string>
        const lastKey = Object.keys(previous).pop()
        if (lastKey !== undefined) previous[lastKey] = `${previous[lastKey]} ${payload}`.trim()
      } else {
        currentItem = KEY_PREFIX.test(payload)
          ? (() => {
            const colon = payload.indexOf(':')
            return { [payload.slice(0, colon).trim()]: unquote(payload.slice(colon + 1)) }
          })()
          : { value: unquote(payload) }
        const list = Array.isArray(result[currentKey]) ? result[currentKey] as unknown[] : []
        list.push(currentItem)
        result[currentKey] = list
      }
      continue
    }

    // 缩进续行：上一个块列表项对象的下一个字段（`    excerpt: "..."`）
    const continuation = /^(\s{2,})([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line)
    if (continuation !== null && currentItem !== null && currentKey !== null) {
      currentItem[continuation[2]] = unquote(continuation[3])
      continue
    }

    const match = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line)
    if (match === null) continue
    const [, key, rawValue] = match
    currentKey = key
    currentItem = null
    const value = rawValue.trim()
    if (value === '') {
      result[key] = []
    } else if (value.startsWith('[') && value.endsWith(']')) {
      result[key] = parseInlineArray(value)
    } else {
      result[key] = unquote(value)
    }
  }

  return result as Frontmatter
}

/** 序列化 frontmatter 对象回文本（稳定顺序，便于 git diff）。 */
export function serializeFrontmatter(frontmatter: Record<string, unknown>): string {
  const lines = [FRONTMATTER_FENCE]
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`)
      } else if (value.every(item => typeof item !== 'object' || item === null)) {
        lines.push(`${key}: [${value.map(item => String(item)).join(', ')}]`)
      } else {
        lines.push(`${key}:`)
        for (const item of value) {
          if (typeof item !== 'object' || item === null) {
            lines.push(`  - ${String(item)}`)
            continue
          }
          const entries = Object.entries(item as Record<string, unknown>).filter(([, v]) => v !== undefined)
          entries.forEach(([k, v], index) => {
            lines.push(index === 0 ? `  - ${k}: ${String(v)}` : `    ${k}: ${String(v)}`)
          })
        }
      }
      continue
    }
    lines.push(`${key}: ${String(value)}`)
  }
  lines.push(FRONTMATTER_FENCE)
  return lines.join('\n')
}

/** 按未转义的 `|` 切分表格行。 */
export function splitTableRow(line: string): string[] {
  const text = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  const cells: string[] = []
  let buffer = ''
  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index]
    if (ch === '\\' && text[index + 1] === '|') {
      buffer += '|'
      index += 1
      continue
    }
    if (ch === '|') {
      cells.push(buffer.trim())
      buffer = ''
      continue
    }
    buffer += ch
  }
  cells.push(buffer.trim())
  return cells
}

/** 解析一行 INBOX 表格数据（表头与分隔行返回 null）。 */
export function parseInboxRow(line: string): Omit<InboxRow, 'kindValid' | 'stateValid' | 'lineIndex'> | null {
  const text = String(line ?? '').trim()
  if (!text.startsWith('|')) return null
  const cells = splitTableRow(text)
  if (cells.length !== INBOX_COLUMNS.length) return null
  const [date, kind, content, state, destination] = cells
  if (date === INBOX_COLUMNS[0] && kind === INBOX_COLUMNS[1]) return null
  if (/^[-: ]+$/.test(date)) return null
  return { date, kind, content, state, destination, raw: text }
}

/** 正文里的裸 `|` 必须转义，否则一行会被读成两行。 */
export function escapeCell(value: unknown): string {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim()
}

/** 序列化一条 INBOX 行为表格行。 */
export function serializeInboxRow(entry: {
  date: string; kind: string; content: string; state: string; destination?: string
}): string {
  return `| ${[
    escapeCell(entry.date),
    escapeCell(entry.kind),
    escapeCell(entry.content),
    escapeCell(entry.state),
    escapeCell(entry.destination ?? '—'),
  ].join(' | ')} |`
}

/** 解析 INBOX 文件：返回条目 + 行号（批量删除不漂移靠它）。 */
export function parseInbox(source: unknown, kinds: readonly string[], states: readonly string[]): {
  frontmatter: Frontmatter
  entries: InboxRow[]
  lines: string[]
  body: string
} {
  const { frontmatter, body } = splitFrontmatter(source)
  const lines = body.split('\n')
  const entries: InboxRow[] = []
  lines.forEach((line, index) => {
    const row = parseInboxRow(line)
    if (row === null) return
    entries.push({
      ...row,
      kindValid: kinds.includes(row.kind),
      stateValid: states.includes(row.state),
      lineIndex: index,
    })
  })
  return { frontmatter: parseFrontmatter(frontmatter), entries, lines, body }
}

/** 解析 markdown 的标题结构（用于档案正文渲染）。 */
export function parseSections(body: unknown): { title: string; level: number; lines: string[] }[] {
  const sections: { title: string; level: number; lines: string[] }[] = []
  let current = { title: '', level: 0, lines: [] as string[] }
  for (const line of String(body ?? '').split('\n')) {
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading !== null) {
      if (current.lines.length > 0 || current.title !== '') sections.push(current)
      current = { title: heading[2].trim(), level: heading[1].length, lines: [] }
      continue
    }
    current.lines.push(line)
  }
  if (current.lines.length > 0 || current.title !== '') sections.push(current)
  return sections
}

/** 解析正文里的 `- ` 条目（用于 patterns 的已确认/待确认分组）。 */
export function parseBullets(body: unknown): string[] {
  return String(body ?? '')
    .split('\n')
    .filter(line => /^\s*[-*]\s+/.test(line))
    .map(line => line.replace(/^\s*[-*]\s+/, '').trim())
    .filter(Boolean)
}
