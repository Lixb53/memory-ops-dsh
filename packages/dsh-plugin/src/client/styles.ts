/**
 * 样式 —— v4 任务导向界面。
 *
 * ## 令牌来源（design/direction-card.md §零）
 *
 * - **颜色**：只用宿主主题 token（`--dsw-alias-*`），不写死色值——
 *   插件渲染在宿主 UI 内，用宿主 token 才能跟随深浅色切换。
 *   全站唯一允许的语义着色是 warn / success / error 三个宿主语义色。
 * - **尺寸**：字阶 5 档（12/14/16/20/24）、间距 6 档（4 的倍数）、
 *   圆角 4 档（0/6/8/12）在 `.dmo-root` 上本地定义。
 *   数值来自 docs/product.md §六 的既有设计系统，不是本次发明。
 *
 * ## 形状节奏（方向卡 §四）
 *
 * 条目行与状态签圆角为 0（行不是卡片）；控件 6；容器 8；浮层 12。
 * brand 实底全屏最多 1 处（当前页唯一主动作）。
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

  display: flex; flex-direction: column; height: 100%; min-height: 0;
  font-size: var(--t4); line-height: var(--t4-lh);
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base);
}
.dmo-root *, .dmo-root *::before, .dmo-root *::after { box-sizing: border-box; }
.dmo-root button, .dmo-root input, .dmo-root textarea { font: inherit; color: inherit; }

/* ============ 面板外壳 ============ */
.dmo-head { flex: 0 0 auto; padding: var(--s3) var(--s3) 0; overflow: hidden; }
.dmo-head-row { display: flex; align-items: baseline; gap: var(--s2); margin-bottom: var(--s3); }
.dmo-app-name {
  font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600;
  letter-spacing: 0.02em; margin: 0;
}
.dmo-scope {
  font-family: var(--mono); font-size: var(--t5); line-height: var(--t5-lh);
  color: var(--dsw-alias-label-secondary); margin-left: auto;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 55%;
}

/* 一级导航：文字签，选中用加粗 + 下划线（不用 brand 实底） */
.dmo-nav {
  display: flex; gap: var(--s1);
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  margin: 0 calc(var(--s3) * -1); padding: 0 var(--s3);
  overflow-x: auto; scrollbar-width: none;
}
.dmo-nav::-webkit-scrollbar { display: none; }
.dmo-nav-item {
  appearance: none; border: 0; background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: var(--t4); line-height: var(--t4-lh);
  padding: var(--s2) var(--s2) var(--s1);
  border-bottom: 2px solid transparent; border-radius: 0;
  cursor: pointer; white-space: nowrap;
  transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.dmo-nav-item:hover { color: var(--dsw-alias-label-primary); }
.dmo-nav-item:active { color: var(--dsw-alias-label-primary); }
.dmo-nav-item:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; border-radius: var(--r-control); }
.dmo-nav-item[aria-selected="true"] {
  color: var(--dsw-alias-label-primary); font-weight: 600;
  border-bottom-color: var(--dsw-alias-label-primary);
}
.dmo-nav-count {
  font-family: var(--mono); font-size: var(--t5); font-weight: 400;
  color: var(--dsw-alias-label-secondary); margin-left: var(--s1);
}

.dmo-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: var(--s3); }

/* ============ 排版原语 ============ */
/* 一句话结论：全屏唯一 T1 */
.dmo-lede {
  font-size: var(--t1); line-height: var(--t1-lh); font-weight: 600;
  letter-spacing: -0.01em; margin: 0 0 var(--s1); word-break: break-word;
}
.dmo-lede-sub {
  font-size: var(--t4); line-height: var(--t4-lh);
  color: var(--dsw-alias-label-secondary); margin: 0 0 var(--s4);
}
/* 页面名：T3。T1 只给导语句，导航词不再占用 24px 槽位 */
.dmo-page-name {
  font-size: var(--t3); line-height: var(--t3-lh); font-weight: 600;
  letter-spacing: 0.01em; margin: 0 0 var(--s2);
}

