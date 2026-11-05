/**
 * 能力层 —— 30 条能力的**唯一实现**，host 路由与 agent 工具都调这里。
 *
 * 为什么要有这一层：如果 HTTP 桥和工具各写一份「改状态」，
 * 三个月后两条路径的行为必然分叉（Web 端与插件端已经踩过一次）。
 * 所以能力只有一份，两端口只是传输方式不同。
 */

import {
  CONFIDENCE_STATES, INBOX_KINDS, INBOX_STATES, STATE_CONFIDENCE, MISS_VERIFY_DAYS,
  FILE_LINE_LIMIT, FILE_TOKEN_SOFT_LIMIT, RESIDENT_TOKEN_BUDGET,
  canTransition, estimateTokens, expiryOf, needsDecision, orEmpty, truncate,
  type InboxKind, type InboxState, type ConfidenceState,
} from './schema.ts'
import { searchEntries, searchCost, type SearchHit } from './search.ts'
import { inspectText, auditRecord } from './privacy.ts'
import { parseSections } from './parse.ts'
import type { MemoryEntry, Store } from './store.ts'

/** 一个常驻 skill 的 description（每请求付费的那部分）。 */
export interface ResidentSkill {
  name: string
  path: string
  description: string
  descriptionTokens: number
}

/**
 * `<available_skills>` 目录的固定框架文字（实测 171 tokens）。
 * 这部分与 skill 数量无关，是宿主注入的固定开销；
 * 记在这里是为了让「常驻前缀」的口径可复算，而不是凭印象。
 */
export const SKILL_CATALOG_FRAME_TOKENS = 171

/** 统一的失败结果。 */
export interface ActionFailure {
  ok: false
  error?: string
  /** 命中隐私闸门。 */
  blocked?: boolean
  /** 拦截原因（人可读）。 */
  reason?: string
  /** 脱敏后的可用文本。 */
  masked?: string
  /** 审计记录（不含原文）。 */
  audit?: ReturnType<typeof auditRecord>
  hint?: string
}

/** 捕获成功的结果。 */
export interface CaptureSuccess {
  ok: true
  captured: { path: string; row: unknown }
  privacy: { blocked: false }
}

/** 捕获结果。 */
export type CaptureOutcome = CaptureSuccess | ActionFailure

/** 批量捕获结果。 */
export interface CaptureBatchOutcome {
  ok: boolean
  accepted?: string[]
  blocked?: { line: string; reason: string }[]
  total?: number
  error?: string
}

