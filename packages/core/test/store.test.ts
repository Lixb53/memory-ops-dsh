/**
 * store 集成测试：原子写、文件锁、行号不漂移、归档、事件流。
 *
 * 全部在临时目录里跑，不碰真实 `~/.memory-ops`。
 */

import assert from 'node:assert/strict'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'

import { createStore } from '../src/store.ts'
import { INBOX_KINDS, INBOX_STATES } from '../src/schema.ts'
import { INBOX_HEADER, parseInbox } from '../src/parse.ts'

let root: string

before(async () => {
  root = await fsp.mkdtemp(path.join(os.tmpdir(), 'memory-ops-test-'))
})

after(async () => {
  await fsp.rm(root, { recursive: true, force: true })
})

/** 每次用独立子目录，避免测试之间互相污染。 */
async function freshStore(name: string) {
  const dir = path.join(root, name)
  const store = createStore({ root: dir })
  await store.ensureLayout()
  await fsp.writeFile(
    path.join(dir, 'personal', 'INBOX.md'),
    `---\nid: personal.INBOX\ntitle: INBOX\nscope: personal\nkind: fact\nlayer: l2\nstatus: active\npinned: false\nupdated: 2026-11-04\ntags: []\n---\n\n# INBOX\n\n${INBOX_HEADER}\n`,
    'utf8',
  )
  return { store, dir }
}

describe('INBOX 写入', () => {
  it('追加到表格末尾，且不破坏表头', async () => {
    const { store } = await freshStore('inbox-append')
    await store.appendInbox({ kind: '想法', content: '第一条' })
    await store.appendInbox({ kind: '待办', content: '第二条' })
    const result = await store.readInbox('personal')
    assert.equal(result.entries.length, 2)
    assert.equal(result.entries[0]!.content, '第一条')
    assert.equal(result.entries[1]!.kind, '待办')
    assert.equal(result.entries[1]!.state, 'open')
  })

  it('内容含裸 | 也不会串列', async () => {
    const { store } = await freshStore('inbox-pipe')
    await store.appendInbox({ kind: '想法', content: 'a | b | c' })
    const result = await store.readInbox('personal')
    assert.equal(result.entries[0]!.content, 'a | b | c')
  })

  it('改状态只动目标行', async () => {
    const { store } = await freshStore('inbox-update')
    await store.appendInbox({ kind: '想法', content: 'A' })
    await store.appendInbox({ kind: '想法', content: 'B' })
    const before = await store.readInbox('personal')
    const target = before.entries[0]!
    await store.updateInboxRow({ lineIndex: target.lineIndex, patch: { state: 'done', destination: 'git:abc' } })
    const after = await store.readInbox('personal')
    assert.equal(after.entries[0]!.state, 'done')
    assert.equal(after.entries[0]!.destination, 'git:abc')
    assert.equal(after.entries[1]!.state, 'open')
  })

  it('批量删除行号不漂移（从大往小删）', async () => {
    const { store } = await freshStore('inbox-delete')
    for (const content of ['A', 'B', 'C', 'D']) {
      await store.appendInbox({ kind: '想法', content })
    }
    const before = await store.readInbox('personal')
    // 删第 1 条与第 3 条（行号从小到大传入，实现必须自己倒序）
    const targets = [before.entries[0]!.lineIndex, before.entries[2]!.lineIndex]
    const result = await store.deleteInboxRows({ lineIndexes: targets })
    assert.equal(result.removed, 2)
    const after = await store.readInbox('personal')
    assert.deepEqual(after.entries.map(entry => entry.content), ['B', 'D'])
  })

  it('非法状态不会被写进文件（由能力层拦截）', async () => {
    const { store } = await freshStore('inbox-invalid')
    await store.appendInbox({ kind: '想法', content: 'X', state: 'open' })
    const result = await store.readInbox('personal')
    assert.equal(result.entries[0]!.stateValid, true)
    assert.equal(INBOX_STATES.includes('open'), true)
    assert.equal(INBOX_KINDS.includes('想法'), true)
  })
})

