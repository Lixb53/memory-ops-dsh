/* ============================================================
 * pane-today.js —— 分区「今天」
 *
 * 唯一核心任务：1 秒知道先做哪件事。
 * 中栏：上带（在 app.js）+ 线索清单 + 捕获入口；检视栏：选中线索的详情与动作。
 * 四态必须齐（assert-structure 按 phase === '...' 字面量机检）。
 * ============================================================ */

window.MO = window.MO || {};

MO.renderToday = function (data, ctx) {
  if (ctx.phase === 'loading') return MO.skeleton(4, '读取中：正在汇总线索');
  if (ctx.phase === 'error') {
    return MO.errorBlock({
      title: '读不到今天的线索',
      text: '宿主桥返回 500（E_BUSY）。线索不会消失，重建索引后重新查询即可。',
      example: '点下面的「重试」；仍失败就去看 ~/.memory-ops 是否可读'
    });
  }
  if (ctx.phase === 'empty') {
    return MO.empty({
      title: '现在没有压着的事',
      text: '待拍板 0 条、未命中 0 条、到期 0 条。下一次捕获会出现在这里。',
      hint: 'INBOX 当前 0 条 open',
      action: { act: 'go-capture', label: '记一条' }
    });
  }

  var rows = data.clues.map(function (item) {
    return MO.row({
      id: item.id,
      title: item.title,
      meta: item.meta,
      source: item.group,
      tokens: item.tokens,
      state: item.status,
      tone: item.tone,
      current: ctx.sel.today === item.id
    });
  }).join('');

  return '' +
    '<div class="pane-inner">' +
      '<div class="section-head">' +
        '<h2 class="section-title">线索</h2>' +
        '<span class="section-note num">5 条 · 按该动手的顺序 · 右列 tokens</span>' +
      '</div>' +
      '<ul class="rows" role="list">' + rows + '</ul>' +
      '<div class="section-head">' +
        '<h2 class="section-title">随手记</h2>' +
        '<span class="section-note num">先落 INBOX，等你确认</span>' +
      '</div>' +
      '<div class="toolbar">' +
        '<label class="sr-only" for="todayCapture">随手记一句</label>' +
        '<input class="field" id="todayCapture" type="text" aria-label="随手记一句" placeholder="一句话就够。例：宿主对 git 直装判 not-updatable">' +
        '<button type="button" class="btn" data-act="today-save">存</button>' +
      '</div>' +
    '</div>';
};

MO.inspectToday = function (data, ctx) {
  var item = MO.pick(data.clues, ctx.sel.today);
  if (!item) {
    return {
      title: '选一条线索',
      sub: '左边点一行，这里出详情与动作',
      body: '<p class="insp-text">线索按「该动手的顺序」排：待拍板 → 缺的条目 → 该整理的 → 成本 → 流转。</p>',
      foot: ''
    };
  }
  var body = '' +
    '<dl class="props">' +
      '<div class="prop"><dt>状态</dt><dd>' + MO.esc(item.status) + '</dd></div>' +
      '<div class="prop"><dt>体积</dt><dd>' + MO.num(item.tokens) + ' tokens</dd></div>' +
    '</dl>' +
    '<p class="insp-text">' + MO.esc(item.detail) + '</p>';

  if (ctx.phase === 'error') {
    body += '<div class="verdicts"><div class="verdict verdict-warn">' +
      '<span class="verdict-tag">注意</span><span>这是上一轮缓存的内容，动作会失败；先重试。</span></div></div>';
  }

  var foot = '' +
    '<button type="button" class="btn-ghost" data-act="dismiss">先不管</button>' +
    '<button type="button" class="btn-ink" data-act="clue-primary">' + MO.esc(item.action) + '</button>';

  return {
    title: item.title,
    sub: item.source,
    body: body,
    foot: foot
  };
};