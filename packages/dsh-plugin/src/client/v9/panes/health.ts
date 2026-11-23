/**
 * 分区「库健康」—— 判断贵不贵、该不该维护。
 *
 * ## 一条窄带 + 四桶堆叠 meter，不做 4 个 KPI 卡
 *
 * 卡片会把「合计 = 四桶之和」这条硬规则打散成四个孤立数字，用户要自己心算。
 * 连续 meter 让「哪条占了 71 / 关掉能省多少」变成同一眼的两个读数。
 *
 * ## 不可读 ≠ 0
 *
 * 工具 schema 本插件读不到：它**不进百分比**，也不渲染成 0。
 * 合计行明写「不含这一段」，否则用户会以为已经算全了。
 *
 * ## V1 / V2 / V3 的落点
 *
 * V1 桶行在中栏、条目级明细在检视栏；V2 编辑（diff 上下叠 + tokens Δ + 生效时机）
 * 在检视栏完成，写回走 `writeBody`；V3 版本五项与差异清单也在检视栏。
 * 版本服务宿主没暴露——那就写「不可比较」并给出口，不编一个「可更新到 X」。
 */

import { createElement, useEffect, useState, type ReactNode } from 'react'

import { exportData, writeBody } from '../actions.ts'
import type { DetailView } from '../../api.ts'
import { useBridge } from '../../data.ts'
import {
  ErrorBlock, Props, SectionHead, Skeleton, BtnGhost, BtnInk, EMPTY, num,
} from '../primitives.ts'
import { MaintenancePanel } from '../../panes/maintenance.ts'
import type { PaneProps } from '../types.ts'
import { InspectorFrame } from '../stage.ts'
import {
  bucketsOf, clip, estimateTokens, versionInfoOf, PLUGIN_VERSION,
  type Bucket, type BucketItem,
} from '../view-model.ts'

/** 版本常量从 view-model 透出：health 页与测试读同一处。 */
export { PLUGIN_VERSION }

/** 维护作业（与 core 的五个作业一一对应）。 */
export const OPS = [
  { id: 'anchor', name: '核对引用', note: '锚点里的代码还在不在', route: 'verifyAnchor' },
  { id: 'compact', name: '变短', note: '空行与重复标题，无损压缩', route: 'compact' },
  { id: 'review', name: '每周复盘', note: '只读：这一周发生了什么', route: 'review' },
  { id: 'repair', name: '修补元数据', note: '缺失或脏的 frontmatter', route: 'repairMeta' },
  { id: 'promote', name: '可信度爬升', note: '多个会话重复的推断', route: 'promote' },
] as const

/** `health` 路由的返回形状（只取本页用到的字段）。 */
interface HealthRouteView {
  silenced: { title: string }[]
  stale: { title: string }[]
  overLimit: number
  lineLimit: number
}

/** meter 分段：固定成本灰、你能动的置顶蓝。 */
function meterSegments(buckets: Bucket[], total: number): ReactNode {
  return buckets
    .filter(bucket => bucket.tokens !== null && bucket.tokens > 0)
    .map((bucket) => {
      const pct = total <= 0 ? 0 : Math.round(((bucket.tokens ?? 0) / total) * 100)
      const kind = bucket.id === 'injected' ? 'own' : 'fixed'
      return createElement('span', {
        key: bucket.id,
        className: `mo-meter-seg mo-meter-${kind}`,
        style: { width: `${pct}%` },
        title: `${bucket.name} ${num(bucket.tokens)} tokens`,
      })
    })
}

