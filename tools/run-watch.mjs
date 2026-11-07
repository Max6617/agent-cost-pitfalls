/**
 * run-watch - stop a matrix when something breaks, not only when credit runs out.
 *
 * Credit exhaustion costs time. An OOM kill or a dead gateway costs the RUN: the matrix
 * stops progressing, nothing restarts it, and no alert fires. With 356 MB free RAM the
 * second class is the likelier one here, so a credit-only check would give false
 * confidence. This watches four things: credit, memory, gateway liveness, and stalls.
 *
 *   node tools/run-watch.mjs [--poll 30] [--threshold 4] [--no-kill]
 */
import { readFileSync, existsSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
const POLL = Number(opt('--poll', 30)) * 1000
const THRESHOLD = Number(opt('--threshold', 4))
const KILL = !argv.includes('--no-kill')
const NL = String.fromCharCode(10)

// Provider billing wording, taken from errors this study actually hit. Never the bare
// word quota: a task fixture discussing quota policy produced six false positives on
// runs that had SOLVED.
const SIGS = [
  ['Anthropic', /credit balance is too low/i],
  ['DeepSeek',  /Insufficient Balance|QUOTA:\s*\[1113\]|no resource package/i],
  ['Z.AI',      /Insufficient Balance|QUOTA:\s*\[1113\]|no resource package/i],
  ['Qwen',      /Insufficient Balance|Arrearage/i],
  ['OpenAI',    /insufficient_quota|exceeded your current quota|billing hard limit/i],
]
const GW = [[8789, 'haiku'], [8790, 'qwen'], [8791, 'sonnet'], [8792, 'glm-flash'], [8793, 'openai']]
const alerts = []
const creditSeen = new Set()
const stallSeen = new Map()
const stallDone = new Set()
let healthDone = false

function ps(cmd) {
  const r = spawnSync('powershell', ['-NoProfile', '-Command', cmd], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  return (r.stdout ?? '').trim()
}

function active() {
  const out = []
  let dirs = []
  try { dirs = readdirSync('results') } catch { return out }
  for (const d of dirs) {
    const p = join('results', d, 'runs.jsonl')
    if (!existsSync(p)) continue
    if ((Date.now() - statSync(p).mtimeMs) / 60000 > 45) continue
    out.push({ name: d, path: p })
  }
  return out
}

function providerOf(run) {
  const t = (run.stderrTail ?? '') + NL + (run.stdoutTail ?? '')
  for (const s of SIGS) if (s[1].test(t)) return s[0]
  return null
}

function stopMatrix(name) {
  const q = 'Get-CimInstance Win32_Process -Filter "Name = \'node.exe\'" | Where-Object { $_.CommandLine -like "*--out results/' + name + '*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Output $_.ProcessId }'
  const out = ps(q)
  console.log(out ? '  stopped pids: ' + out.split(NL).join(', ') : '  (no matching process - may have finished)')
}

function checkCredit() {
  for (const r of active()) {
    let runs = []
    try { runs = readFileSync(r.path, 'utf8').split(NL).filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean) } catch { continue }
    if (runs.length < THRESHOLD) continue
    const hits = runs.slice(-THRESHOLD).map(providerOf)
    if (hits.every((h) => h)) {
      if (creditSeen.has(r.name)) continue
      creditSeen.add(r.name)
      const solved = runs.filter((x) => x.solved).length
      console.log('');
      console.log('  *** CREDIT EXHAUSTED ***  ' + r.name + '  provider ' + hits[0]);
      console.log('  ' + runs.length + ' records, ' + solved + ' solved');
      alerts.push({ run: r.name, kind: 'CREDIT', detail: hits[0], at: new Date().toISOString(), n: runs.length });
      if (KILL) stopMatrix(r.name);
    } else if (creditSeen.has(r.name)) { creditSeen.delete(r.name); console.log('  [recovered] ' + r.name) }
  }
}

function checkHealth() {
  const problems = []
  const mb = Number(ps('$o = Get-CimInstance Win32_OperatingSystem; [math]::Round($o.FreePhysicalMemory/1024)'))
  if (Number.isFinite(mb) && mb > 0 && mb < 400) problems.push(['MEMORY', 'only ' + mb + ' MB RAM free - the OS may kill a matrix']);
  for (const g of GW) {
    const st = ps('try { $null = Invoke-RestMethod -Uri "http://127.0.0.1:' + g[0] + '/__stats" -TimeoutSec 3; "up" } catch { "down" }' + '')
    if (st === 'down') problems.push(['GATEWAY_DOWN', 'port ' + g[0] + ' (' + g[1] + ') not answering']);
  }
  for (const p of problems) console.log('  [health] ' + p[0] + ': ' + p[1]);
  if (problems.length && !healthDone) {
    healthDone = true;
    for (const p of problems) alerts.push({ run: '-', kind: p[0], detail: p[1], at: new Date().toISOString(), n: 0 });
  }
  if (!problems.length) healthDone = false;
}

function checkStall() {
  for (const r of active()) {
    let n = 0
    try { n = readFileSync(r.path, 'utf8').split(NL).filter(Boolean).length } catch { continue }
    const prev = stallSeen.get(r.name);
    stallSeen.set(r.name, { n, at: Date.now() });
    if (!prev || stallDone.has(r.name)) continue;
    const mins = (Date.now() - prev.at) / 60000;
    if (mins >= 8 && n === prev.n) {
      stallDone.add(r.name);
      console.log('  *** STALLED ***  ' + r.name + ' unchanged at ' + n + ' records');
      alerts.push({ run: r.name, kind: 'STALLED', detail: 'no new records for ' + mins.toFixed(0) + ' min', at: new Date().toISOString(), n });
    }
  }
}

function writeAlerts() {
  if (!alerts.length) return
  const head = ['# RUN ALERT', '', 'Credit failures bill nothing - a 4xx costs no money - so the cost is time and', 'coverage, not spend. Completed runs are valid; only the failed tail is not.', '', '| when | run | kind | detail | records |', '|---|---|---|---|---|'];
  const rows = alerts.map((a) => '| ' + a.at + ' | ' + a.run + ' | ' + a.kind + ' | ' + a.detail + ' | ' + a.n + ' |');
  const tail = ['', '## What to do', '', '- CREDIT: top up, then restart that matrix.', '- MEMORY: stop one matrix before the OS picks one; lose the slowest.', '- GATEWAY_DOWN: restart with scripts/start-provider.ps1 -Provider <name>.', '- STALLED: the process is gone or wedged; check whether it finished.', ''];
  writeFileSync('notes/status/RUN-ALERT.md', head.concat(rows).concat(tail).join(NL));
}

console.log('run-watch: poll ' + (POLL / 1000) + 's, credit threshold ' + THRESHOLD + ', kill=' + KILL);
console.log('watching: ' + active().map((r) => r.name).join(', '));
let tick = 0;
function cycle() { checkCredit(); if (++tick % 4 === 0) { checkHealth(); checkStall() } writeAlerts() }
cycle();
setInterval(cycle, POLL);
