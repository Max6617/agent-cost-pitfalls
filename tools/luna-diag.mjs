import { readFileSync } from 'node:fs'
const runs = readFileSync('results/luna-full/runs.jsonl','utf8').split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return null}}).filter(Boolean)
console.log('  records ' + runs.length)
const byArm = {}
for (const r of runs) {
  const a = byArm[r.arm] = byArm[r.arm] ?? { n: 0, solved: 0, exit: {}, sample: null }
  a.n++; if (r.solved) a.solved++
  a.exit[r.exitCode] = (a.exit[r.exitCode] ?? 0) + 1
  if (!r.solved && !a.sample) {
    const t = ((r.stderrTail ?? '') + (r.stdoutTail ?? '')).trim()
    a.sample = t ? t.slice(-160).replace(/\n/g, ' ') : '(no output at all)'
  }
}
console.log('')
console.log('  ' + 'arm'.padEnd(18) + 'runs'.padStart(5) + 'solved'.padStart(8) + '  exit codes')
for (const [a, v] of Object.entries(byArm).sort()) {
  console.log('  ' + a.padEnd(18) + String(v.n).padStart(5) + (v.solved + '/' + v.n).padStart(8) + '  ' + JSON.stringify(v.exit))
}
console.log('')
console.log('=== why failures fail (one sample per arm) ===')
for (const [a, v] of Object.entries(byArm).sort()) {
  if (v.solved < v.n && v.sample) { console.log('  ' + a.padEnd(18) + v.sample) }
}