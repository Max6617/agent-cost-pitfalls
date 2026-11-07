# NEW SESSION BRIEF — rebuild the collection pipeline so it cannot lose data, then re-collect

**Repo:** `C:\Users\user\betterharness`. Read this whole file before running anything.
**Your job in one line:** make data loss impossible, fix cline, build one automatic staged
pipeline that backs up as it goes and refuses to overspend, then re-collect.

---

## 0. What happened, so you understand the stakes

On 2026-10-02 the entire `results/` directory was destroyed. Every run record and every gateway log
from every experiment: 24 matrices, **~5,900 run records, ~102,000 gateway records**, roughly €900 of
API spend across five providers.

**Cause, exactly.** `tools/preflight.mjs` had two `rmSync(outDir, { recursive: true, force: true })`
calls, at line 60 and near the end. A hostile review had named both:

> `rmSync(outDir, recursive)` on a verbatim `--out` (`preflight.mjs:60, :107`) would delete the
> entire results archive given `--out results`.

The author guarded the second one and then typed `preflight --out results` **to test the guard**.
Line 60 ran first. `results/` was gitignored, so git had nothing. `rmSync` does not use the Recycle
Bin. The only files that survived were four gateway logs held open by running processes.

**Every recovery method was then tried and failed:** Volume Shadow Copies (no admin, no restore
points), System Protection (off), Recycle Bin (0 matches), File History (absent), cloud sync (empty),
git (never tracked), full-disk filename search, `%TEMP%` spill files, the DSH session store
(594 MB, multi-frame zstd, fully decoded to 189 MB of transcript). The disk is a **TRIM-enabled NVMe
SSD**, so raw carving is closed.

**Zero run records were recovered.** 223 gateway records out of 102,000.

**The rule this installs:** no destructive filesystem call may exist anywhere in this repo without a
guard that cannot be reached around, and no result may exist only in an untracked directory.

---

## 1. What survived — your actual starting material

| asset | contents |
|---|---|
| `data/milestone-4/` | **one complete matrix**: `glm-flash`, 310 runs, 31 tasks, 5 arms, 100% solved, plus 3,363 gateway records. This is a real batch-1 matrix. |
| `data/milestone-1..3/` | three small pilots: 10, 25, 30 runs (deepseek-flash, 1 task each) |
| `analysis/*.json` | six derived files, **committed to git**: panel-analysis, hypotheses, cache-ab, cache-ab-sonnet, f18, coverage |
| `recovered/sessions-text.txt` | 189 MB of decoded session transcript |
| `recovered/tables.txt` | **175 printed table blocks (462 KB)** — every table the study's sessions ever printed |
| `recovered/gateway.*.jsonl` | 223 gateway records |
| `%TEMP%\dsh-exp-*` | 70 run workdirs — agent work products, not records |
| `_ev/` | price-card captures for all five providers, and the model-identity probe |

**`notes/records/FINDINGS.md` (~2,010 lines, F1–F45) still holds every number.** `notes/reviews/REVIEW-2.md` and `notes/reviews/REVIEW-3.md` are
three hostile reviews of it. `analysis/*.json` holds the tables. So the *findings* are recorded — but
**nothing can be re-derived from primary data any more**, which was the property that made this
study's corrections credible.

Full context: `notes/records/FINDINGS.md` F44 and F45, and the last section of `notes/reviews/REVIEW-3.md`.

---

## 2. TASK 1 — make this impossible (do this first, before anything else)

1. **Un-ignore and commit everything.** `.gitignore` currently excludes `results/`, `_ev/`, `.keys.*`.
   Check every entry. `results/` must be tracked. `_ev/` must be tracked. Keys must NOT be. If the
   JSONL volume is a problem, use `git-lfs` — do not solve it by leaving data untracked.
2. **Delete `rmSync` from the repo's vocabulary.** Write **one** helper, e.g. `tools/safe-fs.mjs`,
   exporting `safeClean(dir)` and `safeRemove(file)`, which refuse any path that:
   - is not strictly inside a designated scratch root,
   - is a git-tracked directory,
   - contains a `runs.jsonl`, a `*.jsonl`, or a `task.json`,
   - is `results/` itself or any of its direct children.
   Every existing `rmSync` call site must be converted. There is no override flag.
3. **Add a regression test** that asserts `safeClean('results')`, `safeClean('results/ds-full')` and
   `safeClean('.')` all throw, and that `safeClean('results/_scratch/x')` succeeds.
