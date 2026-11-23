/* ============================================================
 * pane-health.js —— 分区「库健康」
 *
 * 唯一核心任务：判断贵不贵、该不该维护。
 * 中栏：四桶 meter + 桶行（V1）+ 版本入口（V3）+ 维护作业。
 * 检视栏：桶 → 条目级明细（V1）→ 置顶编辑（V2，diff 上下叠）；版本 → 五项 + 检查三态 + 差异清单。
 * ============================================================ */

window.MO = window.MO || {};

MO.renderHealth = function (data, ctx) {
  if (ctx.phase === 'loading') return MO.skeleton(5, '读取中：正在取常驻构成与版本');
  if (ctx.phase === 'error') {
    return MO.errorBlock({
      title: '读不到常驻构成',
      text: 'skills 读取失败（E_SKILLS）。「读不到」不等于「没有」：数字显示「—」，不显示 0。',
      example: '点下面的「重试」，或检查 ~/.dsh/skills 是否存在'
    });
  }
  if (ctx.phase === 'empty') {
    return MO.empty({
      title: '没有任何常驻内容',
      text: '没有 skill description，也没有置顶条目。此时每请求只剩目录框架。',
      hint: 'catalog 0 · injected 0 · frame 171',
      action: { act: 'go-capture', label: '去写第一条' }
    });
  }

  var res = data.resident;
  var total = res.total;

  /* 四桶分段：只统计可计算占比的桶；不可读的 schema 不上 meter（A17） */
  var segs = res.buckets.filter(function (b) {
    return b.tokens !== null && b.tokens > 0;
  }).map(function (b) {
    var pct = Math.round((b.tokens / total) * 100);
    var kind = b.kind === 'injected' ? 'own' : 'fixed';
    return '<span class="meter-seg meter-' + kind + '" style="width:' + pct + '%" title="' + MO.esc(b.name) + ' ' + b.tokens + ' tokens"></span>';
  }).join('');

  var legend = res.buckets.map(function (b) {
    var share = b.tokens === null ? '不可读' : Math.round((b.tokens / total) * 100) + '%';
    var tone = b.tokens === null ? 'err' : (b.tokens > 0 ? 'ok' : 'idle');
    return '<span class="legend-item"><span class="tonebar-inline tone-' + tone + '"></span>' +
      MO.esc(b.name) + ' ' + (b.tokens === null ? '—' : MO.num(b.tokens)) + ' · ' + share + '</span>';
  }).join('');

  var meter = '' +
    '<div class="meter-wrap">' +
      '<div class="meter" role="img" aria-label="常驻前缀按四桶分段：框架 171，置顶 65，合计 236；工具 schema 不可读不计入">' + segs + '</div>' +
      '<div class="meter-legend">' + legend + '</div>' +
      '<p class="check-line">171 + 65 = 236（对得上；不含工具 schema：当前不可读）</p>' +
    '</div>';

  var bucketRows = res.buckets.map(function (b) {
    var tone = b.state === 'error' ? 'err' : (b.state === 'empty' ? 'idle' : 'ok');
    var numText = b.tokens === null ? '不可读' : MO.num(b.tokens) + ' tokens';
    var cur = ctx.sel.health === b.id ? ' aria-current="true"' : '';
    return '' +
      '<li class="row-item">' +
        '<button type="button" class="bucket-row" data-select="' + MO.esc(b.id) + '"' + cur + '>' +
          '<span class="tonebar tone-' + tone + '"></span>' +
          '<span class="bucket-name">' + MO.esc(b.name) + ' <span class="num bucket-en">' + MO.esc(b.en) + '</span></span>' +
          '<span class="bucket-num' + (b.tokens === null ? ' is-unknown' : '') + '">' + numText + '</span>' +
          '<span class="bucket-note">' + MO.esc(b.note || '') + '</span>' +
        '</button>' +
      '</li>';
  }).join('');

  var v = data.version;
  var versionRow = '' +
    '<ul class="bucket-rows" role="list">' +
      '<li><button type="button" class="bucket-row" data-select="version"' + (ctx.sel.health === 'version' ? ' aria-current="true"' : '') + '>' +
        '<span class="tonebar tone-idle"></span>' +
        '<span class="bucket-name">版本与更新</span>' +
        '<span class="bucket-num num">' + MO.esc(v.version) + '</span>' +
        '<span class="bucket-note">' + MO.esc(v.install) + ' 安装 · 目标：宿主不列出版本 · 点这里看五项与差异</span>' +
      '</button></li>' +
    '</ul>';

  var ops = '' +
    '<ul class="bucket-rows" role="list">' +
      '<li><button type="button" class="bucket-row ops-row" data-act="check-anchors"><span class="bucket-name">核对引用</span><span class="bucket-num">0 条可核对</span></button></li>' +
      '<li><button type="button" class="bucket-row ops-row" data-act="compact"><span class="bucket-name">变短</span><span class="bucket-num">可省 0 行</span></button></li>' +
      '<li><button type="button" class="bucket-row ops-row" data-act="review"><span class="bucket-name">每周复盘</span><span class="bucket-num">只读</span></button></li>' +
    '</ul>';

  return '' +
    '<div class="pane-inner">' +
      '<div class="section-head"><h2 class="section-title">每请求都付的部分</h2><span class="section-note num">236 tokens</span></div>' +
      meter +
      '<ul class="bucket-rows" role="list">' + bucketRows + '</ul>' +
      '<div class="section-head"><h2 class="section-title">版本与更新</h2><span class="section-note">更新由宿主执行</span></div>' +
      versionRow +
      '<div class="section-head"><h2 class="section-title">维护作业</h2><span class="section-note">按需触发，不常驻</span></div>' +
      ops +
    '</div>';
};

