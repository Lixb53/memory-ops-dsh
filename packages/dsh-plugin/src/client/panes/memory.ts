/**
 * 分区「记忆」—— 全量记忆列表 + 详情 + 源码编辑。
 *
 * 编辑走**源码单模式**：侧栏宽度放不下表单化，但能力必须对等，
 * 所以不做「只读」。详情里给出证据链、锚点状态与四出口。
 *
 * v3.5 两处补齐（都是 product.md §2.3 点名的缺口）：
 *   1. **检索改走 `search` 路由**。早先用客户端 `filter`，看着也能搜，
 *      但 `recall` / `cite` / `miss` 事件一条都不会产生——于是「命中率」恒为 null，
 *      「未命中」分区也永远收不到输入。客户端过滤不是检索，它没有账可记。
 *   2. **驳回与撤销驳回**。状态机里有 rejected、有 30 天静默、有 undoReject 路由、
 *      有测试覆盖，但界面上没有按钮。纠正机制用不上，等于没有。
 */

import { createElement, useState, type ReactNode } from 'react'

import { call, type DetailView, type SearchView, type SnapshotView } from '../api.ts'
import { useBridge } from '../data.ts'
import { scopeBody } from '../session-context.ts'
import {
  Badge, Button, Chip, Empty, ErrorState, RejectBox, SelectionBar, Skeleton, Stepper,
  count, orEmpty, statusLabel, statusTone, truncate,
} from '../ui.ts'

/** 记忆分区。 */
export function MemoryPane({ project, cwd, onOpenMemory, detailPath }: {
  project: string | undefined
  cwd: string | undefined
  onOpenMemory: (path: string) => void
  detailPath: string | undefined
}): ReactNode {
  if (detailPath !== undefined) {
    return createElement(MemoryDetail, { path: detailPath, onBack: () => { onOpenMemory('') } })
  }
  return createElement(MemoryList, { project, cwd, onOpenMemory })
}

