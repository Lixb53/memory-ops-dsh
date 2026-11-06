/**
 * 接线测试：挡住「能力有、UI 没有入口」这类缺口回潮。
 *
 * ## 为什么要单独测「接线」
 *
 * product.md §2.3 的诚实清单全部长这样：core 有能力、bridge 有路由、测试也齐，
 * 但用户界面上找不到那个按钮。这类缺口**不会让任何单测变红**——
 * 逻辑是对的，只是没人调用它。于是它能在仓库里静静待上几个版本。
 *
 * 所以这里不测行为，只测一件事实：**每个能力都有客户端调用点**。
 * 做法是静态扫描 client 源码里的 `call('<route>')` 与 `useBridge('<route>')`。
 *
 * 这条测试的价值在于它会失败：删掉任何一个按钮，它立刻红。
 */

import assert from 'node:assert/strict'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_DIR = path.join(here, '..', 'src', 'client')
const SRC_DIR = path.join(here, '..', 'src')

/** 递归收集 .ts 源码。 */
async function collect(dir) {
  const out = []
  for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...await collect(full))
      continue
    }
    if (entry.name.endsWith('.ts')) out.push(full)
  }
  return out
}

/** 合并所有客户端源码，便于正则扫描。 */
async function clientSource() {
  const files = await collect(CLIENT_DIR)
  const parts = await Promise.all(files.map(async file => ({
    file,
    text: await fsp.readFile(file, 'utf8'),
  })))
  return parts
}

/** 某个路由在客户端是否有调用点（call 或 useBridge 任一种）。 */
function hasCallSite(sources, route) {
  const patterns = [
    new RegExp(`\\bcall(?:<[^>]*>)?\\(\\s*['"]${route}['"]`),
    new RegExp(`\\buseBridge(?:<[^>]*>)?\\(\\s*['"]${route}['"]`),
  ]
  return sources.filter(source => patterns.some(pattern => pattern.test(source.text)))
}

describe('UI 接线：product.md §2.3 的缺口不许回潮', () => {
  /**
   * 曾经「有路由、没入口」的 8 项能力。
   * 每一项都在这里有名字，删掉对应按钮这条测试就红。
   */
  const MUST_HAVE_UI = [
    ['reject', '驳回推断'],
    ['undoReject', '撤销驳回'],
    ['batchArchive', '批量归档'],
    ['search', '检索记账（否则命中率恒为 null）'],
    ['verifyAnchor', '锚点校验'],
    ['compact', '减重'],
    ['promote', '自动爬升'],
    ['review', '每周复盘'],
    ['repairMeta', 'frontmatter 修补'],
  ]

  for (const [route, what] of MUST_HAVE_UI) {
    it(`${what} → 有调用点（${route}）`, async () => {
      const sources = await clientSource()
      const hits = hasCallSite(sources, route)
      assert.equal(
        hits.length > 0, true,
        `没有客户端调用 \`${route}\`。这正是 product.md §2.3 记录的那类缺口：`
        + '能力与路由都在，但界面没有入口，用户用不上。',
      )
    })
  }

  it('记忆分区用 search 记检索账，而不是客户端 filter', async () => {
    const file = path.join(CLIENT_DIR, 'panes', 'memory.ts')
    const text = await fsp.readFile(file, 'utf8')
    // 注意：调用写法是跨行的 `useBridge<SearchView>(\n  'search',`，所以按字段断言而非单行正则
    assert.match(text, /SearchView/, '必须调用 search 路由（用 SearchView 类型）')
    assert.match(text, /record:/, 'search 调用必须带 record 参数，否则不记账')
    assert.match(text, /setSubmitted/, '必须有一次显式提交动作（否则每敲一个字都记一条 miss）')
  })

  it('总览 KPI 的常驻前缀取 billedTokens 口径，不是索引层', async () => {
    const overview = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'overview.ts'), 'utf8')
    // 索引层体积必须单独成格，否则两个数字会互相冒充
    assert.match(overview, /data\.kpi\.indexTokens/, '索引层体积应有独立一格')
    assert.match(overview, /data\.kpi\.residentTokens/, '常驻前缀格必须仍在')
    assert.match(overview, /每请求付费/, '常驻前缀格必须写明它是每请求付费的口径')
  })

  it('维护作业挂在总览分区，不新增第 6 个分区', async () => {
    const panel = await fsp.readFile(path.join(CLIENT_DIR, 'panel.ts'), 'utf8')
    const panes = panel.match(/\{ id: '[a-z]+', label: '[^']+' \}/g) ?? []
    assert.equal(panes.length, 5, `分区数量必须是 5，实际 ${panes.length}（product.md §11.3 明确不扩张导航）`)
    const overview = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'overview.ts'), 'utf8')
    assert.match(overview, /MaintenancePanel/, '维护面板必须挂进总览')
  })

  it('驳回入口在待处理队列与记忆详情两处都有', async () => {
    for (const file of ['project.ts', 'memory.ts']) {
      const text = await fsp.readFile(path.join(CLIENT_DIR, 'panes', file), 'utf8')
      assert.match(text, /'reject'/, `${file} 缺驳回入口`)
    }
  })

  it('记录流支持改内容（不只改状态）', async () => {
    const stream = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'stream.ts'), 'utf8')
    assert.match(stream, /patch: \{ content/, 'updateInbox 必须能改 content')
  })
})

