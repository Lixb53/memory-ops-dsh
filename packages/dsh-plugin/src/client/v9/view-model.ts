/**
 * v9 视图模型 —— 桥数据 → 界面读数与行规格。
 *
 * ## 为什么必须有这一层
 *
 * 原型把「顶条读什么数、判定句写什么」散在 `app.js` 的 `figureFor` / `ledeFor`
 * 与各 `pane-*.js` 里。移植时如果照搬，React 组件会同时承担取数、派生、
 * 排版三件事，`T0 唯一`、`判定句 ≤20 字`、`四桶之和 = 合计` 这三条硬规则
 * 就没人守了。所以这里只做纯函数：输入桥数据，输出读数与行规格，
 * 可以被单测逐条断言，组件只负责画。
 *
 * ## 口径（每条都有出处，不许在组件里另算）
 *
 * - **常驻前缀** = `overview.kpi.residentTokens`（每请求付费），
 *   不是索引层体积 `indexTokens`，也不是全库 `tokens`。
 * - **记忆条目** = `snapshot.entries` 去掉 INBOX（`*.INBOX` 是记录流那张表）。
 *   不去掉的话顶条读数会把记录流当成记忆，与「记录流 N 条」打架。
 * - **要动手的事** = 待拍板 + 流转中 + 待补库，三段就是待办页的三段。
 * - **null vs 0**：`—` 只表示「算不出来 / 读不到」，空态才显示 0。
 */

import type {
  EntryView, InboxView, MissesView, OverviewView, QueueItem, SnapshotView,
} from '../api.ts'

/**
 * token 估算 —— `core/schema.ts::estimateTokens` 的逐字复刻。
 *
 * 为什么不在浏览器里 import core：core/schema.ts 是 16 KB 的 TS，
 * 为了一个 6 行的估算函数把它整段打进 client bundle，等于让每个首屏请求
 * 多付一次解析成本。复刻的代价是**必须有一条测试盯着两边不漂移**：
 * `test/v9-view.test.mjs` 用同一组输入同时跑本函数与 core 的实现并断言相等。
 *
 * 口径：CJK / 全角标点 1 字 = 1 token，其余 4 字符 = 1 token，向上取整。
 */
export function estimateTokens(text: unknown): number {
  const value = String(text ?? '')
  if (value === '') return 0
  let wide = 0
  let rest = 0
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0
    const isWide = (code >= 0x2e80 && code <= 0x9fff)
      || (code >= 0xac00 && code <= 0xd7af)
      || (code >= 0xf900 && code <= 0xfaff)
      || (code >= 0xff00 && code <= 0xffef)
      || (code >= 0x3000 && code <= 0x303f)
    if (isWide) wide += 1
    else rest += 1
  }
  return Math.ceil(wide + rest / 4)
}

/** 分区 id（与 pane-nav 的 PaneId 同一组）。 */
export type PaneId = 'today' | 'capture' | 'todo' | 'memory' | 'health'

/** 一个分区的数据阶段（四态，success 由各页就地反馈不是阶段）。 */
export type Phase = 'loading' | 'ready' | 'empty' | 'error'

/** 语气（与 primitives 的 Tone 同义，这里避免循环 import 只取字符串字面量）。 */
export type ToneName = 'ok' | 'warn' | 'err' | 'idle'

/** 分区元数据：序号 / 名称 / 顶条单位（第 5 个决定「T0 是什么数」）。 */
export const PANES: readonly { id: PaneId; idx: string; label: string; unit: string }[] = [
  { id: 'today', idx: '01', label: '今天', unit: '件要动手' },
  { id: 'capture', idx: '02', label: '记一条', unit: '条今天已记' },
  { id: 'todo', idx: '03', label: '待办', unit: '件压着' },
  { id: 'memory', idx: '04', label: '记忆', unit: '条记忆' },
  { id: 'health', idx: '05', label: '库健康', unit: 'tokens / 请求' },
]

