/**
 * 表面 3：右侧栏快速捕获 —— 「一句话赶紧存了」。
 *
 * v3 新增：**隐私闸门拦截演示**（疑似密钥被拒、留审计）+ 撤销。
 * 撤销窗口 30 秒，与 `/remember` 一致：捕获是低压动作，但写错了要能收回。
 */

import { createElement, useEffect, useState, type ReactNode } from 'react'

import { call, type CaptureResult } from './api.ts'
import { Badge, Button, Chip, count, orEmpty, truncate } from './ui.ts'

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
  /**
   * 「刚刚捕获」：最近 5 条。
   *
   * 设计稿有这个分组，理由是「存完立刻能看到它真的进去了」——
   * 捕获是低压动作，但如果不给回显，用户会反复重存同一条。
   */
  const [recent, setRecent] = useState<{ content: string; kind: string; at: string }[]>([])

  // 打开时拉一次，让面板一进来就有历史可看
  useEffect(() => {
    void call<{ entries: { content: string; kind: string; date: string }[] }>('inbox', { domain: 'personal' })
      .then((list) => {
        setRecent([...list.entries].reverse().slice(0, 5).map(entry => ({
          content: entry.content, kind: entry.kind, at: entry.date,
        })))
      })
      .catch(() => { /* 拉不到就不显示，不打断捕获 */ })
  }, [])
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

  /**
   * 提交：单行走 capture，多行走 captureBatch。
   *
   * 早先只有单条，`captureBatch` 路由零 UI 调用——而 product.md §5.1 写着
   * 「✅ 单行速记 + 批量捕获」。把多行输入直接交给批量路由，
   * 既兑现了那句承诺，也让「贴一段清单进来」这种真实用法不用一条条敲。
   */
  function submit(): void {
    const content = text.trim()
    if (content === '' || busy) return
    setBusy(true)
    setResult(null)

    const lines = content.split('\n').map(line => line.trim()).filter(Boolean)
    if (lines.length > 1) {
      void call<{ ok: boolean; accepted?: string[]; blocked?: { line: string; reason: string }[]; total?: number }>(
        'captureBatch', { text: content, kind },
      )
        .then((payload) => {
          const accepted = payload.accepted?.length ?? 0
          const blocked = payload.blocked ?? []
          if (blocked.length === 0) {
            setResult({
              ok: true,
              captured: { path: `已存入 ${accepted} 条` },
            })
          } else {
            // 部分被闸门拦下：说清几条进了、几条没进、为什么
            setResult({
              ok: false,
              reason: `${accepted} 条已存入，${blocked.length} 条被拦截：${blocked[0]?.reason ?? ''}`,
            })
          }
          if (accepted > 0) {
            setText('')
            const stamp = new Date().toISOString().slice(0, 10)
            setRecent(current => [
              ...lines.map(line => ({ content: line, kind, at: stamp })), ...current,
            ].slice(0, 5))
          }
        })
        .catch((failure: unknown) => {
          setResult({ ok: false, reason: failure instanceof Error ? failure.message : String(failure) })
        })
        .finally(() => { setBusy(false) })
      return
    }

    void call<CaptureResult>('capture', { content, kind })
      .then((payload) => {
        setResult(payload)
        if (payload.ok) {
          setText('')
          // 拿不到行号也要能撤销：删除最近一条同内容记录
          setUndo({ path: payload.captured?.path ?? '', content, lineIndex: -1 })
          const stamp = new Date().toISOString().slice(0, 10)
          setRecent(current => [{ content, kind, at: stamp }, ...current].slice(0, 5))
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
    // 类型药丸：比下拉少一次点击，且五个类型常驻可见
    createElement('div', { className: 'dmo-types', role: 'group', 'aria-label': '记录类型' },
      KINDS.map(item => createElement(Chip, {
        key: item,
        label: item,
        active: kind === item,
        onClick: () => { setKind(item) },
      }))),

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

    createElement('div', { className: 'dmo-capture-hint' },
      '⌘/Ctrl + Enter 存入 · 多行会逐条拆开 · 30 秒内可撤销'),
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

    recent.length === 0 ? null : createElement('div', { style: { marginTop: 10 } },
      createElement('div', { className: 'dmo-group-head' },
        createElement('h3', { className: 'dmo-group-title' }, '刚刚捕获'),
        createElement('span', { className: 'dmo-group-count' }, `${recent.length} 条`)),
      recent.map((item, index) => createElement('div', { key: `${item.at}-${index}`, className: 'dmo-recent-row' },
        createElement('span', { className: 'dmo-recent-main' }, truncate(item.content, 42)),
        createElement('span', { className: 'dmo-recent-time' }, `${item.kind} · ${item.at.slice(5)}`)))),

    createElement('div', { className: 'dmo-note' },
      '捕获前过隐私闸门：密钥 / 私钥 / 身份证 / 内网 IP 会被拒写并留审计。'),
    createElement('div', { className: 'dmo-card-meta' },
      createElement(Badge, { tone: 'idle' }, 'INBOX 五列'),
      createElement(Badge, { tone: 'idle' }, '原子写')))
}
