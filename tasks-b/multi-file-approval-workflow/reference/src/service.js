import { FlowRegistry } from './flow.js'
import { record } from './audit.js'
import * as R from './reasons.js'
import * as chains from './chains.js'
import * as quorum from './quorum.js'
import * as delegation from './delegation.js'
import { isDue } from './escalation.js'

/**
 * The approval service: owns the flows and the documents, and orchestrates
 * the modules that know the rules. Everything the intake jobs call lives on
 * this class; everything it returns is plain data.
 */
export class ApprovalService {
  constructor() {
    this.flows = new FlowRegistry()
    this.docs = new Map()
  }

  defineFlow(flow) {
    return this.flows.define(flow)
  }

  submit(id, flowId, { at } = {}) {
    const flow = this.flows.get(flowId)
    if (!flow) return R.refused(R.UNKNOWN_FLOW)
    if (this.docs.has(id)) return R.refused(R.DOCUMENT_EXISTS)
    const tiers = flow.tiers.map((t) =>
      t.kind === 'quorum'
        ? { id: t.id, kind: t.kind, members: [...t.members], k: t.k, deadline: t.deadline, state: 'waiting', tally: 0, approvals: [], veto: null }
        : { id: t.id, kind: t.kind, approver: t.approver, deadline: t.deadline, state: 'waiting', decision: null, veto: null },
    )
    const doc = {
      id, flow: flow.id, state: 'in-progress', submittedAt: at,
      tiers, currentIndex: 0, delegations: [], history: [],
    }
    tiers[0].state = 'pending'
    record(doc, at, 'submitted', tiers[0].id)
    this.docs.set(id, doc)
    return { ok: true }
  }

  decide(docId, { actor, action, at } = {}) {
    const doc = this.docs.get(docId)
    if (!doc) return R.refused(R.UNKNOWN_DOCUMENT)
    if (doc.state !== 'in-progress') return R.refused(R.DOCUMENT_CLOSED)
    const tier = chains.currentTier(doc)

    // Resolve the seat this decision fills: the actor's own, or the seat of
    // whoever delegated to them.
    let seat = null
    let incoming = null
    if ((incoming = delegation.byDelegate(doc, tier.id, actor))) {
      seat = incoming.from
    } else if (chains.isParticipant(tier, actor)) {
      if (delegation.byDelegator(doc, tier.id, actor)) return R.refused(R.ALREADY_DELEGATED)
      const decided = tier.kind === 'single' ? tier.decision !== null : quorum.hasVoted(tier, actor)
      if (decided) return R.refused(R.ALREADY_DECIDED)
      seat = actor
    } else if (chains.laterTierOf(doc, actor)) {
      return R.refused(R.OUT_OF_ORDER)
    } else {
      return R.refused(R.NOT_A_DECIDER)
    }

    if (action === 'veto') {
      if (incoming) delegation.spend(incoming)
      chains.applyVeto(doc, tier, { actor: seat, via: actor, at })
      return { ok: true, outcome: 'rejected' }
    }

    if (tier.kind === 'single') {
      if (incoming) delegation.spend(incoming)
      tier.decision = { actor: seat, via: actor, at }
      record(doc, at, 'approval', tier.id, actor)
      return this.#complete(doc, tier)
    }

    const done = quorum.castApproval(tier, seat, actor, at)
    if (incoming) delegation.spend(incoming)
    record(doc, at, 'approval', tier.id, actor)
    if (!done) return { ok: true, outcome: 'recorded', have: tier.tally, needed: tier.k }
    return this.#complete(doc, tier)
  }

