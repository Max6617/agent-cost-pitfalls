#!/usr/bin/env node
/**
 * run-experiment — the task x arm x seed matrix, through the measurement gateway.
 *
 * Journal-scale changes over the first version:
 *   --jobs N     run N tasks concurrently. 3,600 sequential runs is ~20 hours;
 *                at 6-way it is under 4. The gateway is the shared instrument and
 *                handles concurrency fine.
 *   --model M    record and VERIFY the model under test. The gateway enforces one
 *                model for the whole matrix, so a multi-model study is one run of
 *                this script per model. The runner refuses to start if the gateway
 *                is enforcing something other than what was asked for - otherwise
 *                a whole matrix gets silently attributed to the wrong model.
 *
 * An ARM is one thing being compared:
 *   dsh:<variant>  from conditions/arms.mjs - (presentation x policy), NOT a preset
 *   <harness>      from tools/harnesses.mjs - opencode, cline, ...
 *
 *   node tools/run-experiment.mjs --dry-run
 *   node tools/run-experiment.mjs --harness dsh --harness opencode --jobs 6 --model deepseek-flash
 */
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, cpSync, readdirSync } from 'node:fs'
import { safeClean } from './safe-fs.mjs'
import { snapshotFixture, diffFixture, summariseFixtureDiff } from './fixture-guard.mjs'
import { join, dirname, resolve } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { clineCommand } from './harnesses.mjs'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { HARNESSES } from './harnesses.mjs'
import { dshBinJs } from './lib-yaml.mjs'
import { buildRunPlan, twinArms, nextRunnable, workdirKey, retryUntil } from './run-plan.mjs'
import { aaWorkdir } from './aa-plans.mjs'
import { assertNoUnsubstituted } from './arg-guard.mjs'
import { resolveTestCommand } from './test-command.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')

const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
const opts = (n) => { const o = []; argv.forEach((a, i) => { if (a === n && argv[i + 1]) o.push(argv[i + 1]) }); return o }
const has = (n) => argv.includes(n)

const seeds = Number(opt('--seeds', 5))
const jobs = Math.max(1, Number(opt('--jobs', 4)))
const tasksDir = resolve(opt('--tasks', join(repo, 'tasks')))
const condDir = resolve(opt('--conditions', join(repo, 'conditions')))
const outDir = resolve(opt('--out', join(repo, 'results')))
const gateway = opt('--gateway', 'http://127.0.0.1:8787').replace(/\/+$/, '')
const profile = opt('--profile', 'exp')
// Unique per invocation, so two matrices never share a runId.
const MATRIX_ID = opt('--matrix-id', 'm' + Date.now().toString(36))
const wantModel = opt('--model', null)
const timeoutMs = Number(opt('--timeout-ms', 20 * 60 * 1000))
const dryRun = has('--dry-run')
const only = opt('--only', null)
// An explicit task list, for pilots that must use a pre-declared sample rather than a prefix.
// Additive: without the flag, task selection is exactly as before.
const taskListArg = opt('--task-list', null)
// --keep-work is what the brief, the runbook and every handover note calls this flag. It was
// spelled --keep here, so `--keep-work` silently did nothing and the workdir was deleted
// underneath anyone trying to diagnose a failure.
const keepWork = has('--keep') || has('--keep-work')
// A/A MODE. The run id must stay unique - it is the record's key and the gateway's attribution -
// but what the MODEL sees must be identical between the two passes of the placebo, and in normal
// mode the workdir path (which the harness reports to the model) contains the runId, hence the arm
// id, hence 30+20 bytes of arm-label difference. In AA mode the workdir is a deterministic function
// of (harness, task, seed) with none of those in it. See tools/aa-plans.mjs.
const aaWorkdirMode = has('--aa-workdir')
// THE RANDOMISED-ORDER RE-RUN (notes/plans/RERUN-PLAN.md). --counterbalance puts each of exactly two arms first in
// exactly half the (task, seed) blocks. --aa-twin duplicates the one arm under test as `<id>-twin`, so
// an A/A runs interleaved inside one matrix instead of as two back-to-back passes; it requires
// --aa-workdir, and the workdir lock below keeps the two copies of a block from running at once.
// Both live in tools/run-plan.mjs, where they are tested. Absent, the plan is exactly as before.
const counterbalance = has('--counterbalance')
const aaTwin = has('--aa-twin')
// CONTINUOUS BACKUP. A matrix is hours of spend and, as of 2026-10-02, an untracked directory
// is a matrix that one typo can delete. --backup-every N mirrors results/ outside the working
// tree every N completed runs; collect.mjs turns it on and always passes --snapshot at the end.
const backupEvery = Math.max(0, Number(opt('--backup-every', 0)))
// COMMIT WHEN THE MATRIX COMPLETES, with its id and its run count, so the archive is in git
// before anyone reports anything as done. Opt-in: preflight drives this same runner into
// results/_scratch, and a commit per preflight would be noise.
const commitWhenDone = has('--commit')

const harnessIds = opts('--harness').length ? opts('--harness') : ['dsh']
for (const h of harnessIds) {
  if (!HARNESSES[h]) { console.error('unknown harness "' + h + '". Known: ' + Object.keys(HARNESSES).join(', ')); process.exit(2) }
}
if (!existsSync(tasksDir)) { console.error('no tasks directory at ' + tasksDir); process.exit(1) }
mkdirSync(outDir, { recursive: true })

/**
 * THE HARNESS VERSION IS PART OF THE TREATMENT AND NOTHING RECORDED IT.
 *
 * METHODS.md pins versions as PROSE - "Cline 3.0.65, OpenCode 1.18.30, DSH 0.1.7-rc.2, Node
 * v24.19.0" - and not one run record or gateway record carried a version. So when cline
 * stopped working, the first question ("did the harness change under us?") could not be
 * answered from the data at all; it had to be answered by reading a markdown file and hoping
 * it was still true.
 *
 * A tool that silently updates mid-study is a treatment change, and a treatment change that
 * is not on the record is a retraction waiting to happen. So: probed once per matrix, the
 * probe is recorded per run, and it is written to <out>/harness-versions.json.
 */
