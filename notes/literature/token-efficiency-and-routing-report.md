# Token Efficiency & Decision/Routing Models for Coding Agents

Compiled 2026-09 from primary docs, papers, and vendor benchmark posts. Every quantitative claim carries the URL it came from; vendor-run benchmarks are labelled as such. `UNVERIFIED` marks claims I could not trace to a primary source.

---

## Part 1 — Programmatic Tool Calling / "code mode"

### 1.1 Anthropic Programmatic Tool Calling (PTC)

**Mechanism** ([platform.claude.com](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling)): Claude writes Python that calls your tools *as functions* inside the sandboxed code-execution container. When the script hits a tool function, execution pauses, the API returns a normal `tool_use` block, you return the result, and the script resumes — the result goes **into the script's memory, not into Claude's context**. Only the final `code_execution_tool_result` (what the script prints/returns) re-enters the model context.

**API shape:**
- Add `{"type": "code_execution_20260120", "name": "code_execution"}` to `tools`; requires `code_execution_20260120` or later (v20250825 = bash/files, v20260120 adds REPL state persistence).
- Tools opt in with `allowed_callers`: `["direct"]` (default), `["code_execution_20260120"]`, or both. Anthropic recommends *not* enabling both for the same tool ("clearer guidance").
- Tools exposed as **async Python functions taking one dict and returning a string**; parallel calls via `asyncio.gather`, top-level `await`, `json.loads(await tool({...}))` for structured results.
- Every tool_use block carries a `caller` field: `{"type":"direct"}` or `{"type":"code_execution_20260120","tool_id":"srvtoolu_..."}` matching the `server_tool_use` block.
- **Container lifecycle constraints:** new container per request unless reused; while a programmatic call is pending, the `container` id is *required* on the next request; idle containers reclaimed after ~5 min, no reuse after 30 days, pending tool call times out after ~4 min.
- **Billing quirk:** tool results from programmatic invocations do not count toward input/output tokens.
- `allowed_callers` is presentation/validation only — "not a hard API-level block" and "do not rely on `allowed_callers` as a security boundary".

**Reported savings (all Anthropic-run):**

