# HANDOVER — betterharness, session of 2026-10-02

Read notes/handovers/NEW-SESSION-BRIEF.md first; it is still the specification. This file is what changed today.

**Your job in one line:** GLM-Flash, luna and Qwen batch-1 matrices are NOT collected. The pipeline
to collect them is built, tested and proven end to end on DeepSeek. Start them.

---

## 0. THE HEADLINE

DeepSeek batch 1 was destroyed on 2026-10-02 and **has been re-collected, verified, backed up and
committed** — 620 cells, 0 failures, 619 solved, $5.5 of a $12 ceiling. It is in git at `1132da0`
and in a byte-identical mirror at `C:\Users\user\betterharness-backups\`.

The other three cheap providers are ready to run and have not been started. That is the work.

---

## 1. STATE OF THE REPO

```
git log --oneline -8
15dabac retroactive test-edit scan of the surviving workdirs: 0 of 62, and why that is weak
5294a1f guard scan: allow the fixture-guard test's deliberate file deletion
dd58125 close the two gaps the DeepSeek matrix exposed: test-edit measurement, and a DSH version
1132da0 ds-full: DeepSeek batch 1 re-collected, 620 cells, 0 failures, 619 solved
2c204f0 harness versions: probe DSH the way the matrix runs it, and fix the stale cline pin
e4212b5 collect: publish the live spend meter to the status file, and clear stale failure state
5771030 guard scan: skip vendored browser profiles; the alert window's profile moves to %TEMP%
1a744e2 data loss is now impossible: tracked archive, guarded deletes, continuous backup
```

`results/` and `_ev/` are TRACKED now. `recovered/sessions-text.txt` is in git-lfs.
`results/_scratch/` is the one thing under results/ that is NOT tracked — it is the designated
scratch root, and .gitignore explains why at length. Do not "fix" that by ignoring results/ again.

All 26 tests pass:
```
node --test tools/safe-fs.test.mjs tools/backup-results.test.mjs tools/fixture-guard.test.mjs
```

---

## 2. WHAT IS DONE AND WORKING

**Task 1 — data loss is structurally impossible.**
- `tools/safe-fs.mjs` is the only module allowed to delete. `safeClean` / `safeRemove` /
  `safeUnlinkLink` refuse any path not strictly inside a designated scratch root, that is
  git-tracked, that contains a runs.jsonl / any *.jsonl / a task.json, or that is results/ or a
  direct child of results/. **NO OVERRIDE FLAG.** All 14 rmSync/Remove-Item sites converted,
  including one in scripts/harness.ps1 that deleted a gateway log inside results/.
- `tools/safe-fs.test.mjs` was written and watched fail before the module existed. One of its
  tests walks the whole repo asserting no other file calls a destructive primitive.
- `tools/backup-results.mjs` mirrors results/ outside the working tree, incrementally,
  APPEND-ONLY (never deletes, never prunes), with hardlinked snapshots. Its test asserts
  "deleting a file from the source must not remove it from the backup".

**Task 2 — cline fixed. Root cause was none of the three hypotheses.**
Cline UPDATES ITSELF: `npm update -g cline --tag latest`, in the background, on startup. Caught in
the act. It moved the global install 3.0.65 -> 3.0.68, removed cline.cmd/cline/cline.ps1 from
%APPDATA%/npm, emptied postinstall.mjs and left a 137 MB cline.exe.DELETE.<hash>. The first time it
fired it left node_modules/cline with only a node_modules subdir — no bin/, no package.json — so
the shim ran node against a file that did not exist. THAT is the EPERM: not a file lock, not the
rmSync in the finally, not a spawn failure.
Fix: pinned copy at `C:\Users\user\betterharness-tools\cline-3.0.65\`, invoked by absolute
path (`CLINE_BIN` env override), loud warning if missing. Preflight passes for all five harnesses.

**Task 3 — the pipeline.** `tools/collect.mjs` is one command: cost ceiling, credit check,
gateways on free ports with the exact per-provider flags RECORDED, preflight of every harness,
a one-task pilot, then the matrix under a gateway-silence watchdog, a matrix-silence watchdog and
a live spend meter that kills at 90% of the ceiling, then verify, backup, commit.

**Also done:** harness versions probed and stamped on every run record + matrix.json;
`fixture` measurement on every record (below); the `fresh = max(0, miss - created)` double
subtraction corrected in 8 places; `tools/credit-plan.mjs` (per-provider load figures with
evidence); `tools/credit-alert.mjs` (full-screen flashing red window).

---

## 3. HOW TO COLLECT THE REMAINING THREE — exact commands

```powershell
cd C:\Users\user\betterharness

# one provider at a time; verify before escalating, as the brief requires
node tools/collect.mjs --plan batch1 --providers zai    --max-cost 12
node tools/collect.mjs --plan batch1 --providers openai --max-cost 12
node tools/collect.mjs --plan batch1 --providers qwen   --max-cost 12