describe('路由与能力的对应关系', () => {
  it('bridge 注册的每条路由在 core 里都有同名能力', async () => {
    const bridge = await fsp.readFile(path.join(SRC_DIR, 'bridge.ts'), 'utf8')
    const block = bridge.slice(bridge.indexOf('export const ROUTES'))
    // 抓 `name: { method: ...` 形态的路由名
    const names = [...block.matchAll(/^\s{2}([a-zA-Z]+):\s*\{/gm)].map(match => match[1])
    assert.equal(names.length >= 34, true, `路由数偏少：${names.length}`)

    const actions = await fsp.readFile(path.join(SRC_DIR, '..', '..', 'core', 'src', 'actions.ts'), 'utf8')
    // healthCheck 是诊断路由，不对应核心能力；export 在 actions 里叫 exportData
    const aliases = { healthCheck: null, export: 'exportData', verifyAnchor: 'verifyAnchorJob' }
    for (const name of names) {
      const alias = aliases[name]
      if (alias === null) continue
      const symbol = alias ?? name
      assert.equal(
        actions.includes(`function ${symbol}(`), true,
        `路由 ${name} 在 core 里找不到实现 ${symbol}——传输层与能力层已脱节`,
      )
    }
  })

  it('host 注入的 readExternal 同时被 verifyAnchor 使用', async () => {
    const index = await fsp.readFile(path.join(SRC_DIR, 'index.ts'), 'utf8')
    assert.match(index, /readExternal/, 'host 必须注入锚点文件读取器')
    assert.match(index, /safeRelPath/, '锚点路径必须过越界校验')
  })
})

/**
 * Hook 顺序检查 —— 挡住「整片白屏」这类灾难性渲染错误。
 *
 * 为什么必须有这条：React 的 hook 顺序是硬契约。把任何一个 `useState`
 * 写在 `if (x) return ...` 之后，首帧走 early return 时 hook 被跳过，
 * 数据到达后 hook 数量变化 → React 抛错 → **整个面板白屏**。
 *
 * 而这个错误：
 *   - 类型检查查不出来（语法完全合法）
 *   - 单测查不出来（组件没被渲染）
 *   - 只在真实界面里表现为「点开一片空白」
 *
 * 实测踩过一次：给「记忆」页签加域筛选时把 useState 放在了 early return 之后。
 */
describe('Hook 顺序（白屏防线）', () => {
  /**
   * 粗粒度的函数边界识别：从 `function X(` 或 `export function X(` 起，
   * 按花括号配平找到函数体。够用，因为我们只关心「同一函数体内」的先后关系。
   */
  function functionBodies(lines) {
    const bodies = []
    for (let i = 0; i < lines.length; i += 1) {
      const m = /^(?:export )?function ([A-Za-z0-9_]+)/.exec(lines[i])
      if (m === null) continue
      let depth = 0
      let started = false
      for (let j = i; j < lines.length; j += 1) {
        for (const ch of lines[j]) {
          if (ch === '{') { depth += 1; started = true }
          else if (ch === '}') depth -= 1
        }
        if (started && depth === 0) {
          bodies.push({ name: m[1], from: i, to: j, lines: lines.slice(i, j + 1) })
          break
        }
      }
    }
    return bodies
  }

  it('没有任何组件在 early return 之后调用 hook', async () => {
    const files = await collect(CLIENT_DIR)
    const violations = []

    for (const file of files) {
      const lines = (await fsp.readFile(file, 'utf8')).split('\n')
      for (const body of functionBodies(lines)) {
        // 只检查 hook 组件（返回 ReactNode 或名字大写开头）
        if (!/^[A-Z]/.test(body.name)) continue
        const hookRe = /\buse(State|Effect|Ref|Callback|Memo|Bridge|Observable)\s*[<(]/
        const returnRe = /^\s*if \(.*\) return /
        let sawEarlyReturn = false
        for (const [offset, line] of body.lines.entries()) {
          if (returnRe.test(line)) sawEarlyReturn = true
          if (hookRe.test(line) && sawEarlyReturn) {
            violations.push(
              `${path.relative(CLIENT_DIR, file)} · ${body.name} · 第 ${body.from + offset + 1} 行：`
              + `\`${line.trim().slice(0, 50)}\` 写在 early return 之后，会导致白屏`,
            )
          }
        }
      }
    }

    assert.deepEqual(
      violations, [],
      'Hook 必须全部位于 early return 之前：\n' + violations.join('\n'),
    )
  })
})

describe('交互闭环（点了要有反应）', () => {
  it('本项目的动作按钮都串了刷新回调', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'project.ts'), 'utf8')
    // 早先 confirm/archive/keep 直接 void call(...)，点完列表不刷新——
    // 和 §13.1 批评过的「回车后毫无反应」是同一类缺陷
    assert.match(text, /onChanged/, 'QueueCard 必须接收刷新回调')
    assert.match(text, /onChanged: reload/, 'ProjectPane 必须把 reload 传下去')
    // 逐个检查 run(() => call('x'...)) 这一行是否以 onChanged 结尾
    const runLines = text.split('\n').filter(line => /run\(\(\) => call\('/.test(line))
    assert.equal(runLines.length >= 3, true, `本项目应有多个 run 调用，实际 ${runLines.length}`)
    const missingAfter = runLines.filter(line => !/onChanged\s*\)/.test(line))
    assert.deepEqual(
      missingAfter, [],
      '这些动作缺刷新回调，点完界面不会有反应：\n' + missingAfter.join('\n'),
    )
    // 不许再有裸 void call 的动作按钮
    assert.deepEqual(
      text.match(/void call\('(confirm|archive|keep)'/g) ?? [], [],
      '这些按钮不能再裸调 call 而不刷新',
    )
  })

  it('总览的待处理队列能直接确认或归档', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'overview.ts'), 'utf8')
    assert.match(text, /call\('confirm'/, '总览应能直接确认')
    assert.match(text, /call\('archive'/, '到期项应能直接归档')
    // 手册写的是「总览 → 待你处理 → 确认 / 驳回」，界面必须有对应入口
    assert.match(text, /'驳回…'/, '总览的驳回入口要标明需去详情写理由')
  })

  it('证据闸门用契约常量，不用硬编码 G1', async () => {
    const text = await fsp.readFile(path.join(SRC_DIR, 'tools.ts'), 'utf8')
    assert.match(text, /ORIGIN_NEEDS_EVIDENCE/, 'schema.ts 声明的契约必须真的被执行')
    // 只看代码行，排除注释里提到这个写法的说明文字
    const codeLines = text.split('\n').filter(line => !/^\s*(\/\/|\*|\/\*)/.test(line))
    assert.equal(
      codeLines.some(line => /origin !== 'G1'/.test(line)), false,
      '硬编码 G1 会让「改契约常量不生效」——契约就白写了',
    )
  })

  it('agent 工具不暴露维护作业（改可信度必须由人点）', async () => {
    const text = await fsp.readFile(path.join(SRC_DIR, 'tools.ts'), 'utf8')
    for (const action of ['verifyAnchor', 'compact', 'promote', 'repairMeta', 'review']) {
      assert.equal(
        new RegExp(`actions\\.${action}\\(`).test(text), false,
        `维护作业 ${action} 不该对 agent 开放：它会改记忆的可信度或内容`,
      )
    }
  })
})
