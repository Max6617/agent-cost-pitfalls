// Sub-problem 1: rotation. Every successful refresh rotates - the presented
// token can never succeed again, and the deadline handed back slides with use.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const DAY = 24 * 60 * 60 * 1000
const T0 = 1_700_000_000_000

test('rotating hands back a new token and the presented one becomes reuse', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  const r = svc.refresh(login.refreshToken, T0 + DAY)
  assert.equal(r.status, 'rotated')
  assert.notEqual(r.refreshToken, login.refreshToken)
  assert.notEqual(r.accessToken, login.accessToken)
  const replay = svc.refresh(login.refreshToken, T0 + DAY)
  assert.equal(replay.status, 'reuse')
})

test('every generation older than the current one is reuse, not just the previous one', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  const r1 = svc.refresh(login.refreshToken, T0 + DAY)
  const r2 = svc.refresh(r1.refreshToken, T0 + 2 * DAY)
  assert.equal(r2.status, 'rotated')
  // the generation-0 token, two behind the current one
  const replay = svc.refresh(login.refreshToken, T0 + 3 * DAY)
  assert.equal(replay.status, 'reuse')
  // and once the family is dead the newest token is refused too
  assert.equal(svc.refresh(r2.refreshToken, T0 + 3 * DAY).status, 'revoked')
})

test('rotation responses carry the sliding deadline, computed from the moment of use', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  assert.equal(login.refreshExpiresAt, T0 + 7 * DAY)
  const r = svc.refresh(login.refreshToken, T0 + 6 * DAY)
  assert.equal(r.status, 'rotated')
  assert.equal(r.refreshExpiresAt, T0 + 13 * DAY)
})

test('a token the service never issued is unknown', () => {
  const svc = createService()
  svc.login({ user: 'ada', device: 'laptop' }, T0)
  assert.equal(svc.refresh('rt_0000000000000000', T0 + DAY).status, 'unknown')
})
