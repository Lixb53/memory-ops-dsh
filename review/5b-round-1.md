# 5B · 独立评审 第 1 轮

> 评审者：`design-critic` 子代理（只读角色，仅 Read/Glob/Grep，不得编辑）。
> 评审基准：`design/direction-card.md` 原文 + 产出物文件。
> 未向评审者传递主代理的任何自我评价、分数或修复理由。
>
> **轮次结论：门禁不通过。**
> 触发条件：两维 ≤4（哲学一致性 4/10、功能性 4/10）+ 5 项 P0。
> 处理：回到第 4 步修复，重新触发评审（第 2 轮）。

---

## 评审者自述的方法边界

> `Read` 对 `prototype/shots/*.png` 一律返回 `binary file`，本会话没有图像读取能力，**9 张截图我一张都没看到**。
> 因此下文所有"400px 观感"结论都来自 CSS/DOM 尺寸推算，不是看图。凡属需要目视确认的（截断位置、实际换行数、拥挤程度），我都标了"需目视复核"，不冒充已看过。

---

## 五维评分

### 1. 哲学一致性：4/10（Broken）

方向卡最强调的三条规则在原型里同时被违反且未被承认：

- §二"全屏最多一处 brand 实底"在 `pane-today.js:100`（`存进去`）与 `pane-today.js:150`（`确认这条`）同屏出现 2 个；
  `pane-todo.js:46` + `pane-todo.js:70` 实测数据下同屏 **3 个** brand 实底。
- §八-1"一行最多 1 主按钮 + 1 文字链接"在 `pane-todo.js:45-49` 与 `pane-todo.js:69-73` 变成 3 个按钮并列。
- §三字阶 L120 要求 T1 24px"每页仅 1 处"，`grep var(--t1)` 只命中 `tokens.css:39` 的定义，
  `app.css` 全文 **0 处使用**，全站最大字号是 20px。

### 2. 视觉层级：5/10（Functional）

最大字号被概括句占用而非可执行项：`app.css:188-194` `.lede` 是 T2/20px，说的是"有 3 件事压着，先从最上面那件开始"；
真正要点的建议卡标题 `app.css:311-317` `.suggest-title` 是 T3/16px，
与 `app.css:110-115` `.panel-title`（"记忆库"）**同字号同字重 16/600**，第二眼和第三眼完全同级。
T1 缺位使页面没有第一眼锚点。

### 3. 细节执行：5/10（Functional）

- `app.css:353` `.btn:active:not(:disabled)` 特异性 (0,3,0) 高于 `app.css:363-368` `.btn-primary` 的 (0,1,0)，
  键盘 Enter 激活主按钮时底色被刷成 `bg-layer-2` 而字色仍是 `bg-base`——浅底浅字。
- `app.css:144` `padding: ... calc(var(--s2) + 2px)` = 10px，正是方向卡 §四 点名要消灭的非 4 倍数间距。
- `pane-today.js:137` 把"库里 3 条，最近一条 1 天前"写成字面量，不随 `data.entries.length` 变化。

### 4. 功能性：4/10（Broken）

- **核心写入是假的**：`app.js:238-251` `submitCapture` 只设置 `lastAction`，
  `grep INBOX.push` **0 命中**——说"已存入记录流"但没有任何记录进入 `MO.INBOX`，
  IA §5.2 的"让用户看到它真的进去了"完全落空。
- `app.js:248` 还承诺"30 秒内可撤销"，而全文没有任何 undo 控件（`grep 撤销` 只命中该字符串本身）。
- 四态也不完整：`pane-memory.js:229-243` 与 `pane-health.js:44-53` **没有 empty 分支**，
  `#memory/empty`、`#health/empty` 会正常渲染完整数据。
- `app.js:146-151` 的 PHASES 只有 4 项，而 IA 明确写的是 5 项。

### 5. 创新性：6/10（Functional）

"行不是卡片"的台账化是真的落地了（`app.css:533-546` hairline 行、hover 只改底色不 scale；
`ui.js:67-70` 圆角 0 等宽状态签；无 emoji、无图标墙、无渐变）。
但今天页底部 `pane-today.js:160-165` 又摆出一个 2×2 等大方格、格内"大数字 + 小标签"的网格，
结构上与方向卡 §七 判死的"固定三卡网格"同构——最像模板的元素留在了最重要的页面。

---

## Keep（下一轮不要破坏）

1. **`.tag` 的处理**（`app.css:259-286` + `ui.js:67-70`）：圆角 0、等宽、1px 细框、状态靠文字而非色块，
   完全符合 §四"0 = 行内标记"和 §六-3。全站无 emoji 结构性图标。
