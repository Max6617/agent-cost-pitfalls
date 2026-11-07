# notes/reviews/CRITICAL-REVIEW.md — independent hostile review of the paper-bound documents

> ## ⚠ TWO CLAIMS IN THIS REVIEW ARE WITHDRAWN, 2026-10-01
>
> A later prior-art pass (`notes/literature/LITERATURE-2.md`, eight verification agents, every source re-fetched
> live) falsified two of the findings below. Both are of the same kind — a negative search result
> reported as evidence of absence — and both were treated as authoritative for a day. They are
> corrected here rather than edited out of the text, because a review that silently changes is worth
> no more than a claim that does.
>
> **1. §5, "the arXiv IDs resolve to nothing outside the repo's own timeline."** All fifteen
> 2026-dated arXiv IDs in scope were re-fetched. **Every one resolves to the correct paper**, with
> submission history and independent presence: OpenReview copies, ICML/ICLR 2026 pages, public code,
> third-party write-ups, citing papers. The blanket claim is false for every ID checked.
> **Withdrawn.** What survives from §5: existence is not peer review, and no `_ev/` captures exist
> for them.
>
> **2. §3.3 and §5, the OpenTelemetry quote is "fabricated-looking / no public source contains that
> metric name."** The metric is genuine standards text. The OTel GenAI conventions **moved to a new
> repository** (`open-telemetry/semantic-conventions-genai`); the old page now shows only a "moved"
> notice, which is almost certainly why the reviewer found nothing. The new repo defines
> `gen_ai.client.inference.usage.cache_read.input_tokens` with the exact quoted description.
> **The fabrication claim is withdrawn.** What survives and should be cited: the metric family merged
> 2026-09-22 and carries *Status: Development*.
>
> **This does not rehabilitate the review.** Of its five fatal findings, three stand unchanged and
> were acted on: the pre-registration freeze defect, the confirmatory verdicts that bypassed the
> filed rules (both reviews were right, and `tools/hypotheses.mjs` now executes the rules as
> written), and the retracted price card still printed as fact. The $2.1 timestamp inversion was
> separately refuted as a two-hour timezone over-subtraction (`notes/reviews/REVIEW-RESPONSE.md`). The lesson the
> two withdrawals teach is the one this project keeps relearning in both directions: **a negative
> search result is not evidence of absence until the search is known to be capable of succeeding.**
> Neither the arXiv check nor the docs check verified that before writing the claim — the same error
> the review was written to catch.

**Reviewer:** external, read-only. **Date:** 2026-10-01.
**Method:** every paper-bound document in the repo root (plus `tasks-hard/`, `router/`,
`snapshots/`, `conditions/`) was audited against the raw data in `results/`, `data/`,
`_ev/`, and `.git/` by 17 parallel read-only auditors, each verifying claims against
primary evidence. No files were modified; no commands were run; git state was inspected
by reading `.git` files directly. The reviewer personally re-verified the load-bearing
findings against primary sources; those are marked **[verified by reviewer]**. Everything
else is marked with the evidence path so each claim in this file can itself be checked.

Severity scale: **ERROR** (contradicted by the repo's own evidence) · **MISMATCH** (two
documents/datasets disagree) · **UNVERIFIABLE** (stated as fact, no evidence in repo) ·
**WEAK-DISMISSAL** (a written dismissal whose stated reason does not hold) · **STALE**
(status claim outdated) · **NOTE** (minor).

---

## 1. Verdict, up front

The data-collection engine is real and most raw archives check out. The document layer is
**not submittable**: one integrity-level anomaly that no document explains, hypothesis
verdicts that bypass the pre-registered decision rules, a retracted price card still
published in the methods, a retracted claim restated 11 lines below its own retraction,
and a "most finished" pre-registration that contradicts itself on the headline variable.
None of these require outside knowledge to find — a referee with the repo finds all of them.

The five worst:

1. **A timestamp inversion between the git history and the run archives.** Committed
   findings describe exact statistics for runs whose archived timestamps are *later* than
   the commits. No document records the re-runs that could explain this. (§2.1)
2. **Both confirmatory verdicts were reached by bending the pre-registered rules** — H1's
   regression was never computed, and H2's rule says the reported outcome is "inconclusive",
   not "NOT SUPPORTED"; the pre-registered test was also substituted. (§2.2)
3. **The retracted DeepSeek price card (0.14/0.028/0.28, ratio 2.0) is still printed as
   fact in METHODS.md §5, PRE-REGISTRATION.md §5, notes/status/SESSION-STATE.md, notes/records/FIRST-RESULTS.md,
   notes/status/RESUME.md, tasks-hard tooling and ~10 analysis tools** — while PRE-REG §12.1 and
   FINDINGS F20 in the same repo declare it "wrong in every cell" (true card:
   0.15/0.003/0.60, ratio 4.00, cache discount 50×). (§3.1)
4. **FINDINGS F14's retraction is immediately followed by the retracted claim** ("There is
   no evidence that a stronger model underperforms a weaker one" … "69 of 75 solved on
   GLM-5.3 — **the first quality differentiation in the study**"). Verbatim, unfixed.
   **[verified by reviewer: notes/records/FINDINGS.md:605-607 vs :618]**
5. **The 150-run "15-task sweep" behind F1/F2's power claims has no run records anywhere
   in the repo**, the study's own audit tool is hardcoded to skip it, and the re-derivation
   tool maps it to a 10-record, single-task file. (§2.4)

---

## 2. Integrity-level findings

### 2.1 The commit/archive timestamp inversion — ERROR, unexplained

**[verified by reviewer against `.git/logs/HEAD` and the archives]**

The reflog (committer timestamps, +0200) and the archived run `ts` fields (UTC):

| commit (UTC) | what it asserts | archived runs (UTC) |
|---|---|---|
| `ab91d4a` 09-30 **14:57Z** — "the Anthropic pilot: five bugs and a caching answer, for seven cents" | pilot done, costed | `results/pilot-anthropic/runs.jsonl` first record **16:55:38Z** |
| `8140e27` 09-30 **15:17Z** — "F15/F16: the hard batch discriminates" | per-arm hard-task costs | `check-lh-ledger-replay` **17:02Z→**, `check-edge-glob-match` **17:21Z→** |
| `0aef7df` 09-30 **15:45Z** — pre-registration v4 freeze | inventory: pilot 6/6 solved, probe 0/6, terseness "in progress", hard checks 14×2 | probe **17:23Z→**, glm-terse **17:00Z→**; the two named hard checks archived **after** the freeze |
| `edae1b5` 09-30 **15:56Z** — "F21/F22/F23: the mechanism fails its causal test" | p = 0.4278, CI [-0.002226, +0.000950], "124 runs" | `results/glm-terse/runs.jsonl` **17:00:23Z → 17:55Z** |
| `434dece` 09-30 **16:21Z** — "F24: DeepSeek complete and clean, 434 records" | the finished matrix | ds-full's 434-record matrix completes **~18:19Z** |

