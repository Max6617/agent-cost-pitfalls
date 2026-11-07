// Per-model measured or estimated cost per run. Measured where the dataset exists.
const P = {
  'deepseek-flash':    { c: 0.00511, m: 1 },
  'glm-5.3-flash':     { c: 0.00803, m: 1 },
  'glm-5.3':           { c: 0.10124, m: 1 },
  'qwen3.8-flash':     { c: 0.00617, m: 1 },
  'claude-haiku-4.5':  { c: 0.04844, m: 1 },
  'claude-sonnet-5.5': { c: 0.09688, m: 1 },
  'gpt-6-luna':        { c: 0.00484, m: 1 },
  'gpt-6.1-sol':       { c: 0.08455, m: 1 },
}
// Hard tasks are longer: the batch-1 profile underestimates them. Assume 1.8x per run,
// flagged as an assumption rather than measured.
const HARD = 1.8
const f = (x) => '$' + x.toFixed(2)

console.log('=== PHASE 2 REQUIREMENT PER PLATFORM ===')
console.log('')
// z.ai
const g53 = { rerun: 6 * P['glm-5.3'].c, complete: 252 * P['glm-5.3'].c }
const gfl = { terse: 124 * P['glm-5.3-flash'].c }
const zai = g53.rerun + g53.complete + gfl.terse
console.log('Z.AI (GLM)')
console.log('  GLM-5.3  re-run the 6 credit-failed runs    ' + f(g53.rerun))
console.log('  GLM-5.3  reach 31 tasks x 6 arms x 2 seeds  ' + f(g53.complete) + '   (252 runs)')
console.log('  GLM-Flash  the 2 terseness arms             ' + f(gfl.terse) + '   (124 runs)')
console.log('  subtotal ' + f(zai) + '   +30% buffer -> ' + f(zai * 1.3))
console.log('')
// Alibaba
const qw = 372 * P['qwen3.8-flash'].c
console.log('ALIBABA (Qwen)')
console.log('  qwen3.8-flash  31 x 6 x 2                  ' + f(qw) + '   (372 runs)')
console.log('  subtotal ' + f(qw) + '  -> load ' + f(Math.max(10, qw * 3)) + ' (minimum load is small; round up)')
console.log('')
// Anthropic
const hk = 372 * P['claude-haiku-4.5'].c, sn = 372 * P['claude-sonnet-5.5'].c
console.log('ANTHROPIC')
console.log('  claude-haiku-4.5  372 runs, CACHED          ' + f(hk))
console.log('  claude-sonnet-5.5 372 runs, CACHED          ' + f(sn))
console.log('  both, cached                                ' + f(hk + sn))
console.log('  BOTH, NO CACHING (3.4x)                     ' + f((hk + sn) * 3.4) + '   <- the risk')
console.log('')
// OpenAI
const lu = 372 * P['gpt-6-luna'].c, so = 372 * P['gpt-6.1-sol'].c
console.log('OPENAI')
console.log('  gpt-6-luna  372 runs, CACHED                ' + f(lu))
console.log('  gpt-6.1-sol 372 runs, CACHED                ' + f(so))
console.log('  both, cached                                ' + f(lu + so))
console.log('  BOTH, NO CACHING                            ' + f((lu + so) * 3.4))
console.log('')
console.log('=== HARDER TASKS (24 tasks x 6 arms x 2 seeds = 288 runs/model) ===')
console.log('  priced at 1.8x the batch-1 per-run cost, an ASSUMPTION not a measurement:')
for (const k of ['deepseek-flash', 'glm-5.3-flash', 'claude-haiku-4.5', 'gpt-6-luna', 'glm-5.3']) {
  console.log('    ' + k.padEnd(20) + f(288 * P[k].c * HARD))
}
console.log('')
console.log('=== RECOMMENDED LOADS ===')
const rec = [
  ['z.ai (GLM)', zai * 1.3, 'GLM-5.3 completion plus both terseness runs'],
  ['Alibaba (Qwen)', 10, 'Qwen suite is \$2.29; the rest is headroom'],
  ['Anthropic', 25, 'Haiku CACHED with buffer. Top up to \$70 only if the pilot shows caching works'],
  ['OpenAI', 10, 'luna is \$1.80. sol waits until the pi-ai adapter is verified'],
]
let t = 0
for (const [p, a, why] of rec) { console.log('  ' + p.padEnd(18) + f(a).padStart(8) + '   ' + why); t += a }
console.log('  ' + ''.padEnd(18) + f(t).padStart(8) + '   TOTAL TO LOAD NOW')
console.log('')
console.log('  DeepSeek: already covered. The whole Phase 2 DeepSeek need is ' + f(434 * P['deepseek-flash'].c) + '.')
