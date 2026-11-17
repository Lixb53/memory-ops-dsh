/**
 * pane-memory.js —— 「记忆」页（列表 + 详情）
 *
 * 唯一核心任务：找到某条记忆并处理它。
 *
 * ## 列表为什么不是卡片
 *
 * 旧实现的每条记忆是一张 `border-radius: 8` 卡片，于是 3 条记忆看起来像
 * 3 个功能模块。台账应该像台账：hairline 分隔、行内元信息等宽右对齐。
 * 这也是 design/direction-card.md §四 里「条目行圆角 0」的来源。
 */

(function () {
  'use strict';

  const MO = window.MO;
  const { esc, tag, skeleton } = MO;

  /**
   * 筛选分组必须与列表里显示的状态标签**用同一套词**。
   *
   * ⚠️ 早先这里写「待确认 / 待复核」三个筛选签，而 observed 在行内显示为
   * 「观察中」——于是筛选签说「待确认 1」，列表里却找不到一个叫「待确认」的条目。
   * 用户会怀疑筛选坏了。术语对照见 information-architecture.md §四：
   * 状态机名一律不许出现在界面，observed 就叫「观察中」。
   *
   * 所以筛选签用「要我拍板的」这样的动作词，而不是状态机名。
   */
  const STATUS_GROUPS = [
    { id: '', label: '全部', match: () => true },
    { id: 'pending', label: '要我拍板', match: s => s === 'hypothesis' || s === 'observed' },
    { id: 'stale', label: '待复核', match: s => s === 'stale' },
    { id: 'confirmed', label: '已确认', match: s => s === 'confirmed' || s === 'active' },
  ];

  const SCOPES = [
    { id: '', label: '全库' },
    { id: 'personal', label: '个人' },
    { id: 'work/dsh-config', label: 'dsh-config' },
  ];

  /* ==========================================================
   * 正文预览
   * ========================================================== */

  function bodyOf(entry) {
    if (entry.id === 'personal.principles') {
      return '所有会话的思考过程和结果全都使用中文';
    }
    if (entry.id === 'personal.INBOX') {
      return '（INBOX 是记录流的真相源，正文是那张五列表格——见「记一条」页。）';
    }
    return '## 事实\n\n'
      + '- 仓库：私有 Lixb53/dsh-config，本地在 G:\\dsh-home；'
      + 'DSH 家目录是 F:\\dsh-home，profile desktop。\n'
      + '- 结构：skills/<kebab>/SKILL.md、presets/<id>/、profiles/desktop/。\n\n'
      + '## 环境注意\n\n'
      + '- 本机只有 Windows PowerShell 5.1，没有 pwsh 7；.ps1 必须带 UTF-8 BOM。\n'
      + '- GitHub 走 HTTPS + Git Credential Manager；SSH 443 超时不可用。';
  }

  /* ==========================================================
   * 详情
   * ========================================================== */

  function renderDetail(state, data) {
    const entry = data.entries.find(e => e.id === state.detailPath);

    if (entry === undefined) {
      return MO.errorState(
        '找不到这条记忆',
        '它可能已经被删除或改名。返回列表重新找——这不影响库里其它条目。',
        MO.primary('返回列表', 'data-action="back-to-list"'),
      );
    }

    /*
     * 证据出处：显示闸门含义，不显示编号。
     *
     * ⚠️ 第 1 轮评审 P1：早先直接渲染 item.gate（值为 "G3"），
     * 而 IA §四 明文规定 G1/G2/G3/G4 必须翻成「你亲口说的 / 从对话总结的」。
     * 编号是内部闸门表，用户不认识它——留着等于在界面上放了四个无意义的字母。
     */
    const gateLabel = {
      G1: '你亲口说的',
      G2: '会话里记录的',
      G3: '从对话总结的',
      G4: '推断',
    };

    const evidence = entry.evidence.length === 0
      ? '<p class="note">这条没有证据摘录——它来自你亲口说的话，不需要再举证。</p>'
      : entry.evidence.map(item => `<div class="evidence">
          ${esc(item.excerpt)}
          <div class="meta" style="margin-top:var(--s1)">${esc(item.session)} · ${esc(gateLabel[item.gate] || '来源未标注')}</div>
        </div>`).join('');

    /*
     * 出口收敛：一行最多 1 主按钮 + 1 文字链接，其余进「更多操作」。
     * 旧详情页有 5 个并列按钮（编辑源码/确认/驳回/再留/归档），
     * 用户无法判断哪个是主操作——见 direction-card §八-1。
     */
    return `<div class="back">
        <button class="textlink" data-action="back-to-list">← 返回列表</button>
      </div>
      <h1 class="detail-title">${esc(entry.title)}</h1>
      <div class="meta-row" style="margin-top:0">
        ${tag(MO.statusLabel(entry.status), MO.STATUS_TONE[entry.status])}
        <span class="meta">${esc(entry.scopeLabel)}</span>
        <span class="meta">${entry.tokens} tokens</span>
        <span class="meta">${entry.lines} 行</span>
        <span class="meta">${entry.citeCount === 0 ? '未引用' : `引用 ${entry.citeCount} 次`}</span>
      </div>

      ${MO.sectionHead('凭什么可信')}
      <div class="meta-row" style="margin-top:0">
        <span class="meta">来源：${esc(entry.originLabel)}</span>
        <span class="meta">置信：${entry.confidence === null ? '—' : entry.confidence.toFixed(1)}</span>
        <span class="meta">最后引用：${esc(entry.lastCited)}</span>
      </div>
      ${evidence}

      ${MO.sectionHead('正文')}
      <div class="body-block">${esc(bodyOf(entry))}</div>
      <p class="note">正文在 Markdown 里可以直改。改它不会动 frontmatter。</p>

      <div class="row-actions" style="margin-top:var(--s4)">
        ${MO.primary('确认这条', `data-action="confirm" data-path="${esc(entry.id)}"`,
          entry.status === 'confirmed')}
        ${MO.button('编辑正文', 'data-action="noop"')}
      </div>
      ${MO.inlineResult(state.lastAction)}

      <details class="more">
        <summary>更多操作</summary>
        <div class="more-body">
          ${MO.button('驳回（需要写理由）', 'data-action="noop"', 'btn-sm')}
          ${MO.button('再留 90 天', 'data-action="noop"', 'btn-sm')}
          ${MO.button('归档退役', `data-action="archive" data-path="${esc(entry.id)}"`, 'btn-sm')}
          <p class="note">驳回会静默 30 天，期间不再推荐这条。归档后仍可检索，只是不再进上下文。</p>
        </div>
      </details>`;
  }

  /* ==========================================================
   * 空态三分：库全空 / 筛选后为空 / 检索未命中
   * ========================================================== */

  function emptyBlock(state, data, searching) {
    if (searching) {
      return MO.emptyState(
        `没搜到「${state.submitted}」`,
        '检索落空本身就是一条信号——说明这个词你以后可能还想查。'
        + `它已经记进「搜不到的东西」，同一个词再落空 ${MO.MISS_FILL_THRESHOLD - 1} 次就会提醒你补。`,
        MO.primary('换个词', 'data-action="clear-search"')
          + MO.button('去待办看', 'data-action="goto" data-pane="todo"'),
      );
    }
    if (data.entries.length === 0) {
      return MO.emptyState(
        '库是空的',
        '还没有任何记忆。记一条，它就会出现在这里。',
        MO.primary('记一条', 'data-action="goto" data-pane="capture"'),
      );
    }
    return MO.emptyState(
      '这个筛选下没有',
      '换个筛选，或者清空筛选看全部。',
      MO.primary('清空筛选', 'data-action="clear-filter"')
        + MO.button('记一条', 'data-action="goto" data-pane="capture"'),
    );
  }

  /* ==========================================================
   * 列表
   * ========================================================== */

  function renderList(state, data) {
    let list = data.entries;
    if (state.submitted !== '') {
      const q = state.submitted.toLowerCase();
      list = list.filter(e =>
        e.title.toLowerCase().indexOf(q) >= 0 || e.scopeLabel.toLowerCase().indexOf(q) >= 0);
    }
    if (state.filterStatus !== '') {
      const group = STATUS_GROUPS.find(g => g.id === state.filterStatus);
      if (group !== undefined) list = list.filter(e => group.match(e.status));
    }
    if (state.filterScope !== '') {
      list = list.filter(e => e.scope === state.filterScope);
    }

    const statusChips = STATUS_GROUPS.map(group => {
      const num = data.entries.filter(e => group.match(e.status)).length;
      return `<button class="kindbtn" data-action="filter-status" data-status="${group.id}"
        aria-pressed="${state.filterStatus === group.id}">${group.label} ${num}</button>`;
    }).join('');

    const scopeChips = SCOPES.map(group => {
      const num = group.id === ''
        ? data.entries.length
        : data.entries.filter(e => e.scope === group.id).length;
      return `<button class="kindbtn" data-action="filter-scope" data-scope="${group.id}"
        aria-pressed="${state.filterScope === group.id}">${group.label} ${num}</button>`;
    }).join('');

    /*
     * brand 名额：整页只有一个。
     *
     * ⚠️ 第 3 轮评审 P0-2：早先「搜」恒定是 primary，而列表为空时
     * emptyBlock 再给一个 primary —— 点一下「待复核 0」这个筛选签就能复现 2 处。
     *
     * 判定：列表**为空时**，这一屏的唯一动作是空态出口（清空筛选 / 换个词 / 记一条），
     * 所以「搜」让位；列表**有内容时**，「搜」是进入页面的第一动作，保留实底。
     */
    const listEmpty = list.length === 0;
    const searching = state.submitted !== '';
    const searchBtn = listEmpty
      ? MO.button('搜', 'data-action="search"')
      : MO.primary('搜', 'data-action="search"');

    /*
     * T1 给导语句（「库里一共 N 条，811 tokens」是这一页的一句话结论），
     * 页面名降为 T3。与 todo / capture 页同一裁决，见方向卡 §三。
     */
    const head = `<h1 class="page-name">记忆</h1>
      <p class="lede">库里一共 ${data.entries.length} 条，${data.totalTokens} tokens</p>
      <p class="lede-sub">最重的一条是「${esc(data.heaviest.title.slice(0, 14))}…」，占 ${data.heaviest.tokens}。</p>

      <div class="toolbar" style="margin-top:0">
        <input class="input" data-field="query" value="${esc(state.query)}"
          placeholder="搜标题或域…" aria-label="检索记忆" />
        ${searchBtn}
      </div>

      <div class="kindrow" role="group" aria-label="按状态筛选">${statusChips}</div>
      <div class="kindrow" role="group" aria-label="按域筛选">${scopeChips}</div>`;

    if (list.length === 0) {
      return head + MO.sectionHead(searching ? '检索结果' : '全部记忆', '0')
        + emptyBlock(state, data, searching)
        + MO.inlineResult(state.lastAction);
    }

    const rows = list.map(entry => `<li class="row">
        <button class="row-button" data-action="open-detail"
          data-path="${esc(entry.id)}">${esc(entry.title)}</button>
        <div class="meta-row">
          ${tag(MO.statusLabel(entry.status), MO.STATUS_TONE[entry.status])}
          <span class="meta">${entry.tokens} tokens</span>
          <span class="meta">${esc(entry.scopeLabel)}</span>
          <span class="meta">${entry.citeCount === 0 ? '未引用' : `引用 ${entry.citeCount}`}</span>
        </div>
      </li>`).join('');

    return head + MO.sectionHead(searching ? '检索结果' : '全部记忆', `${list.length} 条`)
      + `<ul class="list list-clickable">${rows}</ul>`
      + MO.inlineResult(state.lastAction);
  }

  MO.renderMemory = function renderMemory(state, data) {
    if (state.detailPath !== null) return renderDetail(state, data);

    if (state.phase === 'loading') return skeleton(4, 56);

    if (state.phase === 'error') {
      return MO.errorState(
        '读不到记忆',
        '库文件没有丢，这是读取问题。记忆不会因为这次失败而消失。',
        MO.primary('重试', 'data-action="retry"'),
      );
    }

    /*
     * 空态分支 —— 第 1 轮评审的 P0-3。
     *
     * 早先这里没有这个分支，切到 #memory/empty 会照常渲染完整列表，
     * 于是「空态」这个验收开关是假的。四态必须真的可达，否则
     * IA §5.4 的三分空态（库空 / 筛选空 / 检索空）全都无从验证。
     */
    if (state.phase === 'empty') {
      return `<h1 class="page-name">记忆</h1>
        <p class="lede">库里一条都没有</p>
        <p class="lede-sub">这里是全库台账：每条都带体积、引用次数和与它的可信来源。</p>
        ${MO.sectionHead('全部记忆', '0')}
        ${MO.emptyState(
    '库是空的',
    '还没有任何记忆。记一条，它就会出现在这里；agent 下次检索时也会读到它。',
    MO.primary('记一条', 'data-action="goto" data-pane="capture"'),
  )}`;
    }

    return renderList(state, data);
  };
})();
