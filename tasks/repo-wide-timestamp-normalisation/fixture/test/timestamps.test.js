import test from 'node:test'
import assert from 'node:assert/strict'
import { toTimestamp, parseTimestamp, nowTimestamp, isTimestamp, shortStamp } from '../src/timestamps.js'
import { AuditLog } from '../src/audit.js'
import { Sessions } from '../src/sessions.js'
import { RateWindow } from '../src/ratewindow.js'
import { reportRows, summarise, reportHeader } from '../src/report.js'

const AT = Date.UTC(2026, 2, 4, 5, 6, 7, 0)
const ISO = '2026-03-04T05:06:07.000Z'

test('an instant renders as the one accepted format', () => {
  assert.equal(toTimestamp(AT), ISO)
  assert.equal(toTimestamp(new Date(AT)), ISO)
})

test('the same instant renders identically everywhere', () => {
  assert.equal(toTimestamp(AT), toTimestamp(new Date(AT)))
})

test('a timestamp round-trips', () => {
  const parsed = parseTimestamp(ISO)
  assert.equal(parsed.getTime(), AT)
  assert.equal(toTimestamp(parsed), ISO)
})

test('the second-precision form is accepted', () => {
  assert.equal(parseTimestamp('2026-03-04T05:06:07Z').getTime(), AT)
})

test('an offset form is refused rather than converted', () => {
  assert.equal(parseTimestamp('2026-03-04T06:06:07+01:00'), null)
})

test('a local-time string is refused', () => {
  assert.equal(parseTimestamp('2026-03-04 05:06:07'), null)
  assert.equal(parseTimestamp('Wed, 04 Mar 2026 05:06:07 GMT'), null)
})

test('nonsense is refused', () => {
  assert.equal(parseTimestamp('tomorrow'), null)
  assert.equal(parseTimestamp(''), null)
  assert.equal(parseTimestamp(undefined), null)
})

test('the injected clock decides what "now" is', () => {
  assert.equal(nowTimestamp(() => AT), ISO)
  assert.equal(isTimestamp(ISO), true)
  assert.equal(isTimestamp('2026-03-04'), false)
})

test('a table cell shows the date and the minute', () => {
  assert.equal(shortStamp(ISO), '2026-03-04 05:06')
  assert.equal(shortStamp('not a timestamp'), '')
})

test('the audit log records the injected instant', () => {
  const log = new AuditLog({ clock: () => AT })
  const entry = log.record('login', 'ada')
  assert.equal(entry.at, ISO)
  assert.equal(log.latest().at, ISO)
})

test('audit entries are ordered by timestamp', () => {
  let t = AT
  const log = new AuditLog({ clock: () => t })
  log.record('first', 'ada')
  t = AT + 1000
  log.record('second', 'ada')
  assert.equal(log.entries[0].at, ISO)
  assert.equal(log.entries[1].at, '2026-03-04T05:06:08.000Z')
})

test('audit rows carry the same timestamp as the entry', () => {
  const log = new AuditLog({ clock: () => AT })
  log.record('login', 'ada')
  assert.deepEqual(log.rows(), [{ at: ISO, action: 'login', actor: 'ada' }])
})

test('a session records both ends in the same format', () => {
  let t = AT
  const sessions = new Sessions({ clock: () => t })
  sessions.start('s1', 'ada')
  t = AT + 5000
  const session = sessions.end('s1')
  assert.equal(session.startedAt, ISO)
  assert.equal(session.endedAt, '2026-03-04T05:06:12.000Z')
  assert.equal(sessions.durationOf('s1'), 5000)
})

test('an open session has no duration', () => {
  const sessions = new Sessions({ clock: () => AT })
  sessions.start('s1', 'ada')
  assert.equal(sessions.durationOf('s1'), null)
})

test('sessions open at an instant are found by timestamp', () => {
  let t = AT
  const sessions = new Sessions({ clock: () => t })
  sessions.start('s1', 'ada')
  t = AT + 10_000
  sessions.start('s2', 'bob')

  assert.deepEqual(sessions.openAt('2026-03-04T05:06:09.000Z').map((s) => s.id), ['s1'])
})

test('the rate window records the injected instant', () => {
  const window = new RateWindow({ limit: 2, windowMs: 1000, clock: () => AT })
  window.record()
  assert.equal(window.oldest(), ISO)
})

test('the rate window trims by the injected clock', () => {
  let t = AT
  const window = new RateWindow({ limit: 2, windowMs: 1000, clock: () => t })
  assert.equal(window.record().allowed, true)
  assert.equal(window.record().allowed, true)
  assert.equal(window.record().allowed, false)
  t = AT + 1000
  assert.equal(window.record().allowed, true)
  assert.equal(window.record().count, 2)
})

test('the retry hint counts down against the injected clock', () => {
  let t = AT
  const window = new RateWindow({ limit: 1, windowMs: 1000, clock: () => t })
  window.record()
  assert.equal(window.retryAfterMs(), 1000)
  t = AT + 400
  assert.equal(window.retryAfterMs(), 600)
  t = AT + 1000
  assert.equal(window.retryAfterMs(), 0)
})

test('a report row renders its timestamp through the shared helper', () => {
  const rows = reportRows([{ at: AT, label: 'logins', count: 3 }])
  assert.deepEqual(rows, [{ at: ISO, label: 'logins', count: 3 }])
  assert.deepEqual(reportHeader(), ['timestamp', 'label', 'count'])
})

test('the summary uses the same rendering as everything else', () => {
  assert.equal(summarise([{ at: AT, label: 'logins' }]), '1 events, last at 2026-03-04 05:06')
  assert.equal(summarise([]), 'nothing recorded')
})

test('every module renders an instant the same way', () => {
  const log = new AuditLog({ clock: () => AT })
  const sessions = new Sessions({ clock: () => AT })
  const window = new RateWindow({ limit: 1, windowMs: 1000, clock: () => AT })
  const rows = reportRows([{ at: AT, label: 'x' }])

  const rendered = [log.record('a', 'ada').at, sessions.start('s', 'ada').startedAt, window.record() && window.oldest(), rows[0].at]
  for (const value of rendered) assert.equal(value, ISO, value)
})
