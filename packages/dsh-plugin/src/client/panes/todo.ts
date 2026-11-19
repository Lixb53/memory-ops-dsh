/**
 * 分区「待办」—— 把压着的事清掉。
 *
 * ## 三段为什么这样分
 *
 * 「待办」在旧界面里散落在三个地方（记录流 / 待你处理队列 / 未命中），
 * 用户不知道去哪。v4 按用户要做的动作类型合并成一页三段：
 *   - 要我拍板的：推断待确认、待复核、到期
 *   - 要我流转的：INBOX 里 open / todo
 *   - 要我补的：搜不到且达到阈值
 *
 * ## 空段处理
 *
 * 空段整体不渲染，不显示「0 条」。唯一例外是「要我补的」：
 * 未达阈值时若整段消失，用户会以为功能不存在——换成一句可行动的说明。
 *
 * ## brand 实底名额：整页只有一个
 *
 * 按「用户该先做什么」的顺序分配：拍板 > 补库 > 流转（> notice 兜底出口）。
 * 早先每段各自判断「自己是不是第一个」，跨段会冲突
 * （待拍板 1 条 + 未命中达标 1 条 → 同屏 2 处 brand）。
 */

import { createElement, useState, type ReactNode } from 'react'

import { call, type InboxView, type MissesView, type SnapshotView } from '../api.ts'
import { useBridge } from '../data.ts'
// v6 评审 P0-1：待办在面板内部，跳转用 requestPane 即可——
// 面板订阅同一个 store（usePaneRequest），写请求就会切分区，不需要 layout 服务。
import { requestPane } from '../pane-nav.ts'
import {
  Btn, EmptyState, ErrorAlert, InlineDone, Notice, Primary, RejectBox, SectionHead, SkeletonRows,
  TextLink, h, tag, truncate,
} from '../ui.ts'

const INBOX_STATE_LABEL: Record<string, string> = {
  open: '未开始', todo: '进行中', done: '已完成', dropped: '已丢弃',
}

