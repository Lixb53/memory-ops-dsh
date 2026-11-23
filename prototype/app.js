/* ============================================================
 * app.js —— 外壳：左轨导航 / 顶条读数 / 双车道带 / 检视栏 / 深链 / 状态
 *
 * 三个承重约束（design/brief.md §八）：
 *   1. 每页恰好 1 个 T0，且只给数字
 *   2. 判定句 ≤20 字、单行
 *   3. 主操作整页唯一：墨块只出现在检视栏底部（记一条除外，它在输入框旁）
 * ============================================================ */

window.MO = window.MO || {};

MO.state = {
  pane: 'today',
  phase: 'normal',
  face: 'content',
  sel: { today: 'c1', capture: '', todo: 'd1', memory: 'm1', health: 'injected' },
  bandFolded: false,
  kind: '决策',
  draft: '',
  done: '',
  captureError: '',
  capturePending: false,
  edit: null,
  saving: false,
  saved: '',
  reason: '',
  todoDone: '',
  check: 'unchecked',
  hostMode: false,
  checkedAt: '',
  query: ''
};

MO.cfg = {
  today: { idx: '01', label: '今天', render: MO.renderToday, inspect: MO.inspectToday, unit: '件要动手' },
  capture: { idx: '02', label: '记一条', render: MO.renderCapture, inspect: MO.inspectCapture, unit: '条今天已记' },
  todo: { idx: '03', label: '待办', render: MO.renderTodo, inspect: MO.inspectTodo, unit: '件压着' },
  memory: { idx: '04', label: '记忆', render: MO.renderMemory, inspect: MO.inspectMemory, unit: '条记忆' },
  health: { idx: '05', label: '库健康', render: MO.renderHealth, inspect: MO.inspectHealth, unit: 'tokens / 请求' }
};

MO.scopeLine = '真实库快照 · personal · work/sz-web';

MO.ctx = function () {
  var s = MO.state;
  return {
    phase: s.phase,
    sel: s.sel,
    face: s.face,
    query: s.query,
    kind: s.kind,
    draft: s.draft,
    done: s.done,
    captureError: s.captureError,
    capturePending: s.capturePending,
    edit: s.edit,
    saving: s.saving,
    saved: s.saved,
    reason: s.reason,
    todoDone: s.todoDone,
    check: s.check,
    hostMode: s.hostMode,
    checkedAt: s.checkedAt
  };
};

/** 判定句：字面量在此集中，长度受 lint 机检（≤20 字）。empty/error 不沿用正常态文案。 */
MO.ledeFor = function (key) {
  if (MO.state.phase === 'empty') {
    if (key === 'today') return MO.lede('现在没有压着的事');
    if (key === 'capture') return MO.lede('今天还没记任何一条');
    if (key === 'todo') return MO.lede('三段都空了');
    if (key === 'memory') return MO.lede('这条筛选下没有条目');
    return MO.lede('没有任何常驻内容');
  }
  if (MO.state.phase === 'error') return MO.lede('读不到数据，先重试');
  if (key === 'today') return MO.lede('3 件要动手，先拍这 2 条');
  if (key === 'capture') return MO.lede('写一条，落进个人 INBOX');
  if (key === 'todo') return MO.lede('8 件压着，先清待拍板');
  if (key === 'memory') return MO.lede('42 条里 3 条 90 天未引用');
  return MO.lede('236 里你能关的只有 65');
};

/** T0 读数：实参必须是数字（lint 机检 T0 只给数字）。error/loading 显示「—」，不许显示 0。 */
MO.figureFor = function (key, data) {
  if (MO.state.phase === 'error' || MO.state.phase === 'loading') return MO.figure('—');
  if (MO.state.phase === 'empty') return MO.figure(0);
  if (key === 'today') return MO.figure(data.counts.urgent);
  if (key === 'capture') return MO.figure(data.counts.todayCaptured);
  if (key === 'todo') return MO.figure(data.counts.pendingDecision + data.counts.inFlight + data.counts.misses);
  if (key === 'memory') return MO.figure(data.counts.entries);
  return MO.figure(data.resident.total);
};

MO.countFor = function (key) {
  if (key === 'today') return MO.data.counts.urgent;
  if (key === 'capture') return MO.data.counts.todayCaptured;
  if (key === 'todo') return MO.data.counts.pendingDecision + MO.data.counts.inFlight + MO.data.counts.misses;
  if (key === 'memory') return MO.data.counts.entries;
  return MO.data.resident.total;
};

