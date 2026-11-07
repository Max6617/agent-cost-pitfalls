/**
 * credit-alert.mjs - a big, flashing, red, always-on-top window that names the provider whose
 * credit just ran out, and says how much to put on it.
 *
 * WHY A WINDOW. Three times in this study a provider ran dry mid-matrix and the run kept
 * going: GLM-5.3 lost 6 runs, DeepSeek lost 258 of 434, Anthropic lost ~460 of 620. The
 * failures bill nothing - a 4xx is free - so the loss is not money, it is TIME and COVERAGE,
 * and it arrives silently: the matrix keeps printing lines that look like results. A log line
 * does not stop that. Something that takes over the screen does.
 *
 * WHAT IT SHOWS
 *   RED, flashing  - a provider is out of credit RIGHT NOW. Giant provider name, the amount
 *                    to load, and the console URL that tops it up.
 *   AMBER          - credit errors have stopped, or a provider is close to its ceiling.
 *   GREEN          - every provider in the plan is funded.
 *
 * WHERE IT GETS ITS FACTS (it invents nothing)
 *   1. results/_scratch/pipeline-status.json  - written by tools/collect.mjs while it runs
 *   2. recent runs.jsonl tails under results/ - the providers' OWN error wording, the same
 *      signatures tools/credit-watch.mjs uses, so the word "quota" in a task fixture cannot
 *      fire it (that false positive happened: multi-file-retry-policy, six times)
 *   3. results/_scratch/providers.json        - the last tools/check-providers.mjs result
 *   4. POST /alert {provider, reason}         - anything else that knows
 *
 *   node tools/credit-alert.mjs --open                  # server + its own window
 *   node tools/credit-alert.mjs --once                  # print the state, exit
 *   node tools/credit-alert.mjs --open --test deepseek  # prove the window works, no spend
 */
import { createServer } from 'node:http'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { PROVIDERS, CHEAP_ORDER, recommend } from './credit-plan.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '..')
const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
const has = (n) => argv.includes(n)

const wantPort = Number(opt('--port', 8899))
const openWindow = has('--open')
const once = has('--once')
const testProvider = opt('--test', null)
const SCAN_MS = Number(opt('--scan', 10)) * 1000

/** The providers' own wording, copied from tools/credit-watch.mjs - not a guess. */
const SIGNATURES = [
  { id: 'anthropic', re: /credit balance is too low/i },
  { id: 'deepseek', re: /Insufficient Balance|QUOTA:\s*\[1113\]|no resource package/i },
  { id: 'zai', re: /Insufficient Balance|QUOTA:\s*\[1113\]|no resource package/i },
  { id: 'qwen', re: /Insufficient Balance|Arrearage|quota exceeded/i },
  { id: 'openai', re: /insufficient_quota|exceeded your current quota|billing hard limit/i },
]

const manual = []          // POSTed alerts, cleared by POST /clear
const detected = new Map() // provider -> { at, run, records }

/** Recent run records across every matrix, newest first. Bounded: never accumulates. */
function recentRuns (limit = 4000) {
  const files = []
  const walk = (dir, depth) => {
    if (depth > 2) return
    let es; try { es = readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of es) {
      const p = join(dir, e.name)
      if (e.isDirectory()) { walk(p, depth + 1); continue }
      if (e.name !== 'runs.jsonl') continue
      try { files.push({ p, m: statSync(p).mtimeMs }) } catch {}
    }
  }
  walk(join(repo, 'results'), 0)
  files.sort((a, b) => b.m - a.m)
  const out = []
  for (const f of files) {
    let lines
    try { lines = readFileSync(f.p, 'utf8').split('\n') } catch { continue }
    const tail = lines.slice(-250)
    for (const l of tail) {
      if (!l.trim()) continue
      try { out.push({ ...JSON.parse(l), __file: f.p }) } catch {}
      if (out.length >= limit) return out
    }
  }
  return out
}

