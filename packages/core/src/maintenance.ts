/**
 * 维护作业 —— 三件「本该定时跑、但改成了按需触发」的事。
 *
 * ## 为什么不做常驻定时器
 *
 * product.md §11.3 拒绝 embedding 常驻进程的理由，在这里同样成立：
 * 定时器要一直活着、要能在后台写盘、要在插件卸载时干净退出。
 * 这三样换来的只是「不用手动点一下」，却把「零常驻成本」这条产品主张破掉了
 * ——而那条主张正是这个产品不做第二个 knowledge 的根据。
 *
 * 所以这里只提供**纯函数**（可单测、无副作用），由 actions 包成能力、
 * bridge 暴露成路由、UI 给按钮、agent 用工具调。什么时候跑由人决定。
 *
 * ## 三项作业
 *
 * | 作业 | 回答的问题 | 文档出处 |
 * |---|---|---|
 * | `verifyAnchors` | 我引用的代码符号还在吗？ | §11.2 锚点失效 / §11.7 M3 |
 * | `compactBody` | 超 80 行的文件怎么减重？ | §三 主张 3 / §八「只显示不处理」 |
 * | `weeklyReview` | 这周记忆库发生了什么？ | §11.7 M5 每周复盘 |
 */

import crypto from 'node:crypto'

import {
  AUTO_PROMOTABLE_STATES, FILE_LINE_LIMIT, REINFORCE_MIN_SESSIONS,
  STALE_AFTER_DAYS, daysSince, expiryOf, truncate,
  type ConfidenceState,
} from './schema.ts'
import type { MemoryEntry, MemoryEvent, MissRecord } from './store.ts'

// ============================================================
// 一、锚点校验
// ============================================================

/** 锚点校验的结论。 */
export type AnchorState = 'fresh' | 'stale' | 'missing' | 'unverifiable'

/** 一条锚点的校验结果。 */
export interface AnchorCheck {
  id: string
  path: string
  title: string
  /** 锚点指向的文件（相对 baseDir）。 */
  anchorPath: string
  /** 期望存在的符号 / 片段。 */
  symbol: string
  /** 记录时的内容指纹。 */
  recordedHash: string
  /** 现在算出来的指纹（文件读不到时为空串）。 */
  actualHash: string
  state: AnchorState
  /** 人可读的判断依据——UI 上直接展示，不用二次解释。 */
  reason: string
}

/** 一次锚点校验的汇总。 */
export interface AnchorReport {
  checks: AnchorCheck[]
  summary: Record<AnchorState, number>
  /** 没有锚点的条目数（G1 直述与早期条目常见，不是错误）。 */
  withoutAnchor: number
  /** 校验的基准目录，UI 用它说明「在哪个仓库里找的」。 */
  baseDir: string
}

/**
 * 内容指纹。
 *
 * 为什么取整文件 sha256 而不是「符号片段」的哈希：
 * 片段哈希对缩进、换行、注释都敏感，一次格式化就会把全库记忆打成 stale，
 * 那样的告警很快就会被无视。整文件指纹只回答一件事——**这个文件自我写下之后变过没有**，
 * 变了才值得人去复核。符号是否存在由 `symbol` 单独判断，两件事分开。
 */
export function hashOf(text: unknown): string {
  return crypto.createHash('sha256').update(String(text ?? ''), 'utf8').digest('hex').slice(0, 12)
}

/** 读一个随 store 注入的文件读取器，避免 core 直接绑死 fs（测试可替换）。 */
export type AnchorReader = (relPath: string) => Promise<string | null>

/**
 * 校验一批条目的锚点。
 *
 * @param entries - store.scan() 的结果
 * @param reader  - 按相对路径读基准目录下的文件内容，读不到返回 null
 * @param baseDir - 基准目录，只用于报告里说明「在哪找的」
 */
