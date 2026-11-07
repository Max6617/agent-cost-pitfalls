
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
// The tracked transcript is recovered/sessions-text.txt.gz; the plain .txt is a local, ignored copy.
const text = existsSync('recovered/sessions-text.txt')
  ? readFileSync('recovered/sessions-text.txt', 'utf8')
  : gunzipSync(readFileSync('recovered/sessions-text.txt.gz')).toString('utf8')
const lines = text.split('\n')
const runs = new Map(), gws = new Map()
let truncated = 0
for (const line of lines) {
  if (!line.includes('syntheticKey')) continue
  const start = line.indexOf('{"ts"')
  if (start < 0) continue
  // Walk to the matching close brace; if the line ends first, the record is truncated.
  let depth = 0, inStr = false, esc = false, end = -1
  for (let i = start; i < line.length; i++) {
    const ch = line[i]
    if (esc) { esc = false; continue }
    if (ch === '\\') { esc = true; continue }
    if (ch === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (ch === '{') depth++
    else if (ch === '}') { depth--; if (depth === 0) { end = i; break } }
  }
  if (end < 0) { truncated++; continue }
  let o; try { o = JSON.parse(line.slice(start, end + 1)) } catch { truncated++; continue }
  if (!o.syntheticKey) continue
  if (o.task && o.arm && 'solved' in o) runs.set(o.runId ?? (o.task + '|' + o.arm + '|' + o.seed), o)
  else if ('status' in o && o.path) gws.set(o.ts + '|' + o.runId + '|' + o.path, o)
}
console.log('  complete RUN records:     ' + runs.size)
console.log('  truncated / unparseable:  ' + truncated)
console.log('  GATEWAY records:          ' + gws.size)
mkdirSync('recovered', { recursive: true })
writeFileSync('recovered/runs.from-sessions.jsonl', [...runs.values()].map((o) => JSON.stringify(o)).join('\n') + '\n')
writeFileSync('recovered/gateway.from-sessions.jsonl', [...gws.values()].map((o) => JSON.stringify(o)).join('\n') + '\n')
if (runs.size) {
  const k = Object.keys([...runs.values()][0])
  console.log('  record fields: ' + k.join(','))
  const byArm = {}; for (const o of runs.values()) byArm[o.arm] = (byArm[o.arm] ?? 0) + 1
  console.log('  by arm: ' + JSON.stringify(byArm))
}
