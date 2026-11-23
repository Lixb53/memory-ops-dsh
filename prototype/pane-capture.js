/* ============================================================
 * pane-capture.js —— 分区「记一条」
 *
 * 唯一核心任务：写进 INBOX 并看到它进去了。
 * 主操作（存进去）在中栏输入框下方——全页唯一实心块，顶条不出现主操作。
 * ============================================================ */

window.MO = window.MO || {};

MO.renderCapture = function (data, ctx) {
  if (ctx.phase === 'loading') return MO.skeleton(3, '读取中：正在取最近记的');
  if (ctx.phase === 'error') {
    return MO.errorBlock({
      title: '读不到最近记录',
      text: 'INBOX 写入仍可用，但「最近记的」这一栏读不到。写入前会先校验隐私。',
      example: '#capture/正常 重新查询'
    });
  }
  if (ctx.phase === 'empty') {
    return MO.empty({
      title: '今天还没记任何一条',
      text: '记一条只要一句话。它会先落进 INBOX，等你确认后才成为记忆。',
      hint: 'INBOX 当前 0 条 open',
      action: { act: 'focus-capture', label: '写第一条' }
    });
  }

  var kinds = ['想法', '计划', '问题', '待办', '决策'];
  var kindBtns = kinds.map(function (k) {
    return '<button type="button" class="kindbtn" data-kind="' + k + '" aria-pressed="' + (ctx.kind === k ? 'true' : 'false') + '">' + k + '</button>';
  }).join('');

  var recent = data.recent.map(function (item) {
    return MO.row({
      id: item.id,
      title: item.title,
      meta: item.meta,
      source: 'INBOX',
      tokens: item.tokens,
      status: '待确认',
      tone: 'idle',
      dense: true
    });
  }).join('');

  var done = ctx.done
    ? '<div class="inline-done"><span class="tonebar-inline tone-ok"></span><span>' +
      MO.esc(ctx.done) + '</span><button type="button" class="textlink" data-act="undo">撤销</button></div>'
    : '';

  return '' +
    '<div class="pane-inner capture-box">' +
      '<form id="captureForm" novalidate>' +
        '<div class="toolbar" role="group" aria-label="类型">' + kindBtns + '</div>' +
        '<label class="sr-only" for="captureText">要记的内容</label>' +
        '<textarea class="capture-input" id="captureText" aria-label="要记的内容" placeholder="一句话就够。例：宿主对 git 直装判 not-updatable，更新要给出人话解释">' + MO.esc(ctx.draft || '') + '</textarea>' +
        '<p class="capture-note">会先落进 <span class="num">personal/INBOX.md</span>，状态 open；密钥、私钥、身份证、内网 IP 会被拦下。</p>' +
        '<div class="capture-actions">' +
          '<button type="submit" class="btn-ink" id="captureSubmit"' + (ctx.capturePending ? ' disabled' : '') + '>' + (ctx.capturePending ? '写入中' : '存进去') + '</button>' +
          '<span class="section-note num" id="captureCount">' + (ctx.draft ? MO.estTokens(ctx.draft) : 0) + ' tokens</span>' +
        '</div>' +
      '</form>' +
      done +
      '<div class="section-head">' +
        '<h2 class="section-title">最近记的</h2>' +
        '<span class="section-note num">3 条 · 未确认 · 右列 tokens</span>' +
      '</div>' +
      '<ul class="rows" role="list">' + recent + '</ul>' +
    '</div>';
};

MO.inspectCapture = function (data, ctx) {
  if (ctx.captureError) {
    return {
      title: '这条被隐私闸门拦下',
      sub: '未写入任何文件',
      body: '<dl class="props">' +
        '<div class="prop"><dt>命中</dt><dd>' + MO.esc(ctx.captureError) + '</dd></div>' +
        '</dl><p class="insp-text">脱敏后可以重存：把值换成占位符（如 <span class="num">sk-***</span>），原文不要进库。</p>',
      foot: '<button type="button" class="btn-ghost" data-act="mask">填入脱敏文本</button>'
    };
  }
  if (ctx.done) {
    return {
      title: '已存进 INBOX',
      sub: 'personal/INBOX.md',
      body: '<dl class="props">' +
        '<div class="prop"><dt>状态</dt><dd>open</dd></div>' +
        '<div class="prop"><dt>位置</dt><dd>personal/INBOX.md 末行</dd></div>' +
        '<div class="prop"><dt>下一步</dt><dd>在「待办 · 流转」里改成 todo</dd></div>' +
        '</dl><p class="insp-text">要在库里生效，需要人确认；系统不会自动把它变成记忆。</p>',
      foot: '<button type="button" class="textlink" data-act="undo">撤销这次写入</button>'
    };
  }
  return {
    title: '记一条',
    sub: 'INBOX → 人确认 → 记忆',
    body: '<p class="insp-text">三条规矩：先写 INBOX，不直接落档；隐私命中不写入；写入是原子追加，并发不会出现半行。</p>' +
      '<dl class="props">' +
        '<div class="prop"><dt>类型</dt><dd>想法 / 计划 / 问题 / 待办 / 决策</dd></div>' +
        '<div class="prop"><dt>状态机</dt><dd>open → todo → done / dropped</dd></div>' +
      '</dl>',
    foot: ''
  };
};

/**
 * 提交捕获。异步 + 防重复提交：
 * 先判 disabled（disabled 不拦截 Enter），再判空。
 */
MO.submitCapture = function (state, announce, rerender) {
  var form = document.getElementById('captureForm');
  if (!form) return;
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var btn = document.getElementById('captureSubmit');
    var input = document.getElementById('captureText');
    if (!btn || !input) return;
    if (btn.disabled) return;
    var text = input.value;
    if (text.trim() === '') {
      state.captureError = '';
      announce('内容为空，未写入');
      rerender();
      return;
    }
    var hit = MO.findPrivacyHit(text);
    if (hit) {
      state.captureError = hit;
      state.done = '';
      announce('隐私闸门拦下，未写入');
      rerender();
      return;
    }
    btn.disabled = true;
    btn.textContent = '写入中';
    state.capturePending = true;
    rerender();
    window.setTimeout(function () {
      state.capturePending = false;
      state.done = '已存入 personal/INBOX.md（第 43 行）';
      state.captureError = '';
      state.draft = '';
      if (btn.isConnected) {
        btn.disabled = false;
        btn.textContent = '存进去';
      }
      announce('已存入 INBOX');
      rerender();
    }, 700);
  });
};

/** 隐私闸门的最小实现（与 core/privacy.ts 的判据同构：只做拦截，不做改写）。 */
MO.findPrivacyHit = function (text) {
  if (/sk-[A-Za-z0-9]{8,}/.test(text)) return '疑似 API Key（sk-…）';
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text)) return '私钥块';
  if (/\b\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[0-9Xx]\b/.test(text)) return '身份证号';
  if (/\b(10|127|192\.168|172\.(1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(text)) return '内网 IP';
  return '';
};