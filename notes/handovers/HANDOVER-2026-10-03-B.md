# HANDOVER — betterharness, second session of 2026-10-03

**Read in this order:** notes/handovers/NEW-SESSION-BRIEF.md (still the specification) → notes/handovers/HANDOVER.md (2026-10-02: the
data-loss history and the pipeline's design) → notes/handovers/HANDOVER-2026-10-03.md (the first session today: the
four cheap matrices, and the standing review checklist that defines "publishable here") → **this
file**, which is what changed in the second session.

Everything below was measured in this repository. Where a number is quoted it was re-derived, not
remembered, and where a claim is not verifiable on this machine it says so.

---

## 0. THE HEADLINE

**The study went from four models to six, the statistics were rebuilt from scratch, and the paper's
position changed twice — once for the better, once by refutation.**

- **Anthropic is collected.** haiku-full and sonnet-full, 620/620 cells each, verified, committed and
  backed up. The population is now **six models across six providers**, every number reproducible
  from the shipped artifact.
- **The Holm correction now leaves survivors.** Under the filed family (m = 18) **2 of 18 contrasts
  survive**. Before Anthropic the answer was 0 of 12. Both survivors are Haiku.
- **The mechanism hypothesis in notes/plans/JOURNAL-PLAN.md §4 is REFUTED**, and the refutation is more useful
  than the hypothesis: the prefix-retention effect operates on **one** of six providers. What moves
  the others is **token volume**. The corrected version has a precondition (§4.4).
- **A new finding is larger than the one it replaced:** on Anthropic the *harness* determines cache
  retention — external harnesses keep **~half** the cacheable prefix the DSH arms keep.

**The next job is the paper, not more data.** Six matrices are in hand, all analysis is free, and the
remaining experimental options are additive. §5 says what to do, in order.

---

