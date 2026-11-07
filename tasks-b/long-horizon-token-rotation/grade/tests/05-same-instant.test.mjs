// Sub-problem 5: one instant, two presentations. The first one wins; the
// second is reuse, and reuse is recognised by generation lineage, never by
// comparing timestamps.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const DAY = 24 * 60 * 60 * 1000
const T0 = 1_700_000_000_000

test('the same token presented twice in one instant: the first rotates, the second is reuse', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  const first = svc.refresh(login.refreshToken, T0 + DAY)
  const second = svc.refresh(login.refreshToken, T0 + DAY)
  assert.equal(first.status, 'rotated')
  assert.equal(second.status, 'reuse')
})

test('the winning rotation of a same-instant race is killed by the losing replay', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  const first = svc.refresh(login.refreshToken, T0 + DAY)
  svc.refresh(login.refreshToken, T0 + DAY)
  assert.equal(svc.refresh(first.refreshToken, T0 + DAY).status, 'revoked')
  assert.equal(svc.validateAccess(first.accessToken, T0 + DAY).status, 'revoked')
})

test('a token rotated out in the very instant it was issued is still reuse', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  const r1 = svc.refresh(login.refreshToken, T0 + DAY)
  const r2 = svc.refresh(r1.refreshToken, T0 + DAY)
  assert.equal(r2.status, 'rotated')
  // generation 1 was born and rotated out at the same instant
  const replay = svc.refresh(r1.refreshToken, T0 + DAY)
  assert.equal(replay.status, 'reuse')
})
