// Sub-problem 1: expiry - computed from the invite's own creation instant,
// valid through the expiry instant, dead only strictly after it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService, INVITE_TTL_MS } from '../src/index.js'

const withOrg = () => {
  const service = createService()
  service.addOrg({ id: 'acme', defaultRole: 'member' })
  return service
}

test('an invite carries an expiry exactly one week after its creation', () => {
  const service = withOrg()
  const invite = service.invite({ org: 'acme', email: 'sam@acme.com', now: 41000 })
  assert.equal(invite.createdAt, 41000)
  assert.equal(invite.expiresAt, 41000 + INVITE_TTL_MS)
})

test('usable through the expiry instant, dead one instant later', () => {
  const service = withOrg()
  const atBoundary = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  const pastBoundary = service.invite({ org: 'acme', email: 'bea@acme.com', now: 1000 })

  const onTime = service.accept({ token: atBoundary.token, email: 'sam@acme.com', now: atBoundary.expiresAt })
  assert.equal(onTime.status, 'accepted')

  const late = service.accept({ token: pastBoundary.token, email: 'bea@acme.com', now: pastBoundary.expiresAt + 1 })
  assert.equal(late.status, 'expired')
})

test('a re-invite expires on its own clock, not the first invite\'s', () => {
  const service = withOrg()
  service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  const renewed = service.invite({ org: 'acme', email: 'sam@acme.com', now: 200000 })
  assert.equal(renewed.expiresAt, 200000 + INVITE_TTL_MS)

  const result = service.accept({ token: renewed.token, email: 'sam@acme.com', now: renewed.expiresAt })
  assert.equal(result.status, 'accepted')
})

test('accepting at the expiry instant uses the invite like any other acceptance', () => {
  const service = withOrg()
  const invite = service.invite({ org: 'acme', email: 'sam@acme.com', now: 5000 })
  const first = service.accept({ token: invite.token, email: 'sam@acme.com', now: invite.expiresAt })
  assert.equal(first.status, 'accepted')
  const again = service.accept({ token: invite.token, email: 'sam@acme.com', now: invite.expiresAt })
  assert.equal(again.status, 'already-accepted')
})
