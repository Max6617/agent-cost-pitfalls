// Measured per-run, scaled by the 1.61x the console proved we under-report.
const SCALE = 1.611
const PER = { haiku: 0.3661 * SCALE, sonnet: 0.1514 * SCALE }
const TASKS = 31

function cost(arms, seeds) {
  const runs = arms * TASKS * seeds
  return { runs, haiku: runs * PER.haiku, sonnet: runs * PER.sonnet }
}
const designs = [
  ['10 arms x 2 seeds  (current plan)', 10, 2],
  ['8 arms x 2 seeds   (drop -opt)', 8, 2],
  ['10 arms x 1 seed   (drop seed 2)', 10, 1],
  ['8 arms x 1 seed    (drop both)', 8, 1],
]
console.log('  ' + 'design'.padEnd(36) + 'runs'.padStart(6) + 'haiku'.padStart(10) + 'sonnet'.padStart(10) + 'TOTAL'.padStart(10))
for (const d of designs) {
  const c = cost(d[1], d[2])
  console.log('  ' + d[0].padEnd(36) + String(c.runs).padStart(6) + ('$' + c.haiku.toFixed(0)).padStart(10) + ('$' + c.sonnet.toFixed(0)).padStart(10) + ('$' + (c.haiku + c.sonnet).toFixed(0)).padStart(10))
}
const full = cost(10, 2), lean = cost(8, 1)
console.log('')
console.log('  the two changes together save $' + ((full.haiku + full.sonnet) - (lean.haiku + lean.sonnet)).toFixed(0))
console.log('')
console.log('  ALREADY SPENT on the -opt arms, at 2 of 10 arms of $308.16:')
console.log('    $' + (308.16 * 0.2).toFixed(0))
console.log('  ALREADY SPENT on a second seed, at half of $308.16:')
console.log('    $' + (308.16 * 0.5).toFixed(0))