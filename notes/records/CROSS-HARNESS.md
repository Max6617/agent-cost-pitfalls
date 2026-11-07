# CROSS-HARNESS — how much of the cost of solving a task is the harness, and how much is the provider?

**Rewritten 2026-10-04.** The previous version of this file was written before any data existed. It
proposed six harnesses of which one (Aider) never entered the study, it reported that *'none of these
five is installed or executed'* when all five had in fact been installed, preflighted and driven
through six complete matrices, and it sized the study at 15 tasks and 450 runs against an actual
3,720 cells. It is kept in git history; this file replaces it.

**Status of the claims below:** every number is read from the shipped artifact —
`analysis/panel-analysis-6model-2026-10-03.json` (sections A1–A8),
`analysis/prefix-retention.json`, `analysis/hypotheses-6model-2026-10-03.json` — and is reconciled in
`notes/records/STEP2-RECONCILIATION.md` §7. Nothing here is a projection.

---

## 1. The question, as it survived contact with the data

The question this file was written to ask was: **under a fixed model and fixed tasks, how much do
agent harnesses differ in what it costs to solve a task, and which design choices explain the
difference?**

The proposed answer was that cost-to-solve is dominated by measurable design properties — prompt
size, context growth, tool surface, cache discipline — *not by the model*. **The data does not
support that as stated, and the way it fails is the more interesting result.**

On six models across five providers, presenting one tool instead of twenty-four (the `ptc` versus
`native` contrast) moves billed cost by between **−20.75% and +53.84%**, and **the sign is not
shared**: three models share an output:input price ratio of 5.00 and still disagree by 52.64
percentage points. A design property that flips sign across providers is not a property of the
design alone. It is an interaction, and a single-provider design cannot see it.

The instrument that makes this measurable is unchanged from the original proposal and it is still the
contribution: a gateway at the provider boundary that captures the **provider's own cache hit/miss
split**, a quantity no harness exposes and therefore no published cross-harness comparison reports.

---

## 2. Study set — what was actually run

**Five harnesses, all installed, all preflighted green, all driven unmodified, all with 620 cells
collected on each of six matrices.** Versions are probed at launch and stamped on every run record
and on `matrix.json`; the values below are read from the committed `matrix.json` files, not from
prose.

| harness | licence | language | version in the study | headless entry | role |
|---|---|---|---|---|---|
| **DSH** (DeepSeek OSS) | MIT | TypeScript | **0.1.7-rc.2** | `dsh --profile exp --patch … <prompt>` | 6 experimental conditions |
| **OpenCode** | MIT | TypeScript | **1.18.30** | `opencode run …` | external anchor |
| **Cline** | Apache-2.0 | TypeScript | **3.0.65** (pinned copy) | pinned JS entry via `node`, no shell | external anchor |
| **OpenHands** | MIT | Python | **1.16.0** | `openhands --task …` | external anchor |
| **Goose** | Apache-2.0 | Rust | **1.52.0** | `goose run -t …` | external anchor |

Node **v24.19.0**. Registry with configuration detail: `tools/harnesses.mjs`.

**Two honest notes on versions, because both were defects before they were disclosures.**

1. **`results/ds-full`'s 620 DSH run records carry `harnessVersion: null`.** The probe ran `dsh`
   through the shell and got exit 1 (`'dsh' is not recognized`), which is not the way the matrix
   invokes it. The version **is** proven, by `harnessVersionsPostHoc` in `results/ds-full/matrix.json`
   (0.1.7-rc.2, probed by absolute path), and the install predates the matrix by three days and was
   unchanged through it. **The records were deliberately not rewritten** — a run record is evidence,
   and back-filling a field the instrument failed to capture would make the archive less honest, not
   more.
