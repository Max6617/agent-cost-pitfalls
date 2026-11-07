// Sub-problem 4: access tokens. Killing a family kills every access token it
// ever minted - whenever they were issued - and revocation outranks expiry.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const MIN = 60 * 1000
const T0 = 1_700_000_000_000

test('rotation does not disturb access tokens already minted from the family', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  const r = svc.refresh(login.refreshToken, T0 + 5 * MIN)
  assert.equal(r.status, 'rotated')
  const v = svc.validateAccess(login.accessToken, T0 + 10 * MIN)
  assert.equal(v.status, 'valid')
  assert.equal(v.user, 'ada')
  const later = svc.validateAccess(login.accessToken, T0 + 16 * MIN)
  assert.equal(later.status, 'expired')
})

test('a replayed refresh token kills access tokens already minted from the family', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  const r1 = svc.refresh(login.refreshToken, T0 + 2 * MIN)
  svc.refresh(login.refreshToken, T0 + 3 * MIN)
  assert.equal(svc.validateAccess(r1.accessToken, T0 + 4 * MIN).status, 'revoked')
  assert.equal(svc.validateAccess(login.accessToken, T0 + 4 * MIN).status, 'revoked')
})

test('logout kills access tokens before their natural expiry', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  svc.logout(login.familyId, T0 + MIN)
  assert.equal(svc.validateAccess(login.accessToken, T0 + 2 * MIN).status, 'revoked')
})

test('revoked is reported for an access token even after it would have expired anyway', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  svc.logout(login.familyId, T0 + MIN)
  assert.equal(svc.validateAccess(login.accessToken, T0 + 20 * MIN).status, 'revoked')
})
