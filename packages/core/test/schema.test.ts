/**
 * 数据契约与解析的单元测试。
 *
 * 这些断言锁的是**不可随意改**的部分：INBOX 五列、类型枚举、状态机、
 * 转义规则、frontmatter 往返。改动这些就该让测试红，而不是让人肉 review 兜。
 */

import assert from 'node:assert/strict'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'

import { createStore } from '../src/store.ts'

import {
  INBOX_COLUMNS, INBOX_KINDS, INBOX_STATES, canHumanTransition, canTransition,
  estimateTokens, expiryOf, needsDecision, orEmpty, truncate,
} from '../src/schema.ts'
import {
  INBOX_HEADER, escapeCell, parseFrontmatter, parseInbox, parseInboxRow,
  serializeFrontmatter, serializeInboxRow, splitFrontmatter, splitTableRow,
} from '../src/parse.ts'

let root: string

before(async () => {
  root = await fsp.mkdtemp(path.join(os.tmpdir(), 'memory-ops-schema-'))
})

after(async () => {
  await fsp.rm(root, { recursive: true, force: true })
})

describe('schema 契约', () => {
  it('INBOX 五列顺序固定', () => {
    assert.deepEqual([...INBOX_COLUMNS], ['日期', '类型', '内容', '状态', '去向'])
  })

  it('类型枚举固定 5 个', () => {
    assert.deepEqual([...INBOX_KINDS], ['想法', '计划', '问题', '待办', '决策'])
  })

  it('状态机 open → todo → done / dropped', () => {
    assert.deepEqual([...INBOX_STATES], ['open', 'todo', 'done', 'dropped'])
  })

  it('空值统一为 —', () => {
    assert.equal(orEmpty(undefined), '—')
    assert.equal(orEmpty(''), '—')
    assert.equal(orEmpty('  '), '—')
    assert.equal(orEmpty('有值'), '有值')
  })

  it('截断按码点计，不劈开 CJK', () => {
    assert.equal(truncate('短', 46), '短')
    const long = '记'.repeat(60)
    const cut = truncate(long, 46)
    assert.equal([...cut].length, 46)
    assert.ok(cut.endsWith('…'))
  })
})

describe('状态机迁移', () => {
  /**
   * 自动爬升必须逐级：hypothesis 不能自己跳到 confirmed。
   * 这张表回答「系统能不能升它」，所以严格是对的。
   */
  it('自动爬升不能跳级（hypothesis 不能直接 confirmed）', () => {
    assert.equal(canTransition('hypothesis', 'confirmed'), false)
    assert.equal(canTransition('observed', 'confirmed'), false)
  })

  /**
   * 但**人**可以。
   *
   * 早先 UI 用自动表校验 setStatus，于是待处理队列里最常见的
   * hypothesis 条目一点「确认」就报「非法状态迁移」——
   * 而且总览入口连这句错误都不显示，用户看到的是「点了没反应」。
   */
  it('人可以直接确认 hypothesis / observed / stale', () => {
    for (const from of ['hypothesis', 'observed', 'reinforced', 'stale']) {
      assert.equal(canHumanTransition(from, 'confirmed'), true, `人确认 ${from} → confirmed`)
    }
  })

  it('人不许把已确认的降回 hypothesis（那是伪造历史）', () => {
    assert.equal(canHumanTransition('confirmed', 'hypothesis'), false)
    assert.equal(canHumanTransition('confirmed', 'observed'), false)
  })

  it('爬升通道：hypothesis → observed → reinforced → confirmed', () => {
    assert.equal(canTransition('hypothesis', 'observed'), true)
    assert.equal(canTransition('observed', 'reinforced'), true)
    assert.equal(canTransition('reinforced', 'confirmed'), true)
  })

  it('任意态可驳回，驳回可撤销', () => {
    for (const from of ['hypothesis', 'observed', 'reinforced', 'confirmed', 'stale']) {
      assert.equal(canTransition(from, 'rejected'), true, `${from} → rejected`)
    }
    assert.equal(canTransition('rejected', 'reinforced'), true)
  })

  it('同态迁移视为合法（幂等）', () => {
    assert.equal(canTransition('confirmed', 'confirmed'), true)
  })
})

describe('token 估算', () => {
  it('CJK 按 1 字 1 token，拉丁按 4 字符 1 token', () => {
    assert.equal(estimateTokens('记忆库'), 3)
    assert.equal(estimateTokens('abcd'), 1)
    assert.equal(estimateTokens(''), 0)
  })

  it('中英混排不低估', () => {
    const tokens = estimateTokens('记忆库 memory-ops')
    assert.ok(tokens >= 6, `实际 ${tokens}`)
  })
})

