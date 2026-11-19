// Audit: classes defined in prototype CSS but never used in prototype JS/HTML.
import fs from 'node:fs'
import path from 'node:path'

const dir = 'prototype'
const css = fs.readFileSync(path.join(dir, 'app.css'), 'utf8')
  + fs.readFileSync(path.join(dir, 'app-pages.css'), 'utf8')
const defined = new Set([...css.matchAll(/^\.([a-z][a-z0-9-]*)/gm)].map(m => m[1]))

let js = ''
for (const f of fs.readdirSync(dir)) {
  if (f.endsWith('.js') || f === 'index.html') js += fs.readFileSync(path.join(dir, f), 'utf8')
}
const unused = [...defined].filter(c => !js.includes(c))
console.log(`defined: ${defined.size}, unused: ${unused.length}`)
console.log(unused.join(', '))
