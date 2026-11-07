/**
 * position-adjust.test.mjs - a position adjustment has to be shown to work on data whose answer is
 * known, because the one this repository shipped did not work and nothing caught it.
 *
 * THE DEFECT THIS EXISTS FOR. results/_scratch/position-standardise.mjs passed BOTH arms' records to
 * the function that was supposed to summarise one arm, so every block's 'standardised' value was the
 * raw difference multiplied by a position-frequency ratio. It was cited for a month and its table was
 * headed for PAPER.md. See notes/defects/DEFECT-position-standardisation-artefact-2026-10-09.md.
 *
 * The first test below is the one that would have caught it: generate data with a KNOWN arm effect
 * and a KNOWN position effect under an assignment that puts one arm in the dear positions, then check
 * that the raw contrast is biased and the adjusted one recovers the truth.
 *
 * Run: node --test tools/position-adjust.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { makeRng } from './rng.mjs'
import { buildPanel, BATCHB_DATASETS } from './cost-panel.mjs'
import { pairedBlocks, positionPairs, adjustedFit, adjustedDifferential, crossValidateScale, toPercent, rawDifferential } from './position-adjust.mjs'

// g(p): position 0 is the CHEAPEST and position 9 the dearest, matching the direction
// notes/defects/DEFECT-position-confound-2026-10-04.md section 2 measures. Spread 1.0x to 1.6x.
const g = (p) => 1 + 0.6 * p / 9

/**
 * 80 blocks. PTC is given a POSITIVE offset from native in every block, so it sits systematically
 * later - by 1, 2 or 3 positions - and never in the cheap position 0. That is the structure that
 * biases the raw contrast; the offset VARIES, which is what makes alpha identifiable at all.
 * True effect: PTC costs 0.85x native.
 */
function simulate ({ armRatio = 0.85, sigma = 0.05, seed = 20261009, positionEffect = true, pureShift = false } = {}) {
  const rnd = makeRng(seed)
  const norm = () => { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }
  const blocks = []
  for (let i = 0; i < 80; i++) {
    // pure shift = EVERY block one position later, unwrapped, which is the unidentifiable design
    const pn = pureShift ? (i % 9) : Math.floor(rnd() * 10)
    const pq = pureShift ? pn + 1 : (pn + 1 + Math.floor(rnd() * 3)) % 10
    const base = 0.01 * (1 + 0.4 * rnd())
    const gp = positionEffect ? g : () => 1
    blocks.push({
      task: 't' + (i >> 1), seed: (i % 2) + 1, pn, pq,
      cn: base * gp(pn) * Math.exp(sigma * norm()),
      cq: base * armRatio * gp(pq) * Math.exp(sigma * norm()),
    })
  }
  return blocks
}

test('KNOWN TRUTH: the raw contrast is biased by the assignment and the adjustment recovers the effect', () => {
  const blocks = simulate()
  const truePct = (0.85 - 1) * 100                       // -15.0%
  const natMean = blocks.reduce((a, b) => a + b.cn, 0) / blocks.length
  const raw = (blocks.reduce((a, b) => a + b.cq, 0) / blocks.length) / natMean * 100 - 100
  const adj = adjustedDifferential(blocks.flatMap(toRow), { scale: 'log', nativeMean: natMean })
  // The raw contrast is materially wrong. The DIRECTION is a property of the assignment (a largely
  // positive offset that wraps at the top is left-skewed in the ratio, so it can bias either way),
  // which is exactly why the claim asserted here is the size of the bias and not its sign.
  assert.ok(Math.abs(raw - truePct) > 2, 'the raw contrast must be visibly biased, got ' + raw.toFixed(2) + '% against a truth of ' + truePct + '%')
  // On the log scale the model is exactly specified, so the adjustment must return the truth
  // however the arms were placed - up to the noise the simulation adds, which at sigma=0.05 over 80
  // blocks has a standard error near 0.8 points. So the assertion is the property that matters and
  // not a knife edge: it must land close, and it must remove most of the bias.
  assert.ok(Math.abs(adj.pct - truePct) < 1.5, 'adjusted must recover ' + truePct + '%, got ' + adj.pct.toFixed(2) + '%')
  assert.ok(Math.abs(adj.pct - truePct) < Math.abs(raw - truePct) / 2,
    'the adjustment must remove most of the bias: residual ' + Math.abs(adj.pct - truePct).toFixed(2) +
    'pp against a raw bias of ' + Math.abs(raw - truePct).toFixed(2) + 'pp')
  assert.ok(adj.ciLoPct < truePct && truePct < adj.ciHiPct, 'and the interval must cover it')
})

