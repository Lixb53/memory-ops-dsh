#!/usr/bin/env node
/**
 * 存量迁移：一维 `project` → 二维 `project × branch`。
 *
 * ## 为什么先生成报告而不是直接搬
 *
 * 「这条记忆属于 gslx 还是属于主仓」是**业务判断**，不是字符串匹配能决定的：
 * 《子模块处理方案与正规维护流程》讲的是主仓机制，但里面大量提到 gslx；
 * 而《临夏定制·禁毒专题》铁定是 gslx 的。纯按文件名关键词判定必然出两类错：
 * 把主仓机制文档误判成定制记忆（导致主仓记忆丢失），
 * 或把定制细节留在主仓（规则④继续失效）。
 *
 * 所以：脚本只产出**建议 + 依据 + 置信度**，人逐条确认后才落盘。
 * 这与产品既有的「推断必须先问、确认才落档」是同一条原则。
 *
 * 用法：
 *   node --experimental-strip-types packages/core/scripts/scope-migrate.ts
 *   node --experimental-strip-types packages/core/scripts/scope-migrate.ts --json
 */

import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'

import { defaultRoot } from '../src/store.ts'
import { parseFrontmatter, splitFrontmatter } from '../src/parse.ts'

/** 已登记的子模块（来自 .gitmodules 与真实检出面）。 */
const SUBMODULES = [
  'sz-web-dzh-gsjq', 'sz-web-dzh-gslx', 'sz-web-dzh-gslz', 'sz-web-dzh-wlmq',
  'sz-web-dzh-sxdt', 'sz-web-dzh-jlst', 'sz-web-dzh-sxxy', 'sz-web-dzh-gsjyg',
  'sz-web-dzh-gsby', 'sz-web-dzh-gsln', 'sz-web-dzh-gsqy',
]

/** 子模块的短名（gslx / gslz），用于正文与文件名里的线索匹配。 */
const SHORT_OF = new Map(SUBMODULES.map(full => [full.replace('sz-web-dzh-', ''), full]))

/** 一条归属建议。 */
interface Suggestion {
  from: string
  to: string
  project: string
  branch: string | null
  /** 条目标题（报告里要能认出是哪条，不能只靠长文件名）。 */
  title: string
  /** 判定依据，必须能让人复核。 */
  evidence: string[]
  /** high = 名字里直接带子模块标识；medium = 正文强线索；low = 只能靠主题猜。 */
  confidence: 'high' | 'medium' | 'low'
  /** 需要人特别留意的疑点。 */
  caveats: string[]
}

/** 读出所有工作域条目。 */
async function collectEntries(root: string) {
  const workDir = path.join(root, 'work')
  if (!fs.existsSync(workDir)) return []
  const result: { relPath: string; body: string; frontmatter: Record<string, unknown>; title: string }[] = []
  const walk = async (dir: string) => {
    for (const item of await fsp.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, item.name)
      if (item.isDirectory()) {
        await walk(full)
        continue
      }
      if (!item.name.endsWith('.md')) continue
      const source = await fsp.readFile(full, 'utf8')
      const { frontmatter, body } = splitFrontmatter(source)
      const meta = parseFrontmatter(frontmatter)
      result.push({
        relPath: path.relative(root, full).replace(/\\/g, '/'),
        body,
        frontmatter: meta,
        title: typeof meta.title === 'string' ? meta.title : path.basename(item.name, '.md'),
      })
    }
  }
  await walk(workDir)
  return result
}

/**
 * 给一条记忆提归属建议。
 *
 * 判定顺序刻意是「文件名 → frontmatter → 正文密度」：
 * 文件名是人写下时就已经分好类的信号，比正文里顺带提到的名字可信得多。
 */
