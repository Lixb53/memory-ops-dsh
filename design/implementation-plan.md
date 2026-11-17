# 落地改动清单 · v4

> 配套：`design/direction-card.md`（视觉契约）、`design/information-architecture.md`（IA）、
> `prototype/`（可运行高保真原型）、`review/5b-round-*.md`（独立评审）。
>
> 本文回答一个问题：**要把原型变成 `packages/dsh-plugin` 里的真实代码，改哪几个文件、按什么顺序。**

---

## 零、总原则：不删路由，只换入口

34 条路由全部保留。现有的 `test/wiring-ui.test.mjs` 会断言「每条路由都有 UI 调用点」，
它是防止入口在重构中丢失的机器闸门——**迁移过程中它必须始终全绿**。

先跑一遍基线，确认当前状态：

```bash
pnpm test        # core 232 + plugin 90 = 322 项
pnpm typecheck
```

---

## 一、改动范围一览

| 文件 | 动作 | 说明 |
|---|---|---|
| `client/panel.ts` | **重写导航** | 5 个 PaneId 换成 5 个任务入口 |
| `client/pane-nav.ts` | 改 `PaneId` 联合类型 | `project/stream/memory/misses/overview` → `today/capture/todo/memory/health` |
| `client/panes/today.ts` | **新建** | 合并旧 `project.ts` 的队列 + 首屏引导 |
| `client/panes/capture.ts` | **新建** | 承接旧 `stream.ts` 的捕获部分 |
| `client/panes/todo.ts` | **新建** | 合并旧 `stream.ts` 流转 + `misses.ts` 补库 + `project.ts` 拍板 |
| `client/panes/memory.ts` | 改造 | 去掉「仅本项目」默认歧义，筛选签改动作词 |
| `client/panes/health.ts` | **新建** | 旧 `overview.ts` + `maintenance.ts` 合并 |
| `client/panes/project.ts` | **删除** | 职责拆进 `today.ts` 与 `memory.ts` |
| `client/panes/stream.ts` | **删除** | 职责拆进 `capture.ts` 与 `todo.ts` |
| `client/panes/misses.ts` | **删除** | 合并进 `todo.ts` 的补库段 |
| `client/panes/overview.ts` | **删除** | 改名为 `health.ts` |
| `client/panes/maintenance.ts` | 保留但改文案 | 作业名换成用户语言（见 §四） |
| `client/styles.ts` | **重写** | 11 种字号 → 5 档；圆角 8 种 → 4 档；删掉 6 处 brand |
| `client/ui.ts` | 改原子件 | `Badge` 改为圆角 0 的 `Tag`；新增 `InlineResult` |
| `client/session-view.ts` | 轻微改 | 术语对齐（见 §四） |
| `client/capture-tab.ts` | 轻微改 | 无需改结构，只改文案 |
| `test/wiring-ui.test.mjs` | 改断言目标 | 分区名变了，调用点断言要跟着改 |

---

## 二、按依赖顺序的四步

### 第 1 步：样式地基（先做，因为它决定后面所有渲染）

`client/styles.ts` 是纯字符串常量，改它不影响逻辑，风险最低，但收益最大。

> **⚠️ CSS 合并策略（第 2 轮评审补写）**
>
> 原型把样式拆成了 `app.css`（783 行）+ `app-pages.css`（242 行）两份，
> 目的是满足「单文件 ≤1000 行」的硬约束。
> 而 `styles.ts` 是**一个模板字符串常量**，把两份合并进去必然超 1000 行。
>
> 落地时必须同步拆 TS 文件，不能只拆 CSS：
>
> ```
> client/styles/
> ├── base.ts            变量 + 排版 + 按钮 + 输入 + 台账行 + 四态 + 动效降级
> ├── pages.ts           今日/待办/库健康/详情/浮层的页面级规则
> └── index.ts           拼接两份字符串 + installStyles()
> ```
>
> `index.ts` 只做组装：
> ```ts
> const CSS = BASE + PAGES
> ```
> 这样每个 TS 文件都 < 1000 行，且 `installStyles()` 的对外签名不变。
>
> 验收要加一条：**`client/styles/*.ts` 每个文件 < 1000 行**。
> 否则这次拆分在落地时会被重新合并回去，等于没做。

**要做的三件事：**

1. **字号归一**。现状 11 种（10 / 10.5 / 11 / 11.5 / 12 / 13 / 14 / 15 / 16 / 17 / 18），
   改为 5 档 + CSS 变量：