4. **Back up continuously.** A `tools/backup-results.mjs` that snapshots `results/` to a location
   outside the working tree (a second directory, and optionally an external/cloud target) and runs
   **on a timer and after every completed matrix**. The runner should call it every N runs.
5. **Commit automatically** after each matrix completes, with the matrix id and run count.

Write the test first, watch it fail, then fix. That is the pattern the reviews kept catching the
absence of.

---

## 3. TASK 2 — fix cline

Cline is the one harness that does not run. Everything else preflights green.

**Symptom:** preflight reports `cline: 0 runs, 0 requests — NO REQUESTS REACHED THE GATEWAY` on
every provider. The runner records:

    EPERM, Permission denied:
    \\?\C:\Users\user\AppData\Local\Temp\dsh-exp-<matrix>-cline-<task>-cline-s1-<rand>

**What is known:**
- Cline is the **only** harness driven through a `.cmd` shim (`tools/harnesses.mjs` ~line 207,
  `headless.cmd = 'cline.cmd'`). That choice is deliberate and documented: the `.ps1` shim does not
  spawn. The other four are `.exe`/`.ps1` and work.
- `cline.cmd` exists, is on PATH, and `cmd /c cline --version` returns `3.0.65`.
- `METHODS.md` pins harness versions as prose (Cline 3.0.65, OpenCode 1.18.30, DSH 0.1.7-rc.2, Node
  v24.19.0). **No run record and no gateway record carries a harness version.** Add that.
- Cline needs its provider store registered by an actual `cline auth` invocation into a per-run
  `--config` tree (`authStyle: 'cline-config'`); writing the file by hand is documented as not
  working. Read the long comment block in `tools/harnesses.mjs` before touching this — it records
  several ways cline silently bills the wrong endpoint.
- The failure was invisible until `run-experiment.mjs:485` was read, because the record had no exit
  code and the console printed `exit=undefined`. **Fix that too**: the runner must never emit a
  failure record without the error text and the command line it tried.

Start by reproducing with `--only example-fix --seeds 1 --harness cline --keep-work` and reading the
workdir. If the EPERM is the `rmSync` in the `finally` block, that is a different (and easier) bug
than a spawn failure — determine which before changing anything. **If cline cannot be made to work,
say so and drop it explicitly** rather than letting it produce 62 dead cells per matrix.

---

## 4. TASK 3 — build one automatic, staged, self-monitoring pipeline

The current situation is that a matrix requires a human to start a gateway with the right flags, on
the right port, then preflight, then launch, then watch. That is how treatments drift and how runs
sit stuck for hours. Replace it.

**`tools/collect.mjs` — one command, e.g. `node tools/collect.mjs --plan batch1 --providers cheap`.**
It must, in order, and refuse to continue if any step fails:

1. **Credit check** every provider it will use (`tools/check-providers.mjs` exists).
2. **Cost estimate and a hard ceiling.** Print expected spend; abort if it exceeds `--max-cost`.
3. **Start the gateways itself**, on free ports, with the exact flags the matrix requires, into
   per-matrix log files. Record the resolved flags in the run output.
4. **Preflight every harness** (not the default `dsh` only — pass all of them).
5. **Pilot**: one cheap task, all arms, cheapest model. Validate that records land, that cost is
   non-zero, and that solve rate is sane.
6. **Run the matrix**, with:
   - a **watchdog** that kills and reports a run producing no gateway request for N minutes, and a
     matrix producing no record for M minutes;
   - **bounded concurrency** and a **memory ceiling** — the recovery scripts needed
     `--max-old-space-size=8192`; nothing in the collection path should accumulate in memory;
   - **incremental backup** after every batch of runs;
   - a **live spend meter** that aborts the matrix when the running cost approaches the ceiling.
7. **Verify**: coverage balance, per-arm cell counts, zero unexplained-zero-cost runs.
8. **Commit and back up.**

**Default to cheap models.** Anthropic is ~96% of the cost of a batch-1 sweep (`haiku` was **€286**
and `sonnet` **€167** for 620 cells each, against **€22 for all four automatic-cache providers
combined**). Never spend on Anthropic until the whole pipeline has produced a complete, verified,
cheap matrix first.

---

## 5. TASK 4 — re-collect, in this order, validating before each escalation

