# 5A · 禁止清单逐条自检

> 执行时间：2026-11-17。核对对象：`prototype/`（7 个文件）+ `design/`（2 份文档）。
> 每条给出「是否命中 / 证据位置 / 修复动作」。**未清零点不得触发 5B**。

---

## 一、色彩与渐变

| # | 条目 | 命中 | 证据位置 | 修复动作 |
|---|---|---|---|---|
| 1 | 紫 / 靛蓝 / 紫罗兰作强调色 | ❌ 未命中 | `tokens.css` 全部颜色色相 250（冷灰蓝），与宿主既有 brand 的墨水蓝同族，无紫色相 | — |
| 2 | 全屏紫→粉→蓝渐变背景 | ❌ 未命中 | `app.css` 全文无 `linear-gradient` 背景；唯一渐变是 `.skeleton` 的骨架屏微光（三个同色阶明度） | — |
| 3 | bg-clip-text 渐变标题 | ❌ 未命中 | 全文无 `background-clip: text` | — |
| 4 | 极光色块 / 发光彩色阴影 / 每卡相同 glow | ❌ 未命中 | `box-shadow` 仅出现 1 处：`.overlay-card`（浮层，方向卡 §四 允许） | — |
| 5 | 深蓝 `#0D1117` 作默认暗色 | ❌ 未命中 | `tokens.css` 暗色分支 base 为 `oklch(0.215 0.008 250)`，彩度 0.008、非 #0D1117 的蓝 | — |
| 6 | 赛博霓虹用于阅读界面 | ❌ 未命中 | 语义三色彩度上限 0.168（error），亮度 0.505–0.79，非霓虹级饱和 | — |

---

## 二、字体与层级

| # | 条目 | 命中 | 证据位置 | 修复动作 |
|---|---|---|---|---|
| 7 | 单一字体身份、无第二字体或字重策略 | ❌ 未命中 | 第二身份 = **等宽**，用于全部元信息：`.meta` / `.tag` / `.cost-num` / `.trail-value`（`app.css` L163-171、L180-196）。方向卡 §三 明文规定；正文继承宿主 UI 字体 | — |
| 8 | 全文一个字重一个字号 | ❌ 未命中 | 5 档字阶（t1=24 … t5=12），2 档字重（400 / 600）。`tokens.css` L57-67 定义；`app.css` 每个字号都走 `var(--tN)` | — |
| 9 | gray-400/500 作正文色 | ❌ 未命中 | 正文句一律 `--dsw-alias-label-primary`（`app.css` L14 `body`、`.row-title`、`.lede-sub` 用 primary 的降级是 secondary **仅限 1 行说明句**）。⚠️ 详见下方「自检发现的修正」第 1 条 | 修正了 3 处：`.suggest-body`、`.lede-sub` 保持 secondary 但**限定单句**；`.body-block`（正文块）强制 primary |

---

## 三、布局与组件

| # | 条目 | 命中 | 证据位置 | 修复动作 |
|---|---|---|---|---|
| 10 | 每个元素同一圆角 / 无形状节奏 | ❌ 未命中 | 四档圆角按语义：`.tag` / `.row` = 0，`.btn` = 6，`.suggest` / `.capture` = 8，`.overlay-card` = 12。见方向卡 §四 | — |
| 11 | 圆角卡片 + 左侧彩色 border | ❌ 未命中 | `.notice` 用整块边框 + 文字，**无** `border-left` 彩边（`app.css` L519-537）。唯一 `border-left` 是 `.evidence`（1px 灰色 hairline，表示引用缩进，非彩色 accent） | — |
| 12 | 卡片嵌套卡片 / 圆角元素再加彩色边框 | ❌ 未命中 | 条目行 `.row` 是圆角 0 的台账行不是卡片；全屏唯一 `.suggest` 容器内只有文字与按钮，无嵌套卡片 | — |
| 13 | 固定三卡网格 + 圆角方块 lucide 图标 | ❌ 未命中 | 无任何图标；`.trail` 是 2×2 线索格，内容为数字+文字，非功能卡 | — |
| 14 | Bento grid 用于一切 | ❌ 未命中 | 全站无 grid 布局的功能区（`.trail` 是唯一的 2 列，用于 4 个等权数字） | — |
| 15 | 玻璃拟态 blur + border + shadow 堆叠 | ❌ 未命中 | 全文无 `backdrop-filter` | — |