describe('frontmatter 解析', () => {
  it('标量、行内数组、块列表', () => {
    const meta = parseFrontmatter([
      'id: personal.INBOX',
      'title: INBOX',
      'pinned: false',
      'tags: [索引, sz-web]',
      'evidence:',
      '  - session: "2026-11-02T14:10 web"',
      '    excerpt: "先给结论"',
      '    gate: G2',
    ].join('\n'))
    assert.equal(meta.id, 'personal.INBOX')
    assert.deepEqual(meta.tags, ['索引', 'sz-web'])
    assert.equal(Array.isArray(meta.evidence), true)
    assert.deepEqual((meta.evidence as Record<string, string>[])[0], {
      session: '2026-11-02T14:10 web', excerpt: '先给结论', gate: 'G2',
    })
  })

  it('往返序列化保持语义', () => {
    const source = {
      id: 'work.sz-web.index',
      title: 'sz-web 索引',
      tags: ['索引', 'sz-web'],
      pinned: true,
      evidence: [{ session: 's1', excerpt: 'e1', gate: 'G2' }],
    }
    const round = parseFrontmatter(serializeFrontmatter(source).split('\n').slice(1, -1).join('\n'))
    assert.equal(round.id, source.id)
    assert.deepEqual(round.tags, source.tags)
    assert.equal(round.pinned, 'true')
    assert.deepEqual((round.evidence as Record<string, string>[])[0], source.evidence[0])
  })

  it('拆 frontmatter 与正文', () => {
    const { frontmatter, body } = splitFrontmatter('---\nid: a\n---\n\n# 标题\n正文\n')
    assert.equal(frontmatter.trim(), 'id: a')
    assert.equal(body.trim(), '# 标题\n正文')
  })

  it('无 frontmatter 时正文原样返回', () => {
    const { frontmatter, body } = splitFrontmatter('# 只有正文\n')
    assert.equal(frontmatter, '')
    assert.equal(body, '# 只有正文\n')
  })
})

describe('INBOX 表格', () => {
  it('裸 | 转义后不会被读成两列', () => {
    const row = serializeInboxRow({
      date: '2026-11-05', kind: '问题', content: 'a | b', state: 'open', destination: '—',
    })
    const cells = splitTableRow(row)
    assert.equal(cells.length, 5)
    assert.equal(cells[2], 'a | b')
  })

  it('内容里的换行压成空格', () => {
    assert.equal(escapeCell('第一行\n第二行'), '第一行 第二行')
  })

  it('表头与分隔行不算条目', () => {
    assert.equal(parseInboxRow(INBOX_HEADER.split('\n')[0]!), null)
    assert.equal(parseInboxRow(INBOX_HEADER.split('\n')[1]!), null)
  })

  it('解析真实格式的 INBOX 并带行号', () => {
    const source = [
      '---', 'id: personal.INBOX', 'title: INBOX', '---', '',
      '# INBOX', '', INBOX_HEADER,
      '| 2026-11-03 | 问题 | 记忆详情一直是加载中 | dropped | — |',
      '| 2026-11-04 | 待办 | 插件端能力补齐 | open | dsh-memory-plugin |',
    ].join('\n')
    const parsed = parseInbox(source, INBOX_KINDS, INBOX_STATES)
    assert.equal(parsed.entries.length, 2)
    assert.equal(parsed.entries[0]!.content, '记忆详情一直是加载中')
    assert.equal(parsed.entries[1]!.state, 'open')
    assert.equal(parsed.entries[0]!.kindValid, true)
    // 行号指向正文内的实际行，批量删除靠它
    assert.equal(parsed.lines[parsed.entries[0]!.lineIndex]!.includes('记忆详情'), true)
  })

  it('非法类型/状态被标记而不是丢弃', () => {
    const source = `${INBOX_HEADER}\n| 2026-11-05 | 随手写 | x | doing | — |`
    const parsed = parseInbox(source, INBOX_KINDS, INBOX_STATES)
    assert.equal(parsed.entries.length, 1)
    assert.equal(parsed.entries[0]!.kindValid, false)
    assert.equal(parsed.entries[0]!.stateValid, false)
  })
})

