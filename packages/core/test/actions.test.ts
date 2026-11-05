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

describe('隐私闸门', () => {
  it('密钥被拒写，并给出脱敏文本', async () => {
    const { actions } = await freshActions('privacy-key')
    const result = await actions.capture({ content: '我的 key 是 sk-abcdefghijklmnopqrstuvwx 记得' })
    assert.equal(result.ok, false)
    assert.equal(result.blocked, true)
    assert.match(result.reason ?? '', /密钥/)
    assert.equal(result.masked?.includes('sk-abcdefghijklmnopqrstuvwx'), false)
  })

  it('私钥块被拒写', async () => {
    const { actions } = await freshActions('privacy-pem')
    const pem = '-----BEGIN RSA PRIVATE KEY-----\nMIIEow\n-----END RSA PRIVATE KEY-----'
    const result = await actions.capture({ content: pem })
    assert.equal(result.blocked, true)
  })

  it('内网 IP 被拒写', async () => {
    const { actions } = await freshActions('privacy-ip')
    const result = await actions.capture({ content: '服务在 192.168.1.20:8080' })
    assert.equal(result.blocked, true)
  })

  it('审计记录不含原文', async () => {
    const { actions } = await freshActions('privacy-audit')
    const secret = 'sk-abcdefghijklmnopqrstuvwx'
    const result = await actions.capture({ content: `key: ${secret}` })
    assert.equal(result.audit?.findings.length! > 0, true)
    assert.equal(JSON.stringify(result.audit).includes(secret), false)
  })

  it('普通中文内容不误伤', async () => {
    const { actions } = await freshActions('privacy-clean')
    const result = await actions.capture({ content: '今天想清楚一件事：先给结论，别铺垫' })
    assert.equal(result.ok, true)
  })

  it('改正文同样过闸门', async () => {
    const { actions, store } = await freshActions('privacy-body')
    await store.createEntry({ relPath: 'personal/notes/p.md', frontmatter: { title: 'P' }, body: 'x' })
    const result = await actions.writeBody({
      path: 'personal/notes/p.md',
      body: 'token: ghp_abcdefghijklmnopqrstuvwxyz0123',
    })
    assert.equal(result.ok, false)
    assert.equal(result.blocked, true)
  })
})