MO.announce = function (text) {
  var live = document.getElementById('live');
  if (live) live.textContent = text;
};

MO.render = function () {
  var state = MO.state;
  var key = state.pane;
  var cfg = MO.cfg[key];
  var ctx = MO.ctx();

  /* 左轨 */
  Object.keys(MO.cfg).forEach(function (k) {
    var btn = document.getElementById('tab-' + k);
    if (!btn) return;
    btn.setAttribute('aria-selected', k === key ? 'true' : 'false');
    btn.setAttribute('tabindex', k === key ? '0' : '-1');
    var cnt = document.getElementById('cnt-' + k);
    if (cnt) cnt.textContent = MO.num(MO.countFor(k));
  });
  var panel = document.getElementById('pane-host');
  if (panel) panel.setAttribute('aria-labelledby', 'tab-' + key);

  /* 顶条 */
  var ledeSlot = document.getElementById('ledeSlot');
  if (ledeSlot) ledeSlot.innerHTML = MO.ledeFor(key);
  var scopeSlot = document.getElementById('scope');
  if (scopeSlot) scopeSlot.textContent = cfg.label;
  var figureSlot = document.getElementById('figureSlot');
  if (figureSlot) figureSlot.innerHTML = MO.figureFor(key, MO.data);
  var unitSlot = document.getElementById('unitSlot');
  if (unitSlot) unitSlot.textContent = cfg.unit;

  /* 双车道带 */
  var band = document.getElementById('band');
  var bandNote = document.getElementById('bandNote');
  var bandValue = document.getElementById('bandValue');
  var foldBtn = document.getElementById('bandFold');
  if (band) band.setAttribute('data-folded', state.bandFolded ? 'true' : 'false');
  if (bandNote) {
    if (state.phase === 'error') bandNote.textContent = '读不到：这一带的数字显示为 —';
    else if (state.phase === 'loading') bandNote.textContent = '读取中';
    else if (state.phase === 'empty') bandNote.textContent = '0 条置顶 · 没有每请求成本';
    else if (key === 'health') bandNote.textContent = '四桶 236 · 你只能动置顶那 65';
    else bandNote.textContent = '置顶 2 条 · 全部注入 · 段预算 256 已用 65';
  }
  if (bandValue) {
    bandValue.textContent = (state.phase === 'error' || state.phase === 'loading')
      ? '—'
      : MO.num(MO.data.resident.total);
  }
  if (foldBtn) {
    foldBtn.setAttribute('aria-expanded', state.bandFolded ? 'false' : 'true');
    foldBtn.textContent = state.bandFolded ? '展开' : '折起';
  }

  /* 中栏 */
  var body = document.getElementById('paneBody');
  if (body) body.innerHTML = cfg.render(MO.data, ctx);

  /* 检视栏 */
  var insp = cfg.inspect(MO.data, ctx);
  if (state.phase === 'error') {
    insp = {
      title: '读不到数据',
      sub: 'state = error',
      body: '<p class="insp-text">这一屏读不到，检视栏不展示缓存内容——避免用旧内容冒充新事实。中栏有原因与下一步。</p>',
      foot: '<button type="button" class="btn-ghost" data-act="retry">重试</button>'
    };
  } else if (state.phase === 'empty') {
    insp = {
      title: '没有可选的条目',
      sub: 'state = empty（不是 error）',
      body: '<p class="insp-text">空态下没有条目可选。用中栏给的出口继续，别在这里找不存在的详情。</p>',
      foot: ''
    };
  }
  var title = document.getElementById('inspTitle');
  var sub = document.getElementById('inspSub');
  var inspBody = document.getElementById('inspBody');
  var inspFoot = document.getElementById('inspFoot');
  if (title) title.textContent = insp.title || '';
  if (sub) sub.textContent = insp.sub || '';
  if (inspBody) inspBody.innerHTML = insp.body || '';
  if (inspFoot) {
    inspFoot.innerHTML = insp.foot || '';
    inspFoot.hidden = !insp.foot;
  }

  /* 驳回理由：不重渲染，避免输入被抹掉 */
  var reason = document.getElementById('reasonInput');
  if (reason) {
    reason.addEventListener('input', function () {
      MO.state.reason = reason.value;
      reason.removeAttribute('aria-invalid');
    });
  }

  /* 状态条 */
  var right = document.getElementById('statusRight');
  if (right) {
    right.textContent = MO.scopeLine + ' · ' + MO.num(MO.data.counts.entries) + ' 条记忆 · ' + MO.data.snapshotAt;
  }

  /* 控制台按钮态 */
  document.querySelectorAll('[data-phase]').forEach(function (b) {
    b.setAttribute('aria-pressed', b.getAttribute('data-phase') === state.phase ? 'true' : 'false');
  });
  document.querySelectorAll('[data-theme]').forEach(function (b) {
    var dark = document.body.hasAttribute('data-ds-dark-theme');
    var want = b.getAttribute('data-theme') === 'dark';
    b.setAttribute('aria-pressed', dark === want ? 'true' : 'false');
  });
  document.querySelectorAll('[data-face]').forEach(function (b) {
    b.setAttribute('aria-checked', b.getAttribute('data-face') === state.face ? 'true' : 'false');
  });
  document.querySelectorAll('[data-host]').forEach(function (b) {
    b.setAttribute('aria-pressed', state.hostMode ? 'true' : 'false');
  });

  /* 捕获表单：重新挂监听（元素每次重渲染都会换） */
  MO.submitCapture(state, MO.announce, MO.render);
  var input = document.getElementById('captureText');
  if (input) {
    input.addEventListener('input', function () {
      state.draft = input.value;
      var count = document.getElementById('captureCount');
      if (count) count.textContent = MO.estTokens(input.value) + ' tokens';
    });
  }

  /* 编辑输入框：重渲染后恢复焦点与光标 */
  var pin = document.getElementById('pinTitle');
  if (pin && state.edit) {
    pin.addEventListener('input', function () {
      state.edit.draft = pin.value;
      state.saved = '';
      var pos = pin.selectionStart;
      MO.render();
      var again = document.getElementById('pinTitle');
      if (again) {
        again.focus();
        try { again.setSelectionRange(pos, pos); } catch (err) { /* 老浏览器忽略 */ }
      }
    });
  }
};

