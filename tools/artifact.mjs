/**
 * artifact.mjs - build and verify the artifact package: what a reviewer needs to re-derive every
 * number the paper reports, and an explicit statement of what can no longer be derived at all.
 *
 * WHY THIS EXISTS. "Not reproducible" is one of the attacks that decides this paper, and the
 * artifact release is one of the four mitigations against the other one ("you configured your own
 * arm"). It is also not a formality here: on 2026-10-02 the entire results/ tree was destroyed, so
 * part of this study's evidence CANNOT be shipped. A package that quietly omitted that would be
 * worse than no package.
 *
 * WHAT IT DOES
 *   --build   (default) run every analysis command, checksum the raw inputs and the outputs, and
 *             write artifact/MANIFEST.json - including the list of figures that are NOT
 *             reproducible and why.
 *   --verify  re-checksum everything and compare against the manifest. Non-zero exit on drift, so
 *             it can be run by a reviewer, by CI, or before a release.
 *
 * Usage:
 *   node tools/artifact.mjs
 *   node tools/artifact.mjs --verify
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { inFlightLogs } from './study-window.mjs'

const MATRICES = ['ds-full', 'glm-flash', 'luna-full', 'qwen-full', 'haiku-full', 'sonnet-full']
/**
 * THE REPLICATION SUITE, added 2026-10-09.
 *
 * The manifest used to cover the six batch-1 matrices only, and that was correct while the paper
 * reported them only. The paper now reports a second suite - tasks-b, the pre-registered replication
 * whose verdict is NOT REPLICATED - and a position-adjusted re-derivation of the batch-1 contrasts
 * whose table replaced one computed by a withdrawn estimator. A paper whose opening claim is "every
 * number re-derivable from the shipped artifact" cannot leave its newest and most surprising section
 * outside the artifact, so these are covered too.
 *
 * The ADDITIVE path is --extend, not --build. --build re-runs the batch-1 commands, which rewrites
 * their outputs and therefore their checksums; running it to add a second scope would have moved the
 * 28 recorded hashes as a side effect. --extend appends the new scope and leaves every existing entry,
 * and the manifest's generated timestamp, byte-identical. A full --build still rebuilds both scopes.
 */
const REPLICATION_MATRICES = ['batchb-ds-full', 'batchb-glm-flash', 'batchb-qwen-full', 'batchb-luna-full', 'batchb-haiku-full', 'batchb-sonnet-full',
  // The retention pilot's three collected datasets: the analysable amended matrix, the FAILED matrix
  // kept as the record of the cache_control-limit defect, and the dsh:native control cell. The failed
  // one is an input on purpose: its 30 non-200 records are the evidence for the portability defect.
  'retentionpilot-amended-haiku-full', 'retentionpilot-haiku-full', 'retentionpilot-ctl-haiku-full',
  // The counterbalanced re-run (notes/plans/RERUN-PLAN.md, 2026-10-11), as registered in tools/rerun-datasets.mjs:
  // batch 1 on the four cheap providers plus the Haiku block, tasks-b on the four cheap providers, and
  // the interleaved A/A. Added 2026-11-07; before that the paper cited rerun-compare's output while
  // neither it nor these records were checksummed. The smoke matrices are not inputs.
  'rerun-b1-ds-full', 'rerun-b1-glm-flash', 'rerun-b1-qwen-full', 'rerun-b1-luna-full', 'rerun-b1-haiku-full',
  'rerun-b-ds-full', 'rerun-b-glm-flash', 'rerun-b-qwen-full', 'rerun-b-luna-full',
  'rerun-aa-ds-full']
