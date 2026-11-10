/**
 * 巡检命令的测试 —— 重点是**它真的会报错**。
 *
 * 巡检最容易退化成「永远输出 ✅ 的装饰品」：
 * 判定写错、路径没对上、或异常被吞，都会表现为「一切正常」。
 * 所以每条用例都造一个真实的违规库，断言它被抓到。
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { after, describe, it } from 'node:test'

const run = promisify(execFile)
const SCRIPT = new URL('../scripts/scope-audit.ts', import.meta.url).pathname

/** 造一个库，返回根目录。 */
async function makeLib(files: Record<string, string>): Promise<string> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-ops-audit-'))
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel)
    fs.mkdirSync(path.dirname(full), { recursive: true })
    fs.writeFileSync(full, content, 'utf8')
  }
  return root
}

/** 跑巡检，返回 { code, json }。 */
async function audit(root: string) {
  try {
    const { stdout } = await run('node', ['--experimental-strip-types', SCRIPT, '--json'], {
      env: { ...process.env, MEMORY_OPS_ROOT: root },
    })
    return { code: 0, json: JSON.parse(stdout) as { findings: { kind: string; path: string }[] } }
  } catch (error) {
    const failed = error as { code?: number; stdout?: string }
    return { code: failed.code ?? 1, json: JSON.parse(failed.stdout ?? '{}') as { findings: { kind: string; path: string }[] } }
  }
}

const INDEX = `---
id: work.p.index
title: p 索引
branches: [main]
---
`

describe('作用域巡检', () => {
  const made: string[] = []
  after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }) })

  it('共享层里的架构知识被报为 error，退出码非 0', async () => {
    const root = await makeLib({
      'work/p/index.md': INDEX,
      'work/p/_shared/maps/模块地图.md': '---\nid: a\ntitle: 模块地图\nknowledgeKind: architecture\n---\n',
    })
    made.push(root)
    const { code, json } = await audit(root)
    assert.notEqual(code, 0, '有 error 时退出码必须非 0，否则 CI 抓不到')
    assert.ok(json.findings.some(item => item.kind === 'bad-share'))
  })

  it('共享层条目缺 knowledgeKind 也按 error 处理（证明不了合规 = 不合规）', async () => {
    // 缺标注已被 bad-share 覆盖：canShareAcrossBranches('') === false。
    // 早先另立一个 missing-kind 分支，实际走不到 —— 死代码，已删。
    const root = await makeLib({
      'work/p/index.md': INDEX,
      'work/p/_shared/x.md': '---\nid: b\ntitle: x\n---\n',
    })
    made.push(root)
    const { code, json } = await audit(root)
    assert.notEqual(code, 0)
    assert.ok(json.findings.some(item => item.kind === 'bad-share'))
  })

  it('没落分支的条目被报出来', async () => {
    const root = await makeLib({
      'work/p/index.md': INDEX,
      'work/p/issues/遗留.md': '---\nid: c\ntitle: 遗留\n---\n',
    })
    made.push(root)
    const { json } = await audit(root)
    assert.ok(json.findings.some(item => item.kind === 'unscoped'))
  })

  it('通用分支名（main）无需声明即被识别，不误报为待办', async () => {
    // 回归：删掉 branches 字段后，work/p/main/... 曾被误报「未落分支」。
    // 内置 COMMON_BRANCH_NAMES 后，单线项目开箱即用。
    const root = await makeLib({
      'work/p/index.md': '---\nid: work.p.index\ntitle: p\n---\n',
      'work/p/main/issues/a.md': '---\nid: d\ntitle: a\n---\n',
    })
    made.push(root)
    const { json } = await audit(root)
    assert.equal(json.findings.length, 0, `main 目录不该被报待办：${JSON.stringify(json.findings)}`)
  })

  it('完全合规时零发现、退出码 0（防止巡检永远报错）', async () => {
    const root = await makeLib({
      'work/p/index.md': INDEX,
      'work/p/_shared/workflow/手册.md': '---\nid: e\ntitle: 手册\nknowledgeKind: mechanism\n---\n',
      'work/p/main/issues/缺陷.md': '---\nid: f\ntitle: 缺陷\nknowledgeKind: architecture\n---\n',
    })
    made.push(root)
    const { code, json } = await audit(root)
    assert.equal(json.findings.length, 0, `不该有发现，实际：${JSON.stringify(json.findings)}`)
    assert.equal(code, 0)
  })
})
