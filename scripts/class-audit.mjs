// Audit: dmo-* classes used in client sources but not defined in styles.ts
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const dir = 'packages/dsh-plugin/src/client'
const styles = readFileSync(join(dir, 'styles.ts'), 'utf8')
const defined = new Set([...styles.matchAll(/\.(dmo-[a-z0-9-]+)/g)].map(m => m[1]))

const files = []
;(function walk(d) {
  for (const name of readdirSync(d)) {
    const p = join(d, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (name.endsWith('.ts') && name !== 'styles.ts') files.push(p)
  }
})(dir)

const missing = new Map()
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  for (const m of src.matchAll(/dmo-[a-z0-9-]+/g)) {
    if (!defined.has(m[0])) {
      if (!missing.has(m[0])) missing.set(m[0], new Set())
      missing.get(m[0]).add(f.replace(/\\/g, '/'))
    }
  }
}
console.log(`defined in styles.ts: ${defined.size}`)
console.log(`used-but-missing: ${missing.size}`)
for (const [cls, fs] of [...missing].sort()) console.log(`  ${cls}  <- ${[...fs].join(', ')}`)
