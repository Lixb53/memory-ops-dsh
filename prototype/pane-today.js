/**
 * pane-today.js —— 「今天」页（v5 卡片仪表盘）
 *
 * 唯一核心任务：让用户在 1 秒内知道现在该做哪一件事，并能一键做掉。
 *
 * v4→v5：
 *   - 「其余线索」的隐形 hairline 行 → 2×2 指标 tile 带（每块可点、带去向）
 *   - 建议卡成为本页唯一「重卡」（card-fill + border-l3 + 主按钮）
 *   - 捕获框成为静卡
 * 无论数据是什么状态，都必须给出一件事——空库时那件事叫「写下第一条」。
 */

(function () {
  'use strict';

  const MO = window.MO;
  const { esc } = MO;

  /**
   * 优先级：拍板 > 补库 > 流转 > 兜底。
   * 拍板排第一：推断未确认前会持续参与检索且不可信，
   * 它是唯一「不做就会持续产生错误输出」的一类。
   */
  function pickSuggestion(data) {
    if (data.pendingDecisions.length > 0) {
      const first = data.pendingDecisions[0];
      const confidence = first.confidence === null ? '未标' : first.confidence.toFixed(1);
      return {
        label: '建议先做这一件',
        title: '有一条推断等你拍板',
        badge: MO.badge(MO.statusLabel(first.status), MO.STATUS_TONE[first.status]),
        body: `「${first.title}」——这是${first.originLabel}的，置信度 ${confidence}。`
          + '确认后它会参与后续会话；不确定就驳回，并写一句为什么。',
        primaryText: '确认这条',
        primary: `data-action="suggest-confirm" data-path="${esc(first.id)}"`,
        secondary: { action: 'open-detail', path: first.id, text: '先看全文' },
      };
    }

    if (data.fillable.length > 0) {
      return {
        label: '建议先做这一件',
        title: '补一条搜不到的东西',
        badge: MO.badge('等你补', 'warn'),
        body: `有 ${data.fillable.length} 个问题被反复问到（≥${MO.MISS_FILL_THRESHOLD} 次），库里还没有答案。`,
        primaryText: '去补库',
        primary: 'data-action="goto" data-pane="todo"',
        secondary: null,
      };
    }

    if (data.openInbox.length > 0) {
      const first = data.openInbox[0];
      const preview = first.content.length > 18 ? `${first.content.slice(0, 18)}…` : first.content;
      return {
        label: '建议先做这一件',
        title: '记录流里还有没结的事',
        badge: MO.badge(MO.INBOX_STATE_LABEL[first.state], MO.INBOX_STATE_TONE[first.state]),
        body: `「${preview}」等 ${data.openInbox.length} 条还没结。`
          + '做完标完成，不做就丢掉——留着会一直占位，也会让「待办」这个数字失去意义。',
        primaryText: '去处理',
        primary: 'data-action="goto" data-pane="todo"',
        secondary: { action: 'goto', pane: 'capture', text: '记新的' },
      };
    }

    return {
      label: '现在没有待办',
      title: '库里一切都处理完了',
      badge: MO.badge('清空', 'ok'),
      body: `${data.entries.length} 条记忆、0 条待办。这时候最有用的事是看看有没有该退役的，`
        + '或者记下今天的一个结论。',
      primaryText: '看看库里有什么',
      primary: 'data-action="goto" data-pane="memory"',
      secondary: { action: 'goto', pane: 'capture', text: '记一条' },
    };
  }

  /** 建议卡的第二出口。 */
  function secondaryButton(secondary) {
    if (secondary.action === 'open-detail') {
      return `<button class="btn btn-quiet" data-action="open-detail"
        data-path="${esc(secondary.path)}">${esc(secondary.text)}</button>`;
    }
    return `<button class="btn btn-quiet" data-action="goto"
      data-pane="${esc(secondary.pane)}">${esc(secondary.text)}</button>`;
  }

  /**
   * 捕获框（静卡）。
   * @param solo 为 true 时「存进去」用主按钮。
   *   判定口径：这一屏除了它还有没有别的主操作。
   *   正常态建议卡占用蓝名额 → 次按钮；空态建议卡不存在 → 主按钮。
   */
  function captureBox(state, solo) {
    const own = sourceOf(state.lastAction) === 'capture';
    const submit = solo === true
      ? MO.primary('存进去', 'data-action="capture"', state.captureText.trim() === '')
      : MO.button('存进去', 'data-action="capture"');
    return `<div class="capture">
      <textarea class="capture-input" data-field="captureText"
        aria-label="记一条" placeholder="一句话赶紧存了…">${esc(state.captureText)}</textarea>
      <div class="capture-foot">
        ${submit}
        <span class="capture-hint">Ctrl / ⌘ + Enter</span>
      </div>
      ${own ? MO.inlineResult(state.lastAction, state.lastCapture !== null) : ''}
    </div>`;
  }

  /** 反馈归属：这条提示该显示在哪个控件旁边。 */
  function sourceOf(action) {
    if (action === null || action === undefined) return '';
    return action.source === undefined ? '' : action.source;
  }

  MO.renderToday = function renderToday(state, data) {
    if (state.phase === 'loading') {
      return `<div class="tape">${MO.skeleton(1, 56)}${MO.skeleton(1, 56)}</div>`
        + MO.skeleton(1, 32) + MO.skeleton(1, 22) + MO.skeleton(1, 120);
    }

    if (state.phase === 'error') {
      return MO.errorState(
        '读不到记忆库',
        '库文件没有丢，这是读取问题。先重试；如果一直失败，去「库健康」看库根目录还在不在。',
        MO.primary('重试', 'data-action="retry"')
          + MO.button('去库健康', 'data-action="goto" data-pane="health"'),
      );
    }

    if (state.phase === 'empty' || data.entries.length === 0) {
      /* 空白库：唯一出路是写下第一条，所以捕获用主按钮。 */
      return `<div>
          <h1 class="lede">这是你的第一条记忆</h1>
          <p class="lede-sub">写一句你今天想记住的话，agent 下次就会用上它。</p>
        </div>
        ${captureBox(state, true)}`;
    }

    /* 结论句必须由数据算出来，不能写字面量（v4 教训保留）。 */
    const lede = data.todoTotal === 0
      ? `没有待办。库里 ${data.entries.length} 条，记录流 ${data.inbox.length} 条。`
      : `有 ${data.todoTotal} 件事压着，先从最上面那件开始`;

    const sug = pickSuggestion(data);

    /* v6：KPI 账带在首屏最前（一眼全局），其次建议卡（唯一重卡），
       再次捕获条。原「其余线索」hairline 行并入账带。 */
    const tape = MO.tape([
      { value: data.todoTotal, label: '件事压着', pane: 'todo' },
      { value: data.misses.length, label: '搜不到', pane: 'todo' },
      { value: data.entries.length, label: '条记忆', pane: 'memory' },
      { value: MO.COST.billedWithoutSkills, label: 'tok/请求', pane: 'health' },
    ]);

    return `${tape}
      <div>
        <h1 class="lede">${esc(lede)}</h1>
        <p class="lede-sub">这个面板只回答一个问题：你现在该做哪件事。其余都收在下面。</p>
      </div>

      ${MO.card(`
        <p class="card-label">${esc(sug.label)}</p>
        <h2 class="card-title">${esc(sug.title)}</h2>
        <p class="card-body">${esc(sug.body)}</p>
        <div class="card-actions">${sug.badge}</div>
        <div class="card-actions">
          ${MO.primary(sug.primaryText, sug.primary, false)}
          ${sug.secondary === null ? '' : secondaryButton(sug.secondary)}
        </div>
        ${sourceOf(state.lastAction) === 'suggest' ? MO.inlineResult(state.lastAction) : ''}
      `)}

      ${MO.cardQuiet(`
        ${MO.sectionHead('随手记一条', '1 步')}
        ${captureBox(state)}
      `)}`;
  };
})();
