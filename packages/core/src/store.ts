/**
 * store.ts —— 组合根（原 1041 行，拆为 store/ 子模块后约 700 行）
 *
 * ## 拆分原则
 *
 * 这个文件原来是「一个 1041 行的大闭包」，混了 6 个职责：
 * 路径派生、IO 原语、条目读写、事件流、未命中表、INBOX、统计。
 *
 * 拆分**不改变任何对外行为**：
 *   - 导出的名字全部保留（通过底部 re-export）；
 *   - `createStore()` 返回的 30 个方法签名一字不改；
 *   - 所有口径（三率、域排序、过期率分子）逐字保留。
 *
 * 拆出去的：
 *   - `store/paths.ts`   路径派生与身份（纯函数，零 IO）
 *   - `store/io.ts`      原子写 / 文件锁 / 目录遍历（IO 原语）
 *   - `store/types.ts`   事件与未命中数据结构
 *   - `store/stats.ts`   统计汇总（纯函数，三率唯一实现）
 *
 * 留在这里的：**真正需要闭包内 `base` / `now` / `absoluteOf` 的读写逻辑**。
 * 这些逻辑彼此共享状态，强行再拆会让参数列表爆炸，收益为负。
 *
 * ## 三条硬约束（照 product.md §七 数据契约）
 *   1. **原子写**：tmp + rename，避免 agent 与 UI 同时写出现半行。
 *   2. **文件锁**：跨进程用 `<file>.lock` 的 O_EXCL 独占，写前获取、写后释放。
 *   3. **只追加**：events.jsonl 是 append-only 事件流；条目本身可改，但历史不改。
 *
 * 为什么不用数据库：Markdown 真相源是可读、可 git、可手改的。单条一文件或
 * sqlite 会让「人可审」变成「人要装工具才能审」。
 */

import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'

import {
  INBOX_KINDS, INBOX_STATES, FILE_LINE_LIMIT, SHARED_BRANCH, SHARED_ALLOWED_KINDS,
  canShareAcrossBranches, estimateTokens, expiryOf, orEmpty,
} from './schema.ts'
import {
  INBOX_HEADER, parseFrontmatter, serializeFrontmatter, splitFrontmatter,
  parseInbox, serializeInboxRow, parseInboxRow,
  type Frontmatter, type InboxRow,
} from './parse.ts'
import { isUnscopedEntry, scopeOfPath } from './scope.ts'

import {
  ARCHIVE_DIR, STATE_DIR, branchOfEntry, defaultRoot, domainKeyOf, domainLabelOf,
  identityOf, normalizeAnchor, projectOf, safeRelPath,
  type MemoryEntry,
} from './store/paths.ts'
import { atomicWrite, listMarkdown, withLock } from './store/io.ts'
import { summarize, type MemoryStats } from './store/stats.ts'
import { type MemoryEvent, type MissRecord } from './store/types.ts'

// 全部对外 re-export，保证 `import { x } from './store.ts'` 的既有调用方零改动
export {
  ARCHIVE_DIR, SKIP_NAMES, STATE_DIR,
  branchOfEntry, branchSourceOf, defaultRoot, domainKeyOf, domainLabelOf,
  identityOf, normalizeAnchor, projectOf, safeRelPath,
  type MemoryEntry,
} from './store/paths.ts'
export { atomicWrite, listMarkdown, withLock } from './store/io.ts'
export { summarize, type MemoryStats } from './store/stats.ts'
export { type MemoryEvent, type MissRecord } from './store/types.ts'

