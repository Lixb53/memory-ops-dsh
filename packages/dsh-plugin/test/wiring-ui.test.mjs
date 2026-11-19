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
 * v4（2026-11-18）分区从数据表改为任务入口（today / capture / todo / memory / health），
 * 本文件的所有文件级断言已跟随新结构重写；强度不变：
 * 每条路由仍必须能在某个源文件里找到调用点。
 */

import assert from 'node:assert/strict'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_DIR = path.join(here, '..', 'src', 'client')
const SRC_DIR = path.join(here, '..', 'src')

/**
 * 递归收集 .ts 源码。
 *
 * 路径统一成正斜杠：断言里写的是 `panes/today.ts` 这种与操作系统无关的形式，
 * 而 Windows 的 path.join 产出反斜杠，`endsWith('panes/today.ts')` 永远为 false。
 */
async function collect(dir) {
  const out = []
  for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...await collect(full))
      continue
    }
    if (entry.name.endsWith('.ts')) out.push(full.split(path.sep).join('/'))
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
    new RegExp(`\\bcall(?:<[^>]*>)?\\(\\s*['"]${route}['"]`, 's'),
    new RegExp(`\\buseBridge(?:<[^>]*>)?\\(\\s*['"]${route}['"]`, 's'),
  ]
  return sources.filter(source => patterns.some(pattern => pattern.test(source.text)))
}

describe('UI 接线：product.md §2.3 的缺口不许回潮', () => {
  const MUST_HAVE_UI = [
    ['reject', '驳回推断'],
    ['undoReject', '撤销驳回'],
    ['batchArchive', '批量归档'],
    ['search', '检索记账（否则命中率恒为 null）'],
    ['verifyAnchor', '检查引用的代码还在不在'],
    ['compact', '压缩空行'],
    ['promote', '升级可信度'],
    ['review', '本周小结'],
    ['repairMeta', '元数据修补'],
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
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'memory.ts'), 'utf8')
    assert.match(
      text, /useBridge<SearchView>\(\s*'search'/s,
      '必须以 search 路由发起检索（跨行写法也要认）',
    )
    assert.match(text, /record:\s*submitted\.trim\(\) !== ''/, 'search 调用必须按「是否主动检索」决定记不记账')
    assert.match(text, /setSubmitted/, '必须有一次显式提交动作（否则每敲一个字都记一条 miss）')
  })

  it('库健康的常驻前缀取 billedTokens 口径，不是索引层', async () => {
    const health = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'health.ts'), 'utf8')
    assert.match(health, /data\.kpi\.indexTokens/, '索引层体积应有独立一行')
    assert.match(health, /data\.kpi\.residentTokens/, '每请求成本行必须仍在')
    assert.match(health, /每请求/, '每请求成本行必须写明它是每请求付费的口径')
  })

  it('面板保持 5 个任务入口（v4 不扩张导航）', async () => {
    const panel = await fsp.readFile(path.join(CLIENT_DIR, 'panel.ts'), 'utf8')
    const panes = panel.match(/id: '(today|capture|todo|memory|health)'/g) ?? []
    assert.equal(panes.length, 5, `任务入口数量必须是 5，实际 ${panes.length}`)
    const health = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'health.ts'), 'utf8')
    assert.match(health, /MaintenancePanel/, '维护面板必须挂进库健康')
  })

  it('驳回入口在待办与记忆详情两处都有', async () => {
    for (const file of ['todo.ts', 'memory.ts']) {
      const text = await fsp.readFile(path.join(CLIENT_DIR, 'panes', file), 'utf8')
      assert.match(text, /'reject'/, `${file} 缺驳回入口`)
    }
  })

  it('待办支持改内容（不只改状态）', async () => {
    const todo = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'todo.ts'), 'utf8')
    assert.match(todo, /patch: \{ content/, 'updateInbox 必须能改 content')
  })
})

