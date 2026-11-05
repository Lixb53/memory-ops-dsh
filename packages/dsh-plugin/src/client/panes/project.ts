/**
 * 分区「本项目」—— 当前项目相关记忆。
 *
 * 这是最容易出现**假空态**的地方，所以三种情况必须区分清楚：
 *   1. 加载中      → 骨架
 *   2. 读取失败    → 错误态 + 重试
 *   3. 拿不到项目   → 降级条 + 退回全部工作域（**不是**空列表）
 *   4. 真的没有     → 空态 + 三个出口
 */

import { createElement, type ReactNode } from 'react'

import { call, type SnapshotView } from '../api.ts'
import { useBridge } from '../data.ts'
import {
  Badge, Button, Empty, ErrorState, Kpi, Skeleton, Stepper,
  count, orEmpty, percent, statusLabel, statusTone, truncate,
} from '../ui.ts'

/** 本项目分区。 */
export function ProjectPane({ project, sessionId, onOpenMemory, onGoto }: {
  project: string | undefined
  sessionId: string | undefined
  onOpenMemory: (path: string) => void
  onGoto: (pane: string) => void
}): ReactNode {
  const { phase, data, error, reload } = useBridge<SnapshotView>(
    'snapshot',
    project === undefined ? {} : { project },
    [project],
  )

  if (phase === 'loading') return createElement(Skeleton, { rows: 3 })
  if (phase === 'error') {
    return createElement(ErrorState, {
      message: `读取记忆失败：${orEmpty(error)}。记忆库本身没有被清空，这是读取问题。`,
      onRetry: reload,
    })
  }
  if (data === undefined) return createElement(Skeleton, { rows: 2 })

  const degraded = project !== undefined && data.projectScoped === false
  const entries = data.entries
  const queue = data.queue

  return createElement('div', null,
    // 降级条：明确说任务不受影响，而不是假装没有数据
    degraded
      ? createElement('div', { className: 'dmo-degrade' },
        '无法判定当前项目，已退回全部工作域（任务不受影响）。',
        createElement('div', { style: { marginTop: 4 } },
          createElement(Button, { small: true, onClick: reload }, '重新判定')))
      : null,

    createElement('div', { className: 'dmo-kpis' },
      createElement(Kpi, { label: '相关记忆', value: count(entries.length), note: project === undefined ? '全部域' : project }),
      createElement(Kpi, {
        label: '待你处理',
        value: count(queue.length),
        note: queue.length === 0 ? '队列已清' : '需拍板',
      }),
      createElement(Kpi, {
        label: '命中率',
        value: percent(data.stats.rates.hitRate),
        note: '30 天',
      }),
      // 这一格必须说清「谁的前缀」：项目视图量的是该项目的索引，
      // 不是全库（全库数字在「总览」）。两者混用会得出错误结论。
      createElement(Kpi, {
        label: '本项目索引',
        value: count(data.stats.layers.l0.tokens),
        note: data.statsScope === 'scoped' ? 'tokens · 被 read 时才付费' : '全库索引',
      })),

    // 本项目索引文件：让「151」这个数字可追溯到具体文件
    (data.projectIndex ?? []).length === 0
      ? null
      : createElement('div', { className: 'dmo-note' },
        '本项目索引：',
        (data.projectIndex ?? []).map((item, index) => createElement('span', { key: item.path },
          index === 0 ? '' : ' · ',
          createElement('span', {
            className: 'dmo-link',
            role: 'button',
            tabIndex: 0,
            onClick: () => { onOpenMemory(item.path) },
            onKeyDown: (event: { key: string }) => {
              if (event.key === 'Enter' || event.key === ' ') onOpenMemory(item.path)
            },
          }, item.title),
          ` ${count(item.tokens)}`))),

    // 待确认优先置顶：一条一次点击
    queue.length === 0 ? null : createElement('div', { style: { marginBottom: 10 } },
      createElement('div', { className: 'dmo-lane-head' }, '待你处理', createElement('span', { className: 'dmo-lane-count' }, `${queue.length} 条`)),
      queue.slice(0, 5).map(item => createElement(QueueCard, {
        key: item.id, item, onOpenMemory,
      }))),

    entries.length === 0
      ? createElement(Empty, { title: '当前项目还没有相关记忆' },
        createElement('div', null, '这不是故障——只是还没沉淀。'),
        createElement('div', { className: 'dmo-row', style: { justifyContent: 'center', marginTop: 9 } },
          createElement(Button, { variant: 'primary', onClick: () => { onGoto('stream') } }, '记一条'),
          createElement(Button, { onClick: () => { onGoto('misses') } }, '看未命中'),
          createElement(Button, { onClick: reload }, '重新读取')))
      : createElement('div', null,
        entries.slice(0, 12).map(entry => createElement('div', {
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
          createElement(Badge, { tone: statusTone(entry.status) }, statusLabel(entry.status)),
          entry.anchor === null ? null : createElement(Badge, { tone: 'brand' }, '锚点'),
          createElement('span', null, `${entry.domainLabel}`),
          createElement('span', null, `${count(entry.tokens)} tokens`),
          entry.expiry.level === 'fresh'
            ? null
            : createElement(Badge, { tone: 'warn' }, entry.expiry.level === 'retire' ? `${entry.expiry.days} 天未引用` : '临近退役')),
        entry.evidence.length === 0 ? null : createElement('div', { className: 'dmo-evidence' },
          createElement('div', null, truncate(entry.evidence[0]?.excerpt ?? '', 60)),
          createElement('div', { className: 'dmo-evidence-src' },
            `${orEmpty(entry.evidence[0]?.gate)} · ${orEmpty(entry.evidence[0]?.session)}`)))),
        entries.length > 12
          ? createElement('div', { className: 'dmo-note' }, `还有 ${entries.length - 12} 条，去「记忆」分区看全量。`)
          : null))
}

