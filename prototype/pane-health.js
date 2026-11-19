/**
 * pane-health.js —— 「库健康」页（v5 卡片仪表盘）
 *
 * 唯一核心任务：回答「这套东西贵不贵、该不该维护」。
 *
 * v4→v5：成本三行装进重卡（数字右对齐基线的裁决保留）；
 * 新增预算 meter（蓝填充，超预算转琥珀）；维护与导出各自成静卡。
 * 「算不出来 ≠ 零」的诚实口径保留。
 */

(function () {
  'use strict';

  const MO = window.MO;
  const { esc } = MO;

  /** 一行成本：名称 + 数字（右对齐基线）+ 解释。 */
  function costRow(name, value, note) {
    return `<div class="cost-row">
        <span class="cost-name">${esc(name)}</span>
        <span class="cost-num">${esc(value)}</span>
      </div>
      <p class="cost-note">${esc(note)}</p>`;
  }

  /** 预算条：每请求成本 / 预算 1024。 */
  function meter() {
    const used = MO.COST.billedWithoutSkills;
    const budget = MO.COST.residentBudget;
    const pct = Math.min(100, Math.round((used / budget) * 100));
    const over = used > budget;
    return `<div class="meter" role="img"
        aria-label="每请求成本 ${used}，预算 ${budget}，已用 ${pct}%">
        <div class="meter-fill" data-over="${over}" style="width:${pct}%"></div>
      </div>
      <p class="note">${used} / ${budget} tokens 预算（${pct}%）。
        ${over ? '已超预算，先去压 skill description。' : '离预算还远，现在最该盯的是别让它悄悄涨。'}</p>`;
  }

  /** 维护作业：标题即用户语言，技术名词只放在 title 提示里。 */
  function jobs() {
    const items = [
      { label: '补全缺失的元数据', note: '3 篇元数据完整，无需操作' },
      { label: '检查引用的代码还在不在', note: '0 条带锚点' },
      { label: '压缩空行', note: '0 篇超 80 行' },
      { label: '升级可信度', note: '0 条够条件（需 ≥3 个不同会话引用）' },
      { label: '本周小结', note: '近 7 天 12 个事件' },
    ];
    return items.map(item => `<button class="btn btn-sm" data-action="noop"
      title="${esc(item.note)}">${esc(item.label)}</button>`).join('');
  }

  MO.renderHealth = function renderHealth(state, data) {
    if (state.phase === 'loading') return MO.skeleton(3, 60);

    if (state.phase === 'error') {
      return MO.errorState(
        '读不到成本数据',
        '库本身可能没问题，只是这次算不出来。「算不出来」和「是零」是两件事，所以这里不显示 0。',
        MO.primary('重试', 'data-action="retry"'),
      );
    }

    /* 空态：三个数字一律「—」并给出原因，而不是渲染旧数据。 */
    if (state.phase === 'empty') {
      return `<div>
          <h1 class="page-name">库健康</h1>
          <p class="lede">这套系统有两种成本，混在一起看会优化错东西</p>
          <p class="lede-sub">每请求都付的，和只在被读时才付的——两者优化的对象完全不同。</p>
        </div>
        ${MO.card(`
          ${costRow('每请求成本', '—', '这次算不出来。可能是 skill 列表读不到——「算不出来」和「是零」是两件事，所以这里不写 0。')}
          ${costRow('索引体积', '—', '还没有读到任何 l0 索引文件。')}
          ${costRow('全库体积', '—', '库是空的，或者这次没读出来。')}
        `)}
        ${MO.cardQuiet(`
          ${MO.sectionHead('导出')}
          <p class="note">库为空时没有可导出的内容。</p>
          <div class="card-actions">
            ${MO.primary('去写第一条', 'data-action="goto" data-pane="capture"')}
          </div>
        `)}`;
    }

    return `<div>
        <h1 class="page-name">库健康</h1>
        <p class="lede">这套系统有两种成本，混在一起看会优化错东西</p>
        <p class="lede-sub">每请求都付的，和只在被读时才付的——两者优化的对象完全不同。</p>
      </div>

      ${MO.card(`
        <p class="card-label">成本构成</p>
        ${costRow(
          '每请求成本',
          MO.COST.billedWithoutSkills,
          `tokens / 请求，预算 ${MO.COST.residentBudget}。本机没装 memory 类 skill，`
          + `所以只剩目录框架 ${MO.COST.frameTokens}；装了会到 ${MO.COST.billedWithSkills}。`
          + '这是唯一每请求都付的钱。',
        )}
        ${meter()}
        ${costRow(
          '索引体积',
          MO.COST.indexTokens,
          '所有 l0 索引文件之和。本机是 0——还没有标 l0 的文件。'
          + '这个数大不代表贵，它只在被读时才进上下文。',
        )}
        ${costRow(
          '全库体积',
          data.totalTokens,
          `${data.entries.length} 条记忆的正文合计。对照：弃用的 knowledge 曾占 ${MO.COST.knowledgeAnchor}。`,
        )}
      `)}

      ${MO.cardQuiet(`
        ${MO.sectionHead('维护', '按需跑')}
        <p class="note">这些都会改记忆的内容或可信度，所以一律先给预览、你点了才执行。</p>
        <div class="jobs">${jobs()}</div>
      `)}

      ${MO.cardQuiet(`
        ${MO.sectionHead('导出')}
        <div class="card-actions">
          ${MO.button('全部 Markdown', 'data-action="noop"', 'btn-sm')}
          ${MO.button('仅个人域', 'data-action="noop"', 'btn-sm')}
          ${MO.button('仅工作域', 'data-action="noop"', 'btn-sm')}
        </div>
        <p class="note">导出含 frontmatter 与证据链。库根目录：${esc('C:\\Users\\51967\\.memory-ops')}</p>
      `)}

      <!-- 本页是只读诊断页，但用户不该走进死路：给一个前进方向（v4 裁决保留）。 -->
      ${MO.card(`
        <p class="card-body">看完了。现在该做的事在「今天」。</p>
        <div class="card-actions">
          ${MO.primary('回今天，看该做什么', 'data-action="goto" data-pane="today"')}
        </div>
        ${MO.inlineResult(state.lastAction)}
      `)}`;
  };
})();
