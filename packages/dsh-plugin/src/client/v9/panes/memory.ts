/**
 * 分区「记忆」—— 找到某条并处理它。
 *
 * ## 双面开关（内容面 ⇄ 成本面）
 *
 * 只换列集与排序，**不换行高**：两面的行都是「标题 1–2 行 + 元信息 1 行」，
 * 切换时列表不跳动（原型量测 58px → 58px）。成本面按体积降序，回答「哪条最贵」；
 * 内容面按库内顺序，回答「我存了什么」。
 *
 * ## 检索要记账
 *
 * 命中率 = cite ÷ recall，而不是「搜了多少条」。所以搜索必须走服务端
 * `search` 路由并带 `record`：主动检索记 recall，敲字预览不记。
 * 客户端 `filter` 会让命中率永远算不出来——这正是 v4 测试挡住的那类回退。
 */

import { createElement, useState, type ReactNode } from 'react'

import { archiveEntry, batchArchive, confirmEntry, keepEntry, rejectEntry, searchEntries, undoReject } from '../actions.ts'
import {
  EmptyBlock, ErrorBlock, FaceSwitch, Props, Row, Skeleton, TableHead, TextLink, BtnGhost, BtnInk, num, withUnit,
} from '../primitives.ts'
import type { DetailView } from '../../api.ts'
import { useBridge } from '../../data.ts'
import type { PaneProps } from '../types.ts'
import { InspectorFrame } from '../stage.ts'
import {
  anchorLabelOf, clip, memoryEntries, memoryRowsOf, statusLabelOf, type Face,
} from '../view-model.ts'