## 1. STATE OF THE REPO

    HEAD              110c953   working tree CLEAN except tasks-b/ (the human's, see §9)
    tests             92 passing  (node --test "tools/*.test.mjs")
    analysis          *-6model-2026-10-03.json  <- current;  *-4model-* kept as the record
    artifact/MANIFEST.json   six matrices, 23 inputs + 4 outputs checksummed
    backup            the betterharness-backups mirror   --verify exits 0 (53 source files)
    Anthropic spend   144.33 USD   (loaded amount and remaining balance omitted)

**The 16 commits this session, oldest first:**

| commit | what |
|---|---|
| e2c1aac | **Step 1** — the five conclusion-changing analysis defects, fixed test-first |
| 10e5bbc | **Step 2** — the four surviving matrices reconciled; what no longer exists |
| 0814310 | items 1-3: mechanism test, artifact package, the Holm family decision |
| 4df272f | the spend meter was pricing Anthropic on the DeepSeek card — **6.79x undercount** |
| 95e4dce | the 1.611x console gap is **refuted by measurement: the ratio is 1.000** |
| 17bb07d | notes/records/FINDINGS.md F27 corrected; the scaling instruction retracted |
| 4f6f233 | collect.mjs --extra-gateway-flag — a treatment can be A/B'd without editing the table |
| 5c41386 | validate-tasks — a crashed grader is not a failing suite |
| dc239f0 | the Anthropic cache artifact, confirmed and fixed by A/B |
| 0616654 | the auto-cache treatment pinned; **Sonnet wired** |
| 3043479 | the cache-treatment test |
| 57015ac | **haiku-full data** — 620 runs, 519 solved |
| 567d9eb | the workspace header belongs to the ENTRY, not the provider's name |
| ce59624 | **sonnet-full data** — 620 runs, 618 solved |
| 1c66817 | six-model analysis; the family result changes |
| 110c953 | one price resolver; two tools that refuse instead of crashing |

---

## 2. THE SIX MATRICES — the data

Every one: **620/620 cells**, 31 tasks x 10 arms x 2 seeds, 62 per arm, no missing cells.

| dataset | model | records | solved | tests edited | source |
|---|---|---|---|---|---|
| results/ds-full | DeepSeek V4.1 Flash | 620 | 619 (99.8%) | 0 | re-collected 2026-10-02 |
| results/glm-flash | GLM-5.3-Flash | 620 | 617 (99.5%) | 2 | collected 2026-10-02 |
| results/luna-full | gpt-6-luna | 620 | 589 (95.0%) | **81** | collected 2026-10-02 |
| results/qwen-full | Qwen3.8-Flash | 621 | 605 (97.4%) | 1 | collected 2026-10-03 |
| results/haiku-full | Claude Haiku 4.5 | 620 | 519 (83.7%) | 5 | **this session** |
| results/sonnet-full | Claude Sonnet 5.5 | 620 | 618 (99.7%) | 0 | **this session** |

- qwen's 621 records for 620 cells is deliberate: one cell carries an infrastructure failure plus its
  justified retry. **Do not "clean" it.**
- ds-full is the only matrix with **no fixture field** on any record, so its test-edit count comes
  only from the retroactive workdir scan (_ev/ds-test-edit-scan.md, 0 of 62 surviving). The other five
  carry fixture on 100% of records.
- Anthropic treatment: **static breakpoints PLUS Anthropic's top-level cache field** (--auto-cache),
  recorded in tools/collect-gateway.mjs and pinned by a test. See §3.2.

### Measured cost per run (not the card)

| model | measured | card estimate |
|---|---|---|
| Claude Haiku | **0.09038 USD/run** | 0.454261 |
| Claude Sonnet | **0.06753 USD/run** | 0.269822 |

The card overestimates Anthropic by ~5x under the corrected cache treatment. **Budget from the
measured figures.** The card-priced 448.93 USD for a Haiku+Sonnet batch-1 sweep became 98.34 USD.

---

## 3. WHAT THIS SESSION FIXED

### 3.1 The five analysis defects (e2c1aac)

All five were present at HEAD, all five fixed with the test watched failing first. The statistics now
live in **one** module, tools/stats.mjs:

- hypotheses.mjs held a **module-level RNG stream under a comment claiming it had been given a fresh
  stream per call**. The comment was the lie, not the code; no output test could catch it.
- A2b's Holm **never stepped down** — it could pass a test whose predecessor had failed.
- A2b shared **one RNG across the whole family**, so the table was order-dependent.
- Two broken LCGs evaluated in doubles (analyze-results, h2-test).
- cost-panel assigned primary **before** the exclusion check, so a cell whose first record was
  excluded had its surviving record marked dup and the primary-only view dropped the cell.

### 3.2 The Anthropic cache artifact — and the decision (dc239f0, 0616654)

The gateway injects its cache breakpoint on the **last tool**. dsh:ptc presents **1 tool**;
dsh:native presents **24**. Haiku's minimum cacheable prefix is 4,096 tokens, so PTC's prefix fell
under it and was **never cached at all**: 0 hit tokens in 869 requests against 27.6% for native, and
a "+92.3% PTC penalty" that was entirely our own marker geometry.

Measured A/B, same tasks and arms, one variable:

| | static only | + --auto-cache |
|---|---|---|
| PTC hit rate | 0.0% | **99.9%** |
| PTC per run | 0.74186 USD | **0.21593 USD** |
| 62-run total | 34.96 USD | **10.42 USD** |

**Decision: the Anthropic condition is static breakpoints PLUS the top-level field.** Not because it
is cheaper — because the alternative manufactures the effect it reports, and because the four
automatic-caching providers cache for every arm. It applies only on the Anthropic Messages path, so
no existing matrix changed. Pinned in collect-gateway.test.mjs.

### 3.3 The spend meter priced Anthropic on the DeepSeek card (4df272f)

The gateway logs the API name claude-haiku-4-5; the table held claude-haiku-4.5. So
PRICES[model] ?? FALLBACK valued a whole pilot on the DeepSeek card: **5.15 USD reported against
34.96 USD of real tokens, 6.79x low.**

**This was a ceiling defect, not a reporting one.** A ceiling is only as tight as the number it
measures: the planned --max-cost 600 would have permitted ~4,076 USD of real billing on the
account balance (remaining balance omitted) — the F38 failure mode, arriving through our own arithmetic.

Fixed with declared aliases, dated-snapshot resolution, and a fallback a caller must **ask for**. Five
more tools carried the same fallback and were fixed in 110c953; tools/prices.mjs now owns one
resolver, cardFor(model, { required }).

### 3.4 The 1.611x is refuted (95e4dce, 17bb07d)

notes/records/FINDINGS.md F27 recorded a console-over-log gap of 1.611x and instructed: "every per-run figure in
this project needs scaling by 1.61." A 62-cell pilot reconciled against the console:

| | before | after | delta |
|---|---|---|---|
| credits | remaining balance omitted | remaining balance omitted | **35.58** |
| lifetime spend | 667.11 | 667.11 | **0.00** |

Our computed cost from the pilot's own gateway log: **35.5718**. **Ratio 1.000**, known to +-0.014%.
F27's correction factor is retracted in place; **the 7.43x remains open**. The console's **spend
counter did not move at all** — reconcile against the **credit ledger**.

### 3.5 validate-tasks passed 40 empty tasks (5c41386)

Forty scaffolded tasks (a "TODO" prompt, empty fixture/test/, empty grade/tests/, empty reference/)
were reported **"40 tasks, 40 valid, 0 invalid"** while verify-task.mjs failed every one. The cause:
BROKEN-BEFORE consulted exactly one thing, a **non-zero exit** — and a crashed grader exits non-zero
too. Three structural checks added (visible suite required; placeholder prompt is unfinished; a grader
with nothing to run is not a failing suite) plus a crash signature.

**Verified against all three real suites:** tasks 31/31 unchanged, tasks-hard 24/24 unchanged,
tasks-b 40 → 21 valid.

### 3.6 The workspace header belongs to the entry (567d9eb)

The first Sonnet launch **failed at preflight, correctly, and spent 0 USD**: every harness returned
"This API key is not scoped to a workspace, so this request must include the anthropic-workspace-id
header." collect.mjs sent that header on a check of the provider NAME, written when Haiku was the only
Anthropic entry. Now needsWorkspaceId on the entry, with an invariant test.

### 3.7 Two tools that crashed now refuse (110c953)

h2-test.mjs (needs results/glm-terse, destroyed) and mechanism.mjs (needs results/gateway.jsonl,
destroyed) exited with ENOENT-style failures. Both now state the reason and exit 2.

---

## 4. WHAT THE SIX MODELS SHOW — the paper's position

### 4.1 The thesis is stronger

The PTC-vs-native differential, paired by task, cluster bootstrap over 31 tasks:

| model | ratio | differential | 95% CI |
|---|---|---|---|
| GLM-5.3-Flash | 3.33 | **-20.8%** | [-43.7, -2.7] |
| gpt-6-luna | 5.00 | +1.2% | [-8.4, 11.3] |
| DeepSeek V4.1 Flash | 4.00 | +0.1% | [-9.0, 9.8] |
| Claude Sonnet 5.5 | 5.00 | +9.5% | [0.3, 17.9] |
| Qwen3.8-Flash | 3.13 | +30.7% | [10.0, 53.3] |
| **Claude Haiku 4.5** | 5.00 | **+53.8%** | [31.8, 77.8] |

**Three models share output:input 5.00 and disagree by 52.6 percentage points**, against **74.6
points across the whole ratio axis** — 70% of the between-model spread sits inside one ratio value.
That is F31's argument, now on data that ships. (F31's own 7-model version claimed 93%; **do not quote
93%**, it is unreproducible.)

