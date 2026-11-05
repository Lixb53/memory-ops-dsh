/**
 * 当前会话与项目判定 —— 这里踩过一次坑，必须写清楚。
 *
 * 历史 bug（product.md §8.1）：槽位标准 props 里**没有 cwd**，代码直接读
 * `props.cwd` 拿到 `undefined` → 快照请求不带项目上下文 → core 返回空数组
 * → 界面渲染成「当前项目还没有相关记忆」的**假空态**。
 *
 * 现在的做法：
 *   1. 从 `useSessions` 钩子按当前会话 id 取 `byId[id].cwd`；
 *   2. 当前会话 id 从客户端 `uiSession` 适配器取（root 面板没有 sessionId prop）；
 *   3. 任何一步拿不到 → 退回**全部工作域**并标 `projectScoped: false`，
 *      界面显示降级条，而不是空列表。
 */

import { useEffect, useState } from 'react'

/** 可订阅快照（宿主 observable 的最小形状）。 */
interface Observable<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}

/** 判断是不是可订阅快照。 */
function isObservable(value: unknown): value is Observable<unknown> {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as { getSnapshot?: unknown; subscribe?: unknown }
  return typeof candidate.getSnapshot === 'function' && typeof candidate.subscribe === 'function'
}

/** 订阅一个宿主 observable 并返回当前快照。 */
export function useObservable<T>(observable: Observable<T> | undefined, fallback: T): T {
  const [value, setValue] = useState<T>(() => {
    if (observable === undefined) return fallback
    try {
      return observable.getSnapshot()
    } catch {
      return fallback
    }
  })

  useEffect(() => {
    if (observable === undefined) return undefined
    let alive = true
    const sync = (): void => {
      if (!alive) return
      try {
        setValue(observable.getSnapshot())
      } catch { /* 宿主内部状态异常时保持上一个值 */ }
    }
    sync()
    const unsubscribe = observable.subscribe(sync)
    return () => {
      alive = false
      unsubscribe()
    }
  }, [observable])

  return value
}

/** 最小 Client Context 形状（不引宿主内部类型）。 */
export interface ClientContextLike {
  get?(name: string): unknown
}

/** 从任意 context 里安全取服务。 */
export function getService(ctx: ClientContextLike | undefined, name: string): unknown {
  if (ctx === undefined || typeof ctx.get !== 'function') return undefined
  try {
    return ctx.get(name)
  } catch {
    return undefined
  }
}

/** 从 uiSession 适配器读当前会话 id。 */
export function useCurrentSessionId(ctx: ClientContextLike | undefined): string | undefined {
  const uiSession = getService(ctx, 'uiSession') as { adapter?: { current?: Observable<{ key?: string }> } } | undefined
  const current = isObservable(uiSession?.adapter?.current)
    ? uiSession.adapter.current as Observable<{ key?: string }>
    : undefined
  const binding = useObservable(current, { key: undefined as string | undefined })
  return typeof binding?.key === 'string' && binding.key !== '' ? binding.key : undefined
}

/** 从 sessions 服务读某个会话的 cwd。 */
export function useSessionCwd(
  ctx: ClientContextLike | undefined,
  sessionId: string | undefined,
): string | undefined {
  const sessions = getService(ctx, 'sessions') as {
    list?: Observable<{ byId?: Record<string, { cwd?: string }> }>
  } | undefined
  const list = isObservable(sessions?.list) ? sessions.list : undefined
  const state = useObservable(list, { byId: undefined as Record<string, { cwd?: string }> | undefined })
  if (sessionId === undefined) return undefined
  const cwd = state?.byId?.[sessionId]?.cwd
  return typeof cwd === 'string' && cwd !== '' ? cwd : undefined
}

/** 从 cwd 推出项目名：`…/sz-web` → `sz-web`。 */
export function projectFromCwd(cwd: string | undefined): string | undefined {
  if (cwd === undefined) return undefined
  const parts = cwd.replace(/\/+$/, '').split('/')
  const name = parts[parts.length - 1]
  return typeof name === 'string' && name !== '' ? name : undefined
}

/** 一次性拿到「当前会话 + 项目」。 */
export function useSessionProject(ctx: ClientContextLike | undefined): {
  sessionId: string | undefined
  cwd: string | undefined
  project: string | undefined
} {
  const sessionId = useCurrentSessionId(ctx)
  const cwd = useSessionCwd(ctx, sessionId)
  return { sessionId, cwd, project: projectFromCwd(cwd) }
}