describe('项目上下文（假空态的三个入口）', () => {
  it('入口都送 cwd，不由客户端猜项目名', async () => {
    const sources = await clientSource()
    const names = ['panes/today.ts', 'panes/memory.ts', 'session-view.ts', 'panel.ts']
    for (const name of names) {
      const found = sources.find(item => item.file.endsWith(name))
      assert.ok(found !== undefined, `找不到 ${name}`)
      assert.match(found.text, /scopeBody|useSessionProject/, `${name} 必须走 scopeBody / useSessionProject（cwd 优先）`)
    }
  })

  it('scopeBody 优先 cwd，其次兜底项目名，最后才空对象', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'session-context.ts'), 'utf8')
    assert.match(text, /if \(cwd !== undefined && cwd\.trim\(\) !== ''\) return \{ cwd \}/)
    assert.match(text, /return \{ project \}/)
    assert.match(text, /return \{\}/)
  })

  it('会话 tab 的项目解析失败要说原因，不是静默', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'session-view.ts'), 'utf8')
    assert.match(text, /resolution/)
    assert.match(text, /没能从当前目录认出项目/)
  })
})

describe('总览→库健康的动作反馈（点了要有反应）', () => {
  it('确认 / 归档 / 再留都走 run 风格并把失败摆出来', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'todo.ts'), 'utf8')
    const bareVoid = text.split('\n')
      .filter(line => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .filter(line => /void call\('(confirm|archive|keep)'/.test(line))
    assert.deepEqual(bareVoid, [], '这些动作不能再是静默 void call：\n' + bareVoid.join('\n'))
    // 反馈走 InlineDone 组件（类名在 styles.ts 里），源码断言只认组件调用
    assert.match(text, /InlineDone\(/, '反馈必须就地显示（InlineDone），不能静默')
  })
})

describe('路由接线全表（防止「有路由没入口」回潮）', () => {
  const ALLOWED_WITHOUT_UI = {
    index: '内部索引能力',
    setStatus: '被 confirm/reject/undoReject 封装',
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

describe('v4 设计要点（用户痛点不许回退）', () => {
  it('捕获有常驻入口，不依赖空态', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'capture.ts'), 'utf8')
    assert.match(text, /dmo-capture/, '必须有捕获框容器类')
    assert.match(text, /captureBatch/, '多行提交走 captureBatch')
    // 注意：断言源码里的对象键形态，不是渲染后的 HTML 属性
    assert.match(text, /'data-action':\s*'capture'/, '提交按钮必须带可测的 data-action=capture')
  })

  it('今天页有建议卡（首屏必须给出一件事）', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'today.ts'), 'utf8')
    assert.match(text, /dmo-suggest/, '必须有建议卡容器')
    assert.match(text, /pickSuggestion/, '建议必须由数据推导（拍板 > 补库 > 流转 > 兜底）')
    assert.match(text, /dmo-trail/, '要有可点的次要线索')
  })

  it('待办三段齐全：拍板 / 流转 / 补库', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'todo.ts'), 'utf8')
    for (const title of ['要我拍板的', '要我流转的', '要我补的']) {
      assert.equal(text.includes(title), true, `待办缺「${title}」段`)
    }
    assert.match(text, /firstSection/, 'brand 实底名额必须整页分配（防止跨段出现 2 处主按钮）')
  })

  it('验证期能显示剩余天数与命中进度', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'todo.ts'), 'utf8')
    assert.match(text, /remainingDays|验证期/, '验证期信息必须能显示')
  })

  it('列表显示引用次数', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'memory.ts'), 'utf8')
    assert.match(text, /citeCount/, '引用次数要能在列表看到')
    assert.match(text, /未引用|次引用/, '文案要写清是引用次数')
  })

  it('库健康把成本拆成三行（每请求 / 索引 / 全库）', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'health.ts'), 'utf8')
    for (const name of ['每请求成本', '索引体积', '全库体积']) {
      assert.equal(text.includes(name), true, `成本行缺「${name}」`)
    }
    assert.match(text, /MaintenancePanel/, '维护面板必须挂进库健康')
    assert.match(text, /仅个人域/, '导出要能按域')
  })

  it('待办的 brand 名额整页分配，不许每段各出一个主按钮', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'todo.ts'), 'utf8')
    const primaryCalls = (text.match(/Primary\(/g) ?? []).length
    const conditionalPrimary = (text.match(/usePrimary\s*\?/g) ?? []).length
    assert.equal(
      conditionalPrimary > 0 || primaryCalls <= 2, true,
      'todo 页的 Primary 调用必须经由 firstSection/usePrimary 条件分配，'
      + '否则待拍板与待补同屏时会出现 2 处 brand 实底',
    )
  })

  it('快速捕获（右侧栏）保留类型药丸与回显', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'capture-tab.ts'), 'utf8')
    assert.match(text, /dmo-types/, '类型改用药丸')
    assert.match(text, /刚刚捕获/, '要有刚捕获的回显列表')
  })

  it('未命中达标才进「等你补」，未达标给说明与出口', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'panes', 'todo.ts'), 'utf8')
    assert.match(text, /还没有到该补的时候/, '未达阈值要有诚实说明')
    assert.match(text, /仍然补一条/, '说明必须带真实出口，不能只说「现在补也行」')
  })
})

