/**
 * 构建 DSH 插件的两份产物：
 *   lib/index.js   —— host 半体（node，ESM）
 *   lib/client.js  —— 浏览器半体（`window.__ModuleLoader__.load({ id, factory })` 形态）
 *
 * 为什么要自建脚本而不是 tsdown：本仓不依赖 dsh 的私有构建链，
 * 只用 esbuild 做「把 workspace 内的 TS 打进单文件」这一件事，
 * 让产物可被宿主直接 require，也让打包行为可读、可复现。
 *
 * **产物必须与在哪运行无关**：lib/ 已入库，CI 有一道「入库产物 == 源码构建结果」
 * 的校验。esbuild 会把每个模块的来源路径写进产物注释，而那个路径是相对 cwd 算的——
 * 从仓库根跑得到 `packages/core/src/x.ts`，从包目录跑得到 `../core/src/x.ts`。
 * 同一份源码、两种 cwd、两套字节，校验必然红。所以这里固定 absWorkingDir，
 * 让路径基准恒为包目录（也正是已入库产物的形态）。
 */

import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const packageDir = path.join(here, '..', 'packages', 'dsh-plugin')

// esbuild 装在插件包里，脚本在仓库根：按包解析，而不是按脚本位置解析。
const requireFromPackage = createRequire(path.join(packageDir, 'package.json'))
const { build } = requireFromPackage('esbuild')
import fsp from 'node:fs/promises'

const outDir = path.join(packageDir, 'lib')

/**
 * 所有 esbuild 调用共用的路径基准。
 *
 * 见文件头注释：注释里的模块路径相对它算。固定成包目录，产物才与 cwd 无关，
 * 否则 CI（仓库根）与开发者（包目录）构建出的字节不同，「产物一致」校验失效。
 */
const ABS_WORKING_DIR = packageDir

/** 宿主在浏览器里提供的平台模块（模块表 seed），不能打进产物。 */
const CLIENT_EXTERNALS = ['react', 'react-dom', 'react/jsx-runtime']

/**
 * 把 `@memory-ops/core/*` 解析到 `packages/core/src/*.ts`。
 *
 * 为什么不能靠 node_modules：插件包刻意不声明这个依赖（发布出去时宿主解析不到
 * workspace 包，而 core 反正会被内联进 lib/index.js）。没有声明就没有 pnpm 的
 * workspace 链接，esbuild 默认解析必然失败，所以在这里按路径别名解析。
 * 与 tsconfig.json 的 paths 指向同一份源码，避免「构建能过、类型检查指到别处」。
 */
const coreSrcDir = path.join(here, '..', 'packages', 'core', 'src')
const CORE_SUBPATHS = new Set([
  'actions', 'parse', 'pinned', 'privacy', 'project', 'schema', 'scope', 'search', 'store', 'index',
])

