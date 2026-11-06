/**
 * 表面 4：`/remember` —— 回车后**弹出对话框**，在框内输入再存。
 *
 * 为什么改掉旧实现（`/remember 内容` 一行提交）：
 * 回车之后输入框被清空、屏幕上什么也没发生，用户无法判断命令是否生效。
 * 命令类交互必须有可见的接手动作——这是可用性问题，不是审美问题。
 *
 * 实现照 dsh-context 的 `/context`（三处一致）：
 *   1. `onPick` / `matchEnter` 返回 `'handled'`：输入框清空、提交权交给本插件
 *   2. 同时把 per-session store 置为 open
 *   3. `conversation.input.overlay` 槽位里的对话框订阅该 store，渲染在输入框卡片内
 *
 * 三种进入方式都落到同一个弹窗：
 *   - 菜单选 `/remember`
 *   - 直接回车 `/remember`（无参数）
 *   - 回车 `/remember 内容`（预填到弹窗，仍让用户确认）
 *
 * 反馈闭环：存成功后弹窗关闭，并在同一浮层留一条「已存入 · 撤销 30s」的提示——
 * 既给了即时反馈，又不要求用户多点一次。
 */

import { createElement, useEffect, useRef, useState, type ReactNode } from 'react'

import type { ClientContext } from './index.ts'
import { call, type CaptureResult, type InboxView } from './api.ts'
import { Button, orEmpty, truncate } from './ui.ts'

import {
  COMMAND_NAME, KINDS, closeRememberDialog, openRememberDialog, parseRememberLine,
  rememberStoreOf, setRememberToast, type RememberState, type RememberStore,
} from './remember-logic.ts'

// 让 register.ts 等调用方仍从本模块导入这些名字
export {
  COMMAND_NAME, closeRememberDialog, openRememberDialog, parseRememberLine,
  rememberStoreOf, type RememberState, type RememberStore,
}

/**
 * 注意：这里曾经有个 `useRememberStore(store)` 自己订阅 store 的 hook。
 * 现已删除——宿主通过 props 把 `useRemember` 选择器钩子直接交给浮层组件
 * （见 RememberOverlay），那才是实际生效的订阅路径。
 * 留着两个订阅源只会让人搞不清状态从哪来。
 */

/** 触发源需要的回调形状（宿主契约的最小面）。 */
interface PickOutcomeLike {
  kind?: string
  [key: string]: unknown
}

interface TriggerSource {
  trigger: '/'
  name: string
  order?: number
  candidates(
    session: { sessionId: string },
    req: { query: string; position: string },
  ): Promise<{ name: string; label?: string; description?: string; section?: string }[]>
  onPick(pick: { candidate: { name: string }; session: { sessionId: string }; span: unknown }): PickOutcomeLike
  matchEnter?(
    session: { sessionId: string },
    line: string,
    signal: AbortSignal,
    envelope: { attachments: number },
  ): Promise<PickOutcomeLike | undefined>
}

/**
 * `'handled'` 是宿主认可的返回值：清空输入框并把提交交给本插件。
 *
 * **必须返回字符串字面量本身，不能包成对象**——宿主的 PickOutcome 是
 * `{claim} | {insert} | {text} | 'handled' | undefined` 的联合类型，
 * 返回 `{kind:'handled'}` 会被当成「未知形态」而落回默认发送路径，
 * 结果是命令被当普通消息发出去（实测踩过：回车后消息直接进了对话）。
 */
const HANDLED = 'handled' as unknown as PickOutcomeLike

/** 注册 `/remember` 触发源与浮层。 */
export function registerRemember(ctx: ClientContext): () => void {
  const disposers: (() => void)[] = []

  // ---- 浮层：对话框 + 保存提示，都渲染在输入框卡片内 ----
  try {
    disposers.push(ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({
      name: 'conversation.input.overlay',
      id: 'memory-ops-remember',
      order: 20,
      // 浮层是 session 作用域：宿主把 sessionId 传给 inject，
      // 返回的 hooks 会变成组件的 useXxx 钩子（与 dsh-context 同构）。
      inject: (sessionId?: string) => ({
        hooks: { remember: rememberStoreOf(typeof sessionId === 'string' && sessionId !== '' ? sessionId : 'default') },
        warm: true,
      }),
    }, RememberOverlay as unknown as (props: Record<string, unknown>) => unknown)))
  } catch (error) {
    console.error('[memory-ops] /remember 浮层注册失败：', error)
  }

  // ---- 触发源 ----
  //
  // **必须用 ctx.inject 等就绪，不能用 ctx.get 直接取**。
  // `inputTriggers` 是延迟提供的客户端服务：apply 执行时它还没 provide，
  // 直接 get 会拿到 undefined，于是注册被静默跳过——表现为
  // 「输入 /remember 回车后没有任何拦截，消息被当普通文本发出去」。
  // 这是本次实测踩到的第二个坑（第一个是 'handled' 不能包成对象）。
  try {
    const dispose = ctx.inject(['inputTriggers'], (triggerCtx) => {
      const inputTriggers = (triggerCtx as unknown as { inputTriggers?: {
        registerSource(source: TriggerSource): () => void
      } }).inputTriggers
      if (inputTriggers === undefined || typeof inputTriggers.registerSource !== 'function') return

      return inputTriggers.registerSource({
        trigger: '/',
        name: COMMAND_NAME,
        order: 40,
        async candidates(_session, req) {
          const query = String(req?.query ?? '').trim().toLowerCase()
          if (req?.position !== 'leading') return []
          if (query !== '' && !COMMAND_NAME.startsWith(query)) return []
          return [{
            name: COMMAND_NAME,
            label: '/remember',
            description: '打开记忆库捕获对话框，把一句话存进记录流',
            section: '记忆库',
          }]
        },
        onPick(pick) {
          openRememberDialog(pick.session?.sessionId ?? 'default')
          return HANDLED
        },
        async matchEnter(session, line, _signal, envelope) {
          const parsed = parseRememberLine(line)
          if (!parsed.matched) return undefined
          // 带附件时不接管：附件有自己的处理链路
          if (envelope.attachments > 0) return undefined
          // 无论有没有跟内容都打开弹窗：带内容则预填，让用户确认后再存
          openRememberDialog(session.sessionId ?? 'default', parsed.content)
          return HANDLED
        },
      })
    })
    if (typeof dispose === 'function') disposers.push(dispose)
  } catch (error) {
    console.error('[memory-ops] /remember 触发源注册失败：', error)
  }

  return () => {
    for (const dispose of disposers) dispose()
  }
}

/**
 * 浮层组件：对话框（编辑态）+ 保存提示（关闭态）。
 *
 * 焦点与 Esc 处理照宿主 Modal 的行为：打开时聚焦输入框，Esc 关闭，
 * 关闭后焦点还给输入框（不做严格 focus trap——宿主自带 Modal 才做，
 * 这里只是输入框内浮层，过度锁定反而会挡住用户继续打字）。
 */
function RememberOverlay(props: Record<string, unknown>): ReactNode {
  const useRemember = props.useRemember as ((selector: (s: RememberState) => RememberState) => RememberState) | undefined
  // 拿不到钩子时退回一个静态值，保证组件不崩（宿主改版时的最坏情况）
  const state = typeof useRemember === 'function'
    ? useRemember(snapshot => snapshot)
    : { open: false, content: '', toast: null }

  const [text, setText] = useState('')
  const [kind, setKind] = useState('想法')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<{ reason: string; masked: string } | null>(null)
  const inputRef = useRef<{ focus(): void } | null>(null)
  const sessionId = typeof props.sessionId === 'string' ? props.sessionId : 'default'

  // 打开时把预填内容灌进本地草稿并聚焦
  useEffect(() => {
    if (!state.open) return
    setText(state.content)
    setError(null)
    setBlocked(null)
    const timer = setTimeout(() => { inputRef.current?.focus() }, 0)
    return () => { clearTimeout(timer) }
  }, [state.open, state.content])

  // 提示 5 秒后自动消失
  useEffect(() => {
    if (state.toast === null) return undefined
    const timer = setTimeout(() => {
      setRememberToast(sessionId, null)
    }, 5000)
    return () => { clearTimeout(timer) }
  }, [state.toast, sessionId])

  function close(): void {
    closeRememberDialog(sessionId)
  }

  function submit(): void {
    const content = text.trim()
    if (content === '' || busy) return
    setBusy(true)
    setError(null)
    setBlocked(null)
    void call<CaptureResult>('capture', { content, kind })
      .then((result) => {
        if (result.ok) {
          closeRememberDialog(sessionId)
          setRememberToast(sessionId, {
            text: `已存入 ${orEmpty(result.captured?.path)}`,
            ok: true,
            savedContent: content,
            savedAt: Date.now(),
          })
          return
        }
        if (result.blocked === true) {
          setBlocked({ reason: result.reason ?? '疑似敏感信息', masked: result.masked ?? '' })
          return
        }
        setError(result.reason ?? result.error ?? '未知错误')
      })
      .catch((failure: unknown) => {
        setError(failure instanceof Error ? failure.message : String(failure))
      })
      .finally(() => {
        setBusy(false)
      })
  }

  /** 撤销：按内容匹配那一行（行号会因并发捕获漂移，内容在单人场景更稳）。 */
  function undo(): void {
    const saved = state.toast?.savedContent ?? ''
    if (saved === '') return
    setBusy(true)
    void call<InboxView>('inbox', { domain: 'personal' })
      .then((list) => {
        const rows = list.entries ?? []
        // 从末尾往前找：同一句话可能存过多次，撤销应命中最新的那一条
        const target = [...rows].reverse().find(row => row.content === saved)
        if (target === undefined) throw new Error('找不到刚存入的那一条（可能已被处理）')
        return call('deleteInbox', { domain: 'personal', lineIndexes: [target.lineIndex] })
      })
      .then(() => {
        setRememberToast(sessionId, { text: '已撤销', ok: true })
      })
      .catch((failure: unknown) => {
        setRememberToast(sessionId, {
          text: `撤销失败：${failure instanceof Error ? failure.message : String(failure)}`,
          ok: false,
        })
      })
      .finally(() => {
        setBusy(false)
      })
  }

  // ---- 关闭态：只显示短暂提示 ----
  if (!state.open) {
    if (state.toast === null) return null
    return createElement('div', {
      className: `dmo-remember-toast ${state.toast.ok ? 'dmo-toast-ok' : 'dmo-toast-err'}`,
      role: 'status',
      'aria-live': 'polite',
    },
    createElement('span', null, state.toast.text),
    state.toast.savedContent === undefined
      ? null
      : createElement('button', {
        type: 'button',
        className: 'dmo-remember-undo',
        disabled: busy,
        onClick: undo,
      }, '撤销'),
    createElement('button', {
      type: 'button',
      className: 'dmo-remember-dismiss',
      'aria-label': '关闭提示',
      onClick: () => { setRememberToast(sessionId, null) },
    }, '×'))
  }

  // ---- 打开态：对话框 ----
  return createElement('div', {
    className: 'dmo-remember-backdrop',
    // 点遮罩关闭；卡片内的点击不冒泡上来
    onClick: close,
    role: 'presentation',
  },
  createElement('div', {
    className: 'dmo-remember-card',
    role: 'dialog',
    'aria-modal': 'false',
    'aria-label': '存进记忆库',
    onClick: (event: { stopPropagation(): void }) => { event.stopPropagation() },
    onKeyDown: (event: { key: string; metaKey?: boolean; ctrlKey?: boolean; preventDefault(): void; stopPropagation(): void }) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        close()
        return
      }
      if (event.key === 'Enter' && (event.metaKey === true || event.ctrlKey === true)) {
        event.preventDefault()
        submit()
      }
    },
  },
  createElement('div', { className: 'dmo-remember-head' },
    createElement('span', { className: 'dmo-remember-title' }, '存进记忆库'),
    createElement('button', {
      type: 'button',
      className: 'dmo-remember-close',
      'aria-label': '关闭',
      onClick: close,
    }, '×')),

  createElement('div', { className: 'dmo-remember-body' },
    createElement('div', { className: 'dmo-row' },
      createElement('select', {
        className: 'dmo-select',
        value: kind,
        'aria-label': '记录类型',
        onChange: (event: { target: { value: string } }) => { setKind(event.target.value) },
      }, KINDS.map(item => createElement('option', { key: item, value: item }, item)))),

    createElement('textarea', {
      ref: inputRef,
      className: 'dmo-textarea dmo-remember-input',
      value: text,
      placeholder: '一句话赶紧存了（⌘/Ctrl + Enter 提交，Esc 取消）',
      'aria-label': '捕获内容',
      onChange: (event: { target: { value: string } }) => { setText(event.target.value) },
    }),

    // 隐私闸门：解释「为什么拒」并给脱敏后可用的文本
    blocked === null ? null : createElement('div', { className: 'dmo-toast dmo-toast-err', role: 'alert' },
      createElement('div', null, blocked.reason),
      createElement('div', { className: 'dmo-label', style: { marginTop: 6 } }, '脱敏后可用：'),
      createElement('div', { style: { wordBreak: 'break-all' } }, truncate(blocked.masked, 120)),
      createElement('div', { style: { marginTop: 6 } },
        createElement(Button, {
          small: true,
          onClick: () => {
            setText(blocked.masked)
            setBlocked(null)
          },
        }, '填入脱敏文本'))),

    error === null ? null : createElement('div', { className: 'dmo-toast dmo-toast-err', role: 'alert' }, error),

    createElement('div', { className: 'dmo-remember-foot' },
      createElement('span', { className: 'dmo-row-sub', style: { marginTop: 0 } },
        '存入后可在浮层里 30 秒内撤销'),
      createElement('div', { className: 'dmo-row', style: { flex: '0 0 auto' } },
        createElement(Button, { onClick: close }, '取消'),
        createElement(Button, {
          variant: 'primary',
          disabled: busy || text.trim() === '',
          onClick: submit,
        }, busy ? '存入中…' : '存一条'))))))
}
