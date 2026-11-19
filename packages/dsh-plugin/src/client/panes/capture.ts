/**
 * 分区「记一条」—— 唯一捕获页。
 *
 * ## 为什么叫「记一条」而不是「记录流」
 *
 * 「记录流」听起来像只读日志，用户不知道那是唯一能写入的地方
 * （information-architecture.md 根因 4）。改名后职责清晰：
 * 这一页的任务就是把一句话写进 INBOX，并让用户看到它真的进去了。
 *
 * ## 保留的旧能力
 *
 * 类型选择、多行拆条（captureBatch）、隐私拦截展示、
 * 「最近记的」回显与撤销——全部来自旧 stream.ts / capture-tab.ts 的既有行为。
 *
 * ## 读写分离
 *
 * 历史列表读失败时，捕获框仍然可用——写和读是两条独立路径，
 * 没有理由因为读不出来就不让人写。
 */

import { createElement, useState, type ReactNode } from 'react'

import { call, type InboxView } from '../api.ts'
import { useBridge } from '../data.ts'
import {
  Btn, EmptyState, ErrorAlert, InlineDone, PaneHead, Primary, SectionHead, SkeletonRows,
  h, tag, truncate,
} from '../ui.ts'

const KINDS = ['想法', '计划', '问题', '待办', '决策']

const INBOX_STATE_LABEL: Record<string, string> = {
  open: '未开始', todo: '进行中', done: '已完成', dropped: '已丢弃',
}

