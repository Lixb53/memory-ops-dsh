// One-off: add role="list" to the plugin's dmo-list containers.
// Reason: .dmo-list sets list-style:none, and Safari+VoiceOver strip native
// ul/li list semantics in that case (direction-card §七-5, v6 round-1).
import fs from 'node:fs'

const edits = [
  ['packages/dsh-plugin/src/client/panes/capture.ts',
    "createElement('ul', { className: 'dmo-list' }, rows)",
    "createElement('ul', { className: 'dmo-list', role: 'list' }, rows)"],
  ['packages/dsh-plugin/src/client/panes/memory.ts',
    "createElement('ul', { className: 'dmo-list dmo-list-clickable' }, rows)",
    "createElement('ul', { className: 'dmo-list dmo-list-clickable', role: 'list' }, rows)"],
  ['packages/dsh-plugin/src/client/panes/todo.ts',
    "createElement('ul', { className: 'dmo-list' }, rows)",
    "createElement('ul', { className: 'dmo-list', role: 'list' }, rows)"],
  ['packages/dsh-plugin/src/client/panes/todo.ts',
    "createElement('ul', { className: 'dmo-list' }, decisionRows)",
    "createElement('ul', { className: 'dmo-list', role: 'list' }, decisionRows)"],
  ['packages/dsh-plugin/src/client/panes/todo.ts',
    "createElement('ul', { className: 'dmo-list' }, flowRows)",
    "createElement('ul', { className: 'dmo-list', role: 'list' }, flowRows)"],
]

for (const [file, from, to] of edits) {
  let text = fs.readFileSync(file, 'utf8')
  if (!text.includes(from)) { console.log(`MISS ${file}: ${from.slice(0, 60)}`); continue }
  text = text.split(from).join(to)
  fs.writeFileSync(file, text)
  console.log(`ok   ${file}`)
}
