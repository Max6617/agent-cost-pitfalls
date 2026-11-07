# HANDOVER-2026-10-04-B — the hard-suite pilot is COMPLETE, and four defects were fixed to get it there

Read after notes/handovers/HANDOVER-2026-10-04.md (the reboot handover, which is what this session started from).
Everything below was measured in this repository today. Where a number is quoted it was re-derived
in this session, and where a claim is not verifiable on this machine it says so.

## 0. THE HEADLINE

**The hard-suite pilot finished: 240/240 cells, 178 solved (74.2%), 62 unsolved, one retried cell —
and the retry SOLVED.** The cell the reboot killed this morning would have been published as a
failure without the rule added first thing today; with it, the hard suite reads 178/240 instead of
177/240. That is one machine shutdown that did not become a model failure.

The paper's analysis also moved: **the filed mixed model now exists and is fitted** (H1, H3, H4 with a
task random intercept), every verdict is unchanged, and a **new disagreement** about the execution-slot
confound withdraws the paper's "magnitudes are inflated by roughly a factor of two" claim until an
author decides which correction is right.

Four defects were found and fixed, three of them fatal to the pipeline:

| # | defect | commit |
|---|---|---|
| 1 | a reboot-killed run classified as "unexplained" — `--resume` skipped it as COMPLETE | `74556f1` |
| 2 | `--plan hard` without a prefix resolved into the signed-off `results/ds-full` matrix | `03d4fa6` |
| 3 | the silence watchdog seeded its clock from a FILE'S AGE, killing every resumed matrix ~15 s in | `997ae84` |
| 4 | the gateway rule took a boolean whose name was the opposite of its body, killing a healthy matrix at 5 min | `625d26d` |
| 5 | the sign-off counted records as cells: `241/240 cells`, `-1 cells are simply absent` | `71c4a0c` |

Defects 3 and 4 cost three failed resume attempts (about **$2.4** in preflight+pilot cycles) and two
hours of wall clock before they were understood. Both were the same shape: **a watchdog inferring
"stuck" from evidence that was stale before the run began.**

## 1. STATE OF THE REPO

```
HEAD            71c4a0c   working tree clean except findings/ (not ours - see section 5)
tests           159 passing   (node --test "tools/*.test.mjs")
artifact        node tools/artifact.mjs --verify   -> exit 0, 28 files, manifest 2026-10-04T08:11:15.632Z
backup          node tools/backup-results.mjs --verify -> exit 0 (68 source files, 69 mirrored)
witness files   analysis/panel-analysis.json 02b2c4e2...  analysis/hypotheses.json bd34e8f7...  UNCHANGED
pilot           results/hardpilot-ds-full/runs.jsonl  241 records, 240 cells, 178 solved
balance         remaining balance omitted
```

Commits this session, oldest first: `74556f1` the OS-terminated-run rule · `03d4fa6` the output-directory
ownership guard · `c037c0a` the pilot at the reboot boundary (127 cells) · `43568be` the mixed model ·
`039ecb7` the startup-death incident · `997ae84` the silence clock · `625d26d` the gateway polarity ·
`67a5c7b` the completed pilot (written by the runner itself) · `71c4a0c` the sign-off cell counts.

## 2. WHAT IS DONE

### 2.1 An OS-terminated run is a loss, not a model failure — `74556f1`, PRE-REGISTRATION §12.9 (amendment 22)

The reboot wrote one cell with `exitCode 1073807364` (0x40010004, `DBG_TERMINATE_PROCESS`), empty stdout,
96 s in. `classifyRun` returned "unexplained" — the one bucket a paper may read as a model failure — and
`--resume` treats a non-infrastructure run as COMPLETE, so it would have been skipped and counted.
Rule 9 excludes "any infrastructure error" but reads only TEXT, and a process killed from outside writes
no error text. `tools/exclusions.mjs` now decides it structurally (0x40010004, 0xC000013A), guards hold
(solved wins; exit 1 and timeouts unchanged), and the effect is disclosed: **1 record in 3 858 across 9
matrices**, asserted by a REAL DATA test. Pre-declared before the cell was re-run.

**It paid off immediately: the retried cell SOLVED.**

### 2.2 A matrix output directory is owned by the plan that created it — `03d4fa6`

`--plan hard` resolved through the batch-1 registry into `results/ds-full`, and `--resume` would have
merged 240 hard-suite cells into the signed-off matrix. `tools/outdir-guard.mjs` refuses, before any
stage runs (so `--dry-run` catches it free), by asking the directory which plan owns it:

```
node tools/collect.mjs --plan hard --providers deepseek --max-cost 20 --dry-run
  REFUSING TO START: results/ds-full (ds-full) is the output of plan "batch1" (matrix cmuquohyu-deepseek,
  620 cells, launched 2026-10-02T11:02:45.852Z), and this run is plan "hard" (240 cells). ...
  add --name-prefix    [exit 2]
```

The handover's "do not launch a hard matrix without the prefix" is now enforced rather than remembered.

### 2.3 The filed mixed model, fitted — `43568be`

`PRE-REGISTRATION.md` files H1 and H3 as `y = b0 + b1*x + u_task + e`; until today the executed analysis
approximated it with pooled OLS (no task term) and a within-task demeaned OLS, and never estimated
`s_u`. New `tools/mixed-effects.mjs` (REML, one random intercept), tested against a dense reference and
the shipped data; driver `tools/mixed-effects-hypotheses.mjs`; record `notes/records/MIXED-EFFECTS-2026-10-04.md`.

| | filed | mixed fit | `s_u` | ICC | verdict |
|---|---|---|---|---|---|
| H1 | +0.00467 [-0.00551, +0.01568] | **+0.00467** [-0.00699, +0.01533] | **0.0000** | 0.000 | INCONCLUSIVE, unchanged |
| H3 | +2.228 [+1.234, +3.328] | **+2.2285** [+1.2312, +3.3065] | 3.085 | 0.134 | SUPPORTED, unchanged |
| H4 | bC +0.11157 [+0.06205, +0.17271] | bC **+0.10285** [+0.05489, +0.16952] | **0.0000** | 0.000 | REFUTED, unchanged |

For H1 and H4 the task variance is estimated **at the boundary**, so the paper's "paired tests ignore
task heterogeneity" is measurably moot there. H3 has real heterogeneity and keeps its verdict.