---

## 四、图标、表情与动效

| # | 条目 | 命中 | 证据位置 | 修复动作 |
|---|---|---|---|---|
| 16 | Emoji 作结构性图标 | ❌ 未命中 | 全文无 emoji。状态用等宽文字签：`[观察中]` `[已确认]` `[等你补]` | — |
| 17 | 每卡 hover:scale(1.05) 上浮 | ❌ 未命中 | 全文无 `scale` / `translateY`。hover 只改 `background` 与 `border-color` | — |
| 18 | 全部滚动进入 fade-up（无触发区分） | ❌ 未命中 | 无 IntersectionObserver、无滚动动画。动效仅 3 处且均由动作触发：`shimmer`（骨架）、`fade`（浮层/就地反馈，120ms）、`transition`（hover/focus） | — |
| 19 | 忽略 prefers-reduced-motion | ❌ 未命中 | `tokens.css` L105-113 全局降级，含骨架屏 `animation: none !important` | — |

---

## 五、内容与状态

| # | 条目 | 命中 | 证据位置 | 修复动作 |
|---|---|---|---|---|
| 20 | 只做 happy path，四态缺位 | ❌ 未命中 | 五页 × 四态全部实现且**可切换验收**（`app.js` PHASES + `#pane/phase` 深链）。逐页核对见 §六 | — |
| 21 | Jane Doe / Acme / 99.99% 假数据 | ❌ 未命中 | `data.js` 全部来自真实库 `C:\Users\51967\.memory-ops`：3 条记忆（519/114/178 tokens，用 core `estimateTokens` 实算）、3 条 INBOX、5 条未命中、12 条事件 | — |
| 22 | 中央 hero = eyebrow + 大标题 + 两 CTA | ❌ 未命中 | 「今天」页是 `lede`（一句话结论）+ 建议卡（**1 主按钮 + 1 文字链**）+ 常驻捕获框 + 线索格。无 eyebrow pill，无并列双 CTA | — |

---

## 六、四态可达性逐页核对（新增检查）

| 页面 | 空 | 载 | 错 | 成 | 深链验证 |
|---|---|---|---|---|---|
| 今天 | ✅ 专属文案「这是你的第一条记忆」+ 聚焦捕获框 | ✅ 骨架 | ✅ 说明「库没丢，是读取问题」+ 重试 + 去库健康 | ✅ 就地「已确认」+ 剩余计数 | `#today/empty` `#today/loading` `#today/error` |
| 记一条 | ✅「还没有记过」+ 解释 | ✅ 输入区始终可用，只有历史区骨架 | ✅「写入仍可用」——读写分离 | ✅「已存入…·30 秒内可撤销」 | `#capture/empty` 等 |
| 待办 | ✅「清空了」+ 解释何时会再来 | ✅ 骨架 | ✅ 说明「三段互不影响」 | ✅ 条目移除 + 计数 -1 | `#todo/empty` |
| 记忆 | ✅ 三分：库空 / 筛选空 / 检索空（动作各不相同） | ✅ 骨架 | ✅「库没丢」 | ✅ 行内状态更新 | `#memory/...` |
| 库健康 | ✅ 「算不出来 ≠ 0」 | ✅ 骨架 | ✅ 不伪装成 0 | ✅ 维护执行后就地结果 | `#health/...` |

> 实测截图已生成在 `prototype/shots/`（9 张，含 3 张四态）。

---

## 七、自检发现的修正（本轮实际改动）

自检不是走过场——下面 5 条是真的命中或实测发现的问题，修掉之后才过的：

1. **正文色判定的边界**：`.lede-sub` 与 `.suggest-body` 用 `label-secondary`。
   按禁止清单「gray 作正文」的字面，这属于边界情况。
   **处理**：保留 secondary（方向卡 §二 允许「说明句」用它），但在方向卡里补一张精确边界表——
   **用户要连续读下去的，一律 primary**；同时核对 `.body-block`（记忆正文，唯一长段落）
   不设 color，继承 `body` 的 primary（`app.css` L790，已读代码确认）。

2. **`app.js` 超 1000 行**：初版 1023 行，违反硬约束。
   **修复**：拆成 `ui.js` + 5 个 `pane-*.js` + `app.js`，最大 422 行。