F21's exact statistics were committed **64 minutes before the first of the 124 runs it
describes started**. Four of the eight rows in the pre-registration's own data inventory
assert, as existing data, runs the archive says had not happened at freeze time.

The innocent reading — findings describe a *first* execution and the archives are
*re-runs* — fails three ways: (a) the only documented archive-destruction mechanism
(`tasks-hard/_tools/check-task.mjs:37` `rmSync`s `results/check-<id>` before a re-run)
covers `check-*` dirs, not `pilot-anthropic` or `glm-terse`; (b) the pilot's committed cost
("$0.0637", "seven cents") matches the **later** archive ($0.0638) — a re-run would have to
reproduce the committed numbers to the fourth decimal; (c) no document anywhere records a
re-run. The alternative reading is that results were written before the runs existed.
Either way: **every statistic committed on 09-30 between 14:57Z and 16:21Z is currently
non-reproducible from the archive, and the pre-registration's "honest freeze" narrative
sits on top of the anomaly.** This must be resolved in writing before anything else —
it is the difference between "sloppy bookkeeping" and something much worse.

Related: PRE-REG §12's centerpiece self-correction is a **timezone error**. §12 says
v3.0's "no Phase 2 data collected" assertion "was false — collection began
2026-09-29T20:03Z and the document was edited at 20:04Z and 20:26Z." The v3.0 commit
`c486f69` is at epoch 1790712266 **+0200 = 18:04:26Z**, and the F14-retraction commit
`9c41fb0` at 18:26:06Z — both *before* collection began (20:03:00Z, ds-full-partial
record 1). The "20:04Z/20:26Z" are local (+0200) commit times with a "Z" appended.
Under genuine UTC, v3.0's assertion was **true** when committed, and amendment #10's
"they were running while v3.0 claimed otherwise" is equally wrong. **[verified by
reviewer]** (Note: `results/runs.jsonl` contains 30 example-fix records from 11:14Z that
day — if those count as Phase-2 collection, the "began 20:03Z" claim needs amending too.)

### 2.2 The confirmatory verdicts bypass the pre-registered rules — ERROR

**[verified by reviewer against PRE-REGISTRATION.md:116-118 and notes/records/FINDINGS.md:258-269]**

- **H2.** Pre-registered rule: supported iff *exact one-sided Wilcoxon signed-rank* p<0.05
  AND bootstrap CI entirely below 0; **refuted iff CI entirely above 0; otherwise
  inconclusive**. FINDINGS F21 reports CI = [-0.002226, +0.000950] — it spans 0, so the
  pre-registered label is **"inconclusive"**, not "NOT SUPPORTED". Additionally the
  pre-registered test is Wilcoxon signed-rank; `tools/h2-test.mjs:53-58` runs a **sign
  test** (the script's own comment admits the substitution); FINDINGS never discloses it.
  The substantive conclusion would likely stand, but two rules were bent to reach the
  printed verdict, and F23's "the mechanism is dead" is stronger than the rule licenses.
- **H1.** The decision rule requires estimating `D_ij = b0 + b1·S_ij + u_i + e_ij` with a
  bootstrap CI for b1. No b1, no CI, no model output exists anywhere in the repo — the
  "contradicted in direction" verdict (F20) rests on a 3-point monotonic table. The
  pre-registered secondary (penalty at ratio 5.0 must exceed penalty at 3.33 by >5pp) is
  never reported although Haiku (5.0) data exists (`results/haiku-full`, 653 runs).
- **H3** declared ROBUST (F12) without its pre-registered mixed model; **H4** never
  formally tested. H3's rule ("CI excludes 0") has no confidence level or sidedness; H4's
  rule ("CI **contains** 0 → supported") is unfalsifiable by construction — an underpowered
  null "supports" the study's negative hypothesis (accepting-the-null). PRE-REG v4.0 did
  not fix this despite the prior review flagging it (REVIEW-FINDINGS §J12).

### 2.3 The exclusion machinery violates §9 in the mandated tools — ERROR

F24 records: "The check now requires an unsolved run AND the provider's error string."
Only `tools/audit-all.mjs:36` implements that. The tools that produced the central results
still exclude any run whose output merely contains "quota": `tools/rederive.mjs:25` (the
tool §12.2 **mandates**), `tools/h2-test.mjs:12`, `ds-validity.mjs:10`,
`recompute-prices.mjs:19`, `glm-budget.mjs:24`, `coverage.mjs:10`, `run-experiment.mjs:126`.
Verified impact: `results/glm-flash/runs.jsonl` contains 10 solved
`multi-file-retry-policy` runs whose fixture text contains "quota" — silently dropped from
F20/F21; `results/glm-terse/runs.jsonl:68` (solved) likewise. This is also the likely
cause of F21's unexplained "30 paired tasks" out of 31. §9 says exclusions are "never
applied for a run result"; the pipeline applies them for a fixture word.

### 2.4 Datasets that documents rely on but the repo does not contain — ERROR/MISMATCH

- **The 150-run "15-task sweep"** (F1's "150 observations, 15 tasks, 5 arms"; PRE-REG §1
  "complete") exists as run records **nowhere**. `tools/audit-all.mjs:14` lists it with
  `runsP = null` — the project's own audit *skips verifying it by construction*;
  `tools/rederive.mjs:94` maps "DeepSeek sweep" to `results/check-fetch-heavy-duration-parse/runs.jsonl`
  — **10 records, 1 task** — so F20's "DeepSeek sweep" column is computed from one task,
  not 15. The actual check-* sweep in the archive is 17 tasks/168 records (+4 hard checks).
- **F24's "complete and clean" matrix matches no dataset.** "434 records, 433 solved,
  7 arms × 62" — the only 434-record/7-arm file is `ds-full-partial` (260 unsolved, the
  failed matrix). The clean re-run is `ds-full`: **620 records, 10 arms, 619 solved**
  (verified: the 7-arm subset is 434/433). No document describes the 620-run matrix.
- **tasks-hard/RESULTS.md's flagship `lh-ledger-replay` table** ("7 arms × 3 seeds, 21
  runs, 26.1 min; dsh:ptc 0/3; all 21 failed the same case; spread 33pp") matches no data:
  `results/check-lh-ledger-replay/runs.jsonl` has **14 runs, zero with `"seed":3`, 3 solved
  (incl. dsh:ptc), spread 50pp, and that test case never failed**. **[verified by
  reviewer]** FINDINGS F15 matches the archive; RESULTS.md describes a phantom matrix.
