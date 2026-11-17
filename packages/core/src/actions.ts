/**
 * 能力层 —— 30 条能力的**唯一实现**，host 路由与 agent 工具都调这里。
 *
 * 为什么要有这一层：如果 HTTP 桥和工具各写一份「改状态」，
 * 三个月后两条路径的行为必然分叉（Web 端与插件端已经踩过一次）。
 * 所以能力只有一份，两端口只是传输方式不同。
 */

/*
 * 领域拆分后，本文件只剩：
 *   1. ActionFailure / guard 等共享类型与工具
 *   2. export / sessionMemory / health / 5 项维护作业
 *   3. createActions 组合根（把领域模块拼成原来那一个对象）
 *
 * read 侧的 snapshot / overview / search / detail 已移到 actions/read.ts，
 * 辅助函数移到 actions/helpers.ts 与 actions/context.ts。
 * 这里只 import 维护作业与组合根仍需要的符号。
 */
import {
  STATE_CONFIDENCE,
  FILE_LINE_LIMIT, FILE_TOKEN_SOFT_LIMIT, REINFORCE_MIN_SESSIONS,
  canTransition, estimateTokens, expiryOf, orEmpty,
} from './schema.ts'
import { projectAliasesOf, resolveProject, type ProjectResolution } from './project.ts'
import { searchEntries, type SearchHit } from './search.ts'
import { auditRecord } from './privacy.ts'
import {
  compactBody, needsCompact, planPromotions, planRepairs, verifyAnchors, weeklyReview,
  type AnchorReader,
} from './maintenance.ts'
import type { Store } from './store.ts'
import { classifyError, type ActionFailureKind } from './actions/errors.ts'

/**
 * 领域模块。
 *
 * 这三个领域原先是本文件里的 34 个闭包函数，现在各自成文件。
 * 对外签名完全不变——`createActions` 仍返回同一个对象，
 * 所以 bridge.ts 的 34 条路由、client 的调用点一行都不用改。
 *
 * 拆分依据（拆前实测的依赖分析）：
 *   - 跨领域调用只有 store.writeBody 一处，且 maintenance 直接走 store；
 *   - 领域之间没有循环依赖。
 * memory 先建（无依赖），inbox / misses 各自独立。
 */
import { createReadActions } from './actions/read.ts'
import { createMemoryActions } from './actions/memory.ts'
import { createInboxActions } from './actions/inbox.ts'
import { createMissActions } from './actions/misses.ts'

/* ResidentSkill 也在 actions.ts re-export，保持 bridge.ts 的 import 不变 */
export type { ResidentSkill } from './actions/read.ts'

/* 这三个类型移到了 inbox.ts，但在 actions.ts re-export，
 * 保证 `import { CaptureOutcome } from './actions.ts'` 的既有调用方零改动。 */
export type { CaptureSuccess, CaptureOutcome, CaptureBatchOutcome } from './actions/inbox.ts'

/**
 * `<available_skills>` 目录的固定框架文字（实测 171 tokens）。
 *
 * 定义移到 `actions/constants.ts`（避免 read.ts 反向 import actions.ts 造成循环），
 * 这里 re-export 保持对外 API 不变。
 */
export { SKILL_CATALOG_FRAME_TOKENS } from './actions/constants.ts'