/** 列表。 */
function MemoryList({ project, cwd, onOpenMemory }: {
  project: string | undefined
  cwd: string | undefined
  onOpenMemory: (path: string) => void
}): ReactNode {
  /**
   * 范围开关：默认**全库**。
   *
   * 这里曾经直接把 `project` 传给 snapshot，于是「记忆」页签和「本项目」
   * 显示的是同一份东西——当前项目没有记忆时，两页都是 0 条。
   * 用户看到「记忆一栏是空的」会以为库坏了，而实际是 42 篇都在、只是被项目过滤掉了。
   *
   * 分工应该是：「本项目」回答「这个项目有什么」，「记忆」回答「我到底存了什么」。
   * 后者必须是全库，否则没有任何一页能看到全貌。
   */
  const [scope, setScope] = useState<'all' | 'project'>('all')
  /**
   * 「仅本项目」把 cwd 交给 core 解析，而不是用末段目录名。
   *
   * 早先这里的选项文案直接拼 `project`（如 `V2.1.25-dev`），
   * 用户选了它得到空列表，会以为库坏了。
   */
  const scopeParams = scope === 'project' ? scopeBody(cwd, project) : {}
  const [query, setQuery] = useState('')
  /** 已提交的检索词（回车或点检索才提交，避免每敲一个字都记一条 miss）。 */
  const [submitted, setSubmitted] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)
  /**
   * 域筛选 —— 域统计「下钻」的落地方式。
   *
   * 总览的域统计告诉你「sz-web 有 35 篇」，但看不到是哪 35 篇。
   * 点一下跳到这一页并带上域过滤，才是那个数字的自然去处。
   *
   * ⚠️ 这个 hook **必须放在下面所有 early return 之前**。
   * 曾经把它写在 `if (phase === 'loading') return ...` 之后，
   * 结果首帧走 loading 分支时 hook 被跳过，数据到达后 hook 数量变化
   * → React 抛错 → 整个面板白屏。Hooks 顺序是硬契约，不能有任何条件分支穿过它。
   */
  const [domainFilter, setDomainFilter] = useState('')
  /**
   * 状态筛选药丸（设计稿 .chip）。
   *
   * ⚠️ hook 顺序：这个 useState 必须与其它 hook 一样位于所有 early return 之前。
   * 实测踩过：把它写在 `if (phase === 'loading') return` 之后 → 首帧跳过该 hook
   * → 数据到达后 hook 数量变化 → React 抛错 → 整片白屏。
   */
  const [statusFilter, setStatusFilter] = useState('')

  const { phase, data, error, reload } = useBridge<SnapshotView>(
    'snapshot',
    scopeParams,
    [scope, cwd, project],
  )
  /**
   * 检索走路由才有账可记。
   *
   * `record` 只在**人主动检索**时为 true：空 query 的空跑不能记 miss，
   * 否则一进列表页就凭空污染未命中表，把真正该补的信号冲掉。
   */
  const search = useBridge<SearchView>(
    'search',
    { query: submitted, ...scopeParams, record: submitted.trim() !== '' },
    [submitted, scope, cwd, project],
  )

  if (phase === 'loading') return createElement(Skeleton, { rows: 5, height: 44 })
  if (phase === 'error') return createElement(ErrorState, { message: `读取记忆失败：${orEmpty(error)}`, onRetry: reload })
  if (data === undefined) return createElement(Skeleton, { rows: 2 })

  const searching = submitted.trim() !== ''
  const rawList = searching
    ? (search.data?.hits ?? []).map(hit => ({
      id: hit.id,
      path: hit.path,
      title: hit.title,
      status: hit.status,
      layer: hit.layer,
      tokens: hit.tokens,
      domainLabel: hit.domainLabel,
      citeCount: undefined as number | undefined,
      snippet: hit.snippet as string | undefined,
    }))
    : data.entries.map(entry => ({
      id: entry.id,
      path: entry.path,
      title: entry.title,
      status: entry.status,
      layer: entry.layer,
      tokens: entry.tokens,
      domainLabel: entry.domainLabel,
      citeCount: entry.citeCount,
      snippet: undefined as string | undefined,
    }))

  /**
   * 状态药丸的四个分组。
   *
   * 为什么要做成计数药丸而不是下拉：这四组是「我需要处理什么」的直接答案，
   * 计数必须在**不展开**时就可见。「全部 42 / 待确认 2 / 待复核 1 …」
   * 一眼能看出库里有多少欠账——下拉只能看到当前选中项。
   */
  const statusGroups: { id: string; label: string; match: (status: string) => boolean }[] = [
    { id: '', label: '全部', match: () => true },
    { id: 'pending', label: '待确认', match: s => s === 'hypothesis' || s === 'observed' || s === 'pending' },
    { id: 'stale', label: '待复核', match: s => s === 'stale' },
    { id: 'confirmed', label: '已确认', match: s => s === 'confirmed' || s === 'active' },
    { id: 'archived', label: '已归档', match: s => s === 'archived' },
    { id: 'rejected', label: '已驳回', match: s => s === 'rejected' },
  ]
  const statusCounts = statusGroups.map(group => ({
    ...group,
    count: rawList.filter(item => group.match(item.status)).length,
  }))
  const statusMatched = statusFilter === ''
    ? rawList
    : rawList.filter(item => (statusGroups.find(g => g.id === statusFilter)?.match(item.status) ?? true))
  const list = domainFilter === ''
    ? statusMatched
    : statusMatched.filter(item => item.domainLabel === domainFilter)
  /** 当前列表里出现过的域（去重），供下拉选择。 */
  const domainOptions = [...new Set(rawList.map(item => item.domainLabel))]

  function run(action: () => Promise<{ archived?: unknown[]; failed?: unknown[] }>, success: string): void {
    setBusy(true)
    setToast(null)
    void action()
      .then((result) => {
        // 批量归档必须报出失败数：部分失败却显示「已归档 N 条」会让人以为清干净了
        const failed = result?.failed?.length ?? 0
        setToast({
          ok: failed === 0,
          text: failed === 0 ? success : `${success}，但有 ${failed} 条失败（可能已被改动）`,
        })
        setSelected([])
        reload()
      })
      .catch((failure: unknown) => {
        setToast({ ok: false, text: failure instanceof Error ? failure.message : String(failure) })
      })
      .finally(() => {
        setBusy(false)
      })
  }

  return createElement('div', null,
    createElement('div', { className: 'dmo-row', style: { marginBottom: 8 } },
      createElement('input', {
        className: 'dmo-input',
        placeholder: '检索正文，回车记账（命中记 cite，未命中记 miss）…',
        value: query,
        'aria-label': '检索记忆',
        onChange: (event: { target: { value: string } }) => { setQuery(event.target.value) },
        onKeyDown: (event: { key: string }) => {
          if (event.key === 'Enter') setSubmitted(query)
          if (event.key === 'Escape') { setQuery(''); setSubmitted('') }
        },
      }),
      createElement(Button, { small: true, onClick: () => { setSubmitted(query) } }, '检索')),

    // 范围 + 域筛选：这一页默认看全库，因为它是唯一能看到全貌的地方
    createElement('div', { className: 'dmo-toolbar' },
      createElement('select', {
        className: 'dmo-select',
        value: scope,
        'aria-label': '范围',
        onChange: (event: { target: { value: string } }) => {
          setScope(event.target.value === 'project' ? 'project' : 'all')
          setSelected([])
        },
      },
      createElement('option', { value: 'all' }, '全部记忆'),
      /**
       * 选项文案用**解析后**的项目名，不是 cwd 末段。
       *
       * `V2.1.25-dev` 这种分支目录不该出现在「项目」这个位置上。
       */
      createElement('option', { value: 'project' },
        data.projectScoped && data.project !== null
          ? `仅本项目 · ${data.project}`
          : '仅本项目（未识别到项目）')),
      createElement('select', {
        className: 'dmo-select',
        value: domainFilter,
        'aria-label': '按域筛选',
        onChange: (event: { target: { value: string } }) => {
          setDomainFilter(event.target.value)
          setSelected([])
        },
      },
      createElement('option', { value: '' }, '全部域'),
      domainOptions.map(name => createElement('option', { key: name, value: name }, name)))),

    // 状态药丸：计数常驻可见
    createElement('div', { className: 'dmo-chips', role: 'group', 'aria-label': '状态筛选' },
      statusCounts.map(group => createElement(Chip, {
        key: group.id,
        label: group.label,
        count: group.count,
        active: statusFilter === group.id,
        onClick: () => {
          setStatusFilter(group.id)
          setSelected([])
        },
      }))),

    searching
      ? createElement('div', { className: 'dmo-note' },
        search.phase === 'loading'
          ? '检索中…'
          : search.data?.matched === true
            ? `命中 ${count(search.data.total)} 条 · 本次读取约 ${count(search.data.cost)} tokens`
            : '未命中——已记一条，去「未命中」分区把它补成一条记忆。')
      : createElement('div', { className: 'dmo-note' },
        `${count(list.length)} 条`
        + (domainFilter === '' && scope === 'all' ? '' : `（${scope === 'project' ? '仅本项目' : '全库'}${domainFilter === '' ? '' : ` · ${domainFilter}`}）`)
        + ` · 超 80 行 ${count(data.stats.overLimit)} 条 · 检索会记账，过滤不该记账`),

    toast === null ? null : createElement('div', {
      className: `dmo-toast ${toast.ok ? 'dmo-toast-ok' : 'dmo-toast-err'}`,
      role: 'status',
      style: { marginBottom: 8 },
    }, toast.text),

    // 批量归档
    createElement(SelectionBar, {
      count: selected.length,
      total: list.length,
      busy,
      onClear: () => { setSelected([]) },
    },
    createElement(Button, {
      small: true,
      variant: 'danger',
      disabled: busy,
      onClick: () => {
        run(() => call('batchArchive', { paths: selected, reason: '批量退役' }), `已归档 ${selected.length} 条`)
      },
    }, `归档选中 ${selected.length} 条`)),

    list.length === 0
      ? createElement(Empty, { title: searching ? '没有命中' : '没有记忆' },
        createElement('div', null, searching ? '换个词，或去「未命中」看这次未命中。' : '这个域还没有条目。'))
      : list.map(entry => createElement('div', {
        key: entry.id,
        className: 'dmo-card',
        role: 'button',
        tabIndex: 0,
        style: { cursor: 'pointer' },
        onClick: () => { onOpenMemory(entry.path) },
        onKeyDown: (event: { key: string }) => {
          if (event.key === 'Enter' || event.key === ' ') onOpenMemory(entry.path)
        },
      },
      createElement('div', { className: 'dmo-card-title' }, truncate(entry.title, 46)),
      createElement('div', { className: 'dmo-card-meta' },
        createElement('input', {
          type: 'checkbox',
          className: 'dmo-check',
          checked: selected.includes(entry.path),
          'aria-label': `选择：${truncate(entry.title, 20)}`,
          onClick: (event: { stopPropagation(): void }) => { event.stopPropagation() },
          onChange: () => {
            setSelected(current => current.includes(entry.path)
              ? current.filter(path => path !== entry.path)
              : [...current, entry.path])
          },
        }),
        createElement(Badge, { tone: statusTone(entry.status) }, statusLabel(entry.status)),
        createElement(Badge, { tone: 'idle' }, entry.layer.toUpperCase()),
        entry.status === 'stale' ? createElement(Badge, { tone: 'warn' }, '待复核') : null,
        createElement('span', null, count(entry.tokens), ' tokens'),
        createElement('span', null, entry.domainLabel),
        // 引用次数：判断「这条还活着吗」的关键信号
        createElement('span', null,
          entry.citeCount === undefined || entry.citeCount === 0
            ? '未引用'
            : `${count(entry.citeCount)} 次引用`)),
      entry.snippet === undefined
        ? createElement('div', { className: 'dmo-row-sub' }, orEmpty(entry.path))
        : createElement('div', { className: 'dmo-row-sub' }, truncate(entry.snippet, 90)))))
}

