/**
 * 构建 DSH 插件的两份产物：
 *   lib/index.js   —— host 半体（node，ESM）
 *   lib/client.js  —— 浏览器半体（`window.__ModuleLoader__.load({ id, factory })` 形态）
 *
 * 为什么要自建脚本而不是 tsdown：本仓不依赖 dsh 的私有构建链，
 * 只用 esbuild 做「把 workspace 内的 TS 打进单文件」这一件事，
 * 让产物可被宿主直接 require，也让打包行为可读、可复现。
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

/** 宿主在浏览器里提供的平台模块（模块表 seed），不能打进产物。 */
const CLIENT_EXTERNALS = ['react', 'react-dom', 'react/jsx-runtime']

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
 * 额外产出 client-logic.mjs：浏览器半体里的**纯逻辑**（无 React、无 DOM）。
 *
 * 为什么单独产出一份：`/remember` 的「回车是否一定打开弹窗」必须能自动化验证，
 * 而 client.js 是浏览器 bundle，node 里加载不了。这一份只含纯函数，
 * 供 test/remember.test.mjs 直接 import。
 */
async function buildClientLogic() {
  await build({
    entryPoints: [path.join(packageDir, 'src', 'client', 'remember-logic.ts')],
    outfile: path.join(outDir, 'client-logic.mjs'),
    bundle: true,
    platform: 'neutral',
    format: 'esm',
    target: 'es2022',
    sourcemap: false,
    minify: false,
    legalComments: 'inline',
    banner: {
      js: '/**\n * @memory-ops/dsh-plugin — 纯逻辑（无 React / 无 DOM）。\n * 由 scripts/build-plugin.mjs 生成，请勿手改；仅供测试与复用。\n */',
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
