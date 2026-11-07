/**
 * exclusions.test.mjs - rule 9 asserted against the real error strings this study has produced.
 *
 * WHY THIS EXISTS. Centralising the exclusion rule into tools/exclusions.mjs SILENTLY DROPPED
 * "credit balance is too low" - the phrase Anthropic actually returns - because the file it
 * replaced had it and the new pattern did not. 155 runs were then analysed as model failures and
 * two claims were written from them (FINDINGS F39). A shared rule is only shared if it is a
 * superset, and nothing was checking that it was.
 *
 * Every string below is one this project has actually seen in a run record or a gateway log.
 * If a future edit narrows the rule, this fails.
 *
 *   node --test tools/exclusions.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyRun, allRequestsFailed, SIGNATURES, INFRASTRUCTURE, TERMINATION_EXIT_CODES, terminatedByOs } from './exclusions.mjs'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * THE CHECK THAT WOULD HAVE CAUGHT THE THIRD FAILURE.
 *
 * F44 added three signatures (`malformed`, `model-config`, a wider `provider-5xx`) and never
 * added their causes to INFRASTRUCTURE. A signature whose cause is not in that set does not
 * half-work: `classifyRun` returns `infrastructure: false`, `exclusionVerdict` falls through to
 * `unexplained`, and the run is filed in the one bucket that may be read as a MODEL FAILURE.
 * 41 genuine provider faults were certified that way, one of them inside a published matrix.
 *
 * The per-string tests below all passed throughout, because they only pinned strings whose causes
 * were already wired. This one is structural and cannot be satisfied by adding a regex alone.
 */
test('EVERY signature has a cause in INFRASTRUCTURE - a regex alone is not an exclusion', () => {
  for (const [cause] of SIGNATURES) {
    assert.ok(INFRASTRUCTURE.has(cause),
      'signature cause "' + cause + '" is not in INFRASTRUCTURE, so matching it files the run as ' +
      'a MODEL FAILURE under "unexplained". Add the cause to INFRASTRUCTURE or the signature is inert.')
  }
})

test('every signature actually fires and every fired cause is infrastructure', () => {
  // A signature whose regex is dead code is the same defect from the other side.
  const CRAFTED = {
    credit: 'Insufficient Balance', 'rate-limit': 'dsh: RATE_LIMIT', 'rejected-field': 'dsh: INVALID_REQUEST',
    'model-config': '[1210]', malformed: 'dsh: MALFORMED_RESPONSE', 'protocol-404': 'dsh: HTTP_404',
    auth: 'dsh: HTTP_401', connection: 'ECONNREFUSED fetch', 'provider-5xx': 'dsh: HTTP_500',
    'harness-crash': 'Cannot find module',
    // The runner's OWN faults: the record carries a runId, so the structural launch-failure clause
    // (error && runId == null) cannot see them and they fell into 'unexplained'. See the 2026-10-06
    // brace-guard defect: 8 cells of a full matrix, classified as possible MODEL failures.
    'launch-failure': 'unsubstituted placeholder in harness args: "Translation complaints are piling up"',
  }
  for (const [cause] of SIGNATURES) {
    const text = CRAFTED[cause]
    assert.ok(text, 'no crafted sample for signature cause "' + cause + '" - add one')
    const r = classifyRun({ solved: false, stderrTail: text, stdoutTail: '' })
    assert.equal(r.cause, cause, 'crafted sample for ' + cause + ' classified as ' + r.cause)
    assert.equal(r.infrastructure, true, 'crafted sample for ' + cause + ' is NOT excluded')
  }
})

/** Real provider error text, verbatim, with the cause it must be classified as. */
const MUST_EXCLUDE = [
  ['credit', 'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.'],
  ['credit', 'dsh: QUOTA: [1113][Insufficient balance or no resource package. Please recharge.]'],
  ['credit', "Error code: 429 - {'error': {'message': 'You exceeded your current quota', 'type': 'insufficient_quota'}}"],
  ['rate-limit', 'Rate limit reached for gpt-6-luna in organization org-x on requests per min.'],
  ['protocol-404', 'dsh: HTTP_404: DeepSeek Messages request failed (404)'],
  ['rejected-field', 'Function tools with reasoning_effort are not supported for gpt-6-luna in /v1/chat/completions.'],
  ['harness-crash', "Error: Cannot find module 'C:/src/index.js'"],
  // The three phrasings F44 ADDED and never wired. Pinned here so they cannot go inert again.
  ['malformed', 'dsh: MALFORMED_RESPONSE: the provider returned a truncated stream'],
  ['model-config', '{"error":{"code":"1210","message":"This model always engages in thinking and cannot be disabled"}}'],
  ['rejected-field', 'dsh: INVALID_REQUEST: DeepSeek Messages request failed (400)'],
  // Verbatim from results/batchb-ds-full/runs.jsonl, 2026-10-06: eight records whose error was the
  // RUNNER refusing to build a command line, stored with a runId, and therefore read as 'unexplained'.
  ['launch-failure', 'unsubstituted placeholder in harness args: "Translation complaints are piling up since the Quebec rollout: fr-CA users keep getting English strings"'],
  ['launch-failure', 'synthetic key did not reach the command line for harness "goose"; commandFor was given syntheticKey="exp-dsh-x"'],
]

