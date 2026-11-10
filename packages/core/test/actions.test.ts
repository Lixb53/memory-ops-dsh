/**
 * 能力层测试：隐私闸门、状态机、未命中流水线、检索记账、导出。
 *
 * 这一层是「唯一实现」——host 路由与 agent 工具都调它，
 * 所以它的行为就是产品行为，必须在这里钉死。
 */

import assert from 'node:assert/strict'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'

import { createActions } from '../src/actions.ts'
import { createStore } from '../src/store.ts'
import { INBOX_HEADER } from '../src/parse.ts'

/** 测试用的最小结果类型（避免为断言引入完整返回类型）。 */
interface InboxData { entries: { lineIndex: number; content: string; state: string; destination: string }[]; throughput: { total: number } }
interface MissesData { total: number; pipeline: Record<string, unknown[]>; conversion: number | null; verifyDays: number }
interface OverviewData { kpi: Record<string, number | null>; budget: unknown[]; cacheNote: string; domains: unknown[]; rates: Record<string, number | null>; files: number; tokens: number }
interface HealthData { overLimit: number; lineLimit: number; silenced: unknown[]; stale: unknown[]; rates: Record<string, number | null>; counts: Record<string, number> }
interface SessionMemoryData { reasons: { why: string }[]; injected: number; cited: number; missed: number }
interface ExportData { filename: string; content: string; count: number }
interface SearchData { matched: boolean; hits: { path: string }[]; total: number; cost: number }

let root: string

before(async () => {
  root = await fsp.mkdtemp(path.join(os.tmpdir(), 'memory-ops-actions-'))
})

after(async () => {
  await fsp.rm(root, { recursive: true, force: true })
})

async function freshActions(name: string, now?: () => number) {
  const dir = path.join(root, name)
  const store = createStore({ root: dir, now })
  await store.ensureLayout()
  await fsp.writeFile(
    path.join(dir, 'personal', 'INBOX.md'),
    `---\nid: personal.INBOX\ntitle: INBOX\nlayer: l2\nstatus: active\n---\n\n# INBOX\n\n${INBOX_HEADER}\n`,
    'utf8',
  )
  return { actions: createActions({ store, now }), store, dir }
}

/** 断言成功分支并收窄类型（失败直接抛，避免后续属性访问变成 any）。 */
function assertOk<T>(result: unknown): T {
  const record = result as { ok?: boolean; error?: string }
  assert.equal(record?.ok, true, record?.error ?? '期望成功')
  return result as T
}

/** 断言失败分支并收窄类型。 */
function assertBlocked(result: { ok: boolean; blocked?: boolean; reason?: string; masked?: string; audit?: { findings: string[] } }) {
  assert.equal(result.ok, false)
  assert.equal(result.blocked, true)
  assert.match(result.reason ?? '', /敏感|密钥|私钥|IP/)
  return result
}

describe('隐私闸门', () => {
  it('密钥被拒写，并给出脱敏文本', async () => {
    const { actions } = await freshActions('privacy-key')
    const result = assertBlocked(await actions.capture({ content: '我的 key 是 sk-abcdefghijklmnopqrstuvwx 记得' }))
    assert.match(result.reason ?? '', /密钥/)
    assert.equal(result.masked?.includes('sk-abcdefghijklmnopqrstuvwx'), false)
  })

  it('私钥块被拒写', async () => {
    const { actions } = await freshActions('privacy-pem')
    const pem = '-----BEGIN RSA PRIVATE KEY-----\nMIIEow\n-----END RSA PRIVATE KEY-----'
    assertBlocked(await actions.capture({ content: pem }))
  })

  it('内网 IP 被拒写', async () => {
    const { actions } = await freshActions('privacy-ip')
    assertBlocked(await actions.capture({ content: '服务在 192.168.1.20:8080' }))
  })

  it('审计记录不含原文', async () => {
    const { actions } = await freshActions('privacy-audit')
    const secret = 'sk-abcdefghijklmnopqrstuvwx'
    const result = assertBlocked(await actions.capture({ content: `key: ${secret}` }))
    assert.equal((result.audit?.findings.length ?? 0) > 0, true)
    assert.equal(JSON.stringify(result.audit).includes(secret), false)
  })

  it('普通中文内容不误伤', async () => {
    const { actions } = await freshActions('privacy-clean')
    // 只需断言成功；返回体本身不参与后续检查
    assertOk(await actions.capture({ content: '今天想清楚一件事：先给结论，别铺垫' }))
  })

  it('改正文同样过闸门', async () => {
    const { actions, store } = await freshActions('privacy-body')
    await store.createEntry({ relPath: 'personal/notes/p.md', frontmatter: { title: 'P' }, body: 'x' })
    assertBlocked(await actions.writeBody({
      path: 'personal/notes/p.md',
      body: 'token: ghp_abcdefghijklmnopqrstuvwxyz0123',
    }))
  })
})

