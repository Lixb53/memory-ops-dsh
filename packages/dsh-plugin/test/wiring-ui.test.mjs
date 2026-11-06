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
  // 允许 `(` 与路由名之间有任意空白（含换行）——memory.ts 就是跨行写的，
  // 早先的正则要求紧贴，导致 search 的调用点被漏判。
  const patterns = [
    new RegExp(`\\bcall(?:<[^>]*>)?\\(\\s*['"]${route}['"]`, 's'),
    new RegExp(`\\buseBridge(?:<[^>]*>)?\\(\\s*['"]${route}['"]`, 's'),
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
    // 真实调用点断言：用允许跨行的正则，而不是匹配类型名（那是弱断言）
    assert.match(
      text, /useBridge<SearchView>\(\s*'search'/s,
      '必须以 search 路由发起检索（跨行写法也要认）',
    )
    assert.match(text, /record:\s*submitted\.trim\(\) !== ''/, 'search 调用必须按「是否主动检索」决定记不记账')
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

describe('路由接线全表（防止「有路由没入口」回潮）', () => {
  /**
   * 允许没有 UI 入口的路由，每个都要写明**为什么**。
   * 这份白名单是人工确认过的：新出现不在名单里的路由，下面那条测试会红。
   */
  const ALLOWED_WITHOUT_UI = {
    // 内部索引能力：给 agent 与诊断用，没有面向用户的入口需求
    index: '内部索引能力',
    // 底层原语：被 confirm / reject / undoReject 三个语义化路由封装
    setStatus: '被 confirm/reject/undoReject 封装',
    // 诊断端点：供 curl 与宿主探活，不进 UI
    healthCheck: '诊断端点',
  }

  it('除白名单外，每条路由都有 UI 调用点', async () => {
    const bridge = await fsp.readFile(path.join(SRC_DIR, 'bridge.ts'), 'utf8')
    const names = [...bridge.matchAll(/^\s{2}([a-zA-Z]+):\s*\{/gm)].map(m => m[1])
    assert.equal(names.length >= 34, true, `路由数偏少：${names.length}`)

    const sources = await clientSource()
    const missing = names.filter(name => !(name in ALLOWED_WITHOUT_UI) && hasCallSite(sources, name).length === 0)

    assert.deepEqual(
      missing, [],
      `这些路由没有 UI 入口（若确属内部能力，请加进 ALLOWED_WITHOUT_UI 并写明理由）：\n${missing.join(', ')}`,
    )
  })
})

describe('设计稿对齐（用户点名的缺口不许回退）', () => {
  it('记录流有常驻捕获入口，不依赖空态', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'stream.ts'), 'utf8')
    // 用户原话：不管有没有内容，都应该增加记一条的入口
    assert.match(text, /dmo-capture-inline/, '必须有常驻捕获框的容器类')
    assert.match(text, /captureHere/, '必须有提交函数')
    // 允许跨行写法：`call<...>('\n  'captureBatch', ...` —— 早先的紧贴正则漏判过一次
    assert.match(text, /call(?:<[^>]*>)?\(\s*['"]capture['"]/s, '单条提交走 capture')
    assert.match(text, /call(?:<[^>]*>)?\(\s*['"]captureBatch['"]/s, '多行提交走 captureBatch')
    // 捕获框必须在主 return 里，而不是只在空态分支
    const mainReturn = text.slice(text.indexOf("return createElement('div', null,"))
    const emptyIdx = mainReturn.indexOf('记录流是空的')
    const captureIdx = mainReturn.indexOf('dmo-capture-inline')
    assert.equal(captureIdx >= 0 && captureIdx < emptyIdx, true,
      '捕获框要排在空态之前——空态里看不等于「随时可记」')
  })

  it('记忆分区有带计数的状态药丸', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'memory.ts'), 'utf8')
    assert.match(text, /dmo-chips/, '状态筛选要用药丸容器')
    assert.match(text, /Chip/, '用药丸组件')
    assert.match(text, /statusCounts/, '药丸必须带计数')
  })

  it('未命中分区有五态计数条', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'misses.ts'), 'utf8')
    assert.match(text, /Band/, '要用 Band 组件而不是 3 格 KPI')
    for (const label of ['观察', '该补', '草稿', '验证', '生效']) {
      assert.equal(text.includes(label), true, `五态缺「${label}」`)
    }
  })

  it('验证期能显示命中进度与剩余天数', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'misses.ts'), 'utf8')
    assert.match(text, /remainingDays/, '剩 N 天必须能显示')
    assert.match(text, /命中 \$\{count\(item\.hits\)\}\/3/, '命中 x/3 必须能显示')
  })

  it('列表显示引用次数', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'memory.ts'), 'utf8')
    assert.match(text, /citeCount/, '引用次数要能在列表看到')
    assert.match(text, /次引用/, '文案要写清是引用次数')
  })

  it('快速捕获有类型药丸与「刚刚捕获」回显', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'capture-tab.ts'), 'utf8')
    assert.match(text, /dmo-types/, '类型改用药丸')
    assert.match(text, /刚刚捕获/, '要有刚捕获的回显列表')
  })

  it('总览能把未命中汇总进待办', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'overview.ts'), 'utf8')
    assert.match(text, /未命中该补了/, '总览待办要包含未命中汇总')
    assert.match(text, /仅个人域/, '导出要能按域')
  })
})

describe('布局：筛选项必须同行', () => {
  /**
   * `.dmo-select` 带 `width: 100%`（表单里需要撑满），放进 flex 行会被当成
   * 「占满整行」而被迫换行——实测记录流因此变成三行：搜索 / 状态 / 类型各占一行，
   * 白占 60px 高度，还割裂了「这仨是同一组筛选项」的语义。
   *
   * 这条测试查的是「有没有用单行工具栏类」，因为那才是修复的关键。
   */
  it('记录流筛选区用 .dmo-toolbar，而不是裸 dmo-row', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'stream.ts'), 'utf8')
    assert.match(text, /dmo-toolbar/, '筛选区必须用单行工具栏类')
    // 捕捉「用 dmo-row 装一组筛选项」这种回退写法
    const rowWithFilter = text.slice(text.indexOf('过滤记录') - 400, text.indexOf('过滤记录'))
    assert.equal(/dmo-row/.test(rowWithFilter), false, '不要用 dmo-row 装筛选项——它不会覆盖 width:100%')
  })

  it('.dmo-toolbar 显式覆盖 select 的 width:100%', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'styles.ts'), 'utf8')
    assert.match(text, /\.dmo-toolbar > \.dmo-select \{ width: auto/, '必须显式覆盖成 width:auto，否则仍会换行')
    assert.match(text, /\.dmo-toolbar > \.dmo-input/, '搜索框要能弹性伸缩')
  })

  it('styles.ts 的注释里不出现反引号（会提前闭合模板字符串）', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'styles.ts'), 'utf8')
    // 模板字符串是 const CSS = `...`；内容里的反引号会提前闭合，把后面的 CSS 变成代码
    const body = text.slice(text.indexOf('const CSS = `') + 13, text.lastIndexOf('`'))
    assert.equal(/`/.test(body), false, 'styles.ts 的 CSS 里出现了反引号：会提前闭合模板字符串')
  })
})