3. **原型双击打不开（白屏）**：初版用 ES module，`file://` 下被 CORS 拦截，
   实测截图是全白 6KB。
   **修复**：改经典脚本 + `window.MO` 命名空间。修复后截图 60–73KB，内容正常。
   （这条不属于禁止清单，但属于「原型必须真的能打开运行」的硬要求。）

4. **交互三态缺失（实测 grep 发现，非目测）**：方向卡 §六 要求所有可交互元素
   具备 hover / active / focus-visible 三态。实测 `app.css` 只有 2 处 `:active`，
   而 `.kindbtn` / `.trail-cell` / `.textlink` / `.row-button` / `.more > summary`
   五个控件**完全没有 active 态**，`.capture-input` 也没有任何自身焦点态。
   **修复**：补齐 5 个 active 规则 + `.capture` 的 hover/active + `.capture-input:focus-visible`。
   修复后实测：`:hover` 13 处、`:active` 11 处、`:focus-visible` 8 处、`:focus` 2 处。

5. **交付文档里的两个数字是凭印象写的，实测后被推翻**：
   - 写「删掉 6 处 brand 实底」→ 实测 `var(--dsw-alias-brand-primary)` 共 **24 处**
     （其中 8 处是焦点环、3 处是链接，属于合法用色，不该算违规）。
   - 写「八种圆角值」→ 实测 `border-radius` 共 **9 种取值**
     （12 / 2 / 3 / 4 / 6 / `6px 6px 0 0` / 7 / 8 / 9）。
   **修复**：`implementation-plan.md` 改为按「用途」分类处置，而不是笼统说删几处；
   方向卡改为「实测 9 种」。教训：这类数字必须以 grep 为准，不能凭印象写进交付物。

---

## 八、5A 结论（第 1 轮，历史记录）

**首次自检：禁止清单 22 条命中 0 条。** 但此结论被 5B 独立评审部分推翻——
评审发现的方向卡规则违反（brand 多处、T1 零使用、T5 承载整句等）
属于「禁止清单之外、方向卡之内」的违规，5A 的 22 条覆盖不到。
这一点值得记下来：**禁止清单通过 ≠ 方向卡通过**，两者必须分开核对。

## 九、第 1 轮 5B 评审后的修复记录（本轮）

第 1 轮评审判定门禁不通过（哲学一致性 4/10、功能性 4/10，5 项 P0）。
逐条修复如下，全部经机器核验或截图复核：

