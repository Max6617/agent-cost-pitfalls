import { PRICES } from './prices.mjs'

// Cards from tools/prices.mjs (single copy).
const C = {
  luna: PRICES['gpt-6-luna'],
  sol:  PRICES['gpt-6.1-sol'],
  haiku:PRICES['claude-haiku-4.5'],
}
// Anchor: MEASURED haiku, 0.2945 per run at the real token mix.
// Scale each OpenAI model by its card relative to haiku, per component.
function scale(model) {
  const c = C[model], h = C.haiku
  // Weight by the measured haiku token mix: input dominates.
  const inputRatio = c.miss / h.miss
  const outRatio = c.out / h.out
  // Measured haiku run: roughly 90 percent input cost, 10 percent output.
  return 0.2945 * (0.90 * inputRatio + 0.10 * outRatio)
}
console.log('  cost per run, scaled from the measured haiku figure:')
for (const m of ['haiku', 'luna', 'sol']) console.log('    ' + m.padEnd(7) + '$' + scale(m).toFixed(4))
console.log('')
console.log('  sol is ' + (scale('sol') / scale('luna')).toFixed(0) + 'x luna')
console.log('')
const D = [['full: 10 arms x 31 tasks x 2 seeds', 620], ['1 seed: 10 arms x 31', 310], ['core 2 arms x 31 x 2', 124], ['core 2 arms x 15 x 1', 30]]
console.log('  ' + 'design'.padEnd(36) + 'luna'.padStart(10) + 'sol'.padStart(12))
for (const d of D) {
  console.log('  ' + d[0].padEnd(36) + ('$' + (d[1] * scale('luna')).toFixed(0)).padStart(10) + ('$' + (d[1] * scale('sol')).toFixed(0)).padStart(12))
}