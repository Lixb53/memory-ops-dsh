/**
 * data.js —— 原型数据层
 *
 * ⚠️ 全部来自真实库 `C:\Users\51967\.memory-ops`（2026-11-17 实读），
 * 不是 Jane Doe / Acme / 99.99% 那类占位假数据。
 * token 数用 core/schema.ts::estimateTokens 的同一口径计算：
 *   CJK 与全角 1 字 = 1 token，其余 4 字符 = 1 token，向上取整。
 *
 * 三个文件的实测值：
 *   personal/INBOX.md           178 tokens / 18 行
 *   personal/principles.md      114 tokens / 19 行
 *   work/dsh-config/...md       519 tokens / 33 行
 *
 * ## 为什么用经典脚本而不是 ES module
 *
 * 原型必须能**双击打开**（file:// 协议）。ES module 在 file:// 下会被
 * CORS 拦截，页面直接白屏——实测确认过。所以这里用 window.MO 命名空间
 * 而不是 import/export。这不是风格选择，是可用性要求。
 */

(function () {
  'use strict';

  const MO = (window.MO = window.MO || {});

  /* ==========================================================
   * 成本口径（来自 docs/product.md §十二，不是猜的）
   * ========================================================== */

  MO.COST = {
    /**
     * 每请求付费：两个 skill description（90 + 100）+ 目录框架 171。
     * 本机没有装任何 *-memory skill，所以真实值只剩框架 171。
     * 两种都给出，让界面能说清「为什么数字和文档不一样」。
     */
    billedWithSkills: 361,
    billedWithoutSkills: 171,
    frameTokens: 171,
    residentBudget: 1024,
    /** 索引层：所有 layer:l0 文件之和，只在被 read 时付费。本机为 0（无 l0 文件）。 */
    indexTokens: 0,
    /** 对照锚点：弃用的 knowledge 曾占 4120。 */
    knowledgeAnchor: 4120,
  };

  /* ==========================================================
   * 记忆条目（全库 3 篇）
   * ========================================================== */

  MO.ENTRIES = [
    {
      id: 'work.dsh-config.repo-conventions',
      title: 'dsh-config 仓库：个人 skill/preset/profile 的唯一真相源与安装方式',
      scope: 'work/dsh-config',
      scopeLabel: 'dsh-config',
      kind: 'fact',
      layer: 'l2',
      status: 'observed',
      confidence: 0.5,
      origin: 'G3',
      originLabel: '从对话总结的',
      tokens: 519,
      lines: 33,
      updated: '2026-11-16',
      citeCount: 0,
      lastCited: '从未',
      evidence: [
        {
          excerpt: '实测：plugin_manager install_bundle 用 git+https://github.com/Lixb53/dsh-config.git'
            + '#path:presets/_template 返回 application:applied；pnpm add 同地址 58.7s 成功装到 @local/dsh',
          session: 'session-8413ebbd',
          gate: 'G3',
        },
      ],
    },
    {
      id: 'personal.principles',
      title: '所有会话的思考过程和结果全都使用中文',
      scope: 'personal',
      scopeLabel: '个人',
      kind: 'fact',
      layer: 'l2',
      status: 'confirmed',
      confidence: 0.9,
      origin: 'G1',
      originLabel: '你亲口说的',
      tokens: 114,
      lines: 19,
      updated: '2026-11-16',
      citeCount: 1,
      lastCited: '2026-11-16',
      evidence: [
        { excerpt: '所有会话的思考过程和结果全都使用中文', session: 'session-7b253c75', gate: 'G1' },
      ],
    },
    {
      id: 'personal.INBOX',
      title: 'INBOX',
      scope: 'personal',
      scopeLabel: '个人',
      kind: 'fact',
      layer: 'l2',
      status: 'active',
      confidence: null,
      origin: 'G1',
      originLabel: '你亲口说的',
      tokens: 178,
      lines: 18,
      updated: '2026-11-16',
      citeCount: 1,
      lastCited: '2026-11-16',
      evidence: [],
    },
  ];

  /* ==========================================================
   * INBOX 记录流（3 条，来自 personal/INBOX.md 的表格）
   * ========================================================== */

  MO.INBOX = [
    {
      line: 16,
      date: '2026-11-16',
      kind: '决策',
      content: '所有会话的思考过程和结果全都使用中文',
      state: 'done',
      destination: 'personal/principles.md',
    },
    {
      line: 17,
      date: '2026-11-16',
      kind: '想法',
      content: '测试写入：2026-11-16 首次使用记忆库，验证 memory_write 流程通畅。此条为冒烟测试记录，可随时清理。',
      state: 'open',
      destination: '—',
    },
    {
      line: 18,
      date: '2026-11-16',
      kind: '问题',
      content: '打开的弹窗，在windows系统中，弹窗位置在最下方且被遮挡住了',
      state: 'open',
      destination: '—',
    },
  ];

  /* ==========================================================
   * 未命中（5 条，全部 state=observing，count=1）
   *
   * 注意：没有一条达到 fillThreshold=3，所以「等你补」是空的。
   * 这是真实状态，界面必须诚实地表现为「还没到时候」而不是空表。
   * ========================================================== */

  MO.MISSES = [
    { query: '记忆库 产品 问题 缺口 设计', count: 1, sessions: 1, state: 'observing', lastAt: '2026-11-17', wasted: 11 },
    { query: 'github 仓库 skill preset 配置 管理', count: 1, sessions: 1, state: 'observing', lastAt: '2026-11-16', wasted: 12 },
    { query: '用户偏好 仓库 工具 配置 习惯', count: 1, sessions: 1, state: 'observing', lastAt: '2026-11-16', wasted: 11 },
    { query: 'dsh 仓库 结构 preset skill 约定', count: 1, sessions: 1, state: 'observing', lastAt: '2026-11-16', wasted: 12 },
    { query: '记忆库 测试 初始化', count: 1, sessions: 1, state: 'observing', lastAt: '2026-11-16', wasted: 6 },
  ];

  /** 达到「等你补」阈值（≥3 次）的门槛。 */
  MO.MISS_FILL_THRESHOLD = 3;

  /* ==========================================================
   * 事件流（12 条，来自 .state/events.jsonl）
   * ========================================================== */

  MO.EVENTS = [
    { at: '2026-11-16 10:29', kind: 'capture' },
    { at: '2026-11-16 10:33', kind: 'miss' },
    { at: '2026-11-16 10:33', kind: 'capture' },
    { at: '2026-11-16 10:33', kind: 'recall' },
    { at: '2026-11-16 13:51', kind: 'capture' },
    { at: '2026-11-16 13:57', kind: 'miss' },
    { at: '2026-11-16 13:58', kind: 'miss' },
    { at: '2026-11-16 13:59', kind: 'miss' },
    { at: '2026-11-16 14:12', kind: 'write' },
    { at: '2026-11-16 14:38', kind: 'promote' },
    { at: '2026-11-16 14:38', kind: 'recall' },
    { at: '2026-11-17 07:49', kind: 'miss' },
  ];

  /* ==========================================================
   * 推导状态：每次渲染重算，不在模块加载时定死
   *
   * ⚠️ 早先算一次存起来，然后 confirmEntry 改了 entry.status，
   * 但 pendingDecisions 是旧数组，队列不动，界面看起来「点了没反应」。
   * 那正是本仓 §13.1 记过的那类缺陷，不能在自己的原型里重犯。
   * ========================================================== */

  MO.deriveState = function deriveState() {
    const pendingDecisions = MO.ENTRIES.filter(
      e => e.status === 'hypothesis' || e.status === 'observed' || e.status === 'stale',
    );
    const openInbox = MO.INBOX.filter(r => r.state === 'open' || r.state === 'todo');
    const fillable = MO.MISSES.filter(m => m.count >= MO.MISS_FILL_THRESHOLD);
    const totalTokens = MO.ENTRIES.reduce((sum, e) => sum + e.tokens, 0);

    return {
      entries: MO.ENTRIES,
      inbox: MO.INBOX,
      misses: MO.MISSES,
      events: MO.EVENTS,
      pendingDecisions,
      openInbox,
      fillable,
      totalTokens,
      /** 待办总数 = 拍板 + 流转 + 补库 */
      todoTotal: pendingDecisions.length + openInbox.length + fillable.length,
      /** 库里最重的一篇，用于「该看哪篇」。 */
      heaviest: [...MO.ENTRIES].sort((a, b) => b.tokens - a.tokens)[0],
    };
  };
})();
