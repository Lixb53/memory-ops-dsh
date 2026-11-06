/**
 * 真相源读写层 —— `~/.memory-ops/` 是唯一数据源。
 *
 * 三条硬约束（照 product.md §七 数据契约）：
 *   1. **原子写**：tmp + rename，避免 agent 与 UI 同时写出现半行。
 *   2. **文件锁**：跨进程用 `<file>.lock` 的 O_EXCL 独占，写前获取、写后释放。
 *   3. **只追加**：events.jsonl 是 append-only 事件流；条目本身可改，但历史不改。
 *
 * 为什么不用数据库：Markdown 真相源是可读、可 git、可手改的。单条一文件或
 * sqlite 会让「人可审」变成「人要装工具才能审」。
 */

import fs from 'node:fs'
import type { Dirent } from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  INBOX_KINDS, INBOX_STATES, FILE_LINE_LIMIT, estimateTokens, expiryOf, orEmpty,
  type Expiry,
} from './schema.ts'
import {
  INBOX_HEADER, parseFrontmatter, serializeFrontmatter, splitFrontmatter,
  parseInbox, serializeInboxRow, parseInboxRow,
  type Frontmatter, type InboxRow,
} from './parse.ts'

/** 默认根目录：与 ~/.dsh 同级，不在 .dsh 内部。 */
export function defaultRoot(): string {
  const configured = process.env.MEMORY_OPS_ROOT
  if (typeof configured === 'string' && configured.trim() !== '') return configured.trim()
  return path.join(os.homedir(), '.memory-ops')
}

/** 状态目录（运行时数据，git 忽略）。 */
const STATE_DIR = '.state'

/** 归档目录。 */
const ARCHIVE_DIR = 'archive'

/** 不参与记忆条目的文件。 */
const SKIP_NAMES = new Set(['.DS_Store', '.gitignore', 'README.md'])

/** 一条记忆的完整快照。 */
export interface MemoryEntry {
  path: string
  id: string
  domain: string
  domainLabel: string
  project: string | null
  title: string
  kind: string
  scope: string
  layer: string
  status: string
  confidence: number | null
  pinned: boolean
  updatedAt: string
  createdAt: string
  lastCitedAt?: string
  refutedAt?: string
  tags: string[]
  evidence: Record<string, string>[]
  anchor: Record<string, string> | null
  supersededBy: string
  refutedReason: string
  origin: string
  bytes: number
  tokens: number
  lines: number
  overLineLimit: boolean
  frontmatter: Frontmatter
  body: string
  source: string
  mtime: number
}

/** 一条事件（append-only）。 */
export interface MemoryEvent {
  at: string
  session?: string
  kind: string
  ids?: string[]
  query?: string
}

/** 一条未命中记录。 */
export interface MissRecord {
  at: string
  lastAt?: string
  session: string
  query: string
  hits: number
  count?: number
  state?: string
  stateAt?: string
  scope?: string
  drafts?: string[]
}