/** 统一的失败结果。 */
export interface ActionFailure {
  ok: false
  error?: string
  /**
   * 失败类别。
   *
   * 为什么要有它：34 个能力原先只返回 `error` 字符串，
   * 于是「文件不存在」「状态迁移非法」「隐私拦截」在类型上完全一样，
   * 前端只能原样显示字符串，无法决定该给红条还是黄条、该给按钮还是给重试。
   *
   * 可选字段，向后兼容——既有只读 `ok` / `error` 的代码不受影响。
   * 分类逻辑在 `actions/errors.ts::classifyError`。
   */
  kind?: ActionFailureKind
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


/**
 * 统一包装：所有能力都返回 `{ ok, ... }`。
 *
 * 失败时附上 `kind` 与 `hint`（分类见 `actions/errors.ts`）。
 * 这两个字段是**新增且可选**的，因此既有的 `ok` / `error` 消费方零改动。
 */
async function guard<T extends object>(run: () => Promise<T>): Promise<{ ok: true } & T | ActionFailure> {
  try {
    return { ok: true, ...(await run()) }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const { kind, hint } = classifyError(error)
    return { ok: false, error: message, kind, hint }
  }
}

/** 建能力集合。 */
export function createActions({ store, now = () => Date.now(), readExternal }: {
  store: Store
  now?: () => number
  /**
   * 读「真相源之外」的文件——锚点校验要用。
   *
   * 为什么不直接用 fs：core 的其余部分只碰 `~/.memory-ops/`，
   * 而锚点指向的是**代码仓库**里的文件（`anchor.path` 相对某个仓库根）。
   * 把它抽成注入项，测试就能用假仓库，而不用在真磁盘上造一棵目录树。
   */
  readExternal?: AnchorReader
}) {
  /* ==========================================================
   * 领域模块实例化。
   *
   * 用 `now: () => now()` 包一层而不是直接传 `now`：
   * 因为 `now` 是 createActions 的参数，闭包捕获它以后始终读同一个函数，
   * 直接传引用也没错，但包一层后语义更明确「用当前时间」。
   * ========================================================== */
  const ctx = { store, now: () => now() }
  const readActions = createReadActions(ctx)
  const memoryActions = createMemoryActions(ctx)
  const inboxActions = createInboxActions(ctx)
  const missActions = createMissActions(ctx)

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

  /**
   * 会话记忆：本次注入 / 引用 / 未命中 + **为什么注入**。
   *
   * ## 两个真实缺陷
   *
   * ① **没有按会话过滤**。原来取的是「全库最近 200 条事件里的 recall」，
   *    于是任意别的会话搜一次，这个 tab 的数字就会变。它叫「会话记忆 tab」，
   *    却回答的是「整个库最近发生了什么」。
   *
   * ② **「为什么注入」永远为空**。它只在传入 `query` 时才有内容，
   *    而会话 tab 传的是 `{ sessionId, project }`，从来不传 query。
   *    所以那一栏恒定显示「本会话还没有检索记录」——可界面上明明写着
   *    「本次注入 3」。自相矛盾的两个数字摆在同一个面板里。
   *
   * 现在改成从**事件流派生的原因**：这个会话实际发生过哪些 recall，
   * 命中了哪条，那次检索的词是什么。这才是「为什么注入」的证据链——
   * 而不是拿一个界面上并不存在的 query 去反推。
   */
  async function sessionMemory({ query, project, sessionId, cwd }: {
    query?: string; project?: string | null; sessionId?: string; cwd?: string | null
  } = {}) {
    return guard(async () => {
      const entries = await store.scan()

      /**
       * 只给了 cwd 时先解析成项目（与 snapshot 同一套判定）。
       * 解析不出来就退回「不按项目过滤」，而不是过滤成 0 条——
       * 那正是这次要修的假空态形态。
       */
      let resolution: ProjectResolution | null = null
      let projectFilter = project
      if ((project === undefined || project === null || project === '') && typeof cwd === 'string' && cwd.trim() !== '') {
        resolution = resolveProject(cwd, projectAliasesOf(entries))
        projectFilter = resolution.project
      }

      /**
       * 事件读取分两条路（第 4 步重构）：
       *
       * - 没给 sessionId：只要「全库最近 200 条」。
       *   用 `readEventsTail(200)` 从文件尾部读，**只解析这 200 条**——
       *   而不是旧写法 `readEvents()` 读全文解析全部再 `slice(-200)`。
       *   events.jsonl 永不轮转，这个差别在大库上是数量级的。
       *
       * - 给了 sessionId：必须看该会话的**全部**事件（不能只取尾部，
       *   否则会话早先的注入/引用会丢失），仍用全量 `readEvents()`。
       */
      const events = sessionId === undefined || sessionId === ''
        ? await store.readEventsTail(200)
        : (await store.readEvents()).filter(event => event.session === sessionId)
      const recent = events.slice(-200)

      const injectedEvents = recent.filter(event => event.kind === 'recall')
      const citedEvents = recent.filter(event => event.kind === 'cite')
      const missesRecent = recent.filter(event => event.kind === 'miss')

      const byId = new Map(entries.map(entry => [entry.id, entry]))
      const reasons: {
        id: string; title: string; why: string
        anchor: Record<string, string> | null
        anchorState: string
        tokens: number
        at: string
      }[] = []

      /**
       * 原因来自 recall 事件本身。
       *
       * 倒序取最近 5 次检索里的命中条目：越新的越靠前，
       * 因为用户此刻关心的是「刚刚这一轮注入了什么」。
       */
      for (const event of [...recent].reverse()) {
        if (event.kind !== 'recall') continue
        const terms = String(event.query ?? '').split(/\s+/).filter(Boolean)
        for (const id of event.ids ?? []) {
          if (reasons.some(reason => reason.id === id)) continue
          const entry = byId.get(id)
          if (entry === undefined) continue
          reasons.push({
            id,
            title: entry.title,
            why: terms.length === 0 ? '检索命中（无关键词记录）' : `关键词命中：${terms.join(' ')}`,
            anchor: entry.anchor,
            /** 锚点状态：让「为什么注入」能说清是命中了内容还是命中了失效锚点。 */
            anchorState: entry.status === 'stale'
              ? 'stale'
              : entry.anchor === null ? 'none' : 'fresh',
            tokens: entry.tokens,
            at: event.at,
          })
          if (reasons.length >= 5) break
        }
        if (reasons.length >= 5) break
      }

      /** 显式 query 仍然可用（agent 诊断路径），此时在库内做一次纯检索。 */
      if (reasons.length === 0 && typeof query === 'string' && query.trim() !== '') {
        const result = searchEntries(entries, query, { project: projectFilter })
        for (const hit of result.hits.slice(0, 5)) {
          const matched = entries.find(entry => entry.id === hit.id)
          reasons.push({
            id: hit.id,
            title: hit.title,
            why: `关键词命中：${result.terms.join(' ')}`,
            anchor: matched?.anchor ?? null,
            anchorState: matched?.status === 'stale'
              ? 'stale'
              : matched?.anchor === null || matched?.anchor === undefined ? 'none' : 'fresh',
            tokens: hit.tokens,
            at: '',
          })
        }
      }

      return {
        sessionId: sessionId ?? null,
        project: projectFilter ?? null,
        resolution,
        injected: injectedEvents.reduce((sum, event) => sum + (event.ids ?? []).length, 0),
        recalled: injectedEvents.length,
        cited: citedEvents.reduce((sum, event) => sum + (event.ids ?? []).length, 0),
        missed: missesRecent.length,
        reasons,
        recentInjected: injectedEvents.slice(-10),
        recentCites: citedEvents.slice(-10),
        recentMisses: missesRecent.slice(-10),
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

  /**
   * 锚点校验作业（product.md §11.7 M3）。
   *
   * 回答的不是「这条记忆对不对」，而是「**它引用的代码还在不在**」。
   * `dryRun=true` 时只报告不改状态——UI 默认走这一步，让人先看清再决定。
   */
  async function verifyAnchorJob({ baseDir = '', apply = false, session = 'plugin' }: {
    baseDir?: string; apply?: boolean; session?: string
  } = {}) {
    return guard(async () => {
      const entries = await store.scan()
      // 没注入 readExternal 时不假装校验过：明确降级为「无法校验」，
      // 而不是把所有锚点判成 fresh（那会让用户以为一切正常）。
      const reader: AnchorReader = readExternal ?? (async () => null)
      const report = await verifyAnchors(entries, reader, { baseDir })
      const changed: { path: string; from: string; to: string }[] = []
      const failed: { path: string; error?: string }[] = []

      if (apply) {
        for (const check of report.checks) {
          // 只处理「明确失效」的两种；unverifiable 不自动降级（缺数据不是证据）
          if (check.state !== 'stale' && check.state !== 'missing') continue
          const entry = entries.find(item => item.path === check.path)
          if (entry === undefined) continue
          if (entry.status === 'stale') continue
          if (!canTransition(entry.status, 'stale')) {
            failed.push({ path: check.path, error: `${entry.status} 不能迁到 stale` })
            continue
          }
          try {
            /**
             * 一次写完，不分两次。
             *
             * 分两次调 `patchMeta` 有真实风险：两次各自取文件锁，
             * 中间若失败（进程被杀、磁盘满），会留下「status 已改 stale、
             * 但没有 anchor_checked_at」的半成品——那条记忆从此说不清
             * 是「锚点校验判的」还是「人手工降的」。
             */
            const updated = await store.patchMeta(check.path, {
              status: 'stale',
              anchor_checked_at: new Date(now()).toISOString(),
              anchor_state: check.state,
            })
            changed.push({ path: updated.path, from: entry.status, to: 'stale' })
          } catch (error) {
            failed.push({ path: check.path, error: error instanceof Error ? error.message : String(error) })
          }
        }
        await store.appendEvent({
          session,
          kind: 'anchor-verify',
          query: `stale ${report.summary.stale} · missing ${report.summary.missing}`,
        })
      }

      return { ...report, applied: apply, changed, failed }
    })
  }

  /** 减重：列超限条目 + 预览/执行机械压缩。 */
  async function compact({ paths = [], apply = false, session = 'plugin' }: {
    paths?: string[]; apply?: boolean; session?: string
  } = {}) {
    return guard(async () => {
      const entries = await store.scan()
      const targets = paths.length > 0
        ? entries.filter(entry => paths.includes(entry.path))
        : entries.filter(entry => needsCompact(entry))

      const previews = targets.map((entry) => {
        const result = compactBody(entry.body)
        return {
          path: entry.path,
          title: entry.title,
          /**
           * 行数一律用**正文口径**（`compactBody.before`），不用 `entry.lines`。
           *
           * `entry.lines` 是整个文件（含 frontmatter + 结尾换行），而
           * `result.removed` 只统计正文。两者混用会让「7 行 → 3 行」看起来
           * 像删掉了 4 行正文——实际一行正文都没删。同一个界面里的数字必须同口径。
           */
          before: result.before,
          after: result.after,
          removed: result.removed,
          changes: result.changes,
          /**
           * 压缩后是否仍超限。
           *
           * 必须用**同一口径**：`before`/`after` 都是正文行数，这里不能用
           * `entry.lines`（含 frontmatter）去减正文口径的 `removed`——
           * 那会算出比实际小 5~10 行的假象，让「压缩后合规了」的判断提前成立。
           */
          stillOverLimit: result.after + (entry.lines - result.before) > FILE_LINE_LIMIT,
          splitSuggestions: result.splitSuggestions,
        }
      })

      const written: { path: string; removed: number }[] = []
      const failed: { path: string; error?: string }[] = []
      if (apply) {
        for (const entry of targets) {
          const result = compactBody(entry.body)
          // 压缩不改变语义，但它确实动了正文——所以有节省才写，没节省就别碰文件时间戳
          if (result.removed <= 0) continue
          try {
            await store.writeBody(entry.path, result.body)
            written.push({ path: entry.path, removed: result.removed })
          } catch (error) {
            failed.push({ path: entry.path, error: error instanceof Error ? error.message : String(error) })
          }
        }
        if (written.length > 0) {
          await store.appendEvent({
            session,
            kind: 'compact',
            query: `${written.length} 篇，去 ${written.reduce((sum, item) => sum + item.removed, 0)} 行`,
          })
        }
      }

      return {
        candidates: previews,
        total: previews.length,
        /** 只做无损压缩，节省通常有限；这里如实报出来，避免让人误以为一键就合规。 */
        removableLines: previews.reduce((sum, item) => sum + item.removed, 0),
        applied: apply,
        written,
        failed,
        lineLimit: FILE_LINE_LIMIT,
      }
    })
  }

  /** 每周复盘：这周动了什么 + 下周该做什么。 */
  async function review({ days = 7 }: { days?: number } = {}) {
    return guard(async () => {
      const entries = await store.scan()
      const events = await store.readEvents()
      const misses = await store.readMisses()
      return weeklyReview(entries, events, misses, { nowMs: now(), days })
    })
  }

  /**
   * 自动爬升：只出计划，`apply=true` 才落库。
   *
   * 为什么默认不自动落：爬升会改 status，而 status 决定这条记忆被不被信任。
   * 一个「自己给自己升可信度」的系统，正是 product.md §11.3 拒绝「自动提取并直接写库」
   * 的同一个理由。所以默认 dry-run，由人点一下。
   */
  async function promote({ apply = false, session = 'plugin' }: {
    apply?: boolean; session?: string
  } = {}) {
    return guard(async () => {
      const entries = await store.scan()
      const events = await store.readEvents()
      const plans = planPromotions(entries, events)
      const changed: { path: string; from: string; to: string }[] = []
      const failed: { path: string; error?: string }[] = []
      if (apply) {
        for (const plan of plans) {
          if (!canTransition(plan.from, plan.to)) {
            failed.push({ path: plan.path, error: `${plan.from} 不能迁到 ${plan.to}` })
            continue
          }
          try {
            await store.patchMeta(plan.path, {
              status: plan.to,
              confidence: STATE_CONFIDENCE[plan.to],
              promoted_at: new Date(now()).toISOString(),
            })
            changed.push({ path: plan.path, from: plan.from, to: plan.to })
          } catch (error) {
            failed.push({ path: plan.path, error: error instanceof Error ? error.message : String(error) })
          }
        }
        if (changed.length > 0) {
          await store.appendEvent({ session, kind: 'promote-auto', query: `${changed.length} 条` })
        }
      }
      return { plans, applied: apply, changed, failed, minSessions: REINFORCE_MIN_SESSIONS }
    })
  }

  /**
   * 修补 frontmatter：把「手写的 Markdown 笔记」变成「可治理的记忆」。
   *
   * 这是「插件装了、数据也在、但什么都不工作」的解药。缺 `status` 会让
   * 待你处理队列永远为空，缺 `layer` 会让预算账本三段全错。
   *
   * **只补空字段与非法的值，绝不覆盖已有值，绝不改正文。** 默认 dry-run。
   */
  async function repairMeta({ apply = false, paths = [], session = 'plugin' }: {
    apply?: boolean; paths?: string[]; session?: string
  } = {}) {
    return guard(async () => {
      const entries = await store.scan()
      const today = new Date(now()).toISOString().slice(0, 10)
      const plan = planRepairs(entries, today)
      const targets = paths.length === 0
        ? plan.fixes
        : plan.fixes.filter(fix => paths.includes(fix.path))

      const written: { path: string; fields: string[] }[] = []
      const failed: { path: string; error?: string }[] = []

      if (apply) {
        for (const fix of targets) {
          try {
            // patchMeta 只改 frontmatter，不动正文——这是本条能力的硬边界
            await store.mergeMeta(fix.path, fix.patch, { overwrite: fix.overwrite })
            written.push({ path: fix.path, fields: Object.keys(fix.patch) })
          } catch (error) {
            failed.push({ path: fix.path, error: error instanceof Error ? error.message : String(error) })
          }
        }
        if (written.length > 0) {
          await store.appendEvent({
            session,
            kind: 'repair-meta',
            query: `${written.length} 篇`,
          })
        }
      }

      return {
        fixes: targets,
        healthy: plan.healthy,
        total: plan.total,
        applied: apply,
        written,
        failed,
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

  /*
   * 对外返回面：与拆分前**逐字一致**的 34 个能力。
   *
   * 前 8 个（inbox 域）+ 8 个（memory 域）+ 5 个（misses 域）
   * 现在来自领域模块，解构出来保持同名。
   * bridge.ts 的 34 条路由、client 调用点全部无需改动。
   */
  const {
    inbox, capture, captureBatch, updateInbox, deleteInbox,
    batchInboxState, promoteInbox,
  } = inboxActions
  const {
    writeBody, setStatus, confirm, reject, undoReject, archive, keep, batchArchive,
  } = memoryActions
  const {
    misses, missDraft, missConfirm, missBatchDraft, missDelete,
  } = missActions
  const { snapshot, overview, search, detail } = readActions

  return {
    snapshot, overview, inbox, capture, captureBatch, updateInbox, deleteInbox,
    batchInboxState, promoteInbox, search, detail, writeBody, setStatus, confirm,
    reject, undoReject, archive, keep, batchArchive, misses, missDraft, missConfirm,
    missBatchDraft, missDelete, export: exportData, sessionMemory, health, index,
    verifyAnchor: verifyAnchorJob, compact, review, promote, repairMeta,
    store,
  }
}

export type Actions = ReturnType<typeof createActions>
export type { SearchHit }
export { estimateTokens, orEmpty }


