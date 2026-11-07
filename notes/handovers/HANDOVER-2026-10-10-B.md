# HANDOVER — 2026-10-10 (second session of the day): must-fix list closed, and the two measurements the paper had only priced

This session finished REVIEW-4's twelve must-fix items and the six residual objections, then actually
ran the two cheap measurements earlier drafts kept declaring: a corrected A/A noise floor and a
single-harness Anthropic retention pilot. It also found a defect in the study's own Anthropic treatment
and fixed the open Anthropic cost defect. Read this with `notes/reviews/REVIEW-4.md` (the work list),
`notes/plans/PAPER-ROADMAP.md` (project strategy) and `paper/README.md` (build identities).

## 1. State

- Commits this session: `e7adea1` (title, compiled PDF, refs.bib defects), `4e3fa37` (three figures),
  `8d99965` (noise floor + retention pilot), plus the commit that carries this file (cost bracket,
  common-f evidence, figure 4, tiering moved out, this handover).
- `git status` clean except untracked `findings/` (not ours — do not touch).
- Tests: `node --test "tools/*.test.mjs"` — **311 pass, 0 fail** (the count grew by the pilot's 9, the
  A/A's, the cost bracket's 10 and common-f's 4).
- `node tools/artifact.mjs --verify` — **99 files, 2 scopes**, 2026-10-04 scope's `generated` still
  **2026-10-04T08:11:15.632Z** (must stay). Witness hashes MUST NOT change:
  `analysis/panel-analysis.json` **02B2C4E2**, `analysis/hypotheses.json` **BD34E8F7**.
- **Spend this session: $3.30** — DeepSeek $1.19 (A/A placebo: $0.0199 smoke + $1.172 full run;
  ledger says $1.72, the residual is recorded in the analysis, not explained away) and Anthropic
  **$2.11** (pilot: $0.0882 failed matrix + $0.9138 amended matrix + smoke/control). The owner supplied a
  new Anthropic key mid-session; it lives in the gitignored `.keys.json` (`anthropic`,
  `anthropic_workspace`) and is scoped to workspace `wrkspc_REDACTED`. **Never commit it.**
- Paper: `PAPER.md` ~1,100 lines; `paper/PAPER.tex` builds with Tectonic 0.17.0 to **31 pages, 0
  overfull, exit 0**, with four figures.

## 2. What this session changed — do not re-litigate these

1. **REVIEW-4's twelve must-fix items and the six residual objections (14, 15, 17, 21, 22, 23) are done.**
   Highlights: B = 200,000 re-filings (`analysis/*-2026-10-09.json`, `*-2026-10-10.json`); the GLM knife
   edge restated at +0.1409% with a 20-seed stability file (R1 0 of 4 on 20 of 20; bound +0.06..+0.17);
   METHODS corrected (the mixed-effects model WAS fitted, on 2026-10-04; the pre-registration was amended
   23 times, not 21); §3.1a reports both scales (75.1/69.1 spread, 79.2%/71.6%, secondary 42.3pp raw /
   38.9 log / 37.6 additive); `prefix-retention.mjs --ci-json` files the both-seeds interval; the
   position-adjust docstring/CLI now say it scores relative dollar error under one seeded fold draw;
   per-arm tasks-b test-edit incidence is filed; the "1.8x output verbosity" claim is withdrawn (F13's own
   table runs opposite) and A1d is reported; the Sonnet per-matrix appeal is deleted; the "watched fail"
   sentence is struck; PLAN §7's smoke McNemar is corrected.
2. **The title is the owner's choice (option 1)** — *"The code-mode cost penalty is model-specific: a
   two-suite cross-provider measurement, with a failed pre-registered replication"* — and the abstract is
   framed as one claim plus a failed replication.
3. **§7 "Tiering, honestly" was MOVED OUT of the paper** into `notes/plans/PAPER-ROADMAP.md` on the owner's
   instruction: venue selection, "where this is publishable" and "what is blocking" are project strategy,
   not submission content, and the owner asked why the paper discussed where to submit itself. The paper
   now ends at §6. **Do not put venue or tiering text back into PAPER.md.** The owner's venue decision is
   **journal or measurement venue** — they explicitly do not feel confident enough for a conference or
   workshop, so do not push conference formatting or an 8-10 page cut.
4. **Tectonic 0.17.0 portable** at `%LOCALAPPDATA%\Programs\tectonic\tectonic.exe`; `paper/PAPER.pdf` is
   tracked. `paper/PAPER.tex` uses article[11pt], margin=1in, microtype, pgfplots, **xurl** (without xurl,
   five bibliography pages reached 4pt past the right margin — the overfull count did not show it), and one
   `figure` environment per figure.
5. **Four figures**, generated deterministically from the filed JSONs by `tools/figures.mjs` (tests pin
   byte-identical regeneration and that every plotted number is derivable from its source):
   `paper/figures/fig1-penalty-per-model.tex`, `fig2-replication.tex`, `fig3-tie-fraction.tex`,
   `fig4-floor-resolution.tex`.
6. **The A/A noise floor is measured** (`notes/plans/AA-PLACEBO-PLAN.md`, `analysis/aa-placebo-2026-10-10.json`): one
   arm (`dsh:native`), 31 tasks x 2 seeds x 2 passes = 124 cells on DeepSeek, 0 exclusions; main request
   body byte-identical in **62/62** pairs and the auxiliary request in **62/62**; two identical treatments
   differ by **-5.75%** of per-cell cost, 95% CI **[-15.6%, +3.4%]** — a **9.5% floor** at 31 paired
   tasks, **wider than the withdrawn 7.7%** and the same size as Sonnet's raw +9.51% and GLM's adjusted
   -8.92%. Abstract, §4, limitation 9 and §7-of-the-roadmap all say this now.
7. **The retention pilot ran** (`notes/records/RETENTION-PILOT-2026-10-10.md` + Amendments 1 and 2,
   `analysis/retention-pilot-2026-10-10.json`): opencode on Anthropic's native Messages path, declaring
   its own caching with the gateway modifying nothing, retention **0.8735 [0.8176, 0.9299]** over nine
   tasks against the DSH field **0.994-1.000**. Amendment 1: **cline is structurally blocked** ("error:
   base URL is only supported for OpenAI and OpenAI-compatible providers", versions 3.0.65 and 3.0.70).
   Amendment 2: the study's injected-caching condition **cannot coexist** with an SDK client that declares
   its own `cache_control` breakpoints — Anthropic refuses the fifth block ("A maximum of 4 blocks with
   cache_control may be provided. Found 5."), 30/30 non-200 records carrying the gateway's injection
   deviation. **The failed matrix is preserved on purpose** at `results/retentionpilot-haiku-full/` and is
   a checksummed artifact input; do not delete it.
8. **The Anthropic cost defect is fixed** (`tools/anthropic-cost-bracket.mjs`, 10 tests,
   `analysis/anthropic-cost-bracket-2026-10-10.json`): batch-1 pair low 114.80 / DSH-share point 252.90 /
   all-miss 266.87 against the **144.33** ledger — both the point and the high bound are **refuted by the
   ledger**, the reconciled bracket is **[114.80, 144.33]** (0.0926-0.1164 per run), the ledger-implied
   cache-read share of the unreported input is **0.1942** against the DSH arms' 0.9292, and tasks-b
   (no ledger cap) is **[175.68, 408.46]** over 1,600 cells. Residual, disclosed: `costOf` still prices an
   unreported input at zero silently; closing it would regenerate the frozen 2026-10-03 scope.
9. **The common-f assumption now has filed evidence** (`tools/common-f-check.mjs`,
   `analysis/common-f-infeasibility-2026-10-10.json`): the arm-specific fit is estimable (19 params, full
   rank, 12/12) but not usable — SE 0.145-0.710 log units, swings up to 70pp with sign flips on batch 1;
   on tasks-b two of six are marginally identified and there the swing is half to one SE in opposite
   directions, which reads as noise. Limitation 8 carries this.
10. **goose and openhands are feasible-but-unverified for a native-path pilot** (no spend, no runs):
    goose has a first-class Anthropic Messages provider with `ANTHROPIC_HOST` (gateway root, no `/v1`);
    openhands routes `anthropic/{model}` through its bundled LiteLLM's Anthropic handler, but has no
    per-run config redirect so a pilot must be serial. Both risk the same four-block limit.

## 3. Invariants still standing

- Never touch `findings/`.
- Never re-baseline the 2026-10-04 artifact scope; only `--extend`. Never regenerate the 2026-10-03
  outputs (`analysis/cost-panel-6model-2026-10-03.json`, `analysis/panel-analysis-6model-2026-10-03.json`).
- Never delete `results/batchb-*/runs.no-usage.jsonl`, the failed pilot matrix, or any gateway log.
- One collector at a time; verdicts computed, not eyeballed; corrections dated beside the record.
- The Anthropic key is the owner's, lives only in `.keys.json`, and is never printed or committed.

## 4. Open, and the next session's first decisions

1. **Venue — owner's call, already narrowed to a journal or measurement venue.** Nothing is blocking it;
   the paper is 31 pages with four figures and no venue-specific formatting.
2. **Optional spend, none needed for any current claim:** more opencode pilot cells (40 cells ~= $3.50 at
   the measured $0.0884/cell, one harness only); a goose pilot (~$0.02/cell plus config work, then a
   smoke cell to confirm the split); an openhands pilot (serial only, same four-block risk).
3. **Nothing else.** REVIEW-4's list is closed, the artifact verifies, and the two measurements the review
   demanded now exist.

## 5. Commands

```
node --test "tools/*.test.mjs"                      # full suite
node tools/artifact.mjs --verify                    # or --extend (long: ~50 min, runs every command)
cd paper; & "$env:LOCALAPPDATA\Programs\tectonic\tectonic.exe" PAPER.tex --keep-logs   # build
Select-String -Path paper/PAPER.log -Pattern 'Overfull'                                   # must be 0
node tools/figures.mjs                              # regenerate the four figure fragments
node tools/retention-pilot-analysis.mjs --dir results/retentionpilot-amended-haiku-full --control results/retentionpilot-ctl-haiku-full --json analysis/retention-pilot-2026-10-10.json
node tools/anthropic-cost-bracket.mjs --json analysis/anthropic-cost-bracket-2026-10-10.json
node tools/common-f-check.mjs --json analysis/common-f-infeasibility-2026-10-10.json
```

**Margin check without eyes** (this model cannot see images): poppler is installed portable at
`%LOCALAPPDATA%\Programs\poppler\poppler-26.09.0\Library\bin`. `pdftoppm -gray -r 72` the PDF, then
measure the ink bounding box per page against the 1in text block ([72, w-72] x [72, h-72] at 72 dpi on
612x792 paper); any page with ink outside it is a real defect even when the overfull count is zero. It
found the xurl problem; the current build passes with **zero** pages outside the block.

## 6. Honest state of the paper

**Claims that carry:** the penalty is large and model-specific; the price ratio does not predict it
(59.5 of 75.1 adjusted points, 79.2%); harness rankings do not transfer (median rho 0.238, half of the
adjacent steps unorderable); the pre-registered replication **failed** (R1 0 of 4, R2 fails, stable over
20 seeds); the code-mode design lowers request count; one harness on Anthropic retains far less than the
DSH arms.

**Disclosed and not fixed:** the OpenAI-compatible retention for cline/goose/openhands (cline closed,
the others feasible-but-unrun); the common-f assumption the design cannot decide; H3's magnitude
fragility (one model deep on batch 1, 1.010-9.642 across suites); the m = 12 -> 18 family growth; the
four cache regimes; the nominal pre-registration freeze (23 amendments); and the two residual tool risks
(`costOf`'s silent zero, and the artifact's non-reproducible witness files).

**Known untested-in-the-open:** no human has yet read the compiled PDF end to end. Layout is verified
mechanically (0 overfull, 0 pages with ink outside the text block, four figures, 31 pages).
