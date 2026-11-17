# 记忆库系统 · 架构评估与重构建议

> 评估对象：`packages/core`（5 个模块，约 6,100 行）+ `packages/dsh-plugin`（约 4,900 行）
> 评估基准：**保留现有核心设计理念**（Markdown 真相源 / 零常驻成本 / 人负责拍板 / 到期退役）
> 评估时间：2026-11-17
> 方法：读源码 + 在真实库上跑量测。凡数字均标注来源。

---

## 零、先说结论

**核心设计理念是对的，不需要推翻。** 需要动的是三件事，按优先级：

| # | 问题 | 严重度 | 为什么 |
|---|---|---|---|
| 1 | **`actions.ts` 1653 行单闭包**，34 个能力挤在一个函数作用域 | 高 | 它让「加一个能力」的成本持续上升，且**所有能力的失败模式被统一成一个 `{ok:false,error}`**，丢掉了「哪种失败」这个信息 |
| 2 | **每次调用都全量扫描 `scan()`**，13 处调用点无缓存 | 中（现在是低） | 当前 3 篇文件只要 2ms，不是瓶颈；但它是**唯一随库增长线性变慢的地方**，且已有 42 篇的实测先例 |
| 3 | **事件流 append-only 且永不轮转**，`sessionMemory` 全量解析后 `slice(-200)` | 中 | 这是**唯一没有上限**的数据结构。它只增不减，而产品主张是「成本可见」 |

**不建议做的事**（会破坏核心主张）：
- 引入数据库 / 向量检索 —— 违反「人可审」与「零常驻成本」
- 把 core 拆成微服务 / 多包 —— 只会增加部署复杂度，不解决任何实际问题

---

## 一、核心设计理念：先确认哪些不能动

在提任何改动前，先把**不可动**的部分列清楚。这是评估的前提，否则建议会失控。

| 理念 | 实现位置 | 为什么必须保留 |
|---|---|---|
| **Markdown 是唯一真相源** | `store.ts` 全文件 | 「人可审、可 git、可手改」是产品根基。`docs/product.md` §11.3 明确拒绝 per-record 存储 |
| **零常驻成本** | 无后台进程、无定时器 | 常驻前缀 361 tokens 是第一指标。任何常驻进程都会把成本拉回老路 |
| **人负责拍板** | `STATE_TRANSITIONS`（自动）与 `HUMAN_STATE_TRANSITIONS`（人工）**分开两张表** | 自动逻辑永远不许跳级到 confirmed。这是产品立场的代码化 |
| **只追加事件流** | `events.jsonl` | 历史不可改，才有审计可能 |
| **原子写 + 文件锁** | `atomicWrite`（tmp+rename）、`withLock`（O_EXCL） | agent 与 UI 并发写不能出现半行 |
| **两域隔离** | `scope.ts` 672 行 | 工作会话不加载个人档案 |

> 这六条是**架构约束**，不是风格偏好。下面所有建议都在它们的边界内。

---

## 二、问题 1：`actions.ts` 是一个 1653 行的单闭包

### 2.1 事实

```
actions.ts  1653 行 / 34 个能力 / 1 个 createActions() 闭包
```

结构是：

```ts
export function createActions({ store, now, readExternal }) {
  async function snapshot(...) { ... }   // 190 行
  async function overview(...) { ... }   // 134 行
  async function misses(...) { ... }     // 84 行
  // …共 34 个
  return { snapshot, overview, ... , store }   // 全部一次性返回
}
```

### 2.2 为什么这是个问题（不是「文件太长」这种洁癖）

**① 所有失败被压成同一个形状，信息丢失**

```ts
async function guard<T extends object>(run) {
  try { return { ok: true, ...(await run()) } }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : String(error) } }
}
```

34 个能力全部走这一个 catch。后果：
- 「文件不存在」「权限不足」「状态迁移非法」「隐私拦截」**在类型上完全一样**；
- 前端只能把 `error` 字符串直接显示给用户，而 `styles.ts` 里那套颜色语义（warn/err）**无从驱动**；
- 隐私拦截（`privacy.ts`）与磁盘错误共用同一个出口，而它们该有完全不同的 UI（前者给脱敏版本，后者给重试）。

`docs/product.md` §17.8 记录的「常驻前缀展开后只有一个 171」，根因之一是
`resident.state` 用了三态（ok/empty/error）才把「读不到」和「没有」分开。
**那个教训只应用在一个能力上，没有推广到 34 个。**

**② 能力的边界靠注释维持，不靠类型**

