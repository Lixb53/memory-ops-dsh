/**
 * store/paths.ts —— 路径与身份派生（纯函数，无 IO）
 *
 * 从 `store.ts` 拆出。这一组函数全部是**纯函数**：给一个相对路径，
 * 算出它的域、项目、身份、展示名。不读盘、不依赖 store 实例。
 *
 * 为什么单独成文件：
 *   1. 它们是 `actions.ts` 与 UI 都需要的公共语义，不该藏在 1041 行的
 *      `createStore` 闭包里靠 `store.xxx` 转发；
 *   2. 纯函数可以单独测（现有 `store.test.ts` 已覆盖一部分）；
 *   3. 它们与 IO 无关，改动风险低，独立出来后 `store.ts` 只剩读写逻辑。
 */

import os from 'node:os'
import path from 'node:path'

import { type Frontmatter } from '../parse.ts'
import { isUnscopedEntry, scopeOfPath } from '../scope.ts'

/** 递归列出 markdown 文件时跳过的名字。 */
export const SKIP_NAMES = new Set(['.DS_Store', '.gitignore', 'README.md'])

/** 状态目录（运行时数据，git 忽略）。 */
export const STATE_DIR = '.state'

/** 归档目录。 */
export const ARCHIVE_DIR = 'archive'

/**
 * 默认根目录：与 ~/.dsh 同级，不在 .dsh 内部。
 *
 * ⚠️ 保持与拆分前完全一致：用 `os.homedir()` 而不是 `process.env.HOME`。
 * 两者在 Windows 上不同（后者常为 undefined），换掉会改变真实库位置。
 */
export function defaultRoot(): string {
  const configured = process.env.MEMORY_OPS_ROOT
  if (typeof configured === 'string' && configured.trim() !== '') return configured.trim()
  return path.join(os.homedir(), '.memory-ops')
}

