# multi-file-approval-workflow

stratum: multi-file

A document-approval service: ordered sign-off chains where a tier is one
named approver or a quorum pool (k of n), delegation of a single pending
decision, injected-time expiry events that escalate to the next tier, a veto
that rejects the whole document, and a restart after rejection that resets
only the steps with no recorded outcome. Time is an injected `at` parameter
everywhere; nothing reads a clock.

## sub-problems

| hidden file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-chain-order` | ordered chain, out-of-order refusals | none - correct in the fixture (holds two guards) |
| `02-quorum` | k of n distinct seats; a delegated approval counts once | `quorum.js` `castApproval` bumps `tally` twice for a delegated vote (`if (via !== seat) tier.tally += 1`), so one stand-in approval fills two seats |
| `03-delegation` | one pending decision, lapsed with its step | none in `delegation.js` itself - its cases fail through the quorum, veto and restart bugs it interacts with |
| `04-escalation` | expiry event exists strictly after the deadline | `escalation.js` `isDue` uses `at >= deadline`, firing at the deadline instant itself |
| `05-veto` | a veto rejects the whole document on the spot | `chains.js` `applyVeto` records the veto on the tier but never rejects the document, so the chain keeps moving and can still approve |
| `06-restart` | restart resets only steps with no recorded outcome | `service.js` `restart` resets every tier to waiting and rewinds to tier 0, wiping recorded approvals and escalations |

Bugs live in four modules (`quorum.js`, `escalation.js`, `chains.js`,
`service.js`); every module's JSDoc states the correct intent, so the doc-
vs-code drift has to be spotted against `docs/approval-rules.md`. Note the
restart file depends on the veto fix by construction: a document can only be
restarted once a veto actually rejects it.

## guards (pass on the untouched fixture)

- `the chain advances one tier at a time and closes once complete` (01)
- `a decision aimed at a later tier is out of order, a stranger is not a decider` (01)
- `the delegator gives the decision up; the delegate casts it against the seat` (03)
- `only a rejected document can be restarted` (06)

## interaction cases (13 of 21)

- `01`: the chain runs to approved through a quorum tier with a delegated seat
- `02`: all four cases cross quorum with delegation; the fourth adds a veto
- `03`: restart hands a delegated seat back; delegations refused on a closed
  document; a delegation lives until the expiry event, not the deadline
- `04`: an expired quorum tier escalates with a delegated approval on record;
  final-tier expiry vs a decision after the deadline but before the event
- `05`: veto mid-chain keeps earlier approvals and the stopped tally
- `06`: restart leaves escalated steps standing; a delegated veto is recorded
  and the restart hands the seat back

## measured

- untouched fixture: **4/21 hidden cases (19%)** - exactly the four guards;
  visible suite 6/10 pass, exit 1 (4 reproductions fail)
- reference: **21/21 hidden cases (100%)**; visible suite 10/10 pass, exit 0
- reference changes 4 files: `src/{quorum,escalation,chains,service}.js`
- fixture shape: 14 text files, 794 lines

Visible-suite calibration: the visible suite carries the easiest case of each
bug (delegated vote counts once, deadline boundary, veto closes, restart keeps
approvals); greening only it leaves the attribution, full-k, lapse-on-reset,
escalated-record and final-tier cases behind.
