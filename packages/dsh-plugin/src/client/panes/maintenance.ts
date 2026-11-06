/**
 * 维护作业面板 —— 锚点校验 / 减重 / 每周复盘 / 自动爬升。
 *
 * ## 为什么不新增「维护」分区
 *
 * product.md §11.3 明确「不新增第五个表面」、4 表面 + 5 分区是稳定结构。
 * 这四件事都是**低频、按时做一次**的动作，放进第 6 个分区会让导航常年挂着一个
 * 大部分时间没事可做的页签。挂在「总览」底部，用户在处理完待办队列后自然看到。
 *
 * ## 四条共同的交互立场
 *
 * 每一条都**先给预览、再让人点执行**：
 *   | 作业 | 预览态 | 落库动作 |
 *   |---|---|---|
 *   | 锚点校验 | 哪些锚点失效、失效在哪 | 「标为待复核」 |
 *   | 减重 | 每篇能省几行、拆哪节 | 「执行压缩」 |
 *   | 自动爬升 | 哪条会被升、凭什么 | 「按计划爬升」 |
 *   | 每周复盘 | 只读，不改库 | —— |
 *
 * 理由是同一件事：这四项都会改记忆的可信度或内容。**自动改可信度的系统
 * 正是 product.md §11.3 拒绝的那种东西**，所以默认一律 dry-run。
 */

import { createElement, useState, type ReactNode } from 'react'

import {
  call,
  type AnchorReportView,
  type CompactView,
  type PromoteView,
  type RepairView,
  type ReviewView,
} from '../api.ts'
import { useBridge } from '../data.ts'
import {
  Badge, Button, Empty, ErrorState, Skeleton, count, orEmpty, truncate,
} from '../ui.ts'

/** 维护作业面板（默认收起：低频动作不该占据首屏）。 */
export function MaintenancePanel({ onOpenMemory }: { onOpenMemory: (path: string) => void }): ReactNode {
  const [open, setOpen] = useState<'repair' | 'anchor' | 'compact' | 'promote' | 'review' | null>(null)
  const anchor = useBridge<AnchorReportView>('verifyAnchor', {})
  const compact = useBridge<CompactView>('compact', {})
  const promote = useBridge<PromoteView>('promote', {})
  const review = useBridge<ReviewView>('review', { days: 7 })
  const repair = useBridge<RepairView>('repairMeta', {})
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)

  function run(action: () => Promise<unknown>, success: string, after?: () => void): void {
    setBusy(true)
    setToast(null)
    void action()
      .then(() => {
        setToast({ ok: true, text: success })
        after?.()
      })
      .catch((failure: unknown) => {
        setToast({ ok: false, text: failure instanceof Error ? failure.message : String(failure) })
      })
      .finally(() => {
        setBusy(false)
      })
  }

  const TABLES: { id: 'repair' | 'anchor' | 'compact' | 'promote' | 'review'; label: string; badge: number }[] = [
    { id: 'repair', label: '修补', badge: repair.data?.fixes.length ?? 0 },
    { id: 'anchor', label: '锚点校验', badge: (anchor.data?.summary.stale ?? 0) + (anchor.data?.summary.missing ?? 0) },
    { id: 'compact', label: '减重', badge: compact.data?.total ?? 0 },
    { id: 'promote', label: '爬升', badge: promote.data?.plans.length ?? 0 },
    { id: 'review', label: '复盘', badge: review.data?.todo.length ?? 0 },
  ]

  return createElement('div', { style: { marginTop: 12 } },
    createElement('div', { className: 'dmo-lane-head' }, '维护作业',
      createElement('span', { className: 'dmo-lane-count' }, '按需触发，无常驻定时器')),
    createElement('div', { className: 'dmo-note', style: { marginTop: 0 } },
      '这四件事都会改记忆的可信度或内容，所以一律「先预览、再执行」。'),

    createElement('div', { className: 'dmo-card-actions', style: { marginBottom: 8 } },
      TABLES.map(table => createElement(Button, {
        key: table.id,
        small: true,
        variant: open === table.id ? 'primary' : 'plain',
        onClick: () => { setOpen(open === table.id ? null : table.id) },
      }, table.label, table.badge > 0 ? ` (${table.badge > 99 ? '99+' : table.badge})` : ''))),

    toast === null ? null : createElement('div', {
      className: `dmo-toast ${toast.ok ? 'dmo-toast-ok' : 'dmo-toast-err'}`,
      role: 'status',
      style: { marginBottom: 8 },
    }, toast.text),

    open === null ? null : open === 'repair'
      ? createElement(RepairSection, { data: repair.data, phase: repair.phase, error: repair.error, busy, run, onRetry: repair.reload, onOpenMemory })
      : open === 'anchor'
      ? createElement(AnchorSection, { data: anchor.data, phase: anchor.phase, error: anchor.error, busy, run, onRetry: anchor.reload, onOpenMemory })
      : open === 'compact'
        ? createElement(CompactSection, { data: compact.data, phase: compact.phase, error: compact.error, busy, run, onRetry: compact.reload, onOpenMemory })
        : open === 'promote'
          ? createElement(PromoteSection, { data: promote.data, phase: promote.phase, error: promote.error, busy, run, onRetry: promote.reload, onOpenMemory })
          : createElement(ReviewSection, { data: review.data, phase: review.phase, error: review.error, onRetry: review.reload, onOpenMemory }))
}

