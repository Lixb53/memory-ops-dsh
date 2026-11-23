# v9 三栏工作台 · 性能与真机量测报告

> 对应设计契约：[`design/brief.md`](../../design/brief.md)（§八 硬规则、§十三 实测）
> 对应代码：`packages/dsh-plugin/src/client/v9/`（新）+ `client/panel.ts`（重写）
> 验证工具：`scripts/build-harness.mjs` + `scripts/measure-v9-plugin.mjs`
> 量测时间：2026-11-21 · 数据源：本机真实库 `C:\Users\51967\.memory-ops`

---

## 一、结论先说

| 项 | 实测 | 预算 | 判定 |
|---|---|---|---|
| 插件浏览器包（未压缩） | 258.5 KB | — | — |
| 插件浏览器包（gzip） | **54.8 KB** | < 300 KB | ✅ |
| 可测逻辑包（gzip） | 10.3 KB | — | 仅供测试，不进浏览器 |
| 内联样式（raw） | ~21 KB | < 100 KB | ✅（无独立 CSS 请求） |
| 首屏图片 | 0 张 | < 500 KB | ✅ |
| 三栏宽度 | 212 / 946 / 360，gap 24 | 212/946/360/24 | ✅ 5/5 用例 |
| 每页 T0 数量 | 1 | 恰好 1 | ✅ 5/5 用例 |
| 判定句长度 | 5–15 字，行高 24（单行） | ≤20 字 | ✅ |
| 标题列宽 | ≤470 | ≤720 | ✅ |
| 首屏滚动 | `paneOverflow=0`、`pageOverflow=0` | 0 | ✅ 5/5 用例 + 3 个 empty 用例 |
| 检视栏滚动 | `inspOverflow=0` | 0 | ✅ 5/5 用例 |
| 双面切换行高 | 58 → 58 | 不变 | ✅ |
| diff 结构 | removed 1 / added 1 / 上下叠 | 上下叠 | ✅ |
| 深色 T0 对比 | **17.5:1** | ≥3（大文本） | ✅ |
| error 态 T0 / 导航 | `—` / 5 个 tab | `—` / 保留 | ✅ |
| empty 态 T0 / 判定句 | `0` /「现在没有压着的事」 | 0 / 说真话 | ✅ |

`node scripts/measure-v9-plugin.mjs` 退出码 **0**（0 failure）。截图与 `metrics.json` 在 `.tmp/preview/shots/`。

---

## 二、为什么用 harness 而不是宿主内嵌

宿主 GUI 是桌面版 **WebView2**（`msedgewebview2` 进程），没有开放远程调试端口，
自动化拿不到它的 DOM。直接对 `http://127.0.0.1:64742` 起 headless Chrome 会被
「authentication required」挡回（该 URL 需要宿主注入的登录态）。

所以验证分两层，**分开声明，不混写**：

| 层 | 做法 | 证明了什么 | 没证明什么 |
|---|---|---|---|
| 组件 + 样式 | 同一份 `src/client/v9/**` + `panel.ts`，用 esbuild 打成浏览器 bundle，桥调用用**真实桥数据快照**拦截（`fixtures.json`，抓自本机宿主），真实 Chrome 1614×900 渲染 | 三栏尺寸、T0 唯一、判定句、行宽、首屏不滚、diff 上下叠、深色对比、四态 | 宿主内嵌的容器宽度/高度、宿主主题变量的真实值 |
| 宿主内嵌 | 需人工刷新宿主页面 | — | 本轮**未自动验证**（标「需实测」） |

`fixtures.json` 是真实数据（7 条记忆 / 5 条待拍板 / 18 条观察未命中 / 常驻 652 tokens），
不是占位假数据；空态夹具只在 `?phase=empty` 时启用，专门用来证明「空 ≠ 读不到」。

---

## 三、性能：做了什么、没做什么

### 3.1 消除请求瀑布（唯一真正影响体验的一项）

v4 的做法是「每个分区自己 `useBridge`」：顶条要 snapshot/overview/inbox/misses 四个数，
5 个分区各取一份，切一次分区就多打一轮请求，而且顶条与中栏可能读到**不同时刻**的数据
（定稿前实测过「顶条 8、中栏 5」打架）。

v9 改成 `useWorkbenchData` 一处取齐、一处刷新：

| 场景 | v4（旧） | v9（新） |
|---|---|---|
| 打开面板 | snapshot × N（顶条 + 当前分区） | 4 个请求（snapshot / overview / inbox / misses），各一次 |
| 切分区 | 再打 1–3 个 | 0（共享同一份） |
| 写操作后 | 各分区自己刷新，容易漏 | `reloadAll()` 一次刷 4 个 |

代价：health 页额外取一次 `health` 路由（驳回静默/待复核/超行三项），memory 页选中条目后取一次 `detail`。
两者都是「该页才需要」的数据，不构成全站成本。