| 编号 | 问题 | 修复 | 核验方式 |
|---|---|---|---|
| P0-1 | 捕获不写入 `MO.INBOX`，且伪造「30 秒可撤销」 | 真写入（含多行拆条）+ 真撤销按钮（从数组移除） | 代码 + 点击路径 |
| P0-2 | 同屏 2–3 处 brand 实底 | 今天页捕获框降为次按钮；待办三段行内动作全改次按钮 | grep |
| P0-3 | 记忆页/库健康页无空态；成功态不可选 | 两页补空态分支；PHASES 补「成功」并注入真实动作结果 | 截图 `10-memory-empty` / `11-health-empty` |
| P0-4 | T1 零使用；T5 承载整句 | `.lede` 改 T1；`.note`/`.notice-text`/`.alert-body`/`.cost-note`/`.evidence` 改 T4 | grep：T1 命中 1 处 |
| P0-5 | reduced-motion 只存在于待删除的 tokens.css | 移入 `app.css` 末尾（全局规则必须留在保留文件里） | grep |
| P1 | 一行 3 按钮 | 1 主按钮 + 1 文字链，其余进 `<details class="more">` | 截图 `03-todo` |
| P1 | `.suggest-body` 用次要色承载多行 | 去掉 color，继承 primary | grep |
| P1 | 条目行圆角是 6 不是 0 | 改 `var(--r-row)` | grep |
| P1 | 区块标题缺字距与上 hairline | 加 `letter-spacing: 0.02em` + `border-top` | grep |
| P1 | 骨架屏是位移不是呼吸 | 改 `opacity` 呼吸 keyframes | grep：`shimmer` 0 处 |
| P1 | 闸门编号 G3 直接显示 | 翻成「从对话总结的」 | grep |
| P1 | 补库段无可点动作 | 补「仍然补一条」按钮 | 截图 `03-todo` |
| P1 | 深链只在加载时生效；`goto` 不重置 phase | 加 `hashchange` 监听；切页重置 phase | 代码 |
| P1 | 首屏结论句是字面量「库里 3 条」 | 改为由 `data.entries.length` 计算 | 代码 |
| Quick-win | `calc(var(--s2) + 2px)` 非 4 倍数 | 改 `var(--s1)` | grep：0 处残留 |
| Quick-win | `.btn:active` 特异性压过 `.btn-primary` | 加 `:not(.btn-primary)`，主按钮按下态单独定义 | grep |
| Quick-win | 反馈不在输入框旁边 | `inlineResult` 移入捕获框内 | 截图 `01-today` |
| 自查 | `app.css` 涨到 1003 行超限 | 拆出 `app-pages.css`（页面级样式），共享规则与动效降级留 `app.css` | 行数：762 / 255 |
| 自查 | 今天页 2×2 线索格与「固定网格」同构（评审创新性扣分点） | 改为行内句子线索（数字嵌句，不占等方格） | 截图 `01-today` |
| 自查 | 面板固定高度导致内容被裁且无滚动 | 保留固定高度（真实侧栏行为）+ `panel-body` 显式纵向可滚；另加 `?unfold=1` 仅供截图核对 | 截图 |
| **自查（漏网）** | **待办页同屏仍有 3 个 primary**（确认 1 + 标完成 2）——P0-2 首次修复不彻底 | 改为「只有全页第一条拿实底，其余一律次按钮」 | **渲染后 DOM 实测**：today 1 / capture 1 / todo 1 / memory 0 / health 0 |
| 自查 | 方向卡自身 6 处矛盾（T1 与「20px 大字换行」冲突、区块标题档位、焦点环缺输入框分支、圆角 8 归属、验收口径用隐藏滚动条冒充无溢出、首屏成本数字是否可放） | 逐条在方向卡中写下裁决记录，不再留白 | 见 `design/direction-card.md` 裁决段落 |
| 自查 | IA 说「5 态」而控制台只有 4 项 | 裁定「成」= 真实动作后的就地反馈（非独立页面），控制台补 `success` 开关注入真实结果 | 截图 `12-today-success` |
| **自查（拆分引入的回归）** | 拆 CSS 时把 reduced-motion 挪进了 `app-pages.css`，等于 P0-5 复发（换了个待删文件） | 移回 `app.css`，并在 `tokens.css` 写明「本文件只放值、不放规则」 | grep：实际媒体查询只在 `app.css`，共 1 处 |
| **自查（假开关）** | `#today/success` 深链打开时界面与正常态字节级相同——`applyHash` 不在白名单里、也不注入反馈 | 抽 `successActionFor()` 供两处共用；`applyHash` 加 success 分支 | DOM 探测：today/capture/todo/memory 四页均 FOUND |
| **自查（重复反馈）** | 修完上一项后，同一句「已存入」在建议卡与捕获框**各出现一次** | 加 `lastAction.source` 字段，反馈跟着动作来源走（suggest / capture） | 截图 `12-today-success`：每处反馈只出现一次 |

## 十、5A 结论（第 2 轮提交时）

当时结论：禁止清单 22 条 0 命中、方向卡规则逐条通过。
**但该结论后来被第 2 轮 5B 评审部分推翻**，两处证据不成立：

1. 「每屏 brand 实底 = 1（DOM 实测）」只覆盖了 ready 相位，
   遗漏 `#capture/error`（实为 2 处）。
2. 「无横向溢出，`scrollWidth 451 = clientWidth 451`」——那组数字来自
   错误的测量条件（视口 400 触发窄屏分支，量到的是全宽侧栏）。

这说明一件事：**5A 的「机器核对」如果只测一条路径，结论就只是一条路径的结论。**
后续改为穷举（5 页 × 5 相 = 25 组合）才真正可靠。

## 十一、端到端交互实测（不是「代码看起来对」）

以下几项用注入脚本在真实浏览器里跑完整点击链路，读回数据状态：

**① 写入 → 撤销（P0-1 的核心承诺）**
```
写入前=3  写入后=4  撤销按钮=有 | 撤销后=3
```
即：真的 push 进 `MO.INBOX`，撤销真的移除，不是摆设。

