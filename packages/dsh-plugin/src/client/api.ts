/**
 * 与 host 半体的通信 —— 客户端唯一的 IO 入口。
 *
 * 为什么不用 ctx.remote：那是宿主自有服务的类型化命名空间，
 * 第三方插件不该把自己塞进去。改用宿主提供的同源 HTTP 桥
 * （`/api/dsh-memory-ops/*`），与 dsh-free-search 的做法一致：
 * 同源、回环、可独立诊断。
 */

const PREFIX = '/api/dsh-memory-ops'

/** 桥调用失败。 */
export class BridgeError extends Error {
  override readonly name = 'BridgeError'
  constructor(message: string, readonly route: string) {
    super(message)
  }
}

/** 调一次能力。 */
export async function call<T>(route: string, body: Record<string, unknown> = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${PREFIX}/${route}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (error) {
    throw new BridgeError(
      `无法连接记忆库宿主（${route}）：${error instanceof Error ? error.message : String(error)}`,
      route,
    )
  }
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new BridgeError(`宿主返回了非 JSON 响应（${route}，HTTP ${response.status}）`, route)
  }
  const record = payload as { ok?: boolean; error?: string }
  if (record?.ok === false) {
    throw new BridgeError(record.error ?? '未知错误', route)
  }
  if (!response.ok) {
    throw new BridgeError(`HTTP ${response.status}`, route)
  }
  return payload as T
}

/** 数据形状：与 core 的 actions 返回值一一对应。 */
export interface EntryView {
  id: string
  path: string
  title: string
  domain: string
  domainLabel: string
  project: string | null
  layer: string
  status: string
  confidence: number | null
  kind: string
  tags: string[]
  tokens: number
  bytes: number
  lines: number
  overLineLimit: boolean
  pinned: boolean
  updatedAt: string
  origin: string
  evidence: { session?: string; excerpt?: string; gate?: string }[]
  anchor: Record<string, string> | null
  expiry: { level: string; days: number | null }
  /** 被 cite 的次数（真正被用上的次数，不含 recall）。 */
  citeCount: number
}

export interface QueueItem {
  id: string
  path: string
  title: string
  domain: string
  domainLabel: string
  status: string
  confidence: number | null
  kind: 'confirm' | 'retire' | 'anchor'
  evidence: { session?: string; excerpt?: string; gate?: string }[]
  origin: string
  days: number | null
  reason: string
}

export interface StatsView {
  files: number
  bytes: number
  tokens: number
  overLimit: number
  domains: { key: string; label: string; files: number; bytes: number; tokens: number; overLimit: number }[]
  layers: Record<'l0' | 'l1' | 'l2', { files: number; tokens: number }>
  rates: { hitRate: number | null; confirmRate: number | null; expireRate: number | null; missRate: number | null }
  misses: { total: number; verified: number }
  counts: { pending: number; confirmed: number; rejected: number; stale: number; archived: number }
}

/**
 * cwd → 项目的解析结果。
 *
 * 它为 `null` 表示调用方没给 cwd（不是解析失败）。
 * 给了 cwd 却没认出来时，`project` 为 null 且 `reason` 非空 ——
 * 界面必须能说出「凭什么」和「为什么没认出来」，否则只能显示假空态。
 */
export interface ProjectResolutionView {
  project: string | null
  matchedAlias: string | null
  matchedBy: 'name' | 'alias' | 'prefix' | null
  cwd: string | null
  knownProjects: string[]
  reason: string
}

export interface SnapshotView {
  root: string
  /** 统计口径：all=全库，scoped=仅当前 project/domain。 */
  statsScope: 'all' | 'scoped'
  /** 当前项目自己的 layer: l0 索引文件。 */
  projectIndex: { path: string; title: string; tokens: number }[]
  /** 项目解析诊断；只给 cwd 时才有，显式传 project 时为 null。 */
  resolution: ProjectResolutionView | null
  /** 库里有记忆的项目全集（未解析出来时用于提示）。 */
  knownProjects: string[]
  projectScoped: boolean
  project: string | null
  domain: string | null
  entries: EntryView[]
  stats: StatsView
  queue: QueueItem[]
  generatedAt: string
}

