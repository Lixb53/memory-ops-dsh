/**
 * 分区「记一条」—— 写进去并看到它进去了。
 *
 * ## 主操作的位置（brief §十）
 *
 * 「存进去」是整页唯一的墨块，落在输入框下方；顶条不出现主操作。
 *
 * ## 四态
 *
 * error 时写入仍可用（读「最近记的」失败不等于写失败），但界面必须说清
 * 哪一半坏了——原型 v8 把整页换成错误块，等于把可用的写入也一起关掉。
 * empty 时输入框保留：没有记过东西的人最需要的就是这个框。
 */

import { createElement, useState, type ReactNode } from 'react'

import { captureOne, patchInboxRow, undoCapture } from '../actions.ts'
import {
  EmptyBlock, ErrorBlock, KindButtons, Props, Row, SectionHead, Skeleton,
  BtnGhost, BtnInk, num,
} from '../primitives.ts'
import type { PaneProps } from '../types.ts'
import { InspectorFrame } from '../stage.ts'
import { clip, daysSince, estimateTokens, type ToneName } from '../view-model.ts'

/** INBOX 五个类型（与 core 的枚举一致，不许增删）。 */
export const INBOX_KINDS = ['想法', '计划', '问题', '待办', '决策'] as const

/** INBOX 状态 → 中文 + 语气。 */
export function inboxStateOf(state: string): { label: string; tone: ToneName } {
  if (state === 'open') return { label: '开着', tone: 'warn' }
  if (state === 'todo') return { label: '流转中', tone: 'idle' }
  if (state === 'done') return { label: '完成', tone: 'ok' }
  if (state === 'dropped') return { label: '丢掉', tone: 'idle' }
  return { label: state, tone: 'idle' }
}

/** 中栏。 */
export function CaptureCenter(props: PaneProps): ReactNode {
  const { phase, data, draft, onDraft, run, pending, onSelect, sel } = props
  const [kind, setKind] = useState<string>('想法')

  const submit = (): void => {
    const text = draft.trim()
    if (text === '' || pending) return
    run(async () => {
      await captureOne(text, kind)
      onDraft('')
    }, '已存入 personal/INBOX.md（末行）· 状态 open', {
      label: '撤销这次写入',
      run: () => undoCapture(text),
    })
  }

  const form = createElement('div', { className: 'mo-capture-box' },
    KindButtons({ kinds: INBOX_KINDS, kind, onKind: setKind }),
    createElement('label', { className: 'mo-sr-only', htmlFor: 'mo-capture-text' }, '要记的内容'),
    createElement('textarea', {
      className: 'mo-capture-input',
      id: 'mo-capture-text',
      'aria-label': '要记的内容',
      placeholder: '一句话就够。例：宿主对 git 直装判 not-updatable，更新要给出人话解释',
      value: draft,
      onChange: (event: { target: { value: string } }) => { onDraft(event.target.value) },
      onKeyDown: (event: { key: string; ctrlKey?: boolean; metaKey?: boolean; preventDefault(): void }) => {
        if (event.key === 'Enter' && (event.ctrlKey === true || event.metaKey === true)) {
          event.preventDefault()
          submit()
        }
      },
    }),
    createElement('p', { className: 'mo-capture-note' },
      '会先落进 ', createElement('span', { className: 'mo-num' }, 'personal/INBOX.md'),
      '，状态 open；密钥、私钥、身份证、内网 IP 会被拦下。'),
    createElement('div', { className: 'mo-capture-actions' },
      BtnInk({
        children: pending ? '写入中' : '存进去',
        actName: 'capture',
        disabled: pending || draft.trim() === '',
        onClick: submit,
      }),
      createElement('span', { className: 'mo-section-note mo-num' },
        `${num(draft.trim() === '' ? 0 : estimateTokens(draft))} tokens`)),
    )

  if (phase === 'error') {
    return createElement('div', { className: 'mo-pane-inner' },
      form,
      ErrorBlock({
        title: '读不到「最近记的」',
        text: 'INBOX 写入仍可用（上面这个框），但这一栏读不到——不是「一条都没有」。',
        example: '点下面的「重试」；仍失败就检查库根目录',
        onRetry: () => { data.reloadAll() },
      }))
  }
  if (phase === 'loading') {
    return createElement('div', { className: 'mo-pane-inner' }, form, Skeleton({ rows: 3, label: '读取中：正在取最近记的' }))
  }

  const recent = [...(data.inbox.data?.entries ?? [])].reverse().slice(0, 3)
  if (phase === 'empty') {
    return createElement('div', { className: 'mo-pane-inner' },
      form,
      EmptyBlock({
        title: '今天还没记任何一条',
        text: '记一条只要一句话。它会先落进 INBOX，等你确认后才成为记忆。',
        hint: `INBOX 当前 ${num(data.inbox.data?.throughput.open ?? 0)} 条 open`,
      }))
  }

  return createElement('div', { className: 'mo-pane-inner' },
    form,
    SectionHead({
      title: '最近记的',
      note: `${num(recent.length)} 条 · 未确认 · 右列等几天`,
    }),
    createElement('ul', { className: 'mo-rows', role: 'list' },
      recent.map((row) => {
        const state = inboxStateOf(row.state)
        return Row({
          spec: {
            id: `i:${row.lineIndex}`,
            title: clip(row.content, 80),
            meta: `${row.kind} · 记于 ${row.date}`,
            source: 'INBOX',
            num: daysSince(row.date),
            state: state.label,
            tone: state.tone,
            dense: true,
            current: sel === `i:${row.lineIndex}`,
          },
          onSelect,
        })
      })))
}

