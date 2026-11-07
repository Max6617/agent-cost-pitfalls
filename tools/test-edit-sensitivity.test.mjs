/**
 * test-edit-sensitivity.test.mjs - the section 4.1 sensitivities, asserted as PROPERTIES.
 *
 * PRE-REGISTRATION.md section 12.8 (amendment 21, commit b9cbe19) pre-declares the rule these
 * tests enforce: every model's rate is reported as measured, no run is excluded, and two
 * sensitivities (S1 drop-edited, S2 worst case) travel with it.
 *
 * The dangerous failure here is not a wrong number. It is a run quietly leaving the denominator:
 * that is how an as-measured figure becomes a filtered one without anyone deciding to filter it.
 *
 * Run: node --test tools/test-edit-sensitivity.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { computeSensitivity, DEFAULT_OUT, DATASETS } from './test-edit-sensitivity.mjs'

const rec = (task, arm, seed, solved, edited) => {
  const r = { task, arm, seed, solved }
  if (edited !== undefined) r.fixture = { gradedOnEditedTests: edited }
  return r
}

const readDataset = (id) => readFileSync('results/' + id + '/runs.jsonl', 'utf8')
  .split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))

const four = [
  rec('t1', 'dsh:native', 1, true, true),      // solved, but the graded suite was edited
  rec('t1', 'dsh:native', 2, true, false),     // solved honestly
  rec('t2', 'dsh:native', 1, false, false),
  rec('t2', 'dsh:native', 2, false, false),
]

test('a record with no fixture field is UNKNOWN - never unedited, never edited', () => {
  const s = computeSensitivity([rec('t', 'a', 1, true)])
  assert.equal(s.edited, 0)
  assert.equal(s.unedited, 0)
  assert.equal(s.unknown, 1, 'an absent field is not evidence of an untouched fixture')
  assert.equal(s.asMeasured.n, 1, 'as-measured keeps every run')
  assert.equal(s.s1.n, 1, 'S1 drops EDITED runs only; unknown runs stay in')
  assert.equal(s.s2.solved, 1)
})

test('as-measured never drops a run, and the arms sum to the model', () => {
  const s = computeSensitivity(four)
  assert.equal(s.asMeasured.n, four.length)
  const arms = Object.values(s.byArm)
  assert.equal(arms.reduce((a, x) => a + x.asMeasured.n, 0), s.asMeasured.n)
  assert.equal(arms.reduce((a, x) => a + x.asMeasured.solved, 0), s.asMeasured.solved)
})

test('S1 and S2 are exact on a mixed cell', () => {
  const s = computeSensitivity(four)
  assert.equal(s.edited, 1)
  assert.equal(s.asMeasured.n, 4)
  assert.equal(s.asMeasured.solved, 2)
  assert.equal(s.s1.n, 3)
  assert.equal(s.s1.solved, 1)
  assert.equal(s.s2.n, 4)
  assert.equal(s.s2.solved, 1, 'the edited run is forced unsolved')
  assert.equal(s.asMeasured.rate, 0.5)
  assert.ok(Math.abs(s.s1.rate - 1 / 3) < 1e-12)
  assert.equal(s.s2.rate, 0.25)
})

test('an edited run that is already unsolved moves S1 and not S2', () => {
  const records = [
    rec('t1', 'a', 1, true, false),
    rec('t1', 'a', 2, true, false),
    rec('t2', 'a', 1, false, true),
    rec('t2', 'a', 2, false, false),
  ]
  const s = computeSensitivity(records)
  assert.equal(s.asMeasured.rate, 0.5)
  assert.equal(s.s1.n, 3)
  assert.ok(Math.abs(s.s1.rate - 2 / 3) < 1e-12)
  assert.equal(s.s2.solved, 2, 'S2 cannot fall below the honest solves')
  assert.equal(s.s2.rate, 0.5)
})

test('an empty denominator is null, not NaN', () => {
  const s = computeSensitivity([rec('t', 'a', 1, true, true)])
  assert.equal(s.s1.n, 0)
  assert.equal(s.s1.rate, null)
  assert.equal(s.asMeasured.rate, 1)
})

test('the answer does not depend on record order', () => {
  const a = computeSensitivity(four)
  const b = computeSensitivity([...four].reverse())
  assert.deepEqual(b, a)
})

test('STRUCTURAL: the tool cannot write the seven-model witness files', () => {
  assert.notEqual(DEFAULT_OUT, 'analysis/panel-analysis.json')
  assert.notEqual(DEFAULT_OUT, 'analysis/hypotheses.json')
  const src = readFileSync(new URL('./test-edit-sensitivity.mjs', import.meta.url), 'utf8')
  assert.ok(!src.includes('panel-analysis.json'), 'the tool must not name the witness')
  assert.ok(!src.includes('hypotheses.json'), 'the tool must not name the witness')
})

test('STRUCTURAL: no destructive primitive exists in this path', () => {
  const src = readFileSync(new URL('./test-edit-sensitivity.mjs', import.meta.url), 'utf8')
  assert.ok(!/rmSync|unlinkSync|rmdirSync/.test(src), 'no destructive primitive may exist here')
})

test('REAL DATA: as-measured keeps every run, and ds-full is reported as not measured', () => {
  for (const id of DATASETS) {
    const records = readDataset(id)
    const s = computeSensitivity(records)
    assert.equal(s.asMeasured.n, records.length, id + ' dropped a run from the as-measured denominator')
    if (id === 'ds-full') {
      assert.equal(s.unknown, records.length, 'ds-full carries no fixture field on any record')
      assert.equal(s.edited, 0)
      assert.equal(s.s1.solved, s.asMeasured.solved, 'where the field is absent, S1 must equal as-measured')
    }
  }
})

test('REAL DATA: the incidence the pre-registration records is still the incidence on disk', () => {
  const edited = {}
  for (const id of DATASETS) edited[id] = computeSensitivity(readDataset(id)).edited
  assert.deepEqual(edited, {
    'ds-full': 0, 'glm-flash': 2, 'luna-full': 81, 'qwen-full': 1, 'haiku-full': 5, 'sonnet-full': 0,
  })
})