export async function verifyAnchors(
  entries: MemoryEntry[],
  reader: AnchorReader,
  { baseDir = '' }: { baseDir?: string } = {},
): Promise<AnchorReport> {
  const checks: AnchorCheck[] = []
  let withoutAnchor = 0

  for (const entry of entries) {
    const anchor = entry.anchor
    if (anchor === null || Object.keys(anchor).length === 0) {
      withoutAnchor += 1
      continue
    }
    const anchorPath = String(anchor.path ?? '').trim()
    const symbol = String(anchor.symbol ?? '').trim()
    const recordedHash = String(anchor.hash ?? '').trim()
    const base: Omit<AnchorCheck, 'state' | 'reason' | 'actualHash'> = {
      id: entry.id,
      path: entry.path,
      title: entry.title,
      anchorPath,
      symbol,
      recordedHash,
    }

    if (anchorPath === '') {
      checks.push({
        ...base, actualHash: '', state: 'unverifiable', reason: '锚点缺少 path，无法定位',
      })
      continue
    }

    const text = await reader(anchorPath)
    if (text === null) {
      checks.push({
        ...base, actualHash: '', state: 'missing', reason: `锚点文件不存在：${anchorPath}`,
      })
      continue
    }

    const actualHash = hashOf(text)
    // 顺序要紧：先判符号缺失，再判 hash 漂移。
    // 符号都没了，说「内容变了」会掩盖真正的原因（那叫失效，不叫漂移）。
    if (symbol !== '' && !text.includes(symbol)) {
      checks.push({
        ...base,
        actualHash,
        state: 'stale',
        reason: `找不到符号「${truncate(symbol, 30)}」——代码可能已重命名或删除`,
      })
      continue
    }
    if (recordedHash !== '' && recordedHash !== actualHash) {
      checks.push({
        ...base,
        actualHash,
        state: 'stale',
        reason: `文件已变更（记录 ${recordedHash} → 现在 ${actualHash}），结论可能过期`,
      })
      continue
    }
    checks.push({ ...base, actualHash, state: 'fresh', reason: '锚点有效' })
  }

  const summary: Record<AnchorState, number> = { fresh: 0, stale: 0, missing: 0, unverifiable: 0 }
  for (const check of checks) summary[check.state] += 1
  return { checks, summary, withoutAnchor, baseDir }
}

// ============================================================
// 二、每日减重（80 行上限的可执行出口）
// ============================================================

/** 一次减重能做的机械压缩。 */
export interface CompactResult {
  /** 压缩后的正文。 */
  body: string
  /** 压缩前 / 后的行数。 */
  before: number
  after: number
  /** 省掉的行数（0 表示无可压缩）。 */
  removed: number
  /**
   * 具体做了什么。UI 直接展示，让人知道「它动了什么」——
   * 一个说不清自己改了什么的自动改写，用户不敢用。
   */
  changes: string[]
  /** 压缩后仍然超限时，给出该拆哪几节（只建议，不执行）。 */
  splitSuggestions: { heading: string; lines: number }[]
}

/**
 * 机械减重：只做**绝不改变语义**的三件事。
 *
 * | 动作 | 为什么安全 |
 * |---|---|
 * | 去行尾空白 | Markdown 里无意义（硬换行是两个空格，但那是行尾仅剩两空格的情况，这里保守保留） |
 * | 连续空行折叠为一 | 渲染结果完全相同 |
 * | 去首尾空行 | 渲染结果完全相同 |
 *
 * **不做的事**（明确写下来，避免以后有人「顺手」加上）：
 *   - 不删重复行：表格行、清单项、代码块里合法的重复很多，删了就是破坏数据
 *   - 不摘要正文：那是语义改写，必须由人或模型来做，且要留证据
 *   - 不自动拆文件：拆分会改变路径，而路径是记忆的 id 与引用锚点
 */
export function compactBody(body: unknown): CompactResult {
  const text = String(body ?? '').replace(/\r\n/g, '\n')
  const lines = text.split('\n')
  const kept: string[] = []
  let trimmed = 0
  let collapsed = 0
  let previousBlank = false

  for (const line of lines) {
    // 行尾空格：保留「恰好两个」的硬换行写法，其余去掉
    const hardBreak = /  $/.test(line)
    const cleaned = hardBreak ? `${line.replace(/\s+$/, '')}  ` : line.replace(/\s+$/, '')
    if (cleaned !== line) trimmed += 1

    const isBlank = cleaned.trim() === ''
    if (isBlank && previousBlank) {
      collapsed += 1
      continue
    }
    previousBlank = isBlank
    kept.push(cleaned)
  }

  // 去首尾空行
  let start = 0
  let end = kept.length
  while (start < end && kept[start].trim() === '') start += 1
  while (end > start && kept[end - 1].trim() === '') end -= 1
  const headTail = start + (kept.length - end)
  const result = kept.slice(start, end)

  const changes: string[] = []
  if (trimmed > 0) changes.push(`去行尾空白 ${trimmed} 行`)
  if (collapsed > 0) changes.push(`折叠连续空行 ${collapsed} 行`)
  if (headTail > 0) changes.push(`去首尾空行 ${headTail} 行`)

  return {
    body: result.length === 0 ? '' : `${result.join('\n')}\n`,
    before: lines.length,
    after: result.length + 1,
    removed: lines.length - (result.length + 1),
    changes,
    splitSuggestions: splitSuggestionsOf(result),
  }
}

