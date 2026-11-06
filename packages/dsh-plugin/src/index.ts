/**
 * Host 半体（node 侧）—— 插件入口。
 *
 * 两件事：
 *   1. 注册 HTTP 桥 `/api/dsh-memory-ops/*`：客户端半体跑在浏览器里，
 *      碰不到 node:fs，所以读写真相源必须经过这一层。
 *   2. 注册 agent 工具 `memory_recall` / `memory_write`：让模型**按索引取用**，
 *      而不是把整个库塞进上下文。这是产品主线，不是附加功能。
 *
 * 围栏：只接受回环请求、每条能力一条 exact 路由、不提供任何执行命令的端点。
 * 少一个写入口 = 少一个攻击面。
 */

import { createActions } from '@memory-ops/core/actions'
import { createStore, defaultRoot, safeRelPath } from '@memory-ops/core/store'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { createBridge, type BridgeEnv } from './bridge.ts'
import { registerTools } from './tools.ts'
import { estimateTokens } from '@memory-ops/core/schema'

export const name = 'dsh-memory-ops'

/** 路由前缀：与包名对齐，避免与其他插件的桥撞名。 */
export const BRIDGE_PREFIX = '/api/dsh-memory-ops'

/** 插件配置。 */
export interface PluginConfig {
  /** 真相源根目录；省略时读 MEMORY_OPS_ROOT 或 ~/.memory-ops。 */
  root?: string
}

/** 最小 Context 形状：只声明本插件真正用到的成员，避免死依赖宿主内部类型。 */
export interface PluginContext {
  inject(services: string[], run: (ctx: PluginContext) => (() => void) | void): void
  get?(service: string): unknown
  [key: string]: unknown
}

/** 插件入口。 */
export function apply(ctx: PluginContext, config: PluginConfig = {}): () => void {
  const configured = typeof config.root === 'string' && config.root.trim() !== ''
    ? config.root.trim()
    : defaultRoot()
  const store = createStore({ root: configured })

  /**
   * 锚点文件读取器 —— 把「代码仓库里的文件」读给 core 做校验。
   *
   * 为什么放在 host 而不是 core：core 只认识 `~/.memory-ops/`，
   * 而锚点指向的是被记忆的那份代码。这里把两条边界守住：
   *   1. `safeRelPath` 拒绝绝对路径与 `..` 穿越，锚点写歪了也读不到库外；
   *   2. 读不到一律返回 null，由 core 判 missing，不抛异常打断整批校验。
   */
  const readExternal = async (relPath: string): Promise<string | null> => {
    try {
      const safe = safeRelPath(relPath)
      return await fsp.readFile(path.join(process.cwd(), safe), 'utf8')
    } catch {
      return null
    }
  }

  const actions = createActions({ store, readExternal })

  // 首次加载把骨架建好，避免 UI 首次打开看到「读取失败」
  void store.ensureLayout().catch(() => {})

  const disposers: (() => void)[] = []

  // skill description 的读取器：由 `ctx.skills` 提供，取不到时返回空数组，
  // 总览会明确标注「未能读取」，而不是悄悄算成 0。
  let skillsReadable = false
  /** 读不到 skill 时的具体原因——静默返回 0 会让人以为「本来就没有 skill」。 */
  let skillsError = ''
  const env: BridgeEnv = {
    listSkills: () => {
      const skills = ctx.get?.('skills') as {
        list?: (options?: unknown) => { name: string; description: string; path?: string }[]
      } | undefined
      if (skills === undefined) {
        skillsError = '宿主没有提供 skills 服务（ctx.get("skills") 返回 undefined）'
        return []
      }
      if (typeof skills.list !== 'function') {
        skillsError = 'skills 服务没有 list() 方法'
        return []
      }
      try {
        // 先不加过滤取全量：`modelInvocableOnly` 会把未声明该标记的 skill 全部滤掉，
        // 而本地 skill 通常不写这个标记——那样「常驻前缀」就永远只剩框架开销 171。
        const all = skills.list() as { name: string; description: string; path?: string }[]
        const filtered = all.filter(row => typeof row?.description === 'string' && row.description.trim() !== '')
        skillsReadable = true
        if (filtered.length === 0) {
          skillsError = all.length === 0
            ? 'skills.list() 返回空数组——宿主的 skill 目录可能没有配置'
            : `${all.length} 个 skill 都没有 description，无法计入常驻前缀`
        } else {
          skillsError = ''
        }
        return filtered.map(row => ({
          name: row.name,
          path: row.path ?? '',
          description: row.description,
          descriptionTokens: estimateTokens(row.description),
        }))
      } catch (error) {
        skillsError = `skills.list() 抛错：${error instanceof Error ? error.message : String(error)}`
        return []
      }
    },
    skillsError: () => skillsError,
  }
  // 启动时探测一次，让 UI 能区分「没有 skill」与「读不到 skill」
  env.listSkills?.()

  // ---- HTTP 桥 ----
  ctx.inject(['webServer'], (serverCtx) => {
    const dispose = createBridge({ actions, prefix: BRIDGE_PREFIX, env })
      .attach(serverCtx as unknown as Parameters<ReturnType<typeof createBridge>['attach']>[0])
    return dispose
  })

  // ---- agent 工具 ----
  ctx.inject(['tools'], (toolCtx) => {
    const dispose = registerTools({ actions })
      .attach(toolCtx as unknown as Parameters<ReturnType<typeof registerTools>['attach']>[0])
    return dispose
  })

  return () => {
    for (const dispose of disposers) dispose()
  }
}

export default { name, apply }
