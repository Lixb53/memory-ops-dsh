/**
 * 置顶注入段的单元测试。
 *
 * 锁四件事，每一件对应一条会真实出事的错误：
 *   1. 默认不注入工作域 —— 否则重演 `_shared` 那个「一个分支的结论套到另一个分支」的坑
 *   2. `rejected` 不注入 —— 被驳回的原则注入等于让模型照错的做
 *   3. 超预算要**跳过并声明**，不能静默丢弃
 *   4. 空集合返回空串而不是空段落 —— 空段落不该白占一次组装
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  PINNED_MAX_TOKENS, PINNED_SECTION_NAME, PINNED_SECTION_ORDER,
  renderPinnedSection, selectPinned,
} from '../src/pinned.ts'
import { estimateTokens } from '../src/schema.ts'

/** 造一个只需要渲染字段的条目。 */
function entry(over = {}) {
  return {
    id: 'personal.principles',
    title: '所有会话的思考过程和结果全都使用中文',
    domain: 'personal',
    pinned: true,
    status: 'confirmed',
    ...over,
  }
}

describe('置顶选择的准入', () => {
  it('未置顶的条目一律不进注入段', () => {
    assert.deepEqual(selectPinned([entry({ pinned: false })]), [])
  })

  it('个人域置顶条目默认入选', () => {
    assert.equal(selectPinned([entry()]).length, 1)
  })

  it('工作域置顶条目默认被挡在外面（按分支变化的知识不能跨会话注入）', () => {
    const work = entry({ id: 'work.sz-web.rules', domain: 'work/sz-web' })
    assert.deepEqual(selectPinned([work]), [])
    // 显式打开才注入——这是配置项存在的意义，不是默认行为
    assert.equal(selectPinned([work], { includeWork: true }).length, 1)
  })

  it('被驳回的置顶条目不再注入', () => {
    assert.deepEqual(selectPinned([entry({ status: 'rejected' })]), [])
  })

  it('stale 仍然注入：锚点失效是「待复核」，不是「已证伪」', () => {
    assert.equal(selectPinned([entry({ status: 'stale' })]).length, 1)
  })

  it('同一 id 只出现一次', () => {
    assert.equal(selectPinned([entry(), entry()]).length, 1)
  })
})

describe('置顶段落的渲染', () => {
  it('没有置顶条目时返回空串，不产生空段落', () => {
    const result = renderPinnedSection([])
    assert.equal(result.text, '')
    assert.equal(result.tokens, 0)
    assert.deepEqual(result.ids, [])
  })

  it('注入的每一条都带 id，模型据此能回填 cite', () => {
    const result = renderPinnedSection([entry()])
    assert.match(result.text, /\[personal\.principles\]/)
    assert.match(result.text, /所有会话的思考过程和结果全都使用中文/)
    assert.deepEqual(result.ids, ['personal.principles'])
    assert.equal(result.omitted, 0)
  })

  it('标题里的换行被压平，列表结构不被撑散', () => {
    const result = renderPinnedSection([entry({ title: '第一行\n第二行' })])
    assert.match(result.text, /第一行 第二行/)
    assert.equal(result.text.split('\n').filter(line => line.startsWith('- [')).length, 1)
  })

  it('tokens 与文本自洽', () => {
    const result = renderPinnedSection([entry()])
    assert.equal(result.tokens, estimateTokens(result.text))
  })

  it('超出预算的条目被跳过，并在段落里显式声明条数', () => {
    // 每条标题约 30 tokens；预算 90 放不下三条，也放不下头尾 + 三条
    const many = Array.from({ length: 6 }, (_, index) => entry({
      id: `personal.rule-${index}`,
      title: `第 ${index} 条需要长期遵守的规则，内容足够长以占满预算`,
    }))
    const result = renderPinnedSection(many, { maxTokens: 120 })
    assert.ok(result.omitted > 0, '预算 120 不该塞得下 6 条')
    assert.match(result.text, /另有 \d+ 条置顶条目超出 120 tokens 预算未注入/)
    assert.equal(result.ids.length + result.omitted, many.length)
  })

  it('预算小到一条都放不下时，仍给出截断后的一条而不是整段消失', () => {
    const result = renderPinnedSection([entry()], { maxTokens: 1 })
    assert.deepEqual(result.ids, ['personal.principles'])
    assert.match(result.text, /\[personal\.principles\]/)
  })

  it('默认预算就是常量本身', () => {
    assert.equal(PINNED_MAX_TOKENS, 256)
    // 段落骨架 + 一条中文原则，应远低于预算
    assert.ok(renderPinnedSection([entry()]).tokens < PINNED_MAX_TOKENS)
  })

  it('段落名与排序值是固定契约（改它们会让去重与排序失效）', () => {
    assert.equal(PINNED_SECTION_NAME, 'memory-ops:pinned-rules')
    assert.equal(PINNED_SECTION_ORDER, 10)
  })
})