/** 判定句上限（brief §八-3）。 */
export const LEDE_MAX = 20

/** 按码点截断到 N 字（含省略号）。 */
export function clip(text: string, max = LEDE_MAX): string {
  const chars = [...text]
  if (chars.length <= max) return text
  return `${chars.slice(0, max - 1).join('')}…`
}

/** 数字千分位；null → 空串（用于拼接文案）。 */
function plain(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return value.toLocaleString('zh-CN')
}

/** 去掉 INBOX：它是记录流那张表，不是记忆条目。 */
export function memoryEntries(snapshot: SnapshotView | undefined): EntryView[] {
  if (snapshot === undefined) return []
  return snapshot.entries.filter(entry => !entry.id.endsWith('.INBOX'))
}

/** 记录流里还没结的（open / todo）。 */
export function openInboxRows(inbox: InboxView | undefined): InboxView['entries'] {
  if (inbox === undefined) return []
  return inbox.entries.filter(row => row.state === 'open' || row.state === 'todo')
}

/** 待补库：达到阈值的（should-fill）+ 还在观察的（observing）。 */
export function refillRows(misses: MissesView | undefined): MissesView['pipeline'][string] {
  if (misses === undefined) return []
  const pipeline = misses.pipeline ?? {}
  return [...(pipeline['should-fill'] ?? []), ...(pipeline['observing'] ?? [])]
}

/** 一段日期差（天）；算不出返回 null。 */
export function daysSince(date: string, now = new Date()): number | null {
  const parts = date.split('-').map(Number)
  if (parts.length < 3 || parts.some(part => !Number.isFinite(part))) return null
  const at = Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!)
  const diff = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - at
  if (!Number.isFinite(diff)) return null
  return Math.max(0, Math.round(diff / 86_400_000))
}

