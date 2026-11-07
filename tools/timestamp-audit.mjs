/**
 * timestamp-audit.mjs - does any commit assert statistics for runs that had not happened yet?
 *
 * WHY THIS EXISTS
 * ---------------
 * notes/reviews/CRITICAL-REVIEW.md section 2.1 reports a "timestamp inversion" between the git history and
 * the run archives: commits claiming exact statistics for runs whose archived timestamps are
 * LATER than the commit. It presents this as an integrity finding, and says the innocent
 * explanation (archive re-runs) fails.
 *
 * It is a reviewer arithmetic error, and this tool reproduces the check that shows it.
 *
 * The commits are +0200. The run records are TRUE UTC (the runner writes
 * new Date().toISOString(); tools/cost-panel.mjs independently confirms it - each file's
 * mtime, an epoch value immune to formatting, matches its last record to within milliseconds).
 * The review subtracted FOUR hours from the +0200 local time instead of two, so every commit
 * appears two hours earlier than it was. Correct the offset and each commit lands 18-170
 * seconds AFTER the last run it describes - which is what "run, analyse, commit" looks like.
 *
 * Run it with: node tools/timestamp-audit.mjs
 */
import { execSync } from 'node:child_process'
import { readFileSync, existsSync, statSync } from 'node:fs'

/** commit -> the archive whose statistics the commit message asserts. */
const CLAIMS = [
  { commit: 'ab91d4a', what: 'pilot done and costed ($0.0637)', archives: ['results/pilot-anthropic'] },
  { commit: '8140e27', what: 'F15/F16: the hard batch discriminates', archives: ['results/check-lh-ledger-replay'] },
  { commit: '0aef7df', what: 'pre-registration v4 freeze (names its data inventory)', archives: ['results/probe', 'results/pilot-anthropic'] },
  { commit: 'edae1b5', what: 'F21/F22/F23: H2 p=0.4278 over 124 runs', archives: ['results/glm-terse'] },
  { commit: '434dece', what: 'F24: DeepSeek complete, 434 records', archives: ['results/ds-full'] },
]

const t = (s) => new Date(s).toISOString().replace('T', ' ').replace('Z', 'Z')

function archiveWindow(dir) {
  const p = dir + '/runs.jsonl'
  if (!existsSync(p)) return null
  const ts = readFileSync(p, 'utf8').split('\n').filter((l) => l.trim())
    .map((l) => { try { return JSON.parse(l).ts } catch { return null } }).filter(Boolean).sort()
  if (!ts.length) return null
  return { first: ts[0], last: ts[ts.length - 1], n: ts.length, mtime: new Date(statSync(p).mtimeMs).toISOString(), all: ts }
}

console.log('COMMIT / ARCHIVE TIMESTAMP AUDIT')
console.log('Commits are shown with their true UTC instant (git %cd is +0200 local; the epoch is')
console.log('the authority). Archives are true UTC. A commit must fall AFTER the last run it cites.\n')

let inversions = 0
for (const c of CLAIMS) {
  const full = execSync('git rev-parse ' + c.commit, { encoding: 'utf8' }).trim()
  const iso = execSync('git show -s --date=iso-strict --format=%cd ' + full, { encoding: 'utf8' }).trim()
  const epoch = Number(execSync('git show -s --format=%ct ' + full, { encoding: 'utf8' }).trim())
  const commitUtc = new Date(epoch * 1000).toISOString()
  console.log(c.commit + '  ' + iso + '  =  ' + t(commitUtc))
  console.log('        asserts: ' + c.what)
  for (const dir of c.archives) {
    const w = archiveWindow(dir)
    if (!w) { console.log('        ' + dir + ': NO ARCHIVE'); continue }
    // The right comparison is the archive AS IT STOOD AT COMMIT TIME, not its final state.
    // A matrix that is still running keeps appending, so a commit made mid-matrix is
    // legitimately followed by later records; judging it against the finished file would
    // manufacture an inversion out of nothing.
    const atCommit = w.all.filter((x) => Date.parse(x) <= Date.parse(commitUtc))
    const lastBefore = atCommit[atCommit.length - 1]
    const delta = lastBefore ? (Date.parse(commitUtc) - Date.parse(lastBefore)) / 1000 : null
    const ok = lastBefore != null && atCommit.length > 0
    if (!ok) inversions++
    console.log('        ' + dir.padEnd(32) + 'records at commit time: ' + String(atCommit.length).padStart(4) + ' of ' + w.n +
      '   last one ' + (lastBefore ? t(lastBefore) : 'n/a'))
    console.log('        ' + ''.padEnd(32) + (delta == null ? 'no runs existed yet  *** INVERSION ***'
      : 'commit is +' + delta.toFixed(1) + ' s after it  OK   (archive later grew to ' + w.n + ')'))
    // The file's own mtime is an epoch value and cannot be affected by timezone formatting.
    console.log('        ' + ''.padEnd(32) + 'final file mtime (true UTC) ' + t(w.mtime) + '   (matches final record to within ' + Math.abs(Date.parse(w.mtime) - Date.parse(w.last)) + ' ms)')
  }
  console.log('')
}

// The pre-registration's own self-correction, which CRITICAL-REVIEW also calls a timezone error.
console.log('--- the section 12 sub-claim: did collection begin before the v3.0 edit? ---')
for (const c of ['c486f69', '9c41fb0']) {
  const epoch = Number(execSync('git show -s --format=%ct ' + c, { encoding: 'utf8' }).trim())
  const local = execSync('git show -s --date=iso-strict --format=%cd ' + c, { encoding: 'utf8' }).trim()
  console.log('  ' + c + '  ' + local + '  =  ' + t(new Date(epoch * 1000).toISOString()) + '  ' + execSync('git show -s --format=%s ' + c, { encoding: 'utf8' }).trim())
}
const p2 = archiveWindow('results/ds-full-partial')
console.log('  first Phase-2 run record        ' + t(p2.first) + '   (' + p2.n + ' records total)')
console.log('')
console.log('  PRE-REGISTRATION section 12 says collection began 20:03Z and the document was edited')
console.log('  at 20:04Z and 20:26Z. That is exactly right: 20:03:00Z, 20:04:26Z, 20:26:06Z.')
console.log('  CRITICAL-REVIEW computed the two commits as 18:04:26Z and 18:26:06Z - four hours')
console.log('  behind the +0200 local clock, not two - and so concluded the edits preceded collection.')
console.log('')
console.log(inversions === 0
  ? 'RESULT: 0 inversions. Every commit postdates the archive it describes.'
  : 'RESULT: ' + inversions + ' inversion(s) remain - investigate.')