2. **Cline is pinned, not global.** It self-updates in the background on startup: the incident on
   2026-10-02 moved the global install 3.0.65 → 3.0.68 mid-study and left a shim pointing at a file
   that no longer existed, which is what produced a spurious `EPERM` on every run. The study now
   invokes a pinned copy at `betterharness-tools/cline-3.0.65/` by absolute path. The version the
   global install *declared* (3.0.66) and the version actually probed (3.0.65) are both recorded.

### Excluded, and why

Codex CLI (Responses-API dialect, account-locked — reachable only through our bridge, so a bonus arm
at best) · Gemini CLI (Gemini-oriented) · Crush (**FSL-1.1, not OSI**) · Roo Code (shut down) ·
Continue (EOL) · Plandex (stale) · Kilo/Zoo Code (VS Code extensions, unfair to automate). Qwen Code
remains the natural sixth arm if budget allows.

**Aider was in the original plan and is not in the study.** It was the intended *minimal* harness —
no tool API, no MCP, no subagents — and therefore a useful lower bound on harness machinery. It is
not here because the five above were installed and verified first and a fifth external anchor was
enough to establish that harness rankings do not transfer; adding a sixth arm would buy precision on
a negative result, not evidence for the positive one. The lower-bound argument is consequently
**not** made anywhere in this study, and no claim rests on it.

---

## 3. Arms — the experimental conditions

**An arm is a harness in a specific configuration**, written `<harness>` or `<harness>:<variant>`.
**Arms are not harnesses**, and this distinction is the whole design: a harness that yields one arm
is an anchor, a harness that yields six is an experiment.

| arm family | n | what it manipulates |
|---|---|---|
| `dsh:native`, `dsh:native-opt`, `dsh:native-terse` | 3 | presentation × policy × prompt suffix |
| `dsh:ptc`, `dsh:ptc-opt`, `dsh:ptc-terse` | 3 | as above, code-mode presentation |
| `opencode`, `cline`, `openhands`, `goose` | 4 | one arm each, each harness's own defaults |

**Presentation.** In *native* mode every tool is exposed as its own schema (24 tools in this
configuration); in *PTC* mode the model sees a single `run_code` tool and writes a program that calls
the others. **Policy.** The `-opt` arms load a patch tightening the tool-result pruner, which targets
the largest single consumer of context in a coding loop. **Terseness.** The `-terse` arms append a
short prompt suffix; this is the study's cheapest significant lever, and it is discussed in
`notes/records/FINDINGS.md` F22.

**The external arms impose nothing.** Presentation and policy are DSH concepts; imposing them on a
third-party harness would be a fabricated comparison. Each external harness runs its own defaults,
which is the correct treatment for measuring *the harness* rather than *our configuration of it* —
and it is also why the external arms cannot be used as evidence about code mode.

---

## 4. The measurement gateway (the middle API)

`tools/measure-gateway.mjs` sits between every harness and the provider. Tracking is only the first
of the jobs it does:

| job | why the study needs it |
|---|---|
| **Attribution** | each run gets a synthetic key `exp-<harness>-<matrixId>-<harness>-<task>-<arm>-s<seed>`; the gateway substitutes the real provider key and records who asked. The synthetic key **is** the run id, so usage joins to a run by construction rather than by timestamp matching. |
| **Enforcement** | `--force-model`, `--force-effort`, `--force-temperature` rewrite outgoing requests so no harness can quietly run a different model or effort. **Every rewrite is logged**, so a harness that asked for something else appears in the results instead of hiding. |
| **Usage capture** | the provider's own `usage` block, including the cache hit/miss/creation split. DSH does not persist these and no harness exposes them; this is the enabling measurement. |
| **Normalisation** | `/v1/responses` is translated to chat-completions so an OpenAI Responses-API client shares the same measurement point. |

```powershell
$env:DEEPSEEK_API_KEY = 'sk-...'
node tools/measure-gateway.mjs --port 8787 --log results/gateway.jsonl --force-model deepseek-flash --force-effort high
# each harness gets:  base URL http://127.0.0.1:8787/v1   key exp-<harness>-<runId>
# live: http://127.0.0.1:8787/__stats
```

