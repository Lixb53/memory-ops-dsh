# 组件规范 · 记忆库 v8（校样栏）

> 唯一契约：[`design/brief.md`](../brief.md)。令牌：[`design/tokens.json`](../tokens.json)。
> 每个组件给：解剖 / 变体 / 状态 / 令牌映射 / 可达性。实现见
> [`prototype/ui.js`](../../prototype/ui.js) 与 [`prototype/app.css`](../../prototype/app.css)。
> v8 只收录本版存在的组件——v7 的 `.masthead` 整块作废（见 brief §零）。

---

## 1 · 读头（Head / banner）

**唯一职责**：用三行回答「这是哪、能去哪、现在什么状况」，且高度预算 ≤170px。

### 解剖

```
┌──────────────────────────────────────────┐
│ 记忆库              C:\Users\…\.memory-ops │ ← .head-top     26px
├──────────────────────────────────────────┤
│ 今天  记一条  待办 3  记忆 3  库健康        │ ← .head-nav     28px（文本 Tab + 下划线）
├──────────────────────────────────────────┤
│  3   │ 有一条推断等你拍板                   │ ← .readout      ≤100px
│ 件压着│ [dsh-config 仓库…] 从对话总结的 · 置信 0.5 │
│      │ [确认这条] [先看全文]                │
└──────────────────────────────────────────┘
```

### 变体与状态

| 变体 | 触发 | 差异 |
|---|---|---|
| 常规（有主操作） | 今天 / 待办 / 详情未确认 | 右栏第三行出现墨块 + 次按钮 |
| 常规（无主操作） | 记一条 / 记忆 / 库健康 | 右栏只有结论 + 说明，蓝名额留给纸面 |
| loading | `#pane/loading` | T0 显示 `—`（`data-unknown="true"`：常规字重 + tertiary），纸面骨架 |
| empty | `#pane/empty` | T0 显示 `0` 或 `—`，说明句改成真话，主操作名额转移 |
| error | `#pane/error` | **品牌行与导航必须保留**，T0 `—`，纸面错误态 |

### 令牌映射

| 部位 | 令牌 |
|---|---|
| 底 | 无（就是 paper） |
| 分隔 | `--dsw-alias-border-l2`（导航底 1px、读数底 1px） |
| 品牌 | `--t3` 600 / `label-primary` |
| 库路径 | `--mono` `--t4` / `label-tertiary` |
| Tab 默认 | `--t4` / `label-secondary` |
| Tab 选中 | `label-primary` 600 + 底边 `2px business-primary` |
| Tab 计数 | `--mono` 600；选中时 `business-primary` |
| T0 | `--t0` 600 `-0.02em` tabular / `label-primary` |
| 结论句 | `--t3` 600 / `label-primary`，单行省略 |
| 说明句 | `--t4` / `label-secondary`，**最多 1 行** |

### 可达性

- `role="banner"`；导航 `role="tablist"`，每个 Tab `role="tab"` + `aria-selected` + `aria-controls="paper"`。
- Tab 可点区高度 28px（≥ WCAG 2.2 AA 的 24px）。
- 焦点环：`2px solid business-primary`，offset 2px。
- **需实测**：键盘 ←/→ 在 tablist 内切换（当前未实现 roving tabindex，用 Tab 键逐项进入）。

### 设计决策（写给下一个改它的人）

读头**不做色块**。v7 用反相块换识别度，代价是 400×905 里 262–300px 的首屏，
而它承载的信息只有「一个数 + 一句话 + 两个按钮」。v8 把权重从**面积**换成
**字号 + 等宽数字**，识别度交给左栏序号（见 §2）。实测读头 133–155px，
同样屏高多出 100–150px 给台账。

---

## 2 · 台账行（Row）

**唯一职责**：在 400px 宽里同时放住「序号 / 标题 / 元信息 / 状态 / 动作」，且标题折行时不与元信息打架。

### 解剖

```
│▌01  dsh-config 仓库：个人 skill/preset/profile 的唯一真相源与安装方式 │
│    ↑   ↑ 标题 14/22，最多 2 行                                       │
│    │   dsh-config · 33 行 · 519 tok · 未引用                        │ ← 元信息 12/18 左对齐
│    └ 序号 20px 等宽 tertiary                                         │
└ ▌ = 面板左缘 2px 状态刻度（按 data-tone）                             │
```

### 变体

| 变体 | 类 | 用在哪 |
|---|---|---|
| 紧凑行 | `.row` | 今天线索 / 记忆列表 / 最近记的 |
| 展开行 | `.row.row-wide` | 待办三段（带证据摘录与多动作） |
| 可点行 | 包在 `.list-clickable` 里 | 整行 hover 换底 |

### 状态

| 状态 | 表现 |
|---|---|
| 默认 | 底透明，底部 1px `border-l1`（最后一行无） |
| hover | `card-fill-hover` 满幅（仅 `.list-clickable` 内） |
| active | 标题字色转 `link` |
| focus-visible | 标题按钮 `outline 2px business-primary` offset 2px |
| tone=warn/ok/err/live | 左缘 2px 刻度换语义色；**元信息里的状态词同时在场** |
| tone=none | 不画刻度（灰条会被读成「待处理」） |

### 令牌映射

`min-height 44px` · `padding 8px 16px` · 负 margin `-16px` 满幅 · 列 `20px + 1fr` · gap 8px ·
标题 `--t3`/`--t3-lh` · 元信息 `--mono`/`--t4`/tabular/`label-secondary` ·
序号 `--mono`/`--t4`/`label-tertiary` · 分隔符「·」`label-tertiary` 两侧 2px。

### 可达性

