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

export interface SnapshotView {
  root: string
  /** 统计口径：all=全库，scoped=仅当前 project/domain。 */
  statsScope: 'all' | 'scoped'
  /** 当前项目自己的 layer: l0 索引文件。 */
  projectIndex: { path: string; title: string; tokens: number }[]
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
}

export interface OverviewView {
  kpi: {
    residentTokens: number
    residentBudget: number
    hitRate: number | null
    confirmRate: number | null
    expireRate: number | null
    pending: number
  }
  resident: ResidentBreakdown
  budget: { layer: string; name: string; tokens: number; files: number; limit: number | null }[]
  domains: StatsView['domains']
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
}

export interface MissesView {
  pipeline: Record<string, MissItemView[]>
  total: number
  conversion: number | null
  verifyDays: number
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
  injected: number
  cited: number
  missed: number
  reasons: { id: string; title: string; why: string; anchor: Record<string, string> | null; tokens: number }[]
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
