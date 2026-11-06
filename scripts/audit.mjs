#!/usr/bin/env node
/**
 * 静态审计：抓那些 `tsc` 与单元测试都看不见的渲染层缺陷。
 *
 * ## 为什么需要这一层
 *
 * 实测踩过的三类 bug，三道常规防线全部失效：
 *
 * | 缺陷 | tsc | 单测 | 接线测试 |
 * |---|---|---|---|
 * | `return a, b, c` 逗号表达式（丢掉前 N 块 UI） | ✅ 合法 | ✅ 不渲染组件 | ✅ 只查调用点 |
 * | `useState` 写在 early return 之后（整片白屏） | ✅ 合法 | ✅ 不渲染组件 | ✅ 只查调用点 |
 * | frontmatter 块列表解析错误（静默毁数据） | ✅ 合法 | ✅ 当时没测 | — |
 *
 * 这三条的共同点：**语法完全合法，只在渲染或写回时才炸**。
 * 所以必须用 AST 看语义，而不是靠类型系统。
 *
 * 用法：node scripts/audit.mjs
 * 退出码：发现问题即 1。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { spawnSync } from 'node:child_process'

import ts from '../node_modules/typescript/lib/typescript.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')
const CLIENT_DIR = path.join(root, 'packages', 'dsh-plugin', 'src', 'client')

/** 收集 .ts 文件。 */
function collect(dir) {
  const out = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collect(full))
    else if (entry.name.endsWith('.ts')) out.push(full)
  }
  return out
}

const problems = []
const rel = file => path.relative(root, file)

/**
 * 每条规则实际检查到的目标数。
 *
 * 为什么需要这个：一个「永远找不到目标、于是永远不报错」的检查，
 * 和没有检查是一回事——它只是让人误以为有保护。
 * 所以每条规则都要报告「我看了几个东西」，为 0 直接判失败。
 */
const coverage = {
  'comma-return': 0, 'hook-order': 0, 'create-element': 0, 'frontmatter': 0, 'doc-numbers': 0,
}

/** 解析一个文件。 */
function parse(file) {
  return ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  )
}

// ============================================================
// 检查一：return 逗号表达式
// ============================================================

/**
 * `return a, b, c` 只返回 c，a 与 b 求值后丢弃。
 *
 * 这是最阴险的一类：它通常是**多写/少写一个括号**导致的结构塌陷，
 * 而 TypeScript 完全接受这种写法。实测它让记录流页签丢掉了
 * 吞吐 KPI、筛选下拉、toast、批量操作条 4 块 UI，而所有测试全绿。
 */
function checkCommaReturn(sf, file) {
  const lineOf = p => sf.getLineAndCharacterOfPosition(p).line + 1
  function walk(node) {
    if (ts.isReturnStatement(node) && node.expression !== undefined) {
      coverage['comma-return'] += 1
      let expr = node.expression
      const operands = []
      while (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.CommaToken) {
        operands.unshift(expr.right)
        expr = expr.left
      }
      if (operands.length > 0) {
        operands.unshift(expr)
        const ranges = operands
          .map((op, index) => `#${index} 行${lineOf(op.getStart())}-${lineOf(op.getEnd())}`)
          .join('、')
        problems.push({
          rule: 'comma-return',
          where: `${rel(file)}:${lineOf(node.getStart())}`,
          detail: `return 是逗号表达式，只有最后一个操作数会被返回；其余求值后丢弃：${ranges}`,
        })
      }
    }
    ts.forEachChild(node, walk)
  }
  walk(sf)
}

// ============================================================
// 检查二：Hook 顺序（early return 之前必须放完所有 hook）
// ============================================================

const HOOK_RE = /\buse(State|Effect|Ref|Callback|Memo|Reducer|LayoutEffect|Bridge|Observable|SessionProject|CurrentSessionId)\s*[<(]/
const EARLY_RETURN_RE = /^\s*if\s*\(.*\)\s*return\b/

/**
 * React 的 hook 若写在 early return 之后，首帧会跳过它、后续渲染又调用它，
 * hook 数量不一致 → React 抛错 → 整片白屏。
 *
 * 判定必须只看**组件体的直属语句**：嵌套在 useEffect 回调、事件处理器里的
 * `if (...) return` 不算——它们不构成组件层级的提前退出。
 * （第一版实现按行扫描，把 `useEffect(() => { ... if (x) return ... })`
 *  误判成了违规，说明这种静态检查本身也需要被验证。）
 */
function checkHookOrder(sf, file) {
  const lineOf = p => sf.getLineAndCharacterOfPosition(p).line + 1

  function walk(node) {
    const isFn = ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)
    if (isFn && node.body !== undefined && ts.isBlock(node.body)) {
      const name = node.name?.getText(sf) ?? ''
      if (/^[A-Z]/.test(name)) {
        coverage['hook-order'] += 1
        let sawEarlyReturn = null
        // 只看 body 的直属语句，不进任何嵌套函数
        for (const statement of node.body.statements) {
          if (ts.isIfStatement(statement) && statement.thenStatement !== undefined
              && ts.isReturnStatement(skipToReturn(statement.thenStatement))) {
            sawEarlyReturn = lineOf(statement.getStart())
            continue
          }
          if (sawEarlyReturn !== null) {
            const text = statement.getText(sf)
            const hookLine = text.split('\n').find(line => HOOK_RE.test(line))
            if (hookLine !== undefined) {
              problems.push({
                rule: 'hook-order',
                where: `${rel(file)}:${lineOf(statement.getStart())}`,
                detail: `${name} 里 \`${hookLine.trim().slice(0, 48)}\` 写在 early return（第 ${sawEarlyReturn} 行）之后，会导致整片白屏`,
              })
            }
          }
        }
      }
    }
    ts.forEachChild(node, walk)
  }
  walk(sf)
}