function suggestFor(entry: {
  relPath: string; body: string; frontmatter: Record<string, unknown>; title: string
}): Suggestion {
  const pathText = entry.relPath.toLowerCase()
  const titleText = entry.title.toLowerCase()
  const evidence: string[] = []
  const caveats: string[] = []

  /**
   * 项目索引文件（`work/<project>/index.md`）是**作用域的声明处**，不是内容。
   *
   * 它的归属由它所在目录唯一决定，不该参与内容归类。
   * 否则会自噬：脚本生成的 `sz-web-dzh-gslx/index.md` 标题形如
   * `sz-web-dzh-gslx 索引`，以 `sz-web-` 开头 → 被「主仓文档」规则判给主仓
   * → 计划把它搬走 → 刚建的项目骨架当场被拆掉。
   */
  const isProjectIndex = /^work\/[^/]+\/index\.md$/i.test(entry.relPath)
  if (isProjectIndex) {
    const name = entry.relPath.split('/')[1]!
    return {
      from: entry.relPath,
      to: entry.relPath,
      project: name,
      branch: null,
      title: entry.title,
      evidence: ['项目索引文件，归属由所在目录决定'],
      confidence: 'high',
      caveats: [],
    }
  }

  let project = 'sz-web'
  let confidence: 'high' | 'medium' | 'low' = 'low'

  /**
   * 0) **路径已经在子模块项目下** → 先记下，但不立即锁定。
   *
   * 这是迁移后重跑的必需判定（演练时发现的真问题）：文件搬到
   * `work/sz-web-dzh-gslx/临夏定制-…` 后，路径里不再有 `gslx` 前缀，
   * 于是第 1 步判不出来、标题也不含 `gslx`，最后按「主仓通用」处理
   * → 算出 `to = work/sz-web/临夏定制-…`，**把文件搬回主仓**。
   *
   * 但位置**不能无条件压过内容**：若文件被错误地放进了子模块目录，
   * 无条件信位置就等于把错误固化下来、且永远查不出来。
   * 所以：位置只作为 `strong` 级证据，遇到「标题明确声明归属主体」时让位。
   */
  const byPath = /^work\/(sz-web-dzh-[a-z]+)\//.exec(entry.relPath)
  const locatedIn = byPath === null ? undefined : SUBMODULES.find(name => name === byPath[1])
  if (locatedIn !== undefined) {
    project = locatedIn
    confidence = 'high'
    evidence.push(`已位于 \`${locatedIn}\` 项目目录下`)
  }

  /**
   * 0.5) 标题声明归属主体 ≠ 实际所在位置 → **以标题为准并告警**。
   *
   * 真案例：`sz-web 子模块处理方案与正规维护流程（含 gslx 补映射）`
   * 曾被判给 gslx 并搬了过去。重跑时位置判定会说「已在 gslx 下，别动」，
   * 于是错误被永久固化。现在这种矛盾会被显式指出来。
   */
  if (locatedIn !== undefined && /^sz-web[-·—\s]/.test(titleText)) {
    project = 'sz-web'
    evidence.push(`位置在 \`${locatedIn}\` 下，但标题声明归属主仓，按标题纠正`)
    caveats.push(`当前位于 ${locatedIn} 下，需要搬回主仓`)
  }

  /** 1) 路径里直接带子模块短名（`issues/gslz-…` 或 `gslx/…`）——最强信号。 */
  if (confidence !== 'high') {
    for (const [short, full] of SHORT_OF) {
      if (pathText.includes(`/${short}-`) || pathText.startsWith(`work/sz-web/${short}/`)) {
        project = full
        confidence = 'high'
        evidence.push(`路径含子模块标识 \`${short}\``)
        break
      }
    }
  }

  /**
   * 2) **标题以主仓名开头** → 主仓通用文档。这一步必须排在「标题含子模块短名」之前。
   *
   * ## 为什么顺序反了会判错（真误判，已发生）
   *
   * `sz-web 子模块处理方案与正规维护流程（含 gslx 补映射）`
   * 标题里含 `gslx`，若先跑「标题含短名」就会判给 gslx。
   * 但它讲的是**所有子模块的正规维护流程**，gslx 只是括号里的补映射案例。
   * 判给 gslx 的后果：主仓丢掉维护手册，而 gslz/gsjq 等模块永远读不到它。
   *
   * 命名惯例在本库很稳定：主仓文档一律 `sz-web-xxx`，
   * 子模块文档用业务名（`临夏定制 · 禁毒专题`）或以短名开头（`gslx 事件布控…`）。
   * 所以「以主仓名开头」是更强的信号——它声明了**文档的归属主体**，
   * 而标题里顺带提到的短名只说明**涉及哪个案例**。
   */
  if (/^sz-web[-·—\s]/.test(titleText)) {
    project = 'sz-web'
    confidence = 'high'
    evidence.push('标题以主仓名 `sz-web-` 开头（说明归属主体是主仓）')
    if (SHORT_OF.size > 0 && [...SHORT_OF.keys()].some(short => titleText.includes(short))) {
      caveats.push('标题同时提到子模块，但归属主体是主仓（子模块仅为案例）')
    }
  }

  /** 2.4) 标题里带子模块短名（且不是以主仓名开头，见上）。 */
  if (confidence !== 'high') {
    for (const [short, full] of SHORT_OF) {
      if (titleText.includes(short)) {
        project = full
        confidence = 'high'
        evidence.push(`标题含子模块标识 \`${short}\``)
        break
      }
    }
  }

  /**
   * 2.6) 正文里的**明确路径引用** → 归属那个子模块。
   *
   * 判据：出现完整仓库名 `sz-web-dzh-xxx` 且其后紧跟代码路径（反引号或无），
   * 形如 `sz-web-dzh-gslz \`packages/modules/src/data-screen\``。
   * 这比「标题惯例」更强：标题可能沿用主仓命名，而正文这句是在**定位代码**。
   *
   * 真实案例：`issues/因事因案save返回true…` 标题不带任何子模块标识，
   * 但正文首段就写明 `gslz 大屏（sz-web-dzh-gslz packages/modules/src/data-screen）`。
   * 标题惯例会把它判给主仓 → 主仓与所有子模块都会读到 gslz 的专属修复细节。
   */
  if (confidence !== 'high') {
    const explicit = new RegExp(`(${SUBMODULES.join('|')})\\s+[\`\\/]`, 'i').exec(entry.body)
      ?? new RegExp(`(${SUBMODULES.join('|')})\\s*\`packages`, 'i').exec(entry.body)
    if (explicit !== null) {
      const full = SUBMODULES.find(name => name.toLowerCase() === explicit[1]!.toLowerCase())
      if (full !== undefined) {
        project = full
        confidence = 'high'
        evidence.push(`正文明确引用 \`${full}\` 下的代码路径`)
      }
    }
  }

  /**
   * 3) 正文里的提及密度。
   *
   * ⚠ 这一条**单独不足以判定归属**，只能作辅助线索。
   * 真实反例（已发生）：`overview/sz-web-项目梳理文档` 与
   * `maps/sz-web-模块地图快照` 里 `wlmq` 各出现 10–18 次，
   * 但那是「列举全部子模块」的通用文档，判给 wlmq 会让主仓丢掉架构文档。
   *
   * 判据：只有在**单一子模块占绝对多数**时才算线索；同时提及多个则视为罗列。
   */
  if (confidence !== 'high') {
    const counts = new Map<string, number>()
    for (const [short, full] of SHORT_OF) {
      const hits = (entry.body.match(new RegExp(short, 'gi')) ?? []).length
      if (hits > 0) counts.set(full, hits)
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1])
    if (ranked.length > 0) {
      const [full, hits] = ranked[0]!
      const others = ranked.slice(1).reduce((sum, [, n]) => sum + n, 0)
      const dominant = hits >= 5 && others === 0
      if (dominant) {
        project = full
        confidence = 'medium'
        evidence.push(`正文集中提及 \`${full.replace('sz-web-dzh-', '')}\` ${hits} 次，且无其他子模块`)
      } else if (ranked.length > 1) {
        evidence.push(`正文同时提及 ${ranked.length} 个子模块，视为罗列而非归属依据`)
        caveats.push('疑似通用文档（罗列全部子模块），按主仓处理')
      } else {
        evidence.push(`正文仅提及 ${hits} 次，不足以判定归属`)
        caveats.push('正文有提及但频次低，可能是举例而非本模块记忆')
      }
    }
  }

  /**
   * 4) 主仓机制类文档的名词特征。
   *
   * 《子模块日常维护手册》《git fix-submodule》讲的是**怎么维护所有子模块**，
   * 属于主仓知识，不该因为正文提到 gslx 就被判给 gslx。
   */
  if (confidence !== 'high') {
    const mechanism = /子模块|submodule|codegraph|大仓|主仓|维护手册|修复脚本/.test(titleText)
    if (mechanism) {
      project = 'sz-web'
      confidence = confidence === 'low' ? 'medium' : confidence
      evidence.push('标题属于主仓机制类（子模块维护/大仓规则）')
      if (confidence === 'medium' && evidence.some(text => text.includes('提及'))) {
        caveats.push('这是主仓机制文档，正文提到的子模块仅为案例')
      }
    }
  }

  if (evidence.length === 0) {
    evidence.push('未出现任何子模块标识，按主仓通用记忆处理')
    confidence = 'medium'
  }

  /** 5) 分支：只认能干净解析的单值。 */
  const declared = typeof entry.frontmatter.branch === 'string' ? entry.frontmatter.branch.trim() : ''
  let branch: string | null = null
  if (declared !== '') {
    if (/[\/,、]/.test(declared)) {
      caveats.push(`原 branch 字段是复合值 \`${declared}\`，无法归属单一分支，迁移后需人工指定`)
    } else {
      branch = declared
      evidence.push(`frontmatter 已声明 branch: ${declared}`)
    }
  }

  /**
   * 目标路径。
   *
   * 两处需要整理，否则会搬出 `work/sz-web-dzh-gslx/gslx/…` 这种冗余嵌套：
   *   1. 原来的**子模块专属目录**（`gslx/`）在换到子模块项目后变成同义反复，
   *      该目录下的内容提到项目根，按主题归类（`issues/` 等）。
   *   2. 文件名前缀 `gslx-` 在子模块自己的库里也是同义反复，但**暂不改名**：
   *      改名会让既有链接与引用计数失配，优先级低于作用域隔离。
   */
  const parts = entry.relPath.split('/')
  let tail = parts.slice(2).join('/')
  const shortName = project.replace('sz-web-dzh-', '')
  if (project !== 'sz-web' && tail.startsWith(`${shortName}/`)) {
    tail = tail.slice(shortName.length + 1)
    // 该目录原本就是「这个子模块的东西」，落到项目根
    evidence.push(`原 \`${shortName}/\` 目录在子模块项目内属同义嵌套，已摊平`)
  }
  const to = `work/${project}/${tail}`
  /**
   * 已经在对的位置就标记为原地。
   *
   * 这是幂等的第二道保险：即便有人绕过 journal 护栏重复运行，
   * 已迁移的条目也不该再被算出「新的 to」——否则文件会被搬来搬去，
   * 而计划表上看起来一切正常。
   */
  const alreadyPlaced = entry.relPath === to
  if (alreadyPlaced) evidence.push('已在目标位置，无需搬动')

  return { from: entry.relPath, to, project, branch, title: entry.title, evidence, confidence, caveats }
}

