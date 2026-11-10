/**
 * 记忆作用域 —— 「这条记忆属于谁，谁读得到」。
 *
 * ## 为什么需要这一层（真问题）
 *
 * 早先库只有一维 `project`：`work/sz-web` 一个目录，35 条记忆全在里面。
 * 于是出现了两类串味，且都是**读错**而不是读不到：
 *
 * 1. **子模块串味**：`sz-web-dzh-gslx` 的 20 条定制记忆与 `sz-web` 的平台记忆
 *    躺在同一个 `issues/` 下。任何子模块打开「本项目」都能看到别人的定制细节。
 * 2. **分支串味**：`V2.1.25-dev` 的会话能读到 `V2.1.24-dev` 的结论。
 *
 * 这比「空」更危险：空态至少会被察觉，读到别人的结论会被直接当成事实用。
 *
 * ## 模型：二维，且只有一个方向可继承
 *
 * ```
 *             sz-web（主仓 / 父项目）
 *              ↑ 只能子读父
 *     ┌────────┴────────┐
 *  sz-web-dzh-gslx   sz-web-dzh-gslz   ← 兄弟之间互不可见
 * ```
 *
 * - 子模块**可以**读主仓记忆（主仓是运行基座，规则④）
 * - 主仓**不能**读子模块记忆（否则定制细节污染通用结论）
 * - 分支维度独立：`V2.1.25-dev` 与 `V2.1.24-dev` 互不可见（规则⑤）
 * - `_shared` 分支目录 = 该项目下所有分支都可见（如「子模块维护手册」）
 *
 * ## 为什么父项目必须显式声明（不靠命名前缀猜）
 *
 * `sz-web-dzh-*` 看起来像 `sz-web` 的子模块，但命名前缀是**外部约定**，
 * 不是库内事实。本仓库已经为「猜名字」付过一次代价（见 `project.ts` 的事故注释）。
 * 所以父子关系写在 `work/<project>/index.md` 的 `parent:` 字段里：
 * 人可审、可 git 管、可被测试断言。
 */

import { SHARED_BRANCH, ANY_BRANCH, BRANCH_SEPARATOR } from './schema.ts'

/** 归一化分支/项目名，用于比较（只用于比较，展示保留原样）。 */
function norm(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}

/**
 * 分支是否相容。
 *
 * 规则（与项目别名的「精确 > 前缀」同构，避免两套心智模型）：
 *   1. 条目是 `_shared` / `*` / 空 → 任何分支都可见
 *   2. 精确相等 → 可见
 *   3. 条目是会话分支的**前缀 + 分隔符** → 可见
 *      （`V2.1.25-dev` 覆盖 `V2.1.25-dev-6594-6649`，因为后者是从前者拉出的特性分支）
 *   4. 反向不成立：更具体的条目**不**上浮到更宽的分支
 *      （否则特性分支上的临时结论会污染主线）
 *
 * @param entryBranch - 条目声明的分支；`null` 表示项目级（对所有分支可见）
 * @param sessionBranch - 会话实际所在分支；`null` 表示没识别出来
 */
export function branchMatches(
  entryBranch: string | null | undefined,
  sessionBranch: string | null | undefined,
): boolean {
  const entry = norm(entryBranch)
  if (entry === '' || entry === norm(SHARED_BRANCH) || entry === ANY_BRANCH) return true
  const session = norm(sessionBranch)
  // 会话分支没识别出来时，交由调用方决定策略（见 `isEntryVisible` 的 `onUnknownBranch`）
  if (session === '') return false
  if (entry === session) return true
  return session.startsWith(`${entry}${BRANCH_SEPARATOR}`)
}

/**
 * 会话分支无法识别时的取舍。
 *
 * `'show'` = 不按分支过滤，全部展示，但界面必须挂「未识别分支」提示。
 *
 * ## 为什么默认是 `show` 而不是 `hide`（这是一次有意的取舍）
 *
 * 本仓库最痛的缺陷是「失败伪装成空」（见 `project.ts` 与 docs 18.1）：
 * 把「不知道」渲染成「没有」，用户会以为记忆丢了，而真实原因是识别失败。
 * 分支识别失败时若直接隐藏全部分支记忆，等于复刻那个形态。
 *
 * 代价是：识别不出分支时，确实会看到跨分支的记忆。
 * 所以这不是「安全」，是**可察觉的不精确**——用一条显式警告换掉一个假空态。
 * 若日后判定「宁可空也不串」，把这里改成 `'hide'` 即可，只有这一处开关。
 */