export interface InboxRowView {
  date: string
  kind: string
  content: string
  state: string
  destination: string
  kindValid: boolean
  stateValid: boolean
  lineIndex: number
  index: number
}

export interface InboxView {
  path: string
  exists: boolean
  entries: InboxRowView[]
  throughput: {
    total: number; open: number; todo: number; done: number; dropped: number
    toPromote: number; invalidKind: number; invalidState: number
  }
  kinds: string[]
  states: string[]
}

/** 常驻前缀的一项（skill description 或 l0 索引文件）。 */
export interface ResidentItem {
  kind: 'catalog' | 'index'
  id: string
  path: string
  title: string
  tokens: number
  bytes: number
  lines: number
  overLineLimit: boolean
  /** 是否每请求付费。 */
  billed: boolean
  note: string
}

/** 常驻前缀拆解。 */
export interface ResidentBreakdown {
  items: ResidentItem[]
  catalogTokens: number
  indexTokens: number
  frameTokens: number
  billedTokens: number
  onDemandTokens: number
  /**
   * 三态：ok=有 catalog；empty=读到了但没有；error=没读到。
   * 不区分的话「读不到」会伪装成「没有」，用户会以为 171 就是全部。
   */
  state: 'ok' | 'empty' | 'error'
  error: string
}

/** 预算账本的一行。 */
export interface BudgetRowView {
  layer: string
  name: string
  tokens: number
  files: number
  limit: number | null
  /** 付费方式：per-request = 每请求付费；on-demand = 按需加载。 */
  billing: 'per-request' | 'on-demand'
  note: string
  advice: string
}

/** 域统计里的单篇。 */
export interface DomainEntryView {
  id: string
  path: string
  title: string
  layer: string
  status: string
  tokens: number
  lines: number
  overLineLimit: boolean
  citeCount: number
}

/** 域统计（带明细）。 */
export interface DomainView {
  key: string
  label: string
  files: number
  bytes: number
  tokens: number
  overLimit: number
  entries: DomainEntryView[]
}

export interface OverviewView {
  kpi: {
    /** 每请求付费的常驻前缀（catalog + 框架），**不是**索引层体积。 */
    residentTokens: number
    /** 索引层体积（所有 layer: l0 文件之和），按需加载。 */
    indexTokens: number
    residentBudget: number
    hitRate: number | null
    confirmRate: number | null
    expireRate: number | null
    pending: number
  }
  resident: ResidentBreakdown
  budget: BudgetRowView[]
  domains: DomainView[]
  rates: StatsView['rates']
  counts: StatsView['counts']
  misses: StatsView['misses']
  files: number
  bytes: number
  tokens: number
  overLimit: number
  cacheNote: string
}

export interface HitView {
  id: string
  path: string
  title: string
  domain: string
  domainLabel: string
  layer: string
  status: string
  confidence: number | null
  tokens: number
  snippet: string
  score: number
}

export interface SearchView {
  query: string
  matched: boolean
  hits: HitView[]
  total: number
  cost: number
}

export interface MissItemView {
  query: string
  count: number
  at: string
  lastAt: string
  state: string
  drafts: string[]
  wastedTokens: number
  /** 出现过的会话数（比 count 更能说明是不是共性问题）。 */
  sessions: number
  /** 验证期内已命中次数（满 3 次转「已验证生效」）。 */
  hits: number
  /** 验证期剩余天数；不在验证期时为 null。 */
  remainingDays: number | null
  /** 草稿落库路径（验证期内可点开）。 */
  draftPath: string | null
}

export interface MissesView {
  pipeline: Record<string, MissItemView[]>
  /** 五态各自条数，供顶部计数条直接消费。 */
  counts: Record<'observing' | 'should-fill' | 'drafting' | 'verifying' | 'verified', number>
  total: number
  conversion: number | null
  verifyDays: number
  /** 问过几次算「该补了」。 */
  fillThreshold: number
}