34 个函数共享 `store` / `now` / `readExternal` 三个闭包变量。任何一个函数都能
直接 `await store.scan()`，不需要声明它读什么。于是：
- 无法从签名看出某个能力读不读事件流（实际有 12 处调 `scan()`、7 处调 `readEvents()`）；
- 想加缓存时，**无法确定哪些调用点需要失效**；
- 测试只能整体构造 `createActions`，无法单独测一个能力。

**③ 1653 行让「改一处」的风险不可估**

`docs/product.md` 已经记录了多次「改 A 破坏 B」的事故（§17.10 的逗号表达式、
§17.9 的 Hook 顺序）。在单闭包里，这类事故的概率与文件长度正相关。

### 2.3 建议（保理念，不动数据契约）

**拆成「领域模块 + 组合根」，仍是一个包、一个闭包边界，只是物理分文件。**

```
packages/core/src/
├── actions/
│   ├── index.ts          createActions 组合根（约 80 行，只做组装与返回）
│   ├── read.ts           snapshot / overview / detail / search / health / index
│   ├── inbox.ts          capture / captureBatch / updateInbox / deleteInbox / batchInboxState / promoteInbox
│   ├── memory.ts         writeBody / setStatus / confirm / reject / undoReject / archive / keep / batchArchive
│   ├── misses.ts         misses / missDraft / missConfirm / missBatchDraft / missDelete
│   ├── maintenance.ts    verifyAnchor / compact / review / promote / repairMeta
│   ├── export.ts         exportData
│   └── errors.ts         ← 新增，见下
└── ...
```

每个模块导出一个 `createXxxActions({ store, now, readExternal })`，
`index.ts` 把它们合并返回。**对外签名 `Actions` 完全不变**，
`bridge.ts` 的 34 条路由一行都不用改。

**关键配套：把失败分类。** 这是拆分真正的价值，不是文件变短。

```ts
// actions/errors.ts
export type ActionFailureKind =
  | 'not-found'      // 条目不存在
  | 'invalid-state'  // 状态迁移非法
  | 'blocked'        // 隐私闸门拦截
  | 'conflict'       // 并发写冲突（锁超时）
  | 'io'             // 磁盘错误

export interface ActionFailure {
  ok: false
  kind: ActionFailureKind
  error: string
  /** 可操作的修复建议，直接给用户看 */
  hint?: string
  /** blocked 时给出脱敏后的可用文本 */
  masked?: string
}
```

前端据此决定 UI：`blocked` → 红条 + 脱敏按钮；`io` → 黄条 + 重试；
`invalid-state` → 说明合法迁移路径。**这正是 §17.8 那个教训的推广。**

> 风险：`ActionFailure` 加字段是**向后兼容**的（现有代码只读 `ok` 与 `error`）。
> 可以在一个 PR 里先加 `kind`，UI 逐步接入，不需要大爆炸式改造。

### 2.4 不做什么

- ❌ 不拆成多个 npm 包 —— 没有第二个消费方，纯增加复杂度
- ❌ 不改闭包为 class —— 闭包更适合这个规模，且改动无收益
- ❌ 不引入依赖注入容器 —— 三个依赖，手工传即可

---

## 三、问题 2：每次调用都全量扫描，没有任何缓存

### 3.1 事实（实测，不是推测）

`store.scan()` 的实现：

```ts
async function scan() {
  const files = await listMarkdown(base)
  // 第一趟：读 index.md frontmatter
  // 第二趟：for (const relPath of files) { await readEntry(...) }   ← 串行
}

async function readEntry(relPath) {
  const stat = await fsp.stat(absolute)      // 每篇一次 stat
  const source = await fsp.readFile(...)     // 每篇一次全文读
  ...
  tokens: estimateTokens(source)             // 全文再算一遍 token
}
```

**没有任何缓存层。** 实测当前库（3 篇 markdown，2,088 字节）：

```
串行 scan 耗时: 2 ms
并行 scan 耗时: 1 ms
```

所以**现在它不是瓶颈**。我把它列为问题，理由不是「慢」，而是：

**它是唯一随库规模线性变慢的路径，而产品已有 42 篇的先例。**

`docs/product.md` §四 记录过真实规模：42 篇 / 63,002 tokens / 最重单篇 4,987 tokens。
按同比例外推，42 篇时单次 scan 约为现在的 14 倍（文件数）× 更高单篇成本
——粗估 30–50ms。而调用点有 12 处，**一次页面渲染可能触发 2–3 次 scan**
（`panel.ts` 同时订阅 `snapshot` 与 `misses`）。