/* ---------------- 事件 ---------------- */
MO.goto = function (key, phase) {
  if (MO.cfg[key]) MO.state.pane = key;
  if (phase) MO.state.phase = phase;
  MO.state.edit = null;
  MO.state.saved = '';
  MO.state.captureError = '';
  MO.state.done = '';
  MO.render();
  var hash = '#' + MO.state.pane + '/' + (MO.state.phase === 'normal' ? '' : MO.state.phase);
  if (history.replaceState) history.replaceState(null, '', hash);
};

MO.onAct = function (act, el) {
  var s = MO.state;
  if (act === 'today-save') {
    var todayInput = document.getElementById('todayCapture');
    var value = todayInput ? todayInput.value : '';
    if (value.trim() === '') { MO.announce('内容为空，未写入'); return undefined; }
    var privacy = MO.findPrivacyHit(value);
    if (privacy) { MO.announce('隐私闸门拦下：' + privacy); return undefined; }
    todayInput.value = '';
    MO.announce('已存入 personal/INBOX.md');
    return undefined;
  }
  if (act === 'go-capture') return MO.goto('capture');
  if (act === 'go-memory') return MO.goto('memory');
  if (act === 'focus-capture') {
    var input = document.getElementById('captureText');
    if (input) input.focus();
    return undefined;
  }
  if (act === 'retry') { MO.announce('已重试读取'); return MO.render(); }
  if (act === 'edit') {
    var id = el.getAttribute('data-id');
    var item = MO.pick(MO.data.resident.buckets[2].items, id);
    s.edit = { id: id, draft: item ? item.name : '' };
    s.saved = '';
    return MO.render();
  }
  if (act === 'cancel-edit') { s.edit = null; s.saved = ''; return MO.render(); }
  if (act === 'unpin') {
    s.edit = null;
    s.saved = '';
    MO.announce('已取消置顶，条目本身保留');
    return MO.render();
  }
  if (act === 'save-pin') return MO.savePin();
  if (act === 'check-update') return MO.checkUpdate();
  if (act === 'reject') {
    if (s.pane === 'todo') {
      if (!s.reason || s.reason.trim() === '') {
        var reasonEl = document.getElementById('reasonInput');
        if (reasonEl) { reasonEl.setAttribute('aria-invalid', 'true'); reasonEl.focus(); }
        MO.announce('驳回要写理由：否则 30 天后没人知道为什么');
        return undefined;
      }
      s.todoDone = '已驳回，理由已记 · 30 天内不再注入';
      s.reason = '';
      MO.announce(s.todoDone);
      return MO.render();
    }
    s.todoDone = '已驳回 · 30 天内不再注入（可撤销）';
    MO.announce(s.todoDone);
    return MO.render();
  }
  if (act === 'confirm' || act === 'archive' || act === 'keep' || act === 'dismiss' || act === 'clue-primary') {
    s.todoDone = '已执行：' + el.textContent.trim();
    MO.announce(s.todoDone);
    return MO.render();
  }
  if (act === 'undo') {
    s.done = '';
    s.captureError = '';
    MO.announce('已撤销');
    return MO.render();
  }
  if (act === 'mask') {
    s.captureError = '';
    s.draft = '';
    MO.announce('已填入脱敏文本');
    return MO.render();
  }
  if (act === 'copy-cmd') { MO.announce('命令已复制：pnpm add memory-ops-dsh@latest'); return undefined; }
  if (act === 'go-host') { MO.announce('已在宿主插件页打开版本区块'); return undefined; }
  if (act === 'check-anchors' || act === 'compact' || act === 'review') {
    MO.announce(el.textContent.trim() + '：完成，0 处变更');
    return undefined;
  }
  if (act === 'search') {
    var searchEl = document.getElementById('memorySearch');
    s.query = searchEl ? searchEl.value : '';
    MO.announce(s.query ? '已检索「' + s.query + '」并记账' : '清掉关键词，显示全部条目');
    return MO.render();
  }
  if (act === 'clear-filter') { s.query = ''; return MO.render(); }
  if (act === 'fold-budget') { s.bandFolded = !s.bandFolded; return MO.render(); }
  return undefined;
};