describe('记录流能力', () => {
  it('捕获后立刻出现在记录流', async () => {
    const { actions } = await freshActions('inbox-capture')
    await actions.capture({ content: '想法一条', kind: '想法' })
    const list = assertOk<InboxData>(await actions.inbox({ domain: 'personal' }))
    assert.equal(list.entries.length, 1)
    assert.equal(list.entries[0]!.content, '想法一条')
  })

  it('非法类型被拒', async () => {
    const { actions } = await freshActions('inbox-kind')
    const result = await actions.capture({ content: 'x', kind: '随笔' })
    assert.equal(result.ok, false)
    assert.match(result.error ?? '', /类型必须是/)
  })

  it('批量捕获按换行拆条', async () => {
    const { actions } = await freshActions('inbox-batch')
    const result = assertOk<{ accepted?: string[] }>(await actions.captureBatch({ text: '第一条\n第二条\n第三条' }))
    assert.equal(result.accepted?.length, 3)
  })

  it('批量捕获里被闸门拦下的单独列出', async () => {
    const { actions } = await freshActions('inbox-batch-blocked')
    const result = await actions.captureBatch({ text: '正常一条\nsk-abcdefghijklmnopqrstuvwx' })
    assert.equal(result.accepted?.length, 1)
    assert.equal(result.blocked?.length, 1)
  })

  it('批量改状态', async () => {
    const { actions } = await freshActions('inbox-batch-state')
    await actions.captureBatch({ text: 'A\nB' })
    const list = assertOk<InboxData>(await actions.inbox({ domain: 'personal' }))
    const indexes = list.entries.map(entry => entry.lineIndex)
    const result = await actions.batchInboxState({ lineIndexes: indexes, state: 'done' })
    assert.equal(result.ok, true)
    const after = assertOk<InboxData>(await actions.inbox({ domain: 'personal' }))
    assert.equal(after.entries.every(entry => entry.state === 'done'), true)
  })

  it('提升到档案：新建条目并把 INBOX 标 done + 去向', async () => {
    const { actions, store } = await freshActions('inbox-promote')
    await actions.capture({ content: '值得沉淀的结论', kind: '决策' })
    const list = assertOk<InboxData>(await actions.inbox({ domain: 'personal' }))
    const lineIndex = list.entries[0]!.lineIndex
    const result = await actions.promoteInbox({
      lineIndex, target: 'personal/notes/沉淀.md',
    })
    assert.equal(result.ok, true)
    const entry = await store.readEntry('personal/notes/沉淀.md')
    assert.equal(entry.status, 'confirmed')
    const after = assertOk<InboxData>(await actions.inbox({ domain: 'personal' }))
    assert.equal(after.entries[0]!.state, 'done')
    assert.equal(after.entries[0]!.destination, 'personal/notes/沉淀.md')
  })
})

