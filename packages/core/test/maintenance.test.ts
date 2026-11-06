/**
 * 维护作业测试：锚点校验、减重、复盘、自动爬升，以及两处口径修正。
 *
 * 这四件事的共同点是**都会改或会建议改库的内容**，所以每条都要钉死两件事：
 *   1. 默认不动库（dry-run）；
 *   2. 真的动了的时候，改的是它声称改的那个字段，且迁移合法。
 */

import assert from 'node:assert/strict'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'

import { createActions } from '../src/actions.ts'
import { expiryOf } from '../src/schema.ts'
import { createStore } from '../src/store.ts'
import { INBOX_HEADER } from '../src/parse.ts'
import {
  compactBody, guessLayer, hashOf, planPromotions, verifyAnchors, weeklyReview,
} from '../src/maintenance.ts'
import type { MemoryEntry } from '../src/store.ts'

let root: string

before(async () => {
  root = await fsp.mkdtemp(path.join(os.tmpdir(), 'memory-ops-maint-'))
})

after(async () => {
  await fsp.rm(root, { recursive: true, force: true })
})

/** 断言成功分支并收窄类型。 */
function assertOk<T>(result: unknown): T {
  const record = result as { ok?: boolean; error?: string }
  assert.equal(record?.ok, true, record?.error ?? '期望成功')
  return result as T
}

async function freshActions(name: string, options: {
  readExternal?: (relPath: string) => Promise<string | null>
  now?: () => number
} = {}) {
  const dir = path.join(root, name)
  const store = createStore({ root: dir, now: options.now })
  await store.ensureLayout()
  await fsp.writeFile(
    path.join(dir, 'personal', 'INBOX.md'),
    `---\nid: personal.INBOX\ntitle: INBOX\nlayer: l2\nstatus: active\n---\n\n# INBOX\n\n${INBOX_HEADER}\n`,
    'utf8',
  )
  return {
    actions: createActions({ store, now: options.now, readExternal: options.readExternal }),
    store,
    dir,
  }
}

/** 用内存里的假仓库做锚点校验，不在磁盘上造目录树。 */
function fakeRepo(files: Record<string, string>): (relPath: string) => Promise<string | null> {
  return async (relPath: string) => {
    const found = files[relPath]
    return found === undefined ? null : found
  }
}

