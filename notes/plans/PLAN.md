# PLAN — a token-efficient, mode-switched harness with a decision layer

> Companion documents: [README.md](../../README.md) (summary) · [notes/literature/RESEARCH.md](../literature/RESEARCH.md) (evidence & citations)

---

## 1. Decision: fork, or compose?

**Recommendation: compose on DSH. Do not fork.**

The question "get an open source one and modify it, or find one that already does this" has a
better answer than either: **the harness you are already using is the open-source one, and it is
architected so that everything you asked for is a plugin or a YAML file.**

### Why DSH is the right base

| property | why it matters here |
|---|---|
| MIT, `github.com/deepseek-ai/deepseek-harness` | genuine fork/modify rights if you ever need them |
| "Everything is a plugin" — ~250 packages over a Cordis DI kernel | every capability is a **swappable seam**, including the agent loop, sandbox, storage, UI |
| Modes are declarative YAML compositions | `standard`/`ptc`/`minimal`/`cordis` already exist; new modes are **files, not forks** |
| User presets live at `~/.dsh/.agent-presets/<id>/` | your modes survive DSH upgrades (the shipped preset install is overwritten on upgrade and must not be edited) |
| Plugin ecosystem + `dsh plugin add` | token savers, routers, research presets already exist to evaluate before writing your own |
| PTC already implemented | `dsh-agent-tool-presentation` `mode: ptc`, plus `both`; TypeScript **and** Python SDK renderers |
| Self-modification mode (`cordis`) | the agent can inspect the running harness and author new presets for you |

### Why forking anything else is the wrong trade

A fork of OpenCode / Aider / Cline / Codex CLI / Goose / SWE-agent would mean re-implementing
what DSH already ships — a code-execution tool loop, compaction, spill, token accounting, subagent
context isolation, a mode system, a plugin loader — and abandoning a live plugin ecosystem. Forking
DSH itself is also unnecessary: presets and plugins cover the whole surface this plan needs.

**Fork only if** the target is a distributable product with a different UI/identity, or you need to
change the agent loop's contract itself. That is a Phase 5 decision, not a Phase 0 one.

### What the cross-harness comparison adds

A separate survey of the wider landscape (14 projects, licenses read from source, LOC counted from
shallow clones) is in **[notes/literature/agent-harness-comparison.md](../literature/agent-harness-comparison.md)**. Its conclusions:

**Nothing on the market ships "standard + PTC + research mode + a routing model" as one product.**
That combination is genuine whitespace. The closest partial matches:

| project | has | missing |
|---|---|---|
| **OpenCode** (MIT, TS, 210k★) — *best standalone fork base* | first-class mode system (Build/Plan primaries + Explore/Scout research subagents, each with prompt + model + **permission allowlist**); **`@opencode-ai/codemode` in tree** (confined interpreter, Acorn parse + tree-walking, no `eval`, lazy `$codemode.search` catalog, token-budgeted inline catalog, `maxToolCalls`/`timeoutMs`/`maxOutputBytes`); compaction; truncation; subagent isolation | CodeMode is **MCP-tools-only and behind `flags.experimentalCodeMode`**; no automatic mode router; prompt-cache control unconfirmed |
| **Cline** (Apache-2.0, TS, 69k★) — *best SDK base* | cleanest embeddable stateless loop (`@cline/agents`), `createTool` with zod/JSON-Schema, plugin hooks, Plan/Act modes, subagents with **own context + token budget + cost rollup** | no PTC; Plan/Act not generalised to N modes |
| **OpenHands SDK** (MIT, Python) — *purest library base* | four clean packages, stateless event-driven loop, documented **condenser**, and **`ask_oracle`** — a stateless second-opinion model, the closest shipped "decision-model" primitive found anywhere | no mode system, no code-execution loop |
| **strands-code-agent** | **PTC as the default interface** with a persistent Python REPL: measured **+7% accuracy, −78% input tokens, −67% output tokens, 56% faster** | no mode system, no router; aimed at data/domain tasks |

