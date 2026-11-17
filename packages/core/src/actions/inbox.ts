/**
 * actions/inbox.ts —— 记录流（INBOX）的读与写
 *
 * ## 为什么单独成域
 *
 * INBOX 是**唯一会「满」的东西**：它是速记入口，撞到 80 行上限就写不进新的。
 * 所以它的读写有自己的语义（吞吐统计、行号定位、类型×状态矩阵），
 * 与「记忆条目」的语义完全不同——后者是经过沉淀的知识，前者是待流转的草稿。
 *
 * ## 类型 × 状态的合法性是这里的核心
 *
 * `KIND_STATES` 规定决策与想法**没有 todo 阶段**（定了就是定了，没有"在过程中"）。
 * `updateInbox` 会先读当前行拿到类型再判断，而不是信任调用方传的 patch ——
 * 因为 patch 里可能只带 state，类型得从库里拿。拒绝时要说清「这个类型支持哪些状态」，
 * 而不是只报「非法」。
 */

import {
  INBOX_KINDS, INBOX_STATES, estimateTokens, isStateAllowed, statesOfKind, truncate,
  type InboxKind, type InboxState,
} from '../schema.ts'
import { inspectText, auditRecord } from '../privacy.ts'
import { guard, type ActionContext, type ActionFailure } from './context.ts'
import type { MemoryEntry } from '../store.ts'

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
  /** 失败类别（与 ActionFailure 同一套枚举，见 errors.ts）。 */
  kind?: import('./errors.ts').ActionFailureKind
  hint?: string
}


export function createInboxActions({ store, now }: ActionContext) {
  /** 记录流全量 + 吞吐统计。 */
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
    if (text === '') {
      return {
        ok: false, kind: 'invalid-input' as const,
        error: '内容不能为空', hint: '写点内容再存。',
      }
    }
    if (!INBOX_KINDS.includes(kind as InboxKind)) {
      return {
        ok: false, kind: 'invalid-input' as const,
        error: `类型必须是 ${INBOX_KINDS.join(' / ')}`, hint: '从这五个类型里选一个。',
      }
    }
    const privacy = inspectText(text)
    if (privacy.blocked) {
      return {
        ok: false,
        kind: 'blocked' as const,
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
    if (lines.length === 0) {
      return {
        ok: false as const, kind: 'invalid-input' as const,
        error: '没有可捕获的内容', hint: '输入为空，没有可存的条目。',
      }
    }
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

      /**
       * 按**当前行的类型**校验状态是否合法。
       *
       * 为什么读一次当前行而不是直接信任 patch：`patch` 里可能只带 `state`，
       * 这时类型来自库里已有的那行。拿不到类型就没法判断
       * 「给决策标 todo」该不该拒——先读再判，不靠调用方自觉。
       *
       * 拒绝时要说清「这个类型支持哪些状态」，而不是只报「非法」：
       * 用户看到的应该是「决策没有进行中，只有 open / done / dropped」。
       */
      if (typeof patch.state === 'string') {
        const before = await store.readInbox(domain)
        const current = before.entries.find(entry => entry.lineIndex === lineIndex)
        const effectiveKind = typeof patch.kind === 'string' ? patch.kind : current?.kind ?? ''
        if (effectiveKind !== '' && !isStateAllowed(effectiveKind, patch.state)) {
          const allowed = statesOfKind(effectiveKind)
          throw new Error(
            `「${effectiveKind}」不支持状态 ${patch.state}，可用：${allowed.join(' / ')}`
            + (allowed.length < INBOX_STATES.length
              ? '（该类型没有「进行中」这个阶段）'
              : ''),
          )
        }
      }

      const result = await store.updateInboxRow({ domain, lineIndex, patch })
      /**
       * 进入 todo 时记一条事件，作为「开始时间」。
       *
       * 为什么不加表格列：INBOX 是 5 列固定契约，加列会让所有存量行错位。
       * 而"什么时候开始的"天然是**事件**而不是状态——状态只说明现在，
       * 事件才能回答"开了头多久没结"。
       */
      if (patch.state === 'todo' && result.row !== null) {
        await store.appendEvent({
          session, kind: 'inbox-start',
          query: String(result.row.content ?? '').slice(0, 60),
        })
      }
      await store.appendEvent({
        session, kind: 'inbox-update',
        query: String(result.row?.content ?? '').slice(0, 60),
      })
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
      return {
        ok: false as const, kind: 'invalid-state' as const,
        error: `状态必须是 ${INBOX_STATES.join(' / ')}`,
        hint: 'INBOX 的合法状态是 open / todo / done / dropped。',
      }
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
        created = await store.writeBody(
          relPath,
          `${existing.body.trimEnd()}\n\n## ${date} 提升\n\n${row.content}\n`,
        )
      }
      await store.updateInboxRow({ domain, lineIndex, patch: { state: 'done', destination: relPath } })
      await store.appendEvent({
        session, kind: 'promote', ids: [created.id], query: row.content.slice(0, 60),
      })
      return {
        promoted: { path: relPath, id: created.id },
        inbox: { lineIndex, state: 'done', destination: relPath },
      }
    })
  }

  return {
    inbox, capture, captureBatch, updateInbox, deleteInbox, batchInboxState, promoteInbox,
  }
}

/** 供其它模块复用的常量（避免各自 import schema）。 */
export { INBOX_KINDS, INBOX_STATES, estimateTokens }
