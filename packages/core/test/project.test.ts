/**
 * 项目解析的测试 —— 覆盖三条真实踩过的路径。
 *
 * 这些用例都来自真事故，不是构造出来的边界：
 * cwd 是 `/Users/…/V2.1.25-dev/submodule/sz-web-dzh-gslx`，库里项目叫 `sz-web`。
 * 早先客户端拿末段当项目名，于是恒 0 条。
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { cwdSegments, projectAliasesOf, resolveProject } from '../src/project.ts'
import { readRepoIdentity, repoNameFromRemote, resolveScope } from '../src/scope.ts'

const PROJECTS = [
  { name: 'sz-web', aliases: ['V2.1.25-dev', 'sz-web-dzh-gslx', 'gslx'] },
  { name: 'dsh', aliases: [] },
]

describe('cwd 解析', () => {
  it('末段是子仓库名时，靠别名命中真实项目', () => {
    const result = resolveProject(
      '/Users/zeze/Desktop/work/zhongxing/V2.1.25-dev/submodule/sz-web-dzh-gslx',
      PROJECTS,
    )
    assert.equal(result.project, 'sz-web')
    assert.equal(result.matchedBy, 'alias')
    assert.equal(result.reason, '')
  })

  it('分支目录名（V2.1.25-dev）也是别名', () => {
    const result = resolveProject('/Users/zeze/Desktop/work/zhongxing/V2.1.25-dev', PROJECTS)
    assert.equal(result.project, 'sz-web')
    assert.equal(result.matchedBy, 'alias')
    assert.equal(result.matchedAlias, 'V2.1.25-dev')
  })

  it('项目名精确命中优先于前缀', () => {
    const result = resolveProject('/Users/zeze/Desktop/dsh/memory-ops', PROJECTS)
    assert.equal(result.project, 'dsh')
    assert.equal(result.matchedBy, 'name')
  })

  it('前缀匹配：多个候选同时命中时，更长的别名优先', () => {
    const projects = [{ name: 'sz', aliases: [] }, { name: 'sz-web', aliases: [] }]
    assert.equal(resolveProject('/work/sz-web-feature', projects).project, 'sz-web')
    // 只有短名可用时才退回它
    assert.equal(resolveProject('/work/sz-web-feature', [{ name: 'sz', aliases: [] }]).project, 'sz')
  })

  it('认不出时不瞎猜，并给出原因与已知项目', () => {
    const result = resolveProject('/Users/zeze/Desktop/unknown/thing', PROJECTS)
    assert.equal(result.project, null)
    assert.equal(result.matchedBy, null)
    assert.match(result.reason, /已知/)
    // knownProjects 保持调用方给的顺序（alias 表由 UI 决定怎么排）
    assert.deepEqual(result.knownProjects, ['sz-web', 'dsh'])
  })

  it('空 cwd 与「认不出」分开：前者 reason 为空', () => {
    const empty = resolveProject(undefined, PROJECTS)
    assert.equal(empty.project, null)
    assert.equal(empty.reason, '')
  })

  it('大小写与 Windows 反斜杠都归一', () => {
    assert.deepEqual(cwdSegments('C:\\Work\\SZ-WEB\\src'), ['c:', 'work', 'sz-web', 'src'])
    assert.equal(resolveProject('C:\\Work\\SZ-WEB', PROJECTS).project, 'sz-web')
  })
})

describe('项目来源（aliases 已废弃）', () => {
  it('只认 work/<project>/index.md 作为项目声明处', () => {
    const projects = projectAliasesOf([
      { path: 'work/sz-web/index.md', frontmatter: {} },
      { path: 'work/sz-web/issues/a.md', frontmatter: {} },
      { path: 'personal/index.md', frontmatter: {} },
    ])
    assert.deepEqual(projects, [{ name: 'sz-web', aliases: [] }])
  })

  it('旧数据里的 aliases 被忽略，不生效也不报错', () => {
    // 字段废弃后必须静默忽略：让老库直接崩比读不到更糟
    const projects = projectAliasesOf([
      { path: 'work/sz-web/index.md', frontmatter: { aliases: ['V2.1.25-dev', 'sz-web-dzh-gslx'] } },
    ])
    assert.deepEqual(projects, [{ name: 'sz-web', aliases: [] }])
  })
})

describe('仓库身份：git remote 优先', () => {
  it('从各种 remote URL 形态提取仓库名', () => {
    assert.equal(repoNameFromRemote('https://gitlab.vimicro.com/sz2/sz-front/sz-web.git'), 'sz-web')
    assert.equal(repoNameFromRemote('git@github.com:Lixb53/memory-ops-dsh.git'), 'memory-ops-dsh')
    assert.equal(repoNameFromRemote('git@gitlab.com:group/sub/repo.git'), 'repo')
    assert.equal(repoNameFromRemote(''), null)
    assert.equal(repoNameFromRemote(undefined), null)
  })

  it('目录名不含项目名时，remote 仍能认出来（这正是废弃 aliases 的理由）', () => {
    // 真实场景：…/zhongxing/V2.1.25-dev 里没有任何 "sz-web" 字样
    const repo = repoNameFromRemote('https://gitlab.vimicro.com/sz2/sz-front/sz-web.git')
    assert.equal(repo, 'sz-web')
  })

  it('读不到 remote 时返回 null 而不是瞎猜', async () => {
    const result = await readRepoIdentity('/nonexistent', async () => { throw new Error('not a git repo') })
    assert.equal(result.repo, null)
    assert.match(result.detail, /读 remote 失败/)
  })

  it('不在 git 仓库里时，resolveScope 退回路径匹配', async () => {
    const projects = [{ name: 'memory-ops' }]
    const scope = await resolveScope({
      cwd: '/Users/zeze/Desktop/dsh/memory-ops',
      projects,
      entries: [],
      readRepo: async () => ({ repo: null, detail: 'no git' }),
      readBranch: async () => ({ branch: null, source: null, reason: 'no_git', detail: 'no git' }),
    })
    assert.equal(scope.project, 'memory-ops', 'remote 失败时应退回路径匹配')
  })

  it('remote 与项目名不一致时，路径匹配仍能兜住', async () => {
    // memory-ops 的 remote 是 memory-ops-dsh，与项目名不同
    const scope = await resolveScope({
      cwd: '/Users/zeze/Desktop/dsh/memory-ops',
      projects: [{ name: 'memory-ops' }],
      entries: [],
      readRepo: async () => ({ repo: 'memory-ops-dsh', detail: 'git remote → memory-ops-dsh' }),
      readBranch: async () => ({ branch: 'main', source: 'git', reason: '', detail: 'git' }),
    })
    assert.equal(scope.project, 'memory-ops')
    assert.match(scope.detail, /库里没有同名项目/)
  })
})

describe('项目名优先于别名（真缺陷回归）', () => {
  /**
   * 主仓 `sz-web` 的别名表里登记了子模块名 `sz-web-dzh-gslx`（历史遗留写法）。
   * 于是子模块 cwd 会同时命中「主仓的别名」与「子模块自己的项目名」，同分。
   * 早先依赖数组顺序 → 子模块被解析成主仓 → 子模块读到了主仓的作用域，
   * 且主仓的定制记忆全部泄漏。现在项目名整层压过别名。
   */
  const REAL = [
    { name: 'sz-web', aliases: ['V2.1.25-dev', 'sz-web-dzh-gslx', 'gslx'] },
    { name: 'sz-web-dzh-gslx', aliases: [] },
  ]

  it('子模块 cwd 归属子模块自己，不被主仓别名抢走', () => {
    const result = resolveProject(
      '/Users/zeze/Desktop/work/zhongxing/V2.1.25-dev/submodule/sz-web-dzh-gslx',
      REAL,
    )
    assert.equal(result.project, 'sz-web-dzh-gslx')
    assert.equal(result.matchedBy, 'name')
  })

  it('主仓 cwd 仍归主仓（靠别名）', () => {
    const result = resolveProject('/Users/zeze/Desktop/work/zhongxing/V2.1.25-dev', REAL)
    assert.equal(result.project, 'sz-web')
    assert.equal(result.matchedBy, 'alias')
  })

  it('顺序调换不影响结果（不依赖数组顺序）', () => {
    const reversed = [...REAL].reverse()
    assert.equal(
      resolveProject('/Users/zeze/Desktop/work/zhongxing/V2.1.25-dev/submodule/sz-web-dzh-gslx', reversed).project,
      'sz-web-dzh-gslx',
    )
  })
})

