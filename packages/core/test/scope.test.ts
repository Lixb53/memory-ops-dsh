/**
 * 作用域测试 —— 把五条工作区规则钉成断言。
 *
 * 这些用例全部来自真实结构，不是构造出来的：
 * `/Users/zeze/Desktop/work/zhongxing/V2.1.25-dev/submodule/sz-web-dzh-gslx`
 * 且同一个 gslx 在 V2.1.24-dev 与 V2.1.25-dev 下都存在。
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, describe, it } from 'node:test'

import {
  branchMatches, branchFromPath, isEntryVisible, projectLineage, projectParentsOf,
  readGitBranch, scopeOfPath, isUnscopedEntry, inferParentProject, resolveScope,
} from '../src/scope.ts'
import { canShareAcrossBranches } from '../src/schema.ts'
import { createStore } from '../src/store.ts'

/** 只用来测路径构造，不需要真实库。 */
const store = createStore({ root: '/tmp/memory-ops-scope-test-unused' })

/** 真实结构：sz-web 是主仓，gslx/gslz 是子模块。 */
const PARENTS: Record<string, string | null> = {
  'sz-web': null,
  'sz-web-dzh-gslx': 'sz-web',
  'sz-web-dzh-gslz': 'sz-web',
}

describe('规则①④：子模块与主仓的可见性', () => {
  it('子模块可以读主仓记忆（主仓是运行基座）', () => {
    const visible = isEntryVisible(
      { project: 'sz-web', branch: null },
      { project: 'sz-web-dzh-gslx', branch: null, parents: PARENTS },
    )
    assert.equal(visible, true)
  })

  it('主仓读不到子模块记忆（定制细节不污染通用结论）', () => {
    const visible = isEntryVisible(
      { project: 'sz-web-dzh-gslx', branch: null },
      { project: 'sz-web', branch: null, parents: PARENTS },
    )
    assert.equal(visible, false)
  })

  it('兄弟子模块互不可见（最核心的隔离）', () => {
    assert.equal(
      isEntryVisible(
        { project: 'sz-web-dzh-gslz', branch: null },
        { project: 'sz-web-dzh-gslx', branch: null, parents: PARENTS },
      ),
      false,
    )
  })

  it('个人域对所有项目可见（偏好与原则跨项目生效）', () => {
    assert.equal(
      isEntryVisible({ project: null, branch: null }, { project: 'sz-web-dzh-gslx', branch: 'V2.1.25-dev', parents: PARENTS }),
      true,
    )
  })

  it('父链带环保护，不会死循环', () => {
    const cyclic = { a: 'b', b: 'a' }
    assert.deepEqual(projectLineage('a', cyclic), ['a', 'b'])
  })
})

describe('规则⑤：分支隔离', () => {
  it('不同分支互不可见', () => {
    assert.equal(branchMatches('V2.1.24-dev', 'V2.1.25-dev'), false)
  })

  it('同一分支可见', () => {
    assert.equal(branchMatches('V2.1.25-dev', 'V2.1.25-dev'), true)
  })

  it('主线记忆对特性分支可见（V2.1.25-dev → V2.1.25-dev-6594-6649）', () => {
    assert.equal(branchMatches('V2.1.25-dev', 'V2.1.25-dev-6594-6649'), true)
  })

  it('特性分支记忆不许上浮到主线（反向不成立）', () => {
    assert.equal(branchMatches('V2.1.25-dev-6594-6649', 'V2.1.25-dev'), false)
  })

  it('前缀必须带分隔符，避免 V2.1.2 吃掉 V2.1.25', () => {
    assert.equal(branchMatches('V2.1.2', 'V2.1.25-dev'), false)
  })

  it('项目级/共享条目（branch 为 null）对所有分支可见', () => {
    assert.equal(branchMatches(null, 'V2.1.24-dev'), true)
    assert.equal(branchMatches('_shared', 'V2.1.25-dev'), true)
    assert.equal(branchMatches('*', '任意分支'), true)
  })

  it('同一个子模块在两个分支下：各自只看自己的', () => {
    const view = { project: 'sz-web-dzh-gslx', branch: 'V2.1.25-dev', parents: PARENTS }
    assert.equal(isEntryVisible({ project: 'sz-web-dzh-gslx', branch: 'V2.1.25-dev' }, view), true)
    assert.equal(isEntryVisible({ project: 'sz-web-dzh-gslx', branch: 'V2.1.24-dev' }, view), false)
  })

  it('子模块读主仓时，分支仍要匹配（不能借继承跨分支）', () => {
    const view = { project: 'sz-web-dzh-gslx', branch: 'V2.1.25-dev', parents: PARENTS }
    assert.equal(isEntryVisible({ project: 'sz-web', branch: 'V2.1.25-dev' }, view), true)
    assert.equal(isEntryVisible({ project: 'sz-web', branch: 'V2.1.24-dev' }, view), false)
  })
})

