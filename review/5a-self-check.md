# 5A 禁止清单自检 · v6 落地

> 逐条核对「禁止清单」+ 方向卡 v6 自加禁令。
> 范围：`packages/dsh-plugin/src/client/styles.ts`（v6 重写）、
> `panel.ts` / `panes/today.ts`（KPI 账带）、`remember.ts`（弹窗 CSS 回归锚点）、
> `prototype/`（v6 移植：tokens.css / app.css / ui.js / pane-today.js）。
> 核对时间：2026-11-19。

## 一、禁止清单（Anti-Slop）

| 条目 | 命中？ | 证据位置 | 处置 |
|---|---|---|---|
| 紫/靛强调色、紫蓝 hero 渐变 | 否 | styles.ts 强调一律 `--dsw-alias-state-business-primary`；violet 仅 `state-done` 徽标方点（宿主语义色，非自选） | — |
| 全屏紫→粉→蓝渐变背景 | 否 | styles.ts 无 linear-gradient 背景（grep 0 处） | — |
| bg-clip-text 渐变字 | 否 | grep `-webkit-background-clip` 0 处 | — |
| 极光色块 / glow 彩色阴影 | 否 | box-shadow 仅 3 处：`.dmo-overlay-card` / `.dmo-remember-card` / `.dmo-remember-toast`，值全部由 `--dsw-alias-bg-mask-1` 派生 | — |
| #0D1117 默认暗底 | 否 | 暗色由宿主 `body[data-ds-dark-theme]` 驱动，插件零字面色 | — |
| 赛博霓虹 | 否 | 无霓虹色相 | — |
| Inter/Geist 单字体无第二身份 | 否 | 继承宿主 UI 字体 + `--mono` 等宽第二身份（styles.ts L40） | — |
| 单字重单字号 | 否 | 5 档字阶 + 400/600 两档（styles.ts L28-33） | — |
| gray-400/500 作正文 | 否 | 正文一律 `label-primary`；徽标文字也强制 primary（v6 §七-2 裁决），彩色只进 tint 底与方点 | — |
| 全元素同一圆角 | 否 | 四档按语义：0 徽标 / 6 控件 / 8 卡片 / 12 浮层（styles.ts L36-39） | — |
| 圆角卡 + 左彩边 | 否 | `.dmo-anchor-note` 彩边已改为整块 tint + 描边（styles.ts 623-631） | 已修 |
| 卡片嵌套卡片 | 否 | 卡内是行（`.dmo-row` 无卡样式）；`.dmo-more-body` 是 tint 块非卡 | — |
| 固定三卡网格 + 圆角图标 | 否 | KPI 账带是数据格（数字随数据变，非营销卡），无图标 | — |
| Bento 用于一切 | 否 | 账带仅 1 条/页，其余线性台账 | — |
| 玻璃拟态堆叠 | 否 | 无 backdrop-filter | — |
| Emoji 作结构图标 | 否 | 状态=方点+文字徽标；折叠=▸ 字符（通用心智模型，非 emoji） | — |
| 每卡 hover scale | 否 | hover 只换底色/描边 | — |
| 滚动 fade-up | 否 | 动画仅 `dmo-fade`（浮层进出）与 `dmo-breathe`（骨架），全部动作触发或状态必需 | — |
| 忽略 prefers-reduced-motion | 否 | styles.ts 末尾媒体查询全关（含骨架）；prototype/app.css 同 | — |
| 只做 happy path | 否 | 四态在 IA 文档逐页列出；原型控制台可切换；插件端 loading/error/empty 分支齐（today.ts L212-232 等） | — |
| 假数据 | 否 | 原型数据来自真实库快照（data.js 头注） | — |
| eyebrow+大标题+双CTA hero | 否 | 首屏=账带+一句话结论+单一主动作 | — |

## 二、方向卡 v6 自加禁令

| 条目 | 命中？ | 证据 | 处置 |
|---|---|---|---|
| §八-1 一屏 ≤1 张重卡 | 否 | today：`.dmo-suggest` 唯一 card-fill+l3；capture/todo/health 各 1 张 | — |
| §八-2 `.dmo-row` 语义唯一 | 曾命中 | v4 把台账行与横排行共用 `.dmo-row`（后写 flex 覆盖行布局） | 已修：横排改 `.dmo-hrow`（remember.ts ×2、session-view.ts ×1、ui.ts ×1） |
| §八-3 `.dmo-remember-*` 回归锚点 | 曾命中 | v4 重写时 11 个类被删 → 弹窗不可见（用户报的 bug 根因） | 已修：styles.ts 补回全块；class-audit 0 缺失；bundle 验证含 `.dmo-remember-backdrop/card/toast` |
| §八-4 术语用户语言 | 否 | 「等你补/压着/拍板」沿用 | — |
| §八-5 首屏数字可行动 | 否 | 账带 4 格全部 `goto` 可点（today.ts trailLine） | — |

## 三、可达性抽查

- 徽标文字 label-primary + 方点 + tint 底：styles.ts `.dmo-tag` 块 ✓
- 主按钮蓝底 `label-on-color`：`.dmo-btn-primary` ✓（浅色白字 on deepseek-500 ≈ 4.6:1）
- 焦点环：outline 2px 业务蓝，无 `outline: none`（capture-input 例外有 :focus-within + 底色补偿）✓
- 状态不只靠颜色：全部徽标带文字 ✓
- reduced-motion：styles.ts / app.css 末尾块 ✓

## 结论

禁止清单未清零项：**0**。两处「曾命中」均已修复并有回归锚点（class-audit 脚本 + wiring 测试）。
可触发 5B。