function scan () {
  const runs = recentRuns()
  const seen = new Map()
  for (const r of runs) {
    const text = String(r.stderrTail ?? '') + '\n' + String(r.stdoutTail ?? '') + '\n' + String(r.error ?? '')
    for (const s of SIGNATURES) {
      if (!s.re.test(text)) continue
      const cur = seen.get(s.id) ?? { n: 0, last: null, at: null }
      cur.n++
      if (!cur.at || (r.ts && r.ts > cur.at)) { cur.at = r.ts ?? null; cur.last = r.harness + '/' + r.arm + '/' + r.task }
      seen.set(s.id, cur)
    }
  }
  detected.clear()
  for (const [id, v] of seen) detected.set(id, v)

  // How much of the running matrix's money is already spent, from the gateway logs.
  let pipeline = null
  const psPath = join(repo, 'results', '_scratch', 'pipeline-status.json')
  if (existsSync(psPath)) { try { pipeline = JSON.parse(readFileSync(psPath, 'utf8')) } catch {} }
  let providerProbe = null
  const ppPath = join(repo, 'results', '_scratch', 'providers.json')
  if (existsSync(ppPath)) { try { providerProbe = JSON.parse(readFileSync(ppPath, 'utf8')) } catch {} }

  const providers = {}
  for (const id of Object.keys(PROVIDERS)) {
    const p = PROVIDERS[id]
    const det = detected.get(id) ?? null
    const probe = providerProbe?.[id] ?? null
    let state = 'ok', detail = 'no credit errors seen'
    if (det) { state = 'empty'; detail = det.n + ' run(s) failed on the provider\'s own credit error' + (det.last ? ' (last: ' + det.last + ')' : '') }
    else if (probe && /empty|insufficient|no credit/i.test(String(probe.status ?? ''))) { state = 'empty'; detail = 'check-providers: ' + probe.status }
    else if (probe && probe.funded === false) { state = 'empty'; detail = 'check-providers reports not funded' }
    providers[id] = {
      id, label: p.label, model: p.model, state, detail,
      loadUsd: recommend(id, { batch1: true }).recommendedUsd,
      console: p.console,
      balance: probe?.balanceUsd ?? null,
      balanceNote: p.balanceApi ? 'reported by the provider' : 'no balance endpoint - a 1-token probe is the only signal',
    }
  }
  for (const m of manual) {
    const id = m.provider in providers ? m.provider : null
    if (id) { providers[id].state = m.state ?? 'empty'; providers[id].detail = m.reason ?? 'alerted by the pipeline' }
  }
  if (testProvider && providers[testProvider]) {
    providers[testProvider].state = 'empty'
    providers[testProvider].detail = 'TEST ALERT - no provider has actually run out'
  }
  const alerts = Object.values(providers).filter((p) => p.state === 'empty')
  return {
    at: new Date().toISOString(),
    worst: alerts.length ? (testProvider ? 'test' : 'empty') : (Object.values(providers).some((p) => p.state === 'warn') ? 'warn' : 'ok'),
    alerts, providers, pipeline,
    scannedRuns: runs.length,
  }
}

