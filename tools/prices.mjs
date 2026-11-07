/**
 * prices.mjs — the study's SINGLE copy of the published rate cards.
 *
 * Everything below the header is copied verbatim from tools/measure-gateway.mjs:147-200,
 * which is the table the gateway itself prices every request with. Keep the two in step:
 * the gateway log's cost.billedUsd and every re-derivation from archived token counts must
 * use the same card.
 *
 * Satellite tools import PRICES/FALLBACK/costOf from here instead of carrying their own
 * copy, so a card can only be wrong in one place. Twelve tools held their own copy of the
 * retracted DeepSeek card (miss 0.14 / hit 0.028 / out 0.28) until 2026-09-30; the
 * correction is recorded in notes/records/FINDINGS.md F20 and PRE-REGISTRATION.md §12.1.
 */

// Published rate cards, USD per million tokens. miss = uncached input.
//
// A missing model falls back to DeepSeek Flash pricing, which UNDERSTATES an
// expensive model badly - GLM-5.3 is 9.3x that on cached input. If a new model is
// added, add its price here in the same change.
export const PRICES = {
  // CORRECTED 2026-09-30. The previous entry (miss 0.14, hit 0.028, out 0.28) came
  // from a third-party blog and was wrong in every cell: cache-hit 9.3x too high and
  // output 2.1x too low. The repo had the provider's own page captured all along at
  // _ev/deepseek-pricing.html (2026-09-28):
  //   1M INPUT (CACHE HIT)  off-peak $0.003   peak $0.006
  //   1M INPUT (CACHE MISS) off-peak $0.15    peak $0.30
  //   1M OUTPUT             off-peak $0.60    peak $1.20
  // and "Use deepseek-flash as the model name ... billed at the Flash price", so these
  // are exactly the rates that applied. OFF-PEAK column; peak is 2x.
  //
  // The correction MATTERS beyond the absolute figures: it makes output:input 4.00
  // rather than 2.00, so DeepSeek has the HIGHEST output ratio of any provider in the
  // study rather than the lowest, and the cache discount is 50x rather than 5x.
  'deepseek-flash': { miss: 0.15, hit: 0.003, out: 0.60 },
  'deepseek-pro':   { miss: 1.74, hit: 0.145, out: 3.48 },
  // Z.AI GLM, from docs.z.ai/guides/overview/pricing
  'glm-5.3-flash':  { miss: 0.15, hit: 0.03, out: 0.50 },
  'glm-5.3':        { miss: 1.40, hit: 0.26, out: 4.40 },
  'glm-5.2':        { miss: 1.40, hit: 0.26, out: 4.40 },
  // Alibaba Qwen 3.8 generation - these supersede qwen3-coder-next, which is NOT what
  // will be run. Together with DeepSeek and GLM they form a 2D design rather than one
  // axis, which is stronger than we had:
  //
  //   model            output:input   cache discount
  //   deepseek-flash        4.00         50.0x   (CORRECTED - was listed as 2.00 / 5.0x)
  //   qwen3.8-max           3.00          8.0x
  //   qwen3.8-flash         3.13          9.4x
  //   glm-5.3-flash         3.33          5.0x
  //
  // The useful pair is qwen3.8-flash against glm-5.3-flash: nearly the SAME price
  // ratio (3.13 against 3.33) but very different cache discounts (9.4x against 5x).
  // That holds the ratio roughly constant while varying the cache, which is the
  // controlled test of whether cache discipline scales with the discount (F8) - and
  // it has not shown at 5x on either provider so far.
  'qwen3.8-flash':     { miss: 0.15, hit: 0.016, out: 0.47 },
  'qwen3.8-max':       { miss: 2.00, hit: 0.25,  out: 6.00 },
  'qwen3.8-2.4t-a95b': { miss: 2.00, hit: 0.25,  out: 6.00 },

  // ---- ratio 5.0 providers. Every frontier model from both vendors sits at exactly
  // 5.0 output:input, so these supply the decisive high-ratio point in the F3 curve.
  // NOTE the write rate: both vendors charge MORE to write a cache entry than to send
  // the tokens uncached, the opposite of DeepSeek and GLM.
  'claude-haiku-4.5':  { miss: 1.00, hit: 0.10, write: 1.25,  out: 5.00 },
  'claude-sonnet-5.5': { miss: 2.00, hit: 0.20, write: 2.50,  out: 10.00 },
  'gpt-6-luna':        { miss: 0.10, hit: 0.01, write: 0.125, out: 0.50 },
  'gpt-6.1-sol':       { miss: 2.00, hit: 0.10, write: 2.50,  out: 10.00 },
}
export const FALLBACK = { miss: 0.15, hit: 0.003, out: 0.60 }   // corrected, see the deepseek-flash entry

/**
 * The RETRACTED DeepSeek card (miss 0.14 / hit 0.028 / out 0.28), taken from a third-party blog.
 * It is wrong in every cell. It lives here ONLY so a before/after comparison can be shown
 * (tools/recompute-prices.mjs); never price anything with it.
 */