- 容器 `role="list"`（`list-style:none` 会让 Safari+VoiceOver 剥掉列表语义）。
- 序号 `aria-hidden="true"`：它是视觉定位，不是数据。
- 行标题用 `<button class="row-button">` 时整行可键盘到达；纯展示行用 `<p>`。
- 状态不只靠颜色：刻度 + 文字双通道。

### 设计决策

**元信息绝不放右对齐第三栏。** v7 的行是「竖条 / 标题(1fr) / 右对齐元信息」三栏，
20–30 字中文标题折 3 行、元信息被挤成第 4 行并与标题视觉交错（v7 的病灶记录在
[`archive/brief-v8.md`](../archive/brief-v8.md) §零；当时的截图已随原型清理）。
v8 把元信息降到标题**下方**独立行、左对齐，序号顶替了原来第三栏的「定位」职责。
实测行高从 79px 降到 59px，同行高下多放两行。

---

## 3 · 工具带（Band）

**唯一职责**：把「用完就走」的控件（搜索 / 类型签 / 捕获）与纸面正文分开，且**不引入卡片**。

### 解剖与令牌

```
border-top: 1px border-l2
background: bg-module-platform
padding: 12px 16px
margin: 0 -16px   ← 满幅
border-bottom: 1px border-l2
```

内含：`.band-head`（小标 + 计数）、`.capture`（输入控件，允许四边框——它是控件不是分组容器）、`.kindrow`。

### 状态

band 本身无状态；其中 `.input` / `.capture` / `.kindbtn` 各自带 hover / focus。
`.kindbtn[aria-pressed="true"]` = 蓝字 + 蓝边 + 8% tint。

### 可达性

- 类型签用 `aria-pressed`，不用 `role=radio`（多选语义上是切换而非单选组）。
- 输入必须有 `aria-label`（机检覆盖）。

---

## 4 · 按钮（Button）

| 变体 | 类 | 用在哪 | 底 / 字 |
|---|---|---|---|
| 主操作（纸面） | `.btn.btn-primary` | 搜 / 存进去 / 重试 / 空态出口 | `button-info-fill` / `bg-base` |
| 主操作（读头） | `.btn.btn-ink` | 确认这条 / 去补库 | `label-primary` / `bg-base` |
| 次级 | `.btn` | 取消 / 标完成 / 作业按钮 | `bg-base` / `label-primary`，l3 描边 |
| 幽灵 | `.btn.btn-ghost` | 读头次动作（先看全文） | 透明 / `label-secondary`，l3 描边 |
| 小号 | `.btn-sm` | 行内动作 | 同上，高 24px |

**状态**：hover（换底或 `brightness(0.92)`）／active（更深一档）／focus-visible（2px 蓝环）／disabled（`opacity .42` + `cursor:not-allowed`）。

### 硬约束

1. `.btn-primary` 与 `.btn-ink` **同屏互斥**，名额由各 pane 的 `ownsPrimary` / `ownsHead` 分配。
2. 蓝底文字一律 `bg-base`，**不用** `label-on-color`：宿主两套主题都是白色，深色蓝底白字 ≈2.3:1。
3. hover 不切 `button-info-hover`（浅色下更亮，白字对比反而掉到 ≈2.3:1）。
4. 禁用不拦 Enter：处理函数开头必须 `if (btn.disabled) return`（见 `app.js` 的 `captureGuard`）。

---

## 5 · 状态刻度 + 状态词（State mark）

v8 **没有药丸徽标**。状态 = 两个通道：

| 通道 | 实现 | 作用 |
|---|---|---|
| 颜色 | `.row::before` 2px 宽、满行高，贴在面板左缘 | 扫视时快速定位 |
| 文字 | 元信息行第一个片段 `.state-word`（`label-primary`） | 色觉障碍与读屏用户 |

tone 映射：`hypothesis/observed/stale→warn`、`reinforced→live(蓝)`、`confirmed→ok`、
`rejected→err`、`archived/active→none`（不画刻度）。

---

## 6 · 四态（Empty / Loading / Error / Success）

| 态 | 读头 | 纸面 | 主操作 |
|---|---|---|---|
| loading | T0 `—`（细破折号、tertiary） | 44px 骨架 × N，呼吸 1.2s | 无（骨架期间不误导） |
| empty | T0 `0` 或 `—` + 真话结论 | `.empty`：标题 + 解释 + ≥1 真实出口 | 名额转移到纸面 |
| error | 品牌行 + 导航 + T0 `—` | `.alert`：标题 + 怎么修 + **示例值** + 下一步按钮 | 重试 |
| success | 数据真实改变 | `.inline-done`（规则线 + success tint），不弹层 | 可撤销时**真有**撤销按钮 |

### 可达性

- `.alert` 用 `role="alert"`，`.inline-done` 用 `role="status"`。
- 浮层：打开移焦 → Esc 关闭 → 关闭回焦（选择器定位，见 `app.js::syncFocus`）。
- **需实测**：`prefers-reduced-motion: reduce` 下骨架静止但底色仍在。

---

## 7 · 浮层（Overlay / /remember）

- `.remember-backdrop`：`position: fixed; inset: 0` —— **回归锚点**，v4 曾因样式整段被删导致「挂载但不可见」。
- `.remember-card`：`min(480px, calc(100% - 32px))`，圆角 8，`box-shadow` 由 `bg-mask-1` 派生（全站唯一允许阴影处）。
- 弹窗头沿用主界面语言：规则线 + 标题，**不再是反相色块**。
- **需实测**：真实插件里弹窗 portal 到 body，按视口居中；预览图 `remember-light.png` 因此比面板宽（取并集裁切）。
