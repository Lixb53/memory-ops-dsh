/**
 * 数据契约（唯一真相）—— memory-core schema v2。
 *
 * 这里定义的是**不可随意改**的那部分：
 *   - INBOX 五列（日期 | 类型 | 内容 | 状态 | 去向）
 *   - 类型枚举固定 5 个
 *   - 状态机 open → todo → done / dropped
 *   - frontmatter v2 的可选字段（向后兼容 v1）
 *
 * 为什么集中在一处：INBOX 状态流转与统计口径一旦两端各写一份，
 * 三个月后数字必然对不上。组件不共享（React / Vue 无法互通），逻辑必须共享。
 */

/** INBOX 表格列，顺序即契约。 */
export const INBOX_COLUMNS = ['日期', '类型', '内容', '状态', '去向'] as const

/** 类型枚举固定 5 个（多了就不填）。 */
export const INBOX_KINDS = ['想法', '计划', '问题', '待办', '决策'] as const

/** 记录流状态流转：open → todo → done / dropped。 */
export const INBOX_STATES = ['open', 'todo', 'done', 'dropped'] as const

/** 可信度状态机（frontmatter v2 `status`）。 */
export const CONFIDENCE_STATES = [
  'hypothesis', 'observed', 'reinforced', 'confirmed', 'rejected', 'stale', 'archived',
] as const

export type InboxKind = (typeof INBOX_KINDS)[number]
export type InboxState = (typeof INBOX_STATES)[number]
export type ConfidenceState = (typeof CONFIDENCE_STATES)[number]
export type Layer = 'l0' | 'l1' | 'l2'
export type Origin = 'G1' | 'G2' | 'G3' | 'G4'

/** 状态 → 置信度基线，用于 UI 徽标与 stepper。 */
export const STATE_CONFIDENCE: Readonly<Record<ConfidenceState, number>> = {
  hypothesis: 0.3,
  observed: 0.5,
  reinforced: 0.7,
  confirmed: 0.9,
  rejected: 0,
  stale: 0.4,
  archived: 0,
}

/** 合法状态迁移（唯一合法路径，见 product.md §11.4）。 */
export const STATE_TRANSITIONS: Readonly<Record<ConfidenceState, readonly ConfidenceState[]>> = {
  hypothesis: ['observed', 'rejected', 'stale', 'archived'],
  observed: ['reinforced', 'rejected', 'stale', 'archived'],
  reinforced: ['confirmed', 'rejected', 'stale', 'archived'],
  confirmed: ['rejected', 'stale', 'archived'],
  rejected: ['hypothesis', 'observed', 'reinforced', 'confirmed'],
  stale: ['confirmed', 'rejected', 'archived'],
  archived: ['confirmed', 'stale'],
}

/** 写入来源四道闸门（G1 显式 / G2 捕获 / G3 压缩 / G4 巩固）。 */
export const ORIGINS: readonly Origin[] = ['G1', 'G2', 'G3', 'G4']

/** 只有 G1（用户直述）可以不带 evidence。 */
export const ORIGIN_NEEDS_EVIDENCE: Readonly<Record<Origin, boolean>> = {
  G1: false, G2: true, G3: true, G4: true,
}

/** 层：L0 常驻 / L1 索引 / L2 详情。 */
export const LAYERS: readonly Layer[] = ['l0', 'l1', 'l2']

/** 单文件硬上限 80 行——防它变成第二个 knowledge 的唯一机制之一。 */
export const FILE_LINE_LIMIT = 80

/** 单文件建议 token 上限（超出只提示，不自动拆）。 */
export const FILE_TOKEN_SOFT_LIMIT = 1200

/** 常驻前缀预算（tokens / 请求）。 */
export const RESIDENT_TOKEN_BUDGET = 1024

/** 到期退役：90 天未引用标灰，134 天进「待你处理」。 */
export const STALE_AFTER_DAYS = 90
export const RETIRE_AFTER_DAYS = 134

/** 驳回静默期。 */
export const REJECT_SILENCE_DAYS = 30

/**
 * stale 条目在检索里的降权系数（product.md §11.6 承诺的 0.4）。
 *
 * 为什么是「降权」而不是「排除」：待复核不等于错，它只是「可能过期」。
 * 直接排除会让用户搜不到自己确认过的东西，那比搜到一条过期条目更糟。
 * 所以 stale 仍可检索，只是排在同分条目之后。
 */