export const UNKNOWN_BRANCH_POLICY: 'show' | 'hide' = 'show'

/** 一条记忆的作用域（从路径 + frontmatter 派生）。 */
export interface EntryScope {
  /** `work/<project>` 的 project；个人域为 null。 */
  project: string | null
  /** 分支名；`null` = 项目级/共享，对所有分支可见。 */
  branch: string | null
}

/** 会话视角的作用域。 */
export interface ViewScope extends EntryScope {
  /** 项目 → 父项目映射（只含已声明 parent 的项目）。 */
  parents: Record<string, string | null>
}

/**
 * 收集「项目 → 父项目」。
 *
 * 只认 `work/<project>/index.md`：索引文件是项目的声明处，
 * 与 `projectAliasesOf` 保持同一原则——不让任意子文件改写归属。
 */
export function projectParentsOf(
  entries: { path: string; frontmatter?: Record<string, unknown> }[],
): Record<string, string | null> {
  const parents: Record<string, string | null> = {}
  for (const entry of entries) {
    const parts = String(entry.path ?? '').split('/')
    if (parts[0] !== 'work' || parts.length !== 3) continue
    if (parts[2]!.toLowerCase() !== 'index.md') continue
    const name = parts[1]!
    const declared = entry.frontmatter?.parent
    const parent = typeof declared === 'string' ? declared.trim() : ''
    parents[name] = parent === '' ? null : parent
  }
  return parents
}

/**
 * 从检出路径推断父项目：**看直接父目录的 git remote**。
 *
 * ## 为什么不靠 `parent:` 字段
 *
 * `parent:` 是手写的、机器本该知道的信息——和已废弃的 `aliases` / `branches`
 * 是同一个毛病。它会漏写（新子模块忘了声明）、会写错（改名后没跟着改），
 * 而错了的表现是「子模块读不到主仓」——又一个看起来像「没有」的失败。
 *
 * ## 为什么不靠路径字符串
 *
 * `…/zhongxing/V2.1.25-dev/submodule/sz-web-dzh-gslx` 里
 * 只有子模块自己的名字，**没有任何 `sz-web` 字样**（父目录叫 `V2.1.25-dev`）。
 * 所以字符串匹配在这里必然失效。
 *
 * ## 为什么只查直接父目录
 *
 * 子模块的标准布局是 `<父仓根>/submodule/<子模块>`，父仓根就是父目录的父目录。
 * 但更稳的判据是：**向上走到第一个"自己就是某个已知项目检出"的目录**。
 * 只查直接父目录（`…/submodule/`）会扑空，所以从 cwd 向上逐级查，
 * 遇到已知项目即停——这不是"只查一层"，而是"只认最近的一层"。
 *
 * 调用方拿到的 `parent` 是项目名；推不出来时为 null，且必须能说出为什么。
 */
export async function inferParentProject({
  cwd,
  projects,
  maxDepth = 5,
  readRepo = readRepoIdentity,
}: {
  cwd: unknown
  projects: { name: string }[]
  /** 向上最多查几层。太深会拖慢，太浅会漏掉 `…/a/b/c/submodule/x`。 */
  maxDepth?: number
  readRepo?: typeof readRepoIdentity
}): Promise<{ parent: string | null; detail: string }> {
  const start = String(cwd ?? '').trim()
  if (start === '') return { parent: null, detail: '没有会话目录，无法推断父项目' }

  const byName = new Map(projects.map(item => [item.name.toLowerCase(), item.name]))
  const parts = start.replace(/\\/g, '/').split('/').filter(part => part !== '')
  const tried: string[] = []

  // 从**自己**开始向上：自己若是已知项目，它没有父（那是主仓本身）
  let self = true
  for (let depth = 0; depth < maxDepth && parts.length > 0; depth += 1) {
    const dir = `${start.startsWith('/') ? '/' : ''}${parts.join('/')}`
    const repo = await readRepo(dir)
    if (repo.repo !== null) {
      const known = byName.get(repo.repo.toLowerCase())
      if (known !== undefined && !self) {
        return {
          parent: known,
          detail: `由上级目录 ${parts[parts.length - 1]} 的 remote（${repo.repo}）推断`,
        }
      }
      tried.push(`${parts[parts.length - 1] ?? '/'}→${repo.repo}`)
    }
    parts.pop()
    self = false
  }

  return {
    parent: null,
    detail: tried.length === 0
      ? '向上各级目录都不是 git 仓库，无法推断父项目'
      : `向上查了 ${tried.length} 层（${tried.join('、')}），都不是库里已知的项目`,
  }
}

