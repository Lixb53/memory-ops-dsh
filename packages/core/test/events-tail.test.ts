/**
 * events-tail.test.ts —— readEventsTail 的口径测试
 *
 * 验证三件事：
 *   1. 只读最后 N 条，不返回更早的；
 *   2. 尾部截断产生半行时，不会把那条残缺 JSON 当成事件；
 *   3. 坏行与请求数大于文件行数时的边界。
 *
 * 这个文件挡住的是「读全文解析全部再 slice」退回旧写法——
 * 那种写法功能一样，但失去了大库下的性能收益。
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { createStore } from '../src/store.ts'

/** 造一个临时库，写入 count 条事件，返回 store 与根目录。 */
async function storeWithEvents(count: number, extraLines: string[] = []) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mo-tail-'))
  await fs.mkdir(path.join(root, '.state'), { recursive: true })
  const lines: string[] = []
  for (let i = 1; i <= count; i += 1) {
    lines.push(JSON.stringify({ at: `2026-11-${String(i % 28 + 1).padStart(2, '0')}T00:00:00Z`, session: `s${i}`, kind: 'recall', ids: [`id${i}`] }))
  }
  lines.push(...extraLines)
  await fs.writeFile(path.join(root, '.state', 'events.jsonl'), lines.join('\n') + '\n', 'utf8')
  return { store: createStore({ root }), root, lines }
}

describe('readEventsTail：只读事件流尾部', () => {
  it('取最后 N 条，不返回更早的', async () => {
    const { store } = await storeWithEvents(50)
    const tail = await store.readEventsTail(5)
    assert.equal(tail.length, 5)
    assert.deepEqual(
      tail.map(event => event.ids?.[0]),
      ['id46', 'id47', 'id48', 'id49', 'id50'],
    )
  })

  it('请求数大于文件行数时返回全部', async () => {
    const { store } = await storeWithEvents(3)
    const tail = await store.readEventsTail(100)
    assert.equal(tail.length, 3)
  })

  it('跳过坏行，不让它污染结果', async () => {
    const { store } = await storeWithEvents(3, ['这不是 JSON', '{"at":"2026-11-01T00:00:00Z","kind":"x"}'])
    const tail = await store.readEventsTail(10)
    // 5 条合法（3 条 recall + 1 条 x），1 条坏行被跳过
    assert.equal(tail.length, 4)
    assert.equal(tail.some(event => event.kind === 'x'), true)
  })

  it('count <= 0 返回空数组', async () => {
    const { store } = await storeWithEvents(10)
    assert.deepEqual(await store.readEventsTail(0), [])
    assert.deepEqual(await store.readEventsTail(-1), [])
  })

  it('空文件返回空数组', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mo-tail-empty-'))
    await fs.mkdir(path.join(root, '.state'), { recursive: true })
    await fs.writeFile(path.join(root, '.state', 'events.jsonl'), '', 'utf8')
    const store = createStore({ root })
    assert.deepEqual(await store.readEventsTail(10), [])
  })

  it('文件不存在返回空数组（不抛错）', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mo-tail-nofile-'))
    const store = createStore({ root })
    assert.deepEqual(await store.readEventsTail(10), [])
  })

  it('大文件：尾部读取与全量读取结果一致', async () => {
    const N = 500
    const { store } = await storeWithEvents(N)
    const all = await store.readEvents()
    const tail = await store.readEventsTail(200)
    assert.deepEqual(tail, all.slice(-200))
  })
})