/** 检视栏。 */
export function CaptureInspector(props: PaneProps): ReactNode {
  const { data, sel, notice, run, pending } = props
  const rows = data.inbox.data?.entries ?? []
  const selected = rows.find(row => `i:${row.lineIndex}` === sel)

  /* 隐私拦截优先：它决定这一笔到底有没有落库。 */
  if (notice !== null && !notice.ok) {
    const privacy = notice.kind === 'privacy'
    return InspectorFrame({
      title: privacy ? '这一笔被隐私闸门拦下' : '这一笔没写进去',
      sub: privacy ? '未写入任何文件' : '写入失败 · 库里没有这次改动',
      body: createElement('div', null,
        createElement('div', { className: 'mo-verdicts' },
          createElement('div', { className: `mo-verdict mo-verdict-${privacy ? 'refuse' : 'warn'}` },
            createElement('span', { className: 'mo-verdict-tag' }, privacy ? '拦下' : '失败'),
            createElement('span', null, notice.text))),
        createElement('p', { className: 'mo-insp-text' },
          privacy
            ? '脱敏后可以重存：把值换成占位符（如 sk-***），原文不要进库。'
            : '库文件没有丢，这是写入问题。等一两秒重试；若提示文件被占用，说明另一个进程正在写同一个文件。')),
    })
  }

  /* 写入回执：位置 / 状态 / 下一步，附真的撤销。 */
  if (notice !== null && notice.ok) {
    return InspectorFrame({
      title: '已存进 INBOX',
      sub: 'personal/INBOX.md',
      body: createElement('div', null,
        Props({
          rows: [
            { label: '状态', value: 'open' },
            { label: '位置', value: 'personal/INBOX.md 末行' },
            { label: '下一步', value: '在「待办 · 流转中」改成待办' },
          ],
        }),
        createElement('p', { className: 'mo-insp-text' },
          '要在库里生效，需要人确认；系统不会自动把它变成记忆。'),
        notice.undo === undefined ? null : createElement('div', { style: { marginTop: 'var(--mo-s2)' } },
          BtnGhost({ children: notice.undo.label, onClick: notice.undo.act, disabled: pending }))),
    })
  }

  /* 最近记的某一条：可以就地结掉。 */
  if (selected !== undefined) {
    const state = inboxStateOf(selected.state)
    return InspectorFrame({
      title: clip(selected.content, 40),
      sub: `${selected.kind} · ${selected.date}`,
      body: createElement('div', null,
        Props({
          rows: [
            { label: '状态', value: state.label },
            { label: '行号', value: String(selected.lineIndex + 1) },
            { label: '去向', value: selected.destination === '' ? '—' : selected.destination },
          ],
        }),
        createElement('p', { className: 'mo-insp-text' },
          'INBOX 是 append-only 的文本表：改状态只改这一行的状态列，正文与行序都不动。')),
      foot: createElement('div', { style: { display: 'flex', gap: 'var(--mo-s2)' } },
        BtnGhost({
          children: '丢掉',
          actName: 'inbox-drop',
          disabled: pending,
          onClick: () => {
            run(async () => { await patchInboxRow(selected.lineIndex, { state: 'dropped' }) }, '已标为丢掉')
          },
        }),
        BtnGhost({
          children: pending ? '处理中…' : '标完成',
          actName: 'inbox-done',
          disabled: pending,
          onClick: () => {
            run(async () => { await patchInboxRow(selected.lineIndex, { state: 'done' }) }, '已标为完成')
          },
        })),
    })
  }

  return InspectorFrame({
    title: '记一条',
    sub: 'INBOX → 人确认 → 记忆',
    body: createElement('div', null,
      createElement('p', { className: 'mo-insp-text' },
        '三条规矩：先写 INBOX，不直接落档；隐私命中不写入；写入是原子追加，并发不会出现半行。'),
      Props({
        rows: [
          { label: '类型', value: '想法 / 计划 / 问题 / 待办 / 决策' },
          { label: '状态机', value: 'open → todo → done / dropped' },
        ],
      })),
  })
}