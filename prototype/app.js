/**
 * app.js —— 记忆库 v4 原型：组装 + 状态 + 动作
 *
 * 本文件只做四件事：维护状态、分派动作、拼装外壳、绑定事件。
 * 每个页面的渲染在 pane-*.js 里，共享原语在 ui.js 里。
 *
 * 用经典脚本（不是 ES module）拼接顺序：
 *   data.js → ui.js → pane-*.js → app.js
 * 理由：原型必须能双击打开（file:// 下 ES module 会被 CORS 拦掉）。
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
    lastAction: null,   // { ok, text } 就地反馈
  };

  /**
   * 派生状态每次渲染重算。
   *
   * ⚠️ 早先在模块加载时算一次存起来，然后确认操作改了 entry.status，
   * 但 pendingDecisions 是旧数组，队列不动，界面看起来「点了没反应」。
   * 那正是本仓 §13.1 记过的那类缺陷，不能在自己的原型里重犯。
   */
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
   * 隐私闸门浮层。
   *
   * 只做拦截演示——真实实现在 core/privacy.ts，规则比这个严格得多。
   * 这里要证明的是交互：拒写时必须同时给出脱敏版本，而不是只说「不行」。
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

  function render() {
    data = MO.deriveState();

    document.getElementById('panel').innerHTML = `
      <div class="panel-head">
        <div class="panel-title-row">
          <h1 class="panel-title">记忆库</h1>
          <span class="panel-scope">${esc('C:\\Users\\51967\\.memory-ops')}</span>
        </div>
        <div class="nav" role="tablist">${renderNav()}</div>
      </div>
      <div class="panel-body" role="tabpanel">${renderBody()}</div>
      ${renderOverlay()}`;

    renderHarness();
    syncFocus();
    syncHash();
  }

  /* ==========================================================
   * 深链：让每个页面 × 状态都能被单独打开
   *
   * 为什么需要：评审者要逐页看空/载/错，不该靠手动点。
   * 格式：#<pane>/<phase>，例如 #todo/error
   * ========================================================== */

  /**
   * 「成功」态要注入的反馈 —— 但**必须真的改数据**。
   *
   * ⚠️ 第 2 轮评审 P0-B 抓到一处同型复发：
   * 早先这个函数只返回一句文案，不动任何数据。后果是自相矛盾的画面：
   *   - `#todo/success` 同时显示「待拍板清空了」和「要我拍板的 1 条」
   *   - `#today/success` 说「· 可撤销」，但 lastCapture 仍是 null，
   *     ui.js 因此不渲染撤销按钮 —— 承诺了一个不存在的按钮
   *
   * 这与第 1 轮 P0-1（说「已存入」却没写入）是同一个病灶：
   * **用文案代替行为**。所以这里改成真的执行一次操作。
   *
   * 副作用：连点「成功」开关会累积写入/确认。这是可接受的——
   * 它是验收开关，不是用户路径；而且刷新即复位。
   */
  function successActionFor(pane) {
    if (pane === 'capture' || pane === 'today') {
      // 真的写入一条，并置 lastCapture，这样撤销按钮才会真的出现
      const maxLine = MO.INBOX.reduce((max, row) => Math.max(max, row.line), 0);
      MO.INBOX.unshift({
        line: maxLine + 1,
        date: '2026-11-17',
        kind: state.captureKind,
        content: '（验收注入）成功态示例条目',
        state: 'open',
        destination: '—',
      });
      state.lastCapture = {
        lines: [maxLine + 1],
        content: '（验收注入）成功态示例条目',
      };
      return { ok: true, source: 'capture', text: '已存入记录流（想法）' };
    }
    if (pane === 'todo') {
      /*
       * 真的确认掉第一条待拍板。
       *
       * ⚠️ 第 3 轮评审 P0-3：早先改完 status 后读 `data.pendingDecisions.length`，
       * 那是**变更前** filter 出来的数组，left 恒为 1，
       * 于是屏幕显示「共 2 件 + 只剩流转段 + 还剩 1 条待办」——文案与数据相反。
       * 现在与 confirmEntry 用同一算法：按 id 排除后重新计数。
       */
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
      /*
       * 用 URL 直接打开 #today/success 时也必须真的看到成功反馈。
       *
       * ⚠️ 这里漏过一次：早先只有点控制台按钮才注入 lastAction，
       * 于是深链打开 success 态时页面与「正常」一模一样——
       * 截图 12-today-success 与 01-today 字节级相同就是证据。
       * 验收开关如果点了没变化，它本身就是假开关。
       */
      if (phase === 'success') {
        // successActionFor 要读最新数据（它可能真的改数据），先刷新
        data = MO.deriveState();
        state.lastAction = successActionFor(state.pane);
      }
    }
  }

  /* ==========================================================
   * 原型控制台（验收四态；不属产品界面）
   * ========================================================== */

  /**
   * 验收状态开关。
   *
   * ⚠️ 第 1 轮评审 P0-3 指出一个文档与代码不一致的问题：
   * IA §五 写的是「空 / 载 / 错 / 成」四态，而这里只给了 3 个可选项 +
   * 一个默认正常态，且「成功」这一格没有对应开关。文档说 4 个、代码给 3 个，
   * 验收时无从核对。
   *
   * 裁决：四态 = 空 / 载 / 错 / 成，其中「成」不是一个独立的空白页面，
   * 而是**注入一次真实动作结果**再渲染。所以这里补 `success` 开关，
   * 它做的事是给 state.lastAction 填一条成功反馈 —— 与用户真点按钮走同一条路径。
   * 这样「成」这个态就有了可点、可看、可核对的具体表现。
   */
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

    document.getElementById('harness').innerHTML = `
      <p class="harness-title">原型控制台 · 不属产品界面</p>
      <div class="harness-group">
        <span class="harness-label">切换页面</span>
        <div class="kindrow">${paneButtons}</div>
      </div>
      <div class="harness-group">
        <span class="harness-label">切换状态（四态验收）</span>
        <div class="kindrow">${phaseButtons}</div>
      </div>
      <p class="harness-note">四态：空 / 载 / 错 / 成。每页都能切——
        这是「不许只做 happy path」的验收手段。<br>
        「成功」不是空白页：它注入一条真实动作结果再渲染，走的是用户点按钮的同一条路径。</p>
      <div class="harness-group" style="margin-top:var(--s4)">
        <span class="harness-label">截图核对</span>
        <div class="kindrow">
          <button class="kindbtn" data-action="toggle-unfold"
            aria-pressed="${document.body.dataset.unfold === '1'}">${
    document.body.dataset.unfold === '1' ? '收起面板' : '展开面板'}</button>
        </div>
        <p class="harness-note" style="margin-top:var(--s1)">
          真实侧栏是满高容器、内部滚动，所以默认会截断超出部分。
          「展开面板」解除高度限制，用于看完整布局——它不改任何视觉规则。
        </p>
      </div>
      <div class="harness-group" style="margin-top:var(--s4)">
        <span class="harness-label">键盘验收</span>
        <p class="harness-note" style="margin-top:0">
          Tab 走遍所有控件，focus 环可见；Enter 触发；Esc 关浮层；<br>
          Ctrl / ⌘ + Enter 提交捕获。
        </p>
      </div>
      <div class="harness-group">
        <span class="harness-label">数据来源</span>
        <p class="harness-note" style="margin-top:0">
          真实库 3 条记忆 / 3 条记录 / 5 条未命中。<br>
          token 用 core 同口径实算，非占位值。
        </p>
      </div>`;
  }

  /* ==========================================================
   * 焦点管理（WCAG）
   *
   * ⚠️ 第 3 轮评审指出的架构级问题：
   * 早先存 `document.activeElement` 节点、关闭时 `isConnected` 判断后回焦。
   * 但 `render()` 每次都 `innerHTML = ...` 重建整个 #panel，
   * 旧节点必然 isConnected === false → 焦点落到 body。
   * **这条 WCAG 规则在原架构下不可能成立。**
   *
   * 修法：不存节点，存**选择器**（data-action + data-path/panes）。
   * 重绘后按同一个选择器找回等价元素再聚焦——语义上的「同一个控件」，
   * 而不是 DOM 意义上的同一个节点。
   * ========================================================== */

  /** 打开浮层前的焦点位置，存成选择器而非节点。 */
  let lastFocusSelector = null;

  /** 从元素反推一个稳定的选择器。 */
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
      /*
       * 记录焦点位置。
       *
       * 注意 `document.activeElement` 在点击瞬间可能已经是 body
       * （click 事件里浏览器不一定先聚焦按钮），所以要优先用事件来源。
       * 这里退一步：若 activeElement 无 data-action，就记录一个空串，
       * 关闭时按「捕获框」这一页级兜底处理。
       */
      lastFocusSelector = selectorOf(document.activeElement) ?? '';
      const firstButton = overlay.querySelector('button');
      if (firstButton !== null) firstButton.focus();
      return;
    }

    if (overlay === null && lastFocusSelector !== null) {
      /*
       * 重绘后按选择器找回等价元素。
       * 若原控件已不可用（被禁用/移除），退到该页的捕获框——
       * 「回到你刚才在打字的那个输入框」对用户仍然是最合理的落点。
       */
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

  /** 敏感内容检测（演示版；真实规则在 core/privacy.ts）。 */
  function looksSecret(text) {
    return /gho_[A-Za-z0-9]{10,}|sk-[A-Za-z0-9]{16,}/.test(text);
  }

  /**
   * 确认一条记忆：真实改内存状态，让界面能证明它有效。
   * 改完必须重算派生状态，否则队列不会更新。
   */
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

  /**
   * 提交捕获。返回 'empty' | 'blocked' | 'ok'。
   *
   * ⚠️ 第 1 轮评审 P0-1：早先这里只设 lastAction 就返回 'ok'，
   * 没有任何东西进 MO.INBOX —— 界面说「已存入记录流」，
   * 记录流里却没有这一条，下方列表也不变。这等于伪造写入。
   * 而且同时承诺「30 秒内可撤销」，却没有任何撤销控件。
   *
   * 现在真的 push 进 MO.INBOX，并保留刚写入的那条以便撤销。
   * 撤销做真的（从数组里移除），不做成假按钮。
   */
  function submitCapture() {
    const text = state.captureText.trim();
    if (text === '') return 'empty';
    if (looksSecret(text)) {
      state.openOverlay = 'privacy';
      return 'blocked';
    }

    /*
     * 写入失败态。
     *
     * ⚠️ 第 2 轮评审 P1：早先 submitCapture 永不失败，
     * 于是 IA §5.2 规定的「没存上：<原因>…内容还在输入框里」在界面上不可达，
     * 那条设计等于只存在于文档里。
     *
     * 原型用 `#fail` 触发：写入以 # 开头的文本会走失败路径。
     * 这不是玩具——真实系统里写盘可能因权限/磁盘/锁失败，
     * 而「失败时不许清空输入」是这条设计唯一要保住的东西。
     */
    if (text.startsWith('#fail')) {
      state.lastAction = {
        ok: false,
        source: 'capture',
        text: '没存上：磁盘写入被拒绝（示例）。内容还在输入框里，可以重试。',
      };
      return 'failed';   // 注意：不清空 captureText
    }

    // 多行拆条：与真实 store 的 captureBatch 语义一致
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    const maxLine = MO.INBOX.reduce((max, row) => Math.max(max, row.line), 0);
    const today = '2026-11-17';

    const created = lines.map((line, index) => ({
      line: maxLine + index + 1,
      date: today,
      kind: state.captureKind,
      content: line,
      state: 'open',
      destination: '—',
    }));
    // 置顶：最新一条在最前，与「最近记的」的阅读顺序一致
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
    /*
     * source: 'capture' 不可省。
     *
     * ⚠️ 第 2 轮评审 Quick-win 2：早先这里没有 source 字段，
     * 而今天页的两个渲染分支都按 source 决定归属（'suggest' 进建议卡、
     * 'capture' 进捕获框），于是撤销后**两个分支都不渲染**——
     * 用户点了撤销，提示彻底消失，正是本仓 §13.1 记过的「点了没反应」。
     *
     * 文案也截断：整条正文拼进提示会在 400px 下折成多行（评审 P1 亦指出）。
     */
    const brief = content.length > 20 ? `${content.slice(0, 20)}…` : content;
    state.lastAction = {
      ok: true,
      source: 'capture',
      text: `已撤销：「${brief}」`,
    };
  }

  function act(action, el) {
    const dataset = el.dataset;

    switch (action) {
      case 'goto':
        state.pane = dataset.pane;
        if (dataset.pane !== 'memory') state.detailPath = null;
        state.lastAction = null;
        /*
         * 切页时把错误/加载/空态重置回正常。
         * 第 1 轮评审指出：早先 goto 不动 phase，于是停在 #todo/error
         * 再点「记忆」，记忆页也是错误态——像整个插件坏了。
         * 错误态只属于它发生的那一页。
         */
        if (state.phase !== 'ready') state.phase = 'ready';
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
        /*
         * 真的改状态，不是只改文案。
         *
         * ⚠️ 第 3 轮评审 P0-1：早先这里只取 title 拼句子，`entry.status` 没动，
         * 于是点「归档退役」后 tag 仍是「观察中」、该条仍在待办里、计数不变——
         * 这是「用文案代替行为」第三次出现在同一份原型里。
         */
        if (entry !== undefined) {
          entry.status = 'archived';
          entry.confidence = 0;
        }
        const name = entry === undefined ? '' : entry.title.slice(0, 12);
        state.lastAction = {
          ok: true,
          source: 'memory',
          text: `已归档「${name}…」，之后仍可检索`,
        };
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
        /*
         * 「成功」不是一种渲染分支，而是一次真实的动作结果。
         * 这里注入一条与实际操作同构的反馈，让四态里的「成」有具体表现。
         */
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

  /**
   * 输入：只更新状态 + 主按钮可用态，**不整页重绘**。
   * 重绘会把光标顶掉——这是不用框架时必须自己守的纪律。
   */
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

  /**
   * 深链必须在运行中也能生效。
   *
   * ⚠️ 第 1 轮评审指出：早先只在启动调一次 applyHash()，全文没有 hashchange 监听，
   * 于是「手改地址栏 #todo/error」不会切换页面——而验收说明里写着「直接改 hash 也能到」。
   * 那等于承诺了一个做不到的功能。
   */
  window.addEventListener('hashchange', () => {
    applyHash();
    render();
  });

  applyHash();
  render();

  /*
   * 截图核对开关：?unfold=1 让面板按内容撑开。
   * 用 URL 参数而不是按钮状态，因为截图是在无交互的 headless 里跑的，
   * 点不到按钮。这是给验收流程用的，用户正常打开不会带这个参数。
   */
  if (window.location.search.indexOf('unfold=1') >= 0) {
    document.body.dataset.unfold = '1';
    render();
  }
})();