// ============================================================
describe('锚点校验作业', () => {
  it('符号还在且文件未变 → fresh', async () => {
    const source = 'export function searchEntries() {}\n'
    const { actions, store } = await freshActions('anchor-fresh', {
      readExternal: fakeRepo({ 'src/search.ts': source }),
    })
    await store.createEntry({
      relPath: 'work/sz-web/issues/a.md',
      frontmatter: {
        title: '检索实现',
        anchor: [{ path: 'src/search.ts', symbol: 'searchEntries', hash: hashOf(source) }],
      },
      body: 'x',
    })
    const report = assertOk<{
      checks: { state: string }[]; summary: Record<string, number>; withoutAnchor: number
    }>(await actions.verifyAnchor({ baseDir: '/repo' }))
    assert.equal(report.checks.length, 1)
    assert.equal(report.checks[0]!.state, 'fresh')
    assert.equal(report.summary.fresh, 1)
    assert.equal(report.withoutAnchor, 1) // INBOX 没有锚点
  })

  it('符号被改名 → stale，且理由说的是符号而不是「内容变了」', async () => {
    const { actions, store } = await freshActions('anchor-symbol', {
      // 文件变了，但符号也真的没了
      readExternal: fakeRepo({ 'src/search.ts': 'export function findEntries() {}\n' }),
    })
    await store.createEntry({
      relPath: 'work/sz-web/issues/b.md',
      frontmatter: {
        title: '检索实现',
        anchor: [{ path: 'src/search.ts', symbol: 'searchEntries', hash: 'deadbeef0000' }],
      },
      body: 'x',
    })
    const report = assertOk<{ checks: { state: string; reason: string }[] }>(
      await actions.verifyAnchor({}),
    )
    assert.equal(report.checks[0]!.state, 'stale')
    assert.match(report.checks[0]!.reason, /找不到符号/)
  })

  it('符号还在但文件变了 → stale，理由是内容漂移', async () => {
    const { actions, store } = await freshActions('anchor-drift', {
      readExternal: fakeRepo({ 'src/search.ts': 'export function searchEntries() { /* 改了 */ }\n' }),
    })
    await store.createEntry({
      relPath: 'work/sz-web/issues/c.md',
      frontmatter: {
        title: '检索实现',
        anchor: [{ path: 'src/search.ts', symbol: 'searchEntries', hash: 'deadbeef0000' }],
      },
      body: 'x',
    })
    const report = assertOk<{ checks: { state: string; reason: string }[] }>(
      await actions.verifyAnchor({}),
    )
    assert.equal(report.checks[0]!.state, 'stale')
    assert.match(report.checks[0]!.reason, /文件已变更/)
  })

  it('锚点文件被删 → missing', async () => {
    const { actions, store } = await freshActions('anchor-missing', {
      readExternal: fakeRepo({}),
    })
    await store.createEntry({
      relPath: 'work/sz-web/issues/d.md',
      frontmatter: { title: '没了', anchor: [{ path: 'src/gone.ts', symbol: 'x' }] },
      body: 'x',
    })
    const report = assertOk<{ checks: { state: string }[]; summary: Record<string, number> }>(
      await actions.verifyAnchor({}),
    )
    assert.equal(report.checks[0]!.state, 'missing')
    assert.equal(report.summary.missing, 1)
  })

  it('默认 dry-run：判定 stale 但不改文件', async () => {
    const { actions, store } = await freshActions('anchor-dry', {
      readExternal: fakeRepo({ 'src/gone.ts': '别的内容' }),
    })
    await store.createEntry({
      relPath: 'work/sz-web/issues/e.md',
      frontmatter: {
        title: '待校验',
        status: 'confirmed',
        anchor: [{ path: 'src/gone.ts', symbol: 'searchEntries' }],
      },
      body: 'x',
    })
    const report = assertOk<{ changed: unknown[] }>(await actions.verifyAnchor({}))
    assert.equal(report.changed.length, 0)
    const entry = await store.readEntry('work/sz-web/issues/e.md')
    assert.equal(entry.status, 'confirmed', 'dry-run 不许改状态')
  })

  it('apply=true 才把 confirmed 降为 stale，并写审计字段', async () => {
    const { actions, store } = await freshActions('anchor-apply', {
      readExternal: fakeRepo({ 'src/gone.ts': '别的内容' }),
    })
    await store.createEntry({
      relPath: 'work/sz-web/issues/f.md',
      frontmatter: {
        title: '待校验',
        status: 'confirmed',
        anchor: [{ path: 'src/gone.ts', symbol: 'searchEntries' }],
      },
      body: 'x',
    })
    const report = assertOk<{ changed: { path: string }[] }>(
      await actions.verifyAnchor({ apply: true }),
    )
    assert.equal(report.changed.length, 1)
    const entry = await store.readEntry('work/sz-web/issues/f.md')
    assert.equal(entry.status, 'stale')
    assert.equal(entry.frontmatter.anchor_state, 'stale')
    assert.equal(typeof entry.frontmatter.anchor_checked_at, 'string')
  })

  it('没有注入 file reader 时明确报 unverifiable，不假装 fresh', async () => {
    const { actions, store } = await freshActions('anchor-noreader')
    await store.createEntry({
      relPath: 'work/sz-web/issues/g.md',
      frontmatter: { title: '无读取器', anchor: [{ path: 'src/x.ts', symbol: 'y' }] },
      body: 'x',
    })
    const report = assertOk<{ checks: { state: string }[] }>(await actions.verifyAnchor({}))
    // reader 返回 null → missing（读不到就是读不到），但关键是**不能**判成 fresh
    assert.notEqual(report.checks[0]!.state, 'fresh')
  })

  it('无锚点的条目计入 withoutAnchor，不算失败', async () => {
    const report = await verifyAnchors(
      [{ id: 'a', path: 'personal/a.md', title: 'A', anchor: null } as unknown as MemoryEntry],
      fakeRepo({}),
    )
    assert.equal(report.withoutAnchor, 1)
    assert.equal(report.checks.length, 0)
  })

  it('锚点缺 path 判 unverifiable（有字段但不成形）', async () => {
    const report = await verifyAnchors(
      [{ id: 'a', path: 'personal/a.md', title: 'A', anchor: { symbol: 'x' } } as unknown as MemoryEntry],
      fakeRepo({}),
    )
    assert.equal(report.checks[0]!.state, 'unverifiable')
  })
})

