// Sub-problem 2: the role an invite grants is snapshotted when the invite is
// sent - an explicit pick, or the org's default at that moment - and later
// changes to the default never rewrite it.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const withOrg = () => {
  const service = createService()
  service.addOrg({ id: 'acme', defaultRole: 'member' })
  return service
}

test('an invite sent without a role records the default of that moment', () => {
  const service = withOrg()
  const invite = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  assert.equal(invite.role, 'member')
})

test('the accepted member gets the snapshotted role, not the current default', () => {
  const service = withOrg()
  const invite = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  service.setDefaultRole('acme', 'admin')
  const result = service.accept({ token: invite.token, email: 'sam@acme.com', now: 9000 })
  assert.equal(result.status, 'accepted')
  assert.equal(result.member.role, 'member')
})

test('an explicit role survives any later default change', () => {
  const service = withOrg()
  const invite = service.invite({ org: 'acme', email: 'sam@acme.com', role: 'viewer', now: 1000 })
  service.setDefaultRole('acme', 'admin')
  const result = service.accept({ token: invite.token, email: 'sam@acme.com', now: 9000 })
  assert.equal(result.status, 'accepted')
  assert.equal(result.member.role, 'viewer')
})

test('a re-invite snapshots whatever the default is when the re-invite is sent', () => {
  const service = withOrg()
  service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  service.setDefaultRole('acme', 'admin')
  const renewed = service.invite({ org: 'acme', email: 'sam@acme.com', now: 2000 })
  const result = service.accept({ token: renewed.token, email: 'sam@acme.com', now: 9000 })
  assert.equal(result.status, 'accepted')
  assert.equal(result.member.role, 'admin')
})

test('two invites sent under one default both keep it after the default moves', () => {
  const service = withOrg()
  const sam = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  const bea = service.invite({ org: 'acme', email: 'bea@acme.com', role: 'viewer', now: 1001 })
  service.setDefaultRole('acme', 'admin')

  const samResult = service.accept({ token: sam.token, email: 'sam@acme.com', now: 9000 })
  const beaResult = service.accept({ token: bea.token, email: 'bea@acme.com', now: 9001 })
  assert.equal(samResult.member.role, 'member')
  assert.equal(beaResult.member.role, 'viewer')
})
