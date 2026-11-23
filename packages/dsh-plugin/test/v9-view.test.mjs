/**
 * v9 视图模型单测 —— 顶条读数、判定句、三段台账、四桶口径。
 *
 * ## 为什么这些必须单测
 *
 * 原型 v9 把「T0 只给数字」「判定句 ≤20 字」「四桶之和 = 合计」写成硬规则，
 * 并且用 lint / 量测脚本卡住。插件端没有 lint 脚本，规则如果只写在注释里，
 * 下一次改动就会悄悄破坏它（v4→v6 之间「顶条 8、中栏 5」就是这么来的）。
 *
 * 这里逐条断言，输入包含**极端值**（四位数、空库、读不到），因为顶条折行
 * 与「0 冒充读不到」都只在极端值上出现。
 */

import assert from 'node:assert/strict'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const LOGIC = await import('../lib/client-logic.mjs')

const {
  PANES, LEDE_MAX, bandFigureFor, bandNoteFor, bucketsOf, clip, cluesOf, countsOf,
  countDisplay, countFor, estimateTokens, figureFor, ledeFor, memoryEntries, memoryRowsOf,
  statusLabelOf, statusRightOf, todoSectionsOf, todayKey, versionInfoOf, PLUGIN_VERSION,
} = LOGIC

/**
 * 日期夹具必须相对「今天」生成。
 *
 * 早先写死 2026-11-21：在别的日子跑，「今天已记」永远是 0，测试会红在
 * 与代码无关的地方。日期是运行时输入，夹具就不能当常量。
 */
const TODAY = todayKey()
const THREE_DAYS_AGO = todayKey(new Date(Date.now() - 3 * 86_400_000))

/* ============================================================
 * 测试夹具：与 bridge 返回同形（字段裁剪到本文件用到的部分）
 * ============================================================ */

function entry(id, over = {}) {
  return {
    id,
    path: over.path ?? `personal/${id}.md`,
    title: over.title ?? `标题 ${id}`,
    domain: over.domain ?? 'personal',
    domainLabel: over.domainLabel ?? '个人域',
    project: null,
    layer: over.layer ?? 'l2',
    status: over.status ?? 'confirmed',
    confidence: 0.9,
    kind: 'fact',
    tags: [],
    tokens: over.tokens ?? 30,
    bytes: 100,
    lines: over.lines ?? 20,
    overLineLimit: false,
    pinned: over.pinned ?? false,
    updatedAt: '2026-11-19',
    origin: 'G1',
    evidence: over.evidence ?? [{ excerpt: '你在 3 个会话里要求过' }],
    anchor: { state: over.anchorState ?? 'fresh' },
    expiry: { level: over.level ?? 'fresh', days: 2 },
    citeCount: over.citeCount ?? 0,
  }
}

const snapshot = {
  root: 'C:\\Users\\x\\.memory-ops',
  statsScope: 'all',
  projectIndex: [],
  resolution: null,
  knownProjects: [],
  projectScoped: false,
  project: null,
  domain: null,
  entries: [
    entry('personal.principles', { pinned: true, tokens: 113 }),
    entry('personal.INBOX', { title: 'INBOX', tokens: 180 }),
    entry('work.x.INBOX', { title: 'INBOX', tokens: 368, domain: 'work/x', domainLabel: '工作域 · x' }),
    entry('decisions.codegraph', { tokens: 1000, status: 'observed', citeCount: 2 }),
    entry('personal.stale-one', { tokens: 90, level: 'stale', status: 'stale', citeCount: 0 }),
  ],
  stats: {
    files: 5,
    bytes: 1,
    tokens: 1751,
    overLimit: 1,
    domains: [],
    layers: { l0: { files: 0, tokens: 0 }, l1: { files: 0, tokens: 0 }, l2: { files: 5, tokens: 1751 } },
    rates: { hitRate: 0, confirmRate: 1, expireRate: 0, missRate: 0 },
    misses: { total: 18, verified: 0 },
    counts: { pending: 2, confirmed: 2, rejected: 0, stale: 1, archived: 0 },
    expiry: [],
  },
  queue: [
    { id: 'q1', path: 'personal/notes/a.md', title: '推断 A', domain: 'personal', domainLabel: '个人域', status: 'observed', confidence: 0.5, kind: 'confirm', evidence: [], origin: 'G2', days: 2, reason: '推断待确认' },
    { id: 'q2', path: 'personal/notes/b.md', title: '推断 B', domain: 'personal', domainLabel: '个人域', status: 'observed', confidence: 0.5, kind: 'confirm', evidence: [], origin: 'G2', days: 5, reason: '推断待确认' },
  ],
  generatedAt: '2026-11-21',
}