describe('状态机与证据', () => {
  it('驳回必须写理由', async () => {
    const { actions, store } = await freshActions('status-reject-empty')
    await store.createEntry({
      relPath: 'personal/patterns.md',
      frontmatter: { title: '推断', status: 'hypothesis' },
      body: 'x',
    })
    const result = await actions.reject({ path: 'personal/patterns.md', reason: '   ' })
    assert.equal(result.ok, false)
    assert.match(result.error ?? '', /驳回必须写一句理由/)
  })

  it('驳回后进入 30 天静默并可撤销', async () => {
    const { actions, store } = await freshActions('status-reject')
    await store.createEntry({
      relPath: 'personal/patterns.md',
      frontmatter: { title: '推断', status: 'hypothesis' },
      body: 'x',
    })
    assertOk(await actions.reject({ path: 'personal/patterns.md', reason: '不是这样' }))
    const entry = await store.readEntry('personal/patterns.md')
    assert.equal(entry.status, 'rejected')
    assert.equal(entry.refutedReason, '不是这样')

    assertOk(await actions.undoReject({ path: 'personal/patterns.md' }))
    assert.equal((await store.readEntry('personal/patterns.md')).status, 'reinforced')
  })

  /**
   * 这条曾经断言「hypothesis → confirmed 必须失败」——而那正是 bug 本身。
   *
   * 待处理队列里 hypothesis 是最常见的一类（manual.md：库里 2 条待拍板、
   * 全是推断待确认），所以那个断言等价于「确认按钮永远不该能用」。
   * 现在反过来：走 UI 的 `confirm` 必须成功。
   */
  it('人确认 hypothesis 直接成功（这是界面「确认」按钮的实现）', async () => {
    const { actions, store } = await freshActions('status-confirm-hypothesis')
    await store.createEntry({
      relPath: 'personal/p.md',
      frontmatter: { title: 'P', status: 'hypothesis' },
      body: 'x',
    })
    const result = await actions.confirm({ path: 'personal/p.md' })
    assert.equal(result.ok, true, (result as { error?: string }).error)
    const entry = await store.readEntry('personal/p.md')
    assert.equal(entry.status, 'confirmed')
    assert.equal(entry.confidence, 0.9)
  })

  it('人确认 observed 也成功，stale 复核通过同样成功', async () => {
    for (const status of ['observed', 'stale']) {
      const { actions, store } = await freshActions(`status-confirm-${status}`)
      await store.createEntry({
        relPath: 'personal/p.md',
        frontmatter: { title: 'P', status },
        body: 'x',
      })
      const result = await actions.confirm({ path: 'personal/p.md' })
      assert.equal(result.ok, true, `${status} 确认失败：${(result as { error?: string }).error}`)
    }
  })

  it('非法迁移仍被拒（人也不能把 confirmed 降回 hypothesis）', async () => {
    const { actions, store } = await freshActions('status-illegal')
    await store.createEntry({
      relPath: 'personal/p.md',
      frontmatter: { title: 'P', status: 'confirmed' },
      body: 'x',
    })
    const result = await actions.setStatus({ path: 'personal/p.md', status: 'hypothesis' })
    assert.equal(result.ok, false)
    assert.match(result.error ?? '', /非法状态迁移/)
  })

  it('确认后置信度升到 0.9', async () => {
    const { actions, store } = await freshActions('status-confirm')
    await store.createEntry({
      relPath: 'personal/p.md',
      frontmatter: { title: 'P', status: 'reinforced' },
      body: 'x',
    })
    await actions.confirm({ path: 'personal/p.md' })
    const entry = await store.readEntry('personal/p.md')
    assert.equal(entry.status, 'confirmed')
    assert.equal(entry.confidence, 0.9)
  })
})

describe('检索记账', () => {
  it('命中记 recall，未命中记 miss', async () => {
    const { actions, store } = await freshActions('search-record')
    await store.createEntry({
      relPath: 'work/sz-web/issues/面板假空态.md',
      frontmatter: { title: '记忆面板假空态', layer: 'l2', tags: ['DSH', 'cwd'] },
      body: '\nDSH 槽位不下发 cwd，面板拿不到项目上下文。\n',
    })
    const hit = assertOk<SearchData>(await actions.search({ query: '假空态' }))
    assert.equal(hit.matched, true)
    assert.equal(hit.hits[0]!.path, 'work/sz-web/issues/面板假空态.md')

    const events = await store.readEvents()
    assert.equal(events.some(event => event.kind === 'recall'), true)

    const miss = assertOk<SearchData>(await actions.search({ query: '从来没记过的词' }))
    assert.equal(miss.matched, false)
    assert.equal((await store.readMisses()).length, 1)
  })

  it('只读检索不记账', async () => {
    const { actions, store } = await freshActions('search-quiet')
    await actions.search({ query: '不存在', record: false })
    assert.equal((await store.readMisses()).length, 0)
  })

  it('项目过滤生效', async () => {
    const { actions, store } = await freshActions('search-project')
    await store.createEntry({ relPath: 'work/a/x.md', frontmatter: { title: '甲项目坑' }, body: '甲' })
    await store.createEntry({ relPath: 'work/b/y.md', frontmatter: { title: '乙项目坑' }, body: '乙' })
    const result = assertOk<SearchData>(await actions.search({ query: '项目坑', project: 'a' }))
    assert.equal(result.hits.length, 1)
    assert.equal(result.hits[0]!.path, 'work/a/x.md')
  })
})

