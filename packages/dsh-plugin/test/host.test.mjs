/**
 * host 半体测试：路由注册、围栏、工具契约。
 *
 * 这一层不依赖真实 DSH 宿主：用一个假 ctx 提供 `webServer` 与 `tools`，
 * 断言「注册了什么」和「拦住了什么」。真机验证另跑，两者都要。
 */

import assert from 'node:assert/strict'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'

import { apply, BRIDGE_PREFIX } from '../lib/index.js'

let root

/**
 * 路由条数。
 *
 * 为什么不做成 `routes.length` 自证：那样测试会变成同义反复，
 * 加一条路由、删一条路由都测不出来。这个数字必须**手写**，
 * 每次增删能力都强制回来看一眼——它是「能力集合变更」的人工确认点。
 */
const ROUTE_COUNT = 34

before(async () => {
  root = await fsp.mkdtemp(path.join(os.tmpdir(), 'memory-ops-host-'))
  await fsp.mkdir(path.join(root, 'personal'), { recursive: true })
  await fsp.writeFile(
    path.join(root, 'personal', 'index.md'),
    '---\nid: personal.index\ntitle: 个人索引\nlayer: l0\nstatus: active\n---\n\n# 索引\n\n- 身份\n',
    'utf8',
  )
})

after(async () => {
  // 插件 apply 里会异步建骨架（ensureLayout），与这里的清理存在竞态：
  // 直接 rm 可能撞上刚建好的空目录。重试几次比等定时器更可靠。
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

/**
 * 挂一个假宿主，收集注册项。
 *
 * `services` 可以注入一两个宿主服务（如 `skills`），
 * 用来验证「读得到 skill 时数字要算进去」——早先所有用例都拿不到服务，
 * 于是那条路径从没被跑过，`all.filter is not a function` 才能一直藏着。
 */
function mount(config = {}, services = {}) {
  const routes = []
  const tools = []
  const child = {
    webServer: {
      register(route) {
        routes.push(route)
        return () => {}
      },
    },
    tools: {
      register(definition) {
        tools.push(definition)
        return () => {}
      },
    },
    inject(_services, run) {
      return run(child)
    },
    get() {
      return undefined
    },
  }
  const ctx = {
    inject(_services, run) {
      return run(child)
    },
    get(name) {
      return services[name]
    },
  }
  apply(ctx, { root, ...config })
  return { routes, tools }
}

/** 造一个最小的 req/res 对。 */
function makeCall({ method = 'POST', url = '/', body = '', remote = '127.0.0.1' }) {
  const chunks = body === '' ? [] : [Buffer.from(body, 'utf8')]
  const req = {
    method,
    url,
    socket: { remoteAddress: remote },
    async* [Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk
    },
  }
  const captured = { status: 0, headers: {}, payload: '' }
  const res = {
    writeHead(status, headers) {
      captured.status = status
      captured.headers = headers
    },
    end(payload) {
      captured.payload = payload
    },
  }
  return { req, res, captured }
}

describe('常驻前缀的 skill 计入（异步宿主服务）', () => {
  it('skills.list() 是 async 时，catalog 必须算进每请求付费', async () => {
    /**
     * 这条用例是为一个被静默吞掉的 TypeError 加的。
     *
     * 宿主 `skills.list()` 返回 Promise，早先同步当数组 filter →
     * 抛 `all.filter is not a function` → 被 catch 成「读不到 skill」→
     * 常驻前缀恒等于框架 171。数字有值，所以没人怀疑它错。
     */
    const { routes } = mount({}, {
      skills: {
        async list() {
          await new Promise(resolve => setTimeout(resolve, 3))
          return [
            { name: 'personal-memory', description: '读我的个人画像时使用', path: '/s/a/SKILL.md' },
            { name: 'memory-ops', description: '记东西与查记忆时使用，别把整库塞进上下文', path: '/s/b/SKILL.md' },
          ]
        },
      },
    })
    const route = routes.find(item => item.path.endsWith('/overview'))
    const { req, res, captured } = makeCall({ url: `${BRIDGE_PREFIX}/overview`, body: '{}' })
    await route.handler(req, res)
    const payload = JSON.parse(captured.payload)

    assert.equal(payload.resident.state, 'ok', `读不到 skill：${payload.resident.error}`)
    assert.equal(payload.resident.error, '')
    // 两条 description 的 token 必须真的计入，而不是只剩框架
    assert.equal(payload.resident.catalogTokens > 0, true, 'catalogTokens 必须大于 0')
    assert.equal(payload.resident.billedTokens, payload.resident.catalogTokens + payload.resident.frameTokens)
    assert.equal(payload.kpi.residentTokens, payload.resident.billedTokens, 'KPI 必须取 billedTokens 口径')
    assert.equal(
      payload.resident.items.filter(item => item.kind === 'catalog').length, 2,
      '两条有 description 的 skill 都该出现在构成里',
    )
  })

  it('skills.list() 抛错时明确标 error，不冒充「没有 skill」', async () => {
    const { routes } = mount({}, {
      skills: { async list() { throw new Error('boom') } },
    })
    const route = routes.find(item => item.path.endsWith('/overview'))
    const { req, res, captured } = makeCall({ url: `${BRIDGE_PREFIX}/overview`, body: '{}' })
    await route.handler(req, res)
    const payload = JSON.parse(captured.payload)
    assert.equal(payload.resident.state, 'error')
    assert.match(payload.resident.error, /boom/)
  })
})

describe('host 路由', () => {
  it(`注册 ${ROUTE_COUNT} 条 exact 路由，路径不重复`, () => {
    const { routes } = mount()
    assert.equal(routes.length, ROUTE_COUNT)
    const paths = routes.map(route => route.path)
    assert.equal(new Set(paths).size, paths.length)
    for (const route of routes) {
      assert.equal(route.kind, 'exact')
      assert.equal(route.path.startsWith(`${BRIDGE_PREFIX}/`), true)
    }
  })

  it('healthCheck 返回根目录与路由数', async () => {
    const { routes } = mount()
    const route = routes.find(item => item.path.endsWith('/healthCheck'))
    const { req, res, captured } = makeCall({ method: 'GET', url: `${BRIDGE_PREFIX}/healthCheck` })
    await route.handler(req, res)
    const payload = JSON.parse(captured.payload)
    assert.equal(payload.ok, true)
    assert.equal(payload.root, root)
    assert.equal(payload.routes, ROUTE_COUNT)
  })

  it('非回环请求一律 403', async () => {
    const { routes } = mount()
    const route = routes.find(item => item.path.endsWith('/snapshot'))
    const { req, res, captured } = makeCall({
      url: `${BRIDGE_PREFIX}/snapshot`, body: '{}', remote: '192.168.1.9',
    })
    await route.handler(req, res)
    assert.equal(captured.status, 403)
    assert.match(JSON.parse(captured.payload).error, /回环/)
  })

  it('方法不匹配返回 405', async () => {
    const { routes } = mount()
    const route = routes.find(item => item.path.endsWith('/snapshot'))
    const { req, res, captured } = makeCall({ method: 'GET', url: `${BRIDGE_PREFIX}/snapshot` })
    await route.handler(req, res)
    assert.equal(captured.status, 405)
  })

  it('snapshot 返回真实条目', async () => {
    const { routes } = mount()
    const route = routes.find(item => item.path.endsWith('/snapshot'))
    const { req, res, captured } = makeCall({ url: `${BRIDGE_PREFIX}/snapshot`, body: '{}' })
    await route.handler(req, res)
    const payload = JSON.parse(captured.payload)
    assert.equal(payload.ok, true)
    assert.equal(payload.entries.length >= 1, true)
    assert.equal(payload.stats.layers.l0.files >= 1, true)
  })

  it('坏 JSON 请求体返回 500 而不是崩掉进程', async () => {
    const { routes } = mount()
    const route = routes.find(item => item.path.endsWith('/snapshot'))
    const { req, res, captured } = makeCall({ url: `${BRIDGE_PREFIX}/snapshot`, body: '{坏' })
    await route.handler(req, res)
    assert.equal(captured.status, 500)
    assert.equal(JSON.parse(captured.payload).ok, false)
  })

  it('隐私拦截返回 400 且带脱敏文本', async () => {
    const { routes } = mount()
    const route = routes.find(item => item.path.endsWith('/capture'))
    const { req, res, captured } = makeCall({
      url: `${BRIDGE_PREFIX}/capture`,
      body: JSON.stringify({ content: 'key: sk-abcdefghijklmnopqrstuvwx' }),
    })
    await route.handler(req, res)
    assert.equal(captured.status, 400)
    const payload = JSON.parse(captured.payload)
    assert.equal(payload.blocked, true)
    assert.equal(payload.masked.includes('sk-abcdefghijklmnopqrstuvwx'), false)
  })
})

describe('维护作业路由', () => {
  /** 走一次路由并返回解析后的载荷。 */
  async function hit(routes, name, body = {}) {
    const route = routes.find(item => item.path.endsWith(`/${name}`))
    assert.notEqual(route, undefined, `路由 ${name} 未注册`)
    const { req, res, captured } = makeCall({
      url: `${BRIDGE_PREFIX}/${name}`, body: JSON.stringify(body),
    })
    await route.handler(req, res)
    return { status: captured.status, payload: JSON.parse(captured.payload) }
  }

  it('review 返回窗口、事件计数与行动项', async () => {
    const { routes } = mount()
    const { status, payload } = await hit(routes, 'review', { days: 7 })
    assert.equal(status, 200)
    assert.equal(payload.ok, true)
    assert.equal(payload.window.days, 7)
    assert.equal(typeof payload.events, 'object')
    assert.equal(Array.isArray(payload.todo), true)
  })

  it('promote 默认 dry-run：有计划也不改库', async () => {
    const { routes } = mount()
    const { payload } = await hit(routes, 'promote', {})
    assert.equal(payload.ok, true)
    assert.equal(payload.applied, false)
    assert.equal(payload.changed.length, 0)
  })

  it('compact 默认 dry-run：列候选但不写盘', async () => {
    const { routes } = mount()
    const { payload } = await hit(routes, 'compact', {})
    assert.equal(payload.ok, true)
    assert.equal(payload.applied, false)
    assert.equal(Array.isArray(payload.candidates), true)
    assert.equal(payload.written.length, 0)
  })

  it('verifyAnchor 默认 dry-run，并如实报出基准目录', async () => {
    const { routes } = mount()
    const { payload } = await hit(routes, 'verifyAnchor', { baseDir: '/some/repo' })
    assert.equal(payload.ok, true)
    assert.equal(payload.applied, false)
    assert.equal(payload.baseDir, '/some/repo')
    assert.equal(payload.changed.length, 0)
    // 测试库里的条目没有 anchor，应全部计入 withoutAnchor 而不是报错
    assert.equal(payload.checks.length, 0)
    assert.equal(payload.withoutAnchor >= 1, true)
  })

  it('锚点读取器拒绝穿越与绝对路径（读不到 → 不判 fresh）', async () => {
    const { routes } = mount()
    const entry = [
      '---',
      'id: work.demo.escape',
      'title: 越界锚点',
      'anchor:',
      '  - path: ../../../etc/passwd',
      '    symbol: root',
      '---',
      '',
      '# 越界锚点',
      '',
    ].join('\n')
    await fsp.mkdir(path.join(root, 'work', 'demo'), { recursive: true })
    await fsp.writeFile(path.join(root, 'work', 'demo', 'escape.md'), entry, 'utf8')

    const { payload } = await hit(routes, 'verifyAnchor', {})
    const check = payload.checks.find(item => item.path === 'work/demo/escape.md')
    assert.notEqual(check, undefined, '带锚点的条目必须被校验')
    assert.notEqual(check.state, 'fresh', '越界路径不许被判成有效')
  })
})

describe('agent 工具契约', () => {
  it('注册 memory_recall 与 memory_write', () => {
    const { tools } = mount()
    assert.deepEqual(tools.map(tool => tool.name).sort(), ['memory_recall', 'memory_write'])
  })

  it('每个工具都声明 output { schema, render }', () => {
    const { tools } = mount()
    for (const tool of tools) {
      assert.equal(typeof tool.output.render, 'function', `${tool.name} 缺 render`)
      assert.equal(typeof tool.output.schema, 'object', `${tool.name} 缺 schema`)
      assert.equal(tool.output.schema.type, 'object')
      assert.equal(typeof tool.execute, 'function')
      assert.equal(typeof tool.description, 'string')
      assert.equal(tool.description.length > 20, true)
    }
  })

  it('参数 schema 只用宿主支持的子集关键字', () => {
    const { tools } = mount()
    const allowed = new Set([
      'type', 'oneOf', 'properties', 'required', 'additionalProperties', 'items',
      'enum', 'const', 'description', 'title',
    ])
    function walk(node, where) {
      if (typeof node !== 'object' || node === null) return
      for (const key of Object.keys(node)) {
        assert.equal(allowed.has(key), true, `${where}.${key} 不在支持子集内`)
      }
      for (const [key, value] of Object.entries(node.properties ?? {})) {
        walk(value, `${where}.properties.${key}`)
      }
      if (node.items !== undefined) walk(node.items, `${where}.items`)
    }
    for (const tool of tools) {
      walk(tool.parameters, `${tool.name}.parameters`)
      walk(tool.output.schema, `${tool.name}.output`)
    }
  })

  it('memory_recall 命中真实条目', async () => {
    const { tools } = mount()
    const recall = tools.find(tool => tool.name === 'memory_recall')
    const value = await recall.execute({ query: '索引' }, { agent: { id: 'test' } })
    assert.equal(value.matched, true)
    assert.equal(value.hits.length >= 1, true)
    assert.match(value.text, /记忆库命中/)
    // render 必须产出文本块
    const blocks = recall.output.render({}, value)
    assert.equal(blocks[0].type, 'text')
    assert.equal(blocks[0].text, value.text)
  })

  it('memory_recall 未命中时提示写回，并记 miss', async () => {
    const { tools } = mount()
    const recall = tools.find(tool => tool.name === 'memory_recall')
    const value = await recall.execute({ query: '绝对不存在的词zzz' }, { agent: { id: 'test' } })
    assert.equal(value.matched, false)
    assert.match(value.text, /未命中/)
    const misses = await fsp.readFile(path.join(root, '.state', 'misses.json'), 'utf8')
    assert.equal(misses.includes('绝对不存在的词zzz'), true)
  })

  it('memory_write 无证据拒收（G2）', async () => {
    const { tools } = mount()
    const write = tools.find(tool => tool.name === 'memory_write')
    const value = await write.execute(
      { mode: 'entry', content: '一条结论', origin: 'G2' },
      { agent: { id: 'test' } },
    )
    assert.equal(value.ok, false)
    assert.match(value.message, /证据必填/)
  })

  it('memory_write G1 直述可豁免证据', async () => {
    const { tools } = mount()
    const write = tools.find(tool => tool.name === 'memory_write')
    const value = await write.execute(
      { mode: 'entry', content: '用户直述的偏好', title: '偏好', origin: 'G1', path: 'personal/notes/g1.md' },
      { agent: { id: 'test' } },
    )
    assert.equal(value.ok, true)
    const raw = await fsp.readFile(path.join(root, 'personal', 'notes', 'g1.md'), 'utf8')
    assert.match(raw, /status: confirmed/)
    assert.match(raw, /origin: G1/)
  })

  it('memory_write inbox 模式进记录流', async () => {
    const { tools } = mount()
    const write = tools.find(tool => tool.name === 'memory_write')
    const value = await write.execute(
      { mode: 'inbox', content: '一个想法', kind: '想法' },
      { agent: { id: 'test' } },
    )
    assert.equal(value.ok, true)
    assert.match(value.path, /INBOX\.md$/)
  })

  it('memory_write 隐私拦截返回脱敏文本', async () => {
    const { tools } = mount()
    const write = tools.find(tool => tool.name === 'memory_write')
    const value = await write.execute(
      { mode: 'inbox', content: 'token: ghp_abcdefghijklmnopqrstuvwxyz0123' },
      { agent: { id: 'test' } },
    )
    assert.equal(value.ok, false)
    assert.equal(value.blocked, true)
    assert.equal(value.masked.includes('ghp_abcdefghijklmnopqrstuvwxyz0123'), false)
  })

  it('origin 非法被拒', async () => {
    const { tools } = mount()
    const write = tools.find(tool => tool.name === 'memory_write')
    const value = await write.execute(
      { mode: 'inbox', content: 'x', origin: 'G9' },
      { agent: { id: 'test' } },
    )
    assert.equal(value.ok, false)
    assert.match(value.message, /origin 必须是/)
  })
})

describe('命中率闭环（cite 必须真的能产生）', () => {
  it('memory_recall 带 cite 时写 cite 事件，命中率不再恒为 0', async () => {
    const { tools } = mount()
    const recall = tools.find(tool => tool.name === 'memory_recall')

    // 1. 先搜一次 → 记 recall（分母）
    const first = await recall.execute({ query: '索引' }, { agent: { id: 'test' } })
    assert.equal(first.matched, true)
    const targetId = first.hits[0].id

    // 2. 回填 cite（分子）—— 这才是「真的用上了」
    await recall.execute({ query: '索引', cite: [targetId] }, { agent: { id: 'test' } })

    const events = (await fsp.readFile(path.join(root, '.state', 'events.jsonl'), 'utf8'))
      .trim().split('\n').map(line => JSON.parse(line))
    assert.equal(events.some(e => e.kind === 'recall'), true, '缺 recall（分母）')
    assert.equal(events.some(e => e.kind === 'cite'), true, '缺 cite（分子）——命中率会恒为 0')

    // 3. 统计里命中率必须是可算的
    const route = mount().routes.find(item => item.path.endsWith('/overview'))
    const { req, res, captured } = makeCall({ url: `${BRIDGE_PREFIX}/overview`, body: '{}' })
    await route.handler(req, res)
    const overview = JSON.parse(captured.payload)
    assert.notEqual(overview.kpi.hitRate, null, '命中率不该是 null')
    assert.equal(overview.kpi.hitRate > 0, true, '记了 cite 之后命中率必须大于 0')
  })

  it('cite 里不存在的 id 被丢弃（不许凭空记引用）', async () => {
    const { tools } = mount()
    const recall = tools.find(tool => tool.name === 'memory_recall')
    const before = (await fsp.readFile(path.join(root, '.state', 'events.jsonl'), 'utf8'))
      .split('\n').filter(line => line.includes('"kind":"cite"')).length
    await recall.execute({ query: '索引', cite: ['根本不存在的.id'] }, { agent: { id: 'test' } })
    const after = (await fsp.readFile(path.join(root, '.state', 'events.jsonl'), 'utf8'))
      .split('\n').filter(line => line.includes('"kind":"cite"')).length
    assert.equal(after, before, '不在命中列表里的 id 不该被记 cite')
  })
})
