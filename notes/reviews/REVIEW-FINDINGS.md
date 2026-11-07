# HARD REVIEW — the paper-bound documentation

**Reviewer:** external pass. Nothing in this repo was modified except this file.
**Snapshot:** working tree at commit `8140e27` ("F15/F16: the hard batch discriminates…"), **dirty**
(40+ modified/deleted paths), and `results/*.jsonl` was being appended **while this review was written**
(see §H). Line numbers are as of **2026-09-30T17:30Z**.

**Scope:** the documents a paper would be built from — `PRE-REGISTRATION.md`, `METHODS.md`, `PAPER.md`,
`notes/records/FINDINGS.md`, `notes/records/FIRST-RESULTS.md`, `notes/records/TEST-PROTOCOL.md`, `notes/records/EXECUTION.md`, `README.md`, `notes/records/GUIDE.md`,
`notes/records/TASKS.md`, `notes/records/CROSS-HARNESS.md`, `notes/records/DECISION-LAYER.md`, `notes/literature/RESEARCH.md`, `RELATED-WORK*.md`,
`router/README.md`, `conditions/*`, `tools/*` — plus the raw artifacts they cite
(`data/milestone-1..4/`, `results/**/runs.jsonl`, `results/gateway.jsonl`, `results/manifest.json`,
`_ev/deepseek-pricing.html`).

**Method:** read every document; re-derived every checkable number from the archived JSONL by joining run
records to gateway rows on `runId` / `syntheticKey`; cross-checked claims against `git log`/`git diff`;
read the analysis and gateway code against the pre-registration. A second pass covered the peripheral docs
and the tooling; **every item below was re-verified by me** before it went in.
**Not done:** I did not execute any project script (no `scripts/harness.ps1`, no `tools/*.mjs`, no test suite, no model
runs). Items that need execution are listed in §H.

**Severity.** FATAL = would sink the paper or void the pre-registration as filed · MAJOR = a referee will
find it and it changes a number or a claim · MINOR = visible sloppiness.

---

## 0. Verdict

The instrument is good: the gateway, synthetic-key attribution, the retraction register, the "an
infrastructure error is not a result" rule. The **documents are not yet in a state a paper can be cut
from**, and the problems are structural, not cosmetic. In descending order of danger:

1. **The price card is not the provider's price card, and fixing it may invert the mechanism.** Every
   dollar figure, and H1's premise, is computed from rates that contradict the repo's own capture of the
   provider's pricing page. (§B0)
2. **The pre-registration is not a pre-registration as filed** — it names a freeze commit that does not
   contain its text, it was rewritten after Phase 2 collection began, §12 is empty, and two of its factual
   premises are false in the working tree. (§A)
3. **The analysis tool does not implement the pre-registered analysis**, and its exact test is
   **degenerate at exactly the pre-registered n = 31**. (§D2)
4. **Headline numbers cannot be reproduced from the archive**, and the one that produces the "+1.1%"
   claim does not match the raw log. (§B)
5. **There is no design of record** — five documents specify five incompatible matrices. (§C)
6. **The conflict-of-interest statement contradicts itself** across three documents. (§E)
7. **The "hidden" test suite is inside the agent's working directory**, with no integrity check. (§D4)

---

## A. Pre-registration integrity — FATAL cluster

### A1. "Frozen at commit 060ca03" is false; the file postdates its own freeze point

`PRE-REGISTRATION.md:3-4`:

> **Version 2.0 — written before any Phase 2 data collection.**
> Frozen at commit `060ca03`.

Verified:

    git show 060ca03:PRE-REGISTRATION.md
      →  "# PRE-REGISTRATION — Phase 2
          **Version 1.0 — written before Phase 2 data collection.**
          Frozen at commit `3beb636`, tag `v2.1-prepared`. …"
    git diff --stat 060ca03 -- PRE-REGISTRATION.md      → 299 changed lines
    git log --date=iso -- PRE-REGISTRATION.md
      9c41fb0 | 2026-09-29 22:26:06 +0200 | RETRACTION: F14 was a billing artefact, not a result
      c486f69 | 2026-09-29 22:04:26 +0200 | pre-registration v3: it is a plan, not a results section, …
      701f2d4 | 2026-09-29 21:59:51 +0200 | pre-registration v2.1: the Phase 1 inventory was materially wrong
      0223007 | 2026-09-29 21:58:05 +0200 | pre-registration v2: formulas, numeric rules, six corrections
      2e623b5 | 2026-09-29 21:55:20 +0200 | pre-registration for Phase 2 …

The commit it claims as its freeze point contains a *different document* (v1.0, frozen at yet another
commit). The current text was written four commits later; the history calls it "v3" while the file calls
itself "Version 2.0". **Every revision has claimed a freeze commit that does not contain it.** This is the
one property a pre-registration cannot lose. Replace the commit reference with the **sha256 of the frozen
text**, and put the hash in the paper.

### A2. §12 is empty, but the file was edited after Phase 2 collection began

`PRE-REGISTRATION.md:36`: "*Phase 2, bound by this document:* all further runs."
`PRE-REGISTRATION.md:255`: "*§12 Amendments after Phase 2 begins* — (empty — no Phase 2 data has been
collected)".

* First Phase-2 run record: `results/ds-full-partial/runs.jsonl` first `ts` = **2026-09-29T20:03:00Z**
  (434 runs, 31 tasks, 7 arms, 174 solved).
* Pre-registration edits at **20:04:26Z** ("v3") and **20:26:06Z** (F14 retraction) are both **after** it,
  and neither is recorded in §12.

There is no reading in which an empty §12 is correct.

### A3. H2's "these arms have never been run" is false in the working tree

`PRE-REGISTRATION.md:108`:

> **Informed by Phase 1: NO.** These arms have never been run. This is the study's only genuinely blind
> prediction.

`PRE-REGISTRATION.md:22` also claims GLM-5.3-Flash "lacks the terseness arms". The archive:

| file | rows | arms | when |
|---|---|---|---|
| `results/glm-terse/runs.jsonl` | 48 → 56 during this review | `dsh:ptc-terse`, `dsh:native-terse` (glm-5.3-flash) | 2026-09-30T17:00–17:29Z |
| `results/ds-full/runs.jsonl` | 239 | includes `dsh:ptc-terse` (34), `dsh:native-terse` (34) | 2026-09-30T16:07–17:26Z |
| `results/pilot-anthropic/runs.jsonl` | 6 | both terse arms | 2026-09-30T16:55Z |

`conditions/arms.mjs:36-49` defines the arms and the `TERSE` prompt suffix. The document that was
supposed to make H2 blind is now the last place to learn that H2's data exists. Unless the exact pre-freeze
runs are enumerated and excluded, **H2 cannot be reported as a pre-registered confirmatory test**.

### A4. The Phase-1 inventory says Anthropic: none; Anthropic data exists

`PRE-REGISTRATION.md:24`: "| Qwen, Anthropic, OpenAI | — | — | — | none |".
`results/pilot-anthropic/runs.jsonl` (6 runs, `claude-haiku-4.5`, 6/6 solved) and
`results/haiku-hard-probe/runs.jsonl` (2 runs, 0 solved, passRate 0.40) exist. §12 is silent. The study
has quietly acquired a third provider, one that the analysis tool cannot even price correctly (§D3).

### A5. DeepSeek's credit exhaustion (≈258–260 of 434 runs) is absent from the claim register

`results/ds-full-partial/runs.jsonl`: 434 rows, **174 solved**. Commit `1b15fd6`: "DeepSeek ran out of
credit too - 258 of 434 runs are infrastructure, not results".