/** 统一包装：所有能力都返回 `{ ok, ... }`。 */
async function guard<T extends object>(run: () => Promise<T>): Promise<{ ok: true } & T | ActionFailure> {
  try {
    return { ok: true, ...(await run()) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/** 条目的对外投影（UI 只需要这些字段）。 */
function projectEntry(entry: MemoryEntry, nowMs: number) {
  return {
    id: entry.id,
    path: entry.path,
    title: entry.title,
    domain: entry.domain,
    domainLabel: entry.domainLabel,
    project: entry.project,
    layer: entry.layer,
    status: entry.status,
    confidence: entry.confidence ?? STATE_CONFIDENCE[entry.status as ConfidenceState] ?? null,
    kind: entry.kind,
    tags: entry.tags,
    tokens: entry.tokens,
    bytes: entry.bytes,
    lines: entry.lines,
    overLineLimit: entry.overLineLimit,
    pinned: entry.pinned,
    updatedAt: entry.updatedAt,
    origin: entry.origin,
    evidence: entry.evidence,
    anchor: entry.anchor,
    expiry: expiryOf(entry, nowMs),
  }
}

/** 建能力集合。 */
export function createActions({ store, now = () => Date.now() }: {
  store: Store
  now?: () => number
}) {
  /** 读全量并附派生字段。 */
  async function snapshot({ project, domain }: { project?: string | null; domain?: string | null } = {}) {
    return guard(async () => {
      const entries = await store.scan()
      const events = await store.readEvents()
      const misses = await store.readMisses()

      const filtered = entries.filter((entry) => {
        if (project !== undefined && project !== null && project !== '' && entry.project !== project) return false
        if (domain !== undefined && domain !== null && domain !== '' && entry.domain !== domain) return false
        return true
      })

      // **统计必须跟着过滤走**。
      // 早先用全量 entries 算 stats，导致「本项目」分区在该项目 0 条记忆时
      // 仍显示常驻前缀 286——一个自相矛盾的画面（0 条 + 286 tokens）。
      // 项目视图要回答的是「这个项目占多少」，不是「整个库占多少」。
      const scoped = project !== undefined && project !== null && project !== ''
        || domain !== undefined && domain !== null && domain !== ''
      const stats = store.summarize(scoped ? filtered : entries, events, misses, { nowMs: now() })

      const queue = filtered
        .filter(entry => needsDecision(entry, now()) || entry.status === 'stale')
        .map((entry) => {
          const expiry = expiryOf(entry, now())
          const kind = entry.status === 'stale'
            ? 'anchor'
            : expiry.level === 'retire' ? 'retire' : 'confirm'
          return {
            id: entry.id,
            path: entry.path,
            title: entry.title,
            domain: entry.domain,
            domainLabel: entry.domainLabel,
            status: entry.status,
            confidence: entry.confidence ?? STATE_CONFIDENCE[entry.status as ConfidenceState] ?? null,
            kind,
            evidence: (entry.evidence ?? []).slice(0, 1),
            origin: entry.origin,
            days: expiry.days,
            reason: kind === 'retire'
              ? `${expiry.days} 天未被引用`
              : kind === 'anchor' ? '锚点失效，待复核' : '推断待确认',
          }
        })
        .sort((a, b) => (b.days ?? 0) - (a.days ?? 0))

      return {
        root: store.root,
        projectScoped: project !== undefined && project !== null && project !== '',
        project: project ?? null,
        domain: domain ?? null,
        entries: filtered.map(entry => projectEntry(entry, now())),
        stats,
        queue,
        /**
         * 统计口径：`all` = 全库；`scoped` = 仅当前 project/domain。
         * UI 据此说明「这个数字覆盖了什么」，避免与总览的全库数字混淆。
         */
        statsScope: scoped ? 'scoped' : 'all',
        /** 当前项目自己的常驻索引（layer: l0）文件，供「本项目」分区展示。 */
        projectIndex: filtered
          .filter(entry => entry.layer === 'l0')
          .map(entry => ({ path: entry.path, title: entry.title, tokens: entry.tokens })),
        generatedAt: new Date(now()).toISOString(),
      }
    })
  }

  /**
   * 常驻前缀逐项拆解 —— 回答「这 N 个 tokens 到底是什么」。
   *
   * 拆成三类，因为它们**付费方式完全不同**，混在一起就会得出错误结论：
   *   1. `catalog`：skill description + `<available_skills>` 框架，**每个请求都付费**
   *   2. `index`：`layer: l0` 的索引文件，只在被 read 时才进上下文
   *   3. `frame`：其余固定文字
   *
   * 为什么必须拆开：product.md 把「两个 skill description」与「L0 索引文件」
   * 都记作「常驻前缀 286 tokens」，但实测前者是 190 + 171 框架 = 361，
   * 后者是 286。两个数字对不上，说明口径本身有歧义——而这个歧义会直接
   * 导致「该优化哪个」判断错。
   */
  function residentBreakdown(entries: MemoryEntry[], skills: ResidentSkill[]) {
    const indexItems = entries
      .filter(entry => entry.layer === 'l0')
      .map(entry => ({
        kind: 'index' as const,
        id: entry.id,
        path: entry.path,
        title: entry.title,
        tokens: entry.tokens,
        bytes: entry.bytes,
        lines: entry.lines,
        overLineLimit: entry.overLineLimit,
        // 索引是否真的进上下文，取决于它有没有被 skill 目录引用
        billed: false,
        note: '仅在被 read 时进上下文',
      }))

    const catalogItems = skills.map(skill => ({
      kind: 'catalog' as const,
      id: `skill.${skill.name}`,
      path: skill.path,
      title: skill.name,
      tokens: skill.descriptionTokens,
      bytes: skill.description.length,
      lines: 1,
      overLineLimit: false,
      billed: true,
      note: 'skill description，每请求付费',
    }))

    const indexTokens = indexItems.reduce((sum, item) => sum + item.tokens, 0)
    const catalogTokens = catalogItems.reduce((sum, item) => sum + item.tokens, 0)

    return {
      items: [...catalogItems, ...indexItems],
      catalogTokens,
      indexTokens,
      frameTokens: SKILL_CATALOG_FRAME_TOKENS,
      /** 真正每请求付费的部分：catalog + 框架。 */
      billedTokens: catalogTokens + SKILL_CATALOG_FRAME_TOKENS,
      /** 标了 l0 但按需加载的部分。 */
      onDemandTokens: indexTokens,
    }
  }

  /** 总览：KPI + 预算账本 + 三率 + 域统计。 */
  async function overview({ skillDescriptions = [] }: {
    skillDescriptions?: ResidentSkill[]
  } = {}) {
    return guard(async () => {
      const entries = await store.scan()
      const events = await store.readEvents()
      const misses = await store.readMisses()
      const stats = store.summarize(entries, events, misses, { nowMs: now() })
      const l0 = stats.layers.l0.tokens
      const resident = residentBreakdown(entries, skillDescriptions)
      return {
        kpi: {
          residentTokens: l0,
          residentBudget: RESIDENT_TOKEN_BUDGET,
          hitRate: stats.rates.hitRate,
          confirmRate: stats.rates.confirmRate,
          expireRate: stats.rates.expireRate,
          pending: stats.counts.pending,
        },
        resident,
        budget: [
          { layer: 'L0', name: '常驻层', tokens: l0, files: stats.layers.l0.files, limit: RESIDENT_TOKEN_BUDGET },
          { layer: 'L1', name: '索引层', tokens: stats.layers.l1.tokens, files: stats.layers.l1.files, limit: 2048 },
          { layer: 'L2', name: '详情层', tokens: stats.layers.l2.tokens, files: stats.layers.l2.files, limit: null },
        ],
        domains: stats.domains,
        rates: stats.rates,
        counts: stats.counts,
        misses: stats.misses,
        files: stats.files,
        bytes: stats.bytes,
        tokens: stats.tokens,
        overLimit: stats.overLimit,
        cacheNote: '改常驻前缀会作废当前会话 KV cache（实测单次 20–57 万 tokens），攒批改。',
      }
    })
  }

  /** 记录流：INBOX 全量 + 吞吐统计。 */
  async function inbox({ domain = 'personal', state, kind }: {
    domain?: string | null; state?: string; kind?: string
  } = {}) {
    return guard(async () => {
      const result = await store.readInbox(domain)
      let entries = result.entries.map((entry, index) => ({ ...entry, index }))
      if (typeof state === 'string' && state !== '') entries = entries.filter(entry => entry.state === state)
      if (typeof kind === 'string' && kind !== '') entries = entries.filter(entry => entry.kind === kind)
      const all = result.entries
      return {
        path: result.path,
        exists: result.exists,
        entries,
        throughput: {
          total: all.length,
          open: all.filter(entry => entry.state === 'open').length,
          todo: all.filter(entry => entry.state === 'todo').length,
          done: all.filter(entry => entry.state === 'done').length,
          dropped: all.filter(entry => entry.state === 'dropped').length,
          toPromote: all.filter(entry => entry.state === 'done'
            && (entry.destination === '' || entry.destination === '—')).length,
          invalidKind: all.filter(entry => !entry.kindValid).length,
          invalidState: all.filter(entry => !entry.stateValid).length,
        },
        kinds: [...INBOX_KINDS],
        states: [...INBOX_STATES],
      }
    })
  }

  /** 捕获一条（带隐私闸门）。 */
  async function capture({ content, kind = '想法', domain = 'personal', session = 'plugin' }: {
    content: string; kind?: string; domain?: string; session?: string
  }): Promise<CaptureOutcome> {
    const text = String(content ?? '').trim()
    if (text === '') return { ok: false, error: '内容不能为空' }
    if (!INBOX_KINDS.includes(kind as InboxKind)) {
      return { ok: false, error: `类型必须是 ${INBOX_KINDS.join(' / ')}` }
    }
    const privacy = inspectText(text)
    if (privacy.blocked) {
      return {
        ok: false,
        blocked: true,
        reason: privacy.reason,
        masked: privacy.masked,
        audit: auditRecord(text, privacy.findings),
        hint: '命中隐私闸门，已拒写。可用脱敏后的文本重存。',
      }
    }
    return guard(async () => {
      const result = await store.appendInbox({ domain, kind, content: text })
      await store.appendEvent({ session, kind: 'capture', query: text.slice(0, 80), ids: [] })
      return { captured: result, privacy: { blocked: false as const } }
    }) as Promise<CaptureOutcome>
  }

  /** 批量捕获（换行或分号分隔）。 */
  async function captureBatch({ text, kind = '想法', domain = 'personal', session = 'plugin' }: {
    text: string; kind?: string; domain?: string; session?: string
  }): Promise<CaptureBatchOutcome> {
    const lines = String(text ?? '')
      .split(/\n|;/)
      .map(line => line.trim())
      .filter(Boolean)
    if (lines.length === 0) return { ok: false as const, error: '没有可捕获的内容' }
    const accepted: string[] = []
    const blocked: { line: string; reason: string }[] = []
    for (const line of lines) {
      const result = await capture({ content: line, kind, domain, session })
      if (result.ok) accepted.push(line)
      else blocked.push({ line, reason: result.reason ?? result.error ?? '未知原因' })
    }
    return { ok: true as const, accepted, blocked, total: lines.length }
  }

  /** 改一条记录流的状态 / 类型 / 去向。 */
  async function updateInbox({ domain, lineIndex, patch = {}, session = 'plugin' }: {
    domain?: string | null
    lineIndex: number
    patch?: Record<string, string>
    session?: string
  }) {
    return guard(async () => {
      if (typeof patch.state === 'string' && !INBOX_STATES.includes(patch.state as InboxState)) {
        throw new Error(`状态必须是 ${INBOX_STATES.join(' / ')}`)
      }
      if (typeof patch.kind === 'string' && !INBOX_KINDS.includes(patch.kind as InboxKind)) {
        throw new Error(`类型必须是 ${INBOX_KINDS.join(' / ')}`)
      }
      const result = await store.updateInboxRow({ domain, lineIndex, patch })
      await store.appendEvent({ session, kind: 'inbox-update', query: String(result.row?.content ?? '').slice(0, 60) })
      return { updated: result }
    })
  }

  /** 删除一条 / 多条记录流（行号从大往小删，不漂移）。 */
  async function deleteInbox({ domain, lineIndexes = [], session = 'plugin' }: {
    domain?: string | null; lineIndexes?: number[]; session?: string
  }) {
    return guard(async () => {
      const result = await store.deleteInboxRows({ domain, lineIndexes })
      await store.appendEvent({ session, kind: 'inbox-delete', query: `删除 ${result.removed} 行` })
      return { removed: result.removed, path: result.path }
    })
  }

  /** 批量流转状态。 */
  async function batchInboxState({ domain, lineIndexes = [], state, session = 'plugin' }: {
    domain?: string | null; lineIndexes?: number[]; state: string; session?: string
  }) {
    if (!INBOX_STATES.includes(state as InboxState)) {
      return { ok: false as const, error: `状态必须是 ${INBOX_STATES.join(' / ')}` }
    }
    const updated: number[] = []
    const failed: { lineIndex: number; error?: string }[] = []
    // 改状态不增删行，行号稳定；倒序只是为了让失败更早暴露
    for (const lineIndex of [...lineIndexes].sort((a, b) => b - a)) {
      const result = await updateInbox({ domain, lineIndex, patch: { state }, session })
      if (result.ok) updated.push(lineIndex)
      else failed.push({ lineIndex, error: result.error })
    }
    return { ok: true as const, updated, failed }
  }

  /** 提升一条记录到档案：在目标域新建/追加条目，并把 INBOX 标 done + 去向。 */
  async function promoteInbox({ domain, lineIndex, target, session = 'plugin' }: {
    domain?: string | null; lineIndex: number; target?: string; session?: string
  }) {
    return guard(async () => {
      const result = await store.readInbox(domain)
      const row = result.entries.find(entry => entry.lineIndex === lineIndex)
      if (row === undefined) throw new Error(`第 ${lineIndex + 1} 行不是 INBOX 条目`)
      const date = new Date(now()).toISOString().slice(0, 10)
      const targetPath = String(target ?? '').trim() !== ''
        ? String(target).trim()
        : `personal/notes/INBOX-提升-${date}.md`
      const relPath = targetPath.endsWith('.md') ? targetPath : `${targetPath}.md`
      const body = `\n# ${row.content}\n\n> 由 INBOX 于 ${date} 提升。类型：${row.kind}。\n\n${row.content}\n`
      let created: MemoryEntry
      try {
        created = await store.createEntry({
          relPath,
          frontmatter: {
            title: truncate(row.content, 40),
            kind: 'fact',
            layer: 'l2',
            status: 'confirmed',
            confidence: 0.9,
            origin: 'G1',
            updated: date,
          },
          body,
        })
      } catch {
        // 目标已存在 → 追加到正文末尾
        const existing = await store.readEntry(relPath)
        created = await store.writeBody(relPath, `${existing.body.trimEnd()}\n\n## ${date} 提升\n\n${row.content}\n`)
      }
      await store.updateInboxRow({ domain, lineIndex, patch: { state: 'done', destination: relPath } })
      await store.appendEvent({ session, kind: 'promote', ids: [created.id], query: row.content.slice(0, 60) })
      return { promoted: { path: relPath, id: created.id }, inbox: { lineIndex, state: 'done', destination: relPath } }
    })
  }

  /** 检索（同样记账未命中）。 */
  async function search({ query, project, session = 'plugin', record = true }: {
    query: string; project?: string | null; session?: string; record?: boolean
  }) {
    return guard(async () => {
      const entries = await store.scan()
      const result = searchEntries(entries, query, { project })
      if (record) {
        if (result.matched) {
          await store.recordCite({ ids: result.hits.map(hit => hit.id), kind: 'recall', session, query: result.query })
        } else {
          await store.recordMiss({ query: result.query, session })
        }
      }
      return {
        query: result.query,
        matched: result.matched,
        hits: result.hits.slice(0, 20),
        total: result.hits.length,
        cost: searchCost(result.hits.slice(0, 20)),
      }
    })
  }

  /** 一条记忆的详情（含证据链、锚点、引用记录）。 */
  async function detail({ path }: { path: string }) {
    return guard(async () => {
      const entry = await store.readEntry(path)
      const events = await store.readEvents()
      const refs = events.filter(event => (event.ids ?? []).includes(entry.id))
      const cites = refs.filter(event => event.kind === 'cite')
      const lastCite = cites.length === 0 ? null : cites[cites.length - 1].at
      return {
        entry: {
          ...projectEntry(entry, now()),
          overTokenLimit: entry.tokens > FILE_TOKEN_SOFT_LIMIT,
          body: entry.body,
        },
        trust: {
          confidence: entry.confidence ?? STATE_CONFIDENCE[entry.status as ConfidenceState] ?? null,
          evidenceCount: (entry.evidence ?? []).length,
          citeCount: cites.length,
          recallCount: refs.filter(event => event.kind === 'recall').length,
          lastCitedAt: lastCite,
          anchor: entry.anchor,
          anchorState: entry.status === 'stale' ? 'stale' : entry.anchor === null ? 'none' : 'fresh',
        },
        references: refs.slice(-20).reverse(),
        states: [...CONFIDENCE_STATES],
        sections: parseSections(entry.body).map(section => ({
          title: section.title, level: section.level, lines: section.lines.length,
        })),
      }
    })
  }

  /** 编辑正文（源码单模式）。 */
  async function writeBody({ path, body, session = 'plugin' }: {
    path: string; body: string; session?: string
  }) {
    const privacy = inspectText(body)
    if (privacy.blocked) {
      return {
        ok: false as const,
        blocked: true,
        reason: privacy.reason,
        masked: privacy.masked,
        audit: auditRecord(body, privacy.findings),
      }
    }
    return guard(async () => {
      const entry = await store.writeBody(path, body)
      await store.appendEvent({ session, kind: 'write', ids: [entry.id] })
      return { entry: { id: entry.id, path: entry.path, tokens: entry.tokens, lines: entry.lines } }
    })
  }

  /** 改状态（含驳回、确认、降级）。 */
  async function setStatus({ path, status, reason, session = 'plugin' }: {
    path: string; status: string; reason?: string; session?: string
  }) {
    if (!CONFIDENCE_STATES.includes(status as ConfidenceState)) {
      return { ok: false as const, error: `状态必须是 ${CONFIDENCE_STATES.join(' / ')}` }
    }
    if (status === 'rejected' && String(reason ?? '').trim() === '') {
      return { ok: false as const, error: '驳回必须写一句理由（30 天后可复查）' }
    }
    return guard(async () => {
      const current = await store.readEntry(path)
      if (!canTransition(current.status, status)) {
        throw new Error(`非法状态迁移：${current.status} → ${status}`)
      }
      const patch: Record<string, unknown> = {
        status,
        confidence: STATE_CONFIDENCE[status as ConfidenceState] ?? current.confidence,
      }
      if (status === 'rejected') {
        patch.refuted_reason = String(reason).trim()
        patch.refuted_at = new Date(now()).toISOString()
      }
      if (status === 'confirmed') patch.confirmed_at = new Date(now()).toISOString()
      const entry = await store.patchMeta(path, patch)
      await store.appendEvent({
        session, kind: 'status', ids: [entry.id], query: `${current.status} → ${status}`,
      })
      return { entry: { id: entry.id, path: entry.path, status: entry.status } }
    })
  }

  /** 确认推断。 */
  async function confirm({ path, session = 'plugin' }: { path: string; session?: string }) {
    return setStatus({ path, status: 'confirmed', session })
  }

  /** 驳回推断（30 天静默）。 */
  async function reject({ path, reason, session = 'plugin' }: {
    path: string; reason: string; session?: string
  }) {
    return setStatus({ path, status: 'rejected', reason, session })
  }

  /** 撤销驳回。 */
  async function undoReject({ path, session = 'plugin' }: { path: string; session?: string }) {
    return setStatus({ path, status: 'reinforced', session })
  }

  /** 归档退役。 */
  async function archive({ path, reason = '到期退役', session = 'plugin' }: {
    path: string; reason?: string; session?: string
  }) {
    return guard(async () => {
      const result = await store.archiveEntry({ relPath: path, reason })
      await store.appendEvent({ session, kind: 'archive', ids: [path] })
      return { archived: result }
    })
  }

  /** 再留 90 天。 */
  async function keep({ path, session = 'plugin' }: { path: string; session?: string }) {
    return guard(async () => {
      const entry = await store.keepLonger({ relPath: path })
      await store.appendEvent({ session, kind: 'keep', ids: [entry.id] })
      return { kept: { id: entry.id, path: entry.path, updatedAt: entry.updatedAt } }
    })
  }

  /** 批量归档。 */
  async function batchArchive({ paths = [], reason = '批量退役', session = 'plugin' }: {
    paths?: string[]; reason?: string; session?: string
  }) {
    const archived: { from: string; to: string }[] = []
    const failed: { path: string; error?: string }[] = []
    for (const path of paths) {
      const result = await archive({ path, reason, session })
      if (result.ok) archived.push(result.archived)
      else failed.push({ path, error: result.error })
    }
    return { ok: true as const, archived, failed }
  }

  /** 未命中工作台：全量聚类 + 五态流水线。 */
  async function misses() {
    return guard(async () => {
      const list = await store.readMisses()
      const pipeline: Record<string, {
        query: string; count: number; at: string; lastAt: string; state: string
        drafts: string[]; wastedTokens: number
      }[]> = {
        observing: [], 'should-fill': [], drafting: [], verifying: [], verified: [],
      }
      for (const miss of list) {
        const state = miss.state ?? 'observing'
        const bucket = pipeline[state] ?? pipeline.observing
        bucket.push({
          query: miss.query,
          count: miss.count ?? 1,
          at: miss.at,
          lastAt: miss.lastAt ?? miss.at,
          state,
          drafts: miss.drafts ?? [],
          // 平均多花多少 token：一次未命中意味着模型多试一轮，按 120 tokens 估
          wastedTokens: (miss.count ?? 1) * 120,
        })
      }
      return {
        pipeline,
        total: list.length,
        conversion: list.length === 0 ? null : pipeline.verified.length / list.length,
        verifyDays: MISS_VERIFY_DAYS,
      }
    })
  }

  /** 未命中 → 草稿（必须人确认才落库）。 */
  async function missDraft({ query, type = '问题', session = 'plugin' }: {
    query: string; type?: string; session?: string
  }) {
    if (!INBOX_KINDS.includes(type as InboxKind)) {
      return { ok: false as const, error: `类型必须是 ${INBOX_KINDS.join(' / ')}` }
    }
    return guard(async () => {
      const updated = await store.updateMiss({ query, state: 'drafting' })
      const draft = {
        query,
        type,
        title: truncate(query, 40),
        content: `关于「${query}」的结论：`,
        at: new Date(now()).toISOString(),
      }
      await store.updateMiss({ query, draftId: `${query}@${draft.at}` })
      await store.appendEvent({ session, kind: 'miss-draft', query })
      return { draft, miss: updated }
    })
  }

  /** 草稿确认 → 落库 → 进入 7 天验证期。 */
  async function missConfirm({ query, content, type = '问题', domain = 'personal', session = 'plugin' }: {
    query: string; content: string; type?: string; domain?: string; session?: string
  }) {
    return guard(async () => {
      const text = String(content ?? '').trim()
      if (text === '') throw new Error('草稿内容不能为空')
      const privacy = inspectText(text)
      if (privacy.blocked) {
        return {
          ok: false as const,
          blocked: true,
          reason: privacy.reason,
          masked: privacy.masked,
        }
      }
      const date = new Date(now()).toISOString().slice(0, 10)
      const slug = text.slice(0, 24).replace(/[^\w\u4e00-\u9fff-]+/g, '-')
      const relPath = `${domain}/misses/${date}-${slug}.md`
      const entry = await store.createEntry({
        relPath,
        frontmatter: {
          title: truncate(query, 40),
          kind: 'fact',
          layer: 'l2',
          status: 'observed',
          confidence: 0.5,
          origin: 'G2',
          evidence: [{ session, excerpt: text.slice(0, 120), gate: 'G2' }],
        },
        body: `\n# ${query}\n\n${text}\n`,
      })
      const updated = await store.updateMiss({ query, state: 'verifying', draftId: entry.id })
      await store.appendEvent({ session, kind: 'miss-confirm', ids: [entry.id], query })
      return {
        entry: { id: entry.id, path: relPath },
        miss: updated,
        verifyUntil: new Date(now() + MISS_VERIFY_DAYS * 86_400_000).toISOString(),
        draftType: type,
      }
    })
  }

  /** 批量生成草稿。 */
  async function missBatchDraft({ queries = [], type = '问题', session = 'plugin' }: {
    queries?: string[]; type?: string; session?: string
  }) {
    const drafts: unknown[] = []
    const failed: { query: string; error?: string }[] = []
    for (const query of queries) {
      const result = await missDraft({ query, type, session })
      if (result.ok) drafts.push(result.draft)
      else failed.push({ query, error: result.error })
    }
    return { ok: true as const, drafts, failed }
  }

  /** 删除未命中。 */
  async function missDelete({ query }: { query: string }) {
    return guard(async () => ({ removed: await store.deleteMiss(query) }))
  }

  /** 导出：markdown / json，支持按域过滤。 */
  async function exportData({ format = 'markdown', domain }: {
    format?: string; domain?: string | null
  } = {}) {
    return guard(async () => {
      const entries = await store.scan()
      const scoped = domain === undefined || domain === null || domain === ''
        ? entries
        : entries.filter(entry => entry.domain === domain)
      const stamp = new Date(now()).toISOString().slice(0, 10)
      if (format === 'json') {
        return {
          filename: `memory-ops-${domain ?? 'all'}-${stamp}.json`,
          content: JSON.stringify(scoped.map(entry => ({
            id: entry.id,
            path: entry.path,
            domain: entry.domain,
            title: entry.title,
            layer: entry.layer,
            status: entry.status,
            confidence: entry.confidence,
            tags: entry.tags,
            updatedAt: entry.updatedAt,
            tokens: entry.tokens,
            evidence: entry.evidence,
            body: entry.body,
          })), null, 2),
          count: scoped.length,
        }
      }
      const parts = [`# 记忆库导出 · ${stamp}`, '', `共 ${scoped.length} 条，域：${domain ?? '全部'}`, '']
      for (const entry of scoped) {
        parts.push(
          `## ${entry.title}`, '',
          `- 路径：${entry.path}`,
          `- 域：${entry.domainLabel}`,
          `- 层：${entry.layer}`,
          `- 状态：${entry.status}`,
          `- tokens：${entry.tokens}`, '',
          entry.body.trim(), '',
        )
      }
      return {
        filename: `memory-ops-${domain ?? 'all'}-${stamp}.md`,
        content: parts.join('\n'),
        count: scoped.length,
      }
    })
  }

  /** 会话记忆：本次注入 / 引用 / 未命中 + 为什么注入。 */
  async function sessionMemory({ query, project, sessionId }: {
    query?: string; project?: string | null; sessionId?: string
  } = {}) {
    return guard(async () => {
      const entries = await store.scan()
      const events = await store.readEvents()
      const recent = events.slice(-200)
      const injected = recent.filter(event => event.kind === 'recall').slice(-10)
      const cited = recent.filter(event => event.kind === 'cite').slice(-10)
      const missesRecent = recent.filter(event => event.kind === 'miss').slice(-10)
      const reasons: {
        id: string; title: string; why: string
        anchor: Record<string, string> | null; tokens: number
      }[] = []
      if (typeof query === 'string' && query.trim() !== '') {
        const result = searchEntries(entries, query, { project })
        for (const hit of result.hits.slice(0, 5)) {
          reasons.push({
            id: hit.id,
            title: hit.title,
            why: `关键词命中：${result.terms.join(' ')}`,
            anchor: entries.find(entry => entry.id === hit.id)?.anchor ?? null,
            tokens: hit.tokens,
          })
        }
      }
      return {
        sessionId: sessionId ?? null,
        injected: injected.reduce((sum, event) => sum + (event.ids ?? []).length, 0),
        cited: cited.reduce((sum, event) => sum + (event.ids ?? []).length, 0),
        missed: missesRecent.length,
        reasons,
        recentInjected: injected,
        recentMisses: missesRecent,
      }
    })
  }

  /** 库健康：待处理 / 超限 / 驳回静默 / 三率。 */
  async function health() {
    return guard(async () => {
      const entries = await store.scan()
      const events = await store.readEvents()
      const misses = await store.readMisses()
      const stats = store.summarize(entries, events, misses, { nowMs: now() })
      const silenced = entries.filter((entry) => {
        if (entry.status !== 'rejected') return false
        const at = Date.parse(entry.refutedAt ?? '')
        return Number.isFinite(at) && now() - at < 30 * 86_400_000
      })
      return {
        rates: stats.rates,
        counts: stats.counts,
        overLimit: stats.overLimit,
        silenced: silenced.map(entry => ({ id: entry.id, path: entry.path, title: entry.title })),
        stale: entries
          .filter(entry => expiryOf(entry, now()).level !== 'fresh')
          .map(entry => ({ id: entry.id, path: entry.path, title: entry.title, ...expiryOf(entry, now()) })),
        lineLimit: FILE_LINE_LIMIT,
        tokenSoftLimit: FILE_TOKEN_SOFT_LIMIT,
      }
    })
  }

  /** 索引表：L1 层，回答「我能查什么 / 该读哪个文件」。 */
  async function index({ domain }: { domain?: string | null } = {}) {
    return guard(async () => {
      const entries = await store.scan()
      const scoped = domain === undefined || domain === null || domain === ''
        ? entries
        : entries.filter(entry => entry.domain === domain)
      const rows = scoped
        .filter(entry => entry.layer === 'l0' || entry.layer === 'l1' || entry.path.endsWith('index.md'))
        .map(entry => ({
          path: entry.path,
          title: entry.title,
          domain: entry.domain,
          layer: entry.layer,
          tokens: entry.tokens,
        }))
      return {
        rows,
        residentTokens: scoped.filter(entry => entry.layer === 'l0').reduce((sum, entry) => sum + entry.tokens, 0),
      }
    })
  }

  return {
    snapshot, overview, inbox, capture, captureBatch, updateInbox, deleteInbox,
    batchInboxState, promoteInbox, search, detail, writeBody, setStatus, confirm,
    reject, undoReject, archive, keep, batchArchive, misses, missDraft, missConfirm,
    missBatchDraft, missDelete, export: exportData, sessionMemory, health, index,
    store,
  }
}

export type Actions = ReturnType<typeof createActions>
export type { SearchHit }
export { estimateTokens, orEmpty }