/** 「待办」分区。 */
export function TodoPane({ onOpenDetail }: {
  /** 打开某条记忆的详情（面板传入；缺省退化为跳「记忆」分区）。 */
  onOpenDetail?: (path: string) => void
}): ReactNode {
  const snapshot = useBridge<SnapshotView>('snapshot', {})
  const inbox = useBridge<InboxView>('inbox', { domain: 'personal' })
  const misses = useBridge<MissesView>('misses', {})

  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const [suggestFeedback, setSuggestFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  /** 内联驳回的目标（同屏只展开一个）。 */
  const [rejecting, setRejecting] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  /** 内联写结论的目标（miss query 或 edit-<lineIndex>）。 */
  const [drafting, setDrafting] = useState<string | null>(null)
  const [draftText, setDraftText] = useState('')

  function run(action: () => Promise<unknown>, success: string, target: 'capture' | 'suggest' = 'capture'): void {
    setBusy(true)
    void action()
      .then(() => {
        if (target === 'suggest') setSuggestFeedback({ ok: true, text: success })
        else setFeedback({ ok: true, text: success })
        snapshot.reload()
        inbox.reload()
        misses.reload()
      })
      .catch((error: unknown) => {
        const text = error instanceof Error ? error.message : String(error)
        if (target === 'suggest') setSuggestFeedback({ ok: false, text })
        else setFeedback({ ok: false, text })
      })
      .finally(() => { setBusy(false) })
  }

  /**
   * 确认一条推断。
   *
   * 反馈落在建议卡（suggestFeedback）而不是捕获框——动作来源决定反馈位置。
   * 这里刻意不用 `void call(...)`：测试会拦「bare void call」，且失败必须可见。
   */
  function confirmEntry(path: string): void {
    run(() => call('confirm', { path }), '已确认（剩余待拍板见上方计数）', 'suggest')
  }

  function undoRejectEntry(path: string): void {
    run(() => call('undoReject', { path }), '已撤销驳回')
  }

  function rejectEntry(path: string): void {
    if (rejectReason.trim() === '') return
    setBusy(true)
    void call('reject', { path, reason: rejectReason.trim() })
      .then(() => {
        setFeedback({ ok: true, text: '已驳回，30 天内不再推荐' })
        setRejecting(null)
        setRejectReason('')
        snapshot.reload()
      })
      .catch((error: unknown) => {
        setFeedback({ ok: false, text: error instanceof Error ? error.message : String(error) })
      })
      .finally(() => { setBusy(false) })
  }

  /* —— 派生 —— */
  const queue = snapshot.data?.queue ?? []
  const openRows = (inbox.data?.entries ?? []).filter(row => row.state === 'open' || row.state === 'todo')
  const fillable = misses.data?.pipeline['should-fill'] ?? []
  const draftingItems = misses.data?.pipeline.drafting ?? []
  const todoTotal = queue.length + openRows.length + fillable.length + draftingItems.length

  const head = [
    h('h1', { className: 'dmo-page-name' }, '待办'),
    h('p', { className: 'dmo-lede' },
      todoTotal === 0 ? '三段都清空了' : `共 ${todoTotal} 件，分三类：要我拍板的、要我流转的、要我补的`),
  ]

  /* —— 整页错误：三段共用一次快照读取，失败时如实说，不谎称「互不影响」 —— */
  if (snapshot.phase === 'error') {
    return createElement('div', { className: 'dmo-pane' }, head,
      h(ErrorAlert, {
        title: '读不到待办',
        body: '这次读取整体失败，所以三段都没出来。库文件没有丢——先重试，还不行就去「记忆」直接看条目。',
        actions: [
          Primary({ children: '重试', onClick: snapshot.reload, attrs: { 'data-action': 'retry' } }),
          Btn({ children: '去记忆', onClick: () => { requestPane('memory') }, attrs: { 'data-action': 'goto', 'data-pane': 'memory' } }),
        ],
      }))
  }

  if (snapshot.phase === 'loading') return SkeletonRows({ rows: 3, height: 64 })

  if (todoTotal === 0) {
    /* 空屏装进唯一重卡：空态不是灰字，是一个有容器的动作（IA §5.3） */
    return createElement('div', { className: 'dmo-pane' }, head,
      createElement('section', { className: 'dmo-card-heavy' },
        h(EmptyState, {
          title: '清空了',
          body: '下次 agent 搜不到东西、或者我从对话里总结出新的推断时，这里会自动出现。现在不用管它。',
          actions: [
            Primary({ children: '记一条', onClick: () => { requestPane('capture') }, attrs: { 'data-action': 'goto', 'data-pane': 'capture' } }),
            Btn({ children: '去记忆', onClick: () => { requestPane('memory') }, attrs: { 'data-action': 'goto', 'data-pane': 'memory' } }),
          ],
        }),
        feedback === null ? null : InlineDone({ ok: feedback.ok, text: feedback.text })))
  }

  /* —— brand 名额：按优先级分配，整页只有一个 —— */
  const firstSection = queue.length > 0
    ? 'decisions'
    : fillable.length > 0 ? 'fill' : 'fill-notice'

  /* —— 段 1：要我拍板的 —— */
  const decisionRows = queue.map((item, index) => {
    const usePrimary = firstSection === 'decisions' && index === 0
    const conf = item.confidence === null ? '—' : item.confidence.toFixed(1)
    const evidence = item.evidence[0]
    return createElement('li', { key: item.id, className: 'dmo-row' },
      h('p', { className: 'dmo-row-title' }, truncate(item.title, 90)),
      h('div', { className: 'dmo-meta-row' },
        tag(item.status === 'stale' ? '待复核' : item.kind === 'retire' ? `${item.days ?? 0} 天未引用` : '推断待确认',
          item.kind === 'retire' ? 'err' : 'warn'),
        h('span', { className: 'dmo-meta' }, item.domainLabel),
        h('span', { className: 'dmo-meta' }, `置信 ${conf}`)),
      evidence === undefined ? null
        : createElement('div', { className: 'dmo-evidence' },
            truncate(evidence.excerpt ?? '', 90),
            h('div', { className: 'dmo-evidence-src' }, `${item.origin} · ${evidence.session ?? ''}`)),
      createElement('div', { className: 'dmo-row-actions' },
        /*
         * 驳回静默期内的条目（rejected，30 天内仍在队列）：
         * 唯一有意义的动作是「撤销驳回」——它不该再被确认或再驳回。
         */
        item.status === 'rejected'
          ? Btn({
              children: '撤销驳回', small: true, disabled: busy,
              onClick: () => { undoRejectEntry(item.path) },
              attrs: { 'data-action': 'undoReject', 'data-path': item.id },
            })
          : null,
        item.status === 'rejected'
          ? null
          : (item.kind === 'retire'
              ? (usePrimary
                  ? Primary({ children: '归档', small: true, disabled: busy, onClick: () => { run(() => call('archive', { path: item.path, reason: '到期退役' }), '已归档') }, attrs: { 'data-action': 'archive', 'data-path': item.id } })
                  : Btn({ children: '归档', small: true, disabled: busy, onClick: () => { run(() => call('archive', { path: item.path, reason: '到期退役' }), '已归档') }, attrs: { 'data-action': 'archive', 'data-path': item.id } }))
              : (usePrimary
                  ? Primary({ children: '确认', small: true, disabled: busy, onClick: () => { confirmEntry(item.path) }, attrs: { 'data-action': 'confirm', 'data-path': item.id } })
                  : Btn({ children: '确认', small: true, disabled: busy, onClick: () => { confirmEntry(item.path) }, attrs: { 'data-action': 'confirm', 'data-path': item.id } }))),
        TextLink({
          children: '看全文',
          // v6 评审 P0-1：早先只有 attrs 没有 onClick——点了没反应。
          onClick: () => { (onOpenDetail ?? (() => { requestPane('memory') }))(item.path) },
          attrs: { 'data-action': 'open-detail', 'data-path': item.id },
        })),
      rejecting === item.id
        ? h(RejectBox, {
            reason: rejectReason,
            onReason: setRejectReason,
            busy,
            onCancel: () => { setRejecting(null); setRejectReason('') },
            onSubmit: () => { rejectEntry(item.path) },
          })
        : createElement('details', { className: 'dmo-more' },
            createElement('summary', null, '其它处理方式'),
            createElement('div', { className: 'dmo-more-body' },
              Btn({
                children: item.kind === 'retire' ? '再留 90 天' : '驳回（需要写理由）',
                small: true, disabled: busy,
                onClick: () => {
                  if (item.kind === 'retire') {
                    run(() => call('keep', { path: item.path }), '已再留 90 天')
                  } else {
                    setRejecting(item.id)
                  }
                },
                attrs: { 'data-action': item.kind === 'retire' ? 'keep' : 'reject', 'data-path': item.id },
              }),
              h('p', { className: 'dmo-note' },
                item.kind === 'retire'
                  ? '再留会刷新 updated，让 134 天倒计时重新开始。'
                  : '驳回会静默 30 天，所以必须写一句为什么。')),
            ))
  })

  /* —— 段 2：要我流转的 —— */
  const flowRows = openRows.map(row => createElement('li', { key: row.lineIndex, className: 'dmo-row' },
    h('p', { className: 'dmo-row-title' }, truncate(row.content, 90)),
    h('div', { className: 'dmo-meta-row' },
      h('span', { className: 'dmo-meta' }, row.date),
      h('span', { className: 'dmo-meta' }, row.kind),
      tag(INBOX_STATE_LABEL[row.state] ?? row.state, 'warn')),
    createElement('div', { className: 'dmo-row-actions' },
      Btn({
        children: '标完成', small: true, disabled: busy,
        onClick: () => { run(() => call('updateInbox', { domain: 'personal', lineIndex: row.lineIndex, patch: { state: 'done' } }), '标为已完成，从待办移除了') },
        attrs: { 'data-action': 'inbox-done', 'data-line': String(row.lineIndex) },
      }),
      TextLink({ children: '改内容', onClick: () => { setDrafting(`edit-${row.lineIndex}`); setDraftText(row.content) }, attrs: { 'data-action': 'inbox-edit', 'data-line': String(row.lineIndex) } })),
    drafting === `edit-${row.lineIndex}`
      ? createElement('div', { style: { marginTop: 'var(--s2)' } },
          createElement('textarea', {
            className: 'dmo-textarea',
            'aria-label': '编辑记录内容',
            value: draftText,
            onChange: (event: { target: { value: string } }) => { setDraftText(event.target.value) },
          }),
          createElement('div', { className: 'dmo-row-actions' },
            Btn({
              // v6 评审 P1-2：内联编辑提交降为次按钮——流转段永远不持有
              // 整页主按钮名额，这里再用 Primary 就会与拍板段同屏 2 处蓝实底。
              children: '保存', small: true, disabled: busy || draftText.trim() === '',
              onClick: () => {
                run(
                  () => call('updateInbox', { domain: 'personal', lineIndex: row.lineIndex, patch: { content: draftText.trim() } }),
                  '内容已改',
                )
                setDrafting(null)
              },
              attrs: { 'data-action': 'inbox-save', 'data-line': String(row.lineIndex) },
            }),
            Btn({ children: '取消', small: true, onClick: () => { setDrafting(null) } })))
      : createElement('details', { className: 'dmo-more' },
          createElement('summary', null, '不做了'),
          createElement('div', { className: 'dmo-more-body' },
            /*
             * 提升到档案：把这条速记沉淀成正式条目（新建/追加 md 并标 done+去向）。
             * 这是 INBOX 的唯一「毕业」出口，不能只留在记录流页里。
             */
            Btn({
              children: '提升到档案', small: true, disabled: busy,
              onClick: () => { run(() => call('promoteInbox', { domain: 'personal', lineIndex: row.lineIndex }), '已提升到档案') },
              attrs: { 'data-action': 'promoteInbox', 'data-line': String(row.lineIndex) },
            }),
            Btn({
              children: '丢掉这条', small: true, disabled: busy,
              onClick: () => { run(() => call('updateInbox', { domain: 'personal', lineIndex: row.lineIndex, patch: { state: 'dropped' } }), '丢掉了，不再出现在待办里') },
              attrs: { 'data-action': 'inbox-drop', 'data-line': String(row.lineIndex) },
            }),
            h('p', { className: 'dmo-note' }, '丢掉表示「我已经判断不做」。它会从待办移除，记录仍在记录流里。')),
          )))

  /* —— 段 3：要我补的 —— */
  const fillSection = (() => {
    if (fillable.length > 0) {
      const rows = fillable.map((item, index) => {
        const usePrimary = firstSection === 'fill' && index === 0
        const writeBtn = usePrimary
          ? Primary({ children: '写结论', small: true, onClick: () => { setDrafting(item.query); setDraftText('') }, attrs: { 'data-action': 'miss-write', 'data-query': item.query } })
          : Btn({ children: '写结论', small: true, onClick: () => { setDrafting(item.query); setDraftText('') }, attrs: { 'data-action': 'miss-write', 'data-query': item.query } })
        return createElement('li', { key: item.query, className: 'dmo-row' },
          h('p', { className: 'dmo-row-title' }, truncate(item.query, 90)),
          h('div', { className: 'dmo-meta-row' },
            tag('等你补', 'warn'),
            h('span', { className: 'dmo-meta' }, `问过 ${item.count} 次`),
            h('span', { className: 'dmo-meta' }, `${item.sessions} 个会话`)),
          createElement('div', { className: 'dmo-row-actions' },
            writeBtn,
            TextLink({ children: '不补', onClick: () => { run(() => call('missDelete', { query: item.query }), '已标记不补') }, attrs: { 'data-action': 'miss-delete', 'data-query': item.query } })),
          drafting === item.query
            ? createElement('div', { style: { marginTop: 'var(--s2)' } },
                createElement('textarea', {
                  className: 'dmo-textarea',
                  'aria-label': '写结论',
                  placeholder: '写下这条问题的结论，确认后落库并进入 7 天验证期…',
                  value: draftText,
                  onChange: (event: { target: { value: string } }) => { setDraftText(event.target.value) },
                }),
                createElement('div', { className: 'dmo-row-actions' },
                  Btn({
                    // v6 评审 P1-2：同上——草稿提交降次按钮，
                    // 该行可能同时显示条件主按钮「写结论」，不许 2 处蓝实底。
                    children: '确认落库', small: true, disabled: busy || draftText.trim() === '',
                    onClick: () => {
                      run(
                        () => call('missConfirm', { query: item.query, content: draftText.trim(), type: '问题' }),
                        '已落库，进入 7 天验证期',
                      )
                      setDrafting(null)
                    },
                    attrs: { 'data-action': 'miss-confirm', 'data-query': item.query },
                  }),
                  Btn({ children: '取消', small: true, onClick: () => { setDrafting(null) } })))
            : null)
      })
      return createElement('section', { className: 'dmo-card-quiet' },
        SectionHead({
          title: '要我补的', count: String(fillable.length),
          /*
           * 批量草稿：只生成草稿、**不落库**——草稿必须人逐条确认才写入，
           * 这条产品立场（自动写库会产生无法审计的臆想）不变。
           */
          action: fillable.length > 1
            ? Btn({
                children: `批量生成 ${fillable.length} 条草稿`, small: true, disabled: busy,
                onClick: () => {
                  run(
                    () => call('missBatchDraft', { queries: fillable.map(item => item.query), type: '问题' }),
                    '已生成草稿，去「草稿」逐条确认',
                  )
                },
                attrs: { 'data-action': 'missBatchDraft' },
              })
            : undefined,
        }),
        createElement('ul', { className: 'dmo-list', role: 'list' }, rows))
    }

    /*
     * 未达阈值时的诚实处理：本机未命中全部 count=1，阈值是 3。
     * 整段消失会让用户以为功能不存在；换成说明 + 一个真实出口。
     */
    const missTotal = misses.data?.total ?? 0
    if (missTotal === 0) return []
    const usePrimary = firstSection === 'fill-notice'
    const fillBtn = usePrimary
      ? Primary({ children: '仍然补一条', onClick: () => { setDrafting(''); setDraftText('') }, attrs: { 'data-action': 'miss-write' } })
      : Btn({ children: '仍然补一条', small: true, attrs: { 'data-action': 'miss-write' } })
    return createElement('section', { className: 'dmo-card-quiet' },
      SectionHead({ title: '要我补的', count: '0' }),
      Notice({
        title: '还没有到该补的时候',
        text: `${missTotal} 个问题各被搜过 1 次，还没到 3 次的阈值。`
          + '同一个问题再被搜到 2 次，它就会自动出现在这里等你补。'
          + '现在补也行——只是系统还没证据说明它值得占位。',
        tone: 'warn',
      }),
      createElement('div', { className: 'dmo-row-actions' },
        fillBtn,
        h('span', { className: 'dmo-note', style: { margin: 0 } }, `会从上面 ${missTotal} 个问题里挑一个开始`)))
  })()

  return createElement('div', { className: 'dmo-pane' }, head,
    /*
     * 拍板段的反馈落在段首（动作来源是这一段），不塞到页面末尾——
     * 三段齐全时页面末尾在视口之外，「就地反馈」会变成看不见的反馈。
     *
     * v6 评审 P0-1：三段各自装进容器。拍板段 = 本页唯一重卡
     * （card-fill + l3 + 主操作所在）；流转与补库 = 静卡。
     * 行分隔的 border-l1 从此只在卡内出现。
     */
    suggestFeedback === null ? null : InlineDone({ ok: suggestFeedback.ok, text: suggestFeedback.text }),
    queue.length === 0 ? null : createElement('section', { className: 'dmo-card-heavy' },
      SectionHead({ title: '要我拍板的', count: String(queue.length) }),
      createElement('ul', { className: 'dmo-list', role: 'list' }, decisionRows)),
    openRows.length === 0 ? null : createElement('section', { className: 'dmo-card-quiet' },
      SectionHead({
        title: '要我流转的', count: String(openRows.length),
        /* 超过 1 条才给批量——单条时逐行点更快，批量按钮只是噪音 */
        action: openRows.length > 1
          ? Btn({
              children: '全部标完成', small: true, disabled: busy,
              onClick: () => {
                run(
                  () => call('batchInboxState', {
                    domain: 'personal',
                    lineIndexes: openRows.map(row => row.lineIndex),
                    state: 'done',
                  }),
                  `已标完成 ${openRows.length} 条`,
                )
              },
              attrs: { 'data-action': 'batchInboxState' },
            })
          : undefined,
      }),
      createElement('ul', { className: 'dmo-list', role: 'list' }, flowRows)),
    /* 补库段自己带容器（静卡），未达阈值时是说明卡，missTotal=0 时是 null */
    fillSection,
    feedback === null ? null : InlineDone({ ok: feedback.ok, text: feedback.text }),
    busy ? h('p', { className: 'dmo-note' }, '处理中…') : null)
}
