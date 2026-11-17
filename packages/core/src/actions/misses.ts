/**
 * actions/misses.ts —— 未命中流水线（五态）
 *
 * ## 这是系统的输入侧
 *
 * 「命中率是结果，未命中才是输入」。五态：
 *   观察中(observing) → 该补了(should-fill) → 草稿待确认(drafting)
 *   → 验证期内(verifying) → 已验证生效(verified)
 *
 * 草稿**必须人点确认才落库**——自动写库会产生无法审计的臆想。
 *
 * ## 排序口径只有一处实现
 *
 * `misses()` 支持三种排序：
 *   frequency  哪条问得最多 → 该先补哪条（默认）
 *   recent     最近在问什么 → 与当前任务相关的可能性大
 *   breadth    多少会话都在问 → 共性问题优先
 *
 * 早先固定按频率，注释写着「排序口径只该有一处」——那条原则是对的，
 * 但结论错了：**口径应该可切换，实现应该只有一处**。现在这一处就是这里。
 * 若让 UI 自己排序，两端必然分叉（§14.4 记过同型事故）。
 */

import { INBOX_KINDS, MISS_VERIFY_DAYS, truncate, type InboxKind } from '../schema.ts'
import { inspectText } from '../privacy.ts'
import { guard, type ActionContext } from './context.ts'


export function createMissActions({ store, now }: ActionContext) {
  /** 未命中工作台：五态流水线 + 统计。 */
  async function misses({ sort = 'frequency' }: { sort?: string } = {}) {
    return guard(async () => {
      const list = await store.readMisses()
      const pipeline: Record<string, {
        query: string; count: number; at: string; lastAt: string; state: string
        drafts: string[]; wastedTokens: number
        /** 出现过的会话数（比 count 更能说明是不是共性问题）。 */
        sessions: number
        /** 验证期内已命中次数（满 3 次转「已验证生效」）。 */
        hits: number
        /** 验证期剩余天数；不在验证期时为 null。 */
        remainingDays: number | null
        /** 草稿落库路径（验证期内点开能跳过去）。 */
        draftPath: string | null
      }[]> = {
        observing: [], 'should-fill': [], drafting: [], verifying: [], verified: [],
      }
      const nowMs = now()
      for (const miss of list) {
        const state = miss.state ?? 'observing'
        const bucket = pipeline[state] ?? pipeline.observing
        // 验证期剩余天数：从进入验证期的时刻起算，缺字段时退回最近活动时间
        const startedMs = Date.parse(miss.verifyAt ?? miss.stateAt ?? miss.lastAt ?? miss.at)
        const elapsedDays = Number.isFinite(startedMs)
          ? Math.floor((nowMs - startedMs) / 86_400_000)
          : null
        bucket.push({
          query: miss.query,
          count: miss.count ?? 1,
          at: miss.at,
          lastAt: miss.lastAt ?? miss.at,
          state,
          drafts: miss.drafts ?? [],
          // 平均多花多少 token：一次未命中意味着模型多试一轮，按 120 tokens 估
          wastedTokens: (miss.count ?? 1) * 120,
          sessions: (miss.sessions ?? [miss.session]).length,
          hits: miss.hits ?? 0,
          remainingDays: state === 'verifying' && elapsedDays !== null
            ? Math.max(0, MISS_VERIFY_DAYS - elapsedDays)
            : null,
          draftPath: miss.draftPath ?? null,
        })
      }
      for (const bucket of Object.values(pipeline)) {
        if (sort === 'recent') {
          bucket.sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)))
        } else if (sort === 'breadth') {
          bucket.sort((a, b) => b.sessions - a.sessions || b.count - a.count)
        } else {
          bucket.sort((a, b) => b.count - a.count || String(b.lastAt).localeCompare(String(a.lastAt)))
        }
      }
      return {
        pipeline,
        /** 五态各自的条数，供 UI 顶部计数条直接消费（不必自己数）。 */
        counts: {
          observing: pipeline.observing.length,
          'should-fill': pipeline['should-fill'].length,
          drafting: pipeline.drafting.length,
          verifying: pipeline.verifying.length,
          verified: pipeline.verified.length,
        },
        total: list.length,
        conversion: list.length === 0 ? null : pipeline.verified.length / list.length,
        verifyDays: MISS_VERIFY_DAYS,
        /** 阈值：问过几次算「该补了」。UI 上要能说清这个数字的来源。 */
        fillThreshold: 3,
        /** 当前排序口径，UI 用来回显选中的那一项。 */
        sort,
      }
    })
  }

  /** 未命中 → 草稿（必须人确认才落库）。 */
  async function missDraft({ query, type = '问题', session = 'plugin' }: {
    query: string; type?: string; session?: string
  }) {
    if (!INBOX_KINDS.includes(type as InboxKind)) {
      return {
        ok: false as const, kind: 'invalid-input' as const,
        error: `类型必须是 ${INBOX_KINDS.join(' / ')}`,
        hint: '草稿类型必须从五个 INBOX 类型里选。',
      }
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

  /**
   * 草稿确认 → 落库 → 进入 7 天验证期。
   *
   * 这是唯一会把「未命中」变成「记忆条目」的地方，所以它同时：
   *   - 过隐私闸门（正文会进真相源）
   *   - 写 G2 证据（origin 不是 G1，因为它来自总结而非用户亲述）
   *   - 把 miss 状态推到 verifying 并开 7 天倒计时
   */
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
          kind: 'blocked' as const,
          blocked: true,
          reason: privacy.reason,
          masked: privacy.masked,
          hint: '结论里有疑似密钥，已拒写。改完再存。',
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
      const updated = await store.updateMiss({
        query, state: 'verifying', draftId: entry.id, draftPath: relPath,
      })
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

  return { misses, missDraft, missConfirm, missBatchDraft, missDelete }
}