describe('记录流能力', () => {
  it('捕获后立刻出现在记录流', async () => {
    const { actions } = await freshActions('inbox-capture')
    await actions.capture({ content: '想法一条', kind: '想法' })
    const list = await actions.inbox({ domain: 'personal' })
    assert.equal(list.ok, true)
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
    const result = await actions.captureBatch({ text: '第一条\n第二条\n第三条' })
    assert.equal(result.ok, true)
    assert.equal(result.accepted.length, 3)
  })

  it('批量捕获里被闸门拦下的单独列出', async () => {
    const { actions } = await freshActions('inbox-batch-blocked')
    const result = await actions.captureBatch({ text: '正常一条\nsk-abcdefghijklmnopqrstuvwx' })
    assert.equal(result.accepted.length, 1)
    assert.equal(result.blocked.length, 1)
  })

  it('批量改状态', async () => {
    const { actions, store } = await freshActions('inbox-batch-state')
    await actions.captureBatch({ text: 'A\nB' })
    const list = await actions.inbox({ domain: 'personal' })
    const indexes = list.entries.map(entry => entry.lineIndex)
    const result = await actions.batchInboxState({ lineIndexes: indexes, state: 'done' })
    assert.equal(result.updated.length, 2)
    const after = await actions.inbox({ domain: 'personal' })
    assert.equal(after.entries.every(entry => entry.state === 'done'), true)
  })

  it('提升到档案：新建条目并把 INBOX 标 done + 去向', async () => {
    const { actions, store } = await freshActions('inbox-promote')
    await actions.capture({ content: '值得沉淀的结论', kind: '决策' })
    const list = await actions.inbox({ domain: 'personal' })
    const lineIndex = list.entries[0]!.lineIndex
    const result = await actions.promoteInbox({
      lineIndex, target: 'personal/notes/沉淀.md',
    })
    assert.equal(result.ok, true)
    const entry = await store.readEntry('personal/notes/沉淀.md')
    assert.equal(entry.status, 'confirmed')
    const after = await actions.inbox({ domain: 'personal' })
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
    const rejected = await actions.reject({ path: 'personal/patterns.md', reason: '不是这样' })
    assert.equal(rejected.ok, true)
    const entry = await store.readEntry('personal/patterns.md')
    assert.equal(entry.status, 'rejected')
    assert.equal(entry.refutedReason, '不是这样')

    const undone = await actions.undoReject({ path: 'personal/patterns.md' })
    assert.equal(undone.ok, true)
    assert.equal((await store.readEntry('personal/patterns.md')).status, 'reinforced')
  })

  it('非法迁移被拒（hypothesis 不能直接 confirmed）', async () => {
    const { actions, store } = await freshActions('status-illegal')
    await store.createEntry({
      relPath: 'personal/p.md',
      frontmatter: { title: 'P', status: 'hypothesis' },
      body: 'x',
    })
    const result = await actions.setStatus({ path: 'personal/p.md', status: 'confirmed' })
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
    const hit = await actions.search({ query: '假空态' })
    assert.equal(hit.ok, true)
    assert.equal(hit.matched, true)
    assert.equal(hit.hits[0]!.path, 'work/sz-web/issues/面板假空态.md')

    const events = await store.readEvents()
    assert.equal(events.some(event => event.kind === 'recall'), true)

    const miss = await actions.search({ query: '从来没记过的词' })
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
    const result = await actions.search({ query: '项目坑', project: 'a' })
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

    let board = await actions.misses()
    assert.equal(board.pipeline['should-fill'].length, 1)

    const draft = await actions.missDraft({ query: 'grep read', type: '问题' })
    assert.equal(draft.ok, true)
    board = await actions.misses()
    assert.equal(board.pipeline.drafting.length, 1)

    const confirmed = await actions.missConfirm({
      query: 'grep read',
      content: 'grep 读大文件要用 -m 限制匹配数，否则结果集爆炸。',
    })
    assert.equal(confirmed.ok, true)
    board = await actions.misses()
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
    const result = await actions.missConfirm({ query: 'q', content: 'token: ghp_abcdefghijklmnopqrstuvwxyz0123' })
    assert.equal(result.ok, false)
    assert.equal(result.blocked, true)
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
    const result = await actions.overview()
    assert.equal(result.ok, true)
    assert.equal(result.budget.length, 3)
    assert.equal(result.kpi.residentBudget > 0, true)
    assert.equal(result.cacheNote.includes('KV cache'), true)
  })

  it('导出 markdown 与 json，按域过滤', async () => {
    const { actions, store } = await freshActions('export')
    await store.createEntry({ relPath: 'personal/a.md', frontmatter: { title: '甲' }, body: '甲内容' })
    await store.createEntry({ relPath: 'work/sz-web/b.md', frontmatter: { title: '乙' }, body: '乙内容' })

    const md = await actions.export({ format: 'markdown', domain: 'personal' })
    assert.equal(md.ok, true)
    assert.match(md.filename, /^memory-ops-personal-.*\.md$/)
    assert.equal(md.content.includes('甲内容'), true)
    assert.equal(md.content.includes('乙内容'), false)

    const json = await actions.export({ format: 'json' })
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
    const result = await actions.health()
    assert.equal(result.ok, true)
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
    const result = await actions.sessionMemory({ query: '缓存', project: 'sz-web' })
    assert.equal(result.ok, true)
    assert.equal(result.reasons.length, 1)
    assert.match(result.reasons[0]!.why, /关键词命中/)
  })
})
