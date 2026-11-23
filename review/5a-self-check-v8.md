# 5A 禁止清单自检 · v8 落地（校样栏）

> 范围：`prototype/`（12 个文件全部重写或改字阶）、`design/brief.md`、`design/tokens.json`、
> `design/components/README.md`、`scripts/shot-prototype.mjs`、`tools/assert-structure.ps1`。
> 核对时间：2026-11-20。
> 唯一契约：[`design/brief.md`](../design/brief.md)。

---

## 一、机检结果（交付线：双 0 才算过）

```
pwsh -File tools/lint-anti-slop.ps1 prototype/
  CLEAN  lint-anti-slop: 0 hits across 12 files                    exit 0

pwsh -File tools/assert-structure.ps1 prototype/index.html prototype/app.css
  PASS  assert-structure: 0 violations (8 js, 2 css)               exit 0
```

截图脚本自带 17 项断言，全部通过（`prototype/shots-v8/metrics.json`）：
恰好 1 个 T0、T0 含数字、读头 ≤170px、面板 400px、对比度分档达标。

---

## 二、反 AI 默认审美硬信号（逐条）

| 信号 | 命中？ | 证据 | 处置 |
|---|---|---|---|
| 紫蓝渐变 hero | 否 | `app.css` 无 `linear-gradient`/`radial-gradient`；lint Rule 1 通过 | — |
| `bg-clip-text` 渐变字 | 否 | 无 `background-clip`；lint Rule 2 通过 | — |
| `#0D1117` 暗底 | 否 | 暗色由 `body[data-ds-dark-theme]` + 宿主别名驱动，零字面色 | — |
| gray-400/500 正文 | 否 | 正文恒 `label-primary`（18.9:1 / 17.45:1）；元信息 `label-secondary`（5.8:1 / 12.11:1） | — |
| Emoji 结构图标 | 否 | 结构性标记 = 2px 刻度、等宽序号、`▸` 折叠三角（通用字符非 emoji） | — |
| 统一 `hover:scale-105` | 否 | 全站 hover 只换底色 / 字色 / `brightness`；无 `transform: scale` | — |
| 卡片套卡片 | 否 | 纸面 0 容器（§三）；仅浮层是容器 | — |
| 逐节三卡网格 | 否 | 无网格卡片；待办是三**段**台账（数据决定段数，1–3 段皆可出现） | — |
| 无差别 fade-up | 否 | 动画只有 `fade`（浮层进出）与 `breathe`（骨架），全部状态驱动 | — |
| 占位假数据 | 否 | 数据来自真实库快照（`data.js` 头注），token 用 core 同口径 | — |
| happy path only | 否 | 5 页 × 空/载/错/成可达（`#pane/phase`），17 张图含 5 张非常规态 | — |

---

## 三、brief §八 自加禁令（可机检）

| 禁令 | 结果 | 证据 |
|---|---|---|
| §八-1 纸面 0 容器 | ✅ | 纸面上只有 `.band`（两条线夹底，无四框、无圆角）、`.row`、`.cost-row`、`.notice`；lint `card-container-on-paper` 0 |
| §八-2 每页恰好 1 个 T0 且含数字 | ✅ | 17/17 张 `t0Count=1`；lint `t0-not-numeric` 0 |
| §八-3 结论句 ≤20 字 | ✅ | lint `lede-too-long` 0 |
| §八-4 主操作整页唯一 | ✅ | `.btn-primary` 与 `.btn-ink` 由 `ownsPrimary` / `ownsHead` 互斥分配 |
| §八-5 `.remember-*` 回归锚点 | ✅ | `.remember-backdrop` 定义且 `position: fixed`；lint `remember-anchor-missing` 0 |
| §八-6 流程术语不上界面 | ✅ | 术语表在 `ui.js`（候选/观察中/较可信/已确认/待复核/已归档） |
| §八-7 首屏能回答「点哪里」 | ✅ | 读头 = T0 + 结论 + 一个主操作；`today-light.png` |
| §八-8 元信息不右对齐进标题行 | ✅ | `.row-meta` 是 `.row-body` 内独立行、`display: flex` 左对齐 |

---

## 四、可达性抽查

