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
/**
 * 记录流分区。
 *
 * 注意：这里**不需要 onOpenMemory**——记录流的行是 INBOX 表格行，
 * 不是记忆条目，没有「详情页」可跳。早先签名里带了这个参数却从未使用，
 * 是照抄其它分区留下的。去掉它，也让调用方知道这里不用传。
 */
export function StreamPane(): ReactNode {
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

    // 筛选：两个下拉并列在同一个 row 里
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
      (data.states ?? []).map(state => createElement('option', { key: state, value: state }, state))),
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
          onEdit: (content: string) => {
            run(
              () => call('updateInbox', {
                domain: 'personal', lineIndex: entry.lineIndex, patch: { content },
              }),
              '内容已改',
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
        }))));
}

/** 单行记录：勾选 + 改状态 + 编辑内容 + 提升 + 删除。 */
function RowItem({ entry, checked, busy, onToggle, onState, onEdit, onPromote, onDelete }: {
  entry: InboxView['entries'][number]
  checked: boolean
  busy: boolean
  onToggle: () => void
  onState: (state: string) => void
  onEdit: (content: string) => void
  onPromote: () => void
  onDelete: () => void
}): ReactNode {
  const needsPromote = entry.state === 'done' && (entry.destination === '—' || entry.destination === '')
  /**
   * 行内编辑内容。
   *
   * 为什么必须有：捕获是「一句话赶紧存」，所以错字、半句话、写歪的类型都是常态。
   * 早先只能改状态，内容写错了唯一的出路是「删掉重记」——那会丢掉原始时间戳。
   * core 的 `updateInboxRow` 一直支持 `content`，只是界面没接。
   */
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(entry.content)

  return createElement('div', { className: 'dmo-row-item' },
    createElement('input', {
      type: 'checkbox',
      className: 'dmo-check',
      checked,
      'aria-label': `选择：${truncate(entry.content, 20)}`,
      onChange: onToggle,
    }),
    createElement('div', { className: 'dmo-row-main' },
      editing
        ? createElement('div', null,
          createElement('textarea', {
            className: 'dmo-textarea',
            value: draft,
            'aria-label': '编辑记录内容',
            onChange: (event: { target: { value: string } }) => { setDraft(event.target.value) },
          }),
          createElement('div', { className: 'dmo-card-actions' },
            createElement(Button, {
              small: true, variant: 'primary', disabled: busy || draft.trim() === '',
              onClick: () => { onEdit(draft.trim()); setEditing(false) },
            }, '保存'),
            createElement(Button, { small: true, onClick: () => { setDraft(entry.content); setEditing(false) } }, '取消')))
        : createElement('div', null,
          createElement('div', { className: 'dmo-row-text' }, truncate(entry.content, 46)),
          createElement('div', { className: 'dmo-row-sub' },
            `${orEmpty(entry.date)} · ${orEmpty(entry.kind)} · `,
            createElement(Badge, {
              tone: entry.state === 'done' ? 'ok' : entry.state === 'dropped' ? 'err' : 'warn',
            }, entry.state),
            entry.kindValid ? null : createElement(Badge, { tone: 'err' }, '类型非法'),
            entry.destination === '—' ? null : createElement('span', null, ` → ${truncate(entry.destination, 24)}`))),
      editing
        ? null
        : createElement('div', { className: 'dmo-card-actions' },
          entry.state === 'open'
            ? createElement(Button, { small: true, disabled: busy, onClick: () => { onState('todo') } }, '开始')
            : null,
          entry.state !== 'done'
            ? createElement(Button, { small: true, disabled: busy, onClick: () => { onState('done') } }, '完成')
            : null,
          createElement(Button, {
            small: true, disabled: busy,
            onClick: () => { setDraft(entry.content); setEditing(true) },
          }, '改内容'),
          needsPromote
            ? createElement(Button, {
              small: true, variant: 'primary', disabled: busy, onClick: onPromote,
            }, '提升到档案')
            : null,
          createElement(Button, {
            small: true, variant: 'danger', disabled: busy, onClick: onDelete,
          }, '删除'))))
}
