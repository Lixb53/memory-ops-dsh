# 变更影响分析 · 常驻前缀透明化与自更新

> 输入变更点：R1–R23（见 `../prd.md`）。每条影响都带**依据来源**（代码行号 / 文档节号 / 实测）。
> 影响类型：`新增` / `修改` / `删除` / `兼容性破坏`。影响"未核实"的项单独列在 §四，不当成已验证。

---

## 一、变更 × 影响 × 动作

| # | 变更点 | 受影响模块（文件） | 影响 API | 影响数据（文件/字段） | 验收项 | 测试用例 | 类型 | 依据来源 |
|---|---|---|---|---|---|---|---|---|
| I1 | 常驻前缀加第 4 桶 `toolschema`（R1/R7） | `packages/core/src/actions/read.ts`（`residentBreakdown`）、`actions/constants.ts`、`packages/dsh-plugin/src/client/panes/health.ts`（KPI 与构成条） | `overview` 返回体新增 `resident.toolschema{ tokens, items[], readable, reason }` | 无新增文件；`resident.items[].kind` 枚举扩 `toolschema` | A1 / A6 / A7 | core：`residentBreakdown` 四桶求和、`toolschema 不可读时不进合计`；plugin：`host.test.mjs` 断言 `billedTokens` 含 toolschema | 修改（响应形状向后兼容：只加字段） | `read.ts:238-318`（现有三桶与 `billedTokens` 公式）；`docs/product.md` §12.3（口径定义） |
| I2 | `injected` 由 1 条聚合项拆成逐条（R5） | 同上 + `packages/core/src/pinned.ts`（提供每条 id/title/tokens/是否注入） | `overview.resident.injected.items[]`（每项含 `id/title/tokens/injected/skipReason`） | 无文件变更；读 `pinned: true` 条目的 `title` 与 `id` | A4 | core：`pinned 逐条渲染与跳过原因`；plugin：`wiring-ui.test.mjs` 断言 `injected.items` 被渲染（不再引用 `injected.pinned`） | 兼容性破坏（响应里 `injected.pinned` 单条消失） | `read.ts:290-300`（现聚合为 `id: 'injected.pinned'`）、`pinned.ts:136`（逐条渲染早有依据） |
| I3 | 注入段去掉运行时数字（R5 / 冲突 C2） | `packages/core/src/pinned.ts`（`note` 文案） | 无 API 变更（`PinnedRender.tokens` 会略变） | 无 | A1 / A4 | core：`pinned.test.ts` 现有"超预算写进段落"用例**必改**；新增"文本不含数字"断言 | 兼容性破坏（模型看到的段落文本变了） | `pinned.ts:156-158`；`docs/product.md` §21.5（原设计）；`dsh-memj` README（"绝不把运行时数字写进常驻文本"） |
| I4 | 新增"编辑常驻前缀"能力（R10–R16） | 新增 `packages/dsh-plugin/src/prefix-edit.ts`（host 侧读写与校验）、`packages/core/src/editable.ts`（对象模型与校验纯函数）；改 `bridge.ts`（新增 5 条路由）；改 `client/panes/health.ts` + 新增 `client/panes/prefix-edit.ts` | 新增路由：`GET editableTargets`、`POST previewEdit`、`POST applyEdit`、`POST resetWrapper`、`POST unpin` | 写 `~/.memory-ops/personal/**` 的 frontmatter `title`/`pinned`；写 `~/.dsh-memj` 风格配置不适用，本插件用 `~/.memory-ops/.state/plugin-config.json`（新增） | A9–A13 | core：`editable.test.ts`（空标题/超限/隐私/只改目标字段）；plugin：`wiring.test.mjs`（5 条路由接上）、`wiring-ui.test.mjs`（编辑入口存在、保存前必须 preview） | 新增 | `bridge.ts:58`（ROUTES 表）；`docs/product.md` §2.3（"有路由没入口"是历史主要缺陷类型） |
| I5 | 新增"版本与更新"能力（R17–R24）—— **入口走宿主，我方只读结果 + 补差异** | 新增 `packages/dsh-plugin/src/version.ts`（读宿主版本区块结果 / 探测安装方式 / 拉 commits）、`client/panes/version.ts`；`bridge.ts` 新增 **2** 条路由 | 新增路由：`GET versionStatus`、`POST loadDiff`（若宿主版本区块读不到，降级 `GET selfCheck`） | 无写库；只读 `package.json`、`git`、GitHub commits；**不调用 pnpm、不实现 update operation** | A14–A21 / A24 / A25 | plugin：`version.test.mjs`（五项齐全、来源标注、失败不落"已最新"、无 `pnpm add` 调用）；`host.test.mjs`（宿主区块不可读 → `command-only`） | 新增（比自建方案少 2 条路由与 1 个状态机） | 截图：宿主插件页版本区块（`可更新到 0.86.0 · 发布于 2026-11-19`）；`dsh-context` README（更新靠 `dsh plugin update`）；DSH Releases（"插件管理支持更新第三方插件包；热更新失败会恢复旧版本"） |
| I6 | UI 结构：health 分区扩内容 + 两个二级页 | `client/panes/health.ts`、`client/pane-nav.ts`（**PaneId 不变**）、`client/panel.ts` | 无 | 无 | A1–A21 的界面部分 | `wiring-ui.test.mjs`：Hook 顺序（白屏防线）、每个新按钮都有调用点 | 修改 | `pane-nav.ts:37`（5 个 PaneId 固定）；`docs/product.md` §17.9（Hook 顺序白屏事故）、§19.4（按钮必须有实现） |
| I7 | 文档口径更新 | `docs/product.md` §12.3 / §21.5 / §21.6、`docs/README.md`、`README.md`、**缺失的 `docs/manual.md`** | — | — | — | `scripts/audit.mjs` 的 `doc-numbers` 规则会校验测试数，新增测试后文档数字必须同步 | 修改 | `docs/product.md` §15.3（维护约定：口径变更单开一节、文档数字必须真跑测试）；`README.md:204`（指向不存在的 manual.md） |
| I8 | 依赖判断：`.state/` 新增插件配置 | `~/.memory-ops/.state/plugin-config.json`（新增） | 无 | 新增配置文件（JSON），需纳入 `git`？**否**（属于本地状态，与 `events.jsonl` 同级） | A12 | core：`store` 不应感知它；plugin：读写失败要有结果条 | 新增 | `docs/product.md` §十一（`.state/` 放 append-only 事件与 misses，同层放插件配置合理） |
| I9 | **安装源决策**：git 直装 → npm 包（或 git tag） | `packages/dsh-plugin/package.json`（新增 `repository`/`publishConfig`）、CI 发布脚本、`README.md` 安装段、`docs/manual.md`（缺） | 无（宿主侧更新入口依赖安装源可解析） | 无数据变更 | A14 / A18 | 发布闸门：`npm pack --dry-run` 断言含 `lib/index.js` + `cordis.patch.yml`（`lib/` 不入库时的空壳包事故） | 兼容性破坏（安装方式变更，老用户需重装一次） | 截图：宿主版本区块只对可解析源显示"可更新到 X"；`dsh-memj` README（npm 安装 + 锁文件钉住版本的坑）；本仓无 tag（`git describe` 无输出） |

