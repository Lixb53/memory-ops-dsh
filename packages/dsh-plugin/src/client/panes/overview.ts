/**
 * 分区「总览」—— 待你处理 + 三率 + 预算账本 + 域统计 + 导出。
 *
 * 顶栏第一个指标不是「笔记数」，是**常驻前缀 tokens / 请求**。
 * 没有这个数字，用户永远会问「为什么不能多存一点」。
 */

import { createElement, useState, type ReactNode } from 'react'

import { call, type OverviewView, type ResidentBreakdown, type SnapshotView } from '../api.ts'
import { useBridge } from '../data.ts'
import {
  Badge, BudgetRow, Button, Empty, ErrorState, Kpi, Skeleton, Stepper,
  bytes, count, orEmpty, percent, statusLabel, statusTone, truncate,
} from '../ui.ts'

/** 总览分区。 */
export function OverviewPane({ onOpenMemory }: { onOpenMemory: (path: string) => void }): ReactNode {
  const [exporting, setExporting] = useState(false)
  const [showResident, setShowResident] = useState(false)
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)
  const overview = useBridge<OverviewView>('overview', {})
  const snapshot = useBridge<SnapshotView>('snapshot', {})
  const health = useBridge<{
    silenced: { id: string; path: string; title: string }[]
    stale: { id: string; path: string; title: string; level: string; days: number | null }[]
    overLimit: number
    lineLimit: number
  }>('health', {})

  if (overview.phase === 'loading') return createElement(Skeleton, { rows: 4, height: 46 })
  if (overview.phase === 'error') {
    return createElement(ErrorState, {
      message: `读取总览失败：${orEmpty(overview.error)}`,
      onRetry: overview.reload,
    })
  }
  const data = overview.data
  if (data === undefined) return createElement(Skeleton, { rows: 2 })

  const queue = snapshot.data?.queue ?? []
  const healthData = health.data

  function doExport(format: 'markdown' | 'json'): void {
    setExporting(true)
    setToast(null)
    void call<{ filename: string; content: string; count: number }>('export', { format })
      .then((result) => {
        // 浏览器端直接触发下载；不经过宿主文件系统，避免额外写权限
        const blob = new Blob([result.content], { type: format === 'json' ? 'application/json' : 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = result.filename
        anchor.click()
        URL.revokeObjectURL(url)
        setToast({ ok: true, text: `已导出 ${result.count} 条到 ${result.filename}` })
      })
      .catch((failure: unknown) => {
        setToast({ ok: false, text: failure instanceof Error ? failure.message : String(failure) })
      })
      .finally(() => {
        setExporting(false)
      })
  }

  return createElement('div', null,
    // KPI：常驻前缀排第一
    createElement('div', { className: 'dmo-kpis' },
      createElement('button', {
        type: 'button',
        className: 'dmo-kpi dmo-kpi-btn',
        'aria-expanded': showResident,
        title: '点开看常驻前缀由哪些内容构成',
        onClick: () => { setShowResident(value => !value) },
      },
      createElement('div', { className: 'dmo-kpi-label' },
        '常驻前缀',
        createElement('span', { className: 'dmo-kpi-more' }, showResident ? '收起' : '构成')),
      createElement('div', { className: 'dmo-kpi-value' }, count(data.kpi.residentTokens)),
      createElement('div', { className: 'dmo-kpi-note' },
        `L0 文件 · 预算 ${count(data.kpi.residentBudget)}`)),
      createElement(Kpi, { label: '命中率', value: percent(data.kpi.hitRate), note: '30 天' }),
      createElement(Kpi, { label: '待你处理', value: count(data.kpi.pending), note: '需拍板' }),
      createElement(Kpi, { label: '过期率', value: percent(data.kpi.expireRate), note: 'stale+archived' })),

    // 常驻前缀构成：把「286 是什么」摊开
    showResident
      ? createElement(ResidentPanel, {
        resident: data.resident,
        onOpenMemory,
      })
      : null,

    // 预算账本
    createElement('div', { className: 'dmo-budget' },
      createElement('div', { className: 'dmo-lane-head' }, '预算账本'),
      data.budget.map(row => createElement(BudgetRow, {
        key: row.layer,
        name: `${row.layer} ${row.name.replace('层', '')}`,
        tokens: row.tokens,
        limit: row.limit,
      })),
      createElement('div', { className: 'dmo-note', style: { marginBottom: 0 } }, data.cacheNote)),

    toast === null ? null : createElement('div', {
      className: `dmo-toast ${toast.ok ? 'dmo-toast-ok' : 'dmo-toast-err'}`,
      role: 'status',
      style: { marginBottom: 8 },
    }, toast.text),

    // 待处理队列
    queue.length === 0
      ? createElement(Empty, { title: '待处理队列已清空' },
        createElement('div', null, '没有需要你拍板的条目。'))
      : createElement('div', null,
        createElement('div', { className: 'dmo-lane-head' }, '待你处理', createElement('span', { className: 'dmo-lane-count' }, `${queue.length} 条`)),
        queue.slice(0, 8).map(item => createElement('div', { key: item.id, className: 'dmo-card' },
          createElement('div', { className: 'dmo-card-title' }, truncate(item.title, 46)),
          createElement('div', { className: 'dmo-card-meta' },
            createElement(Badge, { tone: 'warn' }, item.reason),
            item.confidence === null ? null : createElement(Badge, { tone: 'idle' }, `置信 ${item.confidence.toFixed(1)}`),
            createElement('span', null, orEmpty(item.origin))),
          createElement(Stepper, { status: item.status }),
          createElement('div', { className: 'dmo-card-actions' },
            createElement(Button, { small: true, onClick: () => { onOpenMemory(item.path) } }, '看详情'),
            createElement(Button, {
              small: true,
              onClick: () => {
                void call('keep', { path: item.path }).then(() => { snapshot.reload() })
              },
            }, '再留 90 天'))))),

    // 三率
    createElement('div', { className: 'dmo-lane-head', style: { marginTop: 12 } }, '三率'),
    createElement('div', { className: 'dmo-card' },
      createElement('div', { className: 'dmo-card-meta' },
        createElement('span', null, `命中率 ${percent(data.rates.hitRate)}`),
        createElement('span', null, `确认率 ${percent(data.rates.confirmRate)}`),
        createElement('span', null, `过期率 ${percent(data.rates.expireRate)}`),
        createElement('span', null, `补库转化 ${percent(data.rates.missRate)}`)),
      createElement('div', { className: 'dmo-note', style: { marginBottom: 0 } },
        '分母为 0 显示「—」——「算不出来」和「是零」是两件事。')),

    // 库健康
    healthData === undefined ? null : createElement('div', { style: { marginTop: 12 } },
      createElement('div', { className: 'dmo-lane-head' }, '库健康'),
      createElement('div', { className: 'dmo-card' },
        createElement('div', { className: 'dmo-card-meta' },
          createElement(Badge, { tone: healthData.overLimit > 0 ? 'warn' : 'ok' },
            `超 ${healthData.lineLimit} 行 ${healthData.overLimit} 篇`),
          createElement(Badge, { tone: 'idle' }, `驳回静默 ${healthData.silenced.length} 条`),
          createElement(Badge, { tone: 'idle' }, `待复核 ${healthData.stale.length} 条`)))),

    // 域统计
    createElement('div', { className: 'dmo-lane-head', style: { marginTop: 12 } }, '域统计'),
    data.domains.length === 0
      ? createElement('div', { className: 'dmo-note' }, '还没有任何域。')
      : data.domains.map(domain => createElement('div', { key: domain.key, className: 'dmo-card' },
        createElement('div', { className: 'dmo-card-title' }, domain.label),
        createElement('div', { className: 'dmo-card-meta' },
          createElement('span', null, `${count(domain.files)} 篇`),
          createElement('span', null, `${count(domain.tokens)} tokens`),
          createElement('span', null, bytes(domain.bytes)),
          domain.overLimit > 0 ? createElement(Badge, { tone: 'warn' }, `超限 ${domain.overLimit}`) : null))),

    // 导出
    createElement('div', { className: 'dmo-lane-head', style: { marginTop: 12 } }, '导出'),
    createElement('div', { className: 'dmo-card-actions' },
      createElement(Button, { small: true, disabled: exporting, onClick: () => { doExport('markdown') } }, '导出 Markdown'),
      createElement(Button, { small: true, disabled: exporting, onClick: () => { doExport('json') } }, '导出 JSON')),
    createElement('div', { className: 'dmo-note' },
      `库根目录：${orEmpty(data.files > 0 ? snapshot.data?.root : snapshot.data?.root)} · ${count(data.files)} 篇 · ${count(data.tokens)} tokens`))
}

/**
 * 常驻前缀构成面板。
 *
 * 分三栏并各自标注付费方式，因为这三类**付费频率完全不同**：
 * catalog 每请求付费，index 只在被 read 时付费，frame 是固定开销。
 * 混在一起看，就会得出「常驻 286 太多」或「才 286 不用管」这类错误结论。
 */
function ResidentPanel({ resident, onOpenMemory }: {
  resident: ResidentBreakdown | undefined
  onOpenMemory: (path: string) => void
}): ReactNode {
  if (resident === undefined) {
    return createElement('div', { className: 'dmo-degrade' },
      '未能读取常驻前缀构成：宿主未提供 skills 服务。数字仍然可信，只是无法拆分。')
  }

  const catalogs = resident.items.filter(item => item.kind === 'catalog')
  const indexes = resident.items.filter(item => item.kind === 'index')

  return createElement('div', { className: 'dmo-budget' },
    createElement('div', { className: 'dmo-lane-head' }, '常驻前缀构成'),
    createElement('div', { className: 'dmo-note', style: { marginTop: 0 } },
      '每请求真正付费的只有 skill 目录；L0 索引文件在被 read 之前不进上下文。'),

    // ① 每请求付费
    createElement('div', { className: 'dmo-resident-group' },
      createElement('div', { className: 'dmo-resident-head' },
        createElement(Badge, { tone: 'warn' }, '每请求付费'),
        createElement('span', { className: 'dmo-lane-count' },
          `${count(resident.billedTokens)} tokens`)),
      catalogs.length === 0
        ? createElement('div', { className: 'dmo-note' },
          '宿主没有注入任何 skill（或未提供 skills 服务）。')
        : catalogs.map(item => createElement('div', { key: item.id, className: 'dmo-resident-row' },
          createElement('div', { className: 'dmo-resident-main' },
            createElement('div', { className: 'dmo-row-text' }, item.title),
            createElement('div', { className: 'dmo-row-sub' }, item.note)),
          createElement('span', { className: 'dmo-budget-num' }, count(item.tokens)))),
      createElement('div', { className: 'dmo-resident-row' },
        createElement('div', { className: 'dmo-resident-main' },
          createElement('div', { className: 'dmo-row-text' }, '目录框架文字'),
          createElement('div', { className: 'dmo-row-sub' },
            '<available_skills> 的固定说明，与 skill 数量无关')),
        createElement('span', { className: 'dmo-budget-num' }, count(resident.frameTokens)))),

    // ② 按需加载
    createElement('div', { className: 'dmo-resident-group' },
      createElement('div', { className: 'dmo-resident-head' },
        createElement(Badge, { tone: 'idle' }, '按需加载'),
        createElement('span', { className: 'dmo-lane-count' },
          `${count(resident.onDemandTokens)} tokens`)),
      indexes.length === 0
        ? createElement('div', { className: 'dmo-note' }, '没有标记 layer: l0 的索引文件。')
        : indexes.map(item => createElement('div', { key: item.id, className: 'dmo-resident-row' },
          createElement('div', { className: 'dmo-resident-main' },
            createElement('div', {
              className: 'dmo-row-text dmo-link',
              role: 'button',
              tabIndex: 0,
              title: '打开该索引文件',
              onClick: () => { onOpenMemory(item.path) },
              onKeyDown: (event: { key: string }) => {
                if (event.key === 'Enter' || event.key === ' ') onOpenMemory(item.path)
              },
            }, item.title),
            createElement('div', { className: 'dmo-row-sub' },
              `${item.path} · ${count(item.lines)} 行 · ${item.note}`,
              item.overLineLimit ? ' · 超 80 行' : '')),
          createElement('span', { className: 'dmo-budget-num' }, count(item.tokens))))),

    createElement('div', { className: 'dmo-note', style: { marginBottom: 0 } },
      '要压缩常驻成本，动的是 skill description；改索引文件不影响每请求开销，' +
      '但改任何一个都会作废当前会话缓存。'))
}
