// Sub-problem 3: expiry. The idle window is anchored to the last use, the
// absolute deadline never moves, and the deadline instant itself is dead.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const DAY = 24 * 60 * 60 * 1000
const T0 = 1_700_000_000_000

test('the idle window is measured from the last use, not from the login', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  const r1 = svc.refresh(login.refreshToken, T0 + 6 * DAY)
  assert.equal(r1.status, 'rotated')
  // eight days after the login, but only two after the last use: alive
  const r2 = svc.refresh(r1.refreshToken, T0 + 8 * DAY)
  assert.equal(r2.status, 'rotated')
})

test('a used family dies at the idle deadline counted from its last use', () => {
  const alive = createService()
  const dead = createService()
  const la = alive.login({ user: 'ada', device: 'laptop' }, T0)
  const ld = dead.login({ user: 'ada', device: 'laptop' }, T0)
  const ra = alive.refresh(la.refreshToken, T0 + 6 * DAY)
  const rd = dead.refresh(ld.refreshToken, T0 + 6 * DAY)
  // one millisecond before seven idle days after the last use: still alive
  assert.equal(alive.refresh(ra.refreshToken, T0 + 13 * DAY - 1).status, 'rotated')
  // at exactly seven idle days after the last use: dead, on the idle clock
  const gone = dead.refresh(rd.refreshToken, T0 + 13 * DAY)
  assert.equal(gone.status, 'expired')
  assert.equal(gone.reason, 'idle')
})

test('the absolute deadline wins over the sliding window', () => {
  const svc = createService()
  let token = svc.login({ user: 'ada', device: 'laptop' }, T0).refreshToken
  for (const d of [6, 12, 18, 24]) {
    const r = svc.refresh(token, T0 + d * DAY)
    assert.equal(r.status, 'rotated')
    token = r.refreshToken
  }
  const r29 = svc.refresh(token, T0 + 29 * DAY)
  assert.equal(r29.status, 'rotated')
  assert.equal(r29.refreshExpiresAt, T0 + 30 * DAY)
  const atDeadline = svc.refresh(r29.refreshToken, T0 + 30 * DAY)
  assert.equal(atDeadline.status, 'expired')
  assert.equal(atDeadline.reason, 'absolute')
})

test('an untouched family is alive one millisecond before its idle deadline and dead at it', () => {
  const alive = createService()
  const dead = createService()
  const la = alive.login({ user: 'ada', device: 'laptop' }, T0)
  const ld = dead.login({ user: 'ada', device: 'laptop' }, T0)
  assert.equal(alive.refresh(la.refreshToken, T0 + 7 * DAY - 1).status, 'rotated')
  const gone = dead.refresh(ld.refreshToken, T0 + 7 * DAY)
  assert.equal(gone.status, 'expired')
  assert.equal(gone.reason, 'idle')
})

test('when both clocks fire at the same instant the reason is absolute', () => {
  const svc = createService()
  let token = svc.login({ user: 'ada', device: 'laptop' }, T0).refreshToken
  // last use at day 23: idle deadline 30 days, the same instant as the
  // absolute deadline
  for (const d of [6, 12, 18, 23]) {
    const r = svc.refresh(token, T0 + d * DAY)
    assert.equal(r.status, 'rotated')
    token = r.refreshToken
  }
  const gone = svc.refresh(token, T0 + 30 * DAY)
  assert.equal(gone.status, 'expired')
  assert.equal(gone.reason, 'absolute')
})
