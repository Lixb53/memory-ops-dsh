# 5B · 独立评审 第 2 轮

> 评审者：`critic-r2` 子代理（只读，仅 Read/Glob/Grep）。
> 评审基准：`design/direction-card.md` + 产出物 + `review/5b-round-1.md`（第 1 轮原文）。
> 未向评审者传递主代理的自我评价或修复理由。
>
> **轮次结论：门禁不通过。** 存在 3 项 P0，但**无维度 ≤4**（哲学 6 / 层级 6 / 细节 6 / 功能 5 / 创新 7）。
> 处理：回到第 4 步修复，重新触发评审（第 3 轮）。

---

## 评审者自述的边界

> 本会话的 `Read` 工具对 `prototype/shots/*.png` 一律返回 `binary file`，**12 张截图我一张都没看到**。
> 下文 400px 相关结论来自 CSS/DOM 推算与行宽算术，凡属目视项会标明。
> 另外我两次读取 `pane-today.js`/`app.js` 得到不同行数，最终以 212 行 / 570 行版本为准。

---

## 五维评分

### 1. 哲学一致性：6/10（Functional）

`.lede` 确实用上 `var(--t1)`（`app.css:223`）、`reduced-motion` 落在 `app.css:771-778`、
条目行圆角真的是 0（`app.css:611`）——这三条是真的。
但硬规则仍有未承认的违反：`#capture/error` 同屏 **2 处 brand 实底**
（`pane-capture.js:35` + `:51-55`）；`app.css:748` `.inline-done` 仍是 T5 且承载整句；
`app-pages.css:148` `.evidence` 用 `label-secondary` 承载 90 字引文。

### 2. 视觉层级：6/10（Functional）

第一眼成立；`panel-title` 降 T4 后与 `.suggest-title`(T3) 的抢占解除。
但 **24px 槽位在 4 个页面里是零信息量的重复导航词**：
`pane-memory.js:208`「记忆」、`pane-todo.js:174`「待办」、`pane-health.js:63/74`「库健康」、
`pane-capture.js:27`「记一条」——这些词上方 `.nav-item[aria-selected]` 已标过一遍，
而真正的导语句被放在 `.lede-sub` 的 14px secondary 上。最大字号没有对应最重要信息。

### 3. 细节执行：6/10（Functional）

间距网格干净了；但新增属性顺序 bug：`app.css:492` `.capture:focus-within` 在前、
`:493` `.capture:hover` 在后，特异性同为 (0,2,0) → **鼠标点进捕获框时边框立刻退回 `border-l2`**，
新裁决承诺的「整块边框变深」在最常见路径上失效。
另：`.inline-done[data-tone="ok"]`（`app.css:756`）是死规则。

### 4. 功能性：5/10（Functional）

写入是真的（`app.js:329` `unshift`、`:347-355` `splice`），深链 `hashchange` 与 `goto` 重置也补了。
但「成」态是**伪造的**：`app.js:469-471` 与 `:169` 只注入文案不动数据；
`#todo/success` 同时显示「待拍板清空了」与「要我拍板的 1」；
`#today/success` 说「可撤销」而 `lastCapture === null` → 撤销按钮不渲染。
这是第 1 轮 P0-1 判死的同一类缺陷，换了条路径回来。
另：记一条页没有「写入失败」态。

### 5. 创新性：7/10（Strong）

2×2 线索格确实拆成了行内句子；`lastAction.source` 让反馈跟着动作来源落地，
是个不套模板的决定。扣分点：`.more` 折叠（`app-pages.css:171-189`）去掉 marker、
12px 等宽、无边框，与 `.meta` 视觉同构，展开与否全靠 hover 变色暗示。

---

## 五维变化

