import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const DAY = 24 * 60 * 60 * 1000
const T0 = 1_700_000_000_000

test('the idle window slides forward with use', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  const first = svc.refresh(login.refreshToken, T0 + 6 * DAY)
  assert.equal(first.status, 'rotated')
  // eight days after the login, but only two after the last use: alive
  const second = svc.refresh(first.refreshToken, T0 + 8 * DAY)
  assert.equal(second.status, 'rotated')
})

test('an actively used family still dies at the absolute deadline', () => {
  const svc = createService()
  let token = svc.login({ user: 'ada', device: 'laptop' }, T0).refreshToken
  for (const d of [6, 12, 18, 24]) {
    const r = svc.refresh(token, T0 + d * DAY)
    assert.equal(r.status, 'rotated')
    token = r.refreshToken
  }
  const atDeadline = svc.refresh(token, T0 + 30 * DAY)
  assert.equal(atDeadline.status, 'expired')
  assert.equal(atDeadline.reason, 'absolute')
})

test('an untouched family is alive one millisecond before its idle deadline', () => {
  const svc = createService()
  const login = svc.login({ user: 'ada', device: 'laptop' }, T0)
  const justBefore = svc.refresh(login.refreshToken, T0 + 7 * DAY - 1)
  assert.equal(justBefore.status, 'rotated')
})
