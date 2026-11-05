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

/* —— 侧栏图标 —— */
.dmo-icon { display: block; }
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
