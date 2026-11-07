import test from 'node:test'
import assert from 'node:assert/strict'
import { createInvites } from '../src/index.js'

test('dots matter where the provider table says they matter', () => {
  const invites = createInvites()
  invites.invite('jo.smith@outlook.com')
  assert.equal(invites.accept('josmith@outlook.com').status, 'no-invite')
})

test('a dotted variant is a different invite, not a duplicate', () => {
  const invites = createInvites()
  invites.invite('an.b@fastmail.fm')
  assert.equal(invites.invite('anb@fastmail.fm').status, 'sent')
  assert.equal(invites.pending().length, 2)
})
