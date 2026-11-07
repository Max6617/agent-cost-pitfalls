/**
 * collect.mjs - ONE command that runs a whole matrix, or refuses to.
 *
 * THE PROBLEM IT REPLACES. Collecting a matrix used to be five manual steps in the right order:
 * start a gateway with the right flags on the right port, remember the effort setting, run
 * preflight, launch the runner, then sit and watch. Every one of those steps is a place where a
 * treatment stops being held constant:
 *
 *   - Batch 1 forced effort=high on DeepSeek and GLM. Nothing recorded it except a deviations
 *     field in the gateway log, recoverable only after the fact.
 *   - Qwen's batch-1 matrix ran with cache breakpoints ON while DeepSeek's and GLM's ran with
 *     them OFF. That is a treatment difference across providers, and it is NOT recoverable from
 *     any surviving record - it is remembered, which is not the same thing.
 *   - A gateway started on the default port silently served the wrong model.
 *
 * So the pipeline is one command, every stage reports what it actually resolved, and any stage
 * that fails stops the run. There is no --force-anyway and there will not be one.
 *
 *   node tools/collect.mjs --plan batch1 --providers cheap --max-cost 40
 *   node tools/collect.mjs --plan batch1 --providers deepseek --dry-run
 *   node tools/collect.mjs --plan hard --providers qwen --max-cost 30
 *
 * STAGES, IN ORDER, ALL MANDATORY
 *   0  plan + cost estimate + ceiling        - abort before anything is started if over budget
 *   1  credit check, every provider used     - tools/check-providers.mjs, per pre-registration
 *   2  start the gateways itself             - free port, exact flags, per-matrix log
 *   3  preflight EVERY harness               - not just dsh; a broken harness must not reach a
 *                                              matrix and report zeros that read as results
 *   4  pilot: cheapest task, all arms        - records land, cost is non-zero, solve rate is sane
 *   5  the matrix, watched                   - gateway-silence watchdog, matrix-silence watchdog,
 *                                              live spend meter against the ceiling, incremental
 *                                              backup every N runs
 *   6  verify                                - per-arm cell counts, coverage balance, and zero
 *                                              unexplained zero-cost runs
 *   7  commit + back up                      - by matrix id and run count
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, appendFileSync, openSync } from 'node:fs'
import { createServer } from 'node:net'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PROVIDERS, recommend, CHEAP_ORDER } from './credit-plan.mjs'
import { costOf } from './prices.mjs'
import { resolveUpstreamKey } from './keys.mjs'
import { GATEWAY } from './collect-gateway.mjs'
import { outputDirVerdict, readCollection } from './outdir-guard.mjs'
import { silenceClock, silenceVerdict, gatewayIdleMs, DEFAULT_MATRIX_SILENCE_MIN } from './matrix-watchdog.mjs'
import { countCells, describeCells, unresolvedFailures } from './cell-counts.mjs'
import { scanGatewayRuns, rule9Exclusions, unexplainedZeroCost, describeRule9Exclusions, carriedSummary, describeCarried } from './collect-verify.mjs'
import { retry } from './retry.mjs'
import { exitGuardVerdict } from './exit-guard.mjs'
import { AA_PLANS, aaCells } from './aa-plans.mjs'
import { RERUN_PLANS, rerunCells, rerunCostPerCell, rerunRunnerFlags } from './rerun-plans.mjs'
import { RETENTION_PILOT_PLAN, RETENTION_PILOT_SMOKE, RETENTION_PILOT_SMOKE_OPENCODE, RETENTION_PILOT_CONTROL } from './retention-pilot-plan.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
const has = (n) => argv.includes(n)

const planName = opt('--plan', null)
const dryRun = has('--dry-run')
const onlyProviders = opt('--providers', 'cheap')
const maxCost = opt('--max-cost', null) === null ? null : Number(opt('--max-cost'))
// --jobs 4 is what every batch-1 matrix actually used: all nine historical commands read
// "--seeds 2 --jobs 4". Concurrency is not free to change - it alters queueing and can trip
// provider rate limits - so it stays at 4 unless --jobs says otherwise, and it is recorded in
// matrix.json either way.
const jobs = String(Math.max(1, Number(opt('--jobs', 4))))
const harnessArg = opt('--harness', null)
// --arms runs a SUBSET of the arm list. run-experiment.mjs has always supported it; the pipeline
// simply never forwarded it, so there was no way to run a BOUNDED pilot on an expensive provider
// before committing to a 620-cell matrix. Absent, every behaviour below is exactly as before.
const armsArg = opt('--arms', null)
// --only narrows the matrix to one task (prefix match), which is how the A/A smoke runs 2 cells
// instead of 124. A plan may pin it (aaplacebo-smoke does); the flag overrides.
const onlyArg = opt('--only', null)
// --extra-gateway-flag <flag> appends ONE flag to every provider's gateway invocation, and is
// recorded in collection.json so the treatment is recoverable from the data rather than from
// which launcher started it. It exists so a cache-treatment A/B can be run WITHOUT editing the
// flag table in tools/collect-gateway.mjs, which IS the treatment and which tests pin. The
// Anthropic static breakpoints are asymmetric - they mark the LAST TOOL, and PTC presents 1 tool
// against native's 24, so PTC's cacheable prefix falls under Haiku's 4,096-token minimum and is
// never cached at all. This flag is how that gets tested instead of assumed.
const extraGwFlags = opt('--extra-gateway-flag', null)
const gwSilenceMin = Number(opt('--gateway-silence-min', 5))
const matrixSilenceMin = Number(opt('--matrix-silence-min', DEFAULT_MATRIX_SILENCE_MIN))
// THE OTHER HALF OF THE WATCHDOG. Both silence rules stand down once the matrix is complete, so that
// a runner doing its local backup and commit is not killed. Nothing covered 'complete and never
// exits': on 2026-10-07 luna finished at 19:24:50Z and the collector waited 2 h 45 min for a runner
// that had no child processes and no work left. See tools/exit-guard.mjs.
const runnerExitMin = Math.max(1, Number(opt('--runner-exit-min', 15)))
const backupEvery = String(Math.max(0, Number(opt('--backup-every', 25))))
// A TRANSIENTLY STARVED HARNESS GETS ANOTHER GO. On 2026-10-05 openhands made ZERO gateway requests
// while a second collector ran beside this one - two openhands instances cannot coexist - and the
// matrix refused to start. Refusing was correct; having no way to wait out a transient was not.
const preflightAttempts = Math.max(1, Number(opt('--preflight-attempts', 3)))
const preflightRetryMs = Math.max(0, Number(opt('--preflight-retry-sec', 45))) * 1000
const skipCredits = has('--skip-credit-check')
const noAlert = has('--no-alert')
const NO_ALERT = noAlert

// ------------------------------------------------------------------ plans
const PLANS = {
  batch1: {
    label: 'batch 1 reproduction',
    tasksDir: 'tasks', tasks: 31, arms: 10, seeds: 2,
    note: '31 tasks x 10 arms x 2 seeds = 620 cells, per provider',
  },
  hard: {
    label: 'hard suite',
    tasksDir: 'tasks-hard', tasks: 24, arms: 10, seeds: 1,
    note: '24 tasks x 10 arms = 240 cells, per provider',
  },
  pilot: {
    label: 'bounded pilot',
    tasksDir: 'tasks', tasks: 31, arms: 2, seeds: 1,
    note: '31 tasks x the two presentation arms x 1 seed = 62 cells, per provider',
  },
  batchb: {
    label: 'replication suite',
    tasksDir: 'tasks-b', tasks: 40, arms: 10, seeds: 2,
    note: '40 tasks x 10 arms x 2 seeds = 800 cells, per provider. DO NOT RUN before tasks-b/PLAN.md is ratified and a cost ceiling is derived from observed batch-1 per-cell costs.',
  },
  // The external-harness retention pilot on Anthropic's NATIVE Messages path. The plan is DATA in
  // its own module so its arithmetic and pre-declared sample can be tested; see
  // tools/retention-pilot-plan.mjs and notes/records/RETENTION-PILOT-2026-10-10.md.
  retentionpilot: RETENTION_PILOT_PLAN,
  'retentionpilot-smoke': RETENTION_PILOT_SMOKE,
  'retentionpilot-smoke-opencode': RETENTION_PILOT_SMOKE_OPENCODE,
  'retentionpilot-control': RETENTION_PILOT_CONTROL,
  // The corrected A/A placebo. Its own module owns the plan, the cell arithmetic and the
  // byte-identity workdir rule; see tools/aa-plans.mjs and notes/plans/AA-PLACEBO-PLAN.md.
  ...AA_PLANS,
  // The randomised-order re-run (notes/plans/RERUN-PLAN.md): the central pair counterbalanced, and the
  // interleaved A/A. See tools/rerun-plans.mjs.
  ...RERUN_PLANS,
}
if (!planName || !PLANS[planName]) {
  console.error('usage: node tools/collect.mjs --plan <' + Object.keys(PLANS).join('|') + '> [--providers cheap|' + Object.keys(PROVIDERS).join('|') + '] [--max-cost N]')
  console.error('')
  for (const [k, p] of Object.entries(PLANS)) console.error('  ' + k.padEnd(8) + p.label + ' - ' + p.note)
  process.exit(2)
}
const plan = PLANS[planName]
plan.cells = plan.tasks * plan.arms * plan.seeds

// THE ARM SET, from data/milestone-4 - the one surviving batch-1-shaped matrix.
//
// glm-flash's matrix ran 5 arms: dsh:native, dsh:ptc, dsh:native-opt, dsh:ptc-opt, opencode.
// Batch 1's 10 arms are those five PLUS dsh:native-terse, dsh:ptc-terse and the other three
// external harnesses: conditions/arms.mjs declares 6 DSH arms, and every external harness is
// one arm. 6 + 4 = 10, and 31 x 10 x 2 = 620. Verified against the surviving runs.jsonl, not
// remembered.
const HARNESSES_DEFAULT = ['dsh', 'opencode', 'cline', 'openhands', 'goose']
// A plan may pin its own harness set (the Anthropic-native retention pilot runs two pilot-only
// harness ids and no dsh). Without a plan field this is exactly the old behaviour.
const harnesses = harnessArg ? [harnessArg] : (plan.harnesses ?? HARNESSES_DEFAULT.slice())
plan.cells = plan.tasks * (6 + (harnesses.length - 1)) * plan.seeds
// THE ARM COUNT THE SIGN-OFF PRINTS MUST BE THE ARM COUNT THE RUN USES. With --arms the cell count
// came from the subset while the breakdown line kept saying the full ten: a 160-cell smoke signed off
// as "40 tasks x 10 arms x 2 seeds", two real numbers answering different questions.
const armCount = armsArg ? armsArg.split(',').filter(Boolean).length : (6 + harnesses.length - 1)
// An explicit arm subset IS the cell count - 31 tasks x 2 arms x 1 seed = 62 - which is what makes
// a bounded pilot's verify stage check the run it actually launched.
if (armsArg) plan.cells = plan.tasks * armsArg.split(',').filter(Boolean).length * plan.seeds
// THE A/A PLANS PIN THEIR OWN ARM LIST AND PASS COUNT. The harness-derived arm count above reads
// ten arms for a plan that has one, and the pass count multiplies the cells; both come from the
// plan, in one place (tools/aa-plans.mjs), so the ceiling, the runner and the verify agree.
if (plan.armsList) plan.cells = aaCells(plan)
// A re-run plan owns its arithmetic too: a twin plan runs its one arm twice.
if (RERUN_PLANS[planName]) plan.cells = rerunCells(plan)
const passes = plan.passes ?? 1
const effectiveArms = armsArg ?? (plan.armsList ? plan.armsList.join(',') : null)
const cellsPerPass = plan.cells / passes
// The sign-off line must describe the run it launched, not the harness-derived default.
const displayArms = plan.armsList ? plan.armsList.length * (plan.twin ? 2 : 1) : armCount
// --counterbalance / --aa-twin for a re-run plan; nothing for every other plan.
const runnerFlags = RERUN_PLANS[planName] ? rerunRunnerFlags(plan) : []

// ------------------------------------------------------------------ provider specs
// THE GATEWAY FLAGS LIVE IN tools/collect-gateway.mjs, so that they can be TESTED.
// They are the treatment, and on 2026-10-02 the zai entry was missing --max-tokens-ceiling 32768:
// DSH sends max_tokens=256000, z.ai accepts [1,131072], and every DSH preflight request 400'd
// while the other four harnesses passed. A flag list that only this file can see is a flag list
// nothing can check. See collect-gateway.test.mjs for the evidence behind each entry.

const wanted = onlyProviders === 'cheap' ? CHEAP_ORDER.slice()
  : onlyProviders.split(',').map((s) => s.trim()).filter(Boolean)
for (const p of wanted) {
  if (!GATEWAY[p]) {
    console.error('unknown provider "' + p + '". Known: ' + Object.keys(GATEWAY).join(', ') + ', or "cheap" for ' + CHEAP_ORDER.join('+'))
    process.exit(2)
  }
}
// THE RULE ABOUT ANTHROPIC, enforced rather than written down: never spend on it until a
// complete, verified, cheap matrix exists end to end.
// EVERY anthropic* PROVIDER, not the one whose id is literally 'anthropic'. The single-id test let
// `--providers anthropic-sonnet` past the only check standing between this pipeline and the most
// expensive provider in the study - the same class as the sign-off bugs above: right answer, wrong
// question.
if (wanted.some((p) => p.startsWith('anthropic')) && !has('--i-know-anthropic-is-expensive')) {
  console.error('refusing to include Anthropic.')
  console.error('  Anthropic is ~95% of the money for the same 620 cells: $448.93 for batch 1')
  console.error('  against $22.90 for all four automatic-cache providers. The brief is explicit -')
  console.error('  never spend on Anthropic until the whole pipeline has produced a complete,')
  console.error('  verified, cheap matrix first.')
  console.error('  If that condition is met and you mean it, pass --i-know-anthropic-is-expensive.')
  process.exit(2)
}

const MATRIX_ID = opt('--matrix-id', 'c' + Date.now().toString(36))
const runRoot = resolve(opt('--out-root', join(repo, 'results')))
// THE HISTORICAL DIRECTORY NAMES, not nicer new ones.
//
// Every analysis tool in this repo reaches batch 1 through a hardcoded registry -
// tools/cost-panel.mjs:66-74 names ds-full, glm-flash/glm-terse/glm-harness, qwen-full,
// haiku-full, sonnet-full, luna-full - and tools/coverage.mjs, exclusions.mjs and
// panel-analysis.mjs all key off those same names. Collecting into "deepseek-batch1" would
// produce a perfectly good matrix that every downstream tool silently ignores, which is the
// failure mode this whole session is about: data that exists and is not read.
//
// GLM's three shards are NOT reproduced as three shards. They were an accident of collection
// order - the terse arms and the cross-harness arms were added after the first five had already
// run - and re-creating the accident on purpose would produce three partial matrices instead of
// one complete one. GLM collects into glm-flash/ with all ten arms; cost-panel's registry entry
// for the shards is left alone and will simply find nothing there.
const HISTORICAL_DIR = {
  deepseek: 'ds-full', zai: 'glm-flash', qwen: 'qwen-full', openai: 'luna-full',
  anthropic: 'haiku-full', 'anthropic-sonnet': 'sonnet-full',
}
const namePrefix = opt('--name-prefix', '')
const outDirs = Object.fromEntries(wanted.map((p) => [p,
  join(runRoot, namePrefix + (HISTORICAL_DIR[p] ?? (p + '-batch1')))]))

// ------------------------------------------------------ output directory ownership
//
// A MATRIX OUTPUT DIRECTORY IS OWNED BY THE PLAN THAT CREATED IT, and the ownership is checked
// before any stage runs - including under --dry-run, which is where a collision costs nothing.
//
// Without this, `--plan hard` resolved through the same HISTORICAL_DIR registry as batch 1 and
// wrote into results/ds-full, the signed-off 620-cell matrix, with --resume reading 240 hard-suite
// cells as work already done. Caught by hand on 2026-10-04 seconds before launch (the pilot was
// isolated with --name-prefix hardpilot-); the defect was left open and the handover named it the
// first thing to fix. This is the fix, and it is general: it asks each directory which plan owns
// it rather than naming the plans that are known to collide today.
for (const p of wanted) {
  const v = outputDirVerdict({
    dir: outDirs[p], plan: planName, cells: plan.cells, ownerName: HISTORICAL_DIR[p] ?? (p + '-batch1'),
    namePrefix, collection: readCollection(outDirs[p]), hasRuns: existsSync(join(outDirs[p], 'runs.jsonl')),
  })
  if (!v.ok) {
    console.error('')
    console.error('REFUSING TO START: ' + v.message)
    console.error('')
    process.exit(2)
  }
}

// ------------------------------------------------------------------ stage machinery
const STAGES = []
function stage (name, fn) {
  STAGES.push({ name, fn })
}
class StageFailed extends Error {}

function say (s = '') { console.log(s) }
function head (s) { say(''); say('== ' + s) }
function step (s) { say('   ' + s) }

import { mergeStatus } from './status-merge.mjs'

const statusPath = join(repo, 'results', '_scratch', 'pipeline-status.json')
function writeStatus (patch) {
  try {
    mkdirSync(dirname(statusPath), { recursive: true })
    const cur = existsSync(statusPath) ? JSON.parse(readFileSync(statusPath, 'utf8')) : {}
    // A previous run's failure must not sit in the status file forever. It did: the file showed
    // "failedStage: preflight every harness" through a matrix that was running perfectly,
    // because nothing ever cleared it. Clearing on write is the fix; the caller re-sets it.
    // One merge rule, in one place, so a new run cannot inherit the last run's numbers
    // (notes/defects/LIVE-DEFECTS-2026-10-04.md section 1).
    const next = mergeStatus(cur, patch)
    writeFileSync(statusPath, JSON.stringify(next, null, 2) + '\n')
  } catch {}
}
/**
 * Raise an alert in the credit window.
 *
 * `state` IS REQUIRED IN SPIRIT, and must be 'empty' ONLY for a genuine credit failure. It used
 * to be omitted, and credit-alert.mjs defaulted the missing field to 'empty' - so the spend
 * meter, which is a local budget stop and says nothing about the provider, was displayed as
 * "provider out of credit" in flashing red for a provider that was funded the whole time. Pass
 * 'warn' for anything that is not a credit failure.
 */
