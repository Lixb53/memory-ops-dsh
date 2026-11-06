# 记忆库 · 一页总结

> 想不起这个项目是干什么的时候，只看这一页。
> 最后核对 **2026-11-06**，数字均来自实际代码与真实数据。

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
| `packages/core` | ✅ 已实现，72 项测试 |
| `packages/dsh-plugin` | ✅ 已实现并安装运行，38 项测试 |
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

这些能力**有路由、有测试，但界面没有入口**，按「用户能不能用」口径算未完成：

| 能力 | 状态 |
|---|---|
| **驳回推断 / 撤销驳回** | ❌ 5 个分区都没有按钮（core 有 `reject` / `undoReject`） |
| **全文检索记账** | ⚠️ 记忆分区用客户端 filter，不调 `search`，**因此命中率恒为 null** |
| 常驻前缀构成面板 | ⚠️ 数据已返回，面板组件未注册 |
| 批量归档 | ❌ 路由有，UI 无入口 |
| 锚点失效校验作业 | ❌ 字段与展示有，**校验作业未实现** |
| 自动爬升（observed → reinforced） | ❌ 需人工迁移 |
| 每日减重 / 每周复盘 | ❌ 未实现 |
| 80 行超限压缩 | ❌ 只显示，不处理 |

## 长什么样

**两套界面，但只有一套有代码**：

- **DSH 插件端**：4 表面 + 5 分区 ✅ **已实现**
- **Web 管理端**：4 视图 ❌ **仅设计稿**（`web-v2.html` / `web-v3.html`）

设计稿分两代，**不要混用**：

| 文件 | 内容 | 定位 |
|---|---|---|
| `web-v2.html` | Web 端 4 视图 + 五态切换 | 设计稿，**无对应实现** |
| `plugin-v2.html` | 插件端 4 表面 + 5 分区 | 结构参考，配色与组件未落地 |
| `web-v3.html` | Web 端 v3（证据链 / 锚点 / 预算账本） | 设计提案，**无对应实现** |
| `plugin-v3.html` | 插件端 v3 | 设计提案，部分已落地 |

> 设计稿通过 `qa.mjs` 三档渲染检查（0 error / 0 warn），
> 那只证明 **HTML 本身没坏**，不证明产品实现了。旧文档把两者混为一谈。

## 进度

| 项 | 状态 |
|---|---|
| 产品设计 + 信息架构 | 完成（见 `product.md`） |
| 个人域数据骨架 | 完成，`~/.memory-ops/personal/` 6 文件，真实结论 |
| 工作域数据 | 完成，`~/.memory-ops/work/sz-web/` 35 篇 |
| `@memory-ops/core` | **已实现**，72 项测试 |
| `@memory-ops/dsh-plugin` host（29 路由 + 2 工具） | **已实现**，38 项测试 |
| `@memory-ops/dsh-plugin` client（4 表面 + 5 分区） | **已挂载**，部分能力未接入 UI |
| **Web 管理端** | **未实现**（无代码） |
| v3 契约（frontmatter v2 + events.jsonl + 三率） | **已实现** |
| v3.1 常驻前缀口径更正（361 ≠ 286） | 已完成（`product.md` §十二） |
| v3.2 `/remember` 改弹窗输入 | 已完成（`product.md` §十三） |
| v3.3 项目视图索引口径 | 已完成（`product.md` §十四） |
| **v3.4 文档与代码对账** | **已完成**（2026-11-06，`product.md` §十五） |
| 驳回入口 / 检索记账 / 锚点作业 / 减重复盘 | **未实现**（见上方缺口清单） |

## 卡在哪

两个决策都需要改常驻前缀 → 会作废一次缓存（实测单次 20–57 万 tokens）：

1. 工作域要不要从 skill 目录搬到 `~/.memory-ops/work/sz-web/`
2. `personal-memory` skill 什么时候建

建议：**攒到下次配置变更时一次性做完**，符合「配置一次改完」。

## 下一步最值得做的

**补上「驳回」入口。**

状态机里有 `rejected` 态、有 30 天静默规则、有 `undoReject` 路由、有 5 项测试覆盖，
但用户在界面上找不到那个按钮。

后果和「单向漏斗」同构：系统设计了一套纠错机制，用户用不上，
于是推断要么被确认（错的也留下），要么被无视（永远停在待确认）。

## 文件

```
memory-ops/                     仓库根（pnpm monorepo）
├── packages/core/              ✅ 已实现
│   ├── src/                    schema parse store search privacy actions
│   └── test/                   72 项
├── packages/dsh-plugin/        ✅ 已实现
│   ├── src/                    index bridge tools + client/
│   └── test/                   38 项
└── packages/memory-web/        ❌ 不存在

~/.memory-ops/                  ✅ 真相源（与 ~/.dsh 同级）
├── personal/                   6 档案 + INBOX + index
├── work/sz-web/                35 篇 + index
└── .state/                     events.jsonl + misses.json

本目录（memory-ops-docs）：
├── product.md                  完整设计说明（§二 真实状态 / §十五 对账记录）
├── README.md                   本文件
├── web-v2.html / web-v3.html   Web 端设计稿（无实现）
├── plugin-v2.html / v3.html    插件端设计稿（结构参考）
├── qa.mjs                      设计稿机器验收（三档渲染）
└── shots/ shots-v3/            设计稿截图
```

## 维护约定

1. **写「已完成」必须能指向具体文件或测试**，否则写「设计意图」
2. 设计稿状态与代码状态**分两栏写**，不得混用
3. 每次改文档前先跑 `pnpm test` 与 `pnpm typecheck`，用真实数字
4. 口径变更单开一节记录「错在哪、为什么值得记」，不静默改数字