**Verified:** `node tools/test-gateway.mjs` passes 10/10 — attribution, key substitution, model
enforcement, deviation logging, cache-split capture, cost computation, Responses translation in both
directions, per-harness stats.

### Where the instrument cannot see, stated as a limit

The four external harnesses reach Anthropic through its OpenAI-compatible endpoint, whose response
**reports no cache fields**. For 6,772 requests carrying 129.3M input tokens the archive therefore
does not record the cache split, and no tool can price them exactly. The two existing tools default
that input in *opposite* directions — `costOf` at zero, `cost-panel` at the miss rate — so Anthropic
cost per run is reported as a **bracket**, never a figure. This is recorded in
`notes/defects/DEFECT-anthropic-external-costs.md`, including the correction to that file's own first version. It
is also, in its own right, a finding about what a gateway can and cannot observe.

---

## 5. Fairness rules

A cross-harness comparison lives or dies here. In order of how badly they bite:

1. **Equalise the model, not the prompt.** Model, reasoning effort, temperature and provider are
   forced by the gateway. The *system prompt* must **not** be equalised — it is the harness. It is
   measured and treated as part of the treatment.
2. **Normalise autonomy.** Every arm runs fully autonomous, with the same sandbox posture. A harness
   that stops to ask questions is measuring something else.
3. **Equalise the budget, then report who used it.** Same wall-clock and step cap per arm; a harness
   that gives up early looks cheap, so the quality guard is what catches it.
4. **Pin and record versions** — now a fact rather than an intention (§2). Cline's self-update
   incident is why the pin is enforced by absolute path rather than by declaration.
5. **Same task, same fixture, fresh directory per run.** No shared state, no warm git index.
6. **Declare capability differences rather than hiding them.** The DSH arms present 24 tools; the PTC
   arms present 1; each external harness presents its own default set. That is the treatment.
7. **Randomise arm order within each task block.** Cache and time-of-day effects are real.
8. **Never tune any arm after seeing results.** We authored DSH's *study conditions* (we did not
   develop DSH and are unaffiliated with it), which makes it the arm most at risk of being configured
   more carefully than the others. This is a real asymmetry and it is not eliminated; see
   `METHODS.md`.

---

## 6. Task suites

**Suite 1 (`tasks/`): 31 tasks, all valid**, stratified by multi-stepness:

| stratum | n | what it exercises |
|---|---|---|
| single-step | 7 | one file, one clear defect |
| multi-file | 7 | a change crossing 3–8 files |
| repo-wide | 6 | a sweep across many call sites |
| long-horizon | 5 | investigation is most of the work |
| fetch-heavy | 5 | the answer is not in the repository |
| example | 1 | the preflight/smoke task (`example-fix`), not part of the analysis |

**Suite 2 (`tasks-hard/`): 24 tasks**, all valid, built to break suite 1's solve ceiling:
`lh-*` (6, long-horizon), `spec-*` (6, specification reading), `cross-*` (6, cross-cutting
refactors), `edge-*` (6, edge-case parsing). A pilot on suite 2 is running at the time of writing.

Validation gates, applied to every task before it entered either suite — `node tools/validate-tasks.mjs`:

1. **The suite must FAIL on the untouched fixture.** A task whose tests already pass cannot
   discriminate: every arm 'solves' it and the run measures nothing.
2. **Determinism** — the suite is run twice and must give the same verdict.
3. **A crashed grader is not a failing suite.** A validator that consulted only the exit status
   passed 40 empty scaffolded tasks while their real grader failed every one; three structural
   checks now separate the two.

Grading is by test-suite exit status. **No LLM is used as a judge** — it is not reproducible and
invites the criticism that the metric was tuned.