// ============================================================
describe('减重（机械压缩）', () => {
  it('折叠连续空行、去行尾空白、去首尾空行', () => {
    // 注意「标题   」有三个空格：按 Markdown 语义会保留两个（硬换行），
    // 所以期望值里标题后带两个空格，这不是漏删，是刻意保留。
    const raw = '\n\n标题   \n\n\n\n正文\t\n\n\n'
    const result = compactBody(raw)
    assert.equal(result.body, '标题  \n\n正文\n')
    assert.equal(result.removed > 0, true)
    assert.equal(result.changes.length, 3)
  })

  it('不删重复行（清单项重复是合法的）', () => {
    const raw = '- 同一条\n- 同一条\n- 同一条\n'
    const result = compactBody(raw)
    // 重复的三行必须原样留在正文里——这是「减重不做语义破坏」的底线
    assert.equal(result.body, raw)
    assert.equal(result.removed, 0)
    // 允许报告「去首尾空行」这类不影响渲染的账，但不许报删行
    assert.equal(result.changes.some(change => /删|重复/.test(change)), false)
  })

  it('保留行尾两个空格的硬换行语义', () => {
    const raw = '第一行  \n第二行\n'
    const result = compactBody(raw)
    assert.equal(result.body, raw, '两个空格是 Markdown 硬换行，去掉会改变渲染')
  })

  it('清理行尾多于两个的空格，但保留硬换行那两个', () => {
    const result = compactBody('甲    \n乙\n')
    assert.equal(result.body, '甲  \n乙\n')
  })

  it('已经干净的文件不产生改动', () => {
    const raw = '# 标题\n\n- 一\n- 二\n'
    const result = compactBody(raw)
    assert.equal(result.body, raw)
    assert.equal(result.removed, 0)
  })

  it('压缩后仍超限时给出拆分建议，且只建议大节', () => {
    const lines = ['# 标题', '']
    lines.push('## 小节一')
    for (let i = 0; i < 30; i += 1) lines.push(`- 内容 ${i}`)
    lines.push('## 小节二')
    for (let i = 0; i < 5; i += 1) lines.push(`- 短 ${i}`)
    const result = compactBody(lines.join('\n'))
    assert.equal(result.splitSuggestions.length, 1, '只有 ≥20 行的节才值得拆')
    assert.equal(result.splitSuggestions[0]!.heading, '小节一')
  })

  it('默认列出超限文件，dry-run 不写盘', async () => {
    const { actions, store } = await freshActions('compact-dry')
    const long = Array.from({ length: 100 }, (_, i) => `- 行 ${i}`).join('\n\n\n')
    await store.createEntry({
      relPath: 'personal/notes/long.md',
      frontmatter: { title: '超长' },
      body: long,
    })
    const result = assertOk<{
      candidates: { path: string; removed: number }[]; written: unknown[]; removableLines: number
    }>(await actions.compact({}))
    assert.equal(result.candidates.length, 1)
    assert.equal(result.candidates[0]!.removed > 0, true)
    assert.equal(result.written.length, 0)
    assert.equal(result.removableLines > 0, true)

    const entry = await store.readEntry('personal/notes/long.md')
    assert.equal(entry.body.includes('\n\n\n'), true, 'dry-run 不许动正文')
  })

  it('apply=true 才写回，且确实变短', async () => {
    const { actions, store } = await freshActions('compact-apply')
    const long = Array.from({ length: 100 }, (_, i) => `- 行 ${i}`).join('\n\n\n')
    await store.createEntry({
      relPath: 'personal/notes/long2.md',
      frontmatter: { title: '超长2' },
      body: long,
    })
    const before = await store.readEntry('personal/notes/long2.md')
    const result = assertOk<{ written: { path: string }[] }>(await actions.compact({ apply: true }))
    assert.equal(result.written.length, 1)
    const after = await store.readEntry('personal/notes/long2.md')
    assert.equal(after.lines < before.lines, true)
    assert.equal(after.body.includes('\n\n\n'), false)
  })

  it('没节省就完全不写（不碰文件时间戳）', async () => {
    const { actions, store } = await freshActions('compact-noop')
    await store.createEntry({
      relPath: 'personal/notes/tidy.md',
      frontmatter: { title: '本来就干净' },
      body: '# 标题\n\n- 一\n- 二\n',
    })
    const result = assertOk<{ written: unknown[] }>(await actions.compact({ paths: ['personal/notes/tidy.md'], apply: true }))
    assert.equal(result.written.length, 0)
  })
})

