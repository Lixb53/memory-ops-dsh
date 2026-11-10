/**
 * 项目解析 —— 把「会话的 cwd」翻成「记忆库里的 work/<project>」。
 *
 * ## 为什么需要这一层（真事故）
 *
 * 早先客户端把 cwd 的**末段**当作项目名：
 * `/Users/zeze/Desktop/work/zhongxing/V2.1.25-dev/submodule/sz-web-dzh-gslx`
 * → `sz-web-dzh-gslx`。
 * 而记忆库里的项目是 `work/sz-web`。两者永远对不上，`snapshot` 严格按
 * `entry.project === 'sz-web-dzh-gslx'` 过滤 → 0 条 → 界面渲染成
 * 「当前项目还没有相关记忆」。数据一条没少，却被说成了「没有」。
 *
 * 这个「失败看起来像成功」的形态在 v3 就踩过一次（记忆面板假空态），
 * 那次修的是「拿不到 cwd」，这次是「拿到了却猜错了名字」。
 * 所以判定必须**可解释**：解析成功要能说出凭什么，失败要能说出试过什么。
 *
 * ## 判定顺序
 *
 * 1. `exact`  —— cwd 的某一段**等于**项目名或别名（最可信）
 * 2. `prefix` —— 某一段以「别名 + 分隔符」开头（`sz-web-dzh-gslx` 以 `sz-web-` 开头）
 * 同分时**长别名优先**：`gslx` 与 `sz-web` 都能匹配时，更具体的那个赢。
 *
 * 别名来源分两种：`work/<project>/index.md` 的 frontmatter `aliases`（人可手改），
 * 以及项目名本身。分支目录（`V2.1.25-dev`）这类「名字里根本不带项目名」的情况，
 * 只能靠别名显式登记——猜不出来，也不该猜。
 */

/** 一个可解析的项目及其别名。 */
export interface ProjectAlias {
  /** 记忆库里的项目名（`work/<name>`）。 */
  name: string
  /** 额外别名：分支目录名、子仓库名等。 */
  aliases: string[]
}

/** 解析结果。`matchedBy` 与 `cwd` 一起构成「凭什么说这是那个项目」。 */
export interface ProjectResolution {
  project: string | null
  /** 实际命中的那一段 cwd（诊断用，也让界面能说清「由谁推断」）。 */
  matchedAlias: string | null
  /** `remote` = 由 git remote 仓库名判定（最可靠）；其余为路径匹配的层级。 */
  matchedBy: 'name' | 'alias' | 'prefix' | 'remote' | null
  /** 归一化后的 cwd，回显给界面。 */
  cwd: string | null
  /** 库里有记忆的项目全集——解析失败时用它来提示「你可能想要哪个」。 */
  knownProjects: string[]
  /** 失败原因（成功时为空字符串）。不解释的失败等于「本来就没有」。 */
  reason: string
}

/** 把 cwd 切成分量（大小写不敏感，兼容 Windows 反斜杠）。 */
export function cwdSegments(cwd: unknown): string[] {
  return String(cwd ?? '')
    .replace(/\\/g, '/')
    .toLowerCase()
    .split('/')
    .map(segment => segment.trim())
    .filter(segment => segment !== '')
}

/**
 * 从条目里收集项目。
 *
 * 只认 `work/<project>/index.md`：索引文件是项目的声明处，
 * 不该让任意一篇的子目录里改出的东西改变项目归属。
 *
 * ## `aliases` 已废弃（2026-11）
 *
 * 早先靠 `aliases` 登记「哪些目录名属于我」（分支目录、子模块目录）。
 * 后来发现它在承担两个已经独立的职责：
 *   - 分支归属 → 由目录结构和 `branches`/路径派生，不该进别名
 *   - 仓库身份 → 由 `git remote` 判定，比目录名可靠（改名也不失效）
 *
 * 于是它只剩「未建项目的子模块目录」这一个用途，而这本该用建项目目录解决。
 * 字段保留解析但**不再读取**：旧数据里的 `aliases` 会被忽略，不报错也不生效，
 * 避免删字段时让老库直接崩。
 */
