/**
 * 注册接线测试：挡住「逻辑对但没接上」这类 bug。
 *
 * 为什么需要这一层：remember.test.mjs 测的是纯函数（解析、store），
 * 全绿也不能保证命令真的被宿主接管。实测踩到两个坑，纯函数测试一个都拦不住：
 *
 *   1. `'handled'` 必须返回字符串字面量本身。包成 `{kind:'handled'}` 会被宿主
 *      当成未知形态，落回默认发送路径——表现为「回车后消息直接发进对话」。
 *   2. `inputTriggers` 必须用 `ctx.inject([...])` 等就绪。用 `ctx.get()` 在 apply
 *      时取，拿到 undefined，注册被静默跳过——表现为「命令完全不生效」。
 *
 * 这里用假 ctx 把 apply 跑起来，断言「确实调用了 registerSource」和
 * 「返回的 outcome 形态符合宿主契约」。
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { registerRemember } from '../lib/client-logic.mjs'

describe('registerRemember 接线', () => {
  /** 造一个假客户端 ctx，记录注册行为。 */
  function makeCtx() {
    const sources = []
    const slots = []
    const injections = []
    const ctx = {
      slots: {
        inject(key, callback) {
          slots.push(key)
          callback()
          return () => {}
        },
        register(options) {
          slots.push(options.name)
          return () => {}
        },
      },
      inject(services, run) {
        injections.push(services)
        // 模拟宿主：把 inputTriggers 服务注入进来
        const child = {
          inputTriggers: {
            registerSource(source) {
              sources.push(source)
              return () => {}
            },
          },
          get(name) {
            return name === 'inputTriggers' ? child.inputTriggers : undefined
          },
        }
        run(child)
        return () => {}
      },
      get() {
        return undefined
      },
    }
    return { ctx, sources, slots, injections }
  }

  it('通过 ctx.inject 等待 inputTriggers 就绪（不能用 ctx.get 直接取）', () => {
    const { ctx, injections } = makeCtx()
    registerRemember(ctx)
    const waited = injections.some(services => services.includes('inputTriggers'))
    assert.equal(waited, true, '必须用 ctx.inject([inputTriggers]) 等就绪，否则注册会被静默跳过')
  })

  it('确实向宿主注册了触发源', () => {
    const { ctx, sources } = makeCtx()
    registerRemember(ctx)
    assert.equal(sources.length, 1)
    assert.equal(sources[0].trigger, '/')
    assert.equal(sources[0].name, 'remember')
  })

  it('注册了输入框浮层槽位', () => {
    const { ctx, slots } = makeCtx()
    registerRemember(ctx)
    assert.equal(slots.includes('conversation.input.overlay'), true)
  })

  it('onPick 返回字符串 "handled"（不能是对象）', () => {
    const { ctx, sources } = makeCtx()
    registerRemember(ctx)
    const outcome = sources[0].onPick({
      candidate: { name: 'remember' },
      session: { sessionId: 's1' },
      span: {},
    })
    assert.equal(
      outcome, 'handled',
      'PickOutcome 的 handled 是字符串字面量；返回 {kind:"handled"} 会落回默认发送路径，消息被当普通文本发出去',
    )
  })

  it('matchEnter 对 /remember 返回字符串 "handled"', async () => {
    const { ctx, sources } = makeCtx()
    registerRemember(ctx)
    const outcome = await sources[0].matchEnter(
      { sessionId: 's1' }, '/remember', new AbortController().signal, { attachments: 0 },
    )
    assert.equal(outcome, 'handled')
  })

  it('matchEnter 对带内容的 /remember 也返回 handled（弹窗预填，不是直接提交）', async () => {
    const { ctx, sources } = makeCtx()
    registerRemember(ctx)
    const outcome = await sources[0].matchEnter(
      { sessionId: 's1' }, '/remember 一句话', new AbortController().signal, { attachments: 0 },
    )
    assert.equal(outcome, 'handled')
  })

  it('matchEnter 对其它命令返回 undefined（交还默认路径）', async () => {
    const { ctx, sources } = makeCtx()
    registerRemember(ctx)
    for (const line of ['/context', '普通消息', '/remembering x', '']) {
      const outcome = await sources[0].matchEnter(
        { sessionId: 's1' }, line, new AbortController().signal, { attachments: 0 },
      )
      assert.equal(outcome, undefined, `「${line}」不该被接管`)
    }
  })

  it('带附件时不接管（交给附件的处理链路）', async () => {
    const { ctx, sources } = makeCtx()
    registerRemember(ctx)
    const outcome = await sources[0].matchEnter(
      { sessionId: 's1' }, '/remember', new AbortController().signal, { attachments: 1 },
    )
    assert.equal(outcome, undefined)
  })

  it('菜单候选只在 leading 位置给出', async () => {
    const { ctx, sources } = makeCtx()
    registerRemember(ctx)
    const leading = await sources[0].candidates(
      { sessionId: 's1' }, { query: 'rem', position: 'leading' },
    )
    assert.equal(leading.length, 1)
    assert.equal(leading[0].name, 'remember')

    const inline = await sources[0].candidates(
      { sessionId: 's1' }, { query: 'rem', position: 'inline' },
    )
    assert.deepEqual(inline, [])
  })
})