.dmo-section-head {
  display: flex; align-items: baseline; gap: var(--s2);
  margin: var(--s5) 0 var(--s2); padding-top: var(--s3); padding-bottom: var(--s1);
  border-top: 1px solid var(--dsw-alias-border-l1);
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.dmo-section-title { font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; letter-spacing: 0.02em; margin: 0; }
.dmo-section-count { font-family: var(--mono); font-size: var(--t5); color: var(--dsw-alias-label-secondary); }

/* 元信息：等宽 + 次要色（第二字体身份） */
.dmo-meta {
  font-family: var(--mono); font-size: var(--t5); line-height: var(--t5-lh);
  color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums;
}
.dmo-meta-row { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--s1) var(--s3); margin-top: var(--s1); }
.dmo-note { font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-label-secondary); margin: var(--s2) 0 0; }

/* ============ 状态签：圆角 0，靠文字不靠颜色 ============ */
.dmo-tag {
  display: inline-block; font-family: var(--mono);
  font-size: var(--t5); line-height: var(--t5-lh);
  padding: 0 var(--s1); border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--r-row); color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
}
.dmo-tag[data-tone="warn"] { border-color: var(--dsw-alias-state-warn-primary); color: var(--dsw-alias-state-warn-primary); }
.dmo-tag[data-tone="ok"] { border-color: var(--dsw-alias-state-success-primary); color: var(--dsw-alias-state-success-primary); }
.dmo-tag[data-tone="err"] { border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); }
.dmo-tag[data-tone="live"] { border-color: var(--dsw-alias-label-primary); color: var(--dsw-alias-label-primary); }

/* ============ 唯一建议卡：全屏只有 1 张容器，圆角 8 ============ */
.dmo-suggest {
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--r-container);
  padding: var(--s3); background: transparent;
}
.dmo-suggest-label {
  font-family: var(--mono); font-size: var(--t5); line-height: var(--t5-lh);
  color: var(--dsw-alias-label-secondary); margin: 0 0 var(--s1);
}
.dmo-suggest-title { font-size: var(--t3); line-height: var(--t3-lh); font-weight: 600; margin: 0 0 var(--s2); word-break: break-word; }
.dmo-suggest-body { font-size: var(--t4); line-height: var(--t4-lh); margin: 0 0 var(--s3); word-break: break-word; }
.dmo-suggest-actions { display: flex; align-items: center; gap: var(--s2); flex-wrap: wrap; }

/* ============ 按钮：一行最多 1 主按钮 ============ */
.dmo-btn {
  appearance: none; border: 1px solid var(--dsw-alias-border-l2);
  background: transparent; color: var(--dsw-alias-label-primary);
  border-radius: var(--r-control); padding: var(--s1) var(--s3);
  font-size: var(--t4); line-height: var(--t4-lh); cursor: pointer;
  transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease), filter var(--dur) var(--ease);
}
.dmo-btn:hover:not(:disabled):not(.dmo-btn-primary) { background: var(--dsw-alias-bg-layer-2); }
.dmo-btn:active:not(:disabled):not(.btn-primary) { background: var(--dsw-alias-bg-layer-2); }
.dmo-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
.dmo-btn:disabled { opacity: 0.42; cursor: not-allowed; }
/* 主按钮：每屏唯一 brand 实底。按下压暗而不是变浅（浅底会吃掉字色） */
.dmo-btn-primary {
  background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-bg-base); font-weight: 600;
}
.dmo-btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
.dmo-btn-primary:active:not(:disabled) { filter: brightness(0.92); }
.dmo-btn-sm { padding: 0 var(--s2); font-size: var(--t5); line-height: var(--t5-lh); }

.dmo-textlink {
  appearance: none; border: 0; background: none; padding: 0;
  color: var(--dsw-alias-label-secondary);
  font-size: var(--t5); line-height: var(--t5-lh); cursor: pointer;
  text-decoration: underline; text-underline-offset: 2px;
  text-decoration-color: var(--dsw-alias-border-l2);
  transition: color var(--dur) var(--ease), text-decoration-color var(--dur) var(--ease);
}
.dmo-textlink:hover { color: var(--dsw-alias-label-primary); text-decoration-color: currentColor; }
.dmo-textlink:active { color: var(--dsw-alias-label-primary); text-decoration-color: currentColor; }
.dmo-textlink:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; border-radius: var(--r-control); }

