/**
 * 分区「记忆」—— 全库台账 + 详情。
 *
 * ## 列表为什么不是卡片
 *
 * 旧实现每条记忆是一张 `border-radius: 8` 卡片，3 条记忆看起来像 3 个功能模块。
 * 台账应该像台账：hairline 分隔、行内元信息等宽。
 *
 * ## 检索必须走路由（记账）
 *
 * 早先用客户端 filter，看着也能搜，但 recall / cite / miss 事件一条都不会产生——
 * 于是「命中率」恒为 null。客户端过滤不是检索，它没有账可记。
 *
 * ## brand 名额
 *
 * 列表有内容时「搜」是进入页面的第一动作（实底）；
 * 列表为空时空态出口是唯一动作（实底），「搜」让位。两者不能同时是 primary。
 */

import { createElement, useState, type ReactNode } from 'react'

import { call, type DetailView, type SearchView, type SnapshotView } from '../api.ts'
import { useBridge } from '../data.ts'
import { gotoPane } from '../pane-nav.ts'
import { scopeBody, useSessionProject, type ClientContextLike } from '../session-context.ts'
import {
  Btn, EmptyState, ErrorAlert, InlineDone, PaneHead, Primary, RejectBox, SectionHead, SkeletonRows,
  TextLink, count, h, tag, truncate,
} from '../ui.ts'

/** 状态筛选分组（口径与 core 的 needsDecision 对齐）。 */
const STATUS_GROUPS: { id: string; label: string; match: (s: string) => boolean }[] = [
  { id: '', label: '全部', match: () => true },
  { id: 'pending', label: '要我拍板', match: s => s === 'hypothesis' || s === 'observed' },
  { id: 'stale', label: '待复核', match: s => s === 'stale' },
  { id: 'confirmed', label: '已确认', match: s => s === 'confirmed' || s === 'active' },
]

/** 「记忆」分区：列表态。 */
export function MemoryPane({ ctx, detailPath, onOpenDetail }: {
  ctx?: ClientContextLike
  detailPath: string | undefined
  onOpenDetail: (path: string | null) => void
}): ReactNode {
  if (detailPath !== undefined) {
    return createElement(MemoryDetail, { path: detailPath, onBack: () => { onOpenDetail(null) } })
  }
  return createElement(MemoryList, { ctx, onOpenDetail })
}