function alertProvider (provider, reason, state = 'warn') {
  if (NO_ALERT) return
  try {
    const req = { provider, reason, state }
    fetch('http://127.0.0.1:8899/alert', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req) })
      .catch(() => {})
  } catch {}
}

/** The task with the smallest fixture - the same rule tools/preflight.mjs uses. */
function cheapestTask (dir) {
  let best = null, bestN = Infinity
  for (const d of readdirSync(join(repo, dir))) {
    const t = join(repo, dir, d, 'task.json')
    if (!existsSync(t)) continue
    let n = 0
    const walk = (p) => {
      let es; try { es = readdirSync(p, { withFileTypes: true }) } catch { return }
      for (const e of es) {
        const q = join(p, e.name)
        if (e.isDirectory()) { if (e.name !== '.git') walk(q); continue }
        try { n += readFileSync(q, 'utf8').split('\n').length } catch {}
      }
    }
    walk(join(repo, dir, d, 'fixture'))
    if (n < bestN) { bestN = n; best = d }
  }
  return best
}

function freePort (start) {
  return new Promise((res) => {
    const srv = createServer()
    srv.once('error', () => res(freePort(start + 1)))
    srv.listen(start, '127.0.0.1', () => { const p = srv.address().port; srv.close(() => res(p)) })
  })
}

