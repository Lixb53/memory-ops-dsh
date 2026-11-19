# 设计方向卡 · 记忆库 v6

> 本文件是 v6 的**唯一视觉契约**，取代 v5（原文见 `design/archive/direction-card-v5.md`，
> v4 见 `design/archive/direction-card-v4.md`）。
> `prototype/`、`packages/dsh-plugin/src/client/` 下所有界面必须逐条遵守。
>
> 锁定时间：2026-11-19。v6 在 v5 的 token 基础上换形状语言；
> 用户裁决：「落地 v6」（2026-11-19）。

---

## 零、为什么改版

v5 解决了「太素」（用宿主真实 token 替换隐形别名），但仍是「一屏 6 张等权卡片」，
信息密度低、节奏平均。v6 的目标：**同一屏多放 40% 内容，且第一眼更清楚**。

诊断记录见 `design/archive/direction-card-v5.md` §零（宿主浅色下
bg-layer-1/2 全白、border-l1 隐形、brand 近黑）。v6 不改这套结论，只在其上换语言。

技能依据（ui-ux-pro-max · Data-Dense Dashboard，density 8/10）：
KPI 卡带、数据表格、8–12px 密排、数字右对齐基线、hover 行高亮；
ux 域硬性要求「状态不许只靠颜色，徽标必须带文字/符号」。

---

## 一、风格定位：**密排档案台（Data-Dense Ledger）**——明确选一个，不含糊

一句话：**一条 KPI 账带 + 可见描边的档案卡 + 36px 定高台账行，蓝色是唯一强调。**

| 手法 | 落点 |
|---|---|
| KPI 账带 | 今天页首屏：单条 4 格，数字等宽右对齐同一基线，首格数字用业务蓝 |
| 分段导航 | 轨道 = bg-module-platform + border-l2；选中 = bg-base 白底浮起 + border-l3 + 600 |
| 卡片 | card-fill 真灰底 + border-l3 描边；静卡用 bg-module-platform + border-l2 |
| 台账行 | 36px 定高、8px 内边距、hover 换 card-fill-hover；数字列右对齐 tabular-nums |
| 状态签 | tint 底 + 6px 方点 + 文字（文字一律 label-primary，颜色只做加速识别） |

### 明确拒绝（写下来防漂移）

- ❌ 玻璃拟态 / blur / 彩色阴影 glow。
- ❌ 紫-蓝渐变、bg-clip-text 渐变字。
- ❌ Emoji 作结构图标；结构性标记一律等宽文字签。
- ❌ 卡片 hover scale / 滚动 fade-up；动效只由用户动作触发。
- ❌ 等权卡片墙：一屏最多 1 张「重卡」（card-fill + border-l3 + 主操作）。

---

## 二、色彩策略（全部宿主 token，值见 §五）

| 角色 | token | 规则 |
|---|---|---|
| 面板底 | `--dsw-specific-sidebar-fill`（兜底 bg-base） | 比卡片深一档 |
| 重卡底 | `--dsw-alias-card-fill`（兜底 bg-layer-1） | 每屏 ≤1 |
| 静卡底 | `--dsw-alias-bg-module-platform`（兜底 bg-layer-1） | 其余容器 |
| 行 hover | `--dsw-alias-card-fill-hover`（兜底 bg-layer-2） | 只给可点行 |
| **强调蓝** | `--dsw-alias-state-business-primary` | 主按钮实底、选中态、链接、KPI 首格、焦点环、进度条 |
| 蓝 hover | `--dsw-alias-button-info-hover` | 主按钮悬停 |
| 蓝底文字 | `--dsw-alias-label-on-color`（兜底 bg-base） | 禁止蓝底放黑字 |
| 文本三档 | `label-primary / secondary / tertiary` | 正文必须 primary；占位 tertiary |
| 边界 | `border-l2`（静卡/控件）`l3`（重卡/输入）`l4`（hover）`l1`（卡内发丝） | l1 只做卡内分隔，不做分组 |
| 语义 | `state-warn/success/error-primary` + `-tertiary` | tint 底 + 方点；错误底 `color-mix(err 8%)` |
| 闲置/归档 | `state-idle-primary` / `state-done-primary` | 只用于状态 |

**禁止**：`brand-primary` 作实底强调（浅色下是近黑，v4 的病）；表外色相；
`label-tertiary/caption` 承载正文；同语义两套色。

---

## 三、字体与层级

字阶 5 档不变（24/20/16/14/12，行高 32/28/24/22/18）。v6 的分配：

| 档 | v6 用途 |
|---|---|
| T1 24 | 每页 1 处 `.lede` 一句话结论，允许折 2 行 |
| T2 20 | **KPI 账带数字**、成本大数字（等宽 600 tabular-nums） |
| T3 16 | 重卡标题、条目标题、详情标题 |
| T4 14 | 正文、按钮、输入、区块标题 |
| T5 12 | 元信息、徽标、**分段导航**、计数（等宽或短标签） |

- 第二字体身份：**元信息一律等宽**（token 数、日期、路径、计数、hash）。
- 字重两档 400/600。
- 页面名降为 T5 + 0.06em 字距（导航已标过，不再抢 T3）。

---

## 四、形状与间距

- 间距 4 的倍数六档：4/8/12/16/24/32。重卡内边距 12，静卡 12，行 8。
- 圆角四档：0 = 行内标记（状态签）；6 = 控件；8 = 卡片；12 = 浮层。
- 行节奏：**台账行 min-height 36px**（技能库建议的表格行高），
  密排但可点；`.dmo-row` 只表示台账行，横排按钮行改用 `.dmo-hrow`
  （v4 两者共用一个类名，后写的 flex 覆盖了行布局——v6 拆开）。
