/* ============================================================
 * pane-memory.js —— 分区「记忆」
 *
 * 唯一核心任务：找到某条并处理它。
 * 双面开关（内容面 ⇄ 成本面）只换列集与排序，不换行高（brief §十二-6）。
 * 检索走服务端记账（命中记 recall，真被引用才记 cite）。
 * ============================================================ */

window.MO = window.MO || {};

/** 分类：把长路径压成 3–12 字的归属，路径本身只在检视栏出现。 */
MO.memoryGroup = function (source) {
  if (!source) return '未归类';
  if (source.indexOf('personal/') === 0) return '个人域';
  if (source.indexOf('overview') >= 0) return '项目概要';
  if (source.indexOf('issues') >= 0) return '坑与问题';
  if (source.indexOf('architecture') >= 0) return '架构';
  if (source.indexOf('convention') >= 0) return '约定';
  if (source.indexOf('work/') === 0) return '工作域';
  return '其他';
};

MO.renderMemory = function (data, ctx) {
  if (ctx.phase === 'loading') return MO.skeleton(6, '读取中：正在取全库条目');
  if (ctx.phase === 'error') {
    return MO.errorBlock({
      title: '读不到条目索引',
      text: '索引文件缺失或不可读（work/sz-web/index.md）。条目正文通常还在，重建索引即可。',
      example: '点下面的「重试」；修好后这里会显示 42 条'
    });
  }
  if (ctx.phase === 'empty') {
    return MO.empty({
      title: '这条筛选下没有条目',
      text: '全库 42 条都在，只是当前筛选与关键词没有交集。清掉关键词再看。',
      hint: '筛选：全部 · 关键词：无',
      action: { act: 'clear-filter', label: '清掉筛选' }
    });
  }

  var cost = ctx.face === 'cost';
  var query = (ctx.query || '').trim();
  var rowsData = data.entries.slice();
  if (query) {
    rowsData = rowsData.filter(function (item) {
      return item.title.indexOf(query) >= 0 || item.source.indexOf(query) >= 0 || item.evidence.indexOf(query) >= 0;
    });
  }
  if (cost) {
    rowsData.sort(function (a, b) { return b.tokens - a.tokens; });
  }

  var head = cost
    ? '<div class="table-head"><span>标题</span><span>归属</span><span class="is-num">tokens</span><span>计费</span></div>'
    : '<div class="table-head"><span>标题</span><span>归属</span><span class="is-num">引用</span><span>状态</span></div>';

  var rows = rowsData.map(function (item) {
    return MO.row({
      id: item.id,
      title: item.title,
      meta: '锚点 ' + item.anchor + ' · ' + (cost ? '按需读取，未命中不付费' : '证据：' + item.evidence),
      source: MO.memoryGroup(item.source),
      num: cost ? item.tokens : item.cited,
      state: cost ? item.billing : item.status,
      tone: item.tone,
      current: ctx.sel.memory === item.id
    });
  }).join('');

  var faceSwitch = '' +
    '<div class="faces">' +
      '<div class="face-switch" role="group" aria-label="清单视角">' +
        '<button type="button" class="face-btn" id="faceContent" role="switch" aria-checked="' + (cost ? 'false' : 'true') + '" data-face="content">内容面</button>' +
        '<button type="button" class="face-btn" id="faceCost" role="switch" aria-checked="' + (cost ? 'true' : 'false') + '" data-face="cost">成本面</button>' +
      '</div>' +
      '<span class="face-note">' + (cost ? '按体积降序，回答「哪条最贵」' : '按库内顺序，回答「我存了什么」') + '</span>' +
    '</div>';

  var toolbar = '' +
    '<div class="toolbar">' +
      '<label class="sr-only" for="memorySearch">搜索标题与正文</label>' +
      '<input class="field" id="memorySearch" type="search" aria-label="搜索标题与正文" placeholder="搜标题、路径或证据（会计入命中率）" value="' + MO.esc(ctx.query || '') + '">' +
      '<button type="button" class="btn" data-act="search">搜</button>' +
    '</div>';

  var emptyResult = query
    ? MO.empty({
        title: '没有匹配「' + query + '」的条目',
        text: '这次检索已记一条未命中——未命中会进「待补库」，不是白搜。',
        hint: '全库仍是 42 条',
        action: { act: 'clear-filter', label: '清掉关键词' }
      })
    : '';

  return '' +
    '<div class="pane-inner">' +
      faceSwitch +
      toolbar +
      (query && rowsData.length === 0 ? emptyResult :
        head +
        '<ul class="rows" role="list">' + rows + '</ul>' +
        '<div class="check-line">' + (cost ? '按体积降序 · ' : '库内顺序 · ') + rowsData.length + ' 条 · 个人 7 / 工作 35 · 数字均为估算</div>') +
    '</div>';
};

MO.inspectMemory = function (data, ctx) {
  var item = MO.pick(data.entries, ctx.sel.memory);
  if (!item) {
    return {
      title: '选一条记忆',
      sub: '左边点一行，这里出来源、证据、锚点',
      body: '<p class="insp-text">检索命中会记 recall，真正被引用才记 cite——所以命中率不是 100% 的自夸数。</p>',
      foot: ''
    };
  }

  var body = '' +
    '<dl class="props">' +
      '<div class="prop"><dt>路径</dt><dd>' + MO.esc(item.source) + '</dd></div>' +
      '<div class="prop"><dt>层级</dt><dd>' + MO.esc(item.layer) + ' · ' + MO.esc(item.billing) + '</dd></div>' +
      '<div class="prop"><dt>体积</dt><dd>' + MO.num(item.tokens) + ' tokens</dd></div>' +
      '<div class="prop"><dt>状态</dt><dd>' + MO.esc(item.status) + '</dd></div>' +
      '<div class="prop"><dt>引用</dt><dd>' + MO.num(item.cited) + ' 次（30 天）</dd></div>' +
      '<div class="prop"><dt>锚点</dt><dd>' + MO.esc(item.anchor) + '</dd></div>' +
    '</dl>' +
    '<p class="insp-label">证据</p>' +
    '<p class="insp-text">' + MO.esc(item.evidence) + '</p>';

  if (item.anchor === '该复核') {
    body += '<div class="verdicts"><div class="verdict verdict-warn">' +
      '<span class="verdict-tag">注意</span><span>锚点对不上，检索已降权 0.4；复核通过可恢复。</span></div></div>';
  }

  var foot = item.status === '待退役'
    ? '<button type="button" class="btn-ghost" data-act="keep">再留 90 天</button>' +
      '<button type="button" class="btn-ink" data-act="archive">归档</button>'
    : '<button type="button" class="btn-ghost" data-act="reject">驳回</button>' +
      '<button type="button" class="btn-ink" data-act="confirm">确认</button>';

  return {
    title: item.title,
    sub: MO.memoryGroup(item.source) + ' · ' + MO.num(item.tokens) + ' tokens',
    body: body,
    foot: foot
  };
};