/** 剥掉 `if (x) { return ... }` 的花括号，拿到 return 语句本身。 */
function skipToReturn(stmt) {
  if (ts.isBlock(stmt)) {
    const first = stmt.statements[0]
    return first ?? stmt
  }
  return stmt
}

// ============================================================
// 检查三：createElement 实参里出现「疑似结构塌陷」
// ============================================================

/**
 * 辅助信号：一个返回 JSX 的组件里，如果 createElement 的第 2 个实参
 * 既不是 props 对象也不是 null，通常意味着括号错位。
 *
 * 这条只是**提示级**（不进退出码），因为少数写法确实会跳过 props。
 */
function checkSuspiciousCreateElement(sf, file) {
  const lineOf = p => sf.getLineAndCharacterOfPosition(p).line + 1
  function walk(node) {
    if (ts.isCallExpression(node)
        && node.expression.getText(sf) === 'createElement'
        && node.arguments.length >= 2) {
      coverage['create-element'] += 1
      const second = node.arguments[1]
      const ok = ts.isObjectLiteralExpression(second)
        || second.kind === ts.SyntaxKind.NullKeyword
        || second.kind === ts.SyntaxKind.TrueKeyword
        || second.kind === ts.SyntaxKind.FalseKeyword
      if (!ok) {
        problems.push({
          rule: 'create-element-shape',
          level: 'warn',
          where: `${rel(file)}:${lineOf(node.getStart())}`,
          detail: `createElement 的第 2 个实参不是 props 对象（疑似括号错位）：${second.getText(sf).replace(/\s+/g, ' ').slice(0, 50)}`,
        })
      }
    }
    ts.forEachChild(node, walk)
  }
  walk(sf)
}

// ============================================================
// 检查四：frontmatter 块列表往返（这是数据损坏，必须拦）
// ============================================================

/**
 * `parse.ts` 的块列表解析一旦退化，写回就会静默毁掉用户手写的 `tags:`。
 *
 * 这里不重复测业务逻辑（那是 test 的事），只拦**最经典的那个退化**：
 * 零缩进的 `- item` 必须被识别为块列表项。
 */
async function checkFrontmatterRoundTrip() {
  let mod
  try {
    mod = await import(path.join(root, 'packages', 'core', 'src', 'parse.ts'))
  } catch (error) {
    // **不许静默跳过**：一个「跑不起来就跳过」的检查等于没有检查。
    // 这条曾经写成 `catch { return }`，结果它在本机从未真正执行过——
    // 正是它本该拦住 frontmatter 块列表那个数据损坏 bug。
    problems.push({
      rule: 'frontmatter-check-skipped',
      where: 'scripts/audit.mjs',
      detail: `无法加载 parse.ts（${error instanceof Error ? error.message : String(error)}）。`
        + ' 请用 `node --experimental-strip-types scripts/audit.mjs` 运行。'
        + ' 这条检查不许跳过——它拦的是静默数据损坏。',
    })
    return
  }
  const { parseFrontmatter, serializeFrontmatter, splitFrontmatter } = mod

  const cases = [
    { name: '缩进块列表', body: 'tags:\n  - 前端\n  - 性能', expect: ['前端', '性能'] },
    { name: '零缩进块列表', body: 'tags:\n- a\n- b', expect: ['a', 'b'] },
  ]
  for (const item of cases) {
    coverage['frontmatter'] += 1
    const once = parseFrontmatter(item.body)
    const got = once.tags
    if (JSON.stringify(got) !== JSON.stringify(item.expect)) {
      problems.push({
        rule: 'frontmatter-list',
        where: 'packages/core/src/parse.ts',
        detail: `${item.name} 解析错误：期望 ${JSON.stringify(item.expect)}，实际 ${JSON.stringify(got)}`
          + '（写回会静默毁掉用户手写的标签）',
      })
      continue
    }
    // 往返稳定
    const text = serializeFrontmatter(once)
    const twice = parseFrontmatter(splitFrontmatter(`${text}\n`).frontmatter)
    if (JSON.stringify(twice) !== JSON.stringify(once)) {
      problems.push({
        rule: 'frontmatter-roundtrip',
        where: 'packages/core/src/parse.ts',
        detail: `${item.name} 往返不稳定：${item.body} → ${text.replace(/\n/g, ' | ')} → ${JSON.stringify(twice)}`,
      })
    }
  }
}

