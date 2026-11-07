// Two token profiles, both MEASURED. Every estimate uses the model's own where we
// have one; for the unseen models both are shown, because GLM-5.3 taught us that a
// sibling's profile can be 1.5-2.3x wrong.
import { PRICES } from './prices.mjs'

const BASE  = { hit: 123249, miss: 14328, out: 4357 }   // GLM-5.3-Flash, 310 runs
const VERB  = { hit: 123249, miss: 14328, out: 7000 }   // GLM-5.3-like verbosity (+61% output)

// Cards from tools/prices.mjs (single copy). Keys are listed explicitly so this tool's
// output keeps exactly the rows it had before the card was centralised.
const M = {
  'deepseek-flash':     PRICES['deepseek-flash'],
  'glm-5.3-flash':      PRICES['glm-5.3-flash'],
  'glm-5.3':            PRICES['glm-5.3'],
  'qwen3.8-flash':      PRICES['qwen3.8-flash'],
  'claude-haiku-4.5':   PRICES['claude-haiku-4.5'],
  'claude-sonnet-5.5':  PRICES['claude-sonnet-5.5'],
  'gpt-6-luna':         PRICES['gpt-6-luna'],
  'gpt-6.1-sol':        PRICES['gpt-6.1-sol'],
}
const runCost = (m, p) => (p.miss / 1e6) * m.miss + (p.hit / 1e6) * m.hit + (p.out / 1e6) * m.out
const noCache = (m, p) => ((p.miss + p.hit) / 1e6) * m.miss + (p.out / 1e6) * m.out

const TASKS = 30, ARMS = 9, SEEDS = 2
const PER_MODEL = TASKS * ARMS * SEEDS
const DONE = { 'deepseek-flash': 310, 'glm-5.3-flash': 310, 'glm-5.3': 75 }

console.log('FULL GRID: ' + TASKS + ' tasks x ' + ARMS + ' arms x ' + SEEDS + ' seeds = ' + PER_MODEL + ' runs per model')
console.log('Arms: dsh:native, dsh:ptc, dsh:native-opt, dsh:ptc-opt, opencode, cline, goose, openhands, sweagent')
console.log('')
console.log('  ' + 'model'.padEnd(20) + 'have'.padStart(6) + 'need'.padStart(6) + '$/run base'.padStart(12) + '$/run verb'.padStart(12) + 'REMAINING'.padStart(12))
let totalBase = 0, totalVerb = 0, totalNoCache = 0
for (const [name, m] of Object.entries(M)) {
  const have = DONE[name] ?? 0, need = PER_MODEL - have
  const cb = runCost(m, BASE), cv = runCost(m, VERB)
  const cn = noCache(m, BASE)
  totalBase += cb * need; totalVerb += cv * need; totalNoCache += cn * need
  console.log('  ' + name.padEnd(20) + String(have).padStart(6) + String(need).padStart(6) +
    ('$' + cb.toFixed(5)).padStart(12) + ('$' + cv.toFixed(5)).padStart(12) + ('$' + (cb * need).toFixed(2)).padStart(12))
}
console.log('')
console.log('  ' + 'TOTAL remaining'.padEnd(20) + ''.padStart(12) + ''.padStart(12) + ''.padStart(12) + ('$' + totalBase.toFixed(2)).padStart(12))
console.log('')
console.log('RANGE across the three uncertainties:')
console.log('  baseline verbosity, caching works      $' + totalBase.toFixed(2))
console.log('  GLM-5.3-like verbosity (+61% output)   $' + totalVerb.toFixed(2))
console.log('  no caching on Anthropic/OpenAI         $' + totalNoCache.toFixed(2))
console.log('')
console.log('Per-model detail for the five NEW models at 540 runs:')
for (const k of ['qwen3.8-flash', 'claude-haiku-4.5', 'claude-sonnet-5.5', 'gpt-6-luna', 'gpt-6.1-sol']) {
  const m = M[k]
  console.log('  ' + k.padEnd(20) + 'base $' + (runCost(m, BASE) * 540).toFixed(2).padStart(8) + '   verb $' + (runCost(m, VERB) * 540).toFixed(2).padStart(8) + '   nocache $' + (noCache(m, BASE) * 540).toFixed(2).padStart(8))
}