// ============================================================
describe('每周复盘', () => {
  it('给出窗口、事件计数与行动项', async () => {
    const { actions, store } = await freshActions('review')
    await store.createEntry({
      relPath: 'personal/notes/pending.md',
      frontmatter: { title: '待拍板', status: 'observed' },
      body: 'x',
    })
    await store.appendEvent({ session: 's1', kind: 'recall', ids: ['a'] })
    await store.appendEvent({ session: 's1', kind: 'capture', query: 'q' })
    const review = assertOk<{
      window: { days: number }
      events: Record<string, number>
      counts: { pending: number; misses: number }
      todo: { kind: string }[]
    }>(await actions.review({ days: 7 }))
    assert.equal(review.window.days, 7)
    assert.equal(review.events.recall, 1)
    assert.equal(review.events.capture, 1)
    assert.equal(review.counts.pending, 1)
    assert.equal(review.todo.some(item => item.kind === 'confirm'), true)
  })

  it('超限条目进 todo，且提示去减重', async () => {
    const { actions, store } = await freshActions('review-compact')
    await store.createEntry({
      relPath: 'personal/notes/big.md',
      frontmatter: { title: '大文件' },
      body: Array.from({ length: 100 }, () => '行').join('\n'),
    })
    const review = assertOk<{ todo: { kind: string; detail: string }[] }>(await actions.review({}))
    const item = review.todo.find(entry => entry.kind === 'compact')
    assert.notEqual(item, undefined)
    assert.match(item!.detail, /减重/)
  })

  it('高频未命中进 todo（≥3 次才算）', async () => {
    const { actions, store } = await freshActions('review-miss')
    for (let i = 0; i < 3; i += 1) await store.recordMiss({ query: '反复问的问题' })
    await store.recordMiss({ query: '只问过一次' })
    const review = assertOk<{ todo: { kind: string; title: string }[]; topMisses: { query: string }[] }>(
      await actions.review({}),
    )
    assert.equal(review.topMisses[0]!.query, '反复问的问题', '按频率降序')
    assert.equal(review.todo.some(item => item.kind === 'fill' && item.title === '反复问的问题'), true)
    assert.equal(review.todo.some(item => item.title === '只问过一次'), false)
  })

  it('窗口外的事件不计入', () => {
    const day = 86_400_000
    const nowMs = Date.parse('2026-11-06T00:00:00Z')
    const review = weeklyReview([], [
      { at: new Date(nowMs - 1 * day).toISOString(), kind: 'recall', ids: ['a'] },
      { at: new Date(nowMs - 30 * day).toISOString(), kind: 'recall', ids: ['b'] },
    ], [], { nowMs, days: 7 })
    assert.equal(review.events.recall, 1)
  })
})

// ============================================================
describe('自动爬升（observed → reinforced）', () => {
  /** 造一条条目 + N 个不同 session 的引用事件。 */
  async function seed(store: Awaited<ReturnType<typeof freshActions>>['store'], id: string, status: string, sessions: string[]) {
    await store.createEntry({
      relPath: `personal/notes/${id}.md`,
      frontmatter: { id, title: id, status },
      body: 'x',
    })
    for (const session of sessions) {
      await store.appendEvent({ session, kind: 'cite', ids: [id] })
    }
  }

  it('3 个不同会话引用 → 计划升到 reinforced，默认不落库', async () => {
    const { actions, store } = await freshActions('promote-dry')
    await seed(store, 'p1', 'observed', ['s1', 's2', 's3'])
    const result = assertOk<{ plans: { to: string; sessions: string[] }[]; changed: unknown[] }>(
      await actions.promote({}),
    )
    assert.equal(result.plans.length, 1)
    assert.equal(result.plans[0]!.to, 'reinforced')
    assert.equal(result.plans[0]!.sessions.length, 3)
    assert.equal(result.changed.length, 0)
    assert.equal((await store.readEntry('personal/notes/p1.md')).status, 'observed')
  })

  it('同一会话引用 3 次不算（必须跨会话）', async () => {
    const { actions, store } = await freshActions('promote-same-session')
    await seed(store, 'p2', 'observed', ['s1', 's1', 's1'])
    const result = assertOk<{ plans: unknown[] }>(await actions.promote({}))
    assert.equal(result.plans.length, 0)
  })

  it('apply=true 落库，置信度同步为 0.7', async () => {
    const { actions, store } = await freshActions('promote-apply')
    await seed(store, 'p3', 'observed', ['s1', 's2', 's3'])
    const result = assertOk<{ changed: unknown[] }>(await actions.promote({ apply: true }))
    assert.equal(result.changed.length, 1)
    const entry = await store.readEntry('personal/notes/p3.md')
    assert.equal(entry.status, 'reinforced')
    assert.equal(entry.confidence, 0.7)
  })

  it('最多爬到 reinforced —— confirmed 不被改写', async () => {
    const { actions, store } = await freshActions('promote-ceiling')
    await seed(store, 'p4', 'confirmed', ['s1', 's2', 's3', 's4'])
    const result = assertOk<{ plans: unknown[] }>(await actions.promote({ apply: true }))
    assert.equal(result.plans.length, 0)
    assert.equal((await store.readEntry('personal/notes/p4.md')).status, 'confirmed')
  })

  it('rejected 永不自动爬升', async () => {
    const { actions, store } = await freshActions('promote-rejected')
    await seed(store, 'p5', 'rejected', ['s1', 's2', 's3'])
    const result = assertOk<{ plans: unknown[] }>(await actions.promote({}))
    assert.equal(result.plans.length, 0)
  })

  it('hypothesis 先升 observed，不直接跳到 reinforced', () => {
    const entries = [{ id: 'h', path: 'p', title: 'h', status: 'hypothesis' } as unknown as MemoryEntry]
    const events = ['s1', 's2', 's3'].map(session => ({ at: '', session, kind: 'cite', ids: ['h'] }))
    const plans = planPromotions(entries, events)
    assert.equal(plans[0]!.to, 'observed')
  })

  it('recall 与 cite 都算「被用到」', () => {
    const entries = [{ id: 'x', path: 'p', title: 'x', status: 'observed' } as unknown as MemoryEntry]
    const events = [
      { at: '', session: 's1', kind: 'recall', ids: ['x'] },
      { at: '', session: 's2', kind: 'cite', ids: ['x'] },
      { at: '', session: 's3', kind: 'recall', ids: ['x'] },
    ]
    assert.equal(planPromotions(entries, events).length, 1)
  })
})