- **glm53 has outgrown every document**: 110 records now (75 documented + 35 from an
  undocumented 10-01 mixed-harness re-run, incl. cline and tasks outside the "shared 15").
  PRE-REG/FINDINGS/SESSION-STATE all still say 75.

### 2.5 The "terse" arms that were not terse — ERROR

In `results/check-lh-ledger-replay`, `check-spec-csv-dialect` and
`check-cross-units-normalisation`, **every** run — including all `dsh:*-terse` rows —
records `"terse":false` (the prompt suffix was not applied; `run-experiment.mjs:414,432`
only appends it when `promptSuffix` is set). **[verified by reviewer: 14/14 terse:false in
the ledger matrix]** Three of the four hard-task matrices therefore present a terseness
*ablation* in which the terse arms ran the standard prompt — comparing an arm to itself.
Only the later `check-edge-glob-match` (and the GLM `glm-terse` matrix) records
`terse:true`. Also unresolved: REVIEW-FINDINGS §J2's observation that all 62
`dsh:ptc-terse` records in `ds-full` carry `terse:false` — i.e. the DeepSeek "terse" arms
in the full matrix were not terse either; FINDINGS never discloses which matrices actually
manipulated terseness.

### 2.6 The "15 tasks all three datasets share" is false against the repo's own tooling — ERROR

PRE-REG:179 / SESSION-STATE:66 claim a shared-15 fallback set. But `tools/ds-validity.mjs:39`
hardcodes a *different* "canonical 15" (overlapping the verified tasks-glm53 15 by only 6–7
tasks) and contains a task-id typo (`fetch-heavy-semver-range`, missing the final "s") that
caps its own coverage check at 14/15 forever. tasks-glm53's 15 are byte-identical to their
`tasks/` counterparts (good), but whichever list is authoritative, the pre-registered
fallback set does not exist as described.

---

## 3. Factual errors, confirmed against the repo's own evidence

### 3.1 The retracted price card is still published as fact in the paper spine

**[verified by reviewer: METHODS.md:141 prints `deepseek-v4.1-flash | 0.14 | 0.028 | 0.28`;
PRE-REGISTRATION.md:168 lists "DeepSeek V4.1 Flash (2.0)"]**

`_ev/deepseek-pricing.html:15` (captured 2026-09-28) gives off-peak **hit $0.003 / miss
$0.15 / out $0.60** → ratio 4.00, discount 50×. The correction is recorded in
PRE-REG §12.1, FINDINGS F20, and fixed in `tools/measure-gateway.mjs:166` and
`tools/rederive.mjs:18` — but **not** in: METHODS.md §5 (prints the retracted card as
"the providers' published rates"), PRE-REG §5's design table (same document as §12.1!),
notes/status/SESSION-STATE.md:70, notes/records/FIRST-RESULTS.md, notes/status/RESUME.md, `tools/glm-read.mjs:62`,
`tasks-hard/_tools/check-task.mjs:56`, `tools/mechanism.mjs:17`, `check-report.mjs:17`,
`power-real.mjs:15`, `power.mjs:7`, `analyze-results.mjs:23`, plus ~5 more satellite tools.
Consequences:
- **All hard-task costs (F15–F19) were computed with the retracted card and never
  re-derived** — F20's "every figure is re-derived by rederive.mjs" covers only four
  dataset-level rows. F18's flagship "5.9× inversion" divides a 1.61-scaled Haiku cost by
  an old-card DeepSeek cost.
- **The provider-selection rationale is numerically dead**: "Qwen at ~4.0 extends the
  ratio axis" (METHODS §9, FINDINGS F3, PENDING-RUNS) — Qwen's card is **3.13**
  (`measure-gateway.mjs:187`, PRE-REG §5), below GLM-Flash's 3.33 and far below DeepSeek's
  corrected 4.00. "MiMo 50–120× vs our providers' 5×" — DeepSeek's discount is already 50×;
  the stated reason for needing MiMo collapsed. F8's premise is equally stale.
- The **GLM price cards that "decide the headline" have no captured source anywhere**
  (PRE-REG §12.1 admits it; `rederive.mjs` marks both `UNCITED`; the Anthropic card is also
  UNCITED in the tool). The 3.14/3.33 ratios rest on no primary evidence in the repo.

### 3.2 PAPER.md's C1–C4 numbers contradict the repo's own measurements

**[verified by reviewer: the strings "37–44", "8,672", "8,538" exist only in PAPER.md and
in the prior review quoting it]**

