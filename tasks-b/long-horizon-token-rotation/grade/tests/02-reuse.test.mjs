// Sub-problem 2: reuse. A replayed token convicts and revokes the whole
// family - even after the family would have expired anyway - and logout
// revokes without ceremony.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const DAY = 24 * 60 * 60 * 1000
const T0 = 1_700_000_000_000

test('a replay rotates nothing: no new tokens are minted on reuse', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  svc.refresh(login.refreshToken, T0 + DAY)
  const replay = svc.refresh(login.refreshToken, T0 + DAY)
  assert.equal(replay.status, 'reuse')
  assert.equal(replay.familyId, login.familyId)
  assert.equal(replay.refreshToken, undefined)
  assert.equal(replay.accessToken, undefined)
})

test('reuse revokes every token in the family, including the current one', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  const r1 = svc.refresh(login.refreshToken, T0 + DAY)
  svc.refresh(login.refreshToken, T0 + 2 * DAY)
  assert.equal(svc.refresh(r1.refreshToken, T0 + 2 * DAY).status, 'revoked')
  // the replayed token itself is answered revoked, not reuse a second time
  assert.equal(svc.refresh(login.refreshToken, T0 + 2 * DAY).status, 'revoked')
})

test('reuse is detected even after the family has expired - and still revokes', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  const r1 = svc.refresh(login.refreshToken, T0 + DAY)
  const late = svc.refresh(login.refreshToken, T0 + 100 * DAY)
  assert.equal(late.status, 'reuse')
  assert.equal(svc.refresh(r1.refreshToken, T0 + 100 * DAY).status, 'revoked')
})

test('logout revokes the family, and is idempotent', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  const r1 = svc.refresh(login.refreshToken, T0 + DAY)
  svc.logout(login.familyId, T0 + 2 * DAY)
  assert.equal(svc.refresh(r1.refreshToken, T0 + 2 * DAY).status, 'revoked')
  assert.equal(svc.logout(login.familyId, T0 + 3 * DAY).status, 'revoked')
  assert.equal(svc.logout('fam_doesnotexist', T0 + 3 * DAY).status, 'unknown')
})
