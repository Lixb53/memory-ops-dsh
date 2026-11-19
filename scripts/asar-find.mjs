// One-off: locate a string inside an asar's data section and dump the owning entry.
import fs from 'node:fs'

const path = process.argv[2]
const needle = process.argv[3]
const dumpPrefix = process.argv[4] ? process.argv[4] === 'dump' : false

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
    entries.push({ path: prefix, size: node.size, offset: Number(node.offset) })
  }
}
walk(json, '')

const needleBuf = Buffer.from(needle, 'utf8')
let pos = 0
const hits = []
while ((pos = buf.indexOf(needleBuf, pos)) !== -1) {
  hits.push(pos)
  pos += needleBuf.length
}
console.log(`occurrences: ${hits.length}`)

const byOffset = entries.map(e => ({ ...e, abs: base + e.offset }))
for (const hit of hits) {
  const owner = byOffset.find(e => hit >= e.abs && hit < e.abs + e.size)
  console.log(owner ? owner.path : `(outside entries @${hit})`)
}

if (dumpPrefix) {
  for (const e of byOffset) {
    if (e.path.includes(needle) && /\.(js|mjs|cjs)$/.test(e.path)) {
      const out = `.tmp/dsh/${e.path.split('/').pop()}`
      fs.writeFileSync(out, buf.subarray(e.abs, e.abs + e.size))
      console.log('dumped', out, e.size)
    }
  }
}