- **C2 "8,672 vs 8,538 tokens, two sessions each side"** matches nothing. The repo's only
  prefix measurement is **~8,709 → ~9,670 (+11%)** (notes/records/EXECUTION.md:80-86, notes/literature/RESEARCH.md:705-708)
  — the opposite *direction*, and the direction is the entire claim ("the prefix does not
  shrink"; PAPER's pair shows a 1.5% shrink).
- **C1 "37–44%"** — the only composition share in the repo is **40.0%, one session**
  (notes/records/EXECUTION.md:96, notes/literature/RESEARCH.md:719). The endpoints 37 and 44 have no source. "~70–73%"
  containment vs the recorded 69.5% (single session) / ~70%.
- **"357 sessions, 26M+ tokens"** vs "356 local sessions" (EXECUTION:64, RESEARCH:688,
  GUIDE:241, TEST-PROTOCOL:40) vs "328 native sessions, 27.0M tokens" (EXECUTION:220).
  Three corpus sizes in paper-bound docs.
- **The whole corpus study is unreproducible from the repo**: the audit tools read
  `$DSH_HOME/sessions` (outside the repo) and no audit output is archived. PAPER §1's own
  bar — "artifacts someone else could rerun" — is not met for the claims it rates "solid".
- **Cost claims are wrong twice over**: "$0.028/M cache-heavy input" is the retracted card
  (true: $0.003); "a coding run is roughly $0.03–0.05" vs measured $0.008–0.015;
  "300 runs ~$10–15" (at measured rates: $2.40–4.50); "cross-harness ~$20–40" (the
  Anthropic leg alone cost $308.16 per the console figure the project itself uses).

### 3.3 Smaller hard errors (each independently evidenced)

| where | claim | evidence | severity |
|---|---|---|---|
| notes/records/FINDINGS.md:289 | "The instruction is eleven words" | the instruction (`conditions/arms.mjs:37`) has **15 words** | ERROR |
| notes/records/FINDINGS.md:686-693 | "+20% to +34% more requests, on both providers" | own table: GLM is +15.7%/+13.6%; the range holds only on DeepSeek | ERROR |
| notes/records/FINDINGS.md:498-508 | Haiku "five to nine times the cost" | own tables: per-arm ratios 0.72×–6.4× (ptc-terse is *cheaper* on Haiku) | ERROR |
| notes/records/FINDINGS.md:116 | "74% below dsh:native" | arithmetic gives **80.1%**; 74.2% is a different comparison | ERROR |
| notes/records/FINDINGS.md:569-571 | F7 "+1.1% (a wash)" | own table gives +0.12%; F20 says +0.3% — three numbers for one contrast | ERROR |
| notes/records/FINDINGS.md:42-45 | Headline "reverses… held over 227 runs" | F3 forbids "reverses" ("overreading a null"); "227" has no provenance anywhere | ERROR |
| notes/records/FINDINGS.md:577-585 | "1.4–2.3×" and "782 and 775 against 546 and 564" | own tables: 1.54/1.63/2.32 and 782/785/546 | ERROR |
| notes/literature/RESEARCH.md:636, notes/plans/PLAN.md:303, routing-report:212 | advisor "1 consultation in 300 tasks, 61.7 vs 62.7" | cited page: 61.7 vs **68.7** (a 7-point gap, not 1) | ERROR |
| notes/literature/RESEARCH.md:505, routing-report §3.3 | "1 user message beat 3 user messages" | cited LiteLLM table: for the same classifier 3 messages **beat** 1 (66.7→76.2%); the claim mixes two different classifiers | ERROR |
| notes/literature/RESEARCH.md:477, notes/plans/PLAN.md:170 | router arms "40–58%" switch rate | cited table: 46–58% | ERROR |
| routing-report §1.4 | "42.3% vs 51.3% (a 21.3% relative drop)" | (51.3−42.3)/51.3 = **17.5%** | ERROR |
| notes/literature/RESEARCH.md:701, notes/records/EXECUTION.md:76 | "163 tool sub-calls; mix: 52+24+23+19+15+10" | sums to **143** | ERROR |
| notes/records/CROSS-HARNESS.md:96,150 | "OpenCode ships ~40 tools" | all 1,720 opencode records in `results/gateway.jsonl` declare **≤10** | ERROR |
| notes/status/RUN-ALERT.md:3-4 | "Credit failures bill nothing — a 4xx costs no money" | FINDINGS F27: **~$117 lost to Haiku credit failures**; runs bill tens of seconds of requests before dying | ERROR |
| notes/records/FIRST-RESULTS.md:27-43 | "Cheapest billed: DSH PTC; OpenCode drops to third; the ranking inverts" | declared false by PRE-REG §12.2 / FINDINGS F20 (analyzer omitted the output term); no retraction banner — and this is the doc a new session is told to read first | ERROR |
| METHODS.md:60-61, notes/records/TASKS.md:54,87 | "hidden test suite" | batch-1 grading runs the fixture's **own visible, editable** `test/` dir in the agent's workdir (`run-experiment.mjs:316,419`); nothing restores tests before grading — a run that weakens the tests grades clean. tasks-hard's grader is genuinely hidden; batch 1 is not | ERROR |
| METHODS.md:48 | Cline invoked with `-P gateway` | `tools/harnesses.mjs:153-156`: cline rejects 'gateway' outright; the working path is `openai-compatible` + mandatory `cline auth` | ERROR |
| METHODS.md:211-213 | gateway "records the model identifier as returned by the provider… distinguishes a snapshot change" | main passthrough logs the **requested** model (`measure-gateway.mjs:834`); only the Responses branch reads `resp.model`; `results/manifest.json:299` repeats the false claim | ERROR |
| METHODS.md:33, arms.mjs:18, PAPER.md:29 | "25 tools" | 17,418 archived dsh requests say **24**, zero say 25 (PRE-REG H3 and FINDINGS F12 agree with 24; notes/literature/RESEARCH.md says ~21). The study's primary factor is stated as 21/24/25 depending on the document | MISMATCH |
| METHODS.md:60,63-69 | "30 tasks" | 31 task.json, manifest `tasks: 31`, matrices ran 31; milestone-4 README titled "30-task" then computes 31×5×2=310 | MISMATCH |
| PAPER.md:99, notes/records/CROSS-HARNESS.md:153, notes/plans/JOURNAL-PLAN.md:15 | "DSH is ours" / "we built DSH" | PRE-REGISTRATION.md:264, METHODS.md:261: "**The authors did not develop DSH and have no affiliation with it**". **[verified by reviewer]** Two mutually exclusive claims, the first thing a referee checks | MISMATCH |
| PRE-REG:99, notes/literature/RELATED-WORK.md:645 | "two providers with near-identical ratios (3.14, 3.33)" | GLM-5.3 and GLM-5.3-Flash are **two models on one provider** (z.ai) — FINDINGS F7 itself says so | ERROR |
| notes/literature/RELATED-WORK.md:473,479,535 | "demonstrates a ranking reversal between two providers", "DeepSeek (ratio 2.0), code-mode 22.8% cheaper" | FINDINGS: "State it as 'does not transfer', **not 'reverses**'"; F20: ratio 4.00, PTC −3.3% — the provider's own pricing page sat in `_ev/` *before* the related-work pass was written | ERROR |
| notes/literature/RELATED-WORK.md:577,661 | "cached input discounted ~10× … at every current provider" | DeepSeek is **50×**; understates the authors' own rebuttal of [7]'s 40× | ERROR |
| notes/literature/RELATED-WORK.md:299-303 [47] | OTel metric `gen_ai.client.inference.usage.cache_read.input_tokens` quoted as verbatim standards text | no public source contains that metric name; real conventions expose the *attribute* `gen_ai.usage.cache_read.input_tokens` — a fabricated-looking quote attached to a real standard | UNVERIFIABLE (suspect) |
| notes/records/UPGRADE.md:40,91-96 | rollback via tag `pre-upgrade` + `snapshots\pre-upgrade-0.1.5-alpha.1\agent-presets\*` | **the tag does not exist** (`[verified by reviewer]` — no ref, no packed-refs) and the snapshot is named `pre-upgrade/` and contains only hashes, not the preset files: the advertised safety net was illusory | ERROR |
| notes/handovers/HARNESS-ONBOARDING.md:59-60 | "`grep -c openhands results/gateway.jsonl` returns 0 by design… do not read that as a failure" | now returns **771** records — the instruction teaches readers to disregard real, present evidence | STALE |
| notes/records/DECISION-LAYER.md:3,9,117 | "there is no decision model. None was built… routing/classification/decision logic in any file: none" | `router/` contains a complete tested engine (26 test blocks); the same file's §5 instructs editing `router/router-core.mjs`. Only "never run live" survives | ERROR |
| router/README.md:20,76 | D4 "when to escalate", `escalate` ledger kind | `router-plugin.mjs:151-159`: "NOT wired here… v1 ships band + tier only" — no code path emits `escalate`; the emitted `cache-risk` kind is undocumented; the cache-safety guard compares null to null and can never fire | MISMATCH |
| notes/records/TEST-PROTOCOL.md:251, notes/records/GUIDE.md:116 Step 8 | preset selection `--patch conditions/<c>.yml` "confirmed viable"; copy `conditions\ptc-opt.yml` | `conditions/arms.mjs:4-14`: "PRESETS DO NOT WORK IN A HEADLESS PROFILE"; `ptc-opt.yml` does not exist — the step is unexecutable | ERROR |
| notes/records/EXECUTION.md:210 vs :226 | presets worth "3–5%" vs "~7–8%" on a session | both totals survive in one section, unreconciled | MISMATCH |
| notes/status/RESUME.md:12 vs README.md:103 vs notes/records/GUIDE.md:7,177,269 | gateway self-test "15/15" vs "10/10" vs "10/10 and 15 checks in one file" | `tools/test-gateway.mjs` has **16** `ck()` checks | STALE |
| README.md:97, router/README.md:11, notes/records/GUIDE.md:7,43,266 | router "13 offline tests" | `router-core.test.mjs` has **15** `test()` blocks (+4 plugin +7 integration = 26) | STALE |
| README.md:95 | RUNBOOK "11 sections, 34 steps" | 12 sections / 35 steps | NOTE |
| README.md:105 | "one preset-selecting patch per condition, one example task" | shipped.yml = `[]`; no preset-selecting patch exists; 31 task dirs | STALE |
| notes/prompts/TASK-PROMPT.md:27-35 | "Create 30 task directories: 6+8+6+6+6" | sums to **32**; built suite is 7/7/6/5/5=30 | ERROR |
| tasks-hard/README.md:97 | gate "10–25 files, 400–1,500 lines" | actual gate is 9–30 files, 350–1,800 lines (`verify-task.mjs:106-109`) and RESULTS.md's "24 ok" includes fixtures outside the README's bounds | MISMATCH |
| PRE-REG §1 | DeepSeek matrix "13 tasks" | the archive is 31 tasks; "13" reconciles only as tasks *touched before credit death* (12 full + 1 partial), while §7 says DeepSeek "needs the 16 tasks it does not yet cover" (implies 15) | MISMATCH |
| notes/plans/RUN-PLAN.md:100-132 | Anthropic pilot cost "$0.0637", "~$167 or ~$560" grid | the model-alias bug priced every Anthropic record at DeepSeek rates (≈7.4× understated; the six pilot runs really cost ≈$0.48); F27 later asserts a **different** correction (1.611×) — the two factors are unreconciled anywhere, and every Anthropic dollar in the study inherits the cloud | ERROR |

### 3.4 Stale status presented as current (the whole status layer)

- **PAPER.md is a pre-Phase-2 snapshot**: C5 "not run — zero data", C6 "gateway never hit
  the real API", the 15-task suite "the real bottleneck", all stages "not started",
  "retry the router session — everything downstream is blocked", "$0.028/M". The repo now
  holds ~3,000 Phase-2 runs across 6+ providers, 55 tasks, and per-request cache fields in
  every gateway log. Its "strong-paper claim" (cache hit rate predicts cost better than
  model choice) was **tested and failed** (F2: cache explains −5%; F4 retracted) — PAPER
  was never updated.
- **FINDINGS F18 "Sonnet 5.5: running now"** — `results/f18-sonnet`: 17 graded runs,
  **0/17 solved** (2026-10-01). The decisive branch resolved to the outcome FINDINGS
  itself calls "much the stronger claim"; the register still presents it as pending.
  **[verified by reviewer-level data check]**
- **F3 "Qwen is the decisive test… still missing"** — `results/qwen-full`: 615 runs,
  608 solved, collected 09-30. Never analyzed.
- **haiku-full has 106 unsolved runs (16%) on batch 1** — the largest batch-1 quality
  separation in the study — with **no FINDINGS entry at all**, while F5's "every arm
  solves every task" framing stands.
- **F25's celebrated projections** ("Haiku $7.10 for 620 runs", "~$22 not $178") were
  wrong by ~30–50× (actual ~$366/~$517; console $308.16) — no entry corrects it, and the
  pre-registered **$300 cost cap** was exceeded with no document acknowledging the breach.
- **METHODS.md** is stale from its first line ("written while the GLM-5.3-Flash matrix
  runs" — that matrix finished two milestones earlier), presents the pre-F20 thesis as the
  contribution (§8b "cost rankings are provider-contingent" — retracted), plans as future
  work things already measured (Qwen, Anthropic, OpenAI, Goose, OpenHands, Cline —
  thousands of archived records), and describes a 5-arm 2×2 with **no terseness factor,
  no H1/H2, no output-share definition, no aggregation or exclusion rules** — the methods
  do not describe the study that was pre-registered or run.
- **notes/records/TEST-PROTOCOL.md** is a different, older design (4 conditions × 12 tasks × 5 seeds,
  policy as a factor, cost_cold Wilcoxon, "results/usage.jsonl" that never existed,
  the retracted 8.1% folding figure, "DSH is 0.1.5-alpha") and contradicts the frozen
  pre-registration; the two files never mention each other. README still presents
  TEST-PROTOCOL as "the experimental design".
- **notes/records/CROSS-HARNESS.md §2**: "none of these five is installed or executed" — four of the
  five are verified end-to-end with thousands of attributed records; Aider is "included
  deliberately" here but **excluded** by the pre-registration, HARNESS-PROMPT and
  HARNESS-ONBOARDING (the exclusion itself is well-evidenced: its smoke run asked the user
  to paste the file).
- **notes/records/GUIDE.md**: "5 harnesses not installed", "end-to-end not done", impossible Step 8,
  "H2" meaning a *different* hypothesis than the pre-registration's H2 (router
  cache-repricing vs terseness) — the paper's central hypothesis label is ambiguous.
- **notes/plans/PENDING-RUNS.md** ("Running now: GLM-5.3-Flash ~$2.71" — done at $2.49; "GLM-5.3
  NEXT" — done; "Cline not yet working" — verified end-to-end; "Goose/OpenHands not
  installed" — verified end-to-end), **notes/status/RESUME.md** ("Task suite 1 of ~30. The only
  blocker"; the retracted "~11-point cache gap"; "357 sessions"), **notes/status/SESSION-STATE.md**
  (every "known gap" listed is closed; "mechanically verified, everything else clean" —
  while its audit tool skips the sweep and never audits the partial matrix),
  **notes/plans/JOURNAL-PLAN.md** (design: 40 tasks × 5 seeds × 6 arms = 1,200 runs/model vs the bound
  31×2; mechanism it proposes testing is dead), **notes/plans/RUN-PLAN.md** ("OPENAI IS NOT READY" —
  `results/luna-full` exists), **notes/records/UPGRADE.md** (checklist expects 15/15 gateway checks —
  16 exist; "~25 declared tools" — see §3.3).

---

## 4. The dismissal audit (every "we considered X but rejected it" in writing)

The user asked specifically for these. Verdicts:

**Dismissals that HOLD UP** (reasoning corroborated by repo evidence):
- **Aider excluded** (PRE-REG §9 "pair programmer, not an autonomous discovery agent") —
  its smoke run literally asked the user to paste the file. Sound. But notes/records/CROSS-HARNESS.md
  and `tools/harnesses.mjs` `STUDY_SET` still list it as a study arm — the dismissal was
  not propagated.
- **"Never grade with an LLM"** — grading is `node --test` everywhere; no judge exists.
- **Routing sequenced last** (81% GSM8K vs 21% SWE-bench Lite; ≥0.85/≤2s bar unmet) —
  the numbers verify against the cited sources (arXiv:2604.02367 confirmed).
- **Crush (FSL-1.1 license) and Roo Code (shut down 2026-05-15) avoided as fork bases** —
  externally verified.
- **Policy (-opt) arms demoted** (0.8% effect, 6,257 blocks needed) — the power analysis
  checks out; but F27 records the arms were run on every matrix anyway (~$62) "against a
  written finding", which §7 glosses over.
- **tasks-hard dismissals** (no visible-case padding; binary outcomes saturate; hard core
  not more cases) — all consistent with the data.
- **F14's dismissal of "stronger model underperforms"** as a billing artefact — verified:
  all 6 failures carry the 1113/Insufficient-balance signature.

**Dismissals that are WEAK or FALSE as stated:**
1. **"Capping is ineffective and containment is the lever"** (PAPER.md C3). The project's
   own modeling (notes/records/EXECUTION.md:240): a 16,000-char fetch cap saves 21.9% of fetch volume ≈
   ~17% of tool-result volume — **larger than the 14.8% folding gain the project pursued
   and staged**. "Ineffective" is shown only for the 40k cap (0.8%). The real argument is
   quality ("ruining the tail"), never quantified; and the supporting figures are
   "modelled, not measured" while PAPER rates the claim "solid, actionable… measured".
2. **The fork dismissal** (notes/plans/PLAN.md §1: forking OpenCode/Cline "would mean re-implementing
   a code-execution loop, compaction, spill, token accounting, subagent isolation, a mode
   system, a plugin loader"). The repo's own survey says OpenCode **already ships** modes,
   compaction, truncation, subagent isolation, cost accounting, a plugin API and an
   in-tree CodeMode ("~2/3 of your target, ≈1 focused change"); Cline ships most of the
   list too. The conclusion (compose) may be right; the stated reason misstates the two
   nearest alternatives.
3. **The "whitespace" claim** ("nothing ships standard + PTC + research + a routing
   model") silently omits `dsh-omnipotent-preset` — documented in notes/literature/RESEARCH.md §6 as
   "the clearest available example of deterministic-first classification" — whose
   `classifyTask()` (react-regex vs spec-regex, WEAK on ties) the repo's
   `router/router-core.mjs:49-76` visibly reimplements. Neither PLAN, router/README nor
   DECISION-LAYER acknowledges it; the buy-vs-build table evaluates everything except the
   closest prior art.
4. **"Routing is a chat-shaped lever"** — directionally evidenced but argued one-sidedly:
   the same Not Diamond post notes/literature/RESEARCH.md quotes elsewhere reports cache-aware routing
   "Pareto-dominant on real-world coding tasks… 20–80% cost reduction", and LiteLLM's own
   session-affinity mitigation for the cache tax — both unengaged. The 29/294 study cited
   as "the strongest evidence for task-type routing" carries an explicit **no-holdout**
   caveat ("fitted and scored on the same 294 questions") that neither notes/literature/RESEARCH.md nor
   notes/plans/PLAN.md mentions.
5. **"Qwen furthest along the ratio axis / MiMo deferred"** (PENDING-RUNS, METHODS §9) —
   rests on the retracted card; on corrected numbers the axis-varying justification
   evaporates (§3.1).
6. **[62] Chen et al. (pricing reversal) kept at arm's length** via a "model prices ≠
   provider price structure" bookkeeping boundary — while the quoted mechanism
   (output-token volume × price card → cost-ranking reversal) is the paper's own causal
   shape; post-F20 the resemblance is stronger, not weaker.
7. **CAPC's per-run UUID (RUN_NONCE)** set aside as "different carrier, different
   purpose" — leaving C4's novelty resting on *where an ID string is parked* (credential
   vs content); the doc half-concedes this but the stated reason doesn't neutralize it.
8. **"A train-before-test regime nobody uses for coding agents"** ([6]) — an unevidenced
   universal; the cited paper recommends making it a *default* benchmarking component.
9. **"PRESETS DO NOT WORK IN A HEADLESS PROFILE"** (arms.mjs) — probably true, but no
   log/artifact preserves the warning, and TEST-PROTOCOL §10 still claims the opposite
   ("confirmed viable"). An unevidenced claim silently superseding a "confirmed" one.
10. **§5's "pro-cached ≈ flash-uncached" parity** (notes/literature/RESEARCH.md) — false under the official
    card the same file cites (3.4–13.6× apart); the design conclusion survives, the stated
    reason does not.
11. **"LLM-as-judge is not reproducible"** (METHODS §3) — asserted, never evidenced;
    temperature-0 logged judges exist. Plausible, but a claim of fact offered without
    evidence in a document that demands evidence elsewhere.
12. **notes/records/UPGRADE.md:13 "a newer version is faster or better — it is not, for this study"** —
    asserted with no evidence; the upgrade in fact broke the gateway protocol and cost 20
    runs (FINDINGS:744, milestone-3 README).

---

## 5. Unverifiable claims stated as fact (no evidence anywhere in the repo)

- **The entire Phase-1 corpus evidence base** (357/356 sessions, 26M/27M tokens, 37–44%,
  70–73%, 76%, 9,983 fetches, median 1,282, 14.8%/6,163, 8,672/8,538): inputs live outside
  the repo, no audit output archived. Internally consistent in places; not re-derivable.
- **`_ev/` "saved primary sources behind every quantitative claim — re-verify without
  re-fetching" (README.md:106)**: false on the load-bearing cases. `_ev/` (29 files; one
  auditor counted 28 text files + a PNG) lacks: the Anthropic "optimizing for cost and
  intelligence" page behind findings 1–3 (2.7–5.3×, 84%/94%, $0.59→$4.24, 502 tools,
  1,862-row CSV), **all five LiteLLM posts** (81%/21%, 89%→78–83%), the PTC docs page
  (~8%), the Apidog card, both Cloudflare posts, every arXiv paper, the z.ai price card,
  and the CLM/Jev sources. Nearly every key number had to be re-fetched live to verify —
  the exact failure the sentence claims to prevent. (The numbers themselves mostly
  *survived* live re-verification — see §6.)
- **F27's "Anthropic's console reports $308.16"** — a hardcoded constant in three tools;
  no console capture exists. The 1.611× "every per-run figure needs scaling" generalizes
  one provider's console reconciliation to all providers; the tool's own reconcile report
  says three of four categories match within 1% (the shortfall is uncached-input-only), so
  a flat 1.61 is wrong in shape as well as provenance.
- **All 2026-dated prior art that the novelty claim rests on** ([7] "40×", [8] "105 pairs",
  [9] "7.8×, 6-of-9 reversals", [10], [35], [38], [39], etc.) — no `_ev/` copies, and the
  arXiv IDs resolve to nothing outside the repo's own timeline. The doc's protocol
  ("every Quotes: line is verbatim from a page we fetched") is itself unverifiable.
- **CLM/Jev decision-model table** (BFCL v4 95.2/99.2, 75 MB head, 16.5–80 ms, 31/38) —
  no sources captured; broadly corroborated by secondary reporting, cells unverifiable.
- **Survey metadata** (star counts, push dates, LOC, Kilo Code's odd LICENSE text) — the
  shallow clones and metadata dumps were not retained.
- **"Per-hop classifier compression cut classifier cost another 32%"** — not in any of the
  five LiteLLM pages.
- **Claude Code truncation budgets** (30K/2K/10K/128K/5 GB/Glob-100) — in no cited or
  saved source. The `allowed_callers` "not a hard API-level block / do not rely on it as a
  security boundary" **verbatim vendor quote** appears on neither cited vendor page (and
  the docs in fact show a hard 400 enforcement path — the claim is suspect, not just
  unsourced).
- **PTC "billing quirk: programmatic results do not count toward input/output tokens"** —
  the cited page says context exclusion, not billing exemption.
- **OpenRouter "provider sticky routing to keep caches warm"** (notes/status/RESUME.md) — no source
  anywhere, stated as vendor fact.
- **"F20's re-derived tables"** — no analysis output archived; rederive.mjs is anchored to
  a mislabeled 10-record "sweep" and the superseded partial matrix, so the study's "most
  reproducible result" cannot be checked from the repo.
- **JOURNAL-PLAN's three "testable predictions"** — no recorded test anywhere.
- **"Four bugs found so far, three of which would have produced a false negative"
  (PAPER.md)** — the repo's own registers document more than four instrument bugs; no
  document enumerates which four are meant.

---

## 6. What verified TRUE (so the paper can lean on it)

Fairness requires listing what survived hostile checking:

- **All vendor/literature numbers in README's findings list** (Anthropic 2.7–5.3×, 84%/94%
  cache medians, $0.59→$4.24, 502 tools −45%, 1,862-row CSV 6/25 vs 25/25, τ²-bench ~8%,
  GSM8K 81%/SWE-bench 21%, ≥0.85/≤2 s bar, 30–50-tool threshold, Manus 100:1, Cloudflare
  1.17M→1,000) — verified verbatim against live primary sources. The pre-2026 scholarship
  in RELATED-WORK (~25 quote-level checks) is genuinely excellent.
