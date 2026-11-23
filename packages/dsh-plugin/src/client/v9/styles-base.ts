/**
 * v9 样式 · 外壳与骨架（design/brief.md §零 / §二 / §四 / §六 / §七）
 *
 * 规则来源是 `prototype/app.css`（v9 原型，实测画布 1614×900）。
 * 移植时的三处**有意偏离**：
 *
 *   1. 原型里 `html, body` 的全局规则不搬——插件住在宿主页面里，
 *      写 `body { background }` 会改掉宿主的整页底色。
 *   2. 类名统一加 `mo-` 前缀。原型的 `.lede` / `.field` / `.tab` 这类
 *      泛化类名在宿主里没有作用域，必撞宿主自己的样式表。
 *   3. 画布宽度不写死 1614：宿主主区宽度就是内容区宽度，用 1fr 承接；
 *      212 / 360 两栏与 24 的列间距照抄（brief §零 实测值）。
 *
 * 令牌：只允许 `--dsw-alias-*` / `--dsw-specific-*` 与 `color-mix` 派生。
 * 尺寸档位在 `.mo-app` 上本地声明（宿主不提供这一套版式变量）。
 *
 * ⚠️ 本文件是模板字符串，注释里不能出现反引号。
 */

export const BASE_CSS = `
.mo-app {
  /* 版式档位（brief §三 / §四） */
  --mo-t0: 44px; --mo-t0-lh: 48px;
  --mo-t1: 28px; --mo-t1-lh: 36px;
  --mo-t2: 18px; --mo-t2-lh: 26px;
  --mo-t3: 14px; --mo-t3-lh: 22px;
  --mo-t3-lh-loose: 24px;
  --mo-t4: 12px; --mo-t4-lh: 18px;

  --mo-s1: 4px; --mo-s2: 8px; --mo-s3: 12px;
  --mo-s4: 16px; --mo-s5: 24px; --mo-s6: 32px;

  --mo-r-flat: 0;
  --mo-r-control: 6px;
  --mo-r-overlay: 10px;

  --mo-w-rail: 212px;
  --mo-w-insp: 360px;
  --mo-h-topbar: 72px;
  --mo-h-status: 28px;
  --mo-h-band: 72px;
  --mo-h-band-folded: 28px;
  --mo-w-prose: 720px;

  --mo-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --mo-ease: cubic-bezier(0.2, 0, 0, 1);
  --mo-dur-state: 120ms;
  --mo-dur-insp: 180ms;

  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: var(--mo-h-topbar) minmax(0, 1fr) var(--mo-h-status);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-family: -apple-system, "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif;
  font-size: var(--mo-t3);
  line-height: var(--mo-t3-lh);
  -webkit-font-smoothing: antialiased;
  line-break: strict;
  overflow: hidden;
}
.mo-app *,
.mo-app *::before,
.mo-app *::after { box-sizing: border-box; }
/*
 * 控件继承字色 —— 用 :where() 把特异性压到 0。
 *
 * 早先写成 ".mo-app button { color: inherit }"（特异性 0,1,1），
 * 它压过了后面 .mo-btn-ink 的 color（0,1,0），结果墨块按钮变成
 * 「黑底黑字」——按钮在那儿，字看不见。截图才发现的。
 *
 * ⚠️ 这段注释里不许出现反引号：本文件整体是模板字符串，一个反引号
 * 会把字符串提前闭合，后面的 CSS 全变成代码。
 */
.mo-app :where(button, input, textarea, select) { font: inherit; color: inherit; }

.mo-num {
  font-family: var(--mo-mono);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* ---------- 顶条（72）：品牌 + 分区名 | 判定句 | T0 读数 + 单位 ---------- */
.mo-topbar {
  display: grid;
  grid-template-columns: var(--mo-w-rail) minmax(0, 1fr) auto;
  align-items: center;
  column-gap: var(--mo-s5);
  padding: 0 var(--mo-s5);
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.mo-brand { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.mo-brand-name {
  font-size: var(--mo-t3);
  line-height: var(--mo-t3-lh);
  font-weight: 600;
  letter-spacing: 0;
}
.mo-brand-scope {
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mo-lede {
  margin: 0;
  min-width: 0;
  font-size: var(--mo-t3);
  line-height: var(--mo-t3-lh-loose);
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mo-readout { display: flex; align-items: baseline; gap: var(--mo-s2); }
.mo-t0 {
  font-size: var(--mo-t0);
  line-height: var(--mo-t0-lh);
  font-weight: 600;
  letter-spacing: -0.02em;
  font-family: var(--mo-mono);
  font-variant-numeric: tabular-nums;
}
.mo-unit {
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
}

/* ---------- 工作区三栏：212 / 1fr / 360，列间距 24 ---------- */
.mo-workarea {
  display: grid;
  grid-template-columns: var(--mo-w-rail) minmax(0, 1fr) var(--mo-w-insp);
  column-gap: var(--mo-s5);
  padding: 0 var(--mo-s5);
  min-height: 0;
}

/* ---------- 左轨：tablist + 计数 ---------- */
.mo-rail {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: color-mix(in srgb, var(--dsw-alias-bg-base) 94%, var(--dsw-alias-label-primary) 6%);
  border-right: 1px solid var(--dsw-alias-border-l3);
  padding: var(--mo-s4) 0 var(--mo-s3);
}
.mo-rail-list { list-style: none; margin: 0; padding: 0; }
.mo-tab {
  position: relative;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  column-gap: var(--mo-s2);
  width: 100%;
  min-height: 44px;
  padding: 0 var(--mo-s4);
  border: 0;
  background: none;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--mo-dur-state) var(--mo-ease), color var(--mo-dur-state) var(--mo-ease);
}
.mo-tab-idx {
  font-family: var(--mo-mono);
  font-size: var(--mo-t4);
  color: var(--dsw-alias-label-tertiary);
}
.mo-tab-label { font-size: var(--mo-t3); }
.mo-tab-count {
  font-family: var(--mo-mono);
  font-size: var(--mo-t4);
  color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
}
.mo-tab[aria-selected="true"] {
  color: var(--dsw-alias-label-primary);
  font-weight: 600;
}
.mo-tab[aria-selected="true"]::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--dsw-alias-state-business-primary);
}
.mo-tab[aria-selected="true"] .mo-tab-idx { color: var(--dsw-alias-label-secondary); }

/* ---------- 中栏：上带「每请求都在」+ 回执条 + 清单 ---------- */
.mo-center {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
.mo-center:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: -1px;
}
.mo-band {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  column-gap: var(--mo-s3);
  height: var(--mo-h-band);
  padding: 0 var(--mo-s4);
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
.mo-band::before {
  content: "";
  position: absolute;
  left: 0;
  top: var(--mo-s3);
  bottom: var(--mo-s3);
  width: 2px;
  background: var(--dsw-alias-state-business-primary);
}
.mo-band[data-folded="true"] { height: var(--mo-h-band-folded); }
.mo-band[data-folded="true"] .mo-band-note,
.mo-band[data-folded="true"] .mo-band-figure-unit { display: none; }
.mo-band-tag {
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  letter-spacing: 0.08em;
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
}
.mo-band-note {
  min-width: 0;
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mo-band-figure { display: flex; align-items: baseline; gap: var(--mo-s1); }
.mo-band-figure .mo-value {
  font-family: var(--mo-mono);
  font-variant-numeric: tabular-nums;
  font-size: var(--mo-t2);
  line-height: var(--mo-t2-lh);
  font-weight: 600;
}
.mo-band-figure-unit {
  font-size: var(--mo-t4);
  color: var(--dsw-alias-label-secondary);
}
.mo-pane {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: var(--mo-s4) 0;
}
/* 写操作回执：任何分区的回执都落在同一条带上，撤销按钮不会因为换了分区就消失。 */
.mo-notice-bar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: var(--mo-s2);
  padding: var(--mo-s2) var(--mo-s4);
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
}
.mo-notice-bar[data-tone="err"] { border-bottom-color: var(--dsw-alias-state-error-primary); }
.mo-pane-inner { padding-right: var(--mo-s4); }

/* ---------- 清单行：标题 / 归属 / 数字 / 状态 + 元信息独立行 ---------- */
.mo-rows { list-style: none; margin: 0; padding: 0; }
.mo-row-item { margin: 0; }
.mo-row-button {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 200px 96px 88px;
  grid-template-areas:
    "title src num state"
    "meta  meta meta meta";
  align-items: baseline;
  column-gap: var(--mo-s4);
  row-gap: 2px;
  width: 100%;
  min-height: 44px;
  padding: var(--mo-s2) var(--mo-s3) var(--mo-s2) var(--mo-s4);
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--mo-dur-state) var(--mo-ease);
}
.mo-row-button[aria-current="true"] { background: var(--dsw-alias-card-fill-hover); }
.mo-row-title {
  grid-area: title;
  max-width: var(--mo-w-prose);
  font-size: var(--mo-t3);
  line-height: var(--mo-t3-lh);
  color: var(--dsw-alias-label-primary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.mo-row-title[data-dense="true"] { -webkit-line-clamp: 1; }
.mo-row-col {
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mo-row-col-src { grid-area: src; }
.mo-row-col-num {
  grid-area: num;
  text-align: right;
  font-family: var(--mo-mono);
  font-variant-numeric: tabular-nums;
}
.mo-row-col-state { grid-area: state; }
.mo-row-meta {
  grid-area: meta;
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 状态刻度：2px 满行高，文字状态词同时存在（不只靠颜色） */
.mo-tonebar {
  position: absolute;
  left: 0;
  top: var(--mo-s2);
  bottom: var(--mo-s2);
  width: 2px;
}
.mo-tonebar-inline {
  display: inline-block;
  width: 2px;
  height: 10px;
  margin-right: var(--mo-s1);
  vertical-align: -1px;
}
.mo-tone-ok { background: var(--dsw-alias-state-success-primary); }
.mo-tone-warn { background: var(--dsw-alias-state-warn-primary); }
.mo-tone-err { background: var(--dsw-alias-state-error-primary); }
.mo-tone-idle { background: var(--dsw-alias-state-idle-primary); }

/* ---------- 表头 ---------- */
.mo-table-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 200px 96px 88px;
  column-gap: var(--mo-s4);
  padding: var(--mo-s2) var(--mo-s3) var(--mo-s2) var(--mo-s4);
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  letter-spacing: 0.08em;
  color: var(--dsw-alias-label-secondary);
}
.mo-table-head .mo-is-num { text-align: right; }

/* ---------- 段落标题 ---------- */
.mo-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--mo-s3);
  margin: var(--mo-s4) 0 var(--mo-s1);
  padding-right: var(--mo-s4);
}
.mo-section-head:first-child { margin-top: 0; }
.mo-section-title {
  margin: 0;
  font-size: var(--mo-t2);
  line-height: var(--mo-t2-lh);
  font-weight: 600;
}
.mo-section-note {
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
}

/* ---------- 按钮（圆角 6；主操作墨块） ---------- */
.mo-btn,
.mo-btn-ink,
.mo-btn-ghost,
.mo-remember-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 88px;
  min-height: 32px;
  padding: 0 var(--mo-s4);
  border-radius: var(--mo-r-control);
  border: 1px solid transparent;
  font: inherit;
  font-size: var(--mo-t3);
  cursor: pointer;
  transition: background-color var(--mo-dur-state) var(--mo-ease), filter var(--mo-dur-state) var(--mo-ease), opacity var(--mo-dur-state) var(--mo-ease);
}
.mo-btn { background: none; color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l3); }
.mo-btn-ink { background: var(--dsw-alias-label-primary); color: var(--dsw-alias-bg-base); }
.mo-btn-ghost { background: none; color: var(--dsw-alias-label-secondary); border-color: var(--dsw-alias-border-l3); }
.mo-btn[disabled],
.mo-btn-ink[disabled],
.mo-btn-ghost[disabled] { opacity: 0.45; cursor: not-allowed; }
.mo-textlink {
  border: 0;
  background: none;
  padding: 0;
  color: var(--dsw-alias-link);
  font: inherit;
  font-size: var(--mo-t4);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ---------- 状态块 / 骨架（44px 等高，不位移） ---------- */
.mo-state-block { max-width: var(--mo-w-prose); padding: var(--mo-s5) 0 var(--mo-s5) var(--mo-s4); }
.mo-state-title { margin: 0 0 var(--mo-s2); font-size: var(--mo-t2); line-height: var(--mo-t2-lh); font-weight: 600; }
.mo-state-text {
  margin: 0 0 var(--mo-s3);
  max-width: 640px;
  font-size: var(--mo-t3);
  line-height: var(--mo-t3-lh-loose);
  color: var(--dsw-alias-label-secondary);
}
.mo-state-hint {
  margin: 0 0 var(--mo-s3);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
}
.mo-state-empty { padding-left: var(--mo-s4); }
.mo-state-error {
  border-left: 2px solid var(--dsw-alias-state-error-primary);
  padding-left: var(--mo-s3);
}
.mo-skel-wrap { padding: var(--mo-s3) var(--mo-s4) 0 0; }
.mo-skel-row {
  height: 44px;
  margin-bottom: var(--mo-s1);
  background: var(--dsw-alias-bg-skeleton);
  animation: mo-skel-breathe 1.2s ease-in-out infinite;
}
.mo-skel-note {
  margin: var(--mo-s2) 0 0;
  font-size: var(--mo-t4);
  color: var(--dsw-alias-label-secondary);
}
@keyframes mo-skel-breathe {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

/* ---------- 检视栏（aside，360） ---------- */
.mo-insp {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-height: 0;
  background: color-mix(in srgb, var(--dsw-alias-bg-base) 94%, var(--dsw-alias-label-primary) 6%);
  border-left: 1px solid var(--dsw-alias-border-l3);
}
.mo-insp-head {
  padding: var(--mo-s5) var(--mo-s5) var(--mo-s3);
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
.mo-insp-title { margin: 0; font-size: var(--mo-t1); line-height: var(--mo-t1-lh); font-weight: 600; overflow-wrap: anywhere; }
.mo-insp-sub {
  margin: var(--mo-s1) 0 0;
  font-family: var(--mo-mono);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
  overflow-wrap: anywhere;
}
.mo-insp-body {
  min-height: 0;
  overflow-y: auto;
  padding: var(--mo-s4) var(--mo-s5);
  transition: opacity var(--mo-dur-insp) var(--mo-ease);
}
.mo-insp-foot {
  display: flex;
  gap: var(--mo-s2);
  justify-content: flex-end;
  padding: var(--mo-s3) var(--mo-s5) var(--mo-s4);
  border-top: 1px solid var(--dsw-alias-border-l2);
}
.mo-insp-foot[hidden] { display: none; }

/* 属性表 */
.mo-props { margin: 0; }
.mo-prop {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  column-gap: var(--mo-s2);
  padding: 2px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
}
.mo-prop:last-child { border-bottom: 0; }
.mo-prop dt { color: var(--dsw-alias-label-secondary); }
.mo-prop dd {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-family: var(--mo-mono);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}
.mo-insp-text {
  margin: var(--mo-s3) 0 0;
  font-size: var(--mo-t3);
  line-height: var(--mo-t3-lh-loose);
  color: var(--dsw-alias-label-secondary);
}
.mo-insp-label {
  margin: var(--mo-s4) 0 var(--mo-s1);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  letter-spacing: 0.08em;
  color: var(--dsw-alias-label-secondary);
}
.mo-insp-body .mo-verdicts + .mo-section-head {
  margin-top: var(--mo-s4);
  padding-top: var(--mo-s3);
  border-top: 1px solid var(--dsw-alias-border-l1);
}

/* 校验行：拒 / 警 分开，互不短路 */
.mo-verdicts { margin: var(--mo-s3) 0 0; display: flex; flex-direction: column; gap: var(--mo-s1); }
.mo-verdict {
  display: flex;
  gap: var(--mo-s2);
  align-items: baseline;
  padding-left: var(--mo-s2);
  border-left: 2px solid var(--dsw-alias-border-l3);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
}
.mo-verdict-refuse { border-left-color: var(--dsw-alias-state-error-primary); }
.mo-verdict-warn { border-left-color: var(--dsw-alias-state-warn-primary); }
.mo-verdict-ok { border-left-color: var(--dsw-alias-state-success-primary); }
.mo-verdict-tag {
  flex: 0 0 auto;
  white-space: nowrap;
  font-family: var(--mo-mono);
  color: var(--dsw-alias-label-primary);
}

/* 生效时机 */
.mo-effect {
  margin: var(--mo-s3) 0 0;
  padding-left: var(--mo-s2);
  border-left: 1px solid var(--dsw-alias-border-l3);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
}

/* ---------- 状态条（role=status） ---------- */
.mo-statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--mo-s5);
  height: var(--mo-h-status);
  padding: 0 var(--mo-s5);
  border-top: 1px solid var(--dsw-alias-border-l2);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
}
.mo-statusbar .mo-num { font-size: var(--mo-t4); }
.mo-status-left {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mo-status-right { flex: 0 0 auto; }

/* ---------- 交互三态（brief §七-1） ---------- */
.mo-btn:hover,
.mo-btn-ink:hover,
.mo-btn-ghost:hover,
.mo-kindbtn:hover,
.mo-tab:hover,
.mo-row-button:hover,
.mo-textlink:hover,
.mo-face-btn:hover,
.mo-bucket-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.mo-btn-ink:hover { background: var(--dsw-alias-label-primary); filter: brightness(0.9); }

.mo-btn:active,
.mo-btn-ink:active,
.mo-btn-ghost:active,
.mo-kindbtn:active,
.mo-tab:active,
.mo-row-button:active,
.mo-textlink:active,
.mo-face-btn:active,
.mo-bucket-row:active { background: var(--dsw-alias-interactive-bg-active); }

.mo-btn:focus-visible,
.mo-btn-ink:focus-visible,
.mo-btn-ghost:focus-visible,
.mo-kindbtn:focus-visible,
.mo-tab:focus-visible,
.mo-row-button:focus-visible,
.mo-textlink:focus-visible,
.mo-face-btn:focus-visible,
.mo-bucket-row:focus-visible,
.mo-field:focus-visible,
.mo-title-input:focus-visible,
.mo-reason-input:focus-visible,
.mo-capture-input:focus-visible,
.mo-remember-close:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 2px;
}
.mo-field:focus-visible,
.mo-title-input:focus-visible,
.mo-reason-input:focus-visible,
.mo-capture-input:focus-visible { outline-offset: -1px; }
.mo-tab:focus-visible,
.mo-row-button:focus-visible,
.mo-bucket-row:focus-visible { outline-offset: -1px; }

/* ---------- 动效降级（brief §六） ---------- */
@media (prefers-reduced-motion: reduce) {
  .mo-app *,
  .mo-app *::before,
  .mo-app *::after,
  .mo-remember-backdrop,
  .mo-remember-backdrop * {
    animation-duration: 0ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0ms !important;
  }
  .mo-skel-row { opacity: 1; }
}

/* ---------- 屏读专用 ---------- */
.mo-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
`