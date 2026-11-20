/**
 * actions/read.ts —— 读侧能力（快照 / 总览 / 检索 / 详情）
 *
 * ## 为什么单独成域
 *
 * 这四个能力共享一个特征：一次读全库，再按需要投影。
 * 它们都走 store.scan() + readEvents() + readMisses()，
 * 然后各自算出不同视图（列表 / KPI / 命中 / 单条详情）。
 *
 * 这次拆分的直接收益（见 docs/architecture-review.md）：
 * 四个能力原本在同一文件里重复 scan 调用，
 * 拆到一个文件后，才可能引入「请求作用域快照」让它们共享一次扫描。
 *
 * ## 口径不能改
 *
 * snapshot 的 queue 过滤、overview 的 residentTokens（每请求成本，不是索引层）、
 * search 的记账（record: true），全部是踩过坑才有的行为。
 * 本文件是逐行搬运，口径一字未改。
 */

import {
  CONFIDENCE_STATES, STATE_CONFIDENCE, FILE_TOKEN_SOFT_LIMIT,
  RESIDENT_TOKEN_BUDGET, needsDecision, expiryOf,
  type ConfidenceState,
} from '../schema.ts'
import { projectAliasesOf, type ProjectResolution } from '../project.ts'
import {
  isEntryVisible, projectParentsOf, resolveScope, describeScope,
  type ScopeResolution,
} from '../scope.ts'
import { searchEntries, searchCost } from '../search.ts'
import { parseSections } from '../parse.ts'
import type { MemoryEntry } from '../store.ts'
import { guard, projectEntry, type ActionContext } from './context.ts'
import { citeCountsOf, projectLineageOf, excludedSummary, navOf } from './helpers.ts'
import { SKILL_CATALOG_FRAME_TOKENS } from './constants.ts'

/** 一个常驻 skill 的 description（每请求付费的那部分）。 */
export interface ResidentSkill {
  name: string
  path: string
  description: string
  descriptionTokens: number
}