/**
 * 超限时该拆哪几节 —— 只给建议，不执行。
 *
 * 拆分是不可逆的结构变更（路径即 id、即引用锚点），必须有人看过再动手。
 * 这里只回答「哪几节最重」，让人自己决定。
 */
export function splitSuggestionsOf(lines: string[]): { heading: string; lines: number }[] {
  const sections: { heading: string; lines: number }[] = []
  let current: { heading: string; lines: number } | null = null
  for (const line of lines) {
    const heading = /^#{2,3}\s+(.*)$/.exec(line)
    if (heading !== null) {
      if (current !== null) sections.push(current)
      current = { heading: heading[1].trim(), lines: 0 }
      continue
    }
    if (current !== null) current.lines += 1
  }
  if (current !== null) sections.push(current)
  // 只报占行数 ≥ 20 的节：低于这个量拆出去也不解决问题，反而多一个文件
  return sections.filter(section => section.lines >= 20).sort((a, b) => b.lines - a.lines)
}

/** 一个条目是否值得减重。 */
export function needsCompact(entry: Pick<MemoryEntry, 'lines' | 'overLineLimit' | 'tokens'>): boolean {
  return entry.overLineLimit || entry.lines > FILE_LINE_LIMIT
}

// ============================================================
// 三、每周复盘
// ============================================================

/** 一条待办式的复盘项。 */
export interface ReviewItem {
  kind: string
  title: string
  detail: string
  path?: string
}

/** 一周复盘的结论。 */
export interface WeeklyReview {
  /** 统计窗口。 */
  window: { days: number; from: string; to: string }
  /** 事件计数（按 kind 分组）。 */
  events: Record<string, number>
  counts: {
    /** 窗口内新建或更新过的条目数。 */
    touched: number
    /** 待拍板。 */
    pending: number
    /** 待复核（stale）。 */
    stale: number
    /** 超 80 行。 */
    overLimit: number
    /** 30 天未命中累计。 */
    misses: number
  }
  /** 最该补的未命中（按次数降序，只取前 5）。 */
  topMisses: { query: string; count: number }[]
  /** 该动手的事，按优先级排好。 */
  todo: ReviewItem[]
}

/**
 * 每周复盘：一周内发生了什么 + 下周该做什么。
 *
 * 为什么这不是「又一个统计页」：总览回答「现在多大」，复盘回答「这周动了什么、
 * 下周干什么」。两者的排序逻辑完全不同——复盘必须**以行动项结尾**，
 * 否则它会变成一份没人看的周报。
 */