/**
 * The upstream key for a provider, resolved IN THIS PROCESS so it never reaches a command
 * line, a process listing or a background job's label.
 *
 * THE MERGE LIVES IN tools/keys.mjs AND IS NOT REPEATED HERE. collect.mjs used to carry its own
 * copy, and the copy was the broken one: it merged { ...keys.json, ...FILL-IN-KEYS.json }, so
 * the PASTE_ placeholders in the FILL-IN-KEYS.json TEMPLATE sat on top of the real keys. Every
 * provider but DeepSeek resolved to null, and on 2026-10-02 the GLM matrix stopped at stage 2
 * with "no usable key for zai" one stage after check-providers.mjs reached z.ai and called it
 * FUNDED. Two implementations of one rule, disagreeing, is the defect; there is now one, and
 * tools/keys.test.mjs pins the rule that a placeholder can never shadow a real key.
 *
 * The gateways must still never be handed a null key: a gateway with no upstream key 503s every
 * run, which then reads as a harness failure.
 */

function sh (cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: repo, encoding: 'utf8', ...opts })
  return { status: r.status, out: ((r.stdout ?? '') + (r.stderr ?? '')), error: r.error }
}

// ------------------------------------------------------------------ state
const gateways = new Map()   // provider -> { port, url, log, child, pid, stats }
const spend = { total: 0, byProvider: {}, offsets: new Map(), priced: 0, unpriced: new Set() }
let child = null

