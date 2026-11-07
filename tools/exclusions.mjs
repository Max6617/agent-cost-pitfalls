/**
 * exclusions.mjs - ONE definition of "this run measured nothing", used by every tool.
 *
 * WHY THIS EXISTS
 * ---------------
 * PRE-REGISTRATION.md rule 9 excludes a run that failed on provider quota, rate limit or any
 * infrastructure error, "identified from the harness's own error text", and rule 9's own
 * worked example is a claim that was written from an infrastructure failure and had to be
 * retracted (F14). The rule has now been broken a third time, at the largest scale yet:
 *
 *   FINDINGS F28: "luna solved 79 percent where every other model solves 95 percent or more.
 *                  That is a real capability difference."
 *
 * luna's 129 unsolved runs contain 82 HTTP_404s (the DSH 0.1.7 protocol drift), 15 rate
 * limits, 14 requests rejected for an invalid reasoning_effort field, an auth failure and a
 * harness crash. 113 of the 129 name a fault at or below the harness boundary. Only 16 are
 * unexplained. Against the runs it actually got, luna solves 96.8%, which is an ordinary
 * number and not a capability finding.
 *
 * The mirror-image error is also live: the older tools excluded any run whose OUTPUT merely
 * contained the word "quota", which silently dropped 10 SOLVED multi-file-retry-policy runs
 * whose fixture source discusses retry and quota policy (F24).
 *
 * So one rule, in one file, applied by every tool:
 *
 *   A run is excluded iff it is UNSOLVED **and** its own output names an infrastructure
 *   fault at or below the harness boundary. A solved run is never excluded for any text.
 *
 * "unexplained" is a real bucket - an unsolved run whose output names no cause - and it is
 * reported rather than assumed away. It is the only bucket that may be read as a model
 * failure.
 */

/**
 * Ordered: the first match wins, so narrower causes are listed before broader ones.
 *
 * TWO RULES FOR WRITING A SIGNATURE HERE, both learned by breaking them.
 *
 * 1. NEVER match domain vocabulary. A task about ledgers makes agents write "billing"; a task
 *    about error handling makes them write "404", "429", "500", "ECONNREFUSED" and "RATE_LIMIT".
 *    The first version of this list matched bare numeric codes and bare transport words, and on
 *    `cross-error-taxonomy` - a task whose entire subject is HTTP error codes - it dropped 5 of 7
 *    DeepSeek arms and 6 of 7 GLM arms. Every one of those runs had exit=0, ran 268-545 seconds,
 *    and scored 76-88% of its assertions. This is F24's "quota" bug, and F39 named the rule
 *    ("match provider phrasings, never domain vocabulary") in the same file that broke it.
 *
 * 2. PREFER A STRUCTURAL MARKER. A real provider error arrives on a `dsh: `-prefixed line, or
 *    carries a bracketed provider code, or is a multi-word vendor phrase. Requiring one of those
 *    is what separates "the provider rejected this" from "the agent wrote about HTTP".
 *
 * The status rule below (`classifyByStatus`) is the provider-independent backstop and needs no
 * vocabulary at all: a run whose EVERY request failed measured nothing, whatever it printed.
 */