/** 详情：状态 stepper + 信任栏 + 锚点 + 证据链 + 源码编辑 + 出口。 */
function MemoryDetail({ path, onBack }: { path: string; onBack: () => void }): ReactNode {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)
  const { phase, data, error, reload } = useBridge<DetailView>('detail', { path }, [path])

  function run(action: () => Promise<unknown>, success: string): void {
    setBusy(true)
    setToast(null)
    void action()
      .then(() => {
        setToast({ ok: true, text: success })
        setEditing(false)
        setRejecting(false)
        setReason('')
        reload()
      })
      .catch((failure: unknown) => {
        setToast({ ok: false, text: failure instanceof Error ? failure.message : String(failure) })
      })
      .finally(() => {
        setBusy(false)
      })
  }

  if (phase === 'loading') return createElement(Skeleton, { rows: 4 })
  if (phase === 'error') return createElement(ErrorState, { message: `读取详情失败：${orEmpty(error)}`, onRetry: reload })
  if (data === undefined) return createElement(Skeleton, { rows: 2 })

  const { entry, trust } = data
  /** 驳回是「任何态都可做」，所以不看当前状态；撤销只在 rejected 时才有意义。 */
  const canReject = entry.status !== 'rejected'
  const canUndoReject = entry.status === 'rejected'

  return createElement('div', null,
    createElement('div', { className: 'dmo-row', style: { marginBottom: 8 } },
      createElement(Button, { small: true, onClick: onBack }, '← 返回列表'),
      createElement('span', { className: 'dmo-row-sub', style: { marginTop: 0 } }, orEmpty(entry.domainLabel))),

    createElement('div', { className: 'dmo-card-title', style: { fontSize: 14 } }, entry.title),
    createElement('div', { className: 'dmo-card-meta' },
      createElement(Badge, { tone: statusTone(entry.status) }, statusLabel(entry.status)),
      createElement(Badge, { tone: 'idle' }, `${count(entry.tokens)} tokens`),
      createElement(Badge, { tone: entry.overLineLimit ? 'warn' : 'idle' }, `${entry.lines} 行`),
      entry.overTokenLimit ? createElement(Badge, { tone: 'warn' }, '超 1200 tokens') : null),

    createElement(Stepper, { status: entry.status }),

    // 驳回静默：说清「它现在为什么不被推荐」
    entry.status === 'rejected'
      ? createElement('div', { className: 'dmo-degrade' },
        `驳回静默中：这条 30 天内不再参与纠错。理由——${orEmpty(entry.evidence.length === 0 ? '（未记录）' : '见下')}`,
        createElement('div', { style: { marginTop: 4 } },
          createElement(Button, {
            small: true, disabled: busy,
            onClick: () => { run(() => call('undoReject', { path }), '撤销驳回：已恢复为已强化') },
          }, '撤销驳回')))
      : null,

    // 信任栏
    createElement('div', { className: 'dmo-card' },
      createElement('div', { className: 'dmo-card-meta' },
        createElement('span', null, `置信 ${entry.confidence === null ? '—' : entry.confidence.toFixed(1)}`),
        createElement('span', null, `证据 ${count(trust.evidenceCount)}`),
        createElement('span', null, `引用 ${count(trust.citeCount)}`),
        createElement('span', null, `最后引用 ${orEmpty(trust.lastCitedAt)}`)),
      trust.anchor === null ? null : createElement('div', { style: { marginTop: 6 } },
        createElement(Badge, { tone: trust.anchorState === 'stale' ? 'warn' : 'brand' },
          trust.anchorState === 'stale' ? '锚点失效' : '锚点有效'),
        createElement('div', { className: 'dmo-row-sub' },
          `${orEmpty(trust.anchor.path)}${trust.anchor.symbol === undefined ? '' : ` · ${trust.anchor.symbol}`}`))),

    // 证据链
    entry.evidence.length === 0
      ? createElement('div', { className: 'dmo-note' }, '无证据条目（G1 用户直述可豁免）。')
      : createElement('div', null,
        createElement('div', { className: 'dmo-lane-head' }, '证据链'),
        entry.evidence.map((item, index) => createElement('div', { key: index, className: 'dmo-evidence' },
          createElement('div', null, orEmpty(item.excerpt)),
          createElement('div', { className: 'dmo-evidence-src' }, `${orEmpty(item.gate)} · ${orEmpty(item.session)}`)))),

    toast === null ? null : createElement('div', {
      className: `dmo-toast ${toast.ok ? 'dmo-toast-ok' : 'dmo-toast-err'}`,
      role: 'status',
      style: { marginTop: 8 },
    }, toast.text),

    // 源码编辑
    editing
      ? createElement('div', { style: { marginTop: 8 } },
        createElement('label', { className: 'dmo-label' }, '正文源码（frontmatter 不动）'),
        createElement('textarea', {
          className: 'dmo-textarea',
          value: draft,
          style: { minHeight: 190 },
          'aria-label': '正文源码',
          onChange: (event: { target: { value: string } }) => { setDraft(event.target.value) },
        }),
        createElement('div', { className: 'dmo-card-actions' },
          createElement(Button, {
            variant: 'primary', disabled: busy,
            onClick: () => {
              run(() => call('writeBody', { path, body: draft }), '已保存')
            },
          }, busy ? '保存中…' : '保存'),
          createElement(Button, { onClick: () => { setEditing(false) } }, '取消')))
      : createElement('div', { className: 'dmo-card-body', style: { marginTop: 8, maxHeight: 260, overflowY: 'auto' } },
        orEmpty(entry.body.trim())),

    // 驳回理由输入（内联展开）
    rejecting
      ? createElement(RejectBox, {
        reason,
        onReason: setReason,
        busy,
        onCancel: () => { setRejecting(false); setReason('') },
        onSubmit: () => {
          run(() => call('reject', { path, reason }), '已驳回，30 天内不再推荐')
        },
      })
      : null,

    // 出口
    createElement('div', { className: 'dmo-card-actions', style: { marginTop: 10 } },
      createElement(Button, {
        small: true, disabled: busy,
        onClick: () => { setDraft(entry.body); setEditing(true) },
      }, '编辑源码'),
      entry.status === 'stale' || entry.status === 'observed' || entry.status === 'hypothesis'
        ? createElement(Button, {
          small: true, variant: 'primary', disabled: busy,
          onClick: () => { run(() => call('confirm', { path }), '已确认') },
        }, '确认')
        : null,
      // 驳回：与确认**同等显眼**。只给「确认」不给「驳回」，界面就在逼人往一个方向走。
      canReject
        ? createElement(Button, {
          small: true, variant: 'danger', disabled: busy,
          onClick: () => { setRejecting(value => !value) },
        }, rejecting ? '取消驳回' : '驳回')
        : null,
      canUndoReject
        ? createElement(Button, {
          small: true, disabled: busy,
          onClick: () => { run(() => call('undoReject', { path }), '已撤销驳回') },
        }, '撤销驳回')
        : null,
      createElement(Button, {
        small: true, disabled: busy,
        onClick: () => {
          run(() => call('keep', { path }), '已再留 90 天')
        },
      }, '再留 90 天'),
      createElement(Button, {
        small: true, variant: 'danger', disabled: busy,
        onClick: () => { run(() => call('archive', { path }), '已归档') },
      }, '归档')))
}
