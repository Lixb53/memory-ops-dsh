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
import { PINNED_SECTION_NAME, PINNED_SECTION_ORDER } from '@memory-ops/core/pinned'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { createBridge, type BridgeEnv } from './bridge.ts'
import { registerTools } from './tools.ts'
import { createPinnedCache } from './pinned-cache.ts'
import { estimateTokens } from '@memory-ops/core/schema'

/**
 * 再导出缓存工厂供测试使用。
 *
 * 为什么要开这个口子：冻结与冷启动这两条路径**只能靠假 scan 与假时钟**验证，
 * 而它们恰恰是最容易写错的地方（把空串冻结进去，那个会话就永远拿不到内容）。
 * 走真文件 + 真 30s TTL 去测，测不出来也跑不动。
 */
export { createPinnedCache }

export const name = 'dsh-memory-ops'

/** 路由前缀：与包名对齐，避免与其他插件的桥撞名。 */
export const BRIDGE_PREFIX = '/api/dsh-memory-ops'

/** 插件配置。 */
export interface PluginConfig {
  /** 真相源根目录；省略时读 MEMORY_OPS_ROOT 或 ~/.memory-ops。 */
  root?: string
  /**
   * 是否把 `pinned: true` 的条目注册成系统提示词段落；默认 true。
   *
   * 关掉它，记忆库就退回纯拉取模型（只有 `memory_recall` 命中才进上下文）。
   */
  injectPinned?: boolean
  /** 注入段的 token 上限；默认 256。 */
  maxPinnedTokens?: number
  /** 是否连工作域置顶条目一起注入；默认 false（理由见 core/pinned.ts）。 */
  injectWorkPinned?: boolean
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

  /**
   * 置顶条目的同步缓存。
   *
   * 宿主的 `systemPrompt.section()` 要求 `text` 同步返回，而 `store.scan()` 是
   * async —— 这层缓存不是优化，是接口约束。详见 `pinned-cache.ts` 文件头。
   */
  const injectPinned = config.injectPinned !== false
  const pinnedCache = createPinnedCache({
    scan: () => store.scan(),
    maxTokens: config.maxPinnedTokens,
    includeWork: config.injectWorkPinned === true,
  })
  /**
   * 启动即预热：覆盖「进程起来 → 用户发第一条消息」这段空窗，
   * 让冷启动的第一个会话也能拿到内容，而不是先收一轮空串。
   */
  void pinnedCache.prime()

  /** 组装上下文的会话 id（宿主在 `AssembleContext` 上加了 `agent`）。 */
  const sessionOfContext = (context: unknown): string | undefined => {
    const agent = (context as { agent?: { id?: unknown } } | null | undefined)?.agent
    return typeof agent?.id === 'string' && agent.id !== '' ? agent.id : undefined
  }

  const disposers: (() => void)[] = []

  // skill description 的读取器：由 `ctx.skills` 提供，取不到时返回空数组，
  // 总览会明确标注「未能读取」，而不是悄悄算成 0。
  /** 读不到 skill 时的具体原因——静默返回 0 会让人以为「本来就没有 skill」。 */
  let skillsError = ''
  /**
   * skill description 读取器 —— **异步**。
   *
   * ## 这里曾经把 Promise 当数组用（真事故）
   *
   * 宿主 `skills.list(options)` 返回 `Promise<SkillSummary[]>`，而早先这里
   * 同步调用它、直接把返回值当数组 `filter`：
   *
   *     TypeError: all.filter is not a function
   *
   * 被 `catch` 吞掉后 `skillsError` 写进「skills.list() 抛错」，
   * 于是总览的常驻前缀**永远只显示框架 171**，而不是 361。
   * 数字看起来「有值」，所以没人怀疑它是错的——错误被渲染成了合理。
   *
   * 现在 `listSkills` 返回 Promise，由 bridge 等待；失败也照样解释原因。
   */
  const env: BridgeEnv = {
    listSkills: async () => {
      const skills = ctx.get?.('skills') as {
        list?: (options?: unknown) => unknown
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
        const listed = await Promise.resolve(skills.list() as unknown)
        const all = Array.isArray(listed) ? listed as { name: string; description: string; path?: string }[] : []
        const filtered = all.filter(row => typeof row?.description === 'string' && row.description.trim() !== '')
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
    /**
     * 置顶注入段的每请求成本，供总览并进 `billedTokens`。
     *
     * 为什么必须并进去：常驻前缀原本只算「skill description + 目录框架」。
     * 多出一段注入却不计入，顶栏那个数字就会**低于真实付费量**——
     * 正是 `product.md` §十二 修过的同类错误：口径不一致时，用户不知道信哪个。
     */
    pinnedTokens: () => (injectPinned ? pinnedCache.current().tokens : 0),
    pinnedReady: () => (injectPinned ? pinnedCache.ready() : Promise.resolve()),
  }

  /**
   * 启动时探测一次：让 UI 能区分「没有 skill」与「读不到 skill」。
   *
   * 因为现在是异步，挂掉时要显式记日志——静默的探测等于没探测。
   */
  void Promise.resolve(env.listSkills?.()).catch((error: unknown) => {
    skillsError = `启动探测 skills 失败：${error instanceof Error ? error.message : String(error)}`
  })

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

  /**
   * ---- 置顶条目注入系统提示词 ----
   *
   * 这是记忆库从「纯拉取」补上的那条**推送**通道：`pinned: true` 的条目
   * 不再依赖模型主动 `memory_recall`，而是每个请求都在。
   *
   * 三个必须守住的细节：
   *
   *   1. `interpolate: false` —— 记忆正文是用户写的任意 Markdown。宿主的变量
   *      插值是**严格**的：出现未注册的 `{{...}}` 会让整次提示词组装抛错。
   *      一条内容里有 `{{` 就炸掉全部请求，这个代价不能接受。
   *   2. `text` 必须同步 —— 走缓存，见 `pinned-cache.ts`。
   *   3. 同名段落只能注册一次 —— 名字是 `memory-ops:pinned-rules`，重复注册直接抛错。
   */
  if (injectPinned) {
    ctx.inject(['systemPrompt'], (promptCtx) => {
      const systemPrompt = (promptCtx as {
        systemPrompt?: { section?: (section: unknown) => () => void }
      }).systemPrompt
      // 宿主没有这个服务时静默跳过：注入是增强，缺了它记忆库其余部分照常工作。
      if (typeof systemPrompt?.section !== 'function') return
      return systemPrompt.section({
        name: PINNED_SECTION_NAME,
        order: PINNED_SECTION_ORDER,
        text: (context: unknown) => pinnedCache.renderFor(sessionOfContext(context)),
        interpolate: false,
      })
    })
  }

  return () => {
    for (const dispose of disposers) dispose()
    pinnedCache.dispose()
  }
}

export default { name, apply }