// ===================================================================== STAGES
stage('plan and cost ceiling', async () => {
  head('0. plan and cost ceiling')
  step('plan        : ' + planName + '  (' + plan.note + ')')
  step('providers   : ' + wanted.join(', '))
  step('matrix id   : ' + MATRIX_ID)
  const perCell = (p) => rerunCostPerCell(plan, p, GATEWAY[p].costPerRun)
  const est = wanted.reduce((n, p) => n + plan.cells * perCell(p), 0)
  const margin = wanted.reduce((n, p) => n + recommend(p, { batch1: planName === 'batch1', hard: planName === 'hard' }).recommendedUsd, 0)
  say('')
  say('   ' + 'provider'.padEnd(22) + 'model'.padEnd(20) + 'runs'.padStart(6) + 'est. cost'.padStart(12))
  step('cells       : ' + plan.cells + '  (' + plan.tasks + ' tasks x ' + displayArms + ' arms x ' + plan.seeds + ' seeds' +
    (passes > 1 ? ' x ' + passes + ' passes' : '') + ')')
  step('harnesses   : ' + harnesses.join(', '))
  for (const p of wanted) {
    say('   ' + PROVIDERS[p].label.padEnd(22) + GATEWAY[p].model.padEnd(20) + String(plan.cells).padStart(6) +
      ('$' + (plan.cells * perCell(p)).toFixed(2)).padStart(12))
  }
  say('   ' + '-'.repeat(60))
  say('   ' + 'TOTAL'.padEnd(42) + String(plan.cells * wanted.length).padStart(6) + ('$' + est.toFixed(2)).padStart(12))
  say('')
  step('estimate basis: per-run costs re-priced from archived tokens at the corrected cards')
  step('                (tools/credit-plan.mjs; NOT the stale load-plan/master-budget figures)')
  const ceiling = maxCost ?? Math.ceil(est * 1.5)
  if (maxCost === null) step('--max-cost not given; using 1.5x the estimate: $' + ceiling)
  if (ceiling < est) throw new StageFailed('the ceiling $' + ceiling + ' is below the estimate $' + est.toFixed(2) + '. Nothing started.')
  writeStatus({ matrixId: MATRIX_ID, plan: planName, providers: wanted, stage: 'plan', spendUsd: 0, ceilingUsd: ceiling, note: null })
  say('   ceiling     : $' + ceiling + '   (hard stop; the meter kills the matrix at 90% of it)')
  return { est, ceiling }
})

let ceiling = 0
stage('credit check every provider', async () => {
  head('1. credit check')
  if (skipCredits) { step('SKIPPED by --skip-credit-check. This violates pre-registration; recorded in the status file.'); return }
  const r = sh(process.execPath, [join(here, 'check-providers.mjs')])
  process.stdout.write(r.out.split('\n').map((l) => '   ' + l).join('\n'))
  // Keep the machine-readable result where the alert window can find it.
  try {
    const providers = {}
    for (const p of wanted) {
      const line = r.out.split('\n').find((l) => new RegExp(p, 'i').test(l)) ?? ''
      const bal = /balance[^0-9]*([0-9]+\.[0-9]+)/i.exec(line) ?? /\$([0-9]+\.[0-9]+)/.exec(line)
      providers[p] = {
        status: /empty|insufficient|no credit|EMPTY/i.test(line) ? 'empty' : (/funded|ok|200/i.test(line) ? 'funded' : 'unknown'),
        balanceUsd: bal ? Number(bal[1]) : null, raw: line.trim(),
      }
    }
    writeFileSync(join(repo, 'results', '_scratch', 'providers.json'), JSON.stringify(providers, null, 2) + '\n')
  } catch {}
  if (r.status !== 0) {
    const empty = wanted.filter((p) => {
      const line = r.out.split('\n').find((l) => new RegExp(p, 'i').test(l)) ?? ''
      return /empty|insufficient|no credit/i.test(line)
    })
    for (const p of empty) alertProvider(p, 'check-providers reports no usable credit before the matrix started', 'empty')
    throw new StageFailed('a provider failed its credit check (exit ' + r.status + ')' +
      (empty.length ? ': ' + empty.join(', ') : '') + '. Nothing started. Top up, then re-run.')
  }
})

