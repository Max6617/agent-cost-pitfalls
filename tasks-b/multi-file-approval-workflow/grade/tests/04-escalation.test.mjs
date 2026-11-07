// Sub-problem 4: deadlines and escalation - the expiry event exists strictly
// after the deadline, escalates only the pending tier, and runs the document
// off the top when the final tier goes (docs §5).
import test from 'node:test'
import assert from 'node:assert/strict'
import { createApprovalService } from '../src/index.js'

const D = '2024-06-01T09:00:00Z'
const DL1 = '2024-06-05T09:00:00Z'
const DL2 = '2024-06-10T09:00:00Z'
const after = (iso, s = 1) => new Date(new Date(iso).getTime() + s * 1000).toISOString()

const twoSingles = () => ({
  id: 'flow-two',
  tiers: [
    { id: 'legal', approver: 'alice', deadline: DL1 },
    { id: 'cfo', approver: 'bob', deadline: DL2 },
  ],
})

const boardFlow = () => ({
  id: 'flow-board',
  tiers: [
    { id: 'intake', approver: 'sven', deadline: DL1 },
    { id: 'board', members: ['alice', 'bob', 'carol'], k: 2, deadline: DL2 },
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

test('the expiry event is due strictly after the deadline, never at it', () => {
  const svc = rig(twoSingles)
  assert.deepEqual(svc.expire('doc-1', { at: DL1 }), { ok: true, escalated: false })
  // a decision at the deadline instant stands
  assert.equal(svc.decide('doc-1', { actor: 'alice', action: 'approve', at: DL1 }).outcome, 'tier-approved')
  // the old tier's deadline is gone with it; only the pending tier is exposed
  assert.deepEqual(svc.expire('doc-1', { at: after(DL1) }), { ok: true, escalated: false })
  assert.equal(svc.status('doc-1').current, 'cfo')
})

test('an expired quorum tier escalates with its recorded approvals intact', () => {
  const svc = rig(boardFlow)
  svc.decide('doc-1', { actor: 'sven', action: 'approve', at: D })
  svc.delegate('doc-1', { from: 'alice', to: 'dan', at: D })
  assert.equal(svc.decide('doc-1', { actor: 'dan', action: 'approve', at: D }).outcome, 'recorded')
  const r = svc.expire('doc-1', { at: after(DL2) })
  assert.equal(r.escalated, true)
  assert.equal(r.tier, 'board')
  assert.equal(r.current, 'cfo')
  const board = svc.status('doc-1').tiers[1]
  assert.equal(board.state, 'escalated')
  assert.equal(board.have, 1)
  assert.deepEqual(board.approvals, [{ seat: 'alice', via: 'dan', at: D }])
  // the decision moved up: the board's members hold nothing now
  assert.deepEqual(
    svc.decide('doc-1', { actor: 'bob', action: 'approve', at: after(DL2) }),
    { ok: false, reason: 'not-a-decider' },
  )
})

test('the final tier escalates only once its deadline has passed, and then the document is undecided', () => {
  const svc = rig(twoSingles)
  svc.decide('doc-1', { actor: 'alice', action: 'approve', at: D })
  assert.deepEqual(svc.expire('doc-1', { at: DL2 }), { ok: true, escalated: false })
  // a decision after the deadline but before the event is still a decision
  assert.equal(svc.decide('doc-1', { actor: 'bob', action: 'approve', at: after(DL2, 3600) }).outcome, 'approved')

  assert.equal(svc.submit('doc-2', 'flow-two', { at: D }).ok, true)
  svc.decide('doc-2', { actor: 'alice', action: 'approve', at: D })
  const r = svc.expire('doc-2', { at: after(DL2) })
  assert.equal(r.escalated, true)
  assert.equal(r.state, 'escalated')
  assert.equal(r.current, null)
  const snap = svc.status('doc-2')
  assert.equal(snap.state, 'escalated')
  assert.equal(snap.tiers[1].state, 'escalated')
  assert.deepEqual(svc.restart('doc-2', { at: after(DL2) }), { ok: false, reason: 'not-rejected' })
})
