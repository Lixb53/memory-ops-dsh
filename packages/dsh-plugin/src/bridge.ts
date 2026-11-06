/**
 * HTTP 桥 —— 30 条能力的传输层，本身不含业务逻辑。
 *
 * 每条能力一条 **exact** 路由（不用宽 prefix）：路径各不相同不会撞
 * (kind, path) 契约，而且「未知能力」会明确落到宿主的 fallback，
 * 而不是被一个宽前缀悄悄吞掉返回 200。
 *
 * 围栏：只接受 127.0.0.1 / ::1；不提供执行命令的端点；请求体限长。
 */

import type { Actions, ResidentSkill } from '@memory-ops/core/actions'

/** 一条能力的传输声明。 */
export interface RouteSpec {
  /** HTTP 方法：读用 POST（参数在体里），健康检查用 GET。 */
  method: 'GET' | 'POST'
  run: (
    actions: Actions,
    body: Record<string, unknown>,
    env: BridgeEnv,
  ) => Promise<unknown> | unknown
}

/** 桥运行时可用的宿主能力（可选，取不到就降级）。 */
export interface BridgeEnv {
  /**
   * 读当前会话可见的 skill description。
   *
   * 为什么从这里读而不是扫文件：`ctx.skills.list()` 返回的正是宿主
   * 实际注入 `<available_skills>` 的那一份（含 description 截断规则），
   * 自己扫 SKILL.md 会算出与真实付费量不一致的数字。
   */
  listSkills?: () => ResidentSkill[]
  /**
   * 为什么没读到 skill。
   *
   * 空数组不解释等于「本来就没有」——而实际情况常常是「宿主没给服务」
   * 或「skill 没有 description」。两种情况的处理方式完全不同，必须让人看见。
   */
  skillsError?: () => string
}

/** 能力表：路由名 → 实现。与 product.md §8.1 的「30 条」对齐。 */
export const ROUTES: Readonly<Record<string, RouteSpec>> = {
  // —— 读 ——
  snapshot: { method: 'POST', run: (a, b) => a.snapshot(b as never) },
  overview: {
    method: 'POST',
    run: (a, _b, env) => a.overview({
      skillDescriptions: env.listSkills?.() ?? [],
      skillsError: env.skillsError?.() ?? '',
    }),
  },
  inbox: { method: 'POST', run: (a, b) => a.inbox(b as never) },
  search: { method: 'POST', run: (a, b) => a.search(b as never) },
  detail: { method: 'POST', run: (a, b) => a.detail(b as never) },
  misses: { method: 'POST', run: a => a.misses() },
  health: { method: 'POST', run: a => a.health() },
  index: { method: 'POST', run: (a, b) => a.index(b as never) },
  // —— 记录流写 ——
  capture: { method: 'POST', run: (a, b) => a.capture(b as never) },
  captureBatch: { method: 'POST', run: (a, b) => a.captureBatch(b as never) },
  updateInbox: { method: 'POST', run: (a, b) => a.updateInbox(b as never) },
  deleteInbox: { method: 'POST', run: (a, b) => a.deleteInbox(b as never) },
  batchInboxState: { method: 'POST', run: (a, b) => a.batchInboxState(b as never) },
  promoteInbox: { method: 'POST', run: (a, b) => a.promoteInbox(b as never) },
  // —— 记忆写 ——
  writeBody: { method: 'POST', run: (a, b) => a.writeBody(b as never) },
  setStatus: { method: 'POST', run: (a, b) => a.setStatus(b as never) },
  confirm: { method: 'POST', run: (a, b) => a.confirm(b as never) },
  reject: { method: 'POST', run: (a, b) => a.reject(b as never) },
  undoReject: { method: 'POST', run: (a, b) => a.undoReject(b as never) },
  archive: { method: 'POST', run: (a, b) => a.archive(b as never) },
  keep: { method: 'POST', run: (a, b) => a.keep(b as never) },
  batchArchive: { method: 'POST', run: (a, b) => a.batchArchive(b as never) },
  // —— 未命中 ——
  missDraft: { method: 'POST', run: (a, b) => a.missDraft(b as never) },
  missConfirm: { method: 'POST', run: (a, b) => a.missConfirm(b as never) },
  missBatchDraft: { method: 'POST', run: (a, b) => a.missBatchDraft(b as never) },
  missDelete: { method: 'POST', run: (a, b) => a.missDelete(b as never) },
  // —— 维护（按需触发，无常驻定时器）——
  verifyAnchor: { method: 'POST', run: (a, b) => a.verifyAnchor(b as never) },
  compact: { method: 'POST', run: (a, b) => a.compact(b as never) },
  review: { method: 'POST', run: (a, b) => a.review(b as never) },
  promote: { method: 'POST', run: (a, b) => a.promote(b as never) },
  repairMeta: { method: 'POST', run: (a, b) => a.repairMeta(b as never) },
  // —— 其他 ——
  export: { method: 'POST', run: (a, b) => a.export(b as never) },
  sessionMemory: { method: 'POST', run: (a, b) => a.sessionMemory(b as never) },
  // —— 诊断 ——
  healthCheck: {
    method: 'GET',
    run: a => ({ ok: true, root: a.store.root, routes: Object.keys(ROUTES).length }),
  },
}