/** 一条搬动记录，写进回滚清单。 */
interface MoveRecord {
  from: string
  to: string
  /** 搬动前该文件的 id（用于校验引用链未断）。 */
  id: string
}

/** 回滚清单路径。 */
const JOURNAL = '.state/scope-migration.journal.json'

/**
 * 执行迁移。
 *
 * 五件事，顺序不能错：
 *   1. **预检**：目标文件已存在就整体中止（绝不覆盖，覆盖等于丢记忆）
 *   2. **备份**：整棵 work/ 复制到 archive/，再写 journal
 *   3. **建项目骨架**：为每个新项目建 `index.md` 并声明 `parent:`
 *      —— 没有它，`projectParentsOf` 认不出父子，子模块就读不到主仓（规则④反向失效）
 *   4. **搬文件**：`rename`，同分区内是原子操作
 *   5. **校验**：id 未变、无目标冲突、新项目可被解析
 */
async function runApply(root: string, suggestions: Suggestion[]) {
  const moved = suggestions.filter(item => item.from !== item.to)
  const projects = [...new Set(moved.map(item => item.project))]
  console.log(`# 执行迁移\n`)
  console.log(`搬动 ${moved.length} 条，涉及 ${projects.length} 个新项目：${projects.join('、')}\n`)

  /** 1) 预检 */
  const conflicts: string[] = []
  for (const item of moved) {
    if (fs.existsSync(path.join(root, item.to))) conflicts.push(item.to)
  }
  if (conflicts.length > 0) {
    console.error(`❌ 目标已存在 ${conflicts.length} 个文件，整体中止（不覆盖）：`)
    for (const item of conflicts.slice(0, 10)) console.error(`   ${item}`)
    if (conflicts.length > 10) console.error(`   …另有 ${conflicts.length - 10} 个`)
    console.error(`\n如果这些文件**已经迁移过**，说明本次是重复执行，直接退出即是正确状态。`)
    console.error(`若确认要重来：先 --rollback，再 --apply。`)
    process.exit(1)
  }

  /**
   * 幂等护栏：已有回滚清单说明迁移执行过。
   *
   * ## 为什么必须有这一条（演练时真踩到）
   *
   * 第一次 `--apply` 正常搬走 22 条。紧接着再跑一次时，扫描到的
   * `from` 已经是**迁移后的新路径**，`to` 又按规则算出了另一组路径，
   * 于是把 gslx 的记忆**搬回了主仓**——一次误操作就把隔离结构毁了，
   * 而且全过程每行都打印「✓」。
   *
   * 破坏性脚本不能靠人记得「只跑一次」。有清单在，就说明跑过了。
   */
  if (fs.existsSync(path.join(root, JOURNAL))) {
    console.error(`❌ 检测到已有迁移记录：${JOURNAL}`)
    console.error(`   迁移已经执行过，重复执行会打乱结构。`)
    console.error(`   要重来：先 --rollback，再 --apply。`)
    process.exit(1)
  }
  console.log(`✓ 预检通过：无目标冲突，无历史迁移记录`)

  /** 2) 备份 + journal */
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(root, 'archive', `scope-migration-${stamp}`)
  await fsp.mkdir(backupDir, { recursive: true })
  await fsp.cp(path.join(root, 'work'), path.join(backupDir, 'work'), { recursive: true })
  console.log(`✓ 已备份 work/ → ${path.relative(root, backupDir)}/work`)

  /** id 必须在搬动前后一致，否则事件流里的引用全部失效（引用次数归零） */
  const journal: { at: string; backup: string; moves: MoveRecord[] } = {
    at: new Date().toISOString(),
    backup: path.relative(root, backupDir),
    moves: [],
  }

  /** 3) 建项目骨架 */
  const parents = new Map<string, string>()
  for (const item of moved) {
    if (item.project === 'sz-web') continue
    parents.set(item.project, 'sz-web')
  }
  for (const [name, parent] of parents) {
    const indexPath = path.join(root, 'work', name, 'index.md')
    if (fs.existsSync(indexPath)) {
      console.log(`· ${name}/index.md 已存在，跳过骨架创建`)
      continue
    }
    await fsp.mkdir(path.dirname(indexPath), { recursive: true })
    await fsp.writeFile(indexPath, projectIndexTemplate(name, parent), 'utf8')
    console.log(`✓ 新建 ${name}/index.md（parent: ${parent}）`)
  }

  /**
   * 主仓 index.md 需要去掉被抢走的子模块别名。
   * 否则 `sz-web-dzh-gslx` 既是子模块的项目名、又是主仓的别名，
   * 虽然已用「项目名优先」兜住，但留着会让诊断信息自相矛盾。
   */
  const mainIndex = path.join(root, 'work', 'sz-web', 'index.md')
  if (fs.existsSync(mainIndex)) {
    const before = await fsp.readFile(mainIndex, 'utf8')
    const cleaned = stripSubmoduleAliases(before, [...parents.keys()])
    if (cleaned !== before) {
      await fsp.writeFile(mainIndex, cleaned, 'utf8')
      console.log(`✓ 主仓 index.md 移除子模块别名（它们已有自己的项目）`)
    }
  }

  /** 4) 搬文件 */
  for (const item of moved) {
    const source = path.join(root, item.from)
    const target = path.join(root, item.to)
    const before = await fsp.readFile(source, 'utf8')
    const idBefore = readId(before)
    await fsp.mkdir(path.dirname(target), { recursive: true })
    await fsp.rename(source, target)
    journal.moves.push({ from: item.from, to: item.to, id: idBefore })
    console.log(`✓ ${item.from}\n  → ${item.to}`)
  }

  await fsp.mkdir(path.join(root, '.state'), { recursive: true })
  await fsp.writeFile(path.join(root, JOURNAL), JSON.stringify(journal, null, 2), 'utf8')
  console.log(`✓ 回滚清单：${JOURNAL}`)

  /** 5) 校验 */
  const problems: string[] = []
  for (const move of journal.moves) {
    const absolute = path.join(root, move.to)
    if (!fs.existsSync(absolute)) {
      problems.push(`搬动后文件不存在：${move.to}`)
      continue
    }
    const after = await fsp.readFile(absolute, 'utf8')
    const idAfter = readId(after)
    if (idAfter !== move.id) {
      problems.push(`id 变化：${move.to}（${move.id} → ${idAfter}）`)
    }
  }
  // 尾部空目录清理（只清空的，非空的保留）
  await removeEmptyDirs(path.join(root, 'work', 'sz-web'))

  if (problems.length > 0) {
    console.error(`\n❌ 校验发现 ${problems.length} 个问题：`)
    for (const item of problems) console.error(`   ${item}`)
    console.error(`\n可用回滚：node --experimental-strip-types ${import.meta.filename} --rollback`)
    process.exit(1)
  }
  console.log(`\n✅ 迁移完成：${journal.moves.length} 条，id 全部未变`)
  console.log(`   回滚：node --experimental-strip-types ${import.meta.filename} --rollback`)
}