MO.inspectHealth = function (data, ctx) {
  var banner = ctx.saved
    ? '<div class="verdicts"><div class="verdict verdict-ok"><span class="verdict-tag">已保存</span><span>' + MO.esc(ctx.saved) + '</span></div></div>'
    : '';
  if (ctx.sel.health === 'version') return MO.inspectVersion(data, ctx);
  if (ctx.edit) return MO.inspectEdit(data, ctx, banner);

  var bucket = MO.pick(data.resident.buckets, ctx.sel.health);
  if (!bucket) {
    return {
      title: '选一个桶',
      sub: '左边点一行，这里出条目级明细',
      body: banner + '<p class="insp-text">四桶之和必须等于顶栏那个数。对不上时，这一栏会写出差额和原因，而不是悄悄取整。</p>',
      foot: ''
    };
  }

  if (bucket.state === 'error') {
    return {
      title: bucket.name + ' · 不可读',
      sub: 'state = error',
      body: banner + '<div class="verdicts"><div class="verdict verdict-refuse">' +
        '<span class="verdict-tag">原因</span><span>' + MO.esc(bucket.note) + '</span></div></div>' +
        '<p class="insp-text">合计行已写明「不含工具 schema」。把不可读渲染成 0，会让人以为已经算全了。</p>',
      foot: '<button type="button" class="btn-ghost" data-act="retry">重试读取</button>'
    };
  }

  if (bucket.state === 'empty') {
    return {
      title: bucket.name + ' · 空',
      sub: 'state = empty（不是 error）',
      body: banner + '<div class="verdicts"><div class="verdict verdict-ok">' +
        '<span class="verdict-tag">空</span><span>' + MO.esc(bucket.note) + '</span></div></div>' +
        '<p class="insp-text">确实一条都没有。这和「读不到」是两种状态，文案不许合并。</p>',
      foot: ''
    };
  }

  var items = bucket.items.map(function (item) {
    var pct = bucket.tokens ? Math.round((item.tokens / bucket.tokens) * 100) : 0;
    var injected = item.injected === true
      ? '<div class="verdict verdict-ok"><span class="verdict-tag">注入</span><span>已进系统提示词</span></div>'
      : '<div class="verdict verdict-warn"><span class="verdict-tag">跳过</span><span>' + MO.esc(item.skip || '超出段预算') + '</span></div>';
    var editBtn = item.pinned
      ? '<button type="button" class="textlink" data-act="edit" data-id="' + MO.esc(item.id) + '">去编辑</button>'
      : '<span class="verdict-tag">只读</span>';
    return '' +
      '<div class="section-head"><h2 class="section-title">' + MO.esc(item.name) + '</h2><span class="section-note num">' + MO.num(item.tokens) + ' · ' + pct + '%</span></div>' +
      '<dl class="props">' +
        '<div class="prop"><dt>来源</dt><dd>' + MO.esc(item.source) + '</dd></div>' +
        '<div class="prop"><dt>可改</dt><dd>' + (item.pinned ? '可编辑（写库）' : '只读（宿主生成）') + '</dd></div>' +
      '</dl>' +
      '<div class="verdicts">' + injected + '<div class="verdict"><span class="verdict-tag">操作</span>' + editBtn + '</div></div>';
  }).join('');

  return {
    title: bucket.name,
    sub: bucket.en + ' · ' + (bucket.tokens === null ? '不可读' : MO.num(bucket.tokens) + ' tokens'),
    body: banner + items,
    foot: bucket.kind === 'injected'
      ? '<button type="button" class="btn-ghost" data-act="fold-budget">折起顶带</button>'
      : ''
  };
};