export const STALE_WEIGHT = 0.4

/**
 * 自动爬升阈值：跨会话被引用多少次可以进 reinforced。
 *
 * 口径来自 product.md §11.4 的状态迁移图：
 *   「跨会话重复≥2 → observed」「重复≥3 且无反驳 → reinforced」。
 * 这里取 3，且**必须来自不同 session**——同一会话里问三次不等于被反复验证。
 */
export const REINFORCE_MIN_SESSIONS = 3

/**
 * 自动爬升的起始态：只有这两态会被自动推进。
 * confirmed 是人拍的板，任何自动逻辑都不许往回改。
 */
export const AUTO_PROMOTABLE_STATES: readonly ConfidenceState[] = ['hypothesis', 'observed']

/** 未命中验证窗口。 */
export const MISS_VERIFY_DAYS = 7

/** 长文本截断（46ch，设计系统约定）。 */
export const TRUNCATE_CHARS = 46

/** 空值统一显示「—」。 */
export const EMPTY_VALUE = '—'

/** 统一空值归一。 */
export function orEmpty(value: unknown): string {
  if (value === undefined || value === null) return EMPTY_VALUE
  const text = String(value).trim()
  return text === '' ? EMPTY_VALUE : text
}

/** 按码点截断，超出补省略号。 */
export function truncate(text: unknown, max = TRUNCATE_CHARS): string {
  const value = String(text ?? '')
  const chars = [...value]
  if (chars.length <= max) return value
  return `${chars.slice(0, Math.max(0, max - 1)).join('')}…`
}

/**
 * token 估算——零依赖、确定性。
 * 口径：CJK 与全角符号按 1 字 ≈ 1 token，其余按 4 字符 ≈ 1 token。
 * 这不是精确计量，但两端共用同一函数，所以比例可比。
 */
export function estimateTokens(text: unknown): number {
  const value = String(text ?? '')
  if (value === '') return 0
  let cjk = 0
  let rest = 0
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0
    const wide = (code >= 0x2e80 && code <= 0x9fff)
      || (code >= 0xac00 && code <= 0xd7af)
      || (code >= 0xf900 && code <= 0xfaff)
      || (code >= 0xff00 && code <= 0xffef)
      || (code >= 0x3000 && code <= 0x303f)
    if (wide) cjk += 1
    else rest += 1
  }
  return Math.ceil(cjk + rest / 4)
}

/** 距今天数（读不到日期返回 null）。 */
export function daysSince(iso: unknown, now = Date.now()): number | null {
  const at = Date.parse(String(iso ?? ''))
  if (!Number.isFinite(at)) return null
  return Math.floor((now - at) / 86_400_000)
}

/** 到期分级。 */
export interface Expiry {
  level: 'fresh' | 'stale' | 'retire' | 'unknown'
  days: number | null
}

/** 按最后引用时间判断到期分级。 */
export function expiryOf(
  entry: { lastCitedAt?: string; updatedAt?: string; createdAt?: string },
  now = Date.now(),
): Expiry {
  const days = daysSince(entry.lastCitedAt ?? entry.updatedAt ?? entry.createdAt, now)
  if (days === null) return { level: 'unknown', days: null }
  if (days >= RETIRE_AFTER_DAYS) return { level: 'retire', days }
  if (days >= STALE_AFTER_DAYS) return { level: 'stale', days }
  return { level: 'fresh', days }
}

/** 状态是否属于「待你处理」队列。 */
export function needsDecision(
  entry: { status: string; refutedAt?: string },
  now = Date.now(),
): boolean {
  if (entry.status === 'hypothesis' || entry.status === 'observed') return true
  if (entry.status === 'rejected') {
    const at = Date.parse(entry.refutedAt ?? '') || 0
    return at > 0 && now - at < REJECT_SILENCE_DAYS * 86_400_000
  }
  return entry.status === 'stale'
}

/** 校验一次状态迁移是否合法。 */
export function canTransition(from: string, to: string): boolean {
  if (from === to) return true
  const allowed = STATE_TRANSITIONS[from as ConfidenceState]
  return allowed !== undefined && allowed.includes(to as ConfidenceState)
}
