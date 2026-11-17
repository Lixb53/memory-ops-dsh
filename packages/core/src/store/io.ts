/**
 * store/io.ts —— 原子写、文件锁、目录遍历
 *
 * 从 `store.ts` 拆出。这三件事是**所有写入路径的公共地基**，
 * 且它们与业务语义无关（不知道什么是"记忆条目"）。
 *
 * 拆出来的直接好处：`withLock` 与 `atomicWrite` 可以被单独测，
 * 而不需要构造一个完整 store。
 */

import type { Dirent } from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'

import { ARCHIVE_DIR, SKIP_NAMES, STATE_DIR } from './paths.ts'

/** 原子写：同目录 tmp + rename。 */
export async function atomicWrite(target: string, content: string): Promise<void> {
  const dir = path.dirname(target)
  await fsp.mkdir(dir, { recursive: true })
  const tmp = path.join(dir, `.${path.basename(target)}.${process.pid}.${Date.now()}.tmp`)
  await fsp.writeFile(tmp, content, 'utf8')
  await fsp.rename(tmp, target)
}

/** 独占锁：O_EXCL 创建 `<file>.lock`，超时视为陈旧并回收。 */
export async function withLock<T>(
  target: string,
  run: () => Promise<T>,
  { timeoutMs = 3000 } = {},
): Promise<T> {
  const lockPath = `${target}.lock`
  await fsp.mkdir(path.dirname(lockPath), { recursive: true })
  const started = Date.now()
  let handle: fsp.FileHandle | null = null
  while (handle === null) {
    try {
      handle = await fsp.open(lockPath, 'wx')
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'EEXIST') throw error
      try {
        const stat = await fsp.stat(lockPath)
        if (Date.now() - stat.mtimeMs > timeoutMs) {
          await fsp.unlink(lockPath).catch(() => {})
          continue
        }
      } catch { /* 锁刚被释放 */ }
      if (Date.now() - started > timeoutMs) throw new Error(`写锁超时：${lockPath}`)
      await new Promise(resolve => setTimeout(resolve, 25))
    }
  }
  try {
    await handle.writeFile(String(process.pid))
    return await run()
  } finally {
    await handle.close().catch(() => {})
    await fsp.unlink(lockPath).catch(() => {})
  }
}

/** 递归列出 markdown 文件（跳过隐藏目录、.state、archive、node_modules）。 */
export async function listMarkdown(root: string, relative = ''): Promise<string[]> {
  const absolute = path.join(root, relative)
  let entries: Dirent[]
  try {
    entries = await fsp.readdir(absolute, { withFileTypes: true }) as Dirent[]
  } catch {
    return []
  }
  const found: string[] = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    if (SKIP_NAMES.has(entry.name)) continue
    if (relative === '' && (entry.name === STATE_DIR || entry.name === ARCHIVE_DIR)) continue
    const nextRelative = relative === '' ? entry.name : `${relative}/${entry.name}`
    if (entry.isDirectory()) {
      found.push(...await listMarkdown(root, nextRelative))
      continue
    }
    if (!entry.name.toLowerCase().endsWith('.md')) continue
    found.push(nextRelative)
  }
  return found
}