// ------------------------------------------------------------------ the window
const PAGE = (port) => `<!doctype html>
<html><head><meta charset="utf-8"><title>PROVIDER CREDIT</title>
<style>
  :root { --bg:#07090c; --ink:#e8eef7; --red:#ff2d2d; --amber:#ffb020; --green:#22c55e; }
  * { box-sizing:border-box; }
  html,body { margin:0; height:100%; background:var(--bg); color:var(--ink);
    font-family:"Segoe UI Variable Display","Segoe UI",system-ui,sans-serif; overflow:hidden; }
  #wrap { height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:2vh 2vw; }
  .kicker { font-size:2.2vh; letter-spacing:.5em; text-transform:uppercase; opacity:.55; }
  h1 { margin:.4vh 0 .6vh; font-size:13vh; line-height:.95; font-weight:800; letter-spacing:-.02em; }
  .sub { font-size:3.4vh; opacity:.9; max-width:80vw; }
  .load { margin-top:3vh; font-size:6vh; font-weight:800; }
  .load small { display:block; font-size:1.8vh; font-weight:400; letter-spacing:.25em; opacity:.6; text-transform:uppercase; }
  .url { margin-top:1.6vh; font-size:2.4vh; opacity:.85; font-family:Consolas,monospace; word-break:break-all; }
  .foot { position:fixed; bottom:1.4vh; left:0; right:0; font-size:1.7vh; opacity:.45; font-family:Consolas,monospace; }
  body.ok   { background:radial-gradient(circle at 50% 40%, #0b2016 0%, #07090c 70%); }
  body.warn { background:radial-gradient(circle at 50% 40%, #2a1f05 0%, #07090c 70%); }
  body.empty { animation:flash 1s steps(1,end) infinite; }
  body.empty h1, body.empty .kicker, body.empty .load, body.empty .sub { color:#fff; text-shadow:0 0 6vh rgba(0,0,0,.6); }
  @keyframes flash { 0%,49% { background:#c40000; } 50%,100% { background:#5a0000; } }
  .pills { margin-top:2.6vh; display:flex; gap:1.4vh; flex-wrap:wrap; justify-content:center; }
  .pill { border:.25vh solid rgba(255,255,255,.25); border-radius:999px; padding:.9vh 2vh; font-size:2vh; }
  .pill.empty { background:#fff; color:#a00; border-color:#fff; font-weight:700; }
  .pill.warn { border-color:var(--amber); color:var(--amber); }
  .pill.ok { border-color:rgba(34,197,94,.5); color:#7ee2a0; }
</style></head>
<body>
<div id="wrap">
  <div class="kicker" id="kicker">all providers funded</div>
  <h1 id="head">OK</h1>
  <div class="sub" id="sub">watching for credit exhaustion</div>
  <div class="load" id="load"></div>
  <div class="url" id="url"></div>
  <div class="pills" id="pills"></div>
</div>
<div class="foot" id="foot"></div>
<script>
const state = (s) => {
  const b = document.body
  b.className = s.worst === 'empty' ? 'empty' : (s.worst === 'warn' ? 'warn' : 'ok')
  const K = document.getElementById('kicker'), H = document.getElementById('head')
  const S = document.getElementById('sub'), L = document.getElementById('load')
  const U = document.getElementById('url'), P = document.getElementById('pills')
  const F = document.getElementById('foot')
  if (s.worst === 'empty' || s.worst === 'test') {
    const a = s.alerts[0]
    K.textContent = s.worst === 'test' ? 'test alert - nothing is actually out of credit' : 'provider out of credit'
    H.textContent = a.label.toUpperCase()
    S.textContent = a.detail
    L.innerHTML = 'LOAD $' + a.loadUsd + ' <small>recommended, batch-1 sweep x1.3 margin</small>'
    U.textContent = a.console
  } else if (s.worst === 'warn') {
    K.textContent = 'attention'; H.textContent = 'WATCH'; S.textContent = 'a provider is close to its limit'
    L.innerHTML = ''; U.textContent = ''
  } else {
    K.textContent = 'all providers funded'; H.textContent = 'OK'
    S.textContent = 'no credit errors in the last ' + s.scannedRuns + ' run records'
    L.innerHTML = ''; U.textContent = ''
  }
  P.innerHTML = Object.values(s.providers).map(p =>
    '<div class="pill ' + p.state + '">' + p.label + (p.balance !== null ? '  $' + p.balance : '') + '</div>').join('')
  F.textContent = 'updated ' + s.at + '   |   ' + location.origin + (s.pipeline ? '   |   pipeline: ' + JSON.stringify(s.pipeline).slice(0, 160) : '')
}
const tick = async () => { try { state(await (await fetch('/state')).json()) } catch (e) {} }
tick(); setInterval(tick, 2000)
</script></body></html>`