/** 「记一条」分区。 */
export function CapturePane(): ReactNode {
  const inbox = useBridge<InboxView>('inbox', { domain: 'personal' })
  const [text, setText] = useState('')
  const [kind, setKind] = useState('想法')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  /** 刚写入的行号集合（撤销用）。 */
  const [lastLines, setLastLines] = useState<number[] | null>(null)
  const [lastContent, setLastContent] = useState('')

  function submit(): void {
    const content = text.trim()
    if (content === '' || busy) return
    setBusy(true)
    const lines = content.split('\n').map(line => line.trim()).filter(Boolean)

    const done = (ok: boolean, message: string, written: number[]): void => {
      setFeedback({ ok, text: message })
      if (ok) {
        setText('')
        setLastLines(written)
        setLastContent(lines.length === 1 ? lines[0]! : `${lines[0]!}…等 ${lines.length} 条`)
        inbox.reload()
      }
      setBusy(false)
    }

    if (lines.length > 1) {
      void call<{ accepted?: string[]; blocked?: { line: string; reason: string }[] }>(
        'captureBatch', { text: content, kind },
      )
        .then((result) => {
          const okCount = result.accepted?.length ?? 0
          const blockedCount = result.blocked?.length ?? 0
          done(
            blockedCount === 0,
            blockedCount === 0
              ? `已拆成 ${okCount} 条存入记录流`
              : `${okCount} 条已存入，${blockedCount} 条被拦截`,
            [],
          )
        })
        .catch((error: unknown) => {
          setFeedback({ ok: false, text: error instanceof Error ? error.message : String(error) })
          setBusy(false)
        })
      return
    }

    void call<{ ok: boolean; captured?: { path: string }; reason?: string }>('capture', { content, kind })
      .then((result) => {
        if (result.ok) {
          // capture 不返回行号；从刷新后的 inbox 里按内容倒序找
          void call<InboxView>('inbox', { domain: 'personal' })
            .then((list) => {
              const match = [...list.entries].reverse().find(entry => entry.content === content)
              done(true, '已存入记录流', match === undefined ? [] : [match.lineIndex])
            })
            .catch(() => done(true, '已存入记录流', []))
        } else {
          done(false, result.reason ?? '没存上', [])
        }
      })
      .catch((error: unknown) => {
        // 失败时**绝不清空输入**——内容还在，用户可以重试
        setFeedback({ ok: false, text: `没存上：${error instanceof Error ? error.message : String(error)}。内容还在输入框里，可以重试。` })
        setBusy(false)
      })
  }

  function undo(): void {
    if (lastLines === null || lastLines.length === 0 || busy) return
    setBusy(true)
    void call<{ removed: number }>('deleteInbox', { domain: 'personal', lineIndexes: lastLines })
      .then(() => {
        setFeedback({ ok: true, text: `已撤销：「${truncate(lastContent, 20)}」` })
        setLastLines(null)
        inbox.reload()
      })
      .catch((error: unknown) => {
        setFeedback({ ok: false, text: error instanceof Error ? error.message : String(error) })
      })
      .finally(() => { setBusy(false) })
  }

  const head = PaneHead({
    pageName: '记一条',
    lede: '先存下来，之后在「待办」里整理',
    ledeSub: '不需要想清楚怎么写。多行会逐条拆开。',
  })

  /* v6 评审 P0-1：类型签 + 捕获框 + 隐私说明装进本页唯一重卡（主操作所在） */
  const captureCard = createElement('section', { className: 'dmo-card-heavy' },
    createElement('div', { className: 'dmo-kindrow', role: 'group', 'aria-label': '记录类型' },
      KINDS.map(item => createElement('button', {
        key: item,
        type: 'button',
        className: 'dmo-kindbtn',
        'data-kind': item,
        'aria-pressed': kind === item,
        onClick: () => { setKind(item) },
      }, item))),
    createElement('div', { className: 'dmo-capture' },
      createElement('textarea', {
        className: 'dmo-capture-input',
        style: { minHeight: 88 },
        'data-field': 'captureText',
        'aria-label': '记录内容',
        placeholder: '想到什么写什么，多行会逐条拆开',
        value: text,
        onChange: (event: { target: { value: string } }) => { setText(event.target.value) },
        onKeyDown: (event: { key: string; ctrlKey?: boolean; metaKey?: boolean; preventDefault(): void }) => {
          if (event.key === 'Enter' && (event.ctrlKey === true || event.metaKey === true)) {
            event.preventDefault()
            submit()
          }
        },
      }),
      createElement('div', { className: 'dmo-capture-foot' },
        Primary({
          children: busy ? '存入中…' : '存进去',
          onClick: submit,
          disabled: busy || text.trim() === '',
          attrs: { 'data-action': 'capture' },
        }),
        h('span', { className: 'dmo-capture-hint' }, 'Ctrl / ⌘ + Enter')),
      feedback === null ? null : InlineDone({
        ok: feedback.ok,
        text: feedback.text,
        onUndo: lastLines !== null && lastLines.length > 0 ? undo : undefined,
      })),
    h('p', { className: 'dmo-note' },
      '存之前会检查有没有密钥、私钥、身份证号、内网 IP——有就拒写，并给出脱敏版本。'))

  if (inbox.phase === 'loading') {
    return createElement('div', { className: 'dmo-pane' }, head, captureCard,
      createElement('section', { className: 'dmo-card-quiet' },
        SectionHead({ title: '最近记的' }), SkeletonRows({ rows: 3, height: 40 })))
  }

  /*
   * 历史列表读失败时，捕获框仍然可用。
   * 写和读是两条独立路径，没有理由因为读不出来就不让人写。
   * 「重试」是次按钮：这一相位的主操作仍是「存进去」。
   */
  if (inbox.phase === 'error') {
    return createElement('div', { className: 'dmo-pane' }, head, captureCard,
      h(ErrorAlert, {
        title: '读不到历史记录',
        body: '写入仍然可用——上面那个输入框不受影响。这里只是「最近记的」列表读不出来。',
        actions: [Btn({ children: '重试读取', onClick: inbox.reload, attrs: { 'data-action': 'retry' } })],
      }))
  }

  if (inbox.data === undefined || inbox.data.entries.length === 0) {
    return createElement('div', { className: 'dmo-pane' }, head, captureCard,
      createElement('section', { className: 'dmo-card-quiet' },
        SectionHead({ title: '最近记的' }),
        h(EmptyState, {
          title: '还没有记过',
          body: '这里会列出你刚存下的每一条。存完立刻能看到，也会出现在「待办」里。',
        })))
  }

  const rows = inbox.data.entries.map(row => createElement('li', { key: row.lineIndex, className: 'dmo-row' },
    h('p', { className: 'dmo-row-title' }, truncate(row.content, 90)),
    h('div', { className: 'dmo-meta-row' },
      h('span', { className: 'dmo-meta' }, row.date),
      h('span', { className: 'dmo-meta' }, row.kind),
      tag(INBOX_STATE_LABEL[row.state] ?? row.state, row.state === 'done' ? 'ok' : 'warn'),
      row.destination === '—' || row.destination === ''
        ? null
        : h('span', { className: 'dmo-meta' }, `→ ${truncate(row.destination, 24)}`)),
    row.kindValid ? null : tag('类型非法', 'err'),
    row.stateValid ? null : tag('状态非法', 'err')))

  return createElement('div', { className: 'dmo-pane' }, head, captureCard,
    createElement('section', { className: 'dmo-card-quiet' },
      SectionHead({ title: '最近记的', count: `${inbox.data.entries.length} 条` }),
      createElement('ul', { className: 'dmo-list', role: 'list' }, rows)))
}