/** 统一的懒加载占位。 */
function Loading({ phase, error, onRetry, what }: {
  phase: string; error: string | undefined; onRetry: () => void; what: string
}): ReactNode | null {
  if (phase === 'loading') return createElement(Skeleton, { rows: 2, height: 34 })
  if (phase === 'error') return createElement(ErrorState, { message: `读取${what}失败：${orEmpty(error)}`, onRetry })
  return null
}

/** ① 锚点校验。 */
function AnchorSection({ data, phase, error, busy, run, onRetry, onOpenMemory }: {
  data: AnchorReportView | undefined
  phase: string
  error: string | undefined
  busy: boolean
  run: (action: () => Promise<unknown>, success: string, after?: () => void) => void
  onRetry: () => void
  onOpenMemory: (path: string) => void
}): ReactNode {
  const loading = Loading({ phase, error, onRetry, what: '锚点校验' })
  if (loading !== null) return loading
  if (data === undefined) return null

  /** 只有明确失效的才值得动手；unverifiable 缺数据，不该自动降级。 */
  const actionable = data.checks.filter(check => check.state === 'stale' || check.state === 'missing')

  return createElement('div', { className: 'dmo-budget' },
    createElement('div', { className: 'dmo-budget-row', style: { flexWrap: 'wrap', gap: 6 } },
      createElement(Badge, { tone: 'ok' }, `有效 ${data.summary.fresh}`),
      createElement(Badge, { tone: 'warn' }, `失效 ${data.summary.stale}`),
      createElement(Badge, { tone: 'err' }, `文件丢失 ${data.summary.missing}`),
      createElement(Badge, { tone: 'idle' }, `无法判定 ${data.summary.unverifiable}`),
      createElement(Badge, { tone: 'idle' }, `无锚点 ${data.withoutAnchor}`)),

    createElement('div', { className: 'dmo-note' },
      data.checks.length === 0
        ? '库里还没有任何条目声明锚点。锚点用来回答「我引用的代码符号还在不在」。'
        : existingBaseDir(data.baseDir)),

    actionable.length === 0
      ? null
      : createElement('div', null,
        actionable.slice(0, 10).map(check => createElement('div', { key: check.id, className: 'dmo-resident-row' },
          createElement('div', { className: 'dmo-resident-main' },
            createElement('div', {
              className: 'dmo-row-text dmo-link',
              role: 'button',
              tabIndex: 0,
              onClick: () => { onOpenMemory(check.path) },
              onKeyDown: (event: { key: string }) => {
                if (event.key === 'Enter' || event.key === ' ') onOpenMemory(check.path)
              },
            }, truncate(check.title, 38)),
            createElement('div', { className: 'dmo-row-sub' }, check.reason)),
          createElement(Badge, { tone: check.state === 'missing' ? 'err' : 'warn' }, check.state))),
        createElement('div', { className: 'dmo-card-actions' },
          createElement(Button, {
            small: true, variant: 'danger', disabled: busy,
            onClick: () => {
              run(
                () => call('verifyAnchor', { apply: true, baseDir: data.baseDir }),
                `已把 ${actionable.length} 条标为待复核`,
                onRetry,
              )
            },
          }, `标为待复核（${actionable.length} 条）`))))
}

/** 锚点基准目录说明：说清「在哪找的」，否则失效报告无法复核。 */
function existingBaseDir(baseDir: string): string {
  return baseDir === ''
    ? '基准目录为宿主进程的工作目录（锚点的 path 相对它解析）。'
    : `基准目录：${baseDir}`
}

