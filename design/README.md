# 记忆库 · 设计交付说明（当前 v9）

> **v9（2026-11-21）**：视觉方向改为「三栏工作台 · 双车道」。
> 唯一契约：[`design/brief.md`](brief.md)。令牌：[`tokens.json`](tokens.json)。
> 组件规格：[`components/README.md`](components/README.md)。
> 预览图：[`prototype/shots-v9/`](../prototype/shots-v9/)（13 张 + 指标）。
>
> 插件端主面板已按本契约落地（`packages/dsh-plugin/src/client/v9/`），
> 实测与复现步骤见 [`packages/dsh-plugin/perf-report.md`](../packages/dsh-plugin/perf-report.md)。

---

## 一分钟读法

| 想知道什么 | 看哪个文件 |
|---|---|
| **为什么再改一次**（v8「校样栏」在 1614 画布上不成立） | [brief.md §零](brief.md) |
| **改成什么样**（方向卡 + 三条差异化声明） | [brief.md §一–§九](brief.md) |
| **长什么样**（预览图） | [`prototype/shots-v9/`](../prototype/shots-v9/) |
| **能点吗**（可运行原型，双击即开） | [`prototype/index.html`](../prototype/index.html) |
| **令牌** | [`tokens.json`](tokens.json) |
| **组件规格**（解剖 / 状态 / 映射 / 可达性） | [`components/README.md`](components/README.md) |
| **四态 + IA** | [brief.md §十](brief.md) |
| **验收标准 + 假设** | [brief.md §十二](brief.md) |
| 历史契约（v4 / v5 / v6 / v7 / v8） | [`archive/`](archive/) |

---

## 这一版改了什么（三句话）

1. **画布从 400px 侧栏改成 1614×900 主区**：v8 的「单栏纸面」不再是地基，
   三栏（212 左轨 / 1fr 中栏 / 360 检视栏）成为结构。
2. **中栏顶部压一条 72px「每请求都在」窄带**：双车道——推送通道做成结构，不做 KPI 卡。
3. **检视栏常驻 360**：详情、编辑、diff 三件事同屏，R11 的「三件缺一不可」才成立。

---

## 预览图清单（`prototype/shots-v9/`）

| 文件 | 内容 | 看什么 |
|---|---|---|
| `today-light.png` | 今天页 | 首屏线索 + 捕获带，无需滚动 |
| `capture-light.png` | 记一条 | 类型签 → 输入 → 隐私说明 → 最近记的 |
| `todo-light.png` | 待办 | 三段分组，观察项折叠 |
| `memory-light.png` / `memory-cost-light.png` | 记忆 | 双面开关切换列集，行高不变 |
| `health-light.png` / `health-edit-light.png` | 库健康 | 四桶 meter + 置顶编辑（diff 上下叠） |
| `health-version-host-light.png` | 版本 | 五项 + 检查三态 |
| `health-dark.png` | 深色 | T0 可见、对比达标 |
| `today-{empty,error,loading}-light.png` | 四态 | error 下 T0 为 `—`，导航保留 |
| `contact-sheet.png` | 拼版 | 一屏看全部 |

另附 `metrics.json`：每张图的实测读数（T0 数量与文本、读头高度、行数、行高、对比度）。

---

## 怎么验收

双击 `prototype/index.html`（**无需服务器**，`file://` 直接打开）。
左侧是产品界面（画布 1614×900），右侧是不属于产品的验收控制台：
切换页面 / 主题 / 四态 / 打开 `/remember` 浮层 / 展开面板。
也可直接改 hash 深链：`#todo/error`、`#memory/empty`。

### 机检（两条命令，退出码 = 命中数，双 0 才算过）

```powershell
pwsh -File tools/lint-anti-slop.ps1 prototype/
pwsh -File tools/assert-structure.ps1 prototype/index.html prototype/app.css
```

### 真机量测 + 预览图重生成（自带断言）

```powershell
# 12 个用例逐条断言（三栏 / T0 / 判定句 / 溢出 / diff / 深色），
# 同时把 13 张 PNG 与 metrics.json 写进指定目录；退出码 = 失败数。
node scripts/measure-v9.mjs --out prototype/shots-v9
```

---

## 数据真实性

预览图**不含占位假数据**。全部来自本机真实库 `C:\Users\51967\.memory-ops`：
7 条记忆 / 5 条待拍板 / 18 条观察未命中；token 用 `core/schema.ts::estimateTokens` 同口径实算
（652 = 框架 171 + 技能 423 + 置顶 58）；成本口径来自 `docs/product.md` §十二。

---

## 已知边界（不隐瞒）

1. **原型不接真实数据**：它证明的是信息架构与视觉，不是接线完整性。
   接线完整性的证据在 `packages/dsh-plugin/perf-report.md`（同一份桥数据 + 同一套组件）。
2. **`tokens.css` 是宿主值复刻**，移植时整段删除；它同时是主题回归测试。
3. **键盘 roving tabindex 在原型里未实现**（插件端已实现，见 `client/v9/stage.ts`）。
4. **悬停/焦点/滚动行为需实测**：静态 PNG 无法证明，已在组件规范里标「需实测」。

---

## 历史（v4–v8）

v4 / v5 / v6 / v7 / v8 的原型目录与截图已于 2026-11-21 清理，只保留契约文本：

| 版本 | 契约原文 | 当时的原型 |
|---|---|---|
| v8 | [`archive/brief-v8.md`](archive/brief-v8.md) | 已清理（`prototype/shots-v8/`、`prototype/v8/`） |
| v6 | [`archive/direction-card-v6.md`](archive/direction-card-v6.md) | 已清理 |
| v5 | [`archive/direction-card-v5.md`](archive/direction-card-v5.md) | 已清理（`prototype/v5/`） |
| v4 | [`archive/direction-card-v4.md`](archive/direction-card-v4.md) | 已清理（`prototype/v4/`） |

> 为什么清理：每个版本都留一份可运行原型 + 十余张截图，仓库里累积了 7.9 MB
> 已不再对应任何现行契约的产物，而 `design/` 的价值在契约文本与令牌，不在旧截图。
> 历史文档里对旧截图的引用**保留原样**（它们是当时评审的证据链），
> 但那些文件已经不存在——要复现旧版本，请看对应 commit 的 `prototype/`。