const overview = {
  kpi: { residentTokens: 652, indexTokens: 0, residentBudget: 1024, hitRate: 0, confirmRate: 1, expireRate: 0, pending: 2 },
  resident: {
    items: [
      { kind: 'catalog', id: 'skill.office', path: '', title: 'office', tokens: 47, bytes: 1, lines: 1, overLineLimit: false, billed: true, note: '' },
      { kind: 'injected', id: 'injected.pinned', path: '', title: '置顶条目注入', tokens: 58, bytes: 0, lines: 0, overLineLimit: false, billed: true, note: '' },
    ],
    catalogTokens: 423,
    injectedTokens: 58,
    indexTokens: 0,
    frameTokens: 171,
    billedTokens: 652,
    onDemandTokens: 0,
    state: 'ok',
    error: '',
  },
  budget: [],
  domains: [],
  rates: { hitRate: 0, confirmRate: 1, expireRate: 0, missRate: 0 },
  counts: { pending: 2, confirmed: 2, rejected: 0, stale: 1, archived: 0 },
  misses: { total: 18, verified: 0 },
  files: 5,
  bytes: 1,
  tokens: 1751,
  overLimit: 1,
  cacheNote: '',
}

const inbox = {
  path: 'personal/INBOX.md',
  exists: true,
  entries: [
    { date: THREE_DAYS_AGO, kind: '决策', content: '旧的一条', state: 'done', destination: '', kindValid: true, stateValid: true, lineIndex: 4, index: 0 },
    { date: TODAY, kind: '问题', content: '今天的一条', state: 'open', destination: '', kindValid: true, stateValid: true, lineIndex: 5, index: 1 },
  ],
  throughput: { total: 2, open: 1, todo: 0, done: 1, dropped: 0, toPromote: 0, invalidKind: 0, invalidState: 0 },
  kinds: [],
  states: [],
}

const misses = {
  pipeline: {
    'should-fill': [{ query: 'grep 读不到文件', count: 3, at: '', lastAt: '2026-11-20', state: 'should-fill', drafts: [], wastedTokens: 0, sessions: 2, hits: 3, remainingDays: null, draftPath: null }],
    observing: [{ query: '只在一次会话里出现过', count: 1, at: '', lastAt: '2026-11-19', state: 'observing', drafts: [], wastedTokens: 0, sessions: 1, hits: 1, remainingDays: 6, draftPath: null }],
    drafting: [],
    verifying: [],
    verified: [],
  },
  counts: { observing: 1, 'should-fill': 1, drafting: 0, verifying: 0, verified: 0 },
  total: 2,
  conversion: 0,
  verifyDays: 7,
  fillThreshold: 3,
}

const data = { snapshot, overview, inbox, misses }
const counts = countsOf(data)

/* ============================================================
 * 口径
 * ============================================================ */

describe('token 估算与 core 同口径', () => {
  it('具体值：CJK 1 字 1 token，其余 4 字符 1 token，向上取整', () => {
    assert.equal(estimateTokens(''), 0)
    assert.equal(estimateTokens('abcd'), 1)
    assert.equal(estimateTokens('abcde'), 2)
    assert.equal(estimateTokens('你好'), 2)
    assert.equal(estimateTokens('a你'), 2)
    assert.equal(estimateTokens('所有会话的思考过程和结果全都使用中文'), 18)
  })
})