/* ============ 输入与捕获 ============ */
.dmo-capture {
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--r-container);
  background: var(--dsw-alias-bg-base); padding: var(--s2);
  transition: border-color var(--dur) var(--ease);
}
.dmo-capture:hover { border-color: var(--dsw-alias-border-l2); }
.dmo-capture:active { border-color: var(--dsw-alias-label-secondary); }
/* focus 优先级最高：三者特异性相同，后写胜出 */
.dmo-capture:focus-within { border-color: var(--dsw-alias-label-primary); }
.dmo-capture-input {
  width: 100%; border: 0; background: transparent; resize: vertical;
  min-height: 44px; font-size: var(--t4); line-height: var(--t4-lh);
  padding: var(--s1); outline: none; border-radius: var(--r-control);
  transition: background var(--dur) var(--ease);
}
.dmo-capture-input::placeholder { color: var(--dsw-alias-label-secondary); }
.dmo-capture-input:focus-visible { background: var(--dsw-alias-bg-layer-1); }
.dmo-capture-foot { display: flex; align-items: center; gap: var(--s2); padding: var(--s1) var(--s1) 0; }
.dmo-capture-hint { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); }

.dmo-input {
  width: 100%; border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--r-control); background: var(--dsw-alias-bg-base);
  padding: var(--s1) var(--s2); font-size: var(--t4); line-height: var(--t4-lh);
  transition: border-color var(--dur) var(--ease), background var(--dur) var(--ease);
}
.dmo-input:hover { border-color: var(--dsw-alias-label-secondary); }
.dmo-input:active { background: var(--dsw-alias-bg-layer-1); }
.dmo-input:focus { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -1px; border-color: var(--dsw-alias-brand-primary); }

.dmo-toolbar { display: flex; gap: var(--s2); margin: var(--s3) 0; }
.dmo-toolbar > .dmo-input { flex: 1 1 auto; min-width: 0; }

/* 类型/筛选签：文字签，active 用边框加深而不是 brand 实底 */
.dmo-kindrow { display: flex; flex-wrap: wrap; gap: var(--s1); margin-bottom: var(--s2); }
.dmo-kindbtn {
  appearance: none; border: 1px solid var(--dsw-alias-border-l2);
  background: transparent; color: var(--dsw-alias-label-secondary);
  border-radius: var(--r-control); padding: 0 var(--s2);
  font-size: var(--t5); line-height: var(--t5-lh); cursor: pointer;
  transition: background var(--dur) var(--ease), color var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.dmo-kindbtn:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.dmo-kindbtn:active { background: var(--dsw-alias-bg-layer-2); border-color: var(--dsw-alias-label-primary); }
.dmo-kindbtn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
.dmo-kindbtn[aria-pressed="true"] { border-color: var(--dsw-alias-label-primary); color: var(--dsw-alias-label-primary); font-weight: 600; }

/* ============ 台账行：不是卡片。圆角 0 + hairline ============ */
.dmo-list { list-style: none; margin: 0; padding: 0; }
.dmo-row { padding: var(--s2) 0; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dmo-row:last-child { border-bottom: 0; }
.dmo-list-clickable .dmo-row {
  margin: 0 calc(var(--s2) * -1); padding-left: var(--s2); padding-right: var(--s2);
  border-radius: var(--r-row);
  transition: background var(--dur) var(--ease);
}
.dmo-list-clickable .dmo-row:hover { background: var(--dsw-alias-bg-layer-1); }
.dmo-row-title { font-size: var(--t4); line-height: var(--t4-lh); margin: 0; word-break: break-word; }
.dmo-row-button {
  appearance: none; border: 0; background: none; padding: 0; text-align: left;
  width: 100%; color: inherit; cursor: pointer;
  font-size: var(--t4); line-height: var(--t4-lh); word-break: break-word;
}
.dmo-row-button:hover { text-decoration: underline; text-underline-offset: 2px; }
.dmo-row-button:active { text-decoration: underline; text-underline-offset: 2px; }
.dmo-row-button:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; border-radius: var(--r-control); }
.dmo-row-actions { display: flex; align-items: center; gap: var(--s2); margin-top: var(--s2); flex-wrap: wrap; }

/* ============ 四态 ============ */
.dmo-skeleton {
  background: var(--dsw-alias-bg-layer-1); border-radius: var(--r-control);
  animation: dmo-breathe 1.2s ease-in-out infinite; margin-bottom: var(--s2);
}
@keyframes dmo-breathe { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

.dmo-empty { padding: var(--s5) var(--s3); text-align: center; }
.dmo-empty-title { font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; margin: 0 0 var(--s1); }
.dmo-empty-body { font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-label-secondary); margin: 0 0 var(--s4); }
.dmo-empty-actions { display: flex; gap: var(--s2); justify-content: center; flex-wrap: wrap; }

/* 错误态：说清怎么解决，不只报告「出错」 */
.dmo-alert { border: 1px solid var(--dsw-alias-state-error-primary); border-radius: var(--r-container); padding: var(--s3); }
.dmo-alert-title { font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; color: var(--dsw-alias-state-error-primary); margin: 0 0 var(--s1); }
.dmo-alert-body { font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-label-secondary); margin: 0 0 var(--s3); }
.dmo-alert-actions { display: flex; gap: var(--s2); flex-wrap: wrap; }

