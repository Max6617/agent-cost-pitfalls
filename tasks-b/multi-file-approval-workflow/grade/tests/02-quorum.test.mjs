// Sub-problem 2: quorum pools - k distinct seats, one approval per seat, and
// a delegated approval that fills the delegator's seat exactly once (docs §3).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createApprovalService } from '../src/index.js'

const D = '2024-06-01T09:00:00Z'

const boardFlow = () => ({
  id: 'flow-board',
  tiers: [
    { id: 'intake', approver: 'sven', deadline: '2024-06-05T09:00:00Z' },
    { id: 'board', members: ['alice', 'bob', 'carol'], k: 2, deadline: '2024-06-10T09:00:00Z' },
    { id: 'cfo', approver: 'erin', deadline: '2024-06-15T09:00:00Z' },
  ],
})

const bigBoardFlow = () => ({
  id: 'flow-big-board',
  tiers: [
    { id: 'board', members: ['alice', 'bob', 'carol', 'dan'], k: 3, deadline: '2024-06-10T09:00:00Z' },
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

test('an approval cast under a delegation counts once toward the quorum', () => {
  const svc = rig(boardFlow)
  svc.decide('doc-1', { actor: 'sven', action: 'approve', at: D })
  svc.delegate('doc-1', { from: 'alice', to: 'dan', at: D })
  const r = svc.decide('doc-1', { actor: 'dan', action: 'approve', at: D })
  assert.equal(r.outcome, 'recorded')
  assert.equal(r.have, 1)
  assert.equal(r.needed, 2)
  const board = svc.status('doc-1').tiers[1]
  assert.equal(board.state, 'pending')
  assert.equal(board.have, 1)
  assert.deepEqual(board.approvals, [{ seat: 'alice', via: 'dan', at: D }])
})

test('a pool with a delegation outstanding still needs the full k', () => {
  const svc = rig(bigBoardFlow)
  svc.delegate('doc-1', { from: 'alice', to: 'emma', at: D })
  assert.equal(svc.decide('doc-1', { actor: 'emma', action: 'approve', at: D }).outcome, 'recorded')
  const second = svc.decide('doc-1', { actor: 'bob', action: 'approve', at: D })
  assert.equal(second.outcome, 'recorded')
  assert.equal(second.have, 2)
  assert.equal(svc.status('doc-1').current, 'board')
  assert.equal(svc.decide('doc-1', { actor: 'carol', action: 'approve', at: D }).outcome, 'tier-approved')
  assert.equal(svc.status('doc-1').current, 'cfo')
})

test('plain and delegated seats are recorded side by side, each exactly once', () => {
  const svc = rig(bigBoardFlow)
  svc.decide('doc-1', { actor: 'bob', action: 'approve', at: D })
  svc.delegate('doc-1', { from: 'alice', to: 'emma', at: D })
  const r = svc.decide('doc-1', { actor: 'emma', action: 'approve', at: D })
  assert.equal(r.outcome, 'recorded')
  assert.equal(r.have, 2)
  const board = svc.status('doc-1').tiers[0]
  assert.deepEqual(board.approvals, [
    { seat: 'bob', via: 'bob', at: D },
    { seat: 'alice', via: 'emma', at: D },
  ])
  assert.equal(board.have, 2)
  assert.equal(svc.decide('doc-1', { actor: 'carol', action: 'approve', at: D }).outcome, 'tier-approved')
})

test('a veto cast under a delegation rejects the document, recorded against the seat', () => {
  const svc = rig(boardFlow)
  svc.decide('doc-1', { actor: 'sven', action: 'approve', at: D })
  svc.delegate('doc-1', { from: 'alice', to: 'dan', at: D })
  assert.equal(svc.decide('doc-1', { actor: 'dan', action: 'veto', at: D }).outcome, 'rejected')
  const snap = svc.status('doc-1')
  assert.equal(snap.state, 'rejected')
  assert.equal(snap.tiers[1].state, 'rejected')
  assert.deepEqual(snap.tiers[1].veto, { actor: 'alice', via: 'dan', at: D })
  assert.deepEqual(
    svc.decide('doc-1', { actor: 'bob', action: 'approve', at: D }),
    { ok: false, reason: 'document-closed' },
  )
})