Also worth knowing: **Crush is FSL-1.1 (source-available, not OSI — competing-use restricted),
Continue is EOL/read-only, Roo Code shut down (successor: Zoo Code), Plandex is ~1 year stale, and
SWE-agent is superseded by mini-swe-agent.** Goose is now under the Agentic AI Foundation /
Linux Foundation and OpenCode moved to `anomalyco/opencode`.

**Why this still does not change the recommendation.** OpenCode's CodeMode is *experimental and
MCP-scoped*; DSH's PTC is *shipped and covers the entire tool registry*, and DSH's modes are
declarative YAML rather than compiled agent definitions. Forking OpenCode would mean rebuilding
DSH's preset system, re-implementing PTC over the full tool tree, and abandoning a live plugin
ecosystem that already contains routing, research and token-saving plugins.

**So the fork decision reduces to one question: do you need a standalone, portable product?**
If yes → fork **OpenCode** (≈1 focused change: extend CodeMode's tool tree past MCP and add a
router). If no → **compose on DSH and keep the ecosystem.** Everything in Phases 0–4 is valid either
way, because the *designs* — mode composition, cache stability, what the decision layer should and
should not do — port across.

---

## 2. How a "mode" actually works (so the plan is concrete)

A preset is a YAML **list of plugin rows** mounted once per process under a standing scope. Sessions
join it; each session's state stays separate. Authoring is **copy-only**: copy an existing preset
directory into the first user root, give it an id matching `[a-z0-9][a-z0-9-]*`.

- Discovery roots (in precedence order): shipped `presets/` → configured roots → `~/.dsh/.agent-presets`
- `preset.yml` = display metadata (`name`, `description`, `order`)
- A broken preset is **listed with a reason**, never silently skipped
- **A session can change preset only before it has produced anything.** After the first message the
  composition is fixed — swapping tools mid-conversation would leave logged tool calls the new
  composition cannot make.

That last rule is the single most important design constraint in this plan, and it is why
**plan mode is implemented as prompt + policy with an unchanged tool catalog** rather than as a
separate catalog — the DSH plan-mode text says so explicitly: *"The tool catalog stays the same
across modes for request-cache stability."*

### The three presentation modes

`dsh-tools` / `dsh-agent-tool-presentation` select what the model sees:

| `mode` | model sees |
|---|---|
| `native` | every visible tool schema as a function definition |
| `ptc` | **only `run_code`** plus a generated SDK; only what the program returns/prints re-enters the conversation |
| `both` | both forms (what the omnipotent community preset uses) |

PTC selects a runtime via the `ctx.codeRuntime` seam: `dsh-code-runtime-worker-thread` runs
TypeScript in a fresh Node worker thread; a Python subprocess backend exists as an opt-in
experimental package. `maxParallelSubCalls` (default 10) caps a program's overlapping sub-calls.
The runtime is a *seam*, so a container backend can replace the worker thread without touching tools.

### The shipped `standard` preset — what it mounts, and one thing it doesn't

Mounted: persona, agent-instructions, tool-bash/pwsh, tool-fs, tool-fs-search, tool-jobs,
skill-filesystem, tool-skill, command-goal, tool-goal, **plan-mode**, compaction
(`compaction-basic` + `command-compact` + `compaction-tool-result-pruner` at
`thresholdChars: 8192`, `headChars: 4096`, `tailChars: 1024`), delegation
(`tool-subagent-control`, `list-agents`, `subagent`, `subagent_fork`, workflow, `ralph`),
tool-ask-user, tool-todo, tool-web.

### Host plane vs agent plane — the distinction that matters most

**Correction (found by executing the plan):** an earlier draft of this document claimed the shipped
`standard` preset was missing the spill policy. **It is not.** `dsh --profile web
--dump-default-config` shows `spill-local` + `spill-policy` (`maxInlineBytes: 50000`) mounted on
the **host plane**, shared by every preset. Reading only the agent-plane composition produced a
phantom gap.