/** 今天（本地时区）的 yyyy-mm-dd，用于「今天已记」。 */
export function todayKey(now = new Date()): string {
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${mm}-${dd}`
}

/** 全部派生读数。 */
export interface Counts {
  /** 待拍板的推断条数。 */
  queue: number
  /** 记录流里 open/todo 的条数。 */
  flow: number
  /** 待补库条数（含观察中）。 */
  refill: number
  /** 达到补齐阈值的条数。 */
  fillable: number
  /** 观察中（未达阈值）。 */
  observing: number
  /** 记忆条目数（不含 INBOX）。 */
  entries: number
  /** 已确认条数。 */
  confirmed: number
  /** 记录流总条数（含已结）。 */
  inboxTotal: number
  /** 今天记了几条。 */
  capturedToday: number
  /** 每请求 tokens（常驻前缀合计）。 */
  resident: number
  /** 其中置顶注入段。 */
  injected: number
  /** 目录框架（宿主生成，只读）。 */
  frame: number
  /** 技能目录（skill description）。 */
  catalog: number
  /** 超过 80 行的篇数。 */
  overLimit: number
  /** 未命中总数。 */
  misses: number
  /** 置顶条目条数。 */
  pinned: number
  /** 要动手的总件数 = queue + flow + refill。 */
  urgent: number
}

/** 由桥数据算出全部读数（null → 0，只用于计数；展示时再区分「—」）。 */
export function countsOf(input: {
  snapshot?: SnapshotView
  overview?: OverviewView
  inbox?: InboxView
  misses?: MissesView
}): Counts {
  const entries = memoryEntries(input.snapshot)
  const queue = input.snapshot?.queue.length ?? 0
  const flow = openInboxRows(input.inbox).length
  const fillable = input.misses?.counts?.['should-fill'] ?? 0
  const observing = input.misses?.counts?.['observing'] ?? 0
  const today = todayKey()
  const capturedToday = (input.inbox?.entries ?? []).filter(row => row.date === today).length
  const resident = input.overview?.kpi.residentTokens ?? input.overview?.resident.billedTokens ?? 0
  return {
    queue,
    flow,
    refill: fillable + observing,
    fillable,
    observing,
    entries: entries.length,
    confirmed: input.snapshot?.stats.counts.confirmed ?? 0,
    inboxTotal: input.inbox?.entries.length ?? 0,
    capturedToday,
    resident,
    injected: input.overview?.resident.injectedTokens ?? 0,
    frame: input.overview?.resident.frameTokens ?? 0,
    catalog: input.overview?.resident.catalogTokens ?? 0,
    overLimit: input.snapshot?.stats.overLimit ?? 0,
    misses: input.misses?.total ?? 0,
    pinned: entries.filter(entry => entry.pinned).length,
    urgent: queue + flow + fillable + observing,
  }
}

/** 左轨计数：每页一个数，与顶条 T0 同一口径。 */
export function countFor(pane: PaneId, counts: Counts): number {
  if (pane === 'capture') return counts.capturedToday
  if (pane === 'todo') return counts.urgent
  if (pane === 'memory') return counts.entries
  if (pane === 'health') return counts.resident
  return counts.urgent
}

/**
 * 左轨计数的**显示值**：读不到 / 读取中一律「—」。
 *
 * 这里踩过一个真问题：error 态下左轨 5 个计数全渲染成 0，看起来像
 * 「库里一条都没有」——这正是 brief §八-8 禁的「error 冒充 0」。
 * 顶条 T0 做了这件事，左轨也必须做。
 */
export function countDisplay(pane: PaneId, phase: Phase, counts: Counts): number | null {
  if (phase === 'error' || phase === 'loading') return null
  /* 与 figureFor 同一口径：库健康的空态不是 0（框架仍计费），左轨不许与顶条打架。 */
  if (phase === 'empty') return pane === 'health' ? counts.resident : 0
  return countFor(pane, counts)
}

/** 顶条 T0：error / loading 一律「—」（null），empty 才是 0。 */
export function figureFor(pane: PaneId, phase: Phase, counts: Counts): number | null {
  if (phase === 'error' || phase === 'loading') return null
  if (phase === 'empty') {
    /*
     * 空态不是「一律 0」：库健康页的常驻前缀即使没有置顶条目、
     * 没有 skill，目录框架（171）仍然每请求付费。写成 0 会与同屏的
     * 「框架 171」「每请求仍有 171」打架——这正是 brief §八-8 禁的那类谎话。
     */
    return pane === 'health' ? counts.resident : 0
  }
  return countFor(pane, counts)
}

/**
 * 判定句（≤20 字，单行）。
 *
 * 每一条都写死在表里而不是拼自由文本：原型 lint 查的就是字面量长度，
 * 拼出来的句子在数据极端时会超长，那时顶条会折行、把 72px 的顶条撑成 96px。
 */
export function ledeFor(pane: PaneId, phase: Phase, counts: Counts): string {
  if (phase === 'error') return '读不到数据，先重试'
  if (phase === 'loading') return '正在读取这一页'
  if (phase === 'empty') {
    if (pane === 'today') return '现在没有压着的事'
    if (pane === 'capture') return '今天还没记任何一条'
    if (pane === 'todo') return '三段都空了'
    if (pane === 'memory') return '这条筛选下没有条目'
    return '没有任何常驻内容'
  }
  if (pane === 'today') {
    return clip(counts.queue > 0
      ? `${plain(counts.urgent)} 件要动手，先拍这 ${plain(counts.queue)} 条`
      : `${plain(counts.urgent)} 件要动手，先看最上面那件`)
  }
  if (pane === 'capture') return '写一条，落进个人 INBOX'
  if (pane === 'todo') {
    return clip(counts.queue > 0
      ? `${plain(counts.urgent)} 件压着，先清待拍板`
      : `${plain(counts.urgent)} 件压着，先看流转中`)
  }
  if (pane === 'memory') return clip(`${plain(counts.entries)} 条里 ${plain(counts.confirmed)} 条已确认`)
  return clip(counts.injected > 0
    ? `${plain(counts.resident)} 里你能关的只有 ${plain(counts.injected)}`
    : `${plain(counts.resident)} 全是宿主注入的`)
}

/** 上带（每请求都在）的一句话。 */
export function bandNoteFor(pane: PaneId, phase: Phase, counts: Counts): string {
  if (phase === 'error') return '读不到：这一带的数字显示为 —'
  if (phase === 'loading') return '读取中'
  if (phase === 'empty') {
    /*
     * 空库也要说真话：库空了，但目录框架（171）与 skill description
     * 仍按请求付费。写成「没有每请求成本」会与同一行右侧的 652 打架。
     */
    return counts.resident === 0
      ? '0 条置顶 · 没有每请求成本'
      : clip(`0 条置顶 · 每请求仍有 ${plain(counts.resident)}（框架与技能不可关）`, 56)
  }
  if (pane === 'health') {
    return clip(
      `${plain(counts.resident)} = 框架 ${plain(counts.frame)} + 技能 ${plain(counts.catalog)} + 置顶 ${plain(counts.injected)}`,
      56,
    )
  }
  return clip(
    `置顶 ${plain(counts.pinned)} 条 · 全部注入 · 段预算 256 已用 ${plain(counts.injected)}`,
    56,
  )
}

/** 上带的数字：error / loading → null。 */
export function bandFigureFor(phase: Phase, counts: Counts): number | null {
  if (phase === 'error' || phase === 'loading') return null
  return counts.resident
}

/* ============================================================
 * 今天：线索（按该动手的顺序，≤6 条）
 * ============================================================ */

/** 线索的主动作：检视栏底部那颗墨块调用它。 */
export type ClueAction = 'goto-todo' | 'goto-memory' | 'goto-health' | 'draft-miss'

/** 一条线索。 */
export interface Clue {
  id: string
  title: string
  meta: string
  /** 归属列（拍板 / 补库 / 维护 / 成本 / 流转）。 */
  group: string
  num: number | null
  state: string
  tone: ToneName
  action: ClueAction
  actionLabel: string
  detail: string
  /**
   * 主动作跳过去时应该选中哪一行（选择键跟着目标页的命名走）。
   *
   * 早先按 `counts.queue > 0` 拼 `q:${clue.path}`，但只有拍板线索有 path，
   * 「去流转」会拼出 `q:` 这种空键，落点直接塌成「选一条待办」。
   */
  gotoKey?: string
  /** 补库线索的目标 query。 */
  query?: string
}

/** 生成今天的线索。空数组表示「现在没有压着的事」。 */
export function cluesOf(input: {
  snapshot?: SnapshotView
  overview?: OverviewView
  inbox?: InboxView
  misses?: MissesView
}, now = new Date()): Clue[] {
  const counts = countsOf(input)
  const clues: Clue[] = []
  const firstFlow = openInboxRows(input.inbox)[0]
  if (counts.queue > 0) {
    const first = input.snapshot?.queue[0]
    const days = first?.days ?? null
    clues.push({
      id: 'clue-decide',
      title: `${plain(counts.queue)} 条推断等你拍板`,
      meta: `最早一条：${clip(first?.title ?? '', 18)} · 等 ${plain(days)} 天`,
      group: '拍板',
      num: counts.queue,
      state: '待拍板',
      tone: 'warn',
      action: 'goto-todo',
      actionLabel: '去拍板',
      detail: '采纳后进入检索与置顶通道；驳回落档 30 天静默。系统自动升级最多到「观察到」，不会替你确认。',
      gotoKey: first?.path === undefined ? undefined : `q:${first.path}`,
    })
  }
  if (counts.fillable > 0) {
    const target = (input.misses?.pipeline['should-fill'] ?? [])[0]
    clues.push({
      id: 'clue-fill',
      title: `${plain(counts.fillable)} 个问题问过多次却没答案`,
      meta: target === undefined ? '已过补齐阈值' : `第一次问：${clip(target.query, 20)}`,
      group: '补库',
      num: counts.fillable,
      state: '缺这口',
      tone: 'warn',
      action: 'draft-miss',
      actionLabel: '写草稿',
      detail: '草稿只进 INBOX，落档仍需你确认。写完后 7 天内有命中才算验证通过。',
      gotoKey: target === undefined ? undefined : `m:${target.query}`,
      query: target?.query,
    })
  } else if (counts.observing > 0) {
    const target = (input.misses?.pipeline['observing'] ?? [])[0]
    clues.push({
      id: 'clue-observe',
      title: `${plain(counts.observing)} 个问题只被问过一两次`,
      meta: `满 ${plain(input.misses?.fillThreshold ?? 3)} 次才建议补库`,
      group: '补库',
      num: counts.observing,
      state: '观察中',
      tone: 'idle',
      action: 'goto-todo',
      actionLabel: '看明细',
      detail: '现在补也行，但一次性的问题不值得占用一条记忆。达阈值后这里会变成「缺这口」。',
      gotoKey: target === undefined ? undefined : `m:${target.query}`,
    })
  }
  if (counts.overLimit > 0) {
    clues.push({
      id: 'clue-compact',
      title: `${plain(counts.overLimit)} 篇超过 80 行`,
      meta: '降到 80 行以内才能被一次读完',
      group: '维护',
      num: counts.overLimit,
      state: '可整理',
      tone: 'idle',
      action: 'goto-memory',
      actionLabel: '看清单',
      detail: '无损压缩（空行、重复标题）由「库健康 · 变短」执行；剩下的需要你手动摘要或拆文件。',
    })
  }
  clues.push({
    id: 'clue-cost',
    title: `每请求 ${plain(counts.resident)} tokens，${plain(counts.injected)} 你能关`,
    meta: `框架 ${plain(counts.frame)} 由宿主生成 · 技能 ${plain(counts.catalog)}`,
    group: '成本',
    num: counts.resident,
    state: '可降',
    tone: 'idle',
    action: 'goto-health',
    actionLabel: '看构成',
    detail: '框架与工具 schema 你动不了；置顶条目逐条可关。关掉一条就是每个请求都少付一次。',
    gotoKey: 'b:injected',
  })
  if (counts.flow > 0) {
    clues.push({
      id: 'clue-flow',
      title: `${plain(counts.flow)} 条记了还没结`,
      meta: '开着的条目超过 7 天会降权，但不会被删',
      group: '流转',
      num: counts.flow,
      state: '流转中',
      tone: 'idle',
      action: 'goto-todo',
      actionLabel: '去流转',
      detail: '做完标完成，不做就丢掉。留在 INBOX 里会让「待办」这个数失去意义。',
      gotoKey: firstFlow === undefined ? undefined : `i:${firstFlow.lineIndex}`,
    })
  }
  void now
  return clues.slice(0, 6)
}

/* ============================================================
 * 待办：三段
 * ============================================================ */

/** 待办一行的来源类型：拍板 / 流转 / 补库。 */
export type TodoKind = 'decide' | 'flow' | 'refill'

/** 待办行（含动作所需的键）。 */
export interface TodoRow {
  /** 选择键：`q:<path>`、`i:<lineIndex>`、`m:<query>`。 */
  key: string
  kind: TodoKind
  title: string
  meta: string
  group: string
  num: number | null
  state: string
  tone: ToneName
  /** 拍板项：条目路径（confirm 要的是 path，不是点分 id）。 */
  path?: string
  /** 流转项：INBOX 行号。 */
  lineIndex?: number
  /** 补库项：query。 */
  query?: string
  /** 补库项：是否达到阈值。 */
  fillable?: boolean
}

/** 一段待办。 */
export interface TodoSection {
  id: TodoKind
  title: string
  note: string
  rows: TodoRow[]
  emptyText: string
}

/** 生成待办三段（顺序 = 人的动作在前，机器建议在后）。 */
export function todoSectionsOf(input: {
  snapshot?: SnapshotView
  inbox?: InboxView
  misses?: MissesView
}, now = new Date()): TodoSection[] {
  const queue = input.snapshot?.queue ?? []
  const decide: TodoRow[] = queue.map((item: QueueItem) => ({
    key: `q:${item.path}`,
    kind: 'decide',
    title: item.title,
    meta: `${item.reason} · ${item.domainLabel} · 等 ${plain(item.days)} 天`,
    group: '拍板',
    num: item.days,
    state: '待拍板',
    tone: 'warn',
    path: item.path,
  }))

  const flow: TodoRow[] = openInboxRows(input.inbox).map(row => ({
    key: `i:${row.lineIndex}`,
    kind: 'flow',
    title: row.content,
    meta: `${row.kind} · 记于 ${row.date}`,
    group: '流转',
    num: daysSince(row.date, now),
    state: row.state === 'open' ? '开着' : '流转中',
    tone: 'idle',
    lineIndex: row.lineIndex,
  }))

  const misses = input.misses
  const shouldFill = misses?.pipeline['should-fill'] ?? []
  const observing = misses?.pipeline['observing'] ?? []
  const refill: TodoRow[] = [...shouldFill, ...observing].map(item => ({
    key: `m:${item.query}`,
    kind: 'refill',
    title: item.query,
    meta: `${plain(item.count)} 次 · ${plain(item.sessions)} 个会话 · 最近 ${item.lastAt.slice(0, 10)}`,
    group: '补库',
    num: item.count,
    state: (item.state === 'should-fill' || item.state === 'observing') && item.hits >= (misses?.fillThreshold ?? 3)
      ? '缺这口'
      : '观察中',
    tone: item.hits >= (misses?.fillThreshold ?? 3) ? 'warn' : 'idle',
    query: item.query,
    fillable: item.hits >= (misses?.fillThreshold ?? 3),
  }))

  return [
    {
      id: 'decide',
      title: '待拍板',
      note: `${decide.length} 条 · 只有人能定 · 右列等几天`,
      rows: decide,
      emptyText: '没有待拍板的推断：库里没有被自动提取、等你点头的条目。',
    },
    {
      id: 'flow',
      title: '流转中',
      note: `${flow.length} 条 · 超过 7 天会降权 · 右列等几天`,
      rows: flow,
      emptyText: '记录流里没有开着的条目。记了又没结的事会堆在这里。',
    },
    {
      id: 'refill',
      title: '待补库',
      note: `${refill.length} 条 · 缺的比多的更值得看 · 右列问过几次`,
      rows: refill,
      emptyText: `没有该补的：被问过的 ${plain(misses?.total ?? 0)} 个问题都没到补齐线（同一个问题问满 ${plain(misses?.fillThreshold ?? 3)} 次）。`,
    },
  ]
}

/* ============================================================
 * 记忆：内容面 / 成本面
 * ============================================================ */

/** 记忆页一面。 */
export type Face = 'content' | 'cost'

/** 记忆一行的选择键就是条目 id。 */
export interface MemoryRow {
  id: string
  title: string
  meta: string
  group: string
  num: number | null
  state: string
  tone: ToneName
}

/** 把长路径压成 3–12 字的归属（路径本身只出现在检视栏）。 */
export function memoryGroup(entry: EntryView): string {
  return entry.domainLabel || entry.domain || '未归类'
}

/** 状态 → 语气（与 core 的状态机一致）。 */
export function statusToneOf(status: string): ToneName {
  if (status === 'confirmed' || status === 'active') return 'ok'
  if (status === 'rejected') return 'err'
  if (status === 'hypothesis' || status === 'observed' || status === 'stale') return 'warn'
  return 'idle'
}

/** 状态中文名（界面只出现中文，`observed` 不下到界面）。 */
export function statusLabelOf(status: string): string {
  switch (status) {
    case 'hypothesis': return '候选'
    case 'observed': return '观察到'
    case 'reinforced': return '已强化'
    case 'confirmed': return '已确认'
    case 'rejected': return '已驳回'
    case 'stale': return '待复核'
    case 'archived': return '已归档'
    case 'active': return '有效'
    default: return status
  }
}

/** 锚点状态 → 中文。 */
export function anchorLabelOf(state: string | undefined): string {
  if (state === 'fresh') return '有效'
  if (state === 'stale') return '该复核'
  if (state === 'missing') return '失效'
  if (state === 'unverifiable') return '无法核对'
  return '无锚点'
}

/** 生成记忆行：内容面按库内顺序，成本面按体积降序。 */
export function memoryRowsOf(snapshot: SnapshotView | undefined, face: Face, query: string): MemoryRow[] {
  const keyword = query.trim().toLowerCase()
  let entries = memoryEntries(snapshot)
  if (keyword !== '') {
    entries = entries.filter(entry => `${entry.title} ${entry.path} ${entry.domain}`.toLowerCase().includes(keyword))
  }
  if (face === 'cost') {
    entries = [...entries].sort((a, b) => b.tokens - a.tokens)
  }
  return entries.map(entry => ({
    id: entry.id,
    title: entry.title,
    meta: face === 'cost'
      ? `按需读取，未命中不付费 · ${plain(entry.lines)} 行`
      /* 锚点状态不在 snapshot 里（只有 detail 带 anchorState）：
         这里只敢说「有没有标注」，具体状态交给检视栏。 */
      : `锚点 ${entry.anchor === null ? '无' : '已标注'} · 证据 ${plain(entry.evidence.length)} 条`,
    group: memoryGroup(entry),
    num: face === 'cost' ? entry.tokens : entry.citeCount,
    state: face === 'cost' ? '按需' : statusLabelOf(entry.status),
    tone: face === 'cost' ? 'idle' : statusToneOf(entry.status),
  }))
}

/* ============================================================
 * 库健康：四桶 + 版本
 * ============================================================ */

/** 桶内一层条目。 */
export interface BucketItem {
  id: string
  name: string
  tokens: number | null
  source: string
  /** 是否已进系统提示词（置顶条目才会是 true）。 */
  injected: boolean
  /** 是否可编辑（写回正文）。 */
  editable: boolean
}

/** 四桶之一。 */
export interface Bucket {
  id: 'catalog' | 'frame' | 'injected' | 'toolschema' | 'version'
  name: string
  en: string
  tokens: number | null
  state: 'ok' | 'empty' | 'error'
  note: string
  items: BucketItem[]
  readonly?: string
}

/**
 * 置顶条目逐条成本估算。
 *
 * 与 `core/pinned.ts` 的渲染格式同口径（每条 `- [id] 标题`），
 * 但合计行仍用宿主 / core 返回的真实 `injectedTokens`：
 * 估算只回答「哪条占了多少」，不参与「合计 = 四桶之和」的对账。
 */
export function pinnedItemTokens(id: string, title: string): number {
  return estimateTokens(`- [${id}] ${title}`)
}

/** 生成四桶（含置顶逐条）。 */
export function bucketsOf(input: {
  snapshot?: SnapshotView
  overview?: OverviewView
}): Bucket[] {
  const resident = input.overview?.resident
  const entries = memoryEntries(input.snapshot)
  const pinned = entries.filter(entry => entry.pinned)
  const catalogItems = (resident?.items ?? []).filter(item => item.kind === 'catalog')
  const injectedTokens = resident?.injectedTokens ?? 0
  const catalogTokens = resident?.catalogTokens ?? 0
  const frameTokens = resident?.frameTokens ?? 0

  return [
    {
      id: 'catalog',
      name: '技能目录',
      en: 'catalog',
      tokens: catalogTokens,
      state: catalogItems.length === 0 ? 'empty' : 'ok',
      note: catalogItems.length === 0
        ? (resident?.error !== '' && resident?.error !== undefined
          ? resident.error
          : '宿主读到 0 个带 description 的 skill：0 条成本，不是「读不到」')
        : `${catalogItems.length} 个 skill 的 description，每请求都付`,
      items: catalogItems.map(item => ({
        id: item.id,
        name: item.title,
        tokens: item.tokens,
        source: 'skill description',
        injected: false,
        editable: false,
      })),
    },
    {
      id: 'frame',
      name: '目录框架',
      en: 'frame',
      tokens: frameTokens,
      state: 'ok',
      note: '宿主生成，插件无权改；只读',
      readonly: '宿主生成，插件无权改',
      items: [{
        id: 'frame.available-skills',
        name: '<available_skills> 目录框架',
        tokens: frameTokens,
        source: '宿主内置',
        injected: false,
        editable: false,
      }],
    },
    {
      id: 'injected',
      name: '置顶条目',
      en: 'injected',
      tokens: injectedTokens,
      state: injectedTokens === 0 ? 'empty' : 'ok',
      note: pinned.length === 0
        ? '没有 pinned: true 的条目：这一段当前 0 tokens'
        : `${pinned.length} 条 · 逐条估算 · 合计 ${plain(injectedTokens)} · 段预算 256`,
      items: pinned.map(entry => ({
        id: entry.id,
        name: entry.title,
        tokens: pinnedItemTokens(entry.id, entry.title),
        source: entry.path,
        injected: true,
        editable: true,
      })),
    },
    {
      id: 'toolschema',
      name: '工具 schema',
      en: 'toolschema',
      tokens: null,
      state: 'error',
      note: '本插件读不到宿主的工具 schema：合计不含这一段，也不按 0 计算',
      items: [],
    },
  ]
}

/**
 * 插件版本。
 *
 * 写死一个常量而不是构建期 define 注入：常量能被测试盯住
 * （断言它与 package.json 的 version 一致），注入只能靠「脚本记得改」保证。
 * 有一个会失败的断言，比有一个可能忘记改的注入强。
 */
export const PLUGIN_VERSION = '0.1.0'

/** 版本五项（能拿到的给值，拿不到的给「—」+ 原因）。 */
export interface VersionInfo {
  version: string
  source: string
  install: string
  commit: string
  target: string
  /** 宿主有没有暴露版本服务；false 时不给「检查更新」按钮。 */
  checkable: boolean
  reason: string
}

/** 构造版本信息。 */
export function versionInfoOf(pluginVersion: string): VersionInfo {
  return {
    version: pluginVersion === '' ? '—' : pluginVersion,
    source: 'memory-ops-dsh',
    install: '—',
    commit: '—',
    target: '宿主不列出版本',
    checkable: false,
    reason: '宿主没有暴露版本服务（插件拿不到 registry 版本与提交差异），所以这里不给「可更新到 X」这种数字。',
  }
}

/** 状态条右侧文案：库根 + 条目数 + 口径提醒。读不到时不给 0。 */
export function statusRightOf(input: {
  snapshot?: SnapshotView
  overview?: OverviewView
  phase?: Phase
}): string {
  const root = input.snapshot?.root ?? '—'
  if (input.phase === 'error' || input.phase === 'loading' || input.snapshot === undefined) {
    return `${root} · 记忆条数 — · 记录流另计`
  }
  const counts = countsOf({ snapshot: input.snapshot, overview: input.overview })
  return `${root} · ${plain(counts.entries)} 条记忆 · 记录流另计`
}