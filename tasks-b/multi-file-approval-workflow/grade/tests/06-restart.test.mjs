// Sub-problem 6: restart after rejection - resets only the steps with no
// recorded outcome; approved and escalated tiers are decided business (docs §7).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createApprovalService } from '../src/index.js'

const D = '2024-06-01T09:00:00Z'
const after = (iso, s = 1) => new Date(new Date(iso).getTime() + s * 1000).toISOString()

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

test('only a rejected document can be restarted', () => {
  const svc = rig(boardFlow)
  assert.deepEqual(svc.restart('doc-1', { at: D }), { ok: false, reason: 'not-rejected' })
  svc.decide('doc-1', { actor: 'sven', action: 'approve', at: D })
  svc.decide('doc-1', { actor: 'alice', action: 'approve', at: D })
  svc.decide('doc-1', { actor: 'bob', action: 'approve', at: D })
  svc.decide('doc-1', { actor: 'erin', action: 'approve', at: D })
  assert.equal(svc.status('doc-1').state, 'approved')
  assert.deepEqual(svc.restart('doc-1', { at: D }), { ok: false, reason: 'not-rejected' })
})

test('a restart resets only the step the rejection stopped', () => {
  const svc = rig(boardFlow)
  svc.decide('doc-1', { actor: 'sven', action: 'approve', at: D })
  svc.decide('doc-1', { actor: 'alice', action: 'approve', at: D })
  svc.decide('doc-1', { actor: 'bob', action: 'veto', at: D })
  const r = svc.restart('doc-1', { at: after(D) })
  assert.equal(r.ok, true)
  assert.equal(r.current, 'board')

  const snap = svc.status('doc-1')
  assert.equal(snap.state, 'in-progress')
  const intake = snap.tiers[0]
  assert.equal(intake.state, 'approved')
  assert.deepEqual(intake.decision, { actor: 'sven', via: 'sven', at: D })
  const board = snap.tiers[1]
  assert.equal(board.state, 'pending')
  assert.equal(board.have, 0)
  assert.deepEqual(board.approvals, [])
  assert.equal(board.veto, null)
  assert.equal(snap.history[snap.history.length - 1].kind, 'restart')

  // the tier that was reset asks again: the same member may cast again
  assert.equal(svc.decide('doc-1', { actor: 'alice', action: 'approve', at: after(D) }).outcome, 'recorded')
  assert.equal(svc.decide('doc-1', { actor: 'bob', action: 'approve', at: after(D) }).outcome, 'tier-approved')
  assert.equal(svc.decide('doc-1', { actor: 'erin', action: 'approve', at: after(D) }).outcome, 'approved')
})

test('a restart leaves escalated steps as they stand', () => {
  const svc = rig(boardFlow)
  svc.decide('doc-1', { actor: 'sven', action: 'approve', at: D })
  assert.equal(svc.expire('doc-1', { at: after('2024-06-10T09:00:00Z') }).escalated, true)
  assert.equal(svc.status('doc-1').current, 'cfo')
  svc.decide('doc-1', { actor: 'erin', action: 'veto', at: D })
  const r = svc.restart('doc-1', { at: after(D) })
  assert.equal(r.ok, true)
  assert.equal(r.current, 'cfo')

  const snap = svc.status('doc-1')
  assert.equal(snap.tiers[0].state, 'approved')
  assert.equal(snap.tiers[1].state, 'escalated')
  assert.equal(snap.tiers[1].have, 0)
  // the chain resumes after the escalated step, and the document can complete
  assert.equal(svc.decide('doc-1', { actor: 'erin', action: 'approve', at: after(D) }).outcome, 'approved')
  const done = svc.status('doc-1')
  assert.equal(done.state, 'approved')
  assert.equal(done.tiers[1].state, 'escalated')
})

test('a veto cast under a delegation is recorded, and the restart hands the seat back', () => {
  const svc = rig(boardFlow)
  svc.decide('doc-1', { actor: 'sven', action: 'approve', at: D })
  svc.delegate('doc-1', { from: 'alice', to: 'emma', at: D })
  assert.equal(svc.decide('doc-1', { actor: 'emma', action: 'veto', at: D }).outcome, 'rejected')
  const before = svc.status('doc-1')
  assert.equal(before.tiers[1].state, 'rejected')
  assert.deepEqual(before.tiers[1].veto, { actor: 'alice', via: 'emma', at: D })

  assert.equal(svc.restart('doc-1', { at: after(D) }).ok, true)
  const snap = svc.status('doc-1')
  assert.equal(snap.current, 'board')
  assert.deepEqual(snap.delegations, [])
  assert.equal(snap.tiers[1].veto, null)
  // the seat is alice's own again: she casts it, and the old veto is only history
  assert.equal(svc.decide('doc-1', { actor: 'alice', action: 'approve', at: after(D) }).outcome, 'recorded')
  assert.equal(svc.decide('doc-1', { actor: 'bob', action: 'approve', at: after(D) }).outcome, 'tier-approved')
  assert.ok(svc.status('doc-1').history.some((h) => h.kind === 'veto'))
})
