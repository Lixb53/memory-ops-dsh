/**
 * 分区「总览」—— 待你处理 + 三率 + 预算账本 + 域统计 + 导出。
 *
 * 顶栏第一个指标不是「笔记数」，是**常驻前缀 tokens / 请求**。
 * 没有这个数字，用户永远会问「为什么不能多存一点」。
 */

import { createElement, useState, type ReactNode } from 'react'

import { call, type OverviewView, type SnapshotView } from '../api.ts'
import { useBridge } from '../data.ts'
import {
  Badge, BudgetRow, Button, Empty, ErrorState, Kpi, Skeleton, Stepper,
  bytes, count, orEmpty, percent, statusLabel, statusTone, truncate,
} from '../ui.ts'

/** 总览分区。 */
export function OverviewPane({ onOpenMemory }: { onOpenMemory: (path: string) => void }): ReactNode {
  const [exporting, setExporting] = useState(false)
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
      createElement(Kpi, {
        label: '常驻前缀',
        value: count(data.kpi.residentTokens),
        note: `tokens/请求 · 预算 ${count(data.kpi.residentBudget)}`,
      }),
      createElement(Kpi, { label: '命中率', value: percent(data.kpi.hitRate), note: '30 天' }),
      createElement(Kpi, { label: '待你处理', value: count(data.kpi.pending), note: '需拍板' }),
      createElement(Kpi, { label: '过期率', value: percent(data.kpi.expireRate), note: 'stale+archived' })),

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
