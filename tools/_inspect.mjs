import { readFileSync } from 'node:fs'
const runs = readFileSync('results/runs.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
const bad = runs.find((r) => r.harness === 'dsh')
console.log('runId      : ' + bad.runId)
console.log('exitCode   : ' + bad.exitCode)
console.log('durationMs : ' + bad.durationMs)
console.log('arm/mode   : ' + bad.arm + ' / ' + bad.mode)
console.log('--- stderr ---')
console.log(bad.stderrTail || '(empty)')
console.log('--- stdout (first 800) ---')
console.log((bad.stdoutTail || '(empty)').slice(0, 800))
console.log('')
console.log('--- summary by harness ---')
for (const h of ['dsh', 'opencode']) {
  const rs = runs.filter((r) => r.harness === h)
  console.log('  ' + h.padEnd(10) + 'runs=' + rs.length + '  exit0=' + rs.filter((r) => r.exitCode === 0).length +
    '  medianMs=' + rs.map((r) => r.durationMs).sort((a, b) => a - b)[Math.floor(rs.length / 2)])
}
