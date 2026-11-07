# agent-cost-pitfalls

Research artifact for the paper **Six Pitfalls in Measuring the Cost of Coding Agents: Evidence from a Cross-provider Study of Code Mode** by Max Reischl and Alexander Feurer (independent researchers, Vienna, Austria). [arXiv link to be added].

This repository is the measurement gateway, run records, gateway logs, analysis code and checksummed artifact behind that study: a fixed-protocol comparison of code mode (programmatic tool calling) against native tool calling across six models from five providers, with four other open-source harnesses, on two task suites. Every main-matrix number in the paper is re-derived from archived token counts under a pre-registered cost function; `artifact/MANIFEST.json` checksums the inputs and analysis outputs.

## Requirements

There is **no root `package.json`**. The analysis tools are plain Node ESM scripts under `tools/`.

- **Node.js**: use the version recorded in `artifact/MANIFEST.json` (currently **`v24.19.0`**). `node tools/artifact.mjs --verify` prints a warning if your Node version differs; hash verification still passes when the files match.
- A normal clone of this repository (results and analysis files are tracked; do not delete `results/` or `_ev/`).
- Optional: a TeX engine if you want to rebuild `paper/PAPER.pdf` from `paper/PAPER.tex`.

No API keys are required to verify the artifact or rebuild the analysis JSONs from the shipped `results/` tree.

## Verify the artifact

From the repository root:

```bash
node tools/artifact.mjs --verify
```

This re-checksums every path listed in `artifact/MANIFEST.json` (126 files across two scopes) and exits non-zero on drift.

Run the unit tests:

```bash
node --test "tools/*.test.mjs"
```

(Two failures are expected when the local harness installs the tests look for are missing; they are independent of the artifact hashes.)

## Rebuild the analysis JSONs

**Prefer `--verify` for review.** A full rebuild rewrites analysis outputs and therefore their checksums.

Commands below are taken from `artifact/MANIFEST.json` (`commands`) and from `tools/artifact.mjs` / `ARTIFACT.md`. Do not invent alternatives.

### Rebuild the first scope

```bash
node tools/artifact.mjs
# same as: node tools/artifact.mjs --build
```

This re-runs the **five scope-1 commands only**, then rewrites `artifact/MANIFEST.json` from scratch. The scope-2 outputs are re-checksummed as they are, not re-derived.

### Rebuild the second scope

```bash
node tools/artifact.mjs --extend
```

This re-runs the 22 scope-2 commands and updates their entries in the existing manifest, leaving the scope-1 entries and the original `generated` date alone. To re-derive everything, run the plain build first and `--extend` after it.

### Individual analysis commands (from the manifest)

Scope 1 (batch-1 matrices, recorded 2026-10-03/04):

```bash
node tools/cost-panel.mjs --json analysis/cost-panel-6model-2026-10-03.json
node tools/panel-analysis.mjs --json analysis/panel-analysis-6model-2026-10-03.json
node tools/hypotheses.mjs --json analysis/hypotheses-6model-2026-10-03.json
node tools/prefix-retention.mjs --json analysis/prefix-retention.json
node tools/test-edit-sensitivity.mjs --json analysis/test-edit-sensitivity-6model-2026-10-04.json
```

Scope 2 (tasks-b, position adjustment, ablations, re-filing at B = 200,000, the counterbalanced re-run, and related checks):

