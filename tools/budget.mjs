import { PRICES } from './prices.mjs'

const HIT = 0.123249, MISS = 0.014328, OUT = 0.004357
const price = (c) => MISS * c.miss + HIT * c.hit + OUT * c.out
const CACHE = {
  'qwen3.8-flash':     price(PRICES['qwen3.8-flash']),
  'claude-haiku-4.5':  price(PRICES['claude-haiku-4.5']),
  'claude-sonnet-5.5': price(PRICES['claude-sonnet-5.5']),
  'gpt-6-luna':        price(PRICES['gpt-6-luna']),
  'gpt-6.1-sol':       price(PRICES['gpt-6.1-sol']),
  'glm-5.3':           price(PRICES['glm-5.3']),
}
const NOCACHE = {
  'claude-haiku-4.5':  MISS * PRICES['claude-haiku-4.5'].miss + OUT * PRICES['claude-haiku-4.5'].out,
  'claude-sonnet-5.5': MISS * PRICES['claude-sonnet-5.5'].miss + OUT * PRICES['claude-sonnet-5.5'].out,
  'gpt-6-luna':        MISS * PRICES['gpt-6-luna'].miss + OUT * PRICES['gpt-6-luna'].out,
  'gpt-6.1-sol':       MISS * PRICES['gpt-6.1-sol'].miss + OUT * PRICES['gpt-6.1-sol'].out,
}
console.log('per-run cost, cached vs worst-case uncached')
for (const k of Object.keys(CACHE)) {
  const c = CACHE[k], n = NOCACHE[k]
  console.log('  ' + k.padEnd(20) + '$' + c.toFixed(5) + (n ? '   / $' + n.toFixed(5) : ''))
}
console.log('')
const NEW = ['qwen3.8-flash', 'claude-haiku-4.5', 'claude-sonnet-5.5', 'gpt-6-luna', 'gpt-6.1-sol']
for (const [label, runs] of [['5 arms, 30 tasks, 1 seed (150/model)', 150], ['5 arms, 30 tasks, 2 seeds (300/model)', 300], ['9 arms, 30 tasks, 1 seed (270/model)', 270]]) {
  let cached = 0, nocache = 0
  for (const k of NEW) { cached += CACHE[k] * runs; nocache += (NOCACHE[k] ?? CACHE[k]) * runs }
  console.log(label)
  console.log('  cached     $' + cached.toFixed(2))
  console.log('  no caching $' + nocache.toFixed(2))
  console.log('')
}
console.log('DECISIVE TEST, one model per provider at ratio 5.0 (150 runs each):')
console.log('  claude-haiku-4.5   $' + (CACHE['claude-haiku-4.5'] * 150).toFixed(2))
console.log('  gpt-6-luna         $' + (CACHE['gpt-6-luna'] * 150).toFixed(2))
console.log('  subtotal           $' + ((CACHE['claude-haiku-4.5'] + CACHE['gpt-6-luna']) * 150).toFixed(2))
console.log('')
console.log('CAPABILITY TIER, sonnet + sol (150 runs each): $' + ((CACHE['claude-sonnet-5.5'] + CACHE['gpt-6.1-sol']) * 150).toFixed(2))
console.log('')
console.log('GLM-5.3 completion, 75 -> 150 runs: $' + (CACHE['glm-5.3'] * 75).toFixed(2))