/** ② 减重。 */
function CompactSection({ data, phase, error, busy, run, onRetry, onOpenMemory }: {
  data: CompactView | undefined
  phase: string
  error: string | undefined
  busy: boolean
  run: (action: () => Promise<unknown>, success: string, after?: () => void) => void
  onRetry: () => void
  onOpenMemory: (path: string) => void
}): ReactNode {
  const loading = Loading({ phase, error, onRetry, what: '减重候选' })
  if (loading !== null) return loading
  if (data === undefined) return null

  return createElement('div', { className: 'dmo-budget' },
    createElement('div', { className: 'dmo-budget-row' },
      createElement('span', { className: 'dmo-budget-name' }, '超限'),
      createElement('span', { className: 'dmo-budget-num' }, `${count(data.total)} 篇`),
      createElement('span', { className: 'dmo-lane-count' },
        `可省 ${count(data.removableLines)} 行`)),

    createElement('div', { className: 'dmo-note' },
      `只做无损压缩：去行尾空白、折叠连续空行、去首尾空行。
不删重复行、不摘要正文、不自动拆文件——那三件都会改语义或改路径（路径就是记忆的 id）。`),

    data.total === 0
      ? createElement(Empty, { title: '没有超限文件' },
        createElement('div', null, `所有条目都在 ${data.lineLimit} 行以内。`))
      : createElement('div', null,
        data.candidates.slice(0, 8).map(item => createElement('div', { key: item.path, className: 'dmo-resident-row' },
          createElement('div', { className: 'dmo-resident-main' },
            createElement('div', {
              className: 'dmo-row-text dmo-link',
              role: 'button',
              tabIndex: 0,
              onClick: () => { onOpenMemory(item.path) },
              onKeyDown: (event: { key: string }) => {
                if (event.key === 'Enter' || event.key === ' ') onOpenMemory(item.path)
              },
            }, truncate(item.title, 38)),
            createElement('div', { className: 'dmo-row-sub' },
              `${item.before} → ${item.after} 行`
              + (item.removed > 0 ? `（省 ${item.removed}）` : '（已无冗余，需人工摘要）')
              + (item.stillOverLimit ? ' · 压缩后仍超限' : ''),
              item.splitSuggestions.length === 0
                ? ''
                : ` · 建议拆出：${item.splitSuggestions.map(section => `${section.heading}(${section.lines}行)`).join('、')}`)),
          item.removed > 0 ? createElement(Badge, { tone: 'warn' }, `-${item.removed}`) : createElement(Badge, { tone: 'idle' }, '无冗余'))),
        createElement('div', { className: 'dmo-card-actions' },
          createElement(Button, {
            small: true, variant: 'primary', disabled: busy || data.removableLines === 0,
            onClick: () => {
              run(() => call('compact', { apply: true }), '已压缩', onRetry)
            },
          }, data.removableLines === 0 ? '没有可无损压缩的内容' : `执行压缩（省 ${data.removableLines} 行）`))),

    createElement('div', { className: 'dmo-note', style: { marginBottom: 0 } },
      '压缩只解决「空行多」，不解决「内容真的长」。后者要人工摘要或拆文件，系统不替你做。'))
}

/** ③ 自动爬升。 */
function PromoteSection({ data, phase, error, busy, run, onRetry, onOpenMemory }: {
  data: PromoteView | undefined
  phase: string
  error: string | undefined
  busy: boolean
  run: (action: () => Promise<unknown>, success: string, after?: () => void) => void
  onRetry: () => void
  onOpenMemory: (path: string) => void
}): ReactNode {
  const loading = Loading({ phase, error, onRetry, what: '爬升计划' })
  if (loading !== null) return loading
  if (data === undefined) return null

  return createElement('div', { className: 'dmo-budget' },
    createElement('div', { className: 'dmo-note', style: { marginTop: 0 } },
      `规则：被 ≥${data.minSessions} 个**不同会话**引用过，且当前是 hypothesis / observed，才升一级。
同一会话问三次不算——那是同一次困惑，不是独立验证。`),

    data.plans.length === 0
      ? createElement(Empty, { title: '没有可爬升的条目' },
        createElement('div', null, '要么引用次数还不够，要么已经是 confirmed（人拍的板，代码不许改）。'))
      : createElement('div', null,
        data.plans.slice(0, 10).map(plan => createElement('div', { key: plan.id, className: 'dmo-resident-row' },
          createElement('div', { className: 'dmo-resident-main' },
            createElement('div', {
              className: 'dmo-row-text dmo-link',
              role: 'button',
              tabIndex: 0,
              onClick: () => { onOpenMemory(plan.path) },
              onKeyDown: (event: { key: string }) => {
                if (event.key === 'Enter' || event.key === ' ') onOpenMemory(plan.path)
              },
            }, truncate(plan.title, 38)),
            createElement('div', { className: 'dmo-row-sub' }, plan.reason)),
          createElement(Badge, { tone: 'brand' }, `${plan.from} → ${plan.to}`))),
        createElement('div', { className: 'dmo-card-actions' },
          createElement(Button, {
            small: true, variant: 'primary', disabled: busy,
            onClick: () => {
              run(() => call('promote', { apply: true }), `已爬升 ${data.plans.length} 条`, onRetry)
            },
          }, `按计划爬升（${data.plans.length} 条）`))))
}