/** 待处理卡片：确认 / 驳回 / 归档 / 再留 90 天。 */
function QueueCard({ item, onOpenMemory }: {
  item: SnapshotView['queue'][number]
  onOpenMemory: (path: string) => void
}): ReactNode {
  return createElement('div', { className: 'dmo-card' },
    createElement('div', { className: 'dmo-card-title' }, truncate(item.title, 46)),
    createElement('div', { className: 'dmo-card-meta' },
      createElement(Badge, { tone: 'warn' }, item.reason),
      item.confidence === null ? null : createElement(Badge, { tone: 'idle' }, `置信 ${item.confidence.toFixed(1)}`),
      createElement('span', null, item.domainLabel)),
    createElement(Stepper, { status: item.status }),
    item.evidence.length === 0
      ? createElement('div', { className: 'dmo-note' }, '无证据摘录（G1 用户直述可豁免）')
      : createElement('div', { className: 'dmo-evidence' },
        createElement('div', null, truncate(item.evidence[0]?.excerpt ?? '', 70)),
        createElement('div', { className: 'dmo-evidence-src' }, `出处：${orEmpty(item.origin)} · ${orEmpty(item.evidence[0]?.session)}`)),
    createElement('div', { className: 'dmo-card-actions' },
      item.kind === 'retire'
        ? createElement(Button, {
          small: true,
          variant: 'danger',
          onClick: () => { void call('archive', { path: item.path, reason: '到期退役' }) },
        }, '归档')
        : createElement(Button, {
          small: true,
          variant: 'primary',
          onClick: () => { void call('confirm', { path: item.path }) },
        }, '确认'),
      createElement(Button, { small: true, onClick: () => { onOpenMemory(item.path) } }, '看详情'),
      createElement(Button, {
        small: true,
        onClick: () => { void call('keep', { path: item.path }) },
      }, '再留 90 天')))
}