const FOUR = 'batchb-deepseek,batchb-glm-flash,batchb-qwen,batchb-luna'
const REPLICATION_COMMANDS = [
  ['node', ['tools/panel-analysis.mjs', '--datasets', 'batchb', '--json', 'analysis/panel-analysis-batchb-2026-10-09.json']],
  ['node', ['tools/hypotheses.mjs', '--datasets', 'batchb', '--json', 'analysis/hypotheses-batchb-2026-10-09.json']],
  // The PRE-REGISTERED family is m = 12 over the four providers the plan named, not the m = 18 a
  // six-provider panel prints. Both are shipped; this is the filed one.
  ['node', ['tools/panel-analysis.mjs', '--datasets', FOUR, '--json', 'analysis/panel-analysis-batchb-four-2026-10-09.json']],
  ['node', ['tools/hypotheses.mjs', '--datasets', FOUR, '--json', 'analysis/hypotheses-batchb-four-2026-10-09.json']],
  // --batch1-panel adds notes/plans/PLAN.md Amendment 1 section 9.1's extension verdict: the filed batch-1
  // targets beside the corrected classifications at the current re-filing, so the divergence between
  // the two is shipped with the verdict rather than argued in prose.
  ['node', ['tools/replication-verdict.mjs', '--batch1-panel', 'analysis/panel-analysis-6model-2026-10-09.json', '--json', 'analysis/replication-verdict-batchb-2026-10-09.json']],
  ['node', ['tools/position-adjust.mjs', '--json', 'analysis/position-adjust-6model-2026-10-09.json']],
  ['node', ['tools/position-adjust.mjs', '--datasets', 'batchb', '--json', 'analysis/position-adjust-batchb-2026-10-09.json']],
  ['node', ['tools/ablations.mjs', '--json', 'analysis/ablations-2026-10-09.json']],
  // The mixed-effects fit the paper cites (PAPER.md section 7, notes/records/MIXED-EFFECTS-2026-10-04.md). It was
  // produced 2026-10-04 but was never in the manifest, and the paper's "every number is re-derivable
  // from the artifact" sentence was false for it; the output is deterministic, with no generated stamp.
  ['node', ['tools/mixed-effects-hypotheses.mjs', '--json', 'analysis/mixed-effects-6model-2026-10-04.json']],
  // Whether the tasks-b R1 verdict is one seed's draw: the same estimators, 20 explicit seeds.
  ['node', ['tools/verdict-seed-stability.mjs', '--seeds', '20', '--iters', '200000', '--json', 'analysis/verdict-seed-stability-2026-10-10.json']],
  // tasks-b/PLAN.md section 3 ordered the test-edit flag "reported per arm"; nothing reported it.
  ['node', ['tools/test-edit-incidence.mjs', '--json', 'analysis/test-edit-incidence-2026-10-10.json']],
  // The retention difference with an interval, on the both-seeds pairing (the filed table is the
  // last-seed estimate and carries none). ADDITIVE: the filed prefix-retention.json is untouched.
  ['node', ['tools/prefix-retention.mjs', '--ci-json', 'analysis/prefix-retention-ci-2026-10-10.json']],
  // Section 3.4's ranking statistics re-computed on position-offset costs (objection 15).
  ['node', ['tools/ranking-adjusted.mjs', '--iters', '200000', '--json', 'analysis/ranking-adjusted-2026-10-10.json']],
  // The corrected A/A noise floor (limitation 9): a repeated baseline of one arm, 124 cells.
  ['node', ['tools/aa-analysis.mjs', '--iters', '200000', '--seed', '12345', '--json', 'analysis/aa-placebo-2026-10-10.json']],
  // The single-harness retention pilot (section 3.3): opencode on the Anthropic-native path, its own
  // declared caching, with the dsh:native control cell from the separate control dataset.
  ['node', ['tools/retention-pilot-analysis.mjs', '--dir', 'results/retentionpilot-amended-haiku-full', '--control', 'results/retentionpilot-ctl-haiku-full', '--json', 'analysis/retention-pilot-2026-10-10.json']],
  // Limitation 7's Anthropic cost bracket: both bounds beside the DSH-share point, reconciled to the ledger.
  ['node', ['tools/anthropic-cost-bracket.mjs', '--json', 'analysis/anthropic-cost-bracket-2026-10-10.json']],
  // Limitation 8's arm-specific position fit: estimable but not usable (SE 0.145-0.710 log units).
  ['node', ['tools/common-f-check.mjs', '--json', 'analysis/common-f-infeasibility-2026-10-10.json']],
  // The solve-rate guard the central contrast never had: dsh:ptc vs dsh:native solve counts, exact
  // McNemar, cost per solved cell, and the contrast restricted to cells both arms solved.
  ['node', ['tools/quality-guard.mjs', '--json', 'analysis/quality-guard-2026-10-10.json']],
  // The batch-1 re-derivation at B = 200,000. The 2026-10-03/04 files stay untouched as the record of
  // what was computed at B = 5,000; these are what the paper now cites. One classification moves
  // (Sonnet, positive -> null) and no other model's classification does.
  ['node', ['tools/panel-analysis.mjs', '--json', 'analysis/panel-analysis-6model-2026-10-09.json']],
  ['node', ['tools/hypotheses.mjs', '--json', 'analysis/hypotheses-6model-2026-10-09.json']],
  // The counterbalanced re-run (Tables 7 and 13, Figure 1): the randomised-order contrasts against the
  // filed order-adjusted estimates above, and the interleaved A/A floor. Reads the position-adjust
  // outputs, so it runs after them.
  ['node', ['tools/rerun-compare.mjs', '--json', 'analysis/rerun-compare-2026-10-11.json']],
]
const REPLICATION_OUTPUTS = REPLICATION_COMMANDS.map(([, a]) => a[a.length - 1])
const SCOPE = 'the six matrices that survive (31 tasks x 10 arms x 2 seeds = 620 cells each)'
const REPLICATION_SCOPE = 'the tasks-b replication suite (40 tasks x 10 arms x 2 seeds = 800 cells per provider), the position-adjusted re-derivation of the batch-1 contrasts, the arm/seed/ranking/provider ablations, the mixed-effects fit of H1/H3/H4, and the batch-1 contrasts re-derived at B = 200,000, and the counterbalanced re-run with its interleaved A/A'
const ANALYSIS_COMMANDS = [
  ['node', ['tools/cost-panel.mjs', '--json', 'analysis/cost-panel-6model-2026-10-03.json']],
  ['node', ['tools/panel-analysis.mjs', '--json', 'analysis/panel-analysis-6model-2026-10-03.json']],
  ['node', ['tools/hypotheses.mjs', '--json', 'analysis/hypotheses-6model-2026-10-03.json']],
  ['node', ['tools/prefix-retention.mjs', '--json', 'analysis/prefix-retention.json']],
  ['node', ['tools/test-edit-sensitivity.mjs', '--json', 'analysis/test-edit-sensitivity-6model-2026-10-04.json']],
]
const ANALYSIS_OUTPUTS = [
  'analysis/cost-panel-6model-2026-10-03.json',
  'analysis/panel-analysis-6model-2026-10-03.json',
  'analysis/hypotheses-6model-2026-10-03.json',
  'analysis/prefix-retention.json',
  'analysis/test-edit-sensitivity-6model-2026-10-04.json',
]
/** Figures whose inputs were destroyed on 2026-10-02 and which no command here can regenerate. */
const NOT_REPRODUCIBLE = [
  { figures: ['F31', 'F34', 'F35'], reason: 'seven-model panel: results/glm53, glm-terse, glm-harness, haiku-full, sonnet-full destroyed; no git history, not in the backup mirror', survivesAs: 'analysis/panel-analysis.json and analysis/hypotheses.json, generated 2026-10-02T07:52Z (the only witness; do not overwrite)' },
  { figures: ['F38'], reason: 'hard-task replication: results/f18-* and results/haiku-hard-probe destroyed', survivesAs: 'nothing - cannot be re-run' },
  { figures: ['F42'], reason: 'hard batch: results/hardbatch-deepseek, hardbatch-glm, hardbatch-qwen-fixed destroyed', survivesAs: 'results/hardbatch-qwen-fixed-gateway.jsonl only (a gateway log, no run records)' },
]

