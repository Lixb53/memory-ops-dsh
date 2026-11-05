/**
 * 分区「记忆」—— 全量记忆列表 + 详情 + 源码编辑。
 *
 * 编辑走**源码单模式**：侧栏宽度放不下表单化，但能力必须对等，
 * 所以不做「只读」。详情里给出证据链、锚点状态与三出口。
 */

import { createElement, useState, type ReactNode } from 'react'

import { call, type DetailView, type SnapshotView } from '../api.ts'
import { useBridge } from '../data.ts'
import {
  Badge, Button, Empty, ErrorState, Skeleton, Stepper,
  bytes, count, orEmpty, statusLabel, statusTone, truncate,
} from '../ui.ts'

/** 记忆分区。 */
export function MemoryPane({ project, onOpenMemory, detailPath }: {
  project: string | undefined
  onOpenMemory: (path: string) => void
  detailPath: string | undefined
}): ReactNode {
  if (detailPath !== undefined) {
    return createElement(MemoryDetail, { path: detailPath, onBack: () => { onOpenMemory('') } })
  }
  return createElement(MemoryList, { project, onOpenMemory })
}

/** 列表。 */
function MemoryList({ project, onOpenMemory }: {
  project: string | undefined
  onOpenMemory: (path: string) => void
}): ReactNode {
  const [query, setQuery] = useState('')
  const { phase, data, error, reload } = useBridge<SnapshotView>(
    'snapshot',
    project === undefined ? {} : { project },
    [project],
  )

  if (phase === 'loading') return createElement(Skeleton, { rows: 5, height: 44 })
  if (phase === 'error') return createElement(ErrorState, { message: `读取记忆失败：${orEmpty(error)}`, onRetry: reload })
  if (data === undefined) return createElement(Skeleton, { rows: 2 })

  const filtered = query.trim() === ''
    ? data.entries
    : data.entries.filter(entry => `${entry.title} ${entry.path} ${entry.tags.join(' ')}`
      .toLowerCase().includes(query.trim().toLowerCase()))

  return createElement('div', null,
    createElement('input', {
      className: 'dmo-input',
      placeholder: '过滤标题 / 路径 / 标签…',
      value: query,
      'aria-label': '过滤记忆',
      style: { marginBottom: 8 },
      onChange: (event: { target: { value: string } }) => { setQuery(event.target.value) },
    }),
    createElement('div', { className: 'dmo-note' },
      `${count(filtered.length)} / ${count(data.entries.length)} 条 · 超 80 行 ${count(data.stats.overLimit)} 条`),
    filtered.length === 0
      ? createElement(Empty, { title: '没有匹配的记忆' },
        createElement('div', null, query === '' ? '这个域还没有条目。' : '换个关键词试试。'))
      : filtered.map(entry => createElement('div', {
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
        createElement(Badge, { tone: 'idle' }, entry.layer.toUpperCase()),
        entry.status === 'stale' ? createElement(Badge, { tone: 'warn' }, '待复核') : null,
        createElement('span', null, count(entry.tokens), ' tokens'),
        createElement('span', null, entry.domainLabel)),
      createElement('div', { className: 'dmo-row-sub' }, orEmpty(entry.path)))))
}

/** 详情：状态 stepper + 信任栏 + 锚点 + 证据链 + 源码编辑 + 三出口。 */
function MemoryDetail({ path, onBack }: { path: string; onBack: () => void }): ReactNode {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
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
        createElement('div', { className: 'dmo-row-sub' }, orEmpty(trust.anchor.path)))),

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

    // 三出口
    createElement('div', { className: 'dmo-card-actions', style: { marginTop: 10 } },
      createElement(Button, {
        small: true, disabled: busy,
        onClick: () => { setDraft(entry.body); setEditing(true) },
      }, '编辑源码'),
      entry.status === 'stale' || entry.status === 'observed'
        ? createElement(Button, {
          small: true, variant: 'primary', disabled: busy,
          onClick: () => { run(() => call('confirm', { path }), '已确认') },
        }, '确认')
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
