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

function submitted(flow) {
  const svc = createApprovalService()
  svc.defineFlow(flow())
  assert.equal(svc.submit('doc-1', flow().id, { at: D }).ok, true)
  return svc
}

test('a tier is still actionable at its deadline instant', () => {
  const svc = submitted(twoSingles)
  assert.deepEqual(svc.expire('doc-1', { at: DL1 }), { ok: true, escalated: false })
  assert.equal(svc.status('doc-1').current, 'legal')
  assert.equal(svc.decide('doc-1', { actor: 'alice', action: 'approve', at: DL1 }).outcome, 'tier-approved')
})

test('the expiry event escalates the tier once the deadline has passed', () => {
  const svc = submitted(twoSingles)
  const r = svc.expire('doc-1', { at: after(DL1) })
  assert.equal(r.escalated, true)
  assert.equal(r.tier, 'legal')
  const snap = svc.status('doc-1')
  assert.equal(snap.tiers[0].state, 'escalated')
  assert.equal(snap.current, 'cfo')
})

test('a restart keeps the tiers that already approved', () => {
  const svc = submitted(twoSingles)
  svc.decide('doc-1', { actor: 'alice', action: 'approve', at: D })
  svc.decide('doc-1', { actor: 'bob', action: 'veto', at: D })
  assert.equal(svc.restart('doc-1', { at: after(D) }).ok, true)
  const snap = svc.status('doc-1')
  assert.equal(snap.current, 'cfo')
  assert.equal(snap.tiers[0].state, 'approved')
  assert.deepEqual(snap.tiers[0].decision, { actor: 'alice', via: 'alice', at: D })
})

test('only a rejected document can be restarted', () => {
  const svc = submitted(twoSingles)
  assert.deepEqual(svc.restart('doc-1', { at: D }), { ok: false, reason: 'not-rejected' })
})
