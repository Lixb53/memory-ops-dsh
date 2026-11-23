/**
 * 构建 v9 面板的浏览器渲染 harness。
 *
 * 源码在 `tools/v9-harness/`（入库，可复现），产物在 `.tmp/`（忽略）。
 *
 * 流程：
 *   1. 把 harness.js + src/client/v9 + panel.ts 打成浏览器 bundle
 *      （react 从 .tmp/preview/node_modules 解析，不进项目依赖）；
 *   2. 复制 index.html 与宿主令牌复刻（prototype/tokens.css）到输出目录；
 *   3. fixtures.json 由 `scripts/capture-fixtures.mjs` 预先抓取（不入库）。
 *
 * 用法：
 *   node scripts/capture-fixtures.mjs      # 抓真实桥数据（首次/换库时）
 *   node scripts/build-harness.mjs
 *   node scripts/measure-v9-plugin.mjs
 */

import fsp from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.join(here, '..')
const harnessDir = path.join(projectRoot, 'tools', 'v9-harness')
const previewDir = path.join(projectRoot, '.tmp', 'preview')

if (!existsSync(path.join(harnessDir, 'fixtures.json'))) {
  console.error('缺少 tools/v9-harness/fixtures.json：先跑 node scripts/capture-fixtures.mjs')
  process.exit(2)
}

/* esbuild 装在插件包里（项目本身不依赖它作为直接依赖）。 */
const requireFromPlugin = createRequire(path.join(projectRoot, 'packages', 'dsh-plugin', 'package.json'))
const { build } = requireFromPlugin('esbuild')

await fsp.mkdir(previewDir, { recursive: true })

await build({
  entryPoints: [path.join(harnessDir, 'harness.js')],
  outfile: path.join(previewDir, 'bundle.js'),
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2022',
  absWorkingDir: harnessDir,
  /* react 装在 .tmp/preview（不进项目依赖）：给 esbuild 一条额外解析路径。 */
  nodePaths: [path.join(previewDir, 'node_modules')],
  sourcemap: true,
  define: { 'process.env.NODE_ENV': '"development"' },
  logLevel: 'warning',
})

/**
 * 把 HTML 与宿主令牌值复刻复制进输出目录。
 *
 * 为什么不在 HTML 里直接引 `../../prototype/tokens.css`：harness 走本地 http
 * 服务器（file:// 下 ESM 会被 CORS 拦），`../..` 越过服务器根后被裁掉，
 * 变成 `/prototype/tokens.css` → 404 → 所有 `--dsw-alias-*` 变量缺失，
 * 页面看起来「渲染了」，但对比度与底色全是假的。这一条踩过一次。
 */
await fsp.copyFile(path.join(harnessDir, 'index.html'), path.join(previewDir, 'index.html'))
await fsp.copyFile(path.join(projectRoot, 'prototype', 'tokens.css'), path.join(previewDir, 'tokens.css'))

console.log('harness → .tmp/preview/{bundle.js,index.html,tokens.css}')
console.log('下一步：node scripts/measure-v9-plugin.mjs')