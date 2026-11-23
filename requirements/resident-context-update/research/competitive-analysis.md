# 竞品与社区分析：常驻前缀成本可见性 / 前缀可编辑 / 插件更新

> 调研时间：2026-11-21。对象：本产品「记忆库 · Memory Ops」（`github.com/Lixb53/memory-ops-dsh`，DSH 插件）。
> 目的：为三条新需求（常驻 token 明细、常驻前缀可编辑、版本差异 + 直接更新）找参照物、找差距、找可借鉴的具体做法。
> **证据强度声明**：本文全部外部结论标注了来源 URL；星数、版本号、插件数量均为来源页面在抓取时的自述值，
> 未做二次核验，不得当作事实引用；本产品现状结论均给出仓库内文件与行号，可复核。

---

## 一、调研样本与方法

| 渠道 | 样本 | 取用方式 |
|---|---|---|
| DSH 插件生态（GitHub topic `dsh-plugin`） | `awesome-dsh-plugin` memory 分类 **904 条**（快照）、`dsh-market` 市场 README | 读分类页与项目 README 原文 |
| DSH 生态内直接对照产品 | `dsh-context-doctor`（上下文注入审计）、`dsh-memj`（提示词前端编辑）、`context-vista`（/context 环图） | 读 README 原文 |
| 通用 AI 编程记忆产品 | `claude-mem`、Letta memory blocks、Claude Code `/context` `/memory` | 读官方文档 / README |
| 插件安装与更新机制 | `dsh-market` 的 `UPDATE-API-V1.md`、Obsidian `BRAT` | 读规格文档 / 社区页 |
| 中文社区（掘金） | 《Claude Code 跨会话记忆方案：claude-mem 配置实战》等 2 篇 | 读正文，取用户侧痛点原话 |

**方法**：先按「本产品三条需求」定义对照维度，再看别人在同一维度做到哪一步；只采信能读到原文的实现描述，
不采信二手转述的结论。

---

## 二、三个维度的横向对照

### 维度 1 · 常驻成本是否"看得见、看得懂"