test('every real infrastructure phrase is excluded', () => {
  for (const [cause, text] of MUST_EXCLUDE) {
    const r = classifyRun({ solved: false, stderrTail: text, stdoutTail: '' })
    assert.equal(r.infrastructure, true, 'not excluded: ' + cause + ' <- ' + text.slice(0, 60))
    assert.equal(r.cause, cause, 'wrong cause for: ' + text.slice(0, 60))
  }
})

test('a SOLVED run is never excluded, whatever its output says', () => {
  // F24: 10 solved multi-file-retry-policy runs were dropped because the fixture discusses quota.
  const r = classifyRun({ solved: true, stderrTail: 'QUOTA: Insufficient balance', stdoutTail: '' })
  assert.equal(r.infrastructure, false)
  assert.equal(r.cause, 'solved')
})

test('domain vocabulary is not a signature', () => {
  // lh-ledger-replay is ABOUT ledgers, charges and reversals. Its agents write "billing" constantly.
  const ledgerProse = 'The ledger records a reversal of the billing adjustment against the account; no further charge is due.'
  assert.equal(classifyRun({ solved: false, stderrTail: ledgerProse, stdoutTail: '' }).cause, 'unexplained',
    'ledger prose was mistaken for a provider error')
})

test('a task ABOUT error codes does not look like a provider failure', () => {
  // THE REGRESSION THIS FILE EXISTS FOR. cross-error-taxonomy is a hard task whose entire subject
  // is HTTP error handling. Its agents write 404, 429, 500, ECONNREFUSED and RATE_LIMIT as the
  // DOMAIN. A signature list matching bare codes dropped 5 of 7 DeepSeek arms and 6 of 7 GLM arms
  // on it - every one of them exit=0, 268-545 s, 76-88% of assertions passing.
  const domain = [
    'mapError returns { code: "NOT_FOUND", message: "The requested record does not exist.", retryable: false } instead of a generic 500.',
    'Retryable failures: 429 and 503 are clamped to WRITE_NOT_APPLIED; RATE_LIMIT is converted to a retryable error.',
    'The cache read failure is reported as NOT_FOUND rather than propagating the ECONNREFUSED from the upstream socket.',
    'Auth is checked before validation, so a 401 no longer leaks the record shape.',
    // Added after a third review found these exact shapes dropping hardbatch-glm and
    // hardbatch-deepseek runs that were exit=0 with clean gateway histories.
    'The handler returns a 500 Internal Server Error when the upstream rejects the write.',
    'A ReferenceError such as "retryCount is not defined" is one of the shapes the module must map to a typed error.',
  ].join('\n')
  const r = classifyRun({ solved: false, stderrTail: domain, stdoutTail: '' })
  assert.equal(r.infrastructure, false, 'error-taxonomy domain prose was read as a provider failure')
  assert.equal(r.cause, 'unexplained')
})

test('the real provider lines are still caught', () => {
  const provider = [
    'dsh: HTTP_404: DeepSeek Messages request failed (404)',
    'dsh: RATE_LIMIT: Request rate increased too quickly.',
    'dsh: INVALID_REQUEST: DeepSeek Messages request failed (400)',
    'dsh: HTTP_500: upstream error',
  ]
  for (const t of provider) {
    assert.equal(classifyRun({ solved: false, stderrTail: t, stdoutTail: '' }).infrastructure, true, 'missed: ' + t)
  }
})

test('rule 9 second half: every request failing is an exclusion, regardless of text', () => {
  assert.equal(allRequestsFailed([{ status: 400 }, { status: 400 }]), true)
  assert.equal(allRequestsFailed([{ status: 400 }, { status: 200 }]), false)
  assert.equal(allRequestsFailed([]), false)
})

test('a launch failure is excluded without any output to search', () => {
  const r = classifyRun({ solved: false, error: 'spawn ENOENT', arm: 'openhands' })
  assert.equal(r.infrastructure, true)
  assert.equal(r.cause, 'launch-failure')
})

