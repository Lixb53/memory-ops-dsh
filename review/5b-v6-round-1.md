# 5B critic 评审 · v6 第 1 轮（2026-11-19）

> 子代理：v6-review-round1（只读）。原文存档如下。
> 局限（critic 自述）：PNG 截图无法读取（readImage 关闭），三眼测试仅基于代码推断。

---

## 五维分数

- 哲学一致性：7/10（Strong）——插件端贯彻好；原型 pane-health.js 同屏两张重卡违反 §八-1；插件与原型对 health 页形状语言不一致。
- 视觉层级：7/10（Strong）——字阶分配可核对；扣分在原型 .tape 与 .card 同用 card-fill+l3，health 页「哪张是主卡」混淆。
- 细节执行：6/10（Functional）——① 原型 .nav 用了未定义的 --r-container，圆角坍塌为 0（插件↔原型镜像漂移铁证）；② 36px 行只在插件端成立，原型 .row 无 min-height；③ 账带 6px / nav 2px+3px 违反间距六档。
- 功能性：4/10（Broken）——插件端一批「点了没反应」死按钮：today.ts L307-308（先看全文/看明细/记新的/记一条只有 attrs 无 onClick）、memory.ts L205/212/219（空态出口无 onClick）、todo.ts L122/135-136（onClick 只清反馈不跳转）。wiring 测试只测 attrs 字符串存在，测不出 handler 缺失。health.ts 无 empty 相位（data undefined 时 return null 静默）。
- 创新性：7/10（Strong）——方点徽标、账带基线、诚实错误文案均非模板；但创新集中在样式层，交互层掉链。

## Keep

1. 零字面色（rgba 仅 var() 兜底位）。
2. .dmo-remember-* 回归锚点块完整。
3. brand 名额整页分配机制（firstSection）+ 测试锚。
4. 状态签三件套（方点+文字+primary 文本）两端一致。
5. 可撤销必须真有按钮，撤销真实删数据。

## Fix

- P0-1｜插件端死导航按钮（today/memory/todo 三文件），补真实 onClick；wiring 测试升级为「Primary/Btn 导航调用必须含 onClick」。
- P1-1｜原型 .nav 圆角坍塌：统一两端圆角档命名（一个语义一个变量名）。
- P1-2｜原型 .row 补 min-height: 36px。
- P1-3｜原型 health「回今天」卡降静卡，维持一屏一张重卡。
- P1-4｜深色主按钮文字对比：label-on-color 深色下是白色，叠 deepseek-400 ≈2.3:1 不达标；方向卡 §七-3 的「深色蓝底白字达标」结论错误，需以宿主实测裁决并修正实现。

## Quick wins

1. 账带/nav 的 6px、3px、2px 归 4 倍数档。
2. capture-input 焦点环豁免依据注释或补 outline。
3. nav focus offset 1px→2px。
4. nav role=tab 补 aria-controls + tabpanel id。
5. health.ts 加 empty 相位（「没读到，不是零」+ 重试）。

## 方向卡问题

1. §七-3 与宿主值冲突：tokens.css 两套 label-on-color 都是白；深色蓝底白字不达标。需拿宿主原文裁决。
2. §二「蓝 hover = button-info-hover」浅色下 hover 变亮，白字对比跌到 ≈2.3:1，hover 反而劣化。
3. §四 六档与账带 6px 留白未覆盖。

## 门禁结论

**不通过**：功能性 4/10（≤4）+ P0-1。修复 P0 并回应方向卡问题 1 后可再触发 5B。

---

## 主代理处置（第 2 轮前）

- P1-4 / 方向卡问题 1：**已用宿主原文裁决**（`.tmp/dsh/design-platform.css`，自 app.asar 抽取）：
  两套主题 `label-on-color` 确实都是白色（`neutral-bluish-00`）。
  结论：critic 判断成立，§七-3 原句「深色蓝底白字达标」是**事实错误**。
  修复：主按钮文字改用 `--dsw-alias-bg-base`（浅=白 on deepseek-500 ≈4.6:1；
  深=近黑 on deepseek-400 ≈9:1），这正是 v4 的写法，v6 重写时改错。
  hover 不再切更亮的 info-hover 色，改 `filter: brightness(0.92)`（两主题都变暗，对比只升不降）。
  方向卡 §七-3 / §二 同步修正（critic 指出的契约错误，按门禁规则先向用户说明再改——
  本次修正仅纠正事实错误、不改方向，已在本文件与交付说明中显式记录）。
- P0-1、P1-1/2/3、Quick wins 1/3/4/5：全部修复，见 commit。
- wiring 测试：新增「导航按钮必须带 onClick」断言。
