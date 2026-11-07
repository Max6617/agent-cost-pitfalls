# Open-Source AI Coding Agent Harnesses — Fork-Base Comparison
_Compiled 2026-09-28. Metadata from GitHub (via ungh.cc proxy; api.github.com was rate-limited); licenses read from raw `LICENSE`; LOC counted locally from shallow clones; architecture from source + official docs._

## 0. Ecosystem status changes you must know (2026)
| Project | Change |
|---|---|
| `sst/opencode` | now **`anomalyco/opencode`** (redirects). MIT. 210.5k★, pushed 2026-09-28 |
| `block/goose` | now **`aaif-goose/goose`**, under **Agentic AI Foundation / Linux Foundation**. Docs → goose-docs.ai |
| **Roo Code** | **extension SHUT DOWN 2026-05-15**; repo last push 2026-05-15. Community successor: **Zoo Code** (`Zoo-Code-Org/Zoo-Code`) |
| **Continue** | README: *"no longer actively maintained and is read-only"*; final 2.0.0. EOL |
| **Plandex** | last push **2025-10-03** (~1 yr stale); cloud shut down, self-hosted only |
| **SWE-agent** | officially **superseded by `mini-swe-agent`** ("most current development effort") |
| **Charm Crush** | **relicensed to FSL-1.1-MIT** (source-available, *not* OSI) ⚠️ |
| `antinomyhq/forge` | now **`tailcallhq/forgecode`** |

---

## 1. Per-project comparison

