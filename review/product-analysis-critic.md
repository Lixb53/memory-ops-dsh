# 独立对抗性评审报告 · `docs/product-analysis.md`

> 评审者：`critic-pa2` 子代理（只读，以函数名+grep 核对，不依赖漂移行号）
> 评审时间：2026-11-17
> **轮次结论：通过。** 五维 8 / 6 / 7 / 8 / 7，均 ≥6，**无 P0**。
> 另附 4 条 P1 + 5 条 Quick wins；主代理已在交付前全部处理，处理记录见文末。

---

## 五维评分（各 0–10，独立）

**1. 主张一致性：8/10（Strong）**
核心断言逐条成立：`expiryOf` 确为 `lastCitedAt ?? updatedAt ?? createdAt`（schema.ts:350）、`keepLonger` 只经 `patchMeta` 写 `updated`（store.ts:670、394）、`undoReject` 硬写 `reinforced`（actions.ts:995，测试 actions.test.ts:190 保护）、archive 走 `unlink` 且 `listMarkdown` 跳过根层 archive（io.ts:74）——「说 A 代码是 B」基本没有。扣分：§三「命中率会因分母（recall）暴涨而更低」在 `cite=0` 时 `hitRate` 恒为 0（stats.ts:121），数值不会"更低"，属过度陈述。

**2. 结构层级：6/10（Functional）**
有 §零「如果只看三件事」和 §九分周执行顺序，但**两者互相打架**：top3 第 3 件是「归档=消失」（D1），在 §九却被排到**第 2 周**（R3）；而 top3 里没有的「status 归一」（D4）反而在**第 0 周**。陌生人按 top3 优先做归档，与执行计划冲突，无法判断到底哪 3 件先做。

**3. 细节执行：7/10（Strong）**
行号策略正确且实际行号大多准确（store.ts 761 / actions.ts 1681 与文档自述一致）；关键数字逐一核对无误：13 事件、6 miss 全 count=1、recall 2、cite 0、15 处硬编码 `domain:'personal'`（grep 正好 15）。扣分：§九写「`pnpm test`（322 项）」，README 写 231+89=320、product §2.1 写 232+90=322——同一数字跨文档不一致且未标快照；方向卡 `direction-card.md` §七也写着过期的「5 条未命中」，§1.1 只点了 design/README 和 5a-self-check，漏点方向卡。

**4. 可执行性：8/10（Strong）**
§六 8 项全带验收口径，§九每周有验收；§6.1/§6.2 **主动挖副作用**是全篇最强处：AND→OR 使 `matched` 变 true、miss 减少（actions.ts:862–873），以及 active 归一后 memory.ts 的「已确认」组（`s==='confirmed'||s==='active'`，memory.ts:146）计数 -1，均核对成立。扣分：§六-1 验收「≥5 条返回候选」与 §6.1 相关度地板（阈值自承"没实测分布"）如何交互未讲清，执行者可能误以为改一行 `.every→.some` 就够。

**5. 洞察增量：7/10（Strong）**
product.md §17/§18 已记录了命中率 0（§17.10③）、非法 active（§17.7）、`mergeMeta` 不刷日期（§17.7）、维护按需触发（§17.1）等，本文在这些问题上是**旧账新讲**。真增量明确：D1 归档=消失、D3 `undoReject` 伪造跨会话证据、D6 隐私闸门拦技术结论、断裂 1 的逐词并集实测、R7 project 视图 events/misses 全量（actions.ts:346 已核对）、§1.3「打开总览 9 请求」、§6.1 副作用推理，以及「反馈回路一次没转起来」的整合叙事。增量中等偏上，非重复堆砌。

---

## Keep（3–5 条）

1. **函数名主键策略**：开头声明 + R1/R7 的并发重构状态更新（errors.ts / 5 个 actions 子文件 / store 4 子文件均实际存在），且明确「产品侧结论不受影响」「剩下的是接入，不是设计」——**没有把别人在修的 `classifyError` 当自己邀功**，这是诚实处理的范本。
2. **§6.1 三档记账推理**：OR 会消解 miss 信号→加相关度地板→强/弱/无候选分账，逻辑链完整且自我质疑，是全篇最有产品价值的一段。
3. **数字标来源、推断标推断**：675 tokens 标「估算/不可复算」、1.3 性能数字标「不能严格相加」、D7 标「证据弱于 D1–D4」——诚实声明覆盖面广。
4. **§1.1 数据快照诚实**：如实记录 6/13 与旧文档 5/12 的偏离，并把探针写库又清理的事本身当作「search(record:true) 会改库」的证据。

---

## Fix（按优先级）

**P0：无。** 未发现结论性错误或证据根本不成立；D1–D6 的核心断言与数字均核对通过。

**P1（误导但不致命）：**

