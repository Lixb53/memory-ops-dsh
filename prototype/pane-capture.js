/**
 * pane-capture.js —— 「记一条」页（v5 卡片仪表盘）
 *
 * 唯一核心任务：把一句话写进 INBOX，并让用户看到它真的进去了。
 *
 * v4→v5：捕获区 = 本页唯一重卡（主操作所在）；
 * 「最近记的」从裸 hairline 列表改为静卡容器；
 * 类型签选中态改蓝 tint。
 */

(function () {
  'use strict';

  const MO = window.MO;
  const { esc } = MO;

  const KINDS = ['想法', '计划', '问题', '待办', '决策'];

  /** 类型选择：文字签，比下拉少一次点击，且五个类型常驻可见。 */
  function kindRow(state) {
    const buttons = KINDS.map(kind => `<button class="kindbtn" data-action="set-kind"
      data-kind="${kind}" aria-pressed="${state.captureKind === kind}">${kind}</button>`).join('');
    return `<div class="kindrow" role="group" aria-label="记录类型">${buttons}</div>`;
  }

  MO.renderCapture = function renderCapture(state, data) {
    const head = `<div>
        <h1 class="page-name">记一条</h1>
        <p class="lede">先存下来，之后在「待办」里整理。</p>
        <p class="lede-sub">不需要想清楚怎么写。</p>
      </div>
      ${MO.card(`
        ${kindRow(state)}
        <div class="capture">
          <textarea class="capture-input" data-field="captureText" style="min-height:88px"
            aria-label="记录内容"
            placeholder="想到什么写什么，多行会逐条拆开">${esc(state.captureText)}</textarea>
          <div class="capture-foot">
            ${MO.primary('存进去', 'data-action="capture"', state.captureText.trim() === '')}
            <span class="capture-hint">Ctrl / ⌘ + Enter</span>
          </div>
        </div>
        <p class="note">存之前会检查有没有密钥、私钥、身份证号、内网 IP——有就拒写，并给出脱敏版本。</p>
        ${MO.inlineResult(state.lastAction, state.lastCapture !== null)}
      `)}`;

    if (state.phase === 'loading') {
      return head + MO.sectionHead('最近记的') + MO.cardQuiet(MO.skeleton(3, 40));
    }

    /*
     * 历史列表读失败时，捕获框仍然可用（写和读是两条独立路径）。
     * 这一相位下不给「重试」主按钮：head 的「存进去」已占用整页唯一蓝名额。
     */
    if (state.phase === 'error') {
      return head + MO.errorState(
        '读不到历史记录',
        '写入仍然可用——上面那个输入框不受影响。这里只是「最近记的」列表读不出来。',
        MO.button('重试读取', 'data-action="retry"'),
      );
    }

    if (state.phase === 'empty' || data.inbox.length === 0) {
      return head + MO.sectionHead('最近记的') + MO.cardQuiet(MO.emptyState(
        '还没有记过',
        '这里会列出你刚存下的每一条。存完立刻能看到，也会出现在「待办」里。',
      ));
    }

    const rows = data.inbox.map(row => {
      const dest = row.destination === '—'
        ? ''
        : `<span class="meta">→ ${esc(row.destination)}</span>`;
      return `<li class="row">
        <p class="row-title">${esc(row.content)}</p>
        <div class="meta-row">
          <span class="meta">${esc(row.date)}</span>
          <span class="meta">${esc(row.kind)}</span>
          ${MO.badge(MO.INBOX_STATE_LABEL[row.state] || row.state, MO.INBOX_STATE_TONE[row.state])}
          ${dest}
        </div>
      </li>`;
    }).join('');

    return head + MO.sectionHead('最近记的', `${data.inbox.length} 条`)
      + MO.cardQuiet(`<ul class="list" role="list">${rows}</ul>`);
  };
})();