- **The corrected DeepSeek card** matches `_ev/deepseek-pricing.html` exactly (hit 9.3×
  too high, output 2.1× too low, ratio 4.00, discount 50× — all arithmetic confirmed).
- **Phase-2 archive counts**: GLM-Flash 310 ✓, glm-terse 124/124 ✓, GLM-5.3 69/75 with
  exactly six 1113 credit failures ✓, pilot 6/6 ✓, probe 0/6 ✓, ds-full 619/620 with the
  single genuine opencode failure ✓, ds-full-partial's 176-valid/258-lost reconciles under
  the strict provider-error criterion ✓, cline/goose/openhands 62-each extension ✓.
- **HARNESS-ONBOARDING's verdict figures reproduce from the logs to the cent** (cline
  $0.004608, openhands $0.008005, goose $0.001487, sweagent $0.001156736).
- **The gateway's enforcement/attribution claims** (synthetic keys, force-model/effort,
  exempt harnesses, `/__stats`, Responses bridge) match the code and the archived records.
- **tasks-hard apparatus**: 24 tasks, 588 hidden cases (exact), genuinely hidden grader,
  no LLM judging; the spec-csv-dialect and cross-units-normalisation RESULTS tables match
  the archives; tasks-glm53's 15 are byte-identical to their tasks/ counterparts.