The split is deliberate and is stated in the shipped presets' own header: *"the host composition
keeps everything a preset must not own."*

| plane | owns | how to change it |
|---|---|---|
| **host** (`dsh-base` + `dsh-web-app`) | spill caps, web-fetch caps (`maxBodyChars`, default **100,000**), model defaults, sandbox/approval, retention, repeat-tool reminder, the tool/preset **registries** | `~/.dsh/profiles/<p>/cordis.patch.yml` — **reloads the live host** |
| **agent preset** | which of the host's disabled rows a session re-enables, persona, prompt sections, compaction + pruner thresholds, presentation mode | a preset directory — **new sessions only** |

So "token efficiency" work splits cleanly in two, and only the preset half is safe to do from inside
a session. See [notes/records/EXECUTION.md](../records/EXECUTION.md) for what was done and what was staged.

---

## 3. Token-efficiency stack, ranked by return

| # | lever | mechanism | measured effect |
|---|---|---|---|
| 1 | **Prompt-cache stability** | byte-exact stable prefix; never mutate tool catalog or persona mid-turn; append-only context | caching cut agent-loop cost **2.7×–5.3×**; real loops read a **median 84%** of input from cache (top decile **≥94%**) |
| 2 | **Tool-definition deferral** | show a catalog index, load full schemas on demand; keep the catalog itself fixed | **45% cheaper at 502 tools** ($1.02 → flat ~$0.56) at unchanged accuracy; ~**85%** fewer definition tokens; selection degrades past 30–50 tools |
| 3 | **Effort & model choice, priced per *solved task*** | pick reasoning effort and model by cost-per-success, not cost-per-token | `low` gave up **1–3 points for a third to a half off**; Terminal-Bench 3 across generations: **$183 → $63 → $28 per solved task** |
| 4 | **Keep data out of the prompt (PTC/code mode)** | the model runs code over data instead of reading it into context | **−38%** billed input on a 75-tool agent, **20–40%** at 10–49 tools; inline 1,862-row CSV = **6/25 for $5.01** vs via code execution **25/25 for ~$0.40**; but **+8% worse** on sequential single-call traffic |
| 5 | **Prompt audit + batch** | delete over-obeyed instructions; batch offline work | re-tuning prompts for the current model: **36% → 14% cheaper *and* more accurate**; one deleted "verify twice" line cut cost **by a third**; Batch API **−50% on every token, cached included** |
| 6 | **Result folding / spill** | byte-budgeted head+tail + honest omission notice + recovery hint; spill full text to a readable path | Claude Code inlines ~30K chars then a path + 2K preview (reference budget) |
| 7 | **Compaction / pruning — gated on session length** | threshold-triggered summary + pruning stale tool results at task boundaries | saved **39%** (prune) and **32%** (compaction) on a long run — but on a short run context editing cost **74% more** |
| 8 | **Subagent isolation & orchestration** | parent sees only the report; children run cheap | **66.7%** saved on routed delegations (DSH plugin) — but paid off in only **two** measured situations; see §4.5 |
| 9 | **Skills & read discipline** | load instructions on demand; read-before-write; capped `glob`/`grep` | `skill-filesystem` + `tool-skill`; `dsh-fs-observation-policy`; Claude Code caps Glob at 100 files |

**Ordering is not arbitrary, and it is the main correction to the original framing.** A request for
"frontier LLM + decision models to save tokens" naturally puts routing first. The measurements put it
**last**: the top six levers are worth more than routing, and none of them needs a decision model.
Routing is *chat-shaped* — LiteLLM measures **81% savings on GSM8K but only 21% on SWE-bench Lite**,
because repo-level contexts dominate spend and a correct router refuses to downgrade them. Work the
list top-down.

### Lever #1 deserves emphasis, because it constrains everything else

Caching is automatic on DeepSeek (repeated prefix, same account) but requires a **≥1024-token,
byte-for-byte identical prefix**. Two consequences that shape the whole design:

- **A dynamic system prompt is self-sabotage.** Any per-turn persona swap, tool-list edit, or
  reordering of prompt sections breaks the cache and reprices the *entire* prompt at full rate.
  DSH already encodes this discipline (plan mode keeps the catalog fixed; `dsh-token-saver` has a
  `cacheStableSections` option).
- **"Switch to the cheap model" is not automatically cheaper.** Rebuilding a 20k-token prompt on
  Flash at `$0.15/M` costs about the same as re-reading the cached prompt on Pro at `$0.145/M`.
  (Flash's miss rate was printed as `$0.14/M` until 2026-09-30, from the retracted card; the
  corrected off-peak card is 0.15 / 0.003 / 0.60 — single copy in `tools/prices.mjs`.)
  Route on *work*, not on reflex — and prefer keeping the strong model with a hot cache for
  long sessions while routing *delegated* work to the cheap model.

**This is measured, not theoretical.** In LiteLLM's agent benchmark the fixed-model arm ran at an
**89% cache-hit rate with a 4% switch rate**, while the router arms managed only **78–83% cache hit
with a 40–58% switch rate** — routing silently pays part of its own saving back in lost cache hits.
Not Diamond argues the same qualitatively: single-turn routing can "cost more money than any
individual model at lower performance". Manus states the operating rule bluntly: *"KV-cache hit rate
is the single most important metric for a production-stage agent."*

**And the penalty for getting it wrong is severe.** A **25-token status line at the front of the
system prompt** raised a measured triage run from **$0.59 to $4.24** — *worse than caching off
entirely*. On a 100,000-token prefix one broken turn costs **$1.25 instead of $0.03** (~50×). A live
auto-updating status line, a clock in the system prompt, a reordered section — any of these can
multiply the bill. Treat the prefix as immutable.

**Corollary — batch your prompt changes after compaction, never on it.** Changes made *on* the
compaction request re-process the whole context at write price: measured session cost **$0.75**
(changes after compaction) vs **$0.92** (changes on it) vs **$0.95** (scattered mid-session) vs
**$0.81** (no changes at all).

---

## 4. The decision layer — the part you actually have to build

### 4.1 Where decisions occur

| id | decision | frequency | recommended mechanism |
|---|---|---|---|
| **D1** | mode / tier / model / persona for this input | **once per user input** | deterministic scoring → cheap LLM classifier only on ambiguity |
| **D2** | model for a spawned subagent | per delegation | keyword dominance + size + budget cap (deterministic) |
| **D3** | keep / fold / spill a tool result | per tool call | **byte budget only — never a model call** |
| **D4** | continue / escalate / stop / ask a human | per turn | typed decision model returning calibrated probabilities |
| **D5** | task type for persona (plan-first vs act-first) | once per input | keyword/regex banding |

### 4.2 Design rules

1. **Deterministic before probabilistic.** The cheapest correct decision is a byte count, a regex,
   or a table lookup. Escalate to a model only where a heuristic is measurably wrong. LiteLLM's
   *heuristic-only* router reached **87% of frontier quality at 56% of cost** with no classifier call
   at all and the lowest wall clock — and when a classifier did run it cost only **$0.05–$0.34**
   against **$4–$20** of model spend, so the decision itself is not the expense; a *wrong* decision is.
