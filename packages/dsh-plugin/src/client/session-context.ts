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

/**
 * 从 cwd 推出项目名 —— **只在没有服务端解析时兜底**。
 *
 * ## 这条推理曾经是错的（真事故）
 *
 * 取 cwd 末段当项目名，对 `…/zhongxing/V2.1.25-dev` 得到 `V2.1.25-dev`，
 * 对 `…/submodule/sz-web-dzh-gslx` 得到 `sz-web-dzh-gslx`。
 * 而库里项目叫 `sz-web`。两者永远不相等 → snapshot 过滤成 0 条
 * → 界面显示「当前项目还没有相关记忆」。数据一条没少，只是名字猜错了。
 *
 * 现在**cwd 原样送到 core**，由 `resolveProject` 按
 * `work/<project>/index.md` 的 项目名 + aliases 判定（那里才有库内数据）。
 * 这个函数只保留给「拿不到解析结果」的降级路径，且不再参与过滤决策之外的用途。
 */
export function projectFromCwd(cwd: string | undefined): string | undefined {
  if (cwd === undefined) return undefined
  const parts = cwd.replace(/\/+$/, '').split('/')
  const name = parts[parts.length - 1]
  if (typeof name !== 'string' || name === '') return undefined
  /** 越像分支/临时目录，越不该被当成项目名——宁可返回 undefined 让 core 去判。 */
  if (/^v?\d+(\.\d+)*(-|$)/i.test(name)) return undefined
  return name
}

/** 一次性拿到「当前会话 + cwd + 兜底项目名」。 */
export function useSessionProject(ctx: ClientContextLike | undefined): {
  sessionId: string | undefined
  cwd: string | undefined
  /** 兜底项目名（见 `projectFromCwd`）；UI 与请求应优先用 cwd。 */
  project: string | undefined
} {
  const sessionId = useCurrentSessionId(ctx)
  const cwd = useSessionCwd(ctx, sessionId)
  return { sessionId, cwd, project: projectFromCwd(cwd) }
}

/**
 * 桥请求里的「项目范围」参数。
 *
 * 优先送 cwd：只有 core 能读 `work/<project>/index.md` 的别名表，
 * 客户端手里的末段目录名（`V2.1.25-dev` / `sz-web-dzh-gslx`）根本对不上库里的项目名。
 * 拿不到 cwd 时才退回兜底项目名，最后才是空对象（= 不过滤）。
 */
export function scopeBody(
  cwd: string | undefined,
  project: string | undefined,
): Record<string, unknown> {
  if (cwd !== undefined && cwd.trim() !== '') return { cwd }
  if (project !== undefined && project !== '') return { project }
  return {}
}