| Workload | Result | Source |
|---|---|---|
| Internal 75-tool project-management agent benchmark | **−38% billed input tokens**, no change in task accuracy | [docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling) |
| Production API traffic, requests with 10–49 tool definitions | typical **20–40% token savings** | [docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling) |
| τ²-bench (airline/retail/telecom, 1–2 sequential calls per turn) | scores unchanged, **~8% more expensive** — sequential single-call workflows do not benefit | [docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling) |
| Complex research tasks | avg **43,588 → 27,297 tokens (−37%)**; internal knowledge retrieval 25.6% → 28.5%; GIA 46.5% → 51.2% | [engineering blog](https://www.anthropic.com/engineering/advanced-tool-use) |
| BrowseComp + DeepSearchQA (web search) | **+11% performance, −24% input tokens** | [docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling), [claude.com blog](https://claude.com/blog/improved-web-search-with-dynamic-filtering) |
| Budget-compliance example (20 people, 2,000+ expense line items) | 200KB of raw data → **1KB of results**; ~19 inference passes eliminated | [engineering blog](https://www.anthropic.com/engineering/advanced-tool-use) |

**When it doesn't pay:** simple single-tool invocations; tasks where the model *should* see every intermediate result; small-response lookups. Anthropic's own guidance: "measure billed input tokens with and without `allowed_callers` on a representative sample of traffic".

### 1.2 Anthropic "Code execution with MCP" — the 98.7% claim

([anthropic.com/engineering/code-execution-with-mcp](https://www.anthropic.com/engineering/code-execution-with-mcp))
- **Mechanism:** expose each MCP tool as a TypeScript module on a filesystem (`servers/google-drive/getDocument.ts` …). The agent **explores the filesystem** (list `./servers/`, read the one tool file it needs) and imports it; or searches with a `search_tools` tool that returns results at a chosen **detail level** (name only → name+description → full schema).
- **Claim:** for the Drive→Salesforce transcript workflow, tool-definition + intermediate-result context falls **150,000 → 2,000 tokens (−98.7%)**. The comparison basis is a full "load every definition + pass every result through the model" client, not an already-optimized one.
- Also claimed: intermediate results filtered in the runtime (10,000-row sheet → 5 logged rows); control flow (loops/retries) without model round-trips; PII tokenization so sensitive data never enters context; state persistence via files and reusable "skills" (`SKILL.md`).
- **Anthropic's own caveat:** "Running agent-generated code requires a secure execution environment with appropriate sandboxing, resource limits, and monitoring. These infrastructure requirements add operational overhead and security considerations that direct tool calls avoid."

### 1.3 Cloudflare "Code Mode"

**Server-side MCP server** ([blog.cloudflare.com/code-mode-mcp](https://blog.cloudflare.com/code-mode-mcp/), [docs](https://developers.cloudflare.com/agents/model-context-protocol/guides/build-codemode-mcp-server/)):
- Two tools only — `search(code)` (JS arrow fn over the Cloudflare OpenAPI spec with `$ref`s pre-resolved) and `execute(code)` (JS against an authenticated `cloudflare.request()` client).
- Numbers: Cloudflare API has **>2,500 endpoints**; an equivalent native-MCP server would consume **1.17M tokens** (tiktoken-measured); Code Mode's fixed footprint is **~1,000 tokens → 99.9% reduction in input tokens**. Example DDoS-protection workflow took **4 tool calls** end-to-end.
- Isolation: code runs in a **Dynamic Worker isolate** — "no file system, no environment variables to leak through prompt injection, and external fetches disabled by default"; outbound fetch handlers are opt-in.
- Cloudflare's own comparison of context-reduction approaches: client-side Code Mode (needs the agent to ship sandbox access; shipped as Goose Code Mode and Anthropic PTC), CLIs (**needs a shell — "much broader attack surface than a sandboxed isolate"**), and dynamic tool search (**"requires a search function that must be maintained and evaluated, and each matched tool still uses tokens"**).
- Original design post ([blog.cloudflare.com/code-mode](https://blog.cloudflare.com/code-mode/)): V8 isolates instead of containers, "mere milliseconds to start a fresh isolate… cheap enough to create a new one for every single code snippet", the sandbox is "totally isolated from the Internet", and MCP **bindings** hold credentials server-side ("hide API keys").
- Trade-off noted by Cloudflare: Code Mode needs a sandbox provider; the `@cloudflare/codemode` server-side path is marked **experimental**.

### 1.4 Open-source / framework implementations

| Implementation | Mechanism | Source |
|---|---|---|
| **CodeAct** (ICML 2024) — the origin paper | Unify agent actions as executable Python; across **17 LLMs on API-Bank + a new benchmark, up to 20% higher success rate** than JSON/text actions | [arXiv:2402.01030](https://arxiv.org/abs/2402.01030) |
| **smolagents CodeAgent** (HuggingFace) | Agent writes Python that calls tools; sandboxing via E2B/Modal/Docker/Blaxel | [PyPI](https://pypi.org/project/smolagents/), [HF blog](https://huggingface.co/blog/structured-codeagent) |
| **smolagents structured CodeAgent** | Forcing `{thoughts, code}` JSON adds **2–7 pp** over plain CodeAgent on capable models; across **15,724 traces, 2.4% had first-call parsing errors**, and those traces succeed **42.3% vs 51.3%** (a **21.3% relative** drop) with steps **3.18 → 4.63**; small models hit a **"structure tax"** (Mistral-7B emits syntactically broken code while also JSON-formatting) | [HF blog](https://huggingface.co/blog/structured-codeagent) |
| **OpenHands CodeActAgent** | Production code-as-action agent (the CodeAct authors' own system); tool calls emitted as code | [CodeAct paper](https://arxiv.org/abs/2402.01030) |
| **Goose Code Mode** | Built-in extension exposing three meta-tools (`list_functions`, `get_function_details`, `execute_typescript`); tools discovered on demand, calls batched, intermediate results chained; executes via `pctx` (Deno runtime) | [goose-docs.ai](https://goose-docs.ai/docs/guides/managing-tools/code-mode/) |
| **mcp_codemode** (modus-data) | 6-step pipeline with **three specialized LLMs**: strategy model (pseudocode plan) → tiny model (filter thousands of tools) → main model (TypeScript) → typecheck → E2B sandbox | [GitHub](https://github.com/modus-data/mcp_codemode) |
| **Cloudflare Code Mode SDK** | `codeMcpServer()` wraps an existing MCP server so clients see one `code` tool containing generated types | [docs](https://developers.cloudflare.com/agents/model-context-protocol/guides/build-codemode-mcp-server/) |
| **CaveAgent** (2026) | "LLM-as-runtime-operator": persistent Python runtime as the state locus (DataFrames, DB connections persist across turns) + semantic orchestrator stream; claims to beat JSON- and code-based agents at data scales that overflow their contexts | [arXiv:2601.01569](https://arxiv.org/abs/2601.01569) |

### 1.5 Trade-offs and failure modes

1. **Sandboxing is the entry cost.** Anthropic: secure execution env, resource limits, monitoring ([link](https://www.anthropic.com/engineering/code-execution-with-mcp)). Cloudflare's answer is V8 isolates with no FS/env/net ([link](https://blog.cloudflare.com/code-mode-mcp/)); Claude's hosted container is capped by 5-min idle reclaim / 4-min pending-call timeout / 30-day max reuse ([docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling)).
2. **Model aptitude.** CodeAct gains scale with model strength; the HF study finds a capability threshold where structured+code generation hurts small models ("structure tax"), and parse failures cascade ([HF](https://huggingface.co/blog/structured-codeagent)). Haiku 4.5 accepts the code-execution tool but **does not support PTC at all** ([docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling)).
3. **Workload shape decides.** PTC *costs ~8% more* on sequential single-call τ²-bench traffic and saves 20–40% when 10–49 tools are in play ([docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling)).
4. **Debuggability/observability.** Intermediate state lives in a container, not the transcript; you need `caller.tool_id` correlation, container IDs, and stdout discipline. The error surface also moves: a broken script is a code bug, not a retryable tool error (the code-mode server turns upstream MCP errors into catchable exceptions — [Cloudflare docs](https://developers.cloudflare.com/agents/model-context-protocol/guides/build-codemode-mcp-server/)).
5. **Prompt-injection surface.** Agents now execute model-written code against real APIs; the mitigation is capability isolation (bindings, no ambient credentials, no outbound net) rather than model trust ([Cloudflare](https://blog.cloudflare.com/code-mode/) — "the binding itself provides an already-authorized client interface… the agent supervisor holds the access tokens").
6. **When JSON tool calls are still better:** <10 tools, small/compact schemas, every tool used each session, single sequential calls, or when the model must reason over each intermediate result ([Anthropic](https://www.anthropic.com/engineering/advanced-tool-use), [docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling)).

---

## Part 2 — Token cost levers

### 2.1 Prompt caching

| Provider | Discount / mechanics | Minimums & TTL | Source |
|---|---|---|---|
| **Anthropic** | cache **write = 1.25×** base (5-min) or **2×** (1-hour); **cache read = 0.1×** base — **0.025×** on Fable 5.1/Mythos 5.1, **0.05×** on Opus 5.5. Max **4 breakpoints**; automatic top-level `cache_control` consumes one slot | min cacheable: **512** (Fable/Mythos/Opus 5.x), **1,024** (Opus 4.8, Sonnet 4.5/4.6/5), **2,048** (Opus 4.7), **4,096** (Opus 4.5/4.6, Haiku 4.5). Default TTL **5 min**, refreshed free on each hit, measured **from request start** (a 4-min generation leaves ~1 min) | [docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) |
| **Anthropic invalidation** | Cache follows hierarchy **`tools` → `system` → `messages`**; a change at a level invalidates that level and everything after. Thinking blocks can't take `cache_control` but are cached inside assistant turns; **20-block lookback window** | | [docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) |
| **OpenAI** | cached input **"discounted up to 90%"**; cache-write is not additive | min prefix **1,024 visible tokens** (GPT-5.6+; earlier models vary); `prompt_cache_options.ttl` only supports `30m`; `prompt_cache_retention`: `in_memory` ≈ **5–10 min inactive, up to 1 h**, `24h` ≈ 30 min typical, up to 24 h; cached state is **machine-local** — above **15 req/min** overflow routing can lose hits; use a stable `prompt_cache_key` | [docs](https://developers.openai.com/api/docs/guides/prompt-caching.md) |
| **Gemini** | implicit caching on by default for 2.5+ ("we automatically pass on cost savings"); explicit caching adds a **storage fee** | min input tokens **2,048** (2.5 Flash/Pro) / **4,096** (3.x Flash, 3.1 Pro); storage **$0.50 / 1M tokens/hour through 2026-12-31, $1.00 after** | [caching docs](https://ai.google.dev/gemini-api/docs/caching), [pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| **DeepSeek** | cache hit vs miss (off-peak, per 1M in): flash **$0.003 vs $0.15 (~2%)**, pro **$0.022 vs $0.66 (~3%)** | | [pricing](https://api-docs.deepseek.com/quick_start/pricing) |

**Agent-loop economics (measured):**
- Manus: average **input:output ratio ≈ 100:1** in an agent loop; cached input **$0.30/MTok vs $3/MTok** uncached on Sonnet (**10×**); "KV-cache hit rate is the single most important metric for a production-stage agent" ([manus.im](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)).
- Cache-stability rules from the same post: stable prefix (a **single-token difference** invalidates from that token on; a second-precision timestamp in the system prompt kills hit rate); **append-only** context; deterministic JSON key ordering; explicit breakpoints where the provider needs them.
- **Cache-invalidation pitfalls in agent loops:**
  - Tool-set churn: Manus says tool definitions live near the front, so **"avoid dynamically adding or removing tools mid-iteration"** — any change invalidates the cache for all later actions ([link](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)). Anthropic's counter-argument: deferred tools never enter the prompt, so Tool Search "doesn't break prompt caching" ([link](https://www.anthropic.com/engineering/advanced-tool-use)).
  - Compaction fights caching: OpenAI docs state summarization/compaction "can change the prefix and reset cache reuse" ([link](https://developers.openai.com/api/docs/guides/prompt-caching.md)); Anthropic's tool-result clearing "**invalidates cached prompt prefixes when content is cleared**" — use `clear_at_least` so each invalidation buys enough tokens ([context editing docs](https://platform.claude.com/docs/en/build-with-claude/context-editing)).
  - **Routing destroys cache hits.** In LiteLLM's Terminal-Bench run: Opus-only arm **89% cache hit / 4% switch rate** vs router arms **78–83% cache hit / 40–58% switch rate** ([LiteLLM](https://docs.litellm.ai/blog/auto-router-terminal-bench-benchmark)).

### 2.2 Tool-schema bloat and deferred loading

- A five-server MCP setup — GitHub 35 tools (~26K tokens), Slack 11 (~21K), Sentry 5 (~3K), Grafana 5 (~3K), Splunk 2 (~2K) — is **58 tools ≈ 55K tokens before the conversation starts**; adding Jira (~17K alone) approaches **100K+**; "at Anthropic, we've seen tool definitions consume **134K tokens** before optimization" ([Anthropic](https://www.anthropic.com/engineering/advanced-tool-use)).
- Tool-search approach: **~500 tokens** up front + **3–5 tools (~3K)** on demand = **~8.7K** vs **~77K** traditional, **preserving 95% of the context window** and cutting definition tokens **~85%** ("191,300 tokens of context preserved vs 122,800"). Accuracy on MCP evals: **Opus 4 49% → 74%**, **Opus 4.5 79.5% → 88.1%** ([Anthropic](https://www.anthropic.com/engineering/advanced-tool-use); [docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)).
- Selection accuracy degrades past **30–50 available tools** ([docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)).
- API shape: `tool_search_tool_regex_20251119` / `tool_search_tool_bm25_20251119` + `defer_loading: true` per tool (or `{"type":"mcp_toolset","default_config":{"defer_loading":true}}` per server); the API expands `tool_reference` blocks into full definitions, **up to 5 by default** ([docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)).
- **Claude Code**: MCP tool *names* (~120 tokens) are listed while full schemas stay deferred and load via tool search; `ENABLE_TOOL_SEARCH=auto` loads schemas up front only if they fit **within 10% of the context window** ([context-window docs](https://code.claude.com/docs/en/context-window.md)).
- Tool Use Examples trade tokens for accuracy: **72% → 90%** on complex parameter handling, at extra definition tokens ([Anthropic](https://www.anthropic.com/engineering/advanced-tool-use)).

### 2.3 Compaction, isolation, truncation, caps

- **Compaction:** summarize a near-limit conversation and restart with the summary; in Claude Code the agent continues with the compressed context **plus the five most recently accessed files**; Anthropic advises tuning for recall first, then precision, and calls tool-result clearing the "safest lightest touch" form ([effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)).
- **Server-side context editing:** `clear_tool_uses_20250919` clears oldest tool results past a threshold (optionally `clear_tool_inputs`), and `clear_thinking_20251015` manages thinking blocks — **keeping** thinking preserves the cache, **clearing** invalidates it at that point ([docs](https://platform.claude.com/docs/en/build-with-claude/context-editing)).
- **Output truncation (Claude Code, concrete):** Bash output streaming to a working file, killed past **5 GB**; valid results inlined up to **~30,000 characters** then replaced by a file path + **2,000-char preview**; failure output inlined up to **~10,000 chars**; `bashOutputMaxChars` tunable to **128,000** ([tools reference](https://code.claude.com/docs/en/tools-reference.md)).
- **File/tool caps:** Read returns a **`PARTIAL view`** notice with `offset`/`limit` guidance when a whole-file read exceeds the token limit ([tools reference](https://code.claude.com/docs/en/tools-reference.md)); Glob caps at **100 files** with a truncation flag; Grep defaults to `files_with_matches` (paths only) and supports `head_limit`/`offset` ([tools reference](https://code.claude.com/docs/en/tools-reference.md)).
- **Subagent isolation:** Claude Code exposes subagents as a context-isolation primitive (own tool subset, `maxTurns` cap with partial-output marking and resumability) ([tools reference](https://code.claude.com/docs/en/tools-reference.md)); Manus-style guidance and Claude Code's own tips recommend subagents for research-heavy work because "file reads dominate context usage" ([context-window docs](https://code.claude.com/docs/en/context-window.md)). Public *quantified* subagent-savings numbers are scarce — treat this as an under-measured lever.

### 2.4 Prompt/context engineering for cache stability

Consolidated rule set (each rule is directly sourced above): put stable content first and volatile content last (OpenAI: "place timestamps/user-specific content at the end"); keep the tools array + system prompt byte-stable; append rather than rewrite history; make serialization deterministic; batch cache-invalidating operations (compaction/tool clearing) so one write covers many turns; separate cache accounting per tenant with `prompt_cache_key`; and treat cross-tier routing as a cache decision, not just a price decision.

---

## Part 3 — Decision / routing models to cut cost

### 3.1 Router literature

| Method | Reported effect | Source |
|---|---|---|
| **RouteLLM** (LMSYS) — SW-ranking, matrix factorization, BERT classifier, causal-LLM classifier, trained on Chatbot Arena preferences | **−85% cost MT-Bench, −45% MMLU, −35% GSM8K** vs GPT-4-only **at 95% of GPT-4 quality**; MF router reaches 95% of GPT-4 with **26% GPT-4 calls (≈48% cheaper** than random baseline), **14% of calls / 75% cheaper** after LLM-judge augmentation; paper claims **>2× cost reduction** | [blog](https://www.lmsys.org/blog/2024-07-01-routellm/), [arXiv:2406.18665](https://arxiv.org/abs/2406.18665) |
| RouteLLM threshold semantics | `alpha ∈ [0,1]`: route weak if `P(win_strong|q) < alpha`; metrics CPT(x%) and APGR | [paper HTML](https://ar5iv.labs.arxiv.org/html/2406.18665) |
| **FrugalGPT** (cascade) | **up to 98% cost reduction** at GPT-4-matching quality (best case on HEADLINES; +4% accuracy at equal cost elsewhere); requires a learned correctness scorer `g(q,a)` and thresholds per API | [arXiv:2305.05176](https://arxiv.org/abs/2305.05176) |
| **Hybrid LLM** | **up to 40% fewer large-model calls, no quality drop**; tunable at test time | [arXiv:2404.14618](https://arxiv.org/abs/2404.14618) |
| **RouterBench** | public benchmark/dataset of **405k+ inference outcomes** | [arXiv:2403.12031](https://arxiv.org/abs/2403.12031) |
| **GraphRouter** | graph over query/task/LLM nodes; **≥12.3%** router improvement, **≥9.5%** effect boost, generalizes to unseen LLMs without retraining | [arXiv:2410.03834](https://arxiv.org/abs/2410.03834) |
| **Cascade routing** (unified theory) | proves an optimal cascading strategy; **quality estimators are the critical factor** | [arXiv:2410.10347](https://arxiv.org/abs/2410.10347) |
| **Arch-Router** | 1.5B model maps queries to domain–action preferences; new models added with no retraining (no numeric margin in abstract) | [arXiv:2506.16655](https://arxiv.org/abs/2506.16655) |
| **AgentRouter** | heterogeneous GNN over query/entity/agent graph (no numbers in abstract) | [arXiv:2510.05445](https://arxiv.org/abs/2510.05445) |
| **LLM-Blender** | PairRanker + GenFuser ensemble; MixInstruct dataset | [arXiv:2306.02561](https://arxiv.org/abs/2306.02561) |

### 3.2 Products and vendor benchmarks (vendor-run; treat as marketing-grade evidence)

| System | Numbers | Source |
|---|---|---|
| **LiteLLM Auto Router — Terminal-Bench 2.0 (21 tasks)** | gpt-5.4-mini classifier, **single-message context**: **16/21 solved (= Opus-5) for $14.34 vs $19.74 → 27% lower cost**; classifier calls cost only **$0.05–$0.34** per arm; heuristic-only router: **87% of Opus quality at 56% of cost**; adding last-3-user-messages: **+14% relative quality, +44% cost**; adding assistant replies: **−7% relative quality, +34% cost**; median wall clock 6.8 → 8.3 min with more context | [blog](https://docs.litellm.ai/blog/auto-router-terminal-bench-benchmark) |
| **LiteLLM — SWE-bench Verified (25 tasks)** | capability router **23/25 (92%) for $11.15 vs Opus-5 23/25 for $20.27 → 45% lower cost**; Sonnet-5 22/25 for $13.19; 98.4% of solver calls went to Sonnet-5, 1.6% to Opus-5 | [blog](https://docs.litellm.ai/blog/auto-router-capability-benchmark) |
| **LiteLLM — subtask/phase routing (SWE-bench subset)** | route by agent phase (tool name): **9/9 resolved, $1.51 vs $2.82 fixed-Opus = 46% cheaper**; 73% of turns on deepseek-v4-flash cost **$0.14 total**; only 14% of turns hit Opus | [blog](https://docs.litellm.ai/blog/subtask-type-routing) |
| **LiteLLM — Claude Code replay** | **40.4% cheaper at 97.1% of frontier quality** (220 prompts, 6 benchmarks); **74.5% cheaper at 87.3% quality** on RouterArena's 8,399 queries; ~65% cheaper on simulated chat/dev traffic; per-dataset: GSM8K **81% savings**, HumanEval 65%, MMLU-Pro 64%, MATH-500 57%, MBPP 56%, **SWE-bench Lite only 21%** | [blog](https://docs.litellm.ai/blog/auto-router-cost-quality-benchmark) |
| **LiteLLM — production deployment** | 450+ users, **272,876 requests, $12,249 saved on $23,985 (51.1%)**, 95% of requests never needed the flagship tier; savings rate climbed 42.9% → 60.7% as tier maps were tuned | [blog](https://docs.litellm.ai/blog/auto-router-production-savings) |
| **LiteLLM — classifier economics** | per-hop compression cuts **classifier cost another 32%** with no routing-accuracy change | [blog](https://docs.litellm.ai/blog/auto-router-per-hop-compression) |
| **LiteLLM Auto Router mechanisms** | keyword rules run before the scorer; embedding semantic matching (voyage-3-5, threshold 0.5, max-aggregation); LLM classifier falls back to heuristic on timeout/empty/schema mismatch | [docs](https://docs.litellm.ai/docs/auto_router/), [v2 post](https://docs.litellm.ai/blog/autorouter-v2) |
| **Not Diamond** | claims frontier quality at **20–80% cost reduction** on coding tasks; argues **single-turn routing invalidates the KV cache each turn** and can "cost more money than any individual model at lower performance" | [blog](https://www.notdiamond.ai/blog/interactive-benchmarks-a-new-methodology-for-evaluating-model-routing) |
| **OpenRouter `auto`** | lightweight classifier assigns one of **~30 task types**; candidates ranked by **community spend share over a trailing 7-day window**; `cost_tier` low/medium/high/xhigh/max | [docs](https://openrouter.ai/docs/guides/routing/routers/auto-router.md) |
| **Martian** | no primary benchmark located — `UNVERIFIED` | — |

### 3.3 Small model as orchestrator (classify → route → summarize → escalate)

- **Cost of the decision is small; cost of a wrong decision is large.** In LiteLLM's agent run, classifier spend was **$0.05–$0.34** against **$4–$20** of model spend per arm ([link](https://docs.litellm.ai/blog/auto-router-terminal-bench-benchmark)).
- **Accuracy ceiling of cheap classifiers:** a pre-registered study of SLM front-door routing found **Qwen-2.5-3B best exact-match 0.783** and DeepSeek-V3 **0.830 but failing a 2,000 ms P95 gate (2,295 ms)**; **no model met the ≥0.85 accuracy / ≤2,000 ms P95 viability bar**, leaving a **6–8 pp residual gap** ([arXiv:2604.02367](https://arxiv.org/abs/2604.02367)).
- **Small-model tool calling is weaker than routing:** 1–3B SLMs reach **up to 65.74% overall / 55.62% multi-turn** on BFCL even with hybrid SFT+PEFT+RL+DPO ([arXiv:2511.22138](https://arxiv.org/abs/2511.22138)).
- **What to feed the classifier matters more than which classifier:** 1 user message beat 3 user messages and beat 6 messages including assistant replies; assistant/tool output *reads* as complexity without adding task intent ([LiteLLM](https://docs.litellm.ai/blog/auto-router-terminal-bench-benchmark)).
- **Phase/intent signal is cheaper than difficulty estimation:** routing on "what tool is the agent about to call" is deterministic, free, and changes many times per task; "how hard is this prompt" is almost always answered "hard" in a coding loop and costs money every turn ([LiteLLM subtask post](https://docs.litellm.ai/blog/subtask-type-routing)).
- **Cascade/escalation:** FrugalGPT-style cascades deliver the largest theoretical savings (**up to 98%**) but require a trained correctness estimator; the theory work identifies estimator quality as the binding constraint ([FrugalGPT](https://arxiv.org/abs/2305.05176), [cascade routing](https://arxiv.org/abs/2410.10347)).

### 3.4 Speculative / parallel patterns

| Pattern | Cost/latency dynamics | Source |
|---|---|---|
| **Speculative actions** (predict next action, execute in parallel, commit on match) | **up to 55% next-action prediction accuracy → up to 20% latency reduction**; lossless (only committed actions count); formalises speculative breadth vs time saved | [arXiv:2510.04371](https://arxiv.org/abs/2510.04371) |
| **Speculative tool calls** (keep predicted call sequences resident in the engine) | throughput gains of "several hundred tokens/sec"; proposes a tool-cache endpoint | [arXiv:2512.15834](https://arxiv.org/abs/2512.15834) |
| **Best-of-N / parallel sampling** | cost scales **N× generation cost**; coverage saturates — "best-of-infinity" needs unbounded budget; adaptive N via answer agreement | [Stanford](https://scalingintelligence.stanford.edu/pubs/large_language_monkeys/), [arXiv:2509.21091](https://arxiv.org/abs/2509.21091) |
| **Speculative decoding** (adjacent, not routing) | production vLLM study: target-model verification dominates; measured speedups fall far below theoretical bounds | [arXiv:2601.11580](https://arxiv.org/abs/2601.11580) |

### 3.5 When a decision model pays for itself

**It pays when:**
1. The **tier gap is large** and per-request token volume is high (LiteLLM production: 95% of 272,876 requests never needed the flagship → 51.1% saved) ([link](https://docs.litellm.ai/blog/auto-router-production-savings)).
2. Decisions are **cheap and local** — current user message only, or deterministic tool-name/phase signals ([LiteLLM](https://docs.litellm.ai/blog/auto-router-terminal-bench-benchmark), [subtask](https://docs.litellm.ai/blog/subtask-type-routing)).
3. The **cache penalty is smaller than the tier saving** — the single biggest hidden tax: router arms in LiteLLM's agent benchmark ran at **78–83% cache hit vs 89–93% for fixed-model arms** ([link](https://docs.litellm.ai/blog/auto-router-terminal-bench-benchmark)). Not Diamond's counter-position is that turn-level switching can invalidate KV cache more than it saves ([link](https://www.notdiamond.ai/blog/interactive-benchmarks-a-new-methodology-for-evaluating-model-routing)).
4. The classifier is **free or near-free** relative to spend, or the policy is a heuristic (87% of Opus quality at 56% of cost, no classifier call, lowest wall clock) ([link](https://docs.litellm.ai/blog/auto-router-terminal-bench-benchmark)).

**It does not pay when:**
1. **Repo-level/agentic coding**: savings collapse to **21% on SWE-bench Lite** vs 56–81% on short-answer benchmarks, because long contexts dominate spend and the router correctly refuses to downgrade them ([LiteLLM](https://docs.litellm.ai/blog/auto-router-cost-quality-benchmark)).
2. **Sequential single-tool-call loops**: PTC-style restructuring *added* ~8% cost; analogously, per-turn LLM classification adds cost with little downgrade opportunity ([Anthropic](https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling)).
3. **Distribution shift**: RouteLLM routers were **near-random on MMLU** when trained only on Chatbot-Arena preferences; ~1,500 in-domain labels (<2% of data) were needed to recover ([LMSYS](https://www.lmsys.org/blog/2024-07-01-routellm/)).
4. **Router accuracy plateaus**: a survey of **21 routing methods across 5 benchmarks** finds them converging far below the oracle router — a "predictability bottleneck" where routers learn averaged model trends rather than query-specific signal ([arXiv:2606.07587](https://arxiv.org/abs/2606.07587)). A 67-model study shows single-model-selection policies are capped by the all-models-wrong rate: **β = 0.052 (math), 0.079 (execution-graded code), 0.127 (GPQA-Diamond free-response)**, and pairwise error correlation can't predict it ([arXiv:2606.27288](https://arxiv.org/abs/2606.27288)).
5. **Task type explains most of the variance**: in a 14-model × 294-question matrix, only **29/294** questions were improvable by routing; assigning one model per *task type* fixed **21 of 29** ([arXiv:2608.23023](https://arxiv.org/abs/2608.23023)).

**Recommended shape for a coding agent (synthesis of the above):** don't route per turn on judged difficulty; use (a) a **static phase map** (explore → cheap, implement → frontier) keyed off tool names, (b) a **heuristic complexity scorer** for chat-shaped traffic, (c) **escalate on stalls** rather than predicting difficulty, and (d) reserve prompt caching for a stable prefix so tier switches don't repeatedly re-write it. Verify on your own traffic with per-response cost headers — every LiteLLM study does exactly this ([docs](https://docs.litellm.ai/docs/auto_router/)).


---

## Addendum A — Anthropic's measured cost/intelligence levers (published 2026)

Source for every number in this section: [platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence](https://platform.claude.com/docs/en/about-claude/models/optimizing-for-cost-and-intelligence) (Anthropic-internal measurements, described as directional).

**Caching is the dominant lever.**
- Prompt caching cut agent-loop cost **2.7×–5.3×** on the guide's benchmarks; a small triage agent's bill fell **83%** (**88%** with input trimming).
- DeepResearch Bench II, priced per task: Fable 5.1 **$37.94 → $7.12**; Sonnet 5 **$3.20 → $1.20** with caching.
- Real traffic: agent loops read a **median 84%** of input from cache; the **top 10% of harnesses read ≥94%**; below **~80%** something is breaking the cache. Deep in a task a well-built loop pays full price on **under 1%** of input.
- Cache-break cost is brutal: a **25-token status line at the front of the system prompt** raised a triage run from **$0.59 to $4.24** (worse than caching off). On a 100,000-token prefix, one broken turn costs **$1.25 instead of $0.03** (50×) on Fable 5.1, **$0.50 vs $0.02** (25×) on Opus 5.5, **12.5×** on other current models.
- TTL decision rules: use the **1-hour cache** when more than ~1 turn in 20 follows a 5-min–1-hour pause; **stay on 5 min** when turns arrive seconds apart (15% cheaper on Sonnet 5, 15–18% on Opus 5.5); if ≥60% of long pauses exceed an hour, the 1-hour setting loses. Keep-alive requests (`max_tokens: 0`, re-sent within 4 minutes) beat the 1-hour cache by **~8%** on Sonnet 5 at 1-in-20 pauses and by **13–20%** on Fable 5.1 when pauses run for minutes.
- **Compaction timing matters:** changes made on the compaction request re-process the whole context at write price — the summarization pass cost **$0.21** there vs **$0.04** one request later. Session cost: **$0.81** (no changes) / **$0.95** (mid-session changes) / **$0.92** (changes on the compaction request) / **$0.75** (changes after compaction).

**Tool definitions and context hygiene.**
- 502 tools, all loaded: run cost **$0.55 → $1.02** as the catalog grows; with tool search it stays **flat at ~$0.56** (**45% less at 502 tools**) at unchanged accuracy (15–18/20), with no wrong-tool calls. Deferring a public GitHub MCP server's toolset cut a run **20%** at the same accuracy.
- Keep data files out of the prompt: a 1,862-row CSV pasted inline is **~91,000 input tokens on every request**, Sonnet 5 answered **6/25** for **$5.01**; uploaded via Files API + code execution, **25/25** for **~$0.40** (about a twelfth).
- Context levers only pay on long sessions: on the 20-issue run **context editing cost 74% more**; on the 2.6×-longer run a hand-written "prune stale tool results at task boundaries" saved **39%** and compaction **32%**, while context editing changed nothing. The prune caches well (**89% cache reads** on the first request after a boundary).
- Batch API: **50% off every token including cached ones** (24-hour latency).
- **Prompt audit is a free win:** prompts written for Opus 4.8 cost **36% more per ticket** on Opus 5 at identical accuracy; after an audit, Opus 5 was **14% cheaper and more accurate (97% vs 92%)**. On Sonnet 4.6→5 the audit took **14%** off at the same accuracy. Deleting an over-obeyed "verify twice" instruction cut cost per ticket by **a third**.

**Model choice and effort (cost per solved task, not per token).**
- SWE-bench Pro subset: Fable 5.1 `low` **88.6% at $0.54/solved** vs Sonnet 5 default **77.4% at $0.84**; Opus 5.5 `medium` matched Fable 5.1's default (92.8% vs 92.3%) for **$0.22 vs $1.19**. Terminal-Bench 3: Opus 4.7/4.8/5 spend $8–15/task but solve 7%/15%/41% → **$183 → $63 → $28 per solved task**.
- Effort sweep: on four research benchmarks `low` gave up **1–3 points for a third to a half off** cost per task; `medium` matched default accuracy at **70–87%** of cost. On DeepWideSearch, dropping effort **beat** switching to an orchestrator with a Sonnet 5 worker, at **29% lower cost**.
- **Advisor strategy** (cheap executor + frontier advisor on demand): Opus 5.5 `high` + Fable 5.1 advisor = **90.1% at $2.92/attempt** — 1.7 points over Opus 5.5 alone for **~2.1× the money**, landing on Opus 5.5's own effort curve (xhigh alone: 91.1% at $4.11). **Failure mode — consult-rate collapse:** an executor that consults on most tasks at default effort can consult on almost none at low effort and then score *below* the executor alone (Chartography: 1 consultation in 300 tasks, 61.7 vs 62.7 solo, same cost).
- **Orchestrator strategy** (frontier lead + cheap workers): saved money in only **two** measured situations — (1) insurance against the cost tail on routine work (BrowseComp easy slice: ~half the average cost, **a third at p90, $12 vs $33**; the solo model's single most expensive run was **$84 and wrong**); (2) work larger than one context window (21.6M-token corpus: solo Fable 5 **$468–552/episode**; coordinator + 25 Sonnet 5 workers **47–55% less**, 10–12 points below peak, **2.3 h vs 15–20 h**). On the full, harder BrowseComp set the economics **reversed** — Fable 5 solo matched the coordinator at **22–30% lower cost**. "When the work is one dependent chain, or fits in a single context, the orchestrator pays for a plan, a handoff, and a merge that a single model gets for free."
- Elapsed-time instruction + clock (DRACO): same-model team finished in **33% less time at 54% lower cost per task**, scoring **1.5 points lower**.

**Report-level implication:** for coding agents the ordering of levers is (1) cache stability, (2) tool-definition deferral, (3) effort/model choice priced per solved task, (4) batch for offline work, and only then (5) routing/orchestration — which measurably pays only for cost-tail insurance or >1-context-window fan-out, and which must be priced net of the cache hits it destroys.

---

### Coverage notes
- Anthropic's `anthropic.com/engineering` posts render server-side and were fetched directly; `platform.claude.com` and `developers.openai.com` docs were fetched as markdown (`.md` suffix). Google's Gemini docs were fetched as HTML and stripped.
- Vendor benchmark numbers (LiteLLM, Not Diamond, OpenRouter) are self-reported on small samples (21–25 tasks for the agent runs; 220–8,399 queries for the router-quality runs). LiteLLM explicitly warns that a 25-task, single-attempt run "cannot establish equal quality".
- Gaps: no primary source for ZOOTER or Martian numbers; Arch-Router/AgentRouter abstracts carry no numeric deltas; subagent context-isolation savings lack public measurements.