test('a process ENDED FROM OUTSIDE the run is a loss, not a model failure', () => {
  // The real record, byte for byte where it matters: results/hardpilot-ds-full/runs.jsonl,
  // 2026-10-04T12:41:20.246Z, the cell that was in flight when the laptop was restarted. It reached
  // 96 s, wrote no stdout, and was killed with 0x40010004. Before this rule it classified as
  // "unexplained" - the one bucket a paper may read as a MODEL FAILURE - and --resume skipped it,
  // because a run that is not infrastructure counts as complete.
  const killed = {
    task: 'lh-inventory-allocation', arm: 'dsh:ptc-terse', seed: 1,
    exitCode: 1073807364, solved: false, timedOut: false, stdoutTail: '',
    stderrTail: "return { status: 'unknown', id: reservationId, released: 0 }",
  }
  const c = classifyRun(killed)
  assert.equal(c.cause, 'interrupted')
  assert.equal(c.infrastructure, true, 'a killed run must never be filed as a model failure')
  // 0xC000013A, signed and unsigned: Node reports this one both ways depending on the build.
  assert.equal(classifyRun({ ...killed, exitCode: 3221225786 }).cause, 'interrupted')
  assert.equal(classifyRun({ ...killed, exitCode: -1073741510 }).cause, 'interrupted')
})

test('the guards on the termination rule hold', () => {
  const base = { task: 't', arm: 'a', seed: 1, exitCode: 1073807364, solved: false, stderrTail: '' }
  // A solve reported by a process that later died is still a solve. The solved guard is first.
  assert.equal(classifyRun({ ...base, solved: true }).cause, 'solved')
  // An ordinary non-zero exit is the harness's OWN failure and stays a result: 13 such records
  // exist on disk and none of them was killed from outside.
  assert.equal(classifyRun({ ...base, exitCode: 1 }).cause, 'unexplained')
  assert.equal(classifyRun({ ...base, exitCode: 0 }).cause, 'unexplained')
  // A timeout is exitCode null and is deliberately ambiguous (AMBIGUOUS), not infrastructure.
  assert.equal(classifyRun({ ...base, exitCode: null, timedOut: true }).cause, 'unexplained')
  // A named provider fault keeps its own bucket if the process also died: both are infrastructure,
  // but the cause label is what a flow table reports.
  assert.equal(terminatedByOs(null), null)
  assert.equal(terminatedByOs(undefined), null)
  assert.equal(terminatedByOs(''), null)
  assert.equal(terminatedByOs('nonsense'), null)
  assert.equal(terminatedByOs(1073807364), 'DBG_TERMINATE_PROCESS (0x40010004)')
})

test('EVERY structural cause is in INFRASTRUCTURE, not just every signature', () => {
  // The membership test above only walks SIGNATURES. launch-failure and interrupted are decided by
  // structure, before any regex runs, and a cause missing from INFRASTRUCTURE is inert in exactly
  // the same way: classifyRun returns infrastructure:false and the run is read as a model failure.
  for (const cause of ['launch-failure', 'interrupted']) {
    assert.ok(INFRASTRUCTURE.has(cause), 'structural cause "' + cause + '" is not in INFRASTRUCTURE')
  }
  assert.ok(TERMINATION_EXIT_CODES.size >= 2, 'the termination table must name the codes it claims to know')
})

test('REAL DATA: this rule moves no published number', () => {
  // The rule was added on 2026-10-04, after the six matrices shipped. If any SHIPPED matrix held a
  // termination-coded record, adding it would retroactively exclude a run that was counted. Scan
  // the real files rather than asserting it.
  const shipped = ['ds-full', 'glm-flash', 'qwen-full', 'haiku-full', 'sonnet-full', 'luna-full']
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'results')
  let scanned = 0
  for (const dir of shipped) {
    const p = join(root, dir, 'runs.jsonl')
    if (!existsSync(p)) continue
    scanned++
    for (const line of readFileSync(p, 'utf8').split(String.fromCharCode(10))) {
      if (!line.trim()) continue
      let r = null
      try { r = JSON.parse(line) } catch { continue }
      assert.equal(terminatedByOs(r.exitCode), null,
        dir + ' holds a termination-coded record (' + r.task + '/' + r.arm + ', exit ' + r.exitCode + '). ' +
        'Adding the rule would change a published number: re-derive that matrix before claiming it does not.')
    }
  }
  assert.ok(scanned >= 5, 'expected the shipped matrices to be present; scanned ' + scanned)
})

test('REAL DATA: the killed cell is on disk and is now classified as a loss', () => {
  // The witness for the rule. If this record is deleted or the rule is narrowed, the hard suite
  // silently counts a machine shutdown as an unsolved task again.
  const p = join(dirname(fileURLToPath(import.meta.url)), '..', 'results', 'hardpilot-ds-full', 'runs.jsonl')
  if (!existsSync(p)) return
  const runs = readFileSync(p, 'utf8').split(String.fromCharCode(10)).filter(Boolean).map((l) => JSON.parse(l))
  const killed = runs.filter((r) => terminatedByOs(r.exitCode))
  assert.ok(killed.length >= 1, 'the record that motivated this rule is gone from ' + p)
  for (const r of killed) {
    assert.equal(classifyRun(r).infrastructure, true, 'killed run filed as a model failure: ' + r.runId)
  }
})

