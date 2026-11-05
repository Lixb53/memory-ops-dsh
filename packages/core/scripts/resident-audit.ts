/**
 * 常驻前缀审计：区分「两个 skill description」（真正每请求付费的部分）
 * 与「layer: l0 的索引文件」（按需加载的部分）。
 *
 * 这两个数字在 product.md 里被混为一谈，审计的意义就是把它拆开。
 */
import fsp from 'node:fs/promises'
import { estimateTokens } from '../src/schema.ts'

const SKILLS = [
  '/Users/zeze/Desktop/dsh/skill/personal-memory/SKILL.md',
  '/Users/zeze/Desktop/dsh/skill/sz-web-memory/SKILL.md',
]

function descriptionOf(raw: string): string {
  const block = raw.split('---')[1] ?? ''
  const line = block.split('\n').find(item => item.startsWith('description:')) ?? ''
  return line.replace(/^description:\s*/, '')
}

let descTotal = 0
let fullTotal = 0
for (const file of SKILLS) {
  let raw = ''
  try {
    raw = await fsp.readFile(file, 'utf8')
  } catch {
    console.log(`  跳过（不存在）：${file}`)
    continue
  }
  const name = file.split('/').slice(-2, -1)[0]
  const desc = descriptionOf(raw)
  const descTokens = estimateTokens(desc)
  const fullTokens = estimateTokens(raw)
  descTotal += descTokens
  fullTotal += fullTokens
  console.log(`${name}`)
  console.log(`  description（常驻）: ${descTokens} tokens`)
  console.log(`  全文（按需加载）    : ${fullTokens} tokens`)
}

console.log(`\n常驻合计（两个 description）: ${descTotal} tokens`)
console.log(`按需合计（两个 SKILL.md 全文）: ${fullTotal} tokens`)
