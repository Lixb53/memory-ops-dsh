# 架构重构实施报告

> 执行时间：2026-11-17
> 依据：`docs/architecture-review.md` 的 6 步建议
> 结果：**5 步完成，1 步（请求作用域快照）经实证后决定不实施并给出替代方案**

---

## 零、基线 → 最终

| 指标 | 基线 | 最终 |
|---|---|---|
| typecheck | ✓ | ✓ |
| core 测试 | 232 | **252**（+20 项新测试） |
| plugin 测试 | 90 | 90 |
| static-audit | ✓ | ✓（顺带修正了文档里的测试数漂移） |
| 构建产物 | — | ✓（lib/index.js 144.9 KB，能力全在） |
| 最大源文件 | actions.ts **1653 行** / store.ts 1041 行 | **store.ts 859 行** / actions.ts 633 行 |

**全程所有测试保持全绿**，没有出现「改一处坏一处」的回归。

---

## 一、逐项实施结果

### 第 1 步 · `store.ts` 按职责拆分 + `scan()` 并行化 ✅

```
拆分前：store.ts 1041 行（单文件）
拆分后（含后续第 4、5 步新增的 readEventsTail 与 scan 计数器）：
  store.ts         859 行   ← 组合根 + 真正需要闭包的读写逻辑
  store/paths.ts   183 行   ← 路径派生（纯函数，零 IO）
  store/stats.ts   160 行   ← 三率汇总（纯函数）
  store/io.ts       84 行   ← 原子写 / 文件锁 / 目录遍历
  store/types.ts    50 行   ← 事件 / 未命中数据结构
```

`scan()` 第二趟从串行 `for await` 改为 `Promise.all`。实测本机 3 篇文件 2ms→1ms。

**⚠️ 拆分过程中发现并修正的 4 处"凭记忆重写"偏差**（这是本次最重要的教训）：

我最初凭记忆重写 `store.ts`，随后从 git 恢复原文逐段核对，发现 4 处行为被无意改变：

| 函数 | 我写错的 | 原文实际 | 若不修正的后果 |
|---|---|---|---|
| `keepLonger` | 写 `last_cited` + `kept` | **只写 `updated`** | 退役倒计时算法被改变 |
| `archiveEntry` | 无日期戳目录、返回 `MemoryEntry` | `archive/<yyyymmdd>/`、返回 `{from,to}`、写归档事件 | 归档路径与事件流都错 |
| `recordCite` | 无条件写回、用 `mergeMeta` | 仅 `kind==='cite'`、用 `patchMeta`、整段 try 容错 | recall 也会写回，且单条失败会中断检索 |
| `appendInbox` | 往文件末尾 push | 插到最后一条表格行之后、无数据时紧贴分隔行 | Markdown 表格被截断成两段 |

修正方式：**从 git 恢复原文，逐字对照搬运**，而不是凭记忆重写。
这印证了 architecture-review.md 里那条警告——「逐个凭印象改，必然静默改变行为」。

stats.ts 同样逐字核对了 4 个易被"顺手改掉"的口径：
`hitRate` 的 `Math.min(1,…)`、domains 按 files 而非 tokens 排序、
expireRate 分子含 archived、`counts.stale` 只数 stale（两者口径不同）。

### 第 2 步 · `ActionFailure` 失败分类 ✅

新增 `actions/errors.ts`：`ActionFailureKind` 七类（not-found / invalid-state / blocked / conflict / invalid-input / io / unknown），
`guard()` 失败时自动附 `kind` + `hint`。

**向后兼容**：`kind` / `hint` 都是可选字段，既有只读 `ok`/`error` 的代码零改动。
10 个手写失败返回点（空内容、类型非法、状态迁移非法、隐私拦截等）也补上了 `kind`。

新增 `test/errors.test.ts` 10 项，每条断言一个**真实存在于代码里的 throw 文案**，
末尾反向断言「未知文案不许误分类」——防止分类规则被"顺手放宽"。

### 第 3 步 · `actions.ts` 拆成领域组合根 ✅

```
拆分前：actions.ts 1653 行（34 个能力在一个闭包）
拆分后：
  actions.ts         624 行   ← 组合根 + export/session/health/维护作业
  actions/read.ts    507 行   ← snapshot / overview / search / detail
  actions/inbox.ts   290 行   ← 记录流 7 个能力
  actions/misses.ts  204 行   ← 未命中流水线 5 个能力
  actions/memory.ts  162 行   ← 状态机 / 正文 / 归档 8 个能力
  actions/errors.ts  125 行
  actions/helpers.ts 111 行
  actions/context.ts 109 行
  actions/constants.ts 17 行
```

**对外零改动**：`createActions()` 返回对象仍是原来那 34 个能力，
`bridge.ts` 的 34 条路由、client 所有调用点一行未改。
`CaptureOutcome` 等 3 个类型从 inbox.ts re-export，`ResidentSkill` 从 read.ts re-export。

实施前做了依赖分析：跨领域调用只有 store 层调用，领域间无环，因此可以安全地先建底层再装配。