export function weeklyReview(
  entries: MemoryEntry[],
  events: MemoryEvent[],
  misses: MissRecord[],
  { nowMs = Date.now(), days = 7 }: { nowMs?: number; days?: number } = {},
): WeeklyReview {
  const windowStart = nowMs - days * 86_400_000
  const inWindow = events.filter((event) => {
    const at = Date.parse(event.at ?? '')
    return Number.isFinite(at) && at >= windowStart
  })

  const eventCounts: Record<string, number> = {}
  for (const event of inWindow) {
    eventCounts[event.kind] = (eventCounts[event.kind] ?? 0) + 1
  }

  const touched = entries.filter((entry) => {
    const at = Date.parse(entry.updatedAt ?? '')
    return Number.isFinite(at) && at >= windowStart
  }).length

  const pending = entries.filter(entry => entry.status === 'hypothesis' || entry.status === 'observed').length
  const stale = entries.filter(entry => entry.status === 'stale').length
  const overLimit = entries.filter(entry => entry.overLineLimit).length
  const missCount = misses.reduce((sum, miss) => sum + (miss.count ?? 1), 0)

  const topMisses = [...misses]
    .sort((a, b) => (b.count ?? 1) - (a.count ?? 1))
    .slice(0, 5)
    .map(miss => ({ query: miss.query, count: miss.count ?? 1 }))

  // 行动项排序：先退役（会持续花钱），再拍板（阻塞纠错），最后补库（需要写作）
  const todo: ReviewItem[] = []
  for (const entry of entries) {
    const expiry = expiryOf(entry, nowMs)
    if (expiry.level === 'retire') {
      todo.push({
        kind: 'retire',
        title: entry.title,
        detail: `${expiry.days} 天未被引用，该归档或再留 90 天`,
        path: entry.path,
      })
    }
  }
  for (const entry of entries) {
    if (entry.status === 'hypothesis' || entry.status === 'observed') {
      todo.push({
        kind: 'confirm',
        title: entry.title,
        detail: `状态 ${entry.status}，等你确认或驳回`,
        path: entry.path,
      })
    }
  }
  for (const entry of entries) {
    if (entry.status === 'stale') {
      todo.push({
        kind: 'review',
        title: entry.title,
        detail: `待复核（${daysSince(entry.updatedAt, nowMs) ?? '?'} 天未动）`,
        path: entry.path,
      })
    }
  }
  for (const entry of entries) {
    if (entry.overLineLimit) {
      todo.push({
        kind: 'compact',
        title: entry.title,
        detail: `${entry.lines} 行，超 ${FILE_LINE_LIMIT} 行上限，可去「总览 · 减重」做机械压缩`,
        path: entry.path,
      })
    }
  }
  for (const miss of topMisses) {
    if (miss.count >= 3) {
      todo.push({ kind: 'fill', title: miss.query, detail: `未命中 ${miss.count} 次，该补一条` })
    }
  }

  return {
    window: {
      days,
      from: new Date(windowStart).toISOString(),
      to: new Date(nowMs).toISOString(),
    },
    events: eventCounts,
    counts: { touched, pending, stale, overLimit, misses: missCount },
    topMisses,
    todo,
  }
}

// ============================================================
// 四、自动爬升（observed → reinforced）
// ============================================================

/** 一条可以爬升的条目。 */
export interface PromotePlan {
  id: string
  path: string
  title: string
  from: ConfidenceState
  to: ConfidenceState
  /** 被多少个**不同会话**引用过。 */
  sessions: string[]
  reason: string
}

/**
 * 找出该爬升的条目 —— 只出计划，改不动。
 *
 * 口径（product.md §11.4）：跨会话重复 ≥3 且无反驳 → reinforced。
 *
 * 三个刻意的限制：
 *   1. **不同 session 才算一次**：同一会话里问三次是被同一次困惑驱动的，
 *      不构成独立验证。这是这条规则唯一的实质内容，去掉它就退化成「计数」。
 *   2. **最多爬到 reinforced**：confirmed 是人拍的板，代码不许替人做决定。
 *   3. **rejected 永不爬升**：驳回是人的明确否定，自动逻辑不许推翻它。
 */
export function planPromotions(
  entries: MemoryEntry[],
  events: MemoryEvent[],
  { minSessions = REINFORCE_MIN_SESSIONS }: { minSessions?: number } = {},
): PromotePlan[] {
  // id → 引用过它的会话集合（cite 与 recall 都算「被用到」）
  const sessionsById = new Map<string, Set<string>>()
  for (const event of events) {
    if (event.kind !== 'cite' && event.kind !== 'recall') continue
    const session = String(event.session ?? 'unknown')
    for (const id of event.ids ?? []) {
      const set = sessionsById.get(id) ?? new Set<string>()
      set.add(session)
      sessionsById.set(id, set)
    }
  }

  const plans: PromotePlan[] = []
  for (const entry of entries) {
    const current = entry.status as ConfidenceState
    if (!AUTO_PROMOTABLE_STATES.includes(current)) continue
    const sessions = [...(sessionsById.get(entry.id) ?? new Set<string>())]
    if (sessions.length < minSessions) continue
    const to: ConfidenceState = current === 'hypothesis' ? 'observed' : 'reinforced'
    plans.push({
      id: entry.id,
      path: entry.path,
      title: entry.title,
      from: current,
      to,
      sessions,
      reason: `${sessions.length} 个不同会话引用过（阈值 ${minSessions}）`,
    })
  }
  return plans.sort((a, b) => b.sessions.length - a.sessions.length)
}

