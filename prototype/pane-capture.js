/**
 * pane-capture.js —— 「记一条」页
 *
 * 唯一核心任务：把一句话写进 INBOX，并让用户看到它真的进去了。
 *
 * 保留旧「记录流」的全部捕获能力（类型选择、多行拆条、隐私拦截）。
 * 改名理由见 information-architecture.md 根因 4：
 * 「记录流」听起来像只读日志，用户不知道那是唯一能写入的地方。
 */

(function () {
  'use strict';

  const MO = window.MO;
  const { esc, tag, skeleton } = MO;

  const KINDS = ['想法', '计划', '问题', '待办', '决策'];

  /** 类型选择：文字签，比下拉少一次点击，且五个类型常驻可见。 */
  function kindRow(state) {
    const buttons = KINDS.map(kind => `<button class="kindbtn" data-action="set-kind"
      data-kind="${kind}" aria-pressed="${state.captureKind === kind}">${kind}</button>`).join('');
    return `<div class="kindrow" role="group" aria-label="记录类型">${buttons}</div>`;
  }

  MO.renderCapture = function renderCapture(state, data) {
    /*
     * T1 给导语句，页面名降为 T3（同 todo 页的裁决）。
     * 「记一条」是导航词，上方 nav 已标过。
     */
    const head = `<h1 class="page-name">记一条</h1>
      <p class="lede">先存下来，之后在「待办」里整理。</p>
      <p class="lede-sub">不需要想清楚怎么写。</p>
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
      ${MO.inlineResult(state.lastAction, state.lastCapture !== null)}`;

    if (state.phase === 'loading') {
      return head + MO.sectionHead('最近记的') + skeleton(3, 40);
    }

    /*
     * 历史列表读失败时，捕获框仍然可用。
     * 写和读是两条独立路径，没有理由因为读不出来就不让人写。
     *
     * ⚠️ 而且这一相位下**不该给「重试」主按钮**（第 2 轮评审 P0-A）：
     * head 里的「存进去」恒定渲染，若这里再用 MO.primary，
     * 同屏就有两处 brand 实底，违反方向卡 §二。
     * 更根本的理由：读失败时用户真正想做的还是「写」——
     * 主操作应当是继续写，重试只是次选。所以重试降为次按钮。
     */
    if (state.phase === 'error') {
      return head + MO.errorState(
        '读不到历史记录',
        '写入仍然可用——上面那个输入框不受影响。这里只是「最近记的」列表读不出来。',
        MO.button('重试读取', 'data-action="retry"'),
      );
    }

    if (state.phase === 'empty' || data.inbox.length === 0) {
      return head + MO.sectionHead('最近记的') + MO.emptyState(
        '还没有记过',
        '这里会列出你刚存下的每一条。存完立刻能看到，也会出现在「待办」里。',
      );
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
          ${tag(MO.INBOX_STATE_LABEL[row.state] || row.state, row.state === 'done' ? 'ok' : 'warn')}
          ${dest}
        </div>
      </li>`;
    }).join('');

    return head + MO.sectionHead('最近记的', `${data.inbox.length} 条`)
      + `<ul class="list">${rows}</ul>`;
  };
})();
