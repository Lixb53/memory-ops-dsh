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
  matchedBy: 'name' | 'alias' | 'prefix' | null
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
 * 从条目里收集「项目 + 别名」。
 *
 * 只认 `work/<project>/index.md`：索引文件是项目的声明处，
 * 不该让任意一篇的子目录里写的 aliases 都能改项目归属。
 */
export function projectAliasesOf(
  entries: { path: string; frontmatter?: Record<string, unknown> }[],
): ProjectAlias[] {
  const byName = new Map<string, ProjectAlias>()
  for (const entry of entries) {
    const parts = String(entry.path ?? '').split('/')
    if (parts[0] !== 'work' || parts.length !== 3) continue
    if (parts[2]!.toLowerCase() !== 'index.md') continue
    const name = parts[1]!
    const declared = entry.frontmatter?.aliases
    const aliases = Array.isArray(declared)
      ? declared.map(item => String(item).trim()).filter(item => item !== '' && item !== name)
      : []
    byName.set(name, { name, aliases })
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
        if (segment === needle) {
          tiers.push({ by: candidate.by, score: needle.length * 10, project: item.name, alias: candidate.value })
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

  const best = tiers.sort((a, b) => b.score - a.score)[0]!
  return {
    project: best.project,
    matchedAlias: best.alias,
    matchedBy: best.by,
    cwd: text,
    knownProjects,
    reason: '',
  }
}
