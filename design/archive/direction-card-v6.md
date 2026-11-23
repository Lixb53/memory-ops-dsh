# 设计方向卡 · 记忆库 v6（已归档）

> 归档时间：2026-11-19。**v7 起本文件不再是契约**，唯一契约见 `design/brief.md`。
> 保留原文用于追溯 v6 的裁决与踩坑（尤其 §五 宿主别名实测值、§七-3 主按钮文字色裁决）。
> 改版原因见 `design/brief.md` §零。

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

## 一、风格定位：**密排档案台（Data-Dense Ledger）**

一句话：**一条 KPI 账带 + 可见描边的档案卡 + 36px 定高台账行，蓝色是唯一强调。**

| 手法 | 落点 |
|---|---|
| KPI 账带 | 今天页首屏：单条 4 格，数字等宽右对齐同一基线；**首格例外**——左对齐 + 业务蓝 |
| 分段导航 | 轨道 = bg-module-platform + border-l2；选中 = bg-base 白底浮起 + border-l3 + 600 |
| 卡片 | card-fill 真灰底 + border-l3 描边；静卡用 bg-module-platform + border-l2 |
| 台账行 | 36px 定高、8px 内边距、hover 换 card-fill-hover；数字列右对齐 tabular-nums |
| 状态签 | tint 底 + 6px 方点 + 文字（文字一律 label-primary） |

### 明确拒绝

- ❌ 玻璃拟态 / blur / 彩色阴影 glow。
- ❌ 紫-蓝渐变、bg-clip-text 渐变字。
- ❌ Emoji 作结构图标。
- ❌ 卡片 hover scale / 滚动 fade-up。
- ❌ 等权卡片墙：一屏最多 1 张「重卡」。

---

## 二、色彩策略（全部宿主 token）

| 角色 | token | 规则 |
|---|---|---|
| 面板底 | `--dsw-specific-sidebar-fill`（兜底 bg-base） | 比卡片深一档 |
| 重卡底 | `--dsw-alias-card-fill` | 每屏 ≤1 |
| 静卡底 | `--dsw-alias-bg-module-platform` | 其余容器 |
| 行 hover | `--dsw-alias-card-fill-hover` | 只给可点行 |
| 强调蓝 | `--dsw-alias-state-business-primary` | 主按钮、选中态、链接、KPI 首格、焦点环、进度条 |
| 蓝底文字 | `--dsw-alias-bg-base`（不用 label-on-color） | 见 §七-3 |
| 文本三档 | `label-primary / secondary / tertiary` | 正文必须 primary |
| 边界 | `border-l2 / l3 / l4 / l1` | l1 只做卡内分隔 |
| 语义 | `state-warn/success/error-primary` + `-tertiary` | tint 底 + 方点 |

**禁止**：`brand-primary` 作实底强调；表外色相；`label-tertiary/caption` 承载正文。

---

## 三、字体与层级

字阶 5 档（24/20/16/14/12，行高 32/28/24/22/18）。

| 档 | v6 用途 |
|---|---|
| T1 24 | 每页 1 处 `.lede` 一句话结论，允许折 2 行 |
| T2 20 | KPI 账带数字、成本大数字 |
| T3 16 | 重卡标题、条目标题、详情标题 |
| T4 14 | 正文、按钮、输入、区块标题 |
| T5 12 | 元信息、徽标、分段导航、计数 |

- 第二字体身份：元信息一律等宽。
- 字重两档 400/600。
- 页面名降为 T5 + 0.06em 字距。

> **v7 复盘**：T1 给中文整句是 v6 最大的败因——400px 侧栏里折 2 行，
> 像营销标题，还把真正该最大的数字（T2 20px）压了下去。

---

## 四、形状与间距