```css
/* 追加到 CSS 常量顶部 */
.dmo-root {
  --t1: 24px; --t1-lh: 32px;
  --t2: 20px; --t2-lh: 28px;
  --t3: 16px; --t3-lh: 24px;
  --t4: 14px; --t4-lh: 22px;
  --t5: 12px; --t5-lh: 18px;
  --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s5: 24px; --s6: 32px;
  --r-row: 0; --r-control: 6px; --r-container: 8px; --r-overlay: 12px;
}
```

   然后逐个替换（实测对照表）：

| 旧值 | 出现处 | 新值 |
|---|---|---|
| 10 / 10.5 / 11 / 11.5 | 元信息、徽标、note、lane-count | **12**（`--t5`） |
| 12 | 正文、按钮、输入 | **14**（`--t4`） |
| 13 | 卡片标题 | **16**（`--t3`） |
| 14 | 弹窗标题 | **16**（`--t3`） |
| 15 / 17 | band-v、session-kpi b | **16**（`--t3`） |
| 16 | kpi-value | **20**（`--t2`） |
| 18 | 关闭按钮 × | 保持（它是图标尺寸，不是字阶） |

2. **把 brand 从 24 处收到 3 处**（方向卡 §二：全屏最多一处 brand 实底）。

   实测 `styles.ts` 里 `var(--dsw-alias-brand-primary)` 出现 **24 次**。分类如下：

| 用途 | 次数 | 处置 |
|---|---|---|
| `outline: 2px solid` 焦点环 | 8 | **保留**——焦点环必须高对比，这是 WCAG 要求，不是装饰 |
| 链接色（`.dmo-link` / `.dmo-kpi-more` / `.dmo-remember-undo`） | 3 | **保留 1 处**：合并为一个 `.dmo-link` 类，其余复用 |
| `border-bottom-color`（tab 选中） | 1 | 改 `label-primary` |
| `background` 实底（`.dmo-btn-primary`） | 1 | **保留**——这是唯一允许的 brand 实底 |
| `background` 实底（其余 4 处） | 4 | **全部改掉**，见下表 |
| `color`（徽标 / 选中 tab / chip） | 5 | 改 `label-primary` |
| `border-color` / `color-mix` 边框 | 2 | 改 `border-l2` |

   4 处须改掉的实底：

| 位置 | 现状 | 改为 |
|---|---|---|
| `.dmo-chip[aria-pressed="true"]` | brand 实底 | `border-color: label-primary; color: label-primary; font-weight: 600` |
| `.dmo-budget-fill` | brand 实底 | `label-secondary` |
| `.dmo-step-now` | brand 实底 | `label-primary` |
| `.dmo-badge-brand` | brand 15% 底 + brand 字 | 改用 `.dmo-tag`（圆角 0、1px 边框、无色底） |
| `.dmo-bulk` | brand 8% 底 + brand 28% 边 | 改用 `.dmo-notice`（border-l1 + 轻底色，无品牌色） |

> ⚠️ 我在初稿里写的「6 处」是错的——那个数字只数了「实底消耗」，
> 漏掉了 8 个焦点环与 3 个链接。实际值 24，处置策略也因此不同：
> **焦点环与链接是合法用色，不该被当成违规**。这类数字必须以 grep 为准，
> 不能凭印象写进交付文档。

3. **去掉卡片容器**。`.dmo-card` 的 `border + border-radius: 8 + background` 改为
   `padding: 8px 0; border-bottom: 1px solid border-l1; border-radius: 0`。
   这一步会一次性消掉「所有区块视觉重量相同」的问题。

> ⚠️ 这一步改完界面会短暂变「丑」（所有卡片都变成素行）。这是预期的中间态，
> 第 2 步补上 hairline 分组与等宽元信息后才会立起来。不要在这里回头。

### 第 2 步：UI 原语（`client/ui.ts`）

| 原子件 | 动作 |
|---|---|
| `Badge` | 保留但收窄用途（只用于状态）；新增 `Tag`（圆角 0、直角细框、等宽） |
| 新增 `InlineResult` | 就地反馈条，替代散落的 `dmo-toast` 用于**成功**路径 |
| `Button` | 增加 `quiet` variant（文字链风格），用于「第二出口」 |
| `Kpi` | 改为 `CostRow`：竖排名称 + 数字 + 一句解释，不再并排等大 |
| `Stepper` | 保留（它表达状态机位置，有价值），但颜色改 `label-primary` / `border-l1` |

### 第 3 步：分区重写

按新导航顺序做，每做完一个就跑一次接线测试。

#### 3.1 `today.ts`（新建）

数据源：`snapshot`（取 `queue` 与 `entries`）+ `misses`。

```
一句话结论  ← 由 todoTotal 决定，不是写死的
唯一建议卡  ← 优先级：拍板 > 补库 > 流转 > 兜底
常驻捕获框  ← 调 capture
四条线索    ← 待办 / 搜不到 / 记忆 / 每请求成本
```