// ============================================================
// 检查五：文档里的测试数字与实际是否一致
// ============================================================

/**
 * 文档反复写错的数字，都是「测试数」。
 *
 * 实测改过四次：176→181→185→197，每次都是人工发现的。
 * 这类漂移不痛不痒，但它侵蚀的是文档可信度。
 *
 * ## 为什么必须真跑测试，而不能数 `it(`
 *
 * 第一版实现数 `it(` 字面量，结果 plugin 算出 59 而实际 67——
 * `wiring-ui.test.mjs` 里有 9 条用例在 for 循环里**动态注册**，
 * 静态文本根本不出现。用低估的数字去校验文档，会制造假告警。
 *
 * 所以这里真跑一次测试拿运行器报告的数字。慢一点，但不会自欺。
 */
function countTests() {
  const run = dir => {
    const here = path.join(root, dir)
    if (!fs.existsSync(here)) return { tests: 0, ok: false }
    const files = fs.readdirSync(here).filter(name => /\.test\.(ts|mjs)$/.test(name))
    if (files.length === 0) return { tests: 0, ok: false }
    const isTs = files.some(name => name.endsWith('.ts'))
    const args = ['--test', ...files.map(name => path.join(here, name))]
    if (isTs) args.unshift('--experimental-strip-types')
    const result = spawnSync(process.execPath, args, { encoding: 'utf8', cwd: root })
    const out = `${result.stdout ?? ''}${result.stderr ?? ''}`
    const match = /# tests (\d+)/.exec(out)
    return { tests: match === null ? 0 : Number(match[1]), ok: match !== null }
  }
  return { core: run('packages/core/test'), plugin: run('packages/dsh-plugin/test') }
}

function checkDocNumbers() {
  coverage['doc-numbers'] = 0
  const actual = countTests()
  // 跑不出数字就报错，不许拿 0 去比对（那会把所有文档都判成错）
  if (!actual.core.ok || !actual.plugin.ok) {
    problems.push({
      rule: 'doc-numbers-unknown',
      where: 'scripts/audit.mjs',
      detail: '无法取得实际测试数（测试跑不起来），因此不能校验文档数字',
    })
    return
  }
  const docs = [
    path.join(root, 'docs', 'product.md'),
    path.join(root, 'docs', 'README.md'),
  ]
  for (const file of docs) {
    if (!fs.existsSync(file)) continue
    const text = fs.readFileSync(file, 'utf8')
    const patterns = [
      { re: /core\s*(\d+)\s*项/g, key: 'core', label: 'core' },
      { re: /plugin\s*(\d+)\s*项/g, key: 'plugin', label: 'plugin' },
    ]
    for (const { re, key, label } of patterns) {
      for (const match of text.matchAll(re)) {
        coverage['doc-numbers'] += 1
        const declared = Number(match[1])
        if (declared !== actual[key].tests) {
          problems.push({
            rule: 'doc-number-drift',
            where: path.relative(root, file),
            detail: `文档写 ${label} ${declared} 项，实际 ${actual[key].tests} 项（出现于「${match[0]}」）`,
          })
        }
      }
    }
  }
}

// ============================================================
// 跑
// ============================================================

const files = collect(CLIENT_DIR)
for (const file of files) {
  const sf = parse(file)
  checkCommaReturn(sf, file)
  checkHookOrder(sf, file)
  checkSuspiciousCreateElement(sf, file)
}
await checkFrontmatterRoundTrip()
checkDocNumbers()

const errors = problems.filter(p => p.level !== 'warn')
const warns = problems.filter(p => p.level === 'warn')

/**
 * 覆盖度自检：任何一条规则一个目标都没检查到，说明它已经失效
 * （路径改了、写法变了、正则错了），必须当失败处理。
 */
const emptyRules = Object.entries(coverage).filter(([, n]) => n === 0).map(([rule]) => rule)
if (emptyRules.length > 0) {
  console.log(`❌ 这些检查没有检查到任何目标，等于没有生效：${emptyRules.join('、')}`)
  console.log(`   覆盖度：${JSON.stringify(coverage)}`)
  process.exit(1)
}

const summary = Object.entries(coverage).map(([rule, n]) => `${rule}=${n}`).join(' ')

if (problems.length === 0) {
  console.log(`✅ 静态审计通过：${files.length} 个客户端文件，0 问题`)
  console.log(`   覆盖度：${summary}`)
  process.exit(0)
}

for (const p of [...errors, ...warns]) {
  const tag = p.level === 'warn' ? '⚠️ ' : '❌'
  console.log(`${tag} [${p.rule}] ${p.where}`)
  console.log(`    ${p.detail}`)
}

console.log(`\n覆盖度：${summary}`)
console.log(`${errors.length} 个错误、${warns.length} 个警告`)
process.exit(errors.length > 0 ? 1 : 0)
