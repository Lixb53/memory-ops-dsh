/**
 * 分区「今天」—— v4 默认落地页。
 *
 * ## 唯一核心任务
 *
 * 让用户在 1 秒内知道「现在该做哪一件事」，并能一键做掉。
 *
 * ## 为什么这张建议卡必须存在
 *
 * 旧首屏（本项目分区）的 KPI 全是空转仪表：队列为空时它整块不渲染，
 * 于是「最需要说话的时刻」反而最安静。这里的硬规则是：
 * **无论数据是什么状态，都必须给出一件事**。没有待办也是一件事——
 * 那件事叫「去看看库里有什么」。
 *
 * ## brand 实底名额
 *
 * 方向卡 §二：全屏最多一处。判定口径：**这一屏除了它还有没有别的主操作**。
 * 正常态建议卡占用名额，捕获框是旁路动作（次按钮）；
 * 空态下建议卡不存在，捕获框是唯一出路（主按钮）。
 */

import { createElement, useState, type ReactNode } from 'react'

import { call, type CaptureResult, type InboxView, type MissesView, type SnapshotView } from '../api.ts'
import { useBridge } from '../data.ts'
import { gotoPane, type PaneId } from '../pane-nav.ts'
import { scopeBody, useSessionProject, type ClientContextLike } from '../session-context.ts'
import {
  Btn, ErrorAlert, InlineDone, Primary, SectionHead, SkeletonRows,
  count, h, truncate,
} from '../ui.ts'

/** 隐私拦截等桥错误在 UI 上的归类提示（与 core 的 ActionFailureKind 对齐）。 */
function hintOf(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/密钥|私钥|身份证|内网 IP|拒写/.test(message)) {
    return '明文 Markdown 不能存密钥。可以用脱敏版本重存。'
  }
  if (/写锁超时|EEXIST/.test(message)) {
    return '另一个进程正在写同一个文件，等一两秒再试。'
  }
  return '库文件没有丢，这是读取或写入问题。'
}

/** 建议卡的一种形态。 */
interface Suggestion {
  label: string
  title: string
  body: string
  primaryText: string
  primary: { action: 'confirm' | 'goto'; path?: string; pane?: string }
  secondary?: { action: 'open-detail'; path: string; text: string } | { action: 'goto'; pane: string; text: string }
}

/**
 * 优先级：拍板 > 补库 > 流转 > 兜底。
 *
 * 为什么拍板排第一：推断类条目未确认前会持续参与检索且不可信，
 * 它是唯一「不做就会持续产生错误输出」的一类。
 */
function pickSuggestion(
  queue: SnapshotView['queue'],
  fillable: number,
  openInbox: number,
  entryCount: number,
): Suggestion {
  if (queue.length > 0) {
    const first = queue[0]!
    const conf = first.confidence === null ? '未标' : first.confidence.toFixed(1)
    return {
      label: '建议先做这一件',
      title: '有一条推断等你拍板',
      body: `「${truncate(first.title, 24)}」——置信度 ${conf}。`
        + '确认后它会参与后续会话；不确定就驳回，并写一句为什么。',
      primaryText: '确认这条',
      // v6 修复：core 的 confirm/detail 要的是 path（personal/principles.md），
      // 不是点分 id（personal.principles）——早先前传 first.id，点了必 ENOENT。
      primary: { action: 'confirm', path: first.path },
      secondary: { action: 'open-detail', path: first.path, text: '先看全文' },
    }
  }
  if (fillable > 0) {
    return {
      label: '建议先做这一件',
      title: '补一条搜不到的东西',
      body: `有 ${fillable} 个问题被反复问到，库里还没有答案。`,
      primaryText: '去补库',
      primary: { action: 'goto', pane: 'todo' },
      secondary: { action: 'goto', pane: 'todo', text: '看明细' },
    }
  }
  if (openInbox > 0) {
    return {
      label: '建议先做这一件',
      title: '记录流里还有没结的事',
      body: `${openInbox} 条没结。做完标完成，不做就丢掉——留着会让「待办」失去意义。`,
      primaryText: '去处理',
      primary: { action: 'goto', pane: 'todo' },
      secondary: { action: 'goto', pane: 'capture', text: '记新的' },
    }
  }
  return {
    label: '现在没有待办',
    title: '库里一切都处理完了',
    body: `${entryCount} 条记忆、0 条待办。这时候最有用的事是看看有没有该退役的，或者记下今天的一个结论。`,
    primaryText: '看看库里有什么',
    primary: { action: 'goto', pane: 'memory' },
    secondary: { action: 'goto', pane: 'capture', text: '记一条' },
  }
}