test('KNOWN TRUTH, additive position effect: the usd scale is the one that recovers it', () => {
  const rnd = makeRng(7)
  const blocks = []
  for (let i = 0; i < 80; i++) {
    const pn = Math.floor(rnd() * 10)
    const pq = (pn + 1 + Math.floor(rnd() * 3)) % 10
    const base = 0.01 * (1 + 0.4 * rnd())
    blocks.push({ task: 't' + (i >> 1), seed: (i % 2) + 1, pn, pq, base, cn: base + 0.004 * pn, cq: base * 0.8 + 0.004 * pq })
  }
  const natMean = blocks.reduce((a, b) => a + b.cn, 0) / blocks.length
  // The truth, derived rather than guessed: the arm effect is a constant -0.2*base per block and the
  // position effect is additive and exactly in the model's span, so alpha must be the mean of the
  // arm terms. (The naive reading of "0.8x" as -20% of TOTAL cost is wrong - the arm scales base,
  // and base is only part of a bill that also contains the position term.)
  const trueAlpha = blocks.reduce((a, b) => a - 0.2 * b.base, 0) / blocks.length
  const truthPct = trueAlpha / natMean * 100
  const adj = adjustedDifferential(blocks.flatMap(toRow), { scale: 'usd', nativeMean: natMean })
  const rawPct = (blocks.reduce((a, b) => a + b.cq, 0) / blocks.length) / natMean * 100 - 100
  assert.ok(Math.abs(adj.pct - truthPct) < 1.5, 'usd scale must recover ' + truthPct.toFixed(2) + '%, got ' + adj.pct.toFixed(2) + '%')
  assert.ok(Math.abs(rawPct - truthPct) > 2, 'and the raw contrast must be visibly off it, got ' + rawPct.toFixed(2) + '%')
})

test('no position effect: the adjustment moves nothing', () => {
  const blocks = simulate({ positionEffect: false })
  const natMean = blocks.reduce((a, b) => a + b.cn, 0) / blocks.length
  const adj = adjustedDifferential(blocks.flatMap(toRow), { scale: 'log', nativeMean: natMean })
  assert.ok(Math.abs(adj.pct - (-15)) < 1.5, 'with no order effect the estimate must stay at the truth, got ' + adj.pct.toFixed(2) + '%')
})

// THE IDENTIFICATION TEST, and the reason it matters: with a PURE shift the arm effect and a
// constant-per-step position effect are the same parameter, so no data of this shape can separate
// them. The estimator must say so rather than return whichever number the solver happened to reach.
test('a PURE position shift cannot be adjusted - the arm effect and the step effect are one parameter', () => {
  const blocks = simulate({ pureShift: true })
  assert.ok(positionPairs(blocks).size >= 8, 'the pure shift still has many position pairs')
  assert.throws(() => adjustedFit(blocks), /rank deficient/)
})

test('a design that cannot identify a position effect is REFUSED, not guessed', () => {
  const blocks = simulate().map((b) => ({ ...b, pq: 9, pn: 0 }))
  assert.equal(positionPairs(blocks).size, 1)
  assert.throws(() => adjustedFit(blocks), /same \(native, ptc\) position pair/)
})

test('too few blocks to fit anything is refused', () => {
  assert.throws(() => adjustedFit(simulate().slice(0, 2)), /fewer than 3 paired blocks/)
})

test('the log-scale percentage does not depend on the currency unit', () => {
  const blocks = simulate()
  const scaled = blocks.map((b) => ({ ...b, cn: b.cn * 1000, cq: b.cq * 1000 }))
  const natMean = blocks.reduce((a, b) => a + b.cn, 0) / blocks.length
  const a1 = adjustedFit(blocks, { scale: 'log' })
  const a2 = adjustedFit(scaled, { scale: 'log' })
  assert.ok(Math.abs(a1.alpha - a2.alpha) < 1e-12)
  assert.ok(Math.abs(toPercent(a1.alpha, 'log', natMean) - toPercent(a2.alpha, 'log', natMean * 1000)) < 1e-9)
})