/** 中栏。 */
export function HealthCenter(props: PaneProps): ReactNode {
  const { phase, data, counts, sel, onSelect, goto } = props
  /* 驳回静默 / 待复核 / 超行数：三件「该维护」的前置读数，来自 health 路由。 */
  const health = useBridge<HealthRouteView>('health', {})

  if (phase === 'loading') return Skeleton({ rows: 5, label: '读取中：正在取常驻构成与版本' })
  if (phase === 'error') {
    return ErrorBlock({
      title: '读不到常驻构成',
      text: 'skills 服务读取失败。「读不到」不等于「没有」：数字显示「—」，不显示 0。',
      example: '点下面的「重试」，或检查宿主是否提供 skills 服务',
      onRetry: () => { void health.reload(); data.reloadAll() },
    })
  }

  const buckets = bucketsOf({ snapshot: data.snapshot.data, overview: data.overview.data })
  const total = counts.resident
  const readable = buckets.filter(bucket => bucket.tokens !== null)
  const sum = readable.reduce((acc, bucket) => acc + (bucket.tokens ?? 0), 0)
  const unknown = buckets.filter(bucket => bucket.tokens === null).map(bucket => bucket.name)
  /*
   * 对账必须真的比一次，不能写死「对得上」。
   *
   * sum 只由桶自身求和，必然自洽；顶栏那个数来自 kpi.residentTokens。
   * 两者不等时（kpi 用了 scoped 口径、或 billedTokens 含未分桶项），
   * 界面必须写出差额，否则「四桶之和 = 合计」就是一句不可被证伪的口号。
   */
  const diff = total - sum
  const verdict = diff === 0 ? '对得上' : `差 ${num(diff)}（有常驻项没被分进这四桶）`

  if (phase === 'empty') {
    return createElement('div', { className: 'mo-state-block' },
      createElement('h2', { className: 'mo-state-title' }, '没有任何常驻内容'),
      createElement('p', { className: 'mo-state-text' },
        '没有 skill description，也没有置顶条目。此时每请求只剩目录框架。'),
      createElement('p', { className: 'mo-state-hint mo-num' },
        `catalog 0 · injected 0 · frame ${num(counts.frame)}`),
      createElement('div', { className: 'mo-state-actions' },
        BtnGhost({ children: '去写第一条', actName: 'go-capture', onClick: () => { goto('capture') } })))
  }

  const legend = buckets.map((bucket) => {
    const share = bucket.tokens === null || total <= 0
      ? '不可读'
      : `${Math.round((bucket.tokens / total) * 100)}%`
    const tone = bucket.tokens === null ? 'err' : (bucket.tokens > 0 ? 'ok' : 'idle')
    return createElement('span', { key: bucket.id, className: 'mo-legend-item' },
      createElement('span', { className: `mo-tonebar-inline mo-tone-${tone}` }),
      `${bucket.name} ${bucket.tokens === null ? EMPTY : num(bucket.tokens)} · ${share}`)
  })

  const bucketRows = buckets.map((bucket) => {
    const tone = bucket.state === 'error' ? 'err' : (bucket.state === 'empty' ? 'idle' : 'ok')
    const value = bucket.tokens === null ? '不可读' : `${num(bucket.tokens)} tokens`
    return createElement('li', { key: bucket.id },
      createElement('button', {
        type: 'button',
        className: 'mo-bucket-row',
        'data-select': `b:${bucket.id}`,
        'aria-current': sel === `b:${bucket.id}` ? 'true' : undefined,
        onClick: () => { onSelect(`b:${bucket.id}`) },
      },
      createElement('span', { className: `mo-tonebar mo-tone-${tone}` }),
      createElement('span', { className: 'mo-bucket-name' },
        bucket.name,
        ' ',
        createElement('span', {
          className: 'mo-num',
          style: { color: 'var(--dsw-alias-label-tertiary)' },
        }, bucket.en)),
      createElement('span', {
        className: 'mo-bucket-num',
        'data-unknown': bucket.tokens === null ? 'true' : undefined,
      }, value),
      createElement('span', { className: 'mo-bucket-note' }, bucket.note)))
  })

  const version = versionInfoOf(PLUGIN_VERSION)

  return createElement('div', { className: 'mo-pane-inner' },
    SectionHead({
      title: '每请求都付的部分',
      /* 三个口径必须分清：每请求 / 索引层（按需）/ 全库。挤在一行 note 里，
         是为了守住「5 页首屏 0 滚动」——多一行 p 就会把导出挤出首屏。 */
      note: `${num(total)} tokens · 另有索引层 ${num(data.overview.data?.kpi.indexTokens)} 按需 · 全库 ${num(data.overview.data?.tokens)}`,
    }),
    createElement('div', { className: 'mo-meter-wrap' },
      createElement('div', {
        className: 'mo-meter',
        role: 'img',
        'aria-label': `常驻前缀按四桶分段：合计 ${num(total)}；工具 schema 不可读不计入`,
      }, meterSegments(buckets, total)),
      createElement('div', { className: 'mo-meter-legend' }, legend),
      createElement('p', { className: 'mo-check-line' },
        `${num(counts.catalog)} + ${num(counts.frame)} + ${num(counts.injected)} = ${num(sum)}（${verdict}；`
        + `${unknown.length === 0 ? '四桶全部可读' : `不含${unknown.join('、')}：当前不可读`}）`)),
    createElement('ul', { className: 'mo-bucket-rows', role: 'list' }, bucketRows),

    /* 版本不单开一段：note 里已经写明「点这里看五项」，多一段会把导出挤出首屏。 */
    createElement('ul', { className: 'mo-bucket-rows', role: 'list' },
      createElement('li', null,
        createElement('button', {
          type: 'button',
          className: 'mo-bucket-row',
          'data-select': 'version',
          'aria-current': sel === 'version' ? 'true' : undefined,
          onClick: () => { onSelect('version') },
        },
        createElement('span', { className: 'mo-tonebar mo-tone-idle' }),
        createElement('span', { className: 'mo-bucket-name' }, '版本与更新'),
        createElement('span', { className: 'mo-bucket-num mo-num' }, version.version),
        createElement('span', { className: 'mo-bucket-note' },
          `安装方式：${version.install === EMPTY ? '宿主未提供' : version.install} · 目标：${version.target} · 点这里看五项`)))),

    SectionHead({ title: '维护作业', note: '按需触发 · 导出在下方' }),
    createElement('p', { className: 'mo-check-line' },
      `驳回静默 ${num(health.data?.silenced.length)} 条 · 待复核 ${num(health.data?.stale.length)} 条`
      + ` · 超 ${num(health.data?.lineLimit ?? 80)} 行 ${num(health.data?.overLimit ?? counts.overLimit)} 篇`),
    createElement('ul', { className: 'mo-bucket-rows', role: 'list' },
      OPS.map(op => createElement('li', { key: op.id },
        createElement('button', {
          type: 'button',
          className: 'mo-bucket-row mo-ops-row',
          'data-select': `ops:${op.id}`,
          'aria-current': sel === `ops:${op.id}` ? 'true' : undefined,
          onClick: () => { onSelect(`ops:${op.id}`) },
        },
        createElement('span', { className: 'mo-bucket-name' }, op.name),
        createElement('span', {
          className: 'mo-bucket-num',
          style: { color: 'var(--dsw-alias-label-secondary)' },
        }, op.note))))),

    /* 导出不单开一段：它是低频动作，挤出一个 SectionHead 会把首屏撑出滚动。 */
    createElement('div', { className: 'mo-toolbar', style: { padding: 0 } },
      BtnGhost({
        children: '全部 Markdown',
        actName: 'export',
        disabled: props.pending,
        onClick: () => {
          props.run(async () => {
            const result = await exportData('markdown')
            if (result.count === 0) throw new Error('这次导出 0 条：库可能是空的')
          }, '已导出全部记忆，文件名在回执里')
        },
      }),
      BtnGhost({
        children: '仅个人域',
        actName: 'export-personal',
        disabled: props.pending,
        onClick: () => {
          props.run(async () => { await exportData('markdown', 'personal') }, '已导出个人域记忆')
        },
      }),
      BtnGhost({
        children: '仅工作域',
        actName: 'export-work',
        disabled: props.pending,
        onClick: () => {
          props.run(async () => { await exportData('markdown', 'work') }, '已导出工作域记忆')
        },
      })))
}