export function projectAliasesOf(
  entries: { path: string; frontmatter?: Record<string, unknown> }[],
): ProjectAlias[] {
  const byName = new Map<string, ProjectAlias>()
  for (const entry of entries) {
    const parts = String(entry.path ?? '').split('/')
    if (parts[0] !== 'work' || parts.length !== 3) continue
    if (parts[2]!.toLowerCase() !== 'index.md') continue
    byName.set(parts[1]!, { name: parts[1]!, aliases: [] })
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * 由 cwd 解析项目。
 *
 * @param cwd - 会话工作目录。空值不报错，返回 `project: null` 且 `reason` 为空
 *   （「没有上下文」与「有上下文但认不出」是两件事，界面措辞不同）。
 * @param projects - `projectAliasesOf` 的结果。
 */
export function resolveProject(cwd: unknown, projects: ProjectAlias[]): ProjectResolution {
  const text = String(cwd ?? '').trim()
  const knownProjects = projects.map(item => item.name)
  if (text === '') {
    return { project: null, matchedAlias: null, matchedBy: null, cwd: null, knownProjects, reason: '' }
  }
  const segments = cwdSegments(text)
  if (segments.length === 0) {
    return { project: null, matchedAlias: null, matchedBy: null, cwd: text, knownProjects, reason: '' }
  }

  /** 三层候选：先精确，再前缀；同层长别名优先。 */
  const tiers: { by: 'name' | 'alias' | 'prefix'; score: number; project: string; alias: string }[] = []
  for (const item of projects) {
    const candidates: { value: string; by: 'name' | 'alias' }[] = [
      { value: item.name, by: 'name' },
      ...item.aliases.map(value => ({ value, by: 'alias' as const })),
    ]
    for (const candidate of candidates) {
      const needle = candidate.value.toLowerCase()
      if (needle === '') continue
      for (const segment of segments) {
        /**
         * 隐藏目录也要能匹配：`.dsh` ↔ 项目 `dsh`。
         *
         * ## 为什么必须有这一条（真场景）
         *
         * DSH 的运行时目录是 `~/.dsh`（sessions / cache / profiles 都在这下面），
         * 而它的记忆项目叫 `dsh`。带点的目录名与项目名**永远不相等**，
         * 于是在 `~/.dsh` 或 `~/.dsh/sessions` 下开会话认不出项目 → 假空态。
         *
         * 这是通用问题，不止 `.dsh`：`.config`、`.vscode`、`.memory-ops`
         * 都是同样的形态。归一化时去掉**前导点**再比，比给每个项目手写别名可靠。
         *
         * 只去前导点、不动中间的点：`v2.1.25-dev` 这类版本名里的点必须保留。
         */
        const bare = segment.startsWith('.') ? segment.slice(1) : segment
        if (segment === needle || bare === needle) {
          // 精确匹配隐藏目录给略低的分：同分时优先非隐藏目录（更具体）
          const score = needle.length * 10 - (segment === needle ? 0 : 0.5)
          tiers.push({ by: candidate.by, score, project: item.name, alias: candidate.value })
          continue
        }
        // 前缀只认「别名 + 分隔符」，避免 `sz` 误吃 `sz-web-everything`
        const rest = segment.slice(needle.length, needle.length + 1)
        if (segment.startsWith(needle) && (rest === '-' || rest === '_' || rest === '.')) {
          tiers.push({ by: 'prefix', score: needle.length * 10 - 1, project: item.name, alias: candidate.value })
        }
      }
    }
  }

  if (tiers.length === 0) {
    return {
      project: null,
      matchedAlias: null,
      matchedBy: null,
      cwd: text,
      knownProjects,
      reason: knownProjects.length === 0
        ? '库里还没有任何项目（work/ 下没有 index.md）'
        : `cwd 里没有出现任何已知项目名或别名（已知：${knownProjects.join(' / ')}）`,
    }
  }

  /**
   * 排序：**项目名精确命中 > 别名精确命中 > 前缀命中**，同层长别名优先。
   *
   * ## 为什么「项目名」必须整层压过「别名」（真缺陷）
   *
   * 主仓 `sz-web` 的别名表里登记了子模块名 `sz-web-dzh-gslx`（历史遗留）。
   * 于是子模块自己的 cwd 会出现两个同分候选：
   *   - 别名 `sz-web-dzh-gslx` → 主仓 sz-web
   *   - 项目名 `sz-web-dzh-gslx` → 子模块自己
   * 原来同分时依赖数组顺序，子模块被解析成主仓 —— 正好违反「子模块记忆独立」。
   *
   * 现在按 `by` 分层比较：**更具体的归属优先**。子模块名是它自己的项目名，
   * 就该归它自己；主仓哪怕把子模块名写进别名表，也赢不了精确项目名。
   * 这也让「主仓别名表写错」不再是致命错误——它最多影响前缀命中。
   */
  const tierRank: Record<'name' | 'alias' | 'prefix', number> = { name: 3, alias: 2, prefix: 1 }
  const best = tiers.sort((a, b) =>
    tierRank[b.by] - tierRank[a.by] || b.score - a.score || b.alias.length - a.alias.length,
  )[0]!
  return {
    project: best.project,
    matchedAlias: best.alias,
    matchedBy: best.by,
    cwd: text,
    knownProjects,
    reason: '',
  }
}
