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

---

## 四、v6 第 1 轮评审后的补记（2026-11-19）

critic 第 1 轮判 **不通过**（功能性 4/10 + 三项 P0），报告见
[`5b-v6-round-1.md`](5b-v6-round-1.md)。补记新增的机器闸门与修复：

| 新增闸门（wiring-ui.test.mjs） | 挡住什么 |
|---|---|
| 「客户端引用的每个 dmo-* 类都在 styles.ts 里有定义」 | v4 删光 `.dmo-remember-*` 导致弹窗「挂载了但不可见」；此前只有手动脚本，没有 CI |
| 「/remember 浮层 11 类必须全在 + 遮罩必须 fixed/inset:0」 | 同上，且挡住「类在但遮罩不是全屏」这种半修 |
| 「尺寸令牌挂在所有插件根上」 | 令牌只挂 `.dmo-root` 时，会话 tab 与 portal 浮层拿不到 `var(--s4)/--accent` |

修复清单（全部已落码）：

- **P0-1 死按钮**：today 建议卡次动作、memory 三个空态出口、todo 两个跳转出口，
  原先只带 `data-action` 测试钩子没有 `onClick`——点了没反应。
  现在分别走 `onOpenDetail` / `gotoPane` / `requestPane`。
  连带修掉一个更深的 bug：today 页把 `first.id`（点分 `personal.principles`）
  传给 core 的 confirm/detail，而 core 要的是 `path`（`personal/principles.md`）——
  「确认这条」必然 ENOENT。
- **P0-1 容器**：插件端四个分区的台账原先裸铺在面板底上，行间只靠 `border-l1`
  （浅色 4% 黑，肉眼不可见）分隔——正是 §零点名的 v5 根病，且让「已评审的原型」
  与「实际交付的插件」是两套界面。现在每段装进 `.dmo-card-heavy`（每屏 ≤1）
  或 `.dmo-card-quiet`，`border-l1` 只在卡内出现。
- **P0-2 深色主按钮对比**：宿主实测 `label-on-color` 两套主题都是白色，
  深色蓝底白字 ≈2.3:1 不达标。文字改 `bg-base`（浅=白 ≈4.6:1 / 深=近黑 ≈9:1），
  hover 不再切更亮的 `button-info-hover`，改 `brightness(0.92)`。
  **方向卡 §二/§七-3 原句是事实错误，已修正**（经用户「落地 v6」授权范围内的纠错）。
- **P0-3 护栏缺失**：见上表。
- P1-1 reduced-motion 覆盖 portal 浮层；P1-2 内联编辑提交降次按钮（消除同屏 2 处蓝实底）；
  P1-3 可撤销 toast 活满 30s（原 5s 自动消失 = 伪造承诺）；P1-4 原型圆角档统一为
  `--r-container`（`--r-card` 是漂移源）；P1-5 原型弹窗补焦点移入/回焦。
- Quick wins 全部完成：账带 6px→s1、nav gap/padding 归 4 倍数、focus offset 统一 2px、
  浮层字号 18/15px→字阶、`marginTop: 7`→`var(--s2)`、notice 圆点→6px 方点、
  列表补 `role="list"`（`list-style:none` 会让 Safari+VoiceOver 剥掉列表语义）。

验证：core 252 + 插件 88 全绿（含 3 项新闸门）、tsc 0 错、
类名审计双向 0 缺失、8 条状态分支渲染通过、明暗两套截图目测通过。
