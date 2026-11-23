# 设计方向卡 · 记忆库 v5

> 本文件是 v5 改版的**唯一视觉契约**，取代 v4（原文见 `design/archive/direction-card-v4.md`）。
> `prototype/` 下所有界面必须逐条遵守；任何与本文冲突的实现，以本文为准。
>
> 锁定时间：2026-11-18。v4 原型已于 2026-11-21 随历史版本一并清理（见 `design/README.md` §历史）。

---

## 零、为什么改版（诊断，写给后来者）

v4 被用户判为「太丑、太素」。根因不是执行走样，是**契约本身选错了 token**：

1. v4 把「卡片感」全部押在 `--dsw-alias-bg-layer-1/2` 上。实测宿主浅色主题里
   这两个值 = `neutral-bluish-00` = **纯白**，与 `bg-base` 完全相同——
   所有「分层」在亮色下是零差异（`.tmp/dsh/design-platform.css` L200 区段）。
2. 分组全靠 `--dsw-alias-border-l1` = `rgba(0,0,0,0.04)`——**肉眼不可见的发丝线**。
   于是亮色主题下整个界面 = 白底 + 隐形线 + 黑字，即「素」。
3. v4 的主按钮用 `--dsw-alias-brand-primary`。宿主浅色里它 = `neutral-bluish-1000`
   ≈ **近黑**（宿主品牌是墨水，不是蓝）。一屏唯一的「强调」是个黑块，无彩色。
4. 宿主明明提供了有真实色相与明度差的 token，v4 一个都没用：
   `card-fill`（真灰卡片底）、`border-l2/l3`（可见边界）、
   `state-business-primary` / `button-info-fill` / `link`（DeepSeek 蓝，
   浅色 `deepseek-500` / 深色 `deepseek-400`）、
   `state-*-tertiary`（语义色的浅/深 tint 底）。

**v5 的改版原则：不发明任何颜色，把没用上的宿主 token 用起来。**
所有新观感仍 100% 来自 `--dsw-alias-*`，因此**自动跟随宿主明暗主题**
（宿主用 `body[data-ds-dark-theme]` 换整套别名，见 §五）。

### 用户裁决记录（2026-11-18 问答）

- 视觉方向：**换方向——更重的卡片化仪表盘感**（放弃 v4「行不是卡片」的编辑感）。
- `/remember` 弹窗不出现：**按 bug 修**，保留弹窗交互。
- 预览范围：5 分区 × 亮暗两套。

> 按主代理硬约束 6，用户明确指定的方向优先于默认禁止清单。
> 因此 v4 判死的「卡片网格」在 v5 解禁；但清单里与用户选择无关的条目
> （禁紫渐变、禁 Emoji 图标、禁 glow、禁滚动 fade-up、禁单字号）**继续有效**。

---

## 一、风格定位：**档案柜仪表盘（Console / Card Dashboard）**——明确选一个，不含糊

一句话：**每个面板是一组可点、可读、有底色的档案卡片，蓝色是唯一的强调色。**

- 内容分块一律装进**有可见填色的卡片**（`card-fill`），卡片边界用 `border-l2`
  （浅色 10% 黑 / 深色 12% 白，两主题都可见）。不再依赖隐形 hairline 分组。
- 页面顶部是**指标卡带**（2×2 或 4 联排），数字是主角；
  下面才是建议卡、捕获卡、台账列表卡。
- 语义状态用**tint 底徽标**：`color-mix(语义色 14%, transparent)` 底 + 同色文字
  + 文字标签（不只靠颜色）。
- 选中态 / 主操作 / 链接 / 焦点环 = DeepSeek 蓝（`state-business-primary` 系）。

### 明确拒绝的风格（写下来防漂移）

- ❌ 紫 / 靛蓝渐变、glow、极光底——与宿主无关的色相一律不进。
- ❌ 玻璃拟态 / blur。宿主卡片是实底，叠 blur 只会脏。
- ❌ Emoji 或彩色插画当图标。结构性标记用等宽文字签（`[待确认]`）。
- ❌ 每张卡 hover 上浮 + scale。hover 只换 `card-fill-hover` 底色。
- ❌ 滚动进入动画。动效只由用户动作触发。

### 卡片使用的三条硬规矩（防止「全是卡片 = 没有重点」）

1. **每屏最多 1 张「重卡」**：`card-fill` 底 + `border-l3` 边 + T3 标题。
   其余卡片用 `bg-module-platform` 底 + `border-l2`。重卡 = 这一页的主操作所在。
2. **卡片不嵌套超过一层**。列表行在卡片内，行本身不再包卡。
3. **一行最多 1 个主按钮（蓝实底）+ 1 个文字链**，其余进「更多」。
   整页蓝实底按钮 ≤ 1 处（徽标、链接、焦点环不算实底按钮）。

---