/** 桶的检视栏内容：条目级明细。 */
function bucketFrame(bucket: Bucket, props: PaneProps, health: { reload: () => void }): ReactNode {
  const { sel, onSelect, data, pending } = props

  if (bucket.state === 'error') {
    return InspectorFrame({
      title: `${bucket.name} · 不可读`,
      sub: 'state = error',
      body: createElement('div', null,
        createElement('div', { className: 'mo-verdicts' },
          createElement('div', { className: 'mo-verdict mo-verdict-refuse' },
            createElement('span', { className: 'mo-verdict-tag' }, '原因'),
            createElement('span', null, bucket.note))),
        createElement('p', { className: 'mo-insp-text' },
          '合计行已写明「不含这一段」。把不可读渲染成 0，会让人以为已经算全了。')),
      foot: BtnGhost({
        children: '重试读取',
        actName: 'retry',
        disabled: pending,
        onClick: () => { health.reload(); data.reloadAll() },
      }),
    })
  }

  const itemRows = bucket.items.map(item => createElement('li', { key: item.id },
    createElement('button', {
      type: 'button',
      className: 'mo-bucket-row',
      'data-select': `p:${item.id}`,
      'aria-current': sel === `p:${item.id}` ? 'true' : undefined,
      onClick: () => { onSelect(`p:${item.id}`) },
    },
    createElement('span', { className: 'mo-tonebar mo-tone-ok' }),
    createElement('span', { className: 'mo-bucket-name' }, clip(item.name, 26)),
    createElement('span', { className: 'mo-bucket-num mo-num' }, num(item.tokens)),
    createElement('span', { className: 'mo-bucket-note' },
      `${item.source === '' ? '宿主注入' : item.source} · ${item.injected ? '已进系统提示词' : '未注入'} · ${item.editable ? '可编辑' : '只读'}`))))

  return InspectorFrame({
    title: bucket.name,
    sub: `${bucket.en} · ${bucket.tokens === null ? '不可读' : `${num(bucket.tokens)} tokens`}`,
    body: createElement('div', null,
      bucket.state === 'empty'
        ? createElement('div', null,
          createElement('div', { className: 'mo-verdicts' },
            createElement('div', { className: 'mo-verdict mo-verdict-ok' },
              createElement('span', { className: 'mo-verdict-tag' }, '空'),
              createElement('span', null, bucket.note))),
          createElement('p', { className: 'mo-insp-text' },
            '确实一条都没有。这和「读不到」是两种状态，文案不许合并。'))
        : createElement('ul', { className: 'mo-bucket-rows', role: 'list' }, itemRows),
      bucket.readonly === undefined ? null : createElement('p', { className: 'mo-effect' }, bucket.readonly)),
  })
}

