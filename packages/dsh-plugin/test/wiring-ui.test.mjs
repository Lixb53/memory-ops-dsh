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
 * ## v9（2026-11-21）的结构迁移
 *
 * 5 个分区从 `client/panes/*.ts` 迁到 `client/v9/panes/*.ts`，并且每个分区
 * 拆成「中栏 Center + 检视栏 Inspector」两个组件。本文件的断言跟随新路径重写，
 * 强度不降：
 *   - 每条路由仍必须有 UI 调用点（白名单只剩内部能力）；
 *   - 旧的「建议卡 / 三段文案 / 成本三行」这类**结构断言**换成 v9 的硬规则
 *     （三栏宽度、T0 唯一、判定句长度、主操作唯一、diff 上下叠、四态齐）；
 *   - 旧 `panes/*.ts` 保留成空模块并在这里被显式断言「不含逻辑」，
 *     避免有人往迁移壳子里塞代码而界面根本不渲染。
 */

import assert from 'node:assert/strict'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_DIR = path.join(here, '..', 'src', 'client')
const V9_DIR = path.join(CLIENT_DIR, 'v9')
const SRC_DIR = path.join(here, '..', 'src')

/**
 * 递归收集 .ts 源码。
 *
 * 路径统一成正斜杠：断言里写的是 `v9/panes/today.ts` 这种与操作系统无关的形式，
 * 而 Windows 的 path.join 产出反斜杠，`endsWith('v9/panes/today.ts')` 永远为 false。
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
  return Promise.all(files.map(async file => ({
    file,
    text: await fsp.readFile(file, 'utf8'),
  })))
}

/** 某个路由在客户端是否有调用点（call 或 useBridge 任一种）。 */
function hasCallSite(sources, route) {
  const patterns = [
    new RegExp(`\\bcall(?:<[^>]*>)?\\(\\s*['"]${route}['"]`, 's'),
    new RegExp(`\\buseBridge(?:<[^>]*>)?\\(\\s*['"]${route}['"]`, 's'),
  ]
  return sources.filter(source => patterns.some(pattern => pattern.test(source.text)))
}

/** 读一个 v9 文件。 */
async function v9(file) {
  return fsp.readFile(path.join(V9_DIR, file), 'utf8')
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
    const text = await v9('panes/memory.ts')
    assert.match(
      text, /searchEntries\(/s,
      '必须以 search 路由发起检索（跨行写法也要认）',
    )
    assert.match(text, /searchEntries\(keyword,\s*keyword\s*!==\s*''\)/, 'search 调用必须按「是否主动检索」决定记不记账')
    assert.match(text, /setSubmitted/, '必须有一次显式提交动作（否则每敲一个字都记一条 miss）')
  })

  it('库健康的常驻前缀取 kpi.residentTokens 口径，不是索引层', async () => {
    const view = await v9('view-model.ts')
    assert.match(view, /kpi\.residentTokens/, '每请求成本必须取 residentTokens')
    const health = await v9('panes/health.ts')
    assert.match(health, /每请求/, '中栏必须写明这是「每请求」付费的口径')
    assert.match(health, /indexTokens/, '索引层体积要有独立一行（口径不许合并）')
    assert.match(health, /全库/, '全库体积要有独立一行')
  })

  it('面板保持 5 个任务入口（v9 不扩张导航）', async () => {
    const view = await v9('view-model.ts')
    const panes = view.match(/id: '(today|capture|todo|memory|health)'/g) ?? []
    assert.equal(panes.length, 5, `任务入口数量必须是 5，实际 ${panes.length}`)
    const health = await v9('panes/health.ts')
    assert.match(health, /MaintenancePanel/, '维护面板必须挂进库健康')
  })

  it('驳回入口在待办与记忆详情两处都有', async () => {
    for (const file of ['panes/todo.ts', 'panes/memory.ts']) {
      const text = await v9(file)
      assert.match(text, /rejectEntry/, `${file} 缺驳回入口`)
    }
  })

  it('待办支持改内容（不只改状态）', async () => {
    const todo = await v9('panes/todo.ts')
    assert.match(todo, /\{ content: content\.trim\(\) \}/, 'updateInbox 必须能改 content')
  })

  it('旧的 panes/*.ts 只是迁移壳子，不含逻辑', async () => {
    for (const file of ['today.ts', 'capture.ts', 'todo.ts', 'memory.ts', 'health.ts']) {
      const text = await fsp.readFile(path.join(CLIENT_DIR, 'panes', file), 'utf8')
      assert.match(text, /export \{\}/, `${file} 应为空模块`)
      assert.equal(/createElement|useBridge|call\(/.test(text), false, `${file} 里出现了逻辑：迁移壳子不许放实现`)
    }
  })
})

