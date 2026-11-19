/**
 * ui.js —— 共享 UI 原语与格式化（v5 卡片仪表盘）
 *
 * 只放「与业务无关、到处都要用」的东西。所有函数返回 HTML 字符串。
 * 经典脚本 + window.MO：原型必须双击可开（file:// 下 ES module 被 CORS 拦）。
 *
 * v4→v5 的 API 变化：
 *   tag()   → badge()：圆角 0 的描边签换成 tint 底 + 圆点 + 文字徽标
 *   新增 tile()：指标卡（必须可点，方向卡 §八-1）
 *   新增 card() / cardQuiet()：重卡 / 静卡容器
 */

(function () {
  'use strict';

  const MO = (window.MO = window.MO || {});

  /* ==========================================================
   * 转义
   * ========================================================== */

  MO.esc = (value) => String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  /* ==========================================================
   * 术语表：界面强制用右列，见 information-architecture.md §四
   * ========================================================== */

  MO.STATUS_LABEL = {
    hypothesis: '候选',
    observed: '观察中',
    reinforced: '较可信',
    confirmed: '已确认',
    rejected: '已驳回',
    stale: '待复核',
    archived: '已归档',
    active: '有效',
  };

  /** 状态 → 徽标 tone（tint 底 + 圆点色）。 */
  MO.STATUS_TONE = {
    hypothesis: 'warn',
    observed: 'warn',
    reinforced: 'live',
    confirmed: 'ok',
    rejected: 'err',
    stale: 'warn',
    archived: '',
    active: '',
  };

  MO.INBOX_STATE_LABEL = {
    open: '未开始',
    todo: '进行中',
    done: '已完成',
    dropped: '已丢弃',
  };

  MO.INBOX_STATE_TONE = {
    open: 'warn',
    todo: 'live',
    done: 'ok',
    dropped: '',
  };

  /** 状态 → 中文；未知值原样返回（不遮住数据问题）。 */
  MO.statusLabel = (status) => MO.STATUS_LABEL[status] || status;

  /* ==========================================================
   * 原子件
   * ========================================================== */

  /** 徽标：tint 底 + 圆点 + 文字。颜色只是加速识别，文字才是信息。 */
  MO.badge = function badge(text, tone) {
    const attr = tone === undefined || tone === '' ? '' : ` data-tone="${MO.esc(tone)}"`;
    return `<span class="badge"${attr}>${MO.esc(text)}</span>`;
  };

  /**
   * KPI 账带（v6）。
   *
   * 硬规矩（方向卡 §七-6）：数字不许裸奔——每格必须可点（goto 到对应分区）。
   * 首格 = 本页主指标（数字业务蓝、左对齐）；其余数字右对齐同一基线。
   */
  MO.tape = function tape(cells) {
    return `<div class="tape" role="group" aria-label="全局指标">${cells.map(cell =>
      `<button data-action="goto" data-pane="${MO.esc(cell.pane)}">
        <span class="v">${MO.esc(cell.value)}</span>
        <span class="k">${MO.esc(cell.label)}</span>
      </button>`).join('')}</div>`;
  };

  /** 重卡容器：每屏 ≤1，放主操作。 */
  MO.card = function card(inner, extraClass) {
    return `<section class="card${extraClass ? ' ' + extraClass : ''}">${inner}</section>`;
  };

  /** 静卡容器：次级内容。 */
  MO.cardQuiet = function cardQuiet(inner, extraClass) {
    return `<section class="card-quiet${extraClass ? ' ' + extraClass : ''}">${inner}</section>`;
  };

  /** 区块标题行（卡片外部用；卡片内部用 .card-label）。 */
  MO.sectionHead = function sectionHead(title, count, action) {
    return `<div class="section-head">
      <h2 class="section-title">${MO.esc(title)}</h2>
      ${count === undefined || count === '' ? '' : `<span class="section-count">${MO.esc(count)}</span>`}
      ${action === undefined || action === '' ? '' : `<span class="section-action">${action}</span>`}
    </div>`;
  };

  /** 骨架屏：高度与真实内容接近，切换不塌陷。 */
  MO.skeleton = function skeleton(rows, height) {
    const n = rows === undefined ? 3 : rows;
    const h = height === undefined ? 52 : height;
    let out = '';
    for (let i = 0; i < n; i += 1) {
      out += `<div class="skeleton" style="height:${h}px;margin-bottom:var(--s2)"></div>`;
    }
    return out;
  };

  /**
   * 错误态：必须说「怎么解决」，不只报告「出错」。
   * @param {string} title - 一句话说清发生了什么
   * @param {string} body  - 为什么、以及用户能做什么
   * @param {string} actions - 按钮 HTML
   */
  MO.errorState = function errorState(title, body, actions) {
    return `<div class="alert" role="alert">
      <p class="alert-title">${MO.esc(title)}</p>
      <p class="alert-body">${MO.esc(body)}</p>
      ${actions === undefined || actions === '' ? '' : `<div class="alert-actions">${actions}</div>`}
    </div>`;
  };

  /** 空态：不是一句灰字，而是标题 + 解释 + 出口。 */
  MO.emptyState = function emptyState(title, body, actions) {
    return `<div class="empty">
      <p class="empty-title">${MO.esc(title)}</p>
      <p class="empty-body">${MO.esc(body)}</p>
      ${actions === undefined || actions === '' ? '' : `<div class="empty-actions">${actions}</div>`}
    </div>`;
  };

  /** 提示条：tint 底 + 圆点信号，不用左侧彩边。 */
  MO.notice = function notice(title, text, tone) {
    const attr = tone === undefined || tone === '' ? '' : ` data-tone="${MO.esc(tone)}"`;
    return `<div class="notice"${attr}>
      <p class="notice-title">${MO.esc(title)}</p>
      <p class="notice-text">${MO.esc(text)}</p>
    </div>`;
  };

  /**
   * 就地反馈：不弹 toast、不盖住内容。
   * @param result  { ok, text }
   * @param undoable 为 true 时附带一个真实的撤销按钮（不许伪造承诺）。
   */
  MO.inlineResult = function inlineResult(result, undoable) {
    if (result === null || result === undefined) return '';
    const undo = undoable === true
      ? `<button class="textlink" data-action="undo-capture">撤销</button>`
      : '';
    return `<div class="inline-done" data-tone="${result.ok ? 'ok' : 'err'}" role="status">
      <span class="inline-done-text">${MO.esc(result.text)}</span>
      ${undo}
    </div>`;
  };

  /**
   * 主按钮（每屏唯一蓝实底）。
   * small=true 降为 T5 尺寸——用于行内动作，避免一行按钮喧宾夺主。
   */
  MO.primary = function primary(text, attrs, disabled, small) {
    const cls = small === true ? 'btn btn-primary btn-sm' : 'btn btn-primary';
    return `<button class="${cls}" ${attrs || ''}${disabled === true ? ' disabled' : ''}>${MO.esc(text)}</button>`;
  };

  /** 次级按钮。 */
  MO.button = function button(text, attrs, extraClass) {
    const cls = extraClass === undefined || extraClass === '' ? 'btn' : `btn ${extraClass}`;
    return `<button class="${cls}" ${attrs || ''}>${MO.esc(text)}</button>`;
  };

  /** 文字链。 */
  MO.textLink = function textLink(text, attrs) {
    return `<button class="textlink" ${attrs || ''}>${MO.esc(text)}</button>`;
  };
})();