2. **台账行而非卡片**（`app.css:533-546`）：`border-bottom: 1px solid border-l1` + `padding: var(--s2) 0`，
   `list-clickable .row:hover` 只改背景不加 scale，是编辑感能立住的地基。
3. **颜色纪律干净**：`app.css` 全文无一处 hex/rgba/oklch 字面量，全部走 `var(--dsw-alias-*)`；
   `tokens.css:1-12` 文件头明确写了"落地时整段删除"，这个交接契约写得比代码本身更重要。
4. **错误态文案可操作且不误导**：`pane-today.js:121-127`"库文件没有丢，这是读取问题"、
   `pane-health.js:47-53`"算不出来和是零是两件事，所以这里不显示 0"——这是全原型最扎实的部分。
5. **派生状态每次重算**（`data.js:192-214` + `app.js:100`），`confirmEntry` 改完状态队列真的会动，
   避免了"点了没反应"。

---

## Fix

### P0（阻断，必须修才能交付）

- **P0-1 捕获没有真正写入 + 伪造撤销承诺** — `app.js:238-251`。
  改法：`submitCapture()` 成功分支向 `MO.INBOX` push 一条
  `{line: max+1, date, kind: state.captureKind, content: text, state: 'open', destination: '—'}`，
  并置顶渲染在 `pane-capture.js:80` 的"最近记的"列表与待办流转段；
  同时给 `inline-done` 加一个真实 `data-action="undo-capture"`（pop 该条），
  或删掉 `app.js:248` 的"30 秒内可撤销"。二选一，不能继续承诺做不到的事。

- **P0-2 全屏多处 brand 实底** — `pane-today.js:100` 与 `pane-today.js:150` 同屏 2 个；
  `pane-todo.js:46`、`pane-todo.js:70`、`pane-todo.js:91` 实测数据下同屏 3 个。
  改法：每屏只留 1 个 `.btn-primary`。今天页保留建议卡主按钮，`存进去` 降为 `MO.button`；
  待办页三个 lane 的行内动作一律用 `MO.button(..., 'btn-sm')`，整页不出现 brand 实底。

- **P0-3 两页空态不可达、成功态不可选** — `pane-memory.js:229-243`、`pane-health.js:44-53`
  均无 `state.phase === 'empty'` 分支，切到空态时照常渲染列表/成本数字。
  改法：`renderMemory` 加空态分支；`renderHealth` 加空态分支，成本数字输出「—」
  并按 IA §5.5 写"算不出来不等于 0"。同时 `app.js:146-151` 补 `{id:'success'}`，
  或同步修改 IA §五 L192 的"5 态"表述——不能文档说 5 个、代码给 4 个。

- **P0-4 字阶两条硬约束同时失效** — T1 24px 零使用（`app.css` 全文，`--t1` 仅定义于 `tokens.css:39`）；
  T5 被用于整句（`app.css:248-253` `.note`、`app.css:664-669` `.notice-text`、
  `app.css:642-647` `.alert-body`），而方向卡 §三 L124 明写 T5"仅等宽或短标签"。
  改法：`.lede` 改 `var(--t1)`；`.note`/`.notice-text`/`.alert-body` 改 `var(--t4)`，
  只在 `.meta`/`.tag`/`.nav-count`/`.capture-hint` 保留 T5。

- **P0-5 reduced-motion 落在"必须删除"的文件里** — `tokens.css:80-88` 是全站唯一
  `prefers-reduced-motion` 实现，而方向卡 §零要求移植时**整个 tokens.css 删除**；
  `grep prefers-reduced-motion prototype/app.css` 结果为空。
  改法：把该 `@media` 块原样搬进 `app.css` 末尾再谈交付。

### P1（视觉/契约代价高）

- **一行 3 按钮，违反§八-1** — `pane-todo.js:45-49`（确认/驳回…/看全文）、
  `pane-todo.js:69-73`（标完成/丢掉/改内容）。改法：留 1 primary + 1 textlink（看全文），
  把"驳回…""丢掉"收进与 `pane-memory.js:120-128` 同款的 `<details class="more">`。
- **`label-secondary` 当作多行正文** — `app.css:319-325` `.suggest-body`，
  400px 下实测跨 4 行以上，触发方向卡 §二 L87-88 的禁令。改法：去掉 color 继承 primary。
- **条目行圆角不是 0** — `app.css:540-545` `.list-clickable .row { border-radius: var(--r-control) }`，
  与 §四"条目行本身——不做圆角"冲突。改法：改为 `var(--r-row)`。