export interface DetailView {
  entry: EntryView & { body: string; overTokenLimit: boolean }
  trust: {
    confidence: number | null
    evidenceCount: number
    citeCount: number
    recallCount: number
    lastCitedAt: string | null
    anchor: Record<string, string> | null
    anchorState: string
  }
  references: { at: string; kind: string; query?: string }[]
  states: string[]
  sections: { title: string; level: number; lines: number }[]
}

export interface SessionMemoryView {
  sessionId: string | null
  /** 解析后的项目（只给 cwd 时由 core 判定）。 */
  project: string | null
  resolution: ProjectResolutionView | null
  injected: number
  /** 本会话发生过的 recall 次数（`injected` 是命中条目数，两者不同）。 */
  recalled: number
  cited: number
  missed: number
  reasons: {
    id: string
    title: string
    why: string
    anchor: Record<string, string> | null
    /** 锚点当前状态：fresh / stale / none（用于显示 hash 对比与失效提示）。 */
    anchorState: string
    tokens: number
    /** 这条原因来自哪次检索（ISO 时间；无事件时为 ''）。 */
    at: string
  }[]
  recentInjected: { at: string; session?: string; ids?: string[]; query?: string }[]
  recentCites: { at: string; session?: string; ids?: string[]; query?: string }[]
  recentMisses: { at: string; query?: string }[]
}

export interface CaptureResult {
  ok: boolean
  blocked?: boolean
  reason?: string
  masked?: string
  hint?: string
  captured?: { path: string }
  error?: string
}

// ============================================================
// 维护作业（按需触发，无常驻定时器）
// ============================================================

/** 锚点校验结论。 */
export type AnchorState = 'fresh' | 'stale' | 'missing' | 'unverifiable'

export interface AnchorCheckView {
  id: string
  path: string
  title: string
  anchorPath: string
  symbol: string
  recordedHash: string
  actualHash: string
  state: AnchorState
  reason: string
}

export interface AnchorReportView {
  checks: AnchorCheckView[]
  summary: Record<AnchorState, number>
  withoutAnchor: number
  baseDir: string
  applied: boolean
  changed: { path: string; from: string; to: string }[]
  failed: { path: string; error?: string }[]
}

export interface CompactCandidateView {
  path: string
  title: string
  before: number
  after: number
  removed: number
  changes: string[]
  stillOverLimit: boolean
  splitSuggestions: { heading: string; lines: number }[]
}

export interface CompactView {
  candidates: CompactCandidateView[]
  total: number
  removableLines: number
  applied: boolean
  written: { path: string; removed: number }[]
  failed: { path: string; error?: string }[]
  lineLimit: number
}

export interface ReviewItemView {
  kind: string
  title: string
  detail: string
  path?: string
}

export interface ReviewView {
  window: { days: number; from: string; to: string }
  events: Record<string, number>
  counts: {
    touched: number; pending: number; stale: number; overLimit: number; misses: number
  }
  topMisses: { query: string; count: number }[]
  todo: ReviewItemView[]
}

export interface PromotePlanView {
  id: string
  path: string
  title: string
  from: string
  to: string
  sessions: string[]
  reason: string
}

export interface PromoteView {
  plans: PromotePlanView[]
  applied: boolean
  changed: { path: string; from: string; to: string }[]
  failed: { path: string; error?: string }[]
  minSessions: number
}

/** 一次 frontmatter 修补计划。 */
export interface RepairFixView {
  path: string
  title: string
  /** 有没有 frontmatter 段。 */
  hadFrontmatter: boolean
  /** 会被写入的字段（只含缺失或非法的）。 */
  patch: Record<string, string>
  /** 每个字段为什么被补。 */
  reasons: string[]
  /** 需要覆盖已有值的字段（只有脏 status 这类）。 */
  overwrite: string[]
}

export interface RepairView {
  fixes: RepairFixView[]
  healthy: number
  total: number
  applied: boolean
  written: { path: string; fields: string[] }[]
  failed: { path: string; error?: string }[]
}