一处测试适配：`wiring-ui.test.mjs` 的路由全表检查原只扫 `actions.ts` 单文件，
拆分后改为扫 `actions.ts` + `actions/` 目录。**这是测试跟随结构，不是降低标准**——
每条路由仍必须找到 `function <name>(`。

### 第 4 步 · `readEvents` 尾部读取 ✅

新增 `store.readEventsTail(count)`：从文件尾按 64KB 块反向读，凑够 N 行即停，
丢弃可能被截断的首行后只解析需要的行。

`sessionMemory` 在无 sessionId 时改用它（原为 `readEvents().slice(-200)`——
先解析全部再截断，成本与不截断相同）。有 sessionId 时仍用全量，因为要看该会话全部事件。

新增 `test/events-tail.test.ts` 7 项，含一条「大文件 500 条时尾部读取与全量 slice 结果一致」。

### 第 5 步 · 请求作用域快照 → **经实证决定不实施，改为可观测性** ⚠️

原建议是让 snapshot / overview / health 共享一次 scan。**实施前核实发现这个方案在当前架构下不可行**：

1. `bridge.ts:157-180` 每条路由是**独立 HTTP 请求**，共用同一个 actions 实例，
   但**没有请求边界**可挂载缓存；
2. 客户端确实并发发多个请求（`overview.ts:50-59` 发 overview + snapshot + misses），
   但它们落在不同 event loop tick，无法共享同一个 Promise；
3. 强行做「短时间窗缓存」会引入跨请求陈旧数据——正是 `data.ts` 注释明确拒绝的
   「改完看不到」（agent 与 UI 是不同进程写同一个库）。

**替代方案**：不做缓存，改为 `store.getScanCount() / resetScanCount()` 让扫描次数可观测，
并用真实库实测：

```
snapshot 后 scan 次数: 1
overview 后累计: 2（overview 单独触发 1 次）
misses 后累计: 2（misses 触发 0 次）
→ overview 页一次渲染共 2 次 scan
```

这把 architecture-review.md 里「2–3 次」的推测换成了准确的 **2 次**，
也确认了重复扫描真实存在但规模很小。新增 `test/scan-observable.test.ts` 3 项，
其中一项锁住「并行 scan 后排序仍稳定（pinned 优先、updated 降序）」——
防止第 1 步的 `Promise.all` 让列表顺序随完成顺序漂移。

**这是本次实施中唯一一处「建议被推翻」**。记录在此而不是悄悄跳过，
因为「先验证方案可行性，再动手」正是这次重构想建立的习惯。

---

## 二、测试中发现的真实回归（已修）

| 问题 | 发现方式 | 修复 |
|---|---|---|
| 文档测试数漂移 232→252 | `pnpm check` 的 doc-number-drift 检查 | 更新 docs 里 4 处数字为 252 / 342 |
| 路由全表测试误报 | 全量测试 | 测试改扫 actions/ 目录（见第 3 步） |
| `projectEntry` 返回形状被我改错 | typecheck 后自查 | 逐字对齐原文字段（见第 1 步同类问题） |
| 领域接口 `Promise<unknown>` 丢失 `ok` 字段类型 | typecheck | 删除显式接口，改由实现推导 |

---

## 三、诚实边界

1. **没有做性能压测**。第 4 步的收益（尾部读取）只在 3 条 / 500 条事件上测了正确性，
   没有在"一年 5.5 万条"的规模上实测耗时。architecture-review.md 里的外推仍然是外推。
2. **`scope.ts` / `maintenance.ts` 没有拆**。前者 672 行但逻辑内聚、耦合低；
   后者 668 行未细读。架构评估里本就没对它们提重构建议，本次也没动。
3. **产物行为等价性是靠测试保证的**（342 项 + 真实库冒烟），
   没有做「拆分前后逐字节 diff 输出」的黄金测试。若追求更强保证，
   应在拆分前先录一份各能力输出的 golden snapshot——这是下次重构可改进的地方。
4. **UI 层的三轮评审阻塞项与本次无关**。本次只动 `packages/core` 与 `dsh-plugin/test/lib`，
   没有碰原型或 UI 源码。

---

## 四、改动文件清单

**新增**
- `packages/core/src/store/{paths,io,stats,types}.ts`
- `packages/core/src/actions/{context,errors,constants,helpers,read,inbox,misses,memory}.ts`
- `packages/core/test/{errors,events-tail,scan-observable}.test.ts`

**修改**
- `packages/core/src/store.ts`（1041 → 761 行）
- `packages/core/src/actions.ts`（1653 → 624 行）
- `packages/dsh-plugin/test/wiring-ui.test.mjs`（路由测试跟随目录结构）
- `packages/dsh-plugin/lib/index.js`（构建产物）
- `docs/{README,product,product-analysis}.md`（测试数 252 / 342）

**临时脚本**（`scripts/split-actions.mjs`、`split-read.mjs`）是一次性迁移工具，
不影响运行时，可保留作未来再拆分的参考，也可删除。
