/**
 * figures.test.mjs - the figures must be reproducible, sourced, and fragment-only.
 *
 * Run: node --test tools/figures.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { generate, loadSources, figure1, figure2, figure3, figure4, floorFromAA } from './figures.mjs'
import { MODELS } from './cost-panel.mjs'
// This repo allows destructive fs calls in tools/safe-fs.mjs only; safeClean accepts a temp dir
// whose name starts with the workdir prefix, which is why the scratch roots below are named this way.
import { safeClean } from './safe-fs.mjs'

const FILES = ['fig1-penalty-per-model.tex', 'fig2-replication.tex', 'fig3-tie-fraction.tex', 'fig4-floor-resolution.tex']
const scratchRoot = () => mkdtempSync(join(tmpdir(), 'dsh-exp-figures-'))
function generateInto (root) {
  // Sources stay in the repository; only the output moves.
  return generate({ root: process.cwd(), outDir: join(root, 'figures') })
}

test('two generations are byte-identical', () => {
  const a = scratchRoot(), b = scratchRoot()
  try {
    generateInto(a); generateInto(b)
    for (const f of FILES) {
      assert.equal(readFileSync(join(a, 'figures', f), 'utf8'), readFileSync(join(b, 'figures', f), 'utf8'), f + ' must be deterministic')
    }
  } finally { safeClean(a); safeClean(b) }
})

test('every figure is a fragment: no preamble, no document environment', () => {
  const root = scratchRoot()
  try {
    generateInto(root)
    for (const f of FILES) {
      const tex = readFileSync(join(root, 'figures', f), 'utf8')
      assert.ok(!tex.includes('\\documentclass'), f + ' must not carry a preamble')
      assert.ok(!tex.includes('\\begin{document}'), f + ' must not open a document')
      assert.equal((tex.match(/\\begin\{tikzpicture\}/g) || []).length, 1, f + ' has one tikzpicture')
      assert.equal((tex.match(/\\end\{tikzpicture\}/g) || []).length, 1, f + ' closes it')
    }
  } finally { safeClean(root) }
})

test('load-bearing numbers appear verbatim, read from the filed JSONs', () => {
  const src = loadSources('.')
  const f1 = figure1(src).content
  const f2 = figure2(src).content
  const f3 = figure3(src).content
  const one = (v) => Number(v).toFixed(1)
  const lunaB1 = src.batch1.models.find((m) => m.model === 'gpt-6-luna').adjustedLog
  const lunaTB = src.batchb.models.find((m) => m.model === 'gpt-6-luna').adjustedLog
  for (const v of [lunaB1.ciLoPct, lunaB1.ciHiPct, lunaB1.pct]) assert.ok(f1.includes(one(v)), 'fig1 must print luna ' + v)
  for (const v of [lunaTB.ciLoPct, lunaTB.ciHiPct]) assert.ok(f2.includes(one(v)), 'fig2 must print luna tasks-b ' + v)
  for (const suite of ['batch1', 'batchb']) for (const kind of ['raw', 'adjusted']) {
    const t = src.ranking.suites[suite][kind].ties
    assert.ok(f3.includes(t.ties + '/' + t.pairs), 'fig3 must print ' + suite + ' ' + kind + ' ' + t.ties + '/' + t.pairs)
  }
  const b1 = new Map(src.batch1.models.map((m) => [m.model, m.adjustedLog]))
  const tb = new Map(src.batchb.models.map((m) => [m.model, m.adjustedLog]))
  for (const m of ['gpt-6-luna', 'deepseek-flash']) {
    const daylight = Math.max(b1.get(m).ciLoPct - tb.get(m).ciHiPct, tb.get(m).ciLoPct - b1.get(m).ciHiPct)
    assert.ok(daylight > 0, m + ' must be disjoint in the source')
    assert.ok(f2.includes('disjoint by ' + one(daylight) + 'pp'), 'fig2 must annotate ' + m)
  }
  const glmGap = Math.abs(b1.get('glm-5.3-flash').pct - tb.get('glm-5.3-flash').pct)
  assert.ok(f2.includes('agree to ' + one(glmGap) + 'pp'), 'fig2 must print GLM agreement')
  // fig4: the floor comes from the A/A JSON, the markers from the position-adjust JSON, and the
  // count in the corner is computed from both.
  const f4 = figure4(src).content
  const floor = floorFromAA(src.aa)
  assert.ok(f4.includes(one(floor.halfWidthPct)), 'fig4 must print the measured floor ' + floor.halfWidthPct)
  const outer = src.aaInterleaved.aa.label.halfWidthPct
  assert.ok(f4.includes(one(outer)), 'fig4 must print the interleaved A/A floor ' + outer)
  assert.ok(outer > floor.halfWidthPct, 'the interleaved floor is the wider one; if that changes, the caption must too')
  for (const m of src.batch1.models) {
    assert.ok(f4.includes(one(m.adjustedLog.pct)), 'fig4 must print ' + m.model + ' adjusted ' + m.adjustedLog.pct)
    assert.ok(f4.includes(one(m.adjustedLog.ciLoPct)), 'fig4 must print ' + m.model + ' ciLo')
    assert.ok(f4.includes(one(m.adjustedLog.ciHiPct)), 'fig4 must print ' + m.model + ' ciHi')
  }
  const glmAdj = src.batch1.models.find((m) => m.model === 'glm-5.3-flash').adjustedLog
  const sonnetRaw = src.batch1.models.find((m) => m.model === 'claude-sonnet-5.5').raw
  assert.ok(Math.abs(glmAdj.pct) <= floor.halfWidthPct, 'the ringed GLM adjusted effect must be inside the floor')
  // Sonnet's raw estimate is 9.51 against a 9.48 half-width: it sits ON the floor's edge, not inside
  // it, so the figure rings it and the caption must say "at the floor's edge" rather than "inside".
  assert.ok(Math.abs(Math.abs(sonnetRaw.pct) - floor.halfWidthPct) < 0.1, 'the ringed Sonnet raw effect must sit at the floor edge')
  const sonnetAdj = src.batch1.models.find((m) => m.model === 'claude-sonnet-5.5').adjustedLog
  assert.ok(Math.abs(sonnetAdj.pct) > floor.halfWidthPct, 'Sonnet adjusted must be outside the floor, which is why the raw basis is drawn')
  const inside = src.batch1.models.filter((m) => Math.abs(m.adjustedLog.pct) <= floor.halfWidthPct).length
  assert.ok(f4.includes(inside + ' of ' + src.batch1.models.length), 'fig4 must print the computed inside-floor count')
})

test('every percentage in the figures is derivable from the source JSONs', () => {
  const src = loadSources('.')
  const allowed = new Set()
  const walk = (o) => {
    if (typeof o === 'number' && Number.isFinite(o)) {
      for (const s of [o.toFixed(1), o.toFixed(2), (o * 100).toFixed(1)]) { allowed.add(s); allowed.add('+' + s) }
    } else if (o && typeof o === 'object') for (const v of Object.values(o)) walk(v)
  }
  walk(src)
  // The one derived percentage: the ratio-5.00 share of the whole spread (figure 1's guide).
  const pcts = src.batch1.models.map((m) => m.adjustedLog.pct)
  const r5 = src.batch1.models.filter((m) => { const c = MODELS[m.model].card; return Math.abs(c.out / c.miss - 5) < 1e-9 }).map((m) => m.adjustedLog.pct)
  allowed.add(((Math.max(...r5) - Math.min(...r5)) / (Math.max(...pcts) - Math.min(...pcts)) * 100).toFixed(1))
  // Figure 4's two other non-JSON percentages: the A/A floor's half-width (derived in the generator
  // from the dollars and the first pass's mean) and the 95% interval convention.
  const aaBase = src.aa.passes[Object.keys(src.aa.passes).sort()[0]].meanBilled
  allowed.add((((src.aa.metrics.billed.ciHi - src.aa.metrics.billed.ciLo) / 2 / aaBase) * 100).toFixed(1))
  allowed.add('95')
  for (const f of FILES) {
    // labels print a true minus sign; read it back as the sign it is
    const tex = readFileSync(join('.', 'paper', 'figures', f), 'utf8').replaceAll('\\textminus{}', '-')
    for (const m of tex.matchAll(/([+-]?[0-9]+(?:\.[0-9]+)?)\\%/g)) {
      assert.ok(allowed.has(m[1]), f + ': percentage ' + m[1] + ' is not derivable from the source JSONs')
    }
  }
})