const HARNESS_VERSIONS = new Map()
function probeHarnessVersion (id) {
  if (HARNESS_VERSIONS.has(id)) return HARNESS_VERSIONS.get(id)
  const h = HARNESSES[id]
  // DSH IS NOT ON PATH AND IS NOT A .cmd. It is run as `node <dshBinJs> --profile ... `, so
  // probing it as a bare command produced 'Der Befehl "dsh" ist entweder falsch geschrieben'
  // and left harnessVersion: null on every one of its records - the PRIMARY arm of the study,
  // and the one harness whose version METHODS.md actually pins (0.1.7-rc.2). The probe now uses
  // the same resolution commandFor() uses, so it measures what the matrix runs.
  const isDsh = id === 'dsh'
  const cmd = isDsh ? process.execPath : (h?.headless?.cmd ?? null)
  let probed = null, raw = null, err = null
  if (cmd) {
    try {
      const argv = isDsh ? [dshBinJs(), '--version'] : ['--version']
      const r = spawnSync(cmd, argv, { encoding: 'utf8', timeout: 30000, shell: !isDsh, stdio: ['ignore', 'pipe', 'pipe'] })
      raw = (((r.stdout ?? '') + (r.stderr ?? '')).trim().split('\n')[0] ?? '').slice(0, 120) || null
      const m = /(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.]+)?)/.exec(raw ?? '')
      probed = m ? m[1] : null
      if (r.status !== 0 && !probed) err = 'exit ' + r.status
    } catch (e) { err = String(e?.message ?? e).slice(0, 200) }
  }
  // FALLBACK WHEN THE PROBE FAILS: read the version off the install, and say that is what
  // happened. The DSH arm of the 620-run DeepSeek matrix carries harnessVersion: null on all 280
  // of its records because `dsh` is not on PATH and the probe as written could not run it. A
  // version that can be PROVEN from the resolved install path is worth recording - as long as
  // the record says the value came from the path and not from the binary answering.
  let versionSource = probed ? 'probe' : null
  let evidence = null
  if (!probed) {
    try {
      // The REAL script this harness is launched from: dshBinJs() for DSH, the shim otherwise.
      // Starting from process.execPath for DSH would have walked up from node.exe and found
      // node's own version, which is a worse answer than null because it is confidently wrong.
      const script = isDsh ? dshBinJs() : (/[\\/]/.test(String(cmd ?? '')) ? cmd : null)
      if (script) {
        // Walk up to the nearest package.json - the installed package owns the version.
        let d = dirname(script)
        for (let i = 0; i < 6 && d && d !== dirname(d); i++) {
          const pj = join(d, 'package.json')
          if (existsSync(pj)) {
            const v = JSON.parse(readFileSync(pj, 'utf8')).version
            if (v) { probed = v; versionSource = 'install-path'; evidence = pj }
            break
          }
          d = dirname(d)
        }
      }
    } catch {}
  }
  const rec = { harness: id, command: isDsh ? process.execPath + ' ' + dshBinJs() : cmd,
    probedVersion: probed, raw, error: err, versionSource,
    versionEvidence: evidence ?? null,
    declaredVersion: h?.installedVersion ?? null, probedAt: new Date().toISOString() }
  HARNESS_VERSIONS.set(id, rec)
  return rec
}

const armsMetaPath = join(condDir, 'arms.mjs')
let DSH_ARMS = null
if (existsSync(armsMetaPath)) ({ DSH_ARMS } = await import(pathToFileURL(armsMetaPath).href))
const arms = []
for (const h of harnessIds) {
  if (h === 'dsh') {
    if (!DSH_ARMS?.length) { console.error('DSH arms not declared. Expected ' + armsMetaPath); process.exit(1) }
    for (const a of DSH_ARMS) arms.push({ id: a.id, harness: 'dsh', patch: a.patch, mode: a.mode, promptSuffix: a.promptSuffix ?? null })
  } else {
    arms.push({ id: h, harness: h, patch: null, mode: null })
  }
}
// --arms native-terse,ptc-terse runs a subset. Without it, adding two terseness arms
// meant re-running all 310 existing GLM-5.3-Flash runs to obtain 124 new ones - paying
// 2.5x for data already collected. Matched on the part after the harness prefix.
const armFilter = opt('--arms', null)
if (armFilter) {
  const want = new Set(armFilter.split(',').map((s) => s.trim().replace(/^dsh:/, '')))
  const kept = arms.filter((a) => want.has(a.id.replace(/^dsh:/, '')))
  if (!kept.length) { console.error('--arms matched nothing. available: ' + arms.map((a) => a.id).join(', ')); process.exit(1) }
  arms.length = 0
  arms.push(...kept)
}
if (aaTwin) {
  if (!aaWorkdirMode) { console.error('--aa-twin requires --aa-workdir: without it the two copies see different workdir paths'); process.exit(2) }
  let twins
  try { twins = twinArms(arms) } catch (e) { console.error('--aa-twin: ' + e.message + '. Narrow with --arms.'); process.exit(2) }
  arms.length = 0
  arms.push(...twins)
}
if (counterbalance && arms.length !== 2) {
  console.error('--counterbalance needs exactly two arms (after --arms and --aa-twin), got ' + arms.length + ': ' + arms.map((a) => a.id).join(', '))
  process.exit(2)
}

const allTasks = readdirSync(tasksDir).filter((d) => existsSync(join(tasksDir, d, 'task.json')))
let tasks = allTasks.slice()
if (only) tasks = tasks.filter((t) => t === only || t.startsWith(only))
if (taskListArg) {
  const want = taskListArg.split(',').map((s) => s.trim()).filter(Boolean)
  // Validate against EVERY task on disk, not against the already-filtered list: with --only and
  // --task-list together the second filter would otherwise report the other nine as missing.
  const have = new Set(allTasks)
  const missing = want.filter((t) => !have.has(t))
  // A typo in a pre-declared task list must fail loudly, not silently shrink the sample.
  if (missing.length) { console.error('--task-list names tasks not present in ' + tasksDir + ': ' + missing.join(', ')); process.exit(1) }
  tasks = tasks.filter((t) => want.includes(t))
}
if (!tasks.length) { console.error('no tasks found in ' + tasksDir); process.exit(1) }

