/**
 * scan-observable.test.ts —— 扫描的可观测性与正确性
 *
 * 两个目的：
 *   1. 验证 scanCount 计数正确——把「一次渲染 scan 几次」从猜测变成可测；
 *   2. 验证并行 scan 后**排序仍稳定**（pinned 优先、updated 降序）。
 *
 * 第 2 点尤其重要：第 1 步把串行 `for await` 改成 `Promise.all`，
 * 并行完成顺序不确定，如果排序依赖完成顺序就会出现「刷新后列表顺序跳动」。
 * 原实现靠最后显式 sort 保证稳定，这里锁住这个行为。
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { createStore } from '../src/store.ts'

async function storeWithEntries(entries: { rel: string; updated: string; pinned?: boolean }[]) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mo-scan-'))
  await fs.mkdir(path.join(root, 'personal'), { recursive: true })
  for (const e of entries) {
    const fm = [
      '---',
      `id: ${e.rel.replace(/\W/g, '.')}`,
      `title: ${e.rel}`,
      'scope: personal',
      'kind: fact',
      'layer: l2',
      'status: confirmed',
      `updated: ${e.updated}`,
      `pinned: ${e.pinned === true}`,
      'tags: []',
      '---',
      '',
      `# ${e.rel}`,
      '',
    ].join('\n')
    await fs.mkdir(path.dirname(path.join(root, e.rel)), { recursive: true })
    await fs.writeFile(path.join(root, e.rel), fm, 'utf8')
  }
  return createStore({ root })
}

describe('scan 可观测性与排序稳定性', () => {
  it('scanCount 随每次 scan 累加，reset 归零', async () => {
    const store = await storeWithEntries([
      { rel: 'personal/a.md', updated: '2026-11-01' },
    ])
    assert.equal(store.getScanCount(), 0)
    await store.scan()
    await store.scan()
    assert.equal(store.getScanCount(), 2)
    store.resetScanCount()
    assert.equal(store.getScanCount(), 0)
  })

  it('并行 scan 后排序稳定：pinned 优先，其次 updated 降序', async () => {
    const store = await storeWithEntries([
      { rel: 'personal/old.md', updated: '2026-01-01' },
      { rel: 'personal/new.md', updated: '2026-11-01' },
      { rel: 'personal/pinned-old.md', updated: '2026-02-01', pinned: true },
      { rel: 'personal/mid.md', updated: '2026-06-01' },
    ])
    // 连续扫 5 次，结果顺序必须一致——并行完成顺序不能影响输出
    const orders: string[][] = []
    for (let i = 0; i < 5; i += 1) {
      const entries = await store.scan()
      orders.push(entries.map(e => e.path))
    }
    for (let i = 1; i < orders.length; i += 1) {
      assert.deepEqual(orders[i], orders[0], `第 ${i + 1} 次扫描顺序漂移`)
    }
    assert.deepEqual(orders[0], [
      'personal/pinned-old.md',
      'personal/new.md',
      'personal/mid.md',
      'personal/old.md',
    ])
  })

  it('单个文件读失败不阻断整表（并行 Promise.all 的容错）', async () => {
    const store = await storeWithEntries([
      { rel: 'personal/good.md', updated: '2026-11-01' },
      { rel: 'personal/broken.md', updated: '2026-11-02' },
    ])
    // 把一个文件改成目录，制造 stat 成功但 readFile 失败
    const root = store.root
    await fs.unlink(path.join(root, 'personal', 'broken.md'))
    await fs.mkdir(path.join(root, 'personal', 'broken.md'))
    const entries = await store.scan()
    assert.equal(entries.length, 1)
    assert.equal(entries[0]!.path, 'personal/good.md')
  })
})
