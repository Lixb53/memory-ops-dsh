/**
 * 置顶条目的同步缓存 —— 为 `systemPrompt.section()` 供料。
 *
 * ## 为什么必须有这一层
 *
 * 宿主组装系统提示词时**同步**求值段落的 `text`：
 *
 *     text: typeof section.text === 'function' ? section.text(context) : section.text
 *
 * 而 `store.scan()` 是 async（读目录、读文件、解析 frontmatter）。直接在里面
 * `await` 会得到一个 Promise 对象，它被当成文本插进提示词——比不注入更糟。
 *
 * 所以缓存不是优化，是**接口约束**：同步读内存，异步刷新内存。
 *
 * ## 按会话冻结（策略 A）
 *
 * 系统提示词一变，当前会话的 KV cache 就作废（本仓实测单次 20–57 万 tokens）。
 * 因此每个会话在**第一次组装时快照一次**，之后本轮对话内不再变：
 *
 *   - 会话中途改置顶 → 新会话生效，老会话保持前后一致；
 *   - 老会话不会因为别人改了一条原则就整段重新计费。
 *
 * 这也符合「原则本来就该是会话级稳定的」：同一轮对话里规则悄悄换掉，
 * 模型前几步的依据就再也对不上了。
 *
 * ## 冷启动不能冻结空串
 *
 * 进程刚起、首次 scan 还没回来时，`text` 是空串。此时若把空串冻结进
 * `frozen`，这个会话**永远**拿不到内容——因为它再也不会重算。
 * 所以只有「已经读到过快照」才允许冻结，未就绪时返回空串并继续后台读。
 */

import { PINNED_MAX_TOKENS, renderPinnedSection, type PinnedRender } from '@memory-ops/core/pinned'
import type { MemoryEntry } from '@memory-ops/core/store'

/** 空渲染：未就绪、未启用、或库里没有置顶条目时都用它。 */
const EMPTY: PinnedRender = { text: '', tokens: 0, ids: [], omitted: 0 }

export interface PinnedCacheConfig {
  /** 重扫入口；插件传 `() => store.scan()`。测试传假实现。 */
  scan: () => Promise<MemoryEntry[]>
  /** 注入段 token 上限。 */
  maxTokens?: number
  /** 是否包含工作域置顶条目；默认 false。 */
  includeWork?: boolean
  /**
   * 后台重扫的最小间隔。
   *
   * 为什么是「间隔」而不是「每次都扫」：组装在每一步都会发生，
   * 每一步都扫一遍库等于把系统提示词的延迟挂到磁盘上。
   * 30s 足够让新会的会话看到刚改的条目，又不会在连续步进里反复 IO。
   */
  refreshTtlMs?: number
  /** 注入时钟（测试用）。 */
  now?: () => number
}

export interface PinnedCache {
  /** 启动预热：不阻塞调用方，失败静默——下次组装再试。 */
  prime(): void
  /**
   * 等到「至少读到过一份快照」。
   *
   * 给异步调用方用（总览路由）：它需要的是**准确**的每请求成本，
   * 而不是「进程刚起还没读完所以先报 0」。同步的组装路径不能用它。
   */
  ready(): Promise<void>
  /** 立即重扫（写入选定后调用，让新会话马上看到）。并发调用共享同一次扫描。 */
  refresh(): Promise<void>
  /** 会话冻结渲染：同一会话只算第一次。 */
  renderFor(session: string | undefined): string
  /**
   * 未冻结的当前渲染，给总览算「每请求成本」用。
   *
   * 为什么不用某个会话的冻结值：总览回答的是「新会话要付多少」，
   * 而那正是未冻结的这份。
   */
  current(): PinnedRender
  /** 丢弃全部冻结快照（配置变更或插件卸载时用）。 */
  dispose(): void
}

export function createPinnedCache(config: PinnedCacheConfig): PinnedCache {
  const maxTokens = config.maxTokens ?? PINNED_MAX_TOKENS
  const includeWork = config.includeWork === true
  const ttl = config.refreshTtlMs ?? 30_000
  const now = config.now ?? Date.now

  let snapshot: PinnedRender = EMPTY
  /** 是否成功读到过一次快照。决定「能不能冻结」。 */
  let loaded = false
  let inflight: Promise<void> | null = null
  /**
   * 上次尝试扫描的时刻；`null` = 从未尝试。
   *
   * 不能用 `0` 当哨兵：注入时钟在测试里从 0 起算，`0 - 0 < ttl` 会把
   * **第一次**刷新也拦掉，于是缓存永远是空的，而且一点声音都没有。
   */
  let lastAttempt: number | null = null
  let disposed = false

  /** 会话 id → 冻结文本。空键表示「拿不到会话」（旧调用路径的兜底）。 */
  const frozen = new Map<string, string>()

  function scanIntoMemory(): Promise<void> {
    if (inflight !== null) return inflight
    lastAttempt = now()
    const run = config.scan()
      .then((entries) => {
        if (disposed) return
        snapshot = renderPinnedSection(entries, { maxTokens, includeWork })
        loaded = true
      })
      // 读失败保留上一份快照：过时但可用，好过把原则从提示词里整段抽走。
      .catch(() => {})
      .finally(() => {
        if (inflight === run) inflight = null
      })
    inflight = run
    return run
  }

  /** 超过 TTL 才排一次后台重扫。fire-and-forget，不影响本次组装的延迟。 */
  function maybeRefresh(): void {
    if (disposed) return
    if (lastAttempt !== null && now() - lastAttempt < ttl) return
    void scanIntoMemory()
  }

  return {
    prime() {
      void scanIntoMemory()
    },

    ready() {
      return loaded ? Promise.resolve() : scanIntoMemory()
    },

    refresh() {
      return scanIntoMemory()
    },

    renderFor(session) {
      const key = session ?? ''
      const hit = frozen.get(key)
      if (hit !== undefined) return hit
      if (!loaded) {
        // 未就绪：给空串并继续后台读。**不冻结**，见文件头注释的冷启动段。
        maybeRefresh()
        return ''
      }
      maybeRefresh()
      frozen.set(key, snapshot.text)
      return snapshot.text
    },

    current() {
      maybeRefresh()
      return snapshot
    },

    dispose() {
      disposed = true
      frozen.clear()
      snapshot = EMPTY
      loaded = false
    },
  }
}