/* —— V2：置顶条目编辑（diff 上下叠 + tokens Δ + 生效时机）—— */
MO.inspectEdit = function (data, ctx, banner) {
  var injected = MO.pick(data.resident.buckets, 'injected');
  var item = MO.pick(injected.items, ctx.edit.id) || injected.items[1];
  var original = item.name;
  var draft = ctx.edit.draft;
  var before = item.tokens;
  var after = MO.estTokens(draft);
  var delta = after - before;
  var changed = draft !== original;
  var verdicts = MO.judge(draft, after);
  var failed = ctx.phase === 'error';

  var diff = changed
    ? '<div class="diff" aria-label="改动对照">' +
        '<div class="diff-line diff-removed"><span class="diff-no num">1</span><span class="diff-text">' + MO.esc(original) + '</span></div>' +
        '<div class="diff-line diff-added"><span class="diff-no num">1</span><span class="diff-text">' + MO.esc(draft || '（空）') + '</span></div>' +
      '</div>'
    : '<p class="check-line">未改动：草稿与原文逐字一致（Δ 0），不画假 diff</p>';

  var deltaText = (delta > 0 ? '+' : '') + delta;
  var verdictHtml = verdicts.refuse.map(function (t) {
    return '<div class="verdict verdict-refuse"><span class="verdict-tag">拒</span><span>' + MO.esc(t) + '</span></div>';
  }).join('') + verdicts.warn.map(function (t) {
    return '<div class="verdict verdict-warn"><span class="verdict-tag">警</span><span>' + MO.esc(t) + '</span></div>';
  }).join('');

  var body = (banner || '') +
    '<p class="insp-label">标题</p>' +
    '<label class="sr-only" for="pinTitle">置顶条目标题</label>' +
    '<input class="title-input" id="pinTitle" aria-label="置顶条目标题" value="' + MO.esc(draft) + '">' +
    '<p class="insp-label">改动对照</p>' +
    diff +
    '<dl class="props">' +
      '<div class="prop"><dt>tokens</dt><dd>' + MO.num(before) + ' → ' + MO.num(after) + '（Δ ' + deltaText + '）</dd></div>' +
      '<div class="prop"><dt>来源</dt><dd>' + MO.esc(item.source) + '</dd></div>' +
      '<div class="prop"><dt>条数</dt><dd>1 条（改标题不改 id）</dd></div>' +
    '</dl>' +
    '<div class="verdicts">' + (verdictHtml || '<div class="verdict verdict-ok"><span class="verdict-tag">通过</span><span>可保存</span></div>') + '</div>' +
    '<p class="effect">生效时机：新会话生效；当前会话保持原样（按会话冻结，避免作废缓存）</p>';

  if (failed) {
    body += '<div class="verdicts"><div class="verdict verdict-refuse"><span class="verdict-tag">阻断</span>' +
      '<span>读不到库：先重试，再编辑。错误态下不给可写回的按钮。</span></div></div>';
  }

  var canSave = verdicts.refuse.length === 0 && !ctx.saving && !failed;
  var foot = '' +
    '<button type="button" class="btn-ghost" data-act="cancel-edit">取消</button>' +
    '<button type="button" class="btn-ghost" data-act="unpin">取消置顶</button>' +
    '<button type="button" class="btn-ink" id="savePin" data-act="save-pin"' + (canSave ? '' : ' disabled') + '>' +
      (ctx.saving ? '保存中' : '保存') + '</button>';

  return {
    title: '编辑置顶条目',
    sub: 'pinned · ' + MO.esc(item.id),
    body: body,
    foot: foot
  };
};