It appears in `notes/status/SESSION-STATE.md:11` and `notes/plans/RUN-PLAN.md:136` (session notes) but **not** in `notes/records/FINDINGS.md`,
which documents the analogous GLM-5.3 exhaustion in detail (F14, lines 254–290), and not in any milestone
README or in the pre-registration. `PRE-REGISTRATION.md:222` makes credit verification a precondition
("*Credit balance must be verified before a matrix starts*"). The rule was written, then broken, and the
only record is a git commit message. 60% of a 31-task matrix is infrastructure loss.

### A6. The pre-registered cost function and the reported cost numbers are different functions

`PRE-REGISTRATION.md:53-56`:

> **cost_billed** for a run = sum over its requests of
> `fresh x missRate + created x writeRate + hit x hitRate + output x outRate`
> **cost_cold** prices every input token at the miss rate …

Output is **in** cost_billed by definition. The gateway implements it (`data/milestone-1/gateway.jsonl` row 1:
140 input + 7 output → `cost.coldUsd 0.00002156` = 140×0.14/1e6 **+ 7×0.28/1e6**). The analysis tool does
**not**: `tools/analyze-results.mjs:54-55`

    coldUsd   += (inTok / 1e6) * pr.miss
    billedUsd += (Math.max(0, m) / 1e6) * pr.miss + (h / 1e6) * pr.hit     // no output term, no write rate

So `notes/records/FIRST-RESULTS.md:14-23` reports input-only costs:

| arm | FIRST-RESULTS cost_cold | input-only (recomputed) | gateway `cost.coldUsd` |
|---|---|---|---|
| `dsh:ptc` | $0.0087 | $0.008687 | $0.009399 |
| `dsh:native` | $0.0085 | $0.008530 | $0.009002 |
| `dsh:ptc-opt` | $0.0086 | $0.008614 | $0.009504 |
| `dsh:native-opt` | $0.0103 | $0.010270 | $0.010856 |
| `opencode` | $0.0071 | $0.007053 | $0.007271 |

Token counts, steps and hit rates in that table match the raw log exactly; only the cost column uses the
tool's function. **Under the pre-registered function the paper's one-line headline changes** (per-run means,
output included):

| arm | cost_billed (pre-reg function) |
|---|---|
| `opencode` | **$0.00251** |
| `dsh:ptc` | $0.00275 |
| `dsh:ptc-opt` | $0.00280 |
| `dsh:native` | $0.00309 |
| `dsh:native-opt` | $0.00361 |

`notes/records/FIRST-RESULTS.md:31-32`: "*Cheapest by `cost_billed`: DSH PTC ($0.0020). OpenCode drops to third.*"
Under the pre-registered formula OpenCode is **first on both metrics**, and Finding 1 — "the ranking
inverts depending on whether you count the cache" (line 27, "the whole paper in one line") — becomes
"OpenCode is cheapest either way". `PRE-REGISTRATION.md:58` also defines H1's predictor as
**S = (output × outRate) / cost_billed**; with an input-only denominator S is not the pre-registered
quantity.

### A7. The §7 "mandatory" DeepSeek completion is costed ~1.7–3× too low

`PRE-REGISTRATION.md:180-183`: 16 tasks, "160 runs, about **$1.10**". Measured DeepSeek per-run means
from the archive: `results/ds-full` $0.0110; the 21-task validation sweep $0.0102–$0.0216 depending on
subset. So 160 runs cost **$1.6–$3.5** before allowing for the newer, harder tasks. The step the
pre-registration calls "not droppable" is costed with the same extrapolation error `notes/records/FINDINGS.md:219` claims
to have learned from.

### A8. H3's factor level (24) contradicts every measurement in the repo

`PRE-REGISTRATION.md:116`: "`native_ij = 1 when the run used 24 tool schemas, 0 when it used 1`".
Counters: `METHODS.md:33` ("25 tools in this configuration"), `PAPER.md:29` ("25→1 (−96%)"),
`notes/records/EXECUTION.md:85`, `conditions/arms.mjs:18` ("`DSH_TOOLS_MODE=native` → **25 declared tools**"),
`notes/records/UPGRADE.md:73`, `notes/records/FIRST-RESULTS.md:51-53`. `notes/literature/RESEARCH.md:703` says "~21". `notes/records/FINDINGS.md:351` and
`notes/literature/RELATED-WORK.md:78` say 24. The study's causal factor is reported as 21, 24 and 25. (This also changes
"−96%": 25→1 is 96.0%, 24→1 is 95.8%.)

---

## B. Numbers vs the archive

### B0. The price card contradicts the provider's own page — FATAL

`METHODS.md:137-143` presents "the providers' published rates":

| model | miss | hit | output |
|---|---|---|---|
| deepseek-v4.1-flash | 0.14 | 0.028 | 0.28 |
| glm-5.3-flash | 0.15 | 0.03 | 0.50 |
| glm-5.3 | 1.40 | 0.26 | 4.40 |

The repo's own capture of the provider pricing page, `_ev/deepseek-pricing.html`, says:

> PRICING — 1M INPUT TOKENS (CACHE HIT) OFF-PEAK **$0.003** / PEAK $0.006 · 1M INPUT TOKENS (CACHE MISS)
> OFF-PEAK **$0.15** / PEAK $0.30 · 1M OUTPUT TOKENS OFF-PEAK **$0.60** / PEAK $1.20
> "(1) Use `deepseek-flash` as the model name. The legacy names `deepseek-v4-flash` … are still accepted,
> but the corresponding models have been retired, their requests are served by the **DeepSeek-V4.1-Flash**
> model and billed at the Flash price."
> "(2) Off-peak rates are half of the peak rates. Peak hours are 01:00–04:00 and 06:00–10:00 UTC,
> Monday through Friday …"

So the model the study ran (`deepseek-flash` = DeepSeek-V4.1-Flash) is **billed at exactly these rates**, and
the card in METHODS is wrong in every cell that matters:

* cache-hit price: **9.3× too high** off-peak (0.028 vs 0.003), and the "5× cache discount" that
  `notes/records/FINDINGS.md:296` and `METHODS.md` §5 depend on is really **50×** off-peak (0.15/0.003);
* output price: **2.1× too low** (0.28 vs 0.60);
* **output:input ratio = 0.60/0.15 = 4.0**, not the 2.0 the study uses. GLM-5.3-Flash's card gives
  0.50/0.15 = 3.33. The ordering that the mechanism rests on therefore **inverts**: DeepSeek's output is
  *relatively more expensive* than GLM's, which is the opposite of `notes/records/FINDINGS.md:131-133` ("GLM prices output
  at 3.33x input against DeepSeek's 2.0x"), `PRE-REGISTRATION.md:153` (ratio column) and the whole H1
  narrative.
* `notes/literature/RESEARCH.md:195-202` sources the card from a **third-party blog** (Apidog) and calls it a "~80% off"
  (5×) discount, while `notes/literature/RESEARCH.md:430` — citing the provider's own docs — says "cache hit ≈ **2–3% of
  miss** (off-peak: flash $0.003 vs $0.15 …)", i.e. 33–50×. Two incompatible cards sit in one file; the
  wrong one is the one encoded in the code and in every dollar figure.
* The correct card is also the one the gateway **does not** use: `tools/measure-gateway.mjs:167` `FALLBACK = { miss: 0.14, hit: 0.028, out: 0.28 }`, so every `cost.billedUsd` in the archive is
  computed with the blog card. My §B recomputations are in the study's own units and are internally
  consistent; **if the card is wrong, every absolute dollar figure in the paper moves**, and the
  ranking-reversal claim needs re-deriving on the true ratio. There is **no capture at all** in `_ev/` for
  the GLM (z.ai) card, so the second provider's rates — the ones that decide the headline — are uncited.
