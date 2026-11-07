// Sub-problem 6: the session listing. Live sessions only, ordered most
// recently used first, ties by family id - and the rows track the family's
// actual use.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const DAY = 24 * 60 * 60 * 1000
const T0 = 1_700_000_000_000

test('a session whose idle window ran out is not listed', () => {
  const svc = createService()
  svc.login({ user: 'ada', device: 'laptop' }, T0)
  const phone = svc.login({ user: 'ada', device: 'phone' }, T0)
  const r = svc.refresh(phone.refreshToken, T0 + 6 * DAY)
  assert.equal(r.status, 'rotated')
  const listing = svc.sessions('ada', T0 + 8 * DAY)
  assert.deepEqual(listing.map((s) => s.device), ['phone'])
})

test('the listing follows the family as it is used: last use and deadline move', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  svc.refresh(login.refreshToken, T0 + 6 * DAY)
  const [row] = svc.sessions('ada', T0 + 6 * DAY)
  assert.equal(row.device, 'laptop')
  assert.equal(row.lastUsedAt, T0 + 6 * DAY)
  assert.equal(row.expiresAt, T0 + 13 * DAY)
})

test('a family killed by replay disappears from the listing', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  svc.refresh(login.refreshToken, T0 + DAY)
  svc.refresh(login.refreshToken, T0 + 2 * DAY)
  assert.deepEqual(svc.sessions('ada', T0 + 2 * DAY), [])
})

test('sessions used in the same instant are ordered by family id', () => {
  const svc = createService()
  const first = svc.login({ user: 'ada', device: 'laptop' }, T0)
  const second = svc.login({ user: 'ada', device: 'phone' }, T0)
  const want = [first.familyId, second.familyId].sort()
  const listing = svc.sessions('ada', T0)
  assert.deepEqual(listing.map((s) => s.familyId), want)
})
