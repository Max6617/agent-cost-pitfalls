/**
 * reconcile.mjs - check this study's provider-side accounting against the provider's own
 * billing totals.
 *
 * WHY. Every dollar figure in this paper comes from the measurement gateway, and the
 * gateway has been wrong four times in one day: a price card taken from a blog, a cost
 * function that omitted the output term, an alias lookup that silently fell back to
 * another provider's rates, and creations counted twice. A reader is entitled to ask how
 * we know the numbers are right. The provider's own console is the answer, and it is
 * independent of everything we built.
 *
 * The console reports a TOTAL per provider per model. We cannot decompose that into seeds
 * or arms, but we do not need to: dividing it by our token counts yields an EFFECTIVE
 * RATE, which is comparable to the published card regardless of how the work was split.
 *
 *   node tools/reconcile.mjs --model claude-haiku-4-5 --console-total 123.45
 *
 * Enter the console figure for one model at a time. The same run with a second model
 * separates the two, which a shared gateway log cannot do on its own.
 */
import { readFileSync, existsSync } from 'node:fs'
import { PRICES } from './prices.mjs'

const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }

// Published cards from tools/prices.mjs (single copy), keyed by the API name each one is
// requested under, with the canonical name as `alias`. write defaults to the miss rate.
const withAlias = (m) => { const c = PRICES[m]; return { miss: c.miss, hit: c.hit, write: c.write ?? c.miss, out: c.out, alias: m } }
const CARDS = {
  'claude-haiku-4-5':  withAlias('claude-haiku-4.5'),
  'claude-sonnet-5-5': withAlias('claude-sonnet-5.5'),
  'deepseek-flash':    withAlias('deepseek-flash'),
  'glm-5.3':           withAlias('glm-5.3'),
  'glm-5.3-flash':     withAlias('glm-5.3-flash'),
  'qwen3.8-flash':     withAlias('qwen3.8-flash'),
  'gpt-6-luna':        withAlias('gpt-6-luna'),
}

const model = opt('--model', null)
const consoleTotal = Number(opt('--console-total', 'NaN'))
const logPath = opt('--log', 'results/anthropic-gateway.jsonl')
if (!model || !CARDS[model]) { console.error('--model must be one of: ' + Object.keys(CARDS).join(', ')); process.exit(2) }
if (!Number.isFinite(consoleTotal)) { console.error('--console-total <amount the provider reports for this model>'); process.exit(2) }
if (!existsSync(logPath)) { console.error('no log at ' + logPath); process.exit(2) }

const card = CARDS[model]
const rows = readFileSync(logPath, 'utf8').split('\n').filter(Boolean)
  .map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
  .filter((r) => r.status === 200 && r.usage && (r.model === model || r.model === card.alias))

let miss = 0, hit = 0, created = 0, out = 0
for (const r of rows) {
  const u = r.usage
  miss += u.cacheMissTokens ?? 0; hit += u.cacheHitTokens ?? 0
  created += u.cacheCreationTokens ?? 0; out += u.outputTokens ?? 0
}
const ours = (miss / 1e6) * card.miss + (created / 1e6) * card.write + (hit / 1e6) * card.hit + (out / 1e6) * card.out

console.log('model                : ' + model)
console.log('requests counted     : ' + rows.length)
console.log('tokens               : miss ' + miss.toLocaleString() + ', hit ' + hit.toLocaleString() + ', created ' + created.toLocaleString() + ', out ' + out.toLocaleString())
console.log('')
console.log('  our figure at the published card : $' + ours.toFixed(2))
console.log('  provider console total           : $' + consoleTotal.toFixed(2))
if (ours > 0) {
  const ratio = consoleTotal / ours
  console.log('  ratio                            : ' + ratio.toFixed(3) + 'x')
  console.log('')
  console.log('  effective per-million-token rate implied by the console:')
  const scale = (n) => '$' + (n * ratio).toFixed(4)
  console.log('    miss ' + scale(card.miss) + '   hit ' + scale(card.hit) + '   write ' + scale(card.write) + '   out ' + scale(card.out))
  console.log('')
  if (ratio > 0.9 && ratio < 1.1) {
    console.log('  AGREEMENT within 10 percent: the instrument matches the provider billing total.')
  } else if (ratio > 1.1) {
    console.log('  The console is HIGHER than we count, by about ' + ((ratio - 1) * 100).toFixed(0) + ' percent.')
    console.log('  Either our token capture is low, or the account carries usage that is not this study.')
  } else {
    console.log('  The console is LOWER than we count: our rates or our token capture are too high.')
  }
}