/** 路由名 → 完整路径。 */
export function routePathOf(prefix: string, routeName: string): string {
  return `${prefix}/${routeName}`
}

/** 只接受本机回环。 */
function isLoopback(req: { socket?: { remoteAddress?: string } }): boolean {
  const address = req?.socket?.remoteAddress ?? ''
  return address === '127.0.0.1'
    || address === '::1'
    || address === '::ffff:127.0.0.1'
    || address.startsWith('127.')
}

/** 写 JSON 响应。 */
function json(res: {
  writeHead(status: number, headers: Record<string, string>): void
  end(payload: string): void
}, status: number, body: unknown): void {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
  })
  res.end(JSON.stringify(body))
}

/** 读请求体（限长，防误投大文件）。 */
async function readBody(req: AsyncIterable<Buffer | string>, limit = 2 * 1024 * 1024): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
    size += buffer.length
    if (size > limit) throw new Error('请求体过大')
    chunks.push(buffer)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (raw.trim() === '') return {}
  const parsed: unknown = JSON.parse(raw)
  return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : {}
}

/** 建桥。 */
export function createBridge({ actions, prefix, env = {} }: {
  actions: Actions
  prefix: string
  env?: BridgeEnv
}) {
  /** 单条能力的处理器。 */
  function handlerFor(routeName: string) {
    const route = ROUTES[routeName]
    if (route === undefined) return null
    return async (req: never, res: never): Promise<void> => {
      const request = req as unknown as {
        method?: string
        url?: string
        socket?: { remoteAddress?: string }
      } & AsyncIterable<Buffer | string>
      const response = res as unknown as Parameters<typeof json>[0]
      if (!isLoopback(request)) {
        json(response, 403, { ok: false, error: '仅接受本机回环请求' })
        return
      }
      if (request.method !== route.method) {
        json(response, 405, { ok: false, error: `该能力只支持 ${route.method}` })
        return
      }
      try {
        const body = route.method === 'POST' ? await readBody(request) : {}
        const result = await route.run(actions, body, env)
        const failed = typeof result === 'object' && result !== null && (result as { ok?: boolean }).ok === false
        json(response, failed ? 400 : 200, result ?? { ok: true })
      } catch (error) {
        json(response, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    }
  }

  /** 把全部能力注册到宿主的 webServer。 */
  function attach(ctx: { webServer: { register(route: { kind: string; path: string; handler: unknown }): () => void } }): () => void {
    const disposers: (() => void)[] = []
    for (const routeName of Object.keys(ROUTES)) {
      const handler = handlerFor(routeName)
      if (handler === null) continue
      disposers.push(ctx.webServer.register({
        kind: 'exact',
        path: routePathOf(prefix, routeName),
        handler,
      }))
    }
    return () => {
      for (const dispose of disposers) dispose()
    }
  }

  return { attach, handlerFor, routes: ROUTES }
}