/** ④ 每周复盘。 */
function ReviewSection({ data, phase, error, onRetry, onOpenMemory }: {
  data: ReviewView | undefined
  phase: string
  error: string | undefined
  onRetry: () => void
  onOpenMemory: (path: string) => void
}): ReactNode {
  const loading = Loading({ phase, error, onRetry, what: '复盘' })
  if (loading !== null) return loading
  if (data === undefined) return null

  return createElement('div', { className: 'dmo-budget' },
    createElement('div', { className: 'dmo-budget-row', style: { flexWrap: 'wrap', gap: 6 } },
      createElement(Badge, { tone: 'idle' }, `近 ${data.window.days} 天`),
      createElement(Badge, { tone: 'brand' }, `改动 ${count(data.counts.touched)}`),
      createElement(Badge, { tone: 'warn' }, `待拍板 ${count(data.counts.pending)}`),
      createElement(Badge, { tone: 'idle' }, `待复核 ${count(data.counts.stale)}`),
      createElement(Badge, { tone: 'idle' }, `未命中 ${count(data.counts.misses)} 次`)),

    Object.keys(data.events).length === 0
      ? createElement('div', { className: 'dmo-note' }, `近 ${data.window.days} 天没有事件记录。`)
      : createElement('div', { className: 'dmo-card-meta' },
        Object.entries(data.events).map(([kind, value]) => createElement('span', { key: kind }, `${kind} ${value}`))),

    data.todo.length === 0
      ? createElement(Empty, { title: '这周没有该动手的事' },
        createElement('div', null, '队列是空的——不是故障。'))
      : createElement('div', null,
        createElement('div', { className: 'dmo-lane-head', style: { marginTop: 8 } }, '下周该做'),
        data.todo.slice(0, 10).map((item, index) => createElement('div', {
          key: `${item.kind}-${index}`,
          className: 'dmo-resident-row',
        },
        createElement('div', { className: 'dmo-resident-main' },
          createElement('div', {
            className: item.path === undefined ? 'dmo-row-text' : 'dmo-row-text dmo-link',
            role: item.path === undefined ? undefined : 'button',
            tabIndex: item.path === undefined ? undefined : 0,
            onClick: item.path === undefined ? undefined : () => { onOpenMemory(item.path!) },
            onKeyDown: item.path === undefined ? undefined : (event: { key: string }) => {
              if (event.key === 'Enter' || event.key === ' ') onOpenMemory(item.path!)
            },
          }, truncate(item.title, 38)),
          createElement('div', { className: 'dmo-row-sub' }, item.detail)),
        createElement(Badge, { tone: reviewTone(item.kind) }, reviewLabel(item.kind))))),

    data.topMisses.length === 0
      ? null
      : createElement('div', { style: { marginTop: 8 } },
        createElement('div', { className: 'dmo-lane-head' }, '最该补的未命中'),
        data.topMisses.map(miss => createElement('div', { key: miss.query, className: 'dmo-resident-row' },
          createElement('div', { className: 'dmo-resident-main' },
            createElement('div', { className: 'dmo-row-text' }, truncate(miss.query, 38))),
          createElement('span', { className: 'dmo-budget-num' }, `${count(miss.count)} 次`)))),

    createElement('div', { className: 'dmo-note', style: { marginBottom: 0 } },
      `复盘只读，不改库。失败率类指标见上方「三率」——那里显示「—」是因为分母为 0，不是 0%。`))
}