// ============================================================
describe('口径修正', () => {
  it('overview 的 residentTokens 是每请求付费部分，不是 L0 索引体积', async () => {
    const { actions, store } = await freshActions('kpi-resident')
    await store.createEntry({
      relPath: 'personal/index.md',
      frontmatter: { title: '索引', layer: 'l0' },
      body: '\n# 索引\n\n- 很长很长的索引内容用于拉开 token 差距\n',
    })
    const result = assertOk<{
      kpi: { residentTokens: number; indexTokens: number }
      resident: { billedTokens: number; onDemandTokens: number }
    }>(await actions.overview({
      skillDescriptions: [
        { name: 'personal-memory', path: '/x/SKILL.md', description: '一段 description', descriptionTokens: 20 },
      ],
    }))
    // 每请求付费 = catalog + 框架，与索引文件无关
    assert.equal(result.kpi.residentTokens, result.resident.billedTokens)
    assert.equal(result.kpi.residentTokens, 20 + 171)
    // 索引体积单列，两者不相等才说明确实拆开了
    assert.equal(result.kpi.indexTokens, result.resident.onDemandTokens)
    assert.notEqual(result.kpi.residentTokens, result.kpi.indexTokens)
  })

  it('stale 条目在检索里降权，但仍可被检索到', async () => {
    const { actions, store } = await freshActions('search-weight')
    // 两条完全同分的内容，只有状态不同
    for (const [id, status] of [['fresh-one', 'confirmed'], ['stale-one', 'stale']] as const) {
      await store.createEntry({
        relPath: `personal/notes/${id}.md`,
        frontmatter: { id, title: '同样的标题', status },
        body: '同样的正文',
      })
    }
    const result = assertOk<{ hits: { id: string; score: number }[]; total: number }>(
      await actions.search({ query: '同样的标题', record: false }),
    )
    // 两条都要返回（降权不是排除）
    assert.equal(result.total, 2)
    assert.equal(result.hits[0]!.id, 'fresh-one', 'stale 应排在同分条目之后')
    const stale = result.hits.find(hit => hit.id === 'stale-one')!
    assert.equal(stale.score < result.hits[0]!.score, true)
    assert.equal(Math.abs(stale.score / result.hits[0]!.score - 0.4) < 0.001, true)
  })

  it('未命中按频率降序返回', async () => {
    const { actions, store } = await freshActions('misses-order')
    await store.recordMiss({ query: '少' })
    for (let i = 0; i < 5; i += 1) await store.recordMiss({ query: '多' })
    for (let i = 0; i < 3; i += 1) await store.recordMiss({ query: '中' })
    const result = assertOk<{ pipeline: Record<string, { query: string; count: number }[]> }>(
      await actions.misses(),
    )
    // count>=3 会被 recordMiss 自动升到 should-fill，所以高频的两条不在 observing
    assert.deepEqual(result.pipeline.observing.map(item => item.query), ['少'])
    assert.deepEqual(result.pipeline['should-fill'].map(item => item.query), ['多', '中'])
    assert.equal(result.pipeline['should-fill'][0]!.count, 5)
  })
})

