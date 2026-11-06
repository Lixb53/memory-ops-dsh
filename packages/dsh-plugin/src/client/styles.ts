/**
 * 样式 —— 只用宿主主题 token（`--dsw-alias-*`），不写死颜色。
 *
 * 为什么必须这样：token 被改名只会让外观退化，不会让渲染崩掉；
 * 写死颜色则会随宿主深浅色切换而失配。
 * 全站唯一允许的字面色是「推断 / 未命中 / 到期」的琥珀色语义映射，
 * 这里用 token 的 warn 态表达，不引第二套色板。
 */

const STYLE_ID = 'dsh-memory-ops-style'

/** 插件样式表。 */
const CSS = `
.dmo-root { display: flex; flex-direction: column; height: 100%; min-height: 0; font-size: 13px; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base); }
.dmo-root * { box-sizing: border-box; }

/* —— 子导航（5 分区）—— */
.dmo-tabs { display: flex; gap: 2px; padding: 8px 8px 0; border-bottom: 1px solid var(--dsw-alias-border-l1); flex: 0 0 auto; overflow-x: auto; }
.dmo-tab { appearance: none; border: 0; background: transparent; color: var(--dsw-alias-label-secondary); font-size: 12px; padding: 6px 9px; border-radius: 6px 6px 0 0; cursor: pointer; white-space: nowrap; border-bottom: 2px solid transparent; }
.dmo-tab:hover { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); }
.dmo-tab[aria-selected="true"] { color: var(--dsw-alias-brand-primary); border-bottom-color: var(--dsw-alias-brand-primary); font-weight: 600; }
.dmo-tab:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dmo-tab-badge { display: inline-block; min-width: 15px; margin-left: 5px; padding: 0 4px; border-radius: 8px; font-size: 10px; line-height: 15px; text-align: center; background: var(--dsw-alias-state-warn-primary); color: var(--dsw-alias-bg-base); }

.dmo-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 10px; }
.dmo-body-flat { padding: 0; }

/* —— KPI 带 —— */
.dmo-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(84px, 1fr)); gap: 6px; margin-bottom: 10px; }
.dmo-kpi { border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; padding: 7px 8px; background: var(--dsw-alias-bg-layer-1); min-width: 0; }
.dmo-kpi-label { font-size: 11px; color: var(--dsw-alias-label-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dmo-kpi-value { font-size: 16px; font-weight: 650; font-variant-numeric: tabular-nums; margin-top: 1px; }
.dmo-kpi-note { font-size: 10px; color: var(--dsw-alias-label-secondary); }
.dmo-kpi-btn { appearance: none; text-align: left; cursor: pointer; font: inherit; color: inherit; }
.dmo-kpi-btn:hover { border-color: var(--dsw-alias-border-l2); }
.dmo-kpi-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dmo-kpi-more { float: right; font-size: 10px; color: var(--dsw-alias-brand-primary); font-weight: 600; }

/* —— 常驻前缀构成 —— */
.dmo-resident-group { margin: 8px 0; }
.dmo-resident-head { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
.dmo-resident-row { display: flex; gap: 8px; align-items: flex-start; padding: 4px 0 4px 8px; border-left: 2px solid var(--dsw-alias-border-l1); }
.dmo-resident-main { flex: 1 1 auto; min-width: 0; }
.dmo-link { color: var(--dsw-alias-brand-primary); cursor: pointer; }
.dmo-link:hover { text-decoration: underline; }

/* —— 卡片 —— */
.dmo-card { border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; padding: 8px 9px; margin-bottom: 7px; background: var(--dsw-alias-bg-layer-1); }
.dmo-card-title { font-size: 13px; font-weight: 600; line-height: 1.4; word-break: break-word; }
.dmo-card-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 4px; font-size: 11px; color: var(--dsw-alias-label-secondary); }
.dmo-card-body { margin-top: 6px; font-size: 12px; line-height: 1.55; color: var(--dsw-alias-label-secondary); white-space: pre-wrap; word-break: break-word; }
.dmo-card-actions { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 7px; }

/* —— 徽标 —— */
.dmo-badge { display: inline-flex; align-items: center; gap: 3px; padding: 1px 6px; border-radius: 9px; font-size: 10px; font-weight: 600; line-height: 15px; white-space: nowrap; }
.dmo-badge-ok { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 18%, transparent); color: var(--dsw-alias-state-success-primary); }
.dmo-badge-warn { background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 20%, transparent); color: var(--dsw-alias-state-warn-primary); }
.dmo-badge-err { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 18%, transparent); color: var(--dsw-alias-state-error-primary); }
.dmo-badge-idle { background: color-mix(in srgb, var(--dsw-alias-state-idle-primary) 22%, transparent); color: var(--dsw-alias-label-secondary); }
.dmo-badge-brand { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 15%, transparent); color: var(--dsw-alias-brand-primary); }

/* —— 按钮 —— */
.dmo-btn { appearance: none; border: 1px solid var(--dsw-alias-border-l2); background: transparent; color: var(--dsw-alias-label-primary); border-radius: 6px; padding: 3px 9px; font-size: 12px; cursor: pointer; line-height: 1.5; }
.dmo-btn:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); }
.dmo-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dmo-btn:disabled { opacity: .45; cursor: not-allowed; }
.dmo-btn-primary { background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-bg-base); font-weight: 600; }
.dmo-btn-danger { border-color: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); }
.dmo-btn-sm { padding: 1px 6px; font-size: 11px; }

/* —— 输入 —— */
.dmo-input, .dmo-select, .dmo-textarea { width: 100%; font: inherit; font-size: 12px; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-base); border: 1px solid var(--dsw-alias-border-l2); border-radius: 6px; padding: 5px 7px; }
.dmo-textarea { min-height: 70px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; line-height: 1.5; }
.dmo-input:focus, .dmo-select:focus, .dmo-textarea:focus { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -1px; border-color: var(--dsw-alias-brand-primary); }
.dmo-field { margin-bottom: 8px; }
.dmo-label { display: block; font-size: 11px; color: var(--dsw-alias-label-secondary); margin-bottom: 3px; }
.dmo-row { display: flex; gap: 6px; align-items: center; }
.dmo-row > * { min-width: 0; }

/* —— 列表行 —— */
.dmo-row-item { display: flex; gap: 7px; align-items: flex-start; padding: 6px 4px; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dmo-row-item:last-child { border-bottom: 0; }
.dmo-row-main { flex: 1 1 auto; min-width: 0; }
.dmo-row-text { font-size: 12px; line-height: 1.5; word-break: break-word; }
.dmo-row-sub { font-size: 10.5px; color: var(--dsw-alias-label-secondary); margin-top: 2px; }
.dmo-check { flex: 0 0 auto; margin-top: 3px; accent-color: var(--dsw-alias-brand-primary); }

/* —— 状态块 —— */
.dmo-empty { padding: 22px 10px; text-align: center; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 1.7; }
.dmo-empty-title { font-size: 13px; font-weight: 600; color: var(--dsw-alias-label-primary); margin-bottom: 4px; }
.dmo-error { border: 1px solid var(--dsw-alias-state-error-primary); border-radius: 8px; padding: 9px 10px; font-size: 12px; line-height: 1.6; color: var(--dsw-alias-state-error-primary); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent); }
.dmo-degrade { border-left: 3px solid var(--dsw-alias-state-warn-primary); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent); padding: 6px 9px; border-radius: 4px; font-size: 11.5px; line-height: 1.55; margin-bottom: 8px; }
.dmo-note { font-size: 11px; color: var(--dsw-alias-label-secondary); line-height: 1.55; margin: 6px 0; }
.dmo-skeleton { height: 52px; border-radius: 8px; margin-bottom: 7px; background: linear-gradient(90deg, var(--dsw-alias-bg-layer-1) 25%, var(--dsw-alias-bg-layer-2) 37%, var(--dsw-alias-bg-layer-1) 63%); background-size: 400% 100%; animation: dmo-shimmer 1.3s ease-in-out infinite; }
@keyframes dmo-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
@media (prefers-reduced-motion: reduce) { .dmo-skeleton { animation: none; } }

/* —— 预算账本 —— */
.dmo-budget { border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; padding: 8px 9px; margin-bottom: 8px; background: var(--dsw-alias-bg-layer-1); }
.dmo-budget-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 11.5px; }
.dmo-budget-name { flex: 0 0 58px; color: var(--dsw-alias-label-secondary); }
.dmo-budget-bar { flex: 1 1 auto; height: 5px; border-radius: 3px; background: var(--dsw-alias-bg-layer-2); overflow: hidden; }
.dmo-budget-fill { height: 100%; border-radius: 3px; background: var(--dsw-alias-brand-primary); }
.dmo-budget-fill-over { background: var(--dsw-alias-state-warn-primary); }
.dmo-budget-num { flex: 0 0 auto; font-variant-numeric: tabular-nums; font-weight: 600; }
/* 预算账本每段：标题行 + 进度条 + 说明 */
.dmo-budget-item { padding: 7px 0; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.dmo-budget-item:last-child { border-bottom: 0; padding-bottom: 0; }
.dmo-budget-head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 3px; }

/* —— 置信度 stepper —— */
.dmo-stepper { display: flex; align-items: center; gap: 3px; margin: 7px 0; }
.dmo-step { flex: 1 1 0; height: 4px; border-radius: 2px; background: var(--dsw-alias-bg-layer-2); }
.dmo-step-on { background: var(--dsw-alias-state-success-primary); }
.dmo-step-now { background: var(--dsw-alias-brand-primary); }

/* —— 证据链 —— */
.dmo-evidence { border-left: 2px solid var(--dsw-alias-border-l2); padding-left: 8px; margin: 5px 0; font-size: 11.5px; line-height: 1.55; }
.dmo-evidence-src { color: var(--dsw-alias-label-secondary); font-size: 10.5px; }

/* —— 右侧栏捕获 —— */
.dmo-capture { display: flex; flex-direction: column; gap: 7px; padding: 10px; }
.dmo-capture-input { min-height: 62px; }
.dmo-capture-foot { display: flex; gap: 6px; align-items: center; justify-content: space-between; }
.dmo-toast { font-size: 11.5px; line-height: 1.5; padding: 6px 8px; border-radius: 6px; }
.dmo-toast-ok { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent); color: var(--dsw-alias-state-success-primary); }
.dmo-toast-err { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 14%, transparent); color: var(--dsw-alias-state-error-primary); }

/* —— 会话记忆 tab —— */
.dmo-session { padding: 12px; display: flex; flex-direction: column; gap: 9px; }
.dmo-session-kpis { display: flex; gap: 6px; }
.dmo-session-kpi { flex: 1 1 0; border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; padding: 8px; text-align: center; background: var(--dsw-alias-bg-layer-1); }
.dmo-session-kpi b { display: block; font-size: 17px; font-variant-numeric: tabular-nums; }
.dmo-session-kpi span { font-size: 10.5px; color: var(--dsw-alias-label-secondary); }

/* —— 未命中流水线 —— */
.dmo-lane { margin-bottom: 9px; }
.dmo-lane-head { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; margin-bottom: 4px; }
.dmo-lane-count { font-size: 10.5px; color: var(--dsw-alias-label-secondary); font-weight: 400; }

/* —— /remember 弹窗（浮在输入框卡片内）—— */
.dmo-remember-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.45));
}
.dmo-remember-card {
  width: min(480px, 100% - 32px);
  max-height: min(78vh, 620px);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 14px 16px 16px;
  border-radius: 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  box-shadow: var(--dsw-shadow-lv3, 0 12px 32px rgba(0, 0, 0, 0.4));
  font-size: 13px;
}
.dmo-remember-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; }
.dmo-remember-title { font-size: 14px; font-weight: 600; }
.dmo-remember-close {
  margin-left: auto;
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 18px;
  line-height: 1;
  padding: 2px 6px;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
}
.dmo-remember-close:hover { color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-2); }
.dmo-remember-close:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dmo-remember-body { display: flex; flex-direction: column; gap: 8px; min-height: 0; overflow-y: auto; }
.dmo-remember-input { min-height: 96px; }
.dmo-remember-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 2px; }

/* 保存提示：浮层关闭后短暂出现，带撤销 */
.dmo-remember-toast {
  position: fixed;
  left: 50%;
  bottom: 96px;
  transform: translateX(-50%);
  z-index: 190;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-overlay);
  box-shadow: var(--dsw-shadow-lv2, 0 4px 14px rgba(0, 0, 0, 0.28));
  max-width: min(560px, calc(100vw - 32px));
}
.dmo-remember-undo {
  appearance: none;
  border: 1px solid var(--dsw-alias-border-l2);
  background: transparent;
  color: var(--dsw-alias-brand-primary);
  border-radius: 6px;
  padding: 1px 8px;
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
}
.dmo-remember-undo:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); }
.dmo-remember-undo:disabled { opacity: .45; cursor: not-allowed; }
.dmo-remember-dismiss {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  padding: 0 2px;
  font-family: inherit;
}
.dmo-remember-dismiss:hover { color: var(--dsw-alias-label-primary); }

/* —— 侧栏图标 —— */
.dmo-icon { display: block; }
/* ============================================================
 * v3.5 补齐设计稿的视觉件
 * 设计稿 plugin-v3.html 里这些组件都有，实现一直缺；
 * 名字沿用设计稿的语义（chip / band / tag / anchor-note），
 * 但值一律用宿主 token，不写死颜色。
 * ============================================================ */

/* —— 状态筛选药丸（记忆分区）—— */
.dmo-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
.dmo-chip {
  appearance: none; border: 1px solid var(--dsw-alias-border-l2);
  background: transparent; color: var(--dsw-alias-label-secondary);
  border-radius: 12px; padding: 2px 9px; font: inherit; font-size: 11.5px;
  cursor: pointer; display: inline-flex; align-items: center; gap: 4px; line-height: 1.6;
}
.dmo-chip:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.dmo-chip[aria-pressed="true"] {
  background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-bg-base); font-weight: 600;
}
.dmo-chip:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dmo-chip-num { font-variant-numeric: tabular-nums; opacity: .8; }

/* —— 五态计数条（未命中）—— */
.dmo-band { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin-bottom: 9px; }
.dmo-band-cell {
  border: 1px solid var(--dsw-alias-border-l1); border-radius: 7px;
  padding: 6px 4px; text-align: center; background: var(--dsw-alias-bg-layer-1); min-width: 0;
}
.dmo-band-cell[data-active="true"] { border-color: var(--dsw-alias-brand-primary); }
.dmo-band-v { font-size: 15px; font-weight: 650; font-variant-numeric: tabular-nums; line-height: 1.2; }
.dmo-band-l { font-size: 10px; color: var(--dsw-alias-label-secondary); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dmo-band-cell[data-tone="warn"] .dmo-band-v { color: var(--dsw-alias-state-warn-primary); }
.dmo-band-cell[data-tone="ok"] .dmo-band-v { color: var(--dsw-alias-state-success-primary); }

/* —— 分组容器（本项目 / 未命中）—— */
.dmo-group { margin-bottom: 11px; }
.dmo-group-head { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
.dmo-group-title { font-size: 12px; font-weight: 600; margin: 0; }
.dmo-group-count { font-size: 10.5px; color: var(--dsw-alias-label-secondary); font-weight: 400; }

/* —— 直角小签（设计稿的 tag，与圆角 badge 区分）—— */
.dmo-tag {
  display: inline-flex; align-items: center; gap: 3px; padding: 0 5px;
  border-radius: 4px; font-size: 10px; font-weight: 600; line-height: 15px;
  border: 1px solid currentColor; white-space: nowrap; opacity: .95;
}
.dmo-tag-fact { color: var(--dsw-alias-state-success-primary); }
.dmo-tag-infer { color: var(--dsw-alias-state-warn-primary); }
.dmo-tag-mute { color: var(--dsw-alias-label-secondary); }

/* —— 锚点状态条（详情页）—— */
.dmo-anchor-note {
  display: flex; gap: 6px; align-items: flex-start;
  padding: 6px 9px; border-radius: 6px; font-size: 11.5px; line-height: 1.55;
  margin: 6px 0;
}
.dmo-anchor-note[data-state="stale"] {
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 10%, transparent);
  border-left: 3px solid var(--dsw-alias-state-warn-primary);
}
.dmo-anchor-note[data-state="fresh"] {
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 9%, transparent);
  border-left: 3px solid var(--dsw-alias-state-success-primary);
}
.dmo-anchor-note code, .dmo-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10.5px; }

/* —— 证据引文（设计稿用 <q> 自动加「」）—— */
.dmo-quote { margin: 0; font-size: 11.5px; line-height: 1.55; }
.dmo-quote::before { content: "「"; }
.dmo-quote::after { content: "」"; }

/* —— 记录流常驻捕获框 —— */
.dmo-capture-inline { margin-bottom: 9px; }
.dmo-capture-inline .dmo-textarea { min-height: 46px; }
.dmo-capture-hint { font-size: 10.5px; color: var(--dsw-alias-label-secondary); margin-top: 3px; }

/* —— 批量操作高亮条（设计稿 bulk）—— */
.dmo-bulk {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  padding: 6px 8px; margin-bottom: 8px; border-radius: 6px;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 28%, transparent);
}

/* —— 「刚刚捕获」紧凑列表（快速捕获）—— */
.dmo-recent-row {
  display: flex; align-items: baseline; gap: 6px;
  padding: 4px 0; border-bottom: 1px solid var(--dsw-alias-border-l1); font-size: 11.5px;
}
.dmo-recent-row:last-child { border-bottom: 0; }
.dmo-recent-main { flex: 1 1 auto; min-width: 0; word-break: break-word; }
.dmo-recent-time { flex: 0 0 auto; font-size: 10px; color: var(--dsw-alias-label-secondary); }

/* —— 类型 chips（快速捕获，替代下拉）—— */
.dmo-types { display: flex; flex-wrap: wrap; gap: 4px; }

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
