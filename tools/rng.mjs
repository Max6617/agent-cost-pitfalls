/**
 * rng.mjs - ONE random number generator, and it is not an LCG evaluated in doubles.
 *
 * WHY THIS EXISTS. Every confidence interval this study published was drawn with:
 *
 *     seed = (seed * 1103515245 + 12345) & 0x7fffffff
 *
 * In JavaScript numbers that multiplication exceeds 2^53 on the first step for most seeds, so the
 * low bits - the only bits an LCG's randomness lives in - are rounded away before `&` ever runs.
 * A hostile review measured the consequences: 100,000 of 100,000 states diverge from the exact
 * BigInt stream, the corrupted stream falls into a cycle of length 10,466, it yields ~15,820
 * distinct values per million draws, and it fails a chi-squared uniformity test at z > 2,000.
 *
 * It changed a published verdict. FINDINGS F29 claimed the placebo's interval excluded zero
 * ([0.1%, 16.6%]); with a sound stream the same data gives about [-0.33%, +16.45%], which includes
 * zero. The point estimates were always right - only the interval was wrong.
 *
 * The same generator also shuffled arm order in tools/run-experiment.mjs, which is worse: it is not
 * a reporting defect but an experimental one, and it is inherited by every matrix the runner
 * launched.
 *
 * mulberry32: 32-bit state, all arithmetic through Math.imul (which is exact 32-bit), period 2^32,
 * passes gjrand/smallcrush. Not cryptographic, and does not need to be.
 */
export function makeRng(seed = 0x9e3779b9) {
  let a = (seed >>> 0) || 1
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A fresh, independent stream. Every consumer gets its own, so no result depends on draw order. */
export function independentRng(label = '') {
  let h = 0x811c9dc5
  const s = String(label) + '|' + (process.hrtime.bigint ? process.hrtime.bigint().toString() : Date.now())
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  return makeRng(h)
}

/** Fisher-Yates with an injected stream. Replaces the broken shuffle in run-experiment.mjs. */
export function shuffleWith(arr, rnd) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