stage('start the gateways', async () => {
  head('2. gateways')
  let port = 8787
  for (const p of wanted) {
    const g = GATEWAY[p]
    const used = [...gateways.values()].map((x) => x.port)
    port = await freePort(port + 1)
    while (used.includes(port)) port = await freePort(port + 1)
    const log = join(runRoot, MATRIX_ID + '-' + p + '-gateway.jsonl')
    mkdirSync(dirname(log), { recursive: true })
    const outLog = join(runRoot, MATRIX_ID + '-' + p + '-gateway.out.log')
    const args = [join(here, 'measure-gateway.mjs'), '--port', String(port), '--upstream', g.upstream,
      '--log', log, ...g.flags, ...(extraGwFlags ? extraGwFlags.split(',').map((s) => s.trim()) : [])]
    // The workspace header belongs to the ENTRY, not to the provider's name. This used to read
    // 'if (p === "anthropic")', so when a second Anthropic entry was added for Sonnet the rule
    // silently did not apply and preflight died with "This API key is not scoped to a workspace,
    // so this request must include the anthropic-workspace-id header".
    if (g.needsWorkspaceId) {
      const ws = sh(process.execPath, ['-e', "import('./tools/keys.mjs').then(m=>process.stdout.write(m.loadKeys()['anthropic_workspace']||''))"])
      if (ws.out.trim()) args.push('--workspace-id', ws.out.trim())
    }
    // THE UPSTREAM KEY GOES IN THE CHILD'S ENVIRONMENT, NEVER ON ITS COMMAND LINE.
    // scripts/start-provider.ps1 says why: a key passed as --api-key appears in the process
    // listing, in a background job's label, and in any log that records the invocation. This
    // reads it inside this process and hands it over as DEEPSEEK_API_KEY, which is the one env
    // var measure-gateway.mjs reads for the upstream key on every provider.
    // Pass repo explicitly: this reads .keys.json from the working tree, not from whatever
    // directory the shell happened to be in.
    const upstreamKey = resolveUpstreamKey(p, { repo })
    if (!upstreamKey) throw new StageFailed('no usable key for ' + p + ' in .keys.json / FILL-IN-KEYS.json. A gateway without an upstream key 503s every run, which then reads as a harness failure.')
    const fd = openSync(outLog, 'a')
    const c = spawn(process.execPath, args, { cwd: repo, detached: true, stdio: ['ignore', fd, fd],
      env: { ...process.env, DEEPSEEK_API_KEY: upstreamKey } })
    c.unref()
    const rec = { port, url: 'http://127.0.0.1:' + port, log, outLog, args, pid: c.pid, provider: p }
    gateways.set(p, rec)
    step(p.padEnd(10) + 'port ' + String(port).padEnd(6) + 'log ' + log.replace(repo + '\\', ''))
    step(''.padEnd(10) + 'cache: ' + g.cacheMode)
  }
  // Wait for each to answer /__stats with a usable upstream key. A gateway that is up but has
  // no key 503s every run, which reads as a harness failure.
  for (const [p, g] of gateways) {
    let ok = false
    for (let i = 0; i < 40; i++) {
      try {
        const s = await (await fetch(g.url + '/__stats')).json()
        g.stats = s
        if (s.upstreamKeyConfigured === false) throw new StageFailed(p + ' gateway has NO usable upstream key - every run would 503')
        ok = true
        break
      } catch (e) { if (e instanceof StageFailed) throw e; await new Promise((r) => setTimeout(r, 500)) }
    }
    if (!ok) throw new StageFailed(p + ' gateway did not come up on port ' + g.port + '; see ' + g.outLog)
    const enforced = g.stats.enforced?.model ?? null
    step(p.padEnd(10) + 'up    enforcing ' + enforced + (enforced !== GATEWAY[p].model ? '   *** MISMATCH: wanted ' + GATEWAY[p].model + ' ***' : ''))
    if (enforced !== GATEWAY[p].model) throw new StageFailed(p + ': gateway enforces ' + enforced + ' but the matrix needs ' + GATEWAY[p].model)
  }
})

stage('preflight every harness', async () => {
  head('3. preflight (every harness, not just dsh)')
  for (const [p, g] of gateways) {
    // Unique per matrix. A fixed name collided with the previous run's probe directory, which
    // now CONTAINS A runs.jsonl - so safe-fs refused to remove it, correctly, and the pipeline
    // stopped rather than delete a run record. Fresh directory, nothing to delete.
    // EACH ATTEMPT GETS ITS OWN PROBE DIRECTORY, because safe-fs refuses to clean one that already
    // holds run records - the guard that stopped the pipeline rather than delete a run record. A
    // retry into the same directory would hit that refusal, so the attempt number is in the name.
    const r = await retry(preflightAttempts, preflightRetryMs, async (attempt) => {
      const out = join(repo, 'results', '_scratch', 'preflight-' + p + '-' + MATRIX_ID + (attempt > 1 ? '-attempt' + attempt : ''))
      const args = [join(here, 'preflight.mjs'), '--gateway', g.url, '--log', g.log, '--out', out, '--tasks', plan.tasksDir]
      // The plan's own harness set, not the study default: the Anthropic-native pilot preflights
      // opencode-anthropic and cline-anthropic, and preflighting five unrelated harnesses against
      // Anthropic costs real money for no evidence about the pilot (measured 2026-10-10: $0.51).
      if (harnessArg) args.push('--harness', harnessArg)
      else for (const h of (plan.harnesses ?? [])) args.push('--harness', h)
      const rr = sh(process.execPath, args)
      if (attempt > 1) step('preflight attempt ' + attempt + ' for ' + p + ':')
      say(rr.out.split('\n').filter(Boolean).map((l) => '   ' + l).join('\n'))
      return { ok: rr.status === 0, status: rr.status }
    })
    if (!r.ok) throw new StageFailed('preflight failed for ' + p + ' after ' + r.attempts +
      ' attempt(s). A harness that measures nothing is worse than an absent one, because its zeros read as results.')
    if (r.attempts > 1) step('preflight passed for ' + p + ' on attempt ' + r.attempts + ' (the earlier one was transient)')
  }
})

