// Sub-problem 2: invites match by identity, and dots are significant unless
// the provider table's canonical row says they are ignored.
import test from 'node:test'
import assert from 'node:assert/strict'
import { createInvites } from '../src/index.js'

test('dots are significant where the table says so', () => {
  const invites = createInvites()
  invites.invite('jo.smith@outlook.com')
  assert.equal(invites.accept('josmith@outlook.com').status, 'no-invite')
  assert.equal(invites.pending().length, 1)
})

test('a dotted variant is a different invite, not a duplicate', () => {
  const invites = createInvites()
  invites.invite('an.b@fastmail.fm')
  assert.equal(invites.invite('anb@fastmail.fm').status, 'sent')
  assert.equal(invites.pending().length, 2)
})

test('case folds and dots stay on a dotted provider-free address', () => {
  const invites = createInvites()
  invites.invite('Jo.Smith+team@outlook.com')
  assert.equal(invites.accept('JOSMITH@outlook.com').status, 'no-invite')
  assert.equal(invites.accept('jo.smith@OUTLOOK.com').status, 'accepted')
})

test('an alias keeps its dots when the canonical provider does', () => {
  const invites = createInvites()
  invites.invite('a.b@hotmail.com')
  assert.equal(invites.accept('ab@outlook.com').status, 'no-invite')
  assert.equal(invites.accept('A.B@outlook.com').status, 'accepted')
})

test('an invite is accepted by the exact address and leaves the pending list', () => {
  const invites = createInvites()
  invites.invite('kim@example.com')
  assert.equal(invites.accept('kim@example.com').status, 'accepted')
  assert.deepEqual(invites.pending(), [])
})
