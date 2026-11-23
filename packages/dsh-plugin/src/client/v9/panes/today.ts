/**
 * 分区「今天」—— 1 秒知道先做哪件。
 *
 * ## 为什么这一页不是仪表盘
 *
 * 原型 v9 的顶条已经是「一句判定 + 一个读数」，中栏再堆 KPI 卡就是第二块仪表盘。
 * 这里只做两件事：**线索清单**（按该动手的顺序）与**随手记**。
 * 线索的每一行都能在检视栏落到一个真动作；没有动作的线索不许出现在清单里。
 *
 * ## 四态
 *
 * loading → 骨架（与真实行等高）；error → 原因 + 下一步 + 重试；
 * empty → 说「现在没有压着的事」并给出口（记一条）。空态不是 0 的谎话：
 * 顶条同时显示 0，文案解释为什么是 0。
 */

import { createElement, type ReactNode } from 'react'

import { captureOne, draftMiss } from '../actions.ts'
import {
  EmptyBlock, ErrorBlock, Props, Row, SectionHead, Skeleton,
  BtnGhost, BtnInk, num, withUnit,
} from '../primitives.ts'
import type { PaneProps } from '../types.ts'
import { InspectorFrame } from '../stage.ts'
import { cluesOf, type Clue, type ToneName } from '../view-model.ts'

/** 线索 → 行规格（四列：标题 / 归属 / 数字 / 状态，元信息独立行）。 */
function rowOf(clue: Clue, current: boolean) {
  return {
    id: clue.id,
    title: clue.title,
    meta: clue.meta,
    source: clue.group,
    num: clue.num,
    state: clue.state,
    tone: clue.tone as ToneName,
    current,
  }
}

/** 中栏。 */
export function TodayCenter(props: PaneProps): ReactNode {
  const { phase, counts, sel, onSelect, data, draft, onDraft, run, pending, goto } = props

  if (phase === 'loading') return Skeleton({ rows: 4, label: '读取中：正在汇总线索' })
  if (phase === 'error') {
    return ErrorBlock({
      title: '读不到今天的线索',
      text: '桥没有返回数据。线索不会消失——库文件还在，重取一次就好。',
      example: '点下面的「重试」；仍失败就检查库根目录是否可读',
      onRetry: () => { data.reloadAll() },
    })
  }
  if (phase === 'empty') {
    return EmptyBlock({
      title: '现在没有压着的事',
      text: `待拍板 0 条、流转中 0 条、待补库 0 条。库里 ${num(counts.entries)} 条记忆都处理完了；下一次捕获会出现在这里。`,
      hint: `INBOX 当前 ${num(counts.inboxTotal)} 条 · 已结 ${num(Math.max(0, counts.inboxTotal - counts.flow))} 条`,
      action: { label: '记一条', actName: 'go-capture', act: () => { goto('capture') } },
    })
  }

  const clues = cluesOf({ snapshot: data.snapshot.data, overview: data.overview.data, inbox: data.inbox.data, misses: data.misses.data })

  const submit = (): void => {
    const text = draft.trim()
    if (text === '') return
    run(async () => {
      await captureOne(text, '想法')
      onDraft('')
    }, '已存入 personal/INBOX.md · 状态 open')
  }

  return createElement('div', { className: 'mo-pane-inner' },
    SectionHead({
      title: '线索',
      note: `${num(clues.length)} 条 · 按该动手的顺序 · 右列 tokens`,
    }),
    createElement('ul', { className: 'mo-rows', role: 'list' },
      clues.map(clue => Row({ spec: rowOf(clue, sel === clue.id), onSelect }))),

    SectionHead({ title: '随手记', note: '先落 INBOX，等你确认' }),
    createElement('div', { className: 'mo-toolbar' },
      createElement('label', { className: 'mo-sr-only', htmlFor: 'mo-today-capture' }, '随手记一句'),
      createElement('input', {
        className: 'mo-field',
        id: 'mo-today-capture',
        type: 'text',
        'aria-label': '随手记一句',
        placeholder: '一句话就够。例：宿主对 git 直装判 not-updatable',
        value: draft,
        onChange: (event: { target: { value: string } }) => { onDraft(event.target.value) },
        onKeyDown: (event: { key: string; preventDefault(): void }) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            submit()
          }
        },
      }),
      createElement('button', {
        type: 'button',
        className: 'mo-btn',
        'data-act': 'today-save',
        disabled: pending || draft.trim() === '',
        onClick: submit,
      }, pending ? '写入中' : '存')),
    )
}

/** 检视栏。 */
export function TodayInspector(props: PaneProps): ReactNode {
  const { data, sel, pending, run, goto } = props
  const clues = cluesOf({ snapshot: data.snapshot.data, overview: data.overview.data, inbox: data.inbox.data, misses: data.misses.data })
  const clue = clues.find(item => item.id === sel) ?? clues[0]

  if (clue === undefined) {
    return InspectorFrame({
      title: '选一条线索',
      sub: '左边点一行，这里出详情与动作',
      body: createElement('p', { className: 'mo-insp-text' },
        '线索按「该动手的顺序」排：待拍板 → 缺的条目 → 该整理的 → 成本 → 流转。'),
    })
  }

  const body = createElement('div', null,
    Props({
      rows: [
        { label: '状态', value: clue.state },
        { label: '数量', value: withUnit(clue.num, clue.group === '成本' ? 'tokens' : '件') },
      ],
    }),
    createElement('p', { className: 'mo-insp-text' }, clue.detail))

  const primary = BtnInk({
    children: pending ? '处理中…' : clue.actionLabel,
    actName: 'clue-primary',
    disabled: pending,
    onClick: () => {
      if (clue.action === 'draft-miss') {
        if (clue.query === undefined) {
          run(async () => { throw new Error('没有可写草稿的目标（未命中条目可能刚被处理）') })
          return
        }
        const query = clue.query
        run(async () => { await draftMiss(query) }, '草稿已写进 INBOX · 落档仍要你点头')
        return
      }
      if (clue.action === 'goto-todo') { goto('todo', clue.gotoKey); return }
      if (clue.action === 'goto-memory') { goto('memory', clue.gotoKey); return }
      goto('health', clue.gotoKey)
    },
  })

  const secondary = BtnGhost({
    children: '先不管',
    actName: 'dismiss',
    onClick: () => { goto(clue.action === 'goto-health' ? 'today' : 'todo') },
  })

  /* 成本线索的读数来自 overview：读不到时这句要变「—」，不能沿用上一轮的数。 */
  const costHint = clue.group === '成本' && data.overview.phase === 'error'
    ? '这一带的数字读不到（显示 —）：先重试，再判断该关哪一条。'
    : null

  return InspectorFrame({
    title: clue.title,
    sub: clue.group,
    body: costHint === null ? body : createElement('div', null,
      body,
      createElement('div', { className: 'mo-verdicts' },
        createElement('div', { className: 'mo-verdict mo-verdict-warn' },
          createElement('span', { className: 'mo-verdict-tag' }, '注意'),
          createElement('span', null, costHint)))),
    foot: createElement('div', { style: { display: 'flex', gap: 'var(--mo-s2)' } }, secondary, primary),
  })
}