function findBrowser () {
  const cands = [
    process.env['ProgramFiles(x86)'] && join(process.env['ProgramFiles(x86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env.ProgramFiles && join(process.env.ProgramFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env.ProgramFiles && join(process.env.ProgramFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env['ProgramFiles(x86)'] && join(process.env['ProgramFiles(x86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ].filter(Boolean)
  for (const c of cands) if (existsSync(c)) return c
  return null
}

function openOwnWindow (url) {
  const exe = findBrowser()
  if (!exe) {
    console.log('')
    console.log('  ' + '='.repeat(76))
    console.log('  !!  NO BROWSER FOUND - open this yourself: ' + url)
    console.log('  ' + '='.repeat(76))
    return false
  }
  // --app is what makes it ITS OWN WINDOW: no tabs, no address bar, nothing to click away.
  const child = spawn(exe, ['--app=' + url, '--start-maximized', '--no-first-run', '--no-default-browser-check',
    // The browser's user-data-dir lives in the OS temp dir under the dsh-exp- prefix, NOT in
    // results/. It went into results/_scratch first, and Edge filled it with its own JS - which
    // the repo-wide destructive-primitive scan in tools/safe-fs.test.mjs then walked into and
    // flagged. A browser profile is not evidence and does not belong in the archive.
    '--user-data-dir=' + join(tmpdir(), 'dsh-exp-credit-alert-profile')], { detached: true, stdio: 'ignore' })
  child.unref()
  return true
}

function banner (s) {
  const line = '='.repeat(78)
  if (s.worst === 'ok') { console.log('credit-alert: OK - every provider funded (' + s.scannedRuns + ' records scanned)'); return }
  for (const a of s.alerts) {
    console.log('')
    console.log(line)
    console.log('  ***  ' + a.label.toUpperCase() + ' IS OUT OF CREDIT  ***')
    console.log(line)
    console.log('  ' + a.detail)
    console.log('  LOAD $' + a.loadUsd + '  ->  ' + a.console)
    console.log(line)
  }
}

// ------------------------------------------------------------------ server
function startServer (port, tries = 0) {
  return new Promise((resolveP) => {
    const srv = createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1')
      if (url.pathname === '/state') {
        const s = scan()
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' })
        res.end(JSON.stringify(s))
        return
      }
      if (url.pathname === '/alert' && req.method === 'POST') {
        let body = ''
        req.on('data', (c) => { body += c })
        req.on('end', () => {
          try {
            const j = JSON.parse(body || '{}')
            // 'empty' IS SOMETHING A CALLER SAYS, NEVER SOMETHING IT FAILS TO SAY.
            //
            // This defaulted to 'empty', so an unlabelled POST rendered as giant flashing red
            // PROVIDER OUT OF CREDIT. On 2026-10-03 that is exactly what happened: collect.mjs's
            // spend meter - a LOCAL BUDGET STOP - posted
            //   { provider: 'qwen', reason: 'matrix stopped by the spend meter: $10.81 of a $12 ceiling' }
            // and the window announced a provider outage, with a recommended top-up of $11, for a
            // provider that was funded throughout and had zero credit-classified runs in 2,487
            // records. The detail line underneath said "stopped by the spend meter" while the
            // headline contradicted it.
            //
            // An unrecognised state is a WARNING. Escalating to an outage is a caller's decision.
            const STATE = new Set(['ok', 'warn', 'empty', 'test'])
            const state = STATE.has(j.state) ? j.state : 'warn'
            manual.push({ provider: j.provider ?? 'unknown', reason: j.reason ?? null, state, at: new Date().toISOString() })
            console.log('ALERT: ' + (j.provider ?? '?') + ' - ' + (j.reason ?? 'no reason given'))
          } catch {}
          res.writeHead(204); res.end()
        })
        return
      }
      if (url.pathname === '/clear') { manual.length = 0; res.writeHead(204); res.end(); return }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
      res.end(PAGE(port))
    })
    srv.on('error', (e) => {
      if (e.code === 'EADDRINUSE' && tries < 20) return resolveP(startServer(port + 1, tries + 1))
      throw e
    })
    srv.listen(port, '127.0.0.1', () => resolveP({ srv, port }))
  })
}

if (once) {
  const s = scan()
  banner(s)
  process.exit(s.worst === 'ok' ? 0 : 1)
}

const { port } = await startServer(wantPort)
const url = 'http://127.0.0.1:' + port
const state = scan()
banner(state)
console.log('credit-alert: serving ' + url + (openWindow ? ' and opening its own window' : '  (--open to get the window)'))
if (openWindow) openOwnWindow(url)

let last = state.worst
setInterval(() => {
  const s = scan()
  if (s.worst !== last) { banner(s); last = s.worst }
  // Keep the last known state on disk so a later run can see what happened.
  try {
    mkdirSync(join(repo, 'results', '_scratch'), { recursive: true })
    writeFileSync(join(repo, 'results', '_scratch', 'credit-alert-last.json'), JSON.stringify(s, null, 2) + '\n')
  } catch {}
  if (s.worst !== 'ok') {
    const md = ['# CREDIT ALERT', '', ...s.alerts.map((a) =>
      '- **' + a.label + '** is out of credit. ' + a.detail + '  Recommended load: **$' + a.loadUsd + '** - ' + a.console), '',
      'Updated ' + s.at + '. Providers that are out of credit made no billable requests (a 4xx is free),',
      'so no money was lost - what was lost is time and matrix coverage. Completed runs are valid.',
      'Credit-failed runs are INFRASTRUCTURE failures under the pre-registration exclusion rules, not',
      'model failures.', ''].join('\n')
    // INTO THE SCRATCH ROOT, NOT THE REPO ROOT. This is transient state - "top this provider up" -
  // not evidence, and results/_scratch is the designated place for exactly that (it is untracked
  // and the backup skips it, by design). Written to the repo root it became an untracked file,
  // and an untracked file was enough to make git answer "nothing added to commit but untracked
  // files present" - which collect.mjs misread as a failed commit on the qwen sign-off.
  try { mkdirSync(join(repo, 'results', '_scratch'), { recursive: true }); writeFileSync(join(repo, 'results', '_scratch', 'CREDIT-ALERT.md'), md) } catch {}
  }
}, SCAN_MS)
