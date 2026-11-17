/**
 * pane-todo.js —— 「待办」页
 *
 * 唯一核心任务：把压着的事清掉。
 *
 * ## 三段为什么这样分
 *
 * 「待办」在旧界面里散落在三个地方（记录流 / 待你处理队列 / 未命中），
 * 用户不知道去哪。v4 把它们按**用户要做的动作类型**合并成一页三段：
 *   - 要我拍板的：推断待确认、待复核、到期
 *   - 要我流转的：INBOX 里 open / todo
 *   - 要我补的：搜不到且达到阈值
 *
 * ## 空段的处理
 *
 * 空段**整体不渲染**，不显示「0 条」——那是给系统看的口径，不是给人看的。
 * 唯一例外是「要我补的」：本机 5 条未命中全部未达阈值，如果整段消失，
 * 用户会以为这个功能不存在。所以它换成一句可行动的说明。
 */

(function () {
  'use strict';

  const MO = window.MO;
  const { esc, tag, skeleton } = MO;

  /**
   * 段 1：要我拍板的。
   *
   * @param ownsPrimary 本段是否拿到了整页唯一的 brand 实底名额。
   *   第 2 轮评审指出：早先「是不是第一个」是段内变量（index === 0），
   *   于是 decisionsLane 的第一条和 fillLane 的第一条会各出一个 primary，
   *   一旦某条未命中 count>=3 与待拍板同屏，整页就是 2 处 brand 实底。
   *   现在改为**整页作用域分配**：三段按优先级顺序申请，谁先拿到谁用。
   */
  function decisionsLane(data, ownsPrimary) {
    if (data.pendingDecisions.length === 0) return '';

    const rows = data.pendingDecisions.map((entry, index) => {
      const ev = entry.evidence.length === 0
        ? ''
        : `<div class="evidence">${esc(entry.evidence[0].excerpt.slice(0, 90))}…</div>`;
      const conf = entry.confidence === null ? '—' : entry.confidence.toFixed(1);
      /*
       * 一行只留 1 主按钮 + 1 文字链（方向卡 §八-1）。
       * 「驳回」必须写理由，收进 details 后仍同等可达，只是不抢第一眼。
       *
       * 只有「拿到名额的段」里的第 1 条用 brand 实底，其余一律次按钮。
       */
      const usePrimary = ownsPrimary === true && index === 0;
      const confirmBtn = usePrimary
        ? MO.primary('确认', `data-action="confirm" data-path="${esc(entry.id)}"`, false, true)
        : MO.button('确认', `data-action="confirm" data-path="${esc(entry.id)}"`, 'btn-sm');
      return `<li class="row">
        <button class="row-button" data-action="open-detail"
          data-path="${esc(entry.id)}">${esc(entry.title)}</button>
        <div class="meta-row">
          ${tag(MO.statusLabel(entry.status), MO.STATUS_TONE[entry.status])}
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

    return MO.sectionHead('要我拍板的', String(data.pendingDecisions.length))
      + `<ul class="list">${rows}</ul>`;
  }

  /**
   * 段 2：要我流转的。
   *
   * 整页的 brand 实底已经被段 1 的第一条占用，所以这里全部用次按钮。
   * 这不是「流转不重要」，而是「同一屏只能有一个视觉上的第一优先」——
   * 用户按下它之后，下一个自然递补成第一优先。
   */
  function flowLane(data) {
    const openRows = data.inbox.filter(row => row.state === 'open' || row.state === 'todo');
    if (openRows.length === 0) return '';

    const rows = openRows.map(row => `<li class="row">
        <p class="row-title">${esc(row.content)}</p>
        <div class="meta-row">
          <span class="meta">${esc(row.date)}</span>
          <span class="meta">${esc(row.kind)}</span>
          ${tag(MO.INBOX_STATE_LABEL[row.state] || row.state, 'warn')}
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

    return MO.sectionHead('要我流转的', String(openRows.length))
      + `<ul class="list">${rows}</ul>`;
  }

  /** 段 3：要我补的。 */
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
            ${tag('等你补', 'warn')}
            <span class="meta">问过 ${item.count} 次</span>
            <span class="meta">${item.sessions} 个会话</span>
          </div>
          <div class="row-actions">
            ${writeBtn}
            ${MO.textLink('不补', 'data-action="noop"')}
          </div>
        </li>`;
      }).join('');
      return MO.sectionHead('要我补的', String(data.fillable.length))
        + `<ul class="list">${rows}</ul>`;
    }

  /*
   * 未达阈值时的诚实处理。
   *
   * 本机 5 条未命中全部 count=1，阈值是 3。旧界面让整段消失，
   * 于是「未命中」页看着像没数据（其实有 5 条）。
   * 这里把它变成一句说明 + 一个数字，让用户知道「功能在，只是还没到时候」。
   *
   * ⚠️ 第 1 轮评审指出：只有说明文字、没有任何可点动作，
   * 却在正文里说「现在补也行」——这恰恰是 IA 根因 3 批过的
   * 「最需要说话的时刻最安静」。所以补一个真实出口。
   */
    if (data.misses.length === 0) return '';

    /*
     * 这段的「仍然补一条」也要参与整页 brand 名额分配。
     * 否则当别处都没有待办、只剩这一段时（例如刚确认完最后一条），
     * 整页会是 0 处 brand 实底——用户看到一整屏说明文字却无处可点。
     */
    const fillBtn = ownsPrimary === true
      ? MO.primary('仍然补一条', 'data-action="noop"')
      : MO.button('仍然补一条', 'data-action="noop"', 'btn-sm');

    return MO.sectionHead('要我补的', '0')
      + MO.notice(
        '还没有到该补的时候',
        `${data.misses.length} 个问题各被搜过 1 次，还没到 ${MO.MISS_FILL_THRESHOLD} 次的阈值。`
        + `同一个问题再被搜到 ${MO.MISS_FILL_THRESHOLD - 1} 次，它就会自动出现在这里等你补。`
        + '现在补也行——只是系统还没证据说明它值得占位。',
      )
      + `<div class="row-actions">
        ${fillBtn}
        <span class="note" style="margin:0">会从上面 ${data.misses.length} 个问题里挑一个开始</span>
      </div>`;
  }

  MO.renderTodo = function renderTodo(state, data) {
    if (state.phase === 'loading') return skeleton(3, 64);

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

    /*
     * T1 只给「一句话结论」，不给页面名。
     *
     * ⚠️ 第 3 轮评审：早先这里写 `<h1 class="lede">待办</h1>`——那是导航词复用，
     * 而上方 40px 的 nav 已经用加粗+下划线标过一遍「待办」。
     * 方向卡定义 T1 = 一句话结论，所以这一页的 T1 应该是下面的 summary 句，
     * 页面名降为 T3（.page-name）。
     */
    const head = `<h1 class="page-name">待办</h1>
      <p class="lede">${esc(summary)}</p>`;

    if (state.phase === 'empty' || data.todoTotal === 0) {
      return head + MO.emptyState(
        '清空了',
        '下次 agent 搜不到东西、或者我从对话里总结出新的推断时，这里会自动出现。现在不用管它。',
        MO.primary('记一条', 'data-action="goto" data-pane="capture"')
          + MO.button('去记忆', 'data-action="goto" data-pane="memory"'),
      ) + MO.inlineResult(state.lastAction);
    }

    /*
     * brand 实底名额：整页只有 1 个，按优先级顺序分配。
     *
     * 顺序 = 用户该先做什么：拍板 > 补库 > 流转（> notice 兜底出口）。
     * 早先每段各自判断「自己是不是第一个」，导致跨段冲突
     * （待拍板 1 条 + 未命中达标 1 条 → 同屏 2 处 brand）。
     * 现在在这里统一裁决，段函数只接受结果。
     */
    const firstSection = data.pendingDecisions.length > 0
      ? 'decisions'
      : data.fillable.length > 0 ? 'fill' : 'fill-notice';

    const flowHtml = flowLane(data);
    const fillHtml = fillLane(data, firstSection === 'fill' || firstSection === 'fill-notice');

    /* 三段全空（只有 notice 兜底）时，那一处按钮就是整页主操作 */
    return head
      + decisionsLane(data, firstSection === 'decisions')
      + flowHtml
      + fillHtml
      + MO.inlineResult(state.lastAction);
  };
})();