### 3.2 未做的优化（有意）

- **没有加缓存层**：宿主已经按需渲染侧栏/主面板，再加一层缓存只会让「改完看不到」更难查
  （`client/data.ts` 文件头有同样结论）。
- **没有 memo 化整棵子树**：v9 的渲染成本主要在 5 个分区各 5–20 行，量测时首屏无掉帧迹象；
  在当前数据量下 `useMemo` 的收益小于它带来的 stale-closure 风险。
- **token 估算没有 import core**：`view-model.estimateTokens` 是 `core/schema.ts` 的 6 行复刻，
  用一条测试（`test/v9-view.test.mjs`）盯住两边不漂移。若直接 import core，会为了 6 行把 16 KB 的
  schema.ts 打进浏览器包。

### 3.3 体积构成

| 部分 | 估算 |
|---|---|
| v9 组件（stage + 5 panes + primitives） | ~40 KB raw |
| v9 样式（两份模板串） | ~21 KB raw |
| 旧 v7 样式 + 其余 3 个表面（未迁移） | ~120 KB raw |
| 其他（api/data/remember/session-view…） | ~70 KB raw |

**已知冗余**：迁移完成后 `client/panes/*.ts` 只剩空模块，`ui.ts` 里的 v4 兼容组件仍被打包
（会话 tab / 右侧捕获 / 维护面板还在用）。下一轮（v10 迁移其余表面）可以一起删，预计省 ~40 KB raw。

---

## 四、可复现步骤

```powershell
# 1. 构建插件产物（宿主实际加载的那份）
node scripts/build-plugin.mjs

# 2. 抓一份真实桥数据当夹具（含个人库内容，因此不入库）
node scripts/capture-fixtures.mjs

# 3. 构建渲染 harness（react 只装在 .tmp/preview，不进项目依赖）
node scripts/build-harness.mjs

# 4. 真机量测（退出码 = failure 数）
node scripts/measure-v9-plugin.mjs

# 5. 单测 + 接线断言
cd packages/dsh-plugin; npx tsc --noEmit; node --test test/*.test.mjs
```

量测脚本对每个用例断言：三栏宽度、T0 数量与文本、判定句长度与行高、标题列宽、
中栏/检视栏/整页三处溢出、选中刻度（2px + 业务蓝）、双面切换行高、diff 上下叠、
深色对比、error/empty 四态。**点击取不到元素即 FAIL**，不会静默跳过。

---

## 五、需实测（不写成已验证）

1. **宿主内嵌渲染**：WebView2 容器给主面板的实际宽高、宿主 `--dsw-alias-*` 的真实取值、
   滚动条是否与设计假设一致。→ 需在宿主里刷新页面后人工核对（截图对照 `.tmp/preview/shots/`）。
2. **焦点流**：Tab 顺序、`aria-live` 播报、Esc 关闭浮层、关闭回焦。静态断言只证明属性存在。
3. **读屏**：未跑 NVDA / VoiceOver。
4. **LCP / INP / CLS**：harness 不是真实首屏（无宿主会话、无网络），不报 CWV 数字。
5. **连点两次「存进去」的实际写入次数**：代码用 `pending` 禁用，但没有真机连点计数。
6. **Safari / Firefox**：`line-clamp`、`line-break: strict`、`color-mix` 未跨内核验证。

---

## 六、与 brief §十三 的偏差（诚实清单）

1. **首屏 0 滚动是靠「分段折叠」达成的**，不是靠内容天然短：
   真实库有 18 条观察未命中 + 5 条待拍板，待办页一次列全必然超出 776px 主区。
   v9 让「达标的」全列、「只问过一两次的」折成一行计数（可展开），
   health 页则去掉了两个 SectionHead 并把索引层/全库口径并进一行 note。
   展开后允许纵向滚动——这是用户主动行为，不在验收断言范围内。
2. **维护作业面板仍是 v7 组件**（`client/panes/maintenance.ts`，`dmo-*` 样式）。
   v9 只做了「入口 + 容器」，未重写它内部 5 个作业的视觉。悬停/展开后的样式会与 v9 不一致，
   列为下一轮待办。
3. **左轨计数在 error 态显示「—」**，与原型一致；但原型没有覆盖「部分数据源失败」的场景
   （例如 snapshot 成功、overview 失败）。当前实现是「任一源失败 → 整页 error」，宁可保守。
4. **写操作回执统一在外壳的一条带上**（`.mo-notice-bar`），不在各页内。
   这是评审后的返工决定：各页各放回执会让「撤销」随分区切换消失。
   代价是回执出现时中栏内容下移 26px——量测已覆盖（5 页 + 3 个 empty 用例均 0 溢出）。
5. **未迁移 / 未修项清单**见 [`review/code-review.md`](../../review/code-review.md) §二「未处置」，
   其中 `bridge.ts` 的 Content-Type / Origin 校验列为下一轮第一优先。