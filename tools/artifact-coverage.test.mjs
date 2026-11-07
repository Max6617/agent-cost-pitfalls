/**
 * artifact-coverage.test.mjs - the artifact must cover what the paper reports, and the recorded scope
 * must not move underneath it.
 *
 * WHY THIS EXISTS. The manifest was built 2026-10-04 for the six batch-1 matrices. The paper later grew
 * a section reporting a SECOND suite (tasks-b, the failed replication) and a position-adjusted table
 * that replaced one computed by a withdrawn estimator - and none of those numbers were in the artifact,
 * while the paper's opening sentence promises that every number is re-derivable from it. That gap is a
 * reviewer's five-minute find, so it is pinned here rather than left to be noticed again.
 *
 * Run: node --test tools/artifact-coverage.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const manifest = JSON.parse(readFileSync('artifact/MANIFEST.json', 'utf8'))
const outputPaths = new Set(manifest.outputs.map((o) => o.path))
const commandList = manifest.commands.join('\n')

test('the manifest declares both scopes, and names them', () => {
  assert.ok(Array.isArray(manifest.scopes), 'scopes must be an array')
  assert.equal(manifest.scopes.length, 2, 'six-matrix scope and replication scope')
  assert.match(manifest.scope, /tasks-b replication suite/)
})

test('every output the paper cites is checksummed', () => {
  // The batch-1 outputs (section 3.1-3.7) and the ones the later sections report.
  const cited = [
    'analysis/panel-analysis-6model-2026-10-03.json',
    'analysis/hypotheses-6model-2026-10-03.json',
    'analysis/prefix-retention.json',
    'analysis/test-edit-sensitivity-6model-2026-10-04.json',
    // section 3.1's adjusted table and section 3.8's verdict
    'analysis/position-adjust-6model-2026-10-09.json',
    'analysis/position-adjust-batchb-2026-10-09.json',
    'analysis/panel-analysis-batchb-2026-10-09.json',
    'analysis/hypotheses-batchb-2026-10-09.json',
    'analysis/panel-analysis-batchb-four-2026-10-09.json',
    'analysis/hypotheses-batchb-four-2026-10-09.json',
    'analysis/replication-verdict-batchb-2026-10-09.json',
    // The batch-1 re-derivations at B = 200,000 that section 3.1 cites.
    'analysis/panel-analysis-6model-2026-10-09.json',
    'analysis/hypotheses-6model-2026-10-09.json',
    // The arm/seed/ranking/H3 ablations (section 3.9) and the mixed-effects fit (section 7). The
    // latter was cited by the paper for a day while it was in no manifest at all.
    'analysis/ablations-2026-10-09.json',
    'analysis/mixed-effects-6model-2026-10-04.json',
    'analysis/cost-panel-6model-2026-10-03.json',
    // The 20-seed stability of the replication verdict (section 3.8).
    'analysis/verdict-seed-stability-2026-10-10.json',
    // The per-arm test-edit incidence tasks-b/PLAN.md section 3 ordered reported (limitation 3).
    'analysis/test-edit-incidence-2026-10-10.json',
    // The retention difference with an interval on the both-seeds pairing (section 3.2).
    'analysis/prefix-retention-ci-2026-10-10.json',
    // The ranking statistics under the position adjustment (section 3.4).
    'analysis/ranking-adjusted-2026-10-10.json',
    // The corrected A/A noise floor (limitation 9 / section 4).
    'analysis/aa-placebo-2026-10-10.json',
    // The single-harness retention pilot (section 3.3).
    'analysis/retention-pilot-2026-10-10.json',
    // The Anthropic cost bracket (limitation 7) and the arm-specific position fit (limitation 8).
    'analysis/anthropic-cost-bracket-2026-10-10.json',
    'analysis/common-f-infeasibility-2026-10-10.json',
    // The solve-rate guard on the central contrast (the paper's quality check, both suites).
    'analysis/quality-guard-2026-10-10.json',
  ]
  for (const p of cited) {
    assert.ok(existsSync(p), p + ' must exist to be shipped')
    assert.ok(outputPaths.has(p), p + ' is reported by the paper but not checksummed in the manifest')
  }
})

test('the file count the prose states is the manifest count', () => {
  // The count is prose that follows --extend, and it has drifted five times (79, 81, 84, 97, 99)
  // because nothing pinned it: the manifest grew and the sentences did not. Pin every statement of it
  // to inputs + outputs, the number --verify prints.
  const declared = manifest.inputs.length + manifest.outputs.length
  const flat = (p) => readFileSync(p, 'utf8').replace(/\s+/g, ' ')
  const statements = [
    ['PAPER.md', /checksums \*\*(\d+) files across two scopes\*\*/],
    ['ARTIFACT.md', /Two scopes, (\d+) checksummed files/],
    ['paper/PAPER.tex', /checksums (?:\\textbf\{)?(\d+) files across two scopes/],
  ]
  for (const [file, re] of statements) {
    const m = flat(file).match(re)
    assert.ok(m, file + ' must still state the artifact file count')
    assert.equal(Number(m[1]), declared,
      file + ' states ' + m[1] + ' files; the manifest has ' + declared + ' (inputs + outputs)')
  }
})

test('the commands that produce the replication scope are recorded', () => {
  for (const needle of ['panel-analysis.mjs --datasets batchb', 'hypotheses.mjs --datasets batchb',
    '--datasets batchb-deepseek,batchb-glm-flash,batchb-qwen,batchb-luna',
    'replication-verdict.mjs', 'position-adjust.mjs', 'ablations.mjs', 'mixed-effects-hypotheses.mjs', 'verdict-seed-stability.mjs', 'test-edit-incidence.mjs', 'ranking-adjusted.mjs', 'aa-analysis.mjs', 'retention-pilot-analysis.mjs', 'anthropic-cost-bracket.mjs', 'common-f-check.mjs', 'quality-guard.mjs']) {
    assert.ok(commandList.includes(needle), 'the manifest must record how to re-derive: ' + needle)
  }
})

test('the replication suite is an INPUT, not just an output', () => {
  const inputs = new Set(manifest.inputs.map((i) => i.path))
  for (const id of ['batchb-ds-full', 'batchb-glm-flash', 'batchb-qwen-full', 'batchb-luna-full', 'batchb-haiku-full', 'batchb-sonnet-full']) {
    assert.ok(inputs.has('results/' + id + '/runs.jsonl'), id + ' run records must be checksummed inputs')
  }
  for (const m of manifest.matrices) assert.ok(m.cells > 0, m.dataset + ' has no cells')
})

test('adding a scope did NOT re-baseline the recorded one', () => {
  // The handover's standing instruction was "do not re-baseline the MANIFEST". Extending it is fine;
  // moving the six-matrix scope's timestamp or hashes is not. If this assertion fails, someone ran
  // --build when they meant --extend, and the 2026-10-04 evidence was rewritten as a side effect.
  assert.equal(manifest.generated, '2026-10-04T08:11:15.632Z',
    'the six-matrix scope was rebuilt; --extend is the additive path')
  assert.ok(manifest.extended, 'the extension must be dated')
  assert.equal(manifest.outputs.filter((o) => o.path.includes('6model-2026-10-03')).length, 3)
  assert.ok(manifest.notReproducible.some((n) => n.figures.includes('F31')))
  assert.ok(manifest.notReproducible.some((n) => n.figures.includes('F38')))
})