/* ============================================================
 * pane-todo.js —— 分区「待办」
 *
 * 唯一核心任务：清掉压着的事。
 * 三段不改语义，只改顺序：待拍板 → 流转中 → 待补库（人的动作在前，机器建议在后）。
 * ============================================================ */

window.MO = window.MO || {};

MO.renderTodo = function (data, ctx) {
  if (ctx.phase === 'loading') return MO.skeleton(5, '读取中：正在取三段台账');
  if (ctx.phase === 'error') {
    return MO.errorBlock({
      title: '读不到待办',
      text: '状态机查询失败（E_STATE）。已确认的条目不会丢，重新查询即恢复。',
      example: '#todo/正常 重新查询'
    });
  }
  if (ctx.phase === 'empty') {
    return MO.empty({
      title: '三段都空了',
      text: '没有待拍板、没有流转中、没有待补库。这是库健康的样子，不是故障。',
      hint: '待拍板 0 · 流转中 0 · 待补库 0',
      action: { act: 'go-memory', label: '去看记忆' }
    });
  }

  function section(key, title, note, group, items) {
    var rows = items.map(function (item) {
      return MO.row({
        id: item.id,
        title: item.title,
        meta: item.meta,
        source: group,
        tokens: item.tokens,
        state: item.status,
        tone: item.tone,
        current: ctx.sel.todo === item.id
      });
    }).join('');
    return '' +
      '<div class="section-head">' +
        '<h2 class="section-title">' + title + '</h2>' +
        '<span class="section-note num">' + note + '</span>' +
      '</div>' +
      '<ul class="rows" role="list">' + rows + '</ul>';
  }

  return '' +
    '<div class="pane-inner">' +
      section('decide', '待拍板', data.todo.decide.length + ' 条 · 只有人能定 · 右列 tokens', '拍板', data.todo.decide) +
      section('flow', '流转中', data.todo.flow.length + ' 条 · 超过 7 天会降权 · 右列 tokens', '流转', data.todo.flow) +
      section('refill', '待补库', data.todo.refill.length + ' 条 · 缺的比多的更值得看 · 右列 tokens', '补库', data.todo.refill) +
    '</div>';
};

MO.inspectTodo = function (data, ctx) {
  var all = data.todo.decide.concat(data.todo.flow, data.todo.refill);
  var item = MO.pick(all, ctx.sel.todo);
  if (!item) {
    return {
      title: '选一条待办',
      sub: '左边点一行，这里出动作',
      body: '<p class="insp-text">待拍板的条目只有人能改状态；系统自动爬升最多到「观察到」，不会替你确认。</p>',
      foot: ''
    };
  }

  var isDecide = data.todo.decide.indexOf(item) >= 0;
  var body = '' +
    '<dl class="props">' +
      '<div class="prop"><dt>状态</dt><dd>' + MO.esc(item.status) + '</dd></div>' +
      '<div class="prop"><dt>体积</dt><dd>' + MO.num(item.tokens) + ' tokens</dd></div>' +

    '</dl>' +
    '<p class="insp-text">' + MO.esc(item.detail) + '</p>';

  if (isDecide) {
    body += '<p class="insp-label">驳回要写理由（30 天内不再注入）</p>' +
      '<label class="sr-only" for="reasonInput">驳回理由</label>' +
      '<textarea class="reason-input" id="reasonInput" aria-label="驳回理由" placeholder="例：这条只对某个分支成立，不该进个人域">' + MO.esc(ctx.reason || '') + '</textarea>';
  }

  if (ctx.todoDone) {
    body += '<div class="verdicts"><div class="verdict verdict-ok"><span class="verdict-tag">完成</span><span>' +
      MO.esc(ctx.todoDone) + '</span></div></div>';
  }

  var foot = isDecide
    ? '<button type="button" class="btn-ghost" data-act="reject">驳回</button>' +
      '<button type="button" class="btn-ink" data-act="confirm">确认</button>'
    : '<button type="button" class="btn-ghost" data-act="keep">再留 90 天</button>' +
      '<button type="button" class="btn-ink" data-act="archive">归档</button>';

  return {
    title: item.title,
    sub: item.meta.split(' · ').pop(),
    body: body,
    foot: foot
  };
};