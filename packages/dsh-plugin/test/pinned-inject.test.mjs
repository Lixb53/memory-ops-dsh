/**
 * 置顶注入的接线测试。
 *
 * 分两层：
 *   - **缓存层**：用假 scan + 假时钟验证「按会话冻结」与「冷启动不冻结空串」。
 *     这两条走真文件与真 30s TTL 都测不出来，而写错的后果都是静默的。
 *   - **接线层**：用假 `systemPrompt` 服务断言段落名、排序、`interpolate: false`，
 *     以及总览的每请求成本确实把注入段算了进去。
 */

import assert from 'node:assert/strict'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'

import { apply, BRIDGE_PREFIX, createPinnedCache } from '../lib/index.js'

/** 段落名与排序值在这里**手写**：它们是契约，改了就该让测试红。 */
const SECTION_NAME = 'memory-ops:pinned-rules'
const SECTION_ORDER = 10

let root

before(async () => {
  root = await fsp.mkdtemp(path.join(os.tmpdir(), 'memory-ops-pinned-'))
  await fsp.mkdir(path.join(root, 'personal'), { recursive: true })
  await fsp.mkdir(path.join(root, 'work', 'demo'), { recursive: true })
  // 置顶的个人域原则
  await fsp.writeFile(
    path.join(root, 'personal', 'principles.md'),
    '---\nid: personal.principles\ntitle: 所有会话的思考过程和结果全都使用中文\nlayer: l2\nstatus: confirmed\npinned: true\nupdated: 2026-11-20\ntags: []\n---\n\n# 原则\n\n所有会话的思考过程和结果全都使用中文\n',
    'utf8',
  )
  // 置顶的工作域条目：默认不该被注入
  await fsp.writeFile(
    path.join(root, 'work', 'demo', 'rules.md'),
    '---\nid: work.demo.rules\ntitle: 这个分支的约定\nlayer: l2\nstatus: confirmed\npinned: true\nupdated: 2026-11-20\ntags: []\n---\n\n# 规则\n\n这个分支的约定\n',
    'utf8',
  )
})

after(async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await fsp.rm(root, { recursive: true, force: true, maxRetries: 3 })
      return
    } catch (error) {
      if (attempt === 4) throw error
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }
})

/** 让出一轮事件循环，等 fire-and-forget 的扫描落地。 */
async function settle(rounds = 3) {
  for (let index = 0; index < rounds; index += 1) {
    await new Promise(resolve => setImmediate(resolve))
  }
}

/**
 * 轮询直到条件成立。
 *
 * 为什么不用固定次数的 `settle`：预热是 fire-and-forget，落地时点取决于
 * 真实磁盘 IO——写死次数会在慢机器上假红、在快机器上又会掩盖「其实没等到」。
 */
