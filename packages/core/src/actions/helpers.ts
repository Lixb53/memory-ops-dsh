/**
 * actions/helpers.ts —— 读侧辅助函数（纯函数）
 *
 * 从 actions.ts 顶部抽出。这些函数全部只依赖入参，不碰 store：
 *   - citeCountsOf  从事件流统计引用次数
 *   - navOf         从条目聚合导航（不读手写表格——那会过时）
 *   - excludedSummary 被作用域隐藏的条目数（区分「规则生效」与「数据丢了」）
 *
 * 抽出来的收益：读领域模块（snapshot / overview / search）可以各自 import，
 * 而不是共用一个 1681 行的闭包。
 */

import { projectLineage, isEntryVisible, type ScopeResolution } from '../scope.ts'
import type { MemoryEntry } from '../store.ts'

/**
 * 一条导航。定义在这里而不是 read.ts：
 * 它只被 navOf 与 snapshot 消费，放在 helpers 里避免循环依赖。
 */
export interface NavItem {
  /** 相对项目的目录路径，如 `V2.1.25-dev/issues`、`_shared`。 */
  path: string
  /** 该目录下（不含子目录）的条目数。 */
  count: number
  tokens: number
  /** `branch` = 分支专属；`shared` = 有意全分支共享；`root` = 未落分支。 */
  kind: 'branch' | 'shared' | 'root'
}

/** 从事件流统计每个条目的 cite 次数。 */
export function citeCountsOf(events: { kind?: string; ids?: string[] }[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const event of events) {
    if (event.kind !== 'cite') continue
    for (const id of event.ids ?? []) counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

/** 作用域的父链（含自身，由近到远）。 */
export function projectLineageOf(scope: ScopeResolution): string[] {
  return projectLineage(scope.project, scope.parents)
}

/**
 * 被作用域挡掉的项目及条目数。
 *
 * 为什么这个数字必须给界面：作用是**不让看**，那界面上「少了 12 条」
 * 和「数据丢了 12 条」长得一模一样。给一个明确的「已按作用域隐藏 N 条（gslz）」
 * 才能让人分清「规则生效」与「出故障」——这是本仓库反复踩的那个坑。
 */
export function excludedSummary(
  entries: MemoryEntry[],
  scope: ScopeResolution,
): { project: string | null; count: number }[] {
  const byProject = new Map<string | null, number>()
  for (const entry of entries) {
    if (isEntryVisible(
      { project: entry.project, branch: entry.branch },
      { project: scope.project, branch: scope.branch, parents: scope.parents },
    )) continue
    byProject.set(entry.project, (byProject.get(entry.project) ?? 0) + 1)
  }
  return [...byProject.entries()]
    .map(([project, count]) => ({ project, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * 从条目聚合出导航。
 *
 * 结构完全由数据决定：目录里没有条目就不会出现在导航里，
 * 也不会像手写表格那样列出早已不存在的目录。
 *
 * 层级只到「分支/分类」两层，再深就变成文件清单而非导航了。
 */
export function navOf(entries: MemoryEntry[]): NavItem[] {
  const byDir = new Map<string, { count: number; tokens: number }>()
  for (const entry of entries) {
    if (entry.project === null) continue
    const parts = entry.path.split('/')
    /**
     * 只取「分支层 + 分类层」，且**分类层必须是目录**。
     *
     * 早先直接 `slice(2, 4)`，于是 `dsh/main/x.md` 会把文件名当分类层，
     * 导航退化成文件清单（每个文件一条）。导航要回答「去哪找」，
     * 不是「有哪些文件」——后者检索本来就该做。
     */
    const branch = parts[2]
    const category = parts[3]
    if (branch === undefined) continue
    const dir = category === undefined || category.toLowerCase().endsWith('.md')
      ? branch.replace(/\.md$/i, '')
      : `${branch}/${category}`
    const current = byDir.get(dir) ?? { count: 0, tokens: 0 }
    current.count += 1
    current.tokens += entry.tokens
    byDir.set(dir, current)
  }
  return [...byDir.entries()]
    .map(([key, value]) => {
      const head = key.split('/')[0]!
      const kind: NavItem['kind'] = head === '_shared'
        ? 'shared'
        : /^v?\d+(\.\d+)+/i.test(head) || ['main', 'master', 'dev', 'develop', 'trunk', 'release'].includes(head.toLowerCase())
          ? 'branch'
          : 'root'
      return { path: key, count: value.count, tokens: value.tokens, kind }
    })
    .sort((a, b) => a.path.localeCompare(b.path))
}