- **The router core** exists, is tested (26 test blocks), and matches its design doc where
  built; the "never run live" disclosure is honest.
- **F22's terseness result** (−29%/−32% cost, −42.8%/−46.9% output, all solved) is
  structurally consistent with the glm-terse archive — the study's best practical result.
- **The pre-registration's honesty machinery**: the v1–v3 freeze-failure table matches the
  reflog exactly; the `prereg-v4` tag exists; the amendment log exists. (Caveats: the tag
  target's content is unverifiable read-only — the tag SHA appears in no reflog, consistent
  with an annotated tag; `results/` and `_ev/` are gitignored, so **the freeze covers
  documents only — none of the underlying data is under version control at all**.)
- **The two big self-corrections** (8.1%→14.8% filter bug; F4/F14 retractions) are real
  and documented — the practice is good; the propagation is what fails.

---

## 7. Cross-cutting structural problems

1. **Three colliding claim registers**: RELATED-WORK's C1–C4, PAPER.md's *different*
   C1–C6, FINDINGS' F-numbers; "C2" means different claims in different docs; "H2" names
   two different hypotheses (router cache-repricing vs terseness); "D4" names two
   different router decisions; "F15 ablation" in arms.mjs points at the wrong finding
   (terseness is F21/F22).
2. **No design of record**: TEST-PROTOCOL (4×12×5=240) vs PAPER (4×15×5=300) vs GUIDE
   (6×15×5=450) vs JOURNAL-PLAN (40×5×6=1,200/model) vs the frozen PRE-REG (31 tasks, 2
   seeds, 5–7 arms) vs what ran (10 arms × 31 × 2 = 620/model). The prior review flagged
   this; its recommended fix was never applied.
