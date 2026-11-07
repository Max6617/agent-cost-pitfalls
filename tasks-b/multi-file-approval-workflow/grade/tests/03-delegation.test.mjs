// Sub-problem 3: delegation - one pending decision, handed over whole, and
// lapsed the moment its decision is cast or its step stops pending (docs §4).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createApprovalService } from '../src/index.js'

const D = '2024-06-01T09:00:00Z'
const DL2 = '2024-06-10T09:00:00Z'

const twoSingles = () => ({
  id: 'flow-two',
  tiers: [
    { id: 'legal', approver: 'alice', deadline: '2024-06-05T09:00:00Z' },
    { id: 'cfo', approver: 'bob', deadline: DL2 },
  ],
})

const poolFlow = () => ({
  id: 'flow-pool',
  tiers: [
    { id: 'board', members: ['alice', 'bob'], k: 2, deadline: DL2 },
    { id: 'cfo', approver: 'erin', deadline: '2024-06-15T09:00:00Z' },
  ],
})

function rig(flow, doc = 'doc-1') {
  const svc = createApprovalService()
  const f = flow()
  assert.equal(svc.defineFlow(f).ok, true)
  assert.equal(svc.submit(doc, f.id, { at: D }).ok, true)
  return svc
}

test('the delegator gives the decision up; the delegate casts it against the seat', () => {
  const svc = rig(twoSingles)
  assert.equal(svc.delegate('doc-1', { from: 'alice', to: 'carol', at: D }).ok, true)
  assert.deepEqual(
    svc.decide('doc-1', { actor: 'alice', action: 'approve', at: D }),
    { ok: false, reason: 'already-delegated' },
  )
  assert.equal(svc.decide('doc-1', { actor: 'carol', action: 'approve', at: D }).outcome, 'tier-approved')
  const legal = svc.status('doc-1').tiers[0]
  assert.equal(legal.state, 'approved')
  assert.deepEqual(legal.decision, { actor: 'alice', via: 'carol', at: D })
  assert.deepEqual(svc.status('doc-1').delegations, [])
})

test('a restart hands the delegated seat back to its owner', () => {
  const svc = rig(poolFlow)
  svc.delegate('doc-1', { from: 'alice', to: 'dan', at: D })
  assert.equal(svc.decide('doc-1', { actor: 'dan', action: 'approve', at: D }).outcome, 'recorded')
  assert.equal(svc.decide('doc-1', { actor: 'bob', action: 'veto', at: D }).outcome, 'rejected')
  assert.equal(svc.restart('doc-1', { at: D }).ok, true)
  const snap = svc.status('doc-1')
  assert.equal(snap.current, 'board')
  assert.deepEqual(snap.delegations, [])
  // the seat is alice's again: she casts it herself, and the pool still needs both
  assert.equal(svc.decide('doc-1', { actor: 'alice', action: 'approve', at: D }).outcome, 'recorded')
  assert.equal(svc.decide('doc-1', { actor: 'bob', action: 'approve', at: D }).outcome, 'tier-approved')
  assert.equal(svc.decide('doc-1', { actor: 'erin', action: 'approve', at: D }).outcome, 'approved')
})

test('a closed document refuses new delegations', () => {
  const svc = rig(twoSingles)
  svc.decide('doc-1', { actor: 'alice', action: 'veto', at: D })
  assert.deepEqual(
    svc.delegate('doc-1', { from: 'bob', to: 'zoe', at: D }),
    { ok: false, reason: 'document-closed' },
  )
  assert.deepEqual(
    svc.delegate('doc-1', { from: 'alice', to: 'zoe', at: D }),
    { ok: false, reason: 'document-closed' },
  )
})

test('the delegation lives until the expiry event, not merely until the deadline', () => {
  const svc = rig(poolFlow)
  svc.delegate('doc-1', { from: 'alice', to: 'dan', at: D })
  // at the deadline instant the tier is still actionable, so the hand-off stands
  assert.deepEqual(svc.expire('doc-1', { at: DL2 }), { ok: true, escalated: false })
  const r = svc.decide('doc-1', { actor: 'dan', action: 'approve', at: DL2 })
  assert.equal(r.outcome, 'recorded')
  assert.equal(r.have, 1)
  const board = svc.status('doc-1').tiers[0]
  assert.equal(board.state, 'pending')
  assert.deepEqual(board.approvals, [{ seat: 'alice', via: 'dan', at: DL2 }])
})