/**
 * Arm order within each (task, seed) block.
 *
 * TWO DEFECTS FIXED HERE, both found by a hostile review after the matrices had run.
 *
 * 1. The old body was the same double-precision LCG as the analysis tools (see tools/rng.mjs):
 *    `s * 1103515245` exceeds 2^53, so the state rounded to a multiple of a large power of two and
 *    the LOW bits - the only ones an LCG randomises - became zero. Then `s % (i + 1)` consumed
 *    exactly those bits. Measured on the `ds-full` that existed at the time: `dsh:native` landed in
 *    position 0 in 0 of 62 runs and `dsh:ptc` in 31 of 62. That is not randomisation, and position
 *    fixed effects absorb a measurable share of the placebo difference F29 reports.
 *
 *    THE PRE-LOSS FIGURE ABOVE DOES NOT DESCRIBE THE SHIPPED MATRICES (amended 2026-10-04). That
 *    `ds-full` was destroyed and re-collected; on the six that ship, `dsh:ptc` reaches position 0 in
 *    2 of 62 blocks. The replacement below is sound but is NOT an independent randomisation: its
 *    seed is a function of (task, seed) only, so all six matrices draw the same permutation, and
 *    cost varies 1.75x-3.82x across slots within a single arm. Standardising on slot roughly halves
 *    every PTC-vs-native differential. See notes/defects/DEFECT-position-confound-2026-10-04.md.
 *
 * 2. The seed was `seed * 7919 + task.length`, keyed on the task's NAME LENGTH, so every task with
 *    an equal-length name got the same order. Flagged as a weakness by REVIEW-FINDINGS J5; it is a
 *    defect, not a weakness.
 *
 * 3. THE SEED OMITTED THE MATRIX (fixed 2026-10-09). `taskName + "|" + seed` is the same string in
 *    every matrix, so all five tasks-b matrices - and all six batch-1 matrices - assigned the SAME
 *    position to every arm in every block: verified, 320 of 320 blocks identical across five matrices
 *    (notes/defects/DEFECT-position-standardisation-artefact-2026-10-09.md). The execution-order nuisance was
 *    therefore SHARED by the whole study rather than independent between matrices, and no matrix
 *    could serve as an independent check on another. The rule now seeds on `matrixId | task | seed`
 *    and lives in tools/arm-order.mjs, where tools/arm-order.test.mjs holds it to that.
 *
 * Fixed forward only. Every matrix collected before today carries the old bias, and the honest
 * response is to say so rather than to re-shuffle data that is already on disk. A matrix must not be
 * SPLIT across this change either: the runner skips already-done cells, so changing the rule
 * mid-matrix would give the remaining cells a different assignment from the completed ones.
 */


// The rule (and, with --counterbalance, the balanced two-arm rule) lives in tools/run-plan.mjs.
const plan = buildRunPlan({ tasks, seeds, arms, matrixId: MATRIX_ID, counterbalance })


/**
 * --resume: skip work already on disk.
 *
 * Without this, restarting a matrix re-runs EVERYTHING. A credit failure part-way through
 * therefore costs twice: once for the runs that failed, and again for every run that had
 * already succeeded. The Anthropic matrices had roughly 134 dollars of completed work
 * behind them when this was added, and a naive restart would have discarded all of it.
 *
 * A run counts as done only if it is NOT an infrastructure failure. Those are losses under
 * the pre-registration exclusion rules, so they are retried rather than treated as results -
 * which is the whole reason the distinction exists.
 *
 * The rule used to be "not a CREDIT failure", matching one regex for quota text. That was
 * too narrow in exactly the way that mattered: luna's matrix accumulated 111 unsolved runs
 * whose own output named a fault (82 of them the HTTP_404 protocol drift) and a plain
 * --resume would have skipped every one of them, because none mentioned credit. The rule now
 * comes from tools/exclusions.mjs, which is the single definition, so a retry can no longer
 * depend on which fault happened to be in the regex the day this line was written.
 */
if (has('--resume')) {
  const existing = join(outDir, 'runs.jsonl')
  if (!existsSync(existing)) {
    console.log('--resume: no runs.jsonl at ' + existing + ' - running the full plan')
  } else {
    const { classifyRun } = await import('./exclusions.mjs')
    const done = new Set()
    const retried = {}
    for (const line of readFileSync(existing, 'utf8').split(String.fromCharCode(10))) {
      if (!line.trim()) continue
      let r = null
      try { r = JSON.parse(line) } catch { continue }
      if (!r || !r.task || !r.arm || r.seed == null) continue
      const c = classifyRun(r)
      if (c.infrastructure) { retried[c.cause] = (retried[c.cause] ?? 0) + 1; continue }
      done.add(r.task + '|' + r.arm + '|' + r.seed)
    }
    const before = plan.length
    const kept = plan.filter((p) => !done.has(p.task + '|' + p.arm + '|' + p.seed))
    plan.length = 0
    plan.push(...kept)
    console.log('--resume: ' + done.size + ' runs already complete, skipped')
    const rk = Object.entries(retried)
    if (rk.length) console.log('--resume: ' + rk.reduce((s, [, v]) => s + v, 0) + ' infrastructure-failed runs will be RETRIED (' + rk.map(([k, v]) => k + '=' + v).join(', ') + ')')
    console.log('--resume: ' + before + ' planned -> ' + plan.length + ' remaining')
  }
}

console.log('tasks      : ' + tasks.length + '   seeds: ' + seeds + '   arms: ' + arms.length)
console.log('runs       : ' + plan.length + '   jobs: ' + jobs)
console.log('gateway    : ' + gateway)
console.log('matrix id  : ' + MATRIX_ID)

let model = wantModel
let gatewayStats = null
try {
  const s = await (await fetch(gateway + '/__stats')).json()
  const enforced = s.enforced?.model ?? null
  console.log('gateway ok : upstream key ' + (s.upstreamKeyMasked ?? '(unknown build)') + '   enforcing ' + (enforced ?? '(none)'))
  if (s.upstreamKeyConfigured === false) { console.error('\ngateway has no usable upstream key; every run would 503'); process.exit(1) }
  // A whole matrix attributed to the wrong model is silent and expensive.
  if (wantModel && enforced && wantModel !== enforced) {
    console.error('\n--model ' + wantModel + ' but the gateway enforces ' + enforced)
    console.error('restart the gateway with --force-model ' + wantModel + ', or drop --model')
    process.exit(1)
  }
  model = wantModel ?? enforced ?? '(inherited)'
  gatewayStats = s
} catch {
  if (!dryRun) { console.error('gateway not reachable at ' + gateway); process.exit(1) }
  console.log('gateway    : not reachable (fine for a dry run)')
}

