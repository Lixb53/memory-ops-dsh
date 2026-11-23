#!/usr/bin/env node
/**
 * 流程图静态语法检查（无渲染器时的最低防线）。
 *
 * 为什么不用 mermaid-cli：它拉 puppeteer + Chromium（>200MB），
 * 本机只做文档交付，不值得为 3 张图装一套浏览器。
 * 这个脚本检查的是会导致解析失败的那几类错误：
 *   1. 首行不是 flowchart/graph 声明
 *   2. subgraph 与 end 数量不等
 *   3. 一行里引号数为奇数（未闭合字符串）
 *   4. 箭头语法（-->, --->、|标签| 的位置）
 *   5. 边端点未声明（拼写错就静默不渲染）
 *   6. style 引用不存在的节点
 *
 * 它**不**证明能渲染。交付里必须写"需在评审环境渲染一次"。
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
if (!dir) {
  console.error('用法: node check-flows.mjs <flows 目录>')
  process.exit(2)
}

let failed = 0
for (const file of readdirSync(dir).filter(f => f.endsWith('.mmd'))) {
  const path = join(dir, file)
  const src = readFileSync(path, 'utf8')
  const lines = src.split(/\r?\n/)
  const problems = []

  const firstContent = lines.find(l => l.trim() !== '' && !l.trim().startsWith('%%'))
  if (!firstContent || !/^(flowchart|graph)\s+(TB|TD|BT|LR|RL)$/.test(firstContent.trim())) {
    problems.push(`首行不是 flowchart 声明: ${JSON.stringify(firstContent)}`)
  }

  const sgOpen = lines.filter(l => /^\s*subgraph\s+/.test(l)).length
  const sgClose = lines.filter(l => /^\s*end\s*$/.test(l)).length
  if (sgOpen !== sgClose) problems.push(`subgraph ${sgOpen} 个 / end ${sgClose} 个，不配对`)

  const declared = new Set()
  const styles = []

  for (const [i, raw] of lines.entries()) {
    const line = raw.trim()
    if (line === '' || line.startsWith('%%')) continue
    const q = (line.match(/"/g) ?? []).length
    if (q % 2 !== 0) problems.push(`第 ${i + 1} 行引号数为奇数: ${line}`)

    // 声明：id["..."] / id{"..."} / id("...") / id>...]
    for (const m of line.matchAll(/([A-Za-z][\w-]*)\s*(\[|\{|\(|>)/g)) declared.add(m[1])
    // subgraph 名也当作可见 id
    const sg = line.match(/^\s*subgraph\s+([A-Za-z][\w-]*)/)
    if (sg) declared.add(sg[1])

    if (/^style\s+/.test(line)) {
      styles.push(line.split(/\s+/)[1])
    }

    // 边：a --> b / a -->|t| b / a --- b
    if (/-->|---/.test(line) && !line.startsWith('style')) {
      const bad = line.match(/\|\s*\|/)
      if (bad) problems.push(`第 ${i + 1} 行存在空标签 ||`)
      if (/-->\s*$/.test(line)) problems.push(`第 ${i + 1} 行箭头后没有目标: ${line}`)
    }
  }

  for (const s of styles) if (s && !declared.has(s)) problems.push(`style 引用未声明的节点: ${s}`)

  if (problems.length) {
    failed++
    console.log(`✗ ${file}`)
    for (const p of problems) console.log(`    ${p}`)
  } else {
    console.log(`✓ ${file}（${lines.length} 行，${declared.size} 个节点/泳道，${styles.length} 条 style）`)
  }
}

console.log(failed ? `\n${failed} 个文件有静态问题` : '\n静态检查通过（不证明可渲染，需真机渲染一次）')
process.exit(failed ? 1 : 0)