* Peak/off-peak is a **2× uncontrolled variable**. The provider halves rates outside 01:00–04:00 and
  06:00–10:00 UTC Mon–Fri. `METHODS.md:159-161` randomises arm order and dismisses concurrency, but no
  document records, fixes or stratifies time of day. (Most current runs happen to fall off-peak; that is
  luck, not design, and it is not recorded.)

**This is the single most consequential finding in this review.** Fix the card, then re-derive everything.

### B1. F3's GLM column is exact — except the one number that creates the claim

`notes/records/FINDINGS.md:92-102` ("Final numbers, 30 tasks, both providers measured on the same suite"):

| arm | F3 published | archived (`data/milestone-4/gateway.jsonl`, 62 runs/arm, 31 tasks) | match |
|---|---|---|---|
| `opencode` | $0.00643 | $0.00643 | yes |
| `dsh:ptc` | $0.00839 | $0.00839 | yes |
| `dsh:ptc-opt` | $0.00815 | $0.00815 | yes |
| `dsh:native-opt` | $0.00878 | $0.00878 | yes |
| `dsh:native` | **$0.00830** | **$0.00838** | **no** |

F3 line 102 and `data/milestone-4/README.txt` both say "native cheaper by **1.1%**". With the archived value
the gap is **0.12%** — a tie (both round to $0.0084). Four of five values are exact, so this is a single
transcription/derivation error sitting exactly where the claim's magnitude comes from. I tested all 31
leave-one-task-out subsets; none yields $0.00830 without breaking the other arms. The qualitative claim
("large on one provider, absent on the other") survives; the number does not.

### B2. F3's DeepSeek column matches no archived dataset

F3 claims `opencode` $0.00304, `ptc` $0.01178, `ptc-opt` $0.01310, `native-opt` $0.01299,
`native` $0.01526 on "30 tasks". Every DeepSeek dataset in the tree, recomputed:

| dataset | tasks | arms | `opencode` | `ptc` | `native` |
|---|---|---|---|---|---|
| `results/ds-full` | 18 | 7 | $0.00745 | $0.01076 | $0.01200 |
| `results/check-*` (validation sweep) | 21 | 5 (+terse) | $0.01679 | $0.02093 | $0.02576 |
| `data/milestone-3` (`example-fix` only) | 1 | 5 | **$0.00304** | $0.00395 | $0.00537 |
| `results/ds-full-partial` | 31 | 7 | n/a (59% infra) | n/a | n/a |

The only archived computation reproducing **$0.00304** is the **single trivial task** `example-fix`. F3 labels
it "30 tasks" on DeepSeek — a corpus that does not exist: `PRE-REGISTRATION.md:21` and
`notes/status/SESSION-STATE.md:105` both say DeepSeek has 15 of 31 tasks, and the 31-task DeepSeek matrix is the
credit-exhausted one. Publish the run-id list behind every number or this column is unsourced.

### B3. F16's "~14x" hard-task multiplier is baseline-dependent; the archive says ~6.6–7.2×

`notes/records/FINDINGS.md:205-209`: "lh-ledger-replay averages **$0.073 per run** … against **$0.005** for batch 1. …
The real figure is ~14x."

| batch-1 baseline used | value | multiplier vs $0.07276 |
|---|---|---|
| 17 non-hard validation tasks, 5 core arms | $0.01015 | **7.2×** |
| ds-full, 18 tasks, 5 core arms | $0.01101 | **6.6×** |
| the single trivial task `example-fix` (ms-3, 5 arms) | $0.00422 | 17.2× |

**No archived batch-1 mean is $0.005.** $0.005 is in the range of the *single-task* milestone sets, i.e. the
14× compares a 7-arm hard-task mean against one trivial task — the "single-task replication is not
replication" error the project already retracted as F4. F16's budget table ($21 / $33 / $20 / $200) is that
multiplier applied to the old 1.8× budgets, so it is ~2.3× overstated if the honest baseline is the batch-1
suite mean. The table also uses "6 arms" while F15 measured **7**.

### B4. "Understated by extrapolating" is backwards for GLM-5.3

`notes/records/FINDINGS.md:219-220`: "*the third cost estimate in this project understated by extrapolating … after
GLM-5.3 missed by 42%*"; `notes/records/FINDINGS.md:250`: "Cost projection missed by 42% (**$7.59 against $5.35**)".
$7.59 > $5.35 — the projection was **overstated**. The sentence uses a wrong-direction failure as evidence
for a right-direction one.

### B5. F3 contradicts itself on "reversal" and carries two conflicting result tables

* `notes/records/FINDINGS.md:104-106`: "*State it as 'does not transfer', **not** 'reverses' … Claiming a reversal would
  be overreading a null.*"
* `notes/records/FINDINGS.md:121`: "**Effect:** the PTC cost advantage present on DeepSeek **reverses** on GLM."
* `notes/records/FINDINGS.md:122-126` prints a **different** GLM table ($0.00457 / $0.00477, "n=1 task, 1 seed",
  line 128) from the "Final numbers" table at line 94 ($0.00830 / $0.00839, n≈62) — same contrast, 1.8×
  apart, and the stronger-sounding one is the n=1 one.
* `notes/records/FINDINGS.md:108`: "`opencode` is cheapest on BOTH providers (22% below the best DSH arm on GLM, **74%
  below `dsh:native` on DeepSeek**)". From its own table: (0.01526−0.00304)/0.01526 = **80%**; against F2's
  `opencode` $0.00822 it is 46%. 74% is not derivable from either.
