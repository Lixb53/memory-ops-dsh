/**
 * v9 动作层 —— 所有写操作都从这里出去。
 *
 * 三条约定（每条都由评审里的真实事故换来的）：
 *
 * 1. **写操作没有静默 `void call(...)`**：调用方必须 `await` 并 `catch`，
 *    把失败摆到检视栏或就地回执里。静默的写失败会让人以为「已经生效」。
 * 2. **confirm / reject / archive / keep 的键是 `path`**，不是点分 id。
 *    v6 踩过：早先传 `personal.principles`，core 打开 `personal/principles.md`
 *    必然 ENOENT，且错误被吞成「点了没反应」。
 * 3. **驳回必须带理由**：空理由在动作层就拒掉，不等到 core 报错。
 */

import { call, type CaptureResult } from '../api.ts'

/** 失败归类：决定界面该给哪种补救建议（不只给一句统一话术）。 */
export type FailureKind = 'privacy' | 'lock' | 'missing' | 'unknown'

/** 判定失败类型。 */
export function classify(error: unknown): FailureKind {
  const message = error instanceof Error ? error.message : String(error)
  if (/密钥|私钥|身份证|内网 IP|拒写|脱敏/.test(message)) return 'privacy'
  if (/写锁超时|EEXIST|EBUSY/.test(message)) return 'lock'
  if (/ENOENT|找不到|不存在/.test(message)) return 'missing'
  return 'unknown'
}

/** 动作失败时给人看的一句话：分类而不是原样抛。 */
export function hintOf(error: unknown): string {
  const kind = classify(error)
  if (kind === 'privacy') return '明文 Markdown 不能存密钥。换成占位符再存，原文不要进库。'
  if (kind === 'lock') return '另一个进程正在写同一个文件，等一两秒再试。'
  if (kind === 'missing') return '目标条目不在库里了（可能刚被移动或归档）。重取一次再看。'
  return '库文件没有丢，这是读取或写入问题。'
}

/** 确认一条推断（进检索与置顶通道）。 */
export async function confirmEntry(path: string): Promise<void> {
  await call('confirm', { path })
}

/** 驳回一条推断。理由必填。 */
export async function rejectEntry(path: string, reason: string): Promise<void> {
  const trimmed = reason.trim()
  if (trimmed === '') throw new Error('驳回要写理由：否则 30 天后没人知道为什么否掉它')
  await call('reject', { path, reason: trimmed })
}

/** 撤销驳回。 */
export async function undoReject(path: string): Promise<void> {
  await call('undoReject', { path })
}

/** 归档（退役）。 */
export async function archiveEntry(path: string): Promise<void> {
  await call('archive', { path })
}

/** 再留 90 天。 */
export async function keepEntry(path: string): Promise<void> {
  await call('keep', { path })
}

/** 捕获一条进 INBOX。 */
export async function captureOne(content: string, kind: string): Promise<CaptureResult> {
  const trimmed = content.trim()
  if (trimmed === '') throw new Error('内容为空，未写入')
  const result = await call<CaptureResult>('capture', { content: trimmed, kind })
  if (result?.ok !== true) throw new Error(result?.reason ?? '没存上')
  return result
}

/** 改 INBOX 行（状态 / 内容 / 类型）。 */
export async function patchInboxRow(lineIndex: number, patch: Record<string, unknown>): Promise<void> {
  await call('updateInbox', { domain: 'personal', lineIndex, patch })
}

/** 删 INBOX 行（撤销写入用）。 */
export async function deleteInboxRows(lineIndexes: number[]): Promise<void> {
  await call('deleteInbox', { domain: 'personal', lineIndexes })
}

/** 把未命中生成草稿（只进 INBOX，落档仍需人确认）。 */
export async function draftMiss(query: string): Promise<void> {
  await call('missDraft', { query })
}

/**
 * 撤销刚写入的一条捕获。
 *
 * 为什么按内容找行号而不是记住行号：INBOX 是 append-only 的文本表，
 * 写入后行号会随下一笔追加/删除漂移；内容匹配 + 「取最后一条」才是稳的。
 * 找不到就抛错——假装撤销成功会让界面与库不一致。
 */
export async function undoCapture(content: string): Promise<void> {
  const list = await call<{ entries: { content: string; lineIndex: number }[] }>('inbox', { domain: 'personal' })
  const match = [...list.entries].reverse().find(row => row.content === content)
  if (match === undefined) throw new Error('找不到刚存入的那一条（可能已被处理）')
  await deleteInboxRows([match.lineIndex])
}

/** 检索并记账（`record: false` 时只预览、不计入命中率）。 */
export async function searchEntries(query: string, record: boolean): Promise<void> {
  await call('search', { query, record })
}

/** 写条目正文（编辑态保存）。 */
export async function writeBody(path: string, body: string): Promise<void> {
  await call('writeBody', { path, body })
}

/** 导出。 */
export async function exportData(format: 'markdown' | 'json', domain?: string): Promise<{ count: number; filename: string }> {
  return call<{ count: number; filename: string }>('export', { format, domain })
}

/** 批量归档（一次退役多条）。 */
export async function batchArchive(paths: string[], reason: string): Promise<void> {
  if (paths.length === 0) throw new Error('没有要归档的条目')
  await call('batchArchive', { paths, reason })
}

/** 批量改 INBOX 行状态（「全部标完成」用它，不逐行循环打请求）。 */
export async function batchInboxState(lineIndexes: number[], state: 'done' | 'dropped'): Promise<void> {
  if (lineIndexes.length === 0) throw new Error('没有要改的行')
  await call('batchInboxState', { domain: 'personal', lineIndexes, state })
}

/** 把一条 INBOX 行升级为记忆（仍进 INBOX 域，但成为可检索条目）。 */
export async function promoteInboxRow(lineIndex: number): Promise<void> {
  await call('promoteInbox', { domain: 'personal', lineIndex })
}

/** 确认某条未命中已经补上：内容写进 INBOX，query 转 verified。 */
export async function confirmMiss(query: string, content: string): Promise<void> {
  const trimmed = content.trim()
  if (trimmed === '') throw new Error('补上的内容不能为空')
  await call('missConfirm', { query, content: trimmed, type: '问题', domain: 'personal' })
}

/** 批量生成草稿（一次处理多条未命中）。 */
export async function batchDraftMiss(queries: string[]): Promise<void> {
  if (queries.length === 0) throw new Error('没有要写草稿的条目')
  await call('missBatchDraft', { queries, type: '问题' })
}

/** 删除一条未命中（「这不是个问题」，不再占位）。 */
export async function deleteMiss(query: string): Promise<void> {
  await call('missDelete', { query })
}