describe('路径派生作用域', () => {
  it('二维布局：project/branch/条目', () => {
    assert.deepEqual(scopeOfPath('work/sz-web/V2.1.25-dev/issues/a.md'), {
      project: 'sz-web', branch: 'V2.1.25-dev',
    })
  })

  it('项目根下的 index.md 不属于任何分支', () => {
    assert.deepEqual(scopeOfPath('work/sz-web/index.md'), { project: 'sz-web', branch: null })
  })

  it('_shared 目录视为全分支共享', () => {
    assert.deepEqual(scopeOfPath('work/sz-web/_shared/workflow/a.md'), { project: 'sz-web', branch: null })
  })

  it('扁平老布局（project/issues/a.md）推不出分支', () => {
    assert.deepEqual(scopeOfPath('work/sz-web/issues/a.md'), { project: 'sz-web', branch: null })
  })

  it('个人域无项目无分支', () => {
    assert.deepEqual(scopeOfPath('personal/preferences.md'), { project: null, branch: null })
  })
})

describe('父子关系来自 index.md 的 parent 字段', () => {
  it('只认 work/<project>/index.md 的声明', () => {
    const parents = projectParentsOf([
      { path: 'work/sz-web/index.md', frontmatter: {} },
      { path: 'work/sz-web-dzh-gslx/index.md', frontmatter: { parent: 'sz-web' } },
      // 子文件写的 parent 不算数，避免任意条目改写归属
      { path: 'work/sz-web-dzh-gslz/issues/a.md', frontmatter: { parent: 'sz-web' } },
    ])
    assert.deepEqual(parents, { 'sz-web': null, 'sz-web-dzh-gslx': 'sz-web' })
  })
})

describe('分支识别：git 优先，失败可解释', () => {
  it('读到 git 分支时用它', async () => {
    const result = await readGitBranch('/repo', async () => 'V2.1.25-dev-6594-6649\n')
    assert.equal(result.branch, 'V2.1.25-dev-6594-6649')
    assert.equal(result.source, 'git')
    assert.equal(result.reason, '')
  })

  it('detached HEAD 当失败处理，不产出 branch=HEAD', async () => {
    const result = await readGitBranch('/repo', async () => 'HEAD\n')
    assert.equal(result.branch, null)
    assert.equal(result.reason, 'detached_head')
    assert.match(result.detail, /detached/)
  })

  it('git 失败时退回目录名，但标明来源是推断', async () => {
    const result = await readGitBranch(
      '/Users/zeze/Desktop/work/zhongxing/V2.1.25-dev',
      async () => { throw new Error('not a git repository') },
    )
    assert.equal(result.branch, 'V2.1.25-dev')
    assert.equal(result.source, 'path')
    assert.match(result.detail, /按目录名推断/)
  })

  it('git 失败且目录名没有版本号时，明确说不知道', async () => {
    const result = await readGitBranch('/tmp/somewhere', async () => { throw new Error('nope') })
    assert.equal(result.branch, null)
    assert.equal(result.reason, 'no_git')
    assert.notEqual(result.detail, '')
  })

  it('空 cwd 不报错，返回 no_cwd', async () => {
    const result = await readGitBranch(undefined, async () => 'main')
    assert.equal(result.branch, null)
    assert.equal(result.reason, 'no_cwd')
  })

  it('目录名推断只认版本号形态，不把 submodule 当分支', () => {
    assert.equal(branchFromPath('/work/zhongxing/V2.1.25-dev'), 'V2.1.25-dev')
    assert.equal(branchFromPath('/work/zhongxing/V2.1.25-dev/submodule'), null)
    assert.equal(branchFromPath('/tmp/somewhere'), null)
  })
})

