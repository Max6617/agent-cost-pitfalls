import test from 'node:test'
import assert from 'node:assert/strict'
import { createService, INVITE_TTL_MS } from '../src/index.js'

const withOrg = () => {
  const service = createService()
  service.addOrg({ id: 'acme', defaultRole: 'member' })
  return service
}

test('an invite expires a week after it is sent', () => {
  const service = withOrg()
  const invite = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  assert.equal(invite.expiresAt, 1000 + INVITE_TTL_MS)
})

test('an invite is still usable at its expiry instant', () => {
  const service = withOrg()
  const invite = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  const result = service.accept({ token: invite.token, email: 'sam@acme.com', now: invite.expiresAt })
  assert.equal(result.status, 'accepted')
})

test('a member joins with the role in force when the invite was sent', () => {
  const service = withOrg()
  const invite = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  service.setDefaultRole('acme', 'admin')
  const result = service.accept({ token: invite.token, email: 'sam@acme.com', now: 2000 })
  assert.equal(result.status, 'accepted')
  assert.equal(result.member.role, 'member')
})

test('an invite that names a role grants that role', () => {
  const service = withOrg()
  const invite = service.invite({ org: 'acme', email: 'sam@acme.com', role: 'viewer', now: 1000 })
  service.setDefaultRole('acme', 'admin')
  const result = service.accept({ token: invite.token, email: 'sam@acme.com', now: 2000 })
  assert.equal(result.member.role, 'viewer')
})