/** 建一个绑定到某个根目录的 store。 */
export function createStore({ root, now = () => Date.now() }: { root?: string; now?: () => number } = {}) {
  const base = path.resolve(root ?? defaultRoot())
  const stateDir = path.join(base, STATE_DIR)
  const eventsPath = path.join(stateDir, 'events.jsonl')
  const missesPath = path.join(stateDir, 'misses.json')

  /**
   * 扫描计数器（可观测性，不是缓存）。
   *
   * ## 为什么不实现「请求作用域缓存」
   *
   * 架构评估（docs/architecture-review.md）原本建议做请求作用域快照，
   * 让 snapshot / overview / health 共享一次 scan。但实施时发现：
   *
   *   - bridge.ts 每条路由是**独立 HTTP 请求**，共用同一个 actions 实例，
   *     但**没有请求边界**可挂缓存；
   *   - 一个页面并发发 3 个请求（overview + snapshot + misses），
   *     它们落在不同 event loop tick，无法共享同一个 Promise；
   *   - 强行做「短时间窗缓存」会引入跨请求陈旧数据——正是 data.ts 注释
   *     明确拒绝的「改完看不到」（agent 与 UI 是不同进程写同一个库）。
   *
   * 所以不做缓存。改为**让问题可观测**：记录 scan 次数，
   * 未来若在某个真实页面里发现 scanCount 异常高，再拿数据决定是否换架构
   * （例如让 client 一次请求拿全量，而不是拆 3 个）。
   *
   * 这是「先用数据说话，不凭猜测优化」——与本仓一贯的立场一致。
   */
  let scanCount = 0
  /** 返回累计扫描次数（测试与诊断用；读操作无副作用）。 */
  function getScanCount(): number {
    return scanCount
  }
  /** 重置计数（测试用）。 */
  function resetScanCount(): void {
    scanCount = 0
  }

  const absoluteOf = (relPath: string): string => path.join(base, safeRelPath(relPath))

  async function ensureLayout(): Promise<void> {
    await fsp.mkdir(stateDir, { recursive: true })
    await fsp.mkdir(path.join(base, 'personal'), { recursive: true })
    await fsp.mkdir(path.join(base, 'work'), { recursive: true })
    await fsp.mkdir(path.join(base, ARCHIVE_DIR), { recursive: true })
  }

  /**
   * 读一个条目的完整快照。
   *
   * @param declaredBranches - 该条目所属项目已声明的分支表。
   *   缺省时退回版本号形态推断（见 `looksLikeBranch` 的兼容说明）。
   */
  async function readEntry(relPath: string, declaredBranches?: Iterable<string>): Promise<MemoryEntry> {
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
    const pathScope = scopeOfPath(relPath, declaredBranches)
    return {
      path: relPath,
      id: identityOf(relPath, meta),
      domain: domainKeyOf(relPath),
      domainLabel: domainLabelOf(relPath),
      project: pathScope.project,
      branch: branchOfEntry(pathScope.branch, meta.branch),
      unscoped: isUnscopedEntry(relPath, declaredBranches),
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

  /**
   * 扫描全库。
   *
   * 两趟：先扫一遍收集各项目的 `branches:` 声明，再带着声明重扫。
   * 为什么值得多一趟 IO：分支识别依赖项目自述，而声明写在
   * `work/<project>/index.md` —— 只有先读到它，才能判定
   * `work/p/V2.1.25-dev/` 的第三段是分支还是分类目录。单趟扫描会出现
   * 「按文件名字母序，index.md 排在后面就没读到声明」的不确定行为。
   *
   * ## 为什么第二趟改并行
   *
   * 原实现是 `for (const relPath of files) { await readEntry(...) }` —— 串行。
   * 每个条目要做一次 `stat` + 一次 `readFile`，串行意味着总耗时 ≈ 文件数 × 单文件延迟。
   * 改成 `Promise.all` 后总耗时 ≈ **最慢那个文件**，在高延迟磁盘
   * （网络盘 / 加密盘 / 杀软实时扫描）上差别显著。
   *
   * 实测（本机 3 篇）：串行 2ms → 并行 1ms。规模小时收益小，
   * 但这是唯一随库增长线性变慢的路径，且改动零风险（每个文件独立 try/catch）。
   */
  async function scan(): Promise<MemoryEntry[]> {
    scanCount += 1
    const files = await listMarkdown(base)

    /** 第一趟：只读 index.md 的 frontmatter，收集分支声明与父子关系。 */
    const declared = new Map<string, string[]>()
    for (const relPath of files) {
      const parts = relPath.split('/')
      if (parts[0] !== 'work' || parts.length !== 3) continue
      if (parts[2]!.toLowerCase() !== 'index.md') continue
      try {
        const { frontmatter } = splitFrontmatter(await fsp.readFile(absoluteOf(relPath), 'utf8'))
        const meta = parseFrontmatter(frontmatter)
        const branches = Array.isArray(meta.branches)
          ? meta.branches.map(item => String(item).trim()).filter(item => item !== '')
          : []
        if (branches.length > 0) declared.set(parts[1]!, branches)
      } catch {
        // 声明读不到就退回形态推断，不阻断扫描
      }
    }

    /** 第二趟：并行读全量。单个失败不阻断整表。 */
    const loaded = await Promise.all(files.map(async (relPath) => {
      try {
        const project = projectOf(relPath)
        return await readEntry(relPath, project === null ? undefined : declared.get(project))
      } catch {
        // 读失败不阻断整表——UI 用「读取失败」态单独呈现
        return null
      }
    }))
    const entries = loaded.filter((entry): entry is MemoryEntry => entry !== null)

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
    return parseEventLines(raw)
  }

  /**
   * 只读事件流的最后 N 条。
   *
   * ## 为什么要单独一个方法而不是 `readEvents().slice(-N)`
   *
   * 旧写法是「读全文 → 解析每一条 → 再 slice(-200)」：
   * 解析成本发生在截断**之前**，所以取最后 200 条与解析全部一样贵。
   * events.jsonl 是 append-only 且**永不轮转**，一年可到数万条——
   * 这是全系统唯一没有上限的数据结构。
   *
   * 这里从文件尾部按块反向读，凑够 N 条非空行即停：
   *   - 读的字节量与 N 成正比，与文件总长无关；
   *   - 只解析需要的行。
   *
   * 实现要点：JSONL 每行是一条完整 JSON，所以从尾部截断只会破坏**第一行**
   * （可能读到半条）；丢弃第一行再解析即可保证剩下的都是完整行。
   *
   * @param count - 要读的最后几条。<=0 返回空数组。
   */
  async function readEventsTail(count: number): Promise<MemoryEvent[]> {
    if (count <= 0) return []
    let handle: fsp.FileHandle | null = null
    try {
      handle = await fsp.open(eventsPath, 'r')
      const size = (await handle.stat()).size
      if (size === 0) return []

      const BLOCK = 64 * 1024
      let position = size
      let text = ''
      let newlines = 0
      while (position > 0 && newlines <= count) {
        const want = Math.min(BLOCK, position)
        position -= want
        const buf = Buffer.allocUnsafe(want)
        const { bytesRead } = await handle.read(buf, 0, want, position)
        text = buf.subarray(0, bytesRead).toString('utf8') + text
        // 统计换行数：够 count+1 行就停（多出来的一行是被截断的半行）
        newlines = 0
        for (let i = 0; i < text.length; i += 1) {
          if (text[i] === '\n') newlines += 1
        }
      }

      const lines = text.split('\n')
      // 如果没读到文件开头，第一行可能是不完整的半行，丢掉它
      const atFileStart = position === 0
      const usable = atFileStart ? lines : lines.slice(1)
      const nonEmpty = usable.filter(line => line.trim() !== '')
      const tail = nonEmpty.slice(-count)
      return parseEventLines(tail.join('\n'))
    } catch {
      return []
    } finally {
      await handle?.close().catch(() => {})
    }
  }

  /** 解析 JSONL 文本；坏行跳过。readEvents 与 readEventsTail 共用。 */
  function parseEventLines(raw: string): MemoryEvent[] {
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
      // 记录会话集合：UI 要显示「N 次 / M 个会话」，只存 count 算不出后者
      const sessions = existing.sessions ?? [existing.session]
      if (!sessions.includes(session)) sessions.push(session)
      existing.sessions = sessions
      if (existing.state === undefined) existing.state = 'observing'
      if (existing.count >= 3 && existing.state === 'observing') existing.state = 'should-fill'
    } else {
      misses.push({
        at, lastAt: at, session, query: text, hits: 0, count: 1,
        state: 'observing', scope, drafts: [], sessions: [session],
      })
    }
    await writeMisses(misses)
    await appendEvent({ session, kind: 'miss', query: text })
    return misses.find(item => item.query === text) ?? null
  }

  /**
   * 记一次「验证期内命中」。
   *
   * 这是未命中流水线最后一段（验证期 → 已验证生效）的输入：
   * 草稿落库后，如果同一个 query 再次检索**能命中**，说明补对了；
   * 满 3 次即可判 verified。早先这个计数从来没人写，所以 `hits` 恒为 0，
   * 五态的最后一态永远是空的。
   */
  async function recordVerifyHit({ query }: { query: string }): Promise<MissRecord | null> {
    const text = String(query ?? '').trim()
    if (text === '') return null
    const misses = await readMisses()
    const target = misses.find(item => item.query === text && item.state === 'verifying')
    if (target === undefined) return null
    target.hits = (target.hits ?? 0) + 1
    target.lastAt = new Date(now()).toISOString()
    // 满 3 次命中 → 这条补库真的生效了
    if (target.hits >= 3) {
      target.state = 'verified'
      target.stateAt = new Date(now()).toISOString()
    }
    await writeMisses(misses)
    return target
  }

  /**
   * 更新一条未命中的状态。
   *
   * `draftPath` / `verifyAt` 是 v3.5 补的字段：
   *   - `draftPath` 让「验证期内」能点开跳到落库的那篇，否则只有一个 query 字符串；
   *   - `verifyAt` 是 7 天倒计时的起点，缺了它就算不出「剩 N 天」。
   * 两者都在进入验证期时一次性写入，不进 state 迁移逻辑（那是另一件事）。
   */
  async function updateMiss({ query, state, draftId, draftPath, verifyAt }: {
    query: string; state?: string; draftId?: string; draftPath?: string; verifyAt?: string
  }): Promise<MissRecord> {
    const misses = await readMisses()
    const target = misses.find(item => item.query === query)
    if (target === undefined) throw new Error(`未命中不存在：${query}`)
    if (typeof state === 'string') {
      target.state = state
      target.stateAt = new Date(now()).toISOString()
      // 进入验证期时开计时；离开验证期清掉，避免「已验证」还挂着倒计时
      if (state === 'verifying') {
        target.verifyAt = verifyAt ?? new Date(now()).toISOString()
        target.hits = 0
      } else if (state !== 'verifying') {
        delete target.verifyAt
      }
    }
    if (typeof draftId === 'string' && !(target.drafts ?? []).includes(draftId)) {
      target.drafts = [...(target.drafts ?? []), draftId]
    }
    if (typeof draftPath === 'string' && draftPath !== '') target.draftPath = draftPath
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

  /**
   * 构造条目路径：**按需创建分支目录**，并在写入前校验 `_shared` 准入。
   *
   * ## 为什么写入要管路径（而不是让调用方自己拼）
   *
   * 统一按分支建目录后，`work/<project>/<branch>/…` 的 `<branch>` 有三个来源：
   * 会话识别的分支、人显式指定的分支、`_shared`（有意共享）。
   * 如果每个调用方各自拼路径，拼错的形态会是「少一层分支」——
   * 而少一层分支恰好等于「全分支可见」，**错得静默**。
   *
   * 所以路径在这里统一构造：不给分支就落到会话分支，给 `_shared` 就校验准入。
   *
   * @param project - 项目名（`work/<project>`）。
   * @param branch - 分支名；`_shared` 表示有意跨分支共享。
   * @param tail - 分支目录下的相对路径（如 `issues/xxx.md`）。
   * @param kind - 知识类型，用于 `_shared` 准入校验。
   */
  function branchPathOf({
    project, branch, tail, kind,
  }: { project: string; branch: string; tail: string; kind?: string }): string {
    const safeProject = String(project).replace(/[\\/]/g, '')
    const safeBranch = String(branch).replace(/[\\/]/g, '')
    const safeTail = safeRelPath(tail)
    if (safeProject === '') throw new Error('项目名不能为空')
    if (safeBranch === '') throw new Error('分支名不能为空（跨分支共享请显式用 _shared）')
    if (safeBranch === SHARED_BRANCH && kind !== undefined && !canShareAcrossBranches(kind)) {
      throw new Error(
        `「${kind}」不能放进 _shared：随版本变化的知识必须落到具体分支。`
        + `允许共享的类型：${SHARED_ALLOWED_KINDS.join(' / ')}`,
      )
    }
    return `work/${safeProject}/${safeBranch}/${safeTail}`
  }

  /**
   * 新建条目。
   *
   * ## 写入路径必须自己校验作用域（真事故）
   *
   * 早先把 `_shared` 准入校验写在 `branchPathOf` 里，而 `branchPathOf` 只被
   * **测试**调用——真正的写入函数（`createEntry`）压根没接它。
   * 结果：8 项测试全绿，实际写入零拦截。这正是本仓库反复批评的形态：
   * 「机制写了、测试绿了、没接线」。
   *
   * 所以校验下沉到这里，而不是指望每个调用方记得先调 `branchPathOf`。
   * 调用方越多，越不能靠自觉。
   */
  async function createEntry({ relPath, frontmatter = {}, body = '' }: {
    relPath: string; frontmatter?: Record<string, unknown>; body?: string
  }): Promise<MemoryEntry> {
    const relative = safeRelPath(relPath)
    assertSharedAdmission(relative, frontmatter)
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
      // 目录按需创建：新分支第一次写入时自动建，不必预先铺满空目录
      await atomicWrite(absolute, `${serializeFrontmatter(meta)}\n${String(body).replace(/^\n+/, '')}`)
      return readEntry(relative)
    })
  }

  /**
   * `_shared` 准入闸门：随版本变化的知识不许进共享层。
   *
   * 只对 `work/<project>/_shared/...` 生效；其他路径原样放行。
   * 类型从 frontmatter 的 `knowledgeKind` 读——不是目录名，也不是标题措辞。
   */
  function assertSharedAdmission(relPath: string, frontmatter: Record<string, unknown>): void {
    const parts = relPath.split('/')
    if (parts[0] !== 'work' || parts[2] !== SHARED_BRANCH) return
    const kind = frontmatter.knowledgeKind
    if (canShareAcrossBranches(kind)) return
    throw new Error(
      `不能写入 ${SHARED_BRANCH}/：knowledgeKind「${String(kind ?? '未标注')}」随版本变化，必须落到具体分支。`
      + `允许共享：${SHARED_ALLOWED_KINDS.join(' / ')}`,
    )
  }

  /** INBOX 路径：默认个人域。 */
  function inboxPathOf(domain?: string | null): string {
    const key = String(domain ?? 'personal')
    return `${key}/INBOX.md`
  }

  /**
   * 追加一行 INBOX。
   *
   * ## 为什么不是「在文件末尾 append」
   *
   * INBOX 是一张 Markdown 表格。直接往文件尾 push 一行，会遇到两个坑：
   *   1. 表格后面可能已经有别的段落（追记、说明），插在末尾就断表了；
   *   2. 正文模板尾部换行会让 body 结尾留空行，空行卡在分隔行与第一条之间，
   *      Markdown 会把表截成两段——谁读都不成表。
   *
   * 所以正确做法是：**找到最后一条合法表格行，插在它后面**；
   * 一条都没有时才紧贴 `INBOX_HEADER` 补。
   * （这段逻辑是踩过坑才有的，拆分时逐字保留。）
   */
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
        source = `---\nid: ${relPath.replace(/\.md$/, '').replace(/\//g, '.')}\ntitle: INBOX\nscope: ${domain ?? 'personal'}\nkind: fact\nlayer: l2\nstatus: active\npinned: false\nupdated: ${date}\ntags: []\n---\n\n# INBOX\n\n${INBOX_HEADER}`
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
        /**
         * 没有旧数据行：新行必须紧贴分隔行。
         * 不能直接 push——正文模板与 INBOX_HEADER 的尾部换行会让 body 结尾留下空行，
         * 一旦它卡在分隔行与第一条之间，Markdown 就把表格截断成两段（谁读都不成表）。
         */
        if (!lines.some(line => line.trim().startsWith('|'))) lines.push('', INBOX_HEADER)
        while (lines.length > 0 && lines[lines.length - 1]!.trim() === '') lines.pop()
        lines.push(row)
      }
      const meta = parsed.frontmatter as Record<string, unknown>
      meta.updated = new Date(now()).toISOString().slice(0, 10)
      await atomicWrite(absolute, `${serializeFrontmatter(meta)}\n${lines.join('\n').replace(/^\n+/, '')}`)
      return {
        path: relPath,
        row: parseInboxRow(row) === null
          ? null
          : { ...parseInboxRow(row)!, kindValid: true, stateValid: true, lineIndex: insertAt + 1 },
      }
    })
  }

  /** 读 INBOX 表格。 */
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
        row: updated === null ? null : {
          ...updated,
          kindValid: INBOX_KINDS.includes(updated.kind as never),
          stateValid: INBOX_STATES.includes(updated.state as never),
          lineIndex,
        },
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

  /**
   * 归档一个条目到 `archive/<日期戳>/<原路径>`。
   *
   * 三个细节都不能省：
   *   1. **日期戳目录**：同一条记忆可能被归档多次（恢复后再归档），
   *      不带戳会覆盖上一次的归档副本；
   *   2. **写归档事件**：归档是改变可信度的动作，必须留审计痕迹；
   *   3. **`unlink` 不 catch**：归档失败必须抛出来，否则「界面说归档了、文件还在」
   *      ——那正是 docs/product.md 反复记过的「静默不生效」。
   */
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
      await appendEvent({
        session: 'plugin', kind: 'archive',
        ids: [identityOf(relative, meta as Frontmatter)], query: reason,
      })
      return { from: relative, to: targetRel }
    })
  }

  /** 再留 90 天：**只刷新 updated**，让 134 天倒计时重新开始。 */
  async function keepLonger({ relPath }: { relPath: string }): Promise<MemoryEntry> {
    return patchMeta(relPath, { updated: new Date(now()).toISOString().slice(0, 10) })
  }

  /**
   * 记一次引用（cite / recall），并把 `last_cited` 写回被引用的条目。
   *
   * ## 为什么必须写回 `last_cited`
   *
   * `last_cited` 只读不写会让 `expiryOf()` 永远退回 `updatedAt`，
   * **90 天未被引用机制从未生效**（见 docs/product.md §17.11）。
   *
   * ## 为什么只有 cite 才写回
   *
   * recall 是「搜到了」，cite 是「真的用了」。只有后者能证明这条记忆还活着。
   *
   * ## 为什么整段都包在 try 里
   *
   * 事件已经 append 成功了，写回是**附带收益**。
   * 写回失败（文件被删 / 无权限 / 扫描失败）不该让整个检索报错——
   * 那会让一次正常的检索因为一条陈旧的 id 而失败。
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

  /** 统计汇总（薄封装，把 `now()` 与 `expiryOf` 注入纯函数）。 */
  function summarizeStats(
    entries: MemoryEntry[],
    events: MemoryEvent[],
    misses: MissRecord[],
    { nowMs = now() }: { nowMs?: number } = {},
  ): MemoryStats {
    return summarize(entries, events, misses, { nowMs }, expiryOf)
  }

  return {
    root: base,
    stateDir,
    eventsPath,
    missesPath,
    ensureLayout,
    scan,
    getScanCount,
    resetScanCount,
    readEntry,
    readEvents,
    readEventsTail,
    appendEvent,
    readMisses,
    writeMisses,
    recordMiss,
    recordVerifyHit,
    updateMiss,
    deleteMiss,
    writeBody,
    patchMeta,
    mergeMeta,
    createEntry,
    branchPathOf,
    inboxPathOf,
    appendInbox,
    readInbox,
    updateInboxRow,
    deleteInboxRows,
    archiveEntry,
    keepLonger,
    recordCite,
    summarize: summarizeStats,
    absoluteOf,
  }
}

export type Store = ReturnType<typeof createStore>