/* —— V3：版本五项 + 检查三态 + 差异清单 —— */
MO.inspectVersion = function (data, ctx) {
  var v = data.version;
  var host = ctx.hostMode;
  var state = ctx.check;

  var five = '<dl class="props">' +
    '<div class="prop"><dt>当前版本</dt><dd>' + MO.esc(v.version) + '</dd></div>' +
    '<div class="prop"><dt>代码来源</dt><dd>' + MO.esc(v.spec) + '</dd></div>' +
    '<div class="prop"><dt>安装方式</dt><dd>' + MO.esc(v.install) + '</dd></div>' +
    '<div class="prop"><dt>当前提交</dt><dd>' + MO.esc(v.commit) + '</dd></div>' +
    '<div class="prop"><dt>目标</dt><dd>' + (v.target ? MO.esc(v.target) : '宿主不列出版本（安装源非 registry）') + '</dd></div>' +
    '</dl>';

  var body = five;
  var foot = '';

  if (state === 'unchecked') {
    body += '<p class="insp-text">还没检查。目标与差异都显示「—（未检查）」，不预填「最新 tag / N 条差异」——没查到不等于没有更新。</p>' +
      '<dl class="props"><div class="prop"><dt>目标</dt><dd>—（未检查）</dd></div>' +
      '<div class="prop"><dt>差异</dt><dd>—（未检查）</dd></div></dl>';
    foot = '<button type="button" class="btn-ghost" data-act="check-update">检查更新</button>';
  } else if (state === 'checking') {
    body += MO.skeleton(2, '检查中：最多等 8 秒');
    foot = '<button type="button" class="btn-ghost" data-act="check-update" disabled>检查中</button>';
  } else if (state === 'failed') {
    body += '<div class="verdicts"><div class="verdict verdict-refuse"><span class="verdict-tag">失败</span>' +
      '<span>网络不可达：代理未生效（30 秒无响应）。</span></div></div>' +
      '<p class="insp-text">没有查到任何版本信息。此时不许显示「已是最新」。</p>' +
      '<p class="check-line">结果来源：自己检查 · 时刻 ' + MO.esc(ctx.checkedAt || '') + '</p>';
    foot = '<button type="button" class="btn-ghost" data-act="check-update">重试</button>';
  } else if (host) {
    var diffRows = [
      { sha: 'd2f9a01', title: '常驻前缀拆四桶，置顶逐条可见', date: '2026-11-19' },
      { sha: '9c41b77', title: '编辑置顶标题，保存前给 diff 与 Δ', date: '2026-11-18' },
      { sha: '5b7e320', title: '版本页复用宿主结果，补提交差异', date: '2026-11-17' },
      { sha: 'a1d3f45', title: '差异清单不可验证时不出条目', date: '2026-11-16' },
      { sha: '7e2c908', title: '修「读不到」被渲染成 0', date: '2026-11-15' },
      { sha: 'c4b52d1', title: 'frontmatter 往返检查在 Windows 上真跑', date: '2026-11-14' },
      { sha: 'ede90cc', title: '/remember 槽位挂错导致弹窗贴底', date: '2026-11-13' }
    ].map(function (d) {
      return '<div class="prop"><dt class="num">' + d.sha + '</dt><dd>' + MO.esc(d.title) + ' · <span class="num">' + d.date + '</span></dd></div>';
    }).join('');

    body += '<div class="verdicts"><div class="verdict verdict-ok"><span class="verdict-tag">可更新</span>' +
      '<span>0.3.0 → 0.4.0 · 发布于 2026-11-19 · 7 个新版本</span></div></div>' +
      '<p class="insp-label">改了什么（逐条可核验）</p>' +
      '<dl class="props">' + diffRows + '</dl>' +
      '<p class="check-line">结果来源：宿主 · 已检查 2 个来源 · ' + MO.esc(ctx.checkedAt || '') + '</p>' +
      '<p class="effect">更新由宿主执行，热更新失败会自动回滚旧版本；这里不提供我们自己的回滚按钮。</p>';
    foot = '<button type="button" class="btn-ghost" data-act="copy-cmd">复制命令</button>' +
      '<button type="button" class="btn-ink" data-act="go-host">去宿主页更新</button>';
  } else {
    body += '<div class="verdicts"><div class="verdict verdict-warn"><span class="verdict-tag">无法比较</span>' +
      '<span>git 安装无法比较版本（宿主原文：installed from Git, which lists no versions）。</span></div></div>' +
      '<p class="insp-text">这不是失败：没有可比较的版本号就不该给你一个「可更新到 X」。先用命令手动更新，需重启。</p>' +
      '<p class="check-line">pnpm add memory-ops-dsh@latest --save-exact</p>';
    foot = '<button type="button" class="btn-ghost" data-act="copy-cmd">复制命令</button>';
  }

  return {
    title: '版本 · ' + MO.esc(v.version),
    sub: 'V3 · 版本五项与差异清单',
    body: body,
    foot: foot
  };
};

/**
 * 校验：拒 / 警 独立判定后汇总，互不短路（PRD R14）。
 * 返回 { refuse: [], warn: [] }，任一 refuse 则禁用保存。
 * 段预算账：骨架 32 + 两条标题 33 = 65 已用，上限 256。
 */
MO.judge = function (text, tokens) {
  var refuse = [];
  var warn = [];
  var value = String(text == null ? '' : text);
  if (value.trim() === '') refuse.push('空标题会让模型拿到一条无意义规则');
  var hit = MO.findPrivacyHit(value);
  if (hit) refuse.push('隐私闸门命中：' + hit);
  if (tokens > 64) warn.push('单条超 64 tokens；超预算条目会被跳过，等于没注入');
  if (value.indexOf('{{') >= 0) warn.push('含 {{：不会做变量插值，原文照发');
  var used = 65 - 18 + tokens;
  if (used > 256) warn.push('置顶合计超 256 tokens 段预算（已用 ' + used + '）；新会话会跳过靠后条目，顺序即优先级');
  return { refuse: refuse, warn: warn };
};