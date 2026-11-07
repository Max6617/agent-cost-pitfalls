#!/usr/bin/env node
/**
 * harness-smoke — can this harness be pointed at the measurement gateway and run
 * headlessly? One command, one answer, no API spend until the end.
 *
 * This is the de-risking instrument for the cross-harness part of the paper. The
 * whole strong-paper plan rests on heterogeneous harnesses being drivable through
 * ONE gateway, and that is a binary unknown. Learn it in an hour, not a week.
 *
 *   node tools/harness-smoke.mjs --list
 *   node tools/harness-smoke.mjs --harness opencode            # checks only, no run
 *   node tools/harness-smoke.mjs --harness opencode --run      # actually calls the API
 *
 * Stages, each reported separately so a failure names itself:
 *   1. CLI present on PATH
 *   2. gateway reachable and reporting its enforced config
 *   3. (--run only) the harness completes one trivial task
 *   4. (--run only) the gateway logged that harness's traffic
 *   5. (--run only) usage and a cache split came back
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { safeClean } from './safe-fs.mjs'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { HARNESSES, STUDY_SET } from './harnesses.mjs'

const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
const has = (n) => argv.includes(n)

const gateway = opt('--gateway', 'http://127.0.0.1:8787').replace(/\/+$/, '')
const logPath = resolve(opt('--log', 'results/gateway.jsonl'))
const wantRun = has('--run')

if (has('--list')) {
  console.log('study set: ' + STUDY_SET.join(', '))
  console.log('')
  for (const [id, h] of Object.entries(HARNESSES)) {
    console.log('  ' + id.padEnd(12) + h.license.padEnd(14) + 'verified=' + String(h.verified).padEnd(18) + h.label)
  }
  process.exit(0)
}

const id = opt('--harness', null)
if (!id) { console.error('need --harness <id>  (or --list)'); process.exit(2) }
const h = HARNESSES[id]
if (!h) { console.error('unknown harness "' + id + '". Known: ' + Object.keys(HARNESSES).join(', ')); process.exit(2) }

const results = []
const step = (name, ok, detail) => { results.push({ name, ok, detail }); console.log('  ' + (ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '   ' + detail : '')) }

console.log('HARNESS SMOKE: ' + h.label + '  (' + id + ')')
console.log('  repo     : ' + h.repo)
console.log('  headless : ' + h.headless.cmd + ' ' + h.headless.args.join(' '))
console.log('  config   : ' + h.configStyle)
console.log('')

// --- 1. CLI present -----------------------------------------------------------
const cli = h.headless.cmd
const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cli], { encoding: 'utf8' })
const cliPath = which.status === 0 ? (which.stdout || '').split('\n')[0].trim() : null
step('CLI on PATH', !!cliPath, cliPath ? cliPath : cli + ' not found - install it first')
if (!cliPath) {
  console.log('')
  console.log('Cannot continue without the CLI. Install per tools/harnesses.mjs, then re-run.')
  if (wantRun) process.exit(1)
}

// --- 2. gateway reachable -----------------------------------------------------
let stats = null
try {
  const res = await fetch(gateway + '/__stats')
  stats = await res.json()
  step('gateway reachable', true, gateway)
  step('gateway enforces a model', !!stats.enforced?.model,
    'model=' + (stats.enforced?.model ?? '-') + ' effort=' + (stats.enforced?.reasoning_effort ?? '-'))
  if (stats.exempt?.length) console.log('        exempt (never rewritten): ' + stats.exempt.join(', '))
} catch (e) {
  step('gateway reachable', false, 'start it: node tools/measure-gateway.mjs --port 8787 --log ' + logPath)
}

if (!wantRun) {
  console.log('')
  console.log('Checks only. Add --run to spend a fraction of a cent and complete the loop.')
  process.exit(results.every((r) => r.ok) ? 0 : 1)
}
if (!cliPath || !stats) { console.error('\ncannot --run without the CLI and the gateway'); process.exit(1) }

// --- 3. one trivial task ------------------------------------------------------
// `dsh-exp-` marks a temp directory as a designated scratch root (tools/safe-fs.mjs), which
// is what lets safeClean remove it at the end. A `harness-smoke-*` name would be refused.
const workdir = join(tmpdir(), 'dsh-exp-smoke-' + id + '-' + Date.now())
mkdirSync(workdir, { recursive: true })
writeFileSync(join(workdir, 'hello.txt'), 'hello from the smoke test\n')
const prompt = 'Read hello.txt in the current directory and reply with its exact contents. Do not modify anything.'
console.log('')
console.log('  running: ' + cli + ' in ' + workdir)

// One key for the whole smoke run, of the same shape the runner uses:
// exp-<harness>-<runId>. The gateway attributes on this and swaps it for the real
// key, so whatever reaches the provider is irrelevant - but what the HARNESS sends
// is the entire measurement, so it must be passed through verbatim.
const smokeKey = 'exp-' + id + '-smoke'
// Registry env, applied AFTER the shared defaults below. A null value means unset,
// which is how a harness refuses a default it must not inherit.
const harnessEnv = {}
const unsetEnv = []
for (const [k, v] of Object.entries(h.env ?? {})) {
  if (v === null) { unsetEnv.push(k); continue }
  harnessEnv[k] = String(v)
    .replace('{key}', smokeKey)
    .replace('{model}', stats.enforced?.model ?? 'deepseek-flash')
    .replace('{baseUrl}', gateway)          // NOTE: root, no /v1 - see below
    .replace('{configDir}', join(workdir, '.harness-root'))
    .replace('{workdir}', workdir)
}
const env = {
  ...process.env,
  OPENAI_BASE_URL: gateway + '/v1',
  OPENAI_API_KEY: smokeKey,
  OPENAI_MODEL: stats.enforced?.model ?? 'deepseek-flash',
  DEEPSEEK_BASE_URL: gateway + '/v1',
  DEEPSEEK_API_KEY: smokeKey,
  ...harnessEnv,
}
for (const k of unsetEnv) env[k] = undefined
// Substitute every placeholder the registry may use. {model} comes from the
// gateway's ENFORCED model, so the harness asks for exactly what the study runs -
// and the gateway would rewrite it anyway, recording the deviation.
//
// This list must stay in step with commandFor() in run-experiment.mjs. It did not:
// harness-smoke.mjs substituted only {prompt}, {model} and {provider}, so for cline
// it left {configDir}, {key} and {timeoutSec} in the command line and never ran the
// required `cline auth` step. The smoke test therefore could not reproduce what the
// runner did, and the two tools disagreed about whether cline worked at all.
const enforcedModel = stats.enforced?.model ?? 'deepseek-flash'
const configDir = join(workdir, '.cline-config')
const timeoutSec = String(Math.max(1, Math.round(Number(opt('--timeout-ms', 600000)) / 1000)))
const sub = (s) => String(s)
  .replace('{cmd}', h.headless.cmd)
  .replace('{prompt}', prompt)
  .replace('{model}', enforcedModel)
  .replace('{provider}', 'gateway')
  .replace('{key}', smokeKey)
  .replace('{baseUrl}', gateway)
  .replace('{configDir}', configDir)
  .replace('{timeoutSec}', timeoutSec)
  .replace('{workdir}', workdir)

// Registration step, when the harness needs one. A provider store written by hand
// is not enough - see the trap list in tools/harnesses.mjs.
// Quote exactly as tools/run-experiment.mjs does. shell:true CONCATENATES the args
// rather than escaping them, so an unquoted prompt reaches the harness as several
// arguments and cline rejects it outright:
//   error: Unknown command or unquoted prompt. Prompt text must be passed as a
//   single quoted argument
// Cline is not being difficult: on Windows the prompt is a positional argument, and
// without quotes the shell splits it. This is why the smoke run exited 1 in 1.8s
// with zero requests while the runner - which does quote - worked.
const q = (s) => (/[\s"&|<>^()]/.test(String(s)) ? '"' + String(s).replace(/"/g, '""') + '"' : String(s))
if (h.authStyle === 'cline-config' && h.auth) {
  const authArgs = h.auth.map(sub)
  const a = spawnSync(q(authArgs[0]), authArgs.slice(1).map(q), { cwd: workdir, env, shell: true,
    encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024 })
  step('provider registered (auth)', a.status === 0,
    a.status === 0 ? h.authStyle : 'exit=' + a.status + '  ' + ((a.stdout ?? '') + (a.stderr ?? '')).slice(-200).replace(/\n/g, ' | '))
}

const args = h.headless.args.map(sub)
for (const a of args) {
  if (/\{[a-zA-Z]+\}/.test(a)) {
    console.error('unsubstituted placeholder in registry args: ' + JSON.stringify(a))
    process.exit(2)
  }
}
const started = Date.now()
const run = spawnSync(q(cli), args.map(q), { cwd: workdir, env, shell: true, encoding: 'utf8',
  timeout: Number(opt('--timeout-ms', 600000)), maxBuffer: 32 * 1024 * 1024 })
const ms = Date.now() - started
step('completed without crashing', run.status === 0,
  'exit=' + run.status + '  ' + (ms / 1000).toFixed(1) + 's' + (run.error ? '  ' + run.error.message : ''))
if (run.status !== 0) {
  console.log('        stdout: ' + (run.stdout || '').slice(-300).replace(/\n/g, ' | '))
  console.log('        stderr: ' + (run.stderr || '').slice(-300).replace(/\n/g, ' | '))
}

// --- 4/5. did the gateway see it? --------------------------------------------
// Never let cleanup replace a real failure: a throw in the middle of this script would
// otherwise be reported as an EPERM about a temp directory. See safe-fs.mjs.
try { safeClean(workdir) } catch (e) { console.error('WARN cleanup of ' + workdir + ': ' + e.message) }
const lines = existsSync(logPath) ? readFileSync(logPath, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean) : []
// Scope to THIS smoke run by its exact synthetic key, not by harness name.
//
// The previous version filtered `r.harness === id`, which matched every earlier
// run of the same harness already in the log file. It reported "gateway logged this
// harness: 9 request(s)" for a run whose command line never executed, and the smoke
// test then PASSed that stage while the harness had done nothing at all. That is
// the precise failure this instrument exists to prevent, reproduced inside the
// instrument - a harness that looks verified because records exist somewhere in the
// file. The key is unique per smoke run; the harness name is not.
const mine = lines.filter((r) => r.syntheticKey === smokeKey)
const otherRuns = lines.filter((r) => r.harness === id).length - mine.length
step('gateway logged this harness', mine.length > 0,
  mine.length + ' request(s) with key ' + smokeKey +
  (otherRuns > 0 ? '   (' + otherRuns + ' older ' + id + ' record(s) in this log are NOT counted)' : ''))
if (mine.length) {
  const withUsage = mine.filter((r) => r.usage && r.usage.inputTokens != null)
  const withCache = withUsage.filter((r) => r.usage.cacheHitTokens != null)
  const inTok = withUsage.reduce((a, r) => a + (r.usage.inputTokens || 0), 0)
  const outTok = withUsage.reduce((a, r) => a + (r.usage.outputTokens || 0), 0)
  const hit = withCache.reduce((a, r) => a + (r.usage.cacheHitTokens || 0), 0)
  const miss = withCache.reduce((a, r) => a + (r.usage.cacheMissTokens || 0), 0)
  const cost = mine.reduce((a, r) => a + (r.cost?.billedUsd || 0), 0)
  step('usage captured', withUsage.length > 0, inTok + ' in / ' + outTok + ' out tokens')
  step('cache split captured', withCache.length > 0,
    withCache.length ? 'hit=' + hit + ' miss=' + miss + '  (' + ((hit / Math.max(1, hit + miss)) * 100).toFixed(1) + '% cached)' : 'provider returned no cache fields')
  console.log('        billed for this smoke run: $' + cost.toFixed(5))
  const rewritten = mine.filter((r) => (r.deviations || []).length).length
  if (rewritten) console.log('        ' + rewritten + ' request(s) were rewritten to enforce the study model')
}

console.log('')
const ok = results.every((r) => r.ok)
console.log(ok ? 'SMOKE PASS - this harness is usable in the study' : 'SMOKE FAIL - see the FAIL lines above')
if (ok) console.log('Update tools/harnesses.mjs: set verified for "' + id + '" and record what worked.')
process.exit(ok ? 0 : 1)
