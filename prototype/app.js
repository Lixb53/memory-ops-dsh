/**
 * app.js —— 记忆库 v5 原型：组装 + 状态 + 动作
 *
 * 本文件只做四件事：维护状态、分派动作、拼装外壳、绑定事件。
 * 每个页面的渲染在 pane-*.js 里，共享原语在 ui.js 里。
 *
 * 经典脚本拼接顺序：data.js → ui.js → pane-*.js → app.js
 * （file:// 下 ES module 被 CORS 拦，原型必须双击可开。）
 *
 * v4→v5 新增：主题开关。切换机制与宿主完全一致——
 * 在 body 上挂/摘 data-ds-dark-theme，整套别名换值（tokens.css 两块）。
 * 这就是「主题自动跟随」的回归测试：插件落地后由宿主挂这个属性。
 */

(function () {
  'use strict';

  const MO = window.MO;
  const { esc } = MO;

  /* ==========================================================
   * 状态
   * ========================================================== */

  const state = {
    pane: 'today',      // today | capture | todo | memory | health
    detailPath: null,   // 记忆详情路径
    phase: 'ready',     // ready | loading | empty | error
    filterStatus: '',
    filterScope: '',
    query: '',
    submitted: '',
    captureText: '',
    captureKind: '想法',
    /** 刚写入的那批记录，供撤销；null 表示没有可撤销的。 */
    lastCapture: null,
    openOverlay: null,  // null | 'privacy'
    openRemember: false, // /remember 弹窗演示（插件 bug 的可视化回归锚点）
    lastAction: null,   // { ok, text } 就地反馈
    theme: 'light',     // light | dark —— 与宿主同机制（body[data-ds-dark-theme]）
  };

  /** 派生状态每次渲染重算（不在模块加载时定死——v4 教训保留）。 */
  let data = MO.deriveState();

  const PANES = [
    { id: 'today', label: '今天' },
    { id: 'capture', label: '记一条' },
    { id: 'todo', label: '待办' },
    { id: 'memory', label: '记忆' },
    { id: 'health', label: '库健康' },
  ];

  /* ==========================================================
   * 外壳
   * ========================================================== */

  function renderNav() {
    return PANES.map(pane => {
      let badge = 0;
      if (pane.id === 'todo') badge = data.todoTotal;
      else if (pane.id === 'memory') badge = data.entries.length;
      const suffix = badge > 0 ? `<span class="nav-count">${badge}</span>` : '';
      return `<button class="nav-item" role="tab" data-action="goto" data-pane="${pane.id}"
        aria-selected="${state.pane === pane.id}">${pane.label}${suffix}</button>`;
    }).join('');
  }

  function renderBody() {
    switch (state.pane) {
      case 'capture': return MO.renderCapture(state, data);
      case 'todo': return MO.renderTodo(state, data);
      case 'memory': return MO.renderMemory(state, data);
      case 'health': return MO.renderHealth(state, data);
      default: return MO.renderToday(state, data);
    }
  }

  /**
   * 隐私闸门浮层。演示拦截交互：拒写时必须同时给出脱敏版本。
   * 真实实现在 core/privacy.ts。
   */
  function renderOverlay() {
    if (state.openOverlay === null) return '';
    return `<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="ov-title">
      <div class="overlay-card">
        <h2 class="overlay-title" id="ov-title">检测到疑似密钥，已拒写</h2>
        <p class="overlay-body">这段里有像 <code>gho_…</code> 的令牌。记忆库是明文 Markdown，
          密钥写进去会被 agent 读到。下面是可以直接用的脱敏版本。</p>
        <div class="overlay-actions">
          <button class="btn btn-quiet" data-action="close-overlay">取消</button>
          <button class="btn btn-primary" data-action="use-masked">填入脱敏版本</button>
        </div>
      </div>
    </div>`;
  }

  /** 主题落地：与宿主同一机制——body 上的 data-ds-dark-theme。 */
  function applyTheme() {
    if (state.theme === 'dark') document.body.setAttribute('data-ds-dark-theme', '');
    else document.body.removeAttribute('data-ds-dark-theme');
  }

  /**
   * /remember 弹窗演示。
   *
   * 为什么原型里要有它：插件端该弹窗在 v4 因 styles.ts 删光 .dmo-remember-*
   * 而「挂载了但不可见」（用户报的 bug）。原型用同一套结构 + .remember-* 类
   * 把它画出来，作为该 bug 的**可视化回归锚点**——这块 CSS 不许再变成死代码。
   */
  function renderRemember() {
    if (state.openRemember !== true) return '';
    return `<div class="remember-backdrop" data-action="close-remember" role="presentation">
      <div class="remember-card" role="dialog" aria-modal="true" aria-label="存进记忆库"
        data-action="noop-stop">
        <div class="remember-head">
          <span class="remember-title">存进记忆库</span>
          <button class="remember-close" data-action="close-remember" aria-label="关闭">×</button>
        </div>
        <div class="kindrow" role="group" aria-label="记录类型">
          ${['想法', '计划', '问题', '待办', '决策'].map(k =>
            `<button class="kindbtn" data-action="set-kind" data-kind="${k}" aria-pressed="${state.captureKind === k}">${k}</button>`).join('')}
        </div>
        <textarea class="remember-input" data-field="captureText"
          aria-label="捕获内容" placeholder="一句话赶紧存了（Ctrl+Enter 提交，Esc 取消）">${esc(state.captureText)}</textarea>
        <div class="remember-foot">
          <span class="meta">存入后可在浮层里 30 秒内撤销</span>
          <span class="card-actions">
            ${MO.button('取消', 'data-action="close-remember"')}
            ${MO.primary('存一条', 'data-action="capture-remember"', state.captureText.trim() === '')}
          </span>
        </div>
      </div>
    </div>`;
  }

  function render() {
    data = MO.deriveState();
    applyTheme();

    document.getElementById('panel').innerHTML = `
      <div class="panel-head">
        <div class="panel-title-row">
          <h1 class="panel-title">记忆库</h1>
          <span class="panel-scope">${esc('C:\\Users\\51967\\.memory-ops')}</span>
        </div>
        <div class="nav" role="tablist">${renderNav()}</div>
      </div>
      <div class="panel-body" role="tabpanel">${renderBody()}</div>
      ${renderOverlay()}
      ${renderRemember()}`;

    renderHarness();
    syncFocus();
    syncHash();
  }

  /* ==========================================================
   * 深链：#<pane>/<phase>，例如 #todo/error；?theme=dark 给截图用
   * ========================================================== */

  /**
   * 「成功」态注入的反馈必须**真的改数据**（v4 三轮评审的教训保留：
   * 用文案代替行为 = 伪造动作结果）。
   */
  function successActionFor(pane) {
    if (pane === 'capture' || pane === 'today') {
      const maxLine = MO.INBOX.reduce((max, row) => Math.max(max, row.line), 0);
      MO.INBOX.unshift({
        line: maxLine + 1,
        date: '2026-11-18',
        kind: state.captureKind,
        content: '（验收注入）成功态示例条目',
        state: 'open',
        destination: '—',
      });
      state.lastCapture = { lines: [maxLine + 1], content: '（验收注入）成功态示例条目' };
      return { ok: true, source: 'capture', text: '已存入记录流（想法）' };
    }
    if (pane === 'todo') {
      const first = data.pendingDecisions[0];
      let left = 0;
      if (first !== undefined) {
        first.status = 'confirmed';
        first.confidence = 0.9;
        left = data.pendingDecisions.filter(e => e.id !== first.id).length;
      }
      return {
        ok: true,
        text: '已确认（观察中 → 已确认）'
          + (left === 0 ? ' · 待拍板清空了' : ` · 还剩 ${left} 条`),
      };
    }
    if (pane === 'memory') {
      const entry = data.entries[0];
      const title = entry === undefined ? '' : entry.title.slice(0, 10);
      if (entry !== undefined) {
        entry.status = 'archived';
        entry.confidence = 0;
      }
      return { ok: true, text: `已归档「${title}…」，之后仍可检索` };
    }
    return { ok: true, text: '重新读到了' };
  }

  function syncHash() {
    const hash = `#${state.pane}/${state.phase}`;
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash);
    }
  }

  function applyHash() {
    const raw = window.location.hash.replace(/^#/, '');
    if (raw === '') return;
    const [pane, phase] = raw.split('/');
    if (PANES.some(p => p.id === pane)) state.pane = pane;
    if (phase === 'ready' || phase === 'loading' || phase === 'empty'
      || phase === 'error' || phase === 'success') {
      state.phase = phase;
      if (phase === 'success') {
        data = MO.deriveState();
        state.lastAction = successActionFor(state.pane);
      }
    }
  }

  /* ==========================================================
   * 原型控制台（验收四态 + 主题；不属产品界面）
   * ========================================================== */

  const PHASES = [
    { id: 'ready', label: '正常' },
    { id: 'loading', label: '加载中' },
    { id: 'empty', label: '空' },
    { id: 'error', label: '出错' },
    { id: 'success', label: '成功' },
  ];

  function renderHarness() {
    const phaseButtons = PHASES.map(phase => `<button class="kindbtn" data-action="set-phase"
      data-phase="${phase.id}" aria-pressed="${state.phase === phase.id}">${phase.label}</button>`)
      .join('');

    const paneButtons = PANES.map(pane => `<button class="kindbtn" data-action="goto"
      data-pane="${pane.id}" aria-pressed="${state.pane === pane.id}">${pane.label}</button>`)
      .join('');

    const themeButtons = [
      { id: 'light', label: '浅色' },
      { id: 'dark', label: '深色' },
    ].map(t => `<button class="kindbtn" data-action="set-theme"
      data-theme="${t.id}" aria-pressed="${state.theme === t.id}">${t.label}</button>`).join('');

    document.getElementById('harness').innerHTML = `
      <p class="harness-title">原型控制台 · 不属产品界面</p>
      <div class="harness-group">
        <span class="harness-label">切换页面</span>
        <div class="kindrow">${paneButtons}</div>
      </div>
      <div class="harness-group">
        <span class="harness-label">主题（与宿主同机制）</span>
        <div class="kindrow">${themeButtons}</div>
        <p class="harness-note">切换 = body 挂/摘 data-ds-dark-theme。
          插件落地后这个属性由宿主控制，界面自动跟随。</p>
      </div>
      <div class="harness-group">
        <span class="harness-label">切换状态（四态验收）</span>
        <div class="kindrow">${phaseButtons}</div>
        <p class="harness-note">四态：空 / 载 / 错 / 成。每页都能切。
          「成功」注入一条真实动作结果再渲染。</p>
      </div>
      <div class="harness-group">
        <span class="harness-label">/remember 弹窗（bug 回归锚点）</span>
        <div class="kindrow">
          <button class="kindbtn" data-action="open-remember">打开弹窗</button>
        </div>
        <p class="harness-note">插件端该弹窗曾因样式类被删而「挂载了但不可见」。
          原型用同一结构演示正常形态。</p>
      </div>
      <div class="harness-group">
        <span class="harness-label">截图核对</span>
        <div class="kindrow">
          <button class="kindbtn" data-action="toggle-unfold"
            aria-pressed="${document.body.dataset.unfold === '1'}">${
    document.body.dataset.unfold === '1' ? '收起面板' : '展开面板'}</button>
        </div>
      </div>
      <div class="harness-group">
        <span class="harness-label">数据来源</span>
        <p class="harness-note" style="margin-top:0">
          真实库 3 条记忆 / 3 条记录 / 5 条未命中。
          token 用 core 同口径实算。颜色全部来自宿主真实别名值。</p>
      </div>`;
  }

  /* ==========================================================
   * 焦点管理（WCAG）：存选择器而不是节点（v4 裁决保留）
   * ========================================================== */

  let lastFocusSelector = null;

  function selectorOf(el) {
    if (el === null || el === undefined || typeof el.dataset !== 'object') return null;
    const action = el.dataset.action;
    if (action === undefined) return null;
    let sel = `[data-action="${action}"]`;
    if (el.dataset.path !== undefined) sel += `[data-path="${el.dataset.path}"]`;
    else if (el.dataset.pane !== undefined) sel += `[data-pane="${el.dataset.pane}"]`;
    else if (el.dataset.line !== undefined) sel += `[data-line="${el.dataset.line}"]`;
    return sel;
  }

  function syncFocus() {
    const overlay = document.querySelector('.overlay');

    if (overlay !== null && lastFocusSelector === null) {
      lastFocusSelector = selectorOf(document.activeElement) ?? '';
      const firstButton = overlay.querySelector('button');
      if (firstButton !== null) firstButton.focus();
      return;
    }

    if (overlay === null && lastFocusSelector !== null) {
      let target = null;
      if (lastFocusSelector !== '') {
        target = document.querySelector(`#panel ${lastFocusSelector}`);
      }
      if (target === null) {
        target = document.querySelector('#panel [data-field="captureText"]');
      }
      if (target !== null && target.disabled !== true) target.focus();
      lastFocusSelector = null;
    }
  }

  /* ==========================================================
   * 动作
   * ========================================================== */

  function looksSecret(text) {
    return /gho_[A-Za-z0-9]{10,}|sk-[A-Za-z0-9]{16,}/.test(text);
  }

  function confirmEntry(path) {
    const entry = data.entries.find(e => e.id === path);
    if (entry === undefined) return;
    const before = MO.statusLabel(entry.status);
    entry.status = 'confirmed';
    entry.confidence = 0.9;
    const remaining = data.pendingDecisions.filter(e => e.id !== path).length;
    state.lastAction = {
      ok: true,
      source: 'suggest',
      text: `已确认（${before} → 已确认）`
        + (remaining > 0 ? ` · 还剩 ${remaining} 条待拍板` : ' · 待拍板清空了'),
    };
  }

  /** 提交捕获。返回 'empty' | 'blocked' | 'ok' | 'failed'。真的写入，不伪造。 */
  function submitCapture() {
    const text = state.captureText.trim();
    if (text === '') return 'empty';
    if (looksSecret(text)) {
      state.openOverlay = 'privacy';
      return 'blocked';
    }
    if (text.startsWith('#fail')) {
      state.lastAction = {
        ok: false,
        source: 'capture',
        text: '没存上：磁盘写入被拒绝（示例）。内容还在输入框里，可以重试。',
      };
      return 'failed';   // 不清空 captureText——「失败时不许清空输入」
    }

    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    const maxLine = MO.INBOX.reduce((max, row) => Math.max(max, row.line), 0);
    const today = '2026-11-18';

    const created = lines.map((line, index) => ({
      line: maxLine + index + 1,
      date: today,
      kind: state.captureKind,
      content: line,
      state: 'open',
      destination: '—',
    }));
    MO.INBOX.unshift(...created);

    state.captureText = '';
    state.lastCapture = {
      lines: created.map(row => row.line),
      content: lines.length === 1 ? lines[0] : `${lines[0]}…等 ${lines.length} 条`,
    };
    state.lastAction = {
      ok: true,
      source: 'capture',
      text: lines.length === 1
        ? `已存入记录流（${state.captureKind}）`
        : `已拆成 ${lines.length} 条存入记录流（${state.captureKind}）`,
    };
    return 'ok';
  }

  /** 撤销刚写入的记录：真的从 MO.INBOX 里移除。 */
  function undoCapture() {
    if (state.lastCapture === null) return;
    const { lines, content } = state.lastCapture;
    for (let i = MO.INBOX.length - 1; i >= 0; i -= 1) {
      if (lines.indexOf(MO.INBOX[i].line) >= 0) MO.INBOX.splice(i, 1);
    }
    state.lastCapture = null;
    const brief = content.length > 20 ? `${content.slice(0, 20)}…` : content;
    state.lastAction = { ok: true, source: 'capture', text: `已撤销：「${brief}」` };
  }

  function act(action, el) {
    const dataset = el.dataset;

    switch (action) {
      case 'goto':
        state.pane = dataset.pane;
        if (dataset.pane !== 'memory') state.detailPath = null;
        state.lastAction = null;
        if (state.phase !== 'ready') state.phase = 'ready';
        break;

      case 'set-theme':
        state.theme = dataset.theme;
        break;

      case 'open-detail':
        state.detailPath = dataset.path;
        state.pane = 'memory';
        state.lastAction = null;
        break;

      case 'back-to-list':
        state.detailPath = null;
        state.lastAction = null;
        break;

      case 'suggest-confirm':
      case 'confirm':
        confirmEntry(dataset.path);
        break;

      case 'archive': {
        const entry = data.entries.find(e => e.id === dataset.path);
        if (entry !== undefined) {
          entry.status = 'archived';
          entry.confidence = 0;
        }
        const name = entry === undefined ? '' : entry.title.slice(0, 12);
        state.lastAction = { ok: true, source: 'memory', text: `已归档「${name}…」，之后仍可检索` };
        break;
      }

      case 'inbox-done': {
        const row = data.inbox.find(r => String(r.line) === String(dataset.line));
        if (row !== undefined) row.state = 'done';
        state.lastAction = { ok: true, text: '标为已完成，从待办移除了' };
        break;
      }

      case 'inbox-drop': {
        const row = data.inbox.find(r => String(r.line) === String(dataset.line));
        if (row !== undefined) row.state = 'dropped';
        state.lastAction = { ok: true, text: '丢掉了，不再出现在待办里' };
        break;
      }

      case 'set-kind':
        state.captureKind = dataset.kind;
        break;

      case 'capture':
        if (submitCapture() === 'empty') return;
        break;

      case 'undo-capture':
        undoCapture();
        break;

      case 'close-overlay':
        state.openOverlay = null;
        break;

      case 'open-remember':
        state.openRemember = true;
        break;

      case 'close-remember':
        state.openRemember = false;
        break;

      case 'capture-remember': {
        const outcome = submitCapture();
        if (outcome === 'ok' || outcome === 'failed') state.openRemember = false;
        if (outcome === 'empty') return;
        break;
      }

      case 'use-masked':
        state.openOverlay = null;
        state.captureText = state.captureText.replace(/gho_[A-Za-z0-9]+/g, 'gho_****');
        break;

      case 'retry':
        state.phase = 'ready';
        state.lastAction = { ok: true, text: '重新读到了' };
        break;

      case 'search':
        state.submitted = state.query;
        state.lastAction = null;
        break;

      case 'clear-search':
        state.query = '';
        state.submitted = '';
        break;

      case 'clear-filter':
        state.filterStatus = '';
        state.filterScope = '';
        state.query = '';
        state.submitted = '';
        break;

      case 'filter-status':
        state.filterStatus = dataset.status;
        break;

      case 'filter-scope':
        state.filterScope = dataset.scope;
        break;

      case 'set-phase':
        state.phase = dataset.phase;
        state.lastAction = null;
        if (dataset.phase === 'success') {
          data = MO.deriveState();
          state.lastAction = successActionFor(state.pane);
        }
        break;

      case 'toggle-unfold':
        document.body.dataset.unfold = document.body.dataset.unfold === '1' ? '0' : '1';
        break;

      case 'noop':
        state.lastAction = {
          ok: true,
          text: '原型未接这一条动作（对应路由已保留，见 design/implementation-plan.md）',
        };
        break;

      default:
        return;
    }

    render();
  }

  /* ==========================================================
   * 事件
   * ========================================================== */

  document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-action]');
    if (el === null) return;
    event.preventDefault();
    act(el.dataset.action, el);
  });

  /** 输入只更新状态 + 主按钮可用态，不整页重绘（重绘会把光标顶掉）。 */
  document.addEventListener('input', (event) => {
    const field = event.target.dataset.field;
    if (field === undefined) return;

    if (field === 'query') {
      state.query = event.target.value;
      return;
    }

    state.captureText = event.target.value;
    const box = event.target.closest('.capture');
    const submit = box === null ? null : box.querySelector('[data-action="capture"]');
    if (submit !== null) submit.disabled = event.target.value.trim() === '';
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.openOverlay !== null) {
      state.openOverlay = null;
      render();
      return;
    }
    if (event.key === 'Escape' && state.openRemember === true) {
      state.openRemember = false;
      render();
      return;
    }

    const isCaptureField = event.target.dataset
      && event.target.dataset.field === 'captureText';

    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && isCaptureField) {
      event.preventDefault();
      submitCapture();
      render();
      return;
    }

    if (event.key === 'Enter' && event.target.dataset
      && event.target.dataset.field === 'query') {
      state.submitted = state.query;
      render();
    }
  });

  window.addEventListener('hashchange', () => {
    applyHash();
    render();
  });

  applyHash();

  /* 截图核对开关：?unfold=1 撑开面板；?theme=dark 直接进深色。 */
  if (window.location.search.indexOf('unfold=1') >= 0) {
    document.body.dataset.unfold = '1';
  }
  if (window.location.search.indexOf('theme=dark') >= 0) {
    state.theme = 'dark';
  }

  render();
})();
