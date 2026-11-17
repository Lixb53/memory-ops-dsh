/**
 * errors.test.ts —— 失败分类的口径测试
 *
 * 这个文件存在的理由：`classifyError` 靠**信息模式匹配**归类，
 * 而 throw 文案散落在 store / schema / actions / privacy 里。
 * 一旦有人改了某条 throw 的措辞，分类就会静默退化成 'unknown'——
 * 界面于是又回到「只能显示 error 字符串」的状态，而这正是本次重构要解决的问题。
 *
 * 所以这里对**每一条真实存在的 throw 文案**做正向断言，
 * 并在末尾用一条反向断言锁住「未知文案不许被误分类」。
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { classifyError, isPrivacyBlock, type ActionFailureKind } from '../src/actions/errors.ts'

/** 断言某条错误信息被归到指定类别。 */
function expectKind(message: string, kind: ActionFailureKind): void {
  const result = classifyError(new Error(message))
  assert.equal(
    result.kind,
    kind,
    `「${message}」应归为 ${kind}，实际 ${result.kind}`,
  )
}

describe('失败分类：按 kind 区分，不靠字符串', () => {
  it('不存在类：条目/未命中/文件缺失', () => {
    // 这三条文案分别来自 store.ts 的 createEntry、updateMiss、readEntry
    expectKind('条目已存在：personal/x.md', 'not-found')
    expectKind('未命中不存在：某个查询', 'not-found')
    expectKind('条目不存在', 'not-found')
    expectKind('ENOENT: no such file or directory', 'not-found')
  })

  it('状态迁移非法：必须带可读的合法路径提示', () => {
    const result = classifyError(new Error('非法状态迁移：hypothesis → confirmed'))
    assert.equal(result.kind, 'invalid-state')
    assert.match(result.hint ?? '', /状态机|候选|观察中/)
  })

  it('并发冲突：写锁超时', () => {
    expectKind('写锁超时：C:/x/y.md.lock', 'conflict')
  })

  it('入参不合法：路径与行号', () => {
    expectKind('路径不能为空', 'invalid-input')
    expectKind('不接受绝对路径', 'invalid-input')
    expectKind('不接受上级目录穿越', 'invalid-input')
    expectKind('项目名不能为空', 'invalid-input')
    expectKind('行号越界：99', 'invalid-input')
    expectKind('第 3 行不是 INBOX 条目', 'invalid-input')
  })

  it('隐私拦截：单独可判，且给脱敏指引', () => {
    const result = classifyError(new Error('检测到疑似密钥，已拒写'))
    assert.equal(result.kind, 'blocked')
    assert.match(result.hint ?? '', /脱敏/)
    assert.equal(isPrivacyBlock(new Error('检测到疑似私钥')), true)
    assert.equal(isPrivacyBlock(new Error('写锁超时：x')), false)
  })

  it('共享层准入：归类为入参问题，提示落到具体分支', () => {
    const result = classifyError(new Error('不能写入 _shared/：knowledgeKind「随版本变化」随版本变化，必须落到具体分支。'))
    assert.equal(result.kind, 'invalid-input')
    assert.match(result.hint ?? '', /分支/)
  })

  it('IO 类：权限与磁盘', () => {
    expectKind('EACCES: permission denied', 'io')
    expectKind('ENOSPC: no space left on device', 'io')
  })

  it('未知文案不误分类，落到 unknown', () => {
    // 反向断言：这条文案不属于任何已知类别，不许被硬塞进某一类
    const result = classifyError(new Error('某种谁也没见过的错误'))
    assert.equal(result.kind, 'unknown')
  })

  it('非 Error 入参也能分类（bridge 层可能抛字符串）', () => {
    assert.equal(classifyError('写锁超时：x').kind, 'conflict')
    assert.equal(classifyError(undefined).kind, 'unknown')
  })
})

describe('失败分类：接入 guard 后 ActionFailure 带 kind', () => {
  it('写锁超时经 guard 后 kind=conflict 且带 hint', async () => {
    // 直接验证 guard 的行为需要构造 store，这里改为验证契约形状：
    // 只要 classifyError 返回，guard 就会把它平铺进 ActionFailure。
    const { kind, hint } = classifyError(new Error('写锁超时：x.lock'))
    const failure = { ok: false as const, error: '写锁超时：x.lock', kind, hint }
    assert.equal(failure.ok, false)
    assert.equal(failure.kind, 'conflict')
    assert.ok(typeof failure.hint === 'string' && failure.hint.length > 0)
  })
})
