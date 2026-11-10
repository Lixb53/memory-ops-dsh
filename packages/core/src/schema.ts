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

/** 记录流状态全集。 */
export const INBOX_STATES = ['open', 'todo', 'done', 'dropped'] as const

export type InboxKind = (typeof INBOX_KINDS)[number]
export type InboxState = (typeof INBOX_STATES)[number]

/**
 * 按类型区分的状态机 —— 「开始」不是所有类型都有的动作。
 *
 * ## 为什么必须分开（真实困扰）
 *
 * 早先 5 种类型共用 `open → todo → done / dropped`，于是记一条**决策**，
 * 界面上也会出现「开始」按钮。但决策没有"进行中"：它要么已定，要么未定。
 * 点了「开始」，系统没记录任何新事实，只是把标签从 open 换成 todo——
 * 这个状态不承载信息，纯粹是借来的待办模板。
 *
 * ## 各类型的真实生命周期
 *
 * | 类型 | 状态 | 理由 |
 * |---|---|---|
 * | 待办 | open → todo → done / dropped | 「开始做」是真实动作 |
 * | 计划 | open → todo → done / dropped | 同上，计划有执行期 |
 * | 决策 | open → done / dropped | 定了就是定了，没有过程中 |
 * | 想法 | open → done / dropped | 想法只有「采纳/搁置」，没有"在做" |
 * | 问题 | open → todo → done / dropped | 排查有过程，可标「在查」 |
 *
 * 注意「问题」保留 todo：一个 bug 可以被"正在查"——这与决策不同。
 */
export const KIND_STATES: Readonly<Record<InboxKind, readonly InboxState[]>> = {
  待办: ['open', 'todo', 'done', 'dropped'],
  计划: ['open', 'todo', 'done', 'dropped'],
  问题: ['open', 'todo', 'done', 'dropped'],
  决策: ['open', 'done', 'dropped'],
  想法: ['open', 'done', 'dropped'],
}

/** 某类型可用的状态列表；类型非法时退回全集（不遮住数据问题，由 UI 另行标红）。 */
export function statesOfKind(kind: unknown): readonly InboxState[] {
  const value = String(kind ?? '').trim()
  return (KIND_STATES as Record<string, readonly InboxState[]>)[value] ?? INBOX_STATES
}

/** 某类型下这个状态是否合法。 */
export function isStateAllowed(kind: unknown, state: unknown): boolean {
  return statesOfKind(kind).includes(String(state ?? '').trim() as InboxState)
}

/** 可信度状态机（frontmatter v2 `status`）。 */
export const CONFIDENCE_STATES = [
  'hypothesis', 'observed', 'reinforced', 'confirmed', 'rejected', 'stale', 'archived',
] as const

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

/**
 * **自动**爬升的合法迁移（见 product.md §11.4 的状态迁移图）。
 *
 * 这套表回答的是「系统能不能自己把一条记忆升上去」，所以它必须严格：
 * hypothesis 只能先到 observed，observed 只能先到 reinforced，
 * 只有 reinforced 才允许到 confirmed。自动逻辑永远不许跳级。
 *
 * ⚠️ 它**不是**「人能否确认」的唯一依据——那是下面 `HUMAN_STATE_TRANSITIONS`。
 * 两者混用过一次，后果见那份注释。
 */
export const STATE_TRANSITIONS: Readonly<Record<ConfidenceState, readonly ConfidenceState[]>> = {
  hypothesis: ['observed', 'rejected', 'stale', 'archived'],
  observed: ['reinforced', 'rejected', 'stale', 'archived'],
  reinforced: ['confirmed', 'rejected', 'stale', 'archived'],
  confirmed: ['rejected', 'stale', 'archived'],
  rejected: ['hypothesis', 'observed', 'reinforced', 'confirmed'],
  stale: ['confirmed', 'rejected', 'archived'],
  archived: ['confirmed', 'stale'],
}

/**
 * **人**拍板的合法迁移。
 *
 * ## 为什么必须与自动表分开（真事故）
 *
 * 早先 `setStatus` 用自动表校验，而界面在 hypothesis / observed / stale 上都
 * 提供了「确认」按钮（待处理队列里 hypothesis 正是最常见的一类）。
 * 于是每点一次都返回 `非法状态迁移：hypothesis → confirmed`。
 *
 * 更糟的是它出现在**两个入口**上，且总览那个入口连错误都没显示——
 * 用户看到的是「点了没反应」，于是合理地怀疑「记忆库坏了」。
 *
 * ## 为什么人可以直接确认 hypothesis
 *
 * observed / reinforced 这两个中间态是**自动证据累积**的产物
 * （跨会话重复 ≥2 / ≥3）。它们的意义是「没人看的时候，系统凭什么相信它」。
 * 一旦人亲自看了并说「这条是对的」，再要求它先被机器自动升两级才允许确认，
 * 就是把人的判断力排在计数器后面——那正是 README 里反对的「单向漏斗」：
 * 系统设计了一套机制，用户却用不上。
 *
 * 所以人对**任何未归档、未驳回**的条目都可以直接确认；
 * 反过来，人**不能**把 confirmed 降级成 hypothesis（那是伪造历史），
 * 也不能跳过 rejected 的 30 天静默（撤销驳回走 `undoReject` 单独的表）。
 */