/** 列表态。 */
function MemoryList({ ctx, onOpenDetail }: {
  ctx?: ClientContextLike
  onOpenDetail: (path: string) => void
}): ReactNode {
  const { cwd, project } = useSessionProject(ctx)
  const [scope, setScope] = useState<'all' | 'project'>('all')
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)

  const scopeParams = scope === 'project' ? scopeBody(cwd, project) : {}
  const snapshot = useBridge<SnapshotView>('snapshot', scopeParams, [scope, cwd, project])
  /**
   * 检索走路由才有账可记。
   * `record` 只在**人主动检索**时为 true：空 query 的空跑不能记 miss，
   * 否则一进列表页就凭空污染未命中表。
   */
  const search = useBridge<SearchView>(
    'search',
    { query: submitted, ...scopeParams, record: submitted.trim() !== '' },
    [submitted, scope, cwd, project],
  )

  function runBatch(action: () => Promise<{ archived?: unknown[]; failed?: unknown[] }>, success: string): void {
    setBusy(true)
    void action()
      .then((result) => {
        const failed = result?.failed?.length ?? 0
        setFeedback({
          ok: failed === 0,
          text: failed === 0 ? success : `${success}，但有 ${failed} 条失败（可能已被改动）`,
        })
        setSelected([])
        snapshot.reload()
      })
      .catch((error: unknown) => {
        setFeedback({ ok: false, text: error instanceof Error ? error.message : String(error) })
      })
      .finally(() => { setBusy(false) })
  }

  const entries = snapshot.data?.entries ?? []
  const searching = submitted.trim() !== ''

  const rawList = searching
    ? (search.data?.hits ?? []).map(hit => ({
        id: hit.id, path: hit.path, title: hit.title, status: hit.status,
        tokens: hit.tokens, domainLabel: hit.domainLabel, citeCount: undefined as number | undefined,
        snippet: hit.snippet as string | undefined,
      }))
    : entries.map(entry => ({
        id: entry.id, path: entry.path, title: entry.title, status: entry.status,
        tokens: entry.tokens, domainLabel: entry.domainLabel, citeCount: entry.citeCount,
        snippet: undefined as string | undefined,
      }))

  const statusCounts = STATUS_GROUPS.map(group => ({
    ...group,
    num: rawList.filter(item => group.match(item.status)).length,
  }))
  const statusMatched = statusFilter === ''
    ? rawList
    : rawList.filter(item => (STATUS_GROUPS.find(g => g.id === statusFilter)?.match(item.status) ?? true))
  const list = domainFilter === ''
    ? statusMatched
    : statusMatched.filter(item => item.domainLabel === domainFilter)
  const domainOptions = [...new Set(rawList.map(item => item.domainLabel))]
  const listEmpty = list.length === 0

  const searchBtn = listEmpty
    ? Btn({ children: '搜', onClick: () => { setSubmitted(query) }, attrs: { 'data-action': 'search' } })
    : Primary({ children: '搜', onClick: () => { setSubmitted(query) }, attrs: { 'data-action': 'search' } })

  const head = PaneHead({
    pageName: '记忆',
    lede: `库里一共 ${count(entries.length)} 条，${count(snapshot.data?.stats.tokens ?? 0)} tokens`,
    ledeSub: snapshot.data === undefined
      ? undefined
      : `最重的一条占 ${count(Math.max(...entries.map(e => e.tokens), 0))} tokens；超 80 行 ${count(snapshot.data.stats.overLimit)} 篇。`,
  })

  /* v6 评审 P0-1：工具行 + 筛选签装进一张静卡，与台账卡分层 */
  const filterCard = createElement('section', { className: 'dmo-card-quiet' },
    createElement('div', { className: 'dmo-toolbar' },
      createElement('input', {
        className: 'dmo-input',
        'data-field': 'query',
        value: query,
        placeholder: '搜标题或域…',
        'aria-label': '检索记忆',
        onChange: (event: { target: { value: string } }) => { setQuery(event.target.value) },
        onKeyDown: (event: { key: string }) => {
          if (event.key === 'Enter') setSubmitted(query)
          if (event.key === 'Escape') { setQuery(''); setSubmitted('') }
        },
      }),
      searchBtn),

    createElement('div', { className: 'dmo-kindrow', role: 'group', 'aria-label': '按状态筛选' },
      statusCounts.map(group => createElement('button', {
        key: group.id,
        type: 'button',
        className: 'dmo-kindbtn',
        'data-status': group.id,
        'aria-pressed': statusFilter === group.id,
        onClick: () => { setStatusFilter(group.id); setSelected([]) },
      }, `${group.label} ${group.num}`))),

    createElement('div', { className: 'dmo-kindrow', role: 'group', 'aria-label': '按域筛选' },
      createElement('button', {
        type: 'button',
        className: 'dmo-kindbtn',
        'data-scope': '',
        'aria-pressed': scope === 'all' && domainFilter === '',
        onClick: () => { setScope('all'); setDomainFilter(''); setSelected([]) },
      }, `全库 ${entries.length}`),
      createElement('button', {
        type: 'button',
        className: 'dmo-kindbtn',
        'data-scope': 'project',
        'aria-pressed': scope === 'project',
        onClick: () => { setScope(scope === 'project' ? 'all' : 'project'); setSelected([]) },
      }, scope === 'project' && snapshot.data?.project !== null && snapshot.data?.project !== undefined
        ? `仅本项目 · ${snapshot.data.project}`
        : '仅本项目'),
      domainOptions.map(name => createElement('button', {
        key: name,
        type: 'button',
        className: 'dmo-kindbtn',
        'data-domain': name,
        'aria-pressed': domainFilter === name,
        onClick: () => { setDomainFilter(domainFilter === name ? '' : name); setSelected([]) },
      }, name))))

  if (snapshot.phase === 'loading') return SkeletonRows({ rows: 4, height: 56 })
  if (snapshot.phase === 'error') {
    return createElement('div', { className: 'dmo-pane' }, head,
      h(ErrorAlert, {
        title: '读不到记忆',
        body: '库文件没有丢，这是读取问题。记忆不会因为这次失败而消失。',
        actions: [Primary({ children: '重试', onClick: snapshot.reload, attrs: { 'data-action': 'retry' } })],
      }))
  }

  const emptyBlock = searching
    ? h(EmptyState, {
        title: `没搜到「${truncate(submitted, 20)}」`,
        body: '检索落空本身就是一条信号——它已记进「待办 · 要我补的」。'
          + '换个词，或去待办看这次落空。',
        actions: [
          Primary({ children: '换个词', onClick: () => { setQuery(''); setSubmitted('') }, attrs: { 'data-action': 'clear-search' } }),
          // v6 评审 P0-1：导航出口必须真的跳，不能只带测试钩子
          Btn({ children: '去待办看', onClick: () => { gotoPane(ctx, 'todo') }, attrs: { 'data-action': 'goto', 'data-pane': 'todo' } }),
        ],
      })
    : entries.length === 0
      ? h(EmptyState, {
          title: '库是空的',
          body: '还没有任何记忆。记一条，它就会出现在这里。',
          actions: [Primary({ children: '记一条', onClick: () => { gotoPane(ctx, 'capture') }, attrs: { 'data-action': 'goto', 'data-pane': 'capture' } })],
        })
      : h(EmptyState, {
          title: '这个筛选下没有',
          body: '换个筛选，或者清空筛选看全部。',
          actions: [
            Primary({ children: '清空筛选', onClick: () => { setStatusFilter(''); setDomainFilter(''); setScope('all') }, attrs: { 'data-action': 'clear-filter' } }),
            Btn({ children: '记一条', onClick: () => { gotoPane(ctx, 'capture') }, attrs: { 'data-action': 'goto', 'data-pane': 'capture' } }),
          ],
        })

  const rows = list.map(entry => createElement('li', { key: entry.id, className: 'dmo-row' },
    createElement('button', {
      type: 'button',
      className: 'dmo-row-button',
      'data-action': 'open-detail',
      'data-path': entry.path,
      onClick: () => { onOpenDetail(entry.path) },
    }, truncate(entry.title, 60)),
    h('div', { className: 'dmo-meta-row' },
      tag(statusLabel(entry.status), entry.status === 'confirmed' || entry.status === 'active' ? 'ok' : entry.status === 'rejected' ? 'err' : entry.status === 'stale' || entry.status === 'observed' || entry.status === 'hypothesis' ? 'warn' : ''),
      h('span', { className: 'dmo-meta' }, `${entry.tokens} tokens`),
      h('span', { className: 'dmo-meta' }, entry.domainLabel),
      h('span', { className: 'dmo-meta' },
        entry.citeCount === undefined || entry.citeCount === 0 ? '未引用' : `引用 ${entry.citeCount} 次`),
      entry.snippet === undefined ? null : h('span', { className: 'dmo-meta' }, truncate(entry.snippet, 60)),
      createElement('input', {
        type: 'checkbox',
        className: 'dmo-check',
        checked: selected.includes(entry.path),
        'aria-label': `选择：${truncate(entry.title, 20)}`,
        onClick: (event: { stopPropagation(): void }) => { event.stopPropagation() },
        onChange: () => {
          setSelected(current => current.includes(entry.path)
            ? current.filter(p => p !== entry.path)
            : [...current, entry.path])
        },
      }))))

  return createElement('div', { className: 'dmo-pane' }, head,
    filterCard,
    selected.length === 0 ? null : createElement('div', { className: 'dmo-bulk' },
      h('span', { className: 'dmo-meta' }, `已选 ${selected.length} / ${list.length} 条`),
      Btn({
        children: `归档选中 ${selected.length} 条`, small: true, disabled: busy,
        onClick: () => { runBatch(() => call('batchArchive', { paths: selected, reason: '批量退役' }), `已归档 ${selected.length} 条`) },
        attrs: { 'data-action': 'batchArchive' },
      }),
      Btn({ children: '清空选择', small: true, disabled: busy, onClick: () => { setSelected([]) } })),

    /* v6 评审 P0-1：台账装进本页唯一重卡；空态出口也留在卡内（空屏不许是灰字） */
    createElement('section', { className: 'dmo-card-heavy' },
      SectionHead({ title: searching ? '检索结果' : '全部记忆', count: `${list.length} 条` }),
      searching && search.phase === 'loading'
        ? SkeletonRows({ rows: 2, height: 44 })
        : listEmpty
          ? emptyBlock
          : createElement('ul', { className: 'dmo-list dmo-list-clickable', role: 'list' }, rows),
      searching && search.phase === 'ready' && search.data !== undefined && !listEmpty
        ? h('p', { className: 'dmo-note' },
            `命中 ${count(search.data.total)} 条 · 本次读取约 ${count(search.data.cost)} tokens（已记账）`)
        : null),
    feedback === null ? null : InlineDone({ ok: feedback.ok, text: feedback.text }))
}

