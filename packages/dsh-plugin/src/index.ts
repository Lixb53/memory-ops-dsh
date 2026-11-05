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
import { createStore, defaultRoot } from '@memory-ops/core/store'
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
  const actions = createActions({ store })

  // 首次加载把骨架建好，避免 UI 首次打开看到「读取失败」
  void store.ensureLayout().catch(() => {})

  const disposers: (() => void)[] = []

  // skill description 的读取器：由 `ctx.skills` 提供，取不到时返回空数组，
  // 总览会明确标注「未能读取」，而不是悄悄算成 0。
  let skillsReadable = false
  const env: BridgeEnv = {
    listSkills: () => {
      const skills = ctx.get?.('skills') as {
        list?: (options?: unknown) => { name: string; description: string; path?: string }[]
      } | undefined
      if (skills === undefined || typeof skills.list !== 'function') return []
      try {
        const rows = skills.list({ modelInvocableOnly: true })
        skillsReadable = true
        return rows.map(row => ({
          name: row.name,
          path: row.path ?? '',
          description: row.description,
          descriptionTokens: estimateTokens(row.description),
        }))
      } catch {
        return []
      }
    },
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