```bash
node tools/panel-analysis.mjs --datasets batchb --json analysis/panel-analysis-batchb-2026-10-09.json
node tools/hypotheses.mjs --datasets batchb --json analysis/hypotheses-batchb-2026-10-09.json
node tools/panel-analysis.mjs --datasets batchb-deepseek,batchb-glm-flash,batchb-qwen,batchb-luna --json analysis/panel-analysis-batchb-four-2026-10-09.json
node tools/hypotheses.mjs --datasets batchb-deepseek,batchb-glm-flash,batchb-qwen,batchb-luna --json analysis/hypotheses-batchb-four-2026-10-09.json
node tools/replication-verdict.mjs --json analysis/replication-verdict-batchb-2026-10-09.json
node tools/position-adjust.mjs --json analysis/position-adjust-6model-2026-10-09.json
node tools/position-adjust.mjs --datasets batchb --json analysis/position-adjust-batchb-2026-10-09.json
node tools/ablations.mjs --json analysis/ablations-2026-10-09.json
node tools/panel-analysis.mjs --json analysis/panel-analysis-6model-2026-10-09.json
node tools/hypotheses.mjs --json analysis/hypotheses-6model-2026-10-09.json
node tools/replication-verdict.mjs --batch1-panel analysis/panel-analysis-6model-2026-10-09.json --json analysis/replication-verdict-batchb-2026-10-09.json
node tools/mixed-effects-hypotheses.mjs --json analysis/mixed-effects-6model-2026-10-04.json
node tools/verdict-seed-stability.mjs --seeds 20 --iters 200000 --json analysis/verdict-seed-stability-2026-10-10.json
node tools/test-edit-incidence.mjs --json analysis/test-edit-incidence-2026-10-10.json
node tools/prefix-retention.mjs --ci-json analysis/prefix-retention-ci-2026-10-10.json
node tools/ranking-adjusted.mjs --iters 200000 --json analysis/ranking-adjusted-2026-10-10.json
node tools/aa-analysis.mjs --iters 200000 --seed 12345 --json analysis/aa-placebo-2026-10-10.json
node tools/retention-pilot-analysis.mjs --dir results/retentionpilot-amended-haiku-full --control results/retentionpilot-ctl-haiku-full --json analysis/retention-pilot-2026-10-10.json
node tools/anthropic-cost-bracket.mjs --json analysis/anthropic-cost-bracket-2026-10-10.json
node tools/common-f-check.mjs --json analysis/common-f-infeasibility-2026-10-10.json
node tools/quality-guard.mjs --json analysis/quality-guard-2026-10-10.json
node tools/rerun-compare.mjs --json analysis/rerun-compare-2026-10-11.json
```

These are the 22 scope-2 commands in the order the manifest records them. `replication-verdict` runs twice: the second run reads the batch-1 panel that the two commands before it re-file. The last one, `rerun-compare`, is the counterbalanced re-run (Tables 7 and 13, Figure 1); it reads the two `position-adjust` outputs, and its inputs are the ten `results/rerun-*` matrices and their gateway logs.

### Paper figures

```bash
node tools/figures.mjs
```

Writes TikZ sources under `paper/figures/` from the analysis JSONs (see mapping below).

## Directory map

