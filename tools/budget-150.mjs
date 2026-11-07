const SCALE = 1.611   // the console-proved under-report
const PER = { haiku: 0.3661 * SCALE, sonnet: 0.1514 * SCALE }
const HAVE = { haiku: 222, sonnet: 412 }
const TOTAL = 620
let need = 0
console.log('  ' + 'model'.padEnd(9) + 'done'.padStart(7) + 'left'.padStart(7) + '$/run'.padStart(10) + 'cost left'.padStart(12))
for (const m of ['haiku', 'sonnet']) {
  const left = TOTAL - HAVE[m]
  const c = left * PER[m]
  need += c
  console.log('  ' + m.padEnd(9) + (HAVE[m] + '/620').padStart(7) + String(left).padStart(7) + ('$' + PER[m].toFixed(4)).padStart(10) + ('$' + c.toFixed(0)).padStart(12))
}
const avail = 52.54 + 150
console.log('')
console.log('  TO FINISH BOTH AT FULL PARITY : $' + need.toFixed(0))
console.log('  AVAILABLE after the 150       : $' + avail.toFixed(2))
console.log('  shortfall                     : $' + Math.max(0, need - avail).toFixed(0))
console.log('')
console.log('  what $' + avail.toFixed(0) + ' actually buys:')
console.log('    sonnet to completion : $' + ((TOTAL - HAVE.sonnet) * PER.sonnet).toFixed(0) + '  -> FINISHED')
const afterSonnet = avail - (TOTAL - HAVE.sonnet) * PER.sonnet
const haikuRuns = Math.floor(afterSonnet / PER.haiku)
console.log('    haiku                : ' + haikuRuns + ' more runs -> ' + (HAVE.haiku + haikuRuns) + '/620  (' + Math.round((HAVE.haiku + haikuRuns) / TOTAL * 100) + ' percent)')