/** 读 frontmatter 里声明的 id（没有则返回空串）。 */
function readId(source: string): string {
  const { frontmatter } = splitFrontmatter(source)
  const meta = parseFrontmatter(frontmatter)
  return typeof meta.id === 'string' ? meta.id.trim() : ''
}

/** 新项目的 index.md 骨架。 */
function projectIndexTemplate(name: string, parent: string): string {
  const date = new Date().toISOString().slice(0, 10)
  return `---
id: work.${name}.index
title: ${name} 索引
scope: work
kind: fact
layer: l0
status: confirmed
pinned: true
updated: ${date}
tags: [索引, ${name}]
# 父项目：子模块可以读主仓记忆，主仓读不到子模块（见 core/src/scope.ts）。
parent: ${parent}
---

# ${name} 索引

| 想知道 | 目录 |
| --- | --- |
| 踩过的坑与问题台账 | issues/ |
| 定制模块与业务说明 | 见下方文件清单 |

> 本目录由作用域迁移脚本生成。归属判定依据见 \`docs/scope-migration-report.md\`。
`
}

/**
 * 从主仓 index.md 移除已被独立成项目的子模块别名。
 *
 * 只动 `aliases:` 那一行，其余原样保留——手写的注释与格式不能碰，
 * 那是「人可审」的载体。
 */