- 阴影：0 处，除浮层（弹窗/toast 用 `color-mix(mask-1)` 派生值）。

---

## 五、主题自动切换（宿主契约）

宿主机制：`body[data-ds-dark-theme]` 换整套别名。插件规则：

1. 只允许 `var(--dsw-alias-*)` / `var(--dsw-specific-*)` + `color-mix` 派生；
   **禁止字面色值**（`test/wiring-ui.test.mjs` 断言；兜底值仅限
   rgba(0,0,0,.xx) 这类 mask/shadow 退化写法，且必须带 var() 主值）。
2. 禁止在 JS 读取或缓存计算后的颜色；禁止自建 .dark class。
3. 原型 `prototype/tokens.css` 逐字复刻宿主两套别名，作为主题回归测试。

关键别名实测值（摘自宿主 `dsh-client-ui-theme/src/styles/design-platform.css`）：

| token | 浅色 | 深色 |
|---|---|---|
| sidebar-fill | rgb(249,250,251) | rgb(27,27,28) |
| card-fill | rgb(250,250,250) | rgb(33,33,35) |
| card-fill-hover | rgb(245,245,245) | rgb(41,41,41) |
| bg-module-platform | rgb(245,246,247) | rgb(53,54,56) |
| border-l2 / l3 / l4 | 10% / 12% / 16% 黑 | 12% / 16% / 20% 白 |
| label-primary | rgb(15,17,21) | rgb(249,250,251) |
| label-secondary | rgb(97,102,107) | rgb(207,211,214) |
| **business-primary（蓝）** | rgb(65,118,230) | rgb(122,170,255) |
| warn / warn-tertiary | rgb(245,158,11) / rgb(254,245,231) | 同 / rgb(39,36,31) |
| success / success-tertiary | rgb(34,197,94) / rgb(230,250,237) | 同 / rgb(35,60,44) |
| error | rgb(236,19,19) | rgb(242,90,90) |
| idle | rgb(212,212,212) | rgb(84,85,87) |

---

## 六、动效原则

| 项 | 规则 |
|---|---|
| 时长 | 120ms 态切换 / 180ms 浮层进出 |
| 缓动 | `cubic-bezier(0.2, 0, 0, 1)` |
| 触发 | 只由用户动作触发（hover / focus / 点击 / 展开） |
| 禁止 | 滚动 fade-up / slide-up；卡片 hover scale |
| 加载 | 骨架屏 1.2s 呼吸（`bg-skeleton`），不位移 |
| 降级 | `prefers-reduced-motion: reduce` → 全部 animation/transition 关闭（含骨架屏） |

---

## 七、可达性硬约束（WCAG）

1. 交互元素齐 hover / active / focus-visible 三态；
   focus 环 = `outline: 2px solid 业务蓝`，offset 2px（输入类 -1px 贴边）。
2. 正文 ≥4.5:1：正文一律 label-primary（浅 17:1 / 深 15:1）。
   **徽标文字一律 label-primary**，彩色只出现在 tint 底与方点上——
   amber-500/green-500 在 12px 上直接做文字色不达标，v6 从根上避开。
3. 蓝底白字：deepseek-500 上放 label-on-color（浅=白）≈4.6:1，14px/600 达标；
   深色主题蓝底用 label-on-color（=深色底）同样达标。
4. 状态不只靠颜色：方点 + 文字标签同时存在。
5. 列表用 `role="list"` / `role="listitem"`；浮层焦点移入、Esc 关闭、关闭后回焦。
6. KPI 账带每格必须可点（`role="group"` + 按钮），不许裸数字。

---

## 八、v6 自加禁令

1. **一屏 ≤1 张重卡**：card-fill + border-l3 + 主按钮同在一卡。其余一律静卡。
2. **`.dmo-row` 语义唯一**：只表示台账行；横排控件行用 `.dmo-hrow`。
3. **`.dmo-remember-*` 是回归锚点**：v4 重写样式时整段删除这些类，
   导致 /remember 弹窗「挂载了但完全不可见」。任何样式重构必须保留该类块，
   且 `test/wiring-ui.test.mjs` 的类名审计必须 0 缺失。
4. 流程术语不上界面（该补了/爬升/减重/锚点校验 → 用户语言，沿用 v4/v5）。
5. 首屏数字必须能回答「所以我现在点哪里」，否则移进库健康。

---

## 九、禁止清单响应（v6）

| 禁止项 | v6 状态 |
|---|---|
| 紫/靛强调、紫蓝渐变 | 不使用；强调=宿主业务蓝 |
| bg-clip-text 渐变字 / glow | 不使用 |
| #0D1117 默认暗底 | 不使用；暗底=宿主真实 rgb(21,21,23) |
| 单一字体无第二身份 | 等宽为第二身份（§三） |
| 单字重单字号 | 5 档字阶 + 2 档字重 |
| gray-400/500 作正文 | 正文强制 label-primary |
| 全同一圆角 | 四档按语义（§四） |
| 圆角卡+左彩边 | 不使用；状态用 tint+方点 |
| 卡片嵌套卡片 | 最多一层（§八-1） |
| 固定三卡网格+lucide 图标 | KPI 账带是数据格，非营销卡；数量随数据 |
| Bento / 玻璃拟态 | 明确拒绝（§一） |
| Emoji 结构图标 | 不使用 |
| hover scale / 滚动 fade | 不使用（§六） |
| 只做 happy path | 四态逐页可达（IA 文档） |
| 假数据 | 真实库数据 |
| eyebrow+大标题+双CTA hero | 不使用；首屏=账带+一句话+单一主动作 |
