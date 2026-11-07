# METHODS — the study as run

**2026-10-04.** This file describes the study that produced the six matrices under `results/`, the
five analysis artifacts under `analysis/`, and the results in `PAPER.md` (commit `c5b2157`). It
replaces a draft written before any of that data existed. Every claim the draft made that the data
does not support is marked **RETRACTED** at the point where it stood, with the date and the reason;
nothing was removed silently.

Numbers here come from `PAPER.md`, `notes/records/STEP2-RECONCILIATION.md` §7, or are read directly out of the
analysis JSONs named below. Where a figure comes from somewhere else — a tool header, a registry, a
directory listing, a measurement taken for this file — the source is named at that point.

Sources of record, all regenerated 2026-10-04T08:10–08:11Z by `node tools/artifact.mjs` and
checksummed in `artifact/MANIFEST.json`:
`analysis/cost-panel-6model-2026-10-03.json`, `analysis/panel-analysis-6model-2026-10-03.json`,
`analysis/hypotheses-6model-2026-10-03.json`, `analysis/prefix-retention.json`,
`analysis/test-edit-sensitivity-6model-2026-10-04.json`.

---

## 1. Design

**What is compared.** An *arm* is a harness in a specific configuration, not a harness. Ten arms ran
in every one of six matrices:

| arm | what it is |
|---|---|
| `dsh:native` | DSH, native tool presentation, shipped policy |
| `dsh:ptc` | DSH, PTC presentation, shipped policy |
| `dsh:native-opt` | DSH, native presentation, optimized policy |
| `dsh:ptc-opt` | DSH, PTC presentation, optimized policy |
| `dsh:native-terse` | `dsh:native` plus the terseness instruction |
| `dsh:ptc-terse` | `dsh:ptc` plus the terseness instruction |
| `opencode` | OpenCode, its own defaults |
| `cline` | Cline, its own defaults |
| `openhands` | OpenHands, its own defaults |
| `goose` | Goose, its own defaults |

The DSH arms manipulate three factors (`conditions/arms.mjs`):

| factor | levels | operationalisation |
|---|---|---|
| **presentation** | native / PTC | `DSH_TOOLS_MODE`; 24 declared tool schemas against 1 (§2) |
| **policy** | shipped / optimized | `conditions/shipped.yml` against `conditions/optimized.yml`, a tool-result pruner |
| **terseness** | default / terse | a one-sentence prompt suffix, applied identically to every harness |

Only four of the six DSH arms form the full presentation × policy 2×2; the two terse arms hold the
shipped policy fixed and vary the prompt alone, which is what the H2 manipulation needs. The policy
factor is exploratory and not a tested contrast (§7).

The four external harnesses contribute one arm each. Presentation and policy are DSH concepts — a
third-party harness has its own tool surface and its own context policy — so imposing them would be a
fabricated comparison rather than a controlled one. Their own defaults are the condition, and the
defaults are reported as part of it: in the DeepSeek matrix the archived requests show Cline
presenting 25 tool schemas, Goose 17, OpenCode 10 and OpenHands 7, against DSH's 24 and PTC's 1 (§2).

**Six matrices, one per model.** Each matrix runs all ten arms × 31 tasks × 2 seeds = 620 cells under
one enforced model (`results/*/matrix.json`): the model is the matrix, and the ten arms are columns
within it.

**RETRACTED (2026-10-04).** The draft opened with a 2×2 design and **five** arms — four DSH
presentation × policy conditions plus OpenCode as 'an external anchor' — and described OpenCode's
code-mode as a planned sixth arm. Five arms did not run; ten did. The bare 2×2 is the Phase-1 design,
and the external harnesses are not anchors but four of the ten conditions.

## 2. Systems under test

| system | version | arms | driven headlessly as | credential path |
|---|---|---|---|---|
| DSH | 0.1.7-rc.2 | 6 conditions | `node <dsh>/lib/bin.js --profile exp --patch <condition> <prompt>` | `DEEPSEEK_BASE_URL`, synthetic key |
| OpenCode | 1.18.30 | `opencode` | `run --model gateway/<model> --format json <prompt>` | generated config via `OPENCODE_CONFIG` |
| Cline | 3.0.65 | `cline` | pinned JS entry run by `node`, `-P openai-compatible -k <key> -m <model> --json --auto-approve true -t <t> <prompt>` | `-k` per run; base URL from a per-run `--config` provider store |
| OpenHands | 1.16.0 | `openhands` | `openhands --headless --override-with-envs -t <prompt>` | `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` |
| Goose | 1.52.0 | `goose` | `goose run -t <prompt> --no-session -q` | `OPENAI_API_KEY` / `OPENAI_HOST` / `GOOSE_PROVIDER` / `GOOSE_MODEL` |

Node v24.19.0, Python 3.12.6, Windows (win32 x64). Only five harnesses are in the study, and all
five were installed, preflighted and run.

**Where the versions come from, and one hole in them.** The versions above are the probed values in
`results/*/matrix.json` (`harnessVersions`), stamped on every run record of the five matrices
collected after the stamp existed. They are not read from this document, which is the point: a
harness that updates itself mid-study is a treatment change, and prose cannot record one.

In `ds-full` the DSH probe could not execute — DSH is not on `PATH` and is launched as `node` plus
its `bin.js` — so **372 of `ds-full`'s 620 records carry `harnessVersion: null`**: all six DSH arms,
62 records each. The other 248 records, the four external arms, carry the probed version. The matrix
was not re-collected to paper over the hole. `results/ds-full/matrix.json` carries a
`harnessVersionsPostHoc` block recording what the *install* proves: `@deepseek-ai/dsh` 0.1.7-rc.2,
package mtime 2026-09-29T11:03:43Z, `installPredatesMatrix: true`,
`installChangedDuringMatrix: false`, `recordsAffected: 372`.