- 间距 4 的倍数六档：4/8/12/16/24/32。重卡内边距 12，静卡 12，行 8。
- 圆角四档：0 = 行内标记；6 = 控件；8 = 卡片；12 = 浮层。
- 台账行 min-height 36px；`.dmo-row` 只表示台账行，横排按钮行用 `.dmo-hrow`。
- 阴影：0 处，除浮层。

> **v7 复盘**：六档齐全但实际全页只用 12 一档 → 没有节奏。

---

## 五、主题自动切换（宿主契约）

1. 只允许 `var(--dsw-alias-*)` / `var(--dsw-specific-*)` + `color-mix` 派生；禁止字面色值。
2. 禁止 JS 读取或缓存计算后的颜色；禁止自建 .dark class。
3. 原型 `prototype/tokens.css` 逐字复刻宿主两套别名。

关键别名实测值（宿主 `dsh-client-ui-theme/src/styles/design-platform.css`）：

| token | 浅色 | 深色 |
|---|---|---|
| sidebar-fill | rgb(249,250,251) | rgb(27,27,28) |
| card-fill | rgb(250,250,250) | rgb(33,33,35) |
| card-fill-hover | rgb(245,245,245) | rgb(41,41,41) |
| bg-module-platform | rgb(245,246,247) | rgb(53,54,56) |
| border-l2 / l3 / l4 | 10% / 12% / 16% 黑 | 12% / 16% / 20% 白 |
| label-primary | rgb(15,17,21) | rgb(249,250,251) |
| label-secondary | rgb(97,102,107) | rgb(207,211,214) |
| business-primary（蓝） | rgb(65,118,230) | rgb(122,170,255) |
| warn / warn-tertiary | rgb(245,158,11) / rgb(254,245,231) | 同 / rgb(39,36,31) |
| success / success-tertiary | rgb(34,197,94) / rgb(230,250,237) | 同 / rgb(35,60,44) |
| error | rgb(236,19,19) | rgb(242,90,90) |
| idle | rgb(212,212,212) | rgb(84,85,87) |

> **v7 复盘**：这张表本身就是证据——浅色下 sidebar-fill 249 / card-fill 250 /
> module-platform 245 相差 ≤5 个单位，v6 的「分层」从未成立。
> v7 因此改用 `label-primary ↔ bg-base` 反相（两套主题都 ≥16:1）。

---

## 六、动效原则

时长 120ms / 180ms；缓动 `cubic-bezier(0.2,0,0,1)`；只由用户动作触发；
禁止 fade-up 与 hover scale；骨架屏 1.2s 呼吸；`prefers-reduced-motion` 全关。

---

## 七、可达性硬约束

1. 三态齐备；focus 环 = 2px 业务蓝，offset 2px（输入类 -1px）。
2. 正文 ≥4.5:1；徽标文字一律 label-primary。
3. 主按钮文字色 = `bg-base` 而非 `label-on-color`（宿主两套 label-on-color 都是白，
   深色蓝底白字 ≈2.3:1）；hover 用 `filter: brightness(0.92)`。
4. 状态不只靠颜色：方点 + 文字。
5. 列表容器显式 `role="list"`；浮层移焦、Esc 关闭、回焦。
6. KPI 账带每格必须可点。

---

## 八、v6 自加禁令

1. 一屏 ≤1 张重卡。
2. `.dmo-row` 语义唯一（台账行）；横排用 `.dmo-hrow`。
3. `.dmo-remember-*` 是回归锚点，任何样式重构必须保留该类块。
4. 流程术语不上界面。
5. 首屏数字必须能回答「所以我现在点哪里」。

---

## 九、禁止清单响应（v6）

紫蓝渐变 / bg-clip-text / #0D1117 暗底 / 单一字体 / 单字重 / gray-400 正文 /
全同一圆角 / 左彩边圆角卡 / 卡片嵌套 / 固定三卡网格 / Bento / 玻璃拟态 /
Emoji 图标 / hover scale / 只做 happy path / 假数据 / hero 三件套 —— 均不使用。