describe('计数口径', () => {
  it('记忆条目不含 INBOX（记录流另计）', () => {
    assert.equal(memoryEntries(snapshot).length, 3, '5 条里去掉 2 个 INBOX')
    assert.equal(counts.entries, 3)
  })

  it('要动手 = 待拍板 + 流转中 + 待补库', () => {
    assert.equal(counts.queue, 2)
    assert.equal(counts.flow, 1, 'INBOX 里 state=open 的那一条')
    assert.equal(counts.refill, 2, 'should-fill 1 + observing 1')
    assert.equal(counts.urgent, 2 + 1 + 2)
  })

  it('每请求成本取 kpi.residentTokens，不是索引层', () => {
    assert.equal(counts.resident, 652)
    assert.equal(counts.frame, 171)
    assert.equal(counts.catalog, 423)
    assert.equal(counts.injected, 58)
  })

  it('今天已记只数今天的日期', () => {
    assert.equal(counts.capturedToday, 1)
  })
})

describe('顶条 T0', () => {
  it('error / loading 显示「—」（null），不是 0', () => {
    for (const pane of PANES) {
      assert.equal(figureFor(pane.id, 'error', counts), null, `${pane.id} 的 error 态必须是 null`)
      assert.equal(figureFor(pane.id, 'loading', counts), null, `${pane.id} 的 loading 态必须是 null`)
      assert.equal(bandFigureFor('error', counts), null, '上带在 error 态必须是 null')
    }
  })

  it('empty 才是 0，但库健康的「0」不成立（框架仍计费）', () => {
    assert.equal(figureFor('today', 'empty', counts), 0, '没有待办就是 0')
    assert.equal(figureFor('memory', 'empty', counts), 0, '没有记忆就是 0')
    /*
     * health 的 empty 表示「没有置顶、没有 skill」，但目录框架 171 仍每请求付费。
     * 这里回 0 会与同屏的「框架 171」「每请求仍有 171」打架。
     */
    assert.equal(figureFor('health', 'empty', counts), counts.resident)
    assert.equal(figureFor('health', 'empty', counts) === 0, false, '库健康空态不许显示 0 tokens/请求')
  })

  it('正常态每页给一个数字，且左轨计数与它同源', () => {
    for (const pane of PANES) {
      const value = figureFor(pane.id, 'ready', counts)
      assert.equal(typeof value, 'number', `${pane.id} 的 T0 必须是数字`)
      assert.equal(value, countFor(pane.id, counts), `${pane.id} 左轨计数与 T0 必须同一口径`)
    }
  })

  it('左轨计数在 error / loading 下是「—」，不是 0；empty 与顶条同口径', () => {
    for (const pane of PANES) {
      assert.equal(countDisplay(pane.id, 'error', counts), null, `${pane.id} 的 error 态左轨计数必须是 null`)
      assert.equal(countDisplay(pane.id, 'loading', counts), null, `${pane.id} 的 loading 态左轨计数必须是 null`)
      assert.equal(
        countDisplay(pane.id, 'empty', counts),
        figureFor(pane.id, 'empty', counts),
        `${pane.id} 空态的左轨计数必须与顶条 T0 一致`,
      )
    }
  })
})

describe('判定句', () => {
  it('每页每态都 ≤20 字、单行、非空', () => {
    for (const pane of PANES) {
      for (const phase of ['loading', 'ready', 'empty', 'error']) {
        const text = ledeFor(pane.id, phase, counts)
        assert.equal(typeof text, 'string')
        assert.equal(text.trim() === '', false, `${pane.id}/${phase} 判定句为空`)
        assert.equal(text.includes('\n'), false, `${pane.id}/${phase} 判定句换行了`)
        assert.equal([...text].length <= LEDE_MAX, true, `${pane.id}/${phase} 判定句超长：${text}`)
      }
    }
  })

  it('极端数值下也不超长（四位数 + 四位数）', () => {
    const huge = { ...counts, resident: 12345, injected: 6789, entries: 9999, confirmed: 8888, urgent: 7777, queue: 6666 }
    for (const pane of PANES) {
      for (const phase of ['ready', 'empty', 'error', 'loading']) {
        const text = ledeFor(pane.id, phase, huge)
        assert.equal([...text].length <= LEDE_MAX, true, `${pane.id}/${phase} 超长：${text}`)
      }
    }
  })

  it('四态不沿用正常态文案（error ≠ empty ≠ 正常）', () => {
    const ready = ledeFor('today', 'ready', counts)
    const empty = ledeFor('today', 'empty', counts)
    const error = ledeFor('today', 'error', counts)
    assert.notEqual(ready, empty)
    assert.notEqual(ready, error)
    assert.notEqual(empty, error)
  })
})