**② 隐私闸门（错误路径）**
```
写入前=3 | 拦截弹窗=有 | INBOX未变=true | 脱敏按钮=有 | 脱敏后文本=我的 token 是 gho_****
```
即：拦截发生时**不污染数据**，且给出可用的脱敏版本。

**③ 成功态可达（P0-3）**
```
today   FOUND: 已存入记录流（想法）· 可撤销
capture FOUND: 已存入记录流（想法）· 可撤销
todo    FOUND: 已确认（观察中 → 已确认）· 待拍板清空了
memory  FOUND: 已归档「所有会话的思考过…」，之后仍可检索
```
四页的成功态都能真正渲染出反馈，不是空开关。

**④ 400px 无横向溢出（implementation-plan §五-6 的验收口径）**
```
navOverflow:  false   （scrollWidth 451 = clientWidth 451）
bodyOverflowX: false  （scrollWidth 436 = clientWidth 436）
```
用 `scrollWidth` 与 `clientWidth` 比较，不是「看不到滚动条就算过」。



### 遗留说明（不隐瞒）

- `prototype/tokens.css` 里的颜色是**占位实现**，方向卡 §零 已写明落地时必须整段删除。
  这不算「凭空发明颜色」，因为文件里每个变量名都与宿主 `--dsw-alias-*` 同名，
  且文件头有删除指令。
- 「成功态」不是独立第五态，而是由真实操作（确认 / 标记完成 / 存入）产生的就地反馈。
  理由已写入方向卡与 `app.js`：本项目已因「做完了但看起来什么都没发生」出过一次事故
  （`docs/product.md` §13.1），就地反馈比弹 toast 更能证明动作生效。
## 十二、第 2 轮 5B 评审后的修复

第 2 轮评审判定不通过（3 项 P0，无维度 ≤4）。逐条修复：

| 编号 | 问题 | 修复 | 核验证据 |
|---|---|---|---|
| **P0-A** | `#capture/error` 同屏 2 处 brand（`存进去` + `重试`） | 错误相位的「重试读取」降为次按钮；理由：读失败时用户想做的仍是「写」 | 穷举 25 组合：`capture/error=1` |
| **P0-B** | 成功态只塞文案不动数据，`#todo/success` 自相矛盾、`#today/success` 承诺不存在的撤销按钮 | `successActionFor` 改成**真的执行操作**（today/capture 真 `unshift` 并置 `lastCapture`；todo 真改 status；memory 真归档） | 截图：`todo/success` 中「要我拍板的」整段消失、共 2 件、底部「已确认…还剩 1 条」；`today/success` 撤销按钮真的有 |
| **P0-C①** | 5A 称「`tokens.css` 仅有注释提及 reduced-motion」 | **评审指认有误**：该文件当前 `@media` 只有 `prefers-color-scheme: dark`，`prefers-reduced-motion` 计数为 0。评审读到的是我修复前的版本 | 逐行核对 L59 / L80-87 |
| **P0-C②** | 5A 称「每屏 brand=1（DOM 实测）」但只覆盖 ready | 改为**穷举 5 页 × 5 相 = 25 组合**实测 | 除 loading 外全部 = 1 |
| **P0-C③** | 横向溢出的证据数字 `451/436` 不可能来自 400px 面板 | **评审正确，我错了**。原测量用了 `--window-size=400`，触发了 `max-width: 780px` 分支（`.sidebar` 变 `width:100%`）。重测：视口 1200 → `sidebarW 398`，`navSW=navCW=398`，`pbSW=pbCW=383` | 见 §十「一处必须更正的既往错误」 |
| P1 | `#todo/success` 之后 0 处 brand | notice 段的「仍然补一条」参与整页名额分配 | 穷举结果 `todo/success=1` |
| P1 | `.capture:hover` 压掉 `:focus-within`（鼠标点进必然同时 hover → 焦点提示失效） | 按 `focus > active > hover` 重排 | CSS 顺序 |
| P1 | `.inline-done` 用 T5 承载整句 | 改 T4；撤销文案截断到 20 字 | T5 使用者列表已无 `.inline-done` |
| P1 | `.inline-done[data-tone]` 是死规则（子节点写死颜色） | 子节点 `color: inherit` | 代码 |
| P1 | `.evidence` 用次要色承载 90 字引文 | 改 primary，靠 hairline 表达「被引用」 | 代码 |
| P1 | 跨段 brand 冲突（`写结论` 可能与 `确认` 同屏） | 名额提升到 `renderTodo` 作用域统一分配 | 代码 + 穷举 |
| P1 | `.more > summary` 无可发现性（与 `.meta` 同构） | 加 `▸` 箭头，展开时旋转 90° | 截图 `03-todo` |
| P1 | `memory/ready`、`health/ready` 是 0 处 brand（无主操作） | 记忆页「搜」升为主按钮；库健康页加「回今天，看该做什么」 | 穷举结果 |
| P1 | 记一条页无写入失败态（IA §5.2 不可达） | 加 `#fail` 触发路径，**失败时不清空输入** | 代码 |
| P1 | `implementation-plan` 缺 CSS 合并策略 | 补 `client/styles/{base,pages,index}.ts` 拆分方案 + 新增验收第 8 条 | 文档 |
| 方向卡 | T1 裁决的论据是错的（称「单行放得下」） | **评审正确**。实测 `.lede` 可用宽 359px、24px 字号、行高 32px、`offsetHeight 64px` → **2 行**。改为「允许导语折 2 行」并留下更正记录 | 实测 JSON |
| 方向卡 | 「成本数字是否可上首屏」无裁决 | 补判据：「无法行动的数字 = 既不能点、又不解释」；成本数字可留但必须可点 + 自带说明 | 文档 |
| 方向卡 | 「数字右对齐」与行内台账冲突无裁决 | 补：构成两列才右对齐（`.cost`）；行内台账不假装对齐 | 文档 |