/** 一条记忆的身份：优先 frontmatter.id，否则由路径派生。 */
export function identityOf(relPath: string, frontmatter?: Frontmatter): string {
  const declared = frontmatter?.id
  if (typeof declared === 'string' && declared.trim() !== '') return declared.trim()
  return relPath.replace(/\.md$/i, '').replace(/\//g, '.')
}

/** 域的展示名。 */
export function domainLabelOf(relPath: string): string {
  const parts = relPath.split('/')
  if (parts[0] === 'personal') return '个人域'
  if (parts[0] === 'work' && parts[1] !== undefined) return `工作域 · ${parts[1]}`
  return parts[0] ?? '未知域'
}

/** 域键：personal 或 work/<project>。 */
export function domainKeyOf(relPath: string): string {
  const parts = relPath.split('/')
  if (parts[0] === 'personal') return 'personal'
  if (parts[0] === 'work' && parts[1] !== undefined) return `work/${parts[1]}`
  return parts[0] ?? 'unknown'
}

/** 项目名（用于「仅本项目」视图）。 */
export function projectOf(relPath: string): string | null {
  const parts = relPath.split('/')
  return parts[0] === 'work' && parts[1] !== undefined ? parts[1] : null
}

/** 相对路径安全校验：拒绝绝对路径与 `..` 穿越。 */
export function safeRelPath(input: unknown): string {
  const value = String(input ?? '').replace(/\\/g, '/').trim()
  if (value === '') throw new Error('路径不能为空')
  if (value.startsWith('/')) throw new Error('不接受绝对路径')
  if (value.split('/').includes('..')) throw new Error('不接受上级目录穿越')
  return value.replace(/^\.\//, '')
}

/** 原子写：同目录 tmp + rename。 */
async function atomicWrite(target: string, content: string): Promise<void> {
  const dir = path.dirname(target)
  await fsp.mkdir(dir, { recursive: true })
  const tmp = path.join(dir, `.${path.basename(target)}.${process.pid}.${Date.now()}.tmp`)
  await fsp.writeFile(tmp, content, 'utf8')
  await fsp.rename(tmp, target)
}

/** 独占锁：O_EXCL 创建 `<file>.lock`，超时视为陈旧并回收。 */
async function withLock<T>(target: string, run: () => Promise<T>, { timeoutMs = 3000 } = {}): Promise<T> {
  const lockPath = `${target}.lock`
  await fsp.mkdir(path.dirname(lockPath), { recursive: true })
  const started = Date.now()
  let handle: fsp.FileHandle | null = null
  while (handle === null) {
    try {
      handle = await fsp.open(lockPath, 'wx')
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'EEXIST') throw error
      try {
        const stat = await fsp.stat(lockPath)
        if (Date.now() - stat.mtimeMs > timeoutMs) {
          await fsp.unlink(lockPath).catch(() => {})
          continue
        }
      } catch { /* 锁刚被释放 */ }
      if (Date.now() - started > timeoutMs) throw new Error(`写锁超时：${lockPath}`)
      await new Promise(resolve => setTimeout(resolve, 25))
    }
  }
  try {
    await handle.writeFile(String(process.pid))
    return await run()
  } finally {
    await handle.close().catch(() => {})
    await fsp.unlink(lockPath).catch(() => {})
  }
}

/** 递归列出 markdown 文件（跳过隐藏目录、.state、archive、node_modules）。 */
async function listMarkdown(root: string, relative = ''): Promise<string[]> {
  const absolute = path.join(root, relative)
  let entries: Dirent[]
  try {
    entries = await fsp.readdir(absolute, { withFileTypes: true }) as Dirent[]
  } catch {
    return []
  }
  const found: string[] = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    if (SKIP_NAMES.has(entry.name)) continue
    if (relative === '' && (entry.name === STATE_DIR || entry.name === ARCHIVE_DIR)) continue
    const nextRelative = relative === '' ? entry.name : `${relative}/${entry.name}`
    if (entry.isDirectory()) {
      found.push(...await listMarkdown(root, nextRelative))
      continue
    }
    if (!entry.name.toLowerCase().endsWith('.md')) continue
    found.push(nextRelative)
  }
  return found
}

/** 统计汇总。 */
export interface MemoryStats {
  files: number
  bytes: number
  tokens: number
  overLimit: number
  domains: { key: string; label: string; files: number; bytes: number; tokens: number; overLimit: number }[]
  layers: Record<'l0' | 'l1' | 'l2', { files: number; tokens: number }>
  rates: {
    hitRate: number | null
    confirmRate: number | null
    expireRate: number | null
    missRate: number | null
  }
  misses: { total: number; verified: number }
  counts: { pending: number; confirmed: number; rejected: number; stale: number; archived: number }
  expiry: (Expiry & { id: string })[]
}

/**
 * 归一 frontmatter 里的 `anchor` 字段。
 *
 * 为什么要兼容两种形态：`serializeFrontmatter` 把对象数组写成块列表
 * （`anchor:` + `  - path: ...`），解析回来**必然是数组**；而手写的单行锚点
 * 或早期数据可能是裸对象。早先这里只收对象、把数组判成 null，
 * 结果是「写进去的锚点读不出来」——锚点展示与校验全部失效，
 * 且因为真实库里还没有文件带 anchor，这个 bug 一直没有暴露。
 */
