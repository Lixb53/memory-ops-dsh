# 5b 独立评审 · 记忆库 v9（第 1 轮）

> 评审者：`critic`（只读子代理，非主代理自评）。按需 reviewer 规则：**只跑一轮**，返工后不再复审；
> 下面 §一 是评审原文，§二 是主代理逐条处置（含未处置项与理由）。
> 评审期间产物冻结，处置在评审结束后执行；处置完只重跑机检，不申请第二轮。

---

## 一、评审原文

### 四维打分

| 维度 | 分数 | 依据（摘要） |
|---|---|---|
| 方向一致性 | **6** | 三栏 212/946/360、双车道带、墨块唯一、零圆角、T0 只给数字已落成（`metrics.json` 12 例一致）；但左轨底色改成 `bg-module-platform` 后未回写 `brief.md:60` / `tokens.json:79`，深色下检视栏成了全屏最亮块，与「纸面=最亮一档」相反；契约禁止的蓝实底类仍留在样式表。 |
| 层级与信息传达 | **5** | 首屏能回答「点哪里」，但同屏报数互相打脸：todo 页 `t0Text="8"` 与 `ledeText="10 件压着"` 并存；检视栏副标题与属性表前两行同义重复；记忆页每行来源与状态各出现两次。 |
| 执行完整度 | **3** | 左轨 5 个分区点了没反应（`.tab` 无 `data-*`、委托选择器不含 tab、`go-capture/goto` 是唯一入口）；`#pane-host` 可聚焦却不在焦点环名单；类型签无监听；搜索按钮空转；防重复提交被 rerender 抵消。 |
| 原创性 | **6** | 声明 a「检视栏常驻」真兑现；b「diff 上下叠」结构兑现；c「72px 窄带 + 桶堆叠 meter」只兑现窄带，meter 退化成 2 段「可动/不可动」。 |

**门禁结论：不通过**（含维度 ≤4，且 P0 ×2）。

### 问题清单（P0/P1）

| 编号 | 严重度 | 位置 | 问题 |
|---|---|---|---|
| A1 | P0 | `index.html:35-57` + `app.js:328` | 左轨 5 个 `role="tab"` 无 `data-*`，委托列表无 tab，`MO.goto` 只能被面板内按钮与 Alt+方向键调用 → 唯一全局导航不可点；`measure-v9.mjs` 的 `#tab-health` 点击也是空操作且不报错 |
| A2 | P0 | `pane-health.js:99` / `:60` + `measure-v9.mjs:155` | V3 检视栏只由 `sel.health==='version'` 触发，但没有任何元素产出该 select 值 → V3 在界面上不可达；验收截图实为上一用例残留的 V2 编辑态，证据不成立 |
| A3 | P1 | `app.js:66-82` / `:129-134` | `ledeFor`/`figureFor`/band 不看 `empty`：空态下 T0 仍 3、判定句仍「3 件要动手」，而中栏写「没有压着的事」 |
| A4 | P1 | `app.js:130-134` | error 态 T0 为 `—`，但 band 仍写「四桶 229 / 229 tokens」 |
| A5 | P1 | `app.js:69` vs `:79`、`data.js:28-30` | 待办判定句硬写「10 件压着」，T0 = 2+5+1 = 8，首屏 R1 级合计被破 |
| A6 | P1 | `app.js:441-450` + `pane-health.js:207-212` | 深链进 `#health/error` 沿用上一屏编辑态，错误态下仍有可点的「保存」 |
| A7 | P1 | `pane-capture.js:136-151` | `capturePending` 从未被渲染读取，重渲染出的按钮仍可点 → 防重复提交形同不存在 |
| A8 | P1 | `pane-capture.js:30` + `app.js:328` | 类型签带 `aria-pressed` 但无监听，选中态永远是「决策」 |
| A9 | P1 | `pane-memory.js:58-59` + `app.js:279` | 搜索按钮只播报，输入值不入 `state.query`，清单不变 |
| A10 | P1 | `pane-todo.js:79-81` + `app.js:254-260` | 驳回理由 textarea 无监听，`reject` 不校验非空 |
| A11 | P1 | `pane-health.js:99-100` / `:202-205` | 保存后 `edit=null` 先于渲染，`ctx.saved` 只在编辑态输出 → 回执永远不可见 |
| A12 | P1 | `pane-health.js:174-178` | 未改动时仍画「删一行 + 加一行」的同文本 diff，Δ 0 → 假改动 |
| A13 | P1 | `pane-health.js:169-170` vs `data.js:78` | 编辑态 `estTokens(name)=18` 与桶数据 `tokens:30` 两套口径，保存后桶数无法复算 |
| A14 | P1 | `index.html:32-76` + `app.js:386-387` | tablist 里混入 9 个调试按钮；垂直 tablist 的 ↑/↓/Home/End 缺失 |
| A15 | P1 | `app.css:214` vs `:941-956` | `.center` 不在焦点环名单，`#pane-host` 被聚焦时无可见环 |
| A16 | P1 | `app.css:120`/`:558` + `tokens.json:79-80` + `brief.md:60` | 左轨与检视栏用 `bg-module-platform`，深色下比纸面亮两档 → 「纸面最亮」反转；三处真相源互相矛盾 |
| A17 | P1 | `pane-health.js:33-39`/`:51` | `fixed` 把 `toolschema(null)` 当 0 并入框架 171，同一段又写「不含工具 schema」 |
| A18 | P1 | `pane-health.js:41-52` vs `brief.md:173`/`tokens.json:189-191` | meter 只有 2 段，契约说「四桶堆叠」；且 brief 与 tokens 对「meter 编码占比还是可动性」两说 |
| A19 | P1 | `pane-memory.js:37`/`:40` | 记忆页来源列与 meta 各出现一次路径，状态也重复 |
| A20 | P1 | 四个 pane 的 `sub` | 检视栏副标题与属性表前两行同义重复，320 宽顶部被浪费 |
| A21 | P1 | `tools/lint-anti-slop.ps1:125` | lint 只查 `MO.mastCopy(`，v9 用 `MO.lede(` → 判定句长度实际未被机检 |
| A22 | P1 | `app.css:490-493` + `assert-structure.ps1:134` | `.btn-primary`（蓝实底）仍在样式表，且机检把它列为必须存在的类 → 与 §二 正面冲突 |

