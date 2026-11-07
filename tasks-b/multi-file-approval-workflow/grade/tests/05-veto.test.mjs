// Sub-problem 5: the veto - never local, needs no quorum, closes the whole
// document on the spot while earlier approvals stay on the record (docs §6).
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

const bigBoardFlow = () => ({
  id: 'flow-big-board',
  tiers: [
    { id: 'intake', approver: 'sven', deadline: '2024-06-05T09:00:00Z' },
    { id: 'board', members: ['bob', 'carol', 'dan', 'erin'], k: 3, deadline: '2024-06-10T09:00:00Z' },
    { id: 'cfo', approver: 'frank', deadline: '2024-06-15T09:00:00Z' },
  ],
})

function rig(flow, doc = 'doc-1') {
  const svc = createApprovalService()
  const f = flow()
  assert.equal(svc.defineFlow(f).ok, true)
  assert.equal(svc.submit(doc, f.id, { at: D }).ok, true)
  return svc
}

test('a veto rejects the document on the spot and closes it to everything', () => {
  const svc = rig(twoSingles)
  assert.equal(svc.decide('doc-1', { actor: 'alice', action: 'veto', at: D }).outcome, 'rejected')
  const snap = svc.status('doc-1')
  assert.equal(snap.state, 'rejected')
  assert.equal(snap.current, null)
  assert.equal(snap.tiers[0].state, 'rejected')
  assert.deepEqual(snap.tiers[0].veto, { actor: 'alice', via: 'alice', at: D })
  assert.equal(snap.tiers[1].state, 'waiting')
  assert.deepEqual(
    svc.decide('doc-1', { actor: 'bob', action: 'approve', at: D }),
    { ok: false, reason: 'document-closed' },
  )
  assert.deepEqual(svc.expire('doc-1', { at: '2024-06-20T09:00:00Z' }), { ok: false, reason: 'document-closed' })
  assert.deepEqual(
    svc.delegate('doc-1', { from: 'bob', to: 'zoe', at: D }),
    { ok: false, reason: 'document-closed' },
  )
})

test('a veto mid-chain keeps the earlier approvals and the tally it stopped', () => {
  const svc = rig(bigBoardFlow)
  svc.decide('doc-1', { actor: 'sven', action: 'approve', at: D })
  svc.decide('doc-1', { actor: 'bob', action: 'approve', at: D })
  svc.decide('doc-1', { actor: 'carol', action: 'approve', at: D })
  assert.equal(svc.decide('doc-1', { actor: 'dan', action: 'veto', at: D }).outcome, 'rejected')
  const snap = svc.status('doc-1')
  assert.equal(snap.state, 'rejected')
  const intake = snap.tiers[0]
  assert.equal(intake.state, 'approved')
  assert.deepEqual(intake.decision, { actor: 'sven', via: 'sven', at: D })
  const board = snap.tiers[1]
  assert.equal(board.state, 'rejected')
  assert.equal(board.have, 2)
  assert.deepEqual(board.veto, { actor: 'dan', via: 'dan', at: D })
  assert.equal(snap.tiers[2].state, 'waiting')
})

test('a veto needs no quorum: one member ends it, even as the first act of the tier', () => {
  const svc = rig(bigBoardFlow)
  svc.decide('doc-1', { actor: 'sven', action: 'approve', at: D })
  assert.equal(svc.decide('doc-1', { actor: 'erin', action: 'veto', at: D }).outcome, 'rejected')
  const snap = svc.status('doc-1')
  assert.equal(snap.state, 'rejected')
  const board = snap.tiers[1]
  assert.equal(board.state, 'rejected')
  assert.equal(board.have, 0)
  assert.deepEqual(board.approvals, [])
})