/**
 * 项目已声明的分支列表（来自 `work/<project>/index.md` 的 `branches:`）。
 *
 * ## 为什么分支必须由项目自己声明
 *
 * 统一「按分支建目录」之后，路径第三段同时可能承载两种含义：
 * ```
 * work/sz-web/V2.1.25-dev/issues/a.md   ← 第三段是分支
 * work/sz-web/issues/a.md               ← 第三段是分类目录（老布局/迁移中）
 * ```
 * 只看字符串分不出来。`V2.1.25-dev` 长得像分支，`issues` 不像，
 * 但这是命名习惯，不是库内事实——本仓库已为「凭命名猜归属」付过两次代价
 * （§18.1 假空态、子模块被主仓别名抢走）。
 *
 * 所以：**声明了 `branches:` 的项目，第三段必须命中声明才被认作分支**；
 * 未声明的项目按版本号形态兜底（兼容尚未补声明的存量数据）。
 */
export function projectBranchesOf(
  entries: { path: string; frontmatter?: Record<string, unknown> }[],
): Record<string, string[]> {
  const branches: Record<string, string[]> = {}
  for (const entry of entries) {
    const parts = String(entry.path ?? '').split('/')
    if (parts[0] !== 'work' || parts.length !== 3) continue
    if (parts[2]!.toLowerCase() !== 'index.md') continue
    const name = parts[1]!
    const declared = entry.frontmatter?.branches
    if (!Array.isArray(declared)) continue
    branches[name] = declared.map(item => String(item).trim()).filter(item => item !== '')
  }
  return branches
}

/**
 * 无需声明即可识别的通用分支名。
 *
 * ## 为什么必须有这一份（删掉 `branches` 字段后暴露的回归）
 *
 * 读者拍板废弃 `branches` 字段，理由是它和目录结构冗余。删完后立刻出问题：
 * `work/memory-ops/main/architecture/x.md` 被判成「未落分支」——
 * 因为 `looksLikeBranch` 只认版本号形态，`main` 不在其中。
 *
 * 两类分支名性质不同，不能一刀切：
 *   - **通用名**（main / master / dev …）：任何项目都可能用，可安全内置
 *   - **项目特有**（V2.1.25-dev、feature-x）：只有该项目知道，靠版本号形态或声明
 *
 * 内置这一小份的收益：单线项目开箱即用，不必为 `main` 写一行声明。
 * 风险：若某项目有个**分类目录**恰好叫 `dev`，会被误认成分支。
 * 这个风险可接受——`issues`/`maps` 这类分类名不会与通用分支名冲突，
 * 而真冲突时目录语义已经含混，本来就该改名。
 */
export const COMMON_BRANCH_NAMES = [
  'main', 'master', 'develop', 'dev', 'trunk', 'release',
] as const

/** 判断一个目录名像不像分支。 */
export function looksLikeBranch(segment: string, declared?: Iterable<string>): boolean {
  if (segment === '' || segment === SHARED_BRANCH) return false
  if (declared !== undefined) {
    for (const name of declared) {
      if (norm(name) === norm(segment)) return true
    }
    // 已声明分支表的项目，非声明值一律不认（含版本号形态的误建目录）
    return false
  }
  const value = norm(segment)
  // 通用分支名无需声明
  if ((COMMON_BRANCH_NAMES as readonly string[]).includes(value)) return true
  // 版本号形态（V2.1.24-dev、v1.0）
  return /^v?\d+(\.\d+)+/i.test(segment)
}

/**
 * 从条目路径派生作用域。
 *
 * 路径布局（统一按分支建目录）：
 * ```
 * work/sz-web/index.md                       ← 项目索引，无分支
 * work/sz-web/_shared/workflow/x.md          ← 该项目全分支共享
 * work/sz-web/V2.1.25-dev/issues/y.md        ← 仅 V2.1.25-dev 一族可见
 * work/memory-ops/main/issues/z.md           ← 单线项目也用 main
 * work/sz-web/issues/legacy.md               ← 老布局：未落分支，按共享处理
 * personal/preferences.md                    ← 个人域，无项目/分支
 * ```
 *
 * 老布局条目返回 `branch: null` 并在 `branches` 强制模式下被标记为待迁移，
 * 而不是被判成「看不到」——降级可见比假空态安全，理由见 `UNKNOWN_BRANCH_POLICY`。
 *
 * @param declared - 该项目已声明的分支名（`projectBranchesOf` 的结果）。
 */
