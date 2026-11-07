# PENDING RUNS — the agreed study queue

Written down so it survives a session boundary. Ordered by the decision it unblocks, not by
convenience.

---

## Running now

**GLM-5.3-Flash, full suite.** 31 tasks x 5 arms x 2 seeds = 310 runs, ~3 hours, ~$2.71.
Arms: `dsh:native`, `dsh:ptc`, `dsh:native-opt`, `dsh:ptc-opt`, `opencode`.

First observation from the smoke (n=1, do not cite): the PTC cost advantage **reverses** on GLM.
`dsh:native` $0.00457 against `dsh:ptc` $0.00477, where on DeepSeek ptc was the cheaper one.

---

## 1. GLM-5.3 (full model), current 5 arms  — NEXT

- **What:** the same 5 arms on `glm-5.3` instead of `glm-5.3-flash`
- **Why:** isolates MODEL TIER from PROVIDER. Flash and full are the same family and the same
  cache semantics, so any difference is capability and price structure, not integration.
- **Design:** 31 tasks is more than needed for a direction test. 10–15 tasks x 5 arms x 2 seeds
  = 100–150 runs.
- **Cost:** ~$0.053/run measured -> **$5–8**. This is the expensive one; size it deliberately.
- **Prereq:** start a second gateway on port 8789 with `--force-model glm-5.3`, same upstreams.
  `glm-5.3` pricing is already in the gateway's price card.

### The prediction to test

Output:input price ratio, and what the arms do with output:

| provider | output:input | observed PTC advantage |
|---|---|---|
| DeepSeek V4.1 Flash | **4.00** (was 2.0 — retracted card) | ptc CHEAPER |
| GLM-5.3-Flash | 3.33 | native cheaper |

PTC arms emit MORE output per step on DeepSeek (1,155 and 1,258) than the native arms (980 and 942).
If that holds, then as output becomes relatively more expensive the PTC advantage should shrink and
reverse — which is what the smoke suggests. **GLM-5.3 at 3.14 is nearly identical to Flash at 3.33,
so this pair will NOT discriminate on price ratio.** It discriminates on capability. Keep the two
questions separate.

**Correction 2026-09-30:** the DeepSeek ratio is **4.00**, not 2.0 (single copy in
`tools/prices.mjs`), so DeepSeek sits *above* GLM-Flash at 3.33 rather than below it, and the "PTC
advantage should shrink and reverse as output gets pricier" prediction no longer follows from this
ordering. The measured outcome under the corrected card is in `notes/records/FINDINGS.md` F20.

---

## 2. Remaining harnesses, each with its OWN modes  — SMOKE FINDINGS

Two blockers found on first smoke, both now understood:

**Cline — needs a provider definition.** It rejects \`-P gateway\` with
\`Unknown or disabled provider "gateway"\`. OpenCode needed a generated config defining provider
\`gateway\`; Cline needs the equivalent in its \`--config <dir>\` directory. Until that exists, \`-P\`
has nothing to point at. **Not yet working.**

Also fixed on the way: use **\`cline.cmd\`**, not the \`.ps1\` shim that \`Get-Command cline\` resolves
to. Spawning the \`.ps1\` through \`shell:true\` produced \`exit=undefined\` with no output — it never ran
at all.

**Aider — is it an agent, or a pair programmer?** Aider runs cleanly now (12s, exit 0) but **did not
solve the task**, and its own output explains why:

> *"I need to ask for the file content since I can't edit files I haven't seen... I don't have it"*

Aider is designed to have files **added to context** by the user; it has only limited autonomous file
discovery. Every other harness here is expected to *find* the files. So Aider as configured is not the
same kind of system, and comparing it directly would be apples-to-oranges.

**Two defensible options, and this needs a decision:**

1. **\`aider:allfiles\`** — add the fixture's files to context, which is how the tool is meant to be
   used, and report it as a distinct arm. Honest, but the arm no longer has to discover anything, so
   its cost is not comparable to the others'.
2. **Exclude Aider** from the cross-harness comparison and say why in the paper. This is a *finding*:
   not every popular coding tool is an autonomous agent, and cross-harness benchmarks that lump them
   together are comparing different things.

Also fixed: aider crashes on Windows cp1252 rendering its own \`►\` glyph
(\`UnicodeEncodeError: charmap codec can't encode character '\u25ba'\`). It is a rendering failure, not
a logic one, but it kills the process and reads as the harness failing. \`--no-pretty\` plus
\`PYTHONIOENCODING=utf-8\` in the runner environment fixes it — and that env fix will be needed for
OpenHands too.

---

## 2b. Original scope note

Not installed yet: **Goose**, **OpenHands**. Installed but not yet smoke-validated: **Aider**, **Cline**.

- **Aider** — base URL and key are both CLI arguments, so no config file. Easiest integration here.
  Modes: `--architect` / `--editor-model` (architect/editor split) vs single-model.
- **Cline** — `-k` key, `-P` provider, `-m` model. Modes: Plan vs Act; `--compaction agentic|basic|off`.
- **Goose** — needs install + headless verification.
- **OpenHands** — heaviest (Docker); highest integration risk, do it last.

**Every harness must be smoke-validated on BOTH gateway protocols before entering the matrix.** A
harness that silently falls back to its default provider produces plausible numbers for the wrong
system. This has already happened once: the OpenCode config template hardcoded the gateway URL and
DeepSeek model names, so pointing it at GLM would have kept it on DeepSeek.

---

## 3. `opencode:codemode` — the highest-value single addition

**OpenCode has its own experimental CodeMode**, the equivalent of DSH's PTC.

Right now "code-mode is cheaper" and "DSH's PTC is cheaper" are **the same claim**, because DSH is the
only harness with a code-mode arm. Adding `opencode:codemode` separates them:

- if code-mode helps on both harnesses -> **presentation is the cause**, general claim
- if it helps only on DSH -> the effect is **implementation-specific**, much weaker claim

Given the PTC advantage already reverses on GLM, a reviewer will ask this. It is one arm.

---

## 4. The 3-model matrix, later

**deepseek-v4.1-flash + glm-5.3-flash + glm-5.3**, across the remaining harnesses.

This is the generalisation grid: does the harness ranking hold across model families AND tiers?
Do NOT run it before sections 1–3, because the arm set is still moving and every arm added later
invalidates the grid.

---

## Provider selection — the axis matters, not the count

A third provider is worth it **only if it varies along the axis we hypothesise drives the effect**.
Adding families at random buys multiple-comparison burden without explanatory power.

| provider | output:input | cache read | verdict |
|---|---|---|---|
| DeepSeek V4.1 Flash | **4.00** (was 2.0 — retracted card) | **50x** cheaper | have it |
| GLM-5.3-Flash | 3.33 | 5x cheaper | running |
| GLM-5.3 | 3.14 | 5.4x cheaper | queued |
| **Qwen3.8-Flash** | **3.13** | 9.4x cheaper | **below GLM-Flash on ratio** |
| MiMo | ? | 50–120x | not yet — DeepSeek already gives 50x |

**Qwen is the better third provider** because it sits further along the price-ratio axis than GLM
does. If the reversal strengthens as output gets relatively pricier, that is causal evidence for the
mechanism rather than another data point.

> **Correction 2026-09-30.** This rationale is numerically dead. Qwen3.8-Flash is **3.13**
> output:input — below GLM-5.3-Flash's 3.33 and far below DeepSeek's corrected 4.00 — so it does not
> sit further along the ratio axis. DeepSeek's cache discount is **50x**, not 5x, so MiMo's 50–120x
> is not a new axis either. What survives is the cache-discount contrast (Qwen 9.4x against
> GLM-Flash 5x); the ratio-axis argument does not.

**MiMo is lower priority.** It is Xiaomi's open-weights family, so it is reached through third-party
hosts with unknown cache reporting and an unknown price card — integration risk without a clear
position on the axis. Revisit only if Qwen supports the mechanism.

---

## Housekeeping owed

- Mark milestones 1–3 as pre-upgrade / DeepSeek-only in their READMEs before anything is pooled.
- The `-opt` policy arms are unresolvable at any affordable sample size (0.8% effect, 6,257 task
  blocks). Keep them as exploratory on a task subset, not as a primary contrast.
- 7.4% of GLM requests return non-200 (DSH's internal `max_tokens: 64` call is rejected). Runs
  recover, but `steps` counts failed requests — account for it in the mechanism analysis.