stage('pilot', async () => {
  head('4. pilot (cheapest task, all arms)')
  const p = wanted[0]
  const g = gateways.get(p)
  const out = join(repo, 'results', '_scratch', 'pilot-' + p)
  // ONE TASK, NOT THE WHOLE SUITE.
  //
  // The first version omitted --only, and the "pilot" ran all 31 tasks x 10 arms - 310 runs and
  // ~$2.70 - before anyone noticed, into a scratch directory, so the spend bought nothing. A
  // pilot exists to be the CHEAPEST place a wrong flag is found; one that costs half a matrix
  // is not a pilot. Measured live before it was stopped: 32 runs, $0.1575, 32/32 solved.
  const pilotTask = onlyArg ?? plan.only ?? cheapestTask(plan.tasksDir)
  step('pilot task   : ' + pilotTask + '  (smallest fixture, the same rule preflight uses)')
  // THE PILOT JUDGES ITS OWN RECORDS ONLY. results/_scratch/pilot-<provider>/runs.jsonl is appended to
  // by every pilot ever run on that provider (154 records on DeepSeek by 2026-10-11), and this stage
  // used to read all of them: one failure record from an earlier, stopped pilot then failed every
  // later pilot forever, however clean it was. Each pilot now has its own matrix id and only its
  // records are checked.
  const pilotMatrixId = MATRIX_ID + '-pilot-' + p
  const args = [join(here, 'run-experiment.mjs'), '--tasks', plan.tasksDir, '--only', pilotTask, '--seeds', '1', '--jobs', jobs,
    '--out', out, '--gateway', g.url, '--model', GATEWAY[p].model, '--matrix-id', pilotMatrixId, '--no-commit']
  for (const h of harnesses) args.push('--harness', h)
  if (effectiveArms) args.push('--arms', effectiveArms)
  if (plan.aaWorkdir) args.push('--aa-workdir')
  args.push(...runnerFlags)
  // The pilot is the only place a wrong flag is cheap: one task, ~10 runs.
  const r = sh(process.execPath, args, { env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' } })
  say(r.out.split('\n').slice(-14).filter(Boolean).map((l) => '   ' + l).join('\n'))
  if (r.status !== 0) throw new StageFailed('the pilot matrix did not complete (exit ' + r.status + ')')
  const rf = join(out, 'runs.jsonl')
  if (!existsSync(rf)) throw new StageFailed('the pilot produced no runs.jsonl - records are not landing')
  const runs = readFileSync(rf, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
    .filter((r) => r.matrixId === pilotMatrixId)
  if (!runs.length) throw new StageFailed('the pilot produced no records under its own matrix id ' + pilotMatrixId)
  const solved = runs.filter((r) => r.solved).length
  step('pilot runs   : ' + runs.length + ', solved ' + solved + ' (' + (100 * solved / runs.length).toFixed(0) + '%)')
  const errored = runs.filter((r) => r.error)
  if (errored.length) {
    step('pilot ERRORS : ' + errored.length)
    for (const e of errored.slice(0, 3)) step('   ' + e.harness + '/' + e.arm + ': ' + String(e.error).split('\n')[0].slice(0, 160))
    throw new StageFailed('the pilot produced failure records; a matrix launched now would spend money on a broken path')
  }
  // Cost must be NON-ZERO and explained. A pilot that cost nothing measured nothing.
  const before = spend.offsets.get(g.log) ?? 0
  const cost = meterGateway(p)
  step('pilot cost   : $' + cost.toFixed(6) + '   (re-derived from gateway usage, not from a summary)')
  if (cost <= 0) throw new StageFailed('the pilot cost $0.00 - either nothing reached the provider or nothing was logged. Do not start a matrix.')
  if (solved === 0) step('pilot WARN   : zero solves on the cheapest task. Sane for a hard task, suspicious for example-fix.')
})

stage('the matrix, watched', async () => {
  head('5. matrix')
  for (const p of wanted) {
    const g = gateways.get(p)
    // PASSES ARE SEPARATE MATRICES. Each pass is its own output directory and its own matrix id, so
    // --resume never reads one pass as work already done in the other, and the record keeps a
    // unique runId. What the model SEES is held identical by --aa-workdir.
    for (let pass = 1; pass <= passes; pass++) {
      const out = passes > 1 ? join(outDirs[p], 'pass' + pass) : outDirs[p]
      mkdirSync(out, { recursive: true })
      const runsLog = join(out, 'runs.jsonl')
      const matrixId = MATRIX_ID + '-' + p + (passes > 1 ? '-p' + pass : '')
      const args = [join(here, 'run-experiment.mjs'), '--tasks', plan.tasksDir, '--seeds', String(plan.seeds),
        '--jobs', jobs, '--out', out, '--gateway', g.url, '--model', GATEWAY[p].model,
        '--matrix-id', matrixId, '--resume', '--backup-every', backupEvery, '--commit']
      for (const h of harnesses) args.push('--harness', h)
      if (effectiveArms) args.push('--arms', effectiveArms)
      if (plan.aaWorkdir) args.push('--aa-workdir')
      args.push(...runnerFlags)
      // --only narrows to ONE task (the smoke), and it overrides the plan's pre-declared sample:
      // passing both would intersect to nothing, because the smoke task is not in the sample.
      if (onlyArg ?? plan.only) args.push('--only', onlyArg ?? plan.only)
      else if (plan.tasksList) args.push('--task-list', plan.tasksList.join(','))
      writeFileSync(join(out, 'collection.json'), JSON.stringify({
        matrixId, provider: p, plan: planName, tasksDir: plan.tasksDir,
        seeds: plan.seeds, jobs, cells: cellsPerPass, passes, pass, harnesses, gateway: g.url, gatewayArgs: g.args,
        extraGatewayFlags: extraGwFlags,
        enforced: g.stats?.enforced ?? null, cacheMode: GATEWAY[p].cacheMode,
        launchedBy: 'tools/collect.mjs', launchedAt: new Date().toISOString(),
      }, null, 2) + '\n')
      step('')
      step(p + (passes > 1 ? ' pass ' + pass + '/' + passes : '') + ' -> ' + out.replace(repo + '\\', '') + '   (--resume: never deletes, only continues)')
      const rc = await runWatched(p, args, out)
      if (rc !== 0) throw new StageFailed(p + ' matrix exited ' + rc + '. Completed runs are on disk; re-run the same command with --resume.')
    }
  }
})

async function runWatched (p, args, out) {
  const g = gateways.get(p)
  const runsLog = join(out, 'runs.jsonl')
  const startedAt = Date.now()
  // THE SILENCE CLOCK STARTS NOW. It used to start from the mtime of an existing runs.jsonl, so a
  // matrix being resumed after a reboot was already hours "silent" on the first tick and the
  // watchdog killed it about fifteen seconds in - twice, on 2026-10-04. See matrix-watchdog.mjs.
  const clock = silenceClock({ startedAt })
  let lastRunTs = clock.lastRunTs
  let completeSince = null
  let killed = null
  const c = spawn(process.execPath, args, {
    cwd: repo, stdio: ['ignore', 'inherit', 'inherit'],
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
  })
  child = c
  const timer = setInterval(() => {
    try {
      meterGateway(p)
      const now = Date.now()
      if (existsSync(runsLog)) lastRunTs = Math.max(lastRunTs, statSync(runsLog).mtimeMs)
      // THE WATCHDOG STANDS DOWN ONCE THE MATRIX IS COMPLETE.
      //
      // Both watchdogs below infer "stuck" from silence, and silence has a second, benign
      // cause: the runner has finished every cell and is doing LOCAL work - the final
      // incremental backup of a 30 MB results tree, the snapshot, the commit. None of that
      // touches the gateway, so on 2026-10-02 the OpenAI matrix was killed 5 minutes after its
      // last request, while it was writing its own backup, and collect.mjs reported
      //   "STOPPED at stage the matrix, watched: openai matrix exited 1"
      // for a matrix that had already written all 620 records, backed them up and committed
      // them. The data was fine; the pipeline lied about it, and skipped stages 6 and 7.
        const complete = countRuns(runsLog) >= plan.cells
        if (complete && completeSince == null) completeSince = now
        // THE GATEWAY RULE TAKES A DURATION, NOT A BOOLEAN. The boolean version was filled from a
        // helper that returned TRUE WHEN THE LOG WAS FRESH, so it killed a healthy matrix five
        // minutes in. gatewayIdleMs() reads the log's own mtime and returns 0 if it cannot.
        killed = silenceVerdict({ now, lastRunTs, gatewayIdleMs: gatewayIdleMs(g.log, now), matrixSilenceMin, gwSilenceMin, complete }) ??
        exitGuardVerdict({ now, completeSinceMs: completeSince, lastRunTs, stallMs: runnerExitMin * 60000 })
      const limit = ceiling * 0.9
      if (spend.total >= limit) {
        // 'warn', NOT 'empty': the provider did nothing wrong and needs no top-up. What ran out
        // was the budget THIS RUN was given.
        alertProvider(p, 'matrix stopped by the spend meter: $' + spend.total.toFixed(2) + ' of a $' + ceiling + ' ceiling', 'warn')
        killed = 'spend meter: $' + spend.total.toFixed(2) + ' has reached 90% of the $' + ceiling + ' ceiling'
      }
      if (killed) {
        console.error('')
        console.error('  *** STOPPING THE MATRIX: ' + killed + ' ***')
        console.error('  spend so far: $' + spend.total.toFixed(3) + '   runs on disk: ' + countRuns(runsLog))
        try { process.kill(c.pid) } catch {}
        writeStatus({ stage: 'matrix', note: killed, spendUsd: spend.total, provider: p })
        clearInterval(timer)
      } else {
        // Publish the meter while the matrix runs. Without this the status file said
        // spendUsd: 0 for the whole run, so the alert window and any human watching it were
        // blind to the one number that decides whether the matrix gets killed.
        writeStatus({ stage: 'matrix', provider: p, spendUsd: Number(spend.total.toFixed(4)),
          ceilingUsd: ceiling, runs: countRuns(runsLog), note: null })
        process.stdout.write('.')
      }
    } catch (e) { /* the watchdog must never take the matrix down */ }
  }, 15000)

  const rc = await new Promise((res) => c.on('close', (code) => res(code ?? 1)))
  clearInterval(timer)
  child = null
  const mins = ((Date.now() - startedAt) / 60000).toFixed(1)
  step(p + ': exit ' + rc + ' after ' + mins + ' min, ' + countRuns(runsLog) + ' records, $' + spend.byProvider[p]?.toFixed?.(4) + ' this provider')
  if (killed) {
    console.error('  stopped because: ' + killed)
    // A kill that lands on a finished matrix is not a failed matrix. The cell count is the
    // arbiter, and the verify stage will check it again independently.
    if (countRuns(runsLog) >= plan.cells) {
      console.error('  ...but all ' + plan.cells + ' cells are already on disk and the runner had')
      console.error('  written its summary and committed. Continuing to verify rather than re-running.')
      return 0
    }
  }
  return killed ? 1 : rc
}

function countRuns (p) { try { return readFileSync(p, 'utf8').split('\n').filter(Boolean).length } catch { return 0 } }

/** Read new gateway records, price them from USAGE, and add to the meter. */
function meterGateway (p) {
  const g = gateways.get(p)
  let n = 0
  let cost = 0
  try {
    const size = statSync(g.log).size
    const from = spend.offsets.get(g.log) ?? 0
    if (size <= from) return 0
    const fd = readFileSync(g.log, 'utf8')
    const chunk = fd.slice(from)
    spend.offsets.set(g.log, size)
    for (const line of chunk.split('\n')) {
      if (!line.trim()) continue
      let o; try { o = JSON.parse(line) } catch { continue }
      n++
      // PRICE FROM USAGE. The gateway also writes cost.billedUsd, but that is one tool's
      // arithmetic and defect 5 of REVIEW-3 lives in it; recomputing here is the cross-check.
      const model = o.model ?? GATEWAY[p].model
      const c = costOf(model, o.usage ?? {})
      cost += c
      spend.priced++
    }
  } catch {}
  if (cost > 0) {
    spend.total += cost
    spend.byProvider[p] = (spend.byProvider[p] ?? 0) + cost
  }
  return cost
}

stage('verify', async () => {
  head('6. verify')
  let bad = 0
  for (const p of wanted) {
    for (let pass = 1; pass <= passes; pass++) {
    const out = passes > 1 ? join(outDirs[p], 'pass' + pass) : outDirs[p]
    const tag = p + (passes > 1 ? ' pass ' + pass + '/' + passes : '')
    const runsLog = join(out, 'runs.jsonl')
    if (!existsSync(runsLog)) { step(tag + ': NO records at ' + runsLog); bad++; continue }
    const runs = readFileSync(runsLog, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
    // CELLS, NOT RECORDS. A retried cell carries two records, so records-minus-planned goes
    // NEGATIVE: the hard pilot's sign-off read "241/240 cells" and "-1 cells are simply absent".
    // Both figures are real and they answer different questions; see tools/cell-counts.mjs.
    const cc = countCells(runs, { planned: cellsPerPass })
    const cells = cellsPerPass
    const byArm = {}
    for (const r of runs) byArm[r.arm] = (byArm[r.arm] ?? 0) + 1
    const short = Object.entries(byArm).filter(([, n]) => n < cells / Object.keys(byArm).length * 0.9)
    // ONE GATEWAY SCAN, THREE ANSWERS: spend, usable tokens, and the status of every request. The
    // spend-only scan this replaces (spendByRun) could not answer rule 9's second half, and a
    // second scan for it would read the same logs again. See tools/collect-verify.mjs.
    const gw = scanGatewayRuns(runRoot, { runIds: new Set(runs.map((r) => r.runId).filter(Boolean)) })
    const ex = rule9Exclusions(runs, gw.requestsByRun)
    const carried = carriedSummary(runs, { exclusions: ex, tokensByRun: gw.tokensByRun }, cells)
    // CELLS, NOT RECORDS, for the third time in this stage: a failure whose cell has since been re-run
    // successfully is RESOLVED, and counting it kept a completed 800-cell matrix unsigned on
    // 2026-10-07 - the same confusion that produced "241/240 cells". Only the STATUS clause is
    // dropped here: a textual rule 9 exclusion (a launch failure with no runId, say) is still a
    // failure whose cell needs a re-run, and dropping it would hide exactly that.
    const errs = unresolvedFailures(runs, { statusExcluded: ex.statusRecords })
    const resolvedErrs = runs.filter((r) => r.error).length - errs.length
    step('')
    step(p + ': ' + describeCells(cc, cells))
    for (const [a, n] of Object.entries(byArm).sort()) step('    ' + a.padEnd(24) + String(n).padStart(5) + (n < cells / Object.keys(byArm).length * 0.9 ? '   <-- SHORT' : ''))
    if (cc.retried) step('    RETRIED (one cell, more than one record): ' + cc.retriedCells.join(', '))
    if (cc.surplus) { step('    SURPLUS: ' + cc.surplus + ' cells beyond the plan - the file holds records from another plan'); bad++ }
    if (cc.absent) { step('    INCOMPLETE: ' + cc.absent + ' cells missing'); bad++ }
    if (short.length) { step('    UNBALANCED arms: ' + short.map(([a, n]) => a + '(' + n + ')').join(', ')); bad++ }
    if (resolvedErrs > 0) step('    resolved failure records: ' + resolvedErrs + ' (cell re-run successfully)')
    if (errs.length) { step('    FAILURE RECORDS: ' + errs.length + ' (each carries its command line and exit code)'); bad++ }
    const errIds = new Set(errs.map((r) => r.runId))
    // RULE 9, BOTH HALVES, IN THE OUTPUT. `ex` is the collector's copy of the analysis's own
    // verdict - one function, tools/exclusions.mjs - so the two layers can no longer disagree
    // about the same records. describeCells above counts RECORDS: on batchb-haiku it prints
    // 206/800 = 25.8% while the analysis carries 353 cells at 206/353 = 58.4%. The CARRIED line
    // reports the population every other tool uses; POPULATIONS closes the arithmetic on sight.
    if (ex.count) step('    ' + describeRule9Exclusions(ex))
    if (ex.count || carried.admittedWithoutUsage) {
      step('    ' + describeCarried(carried, cells))
      step('    POPULATIONS: ' + runs.length + ' records = ' + ex.count + ' rule-9 excluded + ' +
        carried.admittedWithoutUsage + ' without usable usage + ' + carried.records + ' carried')
    }
    // "ZERO UNEXPLAINED ZERO-COST RUNS", CHECKED PROPERLY.
    //
    // This used to read `!r.error && Number(r.durationMs ?? 0) === 0` under a comment about zero
    // COST. A run record carries no cost field and no token counts at all, so duration was a
    // proxy - and the wrong one: a run whose every request was rejected 4xx is FREE (a 4xx bills
    // nothing) yet takes real seconds, so it passed. That is exactly the failure mode this check
    // exists for - a harness that reaches nothing and whose zeros read as results.
    //
    // Cost lives in one place only: the gateway log, and ONE scan above carries it. Scanning EVERY
    // gateway log in the run root, not just this matrix's, because a resumed matrix gets a new
    // matrix id and therefore a new log while the earlier runs' usage stays in the old one;
    // reading only the current log would flag every already-complete run.
    //
    // A run is EXPLAINED by rule 9 - its own output naming an infrastructure fault, or every
    // request it made failing - or by an error record; never by this file's own arithmetic. Before
    // 2026-10-09 only `r.error` counted, so the collector called the account-limit runs on
    // results/batchb-haiku-full/runs.jsonl "ZERO-COST ... with no error record" while the analysis
    // excluded them (notes/defects/INCIDENT-haiku-account-limit-2026-10-09.md).
    const unexplained = unexplainedZeroCost(runs, { spent: gw.spent, exclusions: ex })
    if (unexplained.length) {
      step('    ZERO-COST runs with no error record: ' + unexplained.length +
        '  (no billable gateway usage and rule 9 does not explain them)')
      for (const u of unexplained.slice(0, 3)) step('      ' + u.runId)
      bad++
    }
    if (!errIds.size && cc.absent) step('    ' + cc.absent + ' cells are simply absent')
    // `solved` used to be a record count declared above; 71c4a0c replaced its printed use with
    // describeCells() and deleted the declaration, leaving this reference dangling - so every
    // matrix sign-off threw ReferenceError on its last statement. The stage's own sign-off counts
    // CELLS (a retried cell is one cell), so the status file reports the same number the line above
    // printed: cc.solvedCells.
    writeStatus({ stage: 'verify', provider: p, pass, records: runs.length, cells, solved: cc.solvedCells,
      carriedCells: carried.cells, carriedSolved: carried.solvedCells, rule9Excluded: ex.count,
      errors: errs.length, spendUsd: spend.total })
    }
  }
  if (bad) throw new StageFailed(bad + ' verification problem(s). The matrix is NOT signed off; fix and --resume.')
})

stage('commit and back up', async () => {
  head('7. commit and back up')
  const runFiles = []
  for (const p of wanted) for (let pass = 1; pass <= passes; pass++) {
    runFiles.push(join(passes > 1 ? join(outDirs[p], 'pass' + pass) : outDirs[p], 'runs.jsonl'))
  }
  const totalRuns = runFiles.reduce((n, f) => n + countRuns(f), 0)
  const b = sh(process.execPath, [join(here, 'backup-results.mjs'), '--snapshot', MATRIX_ID + ' ' + totalRuns + ' runs ' + wanted.join('+')])
  say(b.out.split('\n').filter(Boolean).map((l) => '   ' + l).join('\n'))
  if (b.status !== 0) throw new StageFailed('the backup failed (exit ' + b.status + '). The results exist in ONE place. Not signing off.')
  const git = (a) => sh('git', a)
  git(['add', '-A', 'results', 'data', 'analysis'])
  const msg = MATRIX_ID + ': ' + planName + ' ' + wanted.join('+') + ', ' + totalRuns + ' runs'
  // ASK GIT WHETHER ANYTHING IS STAGED; DO NOT PARSE ITS PROSE.
  //
  // This used to test /nothing to commit/i against git's output. Git says
  //   "nothing to commit, working tree clean"          when the tree is clean, but
  //   "nothing added to commit but untracked files present"   when any untracked file exists.
  // The second does not contain the phrase "nothing to commit", so on 2026-10-03 the qwen
  // sign-off threw "git commit failed" - after the runner had already committed all 621
  // records - purely because the credit-alert window had dropped a CREDIT-ALERT.md in the
  // repo root. The matrix was committed; the pipeline said it was not.
  //
  // The exit status of `git diff --cached --quiet` is the fact: 1 = staged changes exist,
  // 0 = nothing staged. Wording cannot break it.
  const staged = git(['diff', '--cached', '--quiet'])
  if (staged.status === 0) {
    step('committed: nothing new (nothing staged)')
  } else {
    const c = git(['commit', '-m', msg])
    if (c.status === 0) step('committed: ' + msg)
    else throw new StageFailed('git commit failed: ' + c.out.slice(-400))
  }
})

// ===================================================================== run
say('collect - ' + plan.label + ' - matrix ' + MATRIX_ID)
writeStatus({ matrixId: MATRIX_ID, plan: planName, providers: wanted, stage: 'starting', spendUsd: 0, ceilingUsd: maxCost, note: null })
if (dryRun) say('(dry run: stages 0-1 only, nothing is started and nothing is spent)')

let ceilingSet = false
for (const s of STAGES) {
  if (dryRun && !/plan and cost ceiling|credit check/.test(s.name)) { say(''); say('== ' + s.name + '   [skipped: --dry-run]'); continue }
  try {
    const r = await s.fn()
    if (s.name === 'plan and cost ceiling' && r) { ceiling = r.ceiling; ceilingSet = true }
    if (s.name === 'start the gateways') writeStatus({ stage: 'matrix', gateways: [...gateways].map(([p, g]) => ({ p, port: g.port, log: g.log })) })
  } catch (e) {
    say('')
    console.error('STOPPED at stage "' + s.name + '": ' + e.message)
    writeStatus({ stage: 'failed', failedStage: s.name, note: e.message, spendUsd: spend.total })
    // Leave the gateways running on failure: they hold no credit, they cost nothing idle, and
    // killing one would break any other matrix using the same provider.
    process.exit(1)
  }
}
say('')
say('DONE  ' + MATRIX_ID + '   spend this run: $' + spend.total.toFixed(4) + '   ceiling: $' + ceiling)
