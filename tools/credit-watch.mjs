/**
 * credit-watch — stop a matrix the moment a provider runs out of credit.
 *
 * WHY THIS EXISTS. Three times in this study a provider ran dry mid-matrix and the run
 * kept going: GLM-5.3 lost 6 runs, DeepSeek lost 258 of 434, and Anthropic lost ~460 of
 * 620. The failures cost no money - a 4xx bills nothing - but they cost the thing that
 * is actually scarce, which is TIME, and they leave a matrix that looks like a result
 * and is not. This detects the condition from the harness's own error text and stops
 * the affected run immediately, leaving every completed run intact on disk.
 *
 * It does not retry, resume, or spend. It watches and reports.
 *
 *   node tools/credit-watch.mjs [--poll 30] [--threshold 4]
 */
import { readFileSync, existsSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
const POLL_MS = Number(opt('--poll', 30)) * 1000
// Consecutive failures before declaring exhaustion. One or two credit errors can be a
// transient provider hiccup; a wall of them is the account being empty.
const THRESHOLD = Number(opt('--threshold', 4))
// --kill terminates the run, --no-kill only reports. Default is to kill: the request was
// explicitly "stops and lets you know", and a watcher that reports a dead matrix while it
// grinds through 500 more failing runs has not saved anything.
const KILL = !argv.includes('--no-kill')

/**
 * Stop one matrix by finding the process whose command line names its output directory.
 *
 * Deliberately narrow. It matches on "--out results/<name>" so it cannot touch a gateway,
 * another matrix, or this watcher. Gateways are left running: they hold no credit and
 * killing one would break every other matrix on the same provider.
 */
function stopMatrix(name) {
  const ps = [
    '$ErrorActionPreference = "SilentlyContinue"',
    'Get-CimInstance Win32_Process -Filter "Name = ' + "'node.exe'" + '" |',
    '  Where-Object { $_.CommandLine -like "*--out results/' + name + '*" } |',
    '  ForEach-Object { Write-Output ("  killed pid " + $_.ProcessId + " for ' + name + '"); Stop-Process -Id $_.ProcessId -Force }',
  ].join(String.fromCharCode(10))
  try {
    const r = spawnSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    const out = (r.stdout ?? '').trim()
    const NL = String.fromCharCode(10)
    console.log(out ? out.split(NL).map((l) => '  ' + l.trim()).join(NL) : '  (no matching process found - it may already have finished)')
  } catch (e) {
    console.log('  could not stop it automatically: ' + e.message)
    console.log('  stop it manually: the run writing results/' + name)
  }
}

/**
 * Provider credit-exhaustion signatures. Each is the provider's OWN wording, taken from
 * an error this study actually hit, so the detector does not fire on the word "quota"
 * appearing in a task fixture - which is exactly what happened to multi-file-retry-policy,
 * whose source code discusses quota policy and which produced six false positives.
 */
const SIGNATURES = [
  { provider: 'Anthropic', re: /credit balance is too low/i },
  { provider: 'DeepSeek',  re: /Insufficient Balance|QUOTA:\s*\[1113\]|no resource package/i },
  { provider: 'Z.AI',      re: /Insufficient Balance|QUOTA:\s*\[1113\]|no resource package/i },
  { provider: 'Qwen',      re: /Insufficient Balance|Arrearage|quota exceeded/i },
  { provider: 'OpenAI',    re: /insufficient_quota|exceeded your current quota|billing hard limit/i },
]

function creditHit(run) {
  const text = (run.stderrTail ?? '') + '\n' + (run.stdoutTail ?? '')
  for (const s of SIGNATURES) if (s.re.test(text)) return s.provider
  return null
}

/** Every results/* dir that has a runs.jsonl. */
function activeRuns() {
  const out = []
  for (const d of readdirSync('results')) {
    const p = join('results', d, 'runs.jsonl')
    if (!existsSync(p)) continue
    const ageMin = (Date.now() - statSync(p).mtimeMs) / 60000
    // A file untouched for 30 minutes is a finished or abandoned run, not an active one.
    if (ageMin > 30) continue
    out.push({ name: d, path: p, ageMin })
  }
  return out
}

const already = new Set()
const alerts = []

function check() {
  for (const r of activeRuns()) {
    let runs = []
    try {
      runs = readFileSync(r.path, 'utf8').split('\n').filter(Boolean)
        .map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
    } catch { continue }
    if (runs.length < THRESHOLD) continue
    // Look at the TAIL. Earlier credit errors recovered from, or predate a top-up.
    const tail = runs.slice(-THRESHOLD)
    const hits = tail.map(creditHit)
    if (hits.every((h) => h)) {
      const provider = hits[0]
      if (already.has(r.name)) continue
      already.add(r.name)
      alerts.push({ run: r.name, provider, at: new Date().toISOString(), total: runs.length })
      const solved = runs.filter((x) => x.solved).length
      console.log('')
      console.log('  *** CREDIT EXHAUSTED ***')
      console.log('  run      : ' + r.name)
      console.log('  provider : ' + provider)
      console.log('  last ' + THRESHOLD + ' runs all failed on credit')
      console.log('  progress : ' + runs.length + ' records, ' + solved + ' solved')
      console.log('  ACTION   : stopping this matrix now. Completed runs are on disk.')
      if (KILL) stopMatrix(r.name)
    } else if (already.has(r.name) && !hits.every((h) => h)) {
      // Credit came back - a top-up landed.
      already.delete(r.name)
      console.log('  [recovered] ' + r.name + ' - credit errors have stopped')
    }
  }
  if (alerts.length) {
    const md = ['# CREDIT ALERT', '',
      'A provider ran out of credit mid-matrix. The affected runs made no billable requests -',
      'a 4xx costs nothing - so **no money was lost**. What was lost is time and matrix coverage.',
      '',
      '| run | provider | detected | records at detection |',
      '|---|---|---|---|',
      ...alerts.map((a) => '| ' + a.run + ' | ' + a.provider + ' | ' + a.at + ' | ' + a.total + ' |'),
      '',
      '## What to do',
      '',
      '1. Top up the named provider.',
      '2. Restart that matrix - the runner overwrites its output directory, so move the old',
      '   one aside first if the partial data matters.',
      '3. Runs already on disk are valid; only the credit-failed tail is not.',
      '',
      '## Why these runs are excluded',
      '',
      'They are infrastructure failures under the pre-registration exclusion rules, not model',
      'failures. The distinction is the whole reason this watcher exists: DeepSeek once lost 258',
      'of 434 runs this way and it briefly read as a result.',
      ''].join('\n')
    writeFileSync('CREDIT-ALERT.md', md)
  }
}

console.log('credit-watch: polling every ' + (POLL_MS / 1000) + 's, threshold ' + THRESHOLD + ' consecutive')
console.log('watching: ' + activeRuns().map((r) => r.name).join(', '))
check()
setInterval(check, POLL_MS)
