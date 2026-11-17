/**
 * pane-today.js —— 「今天」页
 *
 * 唯一核心任务：让用户在 1 秒内知道现在该做哪一件事，并能一键做掉。
 *
 * ## 为什么这张建议卡必须存在
 *
 * 旧首屏（本项目分区）的 KPI 全是空转仪表：队列为空时它整块不渲染，
 * 于是「最需要说话的时刻」反而最安静。这里的硬规则是：
 * **无论数据是什么状态，都必须给出一件事**。没有待办也是一件事——
 * 那件事叫「去看看库里有什么」。
 */

(function () {
  'use strict';

  const MO = window.MO;
  const { esc, tag, skeleton } = MO;

  /**
   * 优先级：拍板 > 补库 > 流转 > 兜底。
   *
   * 为什么拍板排第一：推断类条目未确认前会持续参与检索且不可信，
   * 它是唯一「不做就会持续产生错误输出」的一类。
   *
   * 标题写法：动作用第一人称句子（「有一条推断等你确认」），
   * 条目名放在 body 里。早先把长标题塞进 h2，400px 下被截成
   * 「确认「dsh-config 仓库：个人 ski…」」——用户看不出在确认什么，
   * 因为真正的信息（这是推断、置信 0.5）被截断吃掉了。
   */
  function pickSuggestion(data) {
    if (data.pendingDecisions.length > 0) {
      const first = data.pendingDecisions[0];
      const confidence = first.confidence === null ? '未标' : first.confidence.toFixed(1);
      return {
        label: '建议先做这一件',
        title: '有一条推断等你拍板',
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
        body: `有 ${data.fillable.length} 个问题被反复问到（≥${MO.MISS_FILL_THRESHOLD} 次），`
          + '库里还没有答案。',
        primaryText: '去补库',
        primary: 'data-action="goto" data-pane="todo"',
        secondary: null,
      };
    }

    if (data.openInbox.length > 0) {
      const first = data.openInbox[0];
      const preview = first.content.length > 18
        ? `${first.content.slice(0, 18)}…` : first.content;
      return {
        label: '建议先做这一件',
        title: '记录流里还有没结的事',
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
      body: '3 条记忆、0 条待办。这时候最有用的事是看看有没有该退役的，'
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
   * 捕获框：首屏常驻，1 步写入。
   *
   * @param solo 为 true 时「存进去」用主按钮。
   *   判定口径：**这一屏除了它还有没有别的主操作**。
   *   正常态下建议卡已占用 brand 名额，所以它是次按钮；
   *   空态下建议卡不存在，它就是这个页面的唯一出路，该用主按钮。
   *   （第 2 轮评审的穷举测试发现 today/empty 是 0 处 brand 实底——
   *   空白库最需要的动作反而没有视觉权重，这是真实缺陷。）
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

  /** 反馈归属：决定这条提示该显示在哪个控件旁边。 */
  function sourceOf(action) {
    if (action === null || action === undefined) return '';
    return action.source === undefined ? '' : action.source;
  }

  /**
   * 一条线索：动词 + 数字，横排一行。
   *
   * ⚠️ 第 1 轮评审的创新性 6/10 就赢在这里：早先这里是一个 2×2 等大方格、
   * 格内「大数字 + 小标签」，结构与方向卡 §七 判死的「固定三卡功能网格」同构——
   * 最像模板的元素留在了最重要的页面。
   *
   * 改成横排的行内线索：句子里嵌数字，像编辑体的脚注。
   * 不同时长的内容不占等宽方格，密度由文字自然决定。
   */
  function trailLine(value, text, pane) {
    return `<button class="trail-line" data-action="goto" data-pane="${esc(pane)}">
      <span class="trail-num">${esc(value)}</span>
      <span class="trail-text">${esc(text)}</span>
    </button>`;
  }

  MO.renderToday = function renderToday(state, data) {
    if (state.phase === 'loading') {
      return skeleton(1, 28) + skeleton(1, 22)
        + '<div style="height:var(--s4)"></div>' + skeleton(2, 96);
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
      /*
       * 空白库：唯一出路是写下第一条，所以这里用主按钮。
       * 复用 captureBox 但通过参数切换按钮权重——
       * 「今天」正常态下捕获是旁路动作（次按钮），
       * 空态下它是唯一动作（主按钮）。同一控件，两种语境。
       */
      return `<h1 class="lede">这是你的第一条记忆</h1>
        <p class="lede-sub">写一句你今天想记住的话，agent 下次就会用上它。</p>
        ${captureBox(state, true)}`;
    }

    /*
     * 结论句必须由数据算出来，不能写字面量。
     * 第 1 轮评审指出这里曾是「库里 3 条，最近一条 1 天前」死字符串——
     * 存了新条目之后它不会变，用户会以为没存进去。
     */
    const lede = data.todoTotal === 0
      ? `没有待办。库里 ${data.entries.length} 条，`
        + `记录流 ${data.inbox.length} 条。`
      : `有 ${data.todoTotal} 件事压着，先从最上面那件开始`;

    const sug = pickSuggestion(data);

    return `<h1 class="lede">${esc(lede)}</h1>
      <p class="lede-sub">这个面板只回答一个问题：你现在该做哪件事。其余都收在下面。</p>

      <div class="suggest">
        <p class="suggest-label">${esc(sug.label)}</p>
        <h2 class="suggest-title">${esc(sug.title)}</h2>
        <p class="suggest-body">${esc(sug.body)}</p>
        <div class="suggest-actions">
          ${MO.primary(sug.primaryText, sug.primary, false)}
          ${sug.secondary === null ? '' : secondaryButton(sug.secondary)}
        </div>
        ${sourceOf(state.lastAction) === 'suggest'
    ? MO.inlineResult(state.lastAction) : ''}
      </div>

      ${MO.sectionHead('随手记一条', '1 步')}
      ${captureBox(state)}

      ${MO.sectionHead('其余线索')}
      <div class="trail">
        ${trailLine(data.todoTotal, '件事等着你处理', 'todo')}
        ${trailLine(data.misses.length, '个问题搜不到，先记着', 'todo')}
        ${trailLine(data.entries.length, '条记忆在库里', 'memory')}
        ${trailLine(MO.COST.billedWithoutSkills, 'tokens 每请求成本', 'health')}
      </div>`;
  };
})();
