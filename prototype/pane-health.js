/**
 * pane-health.js —— 「库健康」页
 *
 * 唯一核心任务：回答「这套东西贵不贵、该不该维护」。
 *
 * ## 为什么把成本拆成三行
 *
 * 旧总览首屏是 5 个 KPI 并排（常驻前缀 / 索引层体积 / 命中率 / 待你处理 / 过期率），
 * 其中「常驻前缀」和「索引层体积」两个数字名字很像、含义完全不同：
 * 前者每请求付费，后者按需加载。并排放且同样大，用户必然会优化错对象
 * （docs/product.md §十二 专门记过这个坑）。
 *
 * v4 改成三行竖排 + 每行一句解释，付费方式不同的用文字说清，不靠位置暗示。
 */

(function () {
  'use strict';

  const MO = window.MO;
  const { esc } = MO;

  /** 一行成本：名称 + 数字 + 解释。 */
  function costRow(name, value, note) {
    return `<div class="cost-row">
        <span class="cost-name">${esc(name)}</span>
        <span class="cost-num">${esc(value)}</span>
      </div>
      <p class="cost-note">${esc(note)}</p>`;
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

    /*
     * 空态分支 —— 第 1 轮评审的 P0-3。
     *
     * 早先没有这个分支，切到 #health/empty 会照常渲染 171 / 0 / 811 三个数字。
     * 空态存在的前提是「算不出来不等于零」这条主张能被看见，
     * 所以空态里三个数字一律显示「—」并给出原因，而不是渲染旧数据。
     */
    if (state.phase === 'empty') {
      return `<h1 class="page-name">库健康</h1>
        <p class="lede">这套系统有两种成本，混在一起看会优化错东西</p>
        <p class="lede-sub">每请求都付的，和只在被读时才付的——两者优化的对象完全不同。</p>
        <div class="cost">
          ${costRow('每请求成本', '—', '这次算不出来。可能是 skill 列表读不到——「算不出来」和「是零」是两件事，所以这里不写 0。')}
          ${costRow('索引体积', '—', '还没有读到任何 l0 索引文件。')}
          ${costRow('全库体积', '—', '库是空的，或者这次没读出来。')}
        </div>
        ${MO.sectionHead('导出')}
        <p class="note" style="margin-top:0">库为空时没有可导出的内容。</p>
        <div class="row-actions" style="margin-top:var(--s4)">
          ${MO.primary('去写第一条', 'data-action="goto" data-pane="capture"')}
        </div>`;
    }

    return `<h1 class="page-name">库健康</h1>
        <p class="lede">这套系统有两种成本，混在一起看会优化错东西</p>
        <p class="lede-sub">每请求都付的，和只在被读时才付的——两者优化的对象完全不同。</p>

      <div class="cost">
        ${costRow(
    '每请求成本',
    MO.COST.billedWithoutSkills,
    `tokens / 请求，预算 ${MO.COST.residentBudget}。本机没装 memory 类 skill，`
          + `所以只剩目录框架 ${MO.COST.frameTokens}；装了会到 ${MO.COST.billedWithSkills}。`
          + '这是唯一每请求都付的钱。',
  )}
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
      </div>

      ${MO.sectionHead('维护', '按需跑')}
      <p class="note" style="margin-top:0">这些都会改记忆的内容或可信度，所以一律先给预览、你点了才执行。</p>
      <div class="jobs">${jobs()}</div>

      ${MO.sectionHead('导出')}
      <div class="row-actions" style="margin-top:0">
        ${MO.button('全部 Markdown', 'data-action="noop"', 'btn-sm')}
        ${MO.button('仅个人域', 'data-action="noop"', 'btn-sm')}
        ${MO.button('仅工作域', 'data-action="noop"', 'btn-sm')}
      </div>
      <p class="note">导出含 frontmatter 与证据链。库根目录：${esc('C:\\Users\\51967\\.memory-ops')}</p>

      <!--
        这一页是只读诊断页，本身没有「主操作」——这是设计选择，不是遗漏。
        但用户不该在这里走进死路，所以给一个明确的前进方向。
        （第 2 轮评审的穷举测试暴露了这一点：health/ready 是 0 处 brand 实底。）
      -->
      <div class="row-actions" style="margin-top:var(--s4)">
        ${MO.primary('回今天，看该做什么', 'data-action="goto" data-pane="today"')}
      </div>
      ${MO.inlineResult(state.lastAction)}`;
  };
})();