## 二、色彩策略（全部来自宿主别名，值已在 §五 表列出）

| 角色 | token | 规则 |
|---|---|---|
| 页面底 | `--dsw-specific-sidebar-fill`（浅 bluish-50 / 深 bluish-900） | 面板外壳底色，比卡片深一档 |
| 重卡底 | `--dsw-alias-card-fill`（浅 neutral-50 / 深 neutral-850） | 每屏 1 张 |
| 普通卡底 | `--dsw-alias-bg-module-platform`（浅 bluish-60 / 深 bluish-800） | 其余容器 |
| 卡内行 hover | `--dsw-alias-card-fill-hover` | 只用于可点行 |
| 强调蓝 | `--dsw-alias-state-business-primary` | 主按钮底、选中态、链接、数字强调、进度条 |
| 蓝 hover | `--dsw-alias-button-info-hover` | 主按钮悬停 |
| 文本三档 | `label-primary / secondary / tertiary` | 正文必须 primary；元信息 secondary；占位 tertiary |
| 边界 | `border-l2`（卡片）/ `border-l3`（重卡、控件 hover）/ `border-l4`（焦点邻边） | `l1` 只用于卡内发丝线 |
| 语义三色 | `state-warn/success/error-primary` + `-tertiary` | 徽标 = tint 底 + 同色字；错误底用 `color-mix(err 8%)` |
| 闲置/归档 | `state-idle-primary` / `state-done-primary` | 只用于状态徽标，不做装饰 |

**禁止**：引入表外色相；用 `label-tertiary`/`caption` 承载正文；
同一语义用两套色。

> v4 的「brand 实底每屏 ≤1」规则保留，但载体从近黑 brand 换成**业务蓝**。
> 理由见 §零-3：宿主 brand 在浅色下是黑色，撑不起「强调」职责；
> 而 `state-business-primary` 是宿主自己的彩色动作色（toast action、链接都用它）。

---

## 三、字体与层级规则

字阶仍 5 档（对齐 `docs/product.md` §六），但 **T2 启用**：

| 档 | 字号/行高 | v5 用途 |
|---|---|---|
| T1 24/32 | 每页 1 处：一句话结论（`.lede`），允许折 2 行 |
| T2 20/28 | **指标卡数字**（`.tile-num`）、成本大数字 |
| T3 16/24 | 重卡标题、条目标题、详情标题 |
| T4 14/22 | 正文、按钮、输入、区块标题 |
| T5 12/18 | 元信息、徽标、表头、计数（仅等宽或短标签） |

- 第二字体身份不变：**元信息一律等宽**（token 数、日期、路径、计数）。
- 字重两档 400/600；指标数字用 600 + `tabular-nums`。
- 对比度纪律：正文句子必须 `label-primary`；`secondary` 只允许 ≤2 行的辅助句。

---

## 四、形状与间距

- 间距仍 4 的倍数六档：`4/8/12/16/24/32`。卡片内边距：重卡 16，普通卡 12，行 8。
- 圆角四档按语义：

| 值 | 语义 | 用在哪 |
|---|---|---|
| 0 | 行内标记 | 徽标、状态签 |
| 6 | 控件 | 按钮、输入、chip、tile 内小条 |
| 10 | 卡片 | 一切 `.card`（v5 新增档，替代 v4 的 8） |
| 12 | 浮层 | 弹窗、toast |

- 阴影：卡片**不用**阴影（宿主卡片语言是「底色 + 描边」）；
  阴影只允许出现在浮层（弹窗/toast），值用 `color-mix(mask-1 …)` 派生，不写字面色。

---

## 五、主题自动切换（宿主契约）

宿主切换明暗的唯一机制：在 `<body>` 上挂/摘 `data-ds-dark-theme`，
整套 `--dsw-alias-*` 别名随即换值（`design-platform.css` 两个块）。

**插件端规则：**

1. 样式表内**只允许** `var(--dsw-alias-*)` / `var(--dsw-specific-*)` /
   `var(--dsw-static-*)` 与 `color-mix` 派生，**禁止任何字面色值**
   （`test/wiring-ui.test.mjs` 有断言）。做到这一点，明暗自动跟随，无需监听。
2. 不得在 JS 里读取或缓存计算后的颜色值；不得自建 `.dark` class。
3. 原型 `tokens.css` 用宿主**真实值**复刻两套别名：
   `:root` = 浅色块，`body[data-ds-dark-theme]` = 深色块——与宿主同机制，
   原型即主题回归测试。落地时 `tokens.css` 整段删除。

两套关键别名实测值（摘自宿主 `design-platform.css`，非发明）：

