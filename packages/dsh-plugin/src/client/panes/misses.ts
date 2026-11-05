/**
 * 分区「未命中」—— 五态流水线。
 *
 * 这是这套系统唯一会自我进化的地方：**命中率是结果，未命中才是输入**。
 * 五态：观察中 → 该补了 → 草稿待确认 → 验证期内 → 已验证生效。
 * 草稿必须人点确认才落库（自动写库会产生无法审计的臆想）。
 */

import { createElement, useState, type ReactNode } from 'react'

import { call, type MissesView } from '../api.ts'
import { useBridge } from '../data.ts'
import {
  Badge, Button, Empty, ErrorState, Kpi, Skeleton, count, orEmpty, percent, truncate,
} from '../ui.ts'

/** 五态的展示名与语气。 */
const LANES: { id: string; label: string; tone: 'idle' | 'warn' | 'brand' | 'ok' }[] = [
  { id: 'observing', label: '观察中', tone: 'idle' },
  { id: 'should-fill', label: '该补了', tone: 'warn' },
  { id: 'drafting', label: '草稿待确认', tone: 'warn' },
  { id: 'verifying', label: '验证期内', tone: 'brand' },
  { id: 'verified', label: '已验证生效', tone: 'ok' },
]

/** 未命中分区。 */
export function MissesPane(): ReactNode {
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)
  const [drafting, setDrafting] = useState<string | null>(null)
  const [draftText, setDraftText] = useState('')
  const [draftType, setDraftType] = useState('问题')
  const { phase, data, error, reload } = useBridge<MissesView>('misses', {})

  function run(action: () => Promise<unknown>, success: string): void {
    setBusy(true)
    setToast(null)
    void action()
      .then(() => {
        setToast({ ok: true, text: success })
        setSelected([])
        setDrafting(null)
        reload()
      })
      .catch((failure: unknown) => {
        setToast({ ok: false, text: failure instanceof Error ? failure.message : String(failure) })
      })
      .finally(() => {
        setBusy(false)
      })
  }

  if (phase === 'loading') return createElement(Skeleton, { rows: 3, height: 40 })
  if (phase === 'error') return createElement(ErrorState, { message: `读取未命中失败：${orEmpty(error)}`, onRetry: reload })
  if (data === undefined) return createElement(Skeleton, { rows: 2 })

  const total = data.total
  const verified = data.pipeline.verified?.length ?? 0

  return createElement('div', null,
    createElement('div', { className: 'dmo-kpis' },
      createElement(Kpi, { label: '未命中总数', value: count(total), note: '累计' }),
      createElement(Kpi, { label: '该补了', value: count(data.pipeline['should-fill']?.length ?? 0), note: '问过 ≥3 次' }),
      createElement(Kpi, { label: '补库转化率', value: percent(data.conversion), note: '已验证 / 总' })),

    createElement('div', { className: 'dmo-note' },
      `验证窗口 ${data.verifyDays} 天。草稿必须你确认才落库——自动写库会产生无法审计的臆想。`),

    toast === null ? null : createElement('div', {
      className: `dmo-toast ${toast.ok ? 'dmo-toast-ok' : 'dmo-toast-err'}`,
      role: 'status',
      style: { marginBottom: 8 },
    }, toast.text),

    total === 0
      ? createElement(Empty, { title: '没有未命中记录' },
        createElement('div', null, '这是好事：说明检索都在库里命中了。'),
        createElement('div', { className: 'dmo-note' }, '每次 memory_recall 未命中都会记在这里。'))
      : null,

    // 批量生成草稿
    selected.length === 0 ? null : createElement('div', {
      className: 'dmo-row', style: { marginBottom: 8, flexWrap: 'wrap' },
    },
    createElement('span', { className: 'dmo-note', style: { margin: 0 } }, `已选 ${selected.length} 条`),
    createElement(Button, {
      small: true, disabled: busy,
      onClick: () => {
        run(() => call('missBatchDraft', { queries: selected }), '已生成草稿，去「草稿待确认」逐条确认')
      },
    }, '批量生成草稿')),

    LANES.map((lane) => {
      const items = data.pipeline[lane.id] ?? []
      if (items.length === 0) return null
      return createElement('div', { key: lane.id, className: 'dmo-lane' },
        createElement('div', { className: 'dmo-lane-head' },
          createElement(Badge, { tone: lane.tone }, lane.label),
          createElement('span', { className: 'dmo-lane-count' }, `${items.length} 条`)),
        items.map(item => createElement('div', { key: item.query, className: 'dmo-card' },
          createElement('div', { className: 'dmo-card-title' }, truncate(item.query, 46)),
          createElement('div', { className: 'dmo-card-meta' },
            createElement('span', null, `问过 ${count(item.count)} 次`),
            createElement('span', null, `多花 ~${count(item.wastedTokens)} tokens`),
            createElement('span', null, orEmpty(item.lastAt.slice(0, 10)))),
          lane.id === 'drafting'
            ? createElement('div', { style: { marginTop: 6 } },
              drafting === item.query
                ? createElement('div', null,
                  createElement('select', {
                    className: 'dmo-select',
                    value: draftType,
                    'aria-label': '草稿类型',
                    style: { marginBottom: 5 },
                    onChange: (event: { target: { value: string } }) => { setDraftType(event.target.value) },
                  }, ['想法', '计划', '问题', '待办', '决策'].map(kind => createElement('option', { key: kind, value: kind }, kind))),
                  createElement('textarea', {
                    className: 'dmo-textarea',
                    value: draftText,
                    placeholder: '写下这条问题的结论，确认后落库并进入 7 天验证期…',
                    onChange: (event: { target: { value: string } }) => { setDraftText(event.target.value) },
                  }),
                  createElement('div', { className: 'dmo-card-actions' },
                    createElement(Button, {
                      small: true, variant: 'primary', disabled: busy || draftText.trim() === '',
                      onClick: () => {
                        run(() => call('missConfirm', {
                          query: item.query, content: draftText, type: draftType,
                        }), '已落库，进入 7 天验证期')
                      },
                    }, '确认落库'),
                    createElement(Button, { small: true, onClick: () => { setDrafting(null) } }, '取消')))
                : createElement(Button, {
                  small: true, variant: 'primary',
                  onClick: () => {
                    setDrafting(item.query)
                    setDraftText('')
                  },
                }, '写结论'))
            : createElement('div', { className: 'dmo-card-actions' },
              lane.id === 'observing' || lane.id === 'should-fill'
                ? createElement('input', {
                  type: 'checkbox',
                  className: 'dmo-check',
                  checked: selected.includes(item.query),
                  'aria-label': `选择：${truncate(item.query, 20)}`,
                  onChange: () => {
                    setSelected(current => current.includes(item.query)
                      ? current.filter(query => query !== item.query)
                      : [...current, item.query])
                  },
                })
                : null,
              lane.id === 'observing'
                ? createElement(Button, {
                  small: true, disabled: busy,
                  onClick: () => { run(() => call('missDraft', { query: item.query, type: '问题' }), '已生成草稿') },
                }, '转草稿')
                : null,
              createElement(Button, {
                small: true, variant: 'danger', disabled: busy,
                onClick: () => { run(() => call('missDelete', { query: item.query }), '已删除') },
              }, '删除')))))
    }))
}