### 1.1 OpenCode — anomalyco/opencode (ex sst/opencode) ⭐ top pick
- **Repo** https://github.com/sst/opencode · **MIT** · **TypeScript** (Bun + Effect)
- **LOC** core `packages/opencode/src` ≈ **82k TS**; monorepo ≈ 688k TS incl. generated SDK / console / web
- **Activity** 210.5k★, 27.9k forks, pushed **2026-09-28** (daily)
- **Architecture** client/server. Loop in `src/session/{processor,prompt,llm}`. Provider abstraction in `packages/llm` with **native adapters** (anthropic-messages, openai-chat, openai-responses, gemini, bedrock-converse, azure, cloudflare, copilot) + tool-schema translation. **Plugin API** (`.opencode/plugins/*.ts` or npm) with lifecycle hooks incl. `tool.execute.before/after`. 40 built-in tools. MCP local+remote. `@opencode-ai/sdk` (typed client) + headless server mode. Loop is service-oriented/patchable rather than a documented "bring your own loop", but plugins + SDK cover most needs.
- **Modes** ✅ **First-class.** `Agent.Info` schema: `mode: primary|subagent|all`, per-agent `prompt`, `model`, `permission` ruleset (tool allowlist), `temperature`, `steps`, `variant`. Built-ins: primary **Build / Plan** (+ hidden Compaction/Title/Summary), subagents **General / Explore / Scout**. Tab to switch; `@name` to invoke a subagent; `plan` tool + `plan-enter.txt`/`plan-exit.txt`/`plan-mode.txt`. Configurable in `.opencode/agents/` or JSON. **Implementation = prompt swap + model swap + permission/tool allowlist + separate agent definition.**
- **Programmatic/code-execution tool calling (PTC)** ✅ **YES — in tree.** `packages/codemode` = `@opencode-ai/codemode`, *"Effect-native confined code execution over schema-described tools."* Model emits JS calling `tools.<ns>.<fn>()`; TypeScript transpiled away, **Acorn parse + owned tree-walking interpreter (no eval)**; no ambient fs/proc/net authority. Token features baked in: **token-budgeted inline catalog** (round-robin across namespaces so one big namespace can't starve others) + `$codemode.search` for **lazy/deferred tool discovery**; limits `timeoutMs` / `maxToolCalls` / `maxOutputBytes`; ≤8 concurrent tool calls; results filtered in-program (keep big intermediates out of context). Wired as the `execute` tool in `src/tool/code-mode.ts`, **gated behind `flags.experimentalCodeMode`** and currently scoped to **MCP tools** only.
- **Token efficiency** context **compaction** (`session/compaction.ts`, `overflow.ts`, `summary.ts` + a dedicated compaction agent); **output truncation** (`tool/truncate.ts`, truncation-dir); **subagent context isolation** (child sessions); **per-model prompt variants** (`session/prompt/{anthropic,gemini,gpt,codex,kimi,beast,copilot-gpt-5,trinity}.txt`); cost/usage accounting via SDK + `llm/recording-cost-report.ts`; PR #8177 adds **dynamic (lazy) MCP tool schema loading**. _Prompt-caching control not confirmed from source — verify before relying on it._
- **Subagents** ✅ (child sessions, @-mention or auto). **SDK/library** ✅ server + `@opencode-ai/sdk` + plugin package (embed by starting the server).
- **Fork difficulty** **LOW for modes** (declarative, already ships Build/Plan/Explore/Scout); **LOW–MEDIUM for a code-exec loop** (CodeMode exists — extend its tool tree from MCP-only to all tools, flip the flag, add a routing/mode wrapper). Largest single win of any candidate.

### 1.2 Cline — cline/cline ⭐ top pick
- **Repo** https://github.com/cline/cline · **Apache-2.0** · **TypeScript**
- **LOC** `apps/` ≈ 481k TS, `sdk/` ≈ 504k TS (incl. generated/vendored) — large, but cleanly layered
- **Activity** 69.5k★, pushed **2026-09-28** (very active). Repositioned as *"Autonomous coding agent as an SDK, IDE extension, or CLI assistant."*
- **Architecture** layered packages: `@cline/core` (sessions, built-in tools, hub, automation), **`@cline/agents` (browser-compatible *stateless agent loop*, `run/continue/abort/subscribe/restore/snapshot`)**, `@cline/llms` (provider gateway + model catalogs), `@cline/shared`. **Plugin architecture**: tools, hooks, commands, rules, events. `createTool({name,description,inputSchema:zod|JSONSchema,execute})`. Built-in tools: read_files, search_codebase, run_commands, fetch_web_content, apply_patch, editor, skills, ask_question, submit_and_exit. MCP ✅. Checkpoints, cron/automation.
- **Modes** ✅ **Plan & Act** dual-mode; history carries across the switch; Plan = read-only (no writes, no command execution) → **tool availability gating + prompt**. Plus auto-approve/YOLO permission tiers. No user-defined N-mode system like Roo/Kilo.
- **PTC** ❌ JSON tool calls. But the documented `createTool` + stateless `@cline/agents` loop make a code-execution `execute` tool a contained addition.
- **Token efficiency** **subagents with separate context windows + per-subagent token budget and cost rollup**; checkpoints; auto-compaction; **Model Orchestration** sample (cheap/expensive model routing); skills.
- **Subagents** ✅ `use_subagents` tool (experimental): parallel, own context, read-only, cannot use MCP or spawn nested subagents, returns file-path-focused report; per-subagent stats in UI.
- **SDK/library** ✅ **best-in-class** — `npm i @cline/sdk`, "same harness used in the IDE extensions and CLI".
- **Fork difficulty** **LOW.** Add an `execute` code tool via `createTool`, add a "research"/"code" mode as a plugin with rules+hooks. Docs: https://docs.cline.bot/sdk/overview

### 1.3 OpenHands (Agent Canvas + Software Agent SDK) ⭐ top pick (library purist)
- **Repos** https://github.com/OpenHands/OpenHands (app, 89.3k★) · **https://github.com/OpenHands/software-agent-sdk** (SDK, **MIT**, 1.2k★, pushed 2026-09-28)
- **Language/LOC** Python. SDK is 4 packages: `openhands.sdk`, `openhands.tools`, `openhands.workspace`, `openhands.agent_server`
- **Architecture** *"unified, type-safe framework … statelessness, composability, clear boundaries."* Stateless event-driven **reasoning-action loop** (`Agent`/`AgentBase`), tool orchestration, **condensers** for history compression, security analyzer, skills, workspaces (local/Docker/remote). Agent Server exposes REST+WebSocket. **ACP** lets an OpenHands agent delegate to Claude Code / Gemini CLI. Tools: BashTool, FileEditor, GrepTool, browser-use, task tracker…
- **Modes** ❌ no first-class plan/build switcher. Compose behavior via agent settings/skills/condensers. **`ask_oracle`** ✅ — consults a saved `oracle` LLM profile for a **stateless second opinion** (no history, no tools), cost rolled into conversation metrics → the closest shipped "decision-model" primitive in any of these.
- **PTC** ⚠️ CodeAct lineage (agents writing Python/IPython that calls tools) from OpenHands V0; V1 SDK is tool-calling-first. Verify before assuming CodeAct is still the default.
- **Token efficiency** **condenser** (documented context-compression subsystem), history condensation guides, oracle/stateless calls, per-conversation + combined metrics.
- **Subagents** ✅ delegation, ask_oracle, ACP agents. **Library** ✅ **the most library-like** of the whole set (pip install openhands-sdk openhands-tools).
- **Fork difficulty** **LOW–MEDIUM**: trivially extensible Python; you write the mode system and message-based PTC loop. Docs: https://docs.openhands.dev/sdk/arch/overview

### 1.4 Google Gemini CLI — google-gemini/gemini-cli
- **Repo** https://github.com/google-gemini/gemini-cli · **Apache-2.0** · **TypeScript** · `packages/core/src` ≈ **331k TS**, `packages/cli/src` ≈ **294k TS** (tests included)
- **Activity** 107.2k★, pushed 2026-09-28; nightly/preview/stable weekly trains
- **Architecture** `packages/core` (loop, tools, policy engine) + `packages/cli` + a2a-server + extensions. MCP ✅. **Policy engine** ✅ — TOML rules (`toolName`, `argsPattern`, `commandPrefix`, `commandRegex`) → `allow|deny|ask_user` with priority; **conditions can include the current approval mode**. Extensions bundle MCP servers + context + commands.
- **Modes** ✅ **Plan Mode** = an **approval mode** (`Default → Auto-Edit → Plan → YOLO`), `--approval-mode=plan`, Shift+Tab cycling, `/plan [goal]`, and an **`enter_plan_mode` tool** (unavailable in YOLO). Plan = read-only research/design, wait for confirmation. Subagents add a second axis: `codebase_investigator` etc. with own system prompt, **restricted tool set**, **independent context loop** (explicitly for token savings), model/turn overrides via `agents.overrides`.
- **PTC** ❌ (the shell tool runs commands, but that's bash, not tool orchestration)
- **Token efficiency** subagent context isolation, context compression, 1M context, policy-scoped tools, /stats usage
- **Subagents** ✅ exposed as tools, @-forceable. **Library** ⚠️ core is importable and there is an A2A server, but it is CLI-shaped first.
- **Fork difficulty** **MEDIUM** — big TS monorepo, but the **policy engine + approval-mode condition is a nearly ideal substrate for mode-scoped tool allowlists**, and plan mode already exists. Docs: https://geminicli.com/docs/cli/plan-mode · https://geminicli.com/docs/reference/policy-engine

### 1.5 OpenAI Codex CLI — openai/codex
- **Repo** https://github.com/openai/codex · **Apache-2.0** · **Rust** (`codex-rs` workspace, ≈**1.95M Rust LOC** counted locally incl. generated/vendored crates) · **Activity** 126.8k★, pushed 2026-09-28
- **Architecture** Rust core + TUI + app + IDE; MCP ✅; `config.toml` with profiles; OS-enforced **sandbox modes** (`read-only` / `workspace-write` / `danger-full-access`) × **approval policies** (`on-request`, `on-failure`, `never`; `untrusted` retired); AGENTS.md; rules; skills. Not a documented embeddable SDK.
- **Modes** ⚠️ sandbox mode + approval policy + `[profiles.*]` + **custom agents** (subagent definitions with different model + instructions); `/agent` switches threads. No user-definable N-mode system with tool allowlists.
- **PTC** ❌. **Token efficiency** auto-compaction + `/compact`, context management, token/credit tracking, Fast mode; subagent context isolation. **Subagents** ✅ on by default.
- **Fork difficulty** **HIGH** — large opinionated Rust monorepo, thinner extension surface. Docs: https://learn.chatgpt.com/docs/agent-configuration/subagents.md · /agent-approvals-security.md

### 1.6 Block/AAIF Goose — aaif-goose/goose (ex block/goose)
- **Repo** https://github.com/block/goose · **Apache-2.0** · **Rust** · **≈300k Rust LOC**, 14 crates incl. `goose-sdk`, `goose-agent`, `goose-context-management`, `goose-mcp`, `goose-providers`, `goose-cli`, `goose-server`, `goose-acp`
- **Activity** 54.7k★, pushed 2026-09-28, now **AAIF / Linux Foundation**; docs goose-docs.ai
- **Architecture** client-server, **pluggable at every layer**; explicit **state machine** (`agents/state_machine.rs`) with discrete Operations: Compaction, ToolPairCompaction, MaxTurns, Recipe, Skill, StopHook, ToolApproval, ToolExecution, Retry, Steer… Extension Manager = MCP clients (70+); provider registry 15+; REST API + **ACP** (JSON-RPC); custom distributions.
- **Modes** ⚠️ **GooseMode** (approval/chat/auto-style; "chat mode" skips tool calls) + **Recipes** (YAML: `instructions`, `prompt`, `extensions`, `settings`, `parameters`, `sub_recipes`, `response` schema, `retry`) = the strongest shipped analogue of "mode = named agent config".
- **PTC** ❌. **Token efficiency** `context_mgmt`: `check_if_compaction_needed`, `compact_messages`, `DEFAULT_COMPACTION_THRESHOLD`, **tool-pair compaction**; turn limits; token budgets; sessions/memory.
- **Subagents** ✅ (subagents + subrecipes, documented trade-offs). **Library** ✅ `goose-sdk` crate + REST/ACP.
- **Fork difficulty** **MEDIUM** — beautiful architecture, but Rust and big; PTC is greenfield. Docs: https://mintlify.wiki/block/goose/concepts/architecture · https://goose-docs.ai/docs/guides/recipes/recipe-reference

### 1.7 Charm Crush — charmbracelet/crush ⚠️ NOT OSI
- **Repo** https://github.com/charmbracelet/crush · **License: FSL-1.1-MIT** (`LICENSE.md`) — *"Permitted Purpose is any purpose other than a **Competing Use**"*; converts to MIT 2 years after each release. **Source-available, not OSI-approved → fails your reusability bar today.**
- **Language/LOC** **Go**, ≈**167k LOC** in `internal/` · **Activity** 28.3k★, pushed 2026-09-28 (very active)
- **Architecture** single binary; `internal/agent` (coordinator, tools incl. agentic-fetch), `internal/config` (provider.go, mcp.go, models via Charm's `catwalk` catalog), `hooks`, `permission`, `skills`, `commands`, LSP-enhanced context. MCP http/stdio/sse. Multi-provider + OpenAI-compatible endpoints; mid-session model switch preserving context.
- **Modes** ❌ no plan/build modes. Only a permission model: per-tool prompts + `--yolo`/`isYolo` (`SkipPermissionRequests`). **PTC** ❌.
- **Token efficiency** LSP-derived context, session contexts. Compaction not confirmed. **Subagents** ⚠️ partial (`herdr`); no documented subagent API. **Library** ⚠️ CLI/TUI with a proto client/server.
- **Fork difficulty** MEDIUM-HIGH — and **moot: the license blocks permissive reuse.**

### 1.8 SWE-agent + mini-swe-agent — SWE-agent/SWE-agent
- **Repo** https://github.com/SWE-agent/SWE-agent · **MIT** · **Python** ≈ **11.5k LOC** (`sweagent/`) · 20.4k★, pushed 2026-09-21, but **README: development effort moved to `mini-swe-agent`**
- **Architecture** **single YAML config governs everything**; tool bundles as plugins (`tools/{windowed,filemap,search,review_on_submit_m,submit,web_browser,forget,image_tools,edit_anthropic}`), hooks, `history_processors.py` (context management), `reviewer.py` (second model review pass). No MCP.
- **Modes** ⚠️ config-selectable tool bundles + reviewer pass; not a runtime switcher. **PTC** ❌ (ACI JSON/command actions); `config/exotic/default_shell.yaml` and mini-swe-agent collapse to a single bash action.
- **Token efficiency** history processors, filemap/windowed tools, output truncation. **Subagents** ⚠️ reviewer model only. **Library** ✅ research library + CLI.
- **Fork difficulty** MEDIUM — small and hackable, but research-grade; you'd build modes, PTC, caching, multi-provider from scratch.
- **mini-swe-agent** (MIT, 8.0k★, ≈**5.4k Python LOC** in `src/` with a ~100-line core agent class, single bash tool) — extreme-minimal base; zero batteries included.

### 1.9 Aider — Aider-AI/aider ⚠️ stale
- **Repo** https://github.com/Aider-AI/aider · **Apache-2.0** · **Python** ≈ **20.4k LOC** (`aider/`) · 49.2k★ but **last push 2026-05-22 (~4 months)**
- **Architecture** monolithic pair-programming loop (`main.py`), tree-sitter **repo map**, edit formats. Provider abstraction via litellm. **No tool/plugin API, no MCP, no subagents.** Loop is not pluggable.
- **Modes** ⚠️ architect/editor split = `--architect` edit format + `--editor-model`/`--weak-model` (two-model role split), not a mode system.
- **PTC** ❌ (diff/whole/udiff edit formats). **Token efficiency** token-budgeted repo map, provider prompt caching, `/tokens`, cost display.
- **Fork difficulty** **MEDIUM-HIGH** — would require grafting a new agent loop on top.

### 1.10 Roo Code — RooCodeInc/Roo-Code ⚠️ SHUT DOWN → **Zoo Code**
- **Repo** https://github.com/RooCodeInc/Roo-Code · **Apache-2.0** · **TypeScript** (VS Code ext) · 24.3k★ but **extension shut down 2026-05-15**, last push 2026-05-15
- **Modes** ✅ **the canonical reference implementation.** Code / Architect / Ask / Debug + unlimited **custom modes** (`.roomodes` or global): each = `slug`, `name`, `roleDefinition` (system prompt), `whenToUse`, **`groups` = tool-group allowlist** (`read`/`edit`/`browser`/`command`/`mcp` with per-group file regex), `customInstructions`, optional model. A **`switch_mode` tool** lets the model switch modes itself (with user approval).
- **PTC** ❌. **Token efficiency** context condensing, checkpoints, sliding window, `.rooignore`.
- **Fork difficulty** MEDIUM (huge IDE-coupled extension) — **but the mode design is worth copying verbatim.**
- **Zoo Code** https://github.com/Zoo-Code-Org/Zoo-Code (Apache-2.0) = live community continuation, keeps modes.

### 1.11 Kilo Code — Kilo-Org/kilocode
- **Repo** https://github.com/Kilo-Org/kilocode · **MIT** (LICENSE: "Copyright (c) 2026 Kilo Code; Copyright (c) 2025 opencode") · **TypeScript**, VS Code + JetBrains + CLI + Cloud · 27.4k★, pushed 2026-09-27
- **Architecture** Roo/Cline lineage, extended; agents, MCP, 500+ models, **Auto Model** routing, session goals.
- **Modes** ✅ **"Agents"** (renamed from modes): **code (full tools), architect, ask, debug, orchestrator**; each with an explicit **Tool Access allowlist**; switch by dropdown / `/agents` / Ctrl+. / and a **`switch_mode` tool** (https://kilo.ai/docs/automate/tools/switch-mode). **Orchestrator Mode** (v4.19.1) delegates to sub-agents.
- **PTC** ❌. **Token efficiency** Auto Model cost/quality routing, context mentions.
- **Fork difficulty** MEDIUM — large monorepo, but modes + model-initiated switching already exist.

### 1.12 Plandex — plandex-ai/plandex ⚠️ stale
- **Repo** https://github.com/plandex-ai/plandex · **MIT** · **Go** ≈ **77k LOC** · 15.7k★ but **last push 2025-10-03**; cloud shut down, self-hosted only
- **Architecture** CLI + server + REPL; tree-sitter project maps; cumulative-diff review sandbox; context mgmt (2M tokens direct, 20M-token indexing).
- **Modes** ✅ `\chat` (converse, no changes) vs `\tell` (implement) + autonomy levels (none/basic/plus/semi/full). **Model packs** with **per-role models** (planner/architect/coder) and `--gemini-planner`/`--o3-planner`/`--r1-planner` → a shipped form of role-based model routing.
- **PTC** ❌. **Subagents** ❌. Stale → poor base.

### 1.13 Continue — continuedev/continue ⚠️ EOL
- **Repo** https://github.com/continuedev/continue · **Apache-2.0** · TypeScript · 36k★ · README: **"no longer actively maintained and is read-only"** (final 2.0.0). Config-driven (`config.yaml`: models, rules, prompts, context providers, MCP, @-commands); chat/edit/agent flows; `@continuedev/sdk` existed. **Not recommended as a base.**

### 1.14 2026-era newcomers worth knowing
| Project | Why it matters |
|---|---|
| **Strands Agents harness** — https://github.com/strands-agents/harness-sdk (Apache-2.0, Python+TS, 8.5k★, pushed 2026-09-28) | AWS-backed SDK + pre-assembled `create_harness()`; agent loop w/ **turn limits, token budgets, cancellation, stop reasons**, tools + structured output, **MCP**, multi-agent patterns, memory/sessions, model portability, guardrails, tracing, evals. Launch claim: *"frontier performance with **28% lower token cost**"*. Closest SDK-level competitor to Cline/OpenHands. |
| **`strands-code-agent`** — https://pypi.org/project/strands-code-agent/ | **Code generation AS the action interface.** `CodeAgent` = Strands Agent + persistent **Python REPL**; tools exposed as importable library functions; `SandboxedPythonInterpreter` (import allowlist) / ExecPythonInterpreter / AgentCorePythonInterpreter. Measured vs equivalent tool-calling agent: **+7% accuracy, −78% input tokens, −67% output tokens, 56% faster, −35% reasoning cycles** (Data Agent Benchmark). |
| **Qwen Code** — https://github.com/QwenLM/qwen-code (Apache-2.0, 28.2k★, active) | Gemini CLI fork w/ Auto-Memory, **Auto-Skills, SubAgents, Agent Teams**, MCP; OpenAI/Anthropic/Gemini/Qwen/local at runtime; IDE/desktop/web/chat/SDK surfaces. |
| **Zoo Code** — https://github.com/Zoo-Code-Org/Zoo-Code (Apache-2.0) | Roo Code's live successor; preserves the best-in-class custom-modes system. |
| **Forge / forgecode** — https://github.com/tailcallhq/forgecode (Apache-2.0, Rust, 7.6k★, active) | "Three modes" = invocation modes (TUI / one-shot CLI / ZSH plugin), *not* plan-build. Agents, skills, semantic search, MCP, 300+ models. |
| **FastMCP CodeMode** — https://gofastmcp.com/servers/transforms/code-mode.md (Apache-2.0) | MCP-server-side `CodeMode` transform: clients see only `search`/`get_schema`/`execute` meta-tools + sandboxed Python. Drop-in way to bolt PTC onto any MCP client. |
| **pydantic-ai-harness / pydantic-deepagents** | Tracking **PTC (Code Mode) API-level support**; "open-source self-hosted Claude Code" (pydantic-deep). |

---

## 2. Prior art / evidence for programmatic tool calling
- **Anthropic Programmatic Tool Calling** (GA) — https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling — tools opt in via `allowed_callers: ["code_execution_20260120"]`; requires code-execution tool version `code_execution_20260120`+. Reported: **+11% avg on BrowseComp/DeepSearchQA with 24% fewer input tokens**.
- **Cloudflare Code Mode** — https://developers.cloudflare.com/agents/model-context-protocol/codemode/ — two patterns: *single code tool* (one `code` tool, typed methods) and *search-and-execute* (`search`+`execute`, OpenAPI stays in sandbox). "An entire API in ~1,000 tokens."
- **arXiv 2608.06370, "The Bitter Lesson of Tool Calling"** (Aug 2026) — https://arxiv.org/abs/2608.06370 — PTC matches/exceeds native JSON tool calling in **11/14 models on BFCL v4** (GPT-5.6 family **+10.6%**); robust under context rot. PTC is a safe bet for frontier models.
- Anthropic "Code execution with MCP"; TanStack "Lazy Tool Discovery"; arXiv 2604.21816 "Tool Attention … Lazy Schema Loading".

---

## 3. SHORTLIST — top 3 fork bases

### 🥇 1. OpenCode (anomalyco/opencode) — MIT, TS, 210k★
**Why:** it is the only candidate that **already ships ~2/3 of your target**. Mode system ✅ (Build/Plan primaries + General/Explore/Scout subagents, each with prompt + model + permission allowlist, Tab-switchable, config-declared). Research mode ✅ (Explore = read-only codebase, Scout = external docs/dependency research). **Code-execution tool loop ✅ in tree** (`@opencode-ai/codemode`: confined interpreter, `$codemode.search` lazy catalog, token-budgeted catalog, maxToolCalls/timeout/maxOutputBytes). Token plumbing ✅ compaction + overflow + summary agents, truncation, subagent isolation, per-model prompts. Extension surface ✅ plugin hooks + typed SDK + headless server.
**Remaining work:** lift CodeMode from MCP-only to the full tool tree; un-gate `experimentalCodeMode`; add a router/decision agent that picks mode per turn; verify/port prompt-cache control.
**Risk:** very fast-moving upstream (daily pushes) → expect rebase churn; Effect-based codebase has a learning curve.

### 🥈 2. Cline — Apache-2.0, TS, 69k★
**Why:** the cleanest **embeddable SDK** with a documented extension surface: stateless loop in `@cline/agents`, `createTool` (zod/JSON Schema), plugin hooks/rules/commands/events, provider gateway, MCP, checkpoints. **Plan/Act modes already exist.** Subagents already implement **context isolation + token budgets + per-subagent cost rollup** — i.e. the exact token-efficiency primitives you want. Multi-agent teams and model-orchestration samples give you a routing starting point.
**Remaining work:** add an `execute` code tool (PTC); generalize Plan/Act into N user-defined modes; add compaction/lazy tool schema if not present.
**Risk:** large monorepo; "experimental" subagents API may churn.

### 🥉 3. OpenHands Software Agent SDK — MIT, Python, active
**Why:** the purest **library** base — four clean packages (sdk / tools / workspace / agent_server), stateless event-driven loop, documented **condenser** for context compression, pluggable tools, ACP delegation, and `ask_oracle` (stateless second-opinion model) which is a ready-made routing primitive. Easiest to fork-and-reshape if you want to own the loop.
**Remaining work:** build the mode system (not present) and the code-execution loop; Python perf/embedding tradeoffs if your harness is TS-native.
**Risk:** split-app/SDK governance; CodeAct-vs-tool-calling status in V1 needs verification.

**Honorable mentions:** **Gemini CLI** (its policy engine + approval-mode conditions are the cleanest substrate for mode-scoped tool allowlists, and Plan mode is real — but it's a 600k-LOC TS monorepo and has no PTC); **Goose** (best-in-class pluggable state machine, recipes-as-modes, tool-pair compaction — but Rust and PTC is greenfield); **Zoo Code** (copy its mode schema verbatim).

**Avoid as a base:** Charm **Crush** (FSL-1.1, *not* OSI — competing-use restriction), **Continue** (EOL/read-only), **Roo Code** (shut down — use Zoo Code), **Plandex** (≈1 yr stale), **Aider** (4 months stale, no agent loop/plugin API/MCP/subagents), **SWE-agent** (superseded by mini-swe-agent; research-grade).

---

## 4. "Does exactly standard + PTC + research mode with a routing model" — **nothing ships this today**
Closest partial matches:
1. **OpenCode** with `experimentalCodeMode` — Build/Plan modes + Explore/Scout research subagents + confined `execute` code tool. Missing: CodeMode is MCP-scoped + experimental, and there is **no automatic mode router**.
2. **strands-code-agent** — **PTC as the default interface** with a persistent REPL, measured at −78% input tokens. Missing: no plan/research mode system, no mode router, and it targets domain/data tasks more than repo-wide coding.
3. **OpenHands `ask_oracle`** and **Plandex model packs (`--o3-planner`/`--r1-planner`)** and **Kilo Auto Model** and **Cline Model Orchestration** — each implements a *piece* of routing (strong-model-for-hard-decisions, cheap-model-for-bulk), but none auto-route between *standard tool-calling vs code mode vs research mode*.

**Conclusion:** the "routing/decision model that picks standard vs PTC vs research per turn for token efficiency" is genuinely unshipped whitespace. Fork **OpenCode** and you are ~1 focused change away (extend CodeMode's tool tree + add a router agent); fork **Cline** if you want an SDK-first, well-documented extension surface and are willing to build the code loop.