1. **top3 与执行顺序错位**（§零 vs §九）：要么把「归档可见」提到第 0–1 周，要么把 top3 第 3 换成「status 归一（D4）」，否则「只看三件事」是假的优先级。
2. **D7 归类自相矛盾**：标题写「七个高危产品缺陷（每个都能复现）」，D7 正文与诚实声明 §4 却承认「只在构造数据上验证排序表达式、没目视队列、严重度是推断」。证据弱的观察不应混入「高危 + 都能复现」，应降级为「待验证观察」。
3. **§三命中率表述失真**：「分母暴涨→更低」在 cite=0（真实库）下 hitRate 恒为 0（stats.ts:121），应改为「分母从 2 变 N，但恒为 0，直到有人回填 cite」。
4. **§六-1 与 §6.1 验收口径脱节**：第 1 条验收只说「≥5 条返回候选」，未包含 §6.1 的地板约束；应把验收改为「强命中记 recall、弱命中仍写 `miss(weak:true)`」，否则改 OR 的人会漏做地板，正好触发文档自己警告的「修成断裂 2 的另一个版本」。

## Quick wins（3–5 条）

1. §九第 0 周或 §零 top3 二选一对齐（5 分钟，消掉结构性误导）。
2. §1.1 把 `design/direction-card.md` 加进「写死数字会过期」的点名清单（它 §七写「5 条未命中」）。
3. §九把「322 项」标注为写作时刻快照并注明来源（README 为 320），避免文档间数字打架。
4. D7 从「七个高危」移出或加显著降级标记。
5. §三命中率一句改为「恒为 0，直到 cite 被回填」。

---

## 门禁结论

**通过。** 五个维度均 ≥6，无 P0。建议交付前处理 P1-1（优先级错位），否则「只看三件事」的引导价值基本失效。

---

## 评审者边界声明

**实际读取**：`product-analysis.md` 全文、`README.md`、`product.md` 全文（含 §17/§18）、`architecture-review.md`、`design/direction-card.md`、`information-architecture.md`（grep）、真实数据 `events.jsonl`/`misses.json`/`personal/INBOX.md`；代码 `search.ts`、`privacy.ts`、`schema.ts`(340-393)、`store.ts`(240-299/355-404/640-714)、`store/stats.ts`、`store/io.ts`、`actions.ts`(340-375/985-1014)、`actions/errors.ts`、`actions.test.ts`(180-200)，并用函数名 grep 核对 `recordMiss/recordVerifyHit/patchMeta/mergeMeta/keepLonger/archiveEntry/recordCite/expiryOf/needsDecision/canHumanTransition/undoReject/classifyError`。

**未读**：`tools.ts`（断裂 3 的 50-54/108-122）、`panes/overview.ts`/`project.ts`/`memory.ts` 全文（仅 grep 筛选条件）、`bridge.ts` 路由表（34/31/3 三数靠 product.md 佐证）、`scope.ts`/`maintenance.ts`/`styles.ts`（文档亦声明未读）、`~/.dsh/skills`（171/empty 未验证）、完整 `store.scan()`（3 条记忆靠 events 中 3 个不同 id 佐证）。

**无法验证**：并发重构下的当前行号（已按函数名核对，行为与文档一致，未发现因行号导致的错误）；所有性能实测数字（未运行）；675 tokens 估算（文档自标不可复算）；D1–D6 的临时目录复现（仅验证代码路径存在，未重跑实测）。数字 6/13/2/0/15/761/1681 已对当下真实库与代码确认。

---

## 主代理对评审报告的处理记录（逐条，不采信、不辩解）

| 评审指控 | 处理 |
|---|---|
| P1-1 top3 与执行顺序错位 | **成立**。已把 top3 第 3 件由「归档=消失」改为「status 归一（D4）」（它在 §九第 0 周），并注明归档在 R3/第 2 周，两处不再打架 |
| P1-2 D7 归类矛盾 | **成立**。标题改为「6 个实测复现 + 1 个待验证观察」，D7 正文首行加降级标记 |
| P1-3 命中率表述失真 | **成立**。改为「分母从 2 变 N，但 cite=0 时恒为 0，直到有人回填」 |
| P1-4 §六-1 与 §6.1 验收脱节 | **成立**。第 1 条验收补上「强命中记 recall、弱命中仍写 `miss(weak:true)`」，并明确「只改 `.every→.some` 不算完成」 |
| Quick win 2 方向卡漏点 | **成立**。§1.1 点名清单加上 `design/direction-card.md` §七 |
| Quick win 3 322 项数字打架 | **成立**。§九把 322 标为写作时刻快照并注明 README/product 两处口径 |
| Quick win 4 D7 降级 | 同 P1-2，已处理 |
| Quick win 5 命中率一句 | 同 P1-3，已处理 |

> 本轮无 P0，门禁已通过。以上 P1/Quick wins 为文本精确性修正，不改变任何结论，修订后不再触发第 2 轮评审。
