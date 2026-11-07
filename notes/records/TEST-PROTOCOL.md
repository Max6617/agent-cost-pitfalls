# TEST-PROTOCOL — getting real data for a small paper

This is the experimental design for turning the estimates in [EXECUTION.md §7](EXECUTION.md) into
measured results. It is written to be **pre-registerable**: fix the design before running, then
report whatever comes out.

---

## 1. What is already measured vs. what needs an experiment

| claim | status today | what a paper needs |
|---|---|---|
| PTC containment (70% of tool traffic never enters context) | **measured**, deterministic from logs, n=21 sessions | larger corpus, per-task |
| Context composition by category | **measured**, deterministic | per-condition comparison |
| Round trips per solved task | **measured** (steps, tool calls, PTC sub-calls) | per-condition comparison |
| Result-folding saving (~8.1% of retained tool tokens) | **modelled** from logs | measured with/without |
| Catalog-trim saving | **modelled** (746 schema tokens) | measured |
| **Cache-hit rate** — the best predictor of the bill | **not logged by DSH** | **needs instrumentation (§4.2)** |
| Task success under each mode | **not measured at all** | **the whole point** |

The single most important gap: **no quality measurement exists**. Cheaper is meaningless without
equal-or-better task success. Any paper that reports only token savings is not a paper.

---

## 2. Research questions

- **RQ1 (presentation).** Does code-mode tool presentation (PTC) reduce billable tokens per *solved*
  task versus native tool schemas, at equal success?
- **RQ2 (policy).** Do token-discipline policies (tighter result folding, trimmed catalog, economy
  persona) reduce billable tokens per solved task, at equal success?
- **RQ3 (composition).** Where does context go, and how does the distribution differ by mode?
  *(descriptive; answerable today from existing logs)*
- **RQ4 (containment).** What fraction of tool-call traffic stays inside code-execution programs, and
  how does that scale with task multi-stepness?
- **RQ5 (research fan-out).** On fetch-heavy tasks, does per-source subagent fan-out reduce
  lead-agent context tokens versus fetching inline?

RQ3 is the fastest path to a publishable artefact — it needs **no API spend at all**, reusing the
356 existing session logs.

---

## 3. Design

**Factors.** PRESENTATION {native, ptc} × POLICY {shipped, optimized} = 4 conditions, all already
built: `standard`, `ptc`, `standard-opt`, `ptc-opt`. RQ5 uses `research` as a fifth arm on a
fetch-heavy task subset.

**Unit of analysis.** One **task instance** = one `dsh --profile headless` invocation against a fresh
copy of a task repository.

**Blocking.** Task is the block; every condition runs on every task. This removes task difficulty
from the error term, which matters enormously at small n.

**Replication.** k = 5 independent runs per (task × condition). With T = 12 tasks that is
4 × 12 × 5 = **240 runs**.

**Randomisation.** Within each block, order the 4 conditions randomly (new permutation per block per
seed). Record the order.

**Washout.** See §6.1 — this is the design's hard part, and it is *measured* rather than assumed.

**Fixed across all cells.** Provider, model, `reasoningEffort`, max tokens, DSH version, sandbox mode,
approval policy, machine. Record all of them per run.

---

## 4. Instrumentation

### 4.1 Tier 1 — deterministic, available now

`tools/dsh-audit.mjs` already extracts, per run: model requests (steps), tool calls, PTC sub-calls,
containment ratio, and characters/estimated tokens per category (system prompt, tool schemas, tool
results, tool-call arguments, assistant text, user messages). These are exact and reproducible from
the durable session log. **No new instrumentation and no API spend.**

### 4.2 Tier 2 — provider-grade usage (the enabling piece)

DSH's LLM layer has a `TokenUsage` type carrying exactly the needed fields:

```ts
interface TokenUsage {
  inputTokens: number; outputTokens: number; totalTokens?: number;
  cacheReadTokens?: number; cacheWriteTokens?: number; reasoningTokens?: number;
}
```

Those values exist at runtime but are **not written to the session log**, so they must be captured.
The clean way is a **logging proxy**: `dsh-app-boot` honours a `DEEPSEEK_BASE_URL` environment
variable, so the provider endpoint can be redirected without touching DSH internals.