| 产品 | 做到什么程度 | 关键做法 |
|---|---|---|
| **Claude Code `/context`**（官方） | 按类别给出实时 token 明细（系统提示 / 自动记忆 / 环境信息 / MCP 工具名 / 技能描述 / 各级 CLAUDE.md / 规则 / 文件读取…），并给优化建议 | 每个"注入物"单独一档，且区分「输入前就加载」与「工作中加载」——即区分**每请求常驻**与**按需付费**（[docs](https://code.claude.com/docs/en/context-window)） |
| **dsh-context-doctor**（DSH 插件） | 四项逐项 token（AGENTS.md 指令链 / 技能 catalog / 内置工具 schema / MCP 工具），每项可展开到具体条目；顶部一条**预算轨**把 10k/30k 阈值画成刻度 | 明确标注"每请求常驻"的成本性质；报告**重复段落**与**同名技能遮蔽（rank shadow）**；只读、不输出正文；token 为启发式估算并声明"精确值以 tokenizer 为准"（[README](https://github.com/Zhenyu98/dsh-context-doctor)） |
| **context-vista**（DSH 插件） | `/context` 命令，环图展示上下文 token 用量与分配 | 对标 Claude Code 的 `/context`（[目录页](https://springbrand.ai/deepseek-harness/plugins)） |
| **claude-mem** | 会话开头的分层索引"header 可显示每层是多少 token"；注入内容可细粒度配置 | 渐进披露 + 每层标价（[README](https://github.com/thedotmack/claude-mem)） |
| **Letta memory blocks** | 注入文本里直接带元数据：`chars_current=128 / chars_limit=5000`，并有 label / description / read_only | 把"这一段占多少、上限多少"写进模型看到的同一段（[docs](https://docs.letta.com/v1-sdk/memory/memory-blocks)） |
| **dsh-memj** | 热知识页逐条标**字符数**，超 1000 字符标红；会话页回答"这一次到底注进去了什么" | 配置页（配）→ 会话页（生效）→ 实时状态页（验收），三段分离（[README](https://github.com/jojoman2024/dsh-memj)） |

**本产品现状**（可复核）：

- 总览有「常驻前缀」一个数和「构成面板」，但构成只有三桶：`catalog` / `frame` / `injected`，见 `packages/core/src/actions/read.ts:238-318`。
- **`injected` 被聚合成单一虚拟条目** `id: 'injected.pinned'`（`read.ts:290-300`）——用户看不到"是哪几条置顶、各占多少"。
  而 `renderPinnedSection` 实际逐条渲染 `- [id] title`（`packages/core/src/pinned.ts:136`），数据本身是可拆的。
- **工具 schema 不在常驻口径里**：`billedTokens = catalogTokens + 171 + pinnedTokens`（`read.ts:318`），
  但 `memory_recall` / `memory_write` 的 description 与参数 schema 同样每请求都在。
- 两个预算数并存且没有解释：`RESIDENT_TOKEN_BUDGET = 1024`（`schema.ts:159`，总览 KPI 显示它）
  与 `PINNED_MAX_TOKENS = 256`（`pinned.ts:30`，置顶段落自己的预算）。
- 注入段里写了**运行时数字**：`另有 N 条置顶条目超出 ${maxTokens} tokens 预算未注入`（`pinned.ts:156-158`）。
  这条文本会随库变化而变化，而它位于系统提示词里 → 破坏前缀缓存。dsh-memj 把这条列为硬规矩：
  "给模型写提示词时，绝不把运行时数字写进常驻文本（会导致前缀缓存永不命中）"（[README](https://github.com/jojoman2024/dsh-memj)）。

**结论**：本产品有"成本是一等公民"的主张（`docs/product.md` §三），但明细只做到**桶级**，没到**条目级**；
且口径缺一个桶（工具 schema）。这正好是需求 3.1 要补的洞。

### 维度 2 · 常驻内容能不能"就地看、就地改"

| 产品 | 做到什么程度 | 关键做法 |
|---|---|---|
| **Claude Code** | `/memory` 直接打开并编辑被加载的记忆文件；CLAUDE.md 分层、路径规则 | "看得见是哪几个文件 → 直接编辑那个文件"（[docs](https://code.claude.com/docs/en/context-window)） |
| **Letta memory blocks** | block 有 label / description / value / **limit** / read_only；UI 与 API 都能改 value 和 limit | 编辑对象是一个**有名字、有上限、有只读开关的块**，不是一个自由文本 |
| **dsh-memj** | **86 条提示词 / 其中 64 条可编辑**，按"谁在什么时候看到它"分组；改完即生效（运行时内存覆盖源码）；可一键恢复默认；可写回源码 | 每条标注**热生效档位**：`context()`（消息尾部，改不破缓存）/ `section()`（最前面，改破一次缓存）/ 命令描述（需重启）；带长度上限与插槽校验（[README](https://github.com/jojoman2024/dsh-memj)） |
| **Cline Memory Bank** | 自定义指令追加到系统提示词，UI 可编辑 | 社区实测确认"会略微增加 token 用量"，用户需要自己权衡（[讨论](https://www.reddit.com/r/ChatGPTCoding/comments/1is6jke/a_few_questions_about_cline_memory_bank/)） |
| **dsh-knowledge-canvas** | 知识节点带"触发行"说明何时适用；一个库可**整库注入**或**只注索引** | 把"这段要不要常驻"变成一个显式选择（[目录页](https://springbrand.ai/deepseek-harness/plugins)） |

**本产品现状**：

- 置顶条目的编辑入口在「记忆」分区的源码编辑里（`panes/memory.ts`），**不在常驻面板里**——
  用户看到"置顶 58 tokens"却不知道点了能去哪改。
- skill description、`<available_skills>` 框架 171 都没有任何入口，也不区分"能不能改"。
- 改置顶后当前会话不变（按会话冻结，`pinned-cache.ts` 策略 A），**但界面上没有说这件事**。

**结论**：需求 3.2 的本质不是"加一个富文本编辑器"，而是三件事：
① 把"常驻的每一段"变成**可定位对象**（有 id、有来源、有上限、有只读标记）；
② 编辑要给**成本与生效语义**（改多少 token、什么时候生效、破不破缓存）；
③ 只读项要说清**为什么只读**（宿主生成）。

### 维度 3 · 版本差异与"不卸载就能更新"

| 产品 | 做到什么程度 | 关键做法 |
|---|---|---|
| **DSH 宿主插件页**（平台能力，最强证据） | 每个插件卡片底部有「版本」区块：当前版本、代码来源 spec、**可更新到 X · 发布于 Y**、**1 个新版本**下拉、**重新检查**；更新后热更新，**失败自动回滚旧版本** | 更新检查**独立查 registry**（`pnpm view <name> versions time dist-tags`，`versions.js:13`）；**git 装在查 registry 之前就被判 `not-updatable`**（实测见 `host-version-block-verification.md`） |
| **dsh-context**（官方推荐的上下文插件） | 自己**零更新逻辑**：README 只写 `dsh plugin --profile web add dsh-context` 与 `update dsh-context@latest`，更新能力全部由宿主提供；包里带构建产物，所以"无需构建、无需重启" | 把"更新"这件事完全外包给平台：发 npm + 宿主按钮（[README](https://github.com/bowenliang123/dsh-context)） |
| **dsh-market** | 逐插件检查更新（npm 版本或 pinned commit vs HEAD）、一键更新、**每行带 What changed 链接**（release notes 或 commits）、全部更新、后台定时提醒、**回滚**、需要时一键重启、更新 API v1 供插件自己的设置页调用 | 更新前校验"pnpm 实际落盘的版本"（防止 `@latest` 被 registry 延迟解析成旧版），失败给**稳定错误码**；`checked` 与 `updatable` 分开（[UPDATE-API-V1](https://github.com/dsh-market/dsh-market/blob/main/UPDATE-API-V1.md)） |
| **BRAT**（Obsidian） | 版本选择器、支持 pre-release、**冻结版本**不更新 | 把"升到哪个版本"交给人选，而不是只给 latest（[社区页](https://forum.obsidian.md/t/functional-update-to-brat-version-picker-github-pre-releases-and-frozen-version-updates/98951)） |
| **dsh-memj** | 从界面"添加插件"即可安装/升级；显式写版本号 `dsh-memj@0.1.5` | 记录了一个真实坑：只写包名会被 `pnpm-lock.yaml` 钉在旧版本，所以升级必须带版本号（[README](https://github.com/jojoman2024/dsh-memj)） |
| **dsh-context-doctor** | 声明 `engines.dsh`；宿主版本不匹配时**固定回退到 v0.6.1** | 兼容性是一等公民，不是升级后的报错（[README](https://github.com/Zhenyu98/dsh-context-doctor)） |

**本产品现状**：

- 安装方式是 git 直装（`github:Lixb53/memory-ops-dsh#path:packages/dsh-plugin&<commit>`）或本地 `link:`
  （`README.md:161-206`）。**注意**：宿主的版本区块能工作，前提是安装源"可解析出版本"；
  git 直装 + 裸 commit 大概率落不到 `host-managed`（**未核实**，见影响分析 §四）。
- 仓库没有发布 tag，`packages/dsh-plugin/package.json` 版本固定 `0.1.0`，`dsh.engines.dsh` 已声明
  `>=0.2.0-rc.2 || >=0.2.1-rc.5`（可直接用于兼容性检查）。
- 本机 `~/.dsh/profiles/desktop` 的依赖里没有 `dshmarket`（实测 `package.json`）——但**这不影响更新主路径**：
  宿主插件页自己就有版本区块，不需要市场。

**结论（按新证据修正）**：需求 3.3 的**执行权不该归我们**。宿主已给"检查 + 更新 + 失败回滚"，
我们只做宿主不给的两件事：
① **差异说明**（当前→目标的提交清单，宿主只给发布日期）；
② **降级与前置判断**（`command-only` 兜底、`link` 拦截、`engines` 不满足拦截、单一入口）。
另加一个前置决策：把安装源改成 **npm 包或 git tag**，否则版本区块可能永远认不出我们。

---

## 三、当前产品待改进的地方（按影响排序）

| # | 问题 | 证据 | 后果 |
|---|---|---|---|
| P1 | **常驻明细只到桶级，置顶被聚合成一条** | `read.ts:290-300`（`id: 'injected.pinned'`） | 用户无法回答"这 58 tokens 是哪几条、关掉哪条能省多少"——而这正是产品主张里"唯一由你直接控制大小的每请求成本" |
| P2 | **常驻口径漏了工具 schema** | `read.ts:318` 只加 catalog+frame+injected | 顶栏数字低于真实付费量；与 `docs/product.md` §十二"口径必须对一个数"的教训同型 |
| P3 | **注入段含运行时数字，破坏前缀缓存** | `pinned.ts:156-158` | 每次库变化都可能让系统提示词变化 → 前缀缓存失效（本仓实测单次 20–57 万 tokens，见 `product.md` §21.4） |
| P4 | **两个预算数（1024 / 256）同屏无解释** | `schema.ts:159` vs `pinned.ts:30` | 用户看到"预算 1024"却在段落里读到"超出 256 未注入"，会认为系统算错 |
| P5 | **常驻面板没有编辑入口与生效语义** | 总览仅展示；编辑在 `panes/memory.ts` | "看到问题 → 改不动 → 放弃"，与 §十「驳回入口缺失」同构 |
| P6 | **看不到"改了什么"，也拿不到宿主的版本结果** | 无任何版本/差异路由（`bridge.ts` 路由表）；宿主版本区块的数据没有进记忆库界面 | 用户既不知道当前装的是哪个 commit，也不知道这次升级改了什么。**但"执行更新"宿主已能做**，缺的不是按钮，是信息 |
| P7 | **只读项不可区分** | 框架 171、工具 schema 在 UI 里和可改项长得一样 | 用户会尝试改不可改的东西，失败后不信任整块面板 |

## 四、可以借鉴到本产品的做法（逐条标注来源与落地方式）

| 借鉴点 | 来源 | 在本产品怎么落 | 是否需确认 |
|---|---|---|---|
| 桶内**逐条展开**到名称/来源/token，并标"每请求常驻 / 按需" | dsh-context-doctor、Claude Code `/context` | 常驻前缀视图：四桶 × 条目表，`billed` 布尔字段已有（`read.ts:269/282/300`），复用 | 否（纯加法） |
| **预算轨**（阈值刻度 + 分段着色） | dsh-context-doctor | 顶栏把 1024 预算画成刻度，四桶分段；置顶段落单独画出 256 子预算 | 是（两个预算如何呈现） |
| **重复/遮蔽检测**（同名条目、重复段落） | dsh-context-doctor | 常驻明细分出"重复项"标记；本期只做"同 id 重复 pinned"与"同 description 的 skill" | 是（范围外，先列为附录） |
| token 估算**口径声明** | dsh-context-doctor、`schema.ts:309-330` | 面板每个数字旁标"估算（CJK 1:1 / 其他 4:1），非 tokenizer 精确值" | 否 |
| **每段带 chars/token 上限与只读标记** | Letta memory blocks | 编辑对象模型：`{ id, kind, source, limit, readOnly, value, tokens }` | 否 |
| **可编辑项分组 + 热生效档位标注** | dsh-memj | 编辑页按"改完何时生效"分组：`新会话生效`（置顶）/ `刷新即生效`（无）/ `需重启`（宿主编译产物）；每条标注 | 否 |
| **恢复默认 / 写回源码** 两级 | dsh-memj | 本期只做"恢复默认"（包装文本）；"写回源码"不做并说明原因（插件无源码写权限） | 是（用户可能期待） |
| **不把运行时数字写进常驻文本** | dsh-memj | 改 `pinned.ts` 的 note 为固定文案；数字只在 UI 与事件里出现 | **是（会改既有行为，需确认）** |
| **更新行带 What changed** | dsh-market | 版本页每条差异 = commit（短 sha + 标题 + 日期）或 release note 标题 | 否 |
| **`checked` 与 `updatable` 分开** | dsh-market | 检查结果三态：`已检查 N 个来源 / 有更新 / 检查失败（原因）`；禁止把失败渲染成"已是最新" | 否 |
| **兼容性前置校验** | dsh-context-doctor、`engines.dsh` | 更新前比对 `engines.dsh` 与宿主版本；不满足则禁用一键更新并给出可装范围 | 否 |
| **显式版本号升级** | dsh-memj | 命令路径必须带 `@<ref>`；提示锁文件可能钉住旧版 | 否 |
| **版本冻结/选择器** | BRAT | 本期只做"目标 = 最新 tag/HEAD + 可选钉住某个 commit" | 是（是否要版本选择器） |
| **更新 API v1 三段式（summary / check / operate + poll）** | dsh-market | 一键更新优先走 `GET /dsh-market/api/v1/capabilities` 探测，不可用则降级 | 是（是否允许依赖市场） |

## 五、证据强度与不确定性（必须写清，避免把外部材料当事实）

1. 星数、插件数量、"111 个记忆插件"等数字来自目录页/抓取页面的自述，**未核验**，仅用于说明"同类很多、不是空白市场"。
2. `claude-mem` 的 README 自述与掘金文章的评述**不完全一致**（如 token 上限默认值与"注入占好几千 token"的体验描述），
   本文只取"存在注入成本、需用户自己调"这一共同结论。
3. `dsh-context-doctor` 的 token 为启发式估算（ASCII 4 字符/token、中文 1.5 字符/token），与本仓 `estimateTokens`
   （CJK 1:1、其余 4:1）**口径不同**，两边的数字不可直接相加或比较。
4. `dsh-market` 的更新 API 标注为 **beta**，字段形状可能变；把它作为"可选路径"而不是唯一路径。
5. 本机未安装 `dshmarket`（`~/.dsh/profiles/desktop/package.json` 无该依赖），
   因此"市场一键更新"在用户机器上**当前不可用**；是否为它单独装市场，需用户拍板。
6. 宿主是否向插件暴露"更新/重装"服务，本次**未在 DSH 源码中核实**（`app.asar` 为打包产物，未解包检索）。
   需求 3.3 的"一键更新"因此按"探测 + 降级"设计，未假设宿主一定提供该能力。

## 六、和既有文档的口径冲突（详见 `confirmation.md` §三）

1. `docs/product.md` §12.3 把常驻前缀定义死为 `catalog + frame`（后加 injected），**不含工具 schema**；
   本 PRD 要加第四桶，属于口径变更，必须显式记账，不能静默改数字（该文档 §15.3 维护约定第 4 条）。
2. `docs/product.md` §21.5 把"另有 N 条超出预算"写进段落当作"必要设计"；
   本 PRD 主张改成固定文案 + UI 展示，理由是会破缓存。两者需要拍板，不是文字优化。