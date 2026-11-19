/**
 * 样式 —— v6 密排档案台（Data-Dense Ledger）。
 *
 * ## 令牌来源（design/direction-card.md §零/§五）
 *
 * - **颜色**：只用宿主主题 token（--dsw-alias-* / --dsw-specific-*），
 *   不写死色值。宿主在 body 上挂/摘 data-ds-dark-theme 换整套别名，
 *   本表全部走 var()，因此明暗自动跟随，无需任何 JS。
 * - **强调色**：业务蓝 --dsw-alias-state-business-primary（浅色 deepseek-500、
 *   深色 deepseek-400）。v4 用 brand-primary 在浅色下是近黑，撑不起强调
 *   （方向卡 §零-3）。brand 不再用于任何实底。
 * - **尺寸**：字阶 5 档、间距 6 档、圆角按 v6 语义（0/6/8/12）在 .dmo-root 本地定义。
 *
 * ## v6 形状语言（相对 v4）
 *
 * - 导航 = 分段控件（module 底 + 选中白底浮起），不再是下划线文字签。
 * - 卡片 = card-fill 真灰底 + border-l3 可见描边（v4 的 bg-layer-1 在浅色下是纯白）。
 * - 状态签 = tint 底 + 方点 + 文字（不只靠颜色，WCAG）。
 * - 行 = 36px 密排；数字一律等宽右对齐 tabular-nums。
 * - /remember 浮层的 CSS 在 v4 重写时被整段删除（弹窗因此「不出现」），
 *   本文件补回——这是该 bug 的回归锚点，不许再删。
 *
 * ⚠️ 本文件整体是模板字符串，注释里**不能出现反引号**，
 * 否则会提前闭合字符串、把后面的 CSS 变成代码。这个坑踩过一次
 * （test/wiring-ui.test.mjs 有专门断言）。
 */

const STYLE_ID = 'dsh-memory-ops-style'