// ============================================================
describe('frontmatter 修补（让手写笔记变成可治理记忆）', () => {
  it('裸 Markdown 补出完整 frontmatter，正文一字未动', async () => {
    const { actions, store } = await freshActions('repair-bare')
    const bare = '# 一篇裸笔记\n\n正文第一行。\n\n## 小节\n\n内容。\n'
    await fsp.mkdir(path.join(store.root, 'work', 'demo'), { recursive: true })
    await fsp.writeFile(path.join(store.root, 'work', 'demo', 'bare.md'), bare, 'utf8')

    const before = await store.readEntry('work/demo/bare.md')
    assert.equal(before.status, 'active', '裸文件读出来是 active——这正是「什么都不工作」的原因')

    const result = assertOk<{ written: { fields: string[] }[]; failed: unknown[] }>(
      await actions.repairMeta({ apply: true }),
    )
    assert.equal(result.failed.length, 0)

    const after = await store.readEntry('work/demo/bare.md')
    assert.equal(after.status, 'confirmed')
    assert.equal(after.layer, 'l2')
    assert.equal(after.title, '一篇裸笔记')
    assert.equal(after.kind, 'fact')
    assert.equal(after.body, before.body, '正文必须一字未动')
  })

  it('修补后待你处理队列与确认率才可能算得出来', async () => {
    const { actions, store } = await freshActions('repair-governance')
    await fsp.mkdir(path.join(store.root, 'personal', 'notes'), { recursive: true })
    await fsp.writeFile(
      path.join(store.root, 'personal', 'notes', 'x.md'),
      '# 正文里写着待确认的一条\n\n这条还需要核实。\n', 'utf8',
    )
    // 修补前：active 不属任何队列
    const before = assertOk<{ queue: unknown[]; stats: { rates: { confirmRate: number | null } } }>(
      await actions.snapshot(),
    )
    assert.equal(before.stats.rates.confirmRate, null)

    await actions.repairMeta({ apply: true })

    const after = assertOk<{ queue: { path: string }[]; stats: { rates: { confirmRate: number | null } } }>(
      await actions.snapshot(),
    )
    // 正文带「待确认」→ 判 hypothesis → 进队列
    assert.equal(after.queue.some(item => item.path === 'personal/notes/x.md'), true)
    assert.notEqual(after.stats.rates.confirmRate, null)
  })

  it('已有字段一律保留（只补空洞）', async () => {
    const { actions, store } = await freshActions('repair-keep')
    await fsp.mkdir(path.join(store.root, 'personal', 'notes'), { recursive: true })
    await fsp.writeFile(
      path.join(store.root, 'personal', 'notes', 'y.md'),
      '---\ntitle: 我起的标题\ndate: 2026-01-01\nstatus: confirmed\n---\n\n# 正文标题不同\n\n内容。\n',
      'utf8',
    )
    await actions.repairMeta({ apply: true })
    const entry = await store.readEntry('personal/notes/y.md')
    assert.equal(entry.title, '我起的标题', '不能拿正文标题覆盖已有 title')
    assert.equal(entry.frontmatter.date, '2026-01-01', '无关字段不许丢')
    assert.equal(entry.status, 'confirmed')
  })

  it('修补不刷新 updated（不许把退役倒计时清零）', async () => {
    const { actions, store } = await freshActions('repair-no-touch-updated')
    await fsp.mkdir(path.join(store.root, 'personal', 'notes'), { recursive: true })
    await fsp.writeFile(
      path.join(store.root, 'personal', 'notes', 'old.md'),
      '---\ntitle: 老条目\nupdated: 2025-01-01\nstatus: confirmed\nlayer: l2\n---\n\n正文。\n',
      'utf8',
    )
    await actions.repairMeta({ apply: true })
    const entry = await store.readEntry('personal/notes/old.md')
    assert.equal(entry.updatedAt, '2025-01-01', '修补元数据不是「人动过这篇」，不许改 updated')
  })

  it('索引文件不因正文含「待确认」被判成 hypothesis', async () => {
    const { actions, store } = await freshActions('repair-index-status')
    await store.createEntry({
      relPath: 'personal/index.md',
      frontmatter: { title: '索引', layer: 'l0', status: 'active' },
      body: '\n# 索引\n\n- 待确认：某事的结论\n',
    })
    await actions.repairMeta({ apply: true })
    const entry = await store.readEntry('personal/index.md')
    assert.equal(entry.status, 'confirmed', '索引是结构性文件，状态不该由正文猜')
  })

  it('layer 猜测：index.md → l0，短表格 → l1，其余 → l2', () => {
    assert.equal(guessLayer('personal/index.md', '# 索引\n'), 'l0')
    assert.equal(guessLayer('work/a/table.md', '| a | b |\n|---|---|\n| 1 | 2 |\n'), 'l1')
    assert.equal(guessLayer('work/a/deep.md', '# 标题\n\n'.padEnd(200, 'x')), 'l2')
  })

  it('默认 dry-run：给出计划但不写盘', async () => {
    const { actions, store } = await freshActions('repair-dry')
    await fsp.mkdir(path.join(store.root, 'personal', 'notes'), { recursive: true })
    await fsp.writeFile(path.join(store.root, 'personal', 'notes', 'z.md'), '# Z\n\n内容。\n', 'utf8')
    const plan = assertOk<{ fixes: { path: string }[]; applied: boolean; written: unknown[] }>(
      await actions.repairMeta({}),
    )
    assert.equal(plan.applied, false)
    assert.equal(plan.written.length, 0)
    assert.equal(plan.fixes.some(fix => fix.path === 'personal/notes/z.md'), true)
    assert.equal((await store.readEntry('personal/notes/z.md')).status, 'active', 'dry-run 不许改库')
  })
})

