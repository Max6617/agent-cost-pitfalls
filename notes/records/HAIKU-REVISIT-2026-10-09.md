# HAIKU REVISIT — the parked re-run, decided by the condition that was set for it

**Verdict: leave it parked.** The condition set in `notes/handovers/HANDOVER-2026-10-09.md` section 4.1 was "if
haiku's 18 paired tasks (vs 40 for every other provider) or its wide CI is what limits a headline
claim, then pay for it. Otherwise leave it." Neither limits one, and the arithmetic below says the
$183 re-run cannot buy the conclusion it would be bought for.

Computed this session from the six-provider tasks-b panel; reproduce with
`node results/_scratch/haiku-revisit.mjs`.

## 1. haiku is not in the headline claim at all

`tasks-b/PLAN.md` section 2 declares the tasks-b design as the four cheap providers and says
**"No Anthropic."** The pre-registered verdict (R1/R2, see `notes/records/REPLICATION-VERDICT-2026-10-09.md`) is a
claim about those four. haiku was collected afterwards as an extension, and
`tools/replication-verdict.mjs` excludes it by construction. So haiku's 18 paired tasks cannot limit
the replication verdict: it does not appear in it.

## 2. Its CI is wide mostly because its effect spread is wide, not because it has 18 tasks

Per-task differences of billed cost, `dsh:ptc − dsh:native`:

| model | paired tasks | mean $ | sd $ | observed 95% CI | tasks needed for the CI to exclude 0 |
|---|---|---|---|---|---|
| DeepSeek V4.1 Flash | 40 | −0.005611 | 0.011884 | [−0.0099, −0.0024] | 18 |
| GLM-5.3-Flash | 40 | −0.002544 | 0.008692 | [−0.0054, +0.0000] | 45 |
| Qwen3.8-Flash | 40 | +0.002560 | 0.013811 | [−0.0017, +0.0068] | 112 |
| **Claude Haiku 4.5** | **18** | **+0.017698** | **0.085829** | **[−0.0200, +0.0558]** | **91** |
| Claude Sonnet 5.5 | 40 | −0.000719 | 0.031104 | [−0.0109, +0.0081] | 7183 |
| gpt-6-luna | 40 | −0.002256 | 0.003511 | [−0.0033, −0.0012] | 10 |

haiku carries the **largest per-task spread of the six providers** — sd $0.0858, seven times
DeepSeek's and 2.8 times Sonnet's, which has the same ratio 5.00 and the same 40 tasks. Its input
tokens are expensive (miss $1.00/M), so a task that happens to run long costs several times what a
short one does, and that variance lands in the per-task differences.

## 3. What the full 40 paired tasks would actually buy

- **Tasks needed for the observed mean to reach significance at the observed spread: 91.** The design
  gives 40. Restoring 353 → 800 cells cannot reach 91.
- **Expected CI at 40 paired tasks** (normal scaling, α = 0.05): **[−$0.0089, +$0.0443]** — still
  contains 0, so haiku would still classify **null**.
- **Simulated power at 40 paired tasks: 29%.** 2000 replicates, each drawing 40 tasks with
  replacement from the observed 18 per-task differences, bootstrap CI per replicate. Roughly a
  3-in-10 chance of a significant result — and the sign would be *positive* (PTC more expensive),
  which would make haiku the only positive cost differential anywhere in tasks-b.

So the honest framing of the purchase is **not** "fill in the missing cells". Nothing is missing — see
section 3a. It is "spend $183, of which the last $125.63 of credit is more than the balance, on a 29%
chance of a single positive row that the pre-registered verdict does not consult". That is a bet on a
side-result, not the repair of a headline.

## 3a. What the 447 runs actually are (verified this session, correcting an earlier misreading)

An earlier note in this session called haiku's matrix incomplete, with 447 cells missing. That was
wrong, and the correction matters because it changes what the $183 buys:

| | value |
|---|---|
| `results/batchb-haiku-full/runs.jsonl` | **800 records over 800 distinct cells**, 0 absent, 0 retried, 0 surplus, every one of the 10 arms at exactly 80 |
| records carrying an `error` field | **0** (`unresolvedFailures` = 0) |
| rule-9 exclusions, per the analysis meta | **447** = 312 text-clause + 135 status-clause |
| cells CARRIED into the analysis | **353** |
| solved, counting every record | 206 of 800 = **25.8%** |
| solved, over the carried population | 206 of 353 = **58.4%** (the handover's 57.9% uses 356 rows) |

The matrix is structurally **complete**. The 447 runs did reach the gateway; every request they made
was refused (the monthly account limit), so under rule 9 they are infrastructure exclusions, counted
and reported rather than analysed. Paying for the re-run therefore buys 447 measurements where there
are currently 447 exclusions — it converts excluded runs into data. It does not fill holes.

Two consequences worth carrying forward:

- The handover's "447 dead runs are already excluded correctly as `all-requests-failed`" is right
  about the effect and imprecise about the clause: 312 of the 447 are excluded by rule 9's **text**
  half (their own output names the rate limit or a rejected field), and 135 by the **status** half
  (134 every-request-failed + 1 with no requests). The collector's verify stage must therefore learn
  the whole of rule 9, not just the status half, or it keeps disagreeing with the analysis on 312
  runs.
- A sign-off for this matrix must not print the bare record-level solve rate. "800/800 cells, 206
  cells solved (25.8%)" is the same matrix the paper reports at 58.4% of carried cells, and putting
  25.8% into the sign-off record would be worse than leaving the matrix unsigned.

## 4. What would change this answer

The condition is about limits on a headline claim, and it is evaluated, not permanent:

- **If the paper wants a positive cost differential from tasks-b at all.** The pre-registered four
  contain none: two negative, two null. haiku's +6.2% is the only positive-leaning row in the whole
  suite. If that absence becomes something the write-up has to explain rather than report, the 29%
  is the price of trying — and it is more likely than not to leave haiku null as well.
- **If haiku's row is quoted as evidence about ratio 5.00.** Sonnet (same ratio, 40 tasks) is null
  too, so the ratio-5.00 cell of the A3 story does not rest on haiku alone.
- **If the account limit is raised for another reason** and the marginal cost of the re-run falls
  below the value of a narrower interval, the decision changes on cost rather than on science.

## 5. The other half of open item 2

The parked re-run is only half of what happened to haiku. The other half — that the collector's verify
stage refused a matrix the analysis accepts, because the verify stage's zero-cost check knew only the
run record's own error text and not rule 9's gateway-status half — is a code defect, not a spending
decision, and is fixed separately.
