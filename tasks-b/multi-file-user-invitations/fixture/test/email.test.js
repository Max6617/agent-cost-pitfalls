import test from 'node:test'
import assert from 'node:assert/strict'
import { createService } from '../src/index.js'

const withOrg = () => {
  const service = createService()
  service.addOrg({ id: 'acme', defaultRole: 'member' })
  return service
}

test('the invite stores the canonical spelling of the address', () => {
  const service = withOrg()
  const invite = service.invite({ org: 'acme', email: 'Sam@Acme.COM', now: 1000 })
  assert.equal(invite.email, 'sam@acme.com')
})

test('acceptance matches the address regardless of case', () => {
  const service = withOrg()
  const invite = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
  const result = service.accept({ token: invite.token, email: 'Sam@acme.com', now: 2000 })
  assert.equal(result.status, 'accepted')
})