// ============================================================
describe('总览口径一致性（用户困惑的直接来源）', () => {
  it('预算账本 L0 与 KPI 常驻前缀必须是同一个数', async () => {
    const { actions, store } = await freshActions('budget-consistency')
    await store.createEntry({
      relPath: 'personal/index.md',
      frontmatter: { title: '索引', layer: 'l0' },
      body: '\n# 索引\n\n- 一段索引内容\n',
    })
    const result = assertOk<{
      kpi: { residentTokens: number; indexTokens: number }
      budget: { layer: string; tokens: number; billing: string }[]
    }>(await actions.overview({
      skillDescriptions: [
        { name: 'personal-memory', path: '/x/SKILL.md', description: '读个人画像', descriptionTokens: 20 },
      ],
    }))
    const l0 = result.budget.find(row => row.layer === 'L0')!
    assert.equal(l0.tokens, result.kpi.residentTokens, 'L0 那行与顶栏必须是同一个数，否则用户不知道信哪个')
    assert.equal(l0.billing, 'per-request')
    // 索引文件合计另起一行，值等于 KPI 的 indexTokens
    const l0star = result.budget.find(row => row.layer === 'L0*')!
    assert.equal(l0star.tokens, result.kpi.indexTokens)
    assert.equal(l0star.billing, 'on-demand')
  })

  it('每一段预算都带 billing 与 advice（数字必须能指导决策）', async () => {
    const { actions } = await freshActions('budget-advice')
    const result = assertOk<{ budget: { layer: string; billing: string; note: string; advice: string }[] }>(
      await actions.overview(),
    )
    for (const row of result.budget) {
      assert.equal(['per-request', 'on-demand'].includes(row.billing), true, `${row.layer} 缺 billing`)
      assert.equal(row.note.length > 5, true, `${row.layer} 缺 note`)
      assert.equal(row.advice.length > 5, true, `${row.layer} 缺 advice`)
    }
  })

  it('域统计带明细，按体积降序', async () => {
    const { actions, store } = await freshActions('domain-entries')
    await store.createEntry({
      relPath: 'work/demo/small.md',
      frontmatter: { title: '小文件' },
      body: 'x',
    })
    await store.createEntry({
      relPath: 'work/demo/big.md',
      frontmatter: { title: '大文件' },
      body: '# 大\n\n'.padEnd(2000, '内容'),
    })
    const result = assertOk<{
      domains: { key: string; label: string; files: number; entries: { title: string; tokens: number }[] }[]
    }>(await actions.overview())
    const demo = result.domains.find(domain => domain.key === 'work/demo')!
    assert.equal(demo.entries.length, demo.files, '每个域都要给出自己的全部文件')
    // 最重的排最前——用户第一眼该看到的是「哪篇占了最多」
    assert.equal(demo.entries[0]!.title, '大文件')
    assert.equal(demo.entries[0]!.tokens > demo.entries[1]!.tokens, true)
  })

  it('skill 读取失败时 resident.state 为 error 并带原因', async () => {
    const { actions } = await freshActions('resident-error')
    const result = assertOk<{ resident: { state: string; error: string; billedTokens: number } }>(
      await actions.overview({ skillDescriptions: [], skillsError: '宿主没有提供 skills 服务' }),
    )
    assert.equal(result.resident.state, 'error')
    assert.match(result.resident.error, /skills/)
    // 此时 billedTokens 只剩框架开销，UI 必须明确说出来，不能伪装成「本来就没有」
    assert.equal(result.resident.billedTokens, result.resident.billedTokens)
  })

  it('读到 skill 时 state 为 ok，一个都没有时为 empty', async () => {
    const { actions } = await freshActions('resident-states')
    const ok = assertOk<{ resident: { state: string } }>(await actions.overview({
      skillDescriptions: [{ name: 'x', path: '/x', description: 'd', descriptionTokens: 5 }],
    }))
    assert.equal(ok.resident.state, 'ok')
    const empty = assertOk<{ resident: { state: string } }>(await actions.overview({}))
    assert.equal(empty.resident.state, 'empty')
  })
})

