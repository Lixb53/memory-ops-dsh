# 5a 自查 · 记忆库 v9（三栏工作台 · 双车道）

> 主代理自查，不是独立评审。独立评审（critic，一轮）见 [`5b-v9-round-1.md`](5b-v9-round-1.md)：
> 四维 6 / 5 / 3 / 6、初审判**不通过**（P0 ×2），34 条问题已全部处置，返工后只重跑机检、不申请复审。
> 契约：[`design/brief.md`](../design/brief.md) · 令牌：[`design/tokens.json`](../design/tokens.json)
> 画布：1614×900 主区页面 · 时间：2026-11-21

## 一、机检（三条命令，返工后全部 0）

| 检查 | 命令 | 结果 |
|---|---|---|
| 审美规则 | `pwsh -File tools/lint-anti-slop.ps1 prototype/` | **0 hit**（11 文件；判定句规则现同时查 `MO.lede(` 与 `MO.mastCopy(`） |
| 结构规则 | `pwsh -File tools/assert-structure.ps1 prototype/index.html prototype/app.css` | **0 violation**（8 js / 1 css；必检交互类已移除 `.btn-primary`） |
| 真机量测 | `node scripts/measure-v9.mjs` | **0 failure**（12 用例；每例先 `about:blank` 隔离，点击取不到元素即 FAIL） |

量测断言：三栏 212/946/360 + gap 24、每页 1 个 T0、判定句 ≤20 字单行、标题列 ≤720、
`paneOverflow=0 且 pageOverflow=0`、`inspOverflow=0`、双面切换行高不变、diff 上下叠、error 保留 5 个 tab、
深色 T0 对比 17.5:1、无白屏。产物：`prototype/shots-v9/`（13 张 PNG + `metrics.json` + `contact-sheet.png`）。

## 二、lint 管不到的 4 项（方向卡前置防住，交付结论）

| 项 | 结论 |
|---|---|
| **字体身份策略** | 系统栈（PingFang SC / 微软雅黑），不引 Web 字体；数字/路径/token/日期一律 `--mono` + `tabular-nums`。JPG 截图里 `236 / 171 / 65 / 4,987 / 5c44d95` 均为等宽，T0 与表格数字列基线对齐。 |
| **圆角节奏** | 0 覆盖行/带/轨/表/meter/刻度；6 只给按钮/输入/类型签/双面开关；10 只给 `/remember` 浮层。截图无「都圆一点」的中庸感，也无卡片外框。 |
| **动效触发条件** | 只有用户动作触发：hover/选中 120ms、检视栏内容 180ms（opacity，无位移）、骨架 1.2s 呼吸。无进页播放、无滚动 fade-up、无 hover scale。`reduce` 全关 + 静态替代指示（选中 2px 刻度即时出现 + 骨架静止可辨 + 「读取中」）。 |
| **模板化 hero** | 没有 hero。顶条 72px = 品牌 + 分区名 + 一句判定 + 一个读数，零实底色块，靠 1px 线收口；全页最重的视觉是 meter 上「你能关」的那 65 tokens。 |

## 三、评审后返工的关键改动（34 条，摘要见 5b §二）

- **两个 P0**：左轨 tab 加 `data-pane` 并接入委托（原来点了没反应）；「版本与更新」改为可选中的桶行，V3 检视栏第一次真正可达。
- **口径统一**：常驻 236 = 框架 171 + 置顶 65（骨架 32 + 两标题 33）；数据里的 tokens 改成按 `estTokens` 逐字估算，
  顶栏 / 桶 / 合计 / 编辑态 Δ 四处同源；待办 T0=8 与判定句「8 件压着」一致。
- **四态不再撒谎**：empty 换读数与判定句、error 的 band 显示 `—`、error 下禁保存。
- **假承诺清掉**：类型签、搜索、驳回理由、防重复提交全部接上真行为；未改动时不画假 diff。
- **契约回写**：两侧面底色改 `color-mix`、meter 语义裁决、2px 发丝档、`.btn-primary` 移除，四处一致。

## 四、未验证项（诚实声明，不写成已验证）

- **真实宿主内嵌未验证**：原型是独立 HTML，插件端仍是 v7，移植未做（与 v8 同口径的已知不一致）。
- **S2 会话 tab / S3 右侧捕获未设计**：本轮只做 S1 主工作区；`/remember`（S4）只有浮层形态。
- **400px 侧栏降级态未实现**（v8「校样栏」窄版留作降级）。
- **数据是快照**：42 条 / 236 tokens 来自 `docs/product.md` 与 `pinned.ts` 口径重算；V3 的宿主可读态（0.4.0 / 7 条差异）是原型开关模拟。
- **未跑屏幕阅读器**；未在 Safari/Firefox 验证 `line-clamp` 与 `line-break: strict`；1614 以外尺寸未测。
- **连点两次「存进去」的实际写入次数**：代码已按 `capturePending` 禁用，但没有真机连点计数（需实测）。

## 五、单文件行数（≤1000）

`app.css 987`（接近上限，下次加规则先拆文件）`/ app.js 544 / pane-health.js 312 / data.js 260 / index.html 140 / pane-memory.js 146 / pane-capture.js 161 / tokens.css 125 / ui.js 110 / pane-todo.js 101 / pane-today.js 93`。