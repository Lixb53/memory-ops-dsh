/* ============================================================
 * data.js —— 真实库快照（不是占位数据）
 *
 * 数值来源（改动须同步 docs/product.md 或 PRD）：
 *   · 条目 42 / 个人 7 / 工作 35 / 超 80 行 14  → docs/product.md §四 实测表
 *   · 待拍板 2 / 确认率 100%                   → §17.7 修补后真实库状态
 *   · 常驻 236 = 框架 171 + 置顶 65        → 171 见 §17.3；65 见下一行
 *   · 置顶 65（3 项）= 骨架 32 + 两标题 33  → 按 pinned.ts 的 HEADER/FOOTER + `- [id] 标题` 逐字估算
 *     **为什么不是 PRD 的 229**：229 是另一台机器上一次快照（置顶只有 1 条聚合 58）。本原型按
 *     pinned.ts 的渲染规则重算，得到 236；顶栏、桶、合计行三处用同一套数，不用 PRD 的数去凑。
 *   · catalog 0                                → §17.8② 本机 skill 读不到时只剩框架 171
 *   · toolschema 不可读                        → §2.3 依赖表「宿主是否暴露 schema 未核实」
 *   · 版本 0.3.0 / git 安装 / 5c44d95          → 最新提交（feat(pinned)）与 package.json
 *
 * 差额是刻意保留的：R4 要求「桶内条目和 = 桶数字，不等要解释」，
 * 一条都不允许对齐成整数——那会掩盖「跳过」这条最重要的信息。
 * ============================================================ */

window.MO = window.MO || {};

MO.data = {
  scope: 'personal · work/sz-web',
  snapshotAt: '2026-11-21',

  counts: {
    entries: 42,
    personal: 7,
    work: 35,
    overLimit: 14,
    pendingDecision: 2,
    inFlight: 5,
    misses: 1,
    cited90d: 3,
    urgent: 3,
    todayCaptured: 2
  },

  /* —— 常驻前缀四桶（V1 的数据面）—— */
  resident: {
    total: 236,
    buckets: [
      {
        id: 'catalog',
        kind: 'catalog',
        name: '技能目录',
        en: 'catalog',
        tokens: 0,
        billing: '每请求',
        state: 'empty',
        note: '本机未注入 skill：读不到，但不等于 0 条成本',
        items: []
      },
      {
        id: 'frame',
        kind: 'frame',
        name: '目录框架',
        en: 'frame',
        tokens: 171,
        billing: '每请求',
        state: 'ok',
        readonly: '宿主生成，插件无权改',
        note: '宿主生成，插件无权改；只读',
        items: [
          { id: 'frame.available-skills', name: '<available_skills> 目录框架', tokens: 171, source: '宿主内置' }
        ]
      },
      {
        id: 'injected',
        kind: 'injected',
        name: '置顶条目',
        en: 'injected',
        tokens: 65,
        billing: '每请求',
        state: 'ok',
        note: '3 项 65 = 骨架 32 + 两条标题 33 · 全部注入 · 段预算 256 已用 65',
        items: [
          {
            id: 'pinned.skeleton',
            name: '段落标题与结语（## 记忆库置顶规则 / 结语）',
            tokens: 32,
            source: 'pinned.ts 常量',
            domain: 'personal',
            injected: true,
            pinned: false,
            status: '只读'
          },
          {
            id: 'personal.principles.language',
            name: '所有会话的思考过程和结果全都使用中文',
            tokens: 18,
            source: 'personal/principles.md',
            domain: 'personal',
            injected: true,
            status: 'confirmed',
            pinned: true
          },
          {
            id: 'work.memory-ops.convention.inbox-first',
            name: '记忆条目先写 INBOX，人确认后才落档',
            tokens: 15,
            source: 'work/memory-ops/main/convention.md',
            domain: 'personal',
            injected: true,
            status: 'observed',
            pinned: true
          }
        ]
      },
      {
        id: 'toolschema',
        kind: 'toolschema',
        name: '工具 schema',
        en: 'toolschema',
        tokens: null,
        billing: '每请求',
        state: 'error',
        note: '宿主未暴露 schema：合计不含这一段',
        items: []
      }
    ]
  },

  /* —— 版本与更新（V3 的数据面）—— */
  version: {
    version: '0.3.0',
    spec: 'memory-ops-dsh@0.3.0',
    install: 'git',
    commit: '5c44d95',
    target: null,
    targetDate: null,
    hostState: 'not-updatable',
    hostReason: 'installed from Git, which lists no versions',
    checkedAt: null,
    checkState: 'unchecked',
    diff: []
  },

  /* —— 今天：线索（每条都能落到一个动作）—— */
  clues: [
    {
      id: 'c1',
      title: '两条推断等你拍板：其中一条会影响全部会话',
      meta: '待拍板 · 推断 · 30 天静默后自动搁置',
      tone: 'warn',
      status: '待拍板',
      group: '拍板',
      source: 'personal/patterns.md',
      tokens: 30,
      action: '确认',
      detail: '推断来自 3 次跨会话重复：你在每个会话都要求中文。确认后写入 principles.md，并进置顶段落。'
    },
    {
      id: 'c2',
      title: '这周问过「grep 读不到文件」，但库里没有这条',
      meta: '未命中 1 次 · 可以生成草稿',
      tone: 'warn',
      status: '缺 1 条',
      group: '补库',
      source: 'misses.json',
      tokens: 0,
      action: '写草稿',
      detail: '同一个问题被问过 1 次。生成草稿只会进 INBOX，落档仍需你点头。'
    },
    {
      id: 'c3',
      title: '14 篇超过 80 行，最重一篇 4,987 tokens',
      meta: '维护 · 机械压缩只剩 0 行可省',
      tone: 'idle',
      status: '可整理',
      group: '维护',
      source: 'work/sz-web/main/overview/',
      tokens: 4987,
      action: '看清单',
      detail: '无损压缩已用尽（实测可省 0 行）。剩下的需要人工摘要或拆文件，系统只给建议。'
    },
    {
      id: 'c4',
      title: '每请求 229 tokens，其中 171 是你动不了的框架',
      meta: '成本 · 置顶 58 可关',
      tone: 'idle',
      status: '可降',
      group: '成本',
      source: '常驻前缀',
      tokens: 229,
      action: '看构成',
      detail: '框架 171 由宿主生成；置顶 58 你能逐条关。关掉排后面的那条可省 28。'
    },
    {
      id: 'c5',
      title: '工作域 5 条在流转中，2 条超过 7 天没动',
      meta: '待办 · open → todo',
      tone: 'idle',
      status: '流转中',
      group: '流转',
      source: 'INBOX',
      tokens: 0,
      action: '去待办',
      detail: '开着的条目超过 7 天会降权但不删除。你可以直接改成 todo 或丢掉。'
    }
  ],

  /* —— 待办三段 —— */
  todo: {
    decide: [
      {
        id: 'd1',
        title: '「所有会话使用中文」应当成为长期原则',
        meta: '推断 · 3 个会话重复 · 来自 personal/patterns.md',
        status: '待拍板',
        tone: 'warn',
        tokens: 30,
        detail: '自动爬升最多到 observed。要不要进原则，只有你能定。'
      },
      {
        id: 'd2',
        title: '本仓提交一律先跑 pnpm check',
        meta: '推断 · 2 个会话重复',
        status: '待拍板',
        tone: 'warn',
        tokens: 22,
        detail: '这条若确认，会进入置顶段落，每请求多 22 tokens。'
      }
    ],
    flow: [
      { id: 'f1', title: '补齐 docs/manual.md（README 已引用但文件不存在）', meta: '问题 · 5 天 · 工作域', status: '流转中', tone: 'idle', tokens: 0, detail: '死链会在更新说明里露出，优先补。' },
      { id: 'f2', title: 'CI 里接上 static-audit', meta: '待办 · 3 天', status: '流转中', tone: 'idle', tokens: 0, detail: 'AST 级检查已写好，只差 CI 一步。' },
      { id: 'f3', title: '「不新增第五表面」写进决策记录', meta: '决策 · 9 天 · 已 stale', status: '该复核', tone: 'warn', tokens: 0, detail: '9 天没动，锚点仍有效。可再留 90 天或归档。' },
      { id: 'f4', title: '分支 scoped 迁移收尾（33 条已迁，2 条待判）', meta: '计划 · 12 天', status: '流转中', tone: 'idle', tokens: 0, detail: '未落分支的 2 条会一直报「待迁移」，别让计数永远不归零。' },
      { id: 'f5', title: '核查宿主版本区块对 git 直装的行为', meta: '问题 · 4 天', status: '流转中', tone: 'idle', tokens: 0, detail: '已实测：git 安装被判 not-updatable。结论要写进 manual。' }
    ],
    refill: [
      {
        id: 'r1',
        title: '「grep 读不到文件」这个问题没被记住',
        meta: '未命中 1 次 · 7 天验证窗口',
        status: '缺 1 条',
        tone: 'warn',
        tokens: 0,
        detail: '生成草稿后仍是草稿状态；确认才落库，7 天内再被问到才算验证通过。'
      }
    ]
  },

  /* —— 记忆：内容面 / 成本面共用同一批行 —— */
  entries: [
    { id: 'm1', title: '所有会话的思考过程和结果全都使用中文', source: 'personal/principles.md', layer: 'l2', tokens: 30, billing: '按需', status: '已确认', tone: 'ok', cited: 11, anchor: '有效', evidence: '你在 3 个会话里显式要求过' },
    { id: 'm2', title: '记忆条目先写 INBOX，人确认后才落档', source: 'work/memory-ops/main/convention.md', layer: 'l2', tokens: 28, billing: '按需', status: '观察到', tone: 'idle', cited: 4, anchor: '有效', evidence: '2 个会话重复出现' },
    { id: 'm3', title: '插件默认失败模式是静默不生效，不是抛异常', source: 'work/memory-ops/main/issues/plugin-silent.md', layer: 'l2', tokens: 64, billing: '按需', status: '已确认', tone: 'ok', cited: 7, anchor: '有效', evidence: 'v3.2 回车事故 + 路由孤儿' },
    { id: 'm4', title: 'frontmatter 写回会毁手写块列表', source: 'work/memory-ops/main/issues/frontmatter.md', layer: 'l2', tokens: 58, billing: '按需', status: '已确认', tone: 'ok', cited: 3, anchor: '该复核', evidence: '零缩进块列表实测丢失' },
    { id: 'm5', title: '命中率必须靠 cite 回填写入，搜到不等于用到', source: 'work/memory-ops/main/architecture/tri-rate.md', layer: 'l1', tokens: 41, billing: '按需', status: '已确认', tone: 'ok', cited: 2, anchor: '有效', evidence: 'events.jsonl 中 cite 曾恒为 0' },
    { id: 'm6', title: '临夏禁毒·系统概要设计', source: 'work/sz-web/main/overview/lx.md', layer: 'l2', tokens: 4987, billing: '按需', status: '待退役', tone: 'warn', cited: 0, anchor: '无法核对', evidence: '134 天未被引用' }
  ],

  /* —— 记一条：最近落地的三条 —— */
  recent: [
    { id: 'n1', title: '置顶条目走推送通道，不走检索', meta: '决策 · 刚记 · personal/INBOX.md', tokens: 0 },
    { id: 'n2', title: '宿主对 git 直装判 not-updatable', meta: '问题 · 12 分钟前', tokens: 0 },
    { id: 'n3', title: '241 项测试通过（core 143 + plugin 98）', meta: '想法 · 40 分钟前', tokens: 0 }
  ]
};