/** 中栏。 */
export function MemoryCenter(props: PaneProps): ReactNode {
  const { phase, data, sel, onSelect, run, pending, counts, goto } = props
  const [face, setFace] = useState<Face>('content')
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')

  if (phase === 'loading') return Skeleton({ rows: 6, label: '读取中：正在取全库条目' })
  if (phase === 'error') {
    return ErrorBlock({
      title: '读不到条目索引',
      text: '索引文件缺失或不可读。条目正文通常还在，重建索引即可。',
      example: '点下面的「重试」；修好后这里会显示真实条数',
      onRetry: () => { data.reloadAll() },
    })
  }

  const rows = memoryRowsOf(data.snapshot.data, face, submitted)
  const filteredEmpty = submitted.trim() !== '' && rows.length === 0

  /* 全库为空：这时候的「空」是库空，不是筛选没命中——两种空态文案不许合并。 */
  if (phase === 'empty') {
    return EmptyBlock({
      title: '库里还没有任何记忆',
      text: '记忆是确认过的条目；记录流里的 INBOX 行还不算。先去记一条，确认后它会出现在这里。',
      hint: 'INBOX 与记忆分开计数：全库 0 条记忆',
      action: { label: '去记一条', actName: 'go-capture', act: () => { goto('capture') } },
    })
  }

  /* 到期条目：90 天未引用 → stale，134 天 → retire。批量归档只碰这两档。 */
  const retiring = memoryEntries(data.snapshot.data)
    .filter(entry => entry.expiry.level === 'stale' || entry.expiry.level === 'retire')

  const head = face === 'cost'
    ? TableHead({ columns: [{ label: '标题' }, { label: '归属' }, { label: 'tokens', num: true }, { label: '计费' }] })
    : TableHead({ columns: [{ label: '标题' }, { label: '归属' }, { label: '引用', num: true }, { label: '状态' }] })

  const emptyBlock = filteredEmpty
    ? createElement('div', { className: 'mo-state-block' },
      createElement('h2', { className: 'mo-state-title' }, `没有匹配「${clip(submitted, 16)}」的条目`),
      createElement('p', { className: 'mo-state-text' },
        '这次检索已记一条未命中——未命中会进「待补库」，不是白搜。'),
      createElement('p', { className: 'mo-state-hint mo-num' }, `全库仍是 ${num(counts.entries)} 条`),
      createElement('div', { className: 'mo-state-actions' },
        BtnGhost({
          children: '清掉关键词',
          actName: 'clear-filter',
          onClick: () => {
            setQuery('')
            setSubmitted('')
          },
        })))
    : null

  const toolbar = createElement('div', { className: 'mo-toolbar' },
    createElement('label', { className: 'mo-sr-only', htmlFor: 'mo-memory-search' }, '搜索标题与正文'),
    createElement('input', {
      className: 'mo-field',
      id: 'mo-memory-search',
      type: 'search',
      'aria-label': '搜索标题与正文',
      placeholder: '搜标题、路径或证据（会计入命中率）',
      value: query,
      onChange: (event: { target: { value: string } }) => { setQuery(event.target.value) },
      onKeyDown: (event: { key: string; preventDefault(): void }) => {
        if (event.key !== 'Enter') return
        event.preventDefault()
        submitSearch()
      },
    }),
    createElement('button', {
      type: 'button',
      className: 'mo-btn',
      'data-act': 'search',
      disabled: pending || query.trim() === '',
      onClick: submitSearch,
    }, '搜'))

  function submitSearch(): void {
    const keyword = query.trim()
    setSubmitted(keyword)
    run(
      async () => { await searchEntries(keyword, keyword !== '') },
      keyword === '' ? '清掉关键词，显示全部条目' : `已检索「${clip(keyword, 12)}」并记账`,
    )
  }

  return createElement('div', { className: 'mo-pane-inner' },
    FaceSwitch({ face, onChange: setFace }),
    toolbar,
    head,
    emptyBlock === null
      ? createElement('ul', { className: 'mo-rows', role: 'list' },
        rows.map(row => Row({
          spec: {
            id: row.id,
            title: row.title,
            meta: row.meta,
            source: row.group,
            num: row.num,
            state: row.state,
            tone: row.tone,
            current: sel === row.id,
          },
          onSelect,
        })))
      : emptyBlock,
    createElement('p', { className: 'mo-check-line' },
      `${face === 'cost' ? '按体积降序 · ' : '库内顺序 · '}${num(rows.length)} 条 · 数字均为估算`,
      retiring.length === 0
        ? ' · 没有到期条目'
        : createElement('span', null,
          ' · ',
          TextLink({
            children: `批量归档到期的 ${num(retiring.length)} 条`,
            actName: 'batch-archive',
            onClick: () => {
              run(
                async () => { await batchArchive(retiring.map(entry => entry.path), '90 天未引用，批量退役') },
                `已归档 ${retiring.length} 条 · 检索不再返回它们`,
              )
            },
          }))))
}

