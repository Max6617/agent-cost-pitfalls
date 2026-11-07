# multi-file-subscription-proration

stratum: multi-file

Subscription billing: plans, proration, credits, tax and invoices for a small
SaaS product. All dates are caller-supplied; money is integer cents; the
contract is `fixture/docs/billing-rules.md`.

## sub-problems

| file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-proration-rounding` | prorated amounts are exact cents, rounded half-up on the exact value | `src/proration.js` scales in dollars through `toFixed(2)`, so `29.99 × 15/30 = 14.995` lands below the tie in binary and rounds to 1499 instead of 1500 |
| `02-day-count` | remaining days count the effective day and the last day of the period | `src/dates.js` `daysRemaining` is a bare day difference, one short everywhere |
| `03-plan-changes` | upgrades are immediate; downgrades take effect at the next period start | `src/billing.js` applies a downgrade immediately instead of recording a pending change |
| `04-tax-and-credits` | tax is on the post-credit amount | `src/invoices.js` computes tax on the pre-credit charge |
| `05-combined-changes` | plan+seat change is one line, rounded once; credit applies once per invoice, never overdrawing | `src/invoices.js` applies the balance per line against the original balance (double spend on two-line invoices); `src/billing.js` builds two separately rounded lines instead of one |
| `06-trial-conversion` | conversion bills the full period with no proration; credit/tax rules apply as to any charge | no bug here — the trial rules are correct as shipped; the cases guard them and probe the credit/tax interaction in the conversion path |

Bugs live in 4 modules: `dates.js`, `proration.js`, `invoices.js` (two),
`billing.js` (two, one shared with the combined-change sub-problem).

## guards (the 4 cases that pass on the untouched fixture)

- `01` *even splits, full periods and empty remainders come out whole*
- `02` *a period is counted inclusively at both ends, leap years included*
- `04` *with no credit balance the tax is on the full charge*
- `06` *conversion charges the full period and starts a fresh one on the conversion date*

## interactions

8 of the 21 cases exercise two sub-problems at once, or behaviour the visible
suite never touches: the exact-cents upgrade invoice (`03`), a seat change
priced while a downgrade is pending (`03`), a fully credit-covered upgrade
(`04`), the single-line combined change with credit (`05` ×2 assertions),
rounding once on the combined difference (`05`), the prorated seat-reduction
credit (`05`, visible never touches reductions), the overdraw guard (`05`),
and trial conversion with a credit balance (`06` ×2).

## measured

- untouched fixture: **4/21 = 19%** hidden (the 4 guards), visible 1/9 pass (exit 1)
- reference: **21/21 = 100%** hidden, visible 9/9 pass
- fixture: 16 text files, 627 lines; reference changes 4 files
  (`src/billing.js`, `src/dates.js`, `src/invoices.js`, `src/proration.js`)
- gate: `node tasks-b/_tools/verify-task.mjs multi-file-subscription-proration` → `ok`
- `node tools/validate-tasks.mjs --dir tasks-b` → PASS for this task
