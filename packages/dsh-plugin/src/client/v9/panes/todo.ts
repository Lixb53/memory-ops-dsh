/**
 * 分区「待办」—— 清掉压着的事。
 *
 * ## 三段不改语义，只改顺序
 *
 * 待拍板 → 流转中 → 待补库：人的动作在前，机器建议在后。
 * 空段**不隐藏**，给一句诚实的解释（「这一段现在真的空了」比「整段消失」更可信）。
 *
 * ## 拒绝要理由
 *
 * 驳回触发 30 天静默，期间这条不再参与纠错。没有理由的驳回，30 天后没人说得清
 * 当初为什么否掉它。所以理由为空时按钮 disabled，并在动作层再挡一次。
 */

import { createElement, useState, type ReactNode } from 'react'

import {
  batchDraftMiss, batchInboxState, confirmEntry, confirmMiss, deleteMiss, draftMiss,
  patchInboxRow, promoteInboxRow, rejectEntry, undoReject,
} from '../actions.ts'
import {
  EmptyBlock, ErrorBlock, Props, Row, SectionHead, Skeleton, TextLink,
  BtnGhost, BtnInk, num, withUnit,
} from '../primitives.ts'
import type { PaneProps } from '../types.ts'
import { InspectorFrame } from '../stage.ts'
import { clip, todoSectionsOf, type TodoRow, type TodoSection } from '../view-model.ts'

/** 中栏。 */
export function TodoCenter(props: PaneProps): ReactNode {
  const { phase, data, counts, sel, onSelect, goto, run, pending } = props
  /* 段内折叠：真实库 20+ 条待办时，首屏必须还能 0 滚动（brief §十三）。 */
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const PAGE = 6

  if (phase === 'loading') return Skeleton({ rows: 5, label: '读取中：正在取三段台账' })
  if (phase === 'error') {
    return ErrorBlock({
      title: '读不到待办',
      text: '状态机查询失败。已确认的条目不会丢——库文件还在，重取即恢复。',
      example: '点下面的「重试」；仍失败就去「库健康」看库根目录',
      onRetry: () => { data.reloadAll() },
    })
  }

  const sections = todoSectionsOf({ snapshot: data.snapshot.data, inbox: data.inbox.data, misses: data.misses.data })

  if (phase === 'empty') {
    return EmptyBlock({
      title: '三段都空了',
      text: '没有待拍板、没有流转中、没有待补库。这是库健康的样子，不是故障。',
      hint: `待拍板 0 · 流转中 0 · 待补库 0 · 记忆 ${num(counts.entries)} 条`,
      action: { label: '去看记忆', actName: 'go-memory', act: () => { goto('memory') } },
    })
  }

  const renderSection = (section: TodoSection): ReactNode => {
    const flowLines = section.rows
      .map(row => row.lineIndex)
      .filter((line): line is number => typeof line === 'number')
    const refillQueries = section.rows.map(row => row.title)

    /*
     * 待补库分成两档：达到阈值的（该补）与只问过一两次的（观察中）。
     * 观察项默认折成一行计数——它们「不需要现在处理」，占掉首屏只会把
     * 真正该补的挤下去。展开后仍全部可见，不丢信息。
     */
    const fillableRows = section.id === 'refill' ? section.rows.filter(row => row.fillable === true) : section.rows
    const observingRows = section.id === 'refill' ? section.rows.filter(row => row.fillable !== true) : []

    /* 含当前选中项的段自动展开：否则从「今天」跳过来会看不到目标行。 */
    const showAll = expanded[section.id] === true || section.rows.some(row => row.key === sel)
    const base = showAll ? section.rows : fillableRows
    const visible = base.slice(0, PAGE)
    const hidden = section.rows.length - visible.length
    /* 折叠行必须报「实际藏了几条」：先报观察项会与 hidden 总数打架。 */
    const hiddenObserving = showAll
      ? 0
      : observingRows.filter(row => !visible.includes(row)).length

    return createElement('div', { key: section.id },
      SectionHead({ title: section.title, note: section.note }),
      section.rows.length === 0
        ? createElement('p', { className: 'mo-state-hint', style: { paddingLeft: 'var(--mo-s4)' } }, section.emptyText)
        : createElement('ul', { className: 'mo-rows', role: 'list' },
          visible.map(row => Row({
            spec: {
              id: row.key,
              title: row.title,
              meta: row.meta,
              source: row.group,
              num: row.num,
              state: row.state,
              tone: row.tone,
              current: sel === row.key,
            },
            onSelect,
          }))),
      hidden > 0
        ? createElement('p', { className: 'mo-check-line' },
          TextLink({
            children: hiddenObserving === hidden
              ? `另有 ${num(hidden)} 条只问过一两次 · 展开`
              : `展开剩下的 ${num(hidden)} 条`,
            actName: 'expand-section',
            onClick: () => { setExpanded(prev => ({ ...prev, [section.id]: true })) },
          }))
        : null,
      /* 段级批量动作：一次处理多条，不给每条都点一遍的机会成本。 */
      section.id === 'flow' && flowLines.length > 1
        ? createElement('p', { className: 'mo-check-line' },
          TextLink({
            children: `把这段 ${num(flowLines.length)} 条都标完成`,
            actName: 'batch-done',
            onClick: () => {
              run(async () => { await batchInboxState(flowLines, 'done') }, `已把 ${flowLines.length} 条标为完成`)
            },
          }))
        : null,
      section.id === 'refill' && refillQueries.length > 1
        ? createElement('p', { className: 'mo-check-line' },
          TextLink({
            children: `给这 ${num(refillQueries.length)} 条都写草稿`,
            actName: 'batch-draft',
            onClick: () => {
              if (pending) return
              run(async () => { await batchDraftMiss(refillQueries) }, `已为 ${refillQueries.length} 条各写一份草稿`)
            },
          }))
        : null)
  }

  return createElement('div', { className: 'mo-pane-inner' },
    sections.map(renderSection))
}