function resolveCoreSource() {
  return {
    name: 'resolve-memory-ops-core',
    setup(buildApi) {
      buildApi.onResolve({ filter: /^@memory-ops\/core(\/.*)?$/ }, (args) => {
        const subpath = args.path.slice('@memory-ops/core'.length).replace(/^\//, '') || 'index'
        if (!CORE_SUBPATHS.has(subpath)) {
          return { errors: [{ text: `未知的 core 子路径：${args.path}（未在 CORE_SUBPATHS 登记）` }] }
        }
        return { path: path.join(coreSrcDir, `${subpath}.ts`) }
      })
    },
  }
}

/** 打包 host 半体：node 平台，只外置 node 内置模块。 */
async function buildHost() {
  await build({
    entryPoints: [path.join(packageDir, 'src', 'index.ts')],
    outfile: path.join(outDir, 'index.js'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    sourcemap: false,
    minify: false,
    legalComments: 'inline',
    absWorkingDir: ABS_WORKING_DIR,
    plugins: [resolveCoreSource()],
    // core 是 workspace 包，宿主进程解析不到它，必须打进产物；
    // node 内置模块由 esbuild 自动外置，无需手动列。
    banner: {
      js: `/**
 * @memory-ops/dsh-plugin — host 半体（node）。
 * 由 scripts/build-plugin.mjs 生成，请勿手改。
 */`,
    },
  })
}

/**
 * esbuild 的 footer 无法直接引用上面的 bundle 体，所以这里改为
 * 「先打成 CJS 到内存，再手写外壳」——比塞 footer 更可控。
 */
async function buildClientWrapped() {
  const result = await build({
    entryPoints: [path.join(packageDir, 'src', 'client', 'index.ts')],
    bundle: true,
    platform: 'browser',
    format: 'cjs',
    target: 'es2022',
    write: false,
    sourcemap: false,
    minify: false,
    external: CLIENT_EXTERNALS,
    legalComments: 'inline',
    absWorkingDir: ABS_WORKING_DIR,
    plugins: [resolveCoreSource()],
  })
  const body = result.outputFiles[0].text
  const wrapped = `/**
 * @memory-ops/dsh-plugin — 浏览器半体。
 * 由 scripts/build-plugin.mjs 生成，请勿手改。
 *
 * 宿主经 combo 路由下发本文件，执行时调用 __ModuleLoader__.load：
 * id 必须等于包名，factory 收到模块表 require（react 等平台模块由宿主提供）。
 */
window.__ModuleLoader__.load({
  id: '@memory-ops/dsh-plugin',
  factory(require) {
    const module = { exports: {} };
    const exports = module.exports;
    (function (module, exports, require) {
${body}
    })(module, exports, require);
    return module.exports;
  },
});
`
  await fsp.mkdir(outDir, { recursive: true })
  await fsp.writeFile(path.join(outDir, 'client.js'), wrapped, 'utf8')
}

/**
 * 把 `react` 解析成空 stub。
 *
 * 用途仅限可测产物：`remember.ts` 顶层 import 了 React（组件用），
 * 但测试只关心 registerRemember 的注册行为。本仓不装 react
 * （客户端产物由宿主模块表提供），所以给一个只有最小符号的空壳。
 */
function reactStubPlugin() {
  return {
    name: 'react-stub',
    setup(buildApi) {
      buildApi.onResolve({ filter: /^react(-dom)?(\/.*)?$/ }, () => ({ path: 'react-stub', namespace: 'react-stub' }))
      buildApi.onLoad({ filter: /.*/, namespace: 'react-stub' }, () => ({
        contents: [
          'const noop = () => null;',
          'export const createElement = noop;',
          'export const useState = (initial) => [typeof initial === "function" ? initial() : initial, noop];',
          'export const useEffect = noop;',
          'export const useRef = (value) => ({ current: value });',
          'export const useMemo = (fn) => fn();',
          'export const useCallback = (fn) => fn;',
          // react-dom 的 createPortal：仅 client-logic 这份可测产物需要它存在，
          // 组件永远不会被渲染，所以原样返回 children 即可。
          'export const createPortal = (children) => children;',
          'export default { createElement, useState, useEffect, useRef, createPortal };',
        ].join('\n'),
        loader: 'js',
      }))
    },
  }
}

/**
 * 额外产出 client-logic.mjs：浏览器半体里的**纯逻辑**（无 React、无 DOM）。
 *
 * 为什么单独产出一份：`/remember` 的「回车是否一定打开弹窗」必须能自动化验证，
 * 而 client.js 是浏览器 bundle，node 里加载不了。这一份只含纯函数，
 * 供 test/remember.test.mjs 直接 import。
 */
async function buildClientLogic() {
  await build({
    entryPoints: [path.join(packageDir, 'src', 'client', 'testable.ts')],
    outfile: path.join(outDir, 'client-logic.mjs'),
    bundle: true,
    platform: 'neutral',
    format: 'esm',
    target: 'es2022',
    sourcemap: false,
    minify: false,
    legalComments: 'inline',
    absWorkingDir: ABS_WORKING_DIR,
    // remember.ts 引了 React（组件用），但测试只调 registerRemember 与纯函数。
    // 本仓不装 react（客户端产物从宿主模块表取），所以这里把 react 解析到一个
    // 空 stub：模块能加载，组件永远不会被调用，测试断言的是注册行为。
    plugins: [reactStubPlugin(), resolveCoreSource()],
    banner: {
      js: '/**\n * @memory-ops/dsh-plugin — 可测逻辑（React 已外置）。\n * 由 scripts/build-plugin.mjs 生成，请勿手改；仅供测试与复用。\n */',
    },
  })
}

async function main() {
  await fsp.rm(outDir, { recursive: true, force: true })
  await fsp.mkdir(outDir, { recursive: true })
  await buildHost()
  await buildClientWrapped()
  await buildClientLogic()
  const files = await fsp.readdir(outDir)
  for (const file of files) {
    const stat = await fsp.stat(path.join(outDir, file))
    console.log(`  ${file}  ${(stat.size / 1024).toFixed(1)} KB`)
  }
}

await main()