export function scopeOfPath(relPath: unknown, declared?: Iterable<string>): EntryScope {
  const parts = String(relPath ?? '').replace(/\\/g, '/').split('/').filter(part => part !== '')
  if (parts[0] !== 'work' || parts[1] === undefined) return { project: null, branch: null }
  const project = parts[1]
  const third = parts[2]
  // 项目级文件（index.md 等直接躺在项目根下的条目）不属于任何分支
  if (third === undefined || third.toLowerCase().endsWith('.md')) {
    return { project, branch: null }
  }
  if (third === SHARED_BRANCH) return { project, branch: null }
  // 老扁平布局（issues/ 等）不是分支，按共享处理——否则等于让它们全场不可见
  if (!looksLikeBranch(third, declared)) return { project, branch: null }
  return { project, branch: third }
}

/** 沿 parent 链取祖先（含自身），带环保护。 */
export function projectLineage(project: string | null, parents: Record<string, string | null>): string[] {
  if (project === null || project === '') return []
  const seen = new Set<string>()
  const chain: string[] = []
  let current: string | null = project
  while (current !== null && current !== '' && !seen.has(current)) {
    seen.add(current)
    chain.push(current)
    current = parents[current] ?? null
  }
  return chain
}

/**
 * 一条记忆对一个会话视角是否可见。
 *
 * 三个条件全满足才可见：项目在祖先链上、分支相容、个人域恒可见。
 *
 * **个人域恒可见**：个人偏好/原则跨项目生效，那不是「某个项目的记忆」。
 */
export function isEntryVisible(entry: EntryScope, view: ViewScope): boolean {
  if (entry.project === null) return true
  if (view.project === null) {
    /**
     * 会话没认出项目：不按项目过滤（否则复刻假空态），但仍按分支过滤有意义的条目。
     * 这是「不知道 ≠ 没有」的同一原则，见 `UNKNOWN_BRANCH_POLICY`。
     */
    return view.branch === null
      ? true
      : branchMatches(entry.branch, view.branch)
  }
  const lineage = projectLineage(view.project, view.parents)
  if (!lineage.includes(entry.project)) return false
  if (view.branch === null) {
    return UNKNOWN_BRANCH_POLICY === 'show' ? true : entry.branch === null
  }
  return branchMatches(entry.branch, view.branch)
}

/** 作用域的一句话描述，供界面回显与诊断。 */
export function describeScope(scope: EntryScope): string {
  if (scope.project === null) return '个人域'
  if (scope.branch === null) return `${scope.project} · 全部分支`
  return `${scope.project} · ${scope.branch}`
}

/**
 * 条目是否「还没落到分支目录」。
 *
 * 统一按分支建目录后，`branch: null` 只剩两种来源：
 *   1. `_shared/` 目录 —— 有意全分支共享
 *   2. 项目根或老分类目录 —— **尚未迁移**，属于待办而不是设计
 *
 * 两者在可见性上相同（都可见），但报表必须分开计数：
 * 否则「还有多少条没迁移」永远算不出来，迁移就永远做不完。
 *
 * @param declared - 该项目已声明的分支表。**必须传**，否则 `main` 这类
 *   非版本号分支名会被误判成「未落分支」——真实踩到：memory-ops 的
 *   `main/architecture/x.md` 已被正确解析为 `branch: main`，
 *   但本函数未收到声明、走形态兜底，仍报「待迁移」，两处结论打架。
 */