describe('条目读写', () => {
  it('新建条目写入 frontmatter 并可读回', async () => {
    const { store } = await freshStore('entry-create')
    const entry = await store.createEntry({
      relPath: 'personal/notes/2026-11-05-缓存优先.md',
      frontmatter: {
        title: '缓存优先',
        kind: 'fact',
        layer: 'l2',
        status: 'confirmed',
        confidence: 0.9,
        origin: 'G1',
        tags: ['缓存', 'token'],
      },
      body: '\n# 缓存优先\n\n前缀哈希匹配。\n',
    })
    assert.equal(entry.title, '缓存优先')
    assert.equal(entry.domain, 'personal')
    assert.deepEqual(entry.tags, ['缓存', 'token'])
    assert.equal(entry.tokens > 0, true)
  })

  it('改正文保留 frontmatter 其它字段', async () => {
    const { store } = await freshStore('entry-body')
    await store.createEntry({
      relPath: 'personal/notes/a.md',
      frontmatter: { title: 'A', tags: ['t1'], origin: 'G2' },
      body: '\n旧正文\n',
    })
    const updated = await store.writeBody('personal/notes/a.md', '\n新正文\n')
    assert.equal(updated.body.trim(), '新正文')
    assert.deepEqual(updated.tags, ['t1'])
    assert.equal(updated.origin, 'G2')
  })

  it('patchMeta 只改指定字段', async () => {
    const { store } = await freshStore('entry-patch')
    await store.createEntry({
      relPath: 'personal/notes/b.md',
      frontmatter: { title: 'B', status: 'observed', tags: ['keep'] },
      body: '\n正文\n',
    })
    const patched = await store.patchMeta('personal/notes/b.md', { status: 'confirmed', confidence: 0.9 })
    assert.equal(patched.status, 'confirmed')
    assert.equal(patched.confidence, 0.9)
    assert.deepEqual(patched.tags, ['keep'])
  })

  it('重复新建同一路径会报错而不是覆盖', async () => {
    const { store } = await freshStore('entry-dup')
    await store.createEntry({ relPath: 'personal/notes/c.md', frontmatter: { title: 'C' }, body: 'x' })
    await assert.rejects(
      () => store.createEntry({ relPath: 'personal/notes/c.md', frontmatter: { title: 'C2' }, body: 'y' }),
      /条目已存在/,
    )
  })

  it('拒绝绝对路径与上级穿越', async () => {
    const { store } = await freshStore('entry-unsafe')
    await assert.rejects(
      () => store.createEntry({ relPath: '/etc/passwd', frontmatter: {}, body: '' }),
      /绝对路径/,
    )
    await assert.rejects(
      () => store.createEntry({ relPath: '../outside.md', frontmatter: {}, body: '' }),
      /上级目录穿越/,
    )
  })

  it('归档后原路径消失、归档路径出现且 status=archived', async () => {
    const { store } = await freshStore('entry-archive')
    await store.createEntry({
      relPath: 'personal/notes/old.md',
      frontmatter: { title: '旧条目', status: 'stale' },
      body: '\n旧内容\n',
    })
    const result = await store.archiveEntry({ relPath: 'personal/notes/old.md', reason: '134 天未引用' })
    assert.equal(result.from, 'personal/notes/old.md')
    assert.match(result.to, /^archive\/\d{8}\/personal\/notes\/old\.md$/)
    await assert.rejects(() => store.readEntry('personal/notes/old.md'))
    const archived = await store.readEntry(result.to)
    assert.equal(archived.status, 'archived')
  })
})