`tools/usage-proxy.mjs` does this: it forwards every request to the real endpoint, logs the request
and the response `usage` block (including `prompt_cache_hit_tokens` / `prompt_cache_miss_tokens`)
to JSONL, and streams the response through untouched.

```powershell
node tools/usage-proxy.mjs --port 8787 --upstream https://api.deepseek.com --log results/usage.jsonl
$env:DEEPSEEK_BASE_URL = 'http://127.0.0.1:8787'
```

This is strictly better than a plugin hook: it is implementation-independent, survives DSH upgrades,
and captures the provider's own billing-relevant numbers rather than the harness's view of them.

### 4.3 Tier 3 — quality (objective, not judged)

Use tasks with a **hidden test suite**. After each run, execute the test command in the run's
directory and record pass/fail plus the pass fraction. Never grade with an LLM — it destroys the
study's credibility and invites the criticism that the metric was tuned.

---

## 5. Metrics

**Primary.** `cost_per_solved_task` = total billable cost of all runs in a cell ÷ number of solved
tasks in that cell, where billable cost uses the published rate card and the captured cache-hit/miss
split. Failures count in the numerator and not the denominator — this is the metric that reflects
what a user actually pays.

**Secondary.**
- billable input tokens per solved task; output tokens per solved task
- **cache-hit rate** = cacheReadTokens ÷ (cacheReadTokens + cacheMissTokens)
- model requests (steps) per solved task
- PTC sub-calls per model request; containment ratio
- tool-result tokens per solved task
- wall clock per solved task
- solve rate (report separately; it is the quality guard)

**Report both cost variants.** `cost_cold` (every input token at miss price) and `cost_billed`
(cache-aware). The first isolates the context-shape effect; the second is the real-world number. A
difference between them *is* a finding about caching.

---

## 6. Threats to validity

Write this section before running, not after.

### 6.1 Provider-side prompt caching contaminates the design

The system prompt and tool catalog are **identical across runs of the same condition**, so the second
and later runs of a condition hit a warm prefix. With ~5 runs per cell this is a first-order effect,
not noise.

Mitigations, all three together:
1. **Measure it.** The proxy logs `prompt_cache_hit_tokens` per request, so the confound becomes a
   reported variable instead of hidden bias.
2. **Randomise order** within each block, and include run index (position in block) as a covariate.
3. **Report `cost_cold`** as the primary comparison — it is cache-insensitive and therefore
   comparable across cells — with `cost_billed` as the realistic secondary.

Do **not** try to defeat caching by injecting a per-run nonce into the prefix: that changes the very
thing under study, and it destroys RQ1's most interesting sub-question (whether PTC's larger fixed
prefix is amortised by caching).

### 6.2 Other threats

| threat | why it matters | mitigation |
|---|---|---|
| **Single model + provider** | external validity | state it plainly; run one secondary model if budget allows |
| **Task selection bias** | tasks chosen to flatter the modes | hold out tasks; never tune a persona on the eval set |
| **Prompt-tuning leakage** | the personas were written from design principles, not from data | say so; do not revise personas after seeing results |
| **Nondeterminism** | sampling variance mistaken for an effect | k = 5, paired tests, report variance |
| **Survivorship** | aborted runs silently dropped | intention-to-treat: aborted = unsolved, counted |
| **Time-of-day pricing** | DeepSeek bills peak/off-peak differently | record timestamps; schedule runs inside one window |
| **Harness drift** | DSH is 0.1.5-alpha, moving fast | pin the version; record it per run |
| **Small n** | p-values are fragile | report median differences with bootstrap 95% CIs and effect sizes; frame as an exploratory measurement study |
| **Overhead of the proxy** | could slow runs | measure added latency; it is a pass-through, and wall clock is secondary |

---

## 7. Analysis plan (pre-register this)

1. Primary: paired Wilcoxon signed-rank on `cost_cold per solved task` across the 12 task blocks,
   ptc vs native and optimized vs shipped. Report median difference + bootstrap 95% CI.
2. Secondary: same test on cache-hit rate, steps per solved task, and tool-result tokens.
3. Quality guard: report solve rate per cell with a Wilson interval. If solve rates differ by more
   than the CI overlap, **the cost comparison is not interpretable** and must be reported as such.
4. Descriptive: composition shares per condition (RQ3), containment (RQ4).
5. No subgroup fishing. Two comparisons, four secondary metrics, declared in advance.

---

## 8. Concrete harness