**Known limitation, and it is measured rather than assumed.** Because `tasks/` grades against the
suite *as the agent left it*, weakening an assertion reads as a solve. The incidence is measured on
every record from GLM onwards (`fixture.gradedOnEditedTests`): **luna 81/620 (13.1%), Haiku 5, GLM 2,
Qwen 1, Sonnet 0, DeepSeek not measurable** (the field is absent on all 620 of its records, and it is
never reported as 0%). The rule was pre-declared in `PRE-REGISTRATION.md` §12.8 before its effect
was computed: report as measured, exclude nothing, restore nothing, publish two sensitivities. The
realistic sensitivity moves luna by 0.4 pp; the extreme bound is 82.3%. **Suite 2 grades against
hidden cases, where this confound cannot exist by construction** — which is the structural answer,
not a statistical one.

---

## 7. Metrics

**Primary.** `cost_billed per solved task`, per arm, with the solve rate reported beside it. Both
cost metrics are always reported:

| component | source | meaning |
|---|---|---|
| **cost_billed** | gateway log | the actual cache split applied to the provider's price card — what a user pays |
| **cost_cold** | gateway log | every input token at the miss rate — invariant to cache state, therefore comparable across designs |
| **cache hit rate** | gateway log | per-harness cache discipline |
| **prefix retention** | gateway log, request bodies | of a prefix that was cached, how much the provider still serves from cache |
| fixed prefix tokens | first request of each session | system prompt + tool schemas |
| steps | gateway request count | round trips |

The two cost metrics can disagree in **direction** — a harness can be worse on `cost_cold` and
better billed — so reporting one alone is a methodological error. The measured instance: luna's
billed differential is +1.20% while its `cost_cold` differential is −21.17%. PTC sends materially
fewer tokens, and cache pricing roughly cancels the gain. A study that reported only one of those
numbers would have reached the opposite conclusion about luna.

---

## 8. What the cross-harness data shows

### 8.1 The mode effect is model-specific, and its sign does not survive execution-order adjustment

`cost_billed`, paired by task, cluster bootstrap over 31 tasks (panel section A2):

| model | output:input | PTC vs native | 95% CI |
|---|---|---|---|
| GLM-5.3-Flash | 3.33 | **−20.75%** | [−44.30, −2.79] |
| gpt-6-luna | 5.00 | +1.20% | [−8.42, +11.29] |
| DeepSeek V4.1 Flash | 4.00 | +0.13% | [−8.90, +9.76] |
| Claude Sonnet 5.5 | 5.00 | +9.51% | [−0.08, +18.01] |
| Qwen3.8-Flash | 3.13 | +30.67% | [+10.02, +53.79] |
| Claude Haiku 4.5 | 5.00 | **+53.84%** | [+31.25, +76.73] |

*(Re-filed at B = 200,000 on 2026-10-10. At the filed B = 5,000 the Sonnet row was [+0.28, +17.90] and read as positive; at B = 200,000 the interval contains zero, so Sonnet is **null** and the "does not share a sign" reading is withdrawn — see `PAPER.md` §3.1 and §3.1a.)*

**Three models share ratio 5.00 and disagree by 52.64 points; across the axis the six span 74.59
points, so 70.6% of the between-model spread sits inside a single ratio value.** Any account of code
mode that is a function of the price ratio alone is not supported.

### 8.2 The mechanism explains one provider of six

Retention — the share of a previously cached prefix the provider still serves from cache
(`analysis/prefix-retention.json`, paired by task):

| model | retention PTC | retention native | difference | verdict |
|---|---|---|---|---|
| Qwen3.8-Flash | 0.674 | 0.743 | **−0.0691** | **retention explains it** |
| GLM-5.3-Flash | 0.994 | 0.993 | +0.0010 | not retention — volume |
| gpt-6-luna | 0.997 | 1.000 | −0.0026 | not retention — volume |
| DeepSeek V4.1 Flash | 1.000 | 1.000 | −0.0001 | not retention — volume |
| Claude Haiku 4.5 | 0.996 | 1.000 | −0.0032 | not retention — volume |
| Claude Sonnet 5.5 | 1.000 | 1.000 | +0.0000 | not retention — volume |