### 3.2 更值得改的不是「加缓存」，而是「并行化 + 一次扫描服务多个能力」

两个层次，收益递增：

**① 低成本：把串行 `for await` 改并行（约 10 行改动，零风险）**

```ts
const entries = (await Promise.all(
  files.map(async relPath => {
    try { return await readEntry(relPath, ...) } catch { return null }
  })
)).filter(Boolean)
```

当前实测 2ms → 1ms。收益小，但它让 `scan()` 的耗时从「文件数 × 单文件延迟」
变成「最慢的那个文件」，在高延迟磁盘（网络盘、加密盘）上差别很大。

**② 中成本：单次扫描产出多种视图（真正的解法）**

现在 `snapshot` / `overview` / `health` / `review` / `promote` **各自 scan 一遍**。
它们读的是同一份数据。可以引入一个**请求作用域内的快照**：

```ts
// 每次 HTTP 请求创建一个，请求结束即丢弃——不是常驻缓存
export function createRequestScope(store) {
  let cached: Promise<MemoryEntry[]> | null = null
  return {
    scan: () => (cached ??= store.scan()),
  }
}
```

关键：**它是请求作用域，不是进程常驻。** 因此不违反「零常驻成本」——
没有后台进程、没有定时器、没有跨请求状态。

> 为什么不用「文件 mtime 缓存」：那需要一个常驻的失效判断，
> 且 agent 与 UI 是不同进程写同一个库，mtime 缓存在跨进程下不可靠。
> **请求作用域快照是唯一既能提速又不违背理念的方案。**

### 3.3 不做

- ❌ 常驻内存缓存 —— 与「零常驻成本」冲突
- ❌ 索引文件 / sqlite —— 违反「人可审」
- ❌ 增量扫描（只读变化文件）—— 需要维护 mtime 台账，而台账本身会与真相源不一致

---

## 四、问题 3：事件流无上限，且全量解析

### 4.1 事实

```ts
// store.ts
async function readEvents() {
  const raw = await fsp.readFile(eventsPath, 'utf8')   // 读全文
  for (const line of raw.split('\n')) { events.push(JSON.parse(line)) }  // 全部解析
  return events
}

// actions.ts sessionMemory
const allEvents = await store.readEvents()
const scoped = ... ? allEvents.slice(-200) : allEvents.filter(e => e.session === sessionId)
```

**问题有两层：**

1. **`readEvents()` 没有上限**：文件多大就读多大、解析多大。
   `events.jsonl` 是 append-only，**永不轮转**（grep 全仓无 rotate/truncate/prune）。
2. **`slice(-200)` 在解析之后**：先解析全部、再取最后 200 条。
   这个顺序让「只要最近 200 条」的意图完全失效。

当前实测：12 条事件，2KB。**不是问题。**
但它是**唯一没有上限的数据结构**，而产品主张是「成本可见、按需加载」。

### 4.2 为什么这个更重要（比 scan 更值得现在处理）

因为 scan 的成本受**记忆条数**约束，而记忆条数**被产品机制主动压着**
（80 行上限、到期退役、常驻预算）。事件流没有任何这样的机制。

粗算：一次会话 15 次 recall/cite/miss，一天 10 次会话 → 150 条/天 →
一年 5.5 万条 → 约 8MB / 数十万行 JSON。届时**每次 `readEvents()` 都要解析全部**。
`health()`、`review()`、`snapshot()` 都在调它。

### 4.3 建议

**① 立刻（低成本）：`readEvents` 支持 `limit`，用流式读尾部**

```ts
async function readEvents({ limit }: { limit?: number } = {}): Promise<MemoryEvent[]>
```

实现上不需要读全文：从文件尾部按块反向读，凑够 `limit` 行即停。
50 行左右，零依赖。**这直接消除 `sessionMemory` 的浪费**。

**② 中期：按自然月分片，并给「总保留量」定一个数**

```
.state/events/
├── 2026-10.jsonl
├── 2026-11.jsonl
└── index.json     { months: [...], totalLines: N }
```

- 三率只看 30 天窗口，`review` 只看 7 天 —— **它们本来就不需要全量**；
- 分片后「读最近 30 天」变成「读 1–2 个文件」，与库规模无关；
- 保留策略：默认保留 12 个月，更老的归档成 `events-archive.tar`——
  **保留但不参与每次读取**，符合「只追加」立场（历史没删，只是不常驻）。

**③ 不做**：不删旧事件。产品立场是「历史可审计」，
分片是「不常驻」，不是「删除」。

---

## 五、其他值得记的发现（按性价比排序）