export function isUnscopedEntry(relPath: unknown, declared?: Iterable<string>): boolean {
  const parts = String(relPath ?? '').replace(/\\/g, '/').split('/').filter(part => part !== '')
  if (parts[0] !== 'work' || parts[1] === undefined) return false
  const third = parts[2]
  /**
   * 直接摊在项目根下的条目，只有 `index.md` 是项目索引。
   *
   * ## 这里曾经写错，代价是静默漏报（真实缺陷）
   *
   * 早先写成 `third.endsWith('.md')` → 把所有躺在项目根的文件都当索引。
   * 于是 gslx 的 8 条「临夏定制」文档（`work/sz-web-dzh-gslx/临夏定制-…md`）
   * 明明是漏落分支的待办，却全被判成 `unscoped: false`，
   * 界面显示「待定 0 条」——**一个假的清零**。
   *
   * 判据必须是精确的文件名，不是后缀。
   */
  if (third === undefined) return false
  if (parts.length === 3 && third.toLowerCase() === 'index.md') return false
  // `_shared/` 是**有意的**全分支共享，不是「还没迁移」
  if (third === SHARED_BRANCH) return false
  // 项目根下的其他文件 = 尚未落到分支目录
  if (third.toLowerCase().endsWith('.md')) return true
  return !looksLikeBranch(third, declared)
}

/* ------------------------------------------------------------------ *
 * 分支识别：git 优先，路径兜底，失败必须可解释
 * ------------------------------------------------------------------ */

/** 分支识别的结果。`null` 永远配一个非空 `reason`——不解释的失败等于「本来就没有」。 */
export interface BranchDetection {
  branch: string | null
  /** `git` = 读到了真实分支；`path` = 从目录名推断；`null` = 都没拿到。 */
  source: 'git' | 'path' | null
  /** 失败原因码（见 `SCOPE_REASONS`），成功时为空字符串。 */
  reason: string
  /** 诊断细节：实际跑了什么、看到什么。 */
  detail: string
}

/**
 * 从目录名兜底推断分支。
 *
 * ## 为什么这是兜底而不是主路径（真实数据教训）
 *
 * 目录名 `V2.1.25-dev` 的实际签出分支是 `V2.1.25-dev-6594-6649`。
 * 只看目录名会把特性分支误判成主线，于是特性分支上的临时结论
 * 会「上浮」到整条主线——正是规则⑤要禁止的事。
 *
 * 所以只在读不到 git 时用它，且必须在结果里标明 `source: 'path'`，
 * 让界面能说「分支是按目录名推断的，可能不准」。
 */
export function branchFromPath(cwd: unknown): string | null {
  const parts = String(cwd ?? '').replace(/\\/g, '/').split('/').filter(part => part !== '')
  /**
   * 取末段，但跳过 `submodule` 这种结构目录：
   * `…/V2.1.25-dev/submodule/sz-web-dzh-gslx` 的末段是子模块名，不是分支。
   * 这种情况下分支属于**子模块自己的** git，路径推不出来。
   */
  const last = parts[parts.length - 1]
  if (last === undefined || last === '') return null
  if (/^\d/.test(last)) return null
  // 形如 V2.1.25-dev / master / main / feature-x
  if (!/^[A-Za-z0-9._\/-]+$/.test(last)) return null
  if (/^v?\d+(\.\d+)*(-|$)/i.test(last)) return last
  return null
}

/**
 * 读 git 当前分支。
 *
 * 用 `rev-parse --abbrev-ref HEAD` 而不是 `branch --show-current`：
 * 后者在旧版 git（< 2.22）不存在，而目标环境是内网 GitLab 的装机。
 *
 * detached HEAD 会返回字面量 `HEAD`，这不是分支名，必须当失败处理——
 * 否则会派生出 `branch: 'HEAD'` 这种既查不到也不是错的垃圾值。
 *
 * @param run - 执行命令的注入点，测试用它避免真跑子进程。
 */
export async function readGitBranch(
  cwd: unknown,
  run: (cmd: string, args: string[], options: { cwd: string }) => Promise<string> = defaultRun,
): Promise<BranchDetection> {
  const dir = String(cwd ?? '').trim()
  if (dir === '') {
    return { branch: null, source: null, reason: 'no_cwd', detail: '没有会话工作目录' }
  }
  try {
    const out = await run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: dir })
    const name = out.trim()
    if (name === '' || name === 'HEAD') {
      return {
        branch: null, source: null, reason: 'detached_head',
        detail: 'git 处于 detached HEAD，没有分支名；请显式指定分支',
      }
    }
    return { branch: name, source: 'git', reason: '', detail: `git rev-parse --abbrev-ref HEAD → ${name}` }
  } catch (error) {
    const fallback = branchFromPath(dir)
    const detail = error instanceof Error ? error.message : String(error)
    if (fallback !== null) {
      return {
        branch: fallback, source: 'path', reason: '',
        detail: `读 git 失败（${detail}），按目录名推断为 ${fallback}`,
      }
    }
    return {
      branch: null, source: null, reason: 'no_git',
      detail: `读 git 失败（${detail}），且目录名不含版本号，无法推断分支`,
    }
  }
}