/** 检视栏。 */
export function MemoryInspector(props: PaneProps): ReactNode {
  const { data, sel, run, pending } = props
  const entry = (data.snapshot.data?.entries ?? []).find(item =>
    !item.id.endsWith('.INBOX') && (item.id === sel || item.path === sel))
  const path = entry?.path ?? ''
  const detail = useBridge<DetailView>('detail', path === '' ? {} : { path }, [path])
  /* 驳回理由：必须在任何 early return 之前调用（hook 顺序不许随数据变化）。 */
  const [reason, setReason] = useState('')

  if (entry === undefined) {
    return InspectorFrame({
      title: '选一条记忆',
      sub: '左边点一行，这里出来源、证据、锚点',
      body: createElement('p', { className: 'mo-insp-text' },
        '检索命中会记 recall，真正被引用才记 cite——所以命中率不是 100% 的自夸数。'),
    })
  }

  const anchorState = detail.data?.trust.anchorState
  const anchorText = anchorState !== undefined
    ? anchorLabelOf(anchorState)
    : detail.phase === 'error'
      ? '读不到（detail 失败）'
      : (entry.anchor === null ? '无锚点' : '未核对（读取中）')

  const cited = entry.citeCount === 0 ? '未引用' : `引用 ${num(entry.citeCount)} 次`
  const rows: { label: string; value: string }[] = [
    { label: '路径', value: entry.path },
    { label: '归属', value: entry.domainLabel || entry.domain },
    { label: '层级', value: `${entry.layer} · 按需读取` },
    { label: '体积', value: withUnit(entry.tokens, 'tokens') },
    { label: '状态', value: statusLabelOf(entry.status) },
    { label: '引用', value: `${cited}（30 天）` },
    { label: '锚点', value: anchorText },
  ]

  const badge = anchorState === 'stale'
    ? createElement('div', { className: 'mo-verdicts' },
      createElement('div', { className: 'mo-verdict mo-verdict-warn' },
        createElement('span', { className: 'mo-verdict-tag' }, '注意'),
        createElement('span', null, '锚点对不上，检索已降权 0.4；复核通过可恢复。')))
    : null

  const excerpt = detail.data?.entry.body
    ? clip(detail.data.entry.body.replace(/\s+/g, ' '), 220)
    : null

  const isRetire = entry.status === 'stale' || entry.expiry.level === 'stale' || entry.expiry.level === 'retire'

  const body = createElement('div', null,
    Props({ rows }),
    createElement('p', { className: 'mo-insp-label' }, '证据'),
    createElement('p', { className: 'mo-insp-text' },
      entry.evidence.length === 0
        ? '这条没有证据记录：只可能是你手写的，或来自更早的导入。'
        : `${num(entry.evidence.length)} 条：${clip(entry.evidence.map(item => item.excerpt ?? item.gate ?? item.session ?? '—').join(' / '), 160)}`),
    excerpt === null ? null : createElement('p', { className: 'mo-insp-label' }, '正文摘要'),
    excerpt === null
      ? null
      : createElement('p', { className: 'mo-check-line' }, excerpt),
    badge)

  if (isRetire) {
    return InspectorFrame({
      title: entry.title,
      sub: `${entry.domainLabel || entry.domain} · ${withUnit(entry.tokens, 'tokens')}`,
      body,
      foot: createElement('div', { style: { display: 'flex', gap: 'var(--mo-s2)' } },
        BtnGhost({
          children: '再留 90 天',
          actName: 'keep',
          disabled: pending,
          onClick: () => { run(async () => { await keepEntry(path) }, '已再留 90 天') },
        }),
        BtnInk({
          children: pending ? '归档中…' : '归档',
          actName: 'archive',
          disabled: pending,
          onClick: () => { run(async () => { await archiveEntry(path) }, '已归档 · 检索不再返回它') },
        })),
    })
  }

  return InspectorFrame({
    title: entry.title,
    sub: `${entry.domainLabel || entry.domain} · ${withUnit(entry.tokens, 'tokens')}`,
    body: createElement('div', null,
      body,
      /*
       * 驳回理由必须由人写：硬编码一句系统话术会让 30 天后的复查
       * 分不清「人判的」与「系统替我判的」。
       */
      createElement('p', { className: 'mo-insp-label' }, '驳回要写理由（30 天内不再注入）'),
      createElement('textarea', {
        className: 'mo-reason-input',
        'aria-label': '驳回理由',
        placeholder: '例：这条结论只对上个季度的目录结构成立',
        value: reason,
        onChange: (event: { target: { value: string } }) => { setReason(event.target.value) },
      }),
      reason.trim() === '' ? createElement('p', { className: 'mo-check-line' }, '理由为空不能驳回') : null),
    foot: createElement('div', { style: { display: 'flex', gap: 'var(--mo-s2)' } },
      BtnGhost({
        children: pending ? '处理中…' : '驳回',
        actName: 'reject',
        disabled: pending || reason.trim() === '',
        onClick: () => {
          const why = reason.trim()
          run(async () => { await rejectEntry(path, why) }, '已驳回 · 30 天静默（可撤销）', {
            label: '撤销驳回',
            run: () => undoReject(path),
          })
        },
      }),
      BtnInk({
        children: pending ? '处理中…' : '确认',
        actName: 'confirm',
        disabled: pending,
        onClick: () => { run(async () => { await confirmEntry(path) }, '已确认') },
      })),
  })
}