/** 插件样式表。 */
const CSS = `
/* —— 设计令牌：尺寸本地定义，颜色一律用宿主 token —— */
.dmo-root {
  --t1: 24px;  --t1-lh: 32px;
  --t2: 20px;  --t2-lh: 28px;
  --t3: 16px;  --t3-lh: 24px;
  --t4: 14px;  --t4-lh: 22px;
  --t5: 12px;  --t5-lh: 18px;
  --s1: 4px;  --s2: 8px;  --s3: 12px;
  --s4: 16px; --s5: 24px; --s6: 32px;
  --r-row: 0;
  --r-control: 6px;
  --r-container: 8px;
  --r-overlay: 12px;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --ease: cubic-bezier(0.2, 0, 0, 1);
  --dur: 120ms;
  --dur-overlay: 180ms;
  --accent: var(--dsw-alias-state-business-primary);
  --accent-soft: color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent);
  --accent-line: color-mix(in srgb, var(--dsw-alias-state-business-primary) 32%, transparent);

  display: flex; flex-direction: column; height: 100%; min-height: 0;
  font-size: var(--t4); line-height: var(--t4-lh);
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-specific-sidebar-fill, var(--dsw-alias-bg-base));
}
.dmo-root *, .dmo-root *::before, .dmo-root *::after { box-sizing: border-box; }
.dmo-root button, .dmo-root input, .dmo-root textarea, .dmo-root select { font: inherit; color: inherit; }

/* ============ 面板外壳 ============ */
.dmo-head { flex: 0 0 auto; padding: var(--s3) var(--s3) 0; overflow: hidden; }
.dmo-head-row { display: flex; align-items: baseline; gap: var(--s2); margin-bottom: var(--s2); }
.dmo-app-name {
  font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600;
  letter-spacing: 0.02em; margin: 0;
}
.dmo-scope {
  font-family: var(--mono); font-size: var(--t5); line-height: var(--t5-lh);
  color: var(--dsw-alias-label-secondary); margin-left: auto;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 55%;
}

/* v6 导航：分段控件。轨道 = module 底 + 描边；选中 = 白底浮起 + 加粗。
   计数用蓝字（v4 的灰字在深色下几乎不可见）。 */
.dmo-nav {
  display: flex; gap: 2px;
  background: var(--dsw-alias-bg-module-platform, var(--dsw-alias-bg-layer-1));
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--r-container);
  padding: 3px; margin-bottom: var(--s3);
  overflow-x: auto; scrollbar-width: none;
}
.dmo-nav::-webkit-scrollbar { display: none; }
.dmo-nav-item {
  appearance: none; border: 1px solid transparent; background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: var(--t5); line-height: var(--t5-lh);
  padding: var(--s1) var(--s2);
  border-radius: var(--r-control);
  cursor: pointer; white-space: nowrap; flex: 1 0 auto; text-align: center;
  transition: background var(--dur) var(--ease), color var(--dur) var(--ease),
              border-color var(--dur) var(--ease);
}
.dmo-nav-item:hover { color: var(--dsw-alias-label-primary); }
.dmo-nav-item:active { background: var(--dsw-alias-interactive-bg-hover); }
.dmo-nav-item:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.dmo-nav-item[aria-selected="true"] {
  background: var(--dsw-alias-bg-base);
  border-color: var(--dsw-alias-border-l3);
  color: var(--dsw-alias-label-primary); font-weight: 600;
}
.dmo-nav-count {
  font-family: var(--mono); font-size: var(--t5); font-weight: 600;
  color: var(--accent); margin-left: var(--s1);
  font-variant-numeric: tabular-nums;
}

.dmo-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: var(--s3); display: flex; flex-direction: column; gap: var(--s3); }

/* ============ 排版原语 ============ */
.dmo-lede {
  font-size: var(--t1); line-height: var(--t1-lh); font-weight: 600;
  letter-spacing: -0.01em; margin: 0 0 var(--s1); word-break: break-word;
}
.dmo-lede-sub {
  font-size: var(--t4); line-height: var(--t4-lh);
  color: var(--dsw-alias-label-secondary); margin: 0;
}
.dmo-page-name {
  font-size: var(--t5); line-height: var(--t5-lh); font-weight: 600;
  letter-spacing: 0.06em; margin: 0 0 var(--s1);
  color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary));
}

.dmo-section-head {
  display: flex; align-items: baseline; gap: var(--s2);
  border-top: 1px solid var(--dsw-alias-border-l2);
  padding-top: var(--s2);
}
.dmo-section-title { font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; letter-spacing: 0.02em; margin: 0; }
.dmo-section-count { font-family: var(--mono); font-size: var(--t5); color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }

/* 元信息：等宽 + 次要色（第二字体身份） */
.dmo-meta {
  font-family: var(--mono); font-size: var(--t5); line-height: var(--t5-lh);
  color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums;
}
.dmo-meta-row { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--s1) var(--s2); margin-top: 2px; }
.dmo-note { font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-label-secondary); margin: var(--s2) 0 0; }

/* ============ 状态签（v6：tint 底 + 方点 + 文字；圆角 0） ============ */
/* 文字一律 label-primary——彩色只出现在底与方点上（方向卡 §七-2 对比度裁决）。 */
.dmo-tag {
  display: inline-flex; align-items: center; gap: var(--s1);
  font-family: var(--mono); font-size: var(--t5); line-height: var(--t5-lh);
  padding: 0 var(--s1); border-radius: var(--r-row);
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
  white-space: nowrap;
}
.dmo-tag::before {
  content: ""; flex: 0 0 auto; width: 6px; height: 6px;
  background: var(--dsw-alias-state-idle-primary);
}
.dmo-tag[data-tone="warn"] { background: var(--dsw-alias-state-warn-tertiary, color-mix(in srgb, var(--dsw-alias-state-warn-primary) 14%, transparent)); }
.dmo-tag[data-tone="warn"]::before { background: var(--dsw-alias-state-warn-primary); }
.dmo-tag[data-tone="ok"] { background: var(--dsw-alias-state-success-tertiary, color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent)); }
.dmo-tag[data-tone="ok"]::before { background: var(--dsw-alias-state-success-primary); }
.dmo-tag[data-tone="err"] { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent); }
.dmo-tag[data-tone="err"]::before { background: var(--dsw-alias-state-error-primary); }
.dmo-tag[data-tone="live"] { background: var(--accent-soft); }
.dmo-tag[data-tone="live"]::before { background: var(--accent); }

/* ============ 建议卡 ============ */
.dmo-suggest {
  border: 1px solid var(--dsw-alias-border-l3); border-radius: var(--r-container);
  padding: var(--s3);
  background: var(--dsw-alias-card-fill, var(--dsw-alias-bg-layer-1));
  display: flex; flex-direction: column; gap: var(--s1);
}
.dmo-suggest-label {
  font-family: var(--mono); font-size: var(--t5); line-height: var(--t5-lh);
  color: var(--dsw-alias-label-secondary); margin: 0;
}
.dmo-suggest-title { font-size: var(--t3); line-height: var(--t3-lh); font-weight: 600; margin: 0; word-break: break-word; }
.dmo-suggest-body { font-size: var(--t4); line-height: var(--t4-lh); margin: 0; word-break: break-word; }
.dmo-suggest-actions { display: flex; align-items: center; gap: var(--s2); flex-wrap: wrap; margin-top: var(--s2); }

/* ============ 按钮：主按钮 = 业务蓝实底（每屏 ≤1） ============ */
.dmo-btn {
  appearance: none; border: 1px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary);
  border-radius: var(--r-control); padding: var(--s1) var(--s3);
  font-size: var(--t4); line-height: var(--t4-lh); cursor: pointer;
  transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease),
              filter var(--dur) var(--ease);
}
.dmo-btn:hover:not(:disabled):not(.dmo-btn-primary) { background: var(--dsw-alias-card-fill-hover, var(--dsw-alias-bg-layer-2)); }
.dmo-btn:active:not(:disabled):not(.dmo-btn-primary) { background: var(--dsw-alias-interactive-bg-active); }
.dmo-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.dmo-btn:disabled { opacity: 0.42; cursor: not-allowed; }
.dmo-btn-primary {
  background: var(--dsw-alias-button-info-fill, var(--accent));
  border-color: var(--dsw-alias-button-info-fill, var(--accent));
  color: var(--dsw-alias-label-on-color, var(--dsw-alias-bg-base));
  font-weight: 600;
}
.dmo-btn-primary:hover:not(:disabled) {
  background: var(--dsw-alias-button-info-hover, var(--accent));
  border-color: var(--dsw-alias-button-info-hover, var(--accent));
}
.dmo-btn-primary:active:not(:disabled) { filter: brightness(0.92); }
.dmo-btn-sm { padding: 0 var(--s2); font-size: var(--t5); line-height: var(--t5-lh); }
.dmo-btn-quiet {
  border-color: transparent; background: transparent;
  color: var(--dsw-alias-label-secondary); padding-left: var(--s2); padding-right: var(--s2);
}
.dmo-btn-quiet:hover:not(:disabled) {
  background: transparent; color: var(--dsw-alias-label-primary);
  text-decoration: underline; text-underline-offset: 2px;
}
.dmo-btn-danger {
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent);
  color: var(--dsw-alias-state-error-primary);
}
.dmo-btn-danger:hover:not(:disabled) { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent); }

.dmo-textlink {
  appearance: none; border: 0; background: none; padding: 0;
  color: var(--dsw-alias-link, var(--accent));
  font-size: var(--t5); line-height: var(--t5-lh); cursor: pointer;
  text-decoration: underline; text-underline-offset: 2px;
  text-decoration-color: color-mix(in srgb, var(--dsw-alias-link, var(--accent)) 40%, transparent);
  transition: text-decoration-color var(--dur) var(--ease);
}
.dmo-textlink:hover { text-decoration-color: currentColor; }
.dmo-textlink:active { text-decoration-color: currentColor; }
.dmo-textlink:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: var(--r-control); }

/* ============ 输入与捕获 ============ */
.dmo-capture {
  border: 1px solid var(--dsw-alias-border-l3); border-radius: var(--r-container);
  background: var(--dsw-alias-bg-base); padding: var(--s2);
  transition: border-color var(--dur) var(--ease);
}
/* 顺序即优先级：focus > active > hover（同特异性，后写胜出） */
.dmo-capture:hover { border-color: var(--dsw-alias-border-l4); }
.dmo-capture:active { border-color: var(--dsw-alias-label-secondary); }
.dmo-capture:focus-within { border-color: var(--accent); }
.dmo-capture-input {
  width: 100%; border: 0; background: transparent; resize: vertical;
  min-height: 40px; font-size: var(--t4); line-height: var(--t4-lh);
  padding: var(--s1); outline: none; border-radius: var(--r-control);
  transition: background var(--dur) var(--ease);
}
.dmo-capture-input::placeholder { color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.dmo-capture-input:focus-visible { background: var(--dsw-alias-card-fill, var(--dsw-alias-bg-layer-1)); }
.dmo-capture-foot { display: flex; align-items: center; gap: var(--s2); padding: var(--s1) var(--s1) 0; }
.dmo-capture-hint { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); }

.dmo-input {
  width: 100%; border: 1px solid var(--dsw-alias-border-l3);
  border-radius: var(--r-control); background: var(--dsw-alias-bg-base);
  padding: var(--s1) var(--s2); font-size: var(--t4); line-height: var(--t4-lh);
  transition: border-color var(--dur) var(--ease);
}
.dmo-input::placeholder { color: var(--dsw-alias-label-tertiary, var(--dsw-alias-label-secondary)); }
.dmo-input:hover { border-color: var(--dsw-alias-border-l4); }
.dmo-input:focus { outline: 2px solid var(--accent); outline-offset: -1px; border-color: var(--accent); }

.dmo-toolbar { display: flex; gap: var(--s2); }
.dmo-toolbar > .dmo-input { flex: 1 1 auto; min-width: 0; }

/* 类型/筛选签：选中 = 蓝线 + 蓝字 + 蓝 tint（v6） */
.dmo-kindrow { display: flex; flex-wrap: wrap; gap: var(--s1); }
.dmo-kindbtn {
  appearance: none; border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-secondary);
  border-radius: var(--r-control); padding: 0 var(--s2);
  font-size: var(--t5); line-height: var(--t5-lh); cursor: pointer;
  transition: background var(--dur) var(--ease), color var(--dur) var(--ease),
              border-color var(--dur) var(--ease);
}
.dmo-kindbtn:hover { background: var(--dsw-alias-card-fill-hover, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-label-primary); }
.dmo-kindbtn:active { background: var(--dsw-alias-interactive-bg-active); }
.dmo-kindbtn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.dmo-kindbtn[aria-pressed="true"] {
  border-color: var(--accent-line); color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  font-weight: 600;
}

/* ============ 台账行：36px 密排（v6 核心节奏） ============ */
.dmo-list { list-style: none; margin: 0; padding: 0; }
.dmo-row { padding: var(--s2); border-bottom: 1px solid var(--dsw-alias-border-l1); min-height: 36px; }
.dmo-row:last-child { border-bottom: 0; }

/* 横向按钮/控件行。v4 曾把两种语义共用 .dmo-row（后写的 display:flex
   覆盖了台账行布局）；v6 拆开：台账行归 .dmo-row，横排归 .dmo-hrow。 */
.dmo-hrow { display: flex; gap: var(--s2); align-items: center; }
.dmo-hrow > * { min-width: 0; }
.dmo-list-clickable .dmo-row {
  margin: 0 calc(var(--s2) * -1); padding-left: var(--s2); padding-right: var(--s2);
  border-radius: var(--r-row);
  transition: background var(--dur) var(--ease);
}
.dmo-list-clickable .dmo-row:hover { background: var(--dsw-alias-card-fill-hover, var(--dsw-alias-bg-layer-1)); }
.dmo-row-title { font-size: var(--t4); line-height: var(--t4-lh); margin: 0; word-break: break-word; }
.dmo-row-button {
  appearance: none; border: 0; background: none; padding: 0; text-align: left;
  width: 100%; color: inherit; cursor: pointer;
  font-size: var(--t4); line-height: var(--t4-lh); word-break: break-word;
  transition: color var(--dur) var(--ease);
}
.dmo-row-button:hover { color: var(--dsw-alias-link, var(--accent)); }
.dmo-row-button:active { color: var(--dsw-alias-link, var(--accent)); }
.dmo-row-button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: var(--r-control); }
.dmo-row-actions { display: flex; align-items: center; gap: var(--s2); margin-top: var(--s2); flex-wrap: wrap; }

/* ============ 四态 ============ */
.dmo-skeleton {
  background: var(--dsw-alias-bg-skeleton, var(--dsw-alias-bg-layer-1));
  border-radius: var(--r-control);
  animation: dmo-breathe 1.2s ease-in-out infinite; margin-bottom: var(--s2);
}
@keyframes dmo-breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

.dmo-empty { padding: var(--s5) var(--s3); text-align: center; }
.dmo-empty-title { font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; margin: 0 0 var(--s1); }
.dmo-empty-body { font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-label-secondary); margin: 0 0 var(--s4); }
.dmo-empty-actions { display: flex; gap: var(--s2); justify-content: center; flex-wrap: wrap; }

/* 错误态：tint 底 + 可见红边；标题 primary，说清怎么解决 */
.dmo-alert {
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent);
  border-radius: var(--r-container); padding: var(--s3);
}
.dmo-alert-title { font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; color: var(--dsw-alias-label-primary); margin: 0 0 var(--s1); }
.dmo-alert-body { font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-label-secondary); margin: 0 0 var(--s3); }
.dmo-alert-actions { display: flex; gap: var(--s2); flex-wrap: wrap; }

/* 提示条：tint 底 + 方点信号，不用左侧彩边 */
.dmo-notice {
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--r-container);
  background: var(--dsw-alias-bg-module-platform, var(--dsw-alias-bg-layer-1));
  padding: var(--s2) var(--s3);
}
.dmo-notice-title { font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; margin: 0 0 var(--s1); }
.dmo-notice-text { font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-label-secondary); margin: 0; }
.dmo-notice[data-tone="warn"] {
  background: var(--dsw-alias-state-warn-tertiary, color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent));
  border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent);
}
.dmo-notice[data-tone="err"] {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent);
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent);
}

/* 就地反馈：tint 底条，文本继承容器色 */
.dmo-inline-done {
  display: flex; align-items: center; gap: var(--s2); flex-wrap: wrap;
  font-size: var(--t4); line-height: var(--t4-lh);
  padding: var(--s2); border-radius: var(--r-control);
  background: var(--dsw-alias-state-success-tertiary, color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent));
  color: var(--dsw-alias-label-primary);
  margin-top: var(--s2);
  animation: dmo-fade var(--dur) var(--ease);
}
@keyframes dmo-fade { from { opacity: 0; } to { opacity: 1; } }
.dmo-inline-done[data-tone="err"] {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
}
.dmo-inline-done-text { color: inherit; }

/* ============ 今天页：KPI 账带（v6：单条 4 格，数字右对齐基线） ============ */
.dmo-trail {
  display: grid; grid-template-columns: repeat(4, 1fr);
  background: var(--dsw-alias-card-fill, var(--dsw-alias-bg-layer-1));
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: var(--r-container); overflow: hidden;
}
.dmo-trail-line {
  display: flex; flex-direction: column; align-items: flex-end; gap: 0;
  padding: var(--s2) 6px var(--s1);
  border: 0; border-left: 1px solid var(--dsw-alias-border-l1);
  appearance: none; background: transparent;
  cursor: pointer; color: var(--dsw-alias-label-primary);
  text-align: right; min-width: 0;
  transition: background var(--dur) var(--ease);
}
.dmo-trail-line:first-child { border-left: 0; align-items: flex-start; text-align: left; padding-left: var(--s3); }
.dmo-trail-line:hover { background: var(--dsw-alias-card-fill-hover, var(--dsw-alias-bg-layer-2)); }
.dmo-trail-line:active { background: var(--dsw-alias-interactive-bg-active); }
.dmo-trail-line:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.dmo-trail-num {
  font-family: var(--mono); font-size: var(--t2); line-height: var(--t2-lh);
  font-weight: 600; font-variant-numeric: tabular-nums;
}
.dmo-trail-line:first-child .dmo-trail-num { color: var(--accent); }
.dmo-trail-text {
  font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;
}

/* ============ 详情 ============ */
.dmo-back { margin-bottom: var(--s2); }
.dmo-detail-title { font-size: var(--t3); line-height: var(--t3-lh); font-weight: 600; margin: 0 0 var(--s1); word-break: break-word; }
.dmo-evidence {
  border-left: 2px solid var(--dsw-alias-border-l3); padding-left: var(--s2);
  margin: var(--s2) 0; font-size: var(--t4); line-height: var(--t4-lh);
  color: var(--dsw-alias-label-primary);
}
.dmo-body-block {
  font-size: var(--t4); line-height: var(--t4-lh); white-space: pre-wrap;
  word-break: break-word; margin: var(--s2) 0; max-height: 220px; overflow-y: auto;
  background: var(--dsw-alias-bg-base); border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--r-control); padding: var(--s2) var(--s3);
}
.dmo-more { margin-top: var(--s2); }
.dmo-more > summary {
  cursor: pointer; font-family: var(--mono); font-size: var(--t5); line-height: var(--t5-lh);
  color: var(--dsw-alias-label-secondary); list-style: none;
  display: inline-flex; align-items: center; gap: var(--s1); padding: 0;
  transition: color var(--dur) var(--ease);
}
.dmo-more > summary::-webkit-details-marker { display: none; }
.dmo-more > summary::before { content: "▸"; display: inline-block; font-size: var(--t5); transition: transform var(--dur) var(--ease); }
.dmo-more[open] > summary::before { transform: rotate(90deg); }
.dmo-more[open] > summary { margin-bottom: var(--s2); }
.dmo-more > summary:hover { color: var(--dsw-alias-label-primary); }
.dmo-more > summary:active { color: var(--dsw-alias-label-primary); text-decoration: underline; }
.dmo-more > summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: var(--r-control); }
.dmo-more-body { padding: var(--s2) var(--s3); display: flex; flex-direction: column; gap: var(--s2); background: var(--dsw-alias-bg-module-platform, transparent); border-radius: var(--r-control); }

/* ============ 成本行（库健康）：数字右对齐同一基线 ============ */
.dmo-cost { padding-top: var(--s1); }
.dmo-cost-row { display: flex; align-items: baseline; gap: var(--s2); padding: var(--s1) 0; }
.dmo-cost-name { font-size: var(--t4); line-height: var(--t4-lh); }
.dmo-cost-num {
  margin-left: auto; font-family: var(--mono); font-size: var(--t2); line-height: var(--t2-lh);
  font-weight: 600; font-variant-numeric: tabular-nums;
}
.dmo-cost-note { font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-label-secondary); margin: 0 0 var(--s2); }
.dmo-jobs { display: flex; flex-wrap: wrap; gap: var(--s1); margin-top: var(--s2); }

/* ============ 杂项 ============ */
.dmo-degrade {
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent);
  border-radius: var(--r-container);
  background: var(--dsw-alias-state-warn-tertiary, color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent));
  padding: var(--s2) var(--s3); margin-bottom: var(--s2);
}
.dmo-error {
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent);
  border-radius: var(--r-container);
  padding: var(--s3); font-size: var(--t4); line-height: var(--t4-lh);
  color: var(--dsw-alias-label-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent);
}
.dmo-row-sub { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); margin-top: var(--s1); }
.dmo-row-item { display: flex; gap: var(--s2); align-items: flex-start; padding: var(--s2) 0; border-bottom: 1px solid var(--dsw-alias-border-l1); min-height: 36px; }
.dmo-row-item:last-child { border-bottom: 0; }
.dmo-row-main { flex: 1 1 auto; min-width: 0; }
.dmo-row-text { font-size: var(--t4); line-height: var(--t4-lh); word-break: break-word; }
.dmo-check { flex: 0 0 auto; margin-top: 3px; accent-color: var(--accent); }
.dmo-quote { margin: 0; font-size: var(--t4); line-height: var(--t4-lh); }
.dmo-quote::before { content: "「"; }
.dmo-quote::after { content: "」"; }
.dmo-mono { font-family: var(--mono); font-size: var(--t5); }

/* ============ 浮层：唯一有阴影的地方 ============ */
.dmo-overlay {
  position: fixed; inset: 0; z-index: 40;
  display: flex; align-items: center; justify-content: center;
  background: var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.45));
  animation: dmo-fade var(--dur-overlay) var(--ease);
}
.dmo-overlay-card {
  width: min(400px, calc(100vw - 32px));
  background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l3); border-radius: var(--r-overlay);
  padding: var(--s4);
  box-shadow: 0 12px 32px var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.4));
}
.dmo-overlay-title { font-size: var(--t3); line-height: var(--t3-lh); font-weight: 600; margin: 0 0 var(--s2); }
.dmo-overlay-body { font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-label-secondary); margin: 0 0 var(--s3); }
.dmo-overlay-actions { display: flex; gap: var(--s2); justify-content: flex-end; }

/* ============ /remember 浮层（v4 重写时被整段删除 → 弹窗不可见的 bug 根因；
   本段是回归锚点，任何样式重构都必须保留这些类） ============ */
.dmo-remember-backdrop {
  position: fixed; inset: 0; z-index: 200;
  display: flex; align-items: center; justify-content: center;
  background: var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.45));
  animation: dmo-fade var(--dur-overlay) var(--ease);
}
.dmo-remember-card {
  width: min(480px, calc(100% - 32px));
  max-height: min(78vh, 620px);
  display: flex; flex-direction: column; gap: var(--s2);
  padding: var(--s4);
  border-radius: var(--r-overlay);
  border: 1px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  box-shadow: 0 12px 32px var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.4));
}
.dmo-remember-head { display: flex; align-items: baseline; gap: var(--s2); }
.dmo-remember-title { font-size: var(--t4); font-weight: 600; }
.dmo-remember-close {
  margin-left: auto; appearance: none; border: 0; background: transparent;
  color: var(--dsw-alias-label-secondary); font-size: 18px; line-height: 1;
  padding: var(--s1) var(--s2); border-radius: var(--r-control); cursor: pointer;
  font-family: inherit;
}
.dmo-remember-close:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-card-fill-hover, var(--dsw-alias-bg-layer-2)); }
.dmo-remember-close:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.dmo-remember-body { display: flex; flex-direction: column; gap: var(--s2); min-height: 0; overflow-y: auto; }
.dmo-remember-input { min-height: 96px; }
.dmo-remember-foot { display: flex; align-items: center; justify-content: space-between; gap: var(--s2); }
.dmo-remember-toast {
  position: fixed; left: 50%; bottom: 96px; transform: translateX(-50%);
  z-index: 190; display: flex; align-items: center; gap: var(--s2);
  padding: var(--s2) var(--s3); border-radius: var(--r-overlay);
  font-size: var(--t4); line-height: var(--t4-lh);
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-base);
  box-shadow: 0 4px 14px var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.28));
  max-width: min(560px, calc(100vw - 32px));
}
.dmo-remember-undo {
  appearance: none; border: 1px solid var(--dsw-alias-border-l3);
  background: transparent; color: var(--accent);
  border-radius: var(--r-control); padding: 0 var(--s2);
  font-size: var(--t5); cursor: pointer; font-family: inherit;
}
.dmo-remember-undo:hover:not(:disabled) { background: var(--dsw-alias-card-fill-hover, var(--dsw-alias-bg-layer-2)); }
.dmo-remember-undo:disabled { opacity: 0.45; cursor: not-allowed; }
.dmo-remember-dismiss {
  appearance: none; border: 0; background: transparent;
  color: var(--dsw-alias-label-secondary); cursor: pointer;
  font-size: 15px; line-height: 1; padding: 0 var(--s1); font-family: inherit;
}
.dmo-remember-dismiss:hover { color: var(--dsw-alias-label-primary); }

/* ============ 旧表面（会话 tab / 右侧捕获）沿用 v6 语言 ============ */
.dmo-session { padding: var(--s3); display: flex; flex-direction: column; gap: var(--s2); }
.dmo-session-kpis { display: flex; gap: var(--s2); }
.dmo-session-kpi {
  flex: 1 1 0; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--r-container);
  padding: var(--s2); text-align: center;
  background: var(--dsw-alias-card-fill, var(--dsw-alias-bg-layer-1));
}
.dmo-session-kpi b { display: block; font-family: var(--mono); font-size: var(--t2); font-variant-numeric: tabular-nums; font-weight: 600; }
.dmo-session-kpi span { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); }
.dmo-capture-pane { display: flex; flex-direction: column; gap: var(--s2); padding: var(--s3); }
.dmo-recent-row { display: flex; align-items: baseline; gap: var(--s2); padding: var(--s1) 0; border-bottom: 1px solid var(--dsw-alias-border-l1); font-size: var(--t5); line-height: var(--t5-lh); }
.dmo-recent-row:last-child { border-bottom: 0; }
.dmo-recent-main { flex: 1 1 auto; min-width: 0; word-break: break-word; }
.dmo-recent-time { flex: 0 0 auto; font-size: var(--t5); color: var(--dsw-alias-label-secondary); font-family: var(--mono); }
.dmo-toast { font-size: var(--t4); line-height: var(--t4-lh); padding: var(--s2); border-radius: var(--r-control); }
.dmo-toast-ok { background: var(--dsw-alias-state-success-tertiary, color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent)); color: var(--dsw-alias-label-primary); }
.dmo-toast-err { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent); color: var(--dsw-alias-label-primary); }
.dmo-lane-head { display: flex; align-items: center; gap: var(--s2); font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; margin-bottom: var(--s1); }
.dmo-lane-count { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); font-weight: 400; font-family: var(--mono); }
.dmo-budget {
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--r-container);
  padding: var(--s2) var(--s3); margin-bottom: var(--s2);
  background: var(--dsw-alias-card-fill, var(--dsw-alias-bg-layer-1));
}
.dmo-budget-row { display: flex; align-items: center; gap: var(--s2); padding: var(--s1) 0; font-size: var(--t5); line-height: var(--t5-lh); }
.dmo-budget-name { flex: 0 0 58px; color: var(--dsw-alias-label-secondary); }
.dmo-budget-bar { flex: 1 1 auto; height: 6px; border-radius: 3px; background: var(--dsw-alias-bg-skeleton, var(--dsw-alias-bg-layer-2)); overflow: hidden; }
.dmo-budget-fill { height: 100%; border-radius: 3px; background: var(--accent); }
.dmo-budget-fill-over { background: var(--dsw-alias-state-warn-primary); }
.dmo-budget-num { flex: 0 0 auto; font-family: var(--mono); font-variant-numeric: tabular-nums; font-weight: 600; }
.dmo-budget-item { padding: var(--s2) 0; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dmo-budget-item:last-child { border-bottom: 0; padding-bottom: 0; }
.dmo-budget-head { display: flex; align-items: center; gap: var(--s2); flex-wrap: wrap; margin-bottom: var(--s1); }
.dmo-badge {
  display: inline-flex; align-items: center; gap: var(--s1); padding: 0 var(--s1);
  border-radius: var(--r-row); font-family: var(--mono);
  font-size: var(--t5); font-weight: 600; line-height: var(--t5-lh);
  white-space: nowrap; color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-interactive-bg-hover);
}
.dmo-badge::before { content: ""; flex: 0 0 auto; width: 6px; height: 6px; background: var(--dsw-alias-state-idle-primary); }
.dmo-badge-ok { background: var(--dsw-alias-state-success-tertiary, color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent)); }
.dmo-badge-ok::before { background: var(--dsw-alias-state-success-primary); }
.dmo-badge-warn { background: var(--dsw-alias-state-warn-tertiary, color-mix(in srgb, var(--dsw-alias-state-warn-primary) 14%, transparent)); }
.dmo-badge-warn::before { background: var(--dsw-alias-state-warn-primary); }
.dmo-badge-err { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent); }
.dmo-badge-err::before { background: var(--dsw-alias-state-error-primary); }
.dmo-badge-idle { background: var(--dsw-alias-interactive-bg-hover); }
.dmo-badge-idle::before { background: var(--dsw-alias-state-idle-primary); }
.dmo-badge-brand { background: var(--accent-soft); }
.dmo-badge-brand::before { background: var(--accent); }
.dmo-stepper { display: flex; align-items: center; gap: 3px; margin: var(--s2) 0; }
.dmo-step { flex: 1 1 0; height: 4px; border-radius: 2px; background: var(--dsw-alias-bg-skeleton, var(--dsw-alias-bg-layer-2)); }
.dmo-step-on { background: var(--dsw-alias-state-success-primary); }
.dmo-step-now { background: var(--accent); }
.dmo-evidence-src { color: var(--dsw-alias-label-secondary); font-size: var(--t5); line-height: var(--t5-lh); font-family: var(--mono); }
.dmo-anchor-note {
  display: flex; gap: var(--s2); align-items: flex-start;
  padding: var(--s2) var(--s3); border-radius: var(--r-control);
  font-size: var(--t4); line-height: var(--t4-lh); margin: var(--s2) 0;
}
.dmo-anchor-note[data-state="stale"] {
  background: var(--dsw-alias-state-warn-tertiary, color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent));
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, transparent);
}
.dmo-anchor-note[data-state="fresh"] {
  background: var(--dsw-alias-state-success-tertiary, color-mix(in srgb, var(--dsw-alias-state-success-primary) 9%, transparent));
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary) 35%, transparent);
}
.dmo-anchor-note code, .dmo-mono { font-family: var(--mono); font-size: var(--t5); }
.dmo-resident-row { display: flex; gap: var(--s2); align-items: flex-start; padding: var(--s1) 0 var(--s1) var(--s2); border-left: 2px solid var(--dsw-alias-border-l2); }
.dmo-resident-main { flex: 1 1 auto; min-width: 0; }
.dmo-row-text-link { color: var(--dsw-alias-label-primary); cursor: pointer; }
.dmo-row-text-link:hover { color: var(--dsw-alias-link, var(--accent)); text-decoration: underline; text-underline-offset: 2px; }
.dmo-link { color: var(--dsw-alias-link, var(--accent)); cursor: pointer; }
.dmo-link:hover { text-decoration: underline; text-underline-offset: 2px; }
.dmo-bulk {
  display: flex; align-items: center; gap: var(--s2); flex-wrap: wrap;
  padding: var(--s2) var(--s3); margin-bottom: var(--s2); border-radius: var(--r-container);
  background: var(--accent-soft); border: 1px solid var(--accent-line);
}
.dmo-chips { display: flex; flex-wrap: wrap; gap: var(--s1); }
.dmo-chip {
  appearance: none; border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-secondary);
  border-radius: var(--r-control); padding: 0 var(--s2);
  font-size: var(--t5); line-height: var(--t5-lh);
  cursor: pointer; display: inline-flex; align-items: center; gap: var(--s1);
}
.dmo-chip:hover { background: var(--dsw-alias-card-fill-hover, var(--dsw-alias-bg-layer-2)); color: var(--dsw-alias-label-primary); }
.dmo-chip[aria-pressed="true"] { border-color: var(--accent-line); color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent); font-weight: 600; }
.dmo-chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.dmo-chip-num { font-family: var(--mono); font-variant-numeric: tabular-nums; }
.dmo-band { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--s1); }
.dmo-band-cell {
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--r-control);
  padding: var(--s2) var(--s1); text-align: center; min-width: 0;
  background: var(--dsw-alias-card-fill, var(--dsw-alias-bg-layer-1));
}
.dmo-band-cell[data-active="true"] { border-color: var(--accent-line); background: var(--accent-soft); }
.dmo-band-v { font-size: var(--t3); line-height: var(--t3-lh); font-weight: 600; font-variant-numeric: tabular-nums; font-family: var(--mono); }
.dmo-band-l { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dmo-band-cell[data-tone="warn"] .dmo-band-v { color: var(--dsw-alias-state-warn-primary); }
.dmo-band-cell[data-tone="ok"] .dmo-band-v { color: var(--dsw-alias-state-success-primary); }
.dmo-group { margin-bottom: var(--s3); }
.dmo-group-head { display: flex; align-items: center; gap: var(--s2); margin-bottom: var(--s1); }
.dmo-group-title { font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; margin: 0; }
.dmo-group-count { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); font-weight: 400; font-family: var(--mono); }
.dmo-skeleton-old {
  height: 52px; border-radius: var(--r-control); margin-bottom: var(--s2);
  background: var(--dsw-alias-bg-skeleton, var(--dsw-alias-bg-layer-1));
  animation: dmo-breathe 1.2s ease-in-out infinite;
}
.dmo-error-old { border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent); border-radius: var(--r-container); padding: var(--s2) var(--s3); font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-label-primary); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent); }
.dmo-capture-inline { margin-bottom: var(--s2); }
.dmo-capture-inline .dmo-textarea { min-height: 46px; }
.dmo-textarea {
  width: 100%; font: inherit; font-size: var(--t4); line-height: var(--t4-lh);
  color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l3); border-radius: var(--r-control);
  padding: var(--s1) var(--s2); min-height: 70px; resize: vertical;
  font-family: var(--mono);
}
.dmo-textarea:focus { outline: 2px solid var(--accent); outline-offset: -1px; border-color: var(--accent); }
.dmo-label { display: block; font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); margin-bottom: var(--s1); }
.dmo-select {
  width: 100%; font: inherit; font-size: var(--t4); line-height: var(--t4-lh);
  color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l3); border-radius: var(--r-control);
  padding: var(--s1) var(--s2);
}
.dmo-select:focus { outline: 2px solid var(--accent); outline-offset: -1px; border-color: var(--accent); }
.dmo-toolbar > .dmo-select { width: auto; flex: 0 0 auto; }
.dmo-field { margin-bottom: var(--s2); }
.dmo-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(84px, 1fr)); gap: var(--s2); }
.dmo-kpi {
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--r-container);
  padding: var(--s2); min-width: 0;
  background: var(--dsw-alias-card-fill, var(--dsw-alias-bg-layer-1));
}
.dmo-kpi-label { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dmo-kpi-value { font-family: var(--mono); font-size: var(--t2); line-height: var(--t2-lh); font-weight: 600; font-variant-numeric: tabular-nums; margin-top: 1px; }
.dmo-kpi-note { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); }
.dmo-kpi-btn { appearance: none; text-align: left; cursor: pointer; font: inherit; color: inherit; }
.dmo-kpi-btn:hover { background: var(--dsw-alias-card-fill-hover, var(--dsw-alias-bg-layer-2)); border-color: var(--dsw-alias-border-l3); }
.dmo-kpi-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.dmo-kpi-more { float: right; font-size: var(--t5); line-height: var(--t5-lh); color: var(--accent); font-weight: 600; }
.dmo-resident-group { margin: var(--s2) 0; }
.dmo-resident-head { display: flex; align-items: center; gap: var(--s2); margin-bottom: 3px; }
.dmo-card {
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--r-container);
  padding: var(--s2) var(--s3); margin-bottom: var(--s2);
  background: var(--dsw-alias-card-fill, var(--dsw-alias-bg-layer-1));
}
.dmo-card-title { font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; word-break: break-word; }
.dmo-card-meta { display: flex; flex-wrap: wrap; gap: var(--s2); align-items: center; margin-top: var(--s1); font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); font-family: var(--mono); }
.dmo-card-body { margin-top: var(--s2); font-size: var(--t4); line-height: var(--t4-lh); white-space: pre-wrap; word-break: break-word; }
.dmo-card-actions { display: flex; flex-wrap: wrap; gap: var(--s2); margin-top: var(--s2); }
.dmo-lane { margin-bottom: var(--s2); }
.dmo-types { display: flex; flex-wrap: wrap; gap: var(--s1); }
.dmo-recent-wrap { margin-top: var(--s3); }
.dmo-recent-head { display: flex; align-items: center; gap: var(--s2); margin-bottom: var(--s1); }
.dmo-recent-title { font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; margin: 0; }
.dmo-recent-count { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); font-family: var(--mono); }
.dmo-icon { display: block; }

@media (prefers-reduced-motion: reduce) {
  .dmo-root *, .dmo-root *::before, .dmo-root *::after {
    animation: none !important; transition: none !important;
  }
}
`

/** 注入样式表，返回卸载函数。 */
export function installStyles(): () => void {
  if (typeof document === 'undefined') return () => {}
  const existing = document.getElementById(STYLE_ID)
  if (existing !== null) return () => {}
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.append(style)
  return () => {
    style.remove()
  }
}
