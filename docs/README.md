# 记忆库 · 一页总结

> 想不起这个项目是干什么的时候，只看这一页。
> 最后核对 **2026-11-06（v3.4 缺口补齐后）**，数字均来自实际代码与真实数据。

> **不知道怎么用？先看 [`manual.md`](./manual.md)** —— 那份文档只回答「界面上该点哪里」。

## 一句话

**你和 AI 共用的记忆库**：你负责拍板和退役，AI 负责按索引取用；
共用同一份 Markdown 真相源。从 v3 起，每条记忆都带证据、置信度与失效状态。

## 它解决什么

| 你的原始需求 | 落成了什么 |
|---|---|
| 个人知识积累，越来越懂自己 | 个人档案 6 文件：身份 / 偏好 / 原则 / 行为模式 / 目标 / INBOX |
| 想法、计划、问题能管理和统计 | INBOX 表格（5 类型 × 4 状态）+ 记录流看板 + 统计口径 |
| 项目记忆：踩过的坑、架构结论 | 工作域 35 篇 + 索引文件 |

## 和笔记软件的根本区别

笔记软件假设读者是人。这个产品假设**读者主要是 agent**，所以：

- 第一指标不是「存了多少字」，是**常驻前缀 361 tokens / 请求**
  - 361 = 两个 skill description（90 + 100）+ `<available_skills>` 目录框架（171）
  - 另有**索引层体积 286**（两个 `layer: l0` 文件），只在被 read 时才付费——**两者不可混用**
- 每条记忆标 **体积、token、被引用次数**
- 90 天没人读 → 标灰；134 天 → 进「待你处理」退役
- 单文件硬上限 80 行

这三条是防它变成第二个 knowledge 的唯一机制（knowledge 2.4 MB、mnemon 装了 11 个工具但 `bodies total: 0`）。

## 现在到底有什么（**先看这个**）

### 代码：两个包，无 Web 端

| 包 | 状态 |
|---|---|
| `packages/core` | ✅ 已实现，231 项测试 |
| `packages/dsh-plugin` | ✅ 已实现并安装运行，89 项测试 |
| `packages/memory-web` | ❌ **未实现**（没有代码） |

仓库：https://github.com/Lixb53/memory-ops-dsh

### 4 个表面（全部已挂载）

| 表面 | 宿主扩展点 |
|---|---|
| 侧栏记忆面板（内含 5 分区） | `sidebar.panellist` + `main` |
| 会话记忆 tab | `conversation.view` |
| 右侧栏快速捕获 | `sidebarRightTabs` + `sidebar.right.pane.tab` |
| `/remember` 弹窗 | `inputTriggers` + `conversation.input.overlay` |

### 5 个分区：本项目 / 记录流 / 记忆 / 未命中 / 总览

### agent 工具

| 工具 | 作用 |
|---|---|
| `memory_recall` | 按关键词检索。命中记 `cite`，未命中记 `miss` |
| `memory_write` | `inbox` 进记录流；`entry` 落正式条目（G2/G3/G4 强制 evidence） |

## 已知缺口（诚实清单）

**插件端已清空**——v3.4 把上一版列的 8 项全部补上，每项都有测试：

| 能力 | 状态 |
|---|---|
| 驳回推断 / 撤销驳回 | ✅ 待处理队列 + 记忆详情两处入口，驳回强制写理由 |
| 全文检索记账 | ✅ 走 `search` 路由，命中记 cite、未命中记 miss（命中率不再恒为 null） |
| 常驻前缀构成面板 | ✅ 已接入，且修掉了「KPI 用索引层冒充常驻前缀」的口径错 |
| 批量归档 | ✅ 记忆分区多选 |
| 未命中按频率排序 | ✅ core 按 `count` 降序 |
| 记录流改内容 | ✅ 行内编辑（core 早就支持，只是没接） |
| 锚点失效校验作业 | ✅ 按需触发（无常驻定时器） |
| 自动爬升 observed → reinforced | ✅ ≥3 个不同会话引用，默认 dry-run |
| 每周复盘 | ✅ 窗口内事件 + 行动项排序 |
| 80 行超限压缩 | ✅ 机械压缩（只做无损三件事，语义摘要仍坚持人工） |

**唯一剩下的大缺口是 Web 管理端**：`packages/memory-web` 不存在。

> 口径提醒：真实库 14 篇超限文件，无损压缩空间已被前一次 apply 用尽（现在 **0 行**）。
> 这不是失败——无损压缩就不该省出几百行，否则说明它在删真内容。
> 剩下的必须人工摘要或拆文件。

## 长什么样

**两套界面，但只有一套有代码**：

- **DSH 插件端**：4 表面 + 5 分区 ✅ **已实现**
- **Web 管理端**：4 视图 ❌ **仅设计稿**（`docs/design/web-v2.html` / `web-v3.html`）

设计稿分两代，**不要混用**：