function stripSubmoduleAliases(source: string, submodules: string[]): string {
  return source.replace(/^aliases:\s*\[(.*?)\]\s*$/m, (whole, inner: string) => {
    const kept = inner
      .split(',')
      .map(item => item.trim())
      .filter(item => item !== '' && !submodules.includes(item))
    return kept.length === 0 ? whole : `aliases: [${kept.join(', ')}]`
  })
}

/** 自底向上删空目录（非空的保留）。 */
async function removeEmptyDirs(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) return
  for (const item of await fsp.readdir(dir, { withFileTypes: true })) {
    if (!item.isDirectory()) continue
    const full = path.join(dir, item.name)
    await removeEmptyDirs(full)
    const rest = await fsp.readdir(full)
    if (rest.length === 0) await fsp.rmdir(full)
  }
}

/**
 * 回滚：按 journal 把文件搬回去。
 *
 * 刻意**不删**新建的 index.md —— 它可能已经被人编辑过（写了项目说明），
 * 删掉等于毁掉内容。只把搬走的文件搬回原处，并提示手工处理骨架。
 */
async function runRollback(root: string) {
  const journalPath = path.join(root, JOURNAL)
  if (!fs.existsSync(journalPath)) {
    console.error(`没有找到回滚清单：${journalPath}`)
    process.exit(1)
  }
  const journal = JSON.parse(await fsp.readFile(journalPath, 'utf8')) as {
    at: string; backup: string; moves: MoveRecord[]
  }
  console.log(`# 回滚（迁移于 ${journal.at}）\n`)

  let restored = 0
  const problems: string[] = []
  for (const move of journal.moves.toReversed()) {
    const current = path.join(root, move.to)
    const original = path.join(root, move.from)
    if (!fs.existsSync(current)) {
      problems.push(`已不在目标位置：${move.to}`)
      continue
    }
    if (fs.existsSync(original)) {
      problems.push(`原位置已有文件，跳过：${move.from}`)
      continue
    }
    await fsp.mkdir(path.dirname(original), { recursive: true })
    await fsp.rename(current, original)
    restored += 1
    console.log(`✓ ${move.to}\n  → ${move.from}`)
  }

  if (problems.length > 0) {
    console.error(`\n⚠ ${problems.length} 条未回滚：`)
    for (const item of problems) console.error(`   ${item}`)
  }
  console.log(`\n✅ 已回滚 ${restored}/${journal.moves.length} 条`)
  console.log(`   备份仍在：${journal.backup}（可整目录恢复）`)
  console.log(`   注意：新建的 …/index.md 骨架未删除（可能已有手写内容，请人工确认）`)
}