// THE RESOLVED CONFIGURATION, ON DISK.
//
// Not the flags that were typed - the values that were actually in force: the gateway's
// enforced model and effort, its masked upstream key, the harness versions, the node build,
// the exact arm list and the plan size. The destroyed matrices were reconstructable only
// because people remembered which flags they had used, and one of the settings that had to
// be "held constant" across batch 1 (cache breakpoints on for Qwen, off for DeepSeek and
// GLM) was not recoverable from any record at all. It is now.
for (const h of harnessIds) probeHarnessVersion(h)
if (!dryRun) {
  for (const v of HARNESS_VERSIONS.values()) {
    console.log('harness    : ' + v.harness.padEnd(10) + (v.probedVersion ?? v.declaredVersion ?? '(unknown)') +
      (v.raw && !v.probedVersion ? '   raw: ' + v.raw : '') + (v.error ? '   (' + v.error + ')' : ''))
  }
}
const matrixMeta = {
  matrixId: MATRIX_ID, startedAt: new Date().toISOString(),
  gateway, gatewayStats: gatewayStats ? {
    enforcedModel: gatewayStats.enforced?.model ?? null,
    enforcedEffort: gatewayStats.enforced?.reasoning_effort ?? null,
    upstreamKeyMasked: gatewayStats.upstreamKeyMasked ?? null,
    upstreamKeyConfigured: gatewayStats.upstreamKeyConfigured ?? null,
    noCacheBreakpoints: gatewayStats.noCacheBreakpoints ?? gatewayStats.enforced?.noCacheBreakpoints ?? null,
  } : null,
  model, requestedModel: wantModel,
  tasksDir, conditionsDir: condDir, outDir,
  tasks: tasks.length, seeds, jobs, arms: arms.map((a) => a.id), plannedRuns: plan.length,
  harnesses: harnessIds, harnessVersions: Object.fromEntries([...HARNESS_VERSIONS].map(([k, v]) => [k, v])),
  node: process.version, platform: process.platform,
  argv: process.argv.slice(2),
}
if (!dryRun) {
  writeFileSync(join(outDir, 'matrix.json'), JSON.stringify(matrixMeta, null, 2) + '\n')
  // Also inside the scratch dir, so a --out that happens to be scratch still keeps the record.
  writeFileSync(join(repo, 'results', '_scratch', 'last-matrix.json'), JSON.stringify(matrixMeta, null, 2) + '\n')
}

if (dryRun) {
  console.log('\nfirst 10 planned runs:')
  for (const p of plan.slice(0, 10)) console.log('  ' + p.task.padEnd(22) + p.arm.padEnd(20) + 'seed ' + p.seed + '  pos ' + p.position)
  const secs = plan.length * 20 / jobs
  console.log('\nDRY RUN - nothing executed. At ~20s/run and ' + jobs + '-way parallelism: ~' + (secs / 60).toFixed(0) + ' min')
  process.exit(0)
}