# the alert window, in its own flashing-red window
node tools/credit-alert.mjs --open --port 8899
```

- Output dirs use the HISTORICAL names every analysis tool expects: `glm-flash`, `luna-full`,
  `qwen-full` (and `ds-full`, done). See `HISTORICAL_DIR` in collect.mjs.
- Each provider is ~5.7 h at `--jobs 4` (measured 2.4-3.0 runs/min on DeepSeek). `--jobs 6`
  cuts it to ~3.8 h but is a recorded deviation from batch 1, which used 4.
- **Do not run the hard suite, and do not touch Anthropic, until all four cheap batch-1 matrices
  are complete and verified.** collect.mjs refuses Anthropic without
  `--i-know-anthropic-is-expensive`.

---

## 4. WHAT IS NOT DONE

1. **GLM, luna, Qwen batch 1.** The only item that spends money. ~17 h total.
2. **The hard suite** (tasks-hard/, 24 tasks x 10 arms x 1 seed = 240 cells/provider, ~$97 for four).
3. **The second task suite** — the referee's first objection.
4. **The F45 position-confound re-run.**
5. **Task 6 defects.** The full audited list with file:line is in the session that produced
   `dd58125`; the big ones:
   - A2b's Holm-Bonferroni is wrong four ways (`tools/panel-analysis.mjs:257-290`): 20,000
     iterations cannot resolve Qwen (exact p = 0.010413, so 2 of 7 survive, not 3); one shared
     RNG stream makes the table order-dependent; the loop is not step-down; and the declared
     family of 7 is narrower than PRE-REGISTRATION.md §6 mandates — under the filed family the
     pass's own Haiku McNemar p = 0.0072 FAILS Holm.
   - `tools/hypotheses.mjs:40-42` still has one shared module-level RNG stream behind a comment
     claiming it was fixed. Two broken LCGs still live in `analyze-results.mjs:117` and
     `h2-test.mjs:67`.
   - Stale numbers beside corrected tables: F38 (30/93, 1/56 never moved), F35 (47 vs 48),
     F34 (42.16 pp, H4 -0.299), F31 (**luna's PTC differential has a SIGN FLIP**: +4.2% printed,
     -0.2% actual), and notes/reviews/REVIEW-RESPONSE.md still prints the retracted placebo verdict.
   - F42 must be rewritten: with the exclusion fix, GLM-Flash is 13/24 discriminating, not 20/24,
     and "every one of those twelve" fails 6/12. DeepSeek is 5/23.
   - `tools/cost-panel.mjs:148` assigns `primary` before the exclusion check.
   - `tools/cost-panel.mjs:152` drops no-gateway runs before the verdict, making the
     no-requests clause unreachable there.
6. **The test-editing question is only partly answered.** See §5.
7. **Goose workdirs are never cleaned** (~112 dirs, ~330 MB) because goose drops a `.jsonl`
   inside its workdir and safe-fs correctly refuses. The right fix is a runner-written ownership
   marker, NOT relaxing the guard.
8. **A locked browser profile still sits at `results/_scratch/credit-alert-profile`**, held by
   `msedgewebview2`. It is now harmless (untracked, and the backup skips _scratch) but it should
   be deleted once released. Do not kill msedgewebview2 — it is a Windows component.

---

## 5. TWO MEASUREMENTS YOU MUST NOT MISREAD

**Harness versions.** Every run record now carries `harnessVersion`. The 620 DeepSeek runs carry
`null` for DSH because the probe was broken during collection; `results/ds-full/matrix.json` has
`harnessVersionsPostHoc` PROVING 0.1.7-rc.2 (the install predates the matrix by three days and was
unchanged through it). Records were deliberately NOT rewritten.

**Test-editing.** `tasks/<task>/task.json` grades with `node --test` run IN THE AGENT'S WORKDIR as
the agent left it. Nothing restores the fixture's tests. So weakening an assertion reads as a
solve. This was observed live on one arm. `tools/fixture-guard.mjs` now measures it (every record
carries `fixture.gradedOnEditedTests`) but does NOT restore anything — changing the grading rule
mid-study would alter the treatment. A retroactive scan of the 62 surviving DeepSeek workdirs found
0 touched, but that is a NON-RANDOM 10% sample (dominated by goose) and bounds the rate only at ~5%.
**Every run from GLM onwards carries the field; use it.**

---

## 6. ENVIRONMENT GOTCHAS THAT COST TIME TODAY

- **Killing a process from a `pwsh` tool call can tear down the tool's own Windows Job runner.**
  Use `run_in_background: true` for kills, or `Invoke-CimMethod -MethodName Terminate`.
- **`--keep-work`, not `--keep`.** The runner accepted only `--keep` until today, so every
  handover note telling you to use `--keep-work` silently deleted the workdir. Both work now.
- **`results/_scratch` is not tracked and is skipped by the backup.** If something in there
  becomes evidence, move it out and it is tracked on the next add.
- **Never put non-evidence in results/.** A browser cache in there broke both the backup and the
  commit of a 620-run matrix.
- **`tools/keys.mjs` has no deepseek entry.** The DeepSeek key is in `~/.dsh/.credentials.yaml`;
  `collect.mjs:resolveUpstreamKey` falls back to it. Keys go in the child's ENVIRONMENT, never argv.

---

## 7. THE RULES (unchanged, and they are why this session went the way it did)

1. Never run a matrix without a backup target configured and a spend ceiling set.
2. Never delete an output directory. `--resume` only.
3. Never price from a summary. Re-derive from gateway usage.
4. A non-zero exit is not evidence until its cause is known — and neither is a 4xx, a missing
   file, or an absent number.
5. Preflight all harnesses, not just dsh.
6. Write the test first.
7. Commit and back up before reporting anything as done.

The standard to beat: three hostile reviews each found 5+ defects in work its author believed was
finished. Assume the same of yours.