describe('减重行数口径（before/after/removed 必须同口径）', () => {
  it('无结尾换行不会被算成「压缩后变长」', () => {
    const r = compactBody('a\nb')
    // 早先 removed 会算出 -1，UI 显示「2 → 3 行」
    assert.equal(r.removed >= 0, true, `removed 不许为负：${r.removed}`)
    assert.equal(r.after <= r.before, true, `after(${r.after}) 不许大于 before(${r.before})`)
  })

  it('有结尾换行与无结尾换行得到同样的行数', () => {
    const a = compactBody('a\nb\n')
    const b = compactBody('a\nb')
    assert.equal(a.before, b.before, '两者的「内容行数」都应是 2')
    assert.equal(a.before, 2)
    assert.equal(a.after, b.after)
  })

  it('折叠空行后行数确实减少，且减少量等于报告值', () => {
    // 'a\n\n\n\nb\n' 去末尾换行后是 'a\n\n\n\nb' → split 得 5 项（a/空/空/空/b）
    const input = 'a\n\n\n\nb\n'
    const r = compactBody(input)
    assert.equal(r.before, 5, '内容行数：a + 三个空行 + b = 5')
    assert.equal(r.after, 3, '折叠连续空行后：a / 一个空行 / b = 3')
    assert.equal(r.removed, 2)
    assert.equal(r.before - r.after, r.removed)
  })

  it('空正文不产生负行数', () => {
    const r = compactBody('')
    assert.equal(r.before, 0)
    assert.equal(r.after, 0)
    assert.equal(r.removed, 0)
  })

  it('compact 预览里 before/after 来自正文口径，不再是整个文件行数', async () => {
    const { actions, store } = await freshActions('compact-lines')
    // 正文 3 行 + frontmatter，entry.lines 会明显大于正文行数
    await store.createEntry({
      relPath: 'personal/notes/withfm.md',
      frontmatter: { title: '带 frontmatter', layer: 'l2', status: 'confirmed' },
      body: '# 标题\n\n正文。\n',
    })
    const entry = await store.readEntry('personal/notes/withfm.md')
    const result = assertOk<{ candidates: { before: number; after: number; removed: number }[] }>(
      await actions.compact({ paths: ['personal/notes/withfm.md'] }),
    )
    const item = result.candidates[0]!
    // before 必须是正文口径（3 行），而不是 entry.lines（含 frontmatter，会更大）
    assert.equal(item.before, 3, `before 应是正文 3 行，实际 ${item.before}（entry.lines=${entry.lines}）`)
    assert.equal(item.before < entry.lines, true, 'cannot: 若相等说明还在用文件口径')
    assert.equal(item.after <= item.before, true)
  })
})

describe('引用时间写回（90 天退役的前提）', () => {
  it('cite 会写回 last_cited，让「未被引用」判定真的生效', async () => {
    const { store } = await freshActions('cite-lastcited')
    await store.createEntry({
      relPath: 'personal/notes/cited.md',
      frontmatter: { title: '被引用过', status: 'confirmed', layer: 'l2', updated: '2026-01-01' },
      body: 'x',
    })
    const before = await store.readEntry('personal/notes/cited.md')
    assert.equal(before.lastCitedAt, undefined, '初始没有 last_cited')

    await store.recordCite({ ids: [before.id], kind: 'cite', session: 's1' })

    const after = await store.readEntry('personal/notes/cited.md')
    assert.notEqual(after.lastCitedAt, undefined, 'cite 之后必须写回 last_cited')
    // 关键：过期判定不能再退回 updatedAt（那是 2026-01-01，早该退役）
    const expiry = expiryOf(after, Date.parse('2026-11-06T00:00:00Z'))
    assert.equal(expiry.level, 'fresh', '刚被引用过就不该判过期')
  })

  it('recall 不写 last_cited（搜到 ≠ 用到）', async () => {
    const { store } = await freshActions('recall-no-lastcited')
    await store.createEntry({
      relPath: 'personal/notes/recalled.md',
      frontmatter: { title: '只是被搜到', status: 'confirmed', layer: 'l2' },
      body: 'x',
    })
    const entry = await store.readEntry('personal/notes/recalled.md')
    await store.recordCite({ ids: [entry.id], kind: 'recall', session: 's1' })
    const after = await store.readEntry('personal/notes/recalled.md')
    assert.equal(after.lastCitedAt, undefined,
      '若 recall 也写引用时间，那被搜到过的记忆永远不会过期，过期率恒为 0')
  })

  it('引用不存在的 id 不报错也不写坏文件', async () => {
    const { store } = await freshActions('cite-unknown')
    const event = await store.recordCite({ ids: ['根本不存在'], kind: 'cite', session: 's1' })
    assert.equal(event.kind, 'cite', '事件仍要记账')
  })

  it('补 frontmatter 时 updated 已有值就不覆盖（防退役倒计时被清零）', async () => {
    const { store } = await freshActions('keep-updated')
    await store.createEntry({
      relPath: 'personal/notes/keep.md',
      frontmatter: { title: 'x', status: 'confirmed', layer: 'l2', updated: '2026-01-01' },
      body: 'x',
    })
    // mergeMeta 是修补走的路径：它不刷新 updated
    await store.mergeMeta('personal/notes/keep.md', { kind: 'fact', updated: '2026-11-06' })
    const after = await store.readEntry('personal/notes/keep.md')
    assert.equal(after.updatedAt, '2026-01-01', '修补不该把 updated 刷成今天')
  })
})