| 项 | 结果 | 说明 |
|---|---|---|
| 交互元素三态 | ✅ | `tab` / `row-button` / `btn` / `btn-primary` / `btn-ink` / `btn-ghost` / `kindbtn` / `textlink` / `remember-close` 各有 hover / active / focus-visible（结构闸门逐个校验） |
| 焦点环单色 | ✅ | 全站 `outline: 2px solid business-primary`，offset 2px（输入 -1px）。v8 取消反相块后不再需要第二套 |
| 正文对比 | ✅ | 18.9:1 / 17.45:1 |
| 元信息对比 | ✅ | 5.8:1（浅）/ 12.11:1（深），≥4.5:1 |
| T0 对比 | ✅ | 17.45:1（深色曾是 1.x:1 不可见，见 §五） |
| 状态不只靠颜色 | ✅ | 2px 刻度 + 状态词双通道 |
| `role="list"` | ✅ | `MO.list` 原语统一加；lint `no-role-list` 0 |
| 播报区 | ✅ | `.alert` `role="alert"`、`.inline-done` `role="status"`；lint `no-live-region` 0 |
| 浮层焦点 | ✅ 代码层 | 开移焦 / Esc 关 / 关回焦（`syncFocus` 存选择器）；**需实测** |
| reduced-motion | ✅ 代码层 | `@media (prefers-reduced-motion: reduce)` 关全部动画；**需实测** |
| 键盘 roving tabindex | ❌ 未实现 | tablist 内用 Tab 逐项进入，←/→ 未实现。已写进 `design/README.md` 已知边界 |

---

## 五、本轮修掉的 4 个真 bug（都是机检/截图抓到，不是眼估）

1. **深色主题下 T0 数字不可见**（最严重）。
   `--ink: var(--dsw-alias-label-primary)` 声明在 `:root`，自定义属性在**声明处**求值，
   于是它永远是浅色值 rgb(15,17,21)，压在深色纸面上 ≈1.1:1。
   修法：别名下沉到 `.stage`（body 的后代），并在 `app.css` 写明「不许在 :root 建宿主 token 别名」。
   连带 `--accent` 有同一缺陷，一并修掉。
   护栏：截图脚本新增对比度断言，按 WCAG 大文本/正文分档（T0 3:1，其余 4.5:1）。

2. **台账行 79px，且副行与元信息重复**。
   「1 条推断还没确认」（副行）与「等你拍板 · 1 条」（元信息）说的是同一件事。
   删副行、把信息并进元信息 → 行高 59px，同样屏高多放两行。

3. **meter 是 cost-row 的兄弟节点**。
   它夹在「每请求成本」与它自己的解释之间，读作一条无主的蓝色横杠。
   修法：移进该行内部（`costRow(name, value, note, meter())`）。

4. **详情页状态词被压成竖排**。
   T1 24px 标题和状态词并排在同一 flex 行，标题是最长字符串，把状态词挤成 1 字宽（「观/察/中」）。
   修法：状态词上移到标题上方的独立行。

另修 2 处呈现问题：40px 等宽「—」读作进度条（改细字重 + tertiary）、
元信息「·」两侧 4px 间距读作两个词（收到 2px）。

---

## 六、结论

禁止清单未清零项：**0**。机检双 0，截图断言 17/17。

**但以下属于阻塞项，不得静默带过：**

- 悬停态、焦点环、键盘操作、滚动与 reduced-motion 行为**只能实测**，
  静态 PNG 无法证明；本文件只在代码层声明，不写成已验证。
- 插件端仍是 v7，与本文档原型**不是同一套界面**（本轮授权范围内）。
- 独立评审（第 1 轮）**不通过**：无 P0，但 6 条 P1。处置与自查结论见
  [`5b-v8-round-1.md`](5b-v8-round-1.md)。按门禁规则返工后不再复审。

---

## 七、评审后的修订（2026-11-20，第二轮自查）

critic 第 1 轮判不通过（无 P0 / 6 条 P1）。已修：

| 项 | 处置 |
|---|---|
| 读头说明句被裁成半句 | 裁文案不裁行数：5 处 note 压到一行，`line-clamp` 保持 1（实测 2 行会把读头顶到 173px，超预算） |
| 骨架与真实行不同构 | `.skeleton` 改为满幅负 margin + 同 22px 序号列 + min-height 59 + 两条内部呼吸条 |
| `tertiary` 载信息 3.70:1 | 库根路径 / Tab 计数 / 分组计数一律升 `secondary`（5.8:1） |
| 可点区尺寸 | `.head-nav` 定高 36px、`.tab` min-height 34px、`.btn` 加 `min-width: 44px` |
| 待办正文被截断无展开 | 加 `.row-full` 放开 clamp（短句正常换行，比伪造详情路由诚实） |
| 浮层圆角档位 | tokens 补齐四档；浮层 12px、面板外框 8px |
| 健康页无主操作 | 唯一主操作上移到读头（墨块「本周小结」），维护作业降为 4 个次级按钮 |
| 错误态标题重复 | 读头改「这次没读到库」，alert 保留「读不到记忆库」 |
| 已确认详情页禁用蓝实底 | 删除该按钮（名额本就在读头） |

**未修但已知**（记入下一版）：整行 hover 但只有标题可点（需交互重构）、
刻度是否移到右缘（改了要重验四态）、详情页 `.spec` 右对齐值列。