A pre-declared prediction on 2026-10-03 said Anthropic, which also requires *declared* caching,
would show a Qwen-like retention deficit. **It is refuted**: Anthropic's retention is flat and its
differentials are volume effects. The productive form of this is a **precondition** — the prefix
effect can only bite where the cache loses, and where retention is already ~1.000 there is no
headroom for a mode effect, so any differential must come from token volume. Falsifiable, and filed
in advance.

### 8.3 Where caching must be declared, the harness dominates retention

> **WITHDRAWN 2026-10-09 — the "external harnesses" column is a pooling artefact, and the claim below
> has no measurement behind it.** `tools/prefix-retention.mjs` classifies every arm that is not
> `dsh:ptc` or `dsh:native` as "external" (`armClass`, line 48), so the bucket is **eight arms /
> 496 runs** — as the shipped JSON itself records — not four: the four real external harnesses, whose
> cache split is `null` on this path and which the tool codes as 0.0000, pooled with the four DSH
> `-opt`/`-terse` arms at ~0.994-1.000. 0.560 is 4,211 haiku continuations at 0.0000 plus 5,380 at
> ~0.9977; 0.451 is 1,828 sonnet continuations at 0.0000 plus 1,505 at ~0.9998. **No external
> harness's retention is measured on Anthropic anywhere in this study.** `PAPER.md` §3.3 is restated
> accordingly. The DSH arms' own retention (0.994-1.000) stands and is what should be quoted.

Mean prefix retention on Anthropic, DSH arms against the eight-arm pooled "external" bucket:

| model | DSH arms | pooled non-DSH bucket (mislabeled "external harnesses" in the first draft) |
|---|---|---|
| Claude Haiku 4.5 | 0.994 / 1.000 | **0.560** |
| Claude Sonnet 5.5 | 1.000 / 1.000 | **0.451** |

**The 0.560/0.451 column is withdrawn and must not be quoted as an external-harness measurement.** The
bucket is eight arms — four real external harnesses at a null-coded 0.0000, pooled with four DSH
`-opt`/`-terse` arms at ~0.998 — so the figures are dilution, not retention. No external harness's
retention is measured on Anthropic anywhere in this study, and none is claimed here. What stands is the
DSH arms' own retention, 0.994–1.000. The external arms' 0.000 in panel section A6 is the
missing-cache-split defect in §4, not a measurement.

### 8.4 Harness rankings do not transfer between providers

- **Adjacent rank steps (A8): 40 of 54 pairs are statistically indistinguishable — 74.07%.** The tie
  fraction was 76% on the published seven-model population and 86% on the four-collection; it is
  **not shrinking** as models are added.
- **Across-model rank agreement (A1b):** median Spearman rho = 0.238, permutation p = 0.0467; the
  model axis explains 5.7% of rank variance.
- **Arm-versus-arm concordance (A1c): 62.1%.**

A harness ranking measured on one provider predicts the next provider's ranking about three times in
five. That is a negative result about the field's standard practice, and it is why this study reports
sign disagreement with intervals rather than a leaderboard.

### 8.5 The one confirmatory win

H3 (pre-registered, secondary): presenting 24 tool schemas instead of 1 increases the number of model
requests. **Supported: +2.228 requests [+1.228, +3.360], n = 744 cells.** The direction was predicted
from Phase 1, and on six models this is the study's only confirmatory hypothesis that survives.

---

## 9. Threats specific to cross-harness work