（P2 18 条见评审原文，摘要：外壳内边距与预算表不符、2px 间距不在档位、焦点环第三种 offset、空 foot、成本面未排序却写「按体积排」、顶条第 4 槽恒空、非表格页数字列无标注、`fold-budget` 文案与行为不符、浮层墨块与页面墨块同屏、错误下一步指向不存在的「刷新」、Enter 死代码等。）

### 需实测项（12 条，评审只读无法验证）

点击类是否真的「点了有反应」、连点两次的写入次数、`reduce` 下骨架的可辨性、检视栏替换的 CLS、
`.insp-body` 与整页溢出、深色下其余对比组合、5 页 × 4 态全量、浮层焦点陷阱、`line-clamp` 与 `line-break: strict`
在 Safari/Firefox 的折行、1614 以外尺寸、宿主真实别名与 `tokens.css` 是否逐字一致、机检脚本退出码。

---

## 二、处置（逐条）

| 编号 | 处置 | 落点 / 验证 |
|---|---|---|
| A1 | **已修** | 5 个 tab 加 `data-pane`，委托列表加 `[data-pane]` 分支调 `MO.goto`；`measure-v9` 每例先回 `about:blank` 再进目标 hash（隔离状态） |
| A2 | **已修** | 中栏「版本与更新」改成可选中的桶行（`data-select="version"`），五项移入检视栏；`href` 用例改为点该行，点不到即 FAIL |
| A3 | **已修** | `ledeFor` / `figureFor` 增 `empty` 分支（T0=0、判定句「现在没有压着的事」等 5 条），band 显示「0 条置顶 · 没有每请求成本」 |
| A4 | **已修** | band 在 `error`/`loading` 下数字显示 `—`、文案「读不到：这一带的数字显示为 —」 |
| A5 | **已修** | 待办判定句改「8 件压着，先清待拍板」，与 T0（2+5+1）同源 |
| A6 | **已修** | `applyHash` 与 `goto` 一样清 `edit/saved/done/captureError/todoDone`；`inspectEdit` 在 error 态给「阻断」条并禁用保存；返工时又统一了 error/empty 的检视栏文案（不再展示缓存条目，避免用旧内容冒充新事实） |
| A7 | **已修** | `renderCapture` 按 `ctx.capturePending` 渲染 `disabled` + 「写入中」 |
| A8 | **已修** | 委托加 `[data-kind]` 分支写 `state.kind` 并重渲染 |
| A9 | **已修** | 搜索读 `#memorySearch.value` 写 `state.query`，按标题/路径/证据过滤；无结果用空态并提供「清掉关键词」 |
| A10 | **已修** | `#reasonInput` 绑 input 写 `state.reason`；`reject` 在理由为空时 `aria-invalid` + 就地阻断 + 播报 |
| A11 | **已修** | `inspectHealth` 顶部统一渲染 `ctx.saved` 回执（含路径与行数） |
| A12 | **已修** | `draft === original` 时只显示「未改动：逐字一致（Δ 0），不画假 diff」 |
| A13 | **已修** | 数据侧 tokens 改为按 `estTokens` 逐字估算（18 / 15 / 骨架 32），桶 65、常驻 236；顶栏/桶/合计/编辑态四处同源 |
| A14 | **已修** | `.rail-foot` 移出 `role="tablist"`（nav 只包 5 个 tab）；`keydown` 对 `role=tab` 处理 ↑/↓/Home/End |
| A15 | **已修** | `.center` 加 `outline: 2px solid business-primary`，并进焦点环 offset 名单（`-1px`） |
| A16 | **已修** | rail/insp 改 `color-mix(in srgb, bg-base 94%, label-primary 6%)`（浅色变暗、深色变亮，同一档）；`brief.md §二` 与 `tokens.json` 同步回写 |
| A17 | **已修** | `fixed` 只累加 `frame`；toolschema 不进百分比，legend 标「— · 不可读」，合计行写明「不含工具 schema」 |
| A18 | **已裁** | 裁决：meter **按桶分段编码占比**，颜色只编码「可动（蓝）/动不了（灰）」；四桶都在 legend，不可读桶不入百分比。`tokens.json` 的 `$rule` 已按此改写，brief 同步 |
| A19 | **已修** | 记忆页加「归属」列（个人域/工作域/项目概要/坑与问题/架构/约定），路径只在检视栏；meta 只留锚点与证据 |
| A20 | **已修** | 四页检视栏 sub 改为「清单里看不到的那一条」（来源路径 / 分组），状态与体积只留在属性表 |
| A21 | **已修** | lint 把 `MO.lede(` 纳入判定句长度检查（保留 `mastCopy` 兼容） |
| A22 | **已修** | 从 `app.css` 删掉 `.btn-primary` 全部规则（165/165 花括号配平校验通过），并从 `assert-structure.ps1` 的必检类列表移除 |
| A23 | **已修** | 每例 `about:blank` 隔离；`clickStrict`/`typeStrict` 取不到元素或抛异常即记失败（不再静默）；新增 `inspOverflow` 与 `pageOverflow` 断言 |
| A24 | **已裁并改文档** | 外壳实测 `padding: 0 0 24px`，主区 776px；brief §零 改为实测口径并说明顶条 72px 自带留白 |
| A25 | **已裁** | 2px 作为「发丝级间隙」正式写进 brief §四（仅限行内基线与 meter 段间），不再算档位 |
| A26 | **已修** | 焦点环 offset 统一为 `2px` / `-1px` 两种 |
| A27 | **已修** | `insp.foot` 为空时 `inspFoot.hidden = true`，并补 `.insp-foot[hidden]{display:none}` |
| A28 | **已修** | 成本面按体积降序，副文案与行为一致 |
| A29 | **已修** | 删 `#actionSlot` 死槽；品牌第二行改为当前分区名，scope 移到状态条 |
| A30 | **已修** | 今天/待办/记一条的 section 说明补「右列 tokens」，记忆页用表头 |
| A31 | **已修**（第 2 次返工时补） | 桶检视栏底部按钮文案改「折起顶带」，与行为一致 |
| A32 | **已修** | 浮层主操作改 `btn-ghost`，同屏只保留一个墨块 |
| A33 | **已修** | 错误下一步改「点下面的『重试』」；删 `captureEmpty` 死字段 |
| A34 | **已修** | 删掉 `#captureText` 的 Enter 死分支，键盘模式只保留 tablist 方向键与 Esc |

**未处置项：无。** 34 条全部处置（其中 A18/A24/A25 是「裁决 + 回写契约」，不是纯代码改动）。

**返工后机检（不申请第二轮评审）**：`lint-anti-slop` 0 hit、`assert-structure` 0 violation、
`measure-v9` 0 failure（12 用例，含新增 `inspOverflow`/`pageOverflow` 与严格点击）。

---

## 三、本轮暴露的方法问题（写下来防复发）

1. **「点了没反应」又一次出现在最显眼的地方**（左轨导航）。docs/product.md §19 记过同一类缺陷（`?.()` 把
   未接线伪装成静默），这次是「委托选择器漏了一类元素」。机检能查结构，查不出「有没有人监听」——
   所以 `measure-v9` 从现在起对每个点击断言存在性，断言失败即计入失败数。
2. **验收脚本自己会撒谎**：hash-only 导航不重载页面、点击失败被吞掉，于是 12/12 通过而三张图是错的。
   验收工具的失败模式必须和被测代码一样被审。
3. **契约与实现的三处真相源（brief / tokens / 截图）会互相打架**。这次靠评审发现（A16/A18），
   下次应在改 CSS 的同一提交里回写 brief 与 tokens。