// ============================================================
// 五、frontmatter 修补（把「手写笔记」变成「可治理的记忆」）
// ============================================================

/**
 * 一次字段修补的计划。
 *
 * ## 为什么需要它
 *
 * 真实库的现状：42 篇里有 34 篇**没有 frontmatter**（一开始就是裸 Markdown 笔记），
 * 有 frontmatter 的又只写了 `title/date/scope`。后果是一连串静默失效：
 *
 *   | 缺失字段 | 后果 |
 *   |---|---|
 *   | `status` | 读成 `active`（非法态）→ **待你处理队列永远空**、确认率永远 null |
 *   | `layer` | 读成空串 → 预算账本三段全错，L0/L1/L2 统计不出来 |
 *   | `id` | 由路径派生（可用，但重命名即换身份） |
 *   | `updated` | 读成空 → 到期判定拿不到基准，永远不会提示退役 |
 *
 * 这三件事加起来，就是「插件装了、数据在、但什么都不工作」。
 *
 * ## 修补的三条硬规矩
 *
 * 1. **绝不修改正文**。只动 frontmatter，body 原样保留。
 * 2. **绝不覆盖已有值**。已有 `status` / `title` 一律保留，只补空的和非法的。
 * 3. **默认 dry-run**。先给计划让人看，`apply` 才写。
 */
export interface FrontmatterFix {
  path: string
  title: string
  /** 有没有 frontmatter 段。 */
  hadFrontmatter: boolean
  /** 会被写入的字段（只含缺失或非法的）。 */
  patch: Record<string, string>
  /** 每个字段为什么被补——UI 直接展示，避免「它偷偷改了什么」。 */
  reasons: string[]
  /**
   * 需要**覆盖已有值**的字段。
   *
   * 只有一处：`status` 存着非法值（如 `active`）时必须改掉。
   * 其余字段一律只补空洞——修补不是重构，不能替人改既有结论。
   */
  overwrite: string[]
}

/** 修补计划。 */
export interface RepairPlan {
  fixes: FrontmatterFix[]
  /** 无需修补的篇数。 */
  healthy: number
  total: number
}

/** 合法状态集合（用于判定现有值是否有效）。 */
const VALID_STATUS = new Set([
  'hypothesis', 'observed', 'reinforced', 'confirmed', 'rejected', 'stale', 'archived',
  // 下面两个是「记录流专用」的展示态，出现在记忆条目里也算历史遗留，一并纠正
])

/**
 * 从正文猜 `layer`。
 *
 * 口径（product.md §四）：L0 = 索引入口，L1 = 索引表，L2 = 详情。
 *   1. 文件名是 `index.md` 或 `INDEX.md` → l0（它就是索引本身）
 *   2. 正文里出现 Markdown 表格且行数 < 60 → l1（像索引表）
 *   3. 其余 → l2（详情）
 *
 * 为什么按行数分流：PROBLEMS.md 那种台账是表格，但它是拿来「扫一遍找关键词」的，
 * 正是 L1 的定义；而一篇 200 行的表格正文是详情，不该算索引。
 */
export function guessLayer(relPath: string, body: string): string {
  const name = relPath.split('/').pop() ?? ''
  if (/^index\.md$/i.test(name)) return 'l0'
  const lines = body.split('\n').length
  const hasTable = /^\|.*\|$/m.test(body)
  if (hasTable && lines < 60) return 'l1'
  return 'l2'
}

/**
 * 从正文猜 `status`。
 *
 * 为什么默认 `confirmed` 而不是 `observed`：这些是**用户自己手写的笔记**，
 * 属于 G1（用户直述）。把它们判成「待确认」，等于让用户去确认自己写过的东西——
 * 那是噪音。真正需要人拍板的是 `memory_write` 产生的 G2 推断，那些本来就有状态。
 *
 * 例外（判 `hypothesis`）：
 *   - 正文里明确写着「待确认 / 待核实 / 推测」的，确实是未定结论；
 *   - **索引文件除外**：索引正文里常出现「待确认」这类词（描述别人的事），
 *     拿它当状态依据会把索引错判成推断。
 */
export function guessStatus(relPath: string, body: string): string {
  const name = relPath.split('/').pop() ?? ''
  // 索引与 INBOX 是结构性文件，状态恒为 confirmed（它们不是「结论」）
  if (/^index\.md$/i.test(name) || /^INBOX\.md$/i.test(name)) return 'confirmed'
  if (/待确认|待核实|推测|猜测/i.test(body)) return 'hypothesis'
  return 'confirmed'
}