export const RETRACTED = { 'deepseek-flash': { miss: 0.14, hit: 0.028, out: 0.28 } }

/**
 * Model names the GATEWAY writes that the table does not use.
 *
 * The gateway logs the upstream API name (`claude-haiku-4-5`) while the table holds the
 * canonical dotted name (`claude-haiku-4.5`). Pricing that mismatch through a silent
 * `?? FALLBACK` undercounted a whole pilot matrix by 6.79x. Aliases are declared, never guessed.
 */
const ALIASES = {
  'claude-haiku-4-5': 'claude-haiku-4.5',
  'claude-sonnet-5-5': 'claude-sonnet-5.5',
}

/**
 * The card for a model: null when there is none, or a THROW when the caller says it is required.
 *
 * `required: true` exists because a null card is one `??` away from being priced at another
 * provider's rates - which is exactly how an Anthropic pilot came to be valued on the DeepSeek
 * card, 6.79x low. An unpriced model is an error, not a default.
 */
export function cardFor(model, { required = false } = {}) {
  const c = resolveCard(model)
  if (c) return c
  if (!required) return null
  throw new Error('no price card for "' + model + '". Pricing a model on another model\'s rates ' +
    'once undercounted an Anthropic matrix 6.79x, so an unpriced model is an error here: add it to ' +
    'PRICES, or to ALIASES, in tools/prices.mjs.')
}

/** Resolve a logged model name to its card, or return null. Never a silent fallback. */
function resolveCard(model) {
  if (PRICES[model]) return PRICES[model]
  if (ALIASES[model] && PRICES[ALIASES[model]]) return PRICES[ALIASES[model]]
  // A dated snapshot (claude-haiku-4-5-20251001) is its base model.
  const base = String(model).replace(/-\d{8}$/, '')
  if (base !== model) {
    if (PRICES[base]) return PRICES[base]
    if (ALIASES[base] && PRICES[ALIASES[base]]) return PRICES[ALIASES[base]]
  }
  return null
}

/**
 * The PRE-REGISTERED cost function (PRE-REGISTRATION.md 53-56):
 *
 *   cost_billed = fresh*miss + created*(write ?? miss) + hit*hit + output*out
 *   fresh       = max(0, cacheMissTokens - cacheCreationTokens)
 *
 * @param {string} model  canonical model name, as in the gateway log
 * @param {object} usage  { cacheMissTokens, cacheCreationTokens, cacheHitTokens, outputTokens }
 * @returns {number} USD
 */
export function costOf(model, usage = {}, { allowFallback = false } = {}) {
  const c = cardFor(model, { required: !allowFallback }) ?? FALLBACK
  const miss = usage.cacheMissTokens ?? 0
  const created = usage.cacheCreationTokens ?? 0
  const hit = usage.cacheHitTokens ?? 0
  const out = usage.outputTokens ?? 0
  // fresh = miss, NOT max(0, miss - created).
      //
      // The double subtraction survived in five places and understated the panel by ~$0.10.
      // It is wrong because the token buckets are DISJOINT: Anthropic reports input_tokens,
      // cache_creation_input_tokens and cache_read_input_tokens as three separate counts, and
      // DeepSeek/GLM/OpenAI partition prompt_tokens into hit and miss with creation billed at
      // the miss rate (so cacheCreationTokens is simply 0 there). Subtracting creation from
      // miss and then billing creation again at the write rate counts those tokens down twice
      // and up once - which is why the error is small and why it survived three reviews.
      const fresh = miss
  return (fresh / 1e6) * c.miss + (created / 1e6) * (c.write ?? c.miss) + (hit / 1e6) * c.hit + (out / 1e6) * c.out
}

/**
 * True when the provider did not report a cache split, so those input tokens cannot be priced
 * exactly. `null` here is the gateway's honest record of an absence - an explicit 0 is a REPORTED
 * zero and is not unknown. See notes/defects/DEFECT-anthropic-external-costs.md.
 */
export function cacheSplitUnknown (usage) {
  if (!usage) return false
  return usage.cacheHitTokens == null && usage.cacheMissTokens == null && (usage.inputTokens ?? 0) > 0
}

/**
 * Bracket a usage block instead of inventing a number for it.
 *   low   every unreported input token priced as a cache read (the cheapest honest reading)
 *   high  every unreported input token priced as a miss (the dearest honest reading)
 * When the split is known both ends are equal and `exact` is true. When it is not, NEITHER end is a
 * measurement: the archive does not contain the split, and a caller that prints one of them as a
 * figure is printing a default.
 */
export function costBounds (model, usage = {}) {
  if (!cacheSplitUnknown(usage)) {
    const c = costOf(model, usage)
    return { low: c, high: c, exact: true }
  }
  const low = costOf(model, { ...usage, cacheHitTokens: usage.inputTokens, cacheMissTokens: 0 })
  const high = costOf(model, { ...usage, cacheHitTokens: 0, cacheMissTokens: usage.inputTokens })
  return { low, high, exact: false }
}