describe('隐藏目录也能认出项目（.dsh ↔ dsh）', () => {
  /**
   * 真场景：DSH 运行时目录是 `~/.dsh`，记忆项目叫 `dsh`。
   * 带点的目录名与项目名永远不相等 → 在 `~/.dsh/sessions` 下开会话认不出项目 → 假空态。
   * 这是通用形态，不止 `.dsh`：`.config`、`.vscode`、`.memory-ops` 同理。
   */
  const PROJECTS = [{ name: 'dsh', aliases: [] }, { name: 'memory-ops', aliases: [] }]

  it('.dsh 与 dsh 视为同一项目', () => {
    assert.equal(resolveProject('/Users/zeze/.dsh', PROJECTS).project, 'dsh')
  })

  it('隐藏目录下更深的位置仍能认出', () => {
    assert.equal(resolveProject('/Users/zeze/.dsh/sessions', PROJECTS).project, 'dsh')
    assert.equal(resolveProject('/Users/zeze/.dsh/cache/ab/cd', PROJECTS).project, 'dsh')
  })

  it('只去前导点，不动中间的点', () => {
    // v2.1.25-dev 里的点必须保留，否则版本名会被误认
    assert.equal(resolveProject('/w/.hidden', [{ name: 'hidden', aliases: [] }]).project, 'hidden')
    assert.equal(
      resolveProject('/w/v2.1.25-dev', [{ name: 'v2-1-25-dev', aliases: [] }]).project,
      null,
      '中间的点不该被去掉',
    )
  })

  it('更精确的项目名仍然赢（memory-ops 不会被 dsh 抢走）', () => {
    assert.equal(
      resolveProject('/Users/zeze/Desktop/dsh/memory-ops', PROJECTS).project,
      'memory-ops',
    )
  })
})