describe('到期与待办判定', () => {
  const DAY = 86_400_000
  const now = Date.parse('2026-11-05T00:00:00Z')

  it('90 天标灰，134 天待退役', () => {
    assert.equal(expiryOf({ updatedAt: new Date(now - 10 * DAY).toISOString() }, now).level, 'fresh')
    assert.equal(expiryOf({ updatedAt: new Date(now - 95 * DAY).toISOString() }, now).level, 'stale')
    assert.equal(expiryOf({ updatedAt: new Date(now - 140 * DAY).toISOString() }, now).level, 'retire')
  })

  it('最后引用时间优先于更新时间', () => {
    const entry = {
      updatedAt: new Date(now - 200 * DAY).toISOString(),
      lastCitedAt: new Date(now - 1 * DAY).toISOString(),
    }
    assert.equal(expiryOf(entry, now).level, 'fresh')
  })

  it('推断待确认进队列，已确认不进', () => {
    assert.equal(needsDecision({ status: 'hypothesis' }, now), true)
    assert.equal(needsDecision({ status: 'observed' }, now), true)
    assert.equal(needsDecision({ status: 'confirmed' }, now), false)
  })

  it('驳回静默 30 天内仍在队列，之后退出', () => {
    const recent = { status: 'rejected', refutedAt: new Date(now - 5 * DAY).toISOString() }
    const old = { status: 'rejected', refutedAt: new Date(now - 40 * DAY).toISOString() }
    assert.equal(needsDecision(recent, now), true)
    assert.equal(needsDecision(old, now), false)
  })
})

/**
 * frontmatter 块列表 —— 这类数据损坏最隐蔽：
 * 解析错误不会报错，只在「写回」时才把用户手写的内容毁掉。
 */
describe('frontmatter 块列表（写回不得毁数据）', () => {
  it('缩进块列表解析成字符串数组，不被合并', () => {
    const { frontmatter } = splitFrontmatter('---\ntags:\n  - 前端\n  - 性能\n---\n')
    const parsed = parseFrontmatter(frontmatter)
    // 早先会得到 [{ value: '前端 性能' }] —— 两个标签被拼成一个对象
    assert.deepEqual(parsed.tags, ['前端', '性能'])
  })

  it('零缩进块列表也不许丢（YAML 合法写法）', () => {
    const { frontmatter } = splitFrontmatter('---\ntags:\n- a\n- b\n---\n')
    const parsed = parseFrontmatter(frontmatter)
    // 早先会得到 []，写回时用户标签全部消失
    assert.deepEqual(parsed.tags, ['a', 'b'])
  })

  it('对象数组（evidence）仍能正确解析并支持多字段续行', () => {
    const { frontmatter } = splitFrontmatter(
      '---\nevidence:\n  - session: s1\n    excerpt: e1\n  - session: s2\n    excerpt: e2\n---\n',
    )
    const parsed = parseFrontmatter(frontmatter)
    assert.deepEqual(parsed.evidence, [
      { session: 's1', excerpt: 'e1' },
      { session: 's2', excerpt: 'e2' },
    ])
  })

  it('解析 → 序列化 → 再解析是稳定的（往返不漂移）', () => {
    const cases = [
      'tags:\n  - 前端\n  - 性能',
      'tags:\n- a\n- b',
      'tags: [a, b]',
      'tags: []',
      'evidence:\n  - session: s1\n    excerpt: e1',
    ]
    for (const body of cases) {
      const once = parseFrontmatter(body)
      const text = serializeFrontmatter(once as Record<string, unknown>)
      const twice = parseFrontmatter(splitFrontmatter(`${text}\n`).frontmatter)
      assert.deepEqual(twice, once, `往返漂移：${body}\n→ ${text}`)
    }
  })

  it('写回时手写标签不丢（真实破坏场景）', async () => {
    const store = createStore({ root: path.join(root, 'fm-tags') })
    await store.ensureLayout()
    await fsp.writeFile(
      path.join(root, 'fm-tags', 'personal', 'x.md'),
      '---\ntitle: X\ntags:\n  - 前端\n  - 性能\n---\n\n# X\n\n正文。\n',
      'utf8',
    )
    // 触发一次 frontmatter 写回（这正是 repairMeta / setStatus 走的路）
    await store.patchMeta('personal/x.md', { status: 'confirmed' })
    const entry = await store.readEntry('personal/x.md')
    assert.deepEqual(entry.tags, ['前端', '性能'], '写回后标签必须原样保留')
    assert.equal(entry.body.includes('正文。'), true, '正文不许被破坏')
  })
})
