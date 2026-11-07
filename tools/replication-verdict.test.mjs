/**
 * replication-verdict.test.mjs - the pre-registered rule has to be applied, not eyeballed.
 *
 * THE DEFECT THIS EXISTS FOR. tasks-b/PLAN.md section 5 fixes the replication verdict
 * mechanically and nothing implemented it, so the verdict circulated as prose - and the prose and
 * the rule disagree on GLM. Its tasks-b interval ends a tenth of a point above zero, so the rule
 * returns NULL, while every one-decimal rendering of that same interval ("[-21.4%, +0.0%]") reads as
 * "negative, excludes zero". A rule whose classification turns on the last decimal has to be
 * computed. (The bound moves with the bootstrap re-filing; the tests read the current panel.)
 *
 * Run: node --test tools/replication-verdict.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { classify, overlaps, replicationVerdict, extensionVerdict, BATCH1, EXTENSION_TARGETS } from './replication-verdict.mjs'

test('classify: the plan\'s rule is strict, so an interval that touches 0 is null', () => {
  assert.equal(classify(0.1, 5), 'positive')
  assert.equal(classify(-5, -0.1), 'negative')
  assert.equal(classify(-1, 1), 'null')
  // The two boundaries are the whole rule: exclude zero, or contain it.
  assert.equal(classify(0, 1), 'null', 'a lower bound of exactly 0 contains 0')
  assert.equal(classify(-1, 0), 'null', 'an upper bound of exactly 0 contains 0')
  assert.equal(classify(0.0001, 1), 'positive', 'one ten-thousandth above 0 excludes 0')
  assert.equal(classify(-1, -0.0001), 'negative', 'one ten-thousandth below 0 excludes 0')
})

test('classify refuses inputs it cannot classify rather than guessing', () => {
  assert.throws(() => classify(5, 1), /inverted/)
  assert.throws(() => classify(NaN, 1), /non-finite/)
  assert.throws(() => classify(0, Infinity), /non-finite/)
})

test('GLM\'s filed tasks-b interval is null, and is flagged as a knife edge', () => {
  // The exact A2 row at the current re-filing, transcribed from
  // analysis/panel-analysis-batchb-2026-10-09.json (B = 200,000). At the filed B = 5,000 the same
  // row ended at +0.0405%; the classification is null either way, which is the point.
  const glm = {
    model: 'glm-5.3-flash', label: 'GLM-5.3-Flash', tasks: 40,
    relDiffPct: -10.138726094945465, ciLoPct: -21.117331446310132, ciHiPct: 0.14092247438159253,
  }
  const rows = [glm, ...BATCH1.filter((b) => b.model !== glm.model).map((b) => ({
    model: b.model, label: b.label, tasks: 40,
    relDiffPct: b.relPct, ciLoPct: b.ciPct[0], ciHiPct: b.ciPct[1],
  }))]
  const v = replicationVerdict(rows)
  const p = v.providers.find((x) => x.model === 'glm-5.3-flash')
  assert.equal(p.tasksB.classification, 'null', 'the interval ends above 0, so the rule says null')
  assert.equal(p.knifeEdge, true, 'a tenth of a point from 0 must be reported, or a reader rounds it to negative')
  assert.ok(p.nearestBoundToZeroPp < 0.5)
  // And the decisive consequence: the prose verdict and the filed rule disagree about this provider.
  assert.equal(p.match, false, 'batch-1 called GLM negative; the rule makes tasks-b null')
})

test('a provider whose classification matches batch-1 on all four gives replicated', () => {
  const rows = BATCH1.map((b) => ({ model: b.model, label: b.label, tasks: 40, relDiffPct: b.relPct, ciLoPct: b.ciPct[0], ciHiPct: b.ciPct[1] }))
  const v = replicationVerdict(rows)
  assert.equal(v.R1.matched, 4)
  assert.equal(v.R2.holds, true)
  assert.equal(v.verdict, 'replicated')
})

test('three of four matching is partially replicated, and the deviating provider is named', () => {
  const rows = BATCH1.map((b) => ({ model: b.model, label: b.label, tasks: 40, relDiffPct: b.relPct, ciLoPct: b.ciPct[0], ciHiPct: b.ciPct[1] }))
  const luna = rows.find((r) => r.model === 'gpt-6-luna')
  luna.ciLoPct = -24.3; luna.ciHiPct = -8.5; luna.relDiffPct = -16.6   // null -> negative
  const v = replicationVerdict(rows)
  assert.equal(v.R1.matched, 3)
  assert.equal(v.verdict, 'partially replicated')
  assert.deepEqual(v.R1.deviations.map((d) => d.model), ['gpt-6-luna'])
})

test('the tasks-b result as filed is not replicated, 0 of 4', () => {
  // The filed A2 rows, transcribed. These are the study's tasks-b result: if this test changes,
  // the paper's headline changes, and that is the point of pinning it.
  const filed = [
    { model: 'qwen3.8-flash', label: 'Qwen3.8-Flash', tasks: 40, relDiffPct: 5.748315272116631, ciLoPct: -3.9319430864506066, ciHiPct: 15.014126928185807 },
    { model: 'glm-5.3-flash', label: 'GLM-5.3-Flash', tasks: 40, relDiffPct: -10.138726094945465, ciLoPct: -21.117331446310132, ciHiPct: 0.14092247438159253 },
    { model: 'gpt-6-luna', label: 'gpt-6-luna', tasks: 40, relDiffPct: -16.576828106555052, ciLoPct: -24.34527376842558, ciHiPct: -8.549859296234898 },
    { model: 'deepseek-flash', label: 'DeepSeek V4.1 Flash', tasks: 40, relDiffPct: -21.758870744592134, ciLoPct: -37.46364252855195, ciHiPct: -9.384377880751053 },
  ]
  const v = replicationVerdict(filed)
  assert.deepEqual(v.providers.map((p) => p.tasksB.classification), ['null', 'null', 'negative', 'negative'])
  assert.equal(v.R1.matched, 0)
  assert.equal(v.R2.holds, false, 'not one provider classifies positive on tasks-b')
  assert.equal(v.verdict, 'not replicated')
})

test('R2 is not independently reachable: with this filing, R1 4 of 4 implies a positive exists', () => {
  // notes/plans/PLAN.md's R2 asks for at least one positive AND one negative. Its batch-1 classifications are
  // positive (Qwen) and negative (GLM), so all-four-matching already supplies both. The second gate
  // therefore only ever bites a run that has ALREADY failed R1 - said here rather than left looking
  // like an untested branch.
  const rows = BATCH1.map((b) => ({ model: b.model, label: b.label, tasks: 40, relDiffPct: b.relPct, ciLoPct: b.ciPct[0], ciHiPct: b.ciPct[1] }))
  const v = replicationVerdict(rows)
  assert.equal(v.R1.holds, true)
  assert.equal(v.R2.holds, true)
  assert.ok(!(v.R1.holds && !v.R2.holds))
})

test('a missing pre-registered provider refuses a verdict instead of counting as a non-match', () => {
  const rows = BATCH1.slice(0, 3).map((b) => ({ model: b.model, label: b.label, tasks: 40, relDiffPct: b.relPct, ciLoPct: b.ciPct[0], ciHiPct: b.ciPct[1] }))
  assert.throws(() => replicationVerdict(rows), /refusing to return a verdict/)
})

test('the Anthropic extension cannot move the verdict', () => {
  const rows = BATCH1.map((b) => ({ model: b.model, label: b.label, tasks: 40, relDiffPct: b.relPct, ciLoPct: b.ciPct[0], ciHiPct: b.ciPct[1] }))
  const before = replicationVerdict(rows)
  // haiku is the only positive-leaning row in the whole suite, so if the extension could vote it
  // would vote for R2. notes/plans/PLAN.md section 2 filed the design with "No Anthropic"; it cannot.
  const withAnthropic = replicationVerdict([...rows, { model: 'claude-haiku-4.5', label: 'Claude Haiku 4.5', tasks: 18, relDiffPct: 6.207448725102082, ciLoPct: -7.019311201000863, ciHiPct: 19.580241538663785 }])
  assert.deepEqual(withAnthropic, before)
})

test('the filed tasks-b result is still 0 of 4 at the re-filed B = 200,000', () => {
  // The B = 5,000 transcription above pinned the verdict's shape; this pins the CURRENT filing, so a
  // silent rebuild at a different resolution cannot move the paper's verdict unnoticed. The three
  // classifications, and therefore R1 = 0, are unchanged; only the interval endpoints moved.
  const j = JSON.parse(readFileSync('analysis/panel-analysis-batchb-2026-10-09.json', 'utf8'))
  const v = replicationVerdict(j.sections.A2)
  assert.deepEqual(v.providers.map((p) => p.tasksB.classification), ['null', 'null', 'negative', 'negative'])
  assert.equal(v.R1.matched, 0)
  assert.equal(v.R2.holds, false)
  assert.equal(v.verdict, 'not replicated')
  const glm = v.providers.find((p) => p.model === 'glm-5.3-flash')
  assert.ok(glm.tasksB.ciPct[1] > 0 && glm.tasksB.ciPct[1] < 0.5, 'GLM is still the knife edge, above 0 and inside half a point')
  assert.equal(glm.knifeEdge, true)
})

test('notes/plans/PLAN.md 9.1: both extension targets are positive, and both tasks-b rows are null', () => {
  // The plan's amendment filed the extension rule and its targets BEFORE any tasks-b record existed:
  // "classification matches its batch-1 row -> extension row replicated; otherwise extension row not
  // replicated, naming the model." Haiku +53.8% and Sonnet +9.5%, both positive at the filing.
  assert.deepEqual(EXTENSION_TARGETS.map((t) => t.classification), ['positive', 'positive'])
  const rows = [
    { model: 'claude-haiku-4.5', label: 'Claude Haiku 4.5', tasks: 18, relDiffPct: 6.207448725102082, ciLoPct: -7.349853371825447, ciHiPct: 19.665902961715027 },
    { model: 'claude-sonnet-5.5', label: 'Claude Sonnet 5.5', tasks: 40, relDiffPct: -0.5276513372781944, ciLoPct: -7.921625650860584, ciHiPct: 5.980898141192091 },
  ]
  const ev = extensionVerdict(rows)
  assert.deepEqual(ev.map((x) => x.classification), ['null', 'null'])
  assert.deepEqual(ev.map((x) => x.replicated), [false, false], 'positive -> null is not replicated for either row')
})

test('notes/plans/PLAN.md 9.1 names the model, and an uncollected model is NOT COLLECTED, not a non-match', () => {
  const only = [{ model: 'claude-haiku-4.5', label: 'Claude Haiku 4.5', tasks: 18, relDiffPct: 6.2, ciLoPct: -7.3, ciHiPct: 19.7 }]
  const ev = extensionVerdict(only)
  assert.equal(ev[0].replicated, false)
  assert.equal(ev[1].absent, true)
  assert.equal(ev[1].replicated, null, 'absent must not read as "did not match"')
})

test('the corrected batch-1 re-filing is reported beside the filed target, not substituted for it', () => {
  // At B = 200,000 the batch-1 Sonnet row is itself null, so under the corrected record the rule
  // would read null -> null and call that row replicated. The tool keeps the filed target as the
  // verdict and reports the corrected reading separately, because the target was filed before the
  // data existed.
  const j = JSON.parse(readFileSync('analysis/panel-analysis-6model-2026-10-09.json', 'utf8'))
  const sonnetB1 = j.sections.A2.find((r) => r.model === 'claude-sonnet-5.5')
  assert.equal(sonnetB1.ciLoPct < 0 && sonnetB1.ciHiPct > 0, true, 'the corrected Sonnet batch-1 interval contains zero')
  const rows = [{ model: 'claude-sonnet-5.5', label: 'Claude Sonnet 5.5', tasks: 40, relDiffPct: -0.5276513372781944, ciLoPct: -7.921625650860584, ciHiPct: 5.980898141192091 }]
  const ev = extensionVerdict(rows, [sonnetB1])
  const s = ev.find((x) => x.model === 'claude-sonnet-5.5')
  assert.equal(s.target, 'positive')
  assert.equal(s.replicated, false, 'the filed target governs')
  assert.equal(s.correctedClassification, 'null')
  assert.equal(s.correctedReplicates, true, 'under the corrected target the rule would call it replicated')
})

test('overlaps: intervals that share a point overlap', () => {
  assert.equal(overlaps(10, 20, 15, 25), true)
  assert.equal(overlaps(10, 20, 20, 30), true, 'touching intervals overlap')
  assert.equal(overlaps(10, 20, 21, 30), false)
})

test('the filed panel still supplies all four providers with 40 paired tasks each', () => {
  // A truncated or partial panel would silently weaken the verdict, so this reads the committed
  // artefact and checks the coverage the verdict rests on.
  const j = JSON.parse(readFileSync('analysis/panel-analysis-batchb-2026-10-09.json', 'utf8'))
  const v = replicationVerdict(j.sections.A2)
  assert.equal(v.providers.length, 4)
  for (const p of v.providers) assert.equal(p.tasks, 40, p.label + ' must be paired on all 40 tasks')
  assert.equal(v.verdict, 'not replicated')
})