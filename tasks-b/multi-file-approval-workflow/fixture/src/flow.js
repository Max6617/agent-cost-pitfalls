/**
 * Flow definitions: the templates a document is submitted against.
 *
 * A flow is validated once, at definition time, and stored by id. Tiers are
 * normalised to carry an explicit `kind` so the rest of the service never
 * has to guess which shape it is holding.
 */
export function validateFlow(flow) {
  const problems = []
  if (!flow || typeof flow.id !== 'string' || flow.id.length === 0) problems.push('flow needs an id')
  const tiers = flow?.tiers
  if (!Array.isArray(tiers) || tiers.length === 0) {
    problems.push('flow needs at least one tier')
    return problems
  }
  const seen = new Set()
  for (const t of tiers) {
    if (!t || typeof t.id !== 'string' || t.id.length === 0) problems.push('every tier needs an id')
    else if (seen.has(t.id)) problems.push('duplicate tier id ' + t.id)
    else seen.add(t.id)
    if (typeof t?.deadline !== 'string' || t.deadline.length === 0) problems.push('tier ' + t?.id + ' needs a deadline')
    const isPool = Array.isArray(t?.members)
    if (isPool) {
      if (t.members.length === 0) problems.push('tier ' + t.id + ' has an empty pool')
      if (!Number.isInteger(t.k) || t.k < 1 || t.k > t.members.length) problems.push('tier ' + t.id + ' needs 1 <= k <= members')
    } else if (typeof t?.approver !== 'string' || t.approver.length === 0) {
      problems.push('tier ' + t.id + ' needs an approver or a members pool')
    }
  }
  return problems
}

export function normalizeTier(tier) {
  if (Array.isArray(tier.members)) {
    return { id: tier.id, kind: 'quorum', members: [...tier.members], k: tier.k, deadline: tier.deadline }
  }
  return { id: tier.id, kind: 'single', approver: tier.approver, deadline: tier.deadline }
}

export class FlowRegistry {
  constructor() {
    this.flows = new Map()
  }

  define(flow) {
    const problems = validateFlow(flow)
    if (problems.length) return { ok: false, reason: 'invalid-flow', problems }
    this.flows.set(flow.id, { id: flow.id, tiers: flow.tiers.map(normalizeTier) })
    return { ok: true }
  }

  get(id) {
    return this.flows.get(id) ?? null
  }
}
