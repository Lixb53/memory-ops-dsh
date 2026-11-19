// One-off: add role="list" to prototype list containers (same rationale as plugin side).
import fs from 'node:fs'

const files = ['prototype/pane-capture.js', 'prototype/pane-memory.js', 'prototype/pane-todo.js', 'prototype/pane-health.js', 'prototype/pane-today.js']
const pairs = [
  ['<ul class="list list-clickable">', '<ul class="list list-clickable" role="list">'],
  ['<ul class="list">', '<ul class="list" role="list">'],
]

for (const file of files) {
  let text = fs.readFileSync(file, 'utf8')
  let n = 0
  for (const [from, to] of pairs) {
    const count = text.split(from).length - 1
    if (count > 0) { text = text.split(from).join(to); n += count }
  }
  fs.writeFileSync(file, text)
  console.log(`${file}: ${n}`)
}
