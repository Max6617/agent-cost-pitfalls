/**
 * number-audit.test.mjs - the audit must catch the class it was built for, and must not flag the three
 * things that look like numbers but are not measurements.
 *
 * The class: a number stated beside a citation that the cited file does not contain. It cost two hand
 * reviews to miss it twice (97 in the paper after the manifest reached 99; 77% in STEP2 when the filed
 * meanGrowthFraction is 0.8402), so the boundary is pinned here with synthetic documents.
 *
 * Run: node --test tools/number-audit.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { paragraphs, numbersIn, derivable, auditDocument } from './number-audit.mjs'

const BT = String.fromCharCode(96)
const cite = (p) => BT + p + BT
const resolver = (map) => (p) => (p in map ? map[p] : null)

test('a filed fraction and the percent printed in prose are the same number', () => {
  assert.equal(derivable('84.0', [0.8402]), true)
  assert.equal(derivable('0.14', [0.1409]), true)     // rounding to the token's precision
  assert.equal(derivable('18.8', [18.8]), true)
  assert.equal(derivable('5.7', [5.7483]), true)
  assert.equal(derivable('53.84', [0.5384]), true)    // x100
  assert.equal(derivable('77', [0.8402]), false)      // the stale value the tool exists to find
  assert.equal(derivable('97', [99]), false)
})

test('numbers are collected recursively, and bare numeric strings count', () => {
  const found = numbersIn({ a: 1, b: { c: [2.5, '3.25'] }, d: '447 of the 800 records', e: null })
  assert.deepEqual(found.sort(), [1, 2.5, 3.25])
})

test('a paragraph citing a file is checked; one without a citation is not', () => {
  const map = { 'analysis/x.json': { meanGrowthFraction: 0.8402 } }
  const good = 'The body grows in **84.0%** of transitions (' + cite('analysis/x.json') + ').'
  const bad = 'The body grows in **77%** of transitions (' + cite('analysis/x.json') + ').'
  const uncited = 'The body grows in 77% of transitions.'
  assert.equal(auditDocument(good, resolver(map)).hits.length, 0)
  const r = auditDocument(bad, resolver(map))
  assert.equal(r.hits.length, 1)
  assert.equal(r.hits[0].token, '77%')
  assert.equal(auditDocument(uncited, resolver(map)).hits.length, 0, 'no citation, no claim to check')
})

test('version numbers, section references and arXiv ids are not measurements', () => {
  const map = { 'analysis/x.json': { v: 1 } }
  const doc = 'GLM-5.3 and DeepSeek V4.1 (section 3.8) rerun per arXiv:2609.30725 (' + cite('analysis/x.json') + ').'
  assert.deepEqual(auditDocument(doc, resolver(map)).hits, [])
})

test('a cited file that cannot be resolved is reported as such, not as a wrong number', () => {
  const doc = 'A number 12.5% beside ' + cite('analysis/missing.json') + '.'
  const r = auditDocument(doc, resolver({}))
  assert.equal(r.hits.length, 1)
  assert.equal(r.hits[0].note, 'cited file not resolvable')
  assert.equal(r.citedFiles[0], 'analysis/missing.json')
})

test('paragraphs keep the line number the number will be reported at', () => {
  const doc = 'first line\n\nsecond paragraph here'
  const ps = paragraphs(doc)
  assert.equal(ps.length, 2)
  assert.equal(ps[0].start, 1)
  assert.equal(ps[1].start, 3)
})