MO.savePin = function () {
  var s = MO.state;
  if (!s.edit || s.saving) return undefined;
  var verdicts = MO.judge(s.edit.draft, MO.estTokens(s.edit.draft));
  if (verdicts.refuse.length > 0) {
    MO.announce('还有「拒」级问题，保存未执行');
    return MO.render();
  }
  var btn = document.getElementById('savePin');
  if (btn) btn.disabled = true;
  s.saving = true;
  MO.render();
  window.setTimeout(function () {
    s.saving = false;
    s.saved = '写回 personal/principles.md（1 行）· 新会话生效';
    s.edit = null;
    MO.announce('已保存：personal/principles.md，改了 1 行');
    MO.render();
  }, 800);
};

MO.checkUpdate = function () {
  var s = MO.state;
  if (s.check === 'checking') return undefined;
  s.check = 'checking';
  MO.render();
  window.setTimeout(function () {
    if (s.hostMode) {
      s.check = 'ok';
      s.checkedAt = '2026-11-21 22:41';
      MO.announce('检查完成：可更新到 0.4.0，7 条改动');
    } else {
      s.check = 'failed';
      s.checkedAt = '2026-11-21 22:41';
      MO.announce('检查失败：网络不可达，可重试');
    }
    MO.render();
  }, 900);
};

