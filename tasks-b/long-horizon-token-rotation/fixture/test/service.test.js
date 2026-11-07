import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const DAY = 24 * 60 * 60 * 1000
const MIN = 60 * 1000
const T0 = 1_700_000_000_000

test('logout kills access tokens that were issued before it', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  svc.logout(login.familyId, T0 + MIN)
  const v = svc.validateAccess(login.accessToken, T0 + 2 * MIN)
  assert.equal(v.status, 'revoked')
})

test('logout kills the family refresh tokens', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  const rotated = svc.refresh(login.refreshToken, T0 + DAY)
  svc.logout(login.familyId, T0 + 2 * DAY)
  assert.equal(svc.refresh(rotated.refreshToken, T0 + 2 * DAY).status, 'revoked')
})

test('a session whose idle window has run out is not in the listing', () => {
  const svc = createService()
  svc.login({ user: 'ada', device: 'laptop' }, T0)
  const phone = svc.login({ user: 'ada', device: 'phone' }, T0)
  const rotated = svc.refresh(phone.refreshToken, T0 + 6 * DAY)
  assert.equal(rotated.status, 'rotated')
  const listing = svc.sessions('ada', T0 + 8 * DAY)
  assert.deepEqual(listing.map((s) => s.device), ['phone'])
})
