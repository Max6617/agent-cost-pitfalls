// Sub-problem 4: email canonicalisation - one mailbox under many spellings,
// used for storage, token derivation, identity and matching.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService, makeToken } from '../src/index.js'

const withOrg = () => {
  const service = createService()
  service.addOrg({ id: 'acme', defaultRole: 'member' })
  return service
}

test('the invite stores the canonical spelling of the address', () => {
  const service = withOrg()
  const invite = service.invite({ org: 'acme', email: 'Sam+Eng@Acme.COM', now: 1000 })
  assert.equal(invite.email, 'sam@acme.com')
})

test('the token is derived from the canonical address', () => {
  const shouty = withOrg()
  const a = shouty.invite({ org: 'acme', email: 'Sam@acme.com', now: 1000 })
  const plain = withOrg()
  const b = plain.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  assert.equal(a.token, b.token)
})

test('acceptance matches the address regardless of case', () => {
  const service = withOrg()
  const invite = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  const result = service.accept({ token: invite.token, email: 'SAM@ACME.COM', now: 2000 })
  assert.equal(result.status, 'accepted')
  assert.equal(result.member.email, 'sam@acme.com')
})

test('a plus-tag does not make a different person', () => {
  const service = withOrg()
  const invite = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  const result = service.accept({ token: invite.token, email: 'sam+eng@acme.com', now: 2000 })
  assert.equal(result.status, 'accepted')
})

test('a re-invite under a different spelling continues the same person\'s sequence', () => {
  const service = withOrg()
  service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  const renewed = service.invite({ org: 'acme', email: 'SAM@acme.com', now: 2000 })
  assert.equal(renewed.email, 'sam@acme.com')
  assert.equal(renewed.token, makeToken('acme', 'sam@acme.com', 2))
})