**The open disagreement.** `cost_billed ~ mode + slot + (1|task)` per model gives Haiku **+52.97%**
[+35.11, +70.83] against a raw +53.84% and PAPER's reweighted **+25.41%**. The regression adjustment
moves every contrast by ~1 pp; the reweighting halves them. The reweighting gives pooled slot weights
to cells holding one or two runs (Haiku's `dsh:ptc` occupies slot 5 ONCE in 62 blocks), so a single
observation carries ~3.5x its natural weight. PAPER §3.1, §3.7, limitation 8 and the status table now
report all three and **withdraw the factor-of-two claim** pending an author decision.

### 2.4 The artifact claim was verified independently

All five analysis commands re-run into a temporary directory regenerate **identically to the recorded
outputs apart from their `generated` timestamp** (deep JSON comparison, that field excluded): H1
b1 = +0.00467 [-0.00551, +0.01568]; H2 mean(d) = +0.00151 [-0.00010, +0.00354], Wilcoxon p = 0.80; H3
+2.2285 [+1.2339, +3.3280]; H4 bC = +0.1116 [+0.0621, +0.1727]; the ratio-5.00 gap 42.27 pp and the
within-ratio-5.00 spread 52.64 pp. Record: `notes/records/MIXED-EFFECTS-2026-10-04.md` §4.

### 2.5 The watchdogs — `997ae84`, `625d26d`

`tools/matrix-watchdog.mjs` now owns both rules and both clocks. The thresholds are MEASURED, not chosen,
and the tests re-derive them from the shipped logs:

* record silence **25 min** — the slowest single hard cell measured is 1200 s;
* gateway silence **5 min** — the longest gap between consecutive requests in a healthy matrix is 128 s
  (4 987 requests, p99 = 21 s, zero gaps over 3 min).

The clock starts when the invocation starts; the gateway rule takes `gatewayIdleMs`, a DURATION, because
a duration cannot be inverted by a caller who did not read the helper — which is exactly how defect 4
happened.

### 2.6 The sign-off counts cells, not records — `71c4a0c`

`tools/cell-counts.mjs`: cells (distinct task|arm|seed), records, the retried cells named, and a cell
solved if ANY of its records solved. The verify stage now prints `240/240 cells (241 records, 1 retried),
178 cells solved (74.2%)` and separates surplus from absence. A test asserts that exact line against the
shipped `runs.jsonl`.

### 2.7 THE PILOT — `67a5c7b` (written by the runner)

```
matrix        cmuu7wgca-deepseek    gateway port 8791    plan hard, deepseek only
cells         240/240   records 241   solved 178 cells (74.2%)   unsolved 62
arms          all ten present, 24 records each except dsh:ptc-terse = 25 (the retry)
retry         lh-inventory-allocation|dsh:ptc-terse|1  killed 0x40010004 -> re-run -> SOLVED
spend         $5.4970 this run, of a $12 ceiling (the meter never fired)
backup        mirrored, and snapshotted twice (mmuu... and cmuu7wgca 241 runs)
```

Phase 1 (before the reboot) contributed 127 cells for $6.8083; the resumes added 113 for $5.4970.

## 3. WHAT TODAY COST

| item | USD |
|---|---|
| phase 1, 127 cells (morning) | 6.81 |
| failed resume attempts 1 and 2 (preflight+pilot, 0 cells) | 1.43 |
| attempt 3 (preflight+pilot + 2 cells, killed by defect 4) | 0.92 |
| attempt 4 (preflight+pilot + 112 cells) | 5.50 |
| **balance now** | remaining balance omitted |

**The operating cost is the finding**: every `collect.mjs` invocation re-pays ~**$0.77** and ~25 minutes
for preflight and the pilot, whether or not the matrix has already been preflighted. A `--skip-preflight
--pilot` for a resume against the same plan is worth building deliberately, test-first — not under
pressure, which is how it would have been built today.

## 4. WHAT IS STILL OPEN

1. **The hard-suite analysis, and its pre-registration FIRST.** 240 cells are on disk and nothing has
   read them. This project's rule order is pre-declare, commit, then compute; the hard suite has no
   analysis plan yet. `PRE-REGISTRATION.md` governs batch 1, not this.
2. **Which slot correction is right** (section 2.3). An author decision, not a tool decision. Until it
   is made, the factor-of-two claim stays withdrawn.
3. **The three remaining providers** for a four-provider hard suite: ~$54 at the measured $0.054/cell,
   against a remaining balance (omitted). Needs a top-up and a fresh spend decision; the recorded decision this
   morning was "the pilot is the last hard-suite spend for now".
4. **`artifact/MANIFEST.json` does not cover the hard pilot.** `--verify` still exits 0 (it re-checks its
   recorded inputs; new files do not invalidate it), so this is coverage, not a break. Re-sign when the
   hard-suite analysis ships, not before.
5. **F31, F34 and F35 still carry stale seven-model numbers** beside their corrected tables (`PAPER.md`
   §6). The document sweep of 2026-10-04 rewrote METHODS/CROSS-HARNESS/REVIEW-RESPONSE; these three
   entries are what remains of it.
6. **Related work and ablations** — journal tier, not started.
7. **The 7.43x console correction factor** — unresolved (the 1.611x was refuted).
8. **Goose and cline workdirs are never cleaned.** Today's runs left four more; the guard correctly
   refuses (goose drops a `.jsonl`, cline's sqlite WAL holds an EPERM). The fix is a runner-written
   ownership marker, never a weaker guard.
9. **Five `measure-gateway.mjs` processes are alive**, four listening on 8788-8791 (one per attempt
   today); the seventeenth from the previous handover were cleared by the reboot. One gateway process is
   not listening in that band — inspect before killing, and do not kill from a plain shell call.
10. **Mixed-effects follow-ups**: the slot effect is additive in dollars and cost is right-skewed, so a
    log-scale or multiplicative slot effect is a legitimate alternative and has not been fitted; H2 has
    no mixed version by construction (one observation per task).

## 5. WHAT NOT TO DO

Inherited and non-negotiable: never run a matrix without a backup target and a spend ceiling; never
delete an output directory (`--resume` only); never price from a summary (re-derive from gateway usage
with `costOf`); a non-zero exit is not evidence until its cause is known, and neither is a 4xx, a missing
file, or an absent number; preflight all harnesses; write the test first; commit and back up before
reporting anything as done.

Specific to today:

* **Do NOT overwrite** `analysis/panel-analysis.json` or `analysis/hypotheses.json`. They are the only
  witness to the seven-model results; both tools default to writing there. New outputs go to
  `analysis/*-6model-*.json`.
* **Do NOT quote an Anthropic cost as a figure** (it is a bracket; the ledger caps the pair at
  0.1164/run), the panel's A6 hit rates for Anthropic (0.000 for every external arm), or F31's 93%.
* **Do NOT delete the 15 drifted records**, and do not re-baseline the manifest to hide drift.
* **Do NOT touch `tasks-b/`** (the human's) or **`findings/`** (untracked, and not this project's: it is
  an investigation of the chatapp rooms at 127.0.0.1:7788, written 13:39-13:51 local, left exactly as
  found).
* **Do NOT change the solved rule**, restore fixtures, relax `safe-fs.mjs`, add a ceiling to luna, or
  re-ignore `results/` or `_ev/`.
* **Do NOT decide any analysis rule after looking at its effect.** Today's rule order is the model:
  pre-declare, commit, then compute.
* **NEW — do NOT trust a background job's exit code.** See section 6.1.
* **NEW — do NOT run `run-experiment.mjs` directly.** It has no spend meter; `collect.mjs` is the only
  path that enforces the ceiling.

## 6. GOTCHAS THAT COST TIME TODAY

### 6.1 A background job reports exit 1 whenever the command writes to stderr

Verified directly: `node -e "console.error('x')"` — a command that EXITS 0 — is reported by the job
runner as `exit code: 1`. All four pilot attempts were reported that way, **including the one whose last
line was `DONE`**. `collect.mjs` exits 0 only if every stage returned; its failures print
`STOPPED at stage "<name>": <reason>`. **Read the transcript, not the job status.** Redirect the run to
a file (`> results/_scratch/pilot-run-N.log 2>&1`); without that, the failure's only evidence is consumed
by reading the job buffer — which is exactly how the first two deaths became "cause undetermined".

### 6.2 `run-experiment.mjs` clamps `--jobs` to a minimum of 1

`--jobs 0`, intended as a free no-op reproduction, instead started the real matrix with one worker,
outside `collect.mjs` — no meter, no watchdog. It was stopped within two minutes; the 17 gateway
requests it made belong to no run record and are declared (not deleted) in
`notes/defects/PILOT-INCIDENT-2026-10-04.md`.

### 6.3 The edit tool needs exact text, including indentation

Three edits failed today by quoting a block with the wrong leading spaces (the read output prefixes line
numbers, and copying from it loses indentation). Read the region, build the `old_string` from the file's
own `text` fields, then edit. A failed multi-edit program aborts at the first failure, so check which
parts landed before retrying.

### 6.4 One string style per program

A template literal containing an escaped backtick and a `+` concatenation failed a whole `run_code`
program at parse time. Arrays of plain double-quoted strings, joined with `String.fromCharCode(10)` or
`\n`, work every time.

### 6.5 Every resume costs $0.77 and 25 minutes

See section 3. Budget for it, and prefer fixing a known defect over restarting to see whether it recurs.

## 7. THE STANDARD

The objective is a paper strong enough to survive hostile review, and today was a case study in what that
costs. Every defect found today was invisible to a passing test suite, and two of them were **mine**: the
gateway polarity bug was introduced by my own fix and killed a matrix within five minutes of being
written; the sign-off's `241/240 cells` came from counting the wrong thing.

The pattern to keep: **the number that looks plausible is the dangerous one.** "No run record for 12
minutes" was true as arithmetic and false as a statement about the run; "241/240 cells" was a real pair
of numbers answering two different questions; "exit code 1" was the runner's report, not the pipeline's
result. Every one was found by asking **what a figure counted**, never by checking whether the code ran.

## 8. FIRST THREE ACTIONS

1. `node --test "tools/*.test.mjs"` (expect **159**), `node tools/artifact.mjs --verify` (exit 0),
   `node tools/backup-results.mjs --verify` (exit 0), and confirm the two witness files are still
   `02b2c4e2...` and `bd34e8f7...`.
2. **Pre-register the hard-suite analysis before reading its 240 cells.** Write the plan, commit it,
   then compute — the same order as `PRE-REGISTRATION.md` §12.8 and §12.9.
3. **Decide the slot confound** (section 2.3), or, if that belongs to the human, take the next free item:
   the F31/F34/F35 sweep in `notes/records/FINDINGS.md`, which costs nothing.

## 9. RUNNING AND RESUMING

```
# a resumed hard matrix, with the transcript kept
node tools/collect.mjs --plan hard --providers deepseek --name-prefix hardpilot- --max-cost 12 \
     > results/_scratch/pilot-run-N.log 2>&1

# always dry-run first: it is free and it catches a directory collision
node tools/collect.mjs --plan hard --providers deepseek --name-prefix hardpilot- --max-cost 12 --dry-run

# the pilot is complete; to read it, do NOT start with analyze-results.mjs - pre-register first
```

The Ceiling: re-derive it from the measured $0.054/cell rather than the plan's $2.09 estimate. There are
240 cells per provider. The remaining balance is omitted.