/* 提示条：整块浅底 + 文字，不用左侧彩边 */
.dmo-notice {
  border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--r-container);
  background: var(--dsw-alias-bg-layer-1); padding: var(--s2) var(--s3); margin-bottom: var(--s3);
}
.dmo-notice-title { font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; margin: 0 0 var(--s1); }
.dmo-notice-text { font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-label-secondary); margin: 0; }
.dmo-notice[data-tone="warn"] { border-color: var(--dsw-alias-state-warn-primary); }
.dmo-notice[data-tone="warn"] .dmo-notice-title { color: var(--dsw-alias-state-warn-primary); }
.dmo-notice[data-tone="err"] { border-color: var(--dsw-alias-state-error-primary); }
.dmo-notice[data-tone="err"] .dmo-notice-title { color: var(--dsw-alias-state-error-primary); }

/* 就地反馈：不盖住内容。文本继承容器色，成功/错误色才真的可见 */
.dmo-inline-done {
  display: flex; align-items: center; gap: var(--s2); flex-wrap: wrap;
  font-size: var(--t4); line-height: var(--t4-lh);
  padding: var(--s2) 0; border-top: 1px solid var(--dsw-alias-border-l1);
  margin-top: var(--s2); animation: dmo-fade var(--dur) var(--ease);
}
@keyframes dmo-fade { from { opacity: 0; } to { opacity: 1; } }
.dmo-inline-done[data-tone="ok"] { color: var(--dsw-alias-state-success-primary); }
.dmo-inline-done[data-tone="err"] { color: var(--dsw-alias-state-error-primary); }
.dmo-inline-done-text { color: inherit; }

/* ============ 今日页：线索（行内，非网格） ============ */
.dmo-trail { display: flex; flex-direction: column; margin-top: var(--s1); }
.dmo-trail-line {
  display: flex; align-items: baseline; gap: var(--s2);
  padding: var(--s2) 0; border-bottom: 1px solid var(--dsw-alias-border-l1);
  text-align: left; appearance: none; background: transparent;
  border-left: 0; border-right: 0; border-top: 0; width: 100%;
  cursor: pointer; color: var(--dsw-alias-label-primary);
  transition: background var(--dur) var(--ease);
}
.dmo-trail-line:last-child { border-bottom: 0; }
.dmo-trail-line:hover { background: var(--dsw-alias-bg-layer-1); }
.dmo-trail-line:active { background: var(--dsw-alias-bg-layer-2); }
.dmo-trail-line:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; border-radius: var(--r-control); }
.dmo-trail-num {
  font-family: var(--mono); font-size: var(--t4); line-height: var(--t4-lh);
  font-weight: 600; font-variant-numeric: tabular-nums;
  flex: 0 0 auto; min-width: 2.5em;
}
.dmo-trail-text { font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-label-secondary); }