async function waitUntil(check, { timeoutMs = 3000, label = '条件' } = {}) {
  const started = Date.now()
  for (;;) {
    const value = check()
    if (value) return value
    if (Date.now() - started > timeoutMs) throw new Error(`等待超时：${label}`)
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

/**
 * 挂一个假宿主，额外提供 `systemPrompt` 服务以捕获段落注册。
 */
function mount(config = {}, { withSystemPrompt = true } = {}) {
  const routes = []
  const sections = []
  const child = {
    webServer: { register(route) { routes.push(route); return () => {} } },
    tools: { register(definition) { return () => {} } },
    systemPrompt: {
      section(section) {
        sections.push(section)
        return () => {}
      },
    },
    inject(_services, run) { return run(child) },
    get() { return undefined },
  }
  const ctx = {
    inject(services, run) {
      // 没有 systemPrompt 服务的宿主：那些行不该被跑起来
      if (!withSystemPrompt && services.includes('systemPrompt')) return undefined
      return run(child)
    },
    get() { return undefined },
  }
  apply(ctx, { root, ...config })
  return { routes, sections }
}

async function overviewOf(routes) {
  const route = routes.find(item => item.path.endsWith('/overview'))
  assert.notEqual(route, undefined, 'overview 路由未注册')
  const captured = {}
  const req = {
    method: 'POST',
    url: `${BRIDGE_PREFIX}/overview`,
    socket: { remoteAddress: '127.0.0.1' },
    async *[Symbol.asyncIterator]() { yield Buffer.from('{}', 'utf8') },
  }
  const res = {
    writeHead(status) { captured.status = status },
    end(payload) { captured.payload = payload },
  }
  await route.handler(req, res)
  return JSON.parse(captured.payload)
}

describe('置顶注入：段落注册', () => {
  it('注册了固定名字与排序值的段落，并关掉变量插值', async () => {
    const { sections } = mount()
    await settle()
    assert.equal(sections.length, 1, '只该注册一个段落')
    const section = sections[0]
    assert.equal(section.name, SECTION_NAME)
    assert.equal(section.order, SECTION_ORDER)
    // 记忆正文是用户写的任意 Markdown。宿主插值是严格的：出现未注册的
    // {{...}} 会让整次提示词组装抛错，一条内容就能炸掉全部请求。
    assert.equal(section.interpolate, false)
    assert.equal(typeof section.text, 'function', 'text 必须是同步回调，缓存由插件自己维护')
  })

  it('injectPinned: false 时不注册段落（退回纯拉取模型）', async () => {
    const { sections } = mount({ injectPinned: false })
    await settle()
    assert.equal(sections.length, 0)
  })

  it('宿主没有 systemPrompt 服务时静默跳过，不影响其余能力', async () => {
    const { sections, routes } = mount({}, { withSystemPrompt: false })
    await settle()
    assert.equal(sections.length, 0)
    assert.ok(routes.length > 0, '记忆库其余部分必须照常工作')
  })
})

describe('置顶注入：内容与作用域', () => {
  it('个人域置顶条目进入段落，带 id 供模型回填 cite', async () => {
    const { sections } = mount()
    // 预热是 fire-and-forget：等到真的注入了再断言
    const text = await waitUntil(
      () => sections[0].text({ agent: { id: 'session-a' } }),
      { label: '个人域置顶条目注入' },
    )
    assert.match(text, /记忆库置顶规则/)
    assert.match(text, /\[personal\.principles\]/)
    assert.match(text, /所有会话的思考过程和结果全都使用中文/)
  })

  it('工作域置顶条目默认不注入', async () => {
    const { sections } = mount()
    const text = await waitUntil(
      () => sections[0].text({ agent: { id: 'session-a' } }),
      { label: '个人域置顶条目注入' },
    )
    assert.doesNotMatch(text, /work\.demo\.rules/)
  })

  it('injectWorkPinned: true 才带上工作域', async () => {
    const { sections } = mount({ injectWorkPinned: true })
    const text = await waitUntil(
      () => sections[0].text({ agent: { id: 'session-a' } }),
      { label: '工作域置顶条目注入' },
    )
    assert.match(text, /work\.demo\.rules/)
  })
})

describe('置顶注入：按会话冻结', () => {
  /** 造一条最小可用条目。 */
  function entry(id, title) {
    return { id, title, domain: 'personal', pinned: true, status: 'confirmed' }
  }

  it('同一会话只快照一次，中途换内容也不变', async () => {
    let clock = 0
    let current = [entry('personal.a', '第一条原则')]
    const cache = createPinnedCache({
      scan: async () => current,
      // TTL 拉到极大：本用例要验的是冻结，不是过期
      refreshTtlMs: 1_000_000,
      now: () => clock,
    })
    await cache.refresh()

    const first = cache.renderFor('session-a')
    assert.match(first, /第一条原则/)

    current = [entry('personal.a', '第一条原则'), entry('personal.b', '第二条原则')]
    await cache.refresh()

    assert.equal(cache.renderFor('session-a'), first, '老会话必须保持同一份快照')
    assert.match(cache.renderFor('session-b'), /第二条原则/)
    assert.match(cache.current().text, /第二条原则/, 'current() 永远是最新一份')
  })

  it('冷启动未就绪时不冻结空串——否则该会话永远拿不到内容', async () => {
    let release
    const pending = new Promise(resolve => { release = resolve })
    const cache = createPinnedCache({
      scan: () => pending,
      refreshTtlMs: 1_000_000,
      now: () => 0,
    })

    // 第一次组装：扫描还没回来
    assert.equal(cache.renderFor('session-a'), '')

    release([entry('personal.a', '第一条原则')])
    await settle()

    assert.match(cache.renderFor('session-a'), /第一条原则/)
  })

  it('扫描失败时保留上一份快照，不把原则整段抽走', async () => {
    let fail = false
    const cache = createPinnedCache({
      scan: async () => {
        if (fail) throw new Error('磁盘抖动')
        return [entry('personal.a', '第一条原则')]
      },
      refreshTtlMs: 0,
      now: () => 0,
    })
    await cache.refresh()
    const ok = cache.current().text
    assert.match(ok, /第一条原则/)

    fail = true
    await cache.refresh()
    assert.equal(cache.current().text, ok)
  })

  it('dispose 清空冻结快照', async () => {
    const cache = createPinnedCache({
      scan: async () => [entry('personal.a', '第一条原则')],
      refreshTtlMs: 1_000_000,
      now: () => 0,
    })
    await cache.refresh()
    assert.match(cache.renderFor('session-a'), /第一条原则/)
    cache.dispose()
    assert.equal(cache.current().text, '')
  })
})

describe('总览：每请求成本要算进注入段', () => {
  it('没有置顶条目时 injectedTokens 为 0，口径与旧版一致', async () => {
    const emptyRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'memory-ops-nopin-'))
    try {
      const payload = await overviewOf(mountRoutes(emptyRoot))
      assert.equal(payload.resident.injectedTokens, 0)
      assert.equal(
        payload.resident.billedTokens,
        payload.resident.catalogTokens + payload.resident.frameTokens,
      )
      assert.equal(payload.resident.items.filter(item => item.kind === 'injected').length, 0)
    } finally {
      await fsp.rm(emptyRoot, { recursive: true, force: true })
    }
  })

  it('有置顶条目时 billedTokens 必须包含注入段', async () => {
    const payload = await overviewOf(mountRoutes(root, { maxPinnedTokens: 256 }))
    assert.ok(payload.resident.injectedTokens > 0, '注入了就必须报出成本')
    assert.equal(
      payload.resident.billedTokens,
      payload.resident.catalogTokens + payload.resident.frameTokens + payload.resident.injectedTokens,
    )
    assert.equal(payload.kpi.residentTokens, payload.resident.billedTokens, 'KPI 与构成必须同一个数')
    assert.equal(payload.resident.items.some(item => item.kind === 'injected'), true)
  })

  it('injectPinned: false 时总览不计注入成本', async () => {
    const payload = await overviewOf(mountRoutes(root, { injectPinned: false }))
    assert.equal(payload.resident.injectedTokens, 0)
  })
})

/** 用指定根目录挂一次插件，返回路由表。 */
function mountRoutes(targetRoot, config = {}) {
  const routes = []
  const child = {
    webServer: { register(route) { routes.push(route); return () => {} } },
    tools: { register() { return () => {} } },
    systemPrompt: { section() { return () => {} } },
    inject(_services, run) { return run(child) },
    get() { return undefined },
  }
  const ctx = {
    inject(_services, run) { return run(child) },
    get() { return undefined },
  }
  apply(ctx, { root: targetRoot, ...config })
  return routes
}