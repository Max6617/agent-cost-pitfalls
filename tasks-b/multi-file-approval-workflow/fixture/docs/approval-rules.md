# Approval rules

The rules the team signed off for the approval service. `src/` is the
implementation; when the two disagree, this document is right and the code is
a bug.

## 1. Flows, tiers and the chain

A flow is an ordered list of **tiers**. A document is submitted against a
flow and must collect a decision from every tier **in the order the flow
declares**. Exactly one tier is **pending** at a time; tiers before it have a
recorded outcome, tiers after it are **waiting**.

A tier is one of:

- **single** — one named approver holds the decision:
  `{ id: 'legal', approver: 'alice', deadline: '...' }`
- **quorum** — a pool of named members, of whom `k` must approve:
  `{ id: 'board', members: ['bob', 'carol', 'dan'], k: 2, deadline: '...' }`

When the pending tier approves, the next waiting tier becomes pending. When
the final tier approves, the document is **approved**. A document is
`in-progress`, `approved`, `rejected` or `escalated`, and nothing else.

## 2. Decisions

`decide(doc, { actor, action, at })` casts `approve` or `veto` for the
**pending tier only**. Whoever the decision is resolved to is the **seat** it
fills: normally the actor's own seat, or the delegator's seat when the actor
holds a delegation (§4). A seat decides once per tier.

The call returns `{ ok: true, outcome }` with outcome one of:

| outcome | meaning |
|---|---|
| `recorded` | a quorum approval landed and the tier still needs more seats |
| `tier-approved` | the tier completed and the chain advanced |
| `approved` | the final tier completed; the document is approved |
| `rejected` | a veto landed; the document is rejected (§6) |

Refusals return `{ ok: false, reason }`, change nothing, and are checked in
this order:

| reason | when |
|---|---|
| `unknown-document` | no document with that id |
| `document-closed` | the document is no longer `in-progress` |
| `already-delegated` | the actor handed this pending decision away (§4) |
| `already-decided` | the actor's seat already decided in this tier |
| `out-of-order` | the actor holds a decision in a **later** tier, not the pending one |
| `not-a-decider` | the actor holds no decision in the pending tier or any later one |

Once a document is approved, rejected or escalated it is closed: decisions,
delegations and expiry events are all refused with `document-closed`.

## 3. Quorum pools

A quorum tier completes when **k distinct seats** have approved. One seat, one
approval: a member who already cast in that tier is told `already-decided`,
never counted again.

The tally a status snapshot reports as `have` counts **decided seats**, never
acts. An approval cast under a delegation fills the delegator's seat and
counts once, exactly like the member's own approval would; the snapshot's
`approvals` list records it as `{ seat, via, at }` with `seat` the delegator
and `via` whoever actually cast it.

## 4. Delegation

`delegate(doc, { from, to, at })` hands **one pending decision** — the one
`from` holds in the pending tier right now — to `to`. It never transfers a
future tier's decision, never more than that one decision, and never a
decision that was already cast. A delegated decision may not be delegated
onwards; there is nothing to pass.

| reason | when |
|---|---|
| `nothing-to-delegate` | `from` holds no pending decision in the pending tier |
| `already-delegated` | `from` already handed this decision away |
| `delegate-has-seat` | `to` already holds a decision in this tier — their own seat, or someone else's delegation |

From the moment the delegation lands, the delegator's own `decide` is refused
with `already-delegated`; only the delegate may cast it. The delegate's
decision is recorded against the delegator's seat, with the delegate noted as
`via` — veto included.

A delegation lapses the moment its decision is cast, and the moment its tier
stops being pending for any other reason — completion, escalation, or a
restart that resets the tier. A lapsed delegation transfers nothing; the seat
behaves exactly as if the delegation had never happened.

## 5. Deadlines and escalation

Every tier carries an absolute `deadline`. A deadline is not a wall the
service checks on every call: time acts only through **expiry events**, and an
expiry event happens only when `expire(doc, { at })` is called. A decision
cast after a deadline but before any expiry event covering it is still a
decision.

An expiry event is due **strictly after** the deadline instant. At the
deadline itself the tier is still actionable, and `expire` at exactly that
instant changes nothing:

```
expire(doc, { at: tier.deadline })        // -> { ok: true, escalated: false }
expire(doc, { at: one second later })     // -> { ok: true, escalated: true, ... }
```

Only the pending tier is exposed to expiry. When its event is due, the tier
is recorded as **escalated** and the decision moves up: the next waiting tier
becomes pending and decides in the expired tier's place. The escalated tier
keeps whatever approvals it had gathered — they stay on the record.

When the **final** tier escalates there is nowhere left for the decision to
go: the document itself becomes **escalated** — undecided, not approved.

## 6. Veto

A veto is never local. Any single veto from anyone holding a pending decision
in the pending tier — a member's own seat or a delegated one — **rejects the
whole document on the spot**: the document becomes `rejected`, the tier the
veto landed on becomes `rejected` with the veto recorded as
`{ actor, via, at }` (the seat, plus who cast it), and every later call that
would change the document is refused with `document-closed`. A veto needs no
quorum and no second. Tiers that already approved keep their recorded
approvals; the tally the vetoed tier had gathered stays on the record too.

## 7. Restart after rejection

`restart(doc, { at })` sends a rejected document round again. Anything else is
refused with `not-rejected` — a document that is in progress, approved or
escalated cannot be restarted.

A restart **resets only the steps that have no recorded outcome**: the tier
the rejection stopped and the tiers that never started are made fresh —
tallies cleared, vetoes lifted from the tier record, delegations lapsed.
Tiers that **approved** keep their recorded approvals exactly as they stand,
and tiers that **escalated** stay escalated; they are decided business and
are not asked again. The chain resumes at the first tier with no recorded
outcome, the document is `in-progress` again, and the history keeps the old
veto and the restart itself.

## 8. Status

`status(doc)` returns a plain snapshot (or `null` for an unknown id):

```js
{
  id, flow, state, submittedAt,
  current,        // the pending tier's id, or null when none is pending
  tiers: [
    // single: { id, kind: 'single', state, approver, decision, veto }
    // quorum: { id, kind: 'quorum', state, members, needed, have, approvals, veto }
  ],
  delegations,    // the active ones: [{ tier, from, to, at }]
  history,        // [{ at, kind, tier, actor, note }]
}
```

A tier's state is `waiting`, `pending`, `approved`, `escalated` or `rejected`.
History kinds are `submitted`, `approval`, `veto`, `delegated`, `escalated`
and `restart`, oldest first.
