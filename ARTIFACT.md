# ARTIFACT — how to re-derive every number, and what can no longer be derived

**Built 2026-10-04; extended 2026-10-10, 2026-10-11 and 2026-11-07 (the counterbalanced re-run's records and `rerun-compare` output). Two scopes, 126 checksummed files. One command builds, one
extends, one verifies.**

```
node tools/artifact.mjs            # re-run every analysis, checksum inputs and outputs, write artifact/MANIFEST.json
node tools/artifact.mjs --extend   # add a scope without re-running the recorded one (the additive path)
node tools/artifact.mjs --verify   # re-checksum and compare; non-zero exit on drift
node --test "tools/*.test.mjs"     # the test suite
```

`artifact/MANIFEST.json` records, for every raw input and every analysis output: path, byte size and
SHA-256; plus the exact commands, the test command, the pinned Node version, and the per-matrix
facts (cells, tasks, arms, seeds, solved, matrix ids, harness versions).

**Two scopes.** The first is the six batch-1 matrices, built 2026-10-04; its `generated` timestamp and
every hash in it are unchanged since. The second (added and extended 2026-10-09/10) covers what the
paper reports after that date: the tasks-b replication suite, the position-adjusted re-derivation of the
batch-1 contrasts, the ablations, the mixed-effects fit, the position-adjusted ranking sensitivity, the
both-seeds retention interval, the per-arm test-edit incidence, the 20-seed verdict stability, the
corrected A/A noise floor, the single-harness retention pilot, the Anthropic cost bracket, the common-`f`
position fit, and the batch-1 contrasts re-derived at **B = 200,000**. `--extend` is the additive path:
it runs only the new commands and upserts their hashes. `--build` re-runs everything and would rewrite
the first scope's outputs as a side effect, so it is not the way to add a scope.

## The data in the package

| dataset | cells | notes |
|---|---|---|
| `results/ds-full` | 620 | DeepSeek V4.1 Flash, 31 tasks x 10 arms x 2 seeds, re-collected 2026-10-02 |
| `results/glm-flash` | 620 | GLM-5.3-Flash |
| `results/luna-full` | 620 | gpt-6-luna |
| `results/qwen-full` | 620 (621 records) | Qwen3.8-Flash; one cell carries an infrastructure failure plus its justified retry |
| `results/haiku-full` | 620 | Claude Haiku 4.5 |
| `results/sonnet-full` | 620 | Claude Sonnet 5.5 |
| `results/batchb-*` (six) | 800 each | the tasks-b replication suite, 40 tasks x 10 arms x 2 seeds |

Raw gateway logs sit beside them (`results/*gateway*.jsonl`), and every cost in the package is
re-derived from those token counts under the pre-registered cost function — never read from a logged
cost. `results/` and `_ev/` are tracked; `results/_scratch/` is the one untracked scratch root.

## What a reviewer can re-derive

- cost per arm, per model, with the pre-registered `cost_billed` and `cost_cold`
- the PTC-vs-native differential per provider, paired by task, with cluster-bootstrap intervals
- the Holm-corrected family and its two readings
- the adjacent-rank-step tie fraction
- the cache-prefix retention per provider and mode
- every number in `notes/records/STEP2-RECONCILIATION.md` — with one caveat: its six-model A2 table was computed
  at the old **B = 5,000**; the current re-filing at B = 200,000 is
  `analysis/panel-analysis-6model-2026-10-09.json`, and `PAPER.md` §3.1 cites that one

## What CANNOT be re-derived, and why

On **2026-10-02 the entire `results/` tree was destroyed** (`notes/handovers/NEW-SESSION-BRIEF.md` §0): 24 matrices,
~5,900 run records, ~102,000 gateway records. `results/` was gitignored, so git held nothing, and
**zero run records were recovered**. The backup mirror is of `results/`, so it lost the same files.

| figures | why they cannot be re-derived | what survives |
|---|---|---|
| **F31, F34, F35** | the seven-model panel: `glm53`, `glm-terse`, `glm-harness`, `haiku-full`, `sonnet-full` are gone | `analysis/panel-analysis.json` and `analysis/hypotheses.json`, generated 2026-10-02T07:52Z — **the only witness; do not overwrite** |
| **F38** | `results/f18-*` and `results/haiku-hard-probe` are gone | nothing |
| **F42** | `results/hardbatch-deepseek`, `hardbatch-glm`, `hardbatch-qwen-fixed` are gone | one gateway log, no run records |

Both analysis tools **default to writing those two surviving JSON files**. Re-running them with
default arguments destroys the only record of the seven-model results. New outputs go to
`analysis/*-4model-2026-10-03.json`.

## Pinned versions

- **Node**: recorded in the manifest; the suite and every tool are run with it.
- **Harness versions**: `harnessVersion` is stamped on every record of GLM, luna and qwen. It is
  **absent on all 620 `ds-full` records** (collected before the stamp existed), which is why the
  manifest reports `hasFixtureField` per matrix rather than asserting full coverage.
- **DSH**: `@deepseek-ai/dsh@0.1.7-rc.2` (MIT), unmodified. The study authors the *conditions*, not
  the harness — `PRE-REGISTRATION.md` §11.

## Standing caveats

- `ds-full` carries **no `fixture` field** on any record, so its test-edit count is not measured by
  the record; the retroactive scan of surviving workdirs gives 0/62 (`_ev/ds-test-edit-scan.md`).
- The four survivors are **four providers**, all cheap-tier with automatic caching. The published
  seven-model figures include three providers that no longer exist, and the one declared-cache
  provider (Anthropic) is not among them.