describe('上带「每请求都在」', () => {
  it('正常态给出四桶构成；error 明说「读不到」；empty 说 0', () => {
    assert.match(bandNoteFor('health', 'ready', counts), /652 = 框架 171 \+ 技能 423 \+ 置顶 58/)
    assert.match(bandNoteFor('today', 'error', counts), /读不到/)
    assert.match(bandNoteFor('today', 'empty', counts), /0 条置顶/)
  })
})

/* ============================================================
 * 今天 / 待办 / 记忆
 * ============================================================ */

describe('今天的线索', () => {
  const clues = cluesOf(data)

  it('按该动手的顺序：拍板 → 补库 → 维护 → 成本 → 流转，且 ≤6 条', () => {
    assert.equal(clues.length <= 6, true)
    assert.equal(clues[0].id, 'clue-decide', '待拍板永远排第一')
    assert.equal(clues[1].id, 'clue-fill', '达到阈值的补库排第二')
    const groups = clues.map(clue => clue.group)
    assert.deepEqual(groups, ['拍板', '补库', '维护', '成本', '流转'])
  })

  it('每条线索都有可执行的动作与说明', () => {
    for (const clue of clues) {
      assert.equal(clue.actionLabel.length > 0, true, `${clue.id} 缺动作文案`)
      assert.equal(clue.detail.length > 0, true, `${clue.id} 缺说明`)
      assert.equal(clue.num !== undefined, true, `${clue.id} 缺读数`)
    }
  })

  it('跳转线索的选择键跟目标页的命名走（不许拼出空键）', () => {
    for (const clue of clues) {
      if (clue.action === 'draft-miss') continue
      assert.equal(clue.gotoKey === undefined || clue.gotoKey.length > 2, true,
        `${clue.id} 的选择键形如 "${clue.gotoKey}"：空键会让检视栏塌成「选一条」`)
    }
    const decide = clues.find(clue => clue.id === 'clue-decide')
    assert.match(decide.gotoKey, /^q:.+\.md$/, '拍板线索必须落到具体条目路径')
    const cost = clues.find(clue => clue.id === 'clue-cost')
    assert.equal(cost.gotoKey, 'b:injected', '成本线索必须落到置顶桶')
  })

  it('空库只剩成本一条线索（每请求成本不会因为库空而消失）', () => {
    const empty = {
      snapshot: {
        ...snapshot,
        queue: [],
        entries: [],
        stats: { ...snapshot.stats, overLimit: 0 },
      },
      overview,
      inbox: { ...inbox, entries: [] },
      misses: {
        ...misses,
        total: 0,
        pipeline: {},
        counts: { observing: 0, 'should-fill': 0, drafting: 0, verifying: 0, verified: 0 },
      },
    }
    const clues = cluesOf(empty)
    assert.deepEqual(clues.map(clue => clue.id), ['clue-cost'], '空库不该再有拍板/补库/维护/流转线索')
  })
})

describe('待办三段', () => {
  const sections = todoSectionsOf(data)

  it('顺序：待拍板 → 流转中 → 待补库', () => {
    assert.deepEqual(sections.map(section => section.title), ['待拍板', '流转中', '待补库'])
  })

  it('待补库把达标项排在观察项前面，并标出是否达标', () => {
    const refill = sections[2]
    assert.equal(refill.rows.length, 2)
    assert.equal(refill.rows[0].fillable, true, '问过 3 次的排第一')
    assert.equal(refill.rows[1].fillable, false, '只问过 1 次的标为观察中')
  })

  it('空段给说明而不是消失', () => {
    for (const section of sections) {
      assert.equal(section.emptyText.length > 0, true, `${section.title} 空段没有说明`)
    }
  })

  it('拍板行带 path（confirm 要的是 path，不是点分 id）', () => {
    for (const row of sections[0].rows) {
      assert.match(row.path, /\.md$/, '拍板行必须带 md 路径')
    }
  })
})