**Reproduce batch 1 exactly.** 31 tasks (`tasks/`), 10 arms, 2 seeds = 620 cells. The settings that
must be held constant, all recoverable from the surviving logs and `_ev/`:

| | |
|---|---|
| DeepSeek | `--force-model deepseek-flash --force-effort high --no-cache-breakpoints` |
| GLM-Flash | `--force-model glm-5.3-flash --force-effort high --no-cache-breakpoints` |
| Qwen | `--force-model qwen3.8-flash` (cache breakpoints ON — its batch-1 matrix had them) |
| luna | `--force-model gpt-6-luna`, no forced effort (the gateway sets `reasoning_effort: none` on the OpenAI path) |
| Anthropic | `--force-model claude-haiku-4.5` / `claude-sonnet-5.5`, static breakpoints unless the A/B says otherwise |

Order: **DeepSeek → GLM-Flash → luna → Qwen (~€22 total)**, validate, then the **hard suite**
(`tasks-hard/`, 24 tasks × 10 arms, ~€90 for four providers), then decide about Anthropic.

Then, and only then, the three things that would actually strengthen the paper:
1. **A second task suite** — the referee's first objection is "one task suite".
2. **The position confound re-run** (F45: the broken shuffle put `dsh:ptc` first in 45–67% of runs
   and position carries 7–64% of cost). Re-running with the repaired shuffle is the clean fix.
3. **Anthropic** only if the paper ends up resting on it.

---

## 6. Known defects to fix while you are in there

REVIEW-3 is the freshest. The ones that were fixed and the ones that were not:

**Fixed:** the inert `INFRASTRUCTURE` set (41 runs were being certified as model failures), signature
ordering, `preflight`'s `status 0 < 400` inversion and its phantom `undefined` harness row, the
Sonnet A/B priced on the Haiku card, `scripts/start-provider.ps1` gaining `-Effort`, `scripts/start-gateway.ps1`
gaining `-NoCacheBreakpoints`, `servedModel` logging.

**Still open — fix these:**
- **A2b's Holm-Bonferroni is wrong three ways**: 20,000 iterations cannot resolve Qwen's contrast
  (true count is **2 of 7**, not 3); one shared RNG stream makes the table order-dependent; the loop
  is not step-down; and the declared family (7) is narrower than PRE-REGISTRATION §6 mandates —
  under the filed family **the pass's own Haiku McNemar p = 0.0072 fails Holm.**
- **`hypotheses.mjs` still has one shared module-level RNG stream** behind a comment claiming it was
  fixed; two broken LCGs still live in `analyze-results.mjs` and `h2-test.mjs`.
- **Register stale next to corrected tables** (third review running): F38's table never moved
  (30/93, 1/56), F35 contradicts itself (47 vs 48), F34 (42.16 pp, H4 −0.299), F31 (**luna's PTC
  differential has a sign flip**: +4.2% printed, −0.2% actual), and `notes/reviews/REVIEW-RESPONSE.md` still prints
  the retracted placebo verdict and four stale F37 figures.
- **F42 must be rewritten**: with the exclusion fix, GLM-Flash is **13/24 discriminating, not 20/24**,
  and "every one of those twelve" fails 6/12. DeepSeek is 5/23.
- `fresh = max(0, miss − created)` double-subtraction survives in four places.
- `cost-panel.mjs` assigns `primary` **before** the exclusion check, so the primary-only view still
  silently drops cells.

---

## 7. Rules that are not negotiable

- **Never run a matrix without a backup target configured and a spend ceiling set.**
- **Never delete an output directory.** `--resume` only.
- **Never price from a summary.** Re-derive from gateway usage.
- **A non-zero exit is not evidence until its cause is known**, and neither is a 4xx, a missing file,
  or an absent number. This project has retracted seven claims by ignoring that.
- **Preflight all harnesses, not just `dsh`.**
- **Write the test first.** Every structural defect this project has had was found by an outsider
  because there was no test that could have caught it.
- **Commit and back up before reporting anything as done.**

The standard to beat: three hostile reviews each found 5+ defects in work its author believed was
finished. Assume the same of yours.

---

## 8. First three actions, in order

1. Track `results/`, `_ev/` and everything else gitignored; commit.
2. Write `tools/safe-fs.mjs` + its test; convert every `rmSync` call site.
3. Reproduce and fix cline.

Then build `tools/collect.mjs`. Do not start a paid matrix until steps 1–3 are done and the pipeline
has produced one complete verified cheap matrix end to end.