| 维度 | 第1轮 → 本轮 | 变化是否真实 |
|---|---|---|
| 哲学一致性 | 4 → 6 | 真实。T1、reduced-motion、行圆角、区块字距四项确已落地；但 brand 单点规则在 error 相位复发，故不到 7 |
| 视觉层级 | 5 → 6 | 部分真实。`panel-title` 降档解除 T3 抢占；但 24px 被重复导航词占用，属「换了个错误占位」 |
| 细节执行 | 5 → 6 | 真实。间距/字面色值/骨架呼吸都清了；但 `:hover` 覆盖 `:focus-within` 是修复引入的新 bug |
| 功能性 | 4 → 5 | 只涨 1 分。写入链路真修好了，但「成」态从「缺失」变成「可用但内容是假的」，同一缺陷换形态 |
| 创新性 | 6 → 7 | 真实。网格→行内线索是可验证的结构改动 |

---

## Keep（下一轮别破坏）

1. **`.trail` 行内线索**（`app-pages.css:20-67`）：数字嵌句子、不做等宽方格，全站最不像模板处。
2. **台账行不是卡片**（`app.css:599-613`）：hairline + 圆角 0 + hover 只改底色。
3. **`lastAction.source` 反馈归属**（`pane-today.js:114-134`）：每个提示贴着产生它的按钮。
4. **可操作的错误文案**（`pane-today.js:159-166`、`pane-health.js:47-53`、`pane-todo.js:161-167`）。
5. **记忆页空态三分**（`pane-memory.js:149-172` + `:263-272`）：库空/筛选空/检索空各有不同出口。

---

## Fix

### P0（阻断）

- **P0-A `#capture/error` 同屏两处 brand 实底** — `pane-capture.js:35` 的 `MO.primary('存进去')`
  在 `head` 里无条件渲染，`:54` 错误分支再加 `MO.primary('重试')`。
  改法：错误分支「重试」改 `MO.button`（读失败时主操作应是继续写），
  或 `head` 里的 `存进去` 在 error 相位降为次按钮。
  **验收要按「渲染路径 × 相位」穷举，而不是只测 ready。**

- **P0-B “成”态伪造「可撤销」与数据矛盾** — `app.js:133-144/169/469-471` 只塞文案不动数据；
  `ui.js:126-128` 因 `lastCapture === null` 不出撤销按钮。
  改法：`successActionFor` 不要写「· 可撤销」；或让 success 走真实路径
  （today/capture 真的 `unshift` 并置 `lastCapture`，todo 真的 `confirmEntry`）。

- **P0-C 交付文档的验收声明与代码不符** —
  ① `review/5a-self-check.md:163` 称「实际媒体查询 1 处，且只在 app.css（tokens.css 仅注释提及）」，
  实测 `tokens.css:81-88` 是一整块真实 `@media`；
  ② 同文件 `:168` 称「每屏 brand 实底 1（DOM 实测）」，但只覆盖 ready 相位；
  ③ `implementation-plan.md:267-273` 用 `scrollWidth 451 / 436` 证明无横向溢出——
  面板只有 400px，这两个数字**本身就不可能来自 400px 侧栏**。

### P1

- 记一条页没有写入失败态（IA §5.2 不可达）。
- 待办三段仍不独立报错，且错误文案在说谎（「三段互不影响」但实际整页变一个 alert）。
- `.capture:hover` 压掉 `:focus-within`。
- `label-secondary` 仍在承载 ≥3 行正文（`.evidence` 90 字、`.notice-text` 约 75 字）。
- `.inline-done` 用 T5 承载整句。
- 待办页潜在第二处 brand 实底（`pane-todo.js:124` `写结论`，`isFirst` 只是段内变量）。
- 「数字右对齐到同一条基线」仍未实现（`.meta-row` 左流；`.trail-num` 左对齐）。
- `.more > summary` 无可发现性。
- 浮层打开时同屏第 2 处 brand。
- `implementation-plan.md` 缺 CSS 合并策略（原型拆两份，落地到单个 `styles.ts` 必超 1000 行）。

---

## Quick wins

1. 交换 `.capture:hover` 与 `.capture:focus-within` 顺序。
2. `app.js:354` 撤销的 `lastAction` 补 `source: 'capture'`（现在今天页点撤销，两个分支都不渲染 → 反馈消失）。
3. `.inline-done` `var(--t5)` → `var(--t4)`。
4. `.evidence` 去掉 `color: label-secondary`。
5. 删掉 `tokens.css` 的重复 `@media` 块，或把 5A 结论改成事实。