/**
 * V2：编辑一条置顶条目的标题行。
 *
 * 编辑对象是**正文第一行**（`# 标题`），写回走 `writeBody`：
 * core 没有「只改 title」的能力，改标题必须落成正文改写；
 * 标题行同时决定注入段里那一行的内容，所以这条路径是真实生效的。
 */
function EntryEditor({ item, props }: { item: BucketItem; props: PaneProps }): ReactNode {
  const { run, pending } = props
  const detail = useBridge<DetailView>('detail', { path: item.source }, [item.source])
  const [draft, setDraft] = useState<string | null>(null)

  useEffect(() => { setDraft(null) }, [item.id])

  const body = detail.data?.entry.body
  const lines = body === undefined ? [] : body.split('\n')
  const firstIndex = lines.findIndex(line => line.trim() !== '')
  const firstLine = firstIndex >= 0 ? (lines[firstIndex] ?? '') : ''
  /* 只认 ATX 标题（# / ## / ###）：首行是段落时不许在这里「改标题」。 */
  const isHeading = /^#{1,3}\s/.test(firstLine)
  const original = firstLine.replace(/^#+\s*/, '')
  const value = draft ?? original
  const before = estimateTokens(original)
  const after = estimateTokens(value)
  const delta = after - before
  const changed = value !== original

  const problems: string[] = []
  if (value.trim() === '') problems.push('空标题会让模型拿到一条无意义规则')
  if (value.includes('{{')) problems.push('含 {{：不会做变量插值，原文照发')
  if (after > 64) problems.push('单条超 64 tokens；超预算条目会被跳过，等于没注入')
  const blocking = problems.some(problem => problem.startsWith('空标题')) || !isHeading

  if (detail.phase === 'loading') {
    return InspectorFrame({
      title: item.name,
      sub: '读取中',
      body: Skeleton({ rows: 2, label: '读取中：正在取正文' }),
    })
  }
  if (detail.phase === 'error' || body === undefined || firstLine === '') {
    return InspectorFrame({
      title: '读不到这条正文',
      sub: 'state = error',
      body: createElement('div', null,
        createElement('div', { className: 'mo-verdicts' },
          createElement('div', { className: 'mo-verdict mo-verdict-refuse' },
            createElement('span', { className: 'mo-verdict-tag' }, '阻断'),
            createElement('span', null, '读不到库：先重试，再编辑。错误态下不给可写回的按钮。')))),
    })
  }

  return InspectorFrame({
    title: '编辑置顶条目',
    sub: `pinned · ${item.id}`,
    body: createElement('div', null,
      createElement('p', { className: 'mo-insp-label' }, '标题行'),
      createElement('input', {
        className: 'mo-title-input',
        id: 'mo-pin-title',
        'aria-label': '置顶条目标题',
        value,
        onChange: (event: { target: { value: string } }) => { setDraft(event.target.value) },
      }),
      createElement('p', { className: 'mo-insp-label' }, '改动对照'),
      changed
        ? createElement('div', { className: 'mo-diff', 'aria-label': '改动对照' },
          createElement('div', { className: 'mo-diff-line mo-diff-removed' },
            createElement('span', { className: 'mo-diff-no mo-num' }, String(firstIndex + 1)),
            createElement('span', { className: 'mo-diff-text' }, original)),
          createElement('div', { className: 'mo-diff-line mo-diff-added' },
            createElement('span', { className: 'mo-diff-no mo-num' }, String(firstIndex + 1)),
            createElement('span', { className: 'mo-diff-text' }, value === '' ? '（空）' : value)))
        : createElement('p', { className: 'mo-check-line' }, '未改动：草稿与原文逐字一致（Δ 0），不画假 diff'),
      isHeading ? null : createElement('p', { className: 'mo-check-line' },
        '这条正文的首行不是标题（# / ##）：只能改正文开头是标题的条目，避免把一段正文改写成 H1。'),
      Props({
        rows: [
          { label: 'tokens', value: `${num(before)} → ${num(after)}（Δ ${delta > 0 ? '+' : ''}${num(delta)}）` },
          { label: '来源', value: item.source },
          { label: '条数', value: '1 条（改标题不改 id）' },
        ],
      }),
      createElement('div', { className: 'mo-verdicts' },
        problems.length === 0
          ? createElement('div', { className: 'mo-verdict mo-verdict-ok' },
            createElement('span', { className: 'mo-verdict-tag' }, '通过'),
            createElement('span', null, '可保存'))
          : problems.map(problem => createElement('div', {
            key: problem,
            className: `mo-verdict ${problem.startsWith('空标题') ? 'mo-verdict-refuse' : 'mo-verdict-warn'}`,
          },
          createElement('span', { className: 'mo-verdict-tag' }, '警'),
          createElement('span', null, problem)))),
      createElement('p', { className: 'mo-effect' },
        '生效时机：注入段缓存 30 秒内刷新；新会话一定读到新标题。当前会话已组装的提示词不追改。')),
    foot: createElement('div', { style: { display: 'flex', gap: 'var(--mo-s2)' } },
      BtnGhost({
        children: '取消',
        actName: 'cancel-edit',
        disabled: pending || !changed,
        onClick: () => { setDraft(null) },
      }),
      BtnInk({
        children: pending ? '保存中…' : '保存',
        actName: 'save-pin',
        id: 'mo-save-pin',
        disabled: pending || blocking || !changed,
        onClick: () => {
          /* 按行索引替换：不碰字符串模式（标题里打 $& 会被 replace 当插值）。 */
          const nextLines = [...lines]
          nextLines[firstIndex] = `# ${value.trim()}`
          const next = nextLines.join('\n')
          run(async () => {
            await writeBody(item.source, next)
            setDraft(null)
          }, `已写回 ${item.source}（改 1 行）· 新会话生效`)
        },
      })),
  })
}

/** V3：版本五项。 */
function versionFrame(): ReactNode {
  const version = versionInfoOf(PLUGIN_VERSION)
  return InspectorFrame({
    title: `版本 · ${version.version}`,
    sub: 'V3 · 版本五项与差异清单',
    body: createElement('div', null,
      Props({
        rows: [
          { label: '当前版本', value: version.version },
          { label: '代码来源', value: version.source },
          { label: '安装方式', value: version.install },
          { label: '当前提交', value: version.commit },
          { label: '目标', value: version.target },
        ],
      }),
      createElement('div', { className: 'mo-verdicts' },
        createElement('div', { className: 'mo-verdict mo-verdict-warn' },
          createElement('span', { className: 'mo-verdict-tag' }, '无法比较'),
          createElement('span', null, version.reason))),
      createElement('p', { className: 'mo-insp-text' },
        '这不是失败：没有可比较的版本号就不该给你一个「可更新到 X」。'
        + '要更新就用宿主插件页的更新入口；热更新失败宿主会自动回滚旧版本。'),
      createElement('p', { className: 'mo-check-line' }, '差异清单：—（宿主未提供 commits 对比）')),
    foot: BtnGhost({
      children: '复制插件来源',
      actName: 'copy-source',
      onClick: () => {
        /* 拷一个真能用的来源串，而不是一句说明话术。 */
        const source = 'github:Lixb53/memory-ops-dsh#path:packages/dsh-plugin'
        if (typeof navigator !== 'undefined' && navigator.clipboard !== undefined) {
          void navigator.clipboard.writeText(source)
        }
      },
    }),
  })
}

/** 维护作业：复用既有面板（先预览、再执行，五个作业同一套规矩）。 */
function opsFrame(sel: string, onOpenMemory: (path: string) => void): ReactNode {
  const op = OPS.find(item => `ops:${item.id}` === sel) ?? OPS[0]
  return InspectorFrame({
    title: `维护：${op.name}`,
    sub: `${op.route} · 先预览，再执行`,
    body: createElement('div', null,
      createElement('p', { className: 'mo-insp-text' }, op.note),
      createElement('p', { className: 'mo-insp-text' },
        '这些作业都会改记忆的内容或可信度，所以一律先给预览、你点了才执行。'),
      /*
       * onOpenMemory 不能是空函数：维护面板把「看这条」挂在 5 个分区的
       * 可点行与 Enter/Space 上，空实现 = 可聚焦、可激活、零结果。
       */
      createElement(MaintenancePanel, { onOpenMemory })),
  })
}

/** 检视栏。 */
export function HealthInspector(props: PaneProps): ReactNode {
  const { data, sel, goto } = props
  /* 桶明细的「重试读取」要能重取 health 路由，所以这一层也要订阅它。 */
  const health = useBridge<HealthRouteView>('health', {})
  const buckets = bucketsOf({ snapshot: data.snapshot.data, overview: data.overview.data })

  if (sel.startsWith('ops:')) return opsFrame(sel, (path) => { goto('memory', path) })
  if (sel === 'version') return versionFrame()
  if (sel.startsWith('p:')) {
    const id = sel.slice(2)
    const injected = buckets.find(bucket => bucket.id === 'injected')
    const item = injected?.items.find(entry => entry.id === id)
    if (item !== undefined) return createElement(EntryEditor, { item, props })
  }
  const bucket = buckets.find(entry => sel === `b:${entry.id}`) ?? buckets[0]
  if (bucket !== undefined) return bucketFrame(bucket, props, health)

  return InspectorFrame({
    title: '选一行',
    sub: '桶 / 版本 / 维护作业',
    body: createElement('p', { className: 'mo-insp-text' },
      '四桶之和必须等于顶栏那个数。对不上时，这一栏会写出差额和原因，而不是悄悄取整。'),
  })
}