3. **Count chaos a referee will falsify from the repo**: 30 vs 31 tasks; 24 vs 25 vs ~21
   tools; 4 vs 5 vs 6 vs 7 arms; 13 vs 15 vs 31 matrix tasks; 356 vs 357 vs 328 sessions;
   10/10 vs 15/15 vs 16 gateway checks; 13 vs 15 vs 26 router tests; 12–25 vs 18–25 test
   cases; 10–25/400–1500 vs 9–30/350–1800 fixture gates.
4. **The randomization is weaker than stated**: `run-experiment.mjs:102` shuffles arms by
   `seed*7919 + task.length` — every task with an equal-length name shares one arm order
   per seed; combined with admitted concurrent execution, the anti-cache-confounding claim
   is overstated (and TEST-PROTOCOL §3's "new permutation per block" is not implemented).
5. **The gateway is not the passive observer METHODS §4 presents**: it injects Anthropic
   `cache_control` breakpoints (on by default — moving billed cost ~3.4× and hit rates
   0%→25% in the project's own A/B), injects `thinking.budget_tokens`, strips fields,
   renames `max_tokens`. The code itself comments "A gateway that improves the request is
   measuring itself." This directly manipulates the cache hit/miss split the paper calls
   its methodological contribution — undisclosed in METHODS §4/§10.
6. **Provenance machinery broken where it matters**: no post-upgrade snapshot exists (all
   four are 0.1.5-alpha.1); v1/v2 snapshot manifests omit plugin files their dirs contain;
   the pre-upgrade snapshot bakes a user-specific absolute `ledgerPath`; snapshot hashes
   are truncated to 64 bits; `results/manifest.json` predates the matrices (no
   DSH_TOOLS_MODE, models missing) and records `repo.dirty: true`; `results/` and `_ev/`
   are gitignored; run records still count ungraded runs as solved
   (`run-experiment.mjs:434` `solved = status===0 && testPassed !== false`), and
   `analyze-results.mjs` — the tool TEST-PROTOCOL/GUIDE still tell readers to run — is
   unfixed in every particular the prior review listed (input-only cost, `1<<n` Wilcoxon
   degenerate at n=31, solved-only aggregation), while the runner still prints it as the
   next step.
7. **Duplicated datasets with diverging descriptions** (`results/glm-flash` =
   `data/milestone-4`; `results/runs.jsonl` = milestone-3's 30) and milestone READMEs that
   still lead with superseded numbers (milestone-4: "THE RESULT THIS DATASET EXISTS FOR";
   milestone-3: the retracted "~10-point separation") — milestone-1 never got its
   pre-upgrade/do-not-pool marker.
8. **Docs that teach readers to ignore evidence**: HARNESS-ONBOARDING's "grep returns 0 by
   design" (now 771); RUN-ALERT's "credit failures bill nothing" (vs $117); SESSION-STATE's
   "mechanically verified, everything else clean" (audit skips the sweep and the partial
   matrix, and its retraction check matches only one literal string).

---

## 8. What must happen before any paper is written from this repo

In order:

1. **Resolve the timestamp inversion in writing** (§2.1): either document the re-runs
   (when, why, what changed) or retract every statistic committed 09-30 14:57Z–16:21Z and
   re-derive from the archive. Fix §12's timezone error and amendment #10. Without this,
   the pre-registration's honesty story collapses under its own evidence.
2. **Re-issue the H1–H4 verdicts by the pre-registered procedures** (fit the models,
   report b1 + CI; run the Wilcoxon; label H2 "inconclusive" per the rule or amend the
   rule in the open; make H4 falsifiable or downgrade it to exploratory).
3. **Fix the exclusion implementation** in `rederive.mjs`, `h2-test.mjs` and the satellite
   tools to §9's "unsolved AND provider error string" rule; re-run every affected number
   (F20–F23); disclose which matrices actually applied the terse manipulation (§2.5).
4. **Propagate the price-card correction** to METHODS §5, PRE-REG §5, SESSION-STATE,
   FIRST-RESULTS (add a retraction banner), RESUME, tasks-hard tooling, and the ~10
   satellite tools; re-derive F15–F19; capture the z.ai and Anthropic price cards into
   `_ev/`; reconcile the 7.43× vs 1.611× Anthropic corrections or stop printing Anthropic
   dollars.
5. **One claim register, one design of record**: pick the frozen pre-registration + a
   rewritten METHODS; mark TEST-PROTOCOL, PAPER, GUIDE, JOURNAL-PLAN, CROSS-HARNESS,
   DECISION-LAYER as superseded (or rewrite them); fix the C1–C6/F-number/H2 collisions;
   resolve the COI contradiction (which is it — "ours" or "not developed by the authors"?);
   resolve the Aider in/out contradiction.
6. **Update or delete the phantom/unsupported results**: the 150-run sweep (find the
   records or retract F1/F2's denominators), tasks-hard/RESULTS.md's 21-run ledger table,
   the "227 runs" headline, the "8,672 vs 8,538" prefix pair, "37–44%", "357 sessions";
   write entries for the unreported data (f18-sonnet 0/17, qwen-full, haiku-full's 106
   unsolved, the 620-run matrix, glm53's 35 extra runs).
7. **Archive the evidence the paper will need**: audit outputs for C1–C4, the rederive
   outputs, the console reconciliation, and every `_ev/` source the headline numbers
   cite — then make README's "re-verify without re-fetching" sentence true or delete it.
8. **Fix the small falsifiables**: word counts, test counts, section/step counts, task
   counts, tool counts, the 21.3%/17.5% arithmetic, the 61.7-vs-68.7 advisor pair, the
   inverted LiteLLM context-window claim, "OpenCode ~40 tools", the OTel quote, the
   `allowed_callers` quote — these are exactly the sentences a referee checks first.

---

*Scope note: this review checked documents against the repo. External vendor/literature
claims were verified live only where flagged; claims marked UNVERIFIABLE mean "no evidence
in the repo", not necessarily "false". The prior internal review (notes/reviews/REVIEW-FINDINGS.md) was
itself spot-checked: its major findings were almost all correct, most remain unfixed in
the documents, and its one exploratory sign-computation (§J2) turned out wrong — it
computed H2's sign on DeepSeek records it had itself just proven were not terse.*