// ORDER MATTERS: the FIRST match wins, so a specific phrase must precede a generic one that
// would also match it. `dsh: INVALID_REQUEST: DeepSeek Messages request failed (400)` is a
// rejected field, and the generic `request failed (40\d)` used to sit above it and claim all 144
// hardbatch-qwen runs under the cause "protocol-404" - right outcome, wrong bucket, in the tool
// FINDINGS F33 cites as the definition.
export const SIGNATURES = [
  ['credit',         /QUOTA:\s*\[?1113|Insufficient [Bb]alance|no resource package|credit balance is too low|exceeded your current quota|insufficient_quota|out of credit/i],
  ['rate-limit',     /dsh:\s*RATE_LIMIT|rate limit reached|Request rate increased too quickly|"code"\s*:\s*"Throttling"|Too [Mm]any [Rr]equests/i],
  // Specific provider refusals BEFORE the generic status-code alternative.
  ['rejected-field', /dsh:\s*INVALID_REQUEST|invalid_request_error|unknown_parameter|unsupported (parameter|value)|InvalidParameter|reasoning_effort.{0,40}not supported|not supported.{0,40}reasoning_effort/i],
  ['model-config',   /always engages in thinking and cannot be disabled|\[1210\]|anthropic-version.{0,20}header is required/i],
  ['malformed',      /dsh:\s*MALFORMED_RESPONSE|MALFORMED_RESPONSE/],
  // AUTH BEFORE protocol-404. `dsh:\s*HTTP_40\d` also matches 401 and 403, so with 404 first an
  // auth failure is filed as protocol drift. Caught by the crafted-sample test below, which is
  // the only reason this ordering is not still wrong.
  ['auth',           /dsh:\s*HTTP_40[13]|invalid[_ ]api[_ ]key|unauthorized/i],
  ['protocol-404',   /dsh:\s*HTTP_404|request failed \(40\d\)/i],
  ['connection',     /\bECONNREFUSED\b.*(?:fetch|request|connect)|socket hang up|\bEAI_AGAIN\b|Internal network failure/i],
  // RULE 2 APPLIES TO THIS ROW AND WAS VIOLATED. The bare alternatives `internal server error`
  // and `is not defined` match an agent's SOLUTION PROSE - and did: 5 confirmed false exclusions
  // on `cross-error-taxonomy`, the very task F43 names as the reason for the structural-marker
  // rule, plus `cross-trace-context`. Every one was exit=0 with an all-200-or-[1210] history.
  // Each alternative must now carry a structural marker.
  // Every alternative carries a structural marker: a `dsh: ` prefix or an explicit upstream phrase.
  // The looser `\b50[023]\b.{0,40}(upstream|provider|gateway)` that briefly lived here matched
  // "returns a 500 Internal Server Error when the upstream rejects the write" - agent prose.
  ['provider-5xx',   /dsh:\s*HTTP_50\d|dsh:\s*Internal [Ss]erver [Ee]rror|(?:upstream|provider|gateway)\s+(?:returned|responded|error)\s+50\d|service unavailable|bad gateway|Internal network failure/i],
  // A real Node crash carries a stack frame. `is not defined` alone is a string a task about
  // error handling contains on purpose.
  // OUR OWN LAUNCHER'S FAULTS. These are written by run-experiment.mjs when it REFUSES to build a
  // command line, and the record carries a runId - so the structural launch-failure clause above
  // (error && runId == null) cannot see them, and they landed in 'unexplained', the one bucket the
  // pre-registration says may be read as a model failure. On 2026-10-06 that put 8 cells of a full
  // matrix into 'unexplained' AND made --resume treat them as done, so they were never retried.
  ['launch-failure',  /unsubstituted placeholder in harness args|synthetic key did not reach the command line|Unknown command or unquoted prompt|EPERM, Permission denied/],
  ['harness-crash',  /Cannot find module|ReferenceError:[^\n]*is not defined[\s\S]{0,200}?\n\s+at |dsh:\s*[^\n]*is not defined|not recognized as|ENOENT|EPERM, Permission denied/i],
]

/**
 * Causes attributable to the instrument, the transport or the provider - never the model.
 *
 * THIS SET IS THE RULE. A cause absent from it is not excluded, and `exclusionVerdict` returns it
 * as `unexplained`, which is the bucket that may be READ AS A MODEL FAILURE. Adding a signature
 * without adding its cause here does not partially work: it CERTIFIES the run as a model failure,
 * which is worse than not matching at all.
 *
 * That is exactly what happened. F44 added `malformed` and `model-config` to SIGNATURES and left
 * this set alone, so 41 genuine provider-fault runs - 24 hardbatch-glm (all-400 `[1210]`), 15
 * hardbatch-deepseek (all-200 SSE faults), 1 qwen-full in a PUBLISHED panel matrix, 1
 * hardbatch-qwen-fixed - were analysed as model failures under a new label. A third hostile review
 * found it. The regression test now asserts membership for every signature, which is the check
 * that would have caught it.
 */
export const INFRASTRUCTURE = new Set([
  'credit', 'rate-limit', 'rejected-field', 'model-config', 'malformed', 'protocol-404',
  'auth', 'connection', 'provider-5xx', 'harness-crash', 'launch-failure', 'interrupted',
])

/** Causes deliberately NOT auto-excluded. An agent that hangs while working is a result. */
export const AMBIGUOUS = new Set(['timeout', 'context-limit'])

/**
 * EXIT CODES THAT MEAN "SOMETHING OUTSIDE THE RUN ENDED IT".
 *
 * Rule 9 excludes "a run that failed on provider quota, rate limit, or ANY INFRASTRUCTURE ERROR ...
 * identified from the harness's own error text and the gateway status code". Both of those signals
 * are TEXT, and a process that is killed from outside writes no diagnosis: its partial output is the
 * last thing it happened to say, not a cause. This is the third, structural signal, and it extends
 * no category - an OS-terminated process is an infrastructure error under rule 9 as written.
 *
 * The two codes this study has actually produced:
 *
 *   1073807364  0x40010004  DBG_TERMINATE_PROCESS  TerminateProcess from outside (machine shutdown)
 *   3221225786  0xC000013A  STATUS_CONTROL_C_EXIT  console closed / Ctrl-C
 *
 * WHY IT EXISTS. The hard-suite pilot's last cell was written with 1073807364 when the laptop was
 * restarted mid-run (results/hardpilot-ds-full/runs.jsonl, 2026-10-04T12:41:20Z, 96 s in, no
 * stdout). classifyRun returned "unexplained", so --resume treated the killed cell as COMPLETE and
 * skipped it and the hard suite would have counted a machine shutdown as an unsolved task. That is
 * the exact failure this file exists to prevent, arriving through the one channel it did not read.
 *
 * Compared unsigned: Node reports these as negative numbers on some builds, and a timeout is
 * exitCode null, which is not a termination code and stays ambiguous (AMBIGUOUS, below).
 */
export const TERMINATION_EXIT_CODES = new Map([
  [1073807364, 'DBG_TERMINATE_PROCESS (0x40010004)'],
  [3221225786, 'STATUS_CONTROL_C_EXIT (0xC000013A)'],
])

/** @returns {string|null} what ended the process, or null if nothing outside it did. */
export function terminatedByOs (exitCode) {
  if (exitCode === null || exitCode === undefined || exitCode === '') return null
  const n = Number(exitCode)
  if (!Number.isFinite(n)) return null
  return TERMINATION_EXIT_CODES.get(n >>> 0) ?? null
}

/**
 * @returns {{cause: string, infrastructure: boolean, evidence: string}}
 *   cause 'solved'         - the run solved; never excluded.
 *   cause 'unexplained'    - unsolved and its output names no cause. A model failure until shown otherwise.
 *   cause <signature>      - the named fault.
 */
export function classifyRun(run) {
  if (run.solved) return { cause: 'solved', infrastructure: false, evidence: '' }
  // Rule 9's second clause, checked first because it is a structural fact rather than a text
  // match: "a run where the harness FAILED TO LAUNCH (exit code and no request)". The runner
  // writes such a run as {ts, task, arm, seed, error, solved} with no runId and no model, so
  // there is no stdout to search and the text signatures below can never fire on it. One such
  // record sat unclassified in luna-full ("mmup6mwwp"/"undefined") and would have entered the
  // analysis as a genuine failure of openhands on fetch-heavy-semver-ranges.
  if (run.error && run.runId == null) {
    return { cause: 'launch-failure', infrastructure: true, evidence: String(run.error).slice(0, 120) }
  }
  // STRUCTURAL BEFORE TEXTUAL, for the same reason the launch-failure clause above is: a process
  // that was killed from outside never finished, so its partial output is not a diagnosis. Solved
  // runs never reach this line (the solved guard is first), so a solve reported by a process that
  // later died is still a solve.
  const killedBy = terminatedByOs(run.exitCode)
  if (killedBy) {
    return {
      cause: 'interrupted',
      infrastructure: INFRASTRUCTURE.has('interrupted'),
      evidence: 'exit ' + run.exitCode + ' ' + killedBy + ' - terminated from outside the run',
    }
  }
  if (run.error) {
    const msg = String(run.error)
    for (const [name, re] of SIGNATURES) {
      const m = re.exec(msg)
      if (m) return { cause: name, infrastructure: INFRASTRUCTURE.has(name), evidence: m[0].slice(0, 80) }
    }
  }
  const text = String(run.stderrTail ?? '') + '\n' + String(run.stdoutTail ?? '')
  for (const [name, re] of SIGNATURES) {
    const m = re.exec(text)
    if (m) return { cause: name, infrastructure: INFRASTRUCTURE.has(name), evidence: m[0].slice(0, 80) }
  }
  return { cause: 'unexplained', infrastructure: false, evidence: '' }
}

/** The single predicate every analysis must use. */
export function isExcluded(run) {
  return classifyRun(run).infrastructure
}

/**
 * THE decision. Rule 9, both halves, both guards, in one function.
 *
 * F39 added `classifyByStatus` and then three tools each re-implemented it inline with three
 * different behaviours for the zero-request case - one dropped the run, one analysed it as a model
 * failure, one skipped it silently - and none of them applied the rule's own solved-guard. A
 * backstop that is copied is not a backstop. This is the copy.
 *
 *   A run is excluded iff it is UNSOLVED and EITHER
 *     (a) its own output names an infrastructure fault (classifyRun), OR
 *     (b) it reached the provider zero times, or every request it made returned 4xx/5xx.
 *
 * `requests` is the run's gateway records; pass an empty array when the run has none, and null to
 * skip the status half entirely (only legitimate when no gateway log is available for that matrix).
 */
export function exclusionVerdict(run, requests = null) {
  if (run.solved) return { excluded: false, cause: 'solved', evidence: '', half: null }
  const c = classifyRun(run)
  if (c.infrastructure) return { excluded: true, cause: c.cause, evidence: c.evidence, half: 'text' }
  if (requests) {
    if (requests.length === 0) {
      return { excluded: true, cause: 'no-requests', evidence: 'zero gateway requests', half: 'status' }
    }
    if (requests.every((q) => Number(q.status) >= 400)) {
      return { excluded: true, cause: 'all-requests-failed', evidence: 'every request returned ' + requests[0].status, half: 'status' }
    }
  }
  return { excluded: false, cause: 'unexplained', evidence: '', half: null }
}

/**
 * Second, provider-independent signal: did EVERY request this run made fail?
 *
 * PRE-REGISTRATION rule 9 identifies infrastructure failures "from the harness's own error text
 * AND THE GATEWAY STATUS CODE". Only the first half was ever implemented, and the text half can
 * only catch phrasings someone thought to write down - which is exactly how 50 Sonnet runs whose
 * every request returned HTTP 400 were read as model failures.
 *
 * A run whose every request failed measured nothing, whatever it printed, and whatever the
 * provider chose to call the error. A run with even one successful request is left to the text
 * rule, because a mid-run failure is a different thing from a run that never started.
 */
export function allRequestsFailed(requests) {
  if (!requests || !requests.length) return false   // no requests at all is rule 9's first clause, handled elsewhere
  return requests.every((q) => Number(q.status) >= 400)
}

/** Flow-table entry for the status-code rule. */
export function classifyByStatus(requests) {
  if (!requests || !requests.length) return { cause: 'no-requests', infrastructure: true, evidence: 'zero gateway requests' }
  const bad = requests.filter((q) => Number(q.status) >= 400)
  if (bad.length === requests.length) {
    return { cause: 'all-requests-failed', infrastructure: true, evidence: 'every request returned ' + bad[0].status }
  }
  return { cause: 'ok', infrastructure: false, evidence: bad.length ? bad.length + ' of ' + requests.length + ' requests failed' : '' }
}

/** Flow table for a set of runs: what entered, what left, and under which clause. */
export function flowTable(runs) {
  const causes = {}
  let excluded = 0
  for (const r of runs) {
    const c = classifyRun(r)
    causes[c.cause] = (causes[c.cause] ?? 0) + 1
    if (c.infrastructure && !r.solved) excluded++
  }
  const analysed = runs.length - excluded
  const solved = runs.filter((r) => r.solved).length
  return { entered: runs.length, excluded, analysed, solved, solveRateOnAnalysed: analysed ? solved / analysed : NaN, causes }
}
