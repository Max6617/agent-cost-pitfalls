/**
 * run-cache-ab.mjs - the caching A/B as ONE reproducible command.
 *
 * FINDINGS F37 is the paper's mechanism experiment. The first time it ran it took three gateways
 * started by hand on three ports, three runners started by hand, and a note in SESSION-STATE
 * telling a future reader which port was which condition. That is not reproducible, and the
 * condition a run was in could only be recovered from the gateway's deviation log.
 *
 * This starts the three conditions itself, waits for each to answer, runs them concurrently so no
 * condition is confounded with time, refuses to start if the provider is not funded, and stops
 * early if the balance runs out mid-experiment - which is what silently invalidated 155 runs on
 * 2026-10-01 (F39).
 *
 *   node tools/run-cache-ab.mjs --model claude-sonnet-5.5 --tag sonnet
 *   node tools/run-cache-ab.mjs --model claude-haiku-4.5  --tag haiku
 *
 * Conditions, identical in every respect except the request field:
 *   none    no cache_control is sent at all - the harness's raw behaviour
 *   static  the system + last-tool breakpoints this gateway injects (the STUDY'S OWN condition)
 *   auto    static PLUS the top-level field that carries the breakpoint forward
 */
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, mkdirSync, openSync, closeSync } from 'node:fs'
import { loadKeys } from './keys.mjs'
import { classifyRun } from './exclusions.mjs'

const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
const MODEL = opt('--model', 'claude-sonnet-5.5')
const TAG = opt('--tag', MODEL.replace(/[^a-z0-9]+/gi, '-'))
const TASKS = opt('--tasks', 'tasks-cacheab')
const SEEDS = opt('--seeds', '1')
const JOBS = opt('--jobs', '2')
const ARMS = opt('--arms', 'native,ptc,native-opt,ptc-opt,native-terse,ptc-terse')

const keys = loadKeys()
if (!keys.anthropic) { console.error('no Anthropic key in .keys.json'); process.exit(2) }

// A funded account is a precondition, not an assumption (PRE-REGISTRATION rule 9).
console.log('checking the provider before spending anything...')
{
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': keys.anthropic, 'anthropic-version': '2023-06-01',
      ...(keys.anthropic_workspace ? { 'anthropic-workspace-id': keys.anthropic_workspace } : {}) },
    body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
    signal: AbortSignal.timeout(30000),
  })
  const txt = await r.text()
  if (!r.ok) {
    const c = classifyRun({ solved: false, stderrTail: txt, stdoutTail: '' })
    console.error('  provider not usable: ' + c.cause + ' - ' + txt.slice(0, 160))
    console.error('  refusing to start a matrix that would measure nothing.')
    process.exit(3)
  }
  console.log('  funded, and the key works.')
}

const CONDITIONS = [
  { id: 'none', flag: '--no-cache-breakpoints', label: 'none (harness as-is)' },
  { id: 'static', flag: null, label: 'static breakpoints (study default)' },
  { id: 'auto', flag: '--auto-cache', label: 'static + automatic' },
]

const children = []
function launch(cmd, args, opts = {}) {
  const c = spawn(cmd, args, { stdio: opts.stdio ?? 'inherit', windowsHide: true, env: opts.env ?? process.env })
  children.push(c)
  return c
}
function shutdown() { for (const c of children) { try { c.kill() } catch {} } }
process.on('SIGINT', () => { shutdown(); process.exit(130) })

console.log('')
console.log('starting ' + CONDITIONS.length + ' gateways for ' + MODEL)
const gwProcs = []
for (const [i, cond] of CONDITIONS.entries()) {
  const port = 8797 + i
  const log = 'results/cacheab-' + TAG + '-' + cond.id + '-gateway.jsonl'
  const args = ['tools/measure-gateway.mjs', '--port', String(port), '--upstream', 'https://api.anthropic.com',
    '--log', log, '--force-model', MODEL, '--max-tokens-ceiling', '32768', '--native-messages']
  if (keys.anthropic_workspace) args.push('--workspace-id', keys.anthropic_workspace)
  if (cond.flag) args.push(cond.flag)
  // The gateway reads the upstream key from this env var. The first version of this file built
  // the object and never passed it to spawn, so all three gateways started with no key and died
  // silently - and because their output went to 'ignore', the reason was invisible. Both fixed:
  // the env is passed, and each gateway writes stdout+stderr to its own file.
  const env = { ...process.env, DEEPSEEK_API_KEY: keys.anthropic }
  const outLog = 'results/cacheab-' + TAG + '-' + cond.id + '-gateway.log'
  const fd = openSync(outLog, 'a')
  const c = launch(process.execPath, args, { stdio: ['ignore', fd, fd], env })
  gwProcs.push({ cond, port, log, outLog, fd, proc: c })
  console.log('  ' + cond.label.padEnd(34) + 'port ' + port + '  log ' + log)
}