describe('布局与样式契约', () => {
  it('styles.ts 的注释里不出现反引号（会提前闭合模板字符串）', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'styles.ts'), 'utf8')
    const body = text.slice(text.indexOf('const CSS = `') + 13, text.lastIndexOf('`'))
    assert.equal(/`/.test(body), false, 'styles.ts 的 CSS 里出现了反引号：会提前闭合模板字符串')
  })

  /*
   * v6 评审 P0-3：方向卡 §八-3 把「类名审计 0 缺失」写成硬要求，
   * 而这条护栏当时只存在于 scripts/class-audit.mjs（手动跑的脚本）。
   * /remember 弹窗在 v4 就是因为样式重写时整段删掉 .dmo-remember-*
   * 而「挂载了但不可见」——没有机器闸门，同一个事故必然复发。
   * 现在它是测试：源码引用了、样式里没有的类 = 直接红。
   */
  it('客户端引用的每个 dmo-* 类都在 styles.ts 里有定义（0 缺失）', async () => {
    const styles = await fsp.readFile(path.join(CLIENT_DIR, 'styles.ts'), 'utf8')
    const cssBody = styles.slice(styles.indexOf('const CSS = `') + 13, styles.lastIndexOf('`'))
    const defined = new Set([...cssBody.matchAll(/\.(dmo-[a-z0-9-]+)/g)].map(m => m[1]))

    const sources = await clientSource()
    const missing = new Map()
    for (const { file, text } of sources) {
      if (file.endsWith('styles.ts')) continue
      for (const m of text.matchAll(/dmo-[a-z0-9-]+/g)) {
        const cls = m[0]
        // 模板串前缀（`dmo-badge-${tone}`）匹配到的是残缺名，不是缺失
        if (cls === 'dmo-badge-') continue
        if (!defined.has(cls)) missing.set(cls, file.split('/').pop())
      }
    }
    assert.equal(
      missing.size === 0, true,
      `这些类被界面引用但 styles.ts 没有定义（弹窗/浮层会「挂载了但不可见」）：\n`
      + [...missing].map(([c, f]) => `  ${c}  <- ${f}`).join('\n'),
    )
  })

  it('/remember 浮层的 11 个类必须全在（v4 删光导致弹窗不可见的回归锚点）', async () => {
    const styles = await fsp.readFile(path.join(CLIENT_DIR, 'styles.ts'), 'utf8')
    const required = [
      'dmo-remember-backdrop', 'dmo-remember-card', 'dmo-remember-head',
      'dmo-remember-title', 'dmo-remember-close', 'dmo-remember-body',
      'dmo-remember-input', 'dmo-remember-foot', 'dmo-remember-toast',
      'dmo-remember-undo', 'dmo-remember-dismiss',
    ]
    const absent = required.filter(cls => !styles.includes(`.${cls}`))
    assert.deepEqual(absent, [], `.dmo-remember-* 缺失：${absent.join(', ')}`)
    // 遮罩必须是 fixed 全屏——否则 portal 到 body 也只是贴在文档流末尾
    assert.match(styles, /\.dmo-remember-backdrop \{[\s\S]*position: fixed;[\s\S]*inset: 0/, '遮罩必须 fixed + inset:0')
  })

  /*
   * v6 评审 P1-1：尺寸令牌只挂 .dmo-root 时，会话 tab 与 portal 浮层
   * 拿不到 var(--s4)/var(--accent)——弹窗即便类名在，内边距与圆角也是坏的。
   */
  it('尺寸令牌挂在所有插件根上（含 portal 浮层与会话 tab）', async () => {
    const styles = await fsp.readFile(path.join(CLIENT_DIR, 'styles.ts'), 'utf8')
    const tokenBlock = styles.slice(styles.indexOf(':where('), styles.indexOf('.dmo-root {'))
    assert.equal(tokenBlock.includes('.dmo-session'), true, '会话 tab 必须能拿到尺寸令牌')
    assert.equal(tokenBlock.includes('.dmo-remember-backdrop'), true, 'portal 浮层必须能拿到尺寸令牌')
  })

  it('v4 令牌在 .dmo-root 上定义（颜色用宿主 token，尺寸本地）', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'styles.ts'), 'utf8')
    for (const token of ['--t1', '--t4', '--s1', '--r-control', '--r-overlay']) {
      assert.equal(text.includes(token), true, `缺设计令牌 ${token}`)
    }
    assert.equal(/--t1:\s*24px/.test(text), true, 'T1 必须是 24px（方向卡 §三）')
    // 字面色值禁止：全部走宿主 token（reduced-motion 块与 mask 兜底除外）
    const colors = text.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []
    assert.equal(colors.length, 0, 'styles.ts 出现字面色值，必须改用 --dsw-alias-*')
  })

  it('按钮按下态排除主按钮（浅底会吃掉字色）', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'styles.ts'), 'utf8')
    assert.match(text, /:not\(\.dmo-btn-primary\)/, 'active 样式必须排除主按钮')
  })

  it('折叠区有可发现的展开箭头', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'styles.ts'), 'utf8')
    assert.match(text, /content: "▸"/, 'summary 必须有 ▸ 箭头（可发现性）')
  })
})

describe('跨表面跳转：会话 tab 的「去待办」必须真的跳', () => {
  it('会话 tab 的 inject 必须给出 onGotoMisses（不能只给 ctx）', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'register.ts'), 'utf8')
    const start = text.indexOf('export function registerSessionView')
    assert.notEqual(start, -1, 'registerSessionView 必须存在')
    const next = text.indexOf('export function registerCaptureTab', start)
    const block = text.slice(start, next === -1 ? undefined : next)
    assert.match(block, /onGotoMisses/, '会话 tab 必须在注入面提供 onGotoMisses')
    assert.match(block, /gotoPane/, 'onGotoMisses 必须走 gotoPane，而不是空实现')
  })

  it('会话 tab 组件不再静默吞掉跳转（必须有兜底 + 失败提示）', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'session-view.ts'), 'utf8')
    assert.equal(/onGotoMisses\?\.\(\)/.test(text), false, '可选调用会把「没传回调」变成静默无反应')
    assert.match(text, /goMisses/, '跳转要走具名函数，便于兜底与提示')
    assert.match(text, /gotoPane\(ctx, 'todo'\)/, '宿主没给回调时要退回内置跳转（v4 落到待办）')
    assert.match(text, /打不开记忆面板/, '两条路都不通时必须说话，不能继续静默')
  })

  it('面板必须消费分区请求（否则请求写下来也没人读）', async () => {
    const text = await fsp.readFile(path.join(CLIENT_DIR, 'panel.ts'), 'utf8')
    assert.match(text, /usePaneRequest/, '面板要订阅待处理的跳转请求')
    assert.match(text, /consumePaneRequest/, '面板要消费请求并切换分区')
  })

  it('gotoPane 真的写请求并调用 layout.selectPanel', async () => {
    const { consumePaneRequest, gotoPane } = await import('../lib/client-logic.mjs')
    const calls = []
    const ctx = {
      get(name) {
        if (name !== 'layout') return undefined
        return { selectPanel: id => { calls.push(id) } }
      },
    }
    assert.equal(gotoPane(ctx, 'todo'), true)
    assert.deepEqual(calls, ['memory-ops'], '必须调用 layout.selectPanel 把主面板拉起来')
    assert.equal(consumePaneRequest(), 'todo', '必须留下待消费的分区请求')
    assert.equal(consumePaneRequest(), undefined, '消费后要清空，不能反复跳')
  })

  it('宿主没有 layout 服务时返回 false（调用方据此提示，而不是假装成功）', async () => {
    const { gotoPane, consumePaneRequest } = await import('../lib/client-logic.mjs')
    assert.equal(gotoPane({ get: () => undefined }, 'todo'), false)
    assert.equal(consumePaneRequest(), 'todo')
  })
})