describe('未命中流水线', () => {
  it('五态推进：观察中 → 该补了 → 草稿待确认 → 验证期内', async () => {
    const { actions, store } = await freshActions('miss-pipeline')
    await store.recordMiss({ query: 'grep read' })
    await store.recordMiss({ query: 'grep read' })
    await store.recordMiss({ query: 'grep read' })

    let board = assertOk<MissesData>(await actions.misses())
    assert.equal(board.pipeline['should-fill'].length, 1)

    assertOk(await actions.missDraft({ query: 'grep read', type: '问题' }))
    board = assertOk<MissesData>(await actions.misses())
    assert.equal(board.pipeline.drafting.length, 1)

    const confirmed = assertOk<{ entry: { path: string } }>(await actions.missConfirm({
      query: 'grep read',
      content: 'grep 读大文件要用 -m 限制匹配数，否则结果集爆炸。',
    }))
    board = assertOk<MissesData>(await actions.misses())
    assert.equal(board.pipeline.verifying.length, 1)

    // 草稿落库时是 observed（待验证），不是 confirmed
    const entry = await store.readEntry(confirmed.entry.path)
    assert.equal(entry.status, 'observed')
    assert.equal(entry.origin, 'G2')
    assert.equal(entry.evidence.length, 1)
  })

  it('草稿确认时同样过隐私闸门', async () => {
    const { actions, store } = await freshActions('miss-privacy')
    await store.recordMiss({ query: 'q' })
    assertBlocked(await actions.missConfirm({ query: 'q', content: 'token: ghp_abcdefghijklmnopqrstuvwxyz0123' }))
  })

  it('批量生成草稿', async () => {
    const { actions, store } = await freshActions('miss-batch')
    await store.recordMiss({ query: 'q1' })
    await store.recordMiss({ query: 'q2' })
    const result = await actions.missBatchDraft({ queries: ['q1', 'q2'] })
    assert.equal(result.drafts.length, 2)
  })
})