function commandFor(runP, prompt, workdir) {
  // {key} and {baseUrl} let a harness take credentials and endpoint as ARGUMENTS
  // instead of through config or environment. Aider (--openai-api-base,
  // --openai-api-key) and Cline (-k) both do, so neither needs a per-run config
  // file the way OpenCode does.
  if (runP.harness === 'dsh') {
    // OPENAI MODELS NEED THE ROUTE PATCH. DSH defaults to the DeepSeek route, which
    // speaks Anthropic Messages, so against an OpenAI upstream every request went to
    // /v1/messages and came back 404 - six of eight arms dead on the luna matrix while
    // the run reported itself as working. conditions/openai.yml switches
    // agent-default-model.provider to the pi-ai openai route, which speaks the Responses
    // API the provider actually serves. The patch was built and proved by hand; the
    // runner simply never applied it.
    const needsOpenAiRoute = /^gpt-/.test(String(model ?? ''))
    const patchFile = needsOpenAiRoute ? 'openai.yml' : runP.patch
    return { cmd: process.execPath, args: [dshBinJs(), '--profile', profile, '--patch', join(condDir, patchFile), prompt], shell: false }
  }
  const h = HARNESSES[runP.harness]
  const args = h.headless.args.map((a) => a
    .replace('{prompt}', prompt)
    .replace('{model}', model)
    .replace('{provider}', 'gateway')
    .replace('{key}', runP.syntheticKey)
    .replace('{baseUrl}', gateway)
    .replace('{configDir}', join(workdir, '.cline-config'))
    .replace('{timeoutSec}', String(Math.max(1, Math.round(timeoutMs / 1000))))
    .replace('{workdir}', workdir))
  const q = (s) => (/[\s"&|<>^()]/.test(String(s)) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s))
  // The guard that would have caught the {key} bug in one line instead of six weeks.
  // String.replace coerces an undefined replacement to the literal "undefined", so a
  // missing syntheticKey produced a command line that ran perfectly and attributed
  // nothing. Scoped to harnesses that actually use {key}, so dsh and opencode - which
  // take the key elsewhere - are unaffected.
  if (h.headless.args.includes('{key}')) {
    if (!args.includes(runP.syntheticKey)) {
      throw new Error('synthetic key did not reach the command line for harness "' + runP.harness +
        '"; commandFor was given syntheticKey=' + JSON.stringify(runP.syntheticKey))
    }
  }
  // TEMPLATE vs DATA. This used to scan every substituted argument for /\{[a-zA-Z]+\}/, so a task
  // whose prompt legitimately mentions a placeholder was read as an unsubstituted template variable:
  // tasks-b/multi-file-locale-fallback lost 8 cells per matrix, and the verify stage then refused the
  // sign-off for the whole 800-cell matrix. tools/arg-guard.mjs compares each template element with
  // the argument it produced, which catches a missed substitution and ignores the prompt's contents.
  assertNoUnsubstituted(h.headless.args, args)
  // CLINE MUST NOT GO THROUGH cmd.exe. It is the only harness driven by a .cmd shim, and cmd.exe
  // cannot carry a double quote inside a quoted argument: a hard-task prompt containing "no next
  // run" made cline exit 1 with "Unknown command or unquoted prompt" and zero requests, which is
  // how the hard-suite pilot stopped at preflight (notes/defects/LIVE-DEFECTS-2026-10-04.md section 3).
  if (runP.harness === 'cline') return clineCommand(args)
  return { cmd: q(h.headless.cmd), args: args.map(q), shell: true }
}

/**
 * Parse pass/fail counts out of a test runner's output.
 *
 * Binary pass/fail saturates: once a model can do a task at all it scores 100%, and
 * nothing separates a careful solution from a sloppy one. That is exactly what
 * happened to the first task batch - every arm solved 30 of 31 tasks. Counting
 * ASSERTIONS instead gives a 0-100% gradient on a task every arm attempts, which is
 * what makes the quality dimension measurable at all.
 *
 * Recognises the formats actually in play, and returns null rather than guessing:
 * a wrong fraction is worse than no fraction.
 */
function parseTestCounts(out) {
  const t = String(out ?? '')
  const grab = (re) => { const m = re.exec(t); return m ? Number(m[1]) : null }
  // node --test: "# pass 9" under the TAP reporter, but the DEFAULT spec reporter
  // prefixes with a non-ASCII info glyph, giving "<glyph> pass 9". Matching only
  // "#" silently failed on all 31 fixtures - so allow up to a few leading non-word
  // characters and require end-of-line after the number, which keeps "failing
  // tests:" and "0 passing" prose out of the match.
  let pass = grab(/^[^\w\n]{0,4}pass\s+(\d+)\s*$/m)
  let fail = grab(/^[^\w\n]{0,4}fail\s+(\d+)\s*$/m)
  if (pass == null) {
    // mocha / vitest style: "9 passing" / "3 failing"
    pass = grab(/(\d+)\s+passing/i)
    fail = fail ?? grab(/(\d+)\s+failing/i)
  }
  if (pass == null) {
    // pytest style: "9 passed, 3 failed"
    pass = grab(/(\d+)\s+passed/i)
    fail = fail ?? grab(/(\d+)\s+failed/i)
  }
  if (pass == null) {
    // TAP: count "ok N" and "not ok N"
    const ok = (t.match(/^ok\s+\d+/gm) ?? []).length
    const notOk = (t.match(/^not ok\s+\d+/gm) ?? []).length
    if (ok + notOk > 0) { pass = ok; fail = notOk }
  }
  if (pass == null) return null
  fail = fail ?? 0
  const total = pass + fail
  return { testsPassed: pass, testsFailed: fail, testsTotal: total, passRate: total > 0 ? pass / total : null }
}

/** Promise-wrapped spawn so runs can overlap. */
function run(cmd, args, opts) {
  return new Promise((res) => {
    const started = Date.now()
    const child = spawn(cmd, args, opts)
    let stdout = '', stderr = ''
    const timer = setTimeout(() => { try { child.kill() } catch {} ; res({ status: null, timedOut: true, stdout, stderr, durationMs: Date.now() - started }) }, timeoutMs)
    child.stdout?.on('data', (d) => { stdout += d })
    child.stderr?.on('data', (d) => { stderr += d })
    child.on('error', (e) => { clearTimeout(timer); res({ status: null, error: e, stdout, stderr, durationMs: Date.now() - started }) })
    child.on('close', (code) => { clearTimeout(timer); res({ status: code, stdout, stderr, durationMs: Date.now() - started }) })
  })
}

async function runOne(p) {
  const spec = JSON.parse(readFileSync(join(tasksDir, p.task, 'task.json'), 'utf8'))
  // Prefix every run id with a per-invocation token.
  //
  // Without it the id is deterministic - dsh-example-fix-dshnative-s1 - so running
  // the same task twice against the same gateway log produces ONE runId carrying
  // TWO sets of usage records, and summing by runId double-counts. Observed live:
  // re-checking example-fix reported $0.00909 for an arm the matrix had measured at
  // $0.0026, a 3.5x inflation that read as a plausible cost difference rather than
  // a bug.
  const runId = MATRIX_ID + '-' + p.harness + '-' + p.task + '-' + p.arm.replace(/[^a-z0-9]+/gi, '') + '-s' + p.seed
  const syntheticKey = 'exp-' + p.harness + '-' + runId
  // Plan entries carry only the matrix coordinates; runId and syntheticKey are
  // derived here, so commandFor() must be handed the enriched object. Until
  // 2026-09-30 it was handed the raw plan entry and read p.syntheticKey, a property
  // no plan entry ever had.
  //
  // The failure was silent and it destroyed attribution rather than breaking the
  // run. String.replace coerces its second argument, so an undefined replacement
  // becomes the seven-character string "undefined" on the command line, and the
  // harness dutifully sends that as its API key. The gateway swaps whatever
  // synthetic key it is given for the real one, so every request still returns 200
  // and the run still reports success - but attribution degrades from
  // exp-<harness>-<runId> to harness "unlabelled", runId "unset", and that run's
  // cost becomes unrecoverable. It looks exactly like a run that measured nothing.
  //
  // It survived because the only {key} consumers are cline and aider: cline was
  // blocked on the base-URL bug, and aider is excluded from the study. opencode and
  // dsh take the key from a generated config or env vars, so they never noticed.
  // 33 such records were already sitting in results/gateway.jsonl.
  const runP = { ...p, runId, syntheticKey }
  // AA mode: same string in both passes; the fixture is copied fresh below either way. A leftover
  // directory from the other pass is cleared first, through the only module allowed to delete.
  const workdir = aaWorkdirMode
    ? aaWorkdir({ harness: p.harness, task: p.task, seed: p.seed })
    : join(tmpdir(), 'dsh-exp-' + runId + '-' + Math.random().toString(36).slice(2, 8))
  // RETRIED in AA mode: the twin of a block starts the moment the first copy finishes, and a process
  // the harness spawned can still hold the directory for a few seconds (EPERM, found by the first
  // interleaved A/A smoke). tools/run-plan.mjs retryUntil waits for the release and fails loudly if
  // it never comes.
  if (aaWorkdirMode && existsSync(workdir)) await retryUntil(() => { if (existsSync(workdir)) safeClean(workdir) })
  mkdirSync(workdir, { recursive: true })

  // EVERY COMMAND THIS RUN ATTEMPTED, in order, with its exit code and its output tails.
  //
  // A failure used to produce a record carrying an `error` string and nothing else, while the
  // console printed `exit=undefined`. Clined was read as "62 dead cells in every matrix" when
  // the truth was "cline could not be launched, and the runner did not record what it tried".
  // A non-zero exit is not evidence until its cause is known; this is where the cause is kept.
  const attempts = []
  const note = (cmd, args, extra) => {
    const a = { cmd, args: args ?? [], line: [cmd, ...(args ?? [])].join(' '), at: new Date().toISOString(), ...extra }
    attempts.push(a)
    return a
  }
  const finish = (a, r) => { a.status = r?.status ?? null; a.timedOut = r?.timedOut === true; a.error = r?.error?.message ?? null
    a.stdoutTail = String(r?.stdout ?? '').slice(-600); a.stderrTail = String(r?.stderr ?? '').slice(-600); return a }

  try {
    const repoSrc = spec.repo ? resolve(join(tasksDir, p.task), spec.repo) : null
    if (repoSrc && existsSync(repoSrc)) cpSync(repoSrc, workdir, { recursive: true })
    if (spec.setup) finish(note(spec.setup, [], { step: 'setup', shell: true }), await run(spec.setup, [], { cwd: workdir, shell: true, stdio: 'ignore' }))

    // THE FIXTURE AS THE ARM RECEIVED IT. Taken after setup (which may legitimately create
    // files) and before the harness runs, so the diff below is exactly what the arm did.
    //
    // WHY THIS IS ON THE RECORD. tasks/<task>/task.json grades with `node --test` run IN THIS
    // WORKDIR, as the arm left it, and nothing restores the fixture's tests first. An arm that
    // weakens an assertion therefore reads as a solve, and until now no record could tell that
    // apart from a real fix. This measures it without changing the score: see fixture-guard.mjs.
    const fixtureBefore = snapshotFixture(workdir)

    const h = HARNESSES[p.harness]
    let configEnv = {}
    if (h?.configEnv && h?.configTemplate) {
      const tpl = resolve(repo, h.configTemplate)
      if (existsSync(tpl)) {
        const perRun = join(workdir, '.gateway-config.jsonc')
        // Generate the config rather than substituting into a fixed template. The
        // template hardcoded the gateway URL and DeepSeek model names, so pointing
        // OpenCode at a second provider (GLM) would have silently kept it on
        // DeepSeek - the run would succeed and measure the wrong thing.
        // ANTHROPIC-NATIVE PILOT HARNESSES use the Anthropic SDK provider. The base URL must still
        // END IN /v1: opencode passes options.baseURL straight to the SDK as the API root and the
        // SDK appends only /messages, so the gateway ROOT produced http://127.0.0.1:PORT/messages
        // and a 404 - measured on 2026-10-10, the first smoke of this pilot. With /v1 the request
        // lands on the path the gateway injects cache_control on and logs the split for
        // (/v1/messages, the same path the DSH arms use). The study harnesses are unchanged.
        const anthropicNative = h?.anthropicNative === true
        writeFileSync(perRun, JSON.stringify({
          '$schema': 'https://opencode.ai/config.json',
          provider: {
            gateway: {
              npm: anthropicNative ? '@ai-sdk/anthropic' : '@ai-sdk/openai-compatible',
              name: 'Measurement Gateway',
              options: { baseURL: gateway + '/v1', apiKey: syntheticKey },
              models: { [model]: { name: model } },
            },
          },
        }, null, 2))
        configEnv = { [h.configEnv]: perRun }
      }
    }

    // Harnesses configured entirely by environment variables, with no config file
    // and no credential flag. OpenHands (LLM_API_KEY / LLM_BASE_URL / LLM_MODEL) and
    // Goose (GOOSE_PROVIDER / GOOSE_MODEL / OPENAI_HOST) are the cases that
    // motivated this.
    //
    // A null value means UNSET, not empty. Goose reads OPENAI_HOST and treats
    // OPENAI_BASE_URL as a legacy alias for the same field, so leaving this runner's
    // shared OPENAI_BASE_URL=gateway/v1 in place risks the wrong one winning. The
    // values that matter also differ in SHAPE between harnesses and that shape is
    // the whole trap: Goose wants the gateway ROOT because it appends
    // /v1/chat/completions itself, while OpenHands/LiteLLM want the /v1 base. Get it
    // backwards and Goose posts to /v1/v1/chat/completions - every request 404s,
    // zero tokens are used, and goose still exits 0.
    let harnessEnv = {}
    const unsetEnv = []
    if (h?.env) {
      for (const [k, v] of Object.entries(h.env)) {
        if (v === null) { unsetEnv.push(k); continue }
        harnessEnv[k] = String(v)
          .replace('{key}', syntheticKey)
          .replace('{model}', model)
          .replace('{baseUrl}', gateway)
          .replace('{configDir}', join(workdir, '.harness-root'))
          .replace('{workdir}', workdir)
      }
    }

    // Base defaults first, harness overrides LAST, so a harness can unset a default
    // it must not inherit. Order matters here: spreading harnessEnv before these
    // would let the shared OPENAI_BASE_URL=gateway/v1 win over Goose's OPENAI_HOST.
    const env = {
      ...process.env, ...configEnv,
      ...(p.mode ? { DSH_TOOLS_MODE: p.mode } : {}),
      // Python harnesses (aider, openhands) default to the Windows console code page
      // and crash on their own UI glyphs. Force UTF-8 for everything.
      PYTHONIOENCODING: 'utf-8',
      PYTHONUTF8: '1',
      DEEPSEEK_BASE_URL: gateway + '/v1', DEEPSEEK_API_KEY: syntheticKey,
      OPENAI_BASE_URL: gateway + '/v1', OPENAI_API_KEY: syntheticKey,
      ...harnessEnv,
    }
    // Spawn drops env entries whose value is undefined, which is how a harness
    // declares "this shared default must not reach me".
    for (const k of unsetEnv) env[k] = undefined
    // Some harnesses must REGISTER their endpoint before they will use it, and a
    // provider store written by hand is not enough. Cline is the case that proved
    // it: writing the exact bytes `cline auth` writes to the exact path it reads
    // was silently ignored, and the run then stripped those fields back out. The
    // auth command has to actually execute. `--config` gives each run its own
    // config tree, so the base URL is per-run - which matters because the base URL
    // is what silently selects the provider, and a shared store would send a run
    // aimed at one gateway port through another.
    if (h?.authStyle === 'cline-config') {
      const authArgs = h.auth.map((a) => a
        .replace('{cmd}', h.headless.cmd)
        .replace('{key}', syntheticKey)
        .replace('{model}', model)
        .replace('{baseUrl}', gateway)
        .replace('{configDir}', join(workdir, '.cline-config')))
      // spawnSync, not the async helper: the store must exist before cline runs.
      const authNote = note(authArgs[0], authArgs.slice(1), { step: 'auth', authStyle: h.authStyle })
      const a = spawnSync(authArgs[0], authArgs.slice(1), { cwd: workdir, env, shell: true, encoding: 'utf8', timeout: 120000 })
      finish(authNote, a)
      if (a.status !== 0) {
        const e = new Error('cline auth failed (exit ' + a.status + '): ' +
          ((a.stdout ?? '') + (a.stderr ?? '')).slice(-400))
        e.exitCode = a.status
        throw e
      }
    }

    // The terseness ablation changes only the prompt, so it applies to every harness
    // identically. Recorded on the run so the analysis can group on it.
    const effectivePrompt = p.promptSuffix ? spec.prompt + ' ' + p.promptSuffix : spec.prompt
    const { cmd, args, shell } = commandFor(runP, effectivePrompt, workdir)
    const harnessNote = note(cmd, args, { step: 'harness', shell: shell === true })
    const r = await run(cmd, args, { cwd: workdir, env, shell: shell === true, stdio: ['ignore', 'pipe', 'pipe'] })
    finish(harnessNote, r)

    // ...AND AS THE ARM LEFT IT. Computed here, BEFORE the test suite runs, so the suite's own
    // side effects cannot be mistaken for the arm's edits.
    let fixtureDiff = null
    try { fixtureDiff = diffFixture(fixtureBefore, workdir) } catch (e) { fixtureDiff = null }

    let testPassed = null, testOutput = '', counts = null
    if (spec.test) {
      // task.json may name the grader relative to the repo. cwd here is the temp fixture copy.
      const testCmd = resolveTestCommand(spec.test, repo)
      const t = await run(testCmd, [], { cwd: workdir, shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
      finish(note(testCmd, [], { step: 'test', shell: true }), t)
      testPassed = t.status === 0
      // Fractional score alongside the binary one. The binary verdict saturates;
      // passRate does not, so it is the metric that can separate a careful solution
      // from a sloppy one on a task every arm attempts.
      counts = parseTestCounts((t.stdout ?? '') + (t.stderr ?? ''))
      testOutput = ((t.stdout ?? '') + (t.stderr ?? '')).slice(-4000)
    }

    return {
      ts: new Date().toISOString(), runId, matrixId: MATRIX_ID, syntheticKey, model,
      task: p.task, arm: p.arm, harness: p.harness, patch: p.patch, mode: p.mode,
      terse: !!p.promptSuffix, seed: p.seed, position: p.position,
      counterbalanced: p.counterbalanced === true, twinOf: p.twinOf ?? null,
      exitCode: r.status, timedOut: r.timedOut === true, durationMs: r.durationMs,
      testPassed, solved: r.status === 0 && testPassed !== false,
      // Fractional quality. testsTotal is null when the runner's format was not
      // recognised, which is deliberately distinguishable from "0 tests".
      testsPassed: counts?.testsPassed ?? null,
      testsFailed: counts?.testsFailed ?? null,
      testsTotal: counts?.testsTotal ?? null,
      passRate: counts?.passRate ?? null,
      stdoutTail: (r.stdout ?? '').slice(-2000), stderrTail: (r.stderr ?? '').slice(-2000),
      testOutputTail: testOutput, workdir: keepWork ? workdir : null,
      // The version of the thing being measured, on every single record - not in a markdown
      // table that can drift away from what actually ran.
      harnessVersion: HARNESS_VERSIONS.get(p.harness)?.probedVersion ?? null,
      harnessVersionRaw: HARNESS_VERSIONS.get(p.harness)?.raw ?? null,
      harnessVersionCommand: HARNESS_VERSIONS.get(p.harness)?.command ?? null,
      harnessVersionSource: HARNESS_VERSIONS.get(p.harness)?.versionSource ?? null,
      // WHAT THE ARM DID TO THE FILES THAT DECIDE ITS SCORE.
      // `gradedOnEditedTests: true` means this run's verdict came from a suite the arm was free
      // to edit - a property of the INSTRUMENT, not of the model, and the thing an analysis has
      // to stratify on rather than average away.
      fixture: summariseFixtureDiff(fixtureDiff),
    }
  } catch (e) {
    // Attach the evidence BEFORE the finally runs, so a cleanup that also fails cannot take
    // the real cause with it.
    if (e && typeof e === 'object') {
      const last = attempts[attempts.length - 1] ?? null
      e.runId = runId
      e.workdir = workdir
      e.attempts = attempts
      e.commandLine = last?.line ?? null
      e.exitCode = e.exitCode ?? last?.status ?? null
      e.harness = p.harness
    }
    throw e
  } finally {
    // CLEANUP MUST NEVER MASK THE REAL ERROR.
    //
    // Until 2026-10-02 this was one unguarded `rmSync(workdir, {recursive:true, force:true})`.
    // A harness that left a file open - cline's sqlite WAL and its .cmd shim both can - made
    // that throw EPERM, and because it threw INSIDE the finally it REPLACED the exception
    // already propagating. The record then carried "EPERM, Permission denied: <workdir>" and
    // no exit code, no command line and no cause: a failure with its evidence deleted.
    //
    // The deletion now goes through safe-fs, which refuses rather than guesses, and a refused
    // or failed cleanup is REPORTED and left on disk instead of raised. A leftover temp
    // directory is cheap; a lost cause is not.
    if (!keepWork) {
      // In AA mode the workdir is shared with the block's twin, so the lock must not be released
      // until the directory is actually gone: retry while a handle is still held.
      try {
        if (aaWorkdirMode) await retryUntil(() => { if (existsSync(workdir)) safeClean(workdir) }, { attempts: 15, delayMs: 2000 })
        else safeClean(workdir)
      }
      catch (e) { console.error('WARN workdir not cleaned (' + workdir + '): ' + e.message) }
    }
  }
}

const runsLog = join(outDir, 'runs.jsonl')
let done = 0, solved = 0
const queue = [...plan]
const startedAt = Date.now()

// THE WORKDIR LOCK. In AA mode both copies of a block share one workdir path (the byte-identity
// rule), so a worker takes the earliest item whose workdir is free and waits while every remaining
// item's twin is running. Outside AA mode workdirKey is null and this is exactly queue.shift().
const busy = new Set()
const keyOf = (p) => workdirKey(p, aaWorkdirMode)
async function takeNext () {
  for (;;) {
    if (!queue.length) return null
    const p = nextRunnable(queue, busy, keyOf)
    if (p) return p
    await new Promise((r) => setTimeout(r, 250))
  }
}

async function worker(id) {
  for (;;) {
    const p = await takeNext()
    if (!p) return
    const lockKey = keyOf(p)
    if (lockKey) busy.add(lockKey)
    let rec
    try { rec = await runOne(p) }
    catch (e) {
      // A FAILURE RECORD MUST CARRY ITS OWN CAUSE.
      //
      // Until 2026-10-02 this catch produced {ts, task, arm, seed, error, solved:false}: no
      // harness, no model, no matrix id, no exit code, no command line. The console line below
      // printed `exit=undefined`. So every cline failure in the study was recorded as an
      // unattributable string, and preflight grew a phantom `undefined` harness row from it.
      // The rule the project keeps re-learning: a non-zero exit is not evidence until its
      // cause is known, and neither is an absent number. These fields are the cause.
      rec = {
        ts: new Date().toISOString(),
        runId: e?.runId ?? (MATRIX_ID + '-' + p.harness + '-' + p.task + '-' + String(p.arm).replace(/[^a-z0-9]+/gi, '') + '-s' + p.seed),
        matrixId: MATRIX_ID, task: p.task, arm: p.arm, harness: p.harness, model,
        patch: p.patch ?? null, mode: p.mode ?? null, seed: p.seed, position: p.position,
        counterbalanced: p.counterbalanced === true, twinOf: p.twinOf ?? null,
        solved: false, exitCode: e?.exitCode ?? null,
        errorStage: e?.attempts?.[e.attempts.length - 1]?.step ?? null,
        error: String(e?.message ?? e), errorName: e?.name ?? null,
        commandLine: e?.commandLine ?? null,
        attempts: (e?.attempts ?? []).map((a) => ({
          step: a.step ?? null, line: a.line, status: a.status ?? null,
          timedOut: a.timedOut ?? null, error: a.error ?? null, stderrTail: a.stderrTail ?? null,
        })),
        workdir: e?.workdir ?? null,
        harnessVersion: HARNESS_VERSIONS.get(p.harness)?.probedVersion ?? null,
        stack: String(e?.stack ?? '').split('\n').slice(0, 6).join('\n'),
      }
      console.error('[' + rec.runId + '] ' + p.harness + '/' + p.arm + '/' + p.task +
        ' FAILED at ' + (rec.errorStage ?? 'unknown') + ': ' + String(rec.error).split('\n')[0].slice(0, 220))
      if (rec.commandLine) console.error('         tried: ' + String(rec.commandLine).slice(0, 320))
      if (rec.workdir) console.error('         workdir: ' + rec.workdir + (keepWork ? '' : '  (removed)'))
      if (rec.attempts.at(-1)?.stderrTail) {
        console.error('         stderr: ' + String(rec.attempts.at(-1).stderrTail).replace(/\s+/g, ' ').slice(0, 320))
      }
    }
    if (lockKey) busy.delete(lockKey)
    appendFileSync(runsLog, JSON.stringify(rec) + '\n')
    done++
    if (rec.solved) solved++
    // Incremental backup part-way through, not only at the end: an interrupted matrix is the
    // normal case (credit runs out, a machine reboots, a harness wedges), and the whole point
    // is that the runs already paid for are on disk somewhere else when that happens.
    if (backupEvery > 0 && done % backupEvery === 0) {
      const b = spawnSync(process.execPath, [join(here, 'backup-results.mjs'), '--quiet'], { encoding: 'utf8' })
      console.log('      backup @' + done + ' runs: ' + (b.status === 0 ? 'ok' : 'FAILED (exit ' + b.status + ') ' + String(b.stdout ?? '').slice(-200)))
    }
    const elapsed = (Date.now() - startedAt) / 1000
    const eta = done ? (elapsed / done) * (plan.length - done) : 0
    console.log('[' + String(done).padStart(4) + '/' + plan.length + '] w' + id + ' ' +
      String(p.arm).padEnd(18) + String(p.task).slice(0, 22).padEnd(24) +
      // `exit=undefined` was the console telling the truth and nobody listening. Say which.
      'exit=' + (rec.exitCode === null || rec.exitCode === undefined ? (rec.error ? 'ERROR' : '?') : rec.exitCode) +
      ' ' + String(Math.round((rec.durationMs ?? 0) / 1000) + 's').padStart(5) +
      '  eta ' + Math.round(eta / 60) + 'm')
  }
}

await Promise.all(Array.from({ length: Math.min(jobs, plan.length) }, (_, i) => worker(i + 1)))

const mins = ((Date.now() - startedAt) / 60000).toFixed(1)
console.log('\n' + done + ' runs in ' + mins + ' min, ' + solved + ' solved, ' + (done - solved) + ' not solved')
console.log('model   : ' + model)
console.log('records : ' + runsLog)

// ---- the matrix is finished: back it up, then commit it -------------------------------
// Both steps are reported, not assumed. A backup that says "ok" without a file count is the
// kind of claim this project has retracted seven of.
{
  const snapLabel = MATRIX_ID + ' ' + done + ' runs ' + model
  const b = spawnSync(process.execPath, [join(here, 'backup-results.mjs'), '--snapshot', snapLabel], { encoding: 'utf8' })
  process.stdout.write((b.stdout ?? ''))
  if (b.status !== 0) console.error('BACKUP FAILED (exit ' + b.status + '). Results exist in ONE place right now.')
}

if (commitWhenDone) {
  const git = (args) => spawnSync('git', args, { cwd: repo, encoding: 'utf8' })
  git(['add', '-A', 'results', 'data', 'analysis'])
  const msg = MATRIX_ID + ': ' + done + ' runs, ' + solved + ' solved - ' + model +
    ' (' + harnessIds.join('+') + ', ' + tasks.length + ' tasks, ' + arms.length + ' arms, ' + seeds + ' seeds)'
  const c = git(['commit', '-m', msg])
  if (c.status === 0) console.log('committed : ' + msg)
  else if (/nothing to commit/i.test((c.stdout ?? '') + (c.stderr ?? ''))) console.log('committed : nothing new to commit')
  else console.error('COMMIT FAILED: ' + ((c.stderr ?? '') + (c.stdout ?? '')).slice(-400))
} else {
  console.log('commit  : not automatic for this invocation; run:\n' +
    '          git add -A results data analysis && git commit -m "' + MATRIX_ID + ': ' + done + ' runs"')
}
console.log('next    : node tools/analyze-results.mjs')
