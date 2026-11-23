/* ============================================================
 * ui.js —— 纯函数工具层（无 DOM 依赖，便于单测与复用）
 *
 * 约定：
 *   · 所有 HTML 片段由这里或 pane 文件拼装，必须自行转义
 *   · MO.figure 的实参必须是数字或 '—'（lint 机检 T0 只给数字）
 *   · MO.lede 的实参 ≤20 字（lint 机检判定句长度）
 * ============================================================ */

window.MO = window.MO || {};

/** HTML 转义。用户内容一律过这里。 */
MO.esc = function (value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
  });
};

/** 数字：null / undefined 显示「—」，不许显示 0（error ≠ empty ≠ 0）。 */
MO.num = function (n) {
  if (n === null || n === undefined) return '—';
  var v = Number(n);
  if (!isFinite(v)) return '—';
  return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/** 全页唯一的 T0 读数：只接受数字或 '—'。 */
MO.figure = function (v) {
  return '<span class="t0 num" id="figure">' + MO.num(v) + '</span>';
};

/** 判定句：≤20 字，单行。 */
MO.lede = function (text) {
  return '<p class="lede" id="lede">' + MO.esc(text) + '</p>';
};

/**
 * token 估算：CJK 1 字 ≈ 1 token，其余 4 字符 ≈ 1 token。
 * 与 core/schema.ts 的 estimateTokens 同口径；状态条必须声明这是估算。
 */
MO.estTokens = function (text) {
  var s = String(text == null ? '' : text);
  var cjk = (s.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
  var rest = s.length - cjk;
  return Math.round(cjk + rest / 4);
};

/** 状态 → 刻度色。文字状态词必须同时出现（不只靠颜色）。 */
MO.toneOf = function (tone) {
  if (tone === 'warn' || tone === 'err' || tone === 'ok') return tone;
  return 'idle';
};

/** 按 id 在数组里取一项；找不到返回 null（不抛错，调用方给空态）。 */
MO.pick = function (list, id) {
  var arr = list || [];
  for (var i = 0; i < arr.length; i += 1) {
    if (arr[i] && arr[i].id === id) return arr[i];
  }
  return null;
};

/** 一行清单：标题 + 元信息 + 四列（标题 / 来源 / 数字 / 状态）。 */
MO.row = function (opt) {
  var tone = MO.toneOf(opt.tone);
  var current = opt.current ? ' aria-current="true"' : '';
  var id = MO.esc(opt.id);
  return '' +
    '<li class="row-item">' +
      '<button type="button" class="row-button" data-select="' + id + '"' + current + '>' +
        '<span class="tonebar tone-' + tone + '"></span>' +
        '<span class="row-title' + (opt.dense ? ' dense' : '') + '">' + MO.esc(opt.title) + '</span>' +
        '<span class="row-col row-col-src">' + MO.esc(opt.source || '') + '</span>' +
        '<span class="row-col row-col-num num">' + MO.num(opt.num !== undefined ? opt.num : opt.tokens) + '</span>' +
        '<span class="row-col row-col-state"><span class="tonebar-inline tone-' + tone + '"></span>' + MO.esc(opt.state || opt.status || '') + '</span>' +
        '<span class="row-meta">' + MO.esc(opt.meta || '') + '</span>' +
      '</button>' +
    '</li>';
};

/** 骨架行：与真实行等高，不位移。 */
MO.skeleton = function (n, label) {
  var out = '<div class="skel-wrap" role="presentation">';
  for (var i = 0; i < n; i += 1) out += '<div class="skel-row"></div>';
  out += '<p class="skel-note">' + MO.esc(label || '读取中') + '</p>';
  out += '</div>';
  return out;
};

/** 空态：说真话 + 给出口，不画插画。 */
MO.empty = function (opt) {
  return '' +
    '<div class="state-block state-empty">' +
      '<h2 class="state-title">' + MO.esc(opt.title) + '</h2>' +
      '<p class="state-text">' + MO.esc(opt.text) + '</p>' +
      (opt.hint ? '<p class="state-hint num">' + MO.esc(opt.hint) + '</p>' : '') +
      (opt.action ? '<button type="button" class="btn-ghost" data-act="' + MO.esc(opt.action.act) + '">' + MO.esc(opt.action.label) + '</button>' : '') +
    '</div>';
};

/** 错误态：原因 + 下一步 + 示例值。 */
MO.errorBlock = function (opt) {
  return '' +
    '<div class="state-block state-error" role="alert">' +
      '<h2 class="state-title">' + MO.esc(opt.title) + '</h2>' +
      '<p class="state-text">' + MO.esc(opt.text) + '</p>' +
      (opt.example ? '<p class="state-hint num">示例：' + MO.esc(opt.example) + '</p>' : '') +
      '<button type="button" class="btn-ghost" data-act="retry">重试</button>' +
    '</div>';
};