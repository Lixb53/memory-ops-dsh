# @memory-ops/dsh-plugin

记忆库的 DSH 插件。**4 表面 + 5 分区**，两端能力对等。

## 4 个表面（插件级挂载点）

| 表面 | 宿主扩展点 | 判断它要回答的问题 |
|---|---|---|
| 侧栏记忆面板 | `sidebar.panellist` + `main` | 现在有哪几条记忆需要我拍板 |
| 会话记忆 tab | `conversation.view` | 这次任务有没有踩过坑 |
| 右侧栏快速捕获 | `sidebarRightTabs` + `sidebar.right.pane.tab` | 一句话赶紧存了 |
| `/remember` 命令 | `inputTriggers.registerSource` | 不离开输入框就存完 |

## 5 个分区（侧栏面板内部）

本项目 / 记录流 / 记忆 / 未命中 / 总览。

为什么用子导航而不是单屏平铺：侧栏宽度受限，但**能力必须全量对等**——
不允许出现「只能记、不能管」的单向漏斗。实测一个月暴露的因果链是：
插件端只做捕获 → 用户永远停在「记了 8 条、0 条拍板」→ INBOX 撞满 80 行上限。
根因不是用户懒，而是拍板动作被放到了需要单独启动进程的地方。

## agent 工具

| 工具 | 作用 |
|---|---|
| `memory_recall` | 按关键词检索，返回路径 + tokens + 片段。命中记 `cite`，未命中记 `miss` |
| `memory_write` | `mode=inbox` 进记录流；`mode=entry` 落正式条目（G2/G3/G4 强制 evidence） |

产品主线不是「怎么记」，而是**怎么让 260 token 的索引换回 6 次命中，
并让不命中的那 4 次驱动补齐**。所以两个工具都记账。

## HTTP 桥

`/api/dsh-memory-ops/<能力>`，34 条 exact 路由，与 core 的 34 个能力一一对应。

客户端半体跑在浏览器里，碰不到 `node:fs`，所以读写真相源必须经过宿主。
围栏：只接受回环请求、不提供执行命令的端点、请求体限长 2 MB。

## 关键实现细节

**假空态（历史 bug，已修）**：DSH 槽位标准 props 里**没有 `cwd`**。旧代码直接读
`props.cwd` 拿到 `undefined` → 快照请求不带项目上下文 → core 返回空数组 →
界面渲染成「当前项目还没有相关记忆」。现在从 `useSessions` 钩子按当前会话 id
取 `byId[id].cwd`，拿不到就退回全部工作域并显示降级条，**不返回假空态**。

**样式**：只用 `--dsw-alias-*` 主题 token。token 被改名只会让外观退化，
不会让渲染崩掉；写死颜色则会随宿主深浅色切换而失配。

**不 require 任何 `@deepseek-ai/*` 客户端包**：宿主改版时最坏情况是某个表面
不出现，而不是整个 slot entry 崩掉（那会连带一片空白）。

## 构建

```bash
pnpm build   # → lib/index.js（host, ESM）+ lib/client.js（浏览器 factory 形态）
             #   + lib/client-logic.mjs（无 React 的纯逻辑，供测试 import）
```

产物是单文件，`@memory-ops/core` 已内联——宿主进程解析不到 workspace 包。

### 为什么 core 不写成依赖

`package.json` 里**故意没有** `@memory-ops/core`。原因不是洁癖：

外部装这个包（`github:…#path:packages/dsh-plugin`）时，pnpm 只解出本目录，
既装不到 workspace 包，也不认 `workspace:` 协议。而 core 反正会被 esbuild
打进 `lib/index.js`（产物里 `@memory-ops/core` 出现 **0** 次），依赖声明纯属多余，
却足以让每一次外部安装都失败。

代价是仓库内开发时没有 pnpm 的 junction 链接，所以两处必须显式指向源码：

| 位置 | 做法 |
|---|---|
| `scripts/build-plugin.mjs` | esbuild 插件按 `@memory-ops/core/*` 别名解析到 `packages/core/src/*.ts` |
| `tsconfig.json` | `paths` 映射到同一份源码 |

两边指同一份真相，避免「构建能过、类型检查指到别处」。

### 产物必须入库

宿主经 git 安装只解出本目录，不会在仓库根跑构建，而 `main` 指向 `lib/index.js`。
`.gitignore` 里 `lib/` 默认忽略、但本目录的三个产物是例外。
CI 会构建后比对 `git status`，不一致即失败——改了源码必须一起提交产物。

