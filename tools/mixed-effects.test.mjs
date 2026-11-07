/**
 * mixed-effects.test.mjs - the properties a random-intercept fit has to have before a paper may
 * quote it, asserted on simulated data with a known answer.
 *
 * The point of the model in this study (notes/plans/JOURNAL-PLAN.md section 3) is that observations are not
 * independent: 31 tasks each contribute several runs, so the residual for one task is shared. A
 * paired t-test and a pooled OLS regression both treat those as independent, which understates the
 * standard error of any BETWEEN-task predictor. The test that matters most is therefore not
 * "does it return a number" but "does it inflate the SE when it must".
 *
 *   node --test tools/mixed-effects.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fitRandomIntercept, olsReference } from './mixed-effects.mjs'

/** Deterministic LCG, the same generator the study's other tools use. */
function rng (seed) {
  let s = seed >>> 0
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
}
function gauss (r) { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }

test('with no group variance it reduces to OLS, coefficient AND standard error', () => {
  const r = rng(12345)
  const y = [], X = [], g = []
  for (let i = 0; i < 240; i++) {
    const x = r() * 2 - 1
    X.push([x]); y.push(1 + 0.5 * x + gauss(r) * 1.0)   // no u_g at all
    g.push('task' + (i % 40))
  }
  const fit = fitRandomIntercept(y, X, g)
  const ols = olsReference(y, X)
  assert.ok(Math.abs(fit.beta[1] - ols.beta[1]) < 0.02, 'slope ' + fit.beta[1] + ' vs OLS ' + ols.beta[1])
  assert.ok(Math.abs(fit.beta[0] - ols.beta[0]) < 0.03, 'intercept drifted')
  assert.ok(fit.sigmaU / fit.sigmaE < 0.15, 'sigmaU should collapse to ~0, got ' + fit.sigmaU)
  assert.ok(fit.se[1] < ols.se[1] * 1.25 && fit.se[1] > ols.se[1] * 0.75, 'SE should be OLS-like: ' + fit.se[1] + ' vs ' + ols.se[1])
})

test('it recovers a known slope and both variance components, averaged over draws', () => {
  // A SINGLE draw is not a test of an estimator: the intercept here has an SE of about 0.13, so
  // one seed fails a +-0.12 tolerance roughly a third of the time on luck alone. Twelve
  // independent draws put the mean within about 0.04 of the truth, and that is what is asserted.
  const ints = [], slps = [], sUs = [], sEs = []
  for (let seed = 1; seed <= 12; seed++) {
    const r = rng(seed * 7919)
    const G = 60, per = 6, sU = 1.0, sE = 0.7
    const y = [], X = [], g = [], ug = []
    for (let k = 0; k < G; k++) ug.push(gauss(r) * sU)
    for (let k = 0; k < G; k++) {
      for (let j = 0; j < per; j++) {
        const x = r() * 2 - 1
        X.push([x]); y.push(2 - 0.8 * x + ug[k] + gauss(r) * sE); g.push('t' + k)
      }
    }
    const fit = fitRandomIntercept(y, X, g)
    assert.ok(fit.converged && !fit.singular)
    ints.push(fit.beta[0]); slps.push(fit.beta[1]); sUs.push(fit.sigmaU); sEs.push(fit.sigmaE)
  }
  const m = (a) => a.reduce((s, v) => s + v, 0) / a.length
  assert.ok(Math.abs(m(ints) - 2) < 0.10, 'mean intercept ' + m(ints).toFixed(3))
  assert.ok(Math.abs(m(slps) + 0.8) < 0.06, 'mean slope ' + m(slps).toFixed(3))
  assert.ok(m(sUs) > 0.8 && m(sUs) < 1.25, 'mean sigmaU ' + m(sUs).toFixed(3))
  assert.ok(m(sEs) > 0.62 && m(sEs) < 0.80, 'mean sigmaE ' + m(sEs).toFixed(3))
})

test('THE PROPERTY THAT MATTERS: the SE of a between-task predictor inflates', () => {
  const r = rng(4242)
  const G = 31, per = 6, sU = 1.2, sE = 0.8
  const y = [], X = [], g = []
  for (let k = 0; k < G; k++) {
    const xg = gauss(r)                      // the predictor varies BETWEEN tasks only
    const ug = gauss(r) * sU
    for (let j = 0; j < per; j++) { X.push([xg]); y.push(0.4 * xg + ug + gauss(r) * sE); g.push('t' + k) }
  }
  const fit = fitRandomIntercept(y, X, g)
  const ols = olsReference(y, X)
  assert.ok(fit.se[1] > ols.se[1] * 1.5,
    'ignoring the task intercept must understate this SE: mixed ' + fit.se[1].toFixed(4) + ' vs OLS ' + ols.se[1].toFixed(4))
})

test('a factor fixed effect is recovered, and slot can be one', () => {
  const r = rng(777)
  const G = 40, per = 10, sU = 0.8, sE = 0.6
  const y = [], X = [], g = []
  const slotEffect = [0, 0.5, -0.4, 1.2, -0.9, 0.3, 0.7, -1.1, 0.2, 0.9]   // slot 0 is the reference
  for (let k = 0; k < G; k++) {
    const ug = gauss(r) * sU
    for (let slot = 0; slot < 10; slot++) {
      // MODE MUST NOT BE A FUNCTION OF SLOT. Setting mode = (slot < 5) makes the mode column an
      // exact linear combination of the nine slot dummies, so the design is singular and NO
      // coefficient is identified - which is what the first version of this test did.
      const mode = r() < 0.5 ? 1 : 0
      const row = [mode]
      for (let s = 1; s < 10; s++) row.push(slot === s ? 1 : 0)   // 9 dummies, slot 0 omitted
      X.push(row)
      y.push(3 + 2 * mode + slotEffect[slot] + ug + gauss(r) * sE)
      g.push('t' + k)
    }
  }
  const fit = fitRandomIntercept(y, X, g)
  assert.ok(Math.abs(fit.beta[1] - 2) < 0.15, 'mode effect ' + fit.beta[1])
  assert.ok(Math.abs(fit.beta[2] - 0.5) < 0.25, 'slot 1 dummy ' + fit.beta[2])
  assert.ok(Math.abs(fit.beta[4] - 1.2) < 0.25, 'slot 3 dummy ' + fit.beta[4])
})

test('unbalanced groups, one-row groups and a constant do not break it', () => {
  const r = rng(31337)
  const y = [], X = [], g = []
  for (let k = 0; k < 25; k++) {
    const n = k === 0 ? 1 : (k % 7) + 1
    const ug = gauss(r)
    for (let j = 0; j < n; j++) { const x = r(); X.push([x]); y.push(5 + x + ug + gauss(r) * 0.5); g.push('t' + k) }
  }
  const fit = fitRandomIntercept(y, X, g)
  assert.ok(fit.converged)
  assert.ok(Number.isFinite(fit.beta[1]) && Math.abs(fit.beta[1] - 1) < 0.5, 'slope ' + fit.beta[1])
  assert.ok(Number.isFinite(fit.se[1]) && fit.se[1] > 0)
})

test('a degenerate design is reported, not guessed', () => {
  // A predictor that is constant: there is no slope to estimate and the fit must say so rather
  // than return a number that a table would print.
  const y = [1, 2, 3, 4, 5, 6], X = [[1], [1], [1], [1], [1], [1]], g = ['a', 'a', 'a', 'b', 'b', 'b']
  const fit = fitRandomIntercept(y, X, g)
  assert.equal(fit.singular, true)
})
