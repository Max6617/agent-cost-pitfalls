import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const DAY = 24 * 60 * 60 * 1000
const T0 = 1_700_000_000_000

test('a rotated-out refresh token cannot be used again', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  const rotated = svc.refresh(login.refreshToken, T0 + DAY)
  assert.equal(rotated.status, 'rotated')
  assert.notEqual(rotated.refreshToken, login.refreshToken)
  const replay = svc.refresh(login.refreshToken, T0 + DAY)
  assert.equal(replay.status, 'reuse')
})

test('replaying a rotated-out token kills the whole family', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  const rotated = svc.refresh(login.refreshToken, T0 + DAY)
  svc.refresh(login.refreshToken, T0 + 2 * DAY)
  const after = svc.refresh(rotated.refreshToken, T0 + 2 * DAY)
  assert.equal(after.status, 'revoked')
})

test('the same token presented twice in one instant: the first rotates, the second is reuse', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  const first = svc.refresh(login.refreshToken, T0 + DAY)
  const second = svc.refresh(login.refreshToken, T0 + DAY)
  assert.equal(first.status, 'rotated')
  assert.equal(second.status, 'reuse')
})