---

## 方向卡问题

1. **T1 裁决的论据是错的**。可用宽度 = 400 − 2(边框) − 24(padding) = **374px**；
   该句 15 个 CJK 字 × 24px = 360px，加数字与空格 ≈ 381px > 374px → **必然折 2 行**。
   裁决的真实结论应是「允许导语折 2 行」，而不是「单行放得下」。
2. **圆角 8 归属裁决自相矛盾**：判据「能点 → 算卡片容器」，但「捕获区」本身合法 8 且当然能点。
   结果 `.suggest` + `.capture` 两个可点 8 圆角块并存，问题被重新命名而非判定。
3. **声称的 6 处裁决里有两处并不存在**：全文 grep「成本」无任何裁定首屏成本数字位置；
   「验收口径（scrollWidth）」只出现在 `implementation-plan.md`，方向卡本身没有裁定文本。
4. **§一-3「数字右对齐」与 §四「行内台账」冲突**，无裁决，实现悄悄选了左流换行。
5. **T4 一档承担过多语义**：区块标题、按钮、输入、正文句子全是 14px。

---

## 门禁判定

**不通过。**

依据：存在 **3 项 P0**。无维度 ≤4，但按「存在任一 P0 即不通过」的口径，本轮仍需回到修复。

需强调：**P0-1、P0-3、P0-5 的代码修复本身是真的**（`unshift`/`splice`、两页 empty 分支、
`app.css:771`），不通过的原因是验收口径与「成」态这两处仍在用文案代替行为——
这与第 1 轮的核心病灶是同一件事。

---

## 主代理对本轮报告的核实结论（逐条，不采信、不辩解）

| 评审指控 | 核实结果 |
|---|---|
| P0-A `capture/error` 有 2 处 brand | **成立**。已修：错误相位「重试读取」降为次按钮。穷举 25 组合后 `capture/error=1` |
| P0-B 成功态伪造「可撤销」且数据矛盾 | **成立**。已修：`successActionFor` 改为真的执行操作。截图证明 `todo/success` 中「要我拍板的」整段消失 |
| P0-C① `tokens.css` 有真实 `@media` | **不成立（评审读到旧版本）**。当前 `tokens.css` 的 `@media` 只有 `prefers-color-scheme: dark`，`prefers-reduced-motion` 计数为 0。我在评审运行期间修改过该文件 |
| P0-C② 只测 ready 相位 | **成立**。已改为穷举 5×5 |
| P0-C③ `451/436` 不可能来自 400px 面板 | **成立，是我错了**。原测量用了 `--window-size=400`，触发 `max-width: 780px` 分支使 `.sidebar` 变 `width:100%`。重测：视口 1200 → `sidebarW 398`、`navSW=navCW=398`、`pbSW=pbCW=383` |
| T1「单行放得下」是错的 | **成立**。实测 `.lede` 可用宽 359px、`offsetHeight 64px` / 行高 32px = **2 行**。已改为「允许折 2 行」并留下更正记录 |
| `.capture:hover` 压掉 `:focus-within` | **成立**。已按 `focus > active > hover` 重排 |
| `.inline-done` 是死规则 + T5 承载整句 | **成立**。已改 T4 且子节点 `color: inherit` |
| 方向卡缺 2 处裁决（成本数字、右对齐） | **成立**。已补两条判据 |
| `implementation-plan` 缺 CSS 合并策略 | **成立**。已补 `client/styles/{base,pages,index}.ts` 方案 + 验收第 8 条 |

> 关于 P0-C①：这是唯一一条「评审与环境状态不同步」造成的误判。
> 记录在此而非隐去，因为**评审读到旧文件**这件事本身说明：
> 如果修复与评审并发进行，评审结论就可能基于过期快照。
> 第 3 轮评审将在此轮修复全部落盘后启动。