const sha256 = (f) => createHash('sha256').update(readFileSync(f)).digest('hex')
const fileInfo = (f) => ({ path: f, bytes: statSync(f).size, sha256: sha256(f) })

function gatewayFiles(inFlight = new Set()) {
  // A log the live pipeline is still appending to is not an input. It is REPORTED as inFlight
  // instead, so the exclusion is visible (notes/defects/LIVE-DEFECTS-2026-10-04.md section 2).
  return readdirSync('results')
    .filter((f) => /gateway.*\.jsonl$/.test(f) && !/selftest/.test(f))
    .filter((f) => !inFlight.has(f.toLowerCase()))
    .map((f) => 'results/' + f)
}

function matrixFacts(ids = MATRICES) {
  const facts = []
  for (const id of ids) {
    const path = 'results/' + id + '/runs.jsonl'
    if (!existsSync(path)) continue
    const recs = readFileSync(path, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
    const cells = new Set(recs.map((r) => [r.task, r.arm, r.seed].join('|')))
    facts.push({
      dataset: id, records: recs.length, cells: cells.size,
      tasks: new Set(recs.map((r) => r.task)).size,
      arms: new Set(recs.map((r) => r.arm)).size,
      seeds: [...new Set(recs.map((r) => r.seed))].sort(),
      solved: recs.filter((r) => r.solved === true).length,
      matrixIds: [...new Set(recs.map((r) => r.matrixId).filter(Boolean))],
      models: [...new Set(recs.map((r) => r.model).filter(Boolean))],
      harnessVersions: [...new Set(recs.map((r) => r.harnessVersion).filter(Boolean))],
      hasFixtureField: recs.filter((r) => 'fixture' in r).length,
      testsEdited: recs.filter((r) => r.fixture && r.fixture.gradedOnEditedTests === true).length,
    })
  }
  return facts
}

function build() {
  console.log('ARTIFACT BUILD - re-deriving every reportable number from the surviving data\n')
  // Logs the live pipeline is still writing are NOT inputs. See inFlightLogs.
  const statusPath = 'results/_scratch/pipeline-status.json'
  const inFlight = inFlightLogs(existsSync(statusPath) ? JSON.parse(readFileSync(statusPath, 'utf8')) : null)
  for (const [cmd, args] of ANALYSIS_COMMANDS) {
    process.stdout.write('  ' + cmd + ' ' + args.join(' ') + ' ... ')
    try { execFileSync(cmd, args, { stdio: 'pipe' }); console.log('ok') }
    catch (e) { console.log('FAILED'); throw new Error(cmd + ' ' + args.join(' ') + ' failed: ' + String(e).slice(0, 300)) }
  }
  const manifest = {
    generated: new Date().toISOString(),
    node: process.version,
    platform: process.platform + ' ' + process.arch,
    scope: SCOPE + '; plus ' + REPLICATION_SCOPE,
    scopes: [SCOPE, REPLICATION_SCOPE],
    matrices: matrixFacts([...MATRICES, ...REPLICATION_MATRICES]),
    inputs: [...MATRICES.map((id) => 'results/' + id + '/runs.jsonl').filter(existsSync), ...gatewayFiles(inFlight)].map(fileInfo),
    // Named, not silently dropped: a reviewer sees which logs were excluded and why.
    inFlight: [...inFlight].filter((x) => x.endsWith('.jsonl')).sort(),
    outputs: [...ANALYSIS_OUTPUTS, ...REPLICATION_OUTPUTS].filter(existsSync).map(fileInfo),
    commands: [...ANALYSIS_COMMANDS, ...REPLICATION_COMMANDS].map(([c, a]) => [c, ...a].join(' ')),
    testCommand: 'node --test "tools/*.test.mjs"',
    notReproducible: NOT_REPRODUCIBLE,
  }
  mkdirSync('artifact', { recursive: true })
  writeFileSync('artifact/MANIFEST.json', JSON.stringify(manifest, null, 1))
  console.log('\n  inputs checksummed : ' + manifest.inputs.length)
  console.log('  outputs checksummed: ' + manifest.outputs.length)
  console.log('  matrices           : ' + manifest.matrices.map((m) => m.dataset + ' ' + m.cells + ' cells').join(', '))
  console.log('  NOT reproducible   : ' + manifest.notReproducible.map((n) => n.figures.join('/')).join(', '))
  console.log('\nwrote artifact/MANIFEST.json')
}


/**
 * Append a scope to an existing manifest WITHOUT re-running the other scope's commands.
 *
 * WHY THIS EXISTS RATHER THAN JUST --build. --build re-runs every command and checksums what came out,
 * so running it to cover a new suite would also rewrite the six-matrix outputs - and their hashes, and
 * the manifest timestamp - as a side effect. That is a re-baseline of evidence that has not changed.
 * This path runs only the new commands, upserts their files, and leaves every existing entry and the
 * original `generated` timestamp untouched; it records WHEN the extension happened in `extended`.
 * It is idempotent: re-running it re-derives the new scope and replaces its hashes.
 */
function extend() {
  const manifestPath = 'artifact/MANIFEST.json'
  if (!existsSync(manifestPath)) { console.error('no artifact/MANIFEST.json - run the build first'); process.exit(2) }
  const m = JSON.parse(readFileSync(manifestPath, 'utf8'))
  console.log('ARTIFACT EXTEND - adding the replication scope, leaving the recorded scope alone')
  console.log('')
  const statusPath = 'results/_scratch/pipeline-status.json'
  const inFlight = inFlightLogs(existsSync(statusPath) ? JSON.parse(readFileSync(statusPath, 'utf8')) : null)
  for (const [cmd, args] of REPLICATION_COMMANDS) {
    process.stdout.write('  ' + cmd + ' ' + args.join(' ') + ' ... ')
    try { execFileSync(cmd, args, { stdio: 'pipe' }); console.log('ok') }
    catch (e) { console.log('FAILED'); throw new Error(cmd + ' ' + args.join(' ') + ' failed: ' + String(e).slice(0, 300)) }
  }
  const upsert = (list, infos) => {
    const byPath = new Map(list.map((x) => [x.path, x]))
    let added = 0, updated = 0
    for (const info of infos) { if (byPath.has(info.path)) updated++; else added++; byPath.set(info.path, info) }
    return { list: [...byPath.values()].sort((a, b) => (a.path < b.path ? -1 : 1)), added, updated }
  }
  const inputInfos = [...REPLICATION_MATRICES.map((id) => 'results/' + id + '/runs.jsonl'), ...gatewayFiles(inFlight)]
    .filter(existsSync).map(fileInfo)
  const outputInfos = REPLICATION_OUTPUTS.filter(existsSync).map(fileInfo)
  const ins = upsert(m.inputs, inputInfos)
  const outs = upsert(m.outputs, outputInfos)
  m.inputs = ins.list
  m.outputs = outs.list
  m.matrices = matrixFacts([...MATRICES, ...REPLICATION_MATRICES])
  m.commands = [...new Set([...(m.commands ?? []), ...REPLICATION_COMMANDS.map(([c, a]) => [c, ...a].join(' '))])]
  // The replication scope's LABEL evolves as the extension grows, so it is REPLACED, not appended:
  // a set of scope strings kept the previous wording beside the new one and the manifest ended up
  // declaring three scopes for two. The six-matrix scope is fixed, and both come from these constants.
  m.scopes = [SCOPE, REPLICATION_SCOPE]
  m.scope = SCOPE + '; plus ' + REPLICATION_SCOPE
  // The original `generated` is deliberately NOT touched: it records when the recorded scope was built.
  m.extended = new Date().toISOString()
  writeFileSync(manifestPath, JSON.stringify(m, null, 1))
  console.log('')
  console.log('  inputs  +' + ins.added + ' added, ' + ins.updated + ' refreshed (total ' + m.inputs.length + ')')
  console.log('  outputs +' + outs.added + ' added, ' + outs.updated + ' refreshed (total ' + m.outputs.length + ')')
  console.log('  original scope generated ' + m.generated + ' (unchanged)')
  console.log('  extended ' + m.extended)
  console.log('')
  console.log('wrote ' + manifestPath)
}
function verify() {
  if (!existsSync('artifact/MANIFEST.json')) { console.error('no artifact/MANIFEST.json - run the build first'); process.exit(2) }
  const m = JSON.parse(readFileSync('artifact/MANIFEST.json', 'utf8'))
  let bad = 0
  const check = (list, label) => {
    for (const f of list) {
      if (!existsSync(f.path)) { console.log('  MISSING  ' + label + ' ' + f.path); bad++; continue }
      if (sha256(f.path) !== f.sha256) { console.log('  CHANGED  ' + label + ' ' + f.path); bad++ }
    }
  }
  check(m.inputs, 'input')
  check(m.outputs, 'output')
  console.log('  node ' + process.version + ' vs manifest ' + m.node + (process.version === m.node ? '  (same)' : '  *** DIFFERENT ***'))
  if (m.extended) console.log('  scope extended ' + m.extended + (m.scopes ? ' (' + m.scopes.length + ' scopes)' : ''))
  console.log(bad === 0
    ? '  VERIFIED: ' + (m.inputs.length + m.outputs.length) + ' files match the manifest of ' + m.generated
    : '  *** ' + bad + ' file(s) drifted - the outputs no longer match this data ***')
  process.exit(bad === 0 ? 0 : 1)
}

if (process.argv.includes('--verify')) verify()
else if (process.argv.includes('--extend')) extend()
else build()