* `notes/prompts/RELATED-WORK-PROMPT.md:21-24` propagates the retracted framing ("**reverses** … and 5% **more
  expensive**"), and `notes/literature/RELATED-WORK.md:473` still promises "a ranking **reversal** between two providers".

### B6. The retracted F14 claim is still asserted, 25 lines below its own retraction

`notes/records/FINDINGS.md:254-268` retracts "a stronger model is worse on some tasks" and states "There is **no
evidence** that a stronger model underperforms a weaker one anywhere in this study". `notes/records/FINDINGS.md:279-287`
then asserts the same claim ("`single-step-retry-after` failed in **all five arms** — the model cannot solve
it, though Flash could … A task the weaker model solves and the stronger one does not is a genuine quality
signal"). Delete lines 279–287 or mark them retracted in place. This block is also the likely source of the
"reverses / 5% more expensive" text that leaked into `notes/prompts/RELATED-WORK-PROMPT.md`.

### B7. F7's arithmetic disagrees with F7's table

* `notes/records/FINDINGS.md:228-232`: table shows `dsh:native` $0.00838 vs `dsh:ptc` $0.00839 (+0.12%), annotated
  "**+1.1% (a wash)**". The +1.1% belongs to the other dataset (line 102).
* `notes/records/FINDINGS.md:238`: "1.4-2.3x more output per step" — the table below (lines 242–244) gives
  **1.54 / 1.63 / 2.32**.
* `notes/records/FINDINGS.md:246`: "PTC arms are consistently the most verbose (**782 and 775** against 546 and 564)" —
  the table has 782 and **785** (`opencode`), and no 564. As written, `opencode` is more verbose than
  `dsh:ptc`.

### B8. F2's and F3's headline numbers use different denominators, unstated

`notes/records/FINDINGS.md:76-84` (F2, "150 observations, 15 tasks") gives `opencode` $0.00822 and `dsh:native`
$0.01526; `notes/records/FINDINGS.md:94-100` (F3, "30 tasks") gives `opencode` $0.00304 and `dsh:native` $0.01526.
The same arm differs by **2.7×** across two sections of one file, and one value is byte-identical to the
single-task dataset. Neither section states its subset. **Publish (a) the cost function and (b) the run-id
list or exact filter for every number in `notes/records/FINDINGS.md` and `notes/records/FIRST-RESULTS.md`.**

### B9. Corpus-study counts disagree across four documents

| claim | where |
|---|---|
| 357 sessions, 26M+ tokens | `PAPER.md:28`, `notes/status/RESUME.md:9` |
| 356 sessions / 356 local sessions / 356 existing session logs / 356 session logs | `notes/records/EXECUTION.md:64`, `notes/records/GUIDE.md:241`, `notes/records/TEST-PROTOCOL.md:40,230,236`, `notes/literature/RESEARCH.md:688` |
| 328 **native** sessions, 20.5M of 27.0M tokens | `notes/records/EXECUTION.md:220` |

"27M tokens of tool output" vs "26M+ tokens" is the same audit. `notes/literature/RESEARCH.md:733-735` itself warns the
figures are "CJK-aware character estimates — sound for ranking and share, **not for billing**", yet
`PAPER.md:28-30` rates C1–C3 "solid, novel" and the abstract uses them to argue cost. The two
instruments (character estimates, provider billing) are never reconciled.

### B10. The task suite is 30 and 31 tasks at the same time

* `METHODS.md:60`: "**30 tasks**", strata 7/7/6/5/5 = 30 — the stratification silently omits
  `example-fix`, the task every milestone dataset was collected on.
* `tasks/` has **31** directories; `results/manifest.json` → `suite.tasks = 31` with 31 per-task
  hashes; `PRE-REGISTRATION.md:163` says "**31 batch-1 tasks**"; `data/milestone-4/README.txt` is titled
  "full **30-task** suite" but reports "**31 tasks** × 5 arms × 2 seeds = 310 runs".
* `notes/records/TASKS.md:69-73` prescribes a third stratification (6/8/6/6/6 = 32) while `notes/records/TASKS.md:5` still says
  "Right now there is one: `tasks/example-fix/`".

### B11. F8's cache-discount arithmetic

`notes/records/FINDINGS.md:296-298`: "MiMo prices the cache hit at ¥0.02–0.025 against ¥1.00–3.00 miss — a **50–120x**
discount". The stated ranges give 40×–150×. `README.md` repeats 50–120×. (And "5x for the current
providers" is wrong too — see §B0: it is 50× off-peak for DeepSeek.)

### B12. F12's "408 runs" and step counts are not reproducible

`notes/records/FINDINGS.md:346-355` gives DeepSeek steps `dsh:ptc` 10.8 / `dsh:native` 14.5 "across 408 runs".
Recomputed: `dsh:ptc` 9.9 / `dsh:native` 13.1 (whole DeepSeek corpus), 10.3 / 13.1 (`ds-full`). The
documented matrices are 150 + 310 = 460 runs; 408 matches neither.

### B13. Anthropic costs in the gateway log are understated ~7.4×

`tools/measure-gateway.mjs:85-88` rewrites `claude-haiku-4.5` → `claude-haiku-4-5` on the wire and
`:605` records `parsedReq?.model ?? forceModel` — the **aliased** name — while the price table
(`:162`) and the analysis (`tools/analyze-results.mjs:22-26`) know only the dotted name, so
`priceFor` returns the DeepSeek `FALLBACK`. The comment at `:283-286` claims the opposite
("*logs, cost attribution and analysis all continue to use the canonical name*").

Measured on `results/anthropic-gateway.jsonl` (487 rows; model field: 84 dotted, 403 aliased):

* logged total **$1.3814**, same usage at the published Haiku card (miss 1.00 / hit 0.10 / write 1.25 /
  out 5.00) = **$10.2707** → **7.43× understated**;
* the six pilot runs: logged **$0.0638** (this is the "$0.0637" in `notes/plans/RUN-PLAN.md:129`) vs **$0.4807** →
  **7.53×**.

Any budget decision taken from these numbers is wrong by ~7.5× — e.g. the grid priced at "~$167" is ~$1,260,
about **4× over the $300 cap** in `PRE-REGISTRATION.md:185`. `analyze-results.mjs` has the same class of
bug for GLM: `PRICES` (`:22-25`) contains only the two DeepSeek entries, so every GLM arm is priced at
DeepSeek Flash rates (~10× low on the published GLM-5.3 card).

---

## C. There is no design of record — FATAL

| document | arms/conditions | tasks | seeds | runs | primary metric | policy factor |
|---|---|---|---|---|---|---|
| `notes/records/TEST-PROTOCOL.md:46-57,174-180` | 4 (+research) | 12 | **k=5** | 240 | **`cost_cold` per solved task**, paired Wilcoxon | **a factor** (RQ2) |
| `PRE-REGISTRATION.md:149-169` | 5 arms, 2×provider cells | **31** | **2** | 310+ | **`cost_billed` regression on output share** (H1) | **not a factor** ("unresolvable") |
| `METHODS.md:60,170,186` | **7** ("21 pairwise contrasts") | **30** | 2 | — | LMM, task random intercept | exploratory |
| `PAPER.md:78` | 4 | 15 | **5** | **300** | cost per solved task | a factor |
| `notes/records/GUIDE.md:234` | **6** | ~15 | **5** | 450 | — | — |
| `notes/plans/PENDING-RUNS.md:23` | 5 | 10–15 | 2 | — | — | — |
| `notes/records/CROSS-HARNESS.md:28` | 6 | — | — | — | cost per solved task | — |

Consequences:

* **C1.** `PRE-REGISTRATION.md:176-179` ("Fixed sample, no optional stopping. No peeking") binds a
  31-task, 2-seed matrix while `notes/records/TEST-PROTOCOL.md` and `PAPER.md` plan 5 seeds on 12–15 tasks, and the
  working tree holds a *partial* 434-run matrix. "No optional stopping" is not currently a true statement
  about this study.
* **C2.** The primary metric differs in each document: `cost_cold` (TEST-PROTOCOL), `cost_billed`
  (pre-registration), and `METHODS.md:132-135` says reporting one alone "is a methodological error".
  H4 ("cache hit rate does not predict per-arm cost") only means something on one of them.
* **C3.** Failure accounting is contradictory: `notes/records/TEST-PROTOCOL.md:164` "intention-to-treat: aborted =
  unsolved, counted" vs `PRE-REGISTRATION.md:213-225` (infrastructure failures **excluded**) vs
  `notes/records/TEST-PROTOCOL.md:115-118` (failures in the numerator of cost-per-solved-task). Three rules, one
  dataset with 174/434 solved.
* **C4.** Multiplicity: `notes/records/TEST-PROTOCOL.md:180` ("Two comparisons") vs `PRE-REGISTRATION.md:172-174`
  (H1/H2 uncorrected, Holm for the rest) vs `METHODS.md:170` (Holm across 21 contrasts).
* **C5.** `PAPER.md` never mentions the pre-registration; C1–C6 do not map to H1–H5; and its evidence
  table (lines 26–33: C5, C6 "not run — zero data", line 33 "the gateway never hit the real API") is
  contradicted by ~1,333 gateway-observed runs and four milestone datasets. `PAPER.md:128` still says
  everything is blocked on a router session; `PAPER.md:132` still says the dashboard is "the one number no
  local tool can see".
* **C6.** Labels collide: "H2" is the terseness ablation in the pre-registration and the router hypothesis in
  `notes/records/GUIDE.md:133`; "F15" is the hard-task batch in `notes/records/FINDINGS.md:174` but the terseness ablation in
  `conditions/arms.mjs:25,45`; "C1–C4" mean different claims in `notes/literature/RELATED-WORK.md:3` and `PAPER.md:28-33`
  (PAPER's C6 — "cache hit rates … predict cost better than model choice" — is the **opposite** of F2/F4).

**Do this:** designate `PRE-REGISTRATION.md` the design of record (it is the only document with decision
rules), rewrite `notes/records/TEST-PROTOCOL.md` and `PAPER.md` to reference it, delete the competing sample sizes.

---

## D. Method, code and procedure vs the documents — MAJOR/FATAL

### D1. The analysis tool does not implement the pre-registered analysis

`tools/analyze-results.mjs`:

| line | code | contradicts |
|---|---|---|
| 55 | `billedUsd += miss×miss + hit×hit` — no output, no write rate | `PRE-REGISTRATION.md:53-55` (see §A6) |
| 22-26 | `PRICES` = deepseek-flash, deepseek-pro; `priceFor` falls back to DeepSeek Flash | every GLM/Haiku number (§B13) |
| 81-82 | cost/solved divides **solved runs' cost only** by solved count | `notes/records/TEST-PROTOCOL.md:116-118` ("Failures count in the numerator") |
| 137 | per-task difference uses the **median** | `PRE-REGISTRATION.md:50-51` ("Per-run values are **averaged** … medians are a sensitivity check") |
| 114-127 | `bootstrapCI` resamples the **median** | `PRE-REGISTRATION.md:101-102` (H2 requires a CI for **mean(d)**) |
| 107 | `for (let mask = 0; mask < (1 << n); mask++)` | see below |

**The exact Wilcoxon test is degenerate at the pre-registered n.** `1 << 31` is `-2147483648` in
JavaScript's 32-bit bitwise arithmetic, so the loop body never executes, `count = 0`, and
`p = 0 / (1 << 31) = -0` — printed as `p = 0.0000`, i.e. **always "significant"**. The
pre-registered primary cell is **31 task blocks** (`PRE-REGISTRATION.md:163-166`). At n = 32 the same
expression yields `1` and p = 1. This is not a rounding issue: the study's headline test, at the
planned sample size, cannot return anything but significance in one direction. Fix with a rank-sum normal
approximation or an exact DP over subsets.

### D2. The documented way to select a condition does not work

`notes/records/TEST-PROTOCOL.md:251` (status table): "preset selection without a GUI — **confirmed viable** —
`--patch conditions/<c>.yml` sets `agent-presets.default`", with the example at lines 210–215
(`# conditions/ptc-opt.yml`) and the invocation at 218. `conditions/arms.mjs:4-14` was written later and says
the opposite:

> Written after discovering that **PRESETS DO NOT WORK IN A HEADLESS PROFILE**. … the obvious patch
> `- id: agent-presets / config: { default: ptc-opt }` warns "patch: entry agent-presets not found" and
> is skipped. … Presets are a web-surface abstraction.

There is no `conditions/ptc-opt.yml` (`conditions/` holds `shipped.yml`, `optimized.yml`, `arms.mjs`,
`opencode-gateway.jsonc`); the real arms are `DSH_TOOLS_MODE` × policy patch. `notes/records/GUIDE.md:116-118` then
builds a runbook step on the non-existent file.

### D3. The documented gateway is not the gateway that produced the data

`notes/records/TEST-PROTOCOL.md:93-100,188-192` documents `tools/usage-proxy.mjs` writing `results/usage.jsonl`. The
study used `tools/measure-gateway.mjs` writing `results/gateway.jsonl` (`README.md`, `notes/records/GUIDE.md:108`), and
**`results/usage.jsonl` does not exist**. `notes/records/TEST-PROTOCOL.md:16` also still carries the *retracted* folding
figure ("**~8.1%** of retained tool tokens") that `notes/records/EXECUTION.md:229-234` corrects to **14.8%**, and
`notes/records/TEST-PROTOCOL.md:166` still pins "DSH is 0.1.5-alpha".

### D4. The "hidden" test suite is inside the agent's working directory

`METHODS.md:60-62`: "each a self-contained repository with a natural-language prompt and a **hidden test
suite** used only for grading". `tasks/example-fix/task.json`:

    { "repo": "./fixture", "test": "node --test", … }

and `tools/run-experiment.mjs:233-234` copies `fixture/` (which **contains** `test/`) into the agent's
workdir, then `:300` runs `node --test` in that same directory. The grading suite is therefore visible
and writable by the agent under test; nothing hashes the test files or checks them afterwards, and the
binary verdict (`:314`) trusts the run's own working tree. "Do not change the test file" in the prompt is an
instruction, not a control. (The hard-task batch is different and better: an external grader,
`tasks-hard/_grade/run.mjs` — but all 24 `task.json` files hardcode an absolute path,
`node C:/Users/user/betterharness/tasks-hard/_grade/run.mjs <id>`, which breaks replication on any other machine.)

### D5. Config is not equalised across providers, and the difference is invisible in the data

`scripts/start-gateway.ps1:100` passes `--force-effort $Effort`; `scripts/start-provider.ps1:50` passes only
`--force-model`. `--force-temperature` exists in `measure-gateway.mjs:49,290` and is passed by **no**
launcher. Run records (`tools/run-experiment.mjs:309-323`) have no effort or temperature field. So DeepSeek
runs are effort-pinned and the Anthropic runs are not; cross-provider configuration is unequal and
unrecorded. `METHODS.md:64-65` ("Fixed across all cells … `reasoningEffort` … Record all of them per run")
is therefore false as implemented.

### D6. Two other documents contradict their own artifacts

* `notes/records/DECISION-LAYER.md:3,9,15-16`: "there is no decision model. **None was built**", "routing /
  classification / decision logic in any file written here | **none**", "no API key was ever given to this
  work" — while `router/router-core.mjs` is a working `classifyTask`/`decide` engine with a plugin and
  three test files, and the same document later references `decide()` (`:211`) and says the work "never
  built one" (`:117`). The status table is simply stale.
* `notes/records/CROSS-HARNESS.md:14-15`: "*Cost-to-solve is dominated by … **above all cache discipline** — not by the
  model*" — this is the retracted F4 mechanism, contradicted by `notes/records/FINDINGS.md:81` (cache share **−5%**),
  `notes/records/FINDINGS.md:47-50` ("the prompt cache … is **not** the lever"), `:112` ("**Cache is refuted a third
  time**") and F7 ("Model tier changes the cost structure"). `notes/records/CROSS-HARNESS.md:20-21,165` ("**nobody publishes
  per-harness prompt-cache hit rates**") is contradicted by the project's own literature pass
  (`notes/literature/RELATED-WORK.md:228`).
* `notes/records/EXECUTION.md:210` ("the four presets are worth roughly **3–5%**") vs `notes/records/EXECUTION.md:226` ("Total …
  **~7–8%**"), same section.
* `notes/records/EXECUTION.md:115-119,200-201` and `notes/records/TEST-PROTOCOL.md:18` say the provider cache-hit rate is "**not
  derivable**"/"cannot measure" — while `METHODS.md:110-113` makes it the methodological contribution and the
  milestone READMEs report it. Both statements are locally true (session logs vs provider boundary) but they
  are never reconciled, and a reader of notes/records/EXECUTION.md alone concludes the paper's central measurement is
  impossible.
* `PAPER.md:29` ("8,672 vs 8,538 tokens") vs `notes/records/EXECUTION.md:80-86` ("~8,709" → "~9,670", **+11%**) — the
  +11% *is* the point of C2; PAPER's pair shows +1.6% and matches nothing in EXECUTION or `notes/literature/RESEARCH.md:703-713`.
* `PAPER.md:99` "**Our own harness.** DSH is ours." vs `PRE-REGISTRATION.md:249-251` and
  `METHODS.md:261-263` "The authors did not develop DSH and have no affiliation with it"; and
  `notes/records/CROSS-HARNESS.md:33,98,153` ("**DSH** (this work)", "which is ours", "**we built DSH**"). Three
  documents, two mutually exclusive claims, and it is the first thing a referee checks.

### D7. Milestone bookkeeping is incomplete and duplicated

`METHODS.md:215`: "Milestone datasets **1 and 2** were collected on DSH 0.1.5-alpha.1". Four exist;
`data/milestone-3` is 0.1.7-rc.2 (also not poolable) and `data/milestone-4` is a different provider.
`notes/records/FINDINGS.md:150` refers to "milestone-1/2/3". `results/runs.jsonl` is a copy of
`data/milestone-3/runs.jsonl` and `results/glm-flash/runs.jsonl` duplicates `data/milestone-4/runs.jsonl`
(310 rows, identical timestamps) — two names per dataset, no statement of which is authoritative.

### D8. Provenance gaps in the archive

129 gateway-observed runs have **no run record anywhere** (128 on `deepseek-flash`); 174 run records have no
gateway rows. `notes/records/FINDINGS.md:402-404` mentions "632 records recovered offline" but no document says which
analysis uses the recovered set. `notes/records/FINDINGS.md:99-100` claims joints are "structural rather than
inferential" while the same file records that the join regex "silently zero[ed] whole tasks".
`results/manifest.json` has `repo.dirty: true` and records the composed-config hash per profile+patch but
not `DSH_TOOLS_MODE`, the variable that defines the primary factor (`conditions/optimized.yml:3`).

---

## E. Honesty, COI and framing — FATAL

* **E1.** The affiliation contradiction (§D6). Decide which is true; put one sentence in every document. If
  "DSH is ours" is even partly true, the pre-registration's mitigation paragraph ("not eliminated") must be
  rewritten rather than reworded.
* **E2.** `PAPER.md:103`: "Four bugs found so far, three of which would have produced a false negative."
  The repo documents at least six: the attribution regex (`notes/records/FINDINGS.md:402-404`), protocol drift 404s
  (`:405-406`), the silent provider fallback (`:407-408`), failed-requests-as-steps (`:409-410`), the
  `agentPreset` field bug (`notes/records/EXECUTION.md:229-234`), the non-streaming self-test failure
  (`notes/records/TEST-PROTOCOL.md:254-257`), plus the model-alias mispricing (§B13). It is a good paragraph that is
  currently wrong in both count and classification.
* **E3.** F4/F14 are exemplary retractions. Add the two the register is missing: the DeepSeek credit failure
  (§A5) and the resolution of the GLM native-price discrepancy (§B1).
* **E4.** `notes/records/CROSS-HARNESS.md` §8 lists "Aider" as a study arm while `PRE-REGISTRATION.md:223-225` excludes it as
  a finding; `METHODS.md:50-52` says Aider and Cline are installed while `notes/records/CROSS-HARNESS.md:40-41` says "none
  of these five is installed or executed".

---

## F. Counts, stale text, smaller defects

| # | finding | evidence |
|---|---|---|
| F1 | Router test count stale in three places: "13 tests" / "13 offline tests" / "13/13" vs **15** `test(` blocks in `router-core.test.mjs` | `router/README.md:11`, `README.md`, `notes/records/GUIDE.md:7,43` |
| F2 | `notes/records/GUIDE.md:202` "87% of frontier quality at 56% cost" and `README.md` "no small model met ≥0.85 / ≤2 s" have no pointer to the experiment behind them | GUIDE/README |
| F3 | `README.md`: `conditions/` = "one preset-selecting patch per condition" — two patches exist and neither selects a preset | README documents table |
| F4 | `notes/records/TASKS.md:5` "Right now there is one: `tasks/example-fix/`", "needs 20–40", strata 6/8/6/6/6 | notes/records/TASKS.md |
| F5 | `notes/plans/PENDING-RUNS.md:10` still prices the completed GLM-Flash suite (~$2.71; actual $2.49) and `:23` plans "10–15 tasks" | notes/plans/PENDING-RUNS.md |
| F6 | `PAPER.md:82` "$0.03–0.05" per coding run vs measured batch-1 $0.010–$0.026 (hard tasks $0.073) | PAPER vs archive |
| F7 | `PAPER.md:78` plans 15 tasks; `PRE-REGISTRATION.md:163` binds 31 | both |
| F8 | Three different attribution-key formats: `exp-<harness>-<runId>` (CROSS-HARNESS:63) vs `exp-<harness>-<matrixId>-<harness>-<task>-<arm>-s<seed>` (METHODS:95) vs the runner's `run-experiment.mjs:228` | three files |
| F9 | `notes/records/CROSS-HARNESS.md:150` "OpenCode has 40 [tools]" vs `notes/records/FINDINGS.md:350` "opencode presents **10**" | two files |
| F10 | `notes/records/CROSS-HARNESS.md:75` "test-gateway passes 10/10" vs 16 `ck()` checks in the file | code |
| F11 | "Two providers with near-identical price ratios (3.14 and 3.33)" (`notes/prompts/RELATED-WORK-FOLLOWUP-3.md:21-22`, `notes/literature/RELATED-WORK.md:645`, `PRE-REGISTRATION.md:84`) — GLM-5.3 and GLM-5.3-Flash are the **same provider**, as `notes/records/FINDINGS.md:225-227` itself states; the third literature pass was prompted by a mislabelled contrast | four files |
| F12 | `notes/literature/RELATED-WORK.md:227-228` cites the LiteLLM cache data backwards: "the cheapest arm (Haiku-only) had the **HIGHEST** hit rate … supports C3's direction (hit rate and cheapness decouple)" — the first clause is evidence **for** cache discipline, and it is the opposite of the project's own `notes/records/FINDINGS.md:83-84` | RELATED-WORK |
| F13 | `notes/records/DECISION-LAYER.md:12` and `notes/literature/RESEARCH.md:15` both claim `cordis.patch.yml` is `[]`; the live profile patch is a populated array | docs vs `~/.dsh` |
| F14 | Verbatim-quote artifacts and arithmetic slips in the research reports (e.g. "static, costignorant"; "42.3% vs 51.3% (a 21.3% relative drop)" — it is 17.5%) | token-efficiency report |
| F15 | `notes/records/FINDINGS.md:177` says the hard batch has "23-25 independent assertions each". Counting top-level `test(` blocks across `tasks-hard/<id>/grade/tests/*.mjs`: 23 tasks are in range, **`edge-glob-match` has 30** (24 tasks, 6 files each, 23–30 blocks) | verified by counting |
| F16 | All 24 hard-task `task.json` files embed an absolute machine path in `test` (`node C:/Users/user/betterharness/tasks-hard/_grade/run.mjs <id>`) — replication on another machine requires editing every task | verified by reading all 24 |

---

## G. What is genuinely good (calibrate the critique)

* The infrastructure-failure exclusion rule and its worked example (F14) are better than most published
  agent papers manage. Keep it and cite it.
* The **gateway + synthetic key** design is a real methodological contribution and it is implemented.
* Reporting both `cost_cold` and `cost_billed`, and the finding that they can disagree in *direction*, is a
  genuine contribution to how this literature reports cost — which is exactly why §A6 must be fixed rather
  than papered over.
* No LLM judge; deterministic hidden suites; per-task validity gates; a version-pinning manifest with
  per-task hashes. This is the right side of the reproducibility argument.
* The F4 retraction ("one task repeated three times is not replication") is the kind of self-criticism that
  makes the rest credible — and it is also the reason F16's 14× baseline (§B3) is so dangerous.
* `notes/records/FINDINGS.md:104-106` ("does not transfer", not "reverses") was the right call; the document then
  contradicts it 17 lines later. Keep the instinct, fix the execution.

---

## H. Limits of this review

1. **The workspace is live.** Between two reads minutes apart, `results/glm-terse/runs.jsonl` went 48 → 50 → 56
   rows; at 17:30Z its mtime was ~1 s old and `results/gateway.jsonl` had 11,365 rows and growing. Every
   count here is a snapshot at **2026-09-30T17:30Z**. A matrix appears to be running; anything reported as
   "absent" may exist by the time you read this.
2. **Corpus-study claims are second-hand.** I did not run `tools/dsh-audit.mjs`, so 357 vs 356 sessions,
   26M vs 27M tokens, the 76% `web_fetch` share, the 14.8% folding figure and "9,983 fetches" were checked
   only for internal consistency.
3. **External literature claims** (Zhang 7.8×, Ndzomga 33 scaffolds, Anthropic's 30–50 tool threshold, MiMo
   pricing, Jev/CLM accuracy, all 2026 arXiv IDs) were not verified against sources; only their internal
   cross-references were checked. Several look mis-cited (§F12).
4. **Session-log claims** (8,672/8,538 prefix; 69.5% containment; the sub-call mix) need the audit tool.
5. **Only numbers, code paths and internal consistency were attacked.** Argument structure, novelty framing
   and related-work depth beyond the contradictions listed are out of scope for this pass.

---

## I. Prioritised fix list

**Stop-the-line (do before any further collection or writing)**

1. **Rebuild the price card from `_ev/deepseek-pricing.html` and a captured z.ai card**, encode it once, and
   re-derive every dollar figure. Re-derive H1's prediction on the corrected ratio (DeepSeek output:input is
   4.0, not 2.0). (§B0)
2. **Fix the analysis tool** (§D1): output term in `billedUsd`, GLM/Haiku price entries, mean-not-median
   aggregation, mean CI for H2, failures in the numerator, and the `1 << n` overflow (`analyze-results.mjs:107`)
   before any confirmatory test is run.
3. **Rewrite the pre-registration header, §1 and §12 honestly** (§A1–A5): real version, frozen-text hash,
   amendments listed, terseness runs and the Anthropic pilot disclosed, DeepSeek's credit failure recorded.
   Enumerate which runs predate the freeze if H2 is to stay confirmatory.
4. **Settle the COI statement** across `PAPER.md`, `PRE-REGISTRATION.md`, `METHODS.md`, `notes/records/CROSS-HARNESS.md`. (§D6/E1)
5. **Declare one design of record** and delete the competing sample sizes. (§C)
6. **Move the grading suite out of the agent's workdir** (or hash and verify it afterwards) and remove the
   absolute `C:/Users/user/…` path from the hard-task `task.json` files. (§D4)
7. **Pin effort/temperature per provider and record them in the run record.** (§D5)

**Before the results section is written**

8. Every number in `notes/records/FINDINGS.md` / `notes/records/FIRST-RESULTS.md` gets a cost function and a run-id list or exact
   filter. (§B1–B3, B8, B12)
9. Recompute the hard/simple multiplier from a stated baseline and redo the F16 budgets. (§B3)
10. Fix F3's internal contradictions, delete the retracted F14 text, and propagate the "does not transfer"
    wording into `RELATED-WORK*.md`. (§B5–B7, F11, F12)
11. Update or delete the stale procedure text: `notes/records/TEST-PROTOCOL.md` §4.2/§8, EXECUTION's "cannot measure"
    passages, `PAPER.md` §4/§7, `notes/records/GUIDE.md` §8, `notes/records/DECISION-LAYER.md` §1. (§D2, D3, D6)
12. Reconcile `METHODS.md` §3/§5/§8/§10 with the archive: 31 tasks, the seven arms, the corrected card,
    four milestones. (§B10, D7)

**Hygiene**

13. One name per artifact (milestone-4 vs glm-flash; arm `ptc-opt` vs preset `ptc-opt` vs `optimized.yml`); no
    duplicated raw datasets. (§D7)
14. Router test count, `notes/records/TASKS.md`, README's `conditions/` description, PAPER's C2 numbers, the tool-count
    inconsistency (21/24/25). (§A8, F1–F4)

---

## J. Second-pass additions (runner, tooling, planning docs) — verified by me

A second audit pass covered `tools/*`, the launchers, `conditions/` and the planning documents. Everything
below I re-verified myself against the files; where the pass was wrong I say so. **Disclosure:** that pass ran
one project script, `node tools/test-gateway.mjs`, which rewrites `results/gateway-selftest.jsonl` (now 2,864
bytes / 4 records, mtime 2026-09-30T17:31:39Z). That is a self-test artifact, not study data, but it is a file
mutation that should not have happened under a read-only review; I did not attempt a second mutation to restore it.

### J1. The gateway modifies requests by default — FATAL

`tools/measure-gateway.mjs:79`: `const cacheBreakpoints = !has('--no-cache-breakpoints')`, and
`:492-505` injects `cache_control: {type:'ephemeral'}` into requests to `/messages` (system prompt + last
tool), logging a `deviations` entry. `METHODS.md:102-108` lists what the gateway does and omits this
entirely. On Anthropic/OpenAI, cache **writes cost 1.25× the miss rate** (`:162-165`), so the instrument
changes the quantity it measures; 218 of ~490 records in `results/anthropic-gateway.jsonl` carry the
injection deviation. Either turn it off for the study matrix or declare it as part of every arm's treatment.

### J2. The DeepSeek terse records say they are not terse — the DeepSeek half of H2 is unusable

Verified by reading the run records:

| file | `dsh:ptc-terse` | `dsh:native-terse` | `terse` flag |
|---|---|---|---|
| `results/ds-full/runs.jsonl` | 37 | 37 | **all `false`** |
| `results/ds-full-partial/runs.jsonl` | 62 | 62 | **all `false`** |
| `results/glm-terse/runs.jsonl` | 32 | 33 | all `true` |

`run-experiment.mjs:312` records `terse: !!p.promptSuffix` at record time, so `false` means the runner
had no suffix for those arms: the DeepSeek "terse" runs either were not manipulated or were recorded wrongly.
Either way the DeepSeek terseness contrast is not usable as run.

**And the preliminary sign is wrong for H2.** Joining `results/ds-full-partial/runs.jsonl` to
`results/gateway.jsonl` and taking per-task arm means on the 31 tasks where all four arms have cost rows:
mean(d) = P(terse) − P(default) = **+$0.00040, positive in 23 of 31 tasks** — H2 predicts mean(d) < 0. (A
stricter reconstruction over the 13 tasks with solved runs in all four arms gives +$0.00172, negative in 7/13:
also positive.) The "genuinely blind prediction" already has data, and that data points the other way. This is
exploratory and contaminated by the credit failures — which is exactly why it must be recorded in §12 rather
than discovered by a referee.

### J3. A harness that never launches is indistinguishable from one that ran and failed

`run-experiment.mjs:212` resolves `{status:null, error}` when a spawn fails, `runOne` never reads `r.error`,
and the run record has no `error` field for normal runs (verified against `ds-full-partial` keys). So a missing
`dsh` binary or a moved checkout (`:145` spawns `dshBinJs()` with no `existsSync` check) produces
`exitCode: null, solved: false` — indistinguishable from a genuine failure, and `PRE-REGISTRATION.md:216`
requires excluding exactly "a run where the harness failed to launch".

### J4. Ungraded runs count as solves

`run-experiment.mjs:314`: `solved: r.status === 0 && testPassed !== false`. If a task has no `test` field (or
the fixture is missing, `:233-234` has no `else`) then `testPassed` stays `null` and `solved` reduces to
"harness exited 0". `METHODS.md:125` defines `solved` as "hidden suite exits 0". The runner never validates
`task.json`; only `tools/validate-tasks.mjs` does, if someone runs it.

### J5. The randomisation is far weaker than documented

`run-experiment.mjs:102`: `shuffle(arms, seed * 7919 + task.length)` — the permutation is keyed on the
**task name length**, so every task of the same name length gets the same arm order; `notes/records/TEST-PROTOCOL.md:59-60`
promises "a new permutation per block per seed". `position` is recorded (`:103`) but never used as the
covariate `notes/records/TEST-PROTOCOL.md:148` asks for, and `--jobs` decouples position from execution order.

### J6. Records are append-only, undeduplicated, and not attributable to a launch

`run-experiment.mjs:341` always `appendFileSync` with no dedup; the run record has no `matrixId` in
`results/runs.jsonl` and the analysis groups by arm only. Verified: `results/runs.jsonl` already contains
**5 duplicate `(task, arm, seed)` records**. Re-running a task — which the live jobs are doing with `--only` —
adds records straight into the primary analysis, against `PRE-REGISTRATION.md:178` ("Fixed sample, no optional
stopping") and `:196` ("never topped up selectively").

### J7. The runner prints a next step that analyses the wrong data

`run-experiment.mjs:359` prints "next : node tools/analyze-results.mjs", but runs land in `<out>/runs.jsonl`
while `analyze-results.mjs` defaults to `results/runs.jsonl` + `results/gateway.jsonl` — a 30-record
single-task legacy file. Following the tool's own instruction produces a plausible-looking CONDITIONS table for
the wrong dataset.

### J8. Prompts and suites are not pinned

The run record (keys verified) has no prompt text and no prompt hash, and `tasks-glm53` is a 15-task subset of
`tasks/` with identical ids, while the record stores only the task name — different suites are indistinguishable.
`results/manifest.json` is a single overwritten file (captured 2026-09-29T17:00Z, `repo.dirty: true`, models list
without `claude-haiku-4.5`); `tools/manifest.mjs:87` hashes only `tasks/` (31 entries — `tasks-hard` and
`tasks-glm53` are never hashed), and `DSH_TOOLS_MODE` — the primary factor — appears nowhere in the manifest.

### J9. At least seven independent price cards

Verified files carrying their own rate tables: `measure-gateway.mjs`, `analyze-results.mjs`, `check-task.mjs`,
`check-report.mjs`, `mechanism.mjs`, `power.mjs`, `power-real.mjs`, `provider-budget.mjs`, `full-budget.mjs`,
`reattribute-report.mjs`, `_chekanalysis.mjs`. The same run therefore has several different "costs" depending on
which tool is run; only the gateway's is authoritative for the study, and it is wrong for Anthropic (§B13).

### J10. Corpus provenance and the self-audit's blind spots

* Three `results/check-*` tasks — `fetch-heavy-semver-ranges`, `fetch-heavy-uri-resolution`,
  `multi-file-retry-policy` — have **10 run records each and zero gateway rows in any log**: 30 runs with no cost
  data at all. They are part of the corpus behind F2/F4.
* `tools/audit-all.mjs:12-18` audits five datasets and **not** `ds-full-partial` (the 434-run matrix whose
  fate matters most); its failure regex (`:37`) matches only `QUOTA: [1113]|Insufficient balance`; and its
  documentation check (`:57`) requires the literal string "10-point cache advantage", so it prints "absent"
  while `notes/status/RESUME.md`, `notes/plans/JOURNAL-PLAN.md`, `data/milestone-2|3/README.txt` and `notes/records/FINDINGS.md:142` still assert
  the retracted F4 claim. An audit that can only find what it already knows is not an audit.
* `tools/full-budget.mjs:20-25` budgets `TASKS=30, ARMS=9, SEEDS=2` = 540 runs/model with arms
  `cline, goose, openhands, sweagent`, and `notes/plans/RUN-PLAN.md` quotes its output while the same file says Cline must
  not run and Goose/SWE-agent cannot install.
* `.gitignore` ignores `results/`: **no run artifact in this study is under version control**, and `.keys.json`
  (untracked) holds four plaintext provider keys while `notes/status/RESUME.md` records that a leaked key "should have been
  rotated".

### J11. Correction to the second-pass report (mine is verified)

The second pass reported that "259/434 runs died on provider **rate limiting**". That is not what the archive
says. Of 260 unsolved runs in `results/ds-full-partial/runs.jsonl`, **258 carry `dsh: QUOTA: Insufficient Balance`**
(credit exhaustion — consistent with commit `1b15fd6`), and only ~29 mention concurrency/"Too many requests"
(a subset that also includes opencode tails). Using the wrong failure class matters: it changes which
pre-registration exclusion clause applies and it changes the remediation (top up the account vs lower
concurrency).

### J12. H4 cannot fail

`PRE-REGISTRATION.md:133-134`: "**H4: its coefficient is 0.** Supported if the CI … contains 0; refuted if it
excludes 0, **which would be a new finding rather than a failure**", and `§8:208` lists "H4 refuted" as a new
finding. Both outcomes are pre-declared publishable, so H4 is not a hypothesis with a decision rule — it is two
results wearing one label. Either give it a rule that can lose, or demote it to exploratory.

## Appendix — how each disputed number was derived

No project script was executed; everything is recomputation from files in the tree.

* **Per-run cost (study units).** Join `runs.jsonl` to gateway rows by `runId` (or parse `syntheticKey` as
  `exp-<harness>-<matrixId>-<task>-<arm>-s<seed>` when the run record is missing); per run, sum
  `cost.billedUsd`; per arm, mean over runs. The gateway's own arithmetic was verified against the card:
  `data/milestone-1/gateway.jsonl` row 1 → 140×0.14/1e6 + 7×0.28/1e6 = 0.00002156.
* **§A6 milestone-1 table.** `data/milestone-1/gateway.jsonl` (76 rows, 10 runs); input-only column =
  summed `billedUsd` − `outputTokens`×0.28/1e6.
* **§B1 GLM table.** `data/milestone-4/runs.jsonl` (310) × `data/milestone-4/gateway.jsonl` (3,363 rows); 62
  runs/arm; all 31 leave-one-task-out subsets tested.
* **§B2.** `results/ds-full/runs.jsonl` (239), `results/check-*/runs.jsonl` (217 records, 21 tasks),
  `data/milestone-3/runs.jsonl` (30), `results/ds-full-partial/runs.jsonl` (434, solved 174).
* **§B3.** Hard-task mean = mean of F15's seven arm means = $0.07276; baselines from `results/check-*`
  excluding the four hard-task names, and from `results/ds-full`.
* **§B13.** `results/anthropic-gateway.jsonl`: 487 rows; logged $1.3814; re-priced at 1.00/0.10/1.25/5.00
  → $10.2707; pilot subset → $0.0638 vs $0.4807.
* **§D8.** Gateway `runId` set (1,333) minus the union of every `runs.jsonl` in the tree (1,378 records).
* **§A1/A2.** `git show 060ca03:PRE-REGISTRATION.md`; `git diff --stat 060ca03 -- PRE-REGISTRATION.md`;
  `git log --date=iso -- PRE-REGISTRATION.md`; first Phase-2 `ts` from `results/ds-full-partial/runs.jsonl`.
