# @memory-ops/core

记忆库的核心：Markdown 真相源的解析、原子写入、检索与统计口径。

**零运行时依赖**（只用 `node:fs` / `node:path` / `node:os`）。两端共用：
DSH 插件的 host 半体调它，未来的 Web 管理端也调它。组件不共享（React / Vue
无法互通），逻辑必须共享——否则 INBOX 状态流转与统计口径三个月后必然对不上。

## 为什么不用数据库 / 向量库

| 拒绝 | 理由 |
|---|---|
| 单条一文件 / sqlite | 让「人可审」变成「人要装工具才能审」 |
| embedding 常驻进程 | 检索已是子串 + 词边界，够用；向量库会把常驻成本拉回老路 |
| js-yaml | 会让人可审的 Markdown 变成需要装依赖才能审的 Markdown |

## 模块

| 文件 | 职责 |
|---|---|
| `schema.ts` | 数据契约（唯一真相）：INBOX 五列、类型枚举、状态机、预算与阈值 |
| `parse.ts` | md ↔ 结构体：frontmatter（标量/行内数组/块列表/嵌套对象）与 INBOX 表格 |
| `store.ts` | 真相源读写：原子写（tmp+rename）、文件锁、append-only 事件流、归档 |
| `search.ts` | 全文检索：CJK 子串 + 拉丁词边界，带相关度与片段 |
| `privacy.ts` | 隐私闸门：密钥 / 私钥 / 身份证 / 内网 IP / 口令赋值 |
| `actions.ts` | 能力层：30 条能力的唯一实现，host 路由与 agent 工具都调它 |

## 数据契约（不可随意改）

```markdown
| 日期 | 类型 | 内容 | 状态 | 去向 |
```

- 类型枚举固定 5 个：`想法 计划 问题 待办 决策`
- 状态：`open → todo → done / dropped`
- 正文禁止裸 `|`，序列化时转义 `\|`
- 写入原子性：`tmp + rename`，避免 agent 与 UI 同时写出现半行
- 批量删行**从大行号往小删**，否则行号漂移

## 状态机

```
hypothesis ──跨会话重复≥2──> observed ──重复≥3且无反驳──> reinforced ──人确认──> confirmed ──> archived
   任意态 ──人驳回──> rejected（30 天静默，可撤销）
   任意态 ──锚点失效 / 90 天未命中──> stale（降权 0.4，仍可检索）──复核通过──> confirmed
```

## 三率口径（写死在这里，两端共用）

| 指标 | 口径 |
|---|---|
| 命中率 | 30 天内 `cite` 条目数 ÷ `recall` 条目数 |
| 确认率 | 30 天内 `confirmed` ÷ (`confirmed` + `rejected`) |
| 过期率 | 自然月内 (`stale` + `archived`) ÷ 总条目 |

分母为 0 时返回 `null` 而不是 `0`——「算不出来」和「是零」是两件事。

## 测试

```bash
pnpm test        # node --test，67 项
pnpm typecheck   # tsc --noEmit
```