/* ============ 详情 ============ */
.dmo-back { margin-bottom: var(--s3); }
.dmo-detail-title { font-size: var(--t3); line-height: var(--t3-lh); font-weight: 600; margin: 0 0 var(--s1); word-break: break-word; }
.dmo-evidence {
  border-left: 1px solid var(--dsw-alias-border-l2); padding-left: var(--s2);
  margin: var(--s2) 0; font-size: var(--t4); line-height: var(--t4-lh);
  color: var(--dsw-alias-label-primary);
}
.dmo-body-block {
  font-size: var(--t4); line-height: var(--t4-lh); white-space: pre-wrap;
  word-break: break-word; margin: var(--s2) 0; max-height: 220px; overflow-y: auto;
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
.dmo-more > summary:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; border-radius: var(--r-control); }
.dmo-more-body { padding-top: var(--s2); display: flex; flex-direction: column; gap: var(--s2); }

/* ============ 成本两行（库健康） ============ */
.dmo-cost { border-top: 1px solid var(--dsw-alias-border-l1); padding-top: var(--s3); margin-bottom: var(--s3); }
.dmo-cost-row { display: flex; align-items: baseline; gap: var(--s2); padding: var(--s1) 0; }
.dmo-cost-name { font-size: var(--t4); line-height: var(--t4-lh); }
.dmo-cost-num {
  margin-left: auto; font-family: var(--mono); font-size: var(--t3); line-height: var(--t3-lh);
  font-weight: 600; font-variant-numeric: tabular-nums;
}
.dmo-cost-note { font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-label-secondary); margin: var(--s1) 0 0; }
.dmo-jobs { display: flex; flex-wrap: wrap; gap: var(--s1); margin-top: var(--s2); }

/* ============ 骨架与杂项 ============ */
.dmo-degrade {
  border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--r-container);
  background: var(--dsw-alias-bg-layer-1); padding: var(--s2) var(--s3); margin-bottom: var(--s3);
}
.dmo-error {
  border: 1px solid var(--dsw-alias-state-error-primary); border-radius: var(--r-container);
  padding: var(--s3); font-size: var(--t4); line-height: var(--t4-lh);
  color: var(--dsw-alias-state-error-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent);
}
.dmo-row-sub { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); margin-top: var(--s1); }
.dmo-row-item { display: flex; gap: var(--s2); align-items: flex-start; padding: var(--s2) 0; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dmo-row-item:last-child { border-bottom: 0; }
.dmo-row-main { flex: 1 1 auto; min-width: 0; }
.dmo-row-text { font-size: var(--t4); line-height: var(--t4-lh); word-break: break-word; }
.dmo-check { flex: 0 0 auto; margin-top: 3px; accent-color: var(--dsw-alias-brand-primary); }
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
  background: var(--dsw-alias-bg-overlay, var(--dsw-alias-bg-layer-1));
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--r-overlay);
  padding: var(--s4);
  box-shadow: var(--dsw-shadow-lv3, 0 12px 32px rgba(0, 0, 0, 0.4));
}
.dmo-overlay-title { font-size: var(--t3); line-height: var(--t3-lh); font-weight: 600; margin: 0 0 var(--s2); }
.dmo-overlay-body { font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-label-secondary); margin: 0 0 var(--s3); }
.dmo-overlay-actions { display: flex; gap: var(--s2); justify-content: flex-end; }