| file | role |
|---|---|
| `tools/usage-proxy.mjs` | logging proxy capturing provider usage incl. cache hit/miss |
| `tools/run-experiment.mjs` | runs the task × condition × seed matrix in isolated directories |
| `tasks/<id>/task.json` | task definition: prompt, repo, test command, success predicate |
| `results/runs.jsonl` | one record per run: condition, task, seed, order, exit, timing, quality, audit metrics |
| `results/usage.jsonl` | one record per provider request: tokens, cache hit/miss, latency |
| `tools/dsh-audit.mjs` | Tier-1 composition metrics per session |
| `tools/analyze-results.mjs` | joins the two JSONLs and produces the §7 tables |
| `tools/test-usage-proxy.mjs` | self-test: proves the proxy forwards and normalises cache usage (no API spend) |
| `conditions/*.yml` | one loader patch per condition, selecting `agent-presets.default` |
| `tasks/<id>/task.json` + `fixture/` | task prompt, repo fixture, test command |

### Getting the experiment profile

The experiment must **not** run in the `web` profile (that is the live GUI session). Create a
dedicated one from the shipped headless template:

```powershell
dsh --profile exp --from-default-profile headless --help
```

Then select a condition per run with a patch overlay, which is how a preset is chosen without a GUI:

```yaml
# conditions/ptc-opt.yml
- id: agent-presets
  config:
    default: ptc-opt
```

```powershell
dsh --profile exp --patch conditions/ptc-opt.yml "task text here"
```

Each run is a fresh process and a fresh session, so conditions cannot leak into one another — a
property the preset lock gives us for free.

---

## 9. Budget and staging

| stage | runs | API spend | delivers |
|---|---|---|---|
| **0. Corpus study** | 0 | **$0** | RQ3 + RQ4 over the 356 existing sessions — already done in notes/records/EXECUTION.md §3 |
| **1. Pilot** | 2 tasks × 4 conditions × 2 seeds = 16 | small | validates the harness, measures variance, fixes k |
| **2. Main** | 12 × 4 × 5 = 240 | the real cost | RQ1 + RQ2 |
| **3. Research arm** | 6 fetch-heavy tasks × 2 conditions × 5 = 60 | moderate | RQ5 |

Do **stage 0 first and write it up**. It is a complete descriptive contribution — "context
composition and round-trip structure of a plugin-composed coding agent across 356 sessions and 27M
tokens of tool output" — costs nothing, and de-risks everything else. If stages 1–3 never happen,
stage 0 still stands.

---

## 10. Harness status — what is verified

Verified end-to-end on this machine, so the remaining work is tasks + budget, not plumbing:

| piece | status |
|---|---|
| `usage-proxy.mjs` | **self-test passes** — forwards JSON and SSE untouched and normalises `prompt_cache_hit_tokens` / `prompt_cache_miss_tokens` into a hit rate (83.3% on the fixture); measured overhead ~10–19 ms per call |
| `run-experiment.mjs` | **dry-run verified** — expands the matrix and randomises order per block (8 runs for 1 task × 4 conditions × 2 seeds) |
| `analyze-results.mjs` | parses; implements exact Wilcoxon over task blocks, bootstrap CI, and the quality guard |
| preset selection without a GUI | **confirmed viable** — `--patch conditions/<c>.yml` sets `agent-presets.default`; `@deepseek-ai/dsh-headless` ships as a bundle, so `dsh --profile exp --from-default-profile headless` creates the experiment profile |
| `DEEPSEEK_BASE_URL` | **confirmed honoured** by `dsh-app-boot`, which is what makes the proxy possible |

The first self-test run **failed** on the non-streaming path — the proxy passed the body through without
buffering it, so `usage` was never parsed and every cost column would have read zero. That is exactly
the class of silent instrumentation bug that ruins a results section, which is why the self-test ships
with the code.

## 11. Honest framing for the paper

What is defensible with this design: **a measurement study of context composition, round-trip
structure and cache behaviour in a code-mode coding agent, with a controlled four-condition
comparison of presentation × policy on a small task suite.**

What is not: a general claim that "code mode saves X%". The effects are workload-dependent — PTC is
*~8% more expensive* on sequential single-call traffic per Anthropic's own benchmark, and the local
data shows the fixed prefix growing ~11% under PTC. Report the boundary conditions, not just the
headline.