| token | 浅色 | 深色 |
|---|---|---|
| bg-base | #FFFFFF | rgb(21,21,23) |
| sidebar-fill | rgb(249,250,251) | rgb(27,27,28) |
| card-fill | rgb(250,250,250) | rgb(33,33,35) |
| card-fill-hover | rgb(245,245,245) | rgb(41,41,41) |
| bg-module-platform | rgb(245,246,247) | rgb(53,54,56) |
| border-l1 | rgba(0,0,0,.04) | rgba(255,255,255,.06) |
| border-l2 | rgba(0,0,0,.1) | rgba(255,255,255,.12) |
| border-l3 | rgba(0,0,0,.12) | rgba(255,255,255,.16) |
| label-primary | rgb(15,17,21) | rgb(249,250,251) |
| label-secondary | rgb(97,102,107) | rgb(207,211,214) |
| business-primary（蓝） | rgb(65,118,230) | rgb(122,170,255) |
| warn | rgb(245,158,11) | 同浅 |
| warn-tertiary | rgb(254,245,231) | rgb(39,36,31) |
| success | rgb(34,197,94) | 同浅 |
| success-tertiary | rgb(230,250,237) | rgb(35,60,44) |
| error | rgb(236,19,19) | rgb(242,90,90) |
| idle | rgb(212,212,212) | rgb(84,85,87) |
| done | rgb(124,58,237) | rgb(167,139,250) |

> 深色下 `error-primary` 是亮红 `red-400`；浅色徽标底用
> `color-mix(error 10%, transparent)` 即可，两主题都成立。

---

## 六、动效原则（与 v4 相同，不重复论证）

| 项 | 规则 |
|---|---|
| 时长 | 120ms 态切换 / 180ms 浮层进出 |
| 缓动 | `cubic-bezier(0.2, 0, 0, 1)` |
| 触发 | 只由用户动作触发（hover / focus / 点击 / 展开） |
| 禁止 | 滚动 fade-up / slide-up；卡片 hover scale；glow 呼吸 |
| 加载 | 骨架屏 1.2s 呼吸（底色用 `bg-skeleton`） |
| 降级 | `prefers-reduced-motion: reduce` → 全部动画与过渡关闭（含骨架屏） |

---

## 七、可达性硬约束（WCAG）

1. 所有可交互元素有 hover / active / focus-visible 三态；
   focus 环 = `outline: 2px solid business-primary; outline-offset: 2px`，
   输入类 `outline-offset: -1px` 贴边框。
2. 正文对比度 ≥ 4.5:1：正文只用 `label-primary`（浅 15/17/21 on 白 ≈ 17:1；
   深 249/250/251 on 21/21/23 ≈ 15:1）。徽标 tint 底上的彩色文字
   必须用 `-label` 变体或加深一档（浅色主题 amber-600 而非 500 承载文字）。
3. 状态不只靠颜色：徽标必须带文字（`[待确认]`），tint 色只是加速识别。
4. 列表用 `role="list"`；浮层打开焦点移入、Esc 关闭、关闭后焦点回触发元素。
5. 蓝底白字按钮：浅色 `deepseek-500` 上放白字对比 ≈ 4.6:1（14px/600 达标）；
   深色主题蓝底用白字仍达标。禁用蓝底放黑字。

---

## 八、禁止清单之外，v5 自己加的三条禁令

1. **指标卡数字不许是裸数字**：每块 tile 必须可点（跳到对应分区）
   且带一句「所以该做什么」的小注；否则降级为行内文字。
2. **术语继续走用户语言**：「该补了 / 爬升 / 减重 / 锚点校验」不上界面（沿用 v4）。
3. **卡片密度上限**：单屏可见卡片 ≤ 6 张。超过说明分组错了，合并或收进「更多」。

---

## 九、对「禁止清单」的显式响应（v5 版）

| 禁止项 | v5 状态 |
|---|---|
| 紫/靛强调色、紫蓝渐变 | 不使用：强调色 = 宿主业务蓝；violet 仅 `state-done` 徽标 |
| bg-clip-text 渐变字 / glow / 极光 | 不使用 |
| 深蓝 #0D1117 默认暗底 | 不使用：暗色 = 宿主真实值 rgb(21,21,23) |
| Inter/Geist 单字体无第二身份 | 等宽为第二身份（§三） |
| gray-400/500 作正文 | 正文强制 label-primary（§二） |
| 全同一圆角 | 四档按语义（§四） |
| 卡片嵌套卡片 | 硬规矩 2：≤1 层（§一） |
| 固定三卡网格 + 圆角图标 | 指标带是**数据 tile**，非功能营销卡；数量随数据变（空段不渲染） |
| 圆角卡 + 左彩边 | 不使用左彩边；状态用 tint 徽标 |
| Emoji 结构图标 | 不使用 |
| hover scale / 滚动 fade | 不使用（§六） |
| 只做 happy path | 四态逐页可达（IA 文档） |
| 假数据 | 真实库数据（3 记忆 / 3 INBOX / 5 未命中） |
