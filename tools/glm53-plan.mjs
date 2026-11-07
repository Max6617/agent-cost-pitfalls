const GLM53 = 0.10942   // measured, per run
const HAVE = 69, PARITY = 620, ONE_SEED = 310
const BAL = 32.00
console.log('  glm-5.3 has ' + HAVE + ' runs. measured cost $' + GLM53.toFixed(5) + '/run.')
console.log('  balance $' + BAL.toFixed(2) + ' buys ' + Math.floor(BAL / GLM53) + ' more runs.')
console.log('')
console.log('  ' + 'target'.padEnd(34) + 'runs'.padStart(7) + 'cost'.padStart(10) + '   status')
for (const t of [
  ['1 seed  (10 arms x 31 tasks)', 310],
  ['2 seeds (full parity)', 620],
]) {
  const need = (t[1] - HAVE) * GLM53
  console.log('  ' + t[0].padEnd(34) + String(t[1]).padStart(7) + ('$' + need.toFixed(0)).padStart(10) + '   ' + (need <= BAL ? 'COVERED' : 'short by $' + (need - BAL).toFixed(0)))
}
const reach = HAVE + Math.floor(BAL / GLM53)
console.log('')
console.log('  at the current balance it reaches ' + reach + ' runs = ' + Math.round(reach / PARITY * 100) + ' percent of parity')
console.log('  which is MORE than one seed (' + ONE_SEED + ') and well short of two.')
console.log('')
console.log('  WHY IT MATTERS MORE THAN THE PRICE SUGGESTS:')
console.log('    - it has the LARGEST PTC effect measured anywhere (31 percent)')
console.log('    - it is the second model tier against GLM-5.3-Flash (F7, F18)')
console.log('    - it is currently the WEAKEST dataset: 14 tasks, 1 seed, 5 arms')