| path | role |
|---|---|
| `analysis/` | Committed analysis JSON outputs the paper cites |
| `artifact/MANIFEST.json` | Checksums, Node version, recorded rebuild commands |
| `results/` | Run records (`*/runs.jsonl`) and gateway logs (`*-gateway.jsonl`) |
| `tasks/`, `tasks-b/`, `tasks-hard/`, `tasks-cacheab/`, `tasks-glm53/` | Task suites and fixtures |
| `tools/` | Gateway, collectors, estimators, tests (`*.test.mjs`) |
| `conditions/` | Per-arm harness condition patches |
| `paper/` | LaTeX sources and PDF of the paper |
| `data/` | Early milestone gateway logs (milestone 1–4), before the shipped matrices |
| `_ev/` | Saved primary sources behind quantitative claims. Do not delete |
| `snapshots/` | DSH preset and profile captures (`v0-baseline`, `pre-upgrade`, `v1-router`, `v2-my-checkpoint`). `tools/snapshot-state.mjs` reads and writes `snapshots/<label>/` |
| `scripts/` | Windows launchers (`harness.ps1`, `harness.cmd`, `start-gateway.ps1`, `start-provider.ps1`, `preflight-experiments.ps1`, `upgrade-dsh.ps1`) and `host-optimizations.patch.yml`. Each launcher treats the parent of `scripts/` as the repository root |
| `router/` | Deterministic decision-layer prototype (not the paper's main contrast) |
| `recovered/` | Redacted session transcript (`sessions-text.txt.gz`) and the run records recovered from it after the 2026-10-02 loss |
| `ARTIFACT.md` | How to re-derive the numbers, and what can no longer be derived |
| `METHODS.md` | The study as run |
| `PRE-REGISTRATION.md` | The filed protocol the estimators implement |
| `PAPER.md` | Long-form research record (intermediate and withdrawn results). The paper is `paper/PAPER.tex` |
| `HISTORY.md` | How this single-commit snapshot differs from the working history |
| `notes/` | Working notes kept as the provenance record: handovers, defects, reviews, prompts, plans, literature, status, and the finding register. See [`notes/README.md`](notes/README.md) |
| `LICENSE` | MIT |

## Paper tables and figures → analysis files

Mapping taken from the paper's Appendix table "Where each result is filed" (`tab:files` in `paper/PAPER.tex`) and the figure generator comments in `paper/figures/*.tex`. Numbering follows the order of the figure environments in `paper/PAPER.tex`. Figures 1–3 are in the main body. Figure 4 (`fig:penalty`) is in Appendix B (Robustness). The figure source files are named by an older numbering (Figure 1 is `fig4-floor-resolution.tex`; Figure 4 is `fig1-penalty-per-model.tex`).

| Paper item | Label | Primary source(s) under `analysis/` |
|---|---|---|
| Table 1 — models / price cards | `tab:models` | Study design (not an analysis JSON) |
| Table 2 — raw PTC vs native | `tab:raw` | `panel-analysis-6model-2026-10-09.json` |
| Table 3 — cold vs billed | `tab:coldbilled` | `prefix-retention.json`, `prefix-retention-ci-2026-10-10.json` |
| Table 4 — Anthropic cache A/B | `tab:anthropicab` | Development pilot (documents only; raw logs not in MANIFEST) |
| Table 5 — Anthropic cost brackets | `tab:cost` | `anthropic-cost-bracket-2026-10-10.json` |
| Table 6 — order-adjusted contrasts | `tab:adjusted` | `position-adjust-6model-2026-10-09.json` |
| **Table 7 — counterbalanced re-run** | `tab:rerun` | **`rerun-compare-2026-10-11.json`** (also uses the filed adjusted estimates in the two `position-adjust-*.json` files) |
| Table 8 — quality / both-solved | `tab:quality` | `quality-guard-2026-10-10.json` |
| Table 9 — tasks-b raw R1 | `tab:r1` | `panel-analysis-batchb-four-2026-10-09.json` |
| Table 10 — checklist | `tab:checklist` | Prose |
| Table 11 — H1–H4 | `tab:hypotheses` | `hypotheses-6model-2026-10-09.json`, `mixed-effects-6model-2026-10-04.json` |
| Table 12 — Anthropic tasks-b extension | `tab:extension` | tasks-b Anthropic matrices / panel outputs |
| Table 13 — re-run quality | `tab:rerunquality` | `rerun-compare-2026-10-11.json` |
| Table 14 — file index | `tab:files` | This mapping |
| **Figure 1 — A/A noise floor** | `fig:floor` | `position-adjust-6model-2026-10-09.json`, `aa-placebo-2026-10-10.json`, `rerun-compare-2026-10-11.json` |
| **Figure 2 — replication (batch 1 vs tasks-b)** | `fig:replication` | `position-adjust-6model-2026-10-09.json`, **`position-adjust-batchb-2026-10-09.json`** |
| **Figure 3 — adjacent-rank ties** | `fig:ties` | `ranking-adjusted-2026-10-10.json` (ablations: `ablations-2026-10-09.json`) |
| **Figure 4 — batch-1 order-adjusted effect per model (Appendix B)** | `fig:penalty` | `position-adjust-6model-2026-10-09.json` |

Related outputs also cited in `tab:files`: `replication-verdict-batchb-2026-10-09.json`, `verdict-seed-stability-2026-10-10.json`, `retention-pilot-2026-10-10.json`, `test-edit-sensitivity-6model-2026-10-04.json`, `test-edit-incidence-2026-10-10.json`, `common-f-infeasibility-2026-10-10.json`.

## Reproducibility note (committed files vs rebuild)

**The paper's numbers come from the committed analysis JSON files**, especially the dated `*-2026-10-09.json` / `*-2026-10-10.json` / `rerun-compare-2026-10-11.json` files listed above. Prefer those files (and `node tools/artifact.mjs --verify`) over a fresh rebuild when checking the paper.

Rebuilding the five scope-1 outputs with today's code does **not** reproduce the committed files byte for byte. These are the outputs of `node tools/artifact.mjs` (`ANALYSIS_COMMANDS` in `tools/artifact.mjs`):

- `analysis/cost-panel-6model-2026-10-03.json`
- `analysis/panel-analysis-6model-2026-10-03.json`
- `analysis/hypotheses-6model-2026-10-03.json`
- `analysis/prefix-retention.json`
- `analysis/test-edit-sensitivity-6model-2026-10-04.json`

What a rebuild on 2026-11-06 changed, compared with the committed files:

- `prefix-retention.json` and `test-edit-sensitivity-6model-2026-10-04.json`: no change in any value.
- `cost-panel-6model-2026-10-03.json`: a `position` field is added; no value changes.
- `hypotheses-6model-2026-10-03.json` and `panel-analysis-6model-2026-10-03.json`: the confidence intervals move, because today's code draws 200,000 bootstrap resamples where the committed files used 5,000 (the paper's re-filing at B = 200,000). The point estimates do not change. One panel interval (`sections.A2.4`) now includes zero where the 5,000-resample interval did not. The panel also gains cache hit-rate fields (`dshHitRate`, `nonDshHitRate` and cell counts).

