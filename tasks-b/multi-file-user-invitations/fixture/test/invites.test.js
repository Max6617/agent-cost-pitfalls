import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const withOrg = () => {
  const service = createService()
  service.addOrg({ id: 'acme', defaultRole: 'member' })
  return service
}

test('the same invite issued twice produces the same token', () => {
  const first = withOrg()
  const a = first.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  const second = withOrg()
  const b = second.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  assert.equal(a.token, b.token)
})

test('re-inviting supersedes the previous invite', () => {
  const service = withOrg()
  const old = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  const fresh = service.invite({ org: 'acme', email: 'sam@acme.com', now: 2000 })
  assert.notEqual(old.token, fresh.token)
  assert.equal(service.accept({ token: old.token, email: 'sam@acme.com', now: 3000 }).status, 'superseded')
  assert.equal(service.accept({ token: fresh.token, email: 'sam@acme.com', now: 3000 }).status, 'accepted')
})

test('a revoked invite stays revoked after a re-invite', () => {
  const service = withOrg()
  const old = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  service.revoke({ org: 'acme', email: 'sam@acme.com' })
  service.invite({ org: 'acme', email: 'sam@acme.com', now: 2000 })
  assert.equal(service.accept({ token: old.token, email: 'sam@acme.com', now: 3000 }).status, 'revoked')
})

test('an invite can only be accepted once', () => {
  const service = withOrg()
  const invite = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  assert.equal(service.accept({ token: invite.token, email: 'sam@acme.com', now: 2000 }).status, 'accepted')
  assert.equal(service.accept({ token: invite.token, email: 'sam@acme.com', now: 3000 }).status, 'already-accepted')
})