**关键实现要求**：建议卡的 `pickSuggestion()` 必须是一个**纯函数**并单独导出，
这样能写单测（`test/today-suggestion.test.mjs`），覆盖四种优先级各自被选中的情况。
这是当前代码库里最缺的一类测试——`docs/product.md` §17.9/§17.10 记录的两次事故
都是「逻辑对但没人调用」或「渲染顺序错」，纯函数测试能挡住前者。

#### 3.2 `capture.ts`（新建）

从 `stream.ts` 抽出：类型选择、多行拆条、`captureBatch` 分流、隐私拦截展示。
`stream.ts` 原有的吞吐 KPI 与筛选下拉**不搬过来**——它们属于 `todo.ts`。

#### 3.3 `todo.ts`（新建）

三段，每段独立 `useBridge`，一段失败不影响其它两段：

| 段 | 数据源 | 主按钮 |
|---|---|---|
| 要我拍板的 | `snapshot.queue` | `confirm` 路由 |
| 要我流转的 | `inbox`（`open`/`todo`） | `updateInbox` |
| 要我补的 | `misses.pipeline['should-fill']` | `missDraft` → `missConfirm` |

**必须保留的旧逻辑**（它们都是踩过坑才有的）：
- 空段整体不渲染，但「要我补的」未达阈值时用 `Notice` 说明（见原型 `pane-todo.js`）
- 批量归档要报出失败数（`memory.ts:169-172` 的既有处理）
- 驳回必须写理由，且与确认**同等显眼**（`ui.ts` 的 `RejectBox`）

#### 3.4 `memory.ts`（改造，不是重写）

改动点只有三处：

1. 筛选签从「待确认」改为「要我拍板」（`STATUS_GROUPS` 的 `label`）——
   理由见原型 `pane-memory.js` 的注释：状态机名与筛选词混用会导致「筛选说有待确认，
   列表里找不到待确认」的自相矛盾。
2. 详情页出口收敛：5 个并列按钮 → 1 主按钮 + 1 次按钮 + `<details>` 折叠其余。
3. 列表行去掉卡片容器（第 1 步已全局改掉，这里只需确认无 `.dmo-card` 残留）。

**不要动的**：搜索走 `search` 路由并 `record: true` 的记账逻辑、批量归档、`undoReject` 入口。
它们对应 `docs/product.md` §2.3 里补过的缺口，删掉就回退了。

#### 3.5 `health.ts`（新建，替代 `overview.ts`）

三行成本竖排（每请求 / 索引 / 全库）+ 维护作业（收起）+ 导出。

**必须保留的旧逻辑**：
- `resident.state === 'error'` 时不许伪装成 0（§17.8② 的教训）
- 三率分母为 0 显示「—」而非 0%（§11.4）
- `residentTokens` 取 `billedTokens`，不取 `l0.tokens`（§17.4② 的 bug）

### 第 4 步：导航与接线

`panel.ts` 的 `PANES` 常量改为：

```ts
const PANES = [
  { id: 'today',   label: '今天' },
  { id: 'capture', label: '记一条' },
  { id: 'todo',    label: '待办' },
  { id: 'memory',  label: '记忆' },
  { id: 'health',  label: '库健康' },
] as const satisfies readonly { id: PaneId; label: string }[]
```

`pane-nav.ts` 的 `PaneId` 同步改。**这一步会一次性红掉所有引用旧 PaneId 的地方**，
这是好事——编译器会列出全部待改点，比人工搜可靠。

---

## 三、术语替换（界面文案，一次性批量改）

| 文件 | 旧文案 | 新文案 |
|---|---|---|
| `misses.ts` → `todo.ts` | 该补了 / 观察中 / 草稿待确认 / 验证期内 / 已验证生效 | 等你补 / 先记着 / 草稿 / 试用中 / 已生效 |
| `maintenance.ts` | 爬升 / 减重 / 锚点校验 / 修补 / 复盘 | 升级可信度 / 压缩空行 / 检查引用的代码还在不在 / 补全缺失的元数据 / 本周小结 |
| `maintenance.ts:76` | 按需触发，无常驻定时器 | **删除**（实现细节） |
| `memory.ts:189` | 检索正文，回车记账（命中记 cite，未命中记 miss）… | 搜标题或域… |
| `memory.ts:256` | 检索会记账，过滤不该记账 | **删除** |
| `project.ts:277` / `memory.ts:401` | G1 用户直述可豁免 | 这条来自你亲口说的话，不需要再举证 |
| `overview.ts` | 常驻前缀 | 每请求成本 |
| `overview.ts` | 索引层体积 | 索引体积 |
| `session-view.ts` | 本次注入 / 引用 / 未命中 | 本次用到 / 被引用 / 搜不到 |