/** 默认命令执行器（node:child_process，标准库，不引第三方依赖）。 */
async function defaultRun(cmd: string, args: string[], options: { cwd: string }): Promise<string> {
  const { execFile } = await import('node:child_process')
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd: options.cwd, timeout: 3000 }, (error, stdout) => {
      if (error) reject(error)
      else resolve(String(stdout))
    })
  })
}

/** 从 git remote URL 提取仓库名。`…/sz-front/sz-web.git` → `sz-web`。 */
export function repoNameFromRemote(url: unknown): string | null {
  const cleaned = String(url ?? '').trim().replace(/\.git$/i, '').replace(/[\/]+$/, '')
  if (cleaned === '') return null
  // 同时支持 `https://host/a/b.git` 与 `git@host:a/b.git`
  const last = cleaned.split(/[\/:]/).pop() ?? ''
  return last.trim() === '' ? null : last.trim()
}

/**
 * 读仓库身份：仓库名 + 是否子模块。
 *
 * ## 为什么用 remote 而不是目录名（替换 aliases 的根本理由）
 *
 * 早先靠 `index.md` 的 `aliases` 登记「哪些目录名属于我」：
 * `V2.1.25-dev`、`sz-web-dzh-gslx` 全塞进去。代价是：
 *   - 别名表与分支/子模块名重叠，两个字段职责混在一起
 *   - 目录改名、新开分支目录都要手工补，漏补就变空态
 *
 * remote URL 是仓库的**固有身份**：目录叫什么、在哪、开几个分支副本，
 * 它都不变。`…/zhongxing/V2.1.25-dev` 的 remote 仍是 `sz-web.git`。
 *
 * @returns `repo` 为 null 表示不是 git 仓库或读不到——调用方退回路径猜测。
 */
export async function readRepoIdentity(
  cwd: unknown,
  run: (cmd: string, args: string[], options: { cwd: string }) => Promise<string> = defaultRun,
): Promise<{ repo: string | null; detail: string }> {
  const dir = String(cwd ?? '').trim()
  if (dir === '') return { repo: null, detail: '没有会话工作目录' }
  try {
    const url = await run('git', ['config', '--get', 'remote.origin.url'], { cwd: dir })
    const repo = repoNameFromRemote(url)
    return repo === null
      ? { repo: null, detail: 'remote.origin.url 为空' }
      : { repo, detail: `git remote → ${repo}` }
  } catch (error) {
    return {
      repo: null,
      detail: `读 remote 失败（${error instanceof Error ? error.message : String(error)}）`,
    }
  }
}

/** 会话视角的完整解析结果。 */
export interface ScopeResolution {
  /** 项目名（`work/<project>`）；认不出为 null。 */
  project: string | null
  /** 分支名；没识别出为 null。 */
  branch: string | null
  /** 分支来源：`git` 可靠，`path` 是推断，`null` 未识别。 */
  branchSource: 'git' | 'path' | null
  /** 归一化后的 cwd，回显用。 */
  cwd: string | null
  /** 失败原因码：项目与分支合起来可能有多条。 */
  reasons: string[]
  /** 面向人的诊断说明——必须能回答「凭什么」和「试过什么」。 */
  detail: string
  /** 项目 → 父项目映射（供可见性判定）。 */
  parents: Record<string, string | null>
}

/**
 * 把 cwd 解析成「项目 + 分支」。
 *
 * 两件事分开做，因为可靠性不同：
 *   - 项目：纯路径 + 库内别名表（`project.ts`），确定性强
 *   - 分支：优先读 git，失败才退回目录名，且标明来源
 *
 * 语义与 `project.ts` 一致：**空 cwd 不报错**（没有上下文 ≠ 有上下文但认不出）。
 */