export const HUMAN_STATE_TRANSITIONS: Readonly<Record<ConfidenceState, readonly ConfidenceState[]>> = {
  hypothesis: ['confirmed', 'rejected', 'stale', 'archived', 'observed'],
  observed: ['confirmed', 'rejected', 'stale', 'archived', 'reinforced'],
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

/**
 * 共享分支目录名：该目录下的条目对项目内**所有分支**可见。
 *
 * ## 只装「机制性知识」，不装「架构性知识」（关键约束）
 *
 * 真实教训：把项目级共享层当垃圾桶用，`sz-web` 的 23 条记忆全挂在
 * 「所有分支可见」，等于让 `V2.0.19-dev` 读到了它根本没有的架构结论。
 * V2.1.25-dev 比 V2.0.19-dev 多出的东西，套到老分支上就是错的。
 *
 * 所以 `_shared` 的准入标准只有一条：**这条知识是否随版本变化**。
 *
 * | 准入 | 例子 | 理由 |
 * |---|---|---|
 * | ✅ 机制性 | git submodule 怎么修、codegraph 怎么建、dzhpatch 怎么处理 | 操作方式不随版本变 |
 * | ❌ 架构性 | 模块地图、项目梳理、某版本的 API 契约 | 随分支变化，混用会出事 |
 *
 * 架构性知识必须落到具体分支目录。写入时由 `SHARED_ALLOWED_KINDS` 强校验，
 * 不靠人记得——写错一个「看起来通用」的架构文档，代价是全场读到错结论。
 */
export const SHARED_BRANCH = '_shared'

/**
 * 允许放进 `_shared` 的知识类型。
 *
 * `mechanism` = 机制性（工具用法、操作流程、环境配置）
 * `convention` = 约定性（命名规范、存放规范、协作规则）
 *
 * 刻意**不含** `architecture` / `mapping` / `contract`：
 * 这三类天然随版本漂移，进共享层等于埋雷。
 */
export const SHARED_ALLOWED_KINDS = ['mechanism', 'convention'] as const

export type SharedAllowedKind = (typeof SHARED_ALLOWED_KINDS)[number]

/**
 * 知识类型全集。写入 `_shared` 时按这里判定准入。
 *
 * `unscoped` 是**待定**状态：还没判定属于哪条分支。它不进 `_shared`，
 * 而是留在项目根（`work/<project>/`），由界面标黄催办。
 * 「待定」和「有意共享」必须在数据上分开，否则待办永远清不完。
 */
export const KNOWLEDGE_KINDS = [
  'mechanism', 'convention', 'architecture', 'mapping', 'contract', 'unscoped',
] as const

export type KnowledgeKind = (typeof KNOWLEDGE_KINDS)[number]

/** 判定某个知识类型能否进 `_shared`。 */
export function canShareAcrossBranches(kind: unknown): boolean {
  const value = String(kind ?? '').trim()
  return (SHARED_ALLOWED_KINDS as readonly string[]).includes(value)
}

/** frontmatter 里 `branch: '*'` 的等价写法，表示显式声明「全分支共享」。 */
export const ANY_BRANCH = '*'

/**
 * 分支名的层级分隔符。
 *
 * `V2.1.25-dev-6594-6649` 是 `V2.1.25-dev` 拉出的特性分支（真实存在），
 * 所以共享判断按「前缀 + `-`」：主线上的结论对特性分支仍然成立。
 * 反向不成立——特性分支的临时结论不许上浮到主线。
 */
export const BRANCH_SEPARATOR = '-'

/**
 * 项目未声明 `branches:` 时使用的默认分支目录名。
 *
 * ## 为什么单线项目也要建分支目录（统一规则，不留特例）
 *
 * 早先考虑过给单线项目一个「flat 模式」跳过分支维度。放弃的理由：
 * 两套目录规则意味着每个读取方都要先问「这个项目是哪一类」，
 * 而分类一旦判错，表现是**静默读错**（把别人的记忆当自己的），
 * 不是读不到。统一成一套结构，判错的可能性只剩一种：项目名认错。
 *
 * 单线项目的代价只是多一层目录，而这一层恰好是自解释的：
 * `work/memory-ops/main/issues/x.md` 一眼能看出「只有一条线」。
 */
export const DEFAULT_BRANCH = 'main'

/** 作用域识别失败时的原因码（供界面翻译成人话，不直接展示）。 */
export const SCOPE_REASONS = {
  NO_CWD: 'no_cwd',
  NO_GIT: 'no_git',
  DETACHED: 'detached_head',
  UNKNOWN_PROJECT: 'unknown_project',
  UNKNOWN_BRANCH: 'unknown_branch',
  /** 条目不在任何分支目录下（老扁平布局或漏建目录）。 */
  UNSCOPED_ENTRY: 'unscoped_entry',
} as const

export type ScopeReason = (typeof SCOPE_REASONS)[keyof typeof SCOPE_REASONS]

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

/** 校验一次**自动**状态迁移是否合法。 */
export function canTransition(from: string, to: string): boolean {
  if (from === to) return true
  const allowed = STATE_TRANSITIONS[from as ConfidenceState]
  return allowed !== undefined && allowed.includes(to as ConfidenceState)
}

/**
 * 校验一次**人拍板**的状态迁移是否合法。
 *
 * 与 `canTransition` 的差别只有一处，但那一处是用户能不能用的问题：
 * 人可以直接确认 hypothesis / observed，不必先等机器把它爬上来。
 */
export function canHumanTransition(from: string, to: string): boolean {
  if (from === to) return true
  const allowed = HUMAN_STATE_TRANSITIONS[from as ConfidenceState]
  if (allowed !== undefined && allowed.includes(to as ConfidenceState)) return true
  /**
   * 兜底：非枚举状态（老数据里的 `active`）先按自动表放行。
   * 修补作业会把它们纠正成合法值，但在这个窗口期里不该让用户点不动按钮。
   */
  if (allowed === undefined) return canTransition(from, to)
  return STATE_TRANSITIONS[from as ConfidenceState]?.includes(to as ConfidenceState) ?? false
}