The paper does not cite these five 2026-10-03/04 files as its current filing; it cites the later dated files in the mapping above, which were filed at B = 200,000. Keep the committed files for checking the paper. A rebuild rewrites the MANIFEST, so `--verify` against the shipped manifest will then report drift.

## History and redactions

This repository starts from a single snapshot commit. The study's working history (about 300 commits) is not published, so commit hashes cited in `PAPER.md`, the review files and the HANDOVER notes do not resolve here. Those notes live under [`notes/`](notes/README.md). [`HISTORY.md`](HISTORY.md) lists every way the snapshot differs from the end of that history. In short:

- Live API keys and other secrets captured in the session transcript were replaced in place with `[REDACTED-<kind>]`, and the keys have been rotated. `.keys.json` and similar files remain gitignored.
- Windows user names in paths and text → `user` (case kept); the machine name → `workstation`.
- Anthropic workspace IDs → `wrkspc_REDACTED`.
- Masked key tails (`upstreamKeyMasked`, `sk-...` and similar) → `...XXXX`.
- `recovered/sessions-text.txt` ships gzipped as `recovered/sessions-text.txt.gz`.

The placeholder path `C:\Users\user\...` appears throughout the docs, tools and logs (about 95 files). It is not a real account name; tools that expect a local install there will need the path adjusted.

## License

MIT License — Copyright (c) 2026 Max Reischl and Alexander Feurer. See [`LICENSE`](LICENSE).

## Cite

```
Max Reischl and Alexander Feurer.
Six Pitfalls in Measuring the Cost of Coding Agents:
Evidence from a Cross-provider Study of Code Mode.
[arXiv link to be added].
Code and data: https://github.com/Max6617/agent-cost-pitfalls
Release v1.0.
Zenodo: https://doi.org/10.5281/zenodo.24039669
```

## Use of AI tools

LLM assistants were used extensively in the experiments, tooling and manuscript; the authors directed the work and take full responsibility for all content, numbers and citations. LLM assistants are not authors.