export function createReadActions({ store, now }: ActionContext) {
  /**
   * 读全量并附派生字段。
   *
   * `cwd` 是**可选**的诊断输入：给了它，返回里会带 `resolution`，
   * 说明「这个 cwd 被解析成了哪个项目、凭什么」。这不是必须的——
   * 显式传 `project` 的老调用方行为完全不变。
   */
  async function snapshot({ project, domain, cwd, branch }: {
    project?: string | null; domain?: string | null; cwd?: string | null; branch?: string | null
  } = {}) {
    return guard(async () => {
      const entries = await store.scan()
      const events = await store.readEvents()
      const misses = await store.readMisses()

      /**
       * 只给了 cwd 没给 project 时，先把 cwd 解析成**作用域**（项目 + 分支）。
       *
       * 为什么不在客户端解析：别名在 `work/<project>/index.md`、父子关系在
       * 同处 `parent:` 字段、分支要读 git —— 三样客户端都看不到。
       * 放到 core 才能保证「UI 看到的范围」与「agent 检索用的范围」是同一个判定。
       *
       * 老调用方（显式传 project）行为不变：没有 cwd 就不做作用域过滤。
       */
      let resolution: ProjectResolution | null = null
      let scope: ScopeResolution | null = null
      let effectiveProject = project
      if ((project === undefined || project === null || project === '') && typeof cwd === 'string' && cwd.trim() !== '') {
        const projects = projectAliasesOf(entries)
        /**
         * 项目识别统一走 `resolveScope`（git remote 优先），不再单独调 `resolveProject`。
         *
         * 为什么必须只留一条路：早先这里和 `sessionMemory` 各调一次
         * `resolveProject`，而 `resolveScope` 内部又有自己的判定。
         * 两套逻辑并存的后果是「同一 cwd，本项目看到 A，会话记忆看到 B」——
         * 界面上表现为两个页签数字对不上，而两边都「没报错」。
         */
        scope = await resolveScope({ cwd, projects, entries })
        effectiveProject = scope.project
        resolution = {
          project: scope.project,
          matchedAlias: null,
          matchedBy: scope.project === null ? null : 'remote',
          cwd: scope.cwd,
          knownProjects: projects.map(item => item.name),
          reason: scope.project === null ? scope.detail : '',
        }
        // 显式给了 branch 就覆盖自动识别（人比机器可信，且能救 detached HEAD）
        if (typeof branch === 'string' && branch.trim() !== '') {
          scope = { ...scope, branch: branch.trim(), branchSource: null, reasons: scope.reasons.filter(r => r !== 'unknown_branch' && r !== 'no_git' && r !== 'detached_head') }
        }
      } else if (typeof branch === 'string' && branch.trim() !== '') {
        /**
         * 只有 project + branch、没有 cwd：构造一个最小作用域。
         * 父项目仍从库里读——否则「显式指定子模块却读不到主仓记忆」，
         * 正好违反规则④。
         */
        scope = {
          project: project ?? null,
          branch: branch.trim(),
          branchSource: null,
          cwd: null,
          reasons: [],
          detail: '由调用方显式指定的项目与分支',
          parents: projectParentsOf(entries),
        }
      }

      const projectFilter = effectiveProject

      /**
       * 过滤按**可见性**而不是等值：子模块能读主仓（父链），兄弟不可见，
       * 分支按 `branchMatches` 相容。见 `scope.ts` 的模型说明。
       */
      const filtered = entries.filter((entry) => {
        if (scope !== null) {
          if (!isEntryVisible(
            { project: entry.project, branch: entry.branch },
            { project: scope.project, branch: scope.branch, parents: scope.parents },
          )) return false
        } else if (projectFilter !== undefined && projectFilter !== null && projectFilter !== '' && entry.project !== projectFilter) {
          return false
        }
        if (domain !== undefined && domain !== null && domain !== '' && entry.domain !== domain) return false
        return true
      })

      // **统计必须跟着过滤走**。
      // 早先用全量 entries 算 stats，导致「本项目」分区在该项目 0 条记忆时
      // 仍显示常驻前缀 286——一个自相矛盾的画面（0 条 + 286 tokens）。
      // 项目视图要回答的是「这个项目占多少」，不是「整个库占多少」。
      const scoped = projectFilter !== undefined && projectFilter !== null && projectFilter !== ''
        || domain !== undefined && domain !== null && domain !== ''
      const stats = store.summarize(scoped ? filtered : entries, events, misses, { nowMs: now() })
      // 引用次数给列表用：设计稿每张卡片都显示「N 次引用」
      const citeCounts = citeCountsOf(events)

      const queue = filtered
        .filter(entry => needsDecision(entry, now()) || entry.status === 'stale')
        .map((entry) => {
          const expiry = expiryOf(entry, now())
          const kind = entry.status === 'stale'
            ? 'anchor'
            : expiry.level === 'retire' ? 'retire' : 'confirm'
          return {
            id: entry.id,
            path: entry.path,
            title: entry.title,
            domain: entry.domain,
            domainLabel: entry.domainLabel,
            status: entry.status,
            confidence: entry.confidence ?? STATE_CONFIDENCE[entry.status as ConfidenceState] ?? null,
            kind,
            evidence: (entry.evidence ?? []).slice(0, 1),
            origin: entry.origin,
            days: expiry.days,
            reason: kind === 'retire'
              ? `${expiry.days} 天未被引用`
              : kind === 'anchor' ? '锚点失效，待复核' : '推断待确认',
          }
        })
        .sort((a, b) => (b.days ?? 0) - (a.days ?? 0))

      return {
        root: store.root,
        projectScoped: projectFilter !== undefined && projectFilter !== null && projectFilter !== '',
        project: projectFilter ?? null,
        domain: domain ?? null,
        /**
         * 解析诊断：`null` 表示调用方没给 cwd（不是解析失败）。
         * 给了 cwd 就必须能回答「凭什么」，否则界面只能猜。
         */
        resolution,
        /**
         * 作用域：当前会话到底看到哪些记忆，以及为什么。
         *
         * `inheritedFrom` 列出因父链而额外可见的项目（子模块读主仓），
         * `excluded` 列出被挡掉的项目及数量——**必须能说清挡住了什么**，
         * 否则「规则④生效了」与「数据丢了」在界面上长得一样。
         */
        scope: scope === null ? null : {
          project: scope.project,
          branch: scope.branch,
          branchSource: scope.branchSource,
          label: describeScope({ project: scope.project, branch: scope.branch }),
          /** 父链（含自身），按由近到远。 */
          lineage: scope.project === null ? [] : projectLineageOf(scope),
          /** 因继承而可见的祖先项目。 */
          inheritedFrom: scope.project === null ? [] : projectLineageOf(scope).slice(1),
          /** 被作用域挡掉的项目及条目数（诊断用，不参与检索）。 */
          excluded: excludedSummary(entries, scope),
          /** 失败原因码：有值说明这次判定不可靠，界面必须显式提示。 */
          reasons: scope.reasons,
          detail: scope.detail,
        },
        /** 库里有记忆的项目全集，供「你可能想要哪个」提示。 */
        knownProjects: projectAliasesOf(entries).map(item => item.name),
        entries: filtered.map(entry => projectEntry(entry, now(), citeCounts)),
        stats,
        queue,
        /**
         * 统计口径：`all` = 全库；`scoped` = 仅当前 project/domain。
         * UI 据此说明「这个数字覆盖了什么」，避免与总览的全库数字混淆。
         */
        statsScope: scoped ? 'scoped' : 'all',
        /** 当前项目自己的常驻索引（layer: l0）文件，供「本项目」分区展示。 */
        projectIndex: filtered
          .filter(entry => entry.layer === 'l0')
          .map(entry => ({ path: entry.path, title: entry.title, tokens: entry.tokens })),
        /**
         * 导航：**从真实条目聚合，不读手写表格**。
         *
         * ## 为什么删掉 index.md 里的导航表
         *
         * 手写的目录表必然过时：`sz-web/index.md` 曾列着 `gslx/`、`dsh/`，
         * 而实际结构早已变成 `V2.1.25-dev/`、`_shared/`——每个字都是错的。
         * 过时的导航比没有导航更糟，因为它会被当成事实读。
         *
         * 这里直接从 `filtered` 条目聚合出「哪个目录有多少条」，
         * 结构与磁盘天然一致，零维护。
         */
        nav: navOf(filtered),
        generatedAt: new Date(now()).toISOString(),
      }
    })
  }

  /**
   * 常驻前缀逐项拆解 —— 回答「这 N 个 tokens 到底是什么」。
   *
   * 拆成四类，因为它们**付费方式完全不同**，混在一起就会得出错误结论：
   *   1. `catalog`：skill description，**每个请求都付费**
   *   2. `frame`：`<available_skills>` 目录框架，每请求付费（固定）
   *   3. `injected`：`pinned: true` 的记忆条目，每请求付费（可关）
   *   4. `index`：`layer: l0` 的索引文件，只在被 read 时才进上下文
   *
   * 为什么必须拆开：product.md 把「两个 skill description」与「L0 索引文件」
   * 都记作「常驻前缀 286 tokens」，但实测前者是 190 + 171 框架 = 361，
   * 后者是 286。两个数字对不上，说明口径本身有歧义——而这个歧义会直接
   * 导致「该优化哪个」判断错。
   *
   * `injected` 是第四类，同理不能并进别的桶：它是**唯一一个由用户直接控制
   * 大小的每请求成本**（置顶几条就付几条）。并进 catalog 会让「关掉某个
   * 置顶条目能省多少」这个问题无法回答。
   */
  function residentBreakdown(
    entries: MemoryEntry[],
    skills: ResidentSkill[],
    pinnedTokens = 0,
  ) {
    const indexItems = entries
      .filter(entry => entry.layer === 'l0')
      .map(entry => ({
        kind: 'index' as const,
        id: entry.id,
        path: entry.path,
        title: entry.title,
        tokens: entry.tokens,
        bytes: entry.bytes,
        lines: entry.lines,
        overLineLimit: entry.overLineLimit,
        // 索引是否真的进上下文，取决于它有没有被 skill 目录引用
        billed: false,
        note: '仅在被 read 时进上下文',
      }))

    const catalogItems = skills.map(skill => ({
      kind: 'catalog' as const,
      id: `skill.${skill.name}`,
      path: skill.path,
      title: skill.name,
      tokens: skill.descriptionTokens,
      bytes: skill.description.length,
      lines: 1,
      overLineLimit: false,
      billed: true,
      note: 'skill description，每请求付费',
    }))

    const indexTokens = indexItems.reduce((sum, item) => sum + item.tokens, 0)
    const catalogTokens = catalogItems.reduce((sum, item) => sum + item.tokens, 0)

    /** 置顶注入段：有就占一行，没有就不占——不制造一个恒为 0 的假条目。 */
    const injectedItems = pinnedTokens > 0
      ? [{
          kind: 'injected' as const,
          id: 'injected.pinned',
          path: '',
          title: '置顶条目注入',
          tokens: pinnedTokens,
          bytes: 0,
          lines: 0,
          overLineLimit: false,
          billed: true,
          note: 'pinned: true 的条目，每请求付费；置顶几条就付几条',
        }]
      : []

    return {
      items: [...catalogItems, ...injectedItems, ...indexItems],
      catalogTokens,
      indexTokens,
      /**
       * 置顶注入的 token 数单列一格。
       *
       * 不给这个数，「常驻前缀涨了 80」就无法归因：是装了新 skill，
       * 还是自己多置顶了一条原则？两种处置方式完全不同。
       */
      injectedTokens: pinnedTokens,
      frameTokens: SKILL_CATALOG_FRAME_TOKENS,
      /** 真正每请求付费的部分：catalog + 框架 + 置顶注入。 */
      billedTokens: catalogTokens + SKILL_CATALOG_FRAME_TOKENS + pinnedTokens,
      /** 标了 l0 但按需加载的部分。 */
      onDemandTokens: indexTokens,
    }
  }

  /** 总览：KPI + 预算账本 + 三率 + 域统计。 */
  async function overview({ skillDescriptions = [], skillsError = '', pinnedTokens = 0 }: {
    skillDescriptions?: ResidentSkill[]
    /** 为什么没读到 skill（空字符串表示没出问题）。 */
    skillsError?: string
    /** 置顶注入段占用的 token（未启用或库内无置顶条目时为 0）。 */
    pinnedTokens?: number
  } = {}) {
    return guard(async () => {
      const entries = await store.scan()
      const events = await store.readEvents()
      const misses = await store.readMisses()
      const stats = store.summarize(entries, events, misses, { nowMs: now() })
      const l0 = stats.layers.l0.tokens
      const resident = residentBreakdown(entries, skillDescriptions, pinnedTokens)
      return {
        kpi: {
          /**
           * **`residentTokens` 是每请求付费的常驻前缀，不是 L0 索引体积。**
           *
           * 这里曾经取 `l0`（所有 `layer: l0` 文件之和），于是顶栏第一格显示的
           * 是「索引层 286」，而卡片上挂的却是「361」这个基准——两个数字对不上，
           * 且按它去优化会去删索引表，一分钱每请求成本都省不下来。
           * 详见 product.md §十二：361 = catalog 190 + 框架 171；286 = 索引文件之和。
           */
          residentTokens: resident.billedTokens,
          /** 索引层体积单列一格，两个数字各自有名字，不再互相冒充。 */
          indexTokens: l0,
          residentBudget: RESIDENT_TOKEN_BUDGET,
          hitRate: stats.rates.hitRate,
          confirmRate: stats.rates.confirmRate,
          expireRate: stats.rates.expireRate,
          pending: stats.counts.pending,
        },
        resident: {
          ...resident,
          /**
           * 三态，UI 必须区分：
           *   `ok`     有 catalog，数字可信
           *   `empty`  读到了但一个都没有（可能真是没装 skill）
           *   `error`  没读到（宿主没给服务 / list 抛错），此时 171 只是框架开销
           *
           * 不区分三态的话，「读不到」会伪装成「没有」，用户会以为 171 就是全部。
           */
          state: skillsError !== '' ? 'error' : (skillDescriptions.length === 0 ? 'empty' : 'ok'),
          error: skillsError,
        },
        /**
         * 预算账本 —— 三段各自的**付费方式**才是重点，不是数字本身。
         *
         * 这里曾经把 L0 的 `tokens` 填成 `l0` 文件之和（索引层 316），
         * 而 KPI 的「常驻前缀」是 billedTokens（每请求 171）。
         * 同一屏两个 L0 数字对不上，用户没法判断该信哪个、该优化哪个。
         *
         * 现在每段都带 `billing` 与 `advice`：说清「什么时候付费」和「超了该怎么办」。
         * 数字只有在能指导决策时才有价值。
         */
        budget: [
          {
            layer: 'L0',
            name: '常驻前缀',
            tokens: resident.billedTokens,
            files: skillDescriptions.length,
            limit: RESIDENT_TOKEN_BUDGET,
            billing: 'per-request',
            note: 'skill description + 目录框架 + 置顶注入，每个请求都付费',
            advice: '超了先看注入段：取消置顶最省，改 skill description 次之',
          },
          {
            layer: 'L1',
            name: '索引层',
            tokens: stats.layers.l1.tokens,
            files: stats.layers.l1.files,
            limit: 2048,
            billing: 'on-demand',
            note: '被 read 时才进上下文，不在每请求前缀里',
            advice: '超了拆索引文件；这只影响检索定位精度，不影响每请求账单',
          },
          {
            layer: 'L2',
            name: '详情层',
            tokens: stats.layers.l2.tokens,
            files: stats.layers.l2.files,
            limit: null,
            billing: 'on-demand',
            note: '单篇命中才读，总量大不直接等于贵',
            advice: '关注单篇体积（超 80 行 / 1200 tokens），而不是总量',
          },
          {
            /** 汇总行：把「L0 索引文件之和」这个容易混淆的数字单独摆出来。 */
            layer: 'L0*',
            name: '索引文件合计',
            tokens: l0,
            files: stats.layers.l0.files,
            limit: null,
            billing: 'on-demand',
            note: '标记 layer: l0 的文件之和，与「常驻前缀」不是同一个数',
            advice: '这个数字大不代表每请求贵；删它不会省每请求成本',
          },
        ],
        /**
         * 域统计**带明细**。
         *
         * 原来只给「sz-web 35 篇 / 63,030 tokens」——用户看到了数字却不知道是哪 35 篇，
         * 这个数字就无法验证、无法下钻、也就无法据此做任何事。
         * 所以每个域都带上自己的文件清单（按 tokens 降序，最重的排前面）。
         */
        domains: stats.domains.map(domain => ({
          ...domain,
          entries: entries
            .filter(entry => entry.domain === domain.key)
            .sort((a, b) => b.tokens - a.tokens)
            .map(entry => ({
              id: entry.id,
              path: entry.path,
              title: entry.title,
              layer: entry.layer,
              status: entry.status,
              tokens: entry.tokens,
              lines: entry.lines,
              overLineLimit: entry.overLineLimit,
              citeCount: citeCountsOf(events).get(entry.id) ?? 0,
            })),
        })),
        rates: stats.rates,
        counts: stats.counts,
        misses: stats.misses,
        files: stats.files,
        bytes: stats.bytes,
        tokens: stats.tokens,
        overLimit: stats.overLimit,
        cacheNote: '改常驻前缀会作废当前会话 KV cache（实测单次 20–57 万 tokens），攒批改。',
      }
    })
  }

  /** 检索（同样记账未命中）。 */
  async function search({ query, project, cwd, branch, session = 'plugin', record = true }: {
    query: string; project?: string | null; cwd?: string | null; branch?: string | null
    session?: string; record?: boolean
  }) {
    return guard(async () => {
      const entries = await store.scan()
      /**
       * 有 cwd 或 branch 时按作用域检索——**agent 的检索必须与界面同口径**。
       * 否则会出现「界面上看不到 gslz 的记忆，但 agent 搜得到并写进上下文」，
       * 那等于作用域只挡住了人，没挡住真正会污染推理的那一端。
       */
      let scope: ScopeResolution | null = null
      if ((typeof cwd === 'string' && cwd.trim() !== '') || (typeof branch === 'string' && branch.trim() !== '')) {
        const projects = projectAliasesOf(entries)
        const resolved = typeof cwd === 'string' && cwd.trim() !== ''
          ? await resolveScope({ cwd, projects, entries })
          : { project: project ?? null, branch: null, branchSource: null, cwd: null, reasons: [], detail: '', parents: projectParentsOf(entries) }
        scope = typeof branch === 'string' && branch.trim() !== ''
          ? { ...resolved, branch: branch.trim() }
          : resolved
      }
      const result = searchEntries(entries, query, { project, scope })
      if (record) {
        if (result.matched) {
          await store.recordCite({ ids: result.hits.map(hit => hit.id), kind: 'recall', session, query: result.query })
          /**
           * 命中时推进「验证期」进度。
           *
           * 未命中流水线的最后一态（验证期内 → 已验证生效）依赖这个计数：
           * 草稿落库后，同一个 query 再被检索且**能命中**，说明补对了。
           * 早先没人写 `hits`，所以最后一态永远是空抽屉。
           */
          await store.recordVerifyHit({ query: result.query })
        } else {
          await store.recordMiss({ query: result.query, session })
        }
      }
      return {
        query: result.query,
        matched: result.matched,
        hits: result.hits.slice(0, 20),
        total: result.hits.length,
        cost: searchCost(result.hits.slice(0, 20)),
      }
    })
  }

  /** 一条记忆的详情（含证据链、锚点、引用记录）。 */
  async function detail({ path }: { path: string }) {
    return guard(async () => {
      const entry = await store.readEntry(path)
      const events = await store.readEvents()
      const refs = events.filter(event => (event.ids ?? []).includes(entry.id))
      const cites = refs.filter(event => event.kind === 'cite')
      const lastCite = cites.length === 0 ? null : cites[cites.length - 1].at
      return {
        entry: {
          ...projectEntry(entry, now()),
          overTokenLimit: entry.tokens > FILE_TOKEN_SOFT_LIMIT,
          body: entry.body,
        },
        trust: {
          confidence: entry.confidence ?? STATE_CONFIDENCE[entry.status as ConfidenceState] ?? null,
          evidenceCount: (entry.evidence ?? []).length,
          citeCount: cites.length,
          recallCount: refs.filter(event => event.kind === 'recall').length,
          lastCitedAt: lastCite,
          anchor: entry.anchor,
          anchorState: entry.status === 'stale' ? 'stale' : entry.anchor === null ? 'none' : 'fresh',
        },
        references: refs.slice(-20).reverse(),
        states: [...CONFIDENCE_STATES],
        sections: parseSections(entry.body).map(section => ({
          title: section.title, level: section.level, lines: section.lines.length,
        })),
      }
    })
  }

  return { snapshot, overview, search, detail }
}
