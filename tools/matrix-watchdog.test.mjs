/**
 * matrix-watchdog.test.mjs - the rules that decide a running matrix is stuck.
 *
 * Two defects in one day, both false "silence", both fatal to a healthy matrix:
 *   1. the record clock was seeded from the age of an existing runs.jsonl, so a RESUME was already
 *      hours "silent" on the first tick and was killed ~15 s in;
 *   2. the gateway rule took a boolean named `gatewayQuiet` that the caller filled from a helper
 *      returning TRUE WHEN THE LOG WAS FRESH, so it killed a matrix that was making requests, at
 *      exactly the five-minute mark, after it had already written two cells.
 * Both are pinned below, against the real arithmetic and the real data.
 *
 *   node --test tools/matrix-watchdog.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, utimesSync, existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { silenceClock, silenceVerdict, gatewayIdleMs, DEFAULT_MATRIX_SILENCE_MIN, SLOWEST_OBSERVED_CELL_SECONDS, LONGEST_OBSERVED_REQUEST_GAP_SECONDS } from './matrix-watchdog.mjs'

const MIN = 60000
const startedAt = Date.parse('2026-10-04T18:52:30.000Z')
const at = (mins) => startedAt + mins * MIN
const base = { matrixSilenceMin: DEFAULT_MATRIX_SILENCE_MIN, gwSilenceMin: 5, complete: false }

test('DEFECT 1: a resume with an hours-old runs.jsonl is not "silent"', () => {
  const oldFileMtime = Date.parse('2026-10-04T12:41:20.246Z')
  const clock = silenceClock({ startedAt })
  assert.equal(clock.lastRunTs, startedAt, 'the clock must start when THIS invocation starts')
  assert.equal(silenceVerdict({ ...base, ...clock, gatewayIdleMs: 0, now: at(0.25) }), null,
    'a child fifteen seconds into a resume must not be killed')
  // and the arithmetic that killed it is pinned, so the regression cannot be described away
  assert.ok((at(0.25) - oldFileMtime) / MIN > 12, 'the buggy seed exceeds the old 12-minute threshold')
  assert.ok((at(0.25) - startedAt) / MIN < 12, 'the correct seed does not')
})

test('DEFECT 2: a healthy matrix five minutes in is not silent', () => {
  // This is the exact state the third attempt was killed in: two cells written, requests flowing,
  // and the gateway touched two seconds ago.
  const clock = silenceClock({ startedAt })
  assert.equal(silenceVerdict({ ...base, ...clock, gatewayIdleMs: 2000, now: at(5) }), null)
  assert.equal(silenceVerdict({ ...base, ...clock, gatewayIdleMs: 2000, now: at(20) }), null,
    'a busy gateway never triggers the gateway rule, however long the matrix has run')
  assert.match(String(silenceVerdict({ ...base, ...clock, gatewayIdleMs: 6 * MIN, now: at(5) })), /no gateway request/)
})

test('gatewayIdleMs is a DURATION read from a real file, so it cannot be inverted', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bh-idle-'))
  const p = join(dir, 'gw.jsonl')
  writeFileSync(p, '{}\n')
  const now = Date.now()
  utimesSync(p, new Date(now - 2000), new Date(now - 2000))
  const fresh = gatewayIdleMs(p, now)
  assert.ok(fresh >= 1500 && fresh < 5000, 'a log written 2 s ago reads as ~2000 ms, not true: ' + fresh)
  utimesSync(p, new Date(now - 600000), new Date(now - 600000))
  const stale = gatewayIdleMs(p, now)
  assert.ok(stale >= 599000 && stale < 601000, 'a log untouched for 10 min reads as ~600000 ms: ' + stale)
  assert.equal(gatewayIdleMs(join(dir, 'nope.jsonl'), now), 0, 'an unreadable log must never look silent')
})

test('a real stall is still caught - the rules are not weakened into uselessness', () => {
  const clock = silenceClock({ startedAt })
  assert.equal(silenceVerdict({ ...base, ...clock, gatewayIdleMs: 0, now: at(25) }), null)
  assert.match(String(silenceVerdict({ ...base, ...clock, gatewayIdleMs: 0, now: at(26) })), /no run record/)
})

test('one late record resets the record clock, and a complete matrix is never killed', () => {
  assert.equal(silenceVerdict({ ...base, lastRunTs: at(20), gatewayIdleMs: 0, now: at(30) }), null)
  assert.equal(silenceVerdict({ ...base, lastRunTs: startedAt, gatewayIdleMs: 60 * MIN, complete: true, now: at(90) }), null,
    'all cells on disk is the one fact that separates finished from stuck')
})

test('THE THRESHOLDS EXCEED THE MEASURED WORST CASES, re-derived from the shipped log', () => {
  assert.ok(DEFAULT_MATRIX_SILENCE_MIN * 60 > SLOWEST_OBSERVED_CELL_SECONDS,
    'record-silence ' + DEFAULT_MATRIX_SILENCE_MIN + ' min is below the slowest observed cell')
  assert.ok(5 * 60 > LONGEST_OBSERVED_REQUEST_GAP_SECONDS, 'gateway-silence 5 min is below the longest observed gap')
  // and the longest gap is re-derived here rather than trusted, when the log is present
  const log = join(dirname(fileURLToPath(import.meta.url)), '..', 'results', 'cmutjmthf-deepseek-gateway.jsonl')
  if (!existsSync(log)) return
  const ts = readFileSync(log, 'utf8').split(String.fromCharCode(10)).filter(Boolean)
    .map((l) => { try { return Date.parse(JSON.parse(l).ts) } catch { return NaN } })
    .filter((t) => Number.isFinite(t)).sort((a, b) => a - b)
  let maxGap = 0
  for (let i = 1; i < ts.length; i++) maxGap = Math.max(maxGap, (ts[i] - ts[i - 1]) / 1000)
  assert.ok(ts.length > 1000, 'expected the phase-1 log, found ' + ts.length + ' records')
  assert.ok(maxGap < 5 * 60, 'the shipped log contains a ' + Math.round(maxGap) + ' s gap, which the 5-minute rule would kill on')
})

test('WIRING: collect.mjs uses the tested rule and cannot pass an inverted boolean', () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'collect.mjs'), 'utf8')
  assert.match(src, /from '\.\/matrix-watchdog\.mjs'/, 'collect.mjs must import the rule')
  assert.match(src, /silenceClock\(\{ startedAt \}\)/, 'and must seed the clock from its own start')
  assert.match(src, /silenceVerdict\(/, 'the verdict itself must come from the tested module')
  assert.match(src, /gatewayIdleMs:/, 'the gateway rule takes a duration')
  assert.ok(!/gatewayQuiet/.test(src), 'the inverted boolean must not come back')
  assert.ok(!/lastRunTs = existsSync\(runsLog\) \? statSync\(runsLog\)\.mtimeMs/.test(src), 'nor the old seeding')
})
