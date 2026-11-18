/**
 * 分区「库健康」—— 回答「这套系统贵不贵、该不该维护」。
 *
 * ## 为什么把成本拆成三行
 *
 * 「每请求成本」与「索引体积」名字像、含义完全不同：前者每请求付费，
 * 后者按需加载。并排放且同样大，用户必然优化错对象（product.md §十二记过）。
 * 竖排三行 + 每行一句解释，付费方式用文字说清，不靠位置暗示。
 *
 * ## 为什么这一页没有主操作
 *
 * 它是只读诊断页。设计上不造一个假主按钮；
 * 页尾给「回今天」出口，避免走进死路。
 */

import { createElement, useState, type ReactNode } from 'react'

import { call, type OverviewView } from '../api.ts'
import { useBridge } from '../data.ts'
import { MaintenancePanel } from './maintenance.ts'
import {
  Btn, ErrorAlert, InlineDone, Primary, SectionHead, SkeletonRows, TextLink,
  count, h,
} from '../ui.ts'

/** 一行成本：名称 + 数字 + 解释。 */
function CostRow({ name, value, note }: { name: string; value: string; note: string }): ReactNode {
  return createElement('div', null,
    createElement('div', { className: 'dmo-cost-row' },
      h('span', { className: 'dmo-cost-name' }, name),
      h('span', { className: 'dmo-cost-num' }, value)),
    h('p', { className: 'dmo-cost-note' }, note))
}

/** 「库健康」分区。 */
export function HealthPane({ onGotoToday }: { onGotoToday: () => void }): ReactNode {
  const overview = useBridge<OverviewView>('overview', {})
  const health = useBridge<{ silenced: { title: string }[]; stale: { title: string }[]; overLimit: number; lineLimit: number }>('health', {})
  const [exporting, setExporting] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)

  function doExport(format: 'markdown' | 'json', domain?: string): void {
    setExporting(true)
    void call<{ filename: string; count: number }>('export', { format, domain })
      .then((result) => {
        setFeedback({ ok: true, text: `已导出 ${result.count} 条到 ${result.filename}` })
      })
      .catch((error: unknown) => {
        setFeedback({ ok: false, text: error instanceof Error ? error.message : String(error) })
      })
      .finally(() => { setExporting(false) })
  }

  if (overview.phase === 'loading') return SkeletonRows({ rows: 3, height: 60 })
  if (overview.phase === 'error') {
    return createElement('div', null,
      h(ErrorAlert, {
        title: '读不到成本数据',
        body: '库本身可能没问题，只是这次算不出来。「算不出来」和「是零」是两件事，所以这里不显示 0。',
        actions: [Primary({ children: '重试', onClick: overview.reload, attrs: { 'data-action': 'retry' } })],
      }))
  }
  const data = overview.data
  if (data === undefined) return null

  return createElement('div', null,
    h('h1', { className: 'dmo-page-name' }, '库健康'),
    h('p', { className: 'dmo-lede' }, '每请求都付的钱，和只在被读时才付的钱'),
    h('p', { className: 'dmo-lede-sub' }, '混在一起看会优化错东西——按它优化索引文件，每请求成本一分不省。'),

    createElement('div', { className: 'dmo-cost' },
      CostRow({
        name: '每请求成本',
        value: count(data.kpi.residentTokens),
        note: `tokens / 请求，预算 ${count(data.kpi.residentBudget)}。`
          + '这是唯一每请求都付的钱：skill description + 目录框架。'
          + '超了要压缩 skill description，改索引文件一分不省。',
      }),
      CostRow({
        name: '索引体积',
        value: count(data.kpi.indexTokens),
        note: '所有 layer: l0 文件之和，只在被 read 时才进上下文。'
          + '这个数大不代表贵。',
      }),
      CostRow({
        name: '全库体积',
        value: count(data.tokens),
        note: `${count(data.files)} 条记忆的正文合计，含 frontmatter 与证据链。`,
      }),
      createElement('div', { className: 'dmo-meta-row' },
        h('span', { className: 'dmo-meta' }, `驳回静默 ${count(health.data?.silenced.length ?? 0)} 条`),
        h('span', { className: 'dmo-meta' }, `待复核 ${count(health.data?.stale.length ?? 0)} 条`),
        h('span', { className: 'dmo-meta' }, `超 80 行 ${count(health.data?.overLimit ?? 0)} 篇`),
        h('span', { className: 'dmo-meta' }, `命中率 ${data.rates.hitRate === null ? '—' : `${Math.round(data.rates.hitRate * 100)}%`}`),
        h('span', { className: 'dmo-meta' }, `确认率 ${data.rates.confirmRate === null ? '—' : `${Math.round(data.rates.confirmRate * 100)}%`}`),
        h('span', { className: 'dmo-meta' }, `待拍板 ${count(data.kpi.pending)}`),
        h('span', { className: 'dmo-meta' }, '「—」= 分母为 0，不是 0%'))),

    SectionHead({ title: '维护', count: '按需跑' }),
    h('p', { className: 'dmo-note', style: { marginTop: 0 } },
      '这些都会改记忆的内容或可信度，所以一律先给预览、你点了才执行。'),
    createElement(MaintenancePanel, { onOpenMemory: () => {} }),

    SectionHead({ title: '导出' }),
    createElement('div', { className: 'dmo-row-actions', style: { marginTop: 0 } },
      Btn({ children: '全部 Markdown', small: true, disabled: exporting, onClick: () => { doExport('markdown') }, attrs: { 'data-action': 'export' } }),
      Btn({ children: '仅个人域', small: true, disabled: exporting, onClick: () => { doExport('markdown', 'personal') }, attrs: { 'data-action': 'export' } }),
      Btn({ children: '仅工作域', small: true, disabled: exporting, onClick: () => { doExport('markdown', 'work') }, attrs: { 'data-action': 'export' } })),
    feedback === null ? null : InlineDone({ ok: feedback.ok, text: feedback.text }),

    createElement('div', { className: 'dmo-row-actions', style: { marginTop: 'var(--s4)' } },
      Primary({ children: '回今天，看该做什么', onClick: onGotoToday, attrs: { 'data-action': 'goto', 'data-pane': 'today' } })))
}

/** 供测试断言的导出域标签（保持与旧 overview 的「仅个人域」一致）。 */
export const EXPORT_DOMAIN_LABELS = ['全部 Markdown', '仅个人域', '仅工作域']

/** 防止 tree-shake 误删 TextLink（health 页暂未用到，留给后续详情跳转）。 */
void TextLink
