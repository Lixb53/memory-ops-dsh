/**
 * v9 样式 · 分区与检视栏内部（双面开关 / 工具带 / meter / 桶行 / diff / 浮层）
 *
 * 与 `styles-base.ts` 同一套规则来源（`prototype/app.css` 第 387–905 行），
 * 拆成两份只为守住「单文件 ≤1000 行」。
 *
 * ⚠️ 模板字符串：注释里不能出现反引号。
 */

export const PANE_CSS = `
/* ---------- 双面开关（内容面 ⇄ 成本面）---------- */
.mo-faces {
  display: flex;
  align-items: center;
  gap: var(--mo-s3);
  padding: 0 var(--mo-s3) var(--mo-s3) 0;
}
.mo-face-switch {
  display: inline-flex;
  align-items: stretch;
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: var(--mo-r-control);
  overflow: hidden;
}
.mo-face-btn {
  min-height: 32px;
  padding: 0 var(--mo-s3);
  border: 0;
  background: none;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: var(--mo-t4);
  cursor: pointer;
  transition: color var(--mo-dur-state) var(--mo-ease), background-color var(--mo-dur-state) var(--mo-ease);
}
.mo-face-btn[aria-checked="true"] {
  color: var(--dsw-alias-label-primary);
  font-weight: 600;
  box-shadow: inset 0 -2px 0 var(--dsw-alias-state-business-primary);
}
.mo-face-note {
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
}

/* ---------- 工具带（搜索 / 类型签 / 输入）---------- */
.mo-toolbar {
  display: flex;
  align-items: center;
  gap: var(--mo-s2);
  padding: 0 var(--mo-s3) var(--mo-s3) 0;
}
.mo-field {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 36px;
  padding: 0 var(--mo-s3);
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: var(--mo-r-control);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: var(--mo-t3);
}
.mo-field::placeholder { color: var(--dsw-alias-label-tertiary); }
.mo-kindbtn {
  min-width: 44px;
  min-height: 28px;
  padding: 0 var(--mo-s2);
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: var(--mo-r-control);
  background: none;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: var(--mo-t4);
  cursor: pointer;
  transition: background-color var(--mo-dur-state) var(--mo-ease), color var(--mo-dur-state) var(--mo-ease);
}
.mo-kindbtn[aria-pressed="true"] {
  color: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-label-primary);
}

/* ---------- 记一条 ---------- */
.mo-capture-box { padding-right: var(--mo-s4); }
.mo-capture-input {
  width: 100%;
  min-height: 120px;
  padding: var(--mo-s3);
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: var(--mo-r-control);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: var(--mo-t3);
  line-height: var(--mo-t3-lh-loose);
  resize: vertical;
}
.mo-capture-note {
  margin: var(--mo-s2) 0 var(--mo-s3);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
}
.mo-capture-actions { display: flex; align-items: center; gap: var(--mo-s3); }
.mo-inline-done {
  display: flex;
  align-items: center;
  gap: var(--mo-s2);
  margin-top: var(--mo-s3);
  padding: var(--mo-s2) var(--mo-s3);
  border-left: 2px solid var(--dsw-alias-state-success-primary);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
}
.mo-inline-done[data-tone="err"] { border-left-color: var(--dsw-alias-state-error-primary); }

/* ---------- 检视栏编辑态：单行输入 / 驳回理由 ---------- */
.mo-title-input {
  width: 100%;
  min-height: 36px;
  padding: 0 var(--mo-s3);
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: var(--mo-r-control);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: var(--mo-t3);
}
.mo-reason-input {
  width: 100%;
  min-height: 72px;
  padding: var(--mo-s2) var(--mo-s3);
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: var(--mo-r-control);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: var(--mo-t3);
  line-height: var(--mo-t3-lh);
  resize: vertical;
}
.mo-reason-input[aria-invalid="true"] { border-color: var(--dsw-alias-state-error-primary); }

/* diff：上下叠，删除行 2px danger + 删除线，插入行 2px ok */
.mo-diff {
  margin: var(--mo-s2) 0 0;
  border-top: 1px solid var(--dsw-alias-border-l1);
}
.mo-diff-line {
  position: relative;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  column-gap: var(--mo-s2);
  padding: var(--mo-s1) 0 var(--mo-s1) var(--mo-s2);
  font-size: var(--mo-t3);
  line-height: var(--mo-t3-lh);
}
.mo-diff-line::before {
  content: "";
  position: absolute;
  left: 0;
  top: var(--mo-s1);
  bottom: var(--mo-s1);
  width: 2px;
}
.mo-diff-removed::before { background: var(--dsw-alias-state-error-primary); }
.mo-diff-added::before { background: var(--dsw-alias-state-success-primary); }
.mo-diff-removed .mo-diff-text {
  text-decoration: line-through;
  text-decoration-thickness: 2px;
  text-decoration-color: var(--dsw-alias-state-error-primary);
  color: var(--dsw-alias-label-secondary);
}
.mo-diff-no {
  font-family: var(--mo-mono);
  font-size: var(--mo-t4);
  line-height: var(--mo-t3-lh);
  color: var(--dsw-alias-label-tertiary);
}
.mo-diff-text { overflow-wrap: anywhere; }

/* ---------- 桶行（V1）---------- */
.mo-bucket-rows { list-style: none; margin: 0; padding: 0; }
.mo-bucket-row {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  column-gap: var(--mo-s3);
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
.mo-bucket-row[aria-current="true"] { background: var(--dsw-alias-card-fill-hover); }
.mo-ops-row { min-height: 32px; }
.mo-bucket-name { font-size: var(--mo-t3); }
.mo-bucket-note {
  grid-column: 1 / -1;
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
}
.mo-bucket-num {
  font-family: var(--mo-mono);
  font-variant-numeric: tabular-nums;
  font-size: var(--mo-t3);
  text-align: right;
}
.mo-bucket-num[data-unknown="true"] { color: var(--dsw-alias-label-secondary); }

/* meter：蓝 = 你能动，灰 = 动不了；不可读桶不入百分比 */
.mo-meter-wrap { padding: var(--mo-s2) var(--mo-s4) var(--mo-s2) 0; }
.mo-meter {
  display: flex;
  gap: 2px;
  height: 12px;
  border-radius: var(--mo-r-flat);
  overflow: hidden;
}
.mo-meter-seg { height: 100%; }
.mo-meter-fixed { background: var(--dsw-alias-state-idle-primary); }
.mo-meter-own { background: var(--dsw-alias-state-business-primary); }
.mo-meter-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--mo-s4);
  margin-top: var(--mo-s2);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
}
.mo-legend-item { display: inline-flex; align-items: center; gap: var(--mo-s1); }
.mo-check-line {
  margin: var(--mo-s2) 0 0;
  font-family: var(--mo-mono);
  font-size: var(--mo-t4);
  line-height: var(--mo-t4-lh);
  color: var(--dsw-alias-label-secondary);
  overflow-wrap: anywhere;
}

/* ---------- /remember 浮层（回归锚点：必须 position: fixed）---------- */
.mo-remember-backdrop {
  position: fixed;
  inset: 0;
  background: var(--dsw-alias-bg-mask-1);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
}
.mo-remember-backdrop[hidden] { display: none; }
.mo-remember-dialog {
  width: 560px;
  max-width: calc(100vw - var(--mo-s6));
  padding: var(--mo-s5);
  background: var(--dsw-alias-bg-base);
  border: 1px solid var(--dsw-alias-border-l3);
  border-radius: var(--mo-r-overlay);
}
.mo-remember-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--mo-s3);
  margin-bottom: var(--mo-s3);
}
.mo-remember-title { margin: 0; font-size: var(--mo-t2); line-height: var(--mo-t2-lh); font-weight: 600; }
.mo-remember-close {
  min-width: 44px;
  min-height: 28px;
  padding: 0 var(--mo-s2);
  background: none;
  border: 1px solid var(--dsw-alias-border-l3);
  color: var(--dsw-alias-label-secondary);
  font-size: var(--mo-t4);
}

/* ---------- 空态出口按钮的对齐 ---------- */
.mo-state-actions { display: flex; gap: var(--mo-s2); align-items: center; }
`