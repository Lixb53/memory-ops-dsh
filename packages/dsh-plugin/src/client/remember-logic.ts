/**
 * `/remember` 的**纯逻辑**：命令行解析与弹窗状态。
 *
 * 单独成文件是为了可测：`remember.ts` 里的组件依赖 React 与宿主浮层契约，
 * 在 node 里跑不起来；而「回车后一定会打开弹窗」这件事必须能自动化验证。
 */

/** 命令名（不带斜杠）。 */
export const COMMAND_NAME = 'remember'

/** 记录类型（与 core 的类型枚举一致）。 */
export const KINDS = ['想法', '计划', '问题', '待办', '决策']

/** 浮层状态。 */
export interface RememberState {
  open: boolean
  /** 预填正文（来自 `/remember xxx` 的参数）。 */
  content: string
  /** 保存结果提示（弹窗关闭后短暂显示）。 */
  toast: {
    text: string
    ok: boolean
    /** 可撤销时带上刚存入的原文，用于按内容定位那一行。 */
    savedContent?: string
    savedAt?: number
  } | null
}

/** 可订阅的浮层 store（与 dsh-context 的 `O(e)` 同构）。 */
export interface RememberStore {
  subscribe(listener: () => void): () => void
  getSnapshot(): RememberState
  set(next: RememberState): void
}

/** 按会话隔离的 store 表。 */
const STORES = new Map<string, RememberStore>()

/** 取（或建）某个会话的 store。 */
export function rememberStoreOf(sessionId: string): RememberStore {
  const existing = STORES.get(sessionId)
  if (existing !== undefined) return existing
  let state: RememberState = { open: false, content: '', toast: null }
  const listeners = new Set<() => void>()
  const store: RememberStore = {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot(): RememberState {
      return state
    },
    set(next: RememberState) {
      // 值未变时不通知，避免无谓重渲染
      if (next.open === state.open && next.content === state.content && next.toast === state.toast) return
      state = next
      for (const listener of listeners) listener()
    },
  }
  STORES.set(sessionId, store)
  return store
}

/** 打开弹窗（可预填内容）。 */
export function openRememberDialog(sessionId: string, content = ''): void {
  const store = rememberStoreOf(sessionId)
  store.set({ ...store.getSnapshot(), open: true, content })
}

/** 关闭弹窗。 */
export function closeRememberDialog(sessionId: string): void {
  const store = rememberStoreOf(sessionId)
  store.set({ ...store.getSnapshot(), open: false, content: '' })
}

/** 设置提示。 */
export function setRememberToast(sessionId: string, toast: RememberState['toast']): void {
  const store = rememberStoreOf(sessionId)
  store.set({ ...store.getSnapshot(), toast })
}

/**
 * 解析 `/remember 内容` 一行。
 *
 * 宽松匹配整行：`/remembering` 这类前缀相似但不同的命令必须不匹配，
 * 否则会误吞用户真正想发的消息。
 */
export function parseRememberLine(line: string): { matched: boolean; content: string } {
  const text = String(line ?? '').trim()
  const match = /^\/remember(?:\s+([\s\S]*))?$/.exec(text)
  if (match === null) return { matched: false, content: '' }
  return { matched: true, content: (match[1] ?? '').trim() }
}