/** 一条可点的线索格子。 */
function trailLine(value: string | number, text: string, pane: string, onGoto: (pane: string) => void): ReactNode {
  return h('button', {
    key: text,
    type: 'button',
    className: 'dmo-trail-line',
    onClick: () => { onGoto(pane) },
  },
  h('span', { className: 'dmo-trail-num' }, String(value)),
  h('span', { className: 'dmo-trail-text' }, text))
}

/** 「今天」分区。 */
export function TodayPane({ ctx, onOpenDetail }: {
  ctx?: ClientContextLike
  /** 打开某条记忆的详情（面板传入；缺省时退化为跳「记忆」分区）。 */
  onOpenDetail?: (path: string) => void
}): ReactNode {
  const { cwd, project } = useSessionProject(ctx)
  const snapshot = useBridge<SnapshotView>('snapshot', scopeBody(cwd, project), [cwd, project])
  const inbox = useBridge<InboxView>('inbox', { domain: 'personal' })
  const misses = useBridge<MissesView>('misses', {})

  /** 捕获输入与刚写入的记录（撤销用）。 */
  const [captureText, setCaptureText] = useState('')
  const [captureKind] = useState('想法')
  const [lastCapture, setLastCapture] = useState<{ content: string } | null>(null)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  /** 主动作与次动作的反馈要分开落位：建议卡的留在卡里，捕获的留在框里。 */
  const [suggestFeedback, setSuggestFeedback] = useState<{ ok: boolean; text: string } | null>(null)

  function submitCapture(): void {
    const text = captureText.trim()
    if (text === '' || busy) return
    setBusy(true)
    void call<CaptureResult>('capture', { content: text, kind: captureKind })
      .then((result) => {
        if (result.ok) {
          setLastCapture({ content: text })
          setCaptureText('')
          setFeedback({ ok: true, text: '已存入记录流' })
          inbox.reload()
          snapshot.reload()
          misses.reload()
        } else {
          setFeedback({ ok: false, text: result.reason ?? '没存上' })
        }
      })
      .catch((error: unknown) => {
        setFeedback({ ok: false, text: `${error instanceof Error ? error.message : String(error)}` })
      })
      .finally(() => { setBusy(false) })
  }

  function undoCapture(): void {
    if (lastCapture === null || busy) return
    setBusy(true)
    void call<InboxView>('inbox', { domain: 'personal' })
      .then((list) => {
        const match = [...list.entries].reverse().find(entry => entry.content === lastCapture.content)
        if (match === undefined) throw new Error('找不到刚存入的那一条（可能已被处理）')
        return call('deleteInbox', { domain: 'personal', lineIndexes: [match.lineIndex] })
      })
      .then(() => {
        setLastCapture(null)
        setFeedback({ ok: true, text: '已撤销' })
        inbox.reload()
        snapshot.reload()
      })
      .catch((error: unknown) => {
        setFeedback({ ok: false, text: `${error instanceof Error ? error.message : String(error)}` })
      })
      .finally(() => { setBusy(false) })
  }

  function confirmEntry(path: string): void {
    setBusy(true)
    void call('confirm', { path })
      .then(() => {
        const remaining = snapshot.data?.queue.filter(item => item.id !== path).length ?? 0
        setSuggestFeedback({
          ok: true,
          text: '已确认' + (remaining > 0 ? ` · 还剩 ${remaining} 条待拍板` : ' · 待拍板清空了'),
        })
        snapshot.reload()
      })
      .catch((error: unknown) => {
        setSuggestFeedback({ ok: false, text: hintOf(error) })
      })
      .finally(() => { setBusy(false) })
  }

  /* —— 派生：全部在渲染期从桥数据算出，不持有跨渲染状态 —— */
  const entries = snapshot.data?.entries ?? []
  const queue = snapshot.data?.queue ?? []
  const openInbox = (inbox.data?.entries ?? []).filter(row => row.state === 'open' || row.state === 'todo').length
  const fillable = (misses.data?.counts?.['should-fill'] ?? 0)
  const todoTotal = queue.length + openInbox + fillable
  const isEmpty = snapshot.data !== undefined && entries.length === 0

  // 分区跳转走 pane-nav 的正式机制：写请求 + selectPanel 拉起面板
  const onGoto = (pane: string): void => { gotoPane(ctx, pane as PaneId) }

  /* —— 渲染 —— */
  if (snapshot.phase === 'loading') {
    return createElement('div', null,
      SkeletonRows({ rows: 1, height: 28 }),
      SkeletonRows({ rows: 1, height: 22 }),
      SkeletonRows({ rows: 2, height: 96 }))
  }
  if (snapshot.phase === 'error') {
    return createElement('div', null,
      h(ErrorAlert, {
        title: '读不到记忆库',
        body: '库文件没有丢，这是读取问题。先重试；如果一直失败，去「库健康」看库根目录还在不在。',
        actions: [
          Primary({ children: '重试', onClick: snapshot.reload, attrs: { 'data-action': 'retry' } }),
          Btn({ children: '去库健康', onClick: () => { onGoto('health') }, attrs: { 'data-action': 'goto', 'data-pane': 'health' } }),
        ],
      }),
    )
  }

  /* 空库：唯一出路是写下第一条，捕获框用主按钮 */
  if (isEmpty) {
    return createElement('div', { className: 'dmo-pane' },
      h('h1', { className: 'dmo-lede' }, '这是你的第一条记忆'),
      h('p', { className: 'dmo-lede-sub' }, '写一句你今天想记住的话，agent 下次就会用上它。'),
      createElement('div', { className: 'dmo-capture' },
        createElement('textarea', {
          className: 'dmo-capture-input',
          'data-field': 'captureText',
          'aria-label': '记一条',
          placeholder: '一句话赶紧存了…',
          value: captureText,
          onChange: (event: { target: { value: string } }) => { setCaptureText(event.target.value) },
          onKeyDown: (event: { key: string; ctrlKey?: boolean; metaKey?: boolean; preventDefault(): void }) => {
            if (event.key === 'Enter' && (event.ctrlKey === true || event.metaKey === true)) {
              event.preventDefault()
              submitCapture()
            }
          },
        }),
        createElement('div', { className: 'dmo-capture-foot' },
          Primary({
            children: busy ? '存入中…' : '存进去',
            onClick: submitCapture,
            disabled: busy || captureText.trim() === '',
            attrs: { 'data-action': 'capture' },
          }),
          h('span', { className: 'dmo-capture-hint' }, 'Ctrl / ⌘ + Enter')),
        feedback === null ? null : InlineDone({
          ok: feedback.ok,
          text: feedback.text,
          onUndo: lastCapture === null ? undefined : undoCapture,
        })),
      lastCapture === null ? null
        : createElement('div', { style: { marginTop: 'var(--s2)' } },
            Btn({ children: '撤销刚才那条', onClick: undoCapture, disabled: busy, attrs: { 'data-action': 'undo-capture' } })))
  }

  const lede = todoTotal === 0
    ? `没有待办。库里 ${count(entries.length)} 条，记录流 ${count(inbox.data?.throughput.total ?? 0)} 条`
    : `有 ${count(todoTotal)} 件事压着，先从最上面那件开始`
  const sug = pickSuggestion(queue, fillable, openInbox, entries.length)

  /* v6 顺序：KPI 账带在最前（一眼看清全局），其次建议卡（唯一重操作），
     再次捕获条，最后才是可点的次要线索行。 */
  const tape = createElement('div', { className: 'dmo-trail', role: 'group', 'aria-label': '全局指标' },
    trailLine(todoTotal, '件事压着', 'todo', onGoto),
    trailLine(misses.data?.total ?? 0, '搜不到', 'todo', onGoto),
    trailLine(entries.length, '条记忆', 'memory', onGoto),
    trailLine(
      snapshot.data?.stats.layers.l0.tokens ?? 0,
      'tokens 索引',
      'health', onGoto))

  return createElement('div', { className: 'dmo-pane' },
    tape,

    h('h1', { className: 'dmo-lede' }, lede),
    h('p', { className: 'dmo-lede-sub' }, '这个面板只回答一个问题：你现在该做哪件事。其余都收在下面。'),

    createElement('div', { className: 'dmo-suggest' },
      h('p', { className: 'dmo-suggest-label' }, sug.label),
      h('h2', { className: 'dmo-suggest-title' }, sug.title),
      h('p', { className: 'dmo-suggest-body' }, sug.body),
      createElement('div', { className: 'dmo-suggest-actions' },
        Primary({
          children: sug.primaryText,
          onClick: () => {
            if (sug.primary.action === 'confirm' && sug.primary.path !== undefined) confirmEntry(sug.primary.path)
            else if (sug.primary.pane !== undefined) onGoto(sug.primary.pane)
          },
          disabled: busy,
          attrs: { 'data-action': sug.primary.action === 'confirm' ? 'suggest-confirm' : 'goto', 'data-path': sug.primary.path ?? '' },
        }),
        (() => {
          const sec = sug.secondary
          if (sec === undefined) return null
          // v6 评审 P0-1：早先只带 attrs 测试钩子没有 onClick——点了没反应。
          // 详情走面板传入的 onOpenDetail；缺省（面板改版/独立渲染）退化为跳「记忆」。
          if (sec.action === 'open-detail') {
            return Btn({
              children: sec.text, quiet: true,
              onClick: () => { (onOpenDetail ?? (() => { onGoto('memory') }))(sec.path) },
              attrs: { 'data-action': 'open-detail', 'data-path': sec.path },
            })
          }
          return Btn({
            children: sec.text, quiet: true,
            onClick: () => { onGoto(sec.pane) },
            attrs: { 'data-action': 'goto', 'data-pane': sec.pane },
          })
        })()),
      suggestFeedback === null ? null : InlineDone({ ok: suggestFeedback.ok, text: suggestFeedback.text })),

    SectionHead({ title: '随手记一条', count: '1 步' }),
    createElement('div', { className: 'dmo-capture' },
      createElement('textarea', {
        className: 'dmo-capture-input',
        'data-field': 'captureText',
        'aria-label': '记一条',
        placeholder: '一句话赶紧存了…',
        value: captureText,
        onChange: (event: { target: { value: string } }) => { setCaptureText(event.target.value) },
        onKeyDown: (event: { key: string; ctrlKey?: boolean; metaKey?: boolean; preventDefault(): void }) => {
          if (event.key === 'Enter' && (event.ctrlKey === true || event.metaKey === true)) {
            event.preventDefault()
            submitCapture()
          }
        },
      }),
      createElement('div', { className: 'dmo-capture-foot' },
        Btn({ children: busy ? '存入中…' : '存进去', onClick: submitCapture, disabled: busy || captureText.trim() === '', attrs: { 'data-action': 'capture' } }),
        h('span', { className: 'dmo-capture-hint' }, 'Ctrl / ⌘ + Enter')),
      feedback === null ? null : InlineDone({
        ok: feedback.ok,
        text: feedback.text,
        onUndo: lastCapture === null ? undefined : undoCapture,
      })))
}
