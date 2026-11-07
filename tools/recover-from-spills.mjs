
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
const TMP = process.env.TEMP
const files = []
function walk(dir, depth = 0) {
  if (depth > 6) return
  let ents = []
  try { ents = readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of ents) {
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, depth + 1)
    else if (/\.(txt|json|jsonl|md|log)$/i.test(e.name)) { try { if (statSync(p).size < 60 * 1024 * 1024) files.push(p) } catch {} }
  }
}
for (const d of readdirSync(TMP, { withFileTypes: true })) {
  if (d.isDirectory() && (d.name.startsWith('dsh-spill-') || d.name.startsWith('dsh-'))) walk(join(TMP, d.name))
}
const DSH = join(process.env.USERPROFILE, '.dsh')
walk(DSH)
console.log('scanned ' + files.length + ' candidate files')

const runs = new Map(), gws = new Map()
let scanned = 0
for (const f of files) {
  let txt
  try { txt = readFileSync(f, 'utf8') } catch { continue }
  scanned++
  // A record may appear as a bare JSON line, or embedded inside a JSON string (escaped quotes).
  for (const raw of txt.split('\n')) {
    const cands = [raw]
    const m = raw.match(/\{.*\}/)
    if (m) cands.push(m[0])
    for (let c of cands) {
      c = c.trim().replace(/^\d+[:-]\s*/, '')
      if (!c.startsWith('{') || !c.includes('syntheticKey')) continue
      let o; try { o = JSON.parse(c) } catch { try { o = JSON.parse(c.replace(/\\"/g, '"')) } catch { continue } }
      if (!o || typeof o !== 'object' || !o.syntheticKey) continue
      // A RUN record has task+arm+seed+solved; a GATEWAY record has status+usage.
      if (o.task && o.arm && ('solved' in o)) runs.set(o.task + '|' + o.arm + '|' + o.seed, o)
      else if ('status' in o && o.path) gws.set(o.ts + '|' + o.runId + '|' + o.path, o)
    }
  }
}
console.log('  recovered RUN records:     ' + runs.size)
console.log('  recovered GATEWAY records: ' + gws.size)
mkdirSync('recovered', { recursive: true })
if (runs.size) writeFileSync('recovered/runs.recovered.jsonl', [...runs.values()].map((o) => JSON.stringify(o)).join('\n') + '\n')
if (gws.size) writeFileSync('recovered/gateway.recovered.jsonl', [...gws.values()].map((o) => JSON.stringify(o)).join('\n') + '\n')
const byArm = {}
for (const o of runs.values()) byArm[o.arm] = (byArm[o.arm] ?? 0) + 1
console.log('  by arm: ' + JSON.stringify(byArm))