/* ============ 旧表面（会话 tab / 右侧捕获 / remember）沿用 ============ */
.dmo-session { padding: var(--s3); display: flex; flex-direction: column; gap: var(--s2); }
.dmo-session-kpis { display: flex; gap: var(--s2); }
.dmo-session-kpi {
  flex: 1 1 0; border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--r-container);
  padding: var(--s2); text-align: center; background: var(--dsw-alias-bg-layer-1);
}
.dmo-session-kpi b { display: block; font-size: var(--t3); font-variant-numeric: tabular-nums; }
.dmo-session-kpi span { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); }
.dmo-capture-pane { display: flex; flex-direction: column; gap: var(--s2); padding: var(--s3); }
.dmo-types { display: flex; flex-wrap: wrap; gap: var(--s1); }
.dmo-recent-row { display: flex; align-items: baseline; gap: var(--s2); padding: var(--s1) 0; border-bottom: 1px solid var(--dsw-alias-border-l1); font-size: var(--t5); line-height: var(--t5-lh); }
.dmo-recent-row:last-child { border-bottom: 0; }
.dmo-recent-main { flex: 1 1 auto; min-width: 0; word-break: break-word; }
.dmo-recent-time { flex: 0 0 auto; font-size: var(--t5); color: var(--dsw-alias-label-secondary); }
.dmo-toast { font-size: var(--t4); line-height: var(--t4-lh); padding: var(--s2) var(--s2); border-radius: var(--r-control); }
.dmo-toast-ok { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent); color: var(--dsw-alias-state-success-primary); }
.dmo-toast-err { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 14%, transparent); color: var(--dsw-alias-state-error-primary); }
.dmo-lane-head { display: flex; align-items: center; gap: var(--s2); font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; margin-bottom: var(--s1); }
.dmo-lane-count { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); font-weight: 400; }
.dmo-budget { border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--r-container); padding: var(--s2) var(--s3); margin-bottom: var(--s3); background: var(--dsw-alias-bg-layer-1); }
.dmo-budget-row { display: flex; align-items: center; gap: var(--s2); padding: var(--s1) 0; font-size: var(--t5); line-height: var(--t5-lh); }
.dmo-budget-name { flex: 0 0 58px; color: var(--dsw-alias-label-secondary); }
.dmo-budget-bar { flex: 1 1 auto; height: 5px; border-radius: 3px; background: var(--dsw-alias-bg-layer-2); overflow: hidden; }
.dmo-budget-fill { height: 100%; border-radius: 3px; background: var(--dsw-alias-label-secondary); }
.dmo-budget-fill-over { background: var(--dsw-alias-state-warn-primary); }
.dmo-budget-num { flex: 0 0 auto; font-family: var(--mono); font-variant-numeric: tabular-nums; font-weight: 600; }
.dmo-budget-item { padding: var(--s2) 0; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dmo-budget-item:last-child { border-bottom: 0; padding-bottom: 0; }
.dmo-budget-head { display: flex; align-items: center; gap: var(--s2); flex-wrap: wrap; margin-bottom: var(--s1); }
.dmo-badge {
  display: inline-flex; align-items: center; gap: 3px; padding: 1px var(--s2);
  border-radius: var(--r-control); font-size: var(--t5); font-weight: 600;
  line-height: var(--t5-lh); white-space: nowrap;
}
.dmo-badge-ok { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 18%, transparent); color: var(--dsw-alias-state-success-primary); }
.dmo-badge-warn { background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 20%, transparent); color: var(--dsw-alias-state-warn-primary); }
.dmo-badge-err { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 18%, transparent); color: var(--dsw-alias-state-error-primary); }
.dmo-badge-idle { background: color-mix(in srgb, var(--dsw-alias-border-l2) 40%, transparent); color: var(--dsw-alias-label-secondary); }
.dmo-stepper { display: flex; align-items: center; gap: 3px; margin: var(--s2) 0; }
.dmo-step { flex: 1 1 0; height: 4px; border-radius: 2px; background: var(--dsw-alias-bg-layer-2); }
.dmo-step-on { background: var(--dsw-alias-state-success-primary); }
.dmo-step-now { background: var(--dsw-alias-label-primary); }
.dmo-evidence-src { color: var(--dsw-alias-label-secondary); font-size: var(--t5); line-height: var(--t5-lh); }
.dmo-anchor-note {
  display: flex; gap: var(--s2); align-items: flex-start;
  padding: var(--s2) var(--s3); border-radius: var(--r-control);
  font-size: var(--t4); line-height: var(--t4-lh); margin: var(--s2) 0;
}
.dmo-anchor-note[data-state="stale"] {
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent);
  border-left: 3px solid var(--dsw-alias-state-warn-primary);
}
.dmo-anchor-note[data-state="fresh"] {
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 9%, transparent);
  border-left: 3px solid var(--dsw-alias-state-success-primary);
}
.dmo-anchor-note code, .dmo-mono { font-family: var(--mono); font-size: var(--t5); }
.dmo-resident-row { display: flex; gap: var(--s2); align-items: flex-start; padding: var(--s1) 0 var(--s1) var(--s2); border-left: 2px solid var(--dsw-alias-border-l1); }
.dmo-resident-main { flex: 1 1 auto; min-width: 0; }
.dmo-row-text-link { color: var(--dsw-alias-label-primary); cursor: pointer; }
.dmo-row-text-link:hover { text-decoration: underline; text-underline-offset: 2px; }
.dmo-link { color: var(--dsw-alias-label-primary); cursor: pointer; }
.dmo-link:hover { text-decoration: underline; text-underline-offset: 2px; }
.dmo-bulk {
  display: flex; align-items: center; gap: var(--s2); flex-wrap: wrap;
  padding: var(--s2) var(--s3); margin-bottom: var(--s2); border-radius: var(--r-control);
  background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l2);
}
.dmo-chips { display: flex; flex-wrap: wrap; gap: var(--s1); margin-bottom: var(--s2); }
.dmo-chip {
  appearance: none; border: 1px solid var(--dsw-alias-border-l2);
  background: transparent; color: var(--dsw-alias-label-secondary);
  border-radius: var(--r-control); padding: 0 var(--s2);
  font: inherit; font-size: var(--t5); line-height: var(--t5-lh);
  cursor: pointer; display: inline-flex; align-items: center; gap: var(--s1);
}
.dmo-chip:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.dmo-chip[aria-pressed="true"] { border-color: var(--dsw-alias-label-primary); color: var(--dsw-alias-label-primary); font-weight: 600; }
.dmo-chip:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
.dmo-chip-num { font-family: var(--mono); font-variant-numeric: tabular-nums; opacity: 0.8; }
.dmo-band { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--s1); margin-bottom: var(--s2); }
.dmo-band-cell { border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--r-control); padding: var(--s2) var(--s1); text-align: center; background: var(--dsw-alias-bg-layer-1); min-width: 0; }
.dmo-band-cell[data-active="true"] { border-color: var(--dsw-alias-label-primary); }
.dmo-band-v { font-size: var(--t3); line-height: var(--t3-lh); font-weight: 600; font-variant-numeric: tabular-nums; font-family: var(--mono); }
.dmo-band-l { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dmo-band-cell[data-tone="warn"] .dmo-band-v { color: var(--dsw-alias-state-warn-primary); }
.dmo-band-cell[data-tone="ok"] .dmo-band-v { color: var(--dsw-alias-state-success-primary); }
.dmo-group { margin-bottom: var(--s3); }
.dmo-group-head { display: flex; align-items: center; gap: var(--s2); margin-bottom: var(--s1); }
.dmo-group-title { font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; margin: 0; }
.dmo-group-count { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); font-weight: 400; }
.dmo-degrade-old {
  border-left: 3px solid var(--dsw-alias-state-warn-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent);
  padding: var(--s2) var(--s3); border-radius: var(--r-control);
  font-size: var(--t4); line-height: var(--t4-lh); margin-bottom: var(--s2);
}
.dmo-skeleton-old {
  height: 52px; border-radius: var(--r-control); margin-bottom: var(--s2);
  background: linear-gradient(90deg, var(--dsw-alias-bg-layer-1) 25%, var(--dsw-alias-bg-layer-2) 37%, var(--dsw-alias-bg-layer-1) 63%);
  background-size: 400% 100%; animation: dmo-shimmer-old 1.3s ease-in-out infinite;
}
@keyframes dmo-shimmer-old { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
.dmo-skeleton-old, .dmo-skeleton { will-change: opacity; }
.dmo-error-old { border: 1px solid var(--dsw-alias-state-error-primary); border-radius: var(--r-container); padding: var(--s2) var(--s3); font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-state-error-primary); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent); }
.dmo-capture-inline { margin-bottom: var(--s2); }
.dmo-capture-inline .dmo-textarea { min-height: 46px; }
.dmo-textarea {
  width: 100%; font: inherit; font-size: var(--t4); line-height: var(--t4-lh);
  color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--r-control);
  padding: var(--s1) var(--s2); min-height: 70px; resize: vertical;
  font-family: var(--mono);
}
.dmo-textarea:focus { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -1px; border-color: var(--dsw-alias-brand-primary); }
.dmo-label { display: block; font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); margin-bottom: var(--s1); }
.dmo-select {
  width: 100%; font: inherit; font-size: var(--t4); line-height: var(--t4-lh);
  color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--r-control);
  padding: var(--s1) var(--s2);
}
.dmo-select:focus { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -1px; border-color: var(--dsw-alias-brand-primary); }
.dmo-toolbar > .dmo-select { width: auto; flex: 0 0 auto; }
.dmo-toolbar > .dmo-input { flex: 1 1 auto; min-width: 0; }
.dmo-field { margin-bottom: var(--s2); }
.dmo-row { display: flex; gap: var(--s2); align-items: center; }
.dmo-row > * { min-width: 0; }
.dmo-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(84px, 1fr)); gap: var(--s2); margin-bottom: var(--s3); }
.dmo-kpi { border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--r-container); padding: var(--s2) var(--s2); background: var(--dsw-alias-bg-layer-1); min-width: 0; }
.dmo-kpi-label { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dmo-kpi-value { font-family: var(--mono); font-size: var(--t3); line-height: var(--t3-lh); font-weight: 600; font-variant-numeric: tabular-nums; margin-top: 1px; }
.dmo-kpi-note { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); }
.dmo-kpi-btn { appearance: none; text-align: left; cursor: pointer; font: inherit; color: inherit; }
.dmo-kpi-btn:hover { border-color: var(--dsw-alias-border-l2); }
.dmo-kpi-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
.dmo-kpi-more { float: right; font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-brand-primary); font-weight: 600; }
.dmo-resident-group { margin: var(--s2) 0; }
.dmo-resident-head { display: flex; align-items: center; gap: var(--s2); margin-bottom: 3px; }
.dmo-card { border: 1px solid var(--dsw-alias-border-l1); border-radius: var(--r-container); padding: var(--s2) var(--s3); margin-bottom: var(--s2); background: var(--dsw-alias-bg-layer-1); }
.dmo-card-title { font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; word-break: break-word; }
.dmo-card-meta { display: flex; flex-wrap: wrap; gap: var(--s2); align-items: center; margin-top: var(--s1); font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); }
.dmo-card-body { margin-top: var(--s2); font-size: var(--t4); line-height: var(--t4-lh); color: var(--dsw-alias-label-secondary); white-space: pre-wrap; word-break: break-word; }
.dmo-card-actions { display: flex; flex-wrap: wrap; gap: var(--s2); margin-top: var(--s2); }
.dmo-lane { margin-bottom: var(--s2); }
.dmo-types { display: flex; flex-wrap: wrap; gap: var(--s1); }
.dmo-recent-wrap { margin-top: var(--s3); }
.dmo-recent-head { display: flex; align-items: center; gap: var(--s2); margin-bottom: var(--s1); }
.dmo-recent-title { font-size: var(--t4); line-height: var(--t4-lh); font-weight: 600; margin: 0; }
.dmo-recent-count { font-size: var(--t5); line-height: var(--t5-lh); color: var(--dsw-alias-label-secondary); }
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