/** 详情态。 */
function MemoryDetail({ path, onBack }: { path: string; onBack: () => void }): ReactNode {
  const detail = useBridge<DetailView>('detail', { path }, [path])
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)

  function run(action: () => Promise<unknown>, success: string): void {
    setBusy(true)
    void action()
      .then(() => {
        setFeedback({ ok: true, text: success })
        setRejecting(false)
        setRejectReason('')
        setEditing(false)
        setDraft(null)
      })
      .catch((error: unknown) => {
        setFeedback({ ok: false, text: error instanceof Error ? error.message : String(error) })
      })
      .finally(() => { setBusy(false) })
  }

  if (detail.phase === 'loading') return SkeletonRows({ rows: 4 })
  if (detail.phase === 'error') {
    return createElement('div', null,
      createElement('div', { className: 'dmo-back' },
        TextLink({ children: '← 返回列表', onClick: onBack, attrs: { 'data-action': 'back-to-list' } })),
      h(ErrorAlert, {
        title: '读不到这条记忆',
        body: '它可能已被删除或改名。返回列表重新找——这不影响库里其它条目。',
        actions: [Primary({ children: '返回列表', onClick: onBack, attrs: { 'data-action': 'back-to-list' } })],
      }))
  }
  const data = detail.data
  // v6 评审 Quick-win 5 同型：读不到不许 return null（空屏必须说话）
  if (data === undefined) {
    return createElement('div', { className: 'dmo-pane' },
      createElement('div', { className: 'dmo-back' },
        TextLink({ children: '← 返回列表', onClick: onBack, attrs: { 'data-action': 'back-to-list' } })),
      h(ErrorAlert, {
        title: '没读到这条记忆',
        body: '不是它没了，是这次没读到——两者不一样。先重试，或返回列表重新找。',
        actions: [
          Primary({ children: '重试', onClick: detail.reload, attrs: { 'data-action': 'retry' } }),
          Btn({ children: '返回列表', onClick: onBack, attrs: { 'data-action': 'back-to-list' } }),
        ],
      }))
  }

  const { entry, trust } = data
  const canConfirm = entry.status === 'stale' || entry.status === 'observed' || entry.status === 'hypothesis'
  const canReject = entry.status !== 'rejected'

  /* v6 评审 P0-1：详情整页装进唯一重卡（与原型 pane-memory.js 同构）。
     P1-2：编辑态的「保存」是这一屏唯一主按钮——此时「确认这条」降为次按钮，
     否则同屏 2 处蓝实底。 */
  return createElement('div', { className: 'dmo-pane' },
    createElement('div', { className: 'dmo-back' },
      TextLink({ children: '← 返回列表', onClick: onBack, attrs: { 'data-action': 'back-to-list' } })),
    createElement('section', { className: 'dmo-card-heavy' },
      h('h1', { className: 'dmo-detail-title' }, entry.title),
      h('div', { className: 'dmo-meta-row', style: { marginTop: 0 } },
        tag(statusLabel(entry.status),
          entry.status === 'confirmed' || entry.status === 'active' ? 'ok'
            : entry.status === 'rejected' ? 'err'
              : entry.status === 'stale' || entry.status === 'observed' || entry.status === 'hypothesis' ? 'warn' : ''),
        h('span', { className: 'dmo-meta' }, entry.domainLabel),
        h('span', { className: 'dmo-meta' }, `${entry.tokens} tokens`),
        h('span', { className: 'dmo-meta' }, `${entry.lines} 行`),
        h('span', { className: 'dmo-meta' }, `引用 ${count(trust.citeCount)} 次`)),

      SectionHead({ title: '凭什么可信' }),
      h('div', { className: 'dmo-meta-row', style: { marginTop: 0 } },
        h('span', { className: 'dmo-meta' }, `置信：${entry.confidence === null ? '—' : entry.confidence.toFixed(1)}`),
        h('span', { className: 'dmo-meta' }, `证据：${count(trust.evidenceCount)}`),
        h('span', { className: 'dmo-meta' }, `最后引用：${trust.lastCitedAt ?? '从未'}`)),
      entry.evidence.length === 0
        ? h('p', { className: 'dmo-note' }, '这条没有证据摘录——它来自你亲口说的话，不需要再举证。')
        : entry.evidence.map((item, index) => createElement('div', { key: index, className: 'dmo-evidence' },
            truncate(item.excerpt ?? '', 120),
            h('div', { className: 'dmo-evidence-src' }, `${item.gate ?? ''} · ${item.session ?? ''}`))),

      SectionHead({ title: '正文' }),
      editing
        ? createElement('div', null,
            createElement('textarea', {
              className: 'dmo-textarea',
              style: { minHeight: 190 },
              'aria-label': '正文源码',
              value: draft ?? entry.body,
              onChange: (event: { target: { value: string } }) => { setDraft(event.target.value) },
            }),
            createElement('div', { className: 'dmo-row-actions' },
              Primary({
                children: busy ? '保存中…' : '保存', disabled: busy,
                onClick: () => { run(() => call('writeBody', { path, body: draft ?? entry.body }), '已保存') },
                attrs: { 'data-action': 'writeBody', 'data-path': path },
              }),
              Btn({ children: '取消', onClick: () => { setEditing(false); setDraft(null) } })))
        : h('div', { className: 'dmo-body-block' }, entry.body.trim() === '' ? '（空）' : entry.body),

      feedback === null ? null : InlineDone({ ok: feedback.ok, text: feedback.text }),

      createElement('div', { className: 'dmo-row-actions' },
        canConfirm && !editing
          ? Primary({
              children: '确认这条', disabled: busy,
              onClick: () => { run(() => call('confirm', { path }), '已确认') },
              attrs: { 'data-action': 'confirm', 'data-path': path },
            })
          : Btn({ children: '编辑正文', disabled: busy || editing, onClick: () => { setEditing(true); setDraft(entry.body) }, attrs: { 'data-action': 'edit' } })),
      canReject || editing
        ? createElement('div', { className: 'dmo-row-actions' },
            canReject
              ? Btn({
                  children: '驳回（需要写理由）', small: true, disabled: busy,
                  onClick: () => { setRejecting(value => !value) },
                  attrs: { 'data-action': 'reject', 'data-path': path },
                })
              : null,
            Btn({
              children: '再留 90 天', small: true, disabled: busy,
              onClick: () => { run(() => call('keep', { path }), '已再留 90 天') },
              attrs: { 'data-action': 'keep', 'data-path': path },
            }),
            Btn({
              children: '归档退役', small: true, disabled: busy,
              onClick: () => { run(() => call('archive', { path }), '已归档') },
              attrs: { 'data-action': 'archive', 'data-path': path },
            }),
            h('p', { className: 'dmo-note' },
              '驳回会静默 30 天，期间不再推荐这条。归档后仍可检索，只是不再进上下文。'))
        : null,
      rejecting
        ? h(RejectBox, {
            reason: rejectReason,
            onReason: setRejectReason,
            busy,
            onCancel: () => { setRejecting(false); setRejectReason('') },
            onSubmit: () => { run(() => call('reject', { path, reason: rejectReason.trim() }), '已驳回，30 天内不再推荐') },
          })
        : null))
}

/** statusLabel 的本地引用（避免循环 import ui.ts 的导出顺序问题）。 */
function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    hypothesis: '候选', observed: '观察中', reinforced: '已强化', confirmed: '已确认',
    rejected: '已驳回', stale: '待复核', archived: '已归档', active: '有效', pending: '待确认',
  }
  return labels[status] ?? status
}