| # | 发现 | 证据 | 建议 | 性价比 |
|---|---|---|---|---|
| 1 | **`store.ts` 1041 行混了 6 个职责**：路径工具、条目读写、事件流、未命中表、INBOX、统计 | 30 个函数 | 按职责拆 `store/{entries,events,misses,inbox,stats}.ts`，`createStore` 留在 index | 高（纯移动，零逻辑改动） |
| 2 | **`scope.ts` 672 行，但只有 `actions.ts` 一处在用** | grep | 暂不动。它是两域隔离的实现，**逻辑密度高但耦合低**，拆它收益不明确 | — |
| 3 | **34 条路由 → 2 个 agent 工具** | `tools.ts` 296 行 | 正常。工具面窄是正确的产品决策，不要让 agent 能调全部 34 个 | — |
| 4 | **`@media` 断点按视口写，而侧栏恒 400px** | 原型 `app.css` | 落地时改容器查询，或删掉 | 中（落地前必须处理） |
| 5 | **测试 4,353 行 vs 源码 11,015 行（0.40），比例健康** | 逐文件统计 | 但**缺「架构级」测试**：没有一条测「34 个能力的失败分类」 | 中 |
| 6 | **`bridge.ts` 201 行 34 条路由，是好的设计** | 读码 | 保持。exact route 不用宽 prefix 是对的 | — |

---

## 六、不建议做的重构（以及为什么）

这些看起来很诱人，但会破坏核心主张：

| 诱惑 | 为什么拒绝 |
|---|---|
| **引入 sqlite / 向量库做检索** | `search.ts` 173 行子串 + 词边界已经够用。向量库需要常驻进程 + embedding 模型，把「常驻前缀 361」这个第一指标直接推翻 |
| **把 core 拆成独立 npm 包** | 只有一个消费方（plugin）。拆出去只会让「改 core 要发版」变成额外负担 |
| **给维护作业加定时器** | `docs/product.md` §17.1 已经论证过：定时器要求常驻进程、后台写盘、额外生命周期，换来的只是「省掉手动点一下」。**不值得** |
| **把 Markdown 换成结构化存储** | 「人可审」是整个产品的存在理由。换存储等于换产品 |
| **重写 UI 为 React 组件库** | 插件渲染在宿主内，必须跟宿主 token。引入组件库会带来样式冲突，且当前 4,400 行 UI 代码没有重复到需要抽象 |

---

## 七、建议的执行顺序（按风险与收益）

```
第 1 步（低风险，1 天）     store.ts 按职责拆文件 + scan() 改并行
                          → 纯移动 + 10 行改动，测试全绿即可
第 2 步（低风险，1 天）     ActionFailure 加 kind 字段（向后兼容）
                          → 先只加不消费，让 UI 逐步接入
第 3 步（中风险，2 天）     actions.ts 拆成 actions/ 目录，index.ts 做组合根
                          → 对外签名不变，bridge.ts 零改动
第 4 步（中风险，1 天）     readEvents 支持 limit + 流式读尾部
                          → 立刻消除 sessionMemory 的全量解析
第 5 步（低风险，1 天）     请求作用域快照（scan 单次服务多能力）
第 6 步（可选，后续）       事件流按月分片 + 12 个月保留策略
```

**每一步都可以独立回退**，且每一步之后 `pnpm test`（322 项）必须保持全绿。
建议每步一个 commit，接受现有 `test/wiring-ui.test.mjs` 的「路由全表」闸门保护。

---

## 八、诚实声明：本次评估没做的事

1. **没做性能压测**。我只在真实库（3 篇 / 2KB）上测了 scan 的绝对耗时，
   42 篇的推算来自 `docs/product.md` 的历史数字 + 线性外推，**不是实测**。
   要确认第 2、4 两项的紧迫性，应该在 42 篇的库上跑一次。

2. **没读完全部 11,015 行源码**。我读了 `actions.ts` 的结构与关键分支、
   `store.ts` 的读写路径与锁机制、`search.ts` 的匹配逻辑、`bridge.ts` 的路由表、
   以及全部 12 个测试文件的规模。`scope.ts`（672 行）只读了导出面，
   没有逐行核对 —— 所以我没有对它提出重构建议。

3. **`maintenance.ts` 668 行没细读**。它对应 5 项维护作业，逻辑上独立。
   若后续要动它，需要单独评估。

4. **三期 UI 评审的结论与本文无关**。UI 层面第 3 轮评审仍未通过（4 项 P0，
   已修复但未复评）。那是**另一个问题域**，不应与架构评估混为一谈。