export async function resolveScope({
  cwd,
  projects,
  entries,
  readBranch = readGitBranch,
  readRepo = readRepoIdentity,
}: {
  cwd: unknown
  projects: { name: string }[]
  entries: { path: string; frontmatter?: Record<string, unknown> }[]
  readBranch?: typeof readGitBranch
  readRepo?: typeof readRepoIdentity
}): Promise<ScopeResolution> {
  const text = String(cwd ?? '').trim()

  /**
   * 父子关系：**推断优先，手写补充**。
   *
   * 推断来自「向上找第一个已知项目的检出」——它是机器能自己算出来的事实。
   * 手写的 `parent:` 只作为兜底，用于 git 信息缺失但仍需建立关系的场景
   * （例如子模块在别处独立检出、或项目本身不是 git 仓库）。
   *
   * 顺序不能反：若手写优先，一个过期的 `parent:` 会压过真实结构，
   * 而它错的时候表现是「子模块读不到主仓」——静默的失败。
   */
  const parents: Record<string, string | null> = text === '' ? {} : projectParentsOf(entries)
  let parentDetail = ''
  if (text !== '') {
    const inferred = await inferParentProject({ cwd: text, projects, readRepo })
    parentDetail = inferred.detail
    const repo = await readRepo(text)
    const selfName = repo.repo === null
      ? null
      : projects.find(item => item.name.toLowerCase() === repo.repo!.toLowerCase())?.name ?? null
    if (inferred.parent !== null && selfName !== null && selfName !== inferred.parent) {
      parents[selfName] = inferred.parent
    }
  }

  if (text === '') {
    return {
      project: null, branch: null, branchSource: null, cwd: null,
      reasons: ['no_cwd'], detail: '没有会话工作目录', parents,
    }
  }

  /**
   * 项目识别：**git remote 优先，路径兜底**。
   *
   * remote 是仓库固有身份，不受目录命名影响——这正是不再需要 `aliases` 的原因。
   * 但 remote 会说谎的两种情况必须兜住：
   *   1. 不是 git 仓库（个人笔记目录、临时目录）
   *   2. 仓库名与项目名不一致（memory-ops 的 remote 是 `memory-ops-dsh`）
   * 所以 remote 命中失败时，仍走路径匹配。
   */
  const { resolveProject } = await import('./project.ts')
  const repo = await readRepo(text)
  const repoProject = repo.repo === null
    ? null
    : projects.find(item => item.name.toLowerCase() === repo.repo!.toLowerCase())?.name ?? null

  const resolution = repoProject !== null
    ? { project: repoProject, matchedAlias: repo.repo!, matchedBy: 'remote' as const, cwd: text, reason: '' }
    : (() => {
        const byPath = resolveProject(text, projects.map(item => ({ name: item.name, aliases: [] })))
        return { ...byPath, matchedBy: byPath.matchedBy }
      })()

  const detection = await readBranch(text)

  const reasons: string[] = []
  if (resolution.project === null) reasons.push('unknown_project')
  if (detection.branch === null) reasons.push(detection.reason || 'unknown_branch')

  const details: string[] = []
  details.push(resolution.project === null
    ? (resolution.reason || '未认出项目')
    : repoProject !== null
      ? `项目 ${resolution.project}（由 ${repo.detail}）`
      : `项目 ${resolution.project}（由路径命中 ${resolution.matchedAlias}）`)
  if (repoProject === null && repo.repo !== null) {
    details.push(`remote 是 ${repo.repo}，库里没有同名项目`)
  }
  details.push(detection.branch === null
    ? detection.detail
    : `分支 ${detection.branch}（来源 ${detection.source}）`)
  // 父项目推断结果也进诊断：它决定「能读多少主仓记忆」，说不清就没法排障
  if (parentDetail !== '') {
    const selfName = repo.repo === null
      ? null
      : projects.find(item => item.name.toLowerCase() === repo.repo!.toLowerCase())?.name ?? null
    /**
     * 「自己即主仓」的判据是「没有父项目」，不是「认得自己」。
     *
     * 早先写成 `selfName !== null` 就断言「自身即主仓」，于是
     * gslx（明明有父 sz-web）也被说成无父项目——诊断撒谎比没诊断更糟。
     */
    const isRoot = selfName !== null && (parents[selfName] ?? null) === null
    const parentLine = isRoot
      ? `父项目：${selfName} 自身即主仓，无父项目`
      : selfName !== null && parents[selfName] !== undefined
        ? `父项目：${parents[selfName]}`
        : `父项目：${parentDetail}`
    details.push(parentLine)
  }

  return {
    project: resolution.project,
    branch: detection.branch,
    branchSource: detection.source,
    cwd: text,
    reasons,
    detail: details.join('；'),
    parents,
  }
}