/** 复盘项类型 → 文案。 */
function reviewLabel(kind: string): string {
  switch (kind) {
    case 'retire': return '该退役'
    case 'confirm': return '待拍板'
    case 'review': return '待复核'
    case 'compact': return '超限'
    case 'fill': return '该补'
    default: return kind
  }
}

/** 复盘项类型 → 徽标语气。 */
function reviewTone(kind: string): 'ok' | 'warn' | 'err' | 'idle' | 'brand' {
  switch (kind) {
    case 'retire': return 'err'
    case 'confirm': return 'warn'
    case 'review': return 'warn'
    case 'compact': return 'brand'
    default: return 'idle'
  }
}

/**
 * ⓪ frontmatter 修补 —— 「插件装了、数据也在、但什么都不工作」的解药。
 *
 * 真实库里 34 篇是裸 Markdown（无 frontmatter）、7 篇 status 是非法值 `active`。
 * 后果是一串静默失效：待你处理队列永远空、确认率永远 null、预算账本三段全错。
 * 用户看到的是「插件好像没工作」，其实是数据缺元数据。
 */
function RepairSection({ data, phase, error, busy, run, onRetry, onOpenMemory }: {
  data: RepairView | undefined
  phase: string
  error: string | undefined
  busy: boolean
  run: (action: () => Promise<unknown>, success: string, after?: () => void) => void
  onRetry: () => void
  onOpenMemory: (path: string) => void
}): ReactNode {
  const loading = Loading({ phase, error, onRetry, what: '修补计划' })
  if (loading !== null) return loading
  if (data === undefined) return null

  const noFrontmatter = data.fixes.filter(fix => !fix.hadFrontmatter).length

  return createElement('div', { className: 'dmo-budget' },
    createElement('div', { className: 'dmo-budget-row', style: { flexWrap: 'wrap', gap: 6 } },
      createElement(Badge, { tone: data.fixes.length === 0 ? 'ok' : 'warn' }, `需修补 ${data.fixes.length}`),
      createElement(Badge, { tone: 'ok' }, `健康 ${data.healthy}`),
      noFrontmatter > 0 ? createElement(Badge, { tone: 'err' }, `无 frontmatter ${noFrontmatter}`) : null),

    createElement('div', { className: 'dmo-note', style: { marginTop: 0 } },
      data.fixes.length === 0
        ? '全部条目元数据完整，治理功能正常（待你处理、确认率、到期退役都能算出来）。'
        : '缺 status → 待你处理队列永远空；缺 layer → 预算账本三段统计不出来；缺 updated → 永远不提示退役。'
        + ' 修补只写 frontmatter，**绝不改正文**，也**绝不覆盖已有值**（非法 status 除外）。'),

    data.fixes.length === 0
      ? null
      : createElement('div', null,
        data.fixes.slice(0, 8).map(fix => createElement('div', { key: fix.path, className: 'dmo-resident-row' },
          createElement('div', { className: 'dmo-resident-main' },
            createElement('div', {
              className: 'dmo-row-text dmo-link',
              role: 'button',
              tabIndex: 0,
              onClick: () => { onOpenMemory(fix.path) },
              onKeyDown: (event: { key: string }) => {
                if (event.key === 'Enter' || event.key === ' ') onOpenMemory(fix.path)
              },
            }, truncate(fix.title, 38)),
            createElement('div', { className: 'dmo-row-sub' }, fix.reasons.join('；'))),
          createElement(Badge, { tone: fix.hadFrontmatter ? 'warn' : 'err' },
            fix.hadFrontmatter ? `${Object.keys(fix.patch).length} 字段` : '无 frontmatter'))),
        data.fixes.length > 8
          ? createElement('div', { className: 'dmo-note' }, `还有 ${data.fixes.length - 8} 篇…`)
          : null,
        createElement('div', { className: 'dmo-card-actions' },
          createElement(Button, {
            small: true, variant: 'primary', disabled: busy,
            onClick: () => {
              run(
                () => call('repairMeta', { apply: true }),
                `已修补 ${data.fixes.length} 篇，治理功能已恢复`,
                onRetry,
              )
            },
          }, `修补 ${data.fixes.length} 篇`))),

    createElement('div', { className: 'dmo-note', style: { marginBottom: 0 } },
      '修补后请刷新「总览」——待你处理队列、确认率、层统计会立刻有数字。'))
}