## 十三、5A 结论（当前）

禁止清单 22 条：**0 命中**。方向卡规则逐条复验通过。
关键指标：

| 检查项 | 结果 |
|---|---|
| brand 实底（穷举 25 组合） | 除 `loading`（无按钮）外**全部 = 1** |
| `prefers-reduced-motion` 媒体查询 | `app.css` 1 处；`tokens.css` 0 处（仅 `color-scheme`） |
| 字面色值（app.css + app-pages.css） | **0** |
| T1 使用 | 1 处（`.lede`），已知折 2 行 |
| T5 承载多行正文 | **0** |
| 单文件最大行数 | **804**（`app.css`） |
| JS 语法 | 8 个文件全部通过 `node --check` |


禁止清单 22 条：**0 命中**。方向卡规则：本轮修复后逐条复验通过（见 §九核验列）。
机器核对结果（重新实测，非沿用上一轮）：

| 检查项 | 结果 |
|---|---|
| `app.css` / `app-pages.css` 字面色值 | **0** |
| `prefers-reduced-motion` 实际媒体查询 | **1 处，且只在 `app.css`**。`tokens.css` 里 `@media` 只有 `prefers-color-scheme: dark`，无 `prefers-reduced-motion`（已逐行核对 L59 / L80-87） |
| `font-size: var(--t1)` 使用处 | **1**（`.lede`） |
| `shimmer` / `background-position: 100%` 位移残留 | **0** |
| `calc(var(--s2) + 2px)` 非 4 倍数间距 | **0** |
| `T5` 承载多行正文 | **0**（`.inline-done` 已改 T4） |
| 每屏 brand 实底 | **穷举 5 页 × 5 相 = 25 组合实测**：除 `loading`（无按钮）外**恰好 1** |
| 单文件最大行数 | **783**（`app.css`）< 1000 |

### 一处必须更正的既往错误（诚实记录）

第 1 轮提交时，我在本节写过「`scrollWidth 451 = clientWidth 451`，证明无横向溢出」。
**那组数字是错的**：探测时我用了 `--window-size=400,900`，触发了
`@media (max-width: 780px)` 分支（`.sidebar { width: 100% }`），
于是量到的是「全宽侧栏 451px」，不是「400px 面板」。

第 2 轮评审据此指出该证据无效，判断正确。已重测（视口 1200，面板走固定 400px 分支）：

```
viewport 1200 → sidebarW 398, navSW 398 = navCW 398, pbSW 383 = pbCW 383
```

即：**398px 面板内 nav 与 body 均无横向溢出**。结论仍然成立，但**依据换了**。
教训与 `implementation-plan.md` §五 记过的是同一条：这类数字必须以正确量测条件为准，
不能拿一次「看起来对」的运行结果当证据。