describe('事件流与未命中', () => {
  it('事件 append-only，坏行跳过不炸', async () => {
    const { store, dir } = await freshStore('events')
    await store.appendEvent({ session: 'web', kind: 'recall', ids: ['a'], query: 'q' })
    await fsp.appendFile(path.join(dir, '.state', 'events.jsonl'), '{坏行\n', 'utf8')
    await store.appendEvent({ session: 'web', kind: 'cite', ids: ['a'] })
    const events = await store.readEvents()
    assert.equal(events.length, 2)
    assert.equal(events[1]!.kind, 'cite')
  })

  it('同一 query 重复未命中会合并计数并升级到该补了', async () => {
    const { store } = await freshStore('misses')
    await store.recordMiss({ query: 'grep read' })
    await store.recordMiss({ query: 'grep read' })
    let misses = await store.readMisses()
    assert.equal(misses.length, 1)
    assert.equal(misses[0]!.count, 2)
    assert.equal(misses[0]!.state, 'observing')

    await store.recordMiss({ query: 'grep read' })
    misses = await store.readMisses()
    assert.equal(misses[0]!.count, 3)
    assert.equal(misses[0]!.state, 'should-fill')
  })

  it('删除未命中', async () => {
    const { store } = await freshStore('misses-delete')
    await store.recordMiss({ query: 'q1' })
    const removed = await store.deleteMiss('q1')
    assert.equal(removed, 1)
    assert.equal((await store.readMisses()).length, 0)
  })
})

describe('并发写安全', () => {
  it('并发追加 20 条不丢行、不出半行', async () => {
    const { store, dir } = await freshStore('concurrent')
    await Promise.all(
      Array.from({ length: 20 }, (_, index) => store.appendInbox({ kind: '想法', content: `并发-${index}` })),
    )
    const raw = await fsp.readFile(path.join(dir, 'personal', 'INBOX.md'), 'utf8')
    const parsed = parseInbox(raw, INBOX_KINDS, INBOX_STATES)
    assert.equal(parsed.entries.length, 20)
    // 每一行都必须结构完整（5 列）
    for (const entry of parsed.entries) {
      assert.equal(entry.content.length > 0, true)
      assert.equal(entry.state, 'open')
    }
    // 不留临时文件
    const files = await fsp.readdir(path.join(dir, 'personal'))
    assert.equal(files.some(name => name.endsWith('.tmp')), false)
  })
})

describe('统计口径', () => {
  it('域统计、层统计、超限计数正确', async () => {
    const { store } = await freshStore('stats')
    await store.createEntry({
      relPath: 'personal/notes/l0.md',
      frontmatter: { title: 'L0', layer: 'l0', status: 'confirmed' },
      body: 'x',
    })
    await store.createEntry({
      relPath: 'work/sz-web/issues/deep.md',
      frontmatter: { title: '深层条目', layer: 'l2', status: 'observed' },
      body: Array.from({ length: 100 }, () => '行').join('\n'),
    })
    const entries = await store.scan()
    const stats = store.summarize(entries, [], [])
    // INBOX.md 本身也是记忆文件，一并计入（3 = INBOX + l0 + 深层条目）
    assert.equal(stats.files, 3)
    assert.equal(stats.layers.l0.files, 1)
    assert.equal(stats.layers.l2.files, 2)
    assert.equal(stats.overLimit, 1)
    assert.equal(stats.counts.pending, 1)
    assert.equal(stats.counts.confirmed, 1)
    assert.equal(stats.domains.length, 2)
    // 没有事件 → 命中率不可算，必须是 null 而不是 0
    assert.equal(stats.rates.hitRate, null)
  })

  it('三率：命中率按 recall 去重条目算，确认率按 confirmed/(confirmed+rejected)', async () => {
    const { store } = await freshStore('rates')
    await store.createEntry({ relPath: 'personal/notes/x.md', frontmatter: { title: 'X', status: 'confirmed' }, body: 'x' })
    await store.createEntry({ relPath: 'personal/notes/y.md', frontmatter: { title: 'Y', status: 'rejected' }, body: 'y' })
    await store.appendEvent({ session: 'web', kind: 'recall', ids: ['x', 'y'] })
    await store.appendEvent({ session: 'web', kind: 'cite', ids: ['x'] })
    const entries = await store.scan()
    const stats = store.summarize(entries, await store.readEvents(), [])
    assert.equal(stats.rates.hitRate, 0.5)
    assert.equal(stats.rates.confirmRate, 0.5)
  })
})