/** 三段的行合起来找选中项。 */
function selectedRow(props: PaneProps): { row: TodoRow; section: TodoSection } | undefined {
  const sections = todoSectionsOf({ snapshot: props.data.snapshot.data, inbox: props.data.inbox.data, misses: props.data.misses.data })
  for (const section of sections) {
    const row = section.rows.find(item => item.key === props.sel)
    if (row !== undefined) return { row, section }
  }
  return undefined
}

/** 检视栏：拍板项（确认 / 驳回带理由）。 */
function DecideInspector({ row, props }: { row: TodoRow; props: PaneProps }): ReactNode {
  const { run, pending } = props
  const [reason, setReason] = useState('')

  const reject = (): void => {
    if (row.path === undefined) return
    const path = row.path
    run(async () => { await rejectEntry(path, reason) }, '已驳回 · 30 天内不再注入（可撤销）', {
      label: '撤销驳回',
      run: () => undoReject(path),
    })
  }

  return InspectorFrame({
    title: row.title,
    sub: `${row.group} · ${row.state}`,
    body: createElement('div', null,
      Props({
        rows: [
          { label: '来源', value: row.path ?? '—' },
          { label: '等多久', value: withUnit(row.num, '天') },
          { label: '状态', value: row.state },
        ],
      }),
      createElement('p', { className: 'mo-insp-text' },
        '采纳后进入检索与置顶通道；驳回落档 30 天静默。系统自动升级最多到「观察到」，不会替你确认。'),
      createElement('p', { className: 'mo-insp-label' }, '驳回要写理由（30 天内不再注入）'),
      createElement('textarea', {
        className: 'mo-reason-input',
        'aria-label': '驳回理由',
        placeholder: '例：这条只对某个分支成立，不该进个人域',
        value: reason,
        onChange: (event: { target: { value: string } }) => { setReason(event.target.value) },
      }),
      reason.trim() === '' ? createElement('p', { className: 'mo-check-line' }, '理由为空不能驳回') : null),
    foot: createElement('div', { style: { display: 'flex', gap: 'var(--mo-s2)' } },
      BtnGhost({
        children: pending ? '处理中…' : '驳回',
        actName: 'reject',
        disabled: pending || reason.trim() === '',
        onClick: reject,
      }),
      BtnInk({
        children: pending ? '处理中…' : '确认',
        actName: 'confirm',
        disabled: pending,
        onClick: () => {
          if (row.path === undefined) return
          const path = row.path
          run(async () => { await confirmEntry(path) }, '已确认 · 这条从此刻起参与检索')
        },
      })),
  })
}