describe('记忆两面的行', () => {
  it('内容面按库内顺序，右列是引用次数', () => {
    const rows = memoryRowsOf(snapshot, 'content', '')
    assert.equal(rows.length, 3)
    assert.equal(rows[0].state, statusLabelOf('confirmed'))
    assert.equal(typeof rows[0].num, 'number')
  })

  it('成本面按体积降序', () => {
    const rows = memoryRowsOf(snapshot, 'cost', '')
    const tokens = rows.map(row => row.num)
    assert.deepEqual(tokens, [...tokens].sort((a, b) => b - a))
  })

  it('关键词过滤命中标题与路径；空结果不抛错', () => {
    assert.equal(memoryRowsOf(snapshot, 'content', 'codegraph').length, 1)
    assert.deepEqual(memoryRowsOf(snapshot, 'content', '不存在的词'), [])
  })

  it('状态只出现中文（observed 不下到界面）', () => {
    for (const row of memoryRowsOf(snapshot, 'content', '')) {
      assert.equal(/^[a-z]+$/.test(row.state), false, `状态词是英文：${row.state}`)
    }
  })
})

/* ============================================================
 * 库健康四桶
 * ============================================================ */

describe('四桶与合计', () => {
  const buckets = bucketsOf({ snapshot, overview })

  it('四桶齐全，顺序固定（catalog / frame / injected / toolschema）', () => {
    assert.deepEqual(buckets.map(bucket => bucket.id), ['catalog', 'frame', 'injected', 'toolschema'])
  })

  it('可读桶之和 = 每请求合计（对得上）', () => {
    const sum = buckets.filter(bucket => bucket.tokens !== null).reduce((acc, bucket) => acc + bucket.tokens, 0)
    assert.equal(sum, overview.kpi.residentTokens)
    assert.equal(sum, 423 + 171 + 58)
  })

  it('工具 schema 不可读：null，而不是 0', () => {
    const schema = buckets.find(bucket => bucket.id === 'toolschema')
    assert.equal(schema.tokens, null)
    assert.equal(schema.state, 'error')
    assert.match(schema.note, /读不到/)
  })

  it('置顶桶逐条列出 pinned 条目，并给出逐条估算', () => {
    const injected = buckets.find(bucket => bucket.id === 'injected')
    assert.equal(injected.items.length, 1)
    assert.equal(injected.items[0].id, 'personal.principles')
    assert.equal(injected.items[0].editable, true, '置顶条目可以编辑（写回正文）')
    assert.equal(typeof injected.items[0].tokens, 'number')
  })

  it('空桶有独立状态，不冒充「读不到」', () => {
    const empty = bucketsOf({ snapshot, overview: { ...overview, resident: { ...overview.resident, injectedTokens: 0, items: [] } } })
    const injected = empty.find(bucket => bucket.id === 'injected')
    assert.equal(injected.state, 'empty')
  })
})

describe('版本五项', () => {
  const version = versionInfoOf(PLUGIN_VERSION)

  it('能拿到的给值，拿不到的给「—」，并明说不可比较', () => {
    assert.equal(version.version, PLUGIN_VERSION)
    assert.equal(version.install, '—')
    assert.equal(version.commit, '—')
    assert.equal(version.checkable, false)
    assert.match(version.reason, /宿主没有暴露版本服务/)
  })

  it('常量与 package.json 一致（改版本号必须两处一起改）', async () => {
    const pkg = JSON.parse(await fsp.readFile(path.join(here, '..', 'package.json'), 'utf8'))
    assert.equal(PLUGIN_VERSION, pkg.version, 'PLUGIN_VERSION 与 package.json 的 version 不一致')
  })
})

describe('状态条与文案工具', () => {
  it('状态条带库根与条数口径', () => {
    const text = statusRightOf({ snapshot, overview })
    assert.match(text, /\.memory-ops/)
    assert.match(text, /3 条记忆/)
    assert.match(text, /记录流另计/)
  })

  it('clip 按码点截断（不会把 emoji / 生僻字切坏）', () => {
    assert.equal(clip('一二三四五', 3), '一二…')
    assert.equal([...clip('一'.repeat(30), 20)].length, 20)
  })
})