describe('统计与导出', () => {
  it('总览给出 KPI、预算三段与三率', async () => {
    const { actions, store } = await freshActions('overview')
    await store.createEntry({
      relPath: 'personal/index.md',
      frontmatter: { title: '索引', layer: 'l0', status: 'confirmed' },
      body: 'x',
    })
    const result = assertOk<OverviewData>(await actions.overview())
    // L0 常驻前缀 / L1 索引层 / L2 详情层 / L0* 索引文件合计（易混数字单列）
    assert.equal(result.budget.length, 4)
    assert.equal((result.kpi.residentBudget ?? 0) > 0, true)
    assert.equal(result.cacheNote.includes('KV cache'), true)
  })

  it('项目视图的统计只算该项目（不是全库）', async () => {
    const { actions, store } = await freshActions('scoped-stats')
    // 两个项目各有 l0 索引
    await store.createEntry({
      relPath: 'work/alpha/index.md',
      frontmatter: { title: 'alpha 索引', layer: 'l0' },
      body: '\n# alpha\n',
    })
    await store.createEntry({
      relPath: 'work/beta/index.md',
      frontmatter: { title: 'beta 索引', layer: 'l0' },
      body: '\n# beta 索引内容更长一些以拉开差距\n',
    })
    await store.createEntry({
      relPath: 'work/alpha/issues/a.md',
      frontmatter: { title: 'alpha 的坑', layer: 'l2' },
      body: '\n坑\n',
    })

    const alpha = assertOk<{ stats: { layers: { l0: { tokens: number } } }; statsScope: string; projectIndex: { path: string }[]; entries: unknown[] }>(
      await actions.snapshot({ project: 'alpha' }),
    )
    const beta = assertOk<typeof alpha>(await actions.snapshot({ project: 'beta' }))
    const all = assertOk<typeof alpha>(await actions.snapshot())

    // 口径标记
    assert.equal(alpha.statsScope, 'scoped')
    assert.equal(all.statsScope, 'all')

    // 各项目只算自己的 l0
    assert.equal(alpha.stats.layers.l0.tokens > 0, true)
    assert.equal(beta.stats.layers.l0.tokens > 0, true)
    assert.equal(all.stats.layers.l0.tokens, alpha.stats.layers.l0.tokens + beta.stats.layers.l0.tokens)

    // projectIndex 只含本项目的索引文件
    assert.deepEqual(alpha.projectIndex.map(item => item.path), ['work/alpha/index.md'])
    assert.deepEqual(beta.projectIndex.map(item => item.path), ['work/beta/index.md'])
  })

  it('项目里没有任何记忆时，索引为 0（不是显示全库的 286）', async () => {
    const { actions, store } = await freshActions('scoped-empty')
    await store.createEntry({
      relPath: 'work/other/index.md',
      frontmatter: { title: '别的项目', layer: 'l0' },
      body: '\n# x\n',
    })
    const result = assertOk<{ stats: { layers: { l0: { tokens: number } } }; entries: unknown[]; projectIndex: unknown[] }>(
      await actions.snapshot({ project: 'empty-project' }),
    )
    assert.equal(result.entries.length, 0)
    assert.equal(result.stats.layers.l0.tokens, 0)
    assert.equal(result.projectIndex.length, 0)
  })

  it('待处理队列也跟着项目过滤', async () => {
    const { actions, store } = await freshActions('scoped-queue')
    await store.createEntry({
      relPath: 'work/alpha/p.md',
      frontmatter: { title: 'alpha 待确认', status: 'hypothesis' },
      body: 'x',
    })
    await store.createEntry({
      relPath: 'work/beta/p.md',
      frontmatter: { title: 'beta 待确认', status: 'hypothesis' },
      body: 'y',
    })
    const alpha = assertOk<{ queue: { path: string }[] }>(await actions.snapshot({ project: 'alpha' }))
    assert.equal(alpha.queue.length, 1)
    assert.equal(alpha.queue[0]!.path, 'work/alpha/p.md')
  })

  it('常驻前缀拆成「每请求付费」与「按需加载」两栏', async () => {
    const { actions, store } = await freshActions('resident')
    await store.createEntry({
      relPath: 'personal/index.md',
      frontmatter: { title: '个人索引', layer: 'l0' },
      body: '\n# 索引\n',
    })
    const result = assertOk<OverviewData & {
      resident: {
        catalogTokens: number; indexTokens: number; frameTokens: number
        billedTokens: number; onDemandTokens: number
        items: { kind: string; billed: boolean }[]
      }
    }>(await actions.overview({
      skillDescriptions: [
        { name: 'personal-memory', path: '/x/SKILL.md', description: '读我的个人画像时使用', descriptionTokens: 12 },
      ],
    }))
    // catalog（skill description）是每请求付费的部分
    assert.equal(result.resident.catalogTokens, 12)
    assert.equal(result.resident.billedTokens, 12 + result.resident.frameTokens)
    // l0 索引文件按需加载，不计入每请求付费
    assert.equal(result.resident.indexTokens > 0, true)
    assert.equal(result.resident.onDemandTokens, result.resident.indexTokens)
    // 两类都要在 items 里出现，且 billed 标记正确
    const catalog = result.resident.items.filter(item => item.kind === 'catalog')
    const index = result.resident.items.filter(item => item.kind === 'index')
    assert.equal(catalog.length, 1)
    assert.equal(catalog[0]!.billed, true)
    assert.equal(index.length, 1)
    assert.equal(index[0]!.billed, false)
  })

  it('没有 skill 时 catalog 为 0，但框架开销仍计入', async () => {
    const { actions } = await freshActions('resident-empty')
    const result = assertOk<{ resident: { catalogTokens: number; billedTokens: number; frameTokens: number } }>(
      await actions.overview(),
    )
    assert.equal(result.resident.catalogTokens, 0)
    assert.equal(result.resident.billedTokens, result.resident.frameTokens)
  })

  it('导出 markdown 与 json，按域过滤', async () => {
    const { actions, store } = await freshActions('export')
    await store.createEntry({ relPath: 'personal/a.md', frontmatter: { title: '甲' }, body: '甲内容' })
    await store.createEntry({ relPath: 'work/sz-web/b.md', frontmatter: { title: '乙' }, body: '乙内容' })

    const md = assertOk<ExportData>(await actions.export({ format: 'markdown', domain: 'personal' }))
    assert.match(md.filename, /^memory-ops-personal-.*\.md$/)
    assert.equal(md.content.includes('甲内容'), true)
    assert.equal(md.content.includes('乙内容'), false)

    const json = assertOk<ExportData>(await actions.export({ format: 'json' }))
    const parsed = JSON.parse(json.content) as unknown[]
    assert.equal(parsed.length > 0, true)
  })

  it('库健康报告驳回静默与超限', async () => {
    const { actions, store } = await freshActions('health')
    await store.createEntry({
      relPath: 'personal/long.md',
      frontmatter: { title: '超长' },
      body: Array.from({ length: 100 }, () => '行').join('\n'),
    })
    const result = assertOk<HealthData>(await actions.health())
    assert.equal(result.overLimit, 1)
    assert.equal(result.lineLimit, 80)
  })

  it('会话记忆给出「为什么注入」', async () => {
    const { actions, store } = await freshActions('session-memory')
    await store.createEntry({
      relPath: 'work/sz-web/issues/x.md',
      frontmatter: { title: '缓存失效', tags: ['cache'] },
      body: '前缀变更作废缓存。',
    })
    const result = assertOk<SessionMemoryData>(await actions.sessionMemory({ query: '缓存', project: 'sz-web' }))
    assert.equal(result.reasons.length, 1)
    assert.match(result.reasons[0]!.why, /关键词命中/)
  })
})
