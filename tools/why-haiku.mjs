// Anthropic's own export, totals per model.
const A = {
  haiku:  { noCache: 134291046, write: 26890, read: 9330830, out: 2550728, cost: 148.01, completed: 123, failed: 460 },
  sonnet: { noCache: 29746558,  write: 8992,  read: 4187774, out: 985619,  cost: 70.21,  completed: 237, failed: 14 },
}
console.log('=== VOLUME, which is the whole story ===')
console.log('  ' + 'model'.padEnd(9) + 'input'.padStart(14) + 'output'.padStart(11) + 'cost'.padStart(10))
for (const [m, a] of Object.entries(A)) {
  console.log('  ' + m.padEnd(9) + (a.noCache + a.write + a.read).toLocaleString().padStart(14) + a.out.toLocaleString().padStart(11) + ('$' + a.cost.toFixed(2)).padStart(10))
}
console.log('')
console.log('  haiku processed ' + ((A.haiku.noCache + A.haiku.read) / (A.sonnet.noCache + A.sonnet.read)).toFixed(1) + 'x more input tokens than sonnet')
console.log('')
console.log('=== PER ATTEMPT, which is what rates govern ===')
for (const [m, a] of Object.entries(A)) {
  const attempts = a.completed + a.failed
  console.log('  ' + m.padEnd(9) + attempts + ' attempts   $' + (a.cost / attempts).toFixed(4) + ' each')
}
console.log('')
console.log('=== WHERE THE EXTRA ATTEMPTS CAME FROM ===')
console.log('  haiku  : ' + A.haiku.failed + ' of ' + (A.haiku.completed + A.haiku.failed) + ' attempts FAILED on credit (' + (A.haiku.failed / (A.haiku.completed + A.haiku.failed) * 100).toFixed(0) + ' percent)')
console.log('  sonnet : ' + A.sonnet.failed + ' of ' + (A.sonnet.completed + A.sonnet.failed) + ' attempts failed (' + (A.sonnet.failed / (A.sonnet.completed + A.sonnet.failed) * 100).toFixed(0) + ' percent)')
console.log('')
const haikuWasted = A.haiku.cost * A.haiku.failed / (A.haiku.completed + A.haiku.failed)
console.log('  credit-failed attempts cost haiku roughly $' + haikuWasted.toFixed(0) + ' in billable requests made before dying')