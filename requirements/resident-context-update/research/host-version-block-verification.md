# 实测：宿主的「版本」区块对 git / link 安装到底怎么处理

> 时间：2026-11-21。目的：回答 PRD 里唯一的阻塞项——`host-managed` 对 git 直装是否成立。
> 方法：**读宿主自己的实现**（`app.asar` 按偏移单取，未全量解包），再用宿主的解析函数**真跑**我们的 spec。
> 结论：**git 直装 = 宿主明确"不列出版本"（not-updatable）；link = 无版本可比；只有 npm 才行。**
> 本轮**没有**做的：没有真装一次看 UI、没有截图（原因见 §五）。

---

## 一、先定位：版本区块是宿主原生的

`app.asar` 目录里有两套相关包（22,000+ 文件，按路径检索）：

| 包 | 作用 | 证据 |
|---|---|---|
| `@deepseek-ai/dsh-plugin-manager` | host 侧：读 profile、查版本、执行更新 | `lib/index.js`（147 KB）、`lib/types/versions.js`、`lib/types/install-spec.js` |
| `@deepseek-ai/dsh-client-ui-plugin-manager` | client 侧：插件页 UI（含「版本」区块） | `lib/client.js`（357 KB） |

**不是** `dsh-market`：市场是另一个包（`@deepseek-ai/dsh-plugin-market`），且本机没装。截图里那块「版本」是宿主自带的。

## 二、版本列表从哪来：`pnpm view`（registry 查询）

`lib/types/versions.js:4,13`：

```js
export const VERSION_LIST_FIELDS = ['versions', 'time', 'dist-tags'];
// @param answer - parsed `pnpm view <name> versions time dist-tags --json` output  ← 就是这句
export function newerVersions(answer, installed) { … }
```

即：**以包名为键查 npm registry**，拿到全部版本、发布时间、dist-tags，再筛出 `semver.gt(版本, 已装版本)` 的。
「可更新到 0.86.0 · 发布于 2026-11-19」就是 `versions` 里最新一项 + `time[version]`。

## 三、决定性的一段：git 直接拒绝，连 registry 都不查

`lib/index.js` 的 `listVersions()`（约 107.5 KB 处）：

```js
if (target.kind === "git") return {
  status: "refused",
  problem: "not-updatable",
  reason: `${name} is installed from Git, which lists no versions`,
  attempts: []
};
const plan = registryPlan(this.registryFor(name, options?.registry), await this.registries());
const listing = await this.askRegistries(name, VERSION_LIST_FIELDS, plan, target.parsed, signal);
```

**判定发生在查 registry 之前**：只要 spec 被解析成 `git`，就直接 `not-updatable`，`attempts` 为空（连一次网络请求都没发）。

UI 侧对 `refused` 的处理（`client.js`，`summaryOf`）：

```js
if (list.status === 'refused') { … title: t(list.problem === 'network' ? 'versionsFailedNetwork' : 'versionsFailedOther'), sub: list.reason … }
```

也就是说：git 装时版本区块**会显示，但显示成"失败（其它）"+ 那句英文原因**，而不是"可更新到"。
（这一点对我们是个提醒：宿主把"不支持"渲染成了"失败"，用户会以为网络坏了。）

## 四、可执行实测：把我们的 spec 喂给宿主自己的解析器

`lib/types/install-spec.js` 是纯函数，直接 `import` 跑（脚本 `../../.tmp/spec-probe.mjs`）：

| 安装方式（真实写法） | 宿主归类 | 版本区块结果 |
|---|---|---|
| `github:Lixb53/memory-ops-dsh#path:packages/dsh-plugin&5c44d95…` | `git`（host: github.com） | **not-updatable**（不查 registry） |
| `git+https://github.com/Lixb53/memory-ops-dsh.git#path:…&5c44d95…` | `git` | 同上 |
| `link:G:\memory-ops-dsh\packages\dsh-plugin` | `path` | 无 registry 版本可比，拿不到「可更新到 X」 |
| `G:\memory-ops-dsh\packages\dsh-plugin`（本地路径） | `path` | 同上 |
| `dsh-context@0.85.1`（用户截图里那个） | `registry`（name: dsh-context） | **能列出「可更新到 + 发布日期 + N 个新版本」** |
| `@memory-ops/dsh-plugin@0.1.0`（若我们发 npm） | `registry` | **同 dsh-context** |

**关键**：`kind` 只看 spec 的**形式**，不看它指向的分支/标签。
所以 **打 git tag（`#path:…&v0.2.0`）仍然是 `git`**，仍然 `not-updatable`。
→ "至少打 tag"这个备选**不成立**，唯一出路是 **npm（或其它能被 registry 解析的源）**。

补充：`dependencySpec()` 把 pnpm 记录的值还原成可安装 spec，git 与 link 的还原都保留原协议
（`github:…#path:…` / `link:C:\…`）——所以回读也不会把它变成 registry 形态。

## 五、为什么没做 UI 截图

- 本机 `~/.dsh/profiles` 只有 `desktop`，且它的 `package.json` / `cordis.patch.yml` 里**没有本插件**；
  `~/.dsh` 全目录也搜不到 `memory-ops` 依赖 → **本插件当前没有装在这台机器上**。
  （截图里那个「记忆库」不来自本插件，或来自另一份环境。）
- Desktop 应用独占 Electron profile，`shot.mjs` 需要带 token 的 `dsh web` URL，本会话拿不到。
- 因此本轮结论是**代码级实证**（读实现 + 真跑解析器），**不是截图实证**。UI 上的实际观感仍需一次真装确认。

## 六、对 PRD 的直接影响

| 规则 | 原判断 | 实测后 |
|---|---|---|
| R22 | 三态 `host-managed / command-only / blocked` | 加第四态 **`not-updatable`**（git 装）：宿主明确"不列版本"，我们给人话 + 命令兜底，不显示成"失败" |
| R21 | 入口 1 前提是"宿主给出版本区块" | 前提加限定：**安装源必须是 registry（npm）** |
| R17 | "目标"（可更新到 + 发布日期） | git 装时"目标"显示"宿主不列版版本（git 安装）"，不显示 `—` 冒充"未检查" |
| A19（确认单） | 发 npm **或至少打 tag** | **必须发 npm**；打 tag 无效（实测） |
| 影响分析 I9 | "发 npm 或打 tag" | 同上，tag 不是选项 |
| 影响分析 §四 | "宿主是否对 git 渲染版本区块：未核实" | **已核实**：渲染，但内容为 `not-updatable` + 英文原因；不是"可更新到" |