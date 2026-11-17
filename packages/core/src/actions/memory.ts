/**
 * actions/memory.ts —— 记忆条目自身的写操作（状态机 / 正文 / 归档）
 *
 * ## 为什么 memory 是最底层
 *
 * 依赖分析（拆分前实测）显示，跨领域调用只有两条：
 *   `compact → writeBody`（维护 → 记忆）
 *   `promoteInbox → writeBody`（INBOX → 记忆）
 *
 * 两条都指向本模块，而本模块**不反向依赖任何领域**。
 * 所以它先被创建，再作为参数传给 inbox / maintenance。
 * 这样不会出现循环引用，也不需要事件总线之类的间接层。
 *
 * ## 状态机的两条表必须分清楚
 *
 * `setStatus` 用的是 **`canHumanTransition`（人的表）**，不是 `canTransition`（自动的表）。
 * 这是踩过真事故的地方：早先用自动表校验，而待处理队列里最常见的就是
 * hypothesis，于是每次点「确认」都报「非法状态迁移：hypothesis → confirmed」，
 * 且总览入口连这句都不显示——用户看到的是「点了没反应」。
 * 详见 `schema.ts` 的 `HUMAN_STATE_TRANSITIONS` 注释。
 */

import {
  CONFIDENCE_STATES, STATE_CONFIDENCE, canHumanTransition,
  type ConfidenceState,
} from '../schema.ts'
import { inspectText, auditRecord } from '../privacy.ts'
import { guard, type ActionContext } from './context.ts'

/** 一条记忆写操作的结果形状。 */

/** 建记忆领域的能力集。 */
export function createMemoryActions({ store, now }: ActionContext) {
  /** 写回正文（保留 frontmatter）。带隐私闸门。 */
  async function writeBody({ path, body, session = 'plugin' }: {
    path: string; body: string; session?: string
  }) {
    const privacy = inspectText(body)
    if (privacy.blocked) {
      return {
        ok: false as const,
        kind: 'blocked' as const,
        blocked: true,
        reason: privacy.reason,
        masked: privacy.masked,
        audit: auditRecord(body, privacy.findings),
        hint: '正文里有疑似密钥，已拒写。改完再存，或用脱敏版本。',
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
      return {
        ok: false as const,
        kind: 'invalid-state' as const,
        error: `状态必须是 ${CONFIDENCE_STATES.join(' / ')}`,
        hint: '记忆状态只能是置信度状态机里的值。',
      }
    }
    if (status === 'rejected' && String(reason ?? '').trim() === '') {
      return {
        ok: false as const,
        kind: 'invalid-input' as const,
        error: '驳回必须写一句理由（30 天后可复查）',
        hint: '驳回会静默 30 天，没有理由就无法在复核时判断当初为什么否掉它。',
      }
    }
    return guard(async () => {
      const current = await store.readEntry(path)
      /**
       * 必须用**人**的迁移表，不是自动爬升的那张。
       * 这一条调用就是 UI 上「确认」按钮的实现，详见文件头注释。
       */
      if (!canHumanTransition(current.status, status)) {
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

  /**
   * 批量归档。
   *
   * 必须报出失败数：部分失败却返回「已归档 N 条」会让人以为清干净了。
   * 这是既有行为，拆分时保留。
   */
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

  return {
    writeBody, setStatus, confirm, reject, undoReject, archive, keep, batchArchive,
  }
}
