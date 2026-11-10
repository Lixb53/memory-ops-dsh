/**
 * 分区「本项目」—— 当前项目相关记忆。
 *
 * 这是最容易出现**假空态**的地方，所以三种情况必须区分清楚：
 *   1. 加载中      → 骨架
 *   2. 读取失败    → 错误态 + 重试
 *   3. 拿不到项目   → 降级条 + 退回全部工作域（**不是**空列表）
 *   4. 真的没有     → 空态 + 三个出口
 */

import { createElement, useState, type ReactNode } from 'react'

import { call, type MissesView, type SnapshotView } from '../api.ts'
import { useBridge } from '../data.ts'
import { scopeBody } from '../session-context.ts'
import {
  Badge, Button, Empty, ErrorState, Group, Kpi, RejectBox, Skeleton, Stepper,
  count, orEmpty, percent, statusLabel, statusTone, truncate,
} from '../ui.ts'

/** 本项目分区。 */
export function ProjectPane({ project, cwd, onOpenMemory, onGoto }: {
  project: string | undefined
  /** 原始 cwd：交给 core 按别名表解析，客户端不自己猜项目名。 */
  cwd: string | undefined
  onOpenMemory: (path: string) => void
  onGoto: (pane: string) => void
}): ReactNode {
  const { phase, data, error, reload } = useBridge<SnapshotView>(
    'snapshot',
    scopeBody(cwd, project),
    [cwd, project],
  )
  /**
   * 本项目页也要能看未命中补齐。
   *
   * 设计稿在这里有一个「未命中补齐」分组——因为「这个问题我搜过但库里没有」
   * 恰恰是最该在本项目语境下补的：你知道它属于这个项目，才写得出结论。
   */
  const misses = useBridge<MissesView>('misses', {})

  if (phase === 'loading') return createElement(Skeleton, { rows: 3 })
  if (phase === 'error') {
    return createElement(ErrorState, {
      message: `读取记忆失败：${orEmpty(error)}。记忆库本身没有被清空，这是读取问题。`,
      onRetry: reload,
    })
  }
  if (data === undefined) return createElement(Skeleton, { rows: 2 })

  const entries = data.entries
  const queue = data.queue
  /**
   * 三态必须分开，否则「没认出来」会伪装成「这个项目没有记忆」——
   * 那正是 v3 修过一次、这次又以另一种形式复发的假空态。
   *
   *   resolved：cwd 解析出了项目 → 列表就是这个项目的
   *   unknown ：给了 cwd 但没匹配上任何项目 → 退回全库并说明为什么
   *   noCwd   ：根本没拿到 cwd → 退回全库并说明拿不到
   */
  const resolution = data.resolution
  const resolved = data.projectScoped && data.project !== null
  const unknown = data.projectScoped === false && resolution !== null && resolution.project === null
  const noCwd = data.projectScoped === false && resolution === null
  const fallbackNote = unknown
    ? `没能从当前目录认出项目：${orEmpty(resolution?.reason)}。下面先展示全部记忆。`
    : noCwd
      ? '没拿到当前目录，无法判定项目。下面先展示全部记忆（任务不受影响）。'
      : ''

  return createElement('div', null,
    // 降级条：明确说任务不受影响，而不是假装没有数据
    fallbackNote === ''
      ? null
      : createElement('div', { className: 'dmo-degrade' },
        fallbackNote,
        resolution === null ? null : createElement('div', { className: 'dmo-row-sub' },
          `当前目录：${orEmpty(resolution.cwd)}`,
          resolution.knownProjects.length === 0
            ? ''
            : ` · 已知项目：${resolution.knownProjects.join(' / ')}`),
        /**
         * 解析失败的**修法**必须写出来。
         *
         * 只说「没认出来」而不说怎么修，用户只能去翻源码——而这套判定
         * 的入口就是一句 frontmatter，本来就该是可自助的。
         */
        createElement('div', { className: 'dmo-row-sub', style: { marginTop: 2 } },
          '要让下次能认出来：在 ', createElement('span', { className: 'dmo-mono' }, 'work/<项目>/index.md'),
          ' 的 frontmatter 里加一行 ',
          createElement('span', { className: 'dmo-mono' }, 'aliases: [<目录名或分支名>, …]'),
          '，把当前目录名登记进去。'),
        createElement('div', { style: { marginTop: 4 } },
          createElement(Button, { small: true, onClick: reload }, '重新判定'),
          // 解析不出来的人为出口：告诉他怎么让下次能认出来
          createElement(Button, { small: true, onClick: () => { onGoto('memory') } }, '按项目浏览'))),

    createElement('div', { className: 'dmo-kpis' },
      createElement(Kpi, {
        label: '相关记忆',
        value: count(entries.length),
        note: resolved ? orEmpty(data.project) : '全部域',
      }),
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

    /**
     * 未命中补齐：本项目语境下最该补的那几条。
     *
     * 只取「该补了」状态（问过 ≥3 次），并给一个去工作台的出口——
     * 这里不重复完整流水线，那是「未命中」分区的职责。
     */
    (misses.data?.['pipeline']?.['should-fill']?.length ?? 0) === 0
      ? null
      : createElement(Group, {
        title: '未命中补齐',
        count: `${misses.data?.['pipeline']?.['should-fill']?.length} 条可补`,
        action: createElement(Button, { small: true, onClick: () => { onGoto('misses') } }, '去工作台 →'),
      },
      (misses.data?.['pipeline']?.['should-fill'] ?? []).slice(0, 3).map(item => createElement('div', {
        key: item.query,
        className: 'dmo-card',
      },
      createElement('div', { className: 'dmo-card-title dmo-mono' }, `"${truncate(item.query, 38)}"`),
      createElement('div', { className: 'dmo-card-meta' },
        createElement(Badge, { tone: 'warn' }, '可补'),
        createElement('span', null, `${count(item.count)} 次未命中`),
        createElement('span', null, `${count(item.sessions ?? 1)} 个会话`)),
      createElement('div', { className: 'dmo-card-actions' },
        createElement(Button, {
          small: true,
          onClick: () => {
            void call('missDraft', { query: item.query, type: '问题' }).then(() => { misses.reload() })
          },
        }, '生成草稿'))))),

    // 待确认优先置顶：一条一次点击
    queue.length === 0 ? null : createElement('div', { style: { marginBottom: 10 } },
      createElement('div', { className: 'dmo-lane-head' }, '待你处理', createElement('span', { className: 'dmo-lane-count' }, `${queue.length} 条`)),
      queue.slice(0, 5).map(item => createElement(QueueCard, {
        key: item.id, item, onOpenMemory, onChanged: reload,
      }))),

    // 项目名分组标题：设计稿有「sz-web-dzh-gslz · 3 条 · 全部 →」
    entries.length === 0
      ? null
      : createElement(Group, {
        title: resolved ? orEmpty(data.project) : '相关记忆',
        count: `${count(entries.length)} 条`,
        action: entries.length > 12
          ? createElement(Button, { small: true, onClick: () => { onGoto('memory') } }, '全部 →')
          : null,
      }),

    entries.length === 0
      ? createElement(Empty, {
        /**
         * 标题必须跟着「为什么空」走。
         *
         * 早先恒为「当前项目还没有相关记忆」——即使真实原因是
         * 「压根没认出是哪个项目」。用户于是去翻数据找不存在的记忆。
         */
        title: resolved
          ? `${orEmpty(data.project)} 还没有相关记忆`
          : unknown ? '没认出当前项目' : '没拿到当前目录',
      },
        createElement('div', null,
          resolved
            ? '这不是故障——只是这个项目还没沉淀。'
            : '判定不了项目，所以不敢说「这个项目没有」——下面先去全库看。'),
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
function QueueCard({ item, onOpenMemory, onChanged }: {
  item: SnapshotView['queue'][number]
  onOpenMemory: (path: string) => void
  /** 动作成功后刷新队列——否则点了按钮界面毫无变化（§13.1 批评过的同一类缺陷）。 */
  onChanged: () => void
}): ReactNode {
  /** 驳回内联展开：待处理列表是「一眼一批」的场景，弹窗会打断节奏。 */
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null)

  function run(action: () => Promise<unknown>, success: string, after?: () => void): void {
    setBusy(true)
    setToast(null)
    void action()
      .then(() => {
        setToast({ ok: true, text: success })
        setRejecting(false)
        setReason('')
        after?.()
      })
      .catch((failure: unknown) => {
        setToast({ ok: false, text: failure instanceof Error ? failure.message : String(failure) })
      })
      .finally(() => {
        setBusy(false)
      })
  }

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

    toast === null ? null : createElement('div', {
      className: `dmo-toast ${toast.ok ? 'dmo-toast-ok' : 'dmo-toast-err'}`,
      role: 'status',
      style: { marginTop: 6 },
    }, toast.text),

    rejecting
      ? createElement(RejectBox, {
        reason,
        onReason: setReason,
        busy,
        onCancel: () => { setRejecting(false); setReason('') },
        onSubmit: () => {
          run(() => call('reject', { path: item.path, reason }), '已驳回，30 天内不再推荐', onChanged)
        },
      })
      : null,

    createElement('div', { className: 'dmo-card-actions' },
      item.kind === 'retire'
        ? createElement(Button, {
          small: true,
          variant: 'danger',
          onClick: () => { run(() => call('archive', { path: item.path, reason: '到期退役' }), '已归档', onChanged) },
        }, '归档')
        : createElement(Button, {
          small: true,
          variant: 'primary',
          onClick: () => { run(() => call('confirm', { path: item.path }), '已确认', onChanged) },
        }, '确认'),
      // 确认与驳回必须并列出现：只给确认，等于替用户做决定。
      item.kind === 'retire'
        ? null
        : createElement(Button, {
          small: true, variant: 'danger', disabled: busy,
          onClick: () => { setRejecting(value => !value) },
        }, rejecting ? '取消驳回' : '驳回'),
      createElement(Button, { small: true, onClick: () => { onOpenMemory(item.path) } }, '看详情'),
      createElement(Button, {
        small: true,
        onClick: () => { run(() => call('keep', { path: item.path }), '已再留 90 天', onChanged) },
      }, '再留 90 天')))
}
