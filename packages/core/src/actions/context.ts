/**
 * actions/context.ts —— 领域模块共享的类型与两个公用工具
 *
 * ## 为什么需要这一层
 *
 * 原来 34 个能力在**同一个闭包**里，共享 `store` / `now` / `readExternal`
 * 三个变量，且任意函数都能直接 `store.scan()`。拆成领域模块后，
 * 最直接的做法是每个模块各自接收那三个依赖——本文件就是它们的类型。
 *
 * ## 刻意不做的事
 *
 * 不额外包一层 Repository / UseCase / 依赖注入容器。
 * 依赖只有两三个，包一层只会增加间接层，让「谁读了什么」更难追。
 * 真正提升可读性的是**按领域分文件**，不是再抽象一层。
 */

import { STATE_CONFIDENCE, expiryOf, type ConfidenceState } from '../schema.ts'
import type { MemoryEntry, Store } from '../store.ts'
import { classifyError, type ActionFailureKind } from './errors.ts'

/** 各领域模块共享的依赖。 */
export interface ActionContext {
  store: Store
  now: () => number
}

/** 统一失败结果。 */
export interface ActionFailure {
  ok: false
  error?: string
  /** 失败类别，见 `actions/errors.ts`。可选，向后兼容。 */
  kind?: ActionFailureKind
  /** 给用户看的修复建议。 */
  hint?: string
  /** 命中隐私闸门。 */
  blocked?: boolean
  /** 拦截原因（人可读）。 */
  reason?: string
  /** 脱敏后的可用文本。 */
  masked?: string
  /** 审计记录（不含原文）。 */
  audit?: { at: string; length: number; findings: string[]; preview: string }
}

/**
 * 统一包装：所有能力都返回 `{ ok, ... }`。
 *
 * 失败时附上 `kind` 与 `hint`。这两个字段是**新增且可选**的，
 * 因此既有的 `ok` / `error` 消费方零改动。
 */
export async function guard<T extends object>(
  run: () => Promise<T>,
): Promise<{ ok: true } & T | ActionFailure> {
  try {
    return { ok: true, ...(await run()) }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const { kind, hint } = classifyError(error)
    return { ok: false, error: message, kind, hint }
  }
}

/**
 * 条目的对外投影（UI 只需要这些字段）。
 *
 * `citeCount` 由调用方传入引用计数表——投影本身是纯函数，不读事件流。
 * 设计稿上每张卡片都显示「N 次引用」，那是判断「这条还活着吗」的关键信号，
 * 早先只有详情页里有，列表上看不到。
 */
/**
 * 条目的对外投影（UI 只需要这些字段）。
 *
 * ⚠️ 字段逐字对齐拆分前的实现，包括：
 *   - `citeCount` 缺省是 **0** 而不是 undefined（UI 用它判断「未引用」）
 *   - 有 `kind` / `evidence`，**没有** `unscoped` / `branch` / `overTokenLimit`
 *     那三个是我在第一次复制时凭印象加的，会改变返回形状——已删掉。
 *   - `confidence` 的兜底链：`entry.confidence ?? STATE_CONFIDENCE[status] ?? null`
 */
export function projectEntry(
  entry: MemoryEntry,
  nowMs: number,
  citeCounts?: Map<string, number>,
) {
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
    /** 被 cite 的次数（真正被用上的次数，不含 recall）。 */
    citeCount: citeCounts?.get(entry.id) ?? 0,
  }
}