/* ---------------- 启动 ---------------- */
MO.boot = function () {
  document.addEventListener('click', function (event) {
    var target = event.target.closest('[data-select],[data-act],[data-face],[data-phase],[data-theme],[data-host],[data-open-remember],[data-pane],[data-kind]');
    if (!target) return;

    var paneTarget = target.getAttribute('data-pane');
    if (paneTarget) {
      MO.goto(paneTarget);
      return;
    }

    var kindTarget = target.getAttribute('data-kind');
    if (kindTarget) {
      MO.state.kind = kindTarget;
      MO.announce('类型：' + kindTarget);
      MO.render();
      return;
    }

    if (target.hasAttribute('data-host')) {
      MO.state.hostMode = !MO.state.hostMode;
      MO.state.check = 'unchecked';
      MO.announce(MO.state.hostMode ? '模拟宿主可读版本区块' : '回到 git 直装形态');
      MO.render();
      return;
    }

    var select = target.getAttribute('data-select');
    if (select) {
      var pane = MO.state.pane;
      MO.state.sel[pane] = select;
      MO.state.edit = null;
      MO.state.todoDone = '';
      MO.state.saved = '';
      MO.render();
      return;
    }

    var face = target.getAttribute('data-face');
    if (face) {
      MO.state.face = face;
      MO.announce(face === 'cost' ? '切到成本面' : '切到内容面');
      MO.render();
      return;
    }

    var phase = target.getAttribute('data-phase');
    if (phase) { MO.goto(MO.state.pane, phase); return; }

    var theme = target.getAttribute('data-theme');
    if (theme) {
      if (theme === 'dark') document.body.setAttribute('data-ds-dark-theme', '');
      else document.body.removeAttribute('data-ds-dark-theme');
      MO.announce(theme === 'dark' ? '深色主题' : '浅色主题');
      MO.render();
      return;
    }

    if (target.hasAttribute('data-open-remember')) { MO.openRemember(); return; }

    var act = target.getAttribute('data-act');
    if (act) MO.onAct(act, target);
  });

  document.addEventListener('keydown', function (event) {
    var s = MO.state;
    if (event.key === 'Escape' && !document.getElementById('rememberBackdrop').hidden) {
      MO.closeRemember();
      return;
    }
    var active = document.activeElement;
    var isTab = active && active.getAttribute && active.getAttribute('role') === 'tab';
    if (isTab && (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End')) {
      event.preventDefault();
      MO.tabKey(event.key);
    }
  });

  document.getElementById('bandFold').addEventListener('click', function () {
    MO.state.bandFolded = !MO.state.bandFolded;
    MO.render();
  });

  document.getElementById('rememberClose').addEventListener('click', function () { MO.closeRemember(); });
  document.getElementById('rememberBackdrop').addEventListener('click', function (event) {
    if (event.target.id === 'rememberBackdrop') MO.closeRemember();
  });

  MO.applyHash();
  window.addEventListener('hashchange', function () {
    MO.applyHash();
    MO.render();
  });
  MO.render();

  var rememberBtn = document.getElementById('devRemember');
  if (rememberBtn) rememberBtn.addEventListener('click', function () { MO.openRemember(); });

  var rememberSubmit = document.getElementById('rememberSubmit');
  if (rememberSubmit) {
    rememberSubmit.addEventListener('click', function () {
      var field = document.getElementById('rememberText');
      if (!field) return;
      var text = field.value;
      if (text.trim() === '') {
        MO.announce('内容为空，未写入');
        return;
      }
      var hit = MO.findPrivacyHit(text);
      if (hit) {
        MO.announce('隐私闸门拦下：' + hit + '；浮层不关闭');
        return;
      }
      field.value = '';
      MO.closeRemember();
      MO.announce('已存入 personal/INBOX.md');
    });
  }
};

MO.tabKey = function (keyName) {
  var keys = Object.keys(MO.cfg);
  var i = keys.indexOf(MO.state.pane);
  var next = i;
  if (keyName === 'ArrowDown') next = (i + 1) % keys.length;
  if (keyName === 'ArrowUp') next = (i - 1 + keys.length) % keys.length;
  if (keyName === 'Home') next = 0;
  if (keyName === 'End') next = keys.length - 1;
  var target = keys[next];
  MO.goto(target);
  var btn = document.getElementById('tab-' + target);
  if (btn) btn.focus();
};

MO.applyHash = function () {
  var raw = (location.hash || '').replace(/^#/, '');
  if (!raw) return;
  var parts = raw.split('/');
  var pane = parts[0];
  var phase = parts[1] || 'normal';
  if (!MO.cfg[pane]) return;
  MO.state.pane = pane;
  MO.state.phase = (phase === 'loading' || phase === 'empty' || phase === 'error') ? phase : 'normal';
  /* 深链必须重置上一屏的瞬时态：否则错误态会带着可点的「保存」进来 */
  MO.state.edit = null;
  MO.state.saved = '';
  MO.state.done = '';
  MO.state.captureError = '';
  MO.state.todoDone = '';
};

/* /remember 浮层：打开移焦、关闭回焦（brief §七-5） */
MO.openRemember = function () {
  var backdrop = document.getElementById('rememberBackdrop');
  backdrop.hidden = false;
  var field = document.getElementById('rememberText');
  if (field) field.focus();
  MO.announce('已打开 /remember');
};

MO.closeRemember = function () {
  var backdrop = document.getElementById('rememberBackdrop');
  backdrop.hidden = true;
  var opener = document.getElementById('devRemember');
  if (opener) opener.focus();
};

document.addEventListener('DOMContentLoaded', MO.boot);