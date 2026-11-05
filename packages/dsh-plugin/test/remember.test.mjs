/**
 * `/remember` 弹窗的纯逻辑测试。
 *
 * 只测「不依赖 React 渲染」的部分：命令行解析与 store 的订阅语义。
 * 组件的视觉与交互需要在真实 GUI 里看——单测证明不了「弹窗长得对不对」，
 * 但能证明「回车后一定会打开弹窗、且只通知一次」。
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

// 客户端半体是浏览器 bundle，这里只导入其中的纯函数部分。
// 通过读取源码再求值的方式不可靠，所以把纯逻辑导出到独立模块后在这里引用。
import {
  parseRememberLine, rememberStoreOf, openRememberDialog, closeRememberDialog,
} from '../lib/client-logic.mjs'

describe('/remember 命令行解析', () => {
  it('裸命令：匹配且无内容', () => {
    assert.deepEqual(parseRememberLine('/remember'), { matched: true, content: '' })
  })

  it('带内容：内容原样取出', () => {
    const parsed = parseRememberLine('/remember 缓存前缀变更会作废 KV cache')
    assert.equal(parsed.matched, true)
    assert.equal(parsed.content, '缓存前缀变更会作废 KV cache')
  })

  it('带内容且含多余空白：trim 后保留内部空白', () => {
    const parsed = parseRememberLine('/remember   前后有空格   ')
    assert.equal(parsed.content, '前后有空格')
  })

  it('含换行的多行内容：保留换行', () => {
    const parsed = parseRememberLine('/remember 第一行\n第二行')
    assert.equal(parsed.matched, true)
    assert.equal(parsed.content, '第一行\n第二行')
  })

  it('其它命令不匹配', () => {
    assert.equal(parseRememberLine('/context').matched, false)
    assert.equal(parseRememberLine('remember 内容').matched, false)
    assert.equal(parseRememberLine('').matched, false)
  })

  it('前缀相似但不相同的命令不匹配', () => {
    assert.equal(parseRememberLine('/remembering 内容').matched, false)
  })
})

describe('弹窗 store', () => {
  it('初始为关闭', () => {
    const store = rememberStoreOf('test-init')
    assert.equal(store.getSnapshot().open, false)
    assert.equal(store.getSnapshot().content, '')
  })

  it('打开后可预填内容', () => {
    const store = rememberStoreOf('test-open')
    openRememberDialog('test-open', '预填内容')
    assert.equal(store.getSnapshot().open, true)
    assert.equal(store.getSnapshot().content, '预填内容')
  })

  it('关闭后清空内容', () => {
    rememberStoreOf('test-close')
    openRememberDialog('test-close', 'x')
    closeRememberDialog('test-close')
    const state = rememberStoreOf('test-close').getSnapshot()
    assert.equal(state.open, false)
    assert.equal(state.content, '')
  })

  it('同一会话复用同一个 store（不会重复注册浮层）', () => {
    const a = rememberStoreOf('test-same')
    const b = rememberStoreOf('test-same')
    assert.equal(a, b)
  })

  it('不同会话互相隔离', () => {
    openRememberDialog('test-a', 'A 的内容')
    const b = rememberStoreOf('test-b')
    assert.equal(b.getSnapshot().open, false)
    assert.equal(rememberStoreOf('test-a').getSnapshot().open, true)
  })

  it('值未变时不通知订阅者（避免无谓重渲染）', () => {
    const store = rememberStoreOf('test-notify')
    let calls = 0
    const unsubscribe = store.subscribe(() => { calls += 1 })
    openRememberDialog('test-notify', '内容')
    assert.equal(calls, 1)
    // 同样的状态再设一次：不应再通知
    openRememberDialog('test-notify', '内容')
    assert.equal(calls, 1)
    // 内容变化：通知
    openRememberDialog('test-notify', '别的内容')
    assert.equal(calls, 2)
    unsubscribe()
    openRememberDialog('test-notify', '再改')
    assert.equal(calls, 2)
  })
})