2. **One decision per user input, reused for every step of that input.** Both mature community
   routers do exactly this and state that the classifier is never called per step. Per-step
   switching also destroys the prefix cache (lever #1) — measured at
   **89% → 78–83%** cache hit as soon as routing is introduced.
2b. **Route on *phase*, not on judged difficulty.** "What tool is the agent about to call" is a free,
   deterministic signal that changes several times per task; "how hard is this prompt" is almost
   always answered *hard* inside a coding loop and costs money every turn. The evidence is blunt:
   in a 14-model × 294-question matrix only **29/294** questions were improvable by routing at all,
   and **assigning one model per task type fixed 21 of those 29**. A static phase map
   (explore → cheap, implement → frontier) captures nearly all of the available gain.
2c. **Escalate on stalls instead of predicting difficulty.** A stall is an observed fact (a failing
   command, a repeat, a low-confidence gate); predicted difficulty is a guess with a measured
   **6–8 pp accuracy gap** and a **2,000 ms** latency budget that no small model in a pre-registered
   study actually met.
3. **Put every decision behind one seam with an audit ledger.** You cannot tune a router you cannot
   inspect; a per-session ledger of *(input, signal, route, reason)* is what makes the cost claim
   checkable and misclassification debuggable.
4. **Never change the tool catalog mid-session.** Shrink the *visible surface* through progressive
   disclosure (index + on-demand schema), which is cache-safe; changing the catalog is not.
5. **Cost-mode as an explicit knob.** On ambiguity, one direction must be chosen deliberately —
   cost-first or quality-first — rather than by a coin flip.
6. **Decision models are for judgement, not control flow.** Typed questions (`choice` / `score` /
   `boolean`) returning distributions are excellent for triage, guardrails and escalation
   thresholds. They are the wrong tool for "which file do I edit". Note the honesty caveat: on an
   OpenAI-compatible channel the probabilities are **self-reported, not calibrated**; only a real
   decision-model API gives calibrated scores. Prompts must actively spread probability or
   confidence saturates at 1.0 and the routing signal is lost.
7. **Gate the layer on input size.** An extra classifier call on a one-line question costs more than
   it saves. Below a length threshold, act on the heuristic.

### 4.3 Reference architecture

```
user input
  │
  ├─ D1 classify (deterministic: length + keyword dominance + cost-mode)
  │     ├─ confident → (mode, tier, persona)
  │     └─ ambiguous → small-model classifier (only here)  ──► ledger
  │
  ├─ assemble prompt  ← prefix unchanged from last turn (cache hit)
  │
  ├─ agent loop (standard | ptc | research policy)
  │     ├─ D3 per tool result: byte budget → keep | fold | spill   (no model call)
  │     └─ D2 per delegation: cheap model + budget cap → escalate on failure
  │
  └─ D4 turn gate: typed decision model
        confidence ≥ high  → accept
        medium             → verify with a reviewer pass
        low                → escalate model / ask the human
```

### 4.4 Buy vs. build

Several community plugins already implement pieces. **Evaluate and reuse before writing:**

| piece | candidate | note |
|---|---|---|
| L0–L3 tier routing, cost modes, keyword scoring + optional LLM classifier | `dsh-auto-model-router` | registers a virtual `auto` provider; decision once per input; explicit model choice disables it |
| cheap-vs-strong routing for **subagents** | `dsh-delegate-router` | rule list + decision ledger; measured 66.7% saved on routed delegations |
| persona/thinking-mode banding | `dsh-routing-suite` (`router-standard`) | measured phase-transition behaviour of V4 Pro/Flash; also implements progressive tool disclosure |
| typed decision model as a tool | `dsh-jev-decide` / `dsh-jev-plugin` / `dsh-jev-adapter` | `jev_decide` → choice/score/boolean with distributions; the adapter works against any OpenAI-compatible endpoint |
| independent review / quality gate | `dsh-answer-reviewer`, `dsh-quality-review`, `dsh-advisor-plugin` | graded review that steers the agent back |
| aggressive lossless folding + prompt-cache-stable sections | `dsh-token-saver` | 4 modes: `off` / `conservative` / `balanced` / `aggressive` |

**Build only the unification:** one decision seam + one ledger spanning D1/D2/D4, so the layers do
not fight (e.g. a router preset rewriting the persona while a token-saver reorders sections would
each invalidate the other's cache).

### 4.5 Set expectations: what orchestration actually pays for

This is the least intuitive finding in the whole research, and it should govern how much you invest
in the decision layer. Anthropic's internal measurements found that a **frontier lead + cheap
workers** saved money in only **two** situations:

1. **Insurance against the cost tail on routine work.** On the easy slice of BrowseComp, orchestration
   cost about half the average and **a third at p90 ($12 vs $33)** — and the solo model's single most
   expensive run was **$84 and wrong**. You are buying variance reduction, not mean reduction.
2. **Work larger than one context window.** On a 21.6M-token corpus, the coordinator + 25 workers was
   **47–55% cheaper** and finished in **2.3 h vs 15–20 h**.

On the **full, harder** version of the same benchmark the economics **reversed** — the solo model
matched the coordinator at **22–30% lower cost**. The stated principle is the design rule:

> "When the work is one dependent chain, or fits in a single context, the orchestrator pays for a
> plan, a handoff, and a merge that a single model gets for free."

Most coding work is one dependent chain that fits in a context. **So build the decision layer for
mode selection, cache protection and effort choice — not for heroics.** And note the pattern that
beat orchestration outright: simply **dropping reasoning effort** outperformed switching to an
orchestrator with a worker model, at **29% lower cost**.

**The advisor pattern has a specific, measured failure mode — consult-rate collapse.** Pairing a
cheap executor with a frontier advisor on demand (Opus 5.5 `high` + Fable 5.1 advisor) reached
**90.1% at $2.92/attempt**, 1.7 points over the executor alone for ~2.1× the money. But an executor
that consults on most tasks at default effort can consult on *almost none* at low effort and then
score **below the executor alone** — one measured run consulted **once in 300 tasks** and scored
**61.7 vs 62.7 solo, at the same cost**. If you adopt an advisor/quality-gate pattern, **log the
consult rate** and alert when it collapses; a silent advisor is worse than no advisor, because you
pay for the plumbing and get nothing.

---

## 5. Target mode set

Five modes cover the stated need. Copy `standard` or `ptc` for each; never edit shipped presets.

| mode | base | presentation | mutation | model policy | token policy |
|---|---|---|---|---|---|
| **`standard`** *(keep shipped)* | — | `native` | yes | strong, cached prefix | pruner 8192/4096/1024; spill is host-plane |
| **`ptc`** *(keep shipped)* | — | `ptc` | yes | strong | as standard |
| **`research`** *new* | `ptc` or `standard` | `native` (or `ptc` for multi-source sweeps) | **read-only** | strong lead + cheap subagents per source | aggressive folding, source budget |
| **`economy`** *new* | `standard` | `ptc` | yes | cheap-first, escalate on failure | most aggressive |
| **`minimal`** *(keep shipped)* | — | `native` | yes | any | no compaction — benchmark/cheap edits |

### `research` mode specification

The gap is not the web tools — `web_search`/`web_fetch` are already in `standard`. The gap is
**research policy**:

- **Read-only stance.** No mutation tools active in policy; the deliverable is a document, not a diff.
- **Source discipline.** Every claim carries a URL; a claim without a retrievable source is marked
  as unsourced rather than smoothed over.
- **Fan-out, not drip.** One cheap subagent per source/question, run concurrently; the lead agent
  sees only their reports — this is lever #3 applied to research, and it keeps raw page text out of
  the lead's context entirely.
- **Budget.** A cap on sources fetched and bytes retained per source, with spill files for the rest.
- **Hand-off artifact.** A written `notes/literature/RESEARCH.md`-style output with citations, so the work is
  reusable without re-reading the sources.
- **Cache stability.** Same tool catalog as `standard`; differ by prompt section + policy, exactly
  as plan mode does. This preserves the prefix cache between planning and research turns.

Community starting points worth diffing against your own: `wxxb789/dsh-raven-research`
(citations verified against retrieved sources), `@creait/dsh-research-mode`,
`gavenma/dsh-autoresearch-preset` (a full research-project team preset).

---

## 6. Roadmap

Each phase is independently useful and independently verifiable. Stop after any phase and you still
have a strict improvement.

### Phase 0 — Baseline and instrumentation (½ day)

Nothing here is a saving; it is the ability to *prove* a saving.

- Pick 3–5 representative tasks (a multi-file refactor, a bug hunt, a research question, a one-shot edit).
- Run each on `standard` and `ptc`; record turns, tokens in/out, **cached vs uncached**, wall clock.
- Use `dsh-token-meter` (replay-based, deterministic, no model calls) and session stats to get
  `totalTokens` / `surfaceTokens` per node — that tells you *what* is eating the context, not just how much.
- **Measure your cache-hit rate and make it the headline metric.** Target the top decile: **≥94% of
  input read from cache** (median for good loops is 84%; below ~80% something is broken). This single
  number predicts your bill better than any model choice.
- Price results **per solved task**, not per token, or you will optimise the wrong thing.

**Exit criteria:** cost per task per mode, cache-hit rate per mode, and the top-3 context consumers named.

### Phase 1 — Zero-code wins (½ day)

Ordered by measured return, not by novelty. Do them in this order and re-measure after each.

1. **Audit the prompt (free, biggest ratio).** Re-tune instructions for the current model and delete
   over-obeyed rules — measured effect: **36% more per ticket at identical accuracy** before the
   audit, **14% cheaper *and* more accurate** after; one deleted "verify twice" instruction cut cost
   **by a third**. Then freeze the prefix: **no clock, no status line, no timestamp, no per-turn
   section reordering.** Assert prefix stability, because 25 tokens in the wrong place cost 7×.
2. **Sweep reasoning effort per mode.** Priced per solved task, `low`/off effort gave up only
   **1–3 points for a third to a half off** — and dropping effort beat adding an orchestrator by
   **29%**. This is the cheapest quality-per-dollar knob that exists.
3. **Defer tool definitions.** Wire a catalog index + on-demand schema (the pattern
   `dsh-routing-suite` implements); measured at **−45% run cost at 502 tools** with unchanged
   accuracy. Do **not** remove tools from the catalog — index them, so the prefix stays byte-stable.
4. **Fold and spill results.** Tighten the **preset-owned** pruner
   (`thresholdChars`/`headChars`/`tailChars`, shipped at 8192/4096/1024) — this is the lever that
   targets tool results, the largest measured consumer at **40%** of context. Spill itself is already
   mounted host-plane at `maxInlineBytes: 50000`; lowering it, and lowering
   `web-fetch-http.maxBodyChars` from its **100,000** default, are staged host patches
   ([scripts/host-optimizations.patch.yml](../../scripts/host-optimizations.patch.yml)), because they reload the live host.
5. **Only now consider routing** — one router (`dsh-auto-model-router` for tiers,
   `dsh-delegate-router` for subagents), one decision per input, and read its ledger after a real
   day. Price it **net of the cache hits it destroys**, and remember orchestration paid off in only
   two measured situations (§4.5).

**Exit criteria:** same task results, measurably fewer context tokens, cache-hit rate not reduced,
and a ledger showing no obviously wrong routes.

### Phase 2 — Author the modes (1–2 days)

- Using `cordis` mode or by copying files: create `~/.dsh/.agent-presets/research/` and
  `/economy/` (`agent.cordis.yml` + `preset.yml`).
- Diff against the shipped `standard`/`ptc` compositions rather than starting blank.
- Verify each preset mounts (a broken one is listed with a reason) and that a session picks it up.

**Exit criteria:** `research` and `economy` appear in the picker and complete a real task.

### Phase 3 — The decision layer (3–5 days, scoped down)

- Start with **deterministic only** (D1/D2/D5): length + keyword dominance + cost-mode, one decision
  per input, ledger written.
- Measure misclassification on your own inputs before adding anything probabilistic.
- Add a small-model classifier **only** for the ambiguous band, and a typed decision model (D4) for
  the turn gate with confidence thresholds.
- Add a **cache-stability assertion**: the decision layer must not modify the assembled prefix
  between consecutive steps of one input.

**Exit criteria:** ledger review shows correct routes; no cache invalidation; cost/quality delta
measured against Phase 0.

### Phase 4 — Evaluation harness (2–3 days)

- Fixed task suite × modes, non-inferiority on quality, cost delta reported.
- Without this, "token efficient" is a claim, not a measurement — and silent quality loss from
  over-aggressive folding or router misclassification is invisible until it bites.

### Phase 5 — Fork, only if justified

If the goal becomes a standalone/published product with its own identity, revisit forking DSH
(or another harness). Nothing in Phases 0–4 is wasted: presets, plugins and the decision layer are
portable *designs* even where the code is not.

---

## 7. Risks and failure modes

| risk | why it happens | mitigation |
|---|---|---|
| **Cache invalidation** | dynamic persona, reordered sections, changing tool list per turn | append-only prefix; fixed catalog (as plan mode does); assert prefix stability in CI/Phase 3 |
| **Router misclassification** | ambiguous input, keyword overlap ("refactor this tiny thing") | cost-mode direction on ambiguity; keep the strong model for long sessions; review the ledger. No small model in a pre-registered study met a **≥0.85 accuracy / ≤2 s** viability bar (6–8 pp gap), and 21 routing methods converge well below the oracle — so treat confident misclassification as expected, not exceptional |
| **Routing destroys the cache it was meant to save** | per-turn model switching re-writes the prefix | measured **89% → 78–83%** cache-hit drop; decide **once per input**; route on *phase*, not difficulty |
| **Orchestration costs more than it saves** | multi-agent fan-out on work that is one dependent chain | paid off in only 2 measured situations (cost-tail insurance, >1-context-window corpora); on the harder set the solo model won at **22–30% lower cost** |
| **Silent advisor / consult-rate collapse** | executor stops consulting at low reasoning effort | log and alert on consult rate; one measured run consulted **1/300** and scored *below* solo |
| **Context shrinking applied too early** | pruning/editing on short sessions | context editing cost **74% more** on a 20-issue run; gate every shrink lever on measured session length |
| **Cache-breaking prefix churn** | a status line, clock, timestamp or reordered section in the system prompt | **25 tokens at the front turned $0.59 into $4.24**; treat the prefix as immutable and assert it in tests |
| **Prompt drift across model versions** | instructions tuned for an older model | re-audit prompts per model: **36% more per ticket at identical accuracy** before the audit, **14% cheaper and more accurate** after |
| **Over-compression loses the one relevant line** | blind byte capping | head **and** tail; structure-preserving line cuts; spill file + path so the model can `read`/`grep` it |
| **Decision latency exceeds savings** | extra model call on short inputs | gate on input size; reuse one decision for the whole input |
| **Two plugins fighting over the prompt** | router rewrites persona while a saver reorders sections | one owner per prompt region; verify combined cache behaviour |
| **Self-reported ≠ calibrated probabilities** | OpenAI-compatible channels | treat as a hint, set conservative thresholds, or use a real decision-model API |
| **Plugin supply chain** | `dsh plugin add` runs third-party code with your permissions; approvals do not sandbox plugin code | pin versions; read the source before installing; try unfamiliar plugins somewhere without credentials |
| **Preset lock-in** | a session cannot change preset after its first message | choose the mode at session start; use prompt+policy (not a new catalog) for in-session sub-modes |

---

## 8. Open questions (yours to decide)

1. **Scope** — personal daily driver, or a product you intend to publish? This is the only input that
   could flip the fork-vs-compose recommendation.
2. **Objective function** — maximum saving, or maximum quality per dollar? They imply different
   ambiguity directions and different Phase 1 defaults.
3. **Providers** — DeepSeek V4 Pro/Flash only, or a multi-provider setup? Multi-provider weakens the
   caching argument (cache is per-account/prefix) and strengthens explicit routing.
4. **Third-party appetite** — install and audit community plugins, or author in-house only?
5. **Decision-model budget** — willing to pay for a calibrated decision API (a real Jev endpoint),
   or restricted to self-reported probabilities from your existing models?