---

## 二、逐条影响详解（含为什么不这么做）

### I1 · 加 `toolschema` 桶：会改变顶栏数字，必须记账

- **为什么必须改**：`billedTokens = catalog + 171 + pinned`（`read.ts:318`），而两个工具的 description 与参数 schema
  每请求都在（`tools.ts` 注册的 `memory_recall` / `memory_write`）。不加这桶，顶栏数字**系统性偏低**。
- **为什么是"修改"不是"破坏"**：`overview` 只加字段；旧字段（`billedTokens` 等）保留，但**语义变了**
  （数值变大）。任何把 `billedTokens` 当"已知成本上限"的外部使用都要重读这个数——目前只有 UI，无外部消费者。
- **连带**：`docs/product.md` §12.3 的"常驻前缀 = ..."定义必须新增一节说明（C1），不能只改数字。

### I2 · `injected` 逐条化

- 现状：`resident.items` 里只有一条 `id: 'injected.pinned'`（`read.ts:293`），
  而 `renderPinnedSection` 早已按条生成 `- [id] title`（`pinned.ts:136`）——**数据够，只是被拍平了**。
- 风险点：`injected.pinned` 这个 id 若被 UI 或测试引用，会断。**已 grep 全仓**：
  仅 `read.ts:293` 一处命中，测试与 UI 均未引用（`Get-ChildItem packages -Include *.ts,*.mjs | Select-String 'injected.pinned'` 返回 1 行），
  因此改名的破坏面比预想小，但 UI 侧新增的"逐条渲染"仍需接线测试兜住。
- 顺带修一个旧问题：`injected` 现在只给总 tokens（`pinnedTokens`），而 `PinnedRender.ids` 有注入顺序却没被用上，
  拆条后可显示"顺序即优先级"（与 R14 的"超预算跳过靠后条目"对齐）。

### I3 · 去运行时数字：一次**会让现有测试变红**的行为变更

