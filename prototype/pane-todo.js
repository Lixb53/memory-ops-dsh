/**
 * pane-todo.js —— 「待办」页（v5 卡片仪表盘）
 *
 * 唯一核心任务：把压着的事清掉。三段按动作类型分：
 *   要我拍板的 / 要我流转的 / 要我补的
 *
 * v4→v5：三段各自成卡。拍板段 = 唯一重卡（主操作所在）；
 * 其余两段静卡。空段不渲染的裁决保留；「要我补的」未达阈值时
 * 仍给一句可行动说明 + 真实出口（最需要说话的时刻不许安静）。
 */

(function () {
  'use strict';

  const MO = window.MO;
  const { esc } = MO;

  /**
   * 段 1：要我拍板的（重卡）。
   * @param ownsPrimary 本段是否拿到整页唯一蓝实底名额（整页作用域分配）。
   */
  function decisionsLane(data, ownsPrimary) {
    if (data.pendingDecisions.length === 0) return '';

    const rows = data.pendingDecisions.map((entry, index) => {
      const ev = entry.evidence.length === 0
        ? ''
        : `<div class="evidence">${esc(entry.evidence[0].excerpt.slice(0, 90))}…</div>`;
      const conf = entry.confidence === null ? '—' : entry.confidence.toFixed(1);
      const usePrimary = ownsPrimary === true && index === 0;
      const confirmBtn = usePrimary
        ? MO.primary('确认', `data-action="confirm" data-path="${esc(entry.id)}"`, false, true)
        : MO.button('确认', `data-action="confirm" data-path="${esc(entry.id)}"`, 'btn-sm');
      return `<li class="row">
        <button class="row-button" data-action="open-detail"
          data-path="${esc(entry.id)}">${esc(entry.title)}</button>
        <div class="meta-row">
          ${MO.badge(MO.statusLabel(entry.status), MO.STATUS_TONE[entry.status])}
          <span class="meta">${esc(entry.originLabel)}</span>
          <span class="meta">置信 ${conf}</span>
        </div>
        ${ev}
        <div class="row-actions">
          ${confirmBtn}
          ${MO.textLink('看全文', `data-action="open-detail" data-path="${esc(entry.id)}"`)}
        </div>
        <details class="more">
          <summary>其它处理方式</summary>
          <div class="more-body">
            ${MO.button('驳回（需要写理由）', `data-action="open-detail" data-path="${esc(entry.id)}"`, 'btn-sm')}
            <p class="note">驳回会静默 30 天，所以必须写一句为什么。</p>
          </div>
        </details>
      </li>`;
    }).join('');

    return MO.card(`
      ${MO.sectionHead('要我拍板的', String(data.pendingDecisions.length))}
      <ul class="list list-clickable" role="list">${rows}</ul>
    `);
  }

  /** 段 2：要我流转的（静卡）。整页蓝名额已被段 1 占用，这里全部次按钮。 */
  function flowLane(data) {
    const openRows = data.inbox.filter(row => row.state === 'open' || row.state === 'todo');
    if (openRows.length === 0) return '';

    const rows = openRows.map(row => `<li class="row">
        <p class="row-title">${esc(row.content)}</p>
        <div class="meta-row">
          <span class="meta">${esc(row.date)}</span>
          <span class="meta">${esc(row.kind)}</span>
          ${MO.badge(MO.INBOX_STATE_LABEL[row.state] || row.state, MO.INBOX_STATE_TONE[row.state])}
        </div>
        <div class="row-actions">
          ${MO.button('标完成', `data-action="inbox-done" data-line="${row.line}"`, 'btn-sm')}
          ${MO.textLink('改内容', 'data-action="goto" data-pane="capture"')}
        </div>
        <details class="more">
          <summary>不做了</summary>
          <div class="more-body">
            ${MO.button('丢掉这条', `data-action="inbox-drop" data-line="${row.line}"`, 'btn-sm')}
            <p class="note">丢掉表示「我已经判断不做」。它会从待办移除，记录仍在记录流里。</p>
          </div>
        </details>
      </li>`).join('');

    return MO.cardQuiet(`
      ${MO.sectionHead('要我流转的', String(openRows.length))}
      <ul class="list" role="list">${rows}</ul>
    `);
  }

  /** 段 3：要我补的（静卡）。 */
  function fillLane(data, ownsPrimary) {
    if (data.fillable.length > 0) {
      const rows = data.fillable.map((item, index) => {
        const usePrimary = ownsPrimary === true && index === 0;
        const writeBtn = usePrimary
          ? MO.primary('写结论', 'data-action="noop"', false, true)
          : MO.button('写结论', 'data-action="noop"', 'btn-sm');
        return `<li class="row">
          <p class="row-title">${esc(item.query)}</p>
          <div class="meta-row">
            ${MO.badge('等你补', 'warn')}
            <span class="meta">问过 ${item.count} 次</span>
            <span class="meta">${item.sessions} 个会话</span>
          </div>
          <div class="row-actions">
            ${writeBtn}
            ${MO.textLink('不补', 'data-action="noop"')}
          </div>
        </li>`;
      }).join('');
      return MO.cardQuiet(`
        ${MO.sectionHead('要我补的', String(data.fillable.length))}
        <ul class="list" role="list">${rows}</ul>
      `);
    }

    if (data.misses.length === 0) return '';

    /* 未达阈值的诚实处理：功能在，只是还没到时候。给真实出口。 */
    const fillBtn = ownsPrimary === true
      ? MO.primary('仍然补一条', 'data-action="noop"')
      : MO.button('仍然补一条', 'data-action="noop"', 'btn-sm');

    return MO.cardQuiet(`
      ${MO.sectionHead('要我补的', '0')}
      ${MO.notice(
        '还没有到该补的时候',
        `${data.misses.length} 个问题各被搜过 1 次，还没到 ${MO.MISS_FILL_THRESHOLD} 次的阈值。`
        + `同一个问题再被搜到 ${MO.MISS_FILL_THRESHOLD - 1} 次，它就会自动出现在这里等你补。`
        + '现在补也行——只是系统还没证据说明它值得占位。',
        'warn',
      )}
      <div class="row-actions">
        ${fillBtn}
        <span class="note">会从上面 ${data.misses.length} 个问题里挑一个开始</span>
      </div>
    `);
  }

  MO.renderTodo = function renderTodo(state, data) {
    if (state.phase === 'loading') return MO.skeleton(3, 64);

    if (state.phase === 'error') {
      return MO.errorState(
        '读不到待办',
        '三段里任意一段失败不影响其它两段——先重试，还不行就去「记忆」直接看条目。',
        MO.primary('重试', 'data-action="retry"')
          + MO.button('去记忆', 'data-action="goto" data-pane="memory"'),
      );
    }

    const summary = data.todoTotal === 0
      ? '三段都清空了。'
      : `共 ${data.todoTotal} 件，分三类：要我拍板的、要我流转的、要我补的。`;

    const head = `<div>
        <h1 class="page-name">待办</h1>
        <p class="lede">${esc(summary)}</p>
      </div>`;

    if (state.phase === 'empty' || data.todoTotal === 0) {
      return head + MO.card(MO.emptyState(
        '清空了',
        '下次 agent 搜不到东西、或者我从对话里总结出新的推断时，这里会自动出现。现在不用管它。',
        MO.primary('记一条', 'data-action="goto" data-pane="capture"')
          + MO.button('去记忆', 'data-action="goto" data-pane="memory"'),
      )) + MO.inlineResult(state.lastAction);
    }

    /*
     * 蓝实底名额：整页只有 1 个，按优先级顺序分配。
     * 顺序 = 用户该先做什么：拍板 > 补库 > 流转（> notice 兜底出口）。
     */
    const firstSection = data.pendingDecisions.length > 0
      ? 'decisions'
      : data.fillable.length > 0 ? 'fill' : 'fill-notice';

    return head
      + decisionsLane(data, firstSection === 'decisions')
      + flowLane(data)
      + fillLane(data, firstSection === 'fill' || firstSection === 'fill-notice')
      + MO.inlineResult(state.lastAction);
  };
})();