> 对照表全文见 `design/information-architecture.md` §四。改完必须**全文搜索**旧词确认清零。

---

## 四、测试要补的（这是落地质量的闸门）

| 测试 | 挡住什么 | 参考 |
|---|---|---|
| `today-suggestion.test.mjs` | 建议卡在四种优先级下选错 | 新增，纯函数 |
| `wiring-ui.test.mjs` 改断言 | 重构后某条路由失去 UI 调用点 | 改既有（§17.11 的路由全表测试） |
| Hook 顺序测试 | 白屏事故复发（§17.9） | 既有，改为扫新分区文件 |
| 术语黑名单测试 | 「记账」「爬升」「G1」等内部词回流界面 | **新增**：静态扫 client 源码，命中即红 |

最后一条是这次新增的。理由是：术语替换是纯手工活，靠人记必漏——
而它恰恰是「用户看不懂」的主因之一。用一行正则把它变成 CI 检查，比写进文档更可靠。

```js
// 示意
const BANNED = ['记账', '爬升', '减重', '锚点校验', 'G1 ', 'G2 ', 'G3 ', 'G4 ',
                '常驻前缀', '按需触发', '该补了', '验证期']
```

---

## 五、验收标准（可检查，不是感觉）

1. `pnpm test` 与 `pnpm typecheck` 全绿，且 plugin 测试数 ≥ 90 + 新增数。
2. 路由全表测试通过：34 条路由每条都有 UI 调用点。
3. 全文搜索旧术语（§三表格左列）在 `client/` 下 **0 命中**。
4. `styles.ts` 里 `font-size` 的不同取值 **≤ 7 种**（5 档字阶 + 2 个图标尺寸）。
5. `styles.ts` 里 `var(--dsw-alias-brand-primary)` 出现次数 **≤ 12**：
   8 个焦点环 + 1 个主按钮实底 + 1 个链接类（其余靠复用该类）。
   编写成测试时，按「用途」而不是「次数」断言更稳：
   - `background: var(--dsw-alias-brand-primary)` 全文 **必须只有 1 处**（主按钮）
   - 除 `.dmo-link` 外，任何 `color: var(--dsw-alias-brand-primary)` 为 0 处
6. **400px 宽下不产生横向滚动**。判定口径（第 1 轮评审后收紧）：
   不是「看不到滚动条」，而是「`scrollWidth <= clientWidth`」。
   只把 `overflow-x` 设成 `auto` 再用 `scrollbar-width: none` 藏掉滚动条是**不合格**的——
   溢出还在，只是看不见，用它当验收会得出错误结论。
   导航 `.nav` 允许 `overflow-x: auto`，但前提是**条目总宽真的超出时才启用**，
   且必须用 `scrollWidth` 断言过。

   **原型实测**（视口 1200，确保面板走固定 400px 分支；
   注意：用小视口会触发 `max-width: 780px` 媒体查询，`.sidebar` 变成 `width: 100%`，
   那时量到的不是面板宽度，结论无效——这一点我犯过一次，见 `review/5a-self-check.md`）：
   ```
   viewport 1200 → sidebarW 398
                   navScrollWidth  398 = navClientWidth  398   （无溢出）
                   bodyScrollWidth 383 = bodyClientWidth 383   （无溢出）
   ```
   即当前 5 个入口在 398px 可用宽度内放得下，`.nav` 的 `overflow-x: auto` 是**防御性声明**，
   不在正常数据下启用。

7. 每页可到达空 / 载 / 错三态，成功态由真实操作产生。
8. **`client/styles/*.ts` 每个文件 < 1000 行**（CSS 拆分在落地时不许被合并回去）。

> 第 4、5 条可以直接写成测试断言（正则扫 CSS 常量字符串），
> 这样它们不会随下一次改动静默失效。

---

## 六、风险与回退

| 风险 | 应对 |
|---|---|
| 5 分区 → 5 入口，用户已有肌肉记忆失效 | 保留 `/remember` 与右侧捕获表面不变；面板入口改名但位置不变（仍是侧栏第 30 位） |
| `PaneId` 改名引发大面积红 | 这是预期收益：编译器列出全部待改点。按目录分批改，每批跑一次测试 |
| 样式重写后宿主 token 缺失导致退化成黑白 | 现有代码已全部走 `--dsw-alias-*`，缺失时退化为无色而非崩掉；不需额外处理 |
| 重构期间新旧并存 | **不要**做兼容层。旧分区文件直接删除，靠 git 回退，不靠运行时分支 |

回退方式：整个改动放在一个分支，按上述四步分 4 个 commit，任一步出问题单独 revert。
