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

describe('别名来源', () => {
  it('只认 work/<project>/index.md，其他文件的 aliases 不算数', () => {
    const entries = [
      { path: 'work/sz-web/index.md', frontmatter: { aliases: ['V2.1.25-dev', '  '] } },
      { path: 'work/sz-web/issues/a.md', frontmatter: { aliases: ['hijack'] } },
      { path: 'personal/index.md', frontmatter: { aliases: ['whatever'] } },
    ]
    const aliases = projectAliasesOf(entries)
    assert.deepEqual(aliases, [{ name: 'sz-web', aliases: ['V2.1.25-dev'] }])
  })

  it('没有 aliases 时项目名本身仍可解析', () => {
    const aliases = projectAliasesOf([{ path: 'work/dsh/index.md', frontmatter: {} }])
    assert.deepEqual(aliases, [{ name: 'dsh', aliases: [] }])
  })
})
