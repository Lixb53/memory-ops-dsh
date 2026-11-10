/**
 * 迁移脚本的回归测试 —— 三条用例全部来自真执行中踩到的缺陷。
 *
 * 这些不是构造出来的边界：第一次真实 `--apply` 之后，
 * 第二次运行把 22 条 gslx 记忆**搬回了主仓**，而每行都打印「✓」。
 * 破坏性脚本的测试价值就在这里——它不需要聪明，只需要记得事故长什么样。
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { after, before, describe, it } from 'node:test'

const run = promisify(execFile)
const SCRIPT = new URL('../scripts/scope-migrate.ts', import.meta.url).pathname
const NODE_ARGS = ['--experimental-strip-types']

/** 造一个最小库：主仓 1 条通用 + 1 条 gslx 专属。 */
async function makeLibrary(): Promise<string> {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'memory-ops-migrate-'))
  const write = async (rel: string, content: string) => {
    const full = path.join(root, rel)
    await fsp.mkdir(path.dirname(full), { recursive: true })
    await fsp.writeFile(full, content, 'utf8')
  }
  await write('work/sz-web/index.md', [
    '---', 'id: work.sz-web.index', 'title: sz-web 索引', 'scope: work',
    'layer: l0', 'status: confirmed', 'updated: 2026-11-10',
    'aliases: [V2.1.25-dev, sz-web-dzh-gslx]', '---', '', '# sz-web 索引', '',
  ].join('\n'))
  // 主仓通用文档：标题以 sz-web- 开头，正文顺带提到 gslx（真实误判形态）
  await write('work/sz-web/workflow/sz-web-维护手册.md', [
    '---', 'id: work.sz-web.workflow.维护手册', 'title: sz-web 子模块维护流程（含 gslx 案例）',
    'layer: l2', 'status: confirmed', 'updated: 2026-11-10', '---', '',
    '# 维护流程', '', '以 gslx 为例说明。', '',
  ].join('\n'))
  // 子模块专属：标题直接带短名
  await write('work/sz-web/issues/gslx-专属缺陷.md', [
    '---', 'id: work.sz-web.issues.gslx-专属缺陷', 'title: gslx 专属缺陷',
    'layer: l2', 'status: confirmed', 'updated: 2026-11-10', '---', '',
    '# gslx 专属', '',
  ].join('\n'))
  return root
}

/** 跑脚本，返回 { code, out }。 */
async function runScript(root: string, ...args: string[]) {
  try {
    const { stdout, stderr } = await run('node', [...NODE_ARGS, SCRIPT, ...args], {
      env: { ...process.env, MEMORY_OPS_ROOT: root },
    })
    return { code: 0, out: `${stdout}${stderr}` }
  } catch (error) {
    const failed = error as { code?: number; stdout?: string; stderr?: string }
    return { code: failed.code ?? 1, out: `${failed.stdout ?? ''}${failed.stderr ?? ''}` }
  }
}

describe('迁移脚本：真实缺陷回归', () => {
  let root: string
  before(async () => { root = await makeLibrary() })
  after(async () => { await fsp.rm(root, { recursive: true, force: true }) })

  it('主仓维护文档即便提到 gslx，也留在主仓（标题声明归属主体）', async () => {
    const { out } = await runScript(root, '--json')
    const { suggestions } = JSON.parse(out) as {
      suggestions: { from: string; to: string; project: string }[]
    }
    const handbook = suggestions.find(item => item.from.includes('维护手册'))
    assert.ok(handbook, '没找到维护手册条目')
    assert.equal(handbook.project, 'sz-web', '主仓维护文档被误判给了子模块')
    assert.equal(handbook.from, handbook.to, '主仓维护文档不该被搬动')
  })

  it('子模块专属条目会被搬出去，并建 parent 声明', async () => {
    const first = await runScript(root, '--apply')
    assert.equal(first.code, 0, first.out)

    // 文件已在新位置
    const moved = path.join(root, 'work/sz-web-dzh-gslx/issues/gslx-专属缺陷.md')
    assert.ok(fs.existsSync(moved), '子模块条目没被搬动')

    // 新项目骨架带 parent，否则子模块读不到主仓（规则④反向失效）
    const index = await fsp.readFile(path.join(root, 'work/sz-web-dzh-gslx/index.md'), 'utf8')
    assert.match(index, /^parent: sz-web$/m)
  })

  it('重复执行被拒绝（第二次 apply 曾把文件搬回主仓）', async () => {
    const second = await runScript(root, '--apply')
    assert.notEqual(second.code, 0, '重复执行竟然成功了')
    assert.match(second.out, /已有迁移记录/)

    // 关键：文件位置没被第二次运行改变
    assert.ok(
      fs.existsSync(path.join(root, 'work/sz-web-dzh-gslx/issues/gslx-专属缺陷.md')),
      '第二次运行把文件搬走了——幂等护栏失效',
    )
  })

  it('迁移后重跑 dry-run 报告 0 搬动（不留残留计划）', async () => {
    const { out } = await runScript(root, '--json')
    const { suggestions } = JSON.parse(out) as { suggestions: { from: string; to: string }[] }
    const stillMoving = suggestions.filter(item => item.from !== item.to)
    assert.equal(stillMoving.length, 0, `残留 ${stillMoving.length} 条搬动计划`)
  })

  it('回滚把文件搬回原处', async () => {
    const back = await runScript(root, '--rollback')
    assert.equal(back.code, 0, back.out)
    assert.ok(
      fs.existsSync(path.join(root, 'work/sz-web/issues/gslx-专属缺陷.md')),
      '回滚后文件不在原位置',
    )
  })
})