test('an unpaired block contributes nothing: this estimator is paired or it is nothing', () => {
  const rows = simulate().flatMap(toRow)
  const half = rows.filter((r) => r.arm === 'dsh:native')
  assert.equal(pairedBlocks(half).length, 0)
  assert.equal(pairedBlocks(rows).length, 80)
})

test('the bootstrap reports how many replicates it could use', () => {
  const blocks = simulate()
  const natMean = blocks.reduce((a, b) => a + b.cn, 0) / blocks.length
  const adj = adjustedDifferential(blocks.flatMap(toRow), { scale: 'log', nativeMean: natMean, iters: 500 })
  assert.equal(adj.iters, 500)
  assert.ok(adj.ciReplicates > 400, 'a well-identified design must keep its replicates, kept ' + adj.ciReplicates)
  assert.ok(adj.ciLoPct < adj.pct && adj.pct < adj.ciHiPct)
})

test('REAL DATA: batchb is identified, the bootstrap is complete, and the signs are the filed ones', () => {
  const { panel } = buildPanel({ datasets: BATCHB_DATASETS.map((d) => d.id) })
  const ds = panel.filter((r) => r.model === 'deepseek-flash')
  const nativeMean = ds.filter((r) => r.arm === 'dsh:native').reduce((a, r) => a + r.costBilled, 0) / ds.filter((r) => r.arm === 'dsh:native').length
  const adj = adjustedDifferential(ds, { scale: 'log', nativeMean })
  assert.ok(adj.positionPairs >= 10, 'the real permutation must identify f, found ' + adj.positionPairs)
  assert.equal(adj.ciReplicates, adj.iters, 'every resample of the real design must be identifiable')
  assert.ok(adj.pct < 0 && adj.ciHiPct < 0, 'DeepSeek stays significantly negative after adjustment')
  const raw = rawDifferential(panel, 'deepseek-flash')
  assert.ok(raw.ciHiPct < 0, 'and the raw contrast does too')
})

// THE DISCRIMINATOR HAS TO BE SHOWN TO DISCRIMINATE. Judging the two scales by their own residuals
// would decide the question by the units; crossValidateScale asks both to predict the same held-out
// log ratio. These two tests feed it data generated under each scale in turn and require it to name
// the right one - otherwise "the data prefer log" is just an assertion with a number attached.
test('the scale check names the LOG scale when the position effect is multiplicative', () => {
  const cv = crossValidateScale(simulate().flatMap(toRow))
  assert.ok(cv.rmseLog < cv.rmseUsd, 'log must win: log ' + cv.rmseLog.toFixed(4) + ' vs usd ' + cv.rmseUsd.toFixed(4))
})

test('the scale check names the USD scale when the position effect is additive in dollars', () => {
  const rnd = makeRng(11)
  const blocks = []
  for (let i = 0; i < 80; i++) {
    const pn = Math.floor(rnd() * 10)
    const pq = (pn + 1 + Math.floor(rnd() * 3)) % 10
    const base = 0.01 * (1 + 0.4 * rnd())
    blocks.push({ task: 't' + (i >> 1), seed: (i % 2) + 1, pn, pq, cn: base + 0.004 * pn, cq: base - 0.002 + 0.004 * pq })
  }
  const cv = crossValidateScale(blocks.flatMap(toRow))
  assert.ok(cv.rmseUsd < cv.rmseLog, 'usd must win: usd ' + cv.rmseUsd.toFixed(4) + ' vs log ' + cv.rmseLog.toFixed(4))
})

/** blocks -> the panel-row shape adjustedDifferential consumes. */
function toRow (b) {
  return [
    { task: b.task, seed: b.seed, arm: 'dsh:native', position: b.pn, costBilled: b.cn },
    { task: b.task, seed: b.seed, arm: 'dsh:ptc', position: b.pq, costBilled: b.cq },
  ]
}