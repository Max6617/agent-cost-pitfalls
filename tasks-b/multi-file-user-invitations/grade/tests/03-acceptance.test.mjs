// Sub-problem 3: the acceptance lifecycle - single-use, superseded by a
// re-invite, revoked stays revoked - and which status is reported when more
// than one applies.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const withOrg = () => {
  const service = createService()
  service.addOrg({ id: 'acme', defaultRole: 'member' })
  return service
}

test('re-inviting supersedes the previous invite immediately', () => {
  const service = withOrg()
  const old = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  const fresh = service.invite({ org: 'acme', email: 'sam@acme.com', now: 2000 })

  assert.notEqual(old.token, fresh.token)
  assert.equal(service.accept({ token: old.token, email: 'sam@acme.com', now: 3000 }).status, 'superseded')
  assert.equal(service.accept({ token: fresh.token, email: 'sam@acme.com', now: 3000 }).status, 'accepted')
})

test('a revoked invite keeps reporting revoked after a re-invite', () => {
  const service = withOrg()
  const old = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  assert.equal(service.revoke({ org: 'acme', email: 'sam@acme.com' }).status, 'revoked')
  const fresh = service.invite({ org: 'acme', email: 'sam@acme.com', now: 2000 })

  assert.equal(service.accept({ token: old.token, email: 'sam@acme.com', now: 3000 }).status, 'revoked')
  assert.equal(service.accept({ token: fresh.token, email: 'sam@acme.com', now: 3000 }).status, 'accepted')
})

test('an invite that was used and then re-invited reports its old token superseded', () => {
  const service = withOrg()
  const old = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  assert.equal(service.accept({ token: old.token, email: 'sam@acme.com', now: 2000 }).status, 'accepted')

  const fresh = service.invite({ org: 'acme', email: 'sam@acme.com', now: 4000 })
  assert.equal(service.accept({ token: old.token, email: 'sam@acme.com', now: 5000 }).status, 'superseded')
  assert.equal(service.accept({ token: fresh.token, email: 'sam@acme.com', now: 5000 }).status, 'accepted')
})

test('a superseded token reports superseded even after the new invite was used', () => {
  const service = withOrg()
  const old = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  const fresh = service.invite({ org: 'acme', email: 'sam@acme.com', now: 2000 })
  assert.equal(service.accept({ token: fresh.token, email: 'sam@acme.com', now: 3000 }).status, 'accepted')

  assert.equal(service.accept({ token: old.token, email: 'sam@acme.com', now: 4000 }).status, 'superseded')
})

test('revoking an invite refuses it, and an unknown token is not found', () => {
  const service = withOrg()
  const invite = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  service.revoke({ org: 'acme', email: 'sam@acme.com' })

  assert.equal(service.accept({ token: invite.token, email: 'sam@acme.com', now: 2000 }).status, 'revoked')
  assert.equal(service.accept({ token: 'inv_00000000', email: 'sam@acme.com', now: 2000 }).status, 'not-found')
})