/** 从正文猜标题：第一个 `# ` 标题，没有就用文件名。 */
export function guessTitle(relPath: string, body: string): string {
  const heading = /^#\s+(.+)$/m.exec(body)
  if (heading !== null && heading[1].trim() !== '') return heading[1].trim()
  return (relPath.split('/').pop() ?? relPath).replace(/\.md$/i, '')
}

/**
 * 算出一篇的修补计划。纯函数：不改文件、不看磁盘。
 *
 * @param entry - store.scan() 给出的条目（已含 frontmatter 解析结果）
 */
export function planRepair(entry: MemoryEntry, today: string): FrontmatterFix | null {
  const meta = entry.frontmatter as Record<string, unknown>
  const hadFrontmatter = Object.keys(meta).length > 0
  const patch: Record<string, string> = {}
  const reasons: string[] = []
  const overwrite: string[] = []

  // id：派生值可用，但写死更稳（重命名不换身份）
  const declaredId = typeof meta.id === 'string' ? meta.id.trim() : ''
  if (declaredId === '') {
    patch.id = entry.id
    reasons.push('补 id（原由路径派生，重命名会换身份）')
  }

  if (typeof meta.title !== 'string' || meta.title.trim() === '') {
    patch.title = guessTitle(entry.path, entry.body)
    reasons.push('补 title')
  }

  if (typeof meta.layer !== 'string' || !['l0', 'l1', 'l2'].includes(meta.layer)) {
    patch.layer = guessLayer(entry.path, entry.body)
    if (typeof meta.layer === 'string' && meta.layer.trim() !== '') overwrite.push('layer')
    reasons.push(`补 layer=${patch.layer}（否则预算账本三段统计不出来）`)
  }

  const declaredStatus = typeof meta.status === 'string' ? meta.status.trim() : ''
  if (declaredStatus === '' || !VALID_STATUS.has(declaredStatus)) {
    patch.status = guessStatus(entry.path, entry.body)
    // 已有非法值 → 必须覆盖，否则「保留非空值」的规则会把它原样留下
    if (declaredStatus !== '') overwrite.push('status')
    reasons.push(
      declaredStatus === ''
        ? `补 status=${patch.status}（缺失 → 读成 active，待你处理队列永远空）`
        : `纠正 status: ${declaredStatus} → ${patch.status}（${declaredStatus} 不在合法枚举内）`,
    )
  }

  /**
   * 只在**缺失**时补 `updated`，绝不用今天覆盖已有日期。
   *
   * 为什么这条要单独讲：`patchMeta` 的既有语义是「每次写都刷新 updated」，
   * 那对 `setStatus` / `keep` 是对的（它们确实是人的动作），
   * 但修补元数据不是「你动过这篇」——把它刷成今天会伪造「刚更新」，
   * 让到期退役判定从此刻重新计时，等于把 134 天的倒计时偷偷清零。
   */
  if (typeof meta.updated !== 'string' || meta.updated.trim() === '') {
    patch.updated = today
    reasons.push('补 updated（否则到期判定没有基准，永远不提示退役）')
  }

  if (typeof meta.kind !== 'string' || meta.kind.trim() === '') {
    patch.kind = 'fact'
    reasons.push('补 kind=fact')
  }

  if (Object.keys(patch).length === 0) return null
  return { path: entry.path, title: entry.title, hadFrontmatter, patch, reasons, overwrite }
}

/** 汇总全库的修补计划。 */
export function planRepairs(entries: MemoryEntry[], today: string): RepairPlan {
  const fixes: FrontmatterFix[] = []
  for (const entry of entries) {
    const fix = planRepair(entry, today)
    if (fix !== null) fixes.push(fix)
  }
  return { fixes, healthy: entries.length - fixes.length, total: entries.length }
}

/** 从未被引用且已过标灰线的条目。 */
export function neverCited(entries: MemoryEntry[], nowMs = Date.now()): MemoryEntry[] {
  return entries.filter((entry) => {
    const expiry = expiryOf(entry, nowMs)
    return entry.lastCitedAt === undefined && expiry.level !== 'fresh'
      && (expiry.days ?? 0) >= STALE_AFTER_DAYS
  })
}
