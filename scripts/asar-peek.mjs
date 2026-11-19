// One-off: peek inside an Electron asar archive without extra dependencies.
import fs from 'node:fs'

const path = process.argv[2]
const pattern = process.argv[3] ? new RegExp(process.argv[3]) : null
const readEntry = process.argv[4]
const outFile = process.argv[5]

const buf = fs.readFileSync(path)
const headerSize = buf.readUInt32LE(4)
const jsonLen = buf.readUInt32LE(12)
const json = JSON.parse(buf.subarray(16, 16 + jsonLen).toString('utf8'))
const base = 8 + headerSize

const entries = []
function walk(node, prefix) {
  if (node.files) {
    for (const [name, child] of Object.entries(node.files)) walk(child, `${prefix}/${name}`)
  } else if (node.size !== undefined) {
    entries.push({ path: prefix, size: node.size, offset: node.offset })
  }
}
walk(json, '')

if (readEntry) {
  const hit = entries.find(e => e.path === readEntry)
  if (!hit) throw new Error('not found: ' + readEntry)
  const data = buf.subarray(base + Number(hit.offset), base + Number(hit.offset) + hit.size)
  if (outFile) fs.writeFileSync(outFile, data)
  else process.stdout.write(data)
} else {
  const filtered = pattern ? entries.filter(e => pattern.test(e.path)) : entries
  for (const e of filtered.slice(0, 400)) console.log(`${e.size}\t${e.path}`)
  console.error(`total entries: ${entries.length}, matched: ${filtered.length}`)
}
