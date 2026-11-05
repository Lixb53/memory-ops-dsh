/**
 * 分区「记录流」—— INBOX 全量管理，与 Web 端能力对等。
 *
 * 为什么必须放进插件端：实测一个月暴露的因果链是「插件端只做捕获 →
 * 用户永远停在『记了 8 条、0 条拍板』→ INBOX 撞满 80 行上限」。
 * 根因不是用户懒，而是**拍板动作被放到了需要单独启动进程的地方**。
 */

import { createElement, useState, type ReactNode } from 'react'

import { call, type InboxView } from '../api.ts'
import { useBridge } from '../data.ts'
import {
  Badge, Button, Empty, ErrorState, Kpi, Skeleton, count, orEmpty, truncate,
} from '../ui.ts'

/** 记录流分区。 */
export function StreamPane({ onOpenMemory }: { onOpenMemory: (path: string) => void }): ReactNode {
  const [stateFilter, setStateFilter] = useState('')
  const [kindFilter, setKindFilter] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)

  const { phase, data, error, reload } = useBridge<InboxView>(
    'inbox',
    { domain: 'personal', state: stateFilter, kind: kindFilter },
    [stateFilter, kindFilter],
  )

  function run(action: () => Promise<unknown>, success: string): void {
    setBusy(true)
    setToast(null)
    void action()
      .then(() => {
        setToast({ ok: true, text: success })
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

  if (phase === 'loading') return createElement(Skeleton, { rows: 4, height: 38 })
  if (phase === 'error') {
    return createElement(ErrorState, {
      message: `读取记录流失败：${orEmpty(error)}`,
      onRetry: reload,
    })
  }
  if (data === undefined) return createElement(Skeleton, { rows: 2 })

  const throughput = data.throughput
  const allSelected = data.entries.length > 0 && selected.length === data.entries.length

  return createElement('div', null,
    // 吞吐 3 格
    createElement('div', { className: 'dmo-kpis' },
      createElement(Kpi, { label: '待处理', value: count(throughput.open), note: 'open' }),
      createElement(Kpi, { label: '待提升', value: count(throughput.toPromote), note: 'done 无去向' }),
      createElement(Kpi, { label: '已处理', value: count(throughput.done), note: 'done' })),

    // 筛选
    createElement('div', { className: 'dmo-row', style: { marginBottom: 8 } },
      createElement('select', {
        className: 'dmo-select',
        value: stateFilter,
        'aria-label': '按状态筛选',
        onChange: (event: { target: { value: string } }) => {
          setStateFilter(event.target.value)
          setSelected([])
        },
      },
      createElement('option', { value: '' }, '全部状态'),
      (data.states ?? []).map(state => createElement('option', { key: state, value: state }, state)))),
      createElement('select', {
        className: 'dmo-select',
        value: kindFilter,
        'aria-label': '按类型筛选',
        onChange: (event: { target: { value: string } }) => {
          setKindFilter(event.target.value)
          setSelected([])
        },
      },
      createElement('option', { value: '' }, '全部类型'),
      (data.kinds ?? []).map(kind => createElement('option', { key: kind, value: kind }, kind)))),

    toast === null ? null : createElement('div', {
      className: `dmo-toast ${toast.ok ? 'dmo-toast-ok' : 'dmo-toast-err'}`,
      role: 'status',
      style: { marginBottom: 8 },
    }, toast.text),

    // 批量操作条
    selected.length === 0 ? null : createElement('div', {
      className: 'dmo-row',
      style: { marginBottom: 8, flexWrap: 'wrap' },
    },
    createElement('span', { className: 'dmo-note', style: { margin: 0 } }, `已选 ${selected.length} 条`),
    createElement(Button, {
      small: true, disabled: busy,
      onClick: () => {
        run(() => call('batchInboxState', { domain: 'personal', lineIndexes: selected, state: 'done' }), '已标为 done')
      },
    }, '标 done'),
    createElement(Button, {
      small: true, disabled: busy,
      onClick: () => {
        run(() => call('batchInboxState', { domain: 'personal', lineIndexes: selected, state: 'dropped' }), '已丢弃')
      },
    }, '丢弃'),
    createElement(Button, {
      small: true, variant: 'danger', disabled: busy,
      onClick: () => {
        run(() => call('deleteInbox', { domain: 'personal', lineIndexes: selected }), '已删除')
      },
    }, '删除')),

    data.entries.length === 0
      ? createElement(Empty, { title: '记录流是空的' },
        createElement('div', null, '捕获入口在右侧栏与 /remember，一句话就能存。'),
        createElement('div', { className: 'dmo-row', style: { justifyContent: 'center', marginTop: 9 } },
          createElement(Button, { onClick: reload }, '重新读取')))
      : createElement('div', null,
        createElement('div', { className: 'dmo-row-item' },
          createElement('input', {
            type: 'checkbox',
            className: 'dmo-check',
            checked: allSelected,
            'aria-label': '全选',
            onChange: () => {
              setSelected(allSelected ? [] : data.entries.map(entry => entry.lineIndex))
            },
          }),
          createElement('div', { className: 'dmo-row-main dmo-row-sub' },
            `${count(throughput.total)} 条 · ${orEmpty(data.path)}`)),
        data.entries.map(entry => createElement(RowItem, {
          key: entry.lineIndex,
          entry,
          checked: selected.includes(entry.lineIndex),
          busy,
          onToggle: () => {
            setSelected(current => current.includes(entry.lineIndex)
              ? current.filter(index => index !== entry.lineIndex)
              : [...current, entry.lineIndex])
          },
          onState: (state: string) => {
            run(
              () => call('updateInbox', {
                domain: 'personal', lineIndex: entry.lineIndex, patch: { state },
              }),
              state === 'done' ? '已完成' : '已标 todo',
            )
          },
          onPromote: () => {
            run(
              () => call('promoteInbox', { domain: 'personal', lineIndex: entry.lineIndex }),
              '已提升到档案',
            )
          },
          onDelete: () => {
            run(
              () => call('deleteInbox', { domain: 'personal', lineIndexes: [entry.lineIndex] }),
              '已删除',
            )
          },
        })))
}

/** 单行记录：勾选 + 改状态 + 提升 + 删除。 */
function RowItem({ entry, checked, busy, onToggle, onState, onPromote, onDelete }: {
  entry: InboxView['entries'][number]
  checked: boolean
  busy: boolean
  onToggle: () => void
  onState: (state: string) => void
  onPromote: () => void
  onDelete: () => void
}): ReactNode {
  const needsPromote = entry.state === 'done' && (entry.destination === '—' || entry.destination === '')
  return createElement('div', { className: 'dmo-row-item' },
    createElement('input', {
      type: 'checkbox',
      className: 'dmo-check',
      checked,
      'aria-label': `选择：${truncate(entry.content, 20)}`,
      onChange: onToggle,
    }),
    createElement('div', { className: 'dmo-row-main' },
      createElement('div', { className: 'dmo-row-text' }, truncate(entry.content, 46)),
      createElement('div', { className: 'dmo-row-sub' },
        `${orEmpty(entry.date)} · ${orEmpty(entry.kind)} · `,
        createElement(Badge, {
          tone: entry.state === 'done' ? 'ok' : entry.state === 'dropped' ? 'err' : 'warn',
        }, entry.state),
        entry.kindValid ? null : createElement(Badge, { tone: 'err' }, '类型非法'),
        entry.destination === '—' ? null : createElement('span', null, ` → ${truncate(entry.destination, 24)}`)),
      createElement('div', { className: 'dmo-card-actions' },
        entry.state === 'open'
          ? createElement(Button, { small: true, disabled: busy, onClick: () => { onState('todo') } }, '开始')
          : null,
        entry.state !== 'done'
          ? createElement(Button, { small: true, disabled: busy, onClick: () => { onState('done') } }, '完成')
          : null,
        needsPromote
          ? createElement(Button, {
            small: true, variant: 'primary', disabled: busy, onClick: onPromote,
          }, '提升到档案')
          : null,
        createElement(Button, {
          small: true, variant: 'danger', disabled: busy, onClick: onDelete,
        }, '删除'))))
}
