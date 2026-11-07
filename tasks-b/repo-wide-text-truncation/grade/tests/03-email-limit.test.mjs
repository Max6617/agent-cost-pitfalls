// Sub-problem 3: the email surface shortens subjects against a local constant
// from before the central policy, not against LIMITS.emailSubject.
import test from 'node:test'
import assert from 'node:assert/strict'
import { emailSubject } from '../src/index.js'

test('a subject under the policy limit is sent unchanged', () => {
  assert.equal(emailSubject('s'.repeat(52)), 's'.repeat(52))
})

test('a subject at exactly the policy limit is sent unchanged', () => {
  assert.equal(emailSubject('s'.repeat(60)), 's'.repeat(60))
})

test('a subject over the policy limit shortens at the policy limit', () => {
  assert.equal(emailSubject('s'.repeat(70)), 's'.repeat(59) + '…')
})

test('the word-boundary rule is applied at the policy limit', () => {
  assert.equal(emailSubject('w'.repeat(55) + ' ' + 'x'.repeat(14)), 'w'.repeat(55) + '…')
})