// Wait for all three to answer before starting any runner: a matrix pointed at a dead gateway
// produces exactly the failure this study keeps retracting.
for (const g of gwProcs) {
  let ok = false
  for (let i = 0; i < 30 && !ok; i++) {
    await new Promise((r) => setTimeout(r, 1000))
    try { const s = await fetch('http://127.0.0.1:' + g.port + '/__stats', { signal: AbortSignal.timeout(3000) }); ok = s.ok } catch {}
  }
  if (!ok) {
    console.error('gateway for ' + g.cond.id + ' never answered on ' + g.port)
    // Say WHY. A gateway that dies at startup prints the reason; discarding it was the difference
    // between a one-minute diagnosis and a mystery.
    try { console.error('--- ' + g.outLog + ' ---'); console.error(readFileSync(g.outLog, 'utf8').slice(-1200)) } catch {}
    try { const s = await fetch('http://127.0.0.1:' + g.port + '/__stats', { signal: AbortSignal.timeout(2000) }) } catch {}
    shutdown(); process.exit(4)
  }
  const s = await (await fetch('http://127.0.0.1:' + g.port + '/__stats')).json()
  console.log('  ' + g.cond.id.padEnd(8) + 'up  enforcing=' + s.enforced.model +
    '  static=' + s.enforced.cache_static_breakpoints + '  auto=' + s.enforced.cache_automatic_top_level)
}

console.log('')
console.log('running three conditions concurrently - ' + TASKS + ' x ' + ARMS.split(',').length + ' arms x ' + SEEDS + ' seed each')
const runners = []
for (const g of gwProcs) {
  const out = 'results/cache-ab-' + TAG + '-' + g.cond.id
  mkdirSync(out, { recursive: true })
  const c = launch(process.execPath, ['tools/run-experiment.mjs', '--out', out, '--model', MODEL,
    '--gateway', 'http://127.0.0.1:' + g.port, '--tasks', TASKS, '--seeds', SEEDS, '--jobs', JOBS,
    '--harness', 'dsh', '--arms', ARMS], { stdio: 'ignore' })
  runners.push({ cond: g.cond, out, proc: c, started: Date.now() })
}

/** Stop everything if the balance dies: 4 consecutive all-4xx gateway records means empty. */
let aborted = null
const guard = setInterval(async () => {
  if (aborted) return
  for (const g of gwProcs) {
    if (!existsSync(g.log)) continue
    const lines = readFileSync(g.log, 'utf8').trim().split('\n').slice(-6)
    if (lines.length < 4) continue
    const recent = lines.map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
    if (recent.length >= 4 && recent.slice(-4).every((r) => Number(r.status) >= 400)) {
      aborted = g.cond.id + ': 4 consecutive failures - ' + JSON.stringify(recent[recent.length - 1].status)
      console.error('\n!! CREDIT GUARD TRIPPED - ' + aborted)
      console.error('!! stopping all runners. Completed runs are intact on disk; resume after topping up.')
      for (const r of runners) { try { r.proc.kill() } catch {} }
    }
  }
}, 15000)

await Promise.all(runners.map((r) => new Promise((res) => r.proc.on('exit', (code) => { r.code = code; res() }))))
clearInterval(guard)

console.log('')
console.log('=== DONE ===')
for (const r of runners) {
  const p = r.out + '/runs.jsonl'
  const n = existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean).length : 0
  console.log('  ' + r.cond.label.padEnd(34) + n + ' runs  exit=' + r.code)
}
for (const g of gwProcs) { try { closeSync(g.fd) } catch {} }
shutdown()
console.log('')
console.log('next: node tools/cache-ab.mjs --tag ' + TAG)
process.exit(aborted ? 5 : 0)
