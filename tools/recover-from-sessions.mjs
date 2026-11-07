
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import zlib from 'node:zlib'
const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
function allFrames(buf) {
  const starts = []; let i = buf.indexOf(MAGIC, 0)
  while (i >= 0) { starts.push(i); i = buf.indexOf(MAGIC, i + 4) }
  const parts = []
  for (let k = 0; k < starts.length; k++) {
    const slice = buf.subarray(starts[k], k + 1 < starts.length ? starts[k + 1] : buf.length)
    try { parts.push(zlib.zstdDecompressSync(slice).toString('utf8')) } catch {}
  }
  return parts.join('')
}
const SESS = join(process.env.USERPROFILE, '.dsh', 'sessions')
let files = []
for (const d of readdirSync(SESS, { withFileTypes: true })) {
  if (!d.isDirectory() || !d.name.includes('betterharness')) continue
  for (const s of readdirSync(join(SESS, d.name), { withFileTypes: true })) {
    if (!s.isDirectory()) continue
    for (const f of readdirSync(join(SESS, d.name, s.name))) if (f.endsWith('.zstd')) files.push(join(SESS, d.name, s.name, f))
  }
}
const parts = []
for (const f of files) { try { const t = allFrames(readFileSync(f)); if (t) parts.push(t) } catch {} }
const joined = parts.join('\n')
const text = joined.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t')
console.log('text: ' + (text.length / 1048576).toFixed(1) + ' MB')

/** Extract balanced JSON objects containing a marker, with nesting awareness. */
function extractObjects(s, marker) {
  const out = []
  let from = 0
  for (;;) {
    const idx = s.indexOf(marker, from)
    if (idx < 0) break
    from = idx + marker.length
    let start = s.lastIndexOf('{', idx)
    if (start < 0) continue
    let depth = 0, inStr = false, esc = false, end = -1
    for (let i = start; i < s.length && i < start + 400000; i++) {
      const ch = s[i]
      if (esc) { esc = false; continue }
      if (ch === '\\') { esc = true; continue }
      if (ch === '"') { inStr = !inStr; continue }
      if (inStr) continue
      if (ch === '{') depth++
      else if (ch === '}') { depth--; if (depth === 0) { end = i; break } }
    }
    if (end < 0) continue
    try { out.push(JSON.parse(s.slice(start, end + 1))) } catch {}
  }
  return out
}
const runs = new Map(), gws = new Map()
for (const o of extractObjects(text, 'syntheticKey')) {
  if (o.task && o.arm && 'solved' in o) runs.set(o.task + '|' + o.arm + '|' + o.seed, o)
  else if ('status' in o && o.path) gws.set(o.ts + '|' + o.runId + '|' + o.path, o)
}
console.log('  RUN records:     ' + runs.size)
console.log('  GATEWAY records: ' + gws.size)
mkdirSync('recovered', { recursive: true })
writeFileSync('recovered/sessions-text.txt', text)
if (runs.size) writeFileSync('recovered/runs.from-sessions.jsonl', [...runs.values()].map((o) => JSON.stringify(o)).join('\n') + '\n')
if (gws.size) writeFileSync('recovered/gateway.from-sessions.jsonl', [...gws.values()].map((o) => JSON.stringify(o)).join('\n') + '\n')