  delegate(docId, { from, to, at } = {}) {
    const doc = this.docs.get(docId)
    if (!doc) return R.refused(R.UNKNOWN_DOCUMENT)
    if (doc.state !== 'in-progress') return R.refused(R.DOCUMENT_CLOSED)
    const tier = chains.currentTier(doc)

    const holds = tier.kind === 'single'
      ? tier.approver === from && tier.decision === null
      : tier.members.includes(from) && !quorum.hasVoted(tier, from)
    if (!holds) return R.refused(R.NOTHING_TO_DELEGATE)
    if (delegation.byDelegator(doc, tier.id, from)) return R.refused(R.ALREADY_DELEGATED)
    if (chains.isParticipant(tier, to) || delegation.byDelegate(doc, tier.id, to)) {
      return R.refused(R.DELEGATE_HAS_SEAT)
    }
    delegation.register(doc, tier, from, to, at)
    record(doc, at, 'delegated', tier.id, from, 'to ' + to)
    return { ok: true }
  }

  expire(docId, { at } = {}) {
    const doc = this.docs.get(docId)
    if (!doc) return R.refused(R.UNKNOWN_DOCUMENT)
    if (doc.state !== 'in-progress') return R.refused(R.DOCUMENT_CLOSED)
    const tier = chains.currentTier(doc)
    if (!isDue(tier.deadline, at)) return { ok: true, escalated: false }

    delegation.lapse(doc, tier.id)
    tier.state = 'escalated'
    record(doc, at, 'escalated', tier.id)
    const next = chains.advance(doc)
    if (!next) {
      doc.state = 'escalated'
      return { ok: true, escalated: true, tier: tier.id, state: doc.state, current: null }
    }
    return { ok: true, escalated: true, tier: tier.id, state: doc.state, current: next.id }
  }

  restart(docId, { at } = {}) {
    const doc = this.docs.get(docId)
    if (!doc) return R.refused(R.UNKNOWN_DOCUMENT)
    if (doc.state !== 'rejected') return R.refused(R.NOT_REJECTED)

    // A restart resets only the steps with no recorded outcome: approved and
    // escalated tiers are decided business and stand as they are.
    for (const tier of doc.tiers) {
      if (tier.state === 'approved' || tier.state === 'escalated') continue
      resetTier(tier)
    }
    doc.delegations = []
    const idx = doc.tiers.findIndex((t) => t.state !== 'approved' && t.state !== 'escalated')
    doc.tiers[idx].state = 'pending'
    doc.currentIndex = idx
    doc.state = 'in-progress'
    record(doc, at, 'restart')
    return { ok: true, current: doc.tiers[idx].id }
  }

  status(docId) {
    const doc = this.docs.get(docId)
    if (!doc) return null
    const current = doc.state === 'in-progress' ? chains.currentTier(doc)?.id ?? null : null
    return {
      id: doc.id,
      flow: doc.flow,
      state: doc.state,
      submittedAt: doc.submittedAt,
      current,
      tiers: doc.tiers.map((t) =>
        t.kind === 'quorum'
          ? {
              id: t.id, kind: t.kind, state: t.state, members: [...t.members],
              needed: t.k, have: t.tally,
              approvals: t.approvals.map((a) => ({ ...a })),
              veto: t.veto ? { ...t.veto } : null,
            }
          : {
              id: t.id, kind: t.kind, state: t.state, approver: t.approver,
              decision: t.decision ? { ...t.decision } : null,
              veto: t.veto ? { ...t.veto } : null,
            },
      ),
      delegations: doc.delegations
        .filter((d) => d.active)
        .map((d) => ({ tier: d.tierId, from: d.from, to: d.to, at: d.at })),
      history: doc.history.map((h) => ({ ...h })),
    }
  }

  #complete(doc, tier) {
    tier.state = 'approved'
    const next = chains.advance(doc)
    if (!next) {
      doc.state = 'approved'
      return { ok: true, outcome: 'approved' }
    }
    return { ok: true, outcome: 'tier-approved', current: next.id }
  }
}

/** Fresh tier: no decisions on record, back to waiting its turn. */
function resetTier(tier) {
  tier.state = 'waiting'
  tier.veto = null
  if (tier.kind === 'quorum') {
    tier.tally = 0
    tier.approvals = []
  } else {
    tier.decision = null
  }
}