/** 检视栏：流转项（改内容 / 完成 / 丢掉）。 */
function FlowInspector({ row, props }: { row: TodoRow; props: PaneProps }): ReactNode {
  const { run, pending } = props
  const [content, setContent] = useState(row.title)
  const lineIndex = row.lineIndex

  const patch = (next: Record<string, unknown>, success: string): void => {
    if (lineIndex === undefined) return
    run(async () => { await patchInboxRow(lineIndex, next) }, success)
  }

  return InspectorFrame({
    title: clip(row.title, 48),
    sub: `${row.group} · ${row.state}`,
    body: createElement('div', null,
      Props({
        rows: [
          { label: '行号', value: lineIndex === undefined ? '—' : String(lineIndex + 1) },
          { label: '等多久', value: withUnit(row.num, '天') },
          { label: '状态', value: row.state },
        ],
      }),
      createElement('p', { className: 'mo-insp-label' }, '改这一行的内容'),
      createElement('input', {
        className: 'mo-title-input',
        'aria-label': '改这一行的内容',
        value: content,
        onChange: (event: { target: { value: string } }) => { setContent(event.target.value) },
      }),
      createElement('p', { className: 'mo-insp-text' },
        '超过 7 天没动的条目会降权，但不会被删——降权只影响检索排序，不影响它还在库里。'),
      createElement('p', { className: 'mo-check-line' },
        TextLink({
          children: '升级成记忆条目',
          actName: 'promote-inbox',
          onClick: () => {
            if (lineIndex === undefined) return
            run(
              async () => { await promoteInboxRow(lineIndex) },
              '已升级：这条成为可检索的记忆，INBOX 里保留原行',
            )
          },
        }))),
    foot: createElement('div', { style: { display: 'flex', gap: 'var(--mo-s2)', flexWrap: 'wrap' } },
      BtnGhost({
        children: '保存内容',
        actName: 'inbox-edit',
        disabled: pending || content.trim() === '' || content === row.title,
        onClick: () => { patch({ content: content.trim() }, '已改内容 · 状态不变') },
      }),
      BtnGhost({
        children: '丢掉',
        actName: 'inbox-drop',
        disabled: pending,
        onClick: () => { patch({ state: 'dropped' }, '已丢掉') },
      }),
      BtnInk({
        children: pending ? '处理中…' : '标完成',
        actName: 'inbox-done',
        disabled: pending,
        onClick: () => { patch({ state: 'done' }, '已完成 · 这一条从流转里出去了') },
      })),
  })
}