describe('项目上下文（假空态的三个入口）', () => {
  it('取数入口都送 cwd，不由客户端猜项目名', async () => {
    const sources = await clientSource()
    const panel = sources.find(item => item.file.endsWith('client/panel.ts'))
    assert.ok(panel !== undefined, '找不到 panel.ts')
    assert.match(panel.text, /useWorkbenchData/, '面板必须走统一的取数入口（cwd 在那一层进请求）')

    const data = await v9('data.ts')
    assert.match(data, /useSessionProject/, '数据层必须用会话 cwd')
    assert.match(data, /scopeBody/, '请求体必须由 scopeBody 生成（cwd 优先）')
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

describe('动作反馈（点了要有反应，失败要说话）', () => {
  it('写动作不许静默 void call，反馈落在统一的回执带', async () => {
    for (const file of ['panes/todo.ts', 'panes/memory.ts', 'panes/today.ts', 'panes/health.ts']) {
      const text = await v9(file)
      const bareVoid = text.split('\n')
        .filter(line => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .filter(line => /void call\('(confirm|archive|keep|reject|updateInbox)/.test(line))
      assert.deepEqual(bareVoid, [], `${file} 出现静默写调用：\n${bareVoid.join('\n')}`)
    }
    /*
     * 回执统一在 Stage 的一条带上渲染（所有分区共用），
     * 不再由各 pane 各放一个 InlineDone——那样「撤销」会随分区切换消失。
     */
    const stage = await v9('stage.ts')
    assert.match(stage, /mo-notice-bar/, '回执必须有一条常驻落点')
    assert.match(stage, /InlineDone\(\{ ok: notice\.ok/, '回执要渲染成功/失败与撤销')
    const panel = await fsp.readFile(path.join(CLIENT_DIR, 'panel.ts'), 'utf8')
    assert.match(panel, /notice,\s*\n\s*statusLeft/, '面板必须把 notice 传给外壳')
  })

  it('run() 是唯一写出口：pending / 回执 / 重取三件事由它统一', async () => {
    const panel = await fsp.readFile(path.join(CLIENT_DIR, 'panel.ts'), 'utf8')
    assert.match(panel, /const run = useCallback/, 'run 必须是稳定引用（否则每次渲染换函数）')
    assert.match(panel, /data\.reloadAll\(\)/, '成功后必须重取全部数据')
    assert.match(panel, /setNotice\(\{ ok: false/, '失败必须落回执')
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

describe('v9 设计硬规则（brief §八，机检替代手工过目）', () => {
  it('三栏宽度 212 / 1fr / 360，列间距 24', async () => {
    const css = await v9('styles-base.ts')
    assert.match(css, /--mo-w-rail: 212px/, '左轨必须是 212')
    assert.match(css, /--mo-w-insp: 360px/, '检视栏必须是 360')
    assert.match(css, /--mo-s5: 24px/, '列间距必须是 24')
    assert.match(css, /grid-template-columns: var\(--mo-w-rail\) minmax\(0, 1fr\) var\(--mo-w-insp\)/, '三栏网格')
  })

  it('每页恰好 1 个 T0：只有外壳渲染 Figure，分区不许出现第二个', async () => {
    const stage = await v9('stage.ts')
    assert.match(stage, /Figure\(\{ value: figure \}\)/, '顶条必须渲染唯一 T0')
    const panes = await Promise.all(['today', 'capture', 'todo', 'memory', 'health'].map(file => v9(`panes/${file}.ts`)))
    for (const text of panes) {
      assert.equal(/mo-t0|Figure\(/.test(text), false, '分区里出现了第二个 T0')
    }
  })

  it('判定句只由 ledeFor 产出，并且有长度与单行拦截', async () => {
    const view = await v9('view-model.ts')
    assert.match(view, /export function ledeFor/, '判定句必须有单一出口')
    assert.match(view, /export const LEDE_MAX = 20/, '上限必须是 20 字')
    assert.match(view, /clip\(/, '超长必须截断（不能把顶条撑成两行）')
  })

  it('主操作整页唯一：同屏至多一个墨块', async () => {
    /*
     * 一个文件里可以有多个检视栏分支（拍板 / 流转 / 补库 / 归档态），
     * 但**每次渲染只出一个 InspectorFrame**。所以按 InspectorFrame 分块：
     * 每块 ≤1 个墨块，就是「同屏唯一」的源码级等价物。
     */
    for (const file of ['today', 'capture', 'todo', 'memory', 'health']) {
      const text = await v9(`panes/${file}.ts`)
      const blocks = text.split(/\n\s*(?:return )?InspectorFrame\(\{/).slice(1)
      assert.equal(blocks.length > 0, true, `${file} 里找不到 InspectorFrame`)
      blocks.forEach((block, index) => {
        /* 块到下一个 InspectorFrame 前为止（split 已切好），末尾还有外层闭合括号。 */
        const count = (block.match(/BtnInk\(\{/g) ?? []).length
        assert.equal(count <= 1, true, `${file} 第 ${index + 1} 个检视栏有 ${count} 个墨块：同屏只许一个主操作`)
      })
    }
  })

  it('四态齐全：每个分区都处理 loading / error / empty', async () => {
    for (const file of ['today', 'capture', 'todo', 'memory', 'health']) {
      const text = await v9(`panes/${file}.ts`)
      for (const state of ["phase === 'loading'", "phase === 'error'", "phase === 'empty'"]) {
        assert.equal(text.includes(state), true, `${file} 缺 ${state} 分支`)
      }
    }
  })

  it('读不到 ≠ 0：T0 与上带在 error/loading 下必须是 null', async () => {
    const view = await v9('view-model.ts')
    assert.match(view, /if \(phase === 'error' \|\| phase === 'loading'\) return null/, 'figureFor 与 bandFigureFor 都要这样收口')
    assert.match(view, /return null[\s\S]*?figureFor|figureFor[\s\S]*?return null/, 'T0 不许在 error 态回落到 0')
  })

  it('上带「每请求都在」是结构而不是 KPI 卡', async () => {
    const stage = await v9('stage.ts')
    assert.match(stage, /每请求都在/, '双车道必须有上带')
    assert.match(stage, /mo-band/, '上带是一个 72px 的带，不是卡片')
  })

  it('diff 上下叠：删除行 danger 左刻度 + 插入行 ok 左刻度，不并排', async () => {
    const health = await v9('panes/health.ts')
    assert.match(health, /mo-diff-removed/, '必须有删除行')
    assert.match(health, /mo-diff-added/, '必须有插入行')
    assert.match(health, /tokens[\s\S]*Δ/, '必须有 tokens 前/后/Δ')
    assert.match(health, /生效时机/, '必须有生效时机')
    const css = await v9('styles-panes.ts')
    assert.match(css, /\.mo-diff-line \{[\s\S]*?grid-template-columns: 36px minmax\(0, 1fr\)/, 'diff 行是单栏（行号 + 文本），不是两列并排')
  })

  it('四桶之和必须能对账：合计行由可读桶求和', async () => {
    const health = await v9('panes/health.ts')
    assert.match(health, /const sum = readable\.reduce/, '合计必须由可读桶求和')
    assert.match(health, /不含\$\{unknown\.join/, '不可读的桶必须写进「不含」')
    assert.match(health, /data-unknown/, '不可读桶要有独立渲染，不能画成 0')
  })

  it('可达性：tablist / tabpanel / aside / status / aria-live 一个不少', async () => {
    const stage = await v9('stage.ts')
    assert.match(stage, /role: 'tablist'/, '左轨必须是 tablist')
    assert.match(stage, /role: 'tabpanel'/, '中栏必须是 tabpanel')
    assert.match(stage, /'aria-labelledby': `mo-tab-\$\{pane\}`/, 'tabpanel 要指回当前 tab')
    assert.match(stage, /role: 'banner'/, '顶条是 banner')
    assert.match(stage, /role: 'status'/, '状态条是 status')
    assert.match(stage, /'aria-live': 'polite'/, '必须有常驻 aria-live 播报')
    assert.match(stage, /ArrowDown/, '竖直 tablist 必须支持方向键')
  })

  it('检视栏是常驻 aside，不是抽屉', async () => {
    const stage = await v9('stage.ts')
    assert.match(stage, /className: 'mo-insp'/, '检视栏常驻')
    const css = await v9('styles-base.ts')
    assert.match(css, /\.mo-insp \{[\s\S]*?border-left/, '检视栏靠底色 + 单边线分区，不用框')
  })
})

describe('布局与样式契约', () => {
  it('模板字符串内部不出现反引号（会提前闭合，整页样式全丢）', async () => {
    /*
     * 文件头注释里写 `xxx` 是合法的；真正的雷是**模板串内部**再出现反引号。
     * 实测踩过：CSS 注释里写了一个带反引号的选择器，esbuild 报
     * 「Expected ";" but found "button"」，构建失败，界面退回旧样式——
     * 而旧样式的截图看起来「只是有点旧」，很容易被当成通过。
     *
     * 检查范围：从赋值后的第一个反引号，到文件最后一个反引号之间。
     */
    for (const file of ['styles.ts', 'v9/styles-base.ts', 'v9/styles-panes.ts']) {
      const text = await fsp.readFile(path.join(CLIENT_DIR, file), 'utf8')
      const assign = text.indexOf('= `')
      assert.notEqual(assign, -1, `${file} 里找不到模板字符串赋值`)
      const open = text.indexOf('`', assign)
      const close = text.lastIndexOf('`')
      assert.equal(close > open, true, `${file} 的模板串没有闭合`)
      const body = text.slice(open + 1, close)
      const stray = (body.match(/`/g) ?? []).length
      assert.equal(stray, 0, `${file} 的模板串内部出现了 ${stray} 个反引号`)
    }
  })

  it('客户端引用的每个 mo-* 类都在 v9 样式里定义（0 缺失）', async () => {
    const css = `${await v9('styles-base.ts')}\n${await v9('styles-panes.ts')}`
    const defined = new Set([...css.matchAll(/\.(mo-[a-z0-9-]+)/g)].map(m => m[1]))

    /*
     * 只认「字符串字面量里以空格分隔的纯类名」。
     * 早先直接扫 `mo-[a-z0-9-]+` 会把 `dmo-capture` 里的子串与
     * `var(--mo-s2)` 里的变量名一起抓进来，制造假红。
     */
    const sources = await clientSource()
    const missing = new Map()
    for (const { file, text } of sources) {
      if (file.includes('/v9/styles')) continue
      /* 只认 className 的字面量：id / htmlFor / aria 里的 mo-* 不是类名。 */
      for (const literal of text.matchAll(/className:\s*['"`]([^'"`\n]*)['"`]/g)) {
        for (const token of literal[1].split(/\s+/)) {
          if (/^mo-[a-z0-9-]+$/.test(token) && !defined.has(token)) {
            missing.set(token, file.split('/').pop())
          }
        }
      }
    }
    assert.equal(
      missing.size === 0, true,
      `这些类被界面引用但 v9 样式没有定义（浮层会「挂载了但不可见」）：\n`
      + [...missing].map(([c, f]) => `  ${c}  <- ${f}`).join('\n'),
    )

    /* 动态拼出来的 tone 类名扫不到，单独钉住四个变体。 */
    for (const variant of ['mo-tone-ok', 'mo-tone-warn', 'mo-tone-err', 'mo-tone-idle']) {
      assert.equal(defined.has(variant), true, `缺状态刻度类 ${variant}`)
    }
  })

  it('v9 样式不出现字面色值（只许宿主 token）', async () => {
    const css = `${await v9('styles-base.ts')}\n${await v9('styles-panes.ts')}`
    const colors = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []
    assert.deepEqual(colors, [], '出现字面色值，必须改用 --dsw-alias-*')
  })

  it('焦点环全站一种：2px + offset 2（贴边 -1）', async () => {
    const css = await v9('styles-base.ts')
    assert.match(css, /outline: 2px solid var\(--dsw-alias-state-business-primary\)/, '焦点环必须用业务蓝')
    assert.match(css, /outline-offset: 2px/, '默认 offset 2')
    assert.match(css, /outline-offset: -1px/, '贴边控件 offset -1')
  })

  it('reduced-motion 全关动效，骨架仍可辨', async () => {
    const css = await v9('styles-base.ts')
    assert.match(css, /prefers-reduced-motion: reduce/, '必须有降级块')
    assert.match(css, /\.mo-skel-row \{ opacity: 1; \}/, '骨架在 reduce 下静止但仍可见')
  })

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
    assert.match(styles, /\.dmo-remember-backdrop \{[\s\S]*position: fixed;[\s\S]*inset: 0/, '遮罩必须 fixed + inset:0')
  })

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