describe('未识别分支时的策略（宁可显式提示，不要假空态）', () => {
  it('会话分支未知时仍展示，由界面挂「未识别分支」提示', () => {
    assert.equal(
      isEntryVisible(
        { project: 'sz-web', branch: 'V2.1.24-dev' },
        { project: 'sz-web', branch: null, parents: PARENTS },
      ),
      true,
    )
  })
})

describe('统一按分支建目录（单线项目也用 main）', () => {
  /**
   * 用户拍板的方案：不给单线项目留特例，一律 `work/<project>/<branch>/`。
   * 好处是只有一套目录规则，判错的可能只剩「项目名认错」一种。
   */
  const DECLARED = {
    'memory-ops': ['main'],
    'sz-web': ['V2.1.24-dev', 'V2.1.25-dev'],
  }

  it('单线项目：main 目录被认作分支', () => {
    assert.deepEqual(
      scopeOfPath('work/memory-ops/main/issues/a.md', DECLARED['memory-ops']),
      { project: 'memory-ops', branch: 'main' },
    )
  })

  it('声明了分支表后，非声明目录不再被当分支（含版本号形态）', () => {
    // V2.1.22-dev 不在 sz-web 的声明表里 → 视为分类目录而非分支
    assert.equal(scopeOfPath('work/sz-web/V2.1.22-dev/a.md', DECLARED['sz-web']).branch, null)
    assert.equal(scopeOfPath('work/sz-web/V2.1.25-dev/a.md', DECLARED['sz-web']).branch, 'V2.1.25-dev')
  })

  it('未声明分支表时：版本号形态 + 通用分支名都能认出', () => {
    assert.equal(scopeOfPath('work/other/V2.1.25-dev/a.md').branch, 'V2.1.25-dev')
    // 通用分支名内置识别 —— 删掉 branches 字段后，main 曾一度认不出，
    // 导致 work/memory-ops/main/... 被误报「未落分支」。见 COMMON_BRANCH_NAMES。
    assert.equal(scopeOfPath('work/other/main/a.md').branch, 'main')
    assert.equal(scopeOfPath('work/other/dev/a.md').branch, 'dev')
  })

  it('分类目录绝不能被认成分支（否则大半记忆全场不可见）', () => {
    for (const dir of ['issues', 'maps', 'workflow', 'overview', 'meta']) {
      assert.equal(scopeOfPath(`work/p/${dir}/a.md`).branch, null, `${dir} 不该被认成分支`)
    }
  })

  it('main 与 dev 两个分支的条目互不可见（修复静默失效）', () => {
    const view = { project: 'proj', branch: 'dev', parents: {} }
    assert.equal(isEntryVisible({ project: 'proj', branch: 'main' }, view), false)
    assert.equal(isEntryVisible({ project: 'proj', branch: 'dev' }, view), true)
  })

  it('_shared 有意全分支共享，与「未落分支」在语义上分开', () => {
    assert.equal(isUnscopedEntry('work/p/_shared/a.md'), false)
    assert.equal(isUnscopedEntry('work/p/issues/a.md'), true, '老布局应被标为待迁移')
    // 通用分支名已内置识别，不再需要声明
    assert.equal(isUnscopedEntry('work/p/main/a.md'), false)
  })

  it('项目索引本身不算未落分支条目', () => {
    assert.equal(isUnscopedEntry('work/p/index.md'), false)
  })

  it('项目根下的普通文件算未落分支（曾因后缀判断被静默漏报）', () => {
    // 真实缺陷：早先写成 `third.endsWith('.md')` 一律当作项目索引，
    // 于是 gslx 的 8 条「临夏定制」文档漏落分支却显示「待定 0 条」——假的清零。
    assert.equal(isUnscopedEntry('work/p/临夏定制-需求基线.md'), true)
    assert.equal(isUnscopedEntry('work/p/PROBLEMS.md'), true)
    // 但精确的 index.md 仍是索引，不是待办
    assert.equal(isUnscopedEntry('work/p/index.md'), false)
    // 分支目录下的条目不算待定
    assert.equal(isUnscopedEntry('work/p/main/issues/a.md', ['main']), false)
  })
})

