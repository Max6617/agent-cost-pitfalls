import test from 'node:test'
import assert from 'node:assert/strict'
import { createApprovalService } from '../src/index.js'

const D = '2024-06-01T09:00:00Z'

const twoSingles = () => ({
  id: 'flow-two',
  tiers: [
    { id: 'legal', approver: 'alice', deadline: '2024-06-05T09:00:00Z' },
    { id: 'cfo', approver: 'bob', deadline: '2024-06-10T09:00:00Z' },
  ],
})

const boardFlow = () => ({
  id: 'flow-board',
  tiers: [
    { id: 'intake', approver: 'sven', deadline: '2024-06-05T09:00:00Z' },
    { id: 'board', members: ['alice', 'bob', 'carol'], k: 2, deadline: '2024-06-10T09:00:00Z' },
    { id: 'cfo', approver: 'erin', deadline: '2024-06-15T09:00:00Z' },
  ],
})

function submitted(flow) {
  const svc = createApprovalService()
  svc.defineFlow(flow())
  assert.equal(svc.submit('doc-1', flow().id, { at: D }).ok, true)
  return svc
}

test('the chain advances one tier at a time, in the order the flow declares', () => {
  const svc = submitted(twoSingles)
  assert.equal(svc.decide('doc-1', { actor: 'alice', action: 'approve', at: D }).outcome, 'tier-approved')
  assert.equal(svc.status('doc-1').current, 'cfo')
  assert.equal(svc.decide('doc-1', { actor: 'bob', action: 'approve', at: D }).outcome, 'approved')
  assert.equal(svc.status('doc-1').state, 'approved')
})

test('a decision from a later tier is refused as out of order', () => {
  const svc = submitted(twoSingles)
  const r = svc.decide('doc-1', { actor: 'bob', action: 'approve', at: D })
  assert.deepEqual(r, { ok: false, reason: 'out-of-order' })
  assert.equal(svc.status('doc-1').current, 'legal')
})

test('a quorum tier completes when k distinct members have approved', () => {
  const svc = submitted(boardFlow)
  svc.decide('doc-1', { actor: 'sven', action: 'approve', at: D })
  assert.equal(svc.decide('doc-1', { actor: 'alice', action: 'approve', at: D }).outcome, 'recorded')
  assert.equal(svc.decide('doc-1', { actor: 'bob', action: 'approve', at: D }).outcome, 'tier-approved')
  assert.equal(svc.status('doc-1').current, 'cfo')
})

test('an approval cast under a delegation counts once toward the quorum', () => {
  const svc = submitted(boardFlow)
  svc.decide('doc-1', { actor: 'sven', action: 'approve', at: D })
  assert.equal(svc.delegate('doc-1', { from: 'alice', to: 'dan', at: D }).ok, true)
  const r = svc.decide('doc-1', { actor: 'dan', action: 'approve', at: D })
  assert.equal(r.outcome, 'recorded')
  assert.equal(r.have, 1)
  assert.equal(svc.status('doc-1').current, 'board')
})

test('a delegate may cast the decision they were handed', () => {
  const svc = submitted(twoSingles)
  assert.equal(svc.delegate('doc-1', { from: 'alice', to: 'carol', at: D }).ok, true)
  assert.equal(svc.decide('doc-1', { actor: 'carol', action: 'approve', at: D }).outcome, 'tier-approved')
  const legal = svc.status('doc-1').tiers[0]
  assert.equal(legal.state, 'approved')
  assert.deepEqual(legal.decision, { actor: 'alice', via: 'carol', at: D })
})

test('a veto rejects the whole document on the spot', () => {
  const svc = submitted(twoSingles)
  assert.equal(svc.decide('doc-1', { actor: 'alice', action: 'veto', at: D }).outcome, 'rejected')
  assert.equal(svc.status('doc-1').state, 'rejected')
  assert.deepEqual(svc.decide('doc-1', { actor: 'bob', action: 'approve', at: D }), { ok: false, reason: 'document-closed' })
})