/** 主流程。 */
async function main() {
  const asJson = process.argv.includes('--json')
  const apply = process.argv.includes('--apply')
  const rollback = process.argv.includes('--rollback')
  const root = defaultRoot()

  if (rollback) {
    await runRollback(root)
    return
  }

  const entries = await collectEntries(root)
  if (entries.length === 0) {
    console.error(`没有找到任何工作域条目：${root}/work`)
    process.exit(1)
  }

  const suggestions = entries.map(suggestFor).sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 }
    return rank[a.confidence] - rank[b.confidence] || a.from.localeCompare(b.from)
  })

  // apply 是破坏性操作，必须先看清要动什么；--json 与 --apply 互斥
  if (apply) {
    await runApply(root, suggestions)
    return
  }

  if (asJson) {
    console.log(JSON.stringify({ root, suggestions }, null, 2))
    return
  }

  const moved = suggestions.filter(item => item.from !== item.to)
  const byProject = new Map<string, number>()
  for (const item of suggestions) byProject.set(item.project, (byProject.get(item.project) ?? 0) + 1)

  console.log(`# 作用域迁移报告（dry-run，未改动任何文件）\n`)
  console.log(`根目录：${root}`)
  console.log(`条目总数：${entries.length}`)
  console.log(`需要搬动：${moved.length}　原地不动：${entries.length - moved.length}\n`)

  console.log(`## 归属分布\n`)
  console.log('| 项目 | 条目数 |')
  console.log('|---|---|')
  for (const [project, count] of [...byProject.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`| ${project} | ${count} |`)
  }

  console.log(`\n## 逐条建议\n`)
  for (const item of suggestions) {
    const mark = item.confidence === 'high' ? '●' : item.confidence === 'medium' ? '◐' : '○'
    const action = item.from === item.to ? '原地' : '搬动'
    console.log(`${mark} [${item.confidence}] ${action}`)
    console.log(`  ${item.from}`)
    if (item.from !== item.to) console.log(`  → ${item.to}`)
    console.log(`  依据：${item.evidence.join('；')}`)
    if (item.branch !== null) console.log(`  分支：${item.branch}`)
    for (const caveat of item.caveats) console.log(`  ⚠ ${caveat}`)
    console.log('')
  }

  const risky = suggestions.filter(item => item.confidence !== 'high')
  console.log(`## 需要你重点确认（${risky.length} 条）\n`)
  console.log('这些条目的归属靠正文推断或按主仓通用处理，判错的代价是：')
  console.log('- 判给子模块 → 主仓读不到（通用知识丢失）')
  console.log('- 判给主仓 → 所有子模块都能读到别人的定制细节（规则④失效）\n')
  for (const item of risky) {
    console.log(`- ${item.title} → ${item.project}`)
  }

  if (moved.length === 0) {
    console.log(`\n✅ 没有需要搬动的条目——当前布局已符合作用域模型。`)
  } else {
    console.log(`\n落盘命令（逐条核对归属后执行）：`)
    console.log(`  node --experimental-strip-types packages/core/scripts/scope-migrate.ts --apply`)
    console.log(`\n--apply 会自动：备份 work/ → archive/、建子项目的 index.md 骨架（含 parent 声明）、`)
    console.log(`搬文件、校验 id 未变。失败可用 --rollback 整批还原。`)
    console.log(`注意：检测到历史 journal 时会拒绝执行，避免重复搬动打乱结构。`)
  }
}

await main()
