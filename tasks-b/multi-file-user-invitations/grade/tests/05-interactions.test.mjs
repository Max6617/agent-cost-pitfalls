// Sub-problem 5: the rules fighting each other - re-invites under another
// spelling, revocations across spellings, snapshots across re-invites, and
// expiry boundaries on superseded invites.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService, INVITE_TTL_MS } from '../src/index.js'

const withOrg = () => {
  const service = createService()
  service.addOrg({ id: 'acme', defaultRole: 'member' })
  return service
}

test('a re-invite under a new spelling supersedes, and the old token dies', () => {
  const service = withOrg()
  const old = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  const fresh = service.invite({ org: 'acme', email: 'Sam@acme.com', now: 2000 })

  assert.equal(service.accept({ token: old.token, email: 'sam@acme.com', now: 3000 }).status, 'superseded')
  assert.equal(service.accept({ token: fresh.token, email: 'sam@acme.com', now: 3000 }).status, 'accepted')
})

test('revoked under one spelling stays revoked when the re-invite uses another', () => {
  const service = withOrg()
  const old = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  assert.equal(service.revoke({ org: 'acme', email: 'SAM@acme.com' }).status, 'revoked')
  const fresh = service.invite({ org: 'acme', email: 'sam+eng@acme.com', now: 2000 })

  assert.equal(service.accept({ token: old.token, email: 'sam@acme.com', now: 3000 }).status, 'revoked')
  assert.equal(service.accept({ token: fresh.token, email: 'sam@acme.com', now: 3000 }).status, 'accepted')
})

test('a re-invite snapshots the new default while the old token reports superseded', () => {
  const service = withOrg()
  const old = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  service.setDefaultRole('acme', 'admin')
  const fresh = service.invite({ org: 'acme', email: 'sam@acme.com', now: 2000 })

  const joined = service.accept({ token: fresh.token, email: 'sam@acme.com', now: 3000 })
  assert.equal(joined.status, 'accepted')
  assert.equal(joined.member.role, 'admin')
  assert.equal(service.accept({ token: old.token, email: 'sam@acme.com', now: 4000 }).status, 'superseded')
})

test('a superseded token stays superseded inside what would have been its valid window', () => {
  const service = withOrg()
  const old = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  const fresh = service.invite({ org: 'acme', email: 'sam@acme.com', now: 200000 })

  const withinOldWindow = 1000 + INVITE_TTL_MS - 1
  assert.equal(service.accept({ token: old.token, email: 'sam@acme.com', now: withinOldWindow }).status, 'superseded')
  const onNewBoundary = service.accept({ token: fresh.token, email: 'sam@acme.com', now: fresh.expiresAt })
  assert.equal(onNewBoundary.status, 'accepted')
})

test('an acceptor with a tagged address joins with the snapshotted role', () => {
  const service = withOrg()
  const invite = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  service.setDefaultRole('acme', 'admin')

  const result = service.accept({ token: invite.token, email: 'sam+eng@acme.com', now: 9000 })
  assert.equal(result.status, 'accepted')
  assert.equal(result.member.role, 'member')
  assert.equal(result.member.email, 'sam@acme.com')
})

test('used, re-invited, then the old token tried at its own expiry instant', () => {
  const service = withOrg()
  const old = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  assert.equal(service.accept({ token: old.token, email: 'sam@acme.com', now: 2000 }).status, 'accepted')
  const fresh = service.invite({ org: 'acme', email: 'sam@acme.com', now: 3000 })

  assert.equal(service.accept({ token: old.token, email: 'sam@acme.com', now: old.expiresAt }).status, 'superseded')
  assert.equal(service.accept({ token: fresh.token, email: 'sam@acme.com', now: fresh.expiresAt }).status, 'accepted')
})