- **"数字右对齐到同一条基线"未实现** — `app.css:240-246` `.meta-row` 是左起 flex-wrap，
  `pane-memory.js:216-221` 的 tokens/域/引用数在行内左流换行，只有 `.cost-num` 真正右对齐。
  改法：列表行右侧固定一列 `meta` 右对齐（`margin-left:auto` + `text-align:right`）。
- **区块标题缺"字距 + 上 hairline"** — `app.css:203-210` `.section-head` 只有 `border-bottom`，
  `.section-title` 无 `letter-spacing`。改法：加 `letter-spacing: 0.02em` + `border-top`。
- **成功反馈不在原位** — `pane-todo.js:149` 的 `inlineResult` 挂在整页最底部；
  `pane-today.js:153` 把"已存入"塞进建议卡内，而捕获框在下方。改法：移到各自动作之后。
- **骨架屏是位移不是呼吸** — `app.css:589-604` 动的是 `background-position`，
  §五要求"1.2s 呼吸，不用位移动画"。改法：改成 `opacity` 呼吸 keyframes。
- **内部闸门编号泄露** — `pane-memory.js:81` 直接渲染 `item.gate`（值为 G3），
  违反 IA §四。改法：渲染 `entry.originLabel`。
- **"补库"段无动作可做** — `pane-todo.js:106-114`：5 条未命中全部 `count=1 < 阈值 3` 时，
  该段只剩一段说明文字，**没有任何可点动作**，正文却说"现在补也行"。
  改法：notice 后补一个"仍然补一条"按钮。
- **待办三段不独立报错** — `pane-todo.js:120-127` 一段失败整页变一个 alert，
  IA §5.3 要求"每段独立报错 + 独立重试"。同理 `pane-health.js:51` 用 `MO.button`
  而其余四页错误态用 `MO.primary('重试')`，同一语义两种权重。
- **深链只在加载时生效** — `app.js:420-421` 只在启动调一次 `applyHash()`，全文无 `hashchange` 监听；
  `goto` 也不重置 `phase`，错误态会跟着跳到下一页。

---

## Quick wins（5–15 分钟）

1. `app.css:544` `border-radius: var(--r-control)` → `var(--r-row)`，一行修掉条目行圆角违规。
2. `app.css:144` `calc(var(--s2) + 2px)` → `var(--s3)`，消灭全文唯一非 4 倍数间距。
3. `app.css:353` 改成 `.btn:active:not(:disabled):not(.btn-primary)`。
4. `pane-today.js:137` 的 `'没有待办。库里 3 条，最近一条 1 天前'` 改为模板串用 `data.entries.length`。
5. 把 `pane-today.js:153` 的 `inlineResult` 从 `.suggest` 内移到最后（捕获框之后）。

---

## 方向卡问题（评审者指出方向卡本身有 6 处问题）

1. **T1 自相矛盾**：§三规定 T1 24/32"每页仅 1 处"，§一又断言"20px 以上标题会换行成灾"。
   400px 侧栏里这两条不能同时成立，实现选了"0 处 T1"但卡里没有留下裁决记录。
2. **区块标题档位冲突**：§三把 T2 分给"区块标题"，§一又要求"区块标题用小号 + 字距"。
3. **焦点环规则缺输入框分支**：§六-1 规定 `outline-offset: 2px` 且"不得用 outline: none 代替"，
   但输入框用 `outline-offset: -1px`、捕获框内层直接 `outline: none`。
4. **圆角 8 的归属不全**：§四说 8 是"唯一建议卡、捕获区"，但 `.alert`/`.notice`/`.sidebar` 也用了 8，
   "全屏只保留 1 张容器"因此不再可判定。
5. **验收口径与实现手法冲突**：`implementation-plan.md` §五-6 要求"400px 下无横向滚动条"，
   而 `.nav` 用 `overflow-x: auto` + `scrollbar-width: none` 把溢出藏了起来。
6. **§七"使用真实库数据"与 §八-3"禁止首屏出现无法行动的数字"存在张力**：
   今天页把 `171 tokens / 请求` 放进首屏线索格，可点但仍是成本数字。

---

## 门禁结论

**不通过。**

- 存在两维 ≤4：哲学一致性 4/10、功能性 4/10。
- 存在 5 项 P0：捕获写入为假且伪造撤销承诺；brand 实底同屏 2–3 处；
  记忆页与库健康页空态不可达 + 成功态不可选；T1 字阶零使用且 T5 承载整句；
  reduced-motion 唯一实现位于待删除文件。

需说明的评审边界：9 张 PNG 在本会话不可读，400px 判断均由 CSS/DOM 推算得出，
未经过目视确认；截断位置与真实换行数建议由具备图像能力的一方复核。