- 现有：`pinned.ts:156-158` 把 `另有 N 条…超出 ${maxTokens} tokens 预算未注入` 拼进段落。
- 为什么改：这段文本在系统提示词里，`N` 或 `maxTokens` 一变文本就变 → 前缀缓存作废
  （`docs/product.md` §21.4 实测单次 20–57 万 tokens；`dsh-memj` 把它列为硬规矩）。
- 处理的代价：用户从"模型能看到被跳过几条"变成"只在 UI 看到"。**这是用可观测性换缓存命中率**，需你拍板（Q5）。
- 兼容性破坏级别：模型侧文本变短/变化一次（发版时必然作废一次缓存，可接受）；此后**不再因库变化而变**。

### I4 · 编辑能力：新增 5 条路由 + 1 个配置文件

- 路由命名沿用 `bridge.ts` 的 exact-route 风格（`ROUTES` 表，`bridge.ts:58`），一条能力一条路由。
- 写文件路径必须经 `safeRelPath`（`bridge.ts` 已在锚点读取时用，`index.ts:76-83` 同款守卫）；
  编辑只允许写 `personal/**` 下的条目文件与本插件的 `plugin-config.json`，**不允许**写 `work/**`（越权风险）。
- 隐私闸门复用 `core/privacy.ts`（捕获与改正文两处已在用，见 `docs/product.md` §11.2）。
- **兼容性**：新增路由不影响旧路由；但 `wiring-ui` 的"路由全表测试"要求**每条路由必须有 UI 调用点**，
  所以 5 条路由必须全部接上，否则测试红（这正是我们想要的防线）。

### I5 · 版本与更新：执行权在宿主，我们只做"差异"这一层

- **新证据改了方案**：宿主插件页已渲染版本区块（截图：`可更新到 0.86.0 · 发布于 2026-11-19` / `1 个新版本` / `重新检查`），
  并且 DSH Releases 写明"插件管理支持更新第三方插件包；热更新失败时会尝试恢复旧版本"。
  所以**我们不自建下载/安装/回滚**（R22/R24），只做两件事：
  1. 读宿主结果并展示（`host-managed`）；
  2. 拉 commits 给出"改了什么"（宿主只给发布日期，不给提交）。
- **降级路径**：宿主读不到版本区块（旧宿主 / headless / 不可解析安装源）→ `command-only`，只给命令 + "需重启"。
- **`link` 安装**永远 `blocked`（软链不会被替换，更新会覆盖正在改的代码）。
- **风险**：`git` 直装且带 `#path:packages/dsh-plugin` 时，命令的 ref 语法要正确
  （`README.md:167-176`：`#path:` 必须在 `&` 之前）；版本卡生成的命令必须照这个格式，否则用户复制后装错。
- **未核实**（决定成败）：宿主对 `github:` 直装是否也渲染版本区块。若否，则只能靠 I9（发 npm / 打 tag）解决，
  否则 3.3 永远停在 `command-only`。

### I9 · 安装源：从 git 直装改为 npm 包（或 git tag）

- **为什么这是 3.3 的前置**：实测确认 `parseInstallSpec()` 把 git 与 path 归为 `git` / `path`，
  host 的 `listVersions()` 对 `git` **直接返回 `not-updatable`**（连 registry 都不查）。
  **打 tag 无效**（`#path:…&v0.2.0` 仍判 `git`）——只有发布到 npm（`kind: registry`）才会列版本。
- **代价**：老用户要重装一次（安装方式变更）；仓库需补 `publishConfig`、发布脚本、`npm pack --dry-run` 闸门。
- **仓库现实**：`packages/dsh-plugin/lib/*` 已入库但被 `.gitignore` 例外允许，`npm pack` 会带上——
  但**必须断言打包内容**，否则会出现"从 git 克隆打包是空壳"的那类事故（`dsh-memj` README 记录的教训）。

### I6 · UI 结构：不新增一级分区

- `PaneId` 是联合类型（`pane-nav.ts:37`），新增一个值会连带改 `panel.ts`、跳转逻辑、`requestPane` 的所有调用方；
  而本次三个视图都属于"成本与自身健康"，放进 `health` 最自然。
- 必须守的两条老教训：所有 hook 提到 early return 之前（§17.9 白屏）；每个按钮必须有真实调用点（§19.4）。

### I7 · 文档：三处必须同步，一处是补缺

| 文档 | 动作 |
|---|---|
| `docs/product.md` §12.3 | 新增"四桶口径"说明，不覆盖旧节（遵守 §15.3） |
| `docs/product.md` §21.5 | 改"超预算写进段落"的设计描述，注明"已改为固定文案 + UI 展示" |
| `docs/README.md` | 「常驻前缀 = 90+100+171+置顶」的式子要加 toolschema，并写总预算 1024 |
| `README.md` | 「预算 256 tokens」需写明"总预算 1024，其中置顶段落 256" |
| `docs/manual.md` | **文件不存在**，但 `README.md:204` 已引用它 → 必须补（至少含"如何更新"一节） |

