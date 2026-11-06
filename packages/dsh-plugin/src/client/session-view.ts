/**
 * 表面 2：会话记忆 tab —— 「这次任务有没有踩过坑」。
 *
 * v3 要求：显示「本次注入 N · 引用 M · 未命中 K」+ **为什么注入**（关键词与锚点）
 * + 未命中转草稿。为什么注入这一栏是重点：没有它，用户无法判断
 * 记忆是「真的相关」还是「碰巧命中关键词」。
 */

import { createElement, useState, type ReactNode } from 'react'

import { call, type SessionMemoryView } from './api.ts'
import { useBridge } from './data.ts'
import { useSessionProject, type ClientContextLike } from './session-context.ts'
import {
  Badge, Button, ErrorState, Skeleton, count, orEmpty, truncate,
} from './ui.ts'

/** 会话记忆视图。 */
export function SessionMemoryView(props: Record<string, unknown>): ReactNode {
  const ctx = (props as { ctx?: ClientContextLike }).ctx
  const sessionId = typeof props.sessionId === 'string' ? props.sessionId : undefined
  const { project } = useSessionProject(ctx)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)
  const { phase, data, error, reload } = useBridge<SessionMemoryView>(
    'sessionMemory',
    { sessionId, project },
    [sessionId, project],
  )

  function draftFromMiss(query: string): void {
    setBusy(true)
    setToast(null)
    void call('missDraft', { query, type: '问题' })
      .then(() => {
        setToast({ ok: true, text: `「${truncate(query, 20)}」已转草稿，去侧栏「未命中」分区补结论。` })
        reload()
      })
      .catch((failure: unknown) => {
        setToast({ ok: false, text: failure instanceof Error ? failure.message : String(failure) })
      })
      .finally(() => {
        setBusy(false)
      })
  }

  if (phase === 'loading') return createElement(Skeleton, { rows: 2, height: 60 })
  if (phase === 'error') return createElement(ErrorState, { message: `读取会话记忆失败：${orEmpty(error)}`, onRetry: reload })
  if (data === undefined) return createElement(Skeleton, { rows: 1 })

  return createElement('div', { className: 'dmo-session' },
    createElement('div', { className: 'dmo-session-kpis' },
      createElement('div', { className: 'dmo-session-kpi' },
        createElement('b', null, count(data.injected)),
        createElement('span', null, '本次注入')),
      createElement('div', { className: 'dmo-session-kpi' },
        createElement('b', null, count(data.cited)),
        createElement('span', null, '引用')),
      createElement('div', { className: 'dmo-session-kpi' },
        createElement('b', null, count(data.missed)),
        createElement('span', null, '未命中'))),

    toast === null ? null : createElement('div', {
      className: `dmo-toast ${toast.ok ? 'dmo-toast-ok' : 'dmo-toast-err'}`,
      role: 'status',
    }, toast.text),

    // 为什么注入
    createElement('div', { className: 'dmo-lane-head' }, '为什么注入'),
    data.reasons.length === 0
      ? createElement('div', { className: 'dmo-note' },
        '本会话还没有检索记录。记忆只在被检索时才注入——这是成本设计，不是缺陷。')
      : data.reasons.map(reason => createElement('div', { key: reason.id, className: 'dmo-card' },
        createElement('div', { className: 'dmo-card-title' }, truncate(reason.title, 46)),
        createElement('div', { className: 'dmo-card-meta' },
          createElement(Badge, { tone: 'brand' }, reason.why),
          createElement('span', null, `${count(reason.tokens)} tokens`),
          reason.anchor === null ? null : createElement(Badge, { tone: 'idle' }, '锚点')))),

    // 未命中转草稿
    createElement('div', { className: 'dmo-lane-head', style: { marginTop: 4 } }, '未命中'),
    data.recentMisses.length === 0
      ? createElement('div', { className: 'dmo-note' }, '本会话没有未命中。')
      : data.recentMisses.map((miss, index) => createElement('div', {
        key: `${miss.at}-${index}`,
        className: 'dmo-row-item',
      },
      createElement('div', { className: 'dmo-row-main' },
        createElement('div', { className: 'dmo-row-text' }, truncate(miss.query ?? '', 40)),
        createElement('div', { className: 'dmo-row-sub' }, orEmpty(miss.at.slice(0, 19).replace('T', ' ')))),
      createElement(Button, {
        small: true,
        disabled: busy,
        onClick: () => { draftFromMiss(miss.query ?? '') },
      }, '转草稿'))),

    createElement('div', { className: 'dmo-row', style: { marginTop: 4 } },
      createElement(Button, { small: true, onClick: reload }, '刷新')))
}