**Tool surface, measured rather than declared.** Counted from the `tools` field of the archived
gateway requests in `results/cmuquohyu-deepseek-gateway.jsonl`:

| arm | declared tool schemas | requests counted |
|---|---|---|
| `dsh:native` (and `-opt`, `-terse`) | **24** | 2,129 |
| `dsh:ptc` (and `-opt`, `-terse`) | **1** | 1,738 |
| `cline` | 25 | 616 |
| `goose` | 17 | 570 |
| `opencode` | 10 | 538 |
| `openhands` | 7 | 802 |

Across the five matrices whose records carry a tool count — luna's OpenAI Responses path records
none — 10,086 DSH native requests record 24 schemas and 9,084 PTC requests record 1, and no DSH
request records any other count.

**RETRACTED (2026-10-04).** The draft said native mode exposes '25 tools in this configuration', and
`conditions/arms.mjs` still carries that comment. The archived requests say 24; 25 is what Cline
presents. The count is corrected here and the stale comment is a copy, not evidence.

**Every harness is driven unmodified.** No harness source was patched; configuration was supplied
externally (environment variable, generated config file, or the harness's own auth subcommand).
Cline is the one case that needed more than configuration, and it did not need patching: its global
npm install updates itself in the background during a run (observed moving 3.0.65 → 3.0.68 and
deleting its own shims), so the arm runs from a pinned copy under `../betterharness-tools/`, launched
as `node <entry>` with no shell. The shell is what stopped the first hard-suite pilot: a `.cmd` shim
cannot carry a double quote inside a quoted argument, `edge-cron-parser`'s prompt contains one, and
Cline exited 1 with zero requests.

**Harnesses in the registry that are not arms.** Aider is **excluded from the harness comparison** by
`PRE-REGISTRATION.md` §9, as a finding: it is a pair programmer that requires files to be added to
context, not an autonomous discovery agent. It was never run here and no result depends on it.
SWE-agent is recorded in `tools/harnesses.mjs` as `gateway-reached` only, a level the registry
defines as enough to prove the wiring and not enough to enter a task-performance comparison; it is
not an arm.

**RETRACTED (2026-10-04).** The draft's systems table listed **Aider 0.86.2** as installed and
described Aider and Cline as 'not yet in the reported matrix'. Cline ran 62 cells in each of the six
matrices. Aider is not in the study at all, by a pre-registered exclusion, and the version the draft
carried was evidence of nothing.

## 3. Task suites

Three suites exist in the repository. Only the first is the population of the six matrices.

### 3.1 `tasks/` — batch 1: 31 tasks

| stratum | n | what it exercises |
|---|---|---|
| single-step | 7 | one file, one clear defect |
| multi-file | 7 | a change crossing 3–8 files |
| repo-wide | 6 | a sweep across many call sites |
| long-horizon | 5 | investigation is most of the work |
| fetch-heavy | 5 | the answer is not in the repository |
| `example-fix` | 1 | the smoke task preflight uses |
| **total** | **31** | |

`node tools/validate-tasks.mjs` reports **31 tasks, 31 valid, 0 invalid**. Each task is a
self-contained repository with a natural-language prompt and a test suite used only for grading.

**Validity gates**, applied to every task before it entered the suite and enforced mechanically:
(1) the suite must **fail** on the untouched fixture — a task whose tests already pass cannot
discriminate, and this was a real defect in an earlier internal task; (2) determinism, the suite run
twice and required to give the same verdict. Grading is by test-suite exit status; **no LLM judges
anything**.

**Grading happens in the workdir as the arm left it.** `tasks/<task>/task.json` runs its test command
in a copy of the fixture, and nothing restores the fixture's tests first, so weakening an assertion is
scored as a solve. That is measured rather than assumed: `tools/fixture-guard.mjs` snapshots the
fixture before the harness runs and diffs it afterwards, and every record carries
`fixture.gradedOnEditedTests`.

**The rule for it was pre-declared.** `PRE-REGISTRATION.md` §12.8 (amendment 21) was committed
(`b9cbe19`) **before** its effect was computed (`662033e`): report every model's rate as measured,
exclude nothing, restore nothing, never report an unmeasured rate as 0%, and publish two sensitivities
beside every solve rate. `analysis/test-edit-sensitivity-6model-2026-10-04.json`:

| model | records | graded on edited tests | as measured | S1 (drop edited) | S2 (worst case) |
|---|---|---|---|---|---|
| DeepSeek V4.1 Flash | 620 | not measured | 619/620 = 99.84% | = as measured | = as measured |
| GLM-5.3-Flash | 620 | 2 | 617/620 = 99.52% | 615/618 = 99.51% | 615/620 = 99.19% |
| gpt-6-luna | 620 | 81 | 589/620 = 95.00% | 510/539 = 94.62% | 510/620 = 82.26% |
| Qwen3.8-Flash | 621 | 1 | 605/621 = 97.42% | 604/620 = 97.42% | 604/621 = 97.26% |
| Claude Haiku 4.5 | 620 | 5 | 519/620 = 83.71% | 518/615 = 84.23% | 518/620 = 83.55% |
| Claude Sonnet 5.5 | 620 | 0 | 618/620 = 99.68% | = as measured | = as measured |

DeepSeek's `fixture` field is absent on all 620 of its records, so its incidence is **not measured**
and is never quoted as 0%; a retroactive scan of a non-random 62-workdir sample found 0/62
(`_ev/ds-test-edit-scan.md`). S2 is a valid one-sided bound, because weakening a graded suite can
only move a run from unsolved to solved, and the pair (S2, as measured) brackets the true rate. The
as-measured figure is the reported figure; S1 and S2 travel with it and may not replace it.

**RETRACTED (2026-10-04).** The draft said the suite had **30 tasks**, gave a stratum table that
summed to 30 by omitting `example-fix`, and then claimed that 'All 15 tasks checked to date were
solved by every arm', concluding that the suite 'presently measures cost at equal quality rather
than discriminating on quality'. Both claims are retracted. Thirty-one tasks entered every matrix,
and near-total saturation is false on six models: Haiku solves 83.71% of its cells and luna 95.00%
(table above). The suite does discriminate, and where it does not the cost comparison is reported as
confounded rather than as cost at equal quality (§7).

### 3.2 `tasks-hard/` — the hard suite: 24 tasks

A second batch, deliberately separate so batch 1 stays intact and comparable. Twenty-four tasks in
**four strata of six** (long-horizon, spec-implementation, cross-cutting, edge-case-dense) and **588
authored hidden cases**, 23–25 per task counted from `tasks-hard/*/grade/tests/`.

What is different from batch 1: the outcome is the **fraction of authored cases passed** rather than
a binary verdict; fixtures are 400–1,500 lines across 10–25 files; each task carries 4–6 independent
sub-problems; and the acceptance suite lives **outside the fixture** (`grade/tests/`) and is staged
in by `tasks-hard/_grade/run.mjs`, so an arm cannot read, weaken or delete it. Each score has the
same denominator — the number of cases *authored* — so a solution that breaks an import does not also
shrink the denominator.

`node tools/validate-tasks.mjs --dir tasks-hard` reports **24 tasks, 23 valid, 1 invalid** at the time
of writing: `edge-json-schema` fails the gate because its grader **errors** (an assertion expecting a
`SchemaError` receives a `SyntaxError`) instead of failing its assertions. The suite's own `RESULTS.md`
records an earlier 24-ok state; what is true now is the command's output. Per-task floors and
reference scores are recorded in that file rather than repeated here.

A DeepSeek-only pilot of the full 240-cell hard matrix (24 tasks × 10 arms × 1 seed) is **in
progress**. No hard-suite result is reported anywhere in this study yet.

### 3.3 `tasks-b/` — the independent replication suite: 40 tasks

Forty new tasks, ten per stratum, graded by a hidden suite staged from outside the fixture. Its own
README states its provenance plainly: it was authored on 2026-10-03 **after** the batch-1 results
were known, so it is a **replication suite, not a held-out suite**, and no claim that it is held out
may appear in the paper. It is the design answer to the test-editing confound above. It is **complete
and validates 40/40**; its analysis was pre-registered before collection (`tasks-b/PLAN.md` §5), 800
cells per provider were collected on the four cheap providers plus two Anthropic extension rows, and
its pre-registered verdict **is a result of this study**: **NOT REPLICATED** (R1 0 of 4, R2 fails;
`PAPER.md` §3.8, FINDINGS F51). The earlier draft's "in progress, 21 of 40 valid, no result rests on
it" is stale on all three counts.

## 4. Measurement infrastructure

The instrument is an HTTP gateway at the provider boundary (`tools/measure-gateway.mjs`). Every
harness is pointed at it and given a **synthetic credential** of the form `exp-<harness>-<runId>`,
where `<runId>` is `<matrixId>-<harness>-<task>-<arm>-s<seed>`. The gateway substitutes the real
provider key, so no harness ever holds a real credential, and the synthetic key **is** the run
identifier: usage joins to a run by construction rather than by timestamp matching.

The gateway does four things beyond proxying:

- **captures the provider's own usage block**, including the cache hit / miss / creation split, and
  logs every request with its status;
- **enforces** a single model per matrix, and the reasoning effort where the study set one (DeepSeek
  and GLM-Flash: high; the other four models: none), and **logs every rewrite** it applies
  (`deviations`), together with the model the provider says it served — for example
  `claude-haiku-4-5-20251001`, a dated snapshot the requested id would not distinguish;
- **lowers `max_tokens` to a per-provider ceiling** when a harness asks above it. It only ever lowers,
  and the ceiling is load-bearing rather than cosmetic: DSH asks GLM for 256,000 tokens, above
  z.ai's 131,072 ceiling, and every DSH request 400s without the cap;
- **normalises across two protocols** — the Anthropic Messages API and OpenAI chat completions — at
  the provider's own endpoints where a provider exposes both.

**Attribution was wrong once, and the fix is a single function.** The gateway originally split the
synthetic key with a regex that took the shortest harness for which the next segment began with `r`,
so a task name containing an `r`-initial segment (`fetch-heavy-semver-RANGES`) filed its usage under
a harness nobody queried: 632 records in one session measured zero cost and looked fine.
`tools/attribute.mjs parseSyntheticKey` is now the single definition — the harness is the first
segment after `exp-`, the runId is everything after it — every tool that joins runs to usage must use
it, and records written by the older gateway are recovered rather than discarded.

**Per-matrix conditions are recorded, not remembered.** Each matrix writes
`results/<matrix>/collection.json` with the gateway's resolved argv, the enforced model and ceiling,
and the cache condition. The six matrices:

| matrix | model | forced effort | cache condition | `max_tokens` ceiling |
|---|---|---|---|---|
| `ds-full` | deepseek-flash | high | none injected (provider caches automatically) | none |
| `glm-flash` | glm-5.3-flash | high | none injected | 32,768 |
| `luna-full` | gpt-6-luna | none | static breakpoints | none |
| `qwen-full` | qwen3.8-flash | none | static breakpoints | 32,768 |
| `haiku-full` | claude-haiku-4.5 | none | static breakpoints **+ top-level auto-cache** | 32,768 |
| `sonnet-full` | claude-sonnet-5.5 | none | static breakpoints **+ top-level auto-cache** | 32,768 |

The cache condition differs by model because the treatment differs; the differences are pinned by
tests (`tools/collect-gateway.test.mjs`) so that one provider's flag list cannot silently be copied
onto another.

**The Anthropic cache condition was chosen by measurement.** Anthropic caches only what it is told to
cache, and the gateway's static breakpoints mark the *last tool*. `dsh:ptc` presents one tool, so on
Haiku its cacheable prefix fell under the 4,096-token minimum and was **never cached at all**: zero
hit tokens across 869 requests, against 27.6% for native. A static-only condition therefore measured
the gateway's breakpoint placement, not the harness. The measured A/B, one variable changed:

| condition | PTC hit rate | PTC $/run | native $/run | 62 runs |
|---|---|---|---|---|
| static breakpoints only | 0.0% | 0.74186 | 0.38580 | 34.96 |
| **+ top-level `cache_control`** | **99.9%** | **0.21593** | **0.12026** | **10.42** |

The study runs the second condition for both Anthropic models, so that every arm on every model
caches, as it does automatically on the other four providers. The top-level field applies only on the
Anthropic Messages path, so no earlier matrix changed. The condition is asserted by
`tools/collect-gateway.test.mjs` ('Anthropic declares the top-level cache field, so no arm is left
uncached') and the A/B itself is recorded in `_ev/anthropic-pilot-2026-10-03.md`.

**Evidence drift has a declared cut-off.** A runaway `openhands` process from the finished luna matrix
kept posting to a stale gateway for 29 hours and appended 15 records to luna's gateway log after
sign-off. Those records are genuine, they stay on disk, and they are excluded from the analysis by a
**declared cut-off** at `2026-10-04T06:01:57Z` in `tools/study-window.mjs` — because their number
depends on when the runaway was stopped, and a per-cell cost that grows with the lifetime of an
unattended process is not a measurement of the run. The exclusion is counted (`postCutoff: 15` in
`analysis/panel-analysis-6model-2026-10-03.json`), not silent; nothing was deleted or re-baselined.
The same module keeps a *running* matrix's gateway log out of the artifact manifest, recording it by
name under `inFlight` instead of checksumming it as a signed-off input.

## 5. Metrics and cost model

Per run:

| metric | definition |
|---|---|
| **solved** | the harness exited 0 **and** the grading suite exited 0 |
| **steps** | model requests attributed to the run |
| **input / output tokens** | summed over the run's requests |
| **cache hit rate** | `hit / (hit + fresh + created)` |
| **cost_billed** | `fresh·miss + created·(write ?? miss) + hit·hit + output·out` |
| **cost_cold** | every input token priced at the miss rate |
| **passRate** | fraction of test cases passed, where the runner can parse counts |

`solved` is deliberately a conjunction rather than the suite's exit status alone: six runs in the six
matrices have a passing suite and a harness that did not exit 0 (five timed out, one exited 1), and
they are scored unsolved. The rule was not changed for them, because changing it mid-study alters the
treatment; they are disclosed instead (`PAPER.md` §4.5).

**Both cost metrics are always reported.** They answer different questions: `cost_cold` is invariant
to cache state and therefore comparable across designs, while `cost_billed` is what a user pays. They
can disagree in **direction**, and on this data they do: on luna the PTC differential is `+1.20%`
billed against `-21.17%` cold, because the volume saved is cancelled by cache pricing
(`analysis/prefix-retention.json`). Reporting one alone would be a methodological error.

**Prices.** `tools/prices.mjs` is the single copy of the published rate cards, USD per million tokens,
and it is also what the gateway prices every request with. The six models this study ran:

| model | miss | hit | write | output | output:input | cache discount |
|---|---|---|---|---|---|---|
| deepseek-flash | 0.15 | 0.003 | — (miss) | 0.60 | 4.00 | 50× |
| glm-5.3-flash | 0.15 | 0.03 | — (miss) | 0.50 | 3.33 | 5× |
| qwen3.8-flash | 0.15 | 0.016 | — (miss) | 0.47 | 3.13 | 9.4× |
| gpt-6-luna | 0.10 | 0.01 | 0.125 | 0.50 | 5.00 | 10× |
| claude-haiku-4.5 | 1.00 | 0.10 | 1.25 | 5.00 | 5.00 | 10× |
| claude-sonnet-5.5 | 2.00 | 0.20 | 2.50 | 10.00 | 5.00 | 10× |

A dash in the write column means the provider charges the miss rate for a cache write: the three
automatic-caching models' cards carry no `write` entry and `costOf` prices `write ?? miss`. Anthropic
and OpenAI charge **more** to write than to send uncached, which is why their write column is
explicit. The card holds other models too (`glm-5.3`, `qwen3.8-max`, `gpt-6.1-sol`, `deepseek-pro`);
they are not part of this study's population.

**The retracted DeepSeek row stays visible.** The card read `miss 0.14 / hit 0.028 / out 0.28` until
2026-09-30, from a third-party blog. It was wrong in every cell — cache-hit 9.3× too high and output
2.1× too low — and it inverted the study's primary hypothesis, because the correction moves DeepSeek's
output:input ratio from 2.00 to 4.00 and its cache discount from 5× to 50×. The retracted row survives
in `tools/prices.mjs` as `RETRACTED`, priced by nothing, so the before/after comparison stays possible.

**Cost is re-derived, never read from a summary.** Every figure in the analysis is computed from the
archived token counts with `costOf`, and `fresh = cacheMissTokens`, not `max(0, miss − created)`: the
token buckets are disjoint, and the double subtraction survived in five places because it is small and
plausible.

**Anthropic cost is a bracket, and the bracket is not decoration.** The four external harnesses reach
Anthropic through its OpenAI-compatible endpoint, whose responses report no cache split, so the archive
holds **6,772 requests carrying 129.3M input tokens whose cache state it does not record** — 4,641
requests and 88.01M tokens for Haiku, 2,131 and 41.31M for Sonnet. Two tools then treat that absence
in opposite ways: `prices.costOf` prices it at zero, a lower bound; the shipped cost panel prices it
at the miss rate, an upper bound, and one the session ledger refutes — the panel reports 143.35 for
Haiku alone, against a whole-session Anthropic ledger delta of 144.33 for both matrices and their
pilots. Neither end is a measurement.

Therefore: `tools/prices.mjs` exports `costBounds()` and `cacheSplitUnknown()`, `cost-panel` carries
`costBilledLow` beside `costBilled`, and **per-run Anthropic cost is reported as a bracket — Haiku
0.105–0.233 and Sonnet 0.082–0.202 USD per run — with the ledger capping the pair from outside at
0.1164 per run.** No external-harness Anthropic cost is quoted at all. The PTC differentials, H1–H3
and the retention results are unaffected, because they use DSH arms or request bodies.
`notes/defects/DEFECT-anthropic-external-costs.md` is the record, including the correction of its own first version.

**RETRACTED (2026-10-04).** A handover presented a pair of per-run Anthropic figures as *measured*.
They are the lower bound of this bracket, not measurements, and they are not quoted here. Likewise
the shipped panel's cache hit rate for an Anthropic external arm is a logging defect — it reports
0.000 for every one of them — so no cache figure for an Anthropic external arm is quoted from the
panel; the retention results in `PAPER.md` §3.3 come from `analysis/prefix-retention.json`, which is
computed from request-body growth instead.

## 6. Procedure

For each (task, arm, seed):

1. the task's fixture is copied to a fresh temporary directory;
2. the gateway is already running with the matrix's resolved flags; the harness is invoked headlessly
   in that directory with the task prompt and the run's synthetic key;
3. all provider traffic traverses the gateway, which logs every request and its status;
4. the fixture is diffed against its pre-run snapshot, recording what the arm changed, including
   whether it edited the tests it is graded by;
5. the task's test command runs in that same directory and its exit status is recorded;
6. the temporary directory is removed.

Seeds (1 and 2) vary execution only; tasks are deterministic. Runs execute concurrently at
`--jobs 4` with a per-run timeout of 20 minutes. The runner writes one record per run to
`results/<matrix>/runs.jsonl`, mirrors `results/` outside the working tree every 25 completed runs,
and commits when the matrix completes. `--resume` is the only re-entry; no output directory is deleted.

**Arm order.** Within a (task, seed) block the ten arms are assigned slots by a seeded shuffle,
`shuffleWith(arms, seed, task)`. In each shipped matrix every slot 0–9 occurs exactly 62 times and
all 100 arm × slot combinations occur, so the assignment is balanced rather than random; `dsh:ptc`
takes slot 0 in 2 of 62 blocks and `opencode` in 10 of 62, against a uniform expectation of 6.2. The
shuffle is a function of (task, seed) only, so the same block order recurs in all six matrices: a
cross-provider comparison shares one order rather than six.

**RETRACTED (2026-10-04).** The draft asserted that arm order is 'randomised per seed so that cache
warming and machine state cannot confound the arm comparison', without qualification. The record does
not support that as written: the order is a fixed, balanced assignment, identical across matrices.
The position confound is also **not closed**: `notes/records/FINDINGS.md` F45 records an arm-asymmetric shuffle,
with `dsh:ptc` reaching slot 0 in most blocks, on datasets that no longer exist. That measurement does
not reproduce on the shipped six, where the counts above hold, and what the pre-loss `position` field
meant is unresolved (`notes/handovers/HANDOVER-2026-10-04.md` §4.6). The measured statement above is the one to use.

**Population accounting.** Six matrices × 620 cells planned, 3,721 run records collected (620 × 5,
plus Qwen's 621 — one infrastructure failure and its justified re-run). Two records are excluded by
the closed exclusion list of `PRE-REGISTRATION.md` §9 — one luna cell that failed on provider rate
limits (22 of its 66 requests answered 429) and one Qwen infrastructure failure — leaving **3,719
records over 3,719 cells** in the six-model cost panel: `ds-full` 620, `glm-flash` 620, `luna-full`
619, `qwen-full` 620, `haiku-full` 620, `sonnet-full` 620. `PAPER.md` §1 gives the population as
3,720 cells; the difference is that excluded luna cell. Exclusions are counted in each matrix's
`meta` block rather than left implicit. Repeated records inside one cell are **averaged**, not
selected (`PRE-REGISTRATION.md` §12.4); in the six matrices that ship, no analysed cell holds more
than one record (`contested: 0` throughout), so that rule is declared here rather than exercised.

## 7. Statistical analysis

**Unit and blocking.** The unit of analysis is the run and the **task is the blocking factor**. Per-run
values are averaged over seeds within a (task, arm) cell, giving one value per cell per task.

**Contrasts.** The central contrast is `dsh:ptc` against `dsh:native` on `cost_billed`, **paired by
task**; the interval is a **percentile cluster bootstrap over the tasks** on the absolute difference,
expressed as a percentage of that model's native mean. The tests are stated because they decide the
verdicts: a **sign-flip permutation test** with 200,000 draws and a fresh random stream per contrast
for the six cost contrasts, and an **exact McNemar** test over (task, seed) cells for the solve-rate
contrasts.

**The bootstrap's resample count, method and seed are stated because they were once a defect.**
Method: **percentile** (2.5th and 97.5th of the resampled statistic), clusters are tasks, resampling is
with replacement. **B = 200,000, seed 12345**, both fixed in `tools/stats.mjs` as the default and both
reported beside every table. Until 2026-10-09 the default was **B = 5,000**, at which the endpoint is
not resolved: the same contrast's lower bound moved with sd **0.21pp** across 40 reseeds, and batch-1
Sonnet's row — reported as +9.51% [+0.28%, +17.90%], interval excluding zero — lands below zero in **25
of 40** of them. At B = 200,000 the row is [+0.08%-below, +18.01%] — **it contains zero** — and at
B = 2,000,000 it is stable to 0.01pp. The study's own sign-flip p for that contrast (0.0512, reported
with its Monte Carlo error) agreed with the large-B interval all along; the two were previously
reported as disagreeing, and that disagreement was the bootstrap's fault, not the permutation test's.
The change moves exactly one of the twelve model x suite classifications the paper reports (`§3.9`),
and none in the replication suite.

**The other estimators state theirs too, because "the bootstrap" is not one procedure here.** The
position-adjusted table in `PAPER.md` §3.1 and §3.8 is a **paired within-block regression with a
task-clustered bootstrap at B = 20,000, seed 12345** (`tools/position-adjust.mjs`; each replicate
refits the regression, which is why it is smaller than the panel's 200,000, and its *raw* column uses
the panel's B = 200,000). The **mixed-effects fits** of H1/H3/H4 bootstrap at **B = 2,000**
(`tools/mixed-effects-hypotheses.mjs`; `analysis/mixed-effects-6model-2026-10-04.json`). The
**sign-flip permutation** draws 200,000 times from seed `0x4a17b3c9`, and the hard-suite analysis
declares its own `{ permutationIters: 20000, bootstrapIters: 5000, seed: 20261005 }`. No table in the
paper quotes an interval whose B, method and seed are not stated in this section or in the tool named
beside it.

**Multiplicity.** `PRE-REGISTRATION.md` §6 requires Holm-Bonferroni across the family reported
together. The filed, broad reading is **m = 18 — 6 cost contrasts plus 12 solve-rate contrasts — at
alpha = 0.05, and 2 of the 18 survive, both Claude Haiku**: the PTC cost contrast (p = 0.00005) and
the PTC → PTC-terse solve-rate contrast (p = 0.00014). Qwen's cost contrast (p = 0.0056) fails despite
an interval that excludes zero; Sonnet's (p = 0.0512) fails, and at **B = 200,000 its interval contains
zero too** — the two now agree, where previously the bootstrap put the bound at +0.28% and the two were
reported as disagreeing (see the bootstrap note above). The family was fixed to this broad
reading on 2026-10-03 *because* it removes the study's own significance. **What was fixed on
2026-10-03 was the rule, at m = 12; the six-model family of m = 18 was first computed and committed on
2026-10-04, after the Anthropic pair was collected** (`PAPER.md` §6 discloses the growth; the tasks-b
verdict is reported on the filed m = 12). The narrower per-block
reading leaves 2 of 6 (A2b) and 1 of 12 (A4); it is printed beside the main result as a declared
sensitivity, not as a second result. The paper does not rest on these stars.

**The confirmatory hypotheses**, as filed (`analysis/hypotheses-6model-2026-10-03.json`):

| hypothesis | six-model result | verdict |
|---|---|---|
| H1 (primary) billed penalty rises with output share | b1 = +0.00467 [−0.00551, +0.01568], n = 186 | **INCONCLUSIVE** |
| H2 terse presentation reduces the PTC penalty | mean(d) = +0.00151 [−0.00010, +0.00354], Wilcoxon p = 0.80 | INCONCLUSIVE |
| H3 more tool schemas, more requests | +2.228 [+1.228, +3.360], n = 744 | **SUPPORTED** (direction only; the batch-1 interval contains zero once luna is dropped — `PAPER.md` §3.9 D) |
| H4 cache hit rate does not predict arm cost | bC = +0.11157 [+0.06205, +0.17271] | **REFUTED (new finding)** |

H1 moved from REFUTED on the four cheap providers to INCONCLUSIVE on six, and it is
population-dependent in sign: leave-one-out, dropping DeepSeek gives b1 = +0.133. The pre-registered
secondary condition is still met — the ratio-5.00 penalty exceeds the ratio-3.33 penalty by 42.27
points, against a 5-point bar — so the price-ratio account is neither supported nor refuted: the
primary test is inconclusive while its secondary condition is satisfied. Any statement that the
price-ratio account is refuted would now overstate the data.

**Rank stability** (H5, filed exploratory, tested after the fact and **not promoted**): median
Spearman rho = 0.238 across 15 model pairs, permutation p = 0.0467, rank variance explained 0.0567;
arm-versus-arm concordance 62.1%; and **40 of 54 adjacent arm comparisons, 74.1%, are statistically
indistinguishable**. The tie fraction has not shrunk as models were added.

**Power.** The policy arms are reported as exploratory rather than as a tested contrast: Phase 1
measured `native-opt` against `ptc-opt` at 0.8%, needing 6,257 task blocks for 80% power at two-sided
alpha = 0.05 (`PRE-REGISTRATION.md` §5). The six matrices have 31 task blocks.

**The mixed-effects model has been fitted (2026-10-04).** `notes/plans/JOURNAL-PLAN.md` §5 specifies a linear
mixed-effects model with task as a random intercept; it was fitted by REML for H1, H3 and H4 and is
reported beside the paired estimates (`notes/records/MIXED-EFFECTS-2026-10-04.md`,
`analysis/mixed-effects-6model-2026-10-04.json`). H1 and H4 put the task variance at the boundary
(`s_u` = 0, ICC = 0.000) and their verdicts do not move; H3 keeps its verdict with ICC = 0.134. The
paired tests above remain the primary analysis, and the mixed model is the check a reviewer asks for
next to them.

*(Corrected 2026-10-10: this section said "the mixed-effects model was never fitted" and retracted a
draft that named it the primary model. Both statements were written before the 2026-10-04 fit. The
other two retractions below stand: the filed family is m = 18 over six models, not "21 pairwise
contrasts for 7 arms", and the seven-model power table is not quotable.*)

**Figures that are not quotable, and why.** F31's seven-model spread figure is unreproducible — its
inputs were destroyed on 2026-10-02 — and the six-model version is the one to use: **74.59 percentage
points across the ratio axis, 52.64 of them between the three models that share an output:input ratio
of 5.00, so 70.57% of the between-model spread sits inside a single ratio value**. The panel's cache
hit rates for Anthropic external arms are a logging defect and are not quotable (§5). The panel's
placebo block currently finds **no placebo** (`placebo: []`, `noiseFloorPct: null`); the earlier
placebo verdict and its noise-floor figure are **retracted** — the arms it compared were not in fact
identical (their starter requests differ by 30 and 20 bytes), so what it measured was a difference
between two prompts, not a noise floor — and they are recorded in `notes/records/FINDINGS.md`
and `notes/reviews/REVIEW-RESPONSE.md` rather than quoted here. Three earlier mechanism predictions remain
untestable from these logs: P1 as filed is refuted as stated, and P2 and P3 cannot be evaluated
because tool-call shape and per-task tool diversity are not logged (`analysis/prefix-retention.json`,
`notTestable`).

**Pre-registration status.** The pre-registration was amended 23 times and its freeze is **nominal**:
v1–v4 each named a freeze commit that did not contain them (`PRE-REGISTRATION.md` §12.7). The file says
so itself and the paper must too. The test-editing rule is the one amendment whose ordering is
demonstrable: committed before its effect was computed, with the sensitivity's test written first and
watched fail.

## 8. Reproducibility and the artifact

**One command builds the artifact, one verifies it.**

```
node tools/artifact.mjs            # re-run the analyses, checksum inputs and outputs, write artifact/MANIFEST.json
node tools/artifact.mjs --verify   # re-checksum and compare; non-zero exit on drift
node --test "tools/*.test.mjs"     # the test suite
```

`artifact/MANIFEST.json`, generated 2026-10-04T08:11:15Z, records for each of the six matrices the
record and cell counts, tasks, arms, seeds, solved count, matrix ids, models, the harness versions
present on its records, whether the `fixture` field is present and the test-edit count; a SHA-256 for
every raw input — 23 files, the six `runs.jsonl` and the gateway logs — and for each of the five
analysis outputs; the exact commands that produced them; the test command; and the list of figures
that cannot be re-derived.

**RETRACTED (2026-10-04).** The draft said `tools/manifest.mjs` 'captures, and writes to
`results/manifest.json`' the host, a composed configuration hash per arm and a per-task content hash.
**No `results/manifest.json` exists**, and no result depends on one. The mechanism that replaced it is
`tools/artifact.mjs` → `artifact/MANIFEST.json` above, which is what the paper and this file cite.

**Pinned state.** Node v24.19.0 and the platform are in the manifest; Python 3.12.6 is the interpreter
on the measurement machine, checked 2026-10-04, and is not recorded in the manifest. Harness versions
are in §2. No harness is patched, and the DSH conditions are the files under `conditions/` rather than
a user profile.

**What cannot be re-derived is stated in the artifact, not omitted.** On **2026-10-02 the entire
`results/` tree was destroyed** — 24 matrices, ~5,900 run records and ~102,000 gateway records, none
of it tracked by git — and **zero run records were recovered**. The six matrices that ship were
collected after the loss, on 2026-10-02 and 2026-10-03. Consequently:

- **F31, F34 and F35** in their seven-model form cannot be recomputed by anyone; their only witness is
  the pair of committed JSON files `analysis/panel-analysis.json` and `analysis/hypotheses.json`,
  which must not be overwritten and are not inputs to anything here;
- **F38** and **F42** cannot be recomputed at all: their input directories are gone, and F42 survives
  only as a gateway log with no run records.

`artifact/MANIFEST.json` names all five figures and why, under `notReproducible`, so a reviewer sees
the hole rather than a silent omission. Every number in `PAPER.md` is from the six matrices that ship.

## 9. Positioning against prior work

Three papers are close enough to require explicit differentiation. The pass that found them is
`notes/literature/RELATED-WORK.md`, and the numbers below are its claims about those papers, not this study's results:

- **Zhang et al. 2026**, 'Stop Comparing LLM Agents Without Disclosing the Harness': a 3-model ×
  3-harness grid on SWE-bench Verified finds harness-induced variance **7.8×** model variance, with
  **6 of 9** model-pair ranking reversals. They vary the harness and measure accuracy; this study
  varies the provider's price ratio and measures cost.
- **Ndzomga et al. 2026**: rank-order prediction stays stable across 33 scaffolds. That is the
  strongest published counter-evidence to the headline claim, and it is reported as such: their
  stability is over **quality** across scaffolds, this study's instability is over **cost** across
  providers.
- **Han and Sun 2026**: harness × model interaction effects comparable to main effects.

The contribution is therefore stated narrowly, and in the form the six matrices support: the code-mode
cost penalty is **not** a price-ratio effect, it is **model-specific rather than provider-specific**,
and harness cost rankings **do not transfer** between providers — measured with the provider's own cache
hit/miss accounting rather than an inferred one, which no published cross-harness comparison has done.
The sign reading ("does not share a sign") is **withdrawn**: GLM is null under the execution-order
adjustment and the pre-registered replication of the sign pattern failed. `PAPER.md` §7 carries the
current statement and the tiering.

## 10. What the study now includes, and what remains

The draft's extension list, against the state of the repository today:

| item | state |
|---|---|
| Goose and OpenHands | **done** — installed, preflighted, and 62 cells per matrix in all six matrices |
| more providers | **done** — Qwen3.8-Flash, gpt-6-luna, Claude Haiku 4.5 and Claude Sonnet 5.5 joined the two Phase-1 providers |
| harder tasks | **built and piloting** — `tasks-hard/` (24 tasks, §3.2); a DeepSeek-only 240-cell pilot is in progress and no hard-suite result is reported yet |
| a second task suite | **authored, not analysed** — `tasks-b/` (40 tasks, §3.3), the human author's; a replication suite |
| `opencode:codemode` | **not done, and still the highest-value single addition** — the only design that separates 'code-mode presentation reduces cost' from 'DSH's PTC implementation reduces cost' (`notes/plans/PENDING-RUNS.md` §3) |
| a third and fourth provider for a *specific axis* | **dead as filed** — the draft's own 2026-09-30 correction stands: Qwen3.8-Flash is 3.13 output:input, below GLM-5.3-Flash's 3.33, so it does not extend the ratio axis, and DeepSeek's cache discount is 50×, so MiMo's 50–120× was not a new axis either. No MiMo run exists |

**Genuinely open.** The mixed-effects analysis (§7); related work and ablations at journal tier; the
Anthropic external-harness cost defect, whose fix needs a normaliser test and a reconciliation test
written first (`notes/defects/DEFECT-anthropic-external-costs.md`); message and tool-content capture, without which
mechanism predictions P2 and P3 stay untestable; and the hard suite's full ten-arm collection.

## 11. Threats to validity

**Construct.** Test-suite success is a coarse proxy for task quality — a solution can pass and still
be poorly written — mitigated by writing several assertions per behaviour, including order-independence
and boundary cases, and by recording the fractional `passRate` beside the binary verdict. The batch-1
grader also grades a suite the arm can edit; the incidence is measured and reported with two
sensitivities (§3.1), and the hard and replication suites grade against hidden cases, where the
confound cannot exist by construction.

**Internal.** (i) *Cache contamination* — runs share a system prompt, so later runs may hit a warmer
prefix. Arm order is a fixed balanced assignment, identical across matrices (§6), and `cost_cold` is
reported as the cache-insensitive contrast. The position confound recorded in F45 for the destroyed
datasets is unresolved and is not claimed to be absent here; the shipped data show balanced slots and
no arm over-represented at slot 0. (ii) *Concurrency* — runs execute at 4-way; this affects wall-clock
and can induce timeouts, not token counts. (iii) *Failed requests count as steps* and are not dropped:
the gateway records a status for every request, and the non-2xx responses in these matrices are
dominated by provider-rejected DSH auxiliary calls (`max_tokens` 64, on GLM-Flash and Sonnet), by
smaller numbers of external-harness rejections, and by luna's rate limits (HTTP 429). (iv) *Evidence drift* is bounded by a declared cut-off (§4).

**External.** (i) *Task coverage* — 31 tasks in one language and one domain; that floor is the
recorded first referee objection and is being addressed by `tasks-b/` and `tasks-hard/`. (ii)
*Provider and model coverage* — six models across five providers, and the population is
**unreproducible in part**: the seven-model results that preceded it cannot be recomputed, and the
Anthropic external-harness cost is a bracket (§5). (iii) *The record itself is incomplete* — 372 of
`ds-full`'s DSH records carry no harness version (§2), and DeepSeek's test-editing incidence is
unmeasured (§3.1). (iv) *Familiarity with one system under test.* The authors did not develop DSH and
have no affiliation with it, but DSH is their primary working environment and they authored its six
study conditions. This is a real asymmetry and it is not eliminated. Four mitigations: a task suite
that was never used to tune a condition; a filed pre-registration, amended in the open; every harness
driven unmodified and from a pinned version; and the artifact, which lets a reader inspect and re-run
the conditions.

**Conclusion validity.** The policy factor is underpowered at 31 task blocks (§7) and is reported as
exploratory. Where solve rates differ beyond their intervals, the cost comparison is reported as
confounded; the quality guard is a gate, not a footnote. Two of the eighteen filed contrasts survive
Holm, both on one model, and the paper's claims do not depend on them.