---

## 三、回归范围（改完必须重跑）

| 层 | 范围 | 为什么 |
|---|---|---|
| core 单测 | 全量（现 14 个文件，含 `pinned.test.ts`、`actions.test.ts`、`store.test.ts`） | I2/I3 改的是 core 纯函数；`pinned.test.ts` 必红 |
| core 类型 | `pnpm typecheck` | `ResidentItem` 新增字段与 `kind` 枚举扩展 |
| plugin 单测 | `host.test.mjs`（overview 形状）、`wiring.test.mjs`（路由数/注册）、`wiring-ui.test.mjs`（接线与 Hook 顺序） | 新增 **7 条**路由（编辑 5 + 版本 2），路由全表测试会要求 UI 调用点 |
| 静态审计 | `pnpm run static-audit` | `doc-numbers` 会校验文档里的测试数；新增测试后必须同步 |
| 真实渲染 | 用 `web` profile 起 GUI 截图（`docs/product.md` §17.14 的验证环境） | 四桶明细与编辑页都是新组件，`tsc` 与单测都测不出"画面对不对" |
| 数据安全 | 编辑后 `git diff ~/.memory-ops` 只应出现目标字段变化 | I4 的写入路径是本次唯一"会改用户数据"的地方 |
| **打包闸门**（若走 I9） | `npm pack --dry-run --json` 断言含 `lib/index.js` / `lib/client.js` / `cordis.patch.yml` | 只断言"产物存在"，不断言 `files` 字段——否则空壳包能被发出去 |

## 四、未核实项（阻塞项，不当成已验证）

| 项 | 状态 | 影响 | 处置 |
|---|---|---|---|
| 宿主对 `github:` / `link:` 直装是否渲染版本区块 | **已核实**（2026-11-21，见 `../research/host-version-block-verification.md`） | `git` → 宿主 `listVersions()` 直接 `not-updatable`（理由 "installed from Git, which lists no versions"）；`path/link` → 无版本可比。**只有 registry（npm）能拿到"可更新到 + 发布日期"** | 3.3 落 `not-updatable` 人话 + 命令；要 `host-managed` 必须发 npm（I9） |
| 宿主是否提供"插件版本 / 安装清单"给插件读取 | **未核实**（`app.asar` 未解包检索） | R17 的"安装方式/目标"可能只能从 `package.json`+路径推断 | 需求写成"探测 + 降级"，不假设存在 |
| 宿主版本号可编程获取方式 | **未核实** | R20 兼容性检查可能做不了 | 降级为"显示目标声明 + 手动确认" |
| 本机代理环境下 GitHub API 可达性 | **未实测** | R19 失败态是常态 | 失败态必须给原因（本次已设计） |
| `dshmarket` 未安装 | **已核实**（profile 无该依赖） | 只影响"批量更新多插件"，不影响本插件主路径 | 需求不依赖它 |
| 「1 个新版本」下拉能否选具体版本 | **未核实**（截图未展开） | 若不能选，则"回退到某版"仍要靠命令 | 需求不承诺"版本选择器" |
| mermaid 语法可解析 | **未实测**（本机无 CLI） | 若不可解析，评审会卡 | 交付前用 mermaid 校验一次（见 `confirmation.md` §四） |
| 原型的浏览器行为 | **未实测** | 交互 bug 只能在真机发现 | 标注"需实测"，不写成"已验证" |

## 五、需同步更新的文档清单

1. `docs/product.md` — §12.3（口径）、§21.5（段落文案）、新增一节"§22 常驻前缀透明化"记错与改法
2. `docs/README.md` — 一页总结里的常驻公式与预算说明
3. `README.md` — 预算 256 → 两层预算；**安装段（若走 I9 改为 npm）**；新增"更新"一节；修正 `manual.md` 死链
4. `docs/manual.md` — **补齐**（安装 / 开发时更新 `pnpm build`+刷新 / 使用者更新走宿主版本区块 / 卸载 / 各系统路径；当前不存在）
5. `requirements/resident-context-update/confirmation.md` — 你确认后的结论回填（A1–A20、Q1–Q15）
6. `docs/architecture-review.md` 或 `docs/refactor-report.md` — 若路由数从 34 变 41，需同步（这两份文档含架构/重构记录）
7. `requirements/resident-context-update/README.md` — "一分钟结论"里关于更新的一段（已按新证据改）