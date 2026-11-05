# 记忆库 · Memory Ops

> **你和 AI 共用的记忆库**：你负责拍板和退役，AI 负责按索引取用；两端能力对等、
> 共用同一份 Markdown 真相源，差异只在空间与操作方式。

它不是笔记软件。笔记软件假设读者是人，这个产品假设**读者主要是 agent**。

## 它解决什么

| 原始需求 | 落成了什么 |
|---|---|
| 个人知识积累，越来越懂自己 | 个人档案：身份 / 偏好 / 原则 / 行为模式 / 目标 / INBOX |
| 想法、计划、问题能管理和统计 | INBOX 表格（5 类型 × 4 状态）+ 记录流看板 + 统计口径 |
| 项目记忆：踩过的坑、架构结论 | 工作域按项目分目录，问题台账 + 详情文件 |

## 和笔记软件的根本区别

- 第一指标不是「存了多少字」，是 **常驻前缀 tokens / 请求**（实测 286）
- 每条记忆标 **体积、token、被引用次数**
- 90 天没人读 → 标灰；134 天 → 进「待你处理」退役
- 单文件硬上限 80 行

这三条是防它变成「第二个重型知识库」的唯一机制。

## 架构

```
~/.memory-ops/                    ← 真相源：人可读、git 可管
├── personal/                     INBOX identity principles preferences patterns goals + index
└── work/<project>/               overview maps workflow issues + index
    .state/                       events.jsonl（append-only）+ misses.json

packages/
├── core/                         TS · 零运行时依赖 · 两端共用
│   ├── schema.ts                 数据契约（唯一真相）
│   ├── parse.ts                  md ↔ 结构体
│   ├── store.ts                  原子追加（tmp + rename + 文件锁）
│   ├── search.ts                 全文检索，无向量库
│   ├── privacy.ts                隐私闸门
│   └── actions.ts                29 条能力的唯一实现
└── dsh-plugin/                   DSH 插件（host + client 双半体）
```

**为什么必须有 core**：INBOX 状态流转与统计口径一旦两端各写一份，
三个月后数字必然对不上。组件不共享（React / Vue 无法互通），逻辑必须共享。

## 信息架构（三层）

```
L0 常驻层（每请求 286 tokens 实测，只放索引与 description）
   ↓ 命中触发词
L1 索引层（只在需要时加载）：我能查什么 + 该读哪个文件 + 记录规则
   ↓ 命中具体条目
L2 详情层（单文件 2–16 KB，命中才读）
```

## 三条产品主张

### 1 · 成本可见

每条记忆显示体积、token、所属层、被引用次数。顶栏第一个指标不是「笔记数」，
是**常驻前缀 tokens / 请求**。没有这个数字，用户永远会问「为什么不能多存一点」。

### 2 · 可信度分级

| 层 | 装什么 | 写入条件 | 展示 |
|---|---|---|---|
| 事实 | 你说过的话 | 你说了才写 | 绿色 |
| 原则 | 你定的规矩 | 你确认才写 | 绿色 |
| **推断** | 从对话总结的模式 | **先问你，确认才落档** | 琥珀「待确认」 |

### 3 · 到期退役

90 天未引用 → 标灰；134 天 → 进「待你处理」，给两个出口：归档，或再留 90 天。

## 状态机（唯一合法路径）

```
hypothesis ──重复≥2──> observed ──重复≥3且无反驳──> reinforced ──人确认──> confirmed ──> archived
   任意态 ──人驳回──> rejected（30 天静默，可撤销）
   任意态 ──锚点失效 / 90 天未命中──> stale（降权 0.4，仍可检索）──复核通过──> confirmed
```

## 三率（口径写死在 `core/stats`，两端共用）

| 指标 | 口径 | 目标 |
|---|---|---|
| 命中率 | 30 天内 `cite` 条目数 ÷ `recall` 条目数 | > 60% |
| 确认率 | 30 天内 `confirmed` ÷ (`confirmed` + `rejected`) | > 70% |
| 过期率 | 自然月内 (`stale` + `archived`) ÷ 总条目 | 逐月下降 |

分母为 0 时返回 `null` 而不是 `0`——「算不出来」和「是零」是两件事。

## 快速开始

```bash
pnpm install
pnpm build          # 构建插件产物
pnpm test           # 84 项测试
pnpm typecheck
```

### 安装到 DSH

```bash
# 用宿主自带的插件管理器安装本目录
# 或在 DSH 里：插件 → 添加 → 本地目录 → packages/dsh-plugin
```

安装后你会得到 **4 个表面**：

| 表面 | 宿主扩展点 |
|---|---|
| 侧栏记忆面板（内含 5 分区） | `sidebar.panellist` + `main` |
| 会话记忆 tab | `conversation.view` |
| 右侧栏快速捕获 | `sidebarRightTabs` + `sidebar.right.pane.tab` |
| `/remember` 命令 | `inputTriggers.registerSource` |

**5 个分区**：本项目 / 记录流 / 记忆 / 未命中 / 总览。

### agent 工具

| 工具 | 作用 |
|---|---|
| `memory_recall` | 按关键词检索。命中记 `cite`，未命中记 `miss` |
| `memory_write` | `inbox` 进记录流；`entry` 落正式条目（G2/G3/G4 强制 evidence） |

## 明确不做的事

| 拒绝 | 理由 |
|---|---|
| 向量检索 / embedding 常驻进程 | 检索已是子串 + 词边界，够用；向量库会把常驻成本拉回老路 |
| per-record 存储（单条一文件） | 会让「人可审」变成「人要装工具才能审」 |
| 自动提取并直接写库 | 只生成草稿，人确认才落；挡掉无法审计的臆想 |
| 引入 js-yaml | 会让人可审的 Markdown 变成需要装依赖才能审的 Markdown |

## 数据契约（不可随意改）

```markdown
| 日期 | 类型 | 内容 | 状态 | 去向 |
```

- 类型枚举固定 5 个：`想法 计划 问题 待办 决策`
- 状态：`open → todo → done / dropped`
- 正文禁止裸 `|`，序列化时转义 `\|`
- 写入原子性：`tmp + rename`，避免 agent 与 UI 同时写出现半行
- 批量删行**从大行号往小删**，否则行号漂移

## 许可

MIT
