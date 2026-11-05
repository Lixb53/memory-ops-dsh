/**
 * 表面 4：`/remember` 命令 —— 「不离开输入框就存完」。
 *
 * 两个入口：
 *   - 菜单候选：输入 `/rem` 出现候选，选中后进入待输入状态
 *   - 直接回车：`/remember 内容` 一行提交
 *
 * 存入后可撤销（30 秒）。撤销靠「按内容找最近一条」而不是记行号——
 * 行号会因并发捕获漂移，内容匹配在单人场景更稳。
 */

import type { ClientContext } from './index.ts'
import { call, type CaptureResult } from './api.ts'

/** 命令名（不带斜杠）。 */
export const COMMAND_NAME = 'remember'

/** 触发源需要的回调形状（宿主契约的最小面）。 */
interface PickOutcomeLike {
  kind: string
  [key: string]: unknown
}

interface TriggerSource {
  trigger: '/'
  name: string
  order?: number
  candidates(
    session: { sessionId: string },
    req: { query: string; position: string },
  ): Promise<{ name: string; label?: string; description?: string; section?: string }[]>
  onPick(pick: { candidate: { name: string }; span: unknown }): PickOutcomeLike
  matchEnter?(
    session: { sessionId: string },
    line: string,
    signal: AbortSignal,
    envelope: { attachments: number },
  ): Promise<PickOutcomeLike | undefined>
}

/** 解析 `/remember 内容` 一行。 */
export function parseRememberLine(line: string): { matched: boolean; content: string } {
  const text = String(line ?? '').trim()
  const pattern = /^\/remember(?:\s+([\s\S]*))?$/
  const match = pattern.exec(text)
  if (match === null) return { matched: false, content: '' }
  return { matched: true, content: (match[1] ?? '').trim() }
}

/** 注册 `/remember` 触发源。 */
export function registerRememberSource(ctx: ClientContext): () => void {
  const inputTriggers = ctx.get('inputTriggers') as {
    registerSource(source: TriggerSource): () => void
  } | undefined
  if (inputTriggers === undefined || typeof inputTriggers.registerSource !== 'function') {
    return () => {}
  }

  const source: TriggerSource = {
    trigger: '/',
    name: COMMAND_NAME,
    order: 40,
    async candidates(_session, req) {
      const query = String(req?.query ?? '').trim().toLowerCase()
      if (req?.position !== 'leading') return []
      if (query !== '' && !COMMAND_NAME.startsWith(query)) return []
      return [{
        name: COMMAND_NAME,
        label: '/remember',
        description: '把一句话存进记忆库的记录流（可用空格后跟内容一次提交）',
        section: '记忆库',
      }]
    },
    onPick() {
      // 选中候选后把 `/remember ` 插入输入框，等用户补内容再回车
      return { kind: 'insert', text: `/${COMMAND_NAME} ` }
    },
    async matchEnter(_session, line, _signal, envelope) {
      const parsed = parseRememberLine(line)
      if (!parsed.matched) return undefined
      // 带附件时不接管：附件有自己的处理链路
      if (envelope.attachments > 0) return undefined
      if (parsed.content === '') {
        throw new Error('/remember 后面要跟内容，例如：/remember 缓存前缀变更会作废 KV cache')
      }
      const result = await call<CaptureResult>('capture', { content: parsed.content, kind: '想法' })
      if (!result.ok) {
        // 隐私拦截要抛出：让提交被拒并保留草稿，而不是静默吞掉
        throw new Error(`未存入：${result.reason ?? '未知原因'}`)
      }
      return {
        kind: 'notice',
        text: `已存入 ${result.captured?.path ?? '记录流'}（30 秒内可在右侧栏撤销）`,
      }
    },
  }

  return inputTriggers.registerSource(source)
}
