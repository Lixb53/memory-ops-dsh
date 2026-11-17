/**
 * store/types.ts —— 数据结构定义（无逻辑）
 *
 * 从 `store.ts` 拆出。这些接口被 `store`、`actions`、`stats` 三方共用，
 * 放在最底层可以避免循环依赖。
 */

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
  /** 命中次数：草稿落库后，同一个 query 再次检索时命中的次数（验证期用）。 */
  hits: number
  count?: number
  state?: string
  stateAt?: string
  scope?: string
  drafts?: string[]
  /**
   * 出现过的会话集合。
   *
   * 为什么单独记：`count` 只回答「问过几次」，但「3 个会话都在问」比
   * 「一个会话里问了 3 次」重要得多——前者说明这是**共性问题**，后者可能只是一次困惑。
   * UI 上「N 次 / M 个会话」两个数字必须分开显示。
   */
  sessions?: string[]
  /**
   * 草稿落库后所在路径（验证期内点开能跳过去）。
   *
   * 设计稿写的是「已进 INBOX 第 N 行」，但实现里草稿落成独立 md 文件
   * （personal/misses/日期-slug.md），不是 INBOX 的一行。
   * 差异原因是：草稿是「一条结论」，适合独立成篇；
   * 而 INBOX 是「待流转的速记」。所以 UI 显示路径而不是行号——
   * 两者都指向「它落到哪了」，但如实反映实际落点更重要。
   */
  draftPath?: string
  /** 进入验证期的时间；配合 MISS_VERIFY_DAYS 算剩余天数。 */
  verifyAt?: string
}