### 4.2 The family now has survivors

PRE-REGISTRATION.md §6 requires Holm across every secondary and pairwise contrast reported together.
**m = 18** (6 cost contrasts + 12 solve-rate contrasts). **2 survive:**

| contrast | p | verdict |
|---|---|---|
| Claude Haiku dsh:native -> dsh:ptc | 0.0000 | significant |
| Claude Haiku dsh:ptc -> dsh:ptc-terse | 0.0001 | significant |

Sonnet's cost contrast (p = 0.0512) and Qwen's (p = 0.0056) **fail** despite intervals excluding zero.
The tool prints the per-block reading as a declared sensitivity.

**The family decision was taken this session (notes/records/STEP2-RECONCILIATION.md §5.1): the filed, broad reading
is primary, and the reason is that it costs us our own result** — a rule chosen after seeing the
effect is fatal at journal tier, so the choice that cannot be read as selective analysis is the one
that removes our significance. Consequence: **the paper must not rest on stars.** It rests on the sign
disagreement with intervals, the rank-step tie fraction, and the mechanism.

### 4.3 The mechanism prediction is REFUTED — usefully

notes/records/STEP2-RECONCILIATION.md §4b pre-declared: Anthropic declares its cache like Qwen, so both Anthropic
models should show a Qwen-like retention deficit. Measured, paired by task:

| model | retention PTC | retention native | difference |
|---|---|---|---|
| Qwen3.8-Flash | 0.674 | 0.743 | **-0.069** |
| Claude Haiku | 0.996 | 1.000 | -0.003 |
| Claude Sonnet | 1.000 | 1.000 | +0.000 |

Anthropic's retention is **flat**; its differentials are **volume** effects (Haiku cost_cold +18.7%,
Sonnet -15.1%). **The prefix mechanism explains 1 of 6 providers.**

### 4.4 The productive reframing: a PRECONDITION

The prefix effect only bites where the cache is **lossy**. Qwen's absolute retention is 0.674-0.760;
Haiku's is 0.994-1.000 and Sonnet's 1.000-1.000 under the corrected treatment. Where retention is
already ~100% there is no headroom for a mode effect, so the differential must come from token volume
— and it does. That is a testable precondition, not a patch.

### 4.5 A new finding, larger than the one it replaced

**On Anthropic the HARNESS is the dominant determinant of retention:**

| | DSH arms | external harnesses |
|---|---|---|
| Haiku | 0.994 / 1.000 | **0.560** |
| Sonnet | 1.000 / 1.000 | **0.451** |

The external harnesses lose about **half** the cacheable prefix the DSH arms keep — a ~2x harness
effect on exactly the quantity that drives cache cost.

### 4.6 What is still NOT reproducible

On **2026-10-02 the entire results/ tree was destroyed** (24 matrices, ~5,900 run records, ~102,000
gateway records, ~900 EUR). results/ was gitignored, so git held nothing; **zero run records were
recovered**. The backup mirror is of results/, so it holds the same gap. Therefore:

| figures | status |
|---|---|
| **F31, F34, F35** (seven-model) | unreproducible. analysis/panel-analysis.json and analysis/hypotheses.json, generated 2026-10-02T07:52Z, are **the only witness — do not overwrite them**; both tools default to writing exactly there |
| **F38** (f18 replication) | unreproducible — results/f18-* gone |
| **F42** (hard batch) | unreproducible — results/hardbatch-* gone |

notes/records/FINDINGS.md carries a provenance banner saying so; notes/records/STEP2-RECONCILIATION.md holds the figure-by-figure
table.

---

## 5. THE NEXT JOB, IN ORDER

### STEP 1 — SECTION B: the analysis and the paper, on six models. NO SPEND.

Suite 2 is independent of this (a separate replication suite with its own pre-registered analysis), so
**none of the following waits for it**:

1. **Reconcile the six-model numbers** into notes/records/STEP2-RECONCILIATION.md — it currently holds the four-model
   figures. Include the corrected within-ratio spread (52.6 pp within ratio 5.00 vs 74.6 pp across the
   axis = 70%, **not** F31's 93%).
2. **PAPER.md, METHODS.md, notes/records/CROSS-HARNESS.md and notes/reviews/REVIEW-RESPONSE.md all still describe the seven-model
   population.** This is the largest writing job. The results section is unwritten.
3. **notes/records/FINDINGS.md F31 and F35** still print seven-model values; F35's prose says 47 ties where its own
   table's arithmetic gives 48.
4. **notes/reviews/REVIEW-RESPONSE.md still prints the RETRACTED placebo verdict and four stale F37 figures.** A7's
   old 46.2% "noise floor" was a real treatment effect (the arms were not identical).
5. **A3 prints a self-contradicting sentence** — with three models now at ratio 5.00 it reads
   differently; re-check it.
6. **Mixed-effects analysis** (notes/plans/JOURNAL-PLAN.md §5, never done): paired tests ignore task heterogeneity.
7. **Related work and ablations** — journal-tier, still "to do".
8. **One correction owed:** the commit message of 1c66817 states the across-axis spread as "21.9
   points". That number is wrong; the correct figures are in §4.1. Put them in the docs.

### STEP 2 — the §4.1 test-editing rule. NO SPEND. Decide it before looking at its effect.

Rates now measured: **luna 81/620 (13.1%), Haiku 5, GLM 2, Sonnet 0, DeepSeek 0.** From
notes/handovers/HANDOVER-2026-10-03.md §4.1: luna's solved-with-edits is 97.5% against 94.6% without — **2.9 pp on 13%
of runs, so ~0.4 pp on its solve rate at most.**

**The strongest option, and it is free — do all three at once:**

1. **report every model's rate** as measured;
2. **pre-declare a with/without sensitivity** on the edited subset;
3. **point at suite 2's hidden graders as the structural answer** — there, editing the graded suite is
   impossible by construction.

Do **not** exclude the runs: only luna is affected, which makes it an asymmetric exclusion. Do **not**
restore fixtures: that alters the treatment mid-study. A reviewer's attack then meets a measured
effect size, a sensitivity that does not move the headline, and a replication where the confound
cannot exist.

### STEP 3 — suite 2 (the human is building it; do not touch tasks-b/)

State at handover: **40 tasks scaffolded, 21 valid** (30 have a visible suite and hidden cases).
**long-horizon is the gap: 2 of 10**; single-step 10/10, multi-file 10/10, repo-wide 8/10.

When the human says it is done:

- gate it with node tools/validate-tasks.mjs --dir tasks-b **and** node tasks-b/_tools/verify-task.mjs
  ID printing ok per task;
- its analysis must be pre-registered in tasks-b/PLAN.md **before** collection;
- collection is ~33 USD for the four cheap providers (40 tasks x 10 arms x 2 seeds = 800 cells each);
- Anthropic on it is ~126 USD at measured rates, not the 579 USD the card implies.

### STEP 4 — only then spend again

| option | measured basis | verdict |
|---|---|---|
| Anthropic on suite 2 (both models, 800 cells) | **~126 USD** | worth it if suite 2 replicates on the cheap four |
| hard suite, four cheap providers | ~97 USD (card, unmeasured) | **pilot it first** |
| hard suite, Anthropic both | **784 USD is NOT trustworthy** | see below |
| message capture (makes mechanism P2/P3 testable) | ~5-20 USD | worth it if the mechanism is the contribution |
| seeds 2 -> 5 | 2.5x | only if a specific claim needs power |

**Why 784 USD is not a budget.** It is 240 cells x (1.963078 + 1.304599), and those per-run figures
come from f18.json: **one task, 6 Haiku runs and 30 Sonnet runs**, at **card prices** — and the card
overestimates Anthropic ~5x under the corrected treatment. Do not decide from it: **run a ~5 USD
pilot** on 2-3 hard tasks, exactly as the batch-1 pilot (35 USD) replaced a wrong 900 USD plan with a
right 56 USD one.

---

## 6. WHAT NOT TO DO

**Inherited, non-negotiable (notes/handovers/NEW-SESSION-BRIEF.md §7), still in force:**

- Never run a matrix without a backup target configured and a spend ceiling set.
- Never delete an output directory. --resume only.
- Never price from a summary. Re-derive from gateway usage with costOf.
- **A non-zero exit is not evidence until its cause is known** — and neither is a 4xx, a missing file,
  or an absent number.
- Preflight all harnesses, not just dsh.
- Write the test first.
- Commit and back up before reporting anything as done.

**New this session:**

- **Do NOT overwrite analysis/panel-analysis.json or analysis/hypotheses.json.** They are the only
  surviving record of the seven-model results, and both tools default to writing there. New outputs go
  to analysis/*-6model-2026-10-03.json.
- **Do NOT revert --auto-cache** on the Anthropic entry (§3.2). It is pinned by a test for a reason.
- **Do NOT scale Anthropic figures by 1.611** (§3.4). The ratio is 1.000.
- **Do NOT budget Anthropic from the card.** Measured: Haiku 0.09038/run, Sonnet 0.06753/run.
- **Do NOT touch tasks-b/** — the human is authoring it in a parallel session, and edits from two
  writers will collide.
- **Do NOT "fix" the qwen duplicate cell**, change the solved rule, restore fixtures, relax
  tools/safe-fs.mjs, add a ceiling to luna, or re-ignore results/ or _ev/. Unchanged from the previous
  handover.
- **Do NOT decide the test-editing rule after seeing its effect** (§5 Step 2).

---

## 7. WHERE TO BE CAREFUL — gotchas that cost real time this session

### 7.1 PowerShell will silently eat your dollar signs and your backticks — confirmed twice

A JS template literal containing PowerShell newline escapes **broke a whole run_code program**, and a
regex written inside a template literal arrived in a file with its backslashes stripped — first wrong,
then a syntax error. Writing this very handover hit the same trap: backticks inside a template literal
terminate it. **Write files with the write tool, and keep dollar signs, backticks and nested quotes out
of pwsh command lines.** For git messages use git commit -F file.

### 7.2 NEVER kill a process from a plain pwsh tool call — confirmed the hard way

Terminating a stray gateway with Invoke-CimMethod **tore down this session's own Windows job runner**
("Windows Job runner exited with exit code 0 before proving its managed range empty") and killed a
program mid-way. If a kill is truly needed, use run_in_background: true. **Better: do not kill.** Stray
gateways on ports 8788-8804 are harmless — the launcher allocates a free port and no run ever touches a
stale one.

### 7.3 The edit tool requires a READ in this session, and detects concurrent writers

edit fails with **"file has not been read"** after you write a file with raw fs calls (raw fs does not
count as a read), and with **"file changed since it was read"** when another session touched it — which
happened repeatedly with tools/collect.mjs because the human's session edits it too. **Re-read, then
retry.** Do not fight it; it caught two real collisions.

### 7.4 collect.mjs ignores unknown options SILENTLY

An A/B launched with --extra-gateway-flag --auto-cache **before that option existed** ran happily with
the shipped treatment — a duplicate of the pilot rather than the test intended. It was caught by
reading the gateway's command line, killed after ~1 minute, and relaunched. **After any launch, verify
the treatment reached the process:** query the process list and read the command line.

### 7.5 os.tmpdir() is undefined inside run_code

process.env starts empty in that sandbox, so os.tmpdir() returns undefined and a scratch path became a
literal "undefined/temp/..." **directory in the repo root**. Use pwsh's TEMP variable, or a path under
results/_scratch/. (The stray directory was moved into scratch, not deleted.)

### 7.6 The pipeline DOES commit its data

The sign-off stage stages and commits; it prints "committed: nothing new" on its **second** pass
because the first already committed. Do not conclude from that message that the data is untracked —
check git ls-files. (The previous session's scratch-rooted pilot genuinely had nothing to stage, which
is what made this look otherwise.)

### 7.7 The goose workdir warnings are the guard working

"WARN workdir not cleaned" appears for every goose run: goose drops a .jsonl inside its workdir, so
safe-fs correctly refuses. **Not a failure.** The fix is a runner-written ownership marker, never a
weaker guard. Disk is 452 GB free — untidy, not urgent.

### 7.8 Long jobs

run_code has a **120 s default and a 600 s cap**. Matrices run for hours: launch with
run_in_background: true and collect with job_output. A 620-cell Anthropic matrix took ~5.4 h at 4 jobs
(~0.52 min/run). job_output is **incremental** — it returns only what is new since the last read, so
counts of "backups seen" are per-window, not cumulative.

### 7.9 The watchdogs and the meter

The spend meter kills a matrix at **90% of the ceiling**; that is a budget stop, not a failure, and
--resume continues. Both watchdogs stand down once every expected cell is on disk. The meter's spend
figure tracks the **matrix**, not preflight/pilot — reconcile against the gateway log.

---

## 8. HOW TO VERIFY — the recipe that caught everything above

Never accept a tool's own summary. Run these independently:

    node --test "tools/*.test.mjs"            # 92 tests, must be 0 failures
    node tools/artifact.mjs                   # regenerates every analysis + checksums, one command
    node tools/artifact.mjs --verify          # must exit 0
    node tools/backup-results.mjs --verify    # must exit 0

Then, from disk:

1. **Cells.** distinct(task|arm|seed) must be 620, 62 per arm, duplicates explained.
2. **Outcomes.** Count error, timedOut, non-zero exits. **Investigate any run whose failure contradicts
   its own output** (testPassed true while solved false is the known class).
3. **Spend.** Re-derive per runId with costOf(model, usage) over EVERY *gateway*.jsonl, and reconcile:
   whole log = matrix runs + preflight + pilot.
4. **Zero-cost unexplained:** no billable usage and no error must be 0.
5. **Fields:** harnessVersion and fixture present; fixture.gradedOnEditedTests counted.
6. **Backup and git** as above.

A reusable script for 1-5 was rebuilt several times this session; **rebuild it from this description
rather than trusting a path in the temp directory.**

---

## 9. STILL OPEN, NOT DONE

- **Suite 2** — the human is authoring tasks-b/ in a parallel session. 21/40 valid; long-horizon is
  the gap. Do not touch it.
- **Section B** (§5 Step 1) — the whole paper pass on six models.
- **The §4.1 rule** (§5 Step 2) — free, and it gates how every solve-rate number is reported.
- **The hard suite** — price it with a ~5 USD pilot; the 784 USD figure is a one-task card
  extrapolation.
- **Message capture** — P2 and P3 of the mechanism are untestable from the current logs (message and
  tool contents are stored as COUNTS). A re-run with message capture would make them testable.
- **tasks-hard/_grade/run.mjs is modified and uncommitted** — the human's (a staging-path cleanup: it
  pushed the wrong path while copying into a uniquely-named staging dir, so staged dirs were never
  removed; a cleanup bug, not a grading one).
- **Legacy tools referencing destroyed datasets** (coverage.mjs, anthropic-budget.mjs, glm53-era
  planning tools). Some now point at haiku-full/sonnet-full, which exist again; others point at glm53,
  glm-terse and glm-harness, which never will.
- **The 7.43x** console correction factor — unresolved (the 1.611x is refuted; this one is not).
- **F45 position-confound re-run** (previous handover §4.4) — first find out what position records.
- **Goose workdirs** and the **locked browser profile** — untidy, not urgent.

---

## 10. THE STANDARD

The previous handover left one instruction above all others: **the objective is a paper strong enough
to publish in a peer-reviewed journal, and "make the pipeline work" is not the same standard as "make
the evidence survive hostile review".**

This session is a case study in why that distinction pays. Of the defects found: **four were invisible
to a passing test suite** (a comment claiming a fix that was never made; a correction that never
stepped down; a validator that read a crashed grader as a failing suite; a spend meter that priced one
provider on another's card). Two would have produced a *published* number that was wrong — the
Anthropic PTC penalty, and every scaled Anthropic dollar — and one would have bought 620 cells of a
treatment that measured the gateway rather than the harness.

**The pattern to keep:** the number that looks plausible is the dangerous one. Every one of these was
found by asking what a figure *counted*, not by checking whether the code ran.
