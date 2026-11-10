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
import { gotoPane } from './pane-nav.ts'
import { scopeBody, useSessionProject, type ClientContextLike } from './session-context.ts'
import {
  AnchorNote, Badge, Button, ErrorState, Skeleton, count, orEmpty, truncate,
} from './ui.ts'

/** 会话记忆视图。 */
export function SessionMemoryView(props: Record<string, unknown>): ReactNode {
  /**
   * 去未命中工作台的回调（宿主未提供时**退回内置跳转**，不再静默）。
   *
   * 早先这里只认宿主传入的回调，而 `registerSessionView` 从来没传过
   * → 按钮点下去是 `undefined?.()`，一点反应都没有。现在：宿主给了就用宿主的，
   * 没给就走 `gotoPane`（写分区请求 + `ctx.layout.selectPanel`），两条路都通不了才报错。
   */
  const onGotoMisses = typeof props.onGotoMisses === 'function'
    ? props.onGotoMisses as () => void
    : undefined
  const ctx = (props as { ctx?: ClientContextLike }).ctx
  const sessionId = typeof props.sessionId === 'string' ? props.sessionId : undefined
  const { cwd, project } = useSessionProject(ctx)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)
  /**
   * cwd 优先：会话 tab 早先只送 `project`（cwd 末段），
   * 于是 `V2.1.25-dev` 这种分支名永远匹配不到库里的 `sz-web`。
   */
  const { phase, data, error, reload } = useBridge<SessionMemoryView>(
    'sessionMemory',
    { sessionId, ...scopeBody(cwd, project) },
    [sessionId, cwd, project],
  )

  /**
   * 跳到未命中工作台。
   *
   * @param viaSidebar - 侧栏「已转草稿」等文案引导的入口，失败提示里点名侧栏。
   */
  function goMisses(viaSidebar = false): void {
    if (onGotoMisses !== undefined) {
      onGotoMisses()
      return
    }
    const ok = gotoPane(ctx, 'misses')
    if (ok) return
    /**
     * 跳不过去时必须说话。早先这里什么都不发生，用户只能反复点同一个按钮
     * 而得不到任何解释——「点了没反应」正是这么来的。
     */
    setToast({
      ok: false,
      text: viaSidebar
        ? '已记下目标分区，但侧栏「记忆库」面板没有打开（可从左侧栏手动打开）。'
        : '打不开记忆面板：当前宿主没有提供 layout 服务（可从左侧栏「记忆库」手动进入）。',
    })
  }

  function draftFromMiss(query: string): void {
    setBusy(true)
    setToast(null)
    void call('missDraft', { query, type: '问题' })
      .then(() => {
        setToast({ ok: true, text: `「${truncate(query, 20)}」已转草稿。` })
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

  const resolution = data.resolution
  /** 项目解析三态：认出来了 / 给了 cwd 但没认出 / 压根没 cwd。 */
  const unknownProject = resolution !== null && resolution.project === null
  const noCwd = resolution === null && data.project === null

  return createElement('div', { className: 'dmo-session' },
    /**
     * 项目归属必须写在顶上。
     *
     * 早先这一栏没有项目信息，用户看到一个空 tab 时完全不知道
     * 「是没注入」还是「是没认出项目」——两种情况的下一步动作完全不同。
     */
    createElement('div', { className: 'dmo-row-sub', style: { marginBottom: 6 } },
      data.project === null ? '项目：未解析' : `项目：${data.project}`,
      resolution?.matchedBy === 'alias'
        ? ` · 由别名 ${orEmpty(resolution.matchedAlias)} 推断`
        : resolution?.matchedBy === 'name' ? ' · 目录名与项目同名' : '',
      resolution?.matchedBy === 'prefix' ? ` · 由前缀 ${orEmpty(resolution.matchedAlias)} 推断` : ''),

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

    unknownProject
      ? createElement('div', { className: 'dmo-degrade' },
        `没能从当前目录认出项目：${orEmpty(resolution.reason)}`,
        createElement('div', { className: 'dmo-row-sub' },
          `当前目录：${orEmpty(resolution.cwd)}`,
          resolution.knownProjects.length === 0 ? '' : ` · 已知项目：${resolution.knownProjects.join(' / ')}`))
      : noCwd
        ? createElement('div', { className: 'dmo-degrade' },
          '没拿到当前目录，无法判定项目（这不会影响任务，只是这一栏没法按项目过滤）。')
        : null, 

    toast === null ? null : createElement('div', {
      className: `dmo-toast ${toast.ok ? 'dmo-toast-ok' : 'dmo-toast-err'}`,
      role: 'status',
    }, toast.text),

    // 为什么注入
    createElement('div', { className: 'dmo-lane-head' }, '为什么注入'),
    data.reasons.length === 0
      ? createElement('div', { className: 'dmo-note' },
        data.recalled === 0
          ? '本会话还没有检索记录。记忆只在被检索时才注入——这是成本设计，不是缺陷。'
          /**
           * 有 recall 却给不出原因：说清是「事件里没记 id」还是「条目已不在库里」。
           * 早先这里恒为「本会话还没有检索记录」，与上面「注入 N」自相矛盾。
           */
          : `本会话有 ${count(data.recalled)} 次检索，但事件里没有可回指的条目 id（可能是旧版本写入的记录）。`)
      : data.reasons.map(reason => createElement('div', { key: reason.id, className: 'dmo-card' },
        createElement('div', { className: 'dmo-card-title' }, truncate(reason.title, 46)),
        createElement('div', { className: 'dmo-card-meta' },
          createElement(Badge, { tone: 'brand' }, reason.why),
          createElement('span', null, `${count(reason.tokens)} tokens`),
          reason.at === '' ? null : createElement('span', null, orEmpty(reason.at.slice(0, 19).replace('T', ' '))),
          reason.anchor === null
            ? null
            : createElement(AnchorNote, { state: reason.anchorState === 'stale' ? 'stale' : 'fresh' },
              reason.anchorState === 'stale' ? '锚点失效' : '锚点有效',
              createElement('div', { className: 'dmo-row-sub' },
                `${orEmpty(reason.anchor.path)}${reason.anchor.symbol === undefined ? '' : ` · ${reason.anchor.symbol}`}`,
                reason.anchor.hash === undefined ? '' : ` · hash ${reason.anchor.hash.slice(0, 8)}`))))),

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

    data.recentMisses.length === 0
      ? null
      : createElement('div', { className: 'dmo-anchor-note', 'data-state': 'stale' },
        createElement('span', null, '这些检索落空了'),
        createElement('div', { className: 'dmo-row-sub' },
          '同一个问题满 3 次会自动进「该补了」，也可以现在就补。')),

    createElement('div', { className: 'dmo-row', style: { marginTop: 4 } },
      createElement(Button, { small: true, onClick: reload }, '刷新'),
      createElement(Button, { small: true, onClick: () => { goMisses(true) } }, '去未命中工作台')))
}
