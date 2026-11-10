#!/usr/bin/env node
/**
 * 作用域巡检 —— 定期扫一遍库，找出「该拦但当时没拦」的偏航。
 *
 * ## 它为什么是兜底而不是主防线
 *
 * 主防线在 `createEntry` 里：往 `_shared` 写架构知识会直接抛错。
 * 但主防线只管**新的写入**，管不了三种历史情况：
 *   1. 校验上线之前写进去的条目
 *   2. 人手改文件绕过 API（Markdown 真相源本来就是给人改的）
 *   3. 判定标准变化后，旧条目按新标准不再合规
 *
 * 所以巡检要报的**不是「有问题的条目」**（那会被当成噪音忽略），
 * 而是三类**可执行的具体动作**：该搬去哪、缺什么字段、哪条待定。
 *
 * 用法：
 *   node --experimental-strip-types packages/core/scripts/scope-audit.ts
 *   node --experimental-strip-types packages/core/scripts/scope-audit.ts --json
 */

import path from 'node:path'

import { createStore } from '../src/store.ts'
import { isUnscopedEntry } from '../src/scope.ts'
import { SHARED_BRANCH, SHARED_ALLOWED_KINDS, canShareAcrossBranches } from '../src/schema.ts'

/** 一条巡检发现。每条都必须是「能直接动手」的，不是抽象警告。 */
interface Finding {
  severity: 'error' | 'warn'
  kind: 'bad-share' | 'unscoped'
  path: string
  /** 建议的修法。空字符串表示需要人判断，给不出建议。 */
  fix: string
  reason: string
}

/** 主流程。 */
async function main() {
  const asJson = process.argv.includes('--json')
  const store = createStore()
  const entries = await store.scan()
  /** `branches` 字段已废弃，统一走形态识别。 */
  const branches: Record<string, string[]> = {}
  const findings: Finding[] = []

  for (const entry of entries) {
    if (entry.project === null) continue
    const parts = entry.path.split('/')
    const inShared = parts[2] === SHARED_BRANCH
    const kind = typeof entry.frontmatter.knowledgeKind === 'string'
      ? entry.frontmatter.knowledgeKind.trim()
      : ''

    /** 1) 共享层里放了随版本变化的知识 —— 最严重，直接搬走。 */
    if (inShared && !canShareAcrossBranches(kind)) {
      findings.push({
        severity: 'error',
        kind: 'bad-share',
        path: entry.path,
        fix: `搬到 work/${entry.project}/<具体分支>/ 下，或补 knowledgeKind: ${SHARED_ALLOWED_KINDS.join('|')}`,
        reason: kind === ''
          ? '在 _shared 里但没有 knowledgeKind 标注，无法证明它不随版本变'
          : `knowledgeKind「${kind}」随版本变化，不该跨分支共享`,
      })
      continue
    }


    /** 3) 没落到分支目录 —— 待办，不是错误。 */
    if (isUnscopedEntry(entry.path, branches[entry.project])) {
      const declared = branches[entry.project]
      findings.push({
        severity: 'warn',
        kind: 'unscoped',
        path: entry.path,
        fix: declared === undefined || declared.length === 0
          ? `移到 work/${entry.project}/<分支>/ 下（如 main、V2.1.25-dev）`
          : `移到 work/${entry.project}/<${declared.join('|')}>/ 下`,
        reason: '不在任何分支目录下，当前对所有分支可见（可能串味）',
      })
    }
  }

  const errors = findings.filter(item => item.severity === 'error')
  const warns = findings.filter(item => item.severity === 'warn')

  if (asJson) {
    console.log(JSON.stringify({ findings, errors: errors.length, warns: warns.length }, null, 2))
    process.exit(errors.length > 0 ? 1 : 0)
  }

  console.log(`# 作用域巡检\n`)
  console.log(`扫描 ${entries.length} 条，发现 ${errors.length} 个错误、${warns.length} 个待办\n`)

  for (const [title, list] of [
    ['错误：共享层放了随版本变化的知识', errors],
    ['待办：需要人工处理', warns],
  ] as const) {
    if (list.length === 0) continue
    console.log(`## ${title}（${list.length}）\n`)
    for (const item of list) {
      console.log(`- ${item.path}`)
      console.log(`  ${item.reason}`)
      if (item.fix !== '') console.log(`  修法：${item.fix}`)
    }
    console.log('')
  }

  if (findings.length === 0) console.log('✅ 全部合规：无跨版本共享、无未落分支条目')
  process.exit(errors.length > 0 ? 1 : 0)
}

await main()