/** 一条记忆的身份：优先 frontmatter.id，否则由路径派生。 */
export function identityOf(relPath: string, frontmatter?: Frontmatter): string {
  const declared = frontmatter?.id
  if (typeof declared === 'string' && declared.trim() !== '') return declared.trim()
  return relPath.replace(/\.md$/i, '').replace(/\//g, '.')
}

/** 域的展示名。 */
export function domainLabelOf(relPath: string): string {
  const parts = relPath.split('/')
  if (parts[0] === 'personal') return '个人域'
  if (parts[0] === 'work' && parts[1] !== undefined) return `工作域 · ${parts[1]}`
  return parts[0] ?? '未知域'
}

/** 域键：personal 或 work/<project>。 */
export function domainKeyOf(relPath: string): string {
  const parts = relPath.split('/')
  if (parts[0] === 'personal') return 'personal'
  if (parts[0] === 'work' && parts[1] !== undefined) return `work/${parts[1]}`
  return parts[0] ?? 'unknown'
}

/** 项目名（用于「仅本项目」视图）。 */
export function projectOf(relPath: string): string | null {
  const parts = relPath.split('/')
  return parts[0] === 'work' && parts[1] !== undefined ? parts[1] : null
}

/**
 * 条目的分支作用域：**路径优先，frontmatter 兜底**。
 *
 * ## 为什么路径优先
 *
 * 路径是物理事实——文件躺在 `work/sz-web/V2.1.25-dev/` 下，它就是那个分支的。
 * frontmatter 的 `branch` 是自述，可能忘了改、可能写错（现存数据里就有
 * `branch: "V2.1.25-dev / gslx"` 这种把分支和模块混写的值）。
 *
 * 但老数据全在扁平结构里（`work/sz-web/issues/`），路径推不出分支，
 * 这时才认 frontmatter —— 且必须能解析出**单个**分支名，
 * 含分隔符的复合值视为无效（宁可当作项目级共享，也不要猜错归属）。
 *
 * 返回值 `null` 语义有两种（项目级 or 无法判定），调用方用
 * `branchSourceOf` 区分——见 `actions.snapshot` 的 `unscoped` 提示。
 */
export function branchOfEntry(pathBranch: string | null, declared: unknown): string | null {
  if (pathBranch !== null && pathBranch !== '') return pathBranch
  const text = typeof declared === 'string' ? declared.trim() : ''
  if (text === '') return null
  // 复合值（`A / B`、`A,B`）无法归属到单一分支，按共享处理而不是瞎选一个
  if (/[/,、]/.test(text)) return null
  return text
}

/** 分支是否由 frontmatter 自述而来（而非路径派生）。 */
export function branchSourceOf(relPath: string, declared: unknown): 'path' | 'frontmatter' | 'none' {
  const pathScope = scopeOfPath(relPath)
  if (pathScope.branch !== null && pathScope.branch !== '') return 'path'
  const text = typeof declared === 'string' ? declared.trim() : ''
  if (text === '' || /[/,、]/.test(text)) return 'none'
  return 'frontmatter'
}

/** 相对路径安全校验：拒绝绝对路径与 `..` 穿越。 */
export function safeRelPath(input: unknown): string {
  const value = String(input ?? '').replace(/\\/g, '/').trim()
  if (value === '') throw new Error('路径不能为空')
  if (value.startsWith('/')) throw new Error('不接受绝对路径')
  if (value.split('/').includes('..')) throw new Error('不接受上级目录穿越')
  return value.replace(/^\.\//, '')
}

/** 条目的完整快照（对外投影前的原始形状）。 */
export interface MemoryEntry {
  path: string
  id: string
  domain: string
  domainLabel: string
  project: string | null
  /** 分支作用域：`null` = 项目级/共享/未落分支，对所有分支可见。 */
  branch: string | null
  /**
   * 是否「还没落到分支目录」（待迁移）。
   *
   * 与 `branch === null` **不等价**：`_shared/` 也是 null 但属于有意共享。
   * 界面要用它区分「这条对所有分支生效」和「这条还没归类」——
   * 否则迁移进度永远显示不出来。
   */
  unscoped: boolean
  title: string
  kind: string
  scope: string
  layer: string
  status: string
  confidence: number | null
  pinned: boolean
  updatedAt: string
  createdAt: string
  lastCitedAt?: string
  refutedAt?: string
  tags: string[]
  evidence: Record<string, string>[]
  anchor: Record<string, string> | null
  supersededBy: string
  refutedReason: string
  origin: string
  bytes: number
  tokens: number
  lines: number
  overLineLimit: boolean
  frontmatter: Frontmatter
  body: string
  source: string
  mtime: number
}

/**
 * 归一 frontmatter 里的 `anchor` 字段。
 *
 * 为什么要兼容两种形态：`serializeFrontmatter` 把对象数组写成块列表
 * （`anchor:` + `  - path: ...`），解析回来**必然是数组**；而手写的单行锚点
 * 或早期数据可能是裸对象。早先这里只收对象、把数组判成 null，
 * 结果是「写进去的锚点读不出来」——锚点展示与校验全部失效，
 * 且因为真实库里还没有文件带 anchor，这个 bug 一直没有暴露。
 */
export function normalizeAnchor(raw: unknown): Record<string, string> | null {
  const first = Array.isArray(raw) ? raw[0] : raw
  if (typeof first !== 'object' || first === null) return null
  const record = first as Record<string, unknown>
  const shaped: Record<string, string> = {}
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null) continue
    shaped[key] = String(value)
  }
  return Object.keys(shaped).length === 0 ? null : shaped
}

/** 便于 store 实例复用：给定 root 返回绝对路径解析器。 */
export function makeAbsoluteOf(root: string): (relPath: string) => string {
  return (relPath: string): string => path.join(root, safeRelPath(relPath))
}

export { isUnscopedEntry, scopeOfPath }
