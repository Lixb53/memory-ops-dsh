/**
 * 数据获取 —— 五态：正常 / 加载 / 空 / 读取失败 / 降级。
 *
 * 只做一件事：把桥调用包成「有状态、可重试、可刷新」的 hook。
 * 不做缓存层——宿主已经按需渲染侧栏，再加一层缓存只会让「改完看不到」
 * 这类问题更难查。
 */

import { useCallback, useEffect, useState } from 'react'
import { BridgeError, call } from './api.ts'

/** 数据状态机。 */
export type LoadPhase = 'loading' | 'ready' | 'error'

/** 一次异步加载的结果。 */
export interface Loaded<T> {
  phase: LoadPhase
  data: T | undefined
  error: string | undefined
  reload: () => void
}

/** 加载一次桥数据。 */
export function useBridge<T>(
  route: string,
  body: Record<string, unknown>,
  deps: readonly unknown[] = [],
): Loaded<T> {
  const [phase, setPhase] = useState<LoadPhase>('loading')
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<string | undefined>(undefined)
  const [nonce, setNonce] = useState(0)

  const reload = useCallback(() => {
    setNonce(value => value + 1)
  }, [])

  // body 每渲染都是新对象，所以用 JSON 串做稳定键
  const bodyKey = JSON.stringify(body)

  useEffect(() => {
    let alive = true
    setPhase('loading')
    setError(undefined)
    call<T>(route, JSON.parse(bodyKey) as Record<string, unknown>)
      .then((payload) => {
        if (!alive) return
        setData(payload)
        setPhase('ready')
      })
      .catch((failure: unknown) => {
        if (!alive) return
        setError(failure instanceof BridgeError ? failure.message : String(failure))
        setPhase('error')
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, bodyKey, nonce, ...deps])

  return { phase, data, error, reload }
}

/** 触发一次写操作并自动刷新。 */
export function useMutation(run: () => Promise<unknown>): {
  pending: boolean
  error: string | undefined
  trigger: (after?: () => void) => void
} {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const trigger = useCallback((after?: () => void) => {
    setPending(true)
    setError(undefined)
    void run()
      .then(() => {
        after?.()
      })
      .catch((failure: unknown) => {
        setError(failure instanceof BridgeError ? failure.message : String(failure))
      })
      .finally(() => {
        setPending(false)
      })
    // run 每次渲染都是新函数；调用方应把依赖放在 run 里
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run])
  return { pending, error, trigger }
}