/** 检视栏：补库项（写草稿 / 确认已补 / 删掉）。 */
function RefillInspector({ row, props }: { row: TodoRow; props: PaneProps }): ReactNode {
  const { run, pending, data, goto } = props
  const fillable = row.fillable === true
  const threshold = data.misses.data?.fillThreshold ?? 3
  const [content, setContent] = useState('')

  /* 验证期：草稿生成后的 7 天窗口，剩余天数与已命中次数都来自桥数据。 */
  const item = (data.misses.data?.pipeline['should-fill'] ?? [])
    .concat(data.misses.data?.pipeline['observing'] ?? [])
    .find(entry => entry.query === row.title)
  const remaining = item?.remainingDays ?? null
  const hits = item?.hits ?? 0

  return InspectorFrame({
    title: `缺：${clip(row.title, 40)}`,
    sub: `${row.group} · ${row.state}`,
    body: createElement('div', null,
      Props({
        rows: [
          { label: '被问', value: `${num(row.num)} 次` },
          { label: '会话', value: `${num(item?.sessions ?? 0)} 个` },
          { label: '阈值', value: `${num(threshold)} 次起建议补` },
          { label: '状态', value: row.state },
          {
            label: '验证期',
            value: remaining === null
              ? '未进入（草稿生成后才开始计时）'
              : `还剩 ${num(remaining)} 天 · 命中 ${num(hits)} 次`,
          },
        ],
      }),
      createElement('p', { className: 'mo-insp-text' },
        '生成草稿只会进 INBOX，落档仍需你点头。写完后 7 天内有命中才算验证通过；'
        + '一直没人再问，这条会自己沉下去，不占记忆。'),
      fillable
        ? null
        : createElement('div', { className: 'mo-verdicts' },
          createElement('div', { className: 'mo-verdict mo-verdict-warn' },
            createElement('span', { className: 'mo-verdict-tag' }, '未达线'),
            createElement('span', null, `还没有到该补的时候：问满 ${num(threshold)} 次才算常态缺口。要补也可以，只是它可能只用到一次。`))),
      createElement('p', { className: 'mo-insp-label' }, '已经补上了？把内容写在这里'),
      createElement('textarea', {
        className: 'mo-reason-input',
        'aria-label': '补上的内容',
        placeholder: '例：grep 读不到文件是因为路径里有中文，改用 Get-Content -Encoding UTF8',
        value: content,
        onChange: (event: { target: { value: string } }) => { setContent(event.target.value) },
      }),
      createElement('p', { className: 'mo-check-line' },
        TextLink({
          children: '这条不是问题，删掉',
          actName: 'miss-delete',
          onClick: () => {
            run(async () => { await deleteMiss(row.title) }, '已删掉这条未命中记录')
          },
        }))),
    foot: createElement('div', { style: { display: 'flex', gap: 'var(--mo-s2)' } },
      BtnGhost({ children: '去看记忆', actName: 'go-memory', onClick: () => { goto('memory') } }),
      BtnGhost({
        children: pending ? '生成中…' : '写草稿',
        actName: 'draft-miss',
        disabled: pending,
        onClick: () => {
          run(async () => { await draftMiss(row.title) }, '草稿已写进 INBOX · 落档仍要你点头')
        },
      }),
      BtnInk({
        children: pending ? '提交中…' : '确认已补',
        actName: 'miss-confirm',
        disabled: pending || content.trim() === '',
        onClick: () => {
          run(async () => { await confirmMiss(row.title, content) }, '已落一条记忆，并把这问题标为已验证')
        },
      })),
  })
}

/** 检视栏。 */
export function TodoInspector(props: PaneProps): ReactNode {
  const found = selectedRow(props)
  if (found === undefined) {
    return InspectorFrame({
      title: '选一条待办',
      sub: '左边点一行，这里出动作',
      body: createElement('p', { className: 'mo-insp-text' },
        '待拍板的条目只有人能改状态；系统自动升级最多到「观察到」，不会替你确认。'),
    })
  }
  /*
   * 三个检视栏组件共享同一位置：必须带 key。
   *
   * 没有 key 时会按「同类型组件复用」处理：FlowInspector 的 useState(row.title)
   * 只在挂载时求值，选 A 行输入内容、再点 B 行，草稿还是 A 的——
   * 点「保存内容」就会把 A 的文本写进 B 的正文。
   */
  if (found.row.kind === 'decide') return createElement(DecideInspector, { key: found.row.key, row: found.row, props })
  if (found.row.kind === 'flow') return createElement(FlowInspector, { key: found.row.key, row: found.row, props })
  return createElement(RefillInspector, { key: found.row.key, row: found.row, props })
}