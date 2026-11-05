/**
 * 表面 3：右侧栏快速捕获 —— 「一句话赶紧存了」。
 *
 * v3 新增：**隐私闸门拦截演示**（疑似密钥被拒、留审计）+ 撤销。
 * 撤销窗口 30 秒，与 `/remember` 一致：捕获是低压动作，但写错了要能收回。
 */

import { createElement, useEffect, useState, type ReactNode } from 'react'

import { call, type CaptureResult } from './api.ts'
import { Badge, Button, count, orEmpty, truncate } from './ui.ts'

/** tab kind（与 sidebarRightTabs 注册时的 kind 一致）。 */
export const CAPTURE_KIND = 'memory-ops'

const KINDS = ['想法', '计划', '问题', '待办', '决策']

/** 捕获面板。 */
export function CapturePane(): ReactNode {
  const [text, setText] = useState('')
  const [kind, setKind] = useState('想法')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<CaptureResult | null>(null)
  const [undo, setUndo] = useState<{ path: string; content: string; lineIndex: number } | null>(null)
  const [seconds, setSeconds] = useState(0)

  // 撤销倒计时：30 秒
  useEffect(() => {
    if (undo === null) {
      setSeconds(0)
      return undefined
    }
    setSeconds(30)
    const timer = setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          clearInterval(timer)
          setUndo(null)
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => {
      clearInterval(timer)
    }
  }, [undo])

  function submit(): void {
    const content = text.trim()
    if (content === '' || busy) return
    setBusy(true)
    setResult(null)
    void call<CaptureResult>('capture', { content, kind })
      .then((payload) => {
        setResult(payload)
        if (payload.ok) {
          setText('')
          // 拿不到行号也要能撤销：删除最近一条同内容记录
          setUndo({ path: payload.captured?.path ?? '', content, lineIndex: -1 })
        }
      })
      .catch((failure: unknown) => {
        setResult({
          ok: false,
          reason: failure instanceof Error ? failure.message : String(failure),
        })
      })
      .finally(() => {
        setBusy(false)
      })
  }

  function undoLast(): void {
    if (undo === null) return
    setBusy(true)
    void call<{ entries: { lineIndex: number; content: string }[] }>('inbox', { domain: 'personal' })
      .then((list) => {
        const match = [...list.entries].reverse().find(entry => entry.content === undo.content)
        if (match === undefined) throw new Error('找不到刚存入的那一条（可能已被处理）')
        return call('deleteInbox', { domain: 'personal', lineIndexes: [match.lineIndex] })
      })
      .then(() => {
        setResult({ ok: true, captured: { path: '已撤销' } })
        setUndo(null)
      })
      .catch((failure: unknown) => {
        setResult({ ok: false, reason: failure instanceof Error ? failure.message : String(failure) })
      })
      .finally(() => {
        setBusy(false)
      })
  }

  return createElement('div', { className: 'dmo-capture' },
    createElement('div', { className: 'dmo-row' },
      createElement('select', {
        className: 'dmo-select',
        value: kind,
        'aria-label': '记录类型',
        onChange: (event: { target: { value: string } }) => { setKind(event.target.value) },
      }, KINDS.map(item => createElement('option', { key: item, value: item }, item)))),

    createElement('textarea', {
      className: 'dmo-textarea dmo-capture-input',
      placeholder: '一句话赶紧存了（⌘/Ctrl + Enter 提交）',
      value: text,
      'aria-label': '捕获内容',
      onChange: (event: { target: { value: string } }) => { setText(event.target.value) },
      onKeyDown: (event: { key: string; metaKey?: boolean; ctrlKey?: boolean; preventDefault(): void }) => {
        if (event.key === 'Enter' && (event.metaKey === true || event.ctrlKey === true)) {
          event.preventDefault()
          submit()
        }
      },
    }),

    createElement('div', { className: 'dmo-capture-foot' },
      createElement(Button, {
        variant: 'primary',
        disabled: busy || text.trim() === '',
        onClick: submit,
      }, busy ? '存入中…' : '记一条'),
      undo === null
        ? createElement('span', { className: 'dmo-row-sub', style: { marginTop: 0 } },
          `${count(text.length)} 字`)
        : createElement(Button, { small: true, disabled: busy, onClick: undoLast }, `撤销 ${seconds}s`)),

    // 结果反馈：隐私拦截必须解释清楚「为什么拒」，并给脱敏后的可用文本
    result === null ? null : result.ok
      ? createElement('div', { className: 'dmo-toast dmo-toast-ok', role: 'status' },
        `已存入 ${orEmpty(result.captured?.path)}`)
      : createElement('div', { className: 'dmo-toast dmo-toast-err', role: 'alert' },
        createElement('div', null, orEmpty(result.reason)),
        result.blocked === true && result.masked !== undefined
          ? createElement('div', { style: { marginTop: 6 } },
            createElement('div', { className: 'dmo-label' }, '脱敏后可用：'),
            createElement('div', { style: { wordBreak: 'break-all' } }, truncate(result.masked, 120)),
            createElement('div', { style: { marginTop: 6 } },
              createElement(Button, {
                small: true,
                onClick: () => { setText(result.masked ?? '') },
              }, '填入脱敏文本')))
          : null),

    createElement('div', { className: 'dmo-note' },
      '捕获前过隐私闸门：密钥 / 私钥 / 身份证 / 内网 IP 会被拒写并留审计。'),
    createElement('div', { className: 'dmo-card-meta' },
      createElement(Badge, { tone: 'idle' }, 'INBOX 五列'),
      createElement(Badge, { tone: 'idle' }, '原子写')))
}
