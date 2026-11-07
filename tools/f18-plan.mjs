// F18 replication design. Measured hard-task costs, scaled by the 1.61 console factor.
const C = { haiku: 0.2656 * 1.611, deepseek: 0.073 }   // per run on a hard task
console.log('  measured per hard-task run: haiku $' + C.haiku.toFixed(3) + '   deepseek $' + C.deepseek.toFixed(3))
console.log('')
const designs = [
  ['same task, 6 more seeds, 7 arms, 2 models', 1, 7, 6],
  ['same task, 6 seeds, 10 arms, 2 models', 1, 10, 6],
  ['5 tasks, 3 seeds, 10 arms, 2 models', 5, 10, 3],
  ['8 tasks, 2 seeds, 10 arms, 2 models', 8, 10, 2],
]
console.log('  ' + 'design'.padEnd(44) + 'runs'.padStart(6) + 'haiku'.padStart(9) + 'deepseek'.padStart(10) + 'TOTAL'.padStart(9))
for (const d of designs) {
  const runs = d[1] * d[2] * d[3]
  const h = runs * C.haiku, s = runs * C.deepseek
  console.log('  ' + d[0].padEnd(44) + String(runs).padStart(6) + ('$' + h.toFixed(0)).padStart(9) + ('$' + s.toFixed(0)).padStart(10) + ('$' + (h + s).toFixed(0)).padStart(9))
}
console.log('')
console.log('  The inversion claim needs TWO things separately:')
console.log('    1. REPRODUCIBILITY - same task, many seeds. Does haiku keep failing?')
console.log('    2. GENERALITY - more tasks at that difficulty. Is it one bad task?')
console.log('  Design 1 answers (1) for about the price of a coffee. Design 3 answers both.')