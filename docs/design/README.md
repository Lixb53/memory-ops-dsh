# 设计稿目录

> **这些 HTML 是设计意图存档，与 `packages/` 下的代码不同源。**
> 它们能通过 `qa.mjs` 的渲染检查，那只证明 HTML 本身没坏，不证明产品实现了。

## 文件

| 文件 | 内容 | 与代码的关系 |
|---|---|---|
| `web-v2.html` | Web 端 4 视图 + 五态切换 + 深浅色 | ❌ **无对应实现**（`packages/memory-web` 不存在） |
| `web-v3.html` | Web 端 v3：+ 证据链 / 锚点 / 预算账本 / 未命中五态 | ❌ **无对应实现** |
| `plugin-v2.html` | 插件端 4 表面 + 5 分区（可点页签） | ⚠️ 结构参考，配色与组件未落地 |
| `plugin-v3.html` | 插件端 v3 | ⚠️ 部分已落地（见 `docs/product.md` §11.5） |

## 工具

| 脚本 | 用途 |
|---|---|
| `qa.mjs` | 三档实渲染检查（375/768/1440）：结构 / 外链 / emoji / 横向溢出 / 字号 / 对比度 / 点击目标 / 重复 id / 可访问名称 / 焦点环 |
| `chrome-qa.sh` | QA 用 Chrome 包装器（沙箱环境需 `--in-process-gpu`） |
| `probe.mjs` | 溢出定位探针 |

## 用法

```bash
cd docs/design

# v3 稿（截图默认输出到 screenshots/v3）
node qa.mjs web-v3.html
node qa.mjs plugin-v3.html

# v2 稿（需显式指定输出目录）
node qa.mjs web-v2.html --out screenshots/v2
node qa.mjs plugin-v2.html --out screenshots/v2
```

退出码：有 error 即 1，只有 warn 或全绿为 0。

## 截图

`screenshots/v2/`（6 张）与 `screenshots/v3/`（15 张）是各稿在 375/768/1440 三档的实渲染结果。

> **注意**：设计稿里的数字（如「286 tokens」）是 2026-11-05 的快照，
> 与当前实测值（常驻前缀 361 / 索引层 286）**分别对应哪一项，见 `docs/product.md` §十二**。
> 设计稿不回改，以 `product.md` 为准。
