import { readFileSync } from 'node:fs'
import { indexByRun } from './attribute.mjs'
const gw = []
for (const l of readFileSync('results/gateway.jsonl', 'utf8').split('\n')) { if (l.trim()) { try { gw.push(JSON.parse(l)) } catch {} } }
const { byRun } = indexByRun(gw)
const runs = readFileSync('results/ds-full/runs.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))

// The criterion the pre-registration §9 specifies: a run that failed on provider quota is
// an INFRASTRUCTURE failure, excluded, regardless of how many requests it managed first.
const isQuota = (r) => /QUOTA|Insufficient Balance|no resource package/i.test((r.stderrTail ?? '') + (r.stdoutTail ?? ''))
const valid = runs.filter((r) => !isQuota(r))
const dead = runs.filter(isQuota)
console.log('records ' + runs.length + '   VALID ' + valid.length + '   credit-exhausted ' + dead.length)
console.log('  valid solved : ' + valid.filter((r) => r.solved).length + ' / ' + valid.length)
console.log('  dead  solved : ' + dead.filter((r) => r.solved).length + ' / ' + dead.length + '  (should be 0)')
console.log('')
console.log('=== what the VALID set covers ===')
const vt = new Set(valid.map((r) => r.task)), va = new Set(valid.map((r) => r.arm))
console.log('  tasks ' + vt.size + '   arms ' + va.size)
console.log('')
const byArm = {}
for (const r of valid) byArm[r.arm] = (byArm[r.arm] ?? 0) + 1
console.log('  ' + 'arm'.padEnd(20) + 'valid'.padStart(7) + 'full'.padStart(7))
for (const a of Object.keys(byArm).sort()) console.log('  ' + a.padEnd(20) + String(byArm[a]).padStart(7) + String(62).padStart(7))
console.log('')
console.log('=== per-task coverage, to see if the valid set is balanced ===')
const perTask = {}
for (const r of valid) perTask[r.task] = (perTask[r.task] ?? 0) + 1
const counts = Object.values(perTask)
console.log('  tasks with a full 7 arms : ' + counts.filter((c) => c === 7).length)
console.log('  tasks with a full 14 (2 seeds, 7 arms) : ' + counts.filter((c) => c === 14).length)
console.log('  task coverage histogram  : ' + JSON.stringify(counts.reduce((a, c) => (a[c] = (a[c] ?? 0) + 1, a), {})))
console.log('')
const tasksFull = Object.entries(perTask).filter(([, c]) => c >= 7).map(([t]) => t).sort()
console.log('  tasks with BOTH presentation arms present and usable: ' + tasksFull.length)
console.log('    ' + tasksFull.join('\n    '))
console.log('')
console.log('=== is the 15-task common set covered? (needed for H1 across providers) ===')
const common = ['single-step-csv-quoting','single-step-date-month-end','single-step-query-builder','single-step-rate-limit-window','single-step-retry-after','single-step-topological-cycles','single-step-parse-negative','fetch-heavy-content-negotiation','fetch-heavy-duration-parse','fetch-heavy-json-pointer-patch','fetch-heavy-semver-range','multi-file-config-precedence','multi-file-discount-stacking','multi-file-feature-flags','multi-file-schema-validator']
const cov = common.filter((t) => (perTask[t] ?? 0) >= 7)
console.log('  of the 15 common tasks, usable for H1: ' + cov.length)