function normalizeAnchor(raw: unknown): Record<string, string> | null {
  const first = Array.isArray(raw) ? raw[0] : raw
  if (typeof first !== 'object' || first === null) return null
  const record = first as Record<string, unknown>
  const shaped: Record<string, string> = {}
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null) continue
    shaped[key] = String(value)
  }
  return Object.keys(shaped).length === 0 ? null : shaped
}

/** 建一个绑定到某个根目录的 store。 */
export function createStore({ root, now = () => Date.now() }: { root?: string; now?: () => number } = {}) {
  const base = path.resolve(root ?? defaultRoot())
  const stateDir = path.join(base, STATE_DIR)
  const eventsPath = path.join(stateDir, 'events.jsonl')
  const missesPath = path.join(stateDir, 'misses.json')

  const absoluteOf = (relPath: string): string => path.join(base, safeRelPath(relPath))

  async function ensureLayout(): Promise<void> {
    await fsp.mkdir(stateDir, { recursive: true })
    await fsp.mkdir(path.join(base, 'personal'), { recursive: true })
    await fsp.mkdir(path.join(base, 'work'), { recursive: true })
    await fsp.mkdir(path.join(base, ARCHIVE_DIR), { recursive: true })
  }

  /** 读一个条目的完整快照。 */
  async function readEntry(relPath: string): Promise<MemoryEntry> {
    const absolute = absoluteOf(relPath)
    const stat = await fsp.stat(absolute)
    const source = await fsp.readFile(absolute, 'utf8')
    const { frontmatter, body } = splitFrontmatter(source)
    const meta = parseFrontmatter(frontmatter)
    const lineCount = source.split('\n').length
    const evidence = Array.isArray(meta.evidence)
      ? meta.evidence.filter((item): item is Record<string, string> => typeof item === 'object' && item !== null)
      : []
    const anchor = normalizeAnchor(meta.anchor)
    return {
      path: relPath,
      id: identityOf(relPath, meta),
      domain: domainKeyOf(relPath),
      domainLabel: domainLabelOf(relPath),
      project: projectOf(relPath),
      title: orEmpty(meta.title ?? path.basename(relPath, '.md')),
      kind: orEmpty(meta.kind),
      scope: orEmpty(meta.scope),
      layer: orEmpty(meta.layer),
      status: typeof meta.status === 'string' ? meta.status : 'active',
      confidence: typeof meta.confidence === 'number'
        ? meta.confidence
        : typeof meta.confidence === 'string' && meta.confidence !== '' ? Number(meta.confidence) : null,
      pinned: meta.pinned === true || meta.pinned === 'true',
      updatedAt: orEmpty(meta.updated),
      createdAt: orEmpty(meta.created),
      lastCitedAt: typeof meta.last_cited === 'string' ? meta.last_cited : undefined,
      refutedAt: typeof meta.refuted_at === 'string' ? meta.refuted_at : undefined,
      tags: Array.isArray(meta.tags) ? meta.tags.filter((tag): tag is string => typeof tag === 'string') : [],
      evidence,
      anchor,
      supersededBy: orEmpty(meta.superseded_by),
      refutedReason: orEmpty(meta.refuted_reason),
      origin: orEmpty(meta.origin),
      bytes: stat.size,
      tokens: estimateTokens(source),
      lines: lineCount,
      overLineLimit: lineCount > FILE_LINE_LIMIT,
      frontmatter: meta,
      body,
      source,
      mtime: stat.mtimeMs,
    }
  }

  /** 全量扫描：所有 markdown 条目。 */
  async function scan(): Promise<MemoryEntry[]> {
    const files = await listMarkdown(base)
    const entries: MemoryEntry[] = []
    for (const relPath of files) {
      try {
        entries.push(await readEntry(relPath))
      } catch {
        // 读失败不阻断整表——UI 用「读取失败」态单独呈现
      }
    }
    entries.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return String(b.updatedAt).localeCompare(String(a.updatedAt))
    })
    return entries
  }

  /** 读事件流（容错：坏行跳过）。 */
  async function readEvents(): Promise<MemoryEvent[]> {
    let raw = ''
    try {
      raw = await fsp.readFile(eventsPath, 'utf8')
    } catch {
      return []
    }
    const events: MemoryEvent[] = []
    for (const line of raw.split('\n')) {
      if (line.trim() === '') continue
      try {
        events.push(JSON.parse(line) as MemoryEvent)
      } catch { /* 坏行跳过 */ }
    }
    return events
  }

  /** 追加一条事件（append-only）。 */
  async function appendEvent(event: Omit<MemoryEvent, 'at'> & { at?: string }): Promise<MemoryEvent> {
    await fsp.mkdir(stateDir, { recursive: true })
    const row: MemoryEvent = { at: new Date(now()).toISOString(), ...event }
    await fsp.appendFile(eventsPath, `${JSON.stringify(row)}\n`, 'utf8')
    return row
  }

  /** 读未命中表。 */
  async function readMisses(): Promise<MissRecord[]> {
    try {
      const raw = await fsp.readFile(missesPath, 'utf8')
      const parsed = JSON.parse(raw) as { misses?: unknown }
      return Array.isArray(parsed.misses) ? parsed.misses as MissRecord[] : []
    } catch {
      return []
    }
  }

  /** 写未命中表（原子）。 */
  async function writeMisses(misses: MissRecord[]): Promise<void> {
    await fsp.mkdir(stateDir, { recursive: true })
    await atomicWrite(missesPath, `${JSON.stringify({ version: 1, misses }, null, 2)}\n`)
  }

  /** 记一次未命中：同一 query 合并计数，不刷屏。 */
  async function recordMiss({ query, session = 'plugin', scope = 'all' }: {
    query: string; session?: string; scope?: string
  }): Promise<MissRecord | null> {
    const text = String(query ?? '').trim()
    if (text === '') return null
    const misses = await readMisses()
    const at = new Date(now()).toISOString()
    const existing = misses.find(item => item.query === text && item.state !== 'verified')
    if (existing !== undefined) {
      existing.hits = 0
      existing.count = (existing.count ?? 1) + 1
      existing.lastAt = at
      if (existing.state === undefined) existing.state = 'observing'
      if (existing.count >= 3 && existing.state === 'observing') existing.state = 'should-fill'
    } else {
      misses.push({
        at, lastAt: at, session, query: text, hits: 0, count: 1,
        state: 'observing', scope, drafts: [],
      })
    }
    await writeMisses(misses)
    await appendEvent({ session, kind: 'miss', query: text })
    return misses.find(item => item.query === text) ?? null
  }

  /** 更新一条未命中的状态（草稿 → 确认 → 验证期 → 生效）。 */
  async function updateMiss({ query, state, draftId }: {
    query: string; state?: string; draftId?: string
  }): Promise<MissRecord> {
    const misses = await readMisses()
    const target = misses.find(item => item.query === query)
    if (target === undefined) throw new Error(`未命中不存在：${query}`)
    if (typeof state === 'string') {
      target.state = state
      target.stateAt = new Date(now()).toISOString()
    }
    if (typeof draftId === 'string' && !(target.drafts ?? []).includes(draftId)) {
      target.drafts = [...(target.drafts ?? []), draftId]
    }
    await writeMisses(misses)
    return target
  }

  /** 删除一条未命中。 */
  async function deleteMiss(query: string): Promise<number> {
    const misses = await readMisses()
    const next = misses.filter(item => item.query !== query)
    await writeMisses(next)
    return misses.length - next.length
  }

  /** 写回一个条目的正文（保留 frontmatter 的既有字段顺序）。 */
  async function writeBody(relPath: string, body: string): Promise<MemoryEntry> {
    const absolute = absoluteOf(relPath)
    return withLock(absolute, async () => {
      const source = await fsp.readFile(absolute, 'utf8')
      const { frontmatter } = splitFrontmatter(source)
      const meta = parseFrontmatter(frontmatter) as Record<string, unknown>
      meta.updated = new Date(now()).toISOString().slice(0, 10)
      await atomicWrite(absolute, `${serializeFrontmatter(meta)}\n${String(body ?? '').replace(/^\n+/, '')}`)
      return readEntry(relPath)
    })
  }

  /**
   * 只合并 frontmatter 字段，**不碰 updated**。
   *
   * 与 `patchMeta` 的区别：
   *   1. 不刷新 `updated`——修补缺失字段不是「人动了这条记忆」，
   *      刷日期会伪造「刚更新过」，把 134 天退役倒计时偷偷清零；
   *   2. 已有**合法**值一律保留，只补空洞。但「合法」由调用方通过
   *      `overwrite` 显式指定：像 `status: active` 这种不在枚举内的脏值，
   *      光看「非空」会把脏值当成既有结论保下来，结果修补完还在坏。
   */
  async function mergeMeta(
    relPath: string,
    patch: Record<string, unknown>,
    { overwrite = [] }: { overwrite?: string[] } = {},
  ): Promise<MemoryEntry> {
    const absolute = absoluteOf(relPath)
    return withLock(absolute, async () => {
      const source = await fsp.readFile(absolute, 'utf8')
      const { frontmatter, body } = splitFrontmatter(source)
      const meta = parseFrontmatter(frontmatter) as Record<string, unknown>
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) continue
        if (!overwrite.includes(key)) {
          const current = meta[key]
          if (typeof current === 'string' && current.trim() !== '') continue
        }
        meta[key] = value
      }
      await atomicWrite(absolute, `${serializeFrontmatter(meta)}\n${body.replace(/^\n+/, '')}`)
      return readEntry(relPath)
    })
  }

  /** 改 frontmatter 字段（不动正文）。 */
  async function patchMeta(relPath: string, patch: Record<string, unknown>): Promise<MemoryEntry> {
    const absolute = absoluteOf(relPath)
    return withLock(absolute, async () => {
      const source = await fsp.readFile(absolute, 'utf8')
      const { frontmatter, body } = splitFrontmatter(source)
      const meta = parseFrontmatter(frontmatter) as Record<string, unknown>
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) continue
        meta[key] = value
      }
      meta.updated = new Date(now()).toISOString().slice(0, 10)
      await atomicWrite(absolute, `${serializeFrontmatter(meta)}\n${body.replace(/^\n+/, '')}`)
      return readEntry(relPath)
    })
  }

  /** 新建条目。 */
  async function createEntry({ relPath, frontmatter = {}, body = '' }: {
    relPath: string; frontmatter?: Record<string, unknown>; body?: string
  }): Promise<MemoryEntry> {
    const relative = safeRelPath(relPath)
    const absolute = absoluteOf(relative)
    return withLock(absolute, async () => {
      if (fs.existsSync(absolute)) throw new Error(`条目已存在：${relative}`)
      const meta: Record<string, unknown> = {
        id: identityOf(relative, frontmatter as Frontmatter),
        title: orEmpty(frontmatter.title),
        scope: frontmatter.scope ?? domainKeyOf(relative),
        kind: frontmatter.kind ?? 'fact',
        layer: frontmatter.layer ?? 'l2',
        status: frontmatter.status ?? 'active',
        pinned: frontmatter.pinned === true,
        updated: new Date(now()).toISOString().slice(0, 10),
        tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
        ...frontmatter,
      }
      await atomicWrite(absolute, `${serializeFrontmatter(meta)}\n${String(body).replace(/^\n+/, '')}`)
      return readEntry(relative)
    })
  }

  /** INBOX 路径：默认个人域。 */
  function inboxPathOf(domain?: string | null): string {
    if (domain === undefined || domain === null || domain === 'personal') return 'personal/INBOX.md'
    const [kind, project] = String(domain).split('/')
    if (kind === 'work' && project !== undefined) return `work/${project}/INBOX.md`
    return 'personal/INBOX.md'
  }

  /** 追加一条 INBOX 记录（表格末尾一行）。 */
  async function appendInbox({ domain, kind, content, state = 'open', destination = '—' }: {
    domain?: string | null; kind: string; content: string; state?: string; destination?: string
  }): Promise<{ path: string; row: InboxRow | null }> {
    const relPath = inboxPathOf(domain)
    const absolute = absoluteOf(relPath)
    return withLock(absolute, async () => {
      let source = ''
      try {
        source = await fsp.readFile(absolute, 'utf8')
      } catch {
        const date = new Date(now()).toISOString().slice(0, 10)
        source = `---\nid: ${relPath.replace(/\.md$/, '').replace(/\//g, '.')}\ntitle: INBOX\nscope: ${domain ?? 'personal'}\nkind: fact\nlayer: l2\nstatus: active\npinned: false\nupdated: ${date}\ntags: []\n---\n\n# INBOX\n\n${INBOX_HEADER}\n`
      }
      const parsed = parseInbox(source, INBOX_KINDS, INBOX_STATES)
      const row = serializeInboxRow({
        date: new Date(now()).toISOString().slice(0, 10),
        kind, content, state, destination,
      })
      const lines = parsed.body.split('\n')
      let insertAt = -1
      lines.forEach((line, index) => {
        if (parseInboxRow(line) !== null) insertAt = index
      })
      if (insertAt >= 0) {
        lines.splice(insertAt + 1, 0, row)
      } else {
        if (!lines.some(line => line.trim().startsWith('|'))) lines.push('', INBOX_HEADER)
        lines.push(row)
      }
      const meta = parsed.frontmatter as Record<string, unknown>
      meta.updated = new Date(now()).toISOString().slice(0, 10)
      await atomicWrite(absolute, `${serializeFrontmatter(meta)}\n${lines.join('\n').replace(/^\n+/, '')}`)
      return { path: relPath, row: parseInboxRow(row) === null ? null : { ...parseInboxRow(row)!, kindValid: true, stateValid: true, lineIndex: insertAt + 1 } }
    })
  }

  /** 读 INBOX 条目（带行号）。 */
  async function readInbox(domain?: string | null): Promise<{ path: string; entries: InboxRow[]; exists: boolean }> {
    const relPath = inboxPathOf(domain)
    const absolute = absoluteOf(relPath)
    let source = ''
    try {
      source = await fsp.readFile(absolute, 'utf8')
    } catch {
      return { path: relPath, entries: [], exists: false }
    }
    const parsed = parseInbox(source, INBOX_KINDS, INBOX_STATES)
    return { path: relPath, entries: parsed.entries, exists: true }
  }

  /** 改一条 INBOX 行的字段（按行号定位，避免内容重复时改错行）。 */
  async function updateInboxRow({ domain, lineIndex, patch }: {
    domain?: string | null; lineIndex: number; patch: Record<string, string>
  }): Promise<{ path: string; lineIndex: number; row: InboxRow | null }> {
    const relPath = inboxPathOf(domain)
    const absolute = absoluteOf(relPath)
    return withLock(absolute, async () => {
      const source = await fsp.readFile(absolute, 'utf8')
      const parsed = parseInbox(source, INBOX_KINDS, INBOX_STATES)
      const lines = parsed.body.split('\n')
      const row = parseInboxRow(lines[lineIndex] ?? '')
      if (row === null) throw new Error(`第 ${lineIndex + 1} 行不是 INBOX 条目`)
      const next = serializeInboxRow({
        date: patch.date ?? row.date,
        kind: patch.kind ?? row.kind,
        content: patch.content ?? row.content,
        state: patch.state ?? row.state,
        destination: patch.destination ?? row.destination,
      })
      lines[lineIndex] = next
      const meta = parsed.frontmatter as Record<string, unknown>
      meta.updated = new Date(now()).toISOString().slice(0, 10)
      await atomicWrite(absolute, `${serializeFrontmatter(meta)}\n${lines.join('\n').replace(/^\n+/, '')}`)
      const updated = parseInboxRow(next)
      return {
        path: relPath,
        lineIndex,
        row: updated === null ? null : { ...updated, kindValid: INBOX_KINDS.includes(updated.kind as never), stateValid: INBOX_STATES.includes(updated.state as never), lineIndex },
      }
    })
  }

  /** 批量删行：**从大行号往小删**，否则行号会漂移。 */
  async function deleteInboxRows({ domain, lineIndexes }: {
    domain?: string | null; lineIndexes: number[]
  }): Promise<{ path: string; removed: number }> {
    const relPath = inboxPathOf(domain)
    const absolute = absoluteOf(relPath)
    return withLock(absolute, async () => {
      const source = await fsp.readFile(absolute, 'utf8')
      const parsed = parseInbox(source, INBOX_KINDS, INBOX_STATES)
      const lines = parsed.body.split('\n')
      const ordered = [...new Set(lineIndexes)].sort((a, b) => b - a)
      let removed = 0
      for (const index of ordered) {
        if (parseInboxRow(lines[index] ?? '') === null) continue
        lines.splice(index, 1)
        removed += 1
      }
      const meta = parsed.frontmatter as Record<string, unknown>
      meta.updated = new Date(now()).toISOString().slice(0, 10)
      await atomicWrite(absolute, `${serializeFrontmatter(meta)}\n${lines.join('\n').replace(/^\n+/, '')}`)
      return { path: relPath, removed }
    })
  }

  /** 归档一条记忆到 archive/<yyyymmdd>/<原路径>。 */
  async function archiveEntry({ relPath, reason = '到期退役' }: {
    relPath: string; reason?: string
  }): Promise<{ from: string; to: string }> {
    const relative = safeRelPath(relPath)
    const absolute = absoluteOf(relative)
    return withLock(absolute, async () => {
      const stamp = new Date(now()).toISOString().slice(0, 10).replace(/-/g, '')
      const targetRel = `${ARCHIVE_DIR}/${stamp}/${relative}`
      const targetAbs = absoluteOf(targetRel)
      await fsp.mkdir(path.dirname(targetAbs), { recursive: true })
      const source = await fsp.readFile(absolute, 'utf8')
      const { frontmatter, body } = splitFrontmatter(source)
      const meta = parseFrontmatter(frontmatter) as Record<string, unknown>
      meta.status = 'archived'
      meta.archived_at = new Date(now()).toISOString().slice(0, 10)
      meta.archive_reason = reason
      await atomicWrite(targetAbs, `${serializeFrontmatter(meta)}\n${body.replace(/^\n+/, '')}`)
      await fsp.unlink(absolute)
      await appendEvent({ session: 'plugin', kind: 'archive', ids: [identityOf(relative, meta as Frontmatter)], query: reason })
      return { from: relative, to: targetRel }
    })
  }

  /** 再留 90 天：只刷新 updated，不改内容。 */
  async function keepLonger({ relPath }: { relPath: string }): Promise<MemoryEntry> {
    return patchMeta(relPath, { updated: new Date(now()).toISOString().slice(0, 10) })
  }

  /** 记一次引用（cite / recall）。 */
  /**
   * 记一次引用（cite / recall），并把 `last_cited` 写回被引用的条目。
   *
   * ## 为什么必须写回 `last_cited`
   *
   * `expiryOf()` 的判定顺序是 `lastCitedAt ?? updatedAt ?? createdAt`。
   * 早先这里只 append 事件、从不写 `last_cited`，于是无论一条记忆被引用多少次，
   * 到期判定始终退回 `updatedAt`——**「90 天未被引用」这个核心机制其实没生效过**：
   * 一条被天天读的记忆，只要 `updated` 是 100 天前，照样会被判「该退役」。
   *
   * ## 为什么只对 cite 写，不对 recall 写
   *
   * `recall` 是「搜到了」，不等于「用上了」。搜索命中 5 条就更新 5 条的引用时间，
   * 会让所有被搜到过的记忆永远不过期，过期率永远是 0。
   * 只有 `cite`（模型显式声明用了哪条）才算真正的引用。
   *
   * 失败不抛：写回是**附带收益**，不该因为某个文件被删就让记账失败。
   */
  async function recordCite({ ids, kind = 'cite', session = 'plugin', query }: {
    ids: string[]; kind?: string; session?: string; query?: string
  }): Promise<MemoryEvent> {
    const event = await appendEvent({ session, kind, ids, query })
    if (kind !== 'cite' || ids.length === 0) return event

    const at = new Date(now()).toISOString().slice(0, 10)
    try {
      // 事件里存的是 id，写回需要路径：扫一次全库建映射（条目数百量级，可接受）
      const entries = await scan()
      const byId = new Map(entries.map(entry => [entry.id, entry]))
      for (const id of ids) {
        const entry = byId.get(id)
        if (entry === undefined) continue
        try {
          await patchMeta(entry.path, { last_cited: at })
        } catch {
          // 单条写失败（文件被删/无权限）不影响其余条目
        }
      }
    } catch {
      // 扫描失败就跳过写回：事件已经记上了，这是附带收益
    }
    return event
  }

  /** 汇总统计（唯一口径，两端共用）。 */
  function summarize(
    entries: MemoryEntry[],
    events: MemoryEvent[],
    misses: MissRecord[],
    { nowMs = now() }: { nowMs?: number } = {},
  ): MemoryStats {
    const byDomain = new Map<string, MemoryStats['domains'][number]>()
    let bytes = 0
    let tokens = 0
    let overLimit = 0
    for (const entry of entries) {
      bytes += entry.bytes
      tokens += entry.tokens
      if (entry.overLineLimit) overLimit += 1
      const bucket = byDomain.get(entry.domain) ?? {
        key: entry.domain, label: entry.domainLabel, files: 0, bytes: 0, tokens: 0, overLimit: 0,
      }
      bucket.files += 1
      bucket.bytes += entry.bytes
      bucket.tokens += entry.tokens
      if (entry.overLineLimit) bucket.overLimit += 1
      byDomain.set(entry.domain, bucket)
    }

    const layers: MemoryStats['layers'] = {
      l0: { files: 0, tokens: 0 },
      l1: { files: 0, tokens: 0 },
      l2: { files: 0, tokens: 0 },
    }
    for (const entry of entries) {
      const key = String(entry.layer).toLowerCase()
      if (key === 'l0' || key === 'l1' || key === 'l2') {
        layers[key].files += 1
        layers[key].tokens += entry.tokens
      }
    }

    // 三率：口径写死在这里，两端共用
    const windowStart = nowMs - 30 * 86_400_000
    const recent = events.filter((event) => {
      const at = Date.parse(event.at ?? '')
      return Number.isFinite(at) && at >= windowStart
    })
    const recallEvents = recent.filter(event => event.kind === 'recall')
    const citedIds = new Set<string>()
    for (const event of recent) {
      if (event.kind !== 'cite') continue
      for (const id of event.ids ?? []) citedIds.add(id)
    }
    const recalledIds = new Set<string>()
    for (const event of recallEvents) {
      for (const id of event.ids ?? []) recalledIds.add(id)
    }
    const hitRate = recalledIds.size === 0 ? null : Math.min(1, citedIds.size / recalledIds.size)

    const confirmed = entries.filter(entry => entry.status === 'confirmed').length
    const rejected = entries.filter(entry => entry.status === 'rejected').length
    const confirmRate = confirmed + rejected === 0 ? null : confirmed / (confirmed + rejected)

    const stale = entries.filter(entry => entry.status === 'stale' || entry.status === 'archived').length
    const expireRate = entries.length === 0 ? null : stale / entries.length

    const missTotal = misses.length
    const missVerified = misses.filter(miss => miss.state === 'verified').length
    const missRate = missTotal === 0 ? null : missVerified / missTotal

    return {
      files: entries.length,
      bytes,
      tokens,
      overLimit,
      domains: [...byDomain.values()].sort((a, b) => b.files - a.files),
      layers,
      rates: { hitRate, confirmRate, expireRate, missRate },
      misses: { total: missTotal, verified: missVerified },
      counts: {
        pending: entries.filter(entry => entry.status === 'hypothesis' || entry.status === 'observed').length,
        confirmed,
        rejected,
        stale,
        archived: entries.filter(entry => entry.status === 'archived').length,
      },
      expiry: entries.map(entry => ({ id: entry.id, ...expiryOf(entry, nowMs) })),
    }
  }

  return {
    root: base,
    stateDir,
    eventsPath,
    missesPath,
    ensureLayout,
    scan,
    readEntry,
    readEvents,
    appendEvent,
    readMisses,
    writeMisses,
    recordMiss,
    updateMiss,
    deleteMiss,
    writeBody,
    patchMeta,
    mergeMeta,
    createEntry,
    inboxPathOf,
    appendInbox,
    readInbox,
    updateInboxRow,
    deleteInboxRows,
    archiveEntry,
    keepLonger,
    recordCite,
    summarize,
    absoluteOf,
  }
}

export type Store = ReturnType<typeof createStore>
