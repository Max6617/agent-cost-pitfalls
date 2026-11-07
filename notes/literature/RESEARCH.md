# RESEARCH — evidence base

Every claim in [notes/plans/PLAN.md](../plans/PLAN.md) traces to something here. Sources are linked inline.
Local evidence was read directly from the installed DSH packages at
`C:\Users\user\dsh-app\node_modules\.pnpm\@deepseek-ai+*`.

---

## 1. DSH is the open-source harness you are already running

| fact | evidence |
|---|---|
| MIT-licensed, public repo | [`deepseek-ai/deepseek-harness`](https://github.com/deepseek-ai/deepseek-harness) — tagline "Everything is a Plugin"; `@deepseek-ai/dsh@0.1.5-alpha.1` declares `"license": "MIT"` and `repository: git+https://github.com/deepseek-ai/deepseek-harness.git` |
| ~250 first-party packages on a Cordis DI kernel | enumerated from the local install: `dsh-agent-loop`, `dsh-tools`, `dsh-llm`, `dsh-sandbox`, `dsh-session*`, `dsh-mcp-client`, `dsh-skill*`, `dsh-compaction*`, `dsh-subagent*`, `dsh-web*`, `dsh-tool-*`, `dsh-client-ui-*` … |
| Local install | `C:\Users\user\dsh-app` (a plain `npm install @deepseek-ai/dsh`); CLI bin at `node_modules\.bin\dsh`; profile `web` at `C:\Users\user\.dsh\profiles\web` with `cordis.patch.yml` currently `[]` and `patchReload: live` |
| No user presets yet | `C:\Users\user\.dsh\.agent-presets` does not exist — the extension point is unused |

### The four shipped presets

Read from `@deepseek-ai/dsh-agent-presets/presets/*/preset.yml` (display names are Chinese in the
shipped files):

| id | display name | description (translated) | order |
|---|---|---|---|
| `standard` | 标准模式 | Full coding agent: file editing, shell, file & web search, skills, planning, goals, subagents, workflows | 1 |
| `ptc` | PTC 模式 | Full coding agent, but no `workflow` tool by default; other tools presented through a **PTC-mode SDK**, so the model composes multi-step operations in one TypeScript program | 2 |
| `minimal` | 极简模式 | Two-tool agent: persistent bash + `str_replace_editor` only | 3 |
| `cordis` | 创造模式 | For authoring custom agent presets: all of `standard` plus runtime inspection, plugin experimentation, preset-authoring guidance | 4 |

Also corroborated by a detailed third-party walkthrough of all four presets:
[DSH 四种 Preset 区别与用法](https://news.qiniu.com/archives/1788252903712).

### `ptc` is `standard` + one row

A diff of `presets/standard/agent.cordis.yml` against `presets/ptc/agent.cordis.yml` yields exactly
two deltas. First, the `workflow` tool is disabled, with the comment: "do not publish a second
model-authored orchestration surface beside `run_code` in PTC mode". Second, the presentation
selector row is added:

```yaml
- id: tool-presentation
  name: '@deepseek-ai/dsh-agent-tool-presentation'
  config:
    mode: ptc
```

That is the whole difference. PTC mode is a **presentation-layer** choice, not a different agent.

---

## 2. The mode system: presets are declarative YAML

From `@deepseek-ai/dsh-agent-presets/README.md` (read locally):

- A session is composed from one preset's `agent.cordis.yml`; **"a child agent (subagent) joins its
  parent's composition, so it sees the same tools and prompt sections as the agent that spawned it."**
- Roots, in precedence order: the package's shipped `presets/` root (always prepended, wins duplicate
  ids) → configured roots (`path`, `trust`) → `<dshHome>/.agent-presets` as a `user` root.
- **Authoring is copy-only**: "creating a preset copies an existing preset's whole directory …
  into the first `user` root." A copy is refused when the id is not `[a-z0-9][a-z0-9-]*`, is already
  taken, or the source is unknown.
- **Switching**: "A session can switch to a different preset only while it has produced nothing —
  no messages or tool calls. After that, the composition is fixed for the session's life, because
  swapping tools mid-conversation would leave logged tool calls the new composition cannot make."
- **Failure reporting**: a preset whose composition is missing/unparsable/naming an unresolvable
  module "is listed as broken with a reason naming the rows at fault".
- **Design philosophy** includes: "The preset file is an input, never a persistence target" — the
  mounted subtree overrides `write()` as a no-op.
- Upgrades overwrite the shipped preset install; the `cordis` preset's own prompt tells the model to
  **never edit the shipped install** and to copy a composition into a new preset directory instead.

### The shipped `standard` composition, in full

Read from `presets/standard/agent.cordis.yml` (252 lines). Rows: `persona` (prefix
"You are a coding agent powered by the {{model}} model.", suffix "Your working directory is {{cwd}}."),
`agent-instructions` (`maxBytes: 65536`), `tool-bash`/`tool-pwsh` (platform-gated via
`!!js process.platform === 'win32'`), `tool-fs`, `tool-fs-search`
(`sampleOverCapGlobResults: false`), `tool-jobs`, `skill-filesystem`, `tool-skill`,
`command-goal`, `tool-goal`, a `planning` group with `isolate: { planMode: true }` containing
`dsh-plan-mode`, a `compaction` group (`compaction-basic`, `command-compact`,
`compaction-tool-result-pruner` with `thresholdChars: 8192`, `headChars: 4096`, `tailChars: 1024`),
a `delegation` group (`tool-subagent-control`, `.../list-agents`, `tool-subagent` with
`provider: spawn`, `modelSelectionSettings: true`, `backgroundMode: continuable`; `tool-subagent`
with `provider: fork`, `toolName: subagent_fork`; disabled `codex`/`claude-code` providers;
`workflow-worker-thread`, `tool-workflow`, `tool-ralph` with `maxRounds: 64`),
`tool-ask-user`, `tool-todo` (`allowParallelInProgress: true`), `tool-web`
(`fetch: true`, `searchTimeoutMs: 60000`).

**No spill rows in the agent plane — but spill is mounted on the HOST plane.** Reading only the
preset composition suggests a gap that does not exist: `dsh --profile web --dump-default-config`
shows `spill-local` + `spill-policy` (`maxInlineBytes: 50000`) in `@deepseek-ai/dsh-base`, shared by
every preset. The same host/agent split applies to `tool-result-pruner` (declared host-plane with
8192/4096/1024 and `disabled: true`, then re-enabled per preset), to the web-fetch caps, and to
`dsh-tools`' global `mode`. **A preset chooses what a session re-enables; the host owns the
capability.** Correcting this was the first thing executing the plan produced.

### Cache-stability discipline is already documented in-tree

The shipped plan-mode prompt section states it outright:

> "The tool catalog stays the same across modes for request-cache stability. These plan-mode rules
> override any later tool description or guidance that suggests using mutation tools; **those tools
> remain listed to keep the tool catalog unchanged.**"

And the `subagent_fork` row is annotated: *"Fork omits model selection so provider/model stay equal
to the parent and the inherited history remains eligible for KV Cache reuse."*

---

## 3. Programmatic Tool Calling, as DSH implements it

From `@deepseek-ai/dsh-agent-tool-presentation/README.md` and `@deepseek-ai/dsh-tools/README.md`:

| `mode` | what the model sees |
|---|---|
| `native` | "each visible tool schema as a function definition" |
| `ptc` | "only the `run_code` transport plus a generated SDK and the rule that only `run_code` may be called directly" |
| `both` | both forms |

- Selecting `ptc`/`both` **requires a composed `ctx.codeRuntime`** "whose language has a registered
  SDK renderer"; a preset selecting PTC against a deployment with no runtime "refuses to mount, naming
  this row, so the failure lands where the operator can act instead of at the session's first request."
- "One agent declares one presentation" — a second declaration is refused, not merged.
- `dsh-tools` config also exposes `maxParallelSubCalls` (default `10`), the concurrency cap for a
  `run_code` program's overlapping sub-calls.

From `@deepseek-ai/dsh-code-runtime/README.md` — the execution seam:

- Runs "one model-written program against host-provided asynchronous functions"; the program runs as
  the body of an async function, so top-level `await` and `return` work; each namespace becomes one
  global object of async functions (PTC passes one under `tools`).
- **"only what the program printed and returned re-enters the conversation."**
- Backends declare `language` (`typescript`/`python`) and `isolation`
  (`worker-thread`/`process`/`container`) — a diagnostic label, **explicitly "not a security
  claim"**.
- Error kinds are orthogonal: `exception`, `timeout`, `abort`, `worker-exit`, `invalid-output`,
  `output-limit`.
- `dsh-code-runtime-worker-thread` "executes TypeScript in a fresh Node worker thread"; a private
  experimental package runs Python in a fresh CPython subprocess.

Independent description of the same design, including the worked example
(`const r1 = await tools.bash(...)`, only `return` reaches the model), the "5 calls → 1 request"
claim, and the caution that the worker thread is **not** a sandbox (full Node API):
[DSH 四种 Preset 区别与用法](https://news.qiniu.com/archives/1788252903712).

---

## 4. Token-efficiency primitives that already exist

Read locally from the package READMEs:

**`dsh-output-retention`** — `ItemRetainer` (ordered logical units) and `TextRetainer`
(byte-oriented). `kind: 'head' | 'tail' | 'headTail'`; `headTail` counts **bytes**, trims a partial
codepoint at each cut so "the returned text never carries a replacement character introduced by the
cut", and `finish()` returns the retained content plus an exact `omitted` count.
`formatRetentionNotice()` standardises the omission clause and joins it with tool-supplied recovery
guidance ("Narrow the pattern, path, or include to see more."). `truncated` is documented as a
*budget* fact, never a claim that the upstream was incomplete.

**`dsh-spill-policy`** — caps the model-facing copy of a plain-text tool result at
`maxInlineBytes` (UTF-8; omitted = policy disabled). The replacement is a head/tail preview plus:

```text
(Omitted N bytes. Full formatted result stored at: /…/session-…/…-web_fetch.txt.
 Use read with offset/limit, or grep this path to search within it.)
```

The whole replacement stays *inside* the budget; the full text stays on disk; "a successful
replacement changes only the model-facing copy, never the canonical programmatic result". It also
bounds the session-log copy of each `run_code` sub-call result.

**`dsh-token-meter`** — replay-based measurement: "the measurements replay the durable session log,
so they are deterministic, cost no model calls, and reflect exactly what is logged."
`measure(session, requestHeader?)` returns `totalTokens` (request+response pressure) and
`surfaceTokens` (route-priced surface total) plus `nodes[]`, so you can attribute context cost per
node. Uses a fixed heuristic unless the adapter declares pricing; provider usage is reused only when
the canonical request envelope matches the measured envelope. This is the **Phase 0 instrument**.

**`dsh-compaction`** family — `compaction-basic` (threshold-triggered), `command-compact`
(`/compact`), `compaction-tool-result-pruner` (the 8192/4096/1024 budget above).
`compaction-basic` resolves `toolResultPrune` via `ctx.get`, which is why the pruner must share
the preset's `isolate` realm.

**`dsh-fs-observation-policy`** — the read-before-write rule visible in this session, which prevents
edit round-trips against unread files.

**`dsh-web-fetch-http`** — provider-level caps such as `maxBodyChars` truncate *before* the spill
policy sees the result, so the spill file "holds what the tool actually returned" — a documented
limit worth knowing when tuning budgets.

---

## 5. Token economics: why caching outranks routing

Rate card (DeepSeek's own pricing page, `_ev/deepseek-pricing.html`, captured 2026-09-28, off-peak
column; single copy in `tools/prices.mjs`). The third-party blog previously cited here carried the
retracted card (miss 0.14 / hit 0.028 / out 0.28):

| model | input (cache miss) | input (cache hit) | output |
|---|---|---|---|
| `deepseek-flash` | $0.15 / M | **$0.003 / M** | $0.60 / M |
| `deepseek-pro` | $1.74 / M | **$0.145 / M** | $3.48 / M |

- Cache-hit discount: **50x (98% off) Flash, ~12x (92% off) Pro** on repeated prefixes.
- Caching is **automatic** (same account, repeated prefix); it requires a prefix of **≥1024 tokens**
  matching **byte-for-byte**, and prices are identical in thinking and non-thinking mode — the model
  ID sets the rate, reasoning mode only changes how many tokens you burn.
- Worked example from that source: a 20k-token fixed system prompt + 100 × 200-token questions costs
  **$3.69 uncached vs $0.53 cached — roughly 7× cheaper on an identical workload**. (Computed on
  the retracted card; not re-derived here.)

**The load-bearing inference for this plan:** V4-Pro *cached* ($0.145/M) is essentially equal to
V4-Flash *uncached* ($0.15/M). A cache hit on the strong model costs about what a cache miss on the
cheap model costs. Therefore a decision layer that rewrites the prompt prefix to "save" by switching
models can destroy more value than it creates. Route on *work*, and keep the prefix stable.

Corroborating measured saving from the ecosystem: `dsh-delegate-router` reports DeepSeek V4 Flash at
**exactly one third of V4 Pro on every line** and, on 4 routed runs (~156K tokens),
**¥0.32 actual (Flash) vs ¥0.96 hypothetical (Pro) — 66.7% saved** on every routed delegation.

---

## 6. Decision / routing layer: what already exists

### Session-level tier routing

**`dsh-auto-model-router`** ([repo](https://github.com/ADVeRTs13/dsh-auto-model-router)) — four
capability levels `L0`/`L1`/`L2`/`L3` with three user-facing modes: a zero-latency **heuristic
lock** (text-width thresholds; CJK = 2, other = 1), a **fixed-level** mode, and **fully-auto**
(keyword scoring with configurable weights, then an LLM classifier only when the score is 0).
Levels map to user-assigned provider/model routes each with a **required `reasoningEffort`**. It
registers a virtual `auto` provider so the picker offers an "Auto" model; choosing a real model
disables the router entirely.

Its most important design statement, echoed in the plan:
**"One decision is made per user input (not per agent step). Steps within the same input reuse the
decision — the LLM classifier is never called per step."**
It cites prior art: Hermes Agent's `model-router`, OpenCode's `fast/medium/heavy` tier plugin, and
several declarative OpenClaw routing configs.

### Subagent-level cost routing

**`dsh-delegate-router`** ([repo](https://github.com/penguin-oo/dsh-delegate-router)) — routes
*delegations*, not the main conversation, so the main session keeps the strong model. Rules apply in
order: explicit per-call `provider`/`model` → `/delegate off|flash-all` → session token budget cap
→ **keyword dominance scoring** (heavy wins ties, but a strictly-light task beats one incidental
heavy word) → short-task length threshold → Beijing peak-hour demotion → opt-in
`unknownToFlash`. Task text = `description` + `prompt`; ASCII keywords use word boundaries so
"list" never matches "specialist"; CJK keywords under two characters are ignored. Every decision is
written to an inspectable **ledger**.

### Persona / thinking-mode banding (research artifact)

**`dsh-routing-suite` / `router-standard`** ([repo](https://github.com/yjh051108/dsh-routing-suite)) —
encodes a *measured* property of DeepSeek V4: on the persona axis, behaviour "is **not a continuum**
— it collapses into a few stable regions separated by phase transitions", quantised to
**spec [0, 0.15] / transition band [0.2, 0.45] (unstable — avoid) / react [0.5, 1.0]** (11 mode values
behave identically), plus a fourth **weak** band where the model routes itself from the task. The
optimal weak persona is **model-specific**: a spec sentence helps Pro but *anti-routes* on Flash.

Two design ideas from it that this plan adopts:

- **Progressive tool disclosure** — staged unlocking, a `tools_catalog` full index plus `tools_help`
  full schema, and the `all:true` escape hatch deleted so **unlocked tools never enter the model's
  view**. This is cache-safe surface reduction, unlike editing the catalog.
- **Cache-safe injection point** — near-field guidance is inserted into `decision.messages` at
  `agent/pre-step`, after an earlier approach at `session/event` both failed to deliver and caused a
  **second model request per user message** (a 2× API-call spike). A concrete warning that where a
  decision layer injects text has direct cost consequences.

### Typed decision models

**Jev / TypeSafe** — "a decision model: you send a state plus typed questions (choice / score /
boolean), it returns calibrated, probability-distributed answers — **no text generation**."
Three DSH integrations exist:
[`nanami-0713/dsh-jev-decide`](https://github.com/nanami-0713/dsh-jev-decide),
[`jackie-cqz/dsh-jev-plugin`](https://github.com/jackie-cqz/dsh-jev-plugin),
[`BetterZflyee/dsh-jev-adapter`](https://github.com/BetterZflyee/dsh-jev-adapter).

The adapter's README documents the two caveats this plan repeats:

- **Honesty prompt required.** "The adapter explicitly instructs the model to spread probability when
  uncertain instead of forcing a fake 1.0 — without this, **confidence saturates and the routing
  signal is lost**."
- **Calibration depends on the channel.** On an OpenAI-compatible endpoint "probabilities are the
  model's **self-reported estimates (not mathematically calibrated** — every result carries this
  caveat)"; only the real typesafe channel is calibrated.

Its stated routing pattern: `confidence ≥ 0.85` → act; `0.5–0.85` → draft and confirm;
`< 0.5` → escalate. Note also "1 and 10 questions cost about the same" — batching typed judgements
into one call is itself a token-efficiency property.

### Quality gates (the D4 "continue / escalate / stop" decision)

- `dsh-answer-reviewer` — "each final assistant turn is re-reviewed by a separate LLM graded 1-100;
  below-threshold scores steer the agent back with concrete feedback."
- `dsh-quality-review` — independent reviewer with at most 2 rounds per turn.
- `dsh-advisor-plugin` — pairs the executor with a stronger reviewer via "zero-parameter `advisor()`
  calls and step-based patrol checks, returning plan, correction, or stop guidance."
- `dsh-loop-continue` — detects a turn that ended "after narrating its next action without calling a
  tool" and asks a judge model one true/false question to run one more step.
- `dsh-gungnir` — verifies completion against command exit codes and generated artifacts,
  "preventing the model from falsely reporting task completion."

### Token-saving plugins

- **`dsh-token-saver`** ([repo](https://github.com/Shaw529/dsh-token-saver)) — a Cordis plugin hooking
  three extension points: `tools/post-execute` (lossless head/tail trimming, grep folding),
  `agent/pre-step` (delegating to the official `ctx.compaction`), and optional prompt-cache-stable
  section ordering (`cacheStableSections`). Four modes `off`/`conservative`/`balanced`/`aggressive`;
  `conservative` (default) "does not replace the native chain at all" and only folds tool results,
  keeping head/tail and replacing the middle with one line of metadata, so "the model still knows the
  middle was truncated". It states the motivating measurement: **80%+ of prompt tokens in long tasks
  come from large file reads and grep result backfill**. It also reports it deliberately routes all
  rewriting through the DSH event stream to avoid tripping the "model-visible ≠ logged" invariant.
- `drscrewdriver/dsh-context-compression-improved` — alternative context-compression plugin.

### Research-mode prior art

- [`wxxb789/dsh-raven-research`](https://github.com/wxxb789/dsh-raven-research) — "source-grounded
  deep research, writing, and learning plugin … steerable checkpoints, mid-run steering, and
  **citations verified against retrieved sources**."
- `@creait/dsh-research-mode` (npm).
- [`gavenma/dsh-autoresearch-preset`](https://github.com/gavenma/dsh-autoresearch-preset) — a full
  research-project preset: immutable plan approved before anything runs; nodes execute "as fresh,
  single-purpose roles — scouts, verifiers, writers, critics, judges, coders — each with a declared
  read/write scope, **so no step inherits another step's context**"; blind multi-judge ranking;
  causal failure attribution; hash-anchored integration ledger; transactional publication. Its
  isolation model is lever #3 taken to its logical end.
- `Harzva/dsh-research-lab` — DSH-native baseline/ablation/reproducible-evaluation control plane.

### A community preset that already combines the modes

[`aorucshiea/dsh-omnipotent-preset`](https://github.com/aorucshiea/dsh-omnipotent-preset) —
"combines Standard / PTC / Minimal-style capabilities with routing modes (`spec` / `mixed` /
`weak` / `react`) and Cordis creation mode." It uses presentation `both` (native schemas **and**
`run_code`), adds the persistent bash + `str_replace_editor` RL-shape surface, and ships
`router-core.mjs` / `router-omnipotent.mjs` implementing task classification, per-session mode
derived from durable events (resume-safe), and persona selection.

Its router code is the clearest available example of deterministic-first classification:
`classifyTask()` counts hits against a react regex (build/create/generate/…) and a spec regex
(fix/debug/refactor/…) and returns `1`/`0`/**`'weak'` on ambiguity** — i.e. ambiguity is routed to the
mode where the model decides for itself. It also documents a defensive bug worth remembering:
plugin/tool-generated user messages sometimes nest the payload at `data.message`, and reading
`data.content` directly yielded an empty string, causing build/fix tasks to be misclassified as
`weak`.

---

## 7. Cross-vendor evidence I — PTC, schema bloat, caching, truncation

Deep-research findings (2026-09) from vendor docs, papers and engineering blogs. Vendor-run
benchmarks are labelled as such.

### 7.1 PTC: where it pays, where it costs more

Mechanism ([Anthropic PTC docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling)):
the model writes code that calls tools *as functions*; when the script hits a tool function the API
returns a normal `tool_use` block, you return the result, and the script resumes — **the result goes
into the script's memory, not into the model's context**. Only the final execution result re-enters.
(`code_execution_20260120`; tools opt in via `allowed_callers`; parallel calls via `asyncio.gather`;
pending calls time out ~4 min, idle container reclaimed ~5 min.) Anthropic's own warning:
`allowed_callers` is validation, **"not a hard API-level block"** — "do not rely on `allowed_callers`
as a security boundary".

| workload | result |
|---|---|
| internal 75-tool agent benchmark | **−38% billed input tokens**, no accuracy change |
| production traffic, requests with **10–49 tool definitions** | typical **20–40% savings** |
| complex research tasks | **43,588 → 27,297 tokens (−37%)**; GIA 46.5% → 51.2% |
| BrowseComp + DeepSearchQA (web search) | **+11% performance, −24% input tokens** |
| **τ²-bench** (1–2 *sequential single* calls per turn) | scores unchanged, **~8% MORE expensive** |
| budget-compliance example (20 people, 2,000+ line items) | 200KB raw → **1KB of results**; ~19 inference passes eliminated |

**The shape-dependence is the point:** PTC wins when a logical unit really is multi-step, and *loses*
on sequential single-call traffic. This directly matches DSH's own framing of `ptc` as the mode for
composing multi-step operations, and `minimal` as the cheap mode for one-shot work.

CodeAct (the origin paper) reports **up to 20% higher success rate** for code-as-action vs
JSON/text actions across 17 LLMs ([arXiv:2402.01030](https://arxiv.org/abs/2402.01030)).
But HuggingFace's structured-CodeAgent study found a **"structure tax"**: forcing
`{thoughts, code}` JSON helped capable models by 2–7 pp, yet across 15,724 traces **2.4% had
first-call parsing errors** and those traces succeeded **42.3% vs 51.3%** with steps
**3.18 → 4.63** ([HF blog](https://huggingface.co/blog/structured-codeagent)). Small models emit
broken code *while also* JSON-formatting.

**PTC vs native JSON tool calling, measured:** *"The Bitter Lesson of Tool Calling"*
([arXiv:2608.06370](https://arxiv.org/abs/2608.06370), Aug 2026) finds PTC matches or exceeds native
JSON tool calling in **11 of 14 models on BFCL v4** (the GPT-5.6 family by **+10.6%**), and is more
robust under context rot. **`strands-code-agent`** (code generation *as* the action interface, with a
persistent Python REPL and tools exposed as importable library functions) measured against an
equivalent tool-calling agent: **+7% accuracy, −78% input tokens, −67% output tokens, 56% faster,
−35% reasoning cycles** (Data Agent Benchmark). Together with CodeAct's +20% success rate, the case
for a code-execution surface on *frontier* models is strong — which is exactly the "frontier LLM"
premise of this project.

Cloudflare's server-side Code Mode: `search(code)` + `execute(code)` only. The Cloudflare API has
**>2,500 endpoints**; an equivalent native-MCP server would consume **1.17M tokens**, Code Mode's
fixed footprint is **~1,000 tokens → 99.9% reduction**; the example workflow took **4 tool calls**
([blog](https://blog.cloudflare.com/code-mode-mcp/)). Isolation is a **Dynamic Worker isolate** —
"no file system, no environment variables to leak through prompt injection, and external fetches
disabled by default" — and it starts in **milliseconds**, "cheap enough to create a new one for every
single code snippet" ([design post](https://blog.cloudflare.com/code-mode/)). Cloudflare also argues
the CLI alternative "needs a shell — much broader attack surface than a sandboxed isolate".

**Contrast with DSH:** DSH's `ptc` runs TypeScript in a Node **worker thread** with full Node API
access, and `dsh-code-runtime` documents `isolation` as "a label for deployments and diagnostics,
**not a security claim**". So DSH PTC is *more* capable than Cloudflare's isolate and *less*
contained; treat it as bash-equivalent trust.

### 7.2 Tool-schema bloat, and why the tool surface is a first-class cost

- A five-server MCP setup — GitHub 35 tools ≈ **26K tokens**, Slack 11 ≈ **21K**, Sentry 5 ≈ 3K,
  Grafana 5 ≈ 3K, Splunk 2 ≈ 2K — is **58 tools ≈ 55K tokens before the conversation starts**; adding
  Jira approaches **100K+**; Anthropic reports seeing tool definitions consume **134K tokens** before
  optimization ([advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use)).
- **Selection accuracy degrades past 30–50 available tools** ([tool search docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)).
- Deferred loading (Tool Search): **~500 tokens** up front + 3–5 tools (~3K) on demand = **~8.7K vs
  ~77K**, i.e. **~85% fewer definition tokens**, preserving 95% of the window; MCP-eval accuracy
  **Opus 4 49% → 74%**, **Opus 4.5 79.5% → 88.1%**.
- **This is exactly the lever `dsh-routing-suite` implements** — a `tools_catalog` index plus
  on-demand `tools_help` schema, with the `all:true` escape hatch deleted so unlocked tools never
  enter the model's view. Independently validated by vendor data.

### 7.3 Prompt caching: the mechanics that constrain the design

| provider | cache read | minimum prefix | notes |
|---|---|---|---|
| Anthropic | **0.1×** base (0.025–0.05× on newest models); write 1.25× (5-min) / 2× (1-hour) | 512–4,096 depending on model | invalidation follows **`tools` → `system` → `messages`**: a change at a level invalidates that level **and everything after** ([docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)) |
| OpenAI | "discounted up to 90%" | 1,024 visible tokens | cached state is **machine-local**; above ~15 req/min overflow routing can lose hits; use a stable `prompt_cache_key` ([docs](https://developers.openai.com/api/docs/guides/prompt-caching.md)) |
| Gemini | implicit caching on by default for 2.5+ | 2,048–4,096 | explicit caching adds a storage fee |
| DeepSeek | cache hit ≈ **2–3% of miss** (off-peak: flash $0.003 vs $0.15; pro $0.022 vs $0.66 per 1M in) | ≥1,024 tokens, byte-exact | ([pricing](https://api-docs.deepseek.com/quick_start/pricing)) |

Manus, on running agents in production: average **input:output ratio ≈ 100:1** in an agent loop;
cached input **$0.30/MTok vs $3/MTok** uncached (**10×**); and — the operative sentence —
**"KV-cache hit rate is the single most important metric for a production-stage agent"**
([Manus](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)).
Their stability rules: a **single-token difference** invalidates from that token on; a
second-precision timestamp in the system prompt kills the hit rate; keep context **append-only**;
make JSON serialization deterministic; and **"avoid dynamically adding or removing tools
mid-iteration"** because tool definitions sit near the front.

**Three cache-vs-feature conflicts documented by the vendors themselves:**

1. **Compaction resets the cache.** OpenAI: summarization/compaction "can change the prefix and reset
   cache reuse". Anthropic's tool-result clearing "**invalidates cached prompt prefixes when content
   is cleared**" — hence `clear_at_least` so each invalidation buys enough tokens
   ([context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing)).
2. **Deferred tools are the exception that proves the rule** — Anthropic notes deferred tools never
   enter the prompt, so Tool Search "doesn't break prompt caching".
3. **Routing is a cache decision.** See §8.

### 7.4 Concrete truncation budgets (Claude Code, as a reference design)

- Bash stdout streams to a working file, killed past **5 GB**; valid results inlined up to
  **~30,000 characters** then replaced by a file path + **2,000-char preview**; failure output inlined
  up to **~10,000 chars**; `bashOutputMaxChars` tunable to **128,000**.
- Read returns a **`PARTIAL view`** notice with `offset`/`limit` guidance when a whole-file read
  exceeds the limit; Glob caps at **100 files** with a truncation flag; Grep defaults to
  `files_with_matches` (paths only) with `head_limit`/`offset`.
- Subagents are exposed as a context-isolation primitive with their own tool subset and a
  `maxTurns` cap. **Note:** public *quantified* subagent-savings numbers are scarce — the research
  flagged this as an under-measured lever, which is why Phase 0 measurement matters.

(`dsh-output-retention` + `dsh-spill-policy` + the 8192/4096/1024 tool-result pruner are DSH's
equivalents; the Claude Code numbers are useful only as calibration for the budgets.)

---

## 8. Cross-vendor evidence II — routing and decision models

### 8.1 The measured cache tax on routing (the decisive number)

In LiteLLM's Terminal-Bench agent run ([blog](https://docs.litellm.ai/blog/auto-router-terminal-bench-benchmark)):

| arm | cache hit rate | model switch rate |
|---|---|---|
| Opus-only | **89%** | 4% |
| router arms | **78–83%** | **40–58%** |

Routing silently spends part of its own saving on lost cache hits. Not Diamond makes the same
argument qualitatively: single-turn routing invalidates the KV cache each turn and can
"cost more money than any individual model at lower performance"
([Not Diamond](https://www.notdiamond.ai/blog/interactive-benchmarks-a-new-methodology-for-evaluating-model-routing)).

This is the empirical backing for the plan's central rule: **route on work, keep the prefix stable,
and prefer a phase map over per-turn difficulty guessing.**

### 8.2 What routing actually delivers (vendor-run, small samples)

| result | detail |
|---|---|
| Terminal-Bench 2.0, 21 tasks | single-message-context classifier: **16/21 solved (= Opus-5) for $14.34 vs $19.74 → 27% lower cost**; classifier cost only **$0.05–$0.34** per arm |
| same | **heuristic-only** router: **87% of Opus quality at 56% of cost**, no classifier call, lowest wall clock |
| SWE-bench Verified, 25 tasks | capability router **23/25 (92%) for $11.15 vs Opus-5 23/25 for $20.27 → 45% lower cost** |
| subtask/phase routing by tool name | **9/9 resolved, $1.51 vs $2.82 = 46% cheaper**; 73% of turns on a cheap model |
| production deployment | **272,876 requests, $12,249 saved on $23,985 (51.1%)**; 95% of requests never needed the flagship tier |
| Claude Code replay | **40.4% cheaper at 97.1% of frontier quality** |
| **but** per-dataset | GSM8K **81% savings**, HumanEval 65%, MMLU-Pro 64%, MATH-500 57%, MBPP 56%, **SWE-bench Lite only 21%** |

**Savings collapse precisely on repo-level agentic coding** — the exact workload in this plan —
because long contexts dominate spend and a correct router refuses to downgrade them. Routing is a
*chat-shaped* lever; PTC, tool-surface reduction and truncation are the *coding-shaped* levers.

### 8.3 What to feed the classifier (and what not to)

- 1 user message **beat** 3 user messages and **beat** 6 messages including assistant replies;
  assistant/tool output "reads as complexity without adding task intent" (LiteLLM).
- **Phase/intent is cheaper than difficulty:** routing on "what tool is the agent about to call" is
  deterministic, free, and changes many times per task; "how hard is this prompt" is almost always
  answered *hard* in a coding loop and costs money every turn (LiteLLM subtask post).
- Per-hop classifier compression cut **classifier cost another 32%** with no routing-accuracy change.

### 8.4 The limits: why a decision layer must be conservative

- **Cheap-classifier accuracy ceiling:** a pre-registered study of SLM front-door routing found best
  exact-match **0.783** (Qwen-2.5-3B) and DeepSeek-V3 **0.830 but failing a 2,000 ms P95 gate
  (2,295 ms)**; **no model met the ≥0.85 accuracy / ≤2,000 ms P95 bar**, leaving a **6–8 pp residual
  gap** ([arXiv:2604.02367](https://arxiv.org/abs/2604.02367)).
- **Router predictability bottleneck:** a survey of **21 routing methods across 5 benchmarks** finds
  them converging far below the oracle — routers learn *averaged model trends*, not query-specific
  signal ([arXiv:2606.07587](https://arxiv.org/abs/2606.07587)).
- **Most questions are not routable at all:** in a 14-model × 294-question matrix only **29/294**
  questions were improvable by routing; **assigning one model per task type fixed 21 of 29**
  ([arXiv:2608.23023](https://arxiv.org/abs/2608.23023)). This is the strongest evidence for
  task-type/phase routing over per-query routing.
- **Distribution shift:** RouteLLM routers trained only on Chatbot-Arena preferences were
  **near-random on MMLU**; ~1,500 in-domain labels (<2% of data) were needed to recover
  ([LMSYS](https://www.lmsys.org/blog/2024-07-01-routellm/)).
- Single-model-selection policies are capped by the all-models-wrong rate: **β = 0.052** (math),
  **0.079** (execution-graded code), **0.127** (GPQA-Diamond free response)
  ([arXiv:2606.27288](https://arxiv.org/abs/2606.27288)).
- Cascade savings are the largest on paper — FrugalGPT reports **up to 98% cost reduction** at
  GPT-4-matching quality — but require a *learned correctness estimator*, and the theory work
  identifies **estimator quality as the binding constraint**
  ([FrugalGPT](https://arxiv.org/abs/2305.05176), [cascade routing](https://arxiv.org/abs/2410.10347)).
- Hybrid LLM: **up to 40% fewer large-model calls with no quality drop**
  ([arXiv:2404.14618](https://arxiv.org/abs/2404.14618)). RouteLLM: **−85% cost on MT-Bench,
  −45% MMLU, −35% GSM8K** at 95% of GPT-4 quality.

### 8.5 Speculative and parallel patterns

Speculative actions — predict the next action, execute in parallel, commit only on match — reach
**up to 55% next-action prediction accuracy → up to 20% latency reduction**, and are *lossless*
because uncommitted actions cost nothing ([arXiv:2510.04371](https://arxiv.org/abs/2510.04371)).
Speculative tool calls (resident predicted call sequences) report throughput gains of several hundred
tokens/sec ([arXiv:2512.15834](https://arxiv.org/abs/2512.15834)). Best-of-N parallelism scales cost
**N×** with saturating coverage ([Stanford](https://scalingintelligence.stanford.edu/pubs/large_language_monkeys/)).

### 8.6 The synthesis the plan adopts

> Don't route per turn on judged difficulty. Use (a) a **static phase map**
> (explore → cheap, implement → frontier) keyed off tool names, (b) a **heuristic complexity scorer**
> for chat-shaped traffic, (c) **escalate on stalls** rather than predicting difficulty, and
> (d) keep a **stable prefix** so tier switches do not repeatedly re-write the cache.

Every design rule in [notes/plans/PLAN.md §4.2](../plans/PLAN.md) is a specialisation of this.

---

## 9. The cost/intelligence levers, measured (Anthropic internal, 2026)

Source for this whole section:
[Optimizing for cost and intelligence](https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence)
— Anthropic-internal measurements, described as directional. It is the single most useful document
found in this research, because it prices the levers *against each other*.

### 9.1 Caching is not one lever among many — it is the lever

- Prompt caching cut agent-loop cost **2.7×–5.3×**; a small triage agent's bill fell **83%**
  (**88%** with input trimming).
- DeepResearch Bench II, priced per task: **$37.94 → $7.12** (Fable 5.1), **$3.20 → $1.20** (Sonnet 5).
- Real traffic: agent loops read a **median 84%** of input from cache; the **top 10% of harnesses read
  ≥94%**; **below ~80% something is broken**. Deep in a task a well-built loop pays full price on
  **under 1%** of input.

**The cache-break pathology (the number to remember):** a **25-token status line at the front of the
system prompt** raised a triage run from **$0.59 to $4.24** — *worse than having caching off*. On a
100,000-token prefix, one broken turn costs **$1.25 instead of $0.03** (~50×) on Fable 5.1,
**$0.50 vs $0.02** (~25×) on Opus 5.5.

**TTL decision rules:** use the 1-hour cache when more than ~1 turn in 20 follows a 5-minute–1-hour
pause; stay on 5 minutes when turns arrive seconds apart (15% cheaper on Sonnet 5, 15–18% on
Opus 5.5); if ≥60% of long pauses exceed an hour, the 1-hour setting loses. Keep-alive requests
(`max_tokens: 0`, re-sent within 4 minutes) beat the 1-hour cache by ~8% (Sonnet 5, 1-in-20 pauses)
and 13–20% (Fable 5.1, multi-minute pauses).

**Compaction timing is a first-class cost decision.** Changes made *on* the compaction request
re-process the whole context at write price: the summarization pass cost **$0.21** there versus
**$0.04** one request later. Measured session cost: **$0.81** (no changes) / **$0.95** (mid-session
changes) / **$0.92** (changes on the compaction request) / **$0.75** (changes *after* compaction).
The rule writes itself: **batch prompt changes to land immediately after compaction, never on it.**

### 9.2 Tool definitions: deferral is the second lever, and it is free

- **502 tools, all loaded:** run cost **$0.55 → $1.02** as the catalog grew. With tool search it stays
  **flat at ~$0.56** — **45% less at 502 tools** — at unchanged accuracy (15–18/20) and with **no
  wrong-tool calls**. Deferring a public GitHub MCP server's toolset cut a run **20%** at the same
  accuracy.
- **Keep data files out of the prompt.** A 1,862-row CSV pasted inline is **~91,000 input tokens on
  every request**: Sonnet 5 answered **6/25 for $5.01**. Uploaded via the Files API and read through
  code execution: **25/25 for ~$0.40** — about a twelfth of the cost, and dramatically more correct.
  (This is the strongest single argument for a code-execution/PTC surface: the data never has to
  enter the context at all.)

### 9.3 Context levers only pay on long sessions — and can cost more on short ones

On a 20-issue run, **context editing cost 74% more**. On a 2.6×-longer run, a hand-written rule —
"prune stale tool results at task boundaries" — saved **39%**, and compaction saved **32%**, while
context editing changed nothing. The prune caches well (**89% cache reads** on the first request
after a boundary). Lesson: gate every context-shrinking lever on measured session length; applying it
early is a net loss.

### 9.4 Prompt audit: a free win most people skip

Prompts written for an older model cost **36% more per ticket** on the newer one at identical
accuracy. After an audit, the newer model was **14% cheaper *and* more accurate (97% vs 92%)**
(14% cheaper at the same accuracy on another model pair). Deleting a single over-obeyed
"verify twice" instruction cut cost per ticket **by a third**. Batching via the Batch API is
**50% off every token, including cached ones** (24-hour latency) — the right default for anything
offline.

### 9.5 Price per *solved task*, not per token

| setup | result |
|---|---|
| Fable 5.1 `low` vs Sonnet 5 default (SWE-bench Pro subset) | **88.6% at $0.54/solved** vs 77.4% at $0.84 |
| Opus 5.5 `medium` vs Fable 5.1 default | matched (92.8% vs 92.3%) for **$0.22 vs $1.19** |
| Terminal-Bench 3 across model generations | $8–15/task at 7%/15%/41% solved → **$183 → $63 → $28 per solved task** |
| effort sweep, four research benchmarks | `low` gave up **1–3 points for a third to a half off**; `medium` matched default at **70–87%** of cost |
| DeepWideSearch | **dropping effort beat** switching to an orchestrator + worker, at **29% lower cost** |

**Advisor strategy** (cheap executor + frontier advisor on demand): Opus 5.5 `high` + Fable 5.1
advisor = **90.1% at $2.92/attempt** — 1.7 points over the executor alone for **~2.1× the money**,
landing on the executor's own effort curve (xhigh alone: 91.1% at $4.11).
**Its failure mode is decisive — consult-rate collapse:** an executor that consults on most tasks at
default effort can consult on almost none at low effort and then score *below* the executor alone
(one measured run: **1 consultation in 300 tasks, 61.7 vs 62.7 solo, at the same cost**).

**Orchestrator strategy** (frontier lead + cheap workers) saved money in only **two** measured
situations:

1. **Insurance against the cost tail** on routine work — BrowseComp easy slice: about half the
   average cost, **a third at p90 ($12 vs $33)**; the solo model's single most expensive run was
   **$84 and wrong**.
2. **Work larger than one context window** — a 21.6M-token corpus: solo $468–552/episode;
   coordinator + 25 workers **47–55% less**, 10–12 points below peak, **2.3 h vs 15–20 h**.

On the *full, harder* BrowseComp set the economics **reversed**: the solo model matched the
coordinator at **22–30% lower cost**. The stated principle:

> "When the work is one dependent chain, or fits in a single context, the orchestrator pays for a
> plan, a handoff, and a merge that a single model gets for free."

An elapsed-time instruction plus a clock (DRACO) finished in **33% less time at 54% lower cost per
task**, scoring 1.5 points lower.

### 9.6 The lever ordering this research implies

> **(1) cache stability → (2) tool-definition deferral → (3) effort/model choice priced per solved
> task → (4) batch for offline work → and only then (5) routing/orchestration**, which pays only for
> cost-tail insurance or >1-context-window fan-out, and which must be priced **net of the cache hits
> it destroys.**

This is a correction to the naive framing of the original request. "Frontier LLM + decision models
to save tokens" puts routing first; the measurements put it *last*. The first three levers are worth
more than routing, and none of them require a decision model.

---

## 10. Plugin supply chain: the security constraint

From the [awesome-dsh-plugin](https://github.com/rob-x-ai/awesome-dsh-plugin) list header — itself a
curated list that explicitly does **not** rank or vouch for quality:

> "Installing a plugin runs third-party code on your machine with your own permissions — it can read
> your files, use your credentials, and reach the network. **Tool approvals don't sandbox plugin
> code.** Being on this list is not a security review: check the source before you install, and try
> unfamiliar plugins somewhere that doesn't hold your keys."

The same caution is attached to DSH's own `cordis` preset: the official docs treat a session on it
"as shell access". And `dsh-code-runtime` documents `isolation` as "a label for deployments and
diagnostics, **not a security claim**" — the TypeScript PTC runtime is a fresh worker thread with
full Node API access, i.e. the same trust level as `bash`.

---

## 11. Measured locally (execution results)

Produced by `tools/dsh-audit.mjs` over 356 session logs on this machine. Full write-up:
[notes/records/EXECUTION.md](../records/EXECUTION.md).

### PTC containment — 69.5%

**813,062 characters stayed inside `run_code` programs while 356,556 characters of tool results
entered the conversation.** Two thirds of intermediate work never reached the context window. This is
the PTC lever measured on live traffic rather than quoted from a vendor, and it is the strongest
local evidence for keeping a code-execution mode.

### PTC batching — 1.73 sub-calls per model tool call

94 model tool calls dispatched **163 tool sub-calls** → roughly **69 round trips avoided** in one
session. Mix: `pwsh×52, edit×24, web_fetch×23, write×19, read×15, list_agents×10`.

### Tool schemas 25 → 1, but the fixed prefix grows

| | declared tools | schema tokens | system-prompt tokens | fixed prefix |
|---|---|---|---|---|
| native sessions (preset unrecorded) | ~21 | ~5,545 | ~3,164 | **~8,709** |
| `ptc` sessions | **1** | **236** | ~9,434 | **~9,670** |

PTC cuts schema tokens by **96%**, yet the *fixed prefix* is **~11% larger**, because the generated
TypeScript SDK moves into the system prompt. Cached at ~2–10% of input price that ≈961 extra tokens
is nearly free, while the round trips it removes are not. **PTC is a round-trip lever, not a
prompt-size lever** — the research's prediction, confirmed locally.

### Where the context actually goes

| category | share |
|---|---|
| tool results | **40.0%** |
| tool-call arguments (the TypeScript programs) | **26.3%** |
| assistant text | 23.0% |
| user messages | 7.0% |
| system prompt | 3.6% |
| tool schemas | **0.1%** |

The second row is the cost the "PTC saves tokens" framing omits: **in code mode the program text the
model writes is itself a quarter of the context.** The new presets' personas therefore say "return
the smallest sufficient result", not merely "use PTC".

### Honest limitation

DSH does not log per-request provider usage, so a **provider cache-hit rate is not derivable from the
session logs**. The figures above are CJK-aware character estimates — sound for ranking and share,
not for billing. The "median 84% / target ≥94% cache reads" numbers in §9.1 remain a target to verify
in the provider dashboard.

---

## 12. Sources

Primary (read locally from the installed DSH 0.1.5-alpha.1):
`@deepseek-ai/dsh-agent-presets` (README + all four `presets/*/agent.cordis.yml` and `preset.yml`),
`@deepseek-ai/dsh-agent-tool-presentation`, `@deepseek-ai/dsh-tools`, `@deepseek-ai/dsh-code-runtime`,
`@deepseek-ai/dsh-code-runtime-worker-thread`, `@deepseek-ai/dsh-output-retention`,
`@deepseek-ai/dsh-spill-policy`, `@deepseek-ai/dsh-token-meter`, `@deepseek-ai/dsh-compaction*`.

Web:
- [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)
- [DSH 四种 Preset 区别与用法：极简 / 标准 / PTC / 创造](https://news.qiniu.com/archives/1788252903712)
- [DeepSeek V4 API Pricing — Apidog](https://apidog.com/blog/deepseek-v4-api-pricing/)
- [dsh-auto-model-router](https://github.com/ADVeRTs13/dsh-auto-model-router)
- [dsh-delegate-router](https://github.com/penguin-oo/dsh-delegate-router)
- [dsh-routing-suite](https://github.com/yjh051108/dsh-routing-suite)
- [dsh-token-saver](https://github.com/Shaw529/dsh-token-saver)
- [dsh-jev-decide](https://github.com/nanami-0713/dsh-jev-decide) · [dsh-jev-plugin](https://github.com/jackie-cqz/dsh-jev-plugin) · [dsh-jev-adapter](https://github.com/BetterZflyee/dsh-jev-adapter)
- [dsh-omnipotent-preset](https://github.com/aorucshiea/dsh-omnipotent-preset)
- [dsh-autoresearch-preset](https://github.com/gavenma/dsh-autoresearch-preset) · [dsh-raven-research](https://github.com/wxxb789/dsh-raven-research)
- [awesome-dsh-plugin](https://github.com/rob-x-ai/awesome-dsh-plugin)
- Anthropic engineering: [Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp) (the "up to 98.7%" context-reduction figure is from that page's own meta description), [Introducing advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use), [effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — the vendor-side framing of the same PTC idea DSH implements natively.
- Anthropic docs: [programmatic tool calling](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling), [tool search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool), [prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching), [context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing)
- [OpenAI prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching.md) · [Gemini caching](https://ai.google.dev/gemini-api/docs/caching) · [DeepSeek pricing](https://api-docs.deepseek.com/quick_start/pricing) · [Claude Code context window](https://code.claude.com/docs/en/context-window.md) and [tools reference](https://code.claude.com/docs/en/tools-reference.md)
- [Cloudflare Code Mode for MCP](https://blog.cloudflare.com/code-mode-mcp/) · [Cloudflare Code Mode design](https://blog.cloudflare.com/code-mode/)
- [Manus: Context Engineering for AI Agents](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)
- LiteLLM Auto Router series: [Terminal-Bench 2.0](https://docs.litellm.ai/blog/auto-router-terminal-bench-benchmark), [capability benchmark](https://docs.litellm.ai/blog/auto-router-capability-benchmark), [subtask-type routing](https://docs.litellm.ai/blog/subtask-type-routing), [cost/quality benchmark](https://docs.litellm.ai/blog/auto-router-cost-quality-benchmark), [production savings](https://docs.litellm.ai/blog/auto-router-production-savings), [docs](https://docs.litellm.ai/docs/auto_router/)
- Routing research: [RouteLLM](https://arxiv.org/abs/2406.18665) · [FrugalGPT](https://arxiv.org/abs/2305.05176) · [Hybrid LLM](https://arxiv.org/abs/2404.14618) · [RouterBench](https://arxiv.org/abs/2403.12031) · [cascade routing](https://arxiv.org/abs/2410.10347) · [GraphRouter](https://arxiv.org/abs/2410.03834) · [CodeAct](https://arxiv.org/abs/2402.01030) · [speculative actions](https://arxiv.org/abs/2510.04371) · [SLM front-door routing](https://arxiv.org/abs/2604.02367) · [routing predictability bottleneck](https://arxiv.org/abs/2606.07587) · [task-type variance](https://arxiv.org/abs/2608.23023)
- [HuggingFace structured CodeAgent](https://huggingface.co/blog/structured-codeagent) · [Not Diamond on interactive benchmarks](https://www.notdiamond.ai/blog/interactive-benchmarks-a-new-methodology-for-evaluating-model-routing) · [OpenRouter auto router](https://openrouter.ai/docs/guides/routing/routers/auto-router.md) · [Goose Code Mode](https://goose-docs.ai/docs/guides/managing-tools/code-mode/)
