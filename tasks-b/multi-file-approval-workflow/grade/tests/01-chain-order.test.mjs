// Sub-problem 1: the ordered chain - one pending tier at a time, decisions in
// the order the flow declares, and a chain that stays complete through a
// quorum tier whose seats were handed off (docs §1-§4).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createApprovalService } from '../src/index.js'

const D = '2024-06-01T09:00:00Z'

const threeSingles = () => ({
  id: 'flow-singles',
  tiers: [
    { id: 'legal', approver: 'alice', deadline: '2024-06-05T09:00:00Z' },
    { id: 'finance', approver: 'bob', deadline: '2024-06-08T09:00:00Z' },
    { id: 'cfo', approver: 'carol', deadline: '2024-06-12T09:00:00Z' },
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

function rig(flow, doc = 'doc-1') {
  const svc = createApprovalService()
  const f = flow()
  assert.equal(svc.defineFlow(f).ok, true)
  assert.equal(svc.submit(doc, f.id, { at: D }).ok, true)
  return svc
}

test('the chain advances one tier at a time and closes once complete', () => {
  const svc = rig(threeSingles)
  assert.equal(svc.decide('doc-1', { actor: 'alice', action: 'approve', at: D }).outcome, 'tier-approved')
  assert.equal(svc.status('doc-1').current, 'finance')
  assert.equal(svc.decide('doc-1', { actor: 'bob', action: 'approve', at: D }).outcome, 'tier-approved')
  assert.equal(svc.status('doc-1').current, 'cfo')
  assert.equal(svc.decide('doc-1', { actor: 'carol', action: 'approve', at: D }).outcome, 'approved')
  const snap = svc.status('doc-1')
  assert.equal(snap.state, 'approved')
  assert.equal(snap.current, null)
  assert.deepEqual(
    svc.decide('doc-1', { actor: 'carol', action: 'approve', at: D }),
    { ok: false, reason: 'document-closed' },
  )
})

test('a decision aimed at a later tier is out of order, a stranger is not a decider', () => {
  const svc = rig(boardFlow)
  assert.deepEqual(
    svc.decide('doc-1', { actor: 'carol', action: 'approve', at: D }),
    { ok: false, reason: 'out-of-order' },
  )
  assert.deepEqual(
    svc.decide('doc-1', { actor: 'erin', action: 'approve', at: D }),
    { ok: false, reason: 'out-of-order' },
  )
  assert.deepEqual(
    svc.decide('doc-1', { actor: 'zoe', action: 'approve', at: D }),
    { ok: false, reason: 'not-a-decider' },
  )
  const snap = svc.status('doc-1')
  assert.equal(snap.current, 'intake')
  assert.equal(snap.tiers[0].state, 'pending')
})

test('the chain runs to approved through a quorum tier with a delegated seat', () => {
  const svc = rig(boardFlow)
  svc.decide('doc-1', { actor: 'sven', action: 'approve', at: D })
  assert.equal(svc.delegate('doc-1', { from: 'alice', to: 'dan', at: D }).ok, true)
  assert.equal(svc.decide('doc-1', { actor: 'dan', action: 'approve', at: D }).outcome, 'recorded')
  assert.equal(svc.status('doc-1').current, 'board')
  assert.equal(svc.decide('doc-1', { actor: 'bob', action: 'approve', at: D }).outcome, 'tier-approved')
  assert.equal(svc.decide('doc-1', { actor: 'erin', action: 'approve', at: D }).outcome, 'approved')
  const snap = svc.status('doc-1')
  assert.equal(snap.state, 'approved')
  assert.deepEqual(snap.tiers[1].approvals, [
    { seat: 'alice', via: 'dan', at: D },
    { seat: 'bob', via: 'bob', at: D },
  ])
})