| threat | why it bites | mitigation, and what actually happened |
|---|---|---|
| **Unequal configuration** | a harness run at different effort is a different experiment | gateway enforcement; every deviation logged |
| **Default autonomy differs** | an asking harness looks cheap and slow | force autonomous mode |
| **Step/context caps** | early give-up masquerades as efficiency | quality guard; solve rate reported beside every cost |
| **Silent retries** | retries inflate requests invisibly | the gateway counts every request, including retries |
| **Tool-set asymmetry** | 24 schemas versus 1 versus each harness's own default | declared; it *is* the treatment; stratified reporting |
| **Prompt caching × prefix stability** | a harness that reorders its prompt destroys its own cache | measured, and reported as a finding (§8.2–8.3) |
| **Harness self-update** | a harness that updates mid-study is a different system under test | **real, and it happened** (Cline, §2); fixed by pinning and invoking by absolute path |
| **Missing cache fields on a protocol path** | external harnesses reached Anthropic through a path that reports no cache split | 6,772 requests unpriced exactly; cost is a bracket, never a figure (§4) |
| **Multiple comparisons** | 10 arms imply 45 pairwise contrasts | pre-registered family of **m = 18** with Holm; only 2 survive, both Haiku; the paper does not rest on stars |
| **Familiarity with DSH** | we authored its study conditions and work in it daily | pre-registration, hold-out suites, unmodified harnesses, full artifact |
| **Install/config error** | a misconfigured arm silently underperforms | per-harness preflight before every matrix — **this is what caught the Cline quoting defect before a single matrix cell was paid for** |
| **A running matrix's log treated as signed-off evidence** | a growing log cannot be a checksummed input | in-flight logs are named under `inFlight`, not hashed (`tools/study-window.mjs`) |

---

## 10. Paper quality ladder — where this study actually is

| tier | what it takes | state |
|---|---|---|
| **Okay** | 1 harness, 1 task family, cost + success, no decomposition | **exceeded** |
| **Good** | multiple arms × tasks × seeds, blocked and randomised, provider-grade cost, quality guard, pre-registered analysis, released artifact | **met**: 6 models × 31 tasks × 10 arms × 2 seeds = 3,720 cells, plus a 24-task hard suite |
| **Great** | the above plus a cost decomposition, per-harness cache accounting, a predictive model, a failure taxonomy, sensitivity to task length | **partly met**: the decomposition and the per-harness cache accounting exist and are the contribution; **no predictive model** — the mechanism refuted the one that was planned (§8.2) |

The difference between 'good' and 'great' was supposed to be explaining the variance rather than
reporting it. This study explains **one provider of six**, and says so. What it has instead is
something the original ladder did not anticipate: a **measured negative result about transferability**
(§8.4), with a mechanism that is real, bounded, and stated with its precondition.

---

## 11. What remains

| item | state |
|---|---|
| suite 1, six models | **done** — 3,720 cells, re-derivable from the artifact |
| suite 2 (`tasks-hard/`, 24 tasks) | **piloting**; ~$0.064 per hard cell measured, so one provider's 240-cell matrix is ~$15 and four providers ~$62 |
| second task suite (`tasks-b/`) | **in progress by the human** — 40 authored, 21 valid at last count; hidden-grader throughout, so the test-editing confound cannot exist there |
| mixed-effects analysis (`notes/plans/JOURNAL-PLAN.md` §5) | **not done** — paired tests currently ignore task heterogeneity |
| message capture for the mechanism | **not collected** — message and tool contents are stored as counts, so P2 and P3 are untestable from the current logs |
| related work and ablations | **not done** at journal tier |
| a predictive cost model | **abandoned as specified** — the regression it would have fitted is the one §8.2 refutes |

---

## 12. Pre-data text, kept visible

The original file claimed, in its own words, *'Honest status: none of these five is installed or
executed. The configurations are documented behaviour, not verified facts.'* That was true when
written and false within a day. It is recorded here rather than deleted because it is the exact
failure mode this study is about: a plausible status line, never re-checked, describing a world that
had stopped existing.

It also proposed a sixth arm (Aider), a 15-task suite, 5 seeds, 450 runs, and a '~1 day' install
budget. The study that was actually run has five harnesses, 31 + 24 tasks, 2 seeds, 3,720 cells, and
an install-and-verify stage that took several days — almost all of it spent discovering that a
harness can be installed, resolve to the right version, and still bill the wrong endpoint.