describe('_shared 只装机制性知识（防「共享层变垃圾桶」）', () => {
  /**
   * 真实教训：sz-web 的 23 条记忆全挂在「所有分支可见」，
   * 等于让 V2.0.19-dev 读到了它根本没有的架构结论。
   * V2.1.25-dev 比老分支多出的东西，套回去就是错的。
   */
  it('机制性与约定性可以跨分支共享', () => {
    assert.equal(canShareAcrossBranches('mechanism'), true)
    assert.equal(canShareAcrossBranches('convention'), true)
  })

  it('架构性/映射/契约不许共享——它们随版本漂移', () => {
    assert.equal(canShareAcrossBranches('architecture'), false)
    assert.equal(canShareAcrossBranches('mapping'), false)
    assert.equal(canShareAcrossBranches('contract'), false)
  })

  it('未标注类型一律不许共享（宁可报错，不要静默漏过）', () => {
    assert.equal(canShareAcrossBranches(''), false)
    assert.equal(canShareAcrossBranches(undefined), false)
    assert.equal(canShareAcrossBranches('fact'), false)
  })

  it('「待定」是与「有意共享」分开的状态', () => {
    // unscoped 不在共享白名单里：它留在项目根，由界面催办
    assert.equal(canShareAcrossBranches('unscoped'), false)
  })
})

describe('写入路径：按需创建分支目录', () => {
  it('不给分支就报错，避免静默退化成「全分支可见」', () => {
    // 少一层分支恰好等于全分支可见 —— 这种错必须响亮
    assert.throws(() => store.branchPathOf({ project: 'p', branch: '', tail: 'a.md' }), /分支名不能为空/)
  })

  it('正常拼出 work/<project>/<branch>/<tail>', () => {
    assert.equal(
      store.branchPathOf({ project: 'sz-web', branch: 'V2.1.25-dev', tail: 'issues/a.md' }),
      'work/sz-web/V2.1.25-dev/issues/a.md',
    )
  })

  it('给 _shared 时校验知识类型', () => {
    assert.equal(
      store.branchPathOf({ project: 'p', branch: '_shared', tail: 'a.md', kind: 'mechanism' }),
      'work/p/_shared/a.md',
    )
    assert.throws(
      () => store.branchPathOf({ project: 'p', branch: '_shared', tail: 'a.md', kind: 'architecture' }),
      /不能放进 _shared/,
    )
  })

  it('拒绝路径穿越', () => {
    assert.throws(
      () => store.branchPathOf({ project: 'p', branch: 'main', tail: '../../etc/passwd' }),
      /上级目录穿越/,
    )
  })
})

describe('_shared 准入真正接线（不只是函数本身正确）', () => {
  /**
   * 真事故：校验写在 `branchPathOf` 里，而它只被测试调用；
   * 真正的写入函数 `createEntry` 没接它 → 8 项测试全绿、实际零拦截。
   *
   * 所以这一组测的是**写入路径**，不是判定函数。
   */
  // 唯一临时目录：固定路径会让上一次运行的残留文件导致「条目已存在」，
  // 于是测试通过与否取决于跑过几次 —— 这不是可重复的验证。
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-ops-shared-gate-'))
  const live = createStore({ root })
  after(() => { fs.rmSync(root, { recursive: true, force: true }) })

  it('往 _shared 写 architecture 会被 createEntry 直接拒绝', async () => {
    await assert.rejects(
      () => live.createEntry({
        relPath: 'work/p/_shared/maps/模块地图.md',
        frontmatter: { title: '模块地图', knowledgeKind: 'architecture' },
        body: '# 模块地图\n',
      }),
      /不能写入 _shared/,
    )
  })

  it('往 _shared 写未标注类型也拒绝（宁可报错，不要静默漏过）', async () => {
    await assert.rejects(
      () => live.createEntry({
        relPath: 'work/p/_shared/x.md',
        frontmatter: { title: 'x' },
        body: '# x\n',
      }),
      /不能写入 _shared/,
    )
  })

  it('机制性知识可以正常写入 _shared', async () => {
    const entry = await live.createEntry({
      relPath: 'work/p/_shared/workflow/维护手册.md',
      frontmatter: { title: '维护手册', knowledgeKind: 'mechanism' },
      body: '# 维护手册\n',
    })
    assert.equal(entry.branch, null)
    assert.equal(entry.path, 'work/p/_shared/workflow/维护手册.md')
  })

  it('分支目录下写架构知识不受影响（校验只管 _shared）', async () => {
    const entry = await live.createEntry({
      relPath: 'work/p/V2.1.25-dev/maps/模块地图.md',
      frontmatter: { title: '模块地图', knowledgeKind: 'architecture' },
      body: '# 模块地图\n',
    })
    assert.equal(entry.branch, 'V2.1.25-dev')
  })
})

describe('父项目推断：向上找第一个已知项目的检出', () => {
  /**
   * 真实结构：`…/zhongxing/V2.1.25-dev/submodule/sz-web-dzh-gslx`
   * 路径里**没有任何 `sz-web` 字样**（父目录叫 V2.1.25-dev），
   * 所以字符串匹配必然失效，只能靠每层目录的 git remote。
   */
  const PROJECTS = [{ name: 'sz-web' }, { name: 'sz-web-dzh-gslx' }]

  /** 造一个「目录 → remote」的假环境。 */
  const fakeRepo = (map: Record<string, string>) => async (cwd: unknown) => {
    const key = String(cwd ?? '')
    return map[key] === undefined
      ? { repo: null, detail: 'no git' }
      : { repo: map[key]!, detail: `git remote → ${map[key]}` }
  }

  it('子模块的父项目由上级目录的 remote 推断出来', async () => {
    const result = await inferParentProject({
      cwd: '/w/V2.1.25-dev/submodule/sz-web-dzh-gslx',
      projects: PROJECTS,
      readRepo: fakeRepo({
        '/w/V2.1.25-dev/submodule/sz-web-dzh-gslx': 'sz-web-dzh-gslx',
        '/w/V2.1.25-dev/submodule': null as never,
        '/w/V2.1.25-dev': 'sz-web',
      }),
    })
    assert.equal(result.parent, 'sz-web')
    assert.match(result.detail, /remote/)
  })

  it('自己就是主仓时没有父项目（不该把自己认成父）', async () => {
    const result = await inferParentProject({
      cwd: '/w/V2.1.25-dev',
      projects: PROJECTS,
      readRepo: fakeRepo({ '/w/V2.1.25-dev': 'sz-web' }),
    })
    assert.equal(result.parent, null)
  })

  it('向上各级都不是 git 仓库时，明确说不知道', async () => {
    const result = await inferParentProject({
      cwd: '/tmp/plain/dir',
      projects: PROJECTS,
      readRepo: fakeRepo({}),
    })
    assert.equal(result.parent, null)
    assert.match(result.detail, /不是 git 仓库/)
  })

  it('向上查了但都不是已知项目时，列出查过什么', async () => {
    const result = await inferParentProject({
      cwd: '/w/other',
      projects: PROJECTS,
      readRepo: fakeRepo({ '/w/other': 'unknown-repo' }),
    })
    assert.equal(result.parent, null)
    assert.match(result.detail, /都不是库里已知的项目/)
  })
})

describe('实时导航：从真实条目聚合，不读手写表格', () => {
  /**
   * 手写目录表必然过时：`sz-web/index.md` 曾列着 `gslx/`、`dsh/`，
   * 而实际结构早已是 `V2.1.25-dev/`、`_shared/`。过时的导航比没有更糟。
   */
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-ops-nav-'))
  const store2 = createStore({ root })
  after(() => { fs.rmSync(root, { recursive: true, force: true }) })

  it('导航按真实目录聚合，并区分分支/共享/未落分支', async () => {
    fs.mkdirSync(path.join(root, 'work/p/V2.1.25-dev/issues'), { recursive: true })
    fs.mkdirSync(path.join(root, 'work/p/_shared/workflow'), { recursive: true })
    fs.writeFileSync(path.join(root, 'work/p/index.md'), '---\ntitle: p\nlayer: l0\n---\n')
    fs.writeFileSync(path.join(root, 'work/p/V2.1.25-dev/issues/a.md'), '---\ntitle: a\n---\n')
    fs.writeFileSync(path.join(root, 'work/p/_shared/workflow/b.md'), '---\ntitle: b\n---\n')
    fs.writeFileSync(path.join(root, 'work/p/scattered.md'), '---\ntitle: c\n---\n')

    const { createActions } = await import('../src/actions.ts')
    const actions = createActions({ store: store2 })
    const result = await actions.snapshot({ project: 'p' })
    const nav = (result as unknown as { nav: { path: string; kind: string; count: number }[] }).nav
    const byPath = new Map(nav.map(item => [item.path, item]))

    assert.equal(byPath.get('V2.1.25-dev/issues')?.kind, 'branch')
    // 回归：`main/` 下没有子目录时，导航曾退化成文件清单（每个文件一条）。
    // 导航要回答「去哪找」，不是「有哪些文件」。
    fs.mkdirSync(path.join(root, 'work/p/main'), { recursive: true })
    fs.writeFileSync(path.join(root, 'work/p/main/x.md'), '---\ntitle: x\n---\n')
    fs.writeFileSync(path.join(root, 'work/p/main/y.md'), '---\ntitle: y\n---\n')
    const after = createActions({ store: store2 })
    const nav2 = ((await after.snapshot({ project: 'p' })) as unknown as {
      nav: { path: string; count: number }[]
    }).nav
    const main = nav2.find(item => item.path === 'main')
    assert.equal(main?.count, 2, 'main 应按目录聚合为一条，而不是两个文件各一条')
    assert.equal(byPath.get('_shared/workflow')?.kind, 'shared')
    // 摊在项目根的文件标为 root —— 它们还没落分支
    assert.equal(byPath.get('scattered')?.kind, 'root')
  })
})

describe('父推断必须真的接进 resolveScope（不只是函数本身对）', () => {
  /**
   * 教训：上一组测的是 `inferParentProject` 函数本身，
   * 但把 `resolveScope` 里的接线注释掉后，测试**全绿**——
   * 和 `_shared` 准入那次是同一个毛病：测了函数，没测接线。
   *
   * 这一组断言的是 resolveScope 的**输出**：parents 里必须出现推断结果。
   */
  const fakeRepo = (map: Record<string, string>) => async (cwd: unknown) => {
    const key = String(cwd ?? '')
    return map[key] === undefined
      ? { repo: null, detail: 'no git' }
      : { repo: map[key]!, detail: `git remote → ${map[key]}` }
  }

  it('resolveScope 的 parents 含推断出的父子关系（无任何手写声明）', async () => {
    const scope = await resolveScope({
      cwd: '/w/V2.1.25-dev/submodule/sz-web-dzh-gslx',
      projects: [{ name: 'sz-web' }, { name: 'sz-web-dzh-gslx' }],
      // 故意给空 entries：库内没有任何 index.md 的 parent 声明
      entries: [],
      readRepo: fakeRepo({
        '/w/V2.1.25-dev/submodule/sz-web-dzh-gslx': 'sz-web-dzh-gslx',
        '/w/V2.1.25-dev': 'sz-web',
      }),
      readBranch: async () => ({ branch: 'V2.1.25-dev', source: 'git', reason: '', detail: 'git' }),
    })
    assert.equal(scope.parents['sz-web-dzh-gslx'], 'sz-web', '父关系没被写进 parents —— 接线断了')
  })

  it('推断出父之后，子模块真的能读到主仓记忆', async () => {
    const scope = await resolveScope({
      cwd: '/w/V2.1.25-dev/submodule/sz-web-dzh-gslx',
      projects: [{ name: 'sz-web' }, { name: 'sz-web-dzh-gslx' }],
      entries: [],
      readRepo: fakeRepo({
        '/w/V2.1.25-dev/submodule/sz-web-dzh-gslx': 'sz-web-dzh-gslx',
        '/w/V2.1.25-dev': 'sz-web',
      }),
      readBranch: async () => ({ branch: 'V2.1.25-dev', source: 'git', reason: '', detail: 'git' }),
    })
    // 端到端：这条可见性判断依赖 parents 正确
    assert.equal(
      isEntryVisible(
        { project: 'sz-web', branch: 'V2.1.25-dev' },
        { project: scope.project, branch: scope.branch, parents: scope.parents },
      ),
      true,
      '子模块读不到父项目记忆 —— 说明 parents 没生效',
    )
  })
})