| 文件 | 内容 | 定位 |
|---|---|---|
| `design/web-v2.html` | Web 端 4 视图 + 五态切换 | 设计稿，**无对应实现** |
| `design/plugin-v2.html` | 插件端 4 表面 + 5 分区 | 结构参考，配色与组件未落地 |
| `design/web-v3.html` | Web 端 v3（证据链 / 锚点 / 预算账本） | 设计提案，**无对应实现** |
| `design/plugin-v3.html` | 插件端 v3 | 设计提案，部分已落地 |

> 设计稿通过 `docs/design/qa.mjs` 三档渲染检查（0 error / 0 warn），
> 那只证明 **HTML 本身没坏**，不证明产品实现了。旧文档把两者混为一谈。

## 进度

| 项 | 状态 |
|---|---|
| 产品设计 + 信息架构 | 完成（见 `product.md`） |
| 个人域数据骨架 | 完成，`~/.memory-ops/personal/` 6 文件，真实结论 |
| 工作域数据 | 完成，`~/.memory-ops/work/sz-web/` 35 篇 |
| `@memory-ops/core` | **已实现**，231 项测试 |
| `@memory-ops/dsh-plugin` host（34 路由 + 2 工具） | **已实现**，89 项测试 |
| `@memory-ops/dsh-plugin` client（4 表面 + 5 分区） | **已挂载**，部分能力未接入 UI |
| **Web 管理端** | **未实现**（无代码） |
| v3 契约（frontmatter v2 + events.jsonl + 三率） | **已实现** |
| v3.1 常驻前缀口径更正（361 ≠ 286） | 已完成（`product.md` §十二） |
| v3.2 `/remember` 改弹窗输入 | 已完成（`product.md` §十三） |
| v3.3 项目视图索引口径 | 已完成（`product.md` §十四） |
| **v3.4 文档与代码对账** | **已完成**（2026-11-06，`product.md` §十五） |
| v3.4 驳回入口 / 检索记账 / 锚点作业 / 减重复盘 / 自动爬升 | **已实现**（见 `product.md` §十七） |
| **v3.6 四个「看起来正常」的缺陷** | **已修**（`product.md` §十八）：项目别名解析 / 人拍板状态表 / 会话注入原因 / async skills |
| **v3.7 跨表面跳转** | **已修**（`product.md` §十九）：会话 tab「去未命中工作台」点了没反应 —— 接线断了 + 两棵 React 树 |

## 卡在哪

两个决策都需要改常驻前缀 → 会作废一次缓存（实测单次 20–57 万 tokens）：

1. 工作域要不要从 skill 目录搬到 `~/.memory-ops/work/sz-web/`
2. `personal-memory` skill 什么时候建

建议：**攒到下次配置变更时一次性做完**，符合「配置一次改完」。

## 下一步最值得做的

**建 `packages/memory-web`。**

插件端已经没有「有路由没入口」的能力了，剩下的唯一结构性缺口是 Web 管理端——
设计稿在 `docs/design/web-v3.html`，但没有一行实现。

做它之前值得先看 `product.md` §十七：四项维护作业现在是**按需触发**的纯函数 + 路由，
Web 端只要复用 core 的 `actions` 就能拿到同样的能力，不需要重写任何口径。

## 文件

```
memory-ops/                     仓库根（pnpm monorepo）
├── packages/core/              ✅ 已实现
│   ├── src/                    schema parse store search privacy actions
│   └── test/                   231 项
├── packages/dsh-plugin/        ✅ 已实现
│   ├── src/                    index bridge tools + client/
│   └── test/                   89 项
└── packages/memory-web/        ❌ 不存在

~/.memory-ops/                  ✅ 真相源（与 ~/.dsh 同级）
├── personal/                   6 档案 + INBOX + index
├── work/sz-web/                35 篇 + index
└── .state/                     events.jsonl + misses.json

docs/（文档唯一真相源，2026-11-06 起启用）：
├── product.md                  完整设计说明（§二 真实状态 / §十五 对账记录）
├── manual.md                   **使用手册**（入口在哪、每步点什么、故障排查）
├── README.md                   本文件（一页总结）
└── design/
    ├── README.md                     设计稿目录说明
    ├── web-v2.html / web-v3.html      Web 端设计稿（无实现）
    ├── plugin-v2.html / v3.html       插件端设计稿（结构参考）
    ├── qa.mjs                         设计稿机器验收（三档渲染）
    ├── chrome-qa.sh                   QA 用 Chrome 包装器
    ├── probe.mjs                      溢出定位探针
    └── screenshots/
        ├── v2/                         v2 截图（6 张）
        └── v3/                         v3 截图（15 张）
```

## 维护约定

1. **写「已完成」必须能指向具体文件或测试**，否则写「设计意图」
2. 设计稿状态与代码状态**分两栏写**，不得混用
3. 每次改文档前先跑 `pnpm test` 与 `pnpm typecheck`，用真实数字
4. 口径变更单开一节记录「错在哪、为什么值得记」，不静默改数字
