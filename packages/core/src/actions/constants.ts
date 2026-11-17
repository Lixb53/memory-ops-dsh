/**
 * constants.ts —— 常驻前缀的常量
 *
 * 原在 actions.ts 里。被 read.ts（overview 的常驻前缀拆解）与
 * actions.ts（对外 re-export）共用，所以抽出来避免循环依赖。
 */

/**
 * skill 目录框架开销。
 *
 * `<available_skills>` 的目录框架文字，与装了几个 skill 无关。
 * 常驻前缀 = skill descriptions + 这个框架，
 * 所以本机能算出 171（只有框架）与 361（含两个 skill）两个值。
 *
 * 口径来自 docs/product.md §十二的实测，改它等于改第一指标的定义。
 */
export const SKILL_CATALOG_FRAME_TOKENS = 171
