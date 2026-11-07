/**
 * prices.test.mjs - the price lookup must never fall back SILENTLY.
 *
 * This is not hypothetical. On 2026-10-03 an Anthropic pilot matrix was collected and the
 * pipeline's own spend meter reported **$5.1523** for it. The token counts in that matrix's
 * gateway log are worth **$34.9576** on the Anthropic card - a 6.79x undercount - because the
 * gateway writes the model as the API name \`claude-haiku-4-5\` (hyphens) while the table holds
 * \`claude-haiku-4.5\` (dots), so \`PRICES[model] ?? FALLBACK\` quietly priced every token on the
 * DeepSeek card.
 *
 * A spend ceiling is only as tight as the number it measures. With a 6.79x undercount a $600
 * ceiling permits about $4,076 of real billing - which on a $900 balance is the F38 failure
 * mode waiting to happen: the matrix runs out of credit part-way and its rejected runs read as
 * model failures.
 *
 * The repo has already learned this lesson once, in different words: "'empty' is now something
 * a caller SAYS, never something it fails to say" (the credit-alert fix). Same rule here.
 *
 * Run: node --test tools/prices.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { costOf, PRICES, FALLBACK } from './prices.mjs'

const USAGE = { cacheMissTokens: 1000000, cacheCreationTokens: 0, cacheHitTokens: 1000000, outputTokens: 100000 }
// Haiku card: 1.00 miss, 0.10 hit, 5.00 out -> 1.00 + 0.10 + 0.50
const HAIKU = 1.6

test('the model string the gateway actually writes resolves to the Anthropic card', () => {
  assert.equal(costOf('claude-haiku-4-5', USAGE), HAIKU)
})

test('the canonical dotted name still resolves', () => {
  assert.equal(costOf('claude-haiku-4.5', USAGE), HAIKU)
})

test('a dated snapshot resolves to its base model', () => {
  assert.equal(costOf('claude-haiku-4-5-20251001', USAGE), HAIKU)
})

test('an unknown model is NOT silently priced at the fallback', () => {
  assert.throws(() => costOf('gpt-9-imaginary', USAGE), /price card/i)
})

test('the fallback is available, but only when a caller asks for it', () => {
  assert.equal(costOf('gpt-9-imaginary', USAGE, { allowFallback: true }),
    (1000000 / 1e6) * FALLBACK.miss + (1000000 / 1e6) * FALLBACK.hit + (100000 / 1e6) * FALLBACK.out)
})

test('a cheap model is unaffected', () => {
  const ds = PRICES['deepseek-flash']
  assert.equal(costOf('deepseek-flash', USAGE),
    (1000000 / 1e6) * ds.miss + (1000000 / 1e6) * ds.hit + (100000 / 1e6) * ds.out)
})

test("STRUCTURAL: no tool silently prices a model on another model's card", () => {
  // THE PATTERN THAT COST A MATRIX. tools/prices.mjs used to answer an unknown model with
  // FALLBACK, and the gateway logs the API name (claude-haiku-4-5) while the table holds the
  // canonical one (claude-haiku-4.5) - so an entire Anthropic pilot was priced on the DeepSeek
  // card: $5.15 reported against $34.96 of real tokens, 6.79x low. A ceiling is only as tight as
  // the number it measures.
  //
  // Five tools still carried their own copy of that fallback. An unknown model must be an ERROR or
  // an explicit, loud refusal - never another provider's rates.
  const dir = new URL('./', import.meta.url)
  const codeLines = (text) => text.split(String.fromCharCode(10)).filter((l) => {
    const t = l.trim()
    return !(t.startsWith('*') || t.startsWith('//') || t.startsWith('/*'))
  })
  const offenders = []
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.mjs') && !n.endsWith('.test.mjs'))) {
    for (const line of codeLines(readFileSync(new URL(f, dir), 'utf8'))) {
      // The defect shape is a fallback to a NAMED other model: PRICES[model] ?? PRICES['deepseek-flash'].
      // A variable lookup (measure-gateway resolves an ALIAS to the SAME model and refuses loudly
      // when unpriced) is a different thing, guarded at its own call site.
      if (/\?\?\s*PRICES\[\s*['"]/.test(line)) offenders.push(f + ': ' + line.trim().slice(0, 70))
    }
  }
  assert.deepEqual(offenders, [], "these price an unknown model on another model's rates: " + offenders.join(' | '))
})
