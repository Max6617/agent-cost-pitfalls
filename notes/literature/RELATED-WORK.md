# RELATED WORK — annotated bibliography, draft section, and threat list

Prepared 2026-09-29 for the harness-cost paper (see `notes/records/FINDINGS.md` for the claim register, `METHODS.md` for the design). Claims referenced throughout: **C1** provider-dependent harness cost ranking; **C2** presented-tool count raises request count; **C3** cache does not explain the cost spread; **C4** measurement-gateway methodology.

**Verification protocol.** Every URL below was fetched and read on 2026-09-29 by the research swarm before inclusion. Every `Quotes:` line is verbatim text from the fetched page. Entries whose venue could not be confirmed on a primary page (OpenReview was bot-walled during preparation) are marked "reported" and corroborated only by citing papers. Vendor sources are labeled as such. Sources that failed verification are listed in the final section — including wrong arXiv IDs found in our own project notes.

---

## Part A — Annotated bibliography (70 entries)

### Theme 1 — Provider/model transferability of agent results

[1] Jimenez et al. "SWE-bench: Can Language Models Resolve Real-World GitHub Issues?" ICLR 2024. https://arxiv.org/abs/2310.06770
    Theme: transferability
    Claim: Introduces the 2,294-task issue-resolution benchmark from real GitHub PRs; the canonical substrate on which most coding-agent rankings (and this paper's setting) are built.
    Relevance: precedes C1 — establishes the benchmark whose per-model/per-scaffold rankings C1 shows to be pricing-dependent.
    Quotes: "We introduce SWE-bench, an evaluation framework consisting of 2,294 software engineering problems drawn from real GitHub issues and corresponding pull requests across 12 popular Python repositories."

[2] Chowdhury et al. (OpenAI). "Introducing SWE-bench Verified." Vendor blog (OpenAI), 2024 (updated Feb 2025). https://openai.com/index/introducing-swe-bench-verified/
    Theme: transferability
    Claim: Human-validated 500-sample subset; documents that the same model swings 2.7%→28.3% purely by changing scaffold — scaffold is a massive hidden variable in any agent ranking.
    Relevance: supports C1 (harness choice dominates measured performance, so single-configuration rankings mislead); precedes C4 (they ship an official Docker eval harness).
    Quotes: "GPT‑4's performance on SWE-bench Lite varies between 2.7% using an early RAG-based scaffold and 28.3% using CodeR."

[3] Merrill et al. "Terminal-Bench: Benchmarking Agents on Hard, Realistic Tasks in Command Line Interfaces." Preprint; reported ICLR 2026. https://arxiv.org/abs/2601.11868
    Theme: transferability
    Claim: 89-task terminal benchmark (v2.0) ranking frontier agent×model combos below 65%; releases dataset and evaluation harness as first-class artifacts; the scaffold used per model "was chosen to maximize performance."
    Relevance: precedes C1/C4 — treats the harness as part of the evaluated system; the substrate for [7] and [8].
    Quotes: "We show that frontier models and agents score less than 65% on the benchmark and conduct an error analysis to identify areas for model and agent improvement."

[4] Zan et al. "Multi-SWE-bench: A Multilingual Benchmark for Issue Resolving." Preprint, 2025. https://arxiv.org/abs/2504.02605
    Theme: transferability
    Claim: 1,632 tasks in 7 languages; evaluates models under three harnesses (Agentless, SWE-agent, OpenHands), treating harness as an explicit experimental axis.
    Relevance: precedes C1 — a harness×model factorial design exists, but with no cost or pricing dimension; the provider-pricing manipulation is our novel axis.
    Quotes: "We evaluate a series of state-of-the-art models using three representative methods (Agentless, SWE-agent, and OpenHands) and present a comprehensive analysis with key empirical insights."

[5] Singh et al. "The Leaderboard Illusion." Preprint, 2025 (reported NeurIPS 2025 D&B). https://arxiv.org/abs/2504.20879
    Theme: transferability
    Claim: Audit of ~2M Chatbot Arena battles: private variant testing, selective disclosure, and data-access asymmetries systematically distort rankings.
    Relevance: supports C1's intended consequence — precedent that the most-cited leaderboard's ranking is not a sound basis for selection; extends "leaderboard unsoundness" from gaming to pricing context.
    Quotes: "We find that undisclosed private testing practices benefit a handful of providers who are able to test multiple variants before public release and retract scores if desired."

[6] Zhang et al. "Train-before-Test Harmonizes Language Model Rankings." Preprint, 2025. https://arxiv.org/abs/2507.05195
    Theme: transferability
    Claim: 61 models × 24 benchmarks: out-of-the-box rankings contradict each other and have "little external validity"; rankings become transferable only after identical benchmark-specific fine-tuning.
    Relevance: the nearest thing to a "rankings transfer" claim (prize #1) — but only under a train-before-test regime nobody uses for coding agents; under direct evaluation, the regime C1 attacks, it supports C1.
    Quotes: "Existing language model benchmarks provide contradictory model rankings, even for benchmarks that aim to capture similar skills… traditional rankings demonstrate little external validity under direct evaluation."

[7] Vats et al. "The Scaffold Effect in Coding Agents: Harness Choice as a Hidden Variable in Coding-Agent Evaluation." Preprint, 2026. https://arxiv.org/abs/2607.22585
    Theme: transferability
    Claim: 2 models × 3 open-source harnesses × 50 Terminal-Bench tasks: harness choice causes up to a 40× difference in tokens per solved task — a max/min extreme-pair ratio (OpenCode vs Goose) of an UNPRICED token metric that counts cached tokens at par and amortizes failed runs into the numerator; adjacent harness pairs are only 1.2–1.9× — while pass-rate gaps stay 0–8 points; failure modes "largely model-independent."
    Relevance: closest prior art to C1 (precedes; also the top threat — see Part C). Partially contradicts C1's mechanism: harness effects replicate ACROSS two models, while C1 claims a provider-dependent reversal.
    Quotes: "Harness choice induces up to a 40x difference in tokens per solved task, while paired within-model pass-rate differences remain 0-8 percentage points."

[8] Han and Sun. "How good is your harness? Statistical evaluation of coding harnesses." 1st Workshop on Combining Theory and Benchmarks (CTB) @ ICML 2026, Seoul (non-archival workshop paper; venue confirmed verbatim from the PDF footer, 2026-09-29; forum id QI8z3skBwt). https://openreview.net/pdf/99eabc2ce65fd2871a253a0a57954c934ea9e6b0.pdf
    Theme: transferability
    Claim: Fits additive/interaction GLMs to the Terminal-Bench 2.0 leaderboard (105 harness–LLM pairs); harness effects are as large as LLM effects, and the interaction is comparable to both main effects — harness benefit depends on the paired LLM.
    Relevance: supports C1 — the closest demonstration that harness↔model rankings do not transfer, but on accuracy with the harness varied, not cost across provider price ratios.
    Quotes: "The second finding suggests that the harness and LLM are not perfectly exchangeable components:some harnesses may be better suited for some LLMs than others.The sizes of the interaction effects are also surprising:they're comparable in size to the harness and LLM (main)effects!"

[9] Zhang et al. "Stop Comparing LLM Agents Without Disclosing the Harness." Preprint, 2026. https://arxiv.org/abs/2605.23950
    Theme: transferability
    Claim: Position paper plus controlled 3-model × 3-harness grid on SWE-bench Verified: harness-induced variance is 7.8× model variance, with 6 of 9 model-pair ranking reversals across harnesses; proposes harness disclosure cards.
    Relevance: supports C1 — measured ranking reversal under controlled conditions; but reversals are model rankings across harnesses on accuracy, not harness cost rankings across providers.
    Quotes: "Second, published benchmarks, industry deployments, and a controlled variance decomposition show that harness-induced variance can substantially exceed model-induced variance, including cases of model ranking reversal."

[10] Ndzomga et al. "Efficient Benchmarking of AI Agents." Preprint, 2026. https://arxiv.org/abs/2603.23749
    Theme: transferability
    Claim: Across 8 benchmarks, 33 scaffolds, 70+ model configs: absolute score prediction degrades under scaffold-driven distribution shift, but rank-order prediction stays stable; a mid-difficulty task filter cuts evaluation cost 44–70%.
    Relevance: contradicts a strong reading of C1 — direct evidence that agent rank-order transfers across scaffolds (quality ranks, not cost ranks, and no provider pricing variation). Cited pre-emptively; see Part C.
    Quotes: "Across eight benchmarks, 33 agent scaffolds, and 70+ model configurations, we find that absolute score prediction degrades under this shift, while rank-order prediction remains stable."

### Theme 2 — Tool interface design

[11] Anthropic. "Tool search tool" (Claude Developer Platform documentation). Vendor documentation, accessed 2026-09-29. https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool
    Theme: tool interface
    Claim: Official docs state tool-selection accuracy degrades past ~30–50 available tools, and that deferred/on-demand tool loading cuts definition token overhead >85% while keeping selection accuracy high.
    Relevance: supports C2 — the vendor itself quantifies a tool-count threshold where behavior degrades; note our effect appears at 24 tools, just below their stated threshold — a tension the paper must address.
    Quotes: "Tool selection accuracy: Claude's ability to pick the right tool degrades once you exceed 30–50 available tools. Because tool search loads only a focused set of relevant tools on demand, selection accuracy stays high even across thousands of tools."

[12] Wu et al. (Anthropic). "Advanced tool use: Tool Search Tool, Programmatic Tool Calling, and Tool Use Examples." Vendor blog, ~Nov 2025. https://www.anthropic.com/engineering/advanced-tool-use
    Theme: tool interface
    Claim: 58 MCP tools consume ~55K tokens (134K seen internally before optimization); tool search raised Opus 4 accuracy 49%→74% on internal MCP evals; Programmatic Tool Calling cut average tokens 43,588→27,297 (−37%) on complex research tasks.
    Relevance: supports C2 (vendor-quantified schema-token bloat and similar-name selection failures); pressures C1's mechanism — the same post claims code-mode REDUCES total tokens. Vendor self-report, no public dataset.
    Quotes: "That's 58 tools consuming approximately 55K tokens before the conversation even starts... The most common failures are wrong tool selection and incorrect parameters, especially when tools have similar names."

[13] Qin et al. "ToolLLM: Facilitating Large Language Models to Master 16000+ Real-world APIs." Preprint, 2023. https://arxiv.org/abs/2307.16789
    Theme: tool interface
    Claim: Introduces ToolBench (16,464 real REST APIs) and ToolLLaMA with a neural API retriever, establishing retrieval-over-large-toolsets as the standard architecture instead of presenting all tools in context.
    Relevance: precedes C2 — foundational "RAG-for-tools" evidence that tool catalogs exceed what can be presented directly, motivating the tool-count factor we manipulate.
    Quotes: "we collect 16,464 real-world RESTful APIs spanning 49 categories from RapidAPI Hub... [we] equip it with a neural API retriever to recommend appropriate APIs for each instruction."

[14] Gan and Sun. "RAG-MCP: Mitigating Prompt Bloat in LLM Tool Selection via Retrieval-Augmented Generation." Preprint, 2025. https://arxiv.org/abs/2505.03275
    Theme: tool interface
    Claim: LLMs fail to pick correct MCP tools as the catalog grows; retrieving a shortlist before the LLM call cuts prompt tokens >50% and more than triples selection accuracy in an MCP stress test (correct tool + N−1 distractors).
    Relevance: supports C2 — the most direct academic prior for "more presented tools → worse selection"; C2 measures the same phenomenon via request count and cost on coding harnesses.
    Quotes: "Experiments, including an MCP stress test, demonstrate RAG-MCP significantly cuts prompt tokens (e.g., by over 50%) and more than triples tool selection accuracy (43.13% vs 13.62% baseline) on benchmark tasks."

[15] Lumer et al. "Toolshed: Scale Tool-Equipped Agents with Advanced RAG-Tool Fusion and Tool Knowledge Bases." ICAART 2025 (SCITEPRESS proceedings, vol. 3, pp. 1180–1191); preprint arXiv:2410.14594. https://www.scitepress.org/Papers/2025/133030/133030.pdf
    Theme: tool interface
    Claim: Systematically varies equipped tools (1–128) and retrieval top-k. Retrieval accuracy collapses for naive retrievers as the pool grows, but — NULL RESULT — base agent accuracy stayed ~97–100% for 1–128 tools on Seal-Tools, whose tools are non-overlapping; the authors warn overlapping/sequential datasets may differ.
    Relevance: both supports and partially contradicts C2 — the closest controlled manipulation of tool count, and its null is exactly the contradicting evidence we asked to surface. C2's positive 20–34% request-count effect may hinge on tool overlap, as Toolshed predicts. See Part C.
    Quotes: "Across all M values (1–128), Base Agent accuracy remains around 97–100%... Thus, for the Seal-Tools dataset, the number of tools equipped to an agent (tool-M) does not significantly affect Base Agent's accuracy (likely due to the dataset's distinct nonoverlapping query-tool pairs and lack of sequential tool [calls])."

[16] Li et al. "ComplexMCP: Evaluation of LLM Agents in Dynamic, Interdependent, and Large-Scale Tool Sandbox." Preprint, 2026. https://arxiv.org/abs/2605.10787
    Theme: tool interface
    Claim: 300+ interdependent MCP tools across 7 stateful sandboxes; even top models stay under 60% success (humans ~90%); trajectory analysis names tool retrieval saturation as the action space scales as bottleneck #1.
    Relevance: supports C2 — recent independent confirmation that behavior degrades as the action space scales, now for interdependent/stateful tools.
    Quotes: "Granular trajectory analysis identifies three fundamental bottlenecks: (1) tool retrieval saturation as action spaces scale; (2) over-confidence, where agents skip essential environment verifications; and (3) strategic defeatism..."

[17] Repantis et al. "How Many Tools Should an LLM Agent See? A Chance-Corrected Answer." Preprint, 2026. https://arxiv.org/abs/2605.24660
    Theme: tool interface
    Claim: Treats shortlist size (number of tools shown) as the experimental object across registries of 20–3,251 tools; downstream validation with Claude Sonnet 4.6 shows shorter lists improve selection (93.1% vs 87.1%; 76.8% vs 60.9% on medium queries).
    Relevance: precedes/supports C2 — direct manipulation of presented-tool count with a frontier model, but accuracy outcome, one provider.
    Quotes: "Downstream validation with Claude Sonnet 4.6 indicates that shorter adaptive lists also improve the LLM's ability to select the right tool: 93.1% versus 87.1% when always shown 5 tools, widening to 76.8% vs 60.9% on medium-difficulty queries where the correct tool is present but not ranked first."

[18] Stamoulis et al. "Less is More: Optimizing Function Calling for LLM Execution on Edge Devices." Preprint, 2024. https://arxiv.org/abs/2411.15399
    Theme: tool interface
    Claim: Training-free dynamic tool selection; reducing the number of tools available to the LLM improves function-calling success, latency (−70%), and power (−40%) on edge hardware.
    Relevance: supports C2 — explicitly premises that tool count changes agent behaviour; accuracy/efficiency outcomes, not request count.
    Quotes: "Our approach is based on the key insight that selectively reducing the number of tools available to LLMs significantly improves their function-calling performance, execution time, and power efficiency on edge devices."

### Theme 3 — Code-mode / programmatic tool calling

[19] Anthropic. "Programmatic tool calling" (Claude API documentation). Vendor documentation, 2026. https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling
    Theme: code-mode
    Claim: Vendor-reported measurements of code-mode tool calling: −38% billed input tokens on a 75-tool internal agent; 20–40% savings with 10–49 tool definitions; and a cost REVERSAL on sequential single-call workloads (τ²-bench, ~8% more expensive).
    Relevance: precedes and qualifies C1/C2 — the vendor already documents that code-mode's cost advantage is workload-dependent and can flip sign; but single-provider, observed traffic stratification rather than manipulated factors, tokens rather than dollars, and no price-ratio interaction.
    Quotes: "On τ²-bench (airline, retail, and telecom domains), where each turn makes one or two sequential tool calls, programmatic tool calling left scores unchanged and cost roughly 8% more. Sequential single-call workflows do not benefit."

[20] Sen, Lumer and Subbiah. "The Bitter Lesson of Tool Calling." Preprint, 2026. https://arxiv.org/abs/2608.06370
    Theme: code-mode
    Claim: 14 models on BFCL v4, programmatic vs native JSON tool calling: accuracy parity-or-better in 11/14 models; token costs cross over at fan-out N≈26 (below it PTC is MORE expensive; at N=48, 3,535 vs 5,097 tokens); 1.5× input overhead on chaining; and, crucially for us, output token counts reported equal across paradigms.
    Relevance: precedes and partially contradicts C1/C2 — the strongest academic token-cost comparison; its "output token counts do not differ across paradigms" (limitations, echo-stub single-turn setting) directly attacks C1's output-verbosity mechanism. Our defense: real coding tasks, not echo stubs; see Part C.
    Quotes: "Token costs cross over at N≈26. Below this threshold programmatic tool calling is more expensive due to its fixed system-prompt overhead. Above it, JSON tool calling exceeds programmatic tool calling as the response must enumerate all N tool-call objects."

[21] Mak et al. "Is Bash All You Need? An Empirical Study of Tool Interfaces for Enterprise Digital Worker Agents." Preprint, 2026. https://arxiv.org/abs/2609.11999
    Theme: code-mode
    Claim: Five tool interfaces (typed tools, typed+bash, bash alone, bash+synthesized, PTC) on TheAgentCompany and APEX-Agents with Opus-4.8 and GPT-5.5: bash wins on score with 19–72% fewer total tokens; PTC beats typed calls on tokens but loses to bash on quality and cost efficiency.
    Relevance: precedes/threatens C1/C2 — a rigorous multi-interface token-cost comparison across two providers' frontier models already exists; but cost is never decomposed by input/output price ratio, and interfaces are compared across benchmarks rather than manipulated within one harness.
    Quotes: "PTC uses fewer tokens than direct typed calls with broadly similar task performance, but generally underperforms bash alone in both quality and cost efficiency."

[22] Jones and Kelly (Anthropic). "Code execution with MCP: Building more efficient agents." Vendor engineering blog, 2025. https://www.anthropic.com/engineering/code-execution-with-mcp
    Theme: code-mode
    Claim: Canonical statement of the pattern: presenting MCP servers as code APIs with progressive disclosure cuts a worked example from 150,000 to 2,000 tokens (98.7%); acknowledges code execution's own overhead must be weighed.
    Relevance: precedes C1/C2 — establishes the token-saving claim C1 stress-tests; measurement is context tokens in a single illustrative setup, not billed cost across price schedules.
    Quotes: "This reduces the token usage from 150,000 tokens to 2,000 tokens—a time and cost saving of 98.7%."

[23] Cloudflare. "Code Mode: give agents an entire API in 1,000 tokens (Cloudflare MCP server)." Vendor blog, 2026. https://blog.cloudflare.com/code-mode-mcp/
    Theme: code-mode
    Claim: Server-side Code Mode: two meta-tools (search, execute) expose all 2,500+ Cloudflare API endpoints in ~1,000 tokens fixed; claims 99.9% input-token reduction vs the equivalent native MCP server (1.17M tokens), measured with tiktoken.
    Relevance: precedes C2 — quantifies schema-presentation token load, but via tokenizer counts, not provider-billed usage or task accuracy.
    Quotes: "For a large API like the Cloudflare API, Code Mode reduces the number of input tokens used by 99.9%. An equivalent MCP server without Code Mode would consume 1.17 million tokens — more than the entire context window of the most advanced foundation models."

[24] Wang et al. "Executable Code Actions Elicit Better LLM Agents (CodeAct)." ICML 2024. https://arxiv.org/abs/2402.01030
    Theme: code-mode
    Claim: Foundational academic prior: executable Python code as a unified agent action space beats JSON/text actions across 17 LLMs (up to 20% higher success rate).
    Relevance: precedes C1/C2 — establishes code-mode's accuracy advantage; measures success and turns, not billed cost.
    Quotes: "Our extensive analysis of 17 LLMs on API-Bank and a newly curated benchmark shows that CodeAct outperforms widely used alternatives (up to 20% higher success rate)."

[25] Hugging Face (smolagents team). "CodeAgents + Structure: A Better Way to Execute Actions." Vendor blog, ~2025. https://huggingface.co/blog/structured-codeagent
    Theme: code-mode
    Claim: 15,724 traces: first-call parse failures cut success (51.3%→42.3%) and inflate steps 3.18→4.63; structured generation fixes parsing but imposes a "structure tax" on small models.
    Relevance: supports C2 directionally — output-presentation manipulation measurably changes request/step counts; orthogonal on cost (no token billing).
    Quotes: "Parsing errors in the first step reduce success rates of the agent by 21.3% and increase average steps taken from 3.18 to 4.63."

[26] Strands Agents team (AWS). "strands-code-agent" (SDK integration documentation). Vendor documentation, 2026. https://strandsagents.com/docs/integrations/agent-extensions/strands-code-agent/
    Theme: code-mode
    Claim: A CodeAgent replacing tool calls with REPL code generation reports +7% accuracy, 78% fewer input tokens, 67% fewer output tokens, 56% faster, 35% fewer reasoning cycles vs an equivalent tool-calling agent on the Data Agent Benchmark.
    Relevance: precedes C1 — the −78% input / −67% output split is the closest prior art to a cost decomposition (output shrinks LESS than input, i.e., the direction of our price-ratio sensitivity); vendor docs, one benchmark, one provider, no dollar-cost or price-ratio analysis.
    Quotes: "In empirical evaluations on the Data Agent Benchmark, this approach achieves higher accuracy (+7%) while consuming 78% fewer input tokens, 67% fewer output tokens, completing tasks 56% faster, and requiring 35% fewer reasoning cycles compared to an equivalent tool-calling agent."

### Theme 4 — Output verbosity and length control

[27] Zheng et al. "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena." NeurIPS 2023 Datasets and Benchmarks. https://arxiv.org/abs/2306.05685
    Theme: verbosity
    Claim: Establishes LLM-as-a-judge methodology and catalogues its biases, including verbosity bias: judges favor longer answers regardless of quality.
    Relevance: precedes C1 — canonical evidence that output length is a confound in LLM evaluation; C1 extends this from judged quality to dollar cost.
    Quotes: "We examine the usage and limitations of LLM-as-a-judge, including position, verbosity, and self-enhancement biases, as well as limited reasoning ability, and propose solutions to mitigate some of them."

[28] Dubois et al. "Length-Controlled AlpacaEval: A Simple Way to Debias Automatic Evaluators." Preprint, 2024. https://arxiv.org/abs/2404.04475
    Theme: verbosity
    Claim: AlpacaEval's auto-annotator systematically favors longer outputs; a regression that conditions on zero length difference debiases rankings and raises correlation with Chatbot Arena from 0.94 to 0.98.
    Relevance: supports C1's motivation — output length demonstrably distorts comparisons, so a harness that changes output-token volume can distort any single-metric comparison; precedent for length as a manipulable confound, not a cost study.
    Quotes: "Even simple, known confounders such as preference for longer outputs remain in existing automated evaluation metrics."

[29] Chen et al. "Do NOT Think That Much for 2+3=? On the Overthinking of o1-Like LLMs." Preprint, 2024. https://arxiv.org/abs/2412.21187
    Theme: verbosity
    Claim: First comprehensive study of "overthinking": extended chain-of-thought burns compute on trivial problems with minimal benefit; proposes efficiency metrics and mitigations that cut tokens without accuracy loss.
    Relevance: supports C1's mechanism — output-token volume is often wasteful and reducible, so a harness emitting more output is paying for low-value tokens.
    Quotes: "This paper presents the first comprehensive study on the prevalent issue of overthinking in these models, where excessive computational resources are allocated for simple problems with minimal benefit."

[30] Han et al. "Token-Budget-Aware LLM Reasoning (TALE)." Preprint, 2024. https://arxiv.org/abs/2412.18547
    Theme: verbosity
    Claim: CoT reasoning is "unnecessarily lengthy"; inserting a token budget into the prompt compresses it, and a budget adapting to problem complexity cuts token costs with slight accuracy loss.
    Relevance: supports C1's mechanism — prompt-level factors directly control output-token count and hence cost; but it manipulates a budget instruction, not tool-schema count or harness structure.
    Quotes: "We find that the reasoning process of current LLMs is unnecessarily lengthy and it can be compressed by including a reasonable token budget in the prompt, but the choice of token budget plays a crucial role in the actual compression effectiveness."

[31] Fatemi et al. "Concise Reasoning via Reinforcement Learning." Preprint, 2025. https://arxiv.org/abs/2504.05185
    Theme: verbosity
    Claim: Reasoning-model verbosity is an RL optimization artifact (incorrect answers push PPO/GRPO toward longer outputs); a short second RL phase sharply cuts length while preserving or improving accuracy.
    Relevance: supports C1's mechanism from the training side — explains WHY models over-emit output tokens, strengthening the claim that output-heavy presentations buy little.
    Quotes: "We show this verbosity stems not from deeper reasoning but from reinforcement learning loss minimization when models produce incorrect answers."

### Theme 5 — Prompt caching in agent loops

[32] Anthropic. "Prompt caching" (Claude API documentation). Vendor documentation, accessed 2026-09-29. https://platform.claude.com/docs/en/build-with-claude/prompt-caching
    Theme: prompt caching
    Claim: Documents exact cache mechanics: 5-min default TTL (1-hour option), reads at 0.1× base input, writes at 1.25×, and an invalidation hierarchy in which editing tool definitions destroys everything after them; exposes cache_creation/cache_read usage fields.
    Relevance: precedes C3 and C2 — tool-schema edits invalidating the cache is the vendor-documented mechanism behind why a 24-schema presentation could shift cost; precedes C4 (provider-reported cache usage fields exist).
    Quotes: "As described in Structuring your prompt, the cache follows the hierarchy: tools → system → messages. Changes at each level invalidate that level and all subsequent levels."

[33] OpenAI. "Prompt caching" (API documentation). Vendor documentation, accessed 2026-09-29. https://platform.openai.com/docs/guides/prompt-caching
    Theme: prompt caching
    Claim: Cached KV state is machine-local; above ~15 req/min overflow routing can lose hits; `prompt_cache_key` steers routing; instructs users to compute hit rate from usage fields and cites >90% for a well-structured multi-turn agent deployment.
    Relevance: precedes C4 (hit-rate measurement from provider usage fields is documented practice) and supports C3 (routing infrastructure — not the harness alone — determines hit rate).
    Quotes: "Cached states live on individual machines, where traffic above 15 requests per minute can lead to overflow routing. A request can reuse a cached prefix only if it reaches a machine holding a matching entry that has not expired."

[34] Ji (Manus). "Context Engineering for AI Agents: Lessons from Building Manus." Vendor blog, 2025. https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus
    Theme: prompt caching
    Claim: Argues KV-cache hit rate is the top production-agent metric; agents are prefill-dominated (~100:1 input:output); advises stable prefixes, append-only context, and never removing tool definitions mid-loop.
    Relevance: precedes C3's framing and supports C2's intuition (tool-definition churn invalidates the cache); mildly tensions C1's mechanism (their agents are input-dominated).
    Quotes: "If I had to choose just one metric, I'd argue that the KV-cache hit rate is the single most important metric for a production-stage AI agent. It directly affects both latency and cost."

[35] LiteLLM team. "Auto Router: Opus level quality at up to 27% lower cost." Vendor documentation/blog, 2026. https://docs.litellm.ai/blog/auto-router-terminal-bench-benchmark
    Theme: prompt caching
    Claim: On a 21-task Terminal-Bench 2.0 subset, every arm reports a "Cache hit" rate — router arms 78–83%, fixed-model arms 89% (Opus-5) and 93% (Sonnet-5, Haiku-4.5) — with cost taken from gateway spend logs; the cheapest arm (Haiku-only) had the HIGHEST hit rate.
    Relevance: precedes/threatens C4 — per-arm cache-hit measurement inside an agent benchmark, captured at a gateway, exists in vendor material; supports C3's direction (hit rate and cheapness decouple). Arms vary routing, not harness; per-arm, not per-run, attribution. See Part C.
    Quotes: "Cost: total USD across all 21 tasks from gateway spend logs, classifier calls included"

[36] Not Diamond team. "Interactive benchmarks: evaluating model routing for AI agents." Vendor blog, 2026. https://www.notdiamond.ai/blog/interactive-benchmarks-a-new-methodology-for-evaluating-model-routing
    Theme: prompt caching
    Claim: Per-turn (single-turn) routing invalidates the KV cache each turn and can cost more than any fixed model; cache expiry between user turns causes 10–20× input-cost jumps.
    Relevance: supports C3 (cache destruction by routing is real and costly); C1-adjacent (asserts harnesses differ in cost-efficiency, with an unverified citation we could not chase).
    Quotes: "Single-turn routing: Assesses an individual request and predicts which model is best-suited to respond at the lowest cost. This approach will naively invalidate the KV cache on each turn of an agent session, costing more money than any individual model at lower performance."

[37] Gim et al. "Prompt Cache: Modular Attention Reuse for Low-Latency Inference." Reported MLSys 2024. https://arxiv.org/abs/2311.04934
    Theme: prompt caching
    Claim: Reuses precomputed attention states for modular prompt segments (system prompts, templates, documents) via a positional-accuracy-preserving schema; 8× (GPU) to 60× (CPU) TTFT reduction.
    Relevance: precedes C3/C4 — the academic basis for the provider prompt caching this paper measures.
    Quotes: "The improvements range from 8x for GPU-based inference to 60x for CPU-based inference, all while maintaining output accuracy and without the need for model parameter modifications."

[38] Liu et al. "Agentic Coding in the Wild: Characterizing GitHub Copilot Traces at Production Scale." Preprint, 2026. https://arxiv.org/abs/2608.00101
    Theme: prompt caching
    Claim: First production-scale characterization of coding-agent workload (3.2M users, 13M sessions, 761M LLM calls, 95T tokens): KV-cache hit ~90% within a turn, ~55% across turn boundaries, drastic invalidation after model switches or compaction.
    Relevance: precedes/threatens C3 — cache hit rates in real agentic coding already measured at massive scale with quantified invalidation causes; but provider-side aggregate, not per-harness, and not tied to cost rankings. See Part C.
    Quotes: "This structure yields KV cache hit rates averaging 90% within a turn, but falling to 55% across turn boundaries and drastically invalidated after events like model switches or context compaction."

[39] Lumer et al. "An Evaluation of Prompt Caching for Long-Horizon Agentic Tasks." Preprint, 2026. https://arxiv.org/abs/2601.06007
    Theme: prompt caching
    Claim: Measures prompt caching on DeepResearch-Bench (500+ agent sessions) across OpenAI, Anthropic, and Google: 41–80% API cost reduction, 13–31% TTFT improvement; naive full-context caching can increase latency.
    Relevance: precedes C3 — quantified cache-vs-cost in agent loops across three providers; its self-declared novelty (no prior cache-cost quantification in agentic tasks, Jan 2026) delimits what remains novel for C3/C4: per-harness hit-rate attribution linked to a billed-cost ranking.
    Quotes: "To our knowledge, no prior work quantifies these cost savings or compares caching strategies for multi-turn agentic tasks."

[40] tianpan.co. "Prompt Cache Hit Rate: The Production Metric Your Cost Dashboard Is Missing." Engineering blog, 2026-04-20. https://tianpan.co/blog/2026/04/20/prompt-cache-hit-rate-production-metric
    Theme: prompt caching
    Claim: Prescriptive playbook: track cached-token fraction per request from provider usage fields, gate deploys on cache-hit regression, use observability platforms that surface cache metrics; names tool-schema reordering as a cache killer.
    Relevance: precedes C4's capture method (provider-reported cache accounting harvested into dashboards is documented practice) — but no benchmark, no per-harness comparison, no per-run attribution; supports C2's mechanism.
    Quotes: "The metric you want to track is the cached token fraction: the ratio of cache-read tokens to total input tokens, per request and as a rolling aggregate."

### Theme 6 — Cross-harness / cross-agent cost measurement

[41] Kapoor et al. "AI Agents That Matter." Preprint, 2024. https://arxiv.org/abs/2407.01502
    Theme: cross-harness cost measurement
    Claim: Agent benchmarks over-focus on accuracy, producing needlessly costly SOTA agents and mistaken attributions; advocates joint cost–accuracy optimization, demonstrated via cost-controlled search over agent designs.
    Relevance: precedes C1 — establishes cost as a first-class evaluation axis and shows agent design choices trade off cost vs accuracy; never varies provider pricing and says nothing about cross-provider ranking transfer.
    Quotes: "First, there is a narrow focus on accuracy without attention to other metrics. As a result, SOTA agents are needlessly complex and costly, and the community has reached mistaken conclusions about the sources of accuracy gains."

[42] Xia et al. "Agentless: Demystifying LLM-based Software Engineering Agents." Preprint, 2024. https://arxiv.org/abs/2407.01489
    Theme: cross-harness cost measurement
    Claim: A simple three-phase localize-repair-validate pipeline beats complex agents on SWE-bench Lite at $0.70 per issue, comparing dollar cost across open-source software agents.
    Relevance: precedes C1/C2 — harness/scaffold simplification changes both accuracy and cost rankings, but only under one provider's pricing.
    Quotes: "Our results on the popular SWE-bench Lite benchmark show that surprisingly the simplistic Agentless is able to achieve both the highest performance (32.00%, 96 correct fixes) and low cost ($0.70) compared with all existing open-source software agents!"

[43] Zhang et al. "AutoCodeRover: Autonomous Program Improvement." Preprint, 2024. https://arxiv.org/abs/2404.05427
    Theme: cross-harness cost measurement
    Claim: Combines LLMs with AST-based code search to solve GitHub issues; reports average dollar cost per issue ($0.43) alongside resolution rate, compared against SWE-agent and other baselines.
    Relevance: precedes C1 — establishes dollar cost per resolved issue as a standard cross-harness comparison metric.
    Quotes: "In addition, AutoCodeRover achieved this efficacy with significantly lower cost (on average, $0.43 USD), compared to other baselines."

[44] Xu et al. "TheAgentCompany: Benchmarking LLM Agents on Consequential Real World Tasks." Preprint, 2024. https://arxiv.org/abs/2412.14161
    Theme: cross-harness cost measurement
    Claim: 175 simulated-software-company tasks; defines an explicit cost-per-instance metric from prompt/completion token counts and reports per-model dollar costs (>$4/task for the best agent).
    Relevance: precedes C1 — and its cost formula explicitly ASSUMES NO PROMPT CACHING, exactly the assumption C3 tests; the naive baseline method our gateway improves on. (Quote from the v2 HTML body.)
    Quotes: "Cost per instance  We measure the monetary cost of querying the underlying LLMs via API. Assuming no prompt caching, we calculate the cost as: Cost=(Prompt token count×Prompt token cost)+(Completion token count×Completion token cost)."

[45] SWE-bench/SWE-agent team. "mini-SWE-agent: The 100 line AI agent that's actually useful." Project documentation, 2025. https://mini-swe-agent.com/latest/
    Theme: cross-harness cost measurement
    Claim: A ~100-line agent with no tools besides bash — it does not even use the LM tool-calling interface — scores >74% on SWE-bench Verified and serves as the bash-only leaderboard harness for comparing LMs.
    Relevance: supports C2's framing — existence proof that a one-tool harness is competitive, so schema-count manipulations are realistic; precedes C1 as a minimal-harness baseline.
    Quotes: "Does not have any tools other than bash — it doesn't even use the tool-calling interface of the LMs. This means that you can run it with literally any model."

[46] LiteLLM team. "LiteLLM Proxy (LLM Gateway) — Quick Start." Vendor documentation, accessed 2026-09-29. https://docs.litellm.ai/docs/proxy/quick_start
    Theme: cross-harness cost measurement
    Claim: An HTTP proxy/gateway in front of 100+ LLM providers unifying API format, with authentication, spend tracking, and budgets scoped by virtual keys.
    Relevance: direct prior art against C4's novelty — a proxy between agent and provider with per-key spend tracking is commodity infrastructure; our contribution is the measurement methodology (provider-reported cache split, run identity in the credential, billed-vs-cold decomposition), not the gateway itself.
    Quotes: "LiteLLM Server (LLM Gateway) manages: - Unified Interface: Calling 100+ LLMs Huggingface/Bedrock/TogetherAI/etc. in the OpenAI ChatCompletions & Completions format - Cost tracking: Authentication, Spend Tracking & Budgets Virtual Keys"

[47] OpenTelemetry GenAI SIG. "GenAI Semantic Conventions — Metrics / Token metrics." Standards documentation (status: Development), 2025–2026. https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-metrics.md · https://raw.githubusercontent.com/open-telemetry/semantic-conventions-genai/main/docs/gen-ai/gen-ai-token-metrics.md
    Theme: cross-harness cost measurement
    Claim: Standardizes vendor-neutral GenAI telemetry: inference token usage counters, agent-level instruments (invoke_agent inference calls, tool calls), `cache_read`/`cache_write` input-token counters, and a rule that when billed and consumed counts differ, billable tokens MUST be reported.
    Relevance: precedes C4 — cached-token capture and billed-vs-consumed semantics are now standardized client-side telemetry; what OTel does not do is gateway-side capture, per-run credential attribution, or harness comparison. The paper should adopt this vocabulary.
    Quotes: "The following metric instruments describe Generative AI operations. An operation may be a request to an LLM, a function call, or some other distinct action within a larger Generative AI workflow." / "`gen_ai.client.inference.usage.cache_read.input_tokens` | Counter | `{token}` | The number of input tokens served from a provider-managed cache."

[48] Kapoor et al. "HAL: Holistic Agent Leaderboard." Preprint, 2025. https://arxiv.org/abs/2510.11977
    Theme: cross-harness cost measurement
    Claim: 21,730 rollouts across 9 models × 9 benchmarks (~$40k spend) with per-task cost logging and a three-dimensional models×scaffolds×benchmarks analysis, plus LLM-aided log inspection.
    Relevance: precedes C1/C4 — cost-aware multi-model agent leaderboards with scaffold as an axis exist; provider pricing is not varied and cost rankings across providers are not examined.
    Quotes: "Second, we conduct three-dimensional analysis spanning models, scaffolds, and benchmarks."

### Theme 7 — Agent harness / scaffold architecture

[49] Yao et al. "ReAct: Synergizing Reasoning and Acting in Language Models." ICLR 2023. https://arxiv.org/abs/2210.03629
    Theme: harness architecture
    Claim: Introduces the interleaved reasoning-trace + action loop that is the baseline scaffold for most coding agents.
    Relevance: precedes C1/C2 — defines the canonical harness loop whose per-step output (explicit reasoning traces) is exactly what a code-mode vs tool-mode comparison reprices.
    Quotes: "In this paper, we explore the use of LLMs to generate both reasoning traces and task-specific actions in an interleaved manner, allowing for greater synergy between the two."

[50] Yang et al. "SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering." NeurIPS 2024. https://arxiv.org/abs/2405.15793
    Theme: harness architecture
    Claim: Argues that interface design for LM agents (the agent-computer interface: edit commands, search, output format) materially changes agent behavior and SWE-bench performance.
    Relevance: precedes C2 — the strongest prior statement that harness/tool-surface design is a measurable experimental factor, though it measures success rate, not token cost or request count.
    Quotes: "We investigate how interface design affects the performance of language model agents… Finally, we provide insight on how the design of the ACI can impact agents' behavior and performance."

[51] Anthropic Applied AI team. "Effective context engineering for AI agents." Vendor blog, 2025. https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
    Theme: harness architecture
    Claim: Defines context engineering as curating the smallest high-signal token set; recommends compaction, structured note-taking, sub-agents, and token-efficient tool design; names bloated tool sets a common failure mode.
    Relevance: supports C1's premise (harness choices determine token counts) and precedes C2 — tool-count bloat is vendor-recognized, though no request-count effect is quantified.
    Quotes: "One of the most common failure modes we see is bloated tool sets that cover too much functionality or lead to ambiguous decision points about which tool to use."

[52] Anthropic. "Context editing" (Claude platform documentation). Vendor documentation, 2025–2026. https://platform.claude.com/docs/en/build-with-claude/context-editing
    Theme: harness architecture
    Claim: Documents server-side tool-result clearing (`clear_tool_uses_20250919`), thinking-block clearing, and SDK compaction; explicitly states tool-result clearing invalidates cached prompt prefixes and provides `clear_at_least` to make the break worthwhile.
    Relevance: supports C3's framing — it is documented vendor knowledge that harness-side context management trades input-token savings against cache invalidation; cache hit rate and token volume are coupled levers, so a cache-only cost explanation is suspect.
    Quotes: "Tool result clearing: Invalidates cached prompt prefixes when content is cleared. To account for this, clear enough tokens to make the cache invalidation worthwhile."

[53] Jiang et al. "LongLLMLingua: Accelerating and Enhancing LLMs in Long Context Scenarios via Prompt Compression." Preprint (reported ACL 2024 Findings; venue unverified). https://arxiv.org/abs/2310.06839
    Theme: harness architecture
    Claim: Prompt compression that reorders/densifies key information cuts cost and latency while improving accuracy; ~4× fewer tokens and 94% cost reduction on LooGLE.
    Relevance: precedes C1 — token count (hence cost) is a manipulable harness variable; measured under a single pricing model, so no ranking-flip question arises.
    Quotes: "LongLLMLingua not only enhances performance but also significantly reduces costs and latency… It achieves a 94.0% cost reduction in the LooGLE benchmark."

[54] Anthropic. "Claude Code tools reference." Vendor documentation, 2026. https://code.claude.com/docs/en/tools-reference.md
    Theme: harness architecture
    Claim: Reference for Claude Code's built-in tool inventory (~30 tools: Agent, Bash, Edit, Read, Grep, WebFetch, ToolSearch for deferred loading, ...) with permission and output-truncation behavior.
    Relevance: precedes C2 — a production harness ships roughly the 24-schema regime C2 manipulates, and ToolSearch shows vendors already treat schema count as a context-load problem; grounds C2's factor levels in practice.
    Quotes: "Claude Code has access to a set of built-in tools that help it understand and modify your codebase… `ToolSearch` | Searches for and loads deferred tools when tool search is enabled."

### Theme 8 — Evaluation methodology and statistical rigour

[55] Miller. "Adding Error Bars to Evals: A Statistical Approach to Language Model Evaluations." Preprint, 2024. https://arxiv.org/abs/2411.00640
    Theme: methodology
    Claim: Treats LLM evals as experiments: formulas for variance, model-vs-model differences, and experiment planning; argues the eval literature ignores basic experiment-analysis practice.
    Relevance: precedes the paper's statistical posture — directly supports the retraction (three runs on one task is statistically meaningless) and arms the redesign.
    Quotes: "Fundamentally, evaluations are experiments; but the literature on evaluations has largely ignored the literature from other sciences on experiment analysis and planning."

[56] Bouthillier et al. "Accounting for Variance in Machine Learning Benchmarks." MLSys 2021. https://arxiv.org/abs/2103.03098
    Theme: methodology
    Claim: Models the benchmarking process; data sampling, initialization, and hyperparameter variance markedly affect results; randomized comparisons with more variation sources are cheaper and closer to the ideal estimator.
    Relevance: precedes C1–C4 — the canonical "single-seed/single-config comparisons are unreliable" citation; supports the retraction and the blocked, randomized design.
    Quotes: "We model the whole benchmarking process, revealing that variance due to data sampling, parameter initialization and hyperparameter choice impact markedly the results."

[57] Atil et al. "Non-Determinism of 'Deterministic' LLM Settings." Preprint, 2024. https://arxiv.org/abs/2408.04667
    Theme: methodology
    Claim: Five LLMs at temperature 0, fixed seed, 10 identical runs: up to 15% accuracy variation and up to 70% best-to-worst gaps; cause traced to serving optimizations (batching, prefix caching).
    Relevance: precedes and supports C1–C4 — API-side nondeterminism makes the multi-run design necessary; provider infrastructure (prefix caching) is itself a variance source, relevant to C4.
    Quotes: "We see accuracy variations up to 15% across naturally occurring runs with a gap of best possible performance to worst possible performance up to 70%. In fact, none of the LLMs consistently delivers repeatable accuracy across all tasks, much less identical output strings."

[58] Liu et al. "Why the SWE-bench Leaderboard Can No Longer Order Its Top Entries, and What to Measure Instead." Preprint, 2026. https://arxiv.org/abs/2609.17394
    Theme: methodology
    Claim: Audits 254 SWE-bench submissions without running models: adjacent top-30 Verified pairs are statistically inseparable (McNemar), while the same model across scaffolds spans up to 29.8 points — larger than the 8.8-point spread of the top thirty.
    Relevance: precedes C2 (scaffold identity dominates score differences, with proper multiple-comparison correction) and supports the retraction ethos; also a threat — see Part C.
    Quotes: "Scores also depend on the evaluated model-scaffold pair: observed within-model scaffold ranges reach 29.8 percentage points, compared with the 8.8-point spread of the top thirty."

[59] Liang, Bommasani et al. "Holistic Evaluation of Language Models (HELM)." TMLR 2023. https://arxiv.org/abs/2211.09110
    Theme: methodology
    Claim: Standardized multi-metric evaluation of 30 models across 42 scenarios with all raw prompts and completions released; before HELM, models shared almost no common evaluation conditions.
    Relevance: precedes C4 — establishes the standard of standardized conditions and full transparency that the gateway methodology serves.
    Quotes: "Prior to HELM, models on average were evaluated on just 17.9% of the core HELM scenarios, with some prominent models not sharing a single scenario in common."

[60] Guan, Wu, Yuan and Li. "Is Your Benchmark (Still) Useful? Dynamic Benchmarking for Code Language Models." Preprint, 2025. https://arxiv.org/abs/2503.06643
    Theme: methodology
    Claim: Semantic-preserving mutations of code benchmarks make all 10 tested models significantly worse and dramatically reshuffle rankings — memorization-driven scores on static benchmarks.
    Relevance: precedes C1's "single-benchmark rankings are unsound" argument in the code domain specifically.
    Quotes: "Our evaluation reveals several interesting or surprising findings: (1) all models perform significantly worse than before, (2) the ranking between some models shifts dramatically, and (3) dynamic benchmarks can resist against the data contamination problem."

### Theme 9 — Cost and token economics of LLM agents

[61] Wang, Hu et al. "Efficient Agents: Building Effective Agents While Reducing Cost." Preprint, 2025. https://arxiv.org/abs/2508.02694
    Theme: cost/token economics
    Claim: Systematic study of the efficiency–effectiveness trade-off in agent systems; a "cost-of-pass" metric decomposes costs of backbone choice, framework design, and test-time scaling on GAIA; retains 96.7% of OWL's performance at 28.4% lower cost-of-pass.
    Relevance: supports C1 — cost is a design-dependent, measurable property of agent frameworks at fixed task performance; precedes C2 (framework complexity as cost driver). Single pricing regime.
    Quotes: "Efficient Agents retains 96.7% of the performance of OWL, one leading open-source agent framework, while reducing operational costs from $0.398 to $0.228, resulting in a 28.4% improvement in cost-of-pass."

[62] Chen et al. "When Cheaper Reasoning Models End Up Costing More." Preprint, 2026. https://arxiv.org/abs/2603.23971
    Theme: cost/token economics
    Claim: 8 frontier reasoning models × 12 tasks: a "pricing reversal phenomenon" — in 32% of model pairs the cheaper-listed model costs more (up to 28×), driven by thinking-token volume and interaction turns; repeated runs vary up to 9.7×.
    Relevance: strong support (and partial threat) for C1 — independently shows cost rankings reverse depending on pricing structure and token-emission behavior, at MODEL level; its 9.7× run-to-run variance also supports our multi-seed design and the retraction. See Part C.
    Quotes: "We uncover the pricing reversal phenomenon: in 32% of model-pair comparisons, the model with a lower listed price actually incurs a higher total cost, with reversal magnitude reaching up to 28x."

[63] Aubakirova, Atallah et al. "State of AI: An Empirical 100 Trillion Token Study with OpenRouter." Preprint / vendor-backed study, 2026. https://arxiv.org/abs/2601.10088
    Theme: cost/token economics
    Claim: Analyzes 100+ trillion tokens of real production traffic across tasks and geographies; documents the rise of agentic inference and coding-assistance dominance in paid traffic.
    Relevance: precedes/orthogonal to C1 and C4 — production-scale token telemetry through a multi-provider gateway; validates that gateway-positioned measurement captures real usage distributions.
    Quotes: "In this work, we leverage the OpenRouter platform, which is an AI inference provider across a wide variety of LLMs, to analyze over 100 trillion tokens of real-world LLM interactions across tasks, geographies, and time."

[64] Anthropic (Societal Impacts team). "Anthropic Economic Index report: Cadences (June 2026)." Vendor research report, 2026. https://www.anthropic.com/research/economic-index-june-2026-report
    Theme: cost/token economics
    Claim: Privacy-preserving telemetry over Claude.ai, Claude Code, Cowork, and 1P API traffic; usage shifting from chat to long-running agentic tasks; output-token consumption rises with the estimated economic value of the artifact.
    Relevance: precedes C4 (vendor-side token telemetry as economic evidence); supports C1's premise that token volume, not just price, drives the cost of agentic work.
    Quotes: "We also see that more compute is associated with more valuable artifacts; the tokens a given output consumes rise with the estimated value of the work."

[65] Brown et al. "Large Language Monkeys: Scaling Inference Compute with Repeated Sampling." Preprint, 2024. https://arxiv.org/abs/2407.21787
    Theme: cost/token economics
    Claim: Coverage from repeated sampling follows an exponentiated power law over four orders of magnitude; on SWE-bench Lite, DeepSeek-Coder-V2 goes from 15.9% (1 sample) to 56% (250 samples) — token budget, not model alone, sets solved fraction.
    Relevance: orthogonal/precedes C1 — establishes inference-token volume as a scaling axis with quantifiable cost-benefit; the backdrop for harness token economics.
    Quotes: "When we apply repeated sampling to SWE-bench Lite, the fraction of issues solved with DeepSeek-Coder-V2-Instruct increases from 15.9% with one sample to 56% with 250 samples, outperforming the single-sample state-of-the-art of 43%."

[66] Pei et al. "How Do AI Agents Spend Your Money? Analyzing and Predicting Token Consumption in Agentic Coding Tasks." Preprint, 2026. https://arxiv.org/abs/2604.22750
    Theme: cost/token economics
    Claim: First systematic study of token consumption in agentic coding (8 frontier LLMs on SWE-bench Verified): agentic tasks use ~1000× more tokens than code chat; INPUT tokens, not output tokens, drive total cost; per-model token usage varies up to 30× on identical tasks.
    Relevance: orthogonal to C1 with one friction point — confirms token-type pricing asymmetry matters for agent economics, but finds input tokens dominate cost, which cuts against the output-verbosity mechanism being primary; does not compare harness cost rankings across providers. Addressed in Part C.
    Quotes: "(1) agentic tasks are uniquely expensive, consuming 1000x more tokens than code reasoning and code chat, with input tokens rather than output tokens driving the overall cost"

### Theme 10 — Model routing and cascades

[67] Chen, Zaharia and Zou. "FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance." Preprint, 2023 (reported TMLR 2024; primary page bot-gated). https://arxiv.org/abs/2305.05176
    Theme: routing/cascades
    Claim: Surveys LLM API pricing (fees differing by two orders of magnitude) and proposes an LLM cascade matching GPT-4 at up to 98% cost reduction.
    Relevance: precedes C1 — provider pricing heterogeneity makes cost-optimal model choice query-dependent; operates at model-selection level, never varies output:input price ratios or harnesses.
    Quotes: "Our experiments show that FrugalGPT can match the performance of the best individual LLM (e.g. GPT-4) with up to 98% cost reduction or improve the accuracy over GPT-4 by 4% with the same cost."

[68] Ong et al. "RouteLLM: Learning to Route LLMs with Preference Data." Preprint, 2024 (reported ICLR 2025; primary page bot-gated). https://arxiv.org/abs/2406.18665
    Theme: routing/cascades
    Claim: Trains routers on human preference data to pick between a strong and a weak LLM per query, cutting cost over 2× in some cases without quality loss.
    Relevance: precedes C1 — which model serves a request dominates cost; evaluated on chat benchmarks, not agent harnesses, so harness-level cost ranking remains open.
    Quotes: "Our evaluation on widely-recognized benchmarks shows that our approach significantly reduces costs-by over 2 times in certain cases-without compromising the quality of responses."

[69] Hu et al. "RouterBench: A Benchmark for Multi-LLM Routing System." Preprint, 2024. https://arxiv.org/abs/2403.12031
    Theme: routing/cascades
    Claim: Standardized evaluation framework plus 405k+ inference outcomes from representative LLMs, with a theory formalizing routing quality/cost trade-offs.
    Relevance: precedes C1, orthogonal to C4 — benchmarks routers across models but holds the workload fixed; nothing about harness presentation or per-provider price ratios.
    Quotes: "we present RouterBench, a novel evaluation framework designed to systematically assess the efficacy of LLM routing systems, along with a comprehensive dataset comprising over 405k inference outcomes from representative LLMs"

[70] LiteLLM team. "Auto Router cost/quality benchmark." Vendor documentation/blog, accessed 2026-09-29. https://docs.litellm.ai/blog/auto-router-cost-quality-benchmark
    Theme: routing/cascades
    Claim: A 4-tier classifier router is 40.4% cheaper at 97.1% quality on 220 live-proxy prompts, but savings are 56–81% on short-answer benchmarks and only 21% on SWE-bench Lite, where long prompts dominate spend; documents session affinity to preserve prompt caches across routing.
    Relevance: supports C1 and C3 — independent vendor evidence that a cost intervention's benefit is workload-dependent on agentic coding tasks, and that routing × prompt-cache interaction is a live design constraint; its per-request cost header parallels C4's instrumentation.
    Quotes: "Repo-level work saves the least. Those prompts are long enough to dominate absolute spend, and the classifier correctly declines to send them to Haiku." / "Session affinity already lets you keep a conversation on the model its first turn picked, so the cache holds for the rest of that conversation."

*Verified but omitted for space (all fetched and confirmed; available as spares):* OSWorld (arXiv:2404.07972); WebArena (arXiv:2307.13854); SWE-bench-Live (arXiv:2505.23419); The SWE-Bench Illusion (arXiv:2506.12286); When Benchmarks are Targets (arXiv:2402.01781); Dropping Just a Handful of Preferences (arXiv:2508.11847); Gorilla (arXiv:2305.15334); Tool Learning survey (arXiv:2405.17935); ToolACE (arXiv:2409.00920); ToolEyes (arXiv:2401.00741, COLING 2025); Cloudflare "Code Mode" design post (blog.cloudflare.com/code-mode/); CaveAgent (arXiv:2601.01569); FastMCP CodeMode docs; s1 budget forcing (arXiv:2501.19393); SGLang/RadixAttention (arXiv:2312.07104); CacheBlend (arXiv:2405.16444, reported EuroSys 2025); EPIC (arXiv:2410.15332); Reflexion (arXiv:2303.11366); Plan-and-Solve (arXiv:2305.04091); LLMLingua (arXiv:2310.05736); Lost in the Middle (arXiv:2307.03172); MemGPT (arXiv:2310.08560); PromptRobust (arXiv:2306.04528); Rethinking Benchmark and Contamination (arXiv:2311.04850); Data Contamination Quiz (arXiv:2311.06233, reported TACL); OpenHands platform paper (arXiv:2407.16741 — no cost/token content in abstract); SWE-Lancer (arXiv:2502.12115); Terminal-Bench lead corrected (see unverified §); Inference Scaling Laws (arXiv:2408.00724); Mélange (arXiv:2404.14527); METR time horizons (arXiv:2503.14499); GDPval (arXiv:2510.04374); Hybrid LLM (arXiv:2404.14618); GraphRouter (arXiv:2410.03834); unified cascade routing (arXiv:2410.10347); Arch-Router (arXiv:2506.16655); Concise Thoughts (arXiv:2407.19825); Gemini caching docs (ai.google.dev/gemini-api/docs/caching); DeepSeek pricing (api-docs.deepseek.com/quick_start/pricing/).

---

## Part B — Related-work section draft (1,385 words)

**Cost is already a first-class axis of agent evaluation — under one price schedule at a time.** A line of work argues that agent benchmarks must report dollars, not only accuracy: Kapoor et al. show that accuracy-only evaluation produces needlessly costly agents and mistaken attributions, and demonstrate joint cost–accuracy optimization [41]; Agentless [42] and AutoCodeRover [43] report cost per resolved SWE-bench issue ($0.70, $0.43) next to resolution rate; TheAgentCompany defines an explicit cost-per-instance metric — one that, tellingly, *assumes no prompt caching* [44]; the Holistic Agent Leaderboard logs per-task cost across 21,730 rollouts spanning nine models and nine benchmarks [48]; and Efficient Agents decomposes framework design choices into a "cost-of-pass" on GAIA [61]. Production telemetry underwrites the stakes: agentic coding tasks consume roughly 1000× more tokens than code chat, with per-model token usage varying up to 30× on identical tasks [66], and gateway-scale studies document the shift of paid traffic toward agentic, coding-dominated workloads [63, 64]. Every one of these results is produced under a single provider's price card. None asks the question we ask: does the ranking survive a change of pricing?

**That omission matters because rankings of LLM systems are fragile almost everywhere they have been audited.** The same model swings from 2.7% to 28.3% on SWE-bench Lite purely by changing scaffold [2]; undisclosed private variant testing distorts the most-cited public leaderboard [5]; 61 models × 24 benchmarks produce mutually contradictory rankings with "little external validity" under direct evaluation [6]; and code benchmarks reshuffle dramatically under semantic-preserving mutation [60]. The most proximal cluster is from 2026 and studies the *harness* explicitly: the Scaffold Effect paper finds harness choice induces up to 40× differences in tokens per solved task at pass-rate gaps of only 0–8 points [7]; Han and Sun fit interaction models to the Terminal-Bench 2.0 leaderboard and find harness×model interaction effects comparable in size to the main effects [8]; Zhang et al. measure harness-induced variance at 7.8× model variance with 6-of-9 model-pair ranking reversals across harnesses, and declare harness-blind comparisons "incomplete and potentially misleading" [9]. One result cuts the other way: across 33 scaffolds, rank-order prediction remains stable under scaffold shift even when absolute scores do not [10] — quality rankings may transfer even where absolute numbers do not. All of this work varies the model or the scaffold and reads out accuracy. The transfer question is open precisely on the cost axis, where the outcome is dollars and the manipulated variable is the provider's price structure.

**Tool-interface design is known to matter — on selection accuracy, not on request economics.** Retrieval-over-catalogs has been the standard architecture since ToolLLM [13]. That presented-tool count degrades behavior is asserted by the vendor itself past ~30–50 tools [11], quantified on internal MCP evals [12], and confirmed in controlled settings: distractor-tool stress tests collapse selection accuracy from 43% to 14% without retrieval [14], shortlist length changes a frontier model's pick rate [17], and trajectory analyses of 300+ interdependent tools name retrieval saturation as the top bottleneck [16]. One controlled study pushes back: across 1–128 equipped tools, Toolshed finds agent accuracy flat at 97–100% on a benchmark of non-overlapping tools, and its authors attribute the null to the absence of schema overlap [15]. SWE-agent's ACI study established interface design as an experimental factor for success rate [50], and mini-SWE-agent shows a one-tool harness is competitive on SWE-bench Verified [45]. What none of these measures is the variable that costs money: the number of model requests a run makes. Our C2 is, to our knowledge, the first within-harness manipulation of presented-tool count with request count as the outcome, measured on two providers.

**Code-mode tool calling carries vendor-scale token claims and one academic crossover — none of it priced across providers.** CodeAct established executable code as an action space, improving success by up to 20 points [24]. Anthropic reports a 98.7% token reduction in a worked MCP example [22] and −38% billed input on a 75-tool agent — alongside a ~8% cost *increase* on sequential single-call τ²-bench traffic, a vendor-documented sign reversal attributed to workload [19]. Cloudflare puts schema-presentation load at 1.17M tokens for a full API, cut ~99.9% by Code Mode [23]. The strongest academic comparison finds a token crossover at fan-out N≈26 — below which code-mode is *more* expensive — and reports output token counts equal across paradigms in its echo-stub setting [20]; a five-interface study places PTC between typed calls and bash on quality and tokens [21]; and Strands' CodeAgent reports output shrinking less than input (−67% vs −78%) [26]. None varies the output:input price ratio or decomposes billed cost into request count and output volume; and the output-token-equality finding of [20] — synthetic, single-turn — contradicts the 1.8× output-verbosity difference we measure on real coding tasks (F13), a tension the paper addresses head-on.

**Output length is a recognized confound everywhere except where it bills.** LLM judges favor longer answers [27]; debiasing for length materially changes leaderboard agreement [28]; reasoning models overthink trivial problems [29], a verbosity partly attributable to RL loss dynamics [31]; and prompt-level token budgets compress reasoning at small accuracy cost [30]. This literature treats output length as a model or decoding property to be controlled. We treat it as a *harness* property — a function of presentation and tool ergonomics — and show it is the term whose price the provider sets.

**Prompt caching is well documented as mechanics and as practice, and almost unmeasured as a per-harness variable.** The invalidation hierarchy makes tool-schema edits cache-destroying by design [32]; cached state is machine-local and lost to overflow routing [33]; practitioners elevate hit rate to the top production metric [34] and prescribe cache-fraction dashboards [40]; serving research built the reuse machinery [37]. Closest to our setting: LiteLLM's Terminal-Bench benchmark publishes per-arm cache hit rates from gateway spend logs — router arms 78–83%, fixed models 89–93% — where, echoing C3, the cheapest arm had the *highest* hit rate [35]; per-turn routing destroys the cache and can cost more than any fixed model [36]; production Copilot traces put hit rates at 90% within-turn and 55% cross-turn, with model switches and compaction as quantified invalidators [38]; and caching yields 41–80% cost reductions across three providers on long-horizon agentic tasks [39]. What is missing is the link from per-harness cache discipline to the billed-cost *ranking*: our −5% finding, with the cheapest arm at the *worst* hit rate, tests the practitioner consensus [34] exactly where it has been asserted rather than measured.

**Methodology.** Our statistical posture follows the experiment-analysis literature [55, 56] and the measured nondeterminism of nominally deterministic LLM serving [57]; standardized-conditions evaluation is the HELM legacy [59]; and a 254-submission audit shows SWE-bench's top entries are statistically inseparable while within-model scaffold ranges reach 29.8 points [58]. These results justify the blocked design, per-seed randomization, Holm correction — and the retraction of a claim that "replicated" on a single task.

**Routing prices the model choice, not the harness ranking.** Cascades and routers exploit provider price heterogeneity per query [67, 68], with dedicated benchmark infrastructure [69]; on agentic coding traffic the savings collapse to 21% (against 56–81% on short-answer benchmarks), and session affinity is documented as necessary to preserve prompt caches across routing decisions [70]. Provider choice is thus already understood as a cost variable. What has not been shown is that it *reorders the harnesses*.

**Novelty statement.** We claim only the intersection, not the territory. To our knowledge, no prior work: (a) measures the billed-cost ranking of coding-agent harnesses while manipulating the provider's output:input price ratio, and demonstrates a ranking reversal between two providers; (b) attributes that reversal to a harness-controlled output-verbosity mechanism using provider-reported per-request accounting, with cache hit/miss split captured at a gateway; or (c) isolates presented-tool count as a manipulated factor on model-request count within a coding harness, replicated across two providers. Each neighboring piece exists — harness effects on score [7, 8, 9], tool-count effects on selection accuracy [14, 17], code-mode token effects with a workload-dependent sign [19, 20, 21], per-arm cache-hit measurement at a gateway [35], and model-level pricing reversals [62] — but none varies the price ratio, none measures harness cost rankings across providers, and none links the cache to the ranking it is claimed to drive. Where prior work contradicts us at the mechanism level [15, 20, 66], we cite it in the threat analysis rather than around it.

> **Correction 2026-09-30.** The "ranking reversal" language used throughout this document (the
> novelty statement above, Part C's T1, Part D) was computed with the retracted DeepSeek card —
> ratio 2.0 — and a cost function that omitted the output term. The corrected card gives **4.00**.
> State the result as *the ranking does not transfer*, not as a reversal (`notes/records/FINDINGS.md` F20;
> `notes/reviews/CRITICAL-REVIEW.md` §3.3).

---

## Part C — Threat list (what a reviewer cites as "this has been done"), ranked by damage

**T1. The Scaffold Effect in Coding Agents [7] (arXiv:2607.22585, preprint, June 2026).** *The top "this has been done" risk.* Covers: harness choice as an explicit independent variable in coding-agent evaluation; up to 40× token-per-solved-task difference for the extreme harness pair (unpriced tokens with cached counted at par and failures amortized; adjacent pairs are 1.2–1.9×); a recommendation to report token usage and full harness specs alongside any model comparison; failure modes found "largely model-independent" across 2 models. Does NOT cover: provider pricing as a variable (single pricing regime throughout); any ranking reversal — its harness effects replicate across models, which is the *opposite* sign of our C1 interaction; no cache accounting; no request-count decomposition (tokens per task only); 2 models × 50 tasks, preprint with no peer venue. **Differentiate or die:** cite it in the first paragraph of the paper and frame C1 as adding the provider-pricing axis and the reversal; note its model-independence finding is exactly what our provider-dependence result complicates.

**T2. The Bitter Lesson of Tool Calling [20] (arXiv:2608.06370, preprint, 2026).** *The sharpest mechanism-level attack.* Covers: controlled programmatic-vs-JSON tool-calling comparison across 14 models on BFCL v4; a token crossover at fan-out N≈26 where code-mode is more expensive below it; 1.5× input-token overhead on chaining; and — stated in its limitations — "output token counts do not differ across paradigms," a direct counter to C1's output-verbosity mechanism. Does NOT cover: real coding tasks (echo-stub, single-turn function calling); provider pricing or price ratios (cost = token counts under one implied schedule); request-count economics in an agent loop; billed dollars. **Defense:** our mechanism is measured on real multi-step coding tasks where tool results re-enter context (F13: 1.8× output difference); their setting structurally suppresses output divergence. Cite it pre-emptively in the mechanism section.

**T3. When Cheaper Reasoning Models End Up Costing More [62] (arXiv:2603.23971, preprint, 2026).** *Anticipates the framing at model level.* Covers: "pricing reversal phenomenon" — in 32% of model pairs the cheaper-listed model costs more (up to 28×), driven by thinking-token volume; up to 9.7× run-to-run cost variance. Does NOT cover: harnesses (varies models, one agent setup); the output:input price ratio as a manipulated variable; any harness ranking. **Note:** its variance figure independently supports our multi-seed design and our retraction — use it as an ally, not just a threat.

**T4. Anthropic's programmatic-tool-calling documentation [19].** *Vendor-published sign reversal.* Covers: −38% billed input on a 75-tool agent; 20–40% savings at 10–49 tool definitions; ~8% cost *increase* on τ²-bench sequential single-call traffic; +11% accuracy with −24% input tokens on BrowseComp/DeepSearchQA. Does NOT cover: cross-provider replication; manipulated presentation with run-level identity (their numbers are observed traffic stratification); request-count decomposition; dollar costs under differing price ratios. A reviewer can say "the vendor already showed code mode's cost advantage is conditional" — our answer is that we name the *pricing* condition and measure the reversal, where they observe a workload effect on one provider.

**T5. Is Bash All You Need? [21] (arXiv:2609.11999, preprint, 2026).** Covers: five tool interfaces — including PTC — compared on tokens and quality across two providers' frontier models (Opus-4.8, GPT-5.5) on two enterprise-agent benchmarks; PTC lands between typed calls and bash. Does NOT cover: cost decomposed by input/output price ratio (tokens and aggregate cost efficiency only); within-harness manipulation of presentation (interfaces differ across systems, not within one harness); cache; request counts as an outcome. Closest existing "multi-provider interface cost comparison" — cite and differentiate on the price-ratio axis.

**T6. Han & Sun [8] and Stop Comparing LLM Agents [9] (2026).** Cover: harness×model interaction effects comparable to main effects (Terminal-Bench 2.0, 105 pairs); harness-induced variance 7.8× model variance with 6-of-9 model-pair ranking reversals (SWE-bench Verified); policy claim that harness-blind comparisons are misleading. Do NOT cover: the outcome is accuracy, not dollars; the varied axis is the harness or model, not the provider's price structure; no mechanism for *why* a ranking flips. Our C1 is the cost-axis, provider-priced counterpart — citing them turns the threat into support.

**T7. Efficient Benchmarking of AI Agents [10] (arXiv:2603.23749, preprint, 2026).** *Contradicts the broad reading of C1.* Covers: rank-order prediction remains stable under scaffold-driven distribution shift across 8 benchmarks, 33 scaffolds, 70+ model configs. Does NOT cover: cost rankings (accuracy only); provider pricing; billed dollars. **Plain statement:** if a reviewer reads C1 as "no agent ranking ever transfers," this paper is counter-evidence; our claim is specifically about *cost* rankings under *price-structure* changes, which their design does not touch.

**T8. LiteLLM's Terminal-Bench auto-router benchmark [35] (vendor, 2026).** *The closest prior art to C4.* Covers: an HTTP gateway between agent and provider; cost from gateway spend logs; a per-arm "Cache hit" column across 8 arms of a real agent benchmark (routers 78–83%, fixed models 89–93%); and an implicit C3-echo — the cheapest arm (Haiku-only) had the *highest* hit rate. Does NOT cover: harness arms (the varied factor is the routing classifier, not tool presentation); two providers or two wire protocols; per-run attribution embedded in credentials (attribution is per-arm, by separate runs); a cost_billed vs cost_cold decomposition. **Recommendation:** cite proactively and position C4 as generalizing this methodology — per-run attribution via the synthetic credential and provider-own cache accounting across two protocols — rather than claiming gateway measurement itself.

**T9. Lumer et al., prompt-caching evaluation [39], and Agentic Coding in the Wild [38] (preprints, 2026).** *C3's cache analysis is "already characterized" — at the wrong granularity.* Cover: 41–80% API cost reduction from caching across three providers on 500+ agent sessions [39]; production-scale hit rates (90% within-turn, 55% cross-turn) with quantified invalidation causes (model switches, compaction) [38]. Do NOT cover: per-harness hit rates linked to a cost *ranking*; the negative result that cache discipline does not drive the spread; the practitioner claim they leave standing — that hit rate is *the* lever [34] — is exactly what C3 tests and rejects.

**T10. Toolshed [15] (ICAART 2025).** *The C2 null result.* Covers: controlled variation of equipped-tool count (1–128) with agent accuracy flat at 97–100% on Seal-Tools. Does NOT cover: request count or cost as outcomes; coding harnesses; overlapping tool schemas (their own stated caveat — Seal-Tools' tools are non-overlapping, and they warn the null may not transfer). **Plain statement:** this is the closest thing to a falsification of C2's generality; our framing — the effect on *request count* within a harness whose 24 schemas overlap in function — is compatible with their mechanism-level prediction.

**T11. AI Agents That Matter [41] and HAL [48].** Cover: cost as a first-class agent-evaluation metric; cost-controlled agent design; a multi-model × multi-scaffold leaderboard with per-task cost logging. Do NOT cover: provider pricing variation; harness-cost reversals; per-request provider accounting. Expect "cost-aware agent evaluation exists" reviews; both predate us and neither touches the price-ratio axis.

**T12. How Do AI Agents Spend Your Money? [66] (arXiv:2604.22750, preprint, 2026).** *Friction with the mechanism.* Covers: token consumption of agentic coding across 8 frontier models; finds INPUT tokens, not output, drive total cost. Does NOT cover: harness comparisons (varies models); provider price-ratio interactions. **Address directly:** our F2 agrees that steps and input tokens dominate the spread on DeepSeek's 2× schedule; the C1 mechanism is about what happens to the *margin between two harnesses* when output is repriced at 3.33× — a question their single-schedule design cannot speak to.

**T13. Why the SWE-bench Leaderboard Can No Longer Order Its Top Entries [58] (preprint, 2026).** Covers: within-model scaffold ranges up to 29.8 points, with proper multiple-comparison correction — scaffold sensitivity documented with the statistical rigor we espouse. Does NOT cover: cost, providers, manipulated presentation. Cite it as precedent for scaffold sensitivity; frame C2 as the *cost-metered, manipulated* version.

**Unverified threats to chase before submission** (seen only in reference lists or search snippets — do not quote): E-Bench (arXiv:2607.23722), whose snippets claim code execution cuts interaction cost; Yang et al. (arXiv:2607.10569), a code-only-output ablation on coding-agent tasks with <3% pass-rate change; Sen et al., "Is grep all you need?" (arXiv:2605.15184), harness-presentation effects on agentic search; Meta-harness (arXiv:2603.28052), automated harness optimization; "Agent Harness Engineering: A Survey" (OpenReview forum eONq7FdiHa, captcha-blocked), which reportedly argues current evidence does NOT establish the harness matters more than the model; an MDPI Electronics paper (15(14):3175, bot-walled) that reportedly ablates candidate tool pools of 4–24 — extremely close to C2's manipulation; Not Diamond's pointer to "industry and academic reports" that some harnesses are more cost-efficient [36]; StateM blog claims of a runtime layer driving Terminal-Bench scores at wildly different API costs ($15 vs $574).

---

## Sources I could not verify

Presence of this section is deliberate: these candidates were dropped or downgraded, not silently absorbed.

**Wrong identifiers in our own project notes** (corrected where possible):
- `arXiv:2409.00917` for "ToolACE" — resolves to a brain-MRI registration paper (learn2reg 2024). The real ToolACE is `arXiv:2409.00920` (verified; orthogonal training-data work, not cited).
- `arXiv:2507.21025` for "Terminal-Bench" — resolves to a pure-math paper (Fulman, finite classical groups). The real Terminal-Bench paper is `arXiv:2601.11868` [3].
- `arXiv:2412.10431` for "Mélange" — resolves to "CUPS" (3D human pose). The real Mélange is `arXiv:2404.14527` (verified; omitted for space).
- "Data Contamination: From Memorization to Explanation" at `arXiv:2311.06233` — that ID is "Data Contamination Quiz" (Golchin & Surdeanu, reported TACL). Lead title was wrong; the paper is real but not cited.

**Blocked pages (content unreadable, dropped):**
- MDPI Electronics 15(14):3175 — Akamai interstitial; snippets suggest a 4–24-tool pool-size ablation directly adjacent to C2. Must be checked before submission.
- OpenReview forum pages (Han & Sun [8]; "Agent Harness Engineering: A Survey") — captcha/bot walls; [8] was verified via the official OpenReview PDF instead, the survey remains unverified.
- OpenReview venue pages for RouteLLM (reported ICLR 2025), FrugalGPT (reported TMLR 2024), Hybrid LLM (reported ICLR 2024) — bot-gated; venues corroborated by citing papers only, and marked "reported" above.
- openrouter.ai/state-of-ai landing — JS shell on fetch; the arXiv version [63] was used instead.

**Not fetched (seen only in reference lists or snippets; do not quote):** E-Bench (arXiv:2607.23722); Yang et al. (arXiv:2607.10569); "Is grep all you need?" (arXiv:2605.15184); Meta-harness (arXiv:2603.28052); Sketch-of-Thought (arXiv:2503.05179); "The Cost of Thinking" — the only verified paper of that exact name is a jailbreak-safety paper (arXiv:2508.10032), off-theme; Ouyang et al., TOSEM 2025, ChatGPT nondeterminism in code generation; Biderman et al., "Lessons from the Trenches" (arXiv:2405.14782); Gema et al., "Are We Done with MMLU?" (arXiv:2406.04127); Thinking Machines, "Defeating Nondeterminism in LLM Inference"; the Cognition "Don't Build Multi-Agents" post; Helicone/Langfuse/LangSmith cache-dashboard docs (referenced by [40] but not directly fetched); BFCL leaderboard page (gorilla.cs.berkeley.edu — capability benchmark, no tool-count ablation; not cited); SWE-bench Multilingual (no paper exists; official swebench.com blog only).

**Venue uncertainties carried into Part A** (marked there, repeated here): [37] MLSys 2024, [67] TMLR 2024, [68] ICLR 2025, [3] ICLR 2026 are "reported" via citing papers or secondary listings; [53] LongLLMLingua's ACL 2024 Findings attribution could not be confirmed (Semantic Scholar rate-limited throughout) and it is entered as a preprint; CacheBlend (omitted) has a venue discrepancy — Semantic Scholar says ACM TOCS, citing papers say EuroSys 2025.

**Infrastructure note for reviewers-of-method:** Semantic Scholar's API returned HTTP 429 for most of the preparation window, so citation chaining was done through arXiv pages, citing-paper bibliographies, and web search rather than systematic forward-citation sweeps. A dedicated pass with a working citations API may still surface 2026 papers this document missed — in particular anything published after ~August 2026.

---

## Part D — Follow-up (second pass, 2026-09-29)

The narrowed claim under test: *rankings of coding agents by cost do not transfer across providers whose output:input price ratios differ, and the mechanism is the ratio itself rather than a property of the harness.* Measured: DeepSeek V4.1 Flash (ratio **4.00** — the 2.0 printed here until 2026-09-30 came from the retracted card, and the 22.8% figure was computed under it; see F20), code-mode 22.8% cheaper; GLM-5.3-Flash (ratio 3.33), advantage absent. This pass was adversarial: two kill-searches, three confirmations, one new angle. New verified entries are added as an addendum ([71]–[77]) rather than disturbing Part A's numbering.

### D.1 Answer to Question 1 — has anyone measured agent cost across providers whose pricing differs?

**No prior work found.** Nothing located — academic or vendor — measures coding/LLM-agent cost (dollars or billed tokens) across providers as a function of differing price *structure* (output:input ratio, cache-discount depth, tiering). The claim survives this pass.

Searched (2026-09-29): cost-per-solved-task across providers; price-aware agent evaluation; token price ratio output:input studies; SWE-bench cost comparisons by provider; multi-provider benchmarks with dollars as outcome; cost-aware model selection with pricing structure as variable; cache-discount effects on cost rankings; OpenRouter/Artificial Analysis cost-per-task methodology; "cost-of-pass" frameworks. Every hit either varies models/harnesses under one price sheet or aggregates provider prices away.

The five nearest misses, each confirmed by fetching:

- **Chen et al. [62]** — the "pricing reversal" paper — varies *models* under listed per-model prices; the reversal mechanism is thinking-token heterogeneity, never a provider's price structure. Model-level reversal is known; provider-structure reversal is not.
- **Singh et al., "Total Cost of Agency" [71]** *(new — the closest neighbor, must-cite)* — one provider, model tiers held fixed, caching unevaluated; but its Limitations section states the ratio mechanism explicitly as an *untested* assumption: "Tier-independence depends on a price-ratio assumption… Under a cheaper tier with a relatively higher input-to-output ratio the curves would separate, and under the opposite skew they would cross. Token counts are unaffected, but any share-of-cost figure must be recomputed per provider." The effect is named as a caveat; nobody has measured it. We do.
- **Pei et al. [66]** — varies eight *models* on SWE-bench Verified; "input tokens rather than output tokens driving the overall cost." No provider dimension. This is the reviewer lever against our output-verbosity mechanism and must be engaged in the threats section (see Part C, T12).
- **Mak et al. [21]** — five interfaces across two providers' models, but tokens are pooled; no decomposition by each provider's tariff, no dollar outcome per price schedule.
- **Artificial Analysis methodology (vendor)** — the canonical cost-per-task leaderboard *blends away* the provider dimension: "Price is either the provider's first-party API rate or the median across all providers," with a blended price "assuming a 7:2:1 ratio of cache hit, input, and output tokens." The field's standard practice is to collapse price structure into a median precisely to avoid the question we ask.

### D.2 Answer to Question 2 — has anyone captured provider cache accounting per request, attributed to a run?

**Partial yes on the components; no on the conjunction; nobody found embeds run identity in the credential.** C4's novelty narrows but survives: the defensible claim is the *conjunction* — provider-reported per-request cache fields + per-run attribution that is structural (credential-embedded) rather than inferential (tags, sessions, log reconstruction).

Component map:

| component | exists? | who, in what form |
|---|---|---|
| per-request provider-reported cache fields (`cached_tokens`, `cache_read_input_tokens`) | yes | CacheProbe [72] (as ground truth, security audit); Spell [73] (per-call cached/uncached stratification); OTel GenAI conventions [47]; Langfuse ingestion docs |
| per-run / per-task attribution | yes | Spell [73] (per-task via harness adapter, $5 caps); Braintrust [75] (`agent_run_id` span metadata); LiteLLM [46] (per-key/per-tag spend) |
| **credential-embedded run identity** | **nobody found** | LiteLLM/agentgateway virtual keys are per-user/app; tags are side-band metadata; OpenAI's `prompt_cache_key` is "a routing hint rather than a true cache namespace" [72] |
| gateway as measurement instrument for agent comparison | weak form | LiteLLM [35] (per-arm spend logs); Claw-SWE-Bench [74] (per-cell billing logs) |

Two honorable near-neighbors, stated precisely:

- **Claw-SWE-Bench [74]** takes total cost "from the corresponding API provider or cache-proxy billing logs," reports per-cell cache hit rate "as a diagnostic field for cost accounting," and then cedes the per-request ground in its own limitation: "future releases should also retain raw token traces so that cost differences can be audited and re-priced."
- **CAPC [76]** tags every cached prefix with a per-run UUID to prevent cross-run cache pollution ("every cached prefix is tagged with a per-run UUID (RUN_NONCE in our codebase)") — run identity embedded in request *content* for cache isolation, not in the *credential* for billing attribution. Closest idea in the literature; different carrier, different purpose.

Also noted for methods: CacheProbe [72] demonstrates that a gateway's shared organizational credential merges the prompt cache across all its users — which is exactly the mechanism our synthetic-credential design exploits deliberately (all runs share the real key upstream; the synthetic key is only the attribution label). Cite it as the security-side characterization of the same phenomenon.

### D.3 Confirmations

**1. Entry [8] (Han and Sun) — CONFIRMED, entry updated in place.** The OpenReview PDF resolves; title and author block match ("Jiwoo Han 1 Yuekai Sun 1" — exactly two authors, Department of Statistics, University of Michigan). The venue is settled by the PDF's own footer, a primary source: "Accepted to the 1st Workshop on Combining Theory and Benchmarks, CTB@ICML 2026, Seoul, South Korea." CTB's existence and scope independently confirmed via the official ICML 2026 workshops announcement and the workshop homepage (non-archival proceedings). The canonical forum is `QI8z3skBwt` (human-openable, bot-walled to automated fetch); the URL in the entry is a PDF content hash and resolves cleanly. The OpenReview API venue strings remain unverified (challenge-walled) — immaterial, since the venue comes from the paper itself. One soft note: Yuekai Sun's homepage papers list does not yet include it (neutral; workshop papers are commonly omitted).

**2. The four prizes — all four were hunted by dedicated adversarial agents in the first pass, including the two named here.** Prize 3 (code-mode vs native tool calling *on cost*): **exists** — vendor-published (Anthropic PTC docs [19], including the τ²-bench +8% sign reversal; Strands CodeAgent [26]) and academic-preprint (Bitter Lesson [20], token crossover at N≈26; Is Bash All You Need? [21], five interfaces across two providers' models). None varies the provider price ratio; all are in Part A and Part C (T2, T4, T5). Prize 4 (tool count *does not* affect behavior): **no standalone null result found**; the closest is Toolshed [15] — agent accuracy flat at 97–100% across 1–128 equipped tools on Seal-Tools, a dataset of *non-overlapping* tools, with the authors themselves warning the null may not transfer to overlapping/sequential settings. It is cited in Part A and Part C (T10) as the partial contradiction it is.

**3. The 40× figure in [7] — a different quantity; consistent with our 46%, not contradictory.** From the paper's own methods (fetched full text, arXiv:2607.22585v1): (a) the metric is "the harness-emitted ATIF total of prompt + completion + cached tokens… we do not normalize across providers" — unpriced tokens, cached at par; (b) "Tokens per solved task is amortized: the cell-wide sum of tokens_total divided by the cell's solved count… Failed and infrastructure-error trials *are* included in the numerator"; (c) the 40× is the max/min extreme pair (OpenCode vs Goose) pooled over both models — the paper's own bootstrap CIs show OpenHands vs Goose at ~20–30× and OpenCode vs OpenHands at only ~1.2–1.9×; (d) no dollar model exists in the paper ("~40× more tokens means ~40× more API spend, all else equal" — and all else is not equal: cached input is discounted 5–50× — **50× on DeepSeek's corrected off-peak card**, 10× at Anthropic, 5× at GLM — and output priced 2–8× input at every current provider). The driver they identify — idle turns re-sending accumulated history ("Each no-action turn carries a full context window of input tokens") — inflates the *cheapest* token class. Our quantity is a *median* spread in *priced dollars* conditioned on *equal solve rate*; theirs is an *extreme-pair* ratio of *unpriced tokens* amortizing failures. Their adjacent-pair ratios (1.2–1.9×) are the same order as our 46%. Entry [7] and threat T1 have been tightened to describe the figure as a token ratio, never a cost ratio — and if a reviewer claims 40× contradicts 1.46×, the answer is: median vs extreme pair, dollars vs unpriced tokens.

### D.4 New angle — pricing shape as an independent variable

**Partially staked out — input side only — by CAPC [76] (Song, arXiv:2607.15516, preprint, Jul 2026).** CAPC derives the optimal *prompt design* from the cache schedule's *shape*: write premium α, read discount β, and a measured ~3,500-token two-tier threshold, with a provider-agnostic crossover formula (ρ_cross(r) = (α − 1/r)/(α − β)) and an explicit pricing sensitivity analysis ("less aggressive write pricing widens the regime in which query-aware compression dominates naïve caching"). Its related-work section hands us a citable confirmation that the routing canon treats "the per-model price as a *static constant*." Crucially, CAPC's design analysis *drops the output term* ("Dropping the common N(Dq·pin + O·pout) overhead") — output pricing is excluded by construction. Everything else treats money as a scalar: FrugalGPT/RouteLLM/cascade theory [67, 68, 69] optimize cost–quality given fixed per-model prices; TCA [71] names the ratio assumption as an untested limitation; practitioner writing documents 2–8× output:input ratios without design-optimality analysis. The intellectual ancestor outside LLMs is cost-aware design under spot pricing (Yi et al. [77], IEEE TSC 2012: checkpointing policy derived from price traces).

**Gap boundary:** the open territory is precisely the conjunction — the *output:input ratio* as the independent variable; the *agent harness presentation* (verbose native vs code-mode) as the design object; and a *measured ranking reversal across providers* as the phenomenon. CAPC's method (parametric cost model → crossover prediction → real-billing validation) is the template to cite and extend to the output side; its scope covers input-side discounts only.

### D.5 Addendum entries (second pass; verified 2026-09-29)

[71] Singh, Priyam and Bhowmick. "Total Cost of Agency: Exact Attribution of Memory Injection Cost in Multi-Agent LLM Workflows." Preprint, 2026. https://arxiv.org/abs/2609.23790
    Theme: cost/token economics
    Claim: Decomposes multi-agent workflow cost into base/inference/memory-injection/miss/accumulation with exact two-pass token attribution via the provider's tokenizer; memory injection is 13.6% of optimizable cost and grows with workflow depth; one provider, model tiers held fixed, caching unevaluated — and its Limitations state that cost-share figures are conditional on the provider's input:output price ratio.
    Relevance: closest neighbor to C1's mechanism — names price-ratio dependence as an untested assumption ("the curves would separate… would cross"); we measure the reversal it hypothesizes. Also the most rigorous token-attribution method seen (though not provider usage fields).
    Quotes: "Tier-independence depends on a price-ratio assumption… Under a cheaper tier with a relatively higher input-to-output ratio the curves would separate, and under the opposite skew they would cross. Token counts are unaffected, but any share-of-cost figure must be recomputed per provider." (§VIII, HTML v1)

[72] Fahey. "CacheProbe: Auditing Prompt Cache Isolation in Gateway APIs." SAGAI '26 (Secure Agents for Generative AI), co-located with IEEE S&P 2026 (workshop paper). https://arxiv.org/abs/2605.30613
    Theme: prompt caching / measurement
    Claim: Security audit showing a gateway's shared organizational credentials merge the prompt cache across all its users (OpenRouter default mode; ~9,000 requests, 3 providers); uses provider-reported cached_tokens as ground truth alongside timing signals; BYOK restores isolation.
    Relevance: precedes C4 — per-request provider-reported cache capture through a gateway exists; attribution there is scenario-granular (distinct keys per role), not per-run, and the aim is isolation auditing, not cost measurement. Its core finding is the security-side characterization of the credential-sharing mechanism our gateway exploits for attribution.
    Quotes: "For metadata analysis, we examine the cached_tokens field returned in API response usage metadata. Some providers explicitly report how many input tokens were served from cache, providing ground-truth evidence of cache utilization independent of timing signals."

[73] O'Connor. "Self-Programmed Execution for Language-Model Agents (Spell)." Preprint, 2026. https://arxiv.org/abs/2605.06898
    Theme: cross-harness cost measurement
    Claim: An agent architecture where the model completion is the orchestrator program; its evaluation tracks token usage per API call stratified by cached/uncached/output, applies per-task dollar caps, and reports per-item Cost/Uncached/Cached/Output on Terminal-Bench 1.1 and SWE-bench Lite — with cost reconstructed from a price table inside the harness adapter.
    Relevance: precedes C4 partially — per-call cached/uncached stratification and per-task attribution exist here, but capture is harness-side (not a gateway), priced from list rates, and attributed by task loop rather than by credential.
    Quotes: "Token usage was tracked per API call and summed across calls, stratified by token type (cached/uncached input, output, and output cache writes if priced differently)." (HTML v1)

[74] Zheng et al. "Claw-SWE-Bench." Preprint, 2026 (v2 Sep 2026). https://arxiv.org/abs/2606.12344
    Theme: cross-harness cost measurement
    Claim: 350 GitHub issue-resolution tasks across 8 languages with a shared adapter protocol for comparing general-purpose harnesses; total cost from provider/cache-proxy billing logs; per-cell cache hit rate reported as a cost-accounting diagnostic.
    Relevance: precedes C4 at cell granularity — and its limitation cedes per-request attribution as future work. Also precedes C1's premise: success and resource consumption "vary substantially even when the underlying model is held fixed" (harness effect under one pricing regime).
    Quotes: "We report cache hit rate as a diagnostic field for cost accounting, not as a measure of model or harness capability." / "cost analysis depends on provider-side pricing and cache accounting. We therefore report total API cost, input/output tokens, and cache hit rate together; future releases should also retain raw token traces so that cost differences can be audited and re-priced." (HTML v1)

[75] Braintrust. "How to track LLM costs (2026)." Vendor engineering blog, 2026. https://www.braintrust.dev/articles/how-to-track-llm-costs-2026
    Theme: cross-harness cost measurement
    Claim: Observability playbook: log provider-response token counts (closest to the invoice) including cached-token splits, and group multi-step agent executions under an agent_run_id for per-run rollups.
    Relevance: precedes C4's components in observability form — per-run attribution as span metadata at the call site, explicitly not credential-embedded; no benchmark, no harness comparison.
    Quotes: "Cross-provider comparisons should log the token counts returned by the provider response, because those counts are closest to the invoice" / "`agent_run_id` groups a multi-step agent execution into one rollup."

[76] Song. "Cache-Aware Prompt Compression: A Two-Tier Cost Model for LLM API Caching." Preprint, 2026. https://arxiv.org/abs/2607.15516
    Theme: prompt caching / pricing-shape-driven design
    Claim: Derives optimal prompt design from the cache schedule's shape (write premium α, read discount β, measured ~3,500-token two-tier threshold); provider-agnostic crossover formula with pricing sensitivity analysis; CAPC cheapest in 16/16 LongBench-v2 configurations and on τ-bench retail at equal reward; isolates runs with a per-run UUID prefix tag (RUN_NONCE); billing reconciles with published rates to <1%.
    Relevance: precedes the *input side* of C1's mechanism — pricing shape as an independent variable for system design — while explicitly dropping the output term; its scope note covers "a prefix-strict caching API with a cw>cr pricing structure" only. The template to cite and extend to the output:input ratio.
    Quotes: "Practitioners can plug their own measured α,β into (6) to derive the design rule for their deployment." / "less aggressive write pricing widens the regime in which query-aware compression dominates naïve caching." (HTML v1)

[77] Yi, Andrzejak and Kondo. "Monetary Cost-Aware Checkpointing and Migration on Amazon Cloud Spot Instances." IEEE Transactions on Services Computing, 2012. https://aip.ifi.uni-heidelberg.de/fileadmin/papers/2012/TSC_Journal_2012_-_Yi__Andrzejak__Kondo.pdf
    Theme: cost-aware system design (precedent)
    Claim: Derives checkpointing/migration policy (the system design) from spot-price dynamics (the pricing shape) using real price traces — the cloud-era ancestor of "pricing shape determines optimal design."
    Relevance: orthogonal precedent for C1's paradigm: provider economics as an independent variable for system design, pre-LLM.
    Quotes: "Using real price traces of Amazon's spot instances, we study various dynamic checkpointing strategies that can adapt to the current instance price and show their benefit compared to static, costignorant strategies."

### D.6 Additions to "Sources I could not verify"

- **The TCA price-ratio caveat** was first seen via a secondary summary (Emergent Mind); it has since been located verbatim in the primary source ([71], §VIII of the HTML v1) and is quoted from there. The secondary source is no longer needed.
- **Gu et al., "Auditing prompt caching in language model APIs"** (ICML 2025, PMLR) — corroborated by CacheProbe's reference list and abstract [72] but not independently fetched.
- **"Don't Break the Cache"** (Lumer et al., 2026) and semantic-caching papers (vCache, GenCache) — seen only inside CAPC's related work [76]; not fetched.
- **Bergemann et al., "Token Allocation, Fine-Tuning and Optimal Pricing" (arXiv:2502.07736)** and a "Menu Pricing of LLMs" paper — search snippets only; appear to be provider-side price-*setting* theory, not design response to pricing shape. Worth one follow-up fetch if an economics cite is wanted.
- **Helicone prompt-caching changelog** — JS-rendered; no quotable telemetry content.
- **ACM DOI 10.1145/3814940.3815325** — paywalled (403); its IBM Research page shows it varies schema-pruning methods, so it is not a Q1 hit regardless.
- **OpenReview API venue strings for [8]** — challenge-walled; venue confirmed from the PDF footer instead.
- **Nemeda manifesto; "Spot-on" (arXiv:2210.02589); DeepSpotCloud** — not fetched; pricing-shape ancestors if [77] needs company.
- **Artificial Analysis methodology page** — fetched and quoted by the swarm (vendor source); used as a nearest miss in D.1 rather than as a bibliography entry.

---

## Part E — Third pass (2026-09-29)

The claim under test has moved: *the cost penalty of code-mode presentation scales with output's share of the total bill* — prompted by two providers with near-identical output:input ratios (3.14, 3.33) differing ~31pp in the code-mode penalty, which a ratio-only account cannot explain. Two adversarial hunts plus a first-hand re-read of [7].

### E.1 Answer to Question 1 — has anyone studied output share as a determinant of which design is cheaper?

**No prior work found.** No published source conditions the choice of agent/tool *presentation* on output's share of the bill. One qualification, stated precisely because it bounds how the novelty claim may be phrased: a vendor blog ([78], Coralogix) conditions the choice of *cost lever* on the output:input ratio — "A 2,000-token prompt driving 200-token answers is input-heavy, so caching offers the larger gain. A 500-token prompt driving 2,000-token answers is output-heavy, so length controls help more. You should track the ratio by workflow because one global average can hide both patterns." That is untested practitioner guidance about which *lever* to pull, not which agent design is cheaper, and it measures nothing. So the defensible phrasing is: **no prior work conditions the choice of agent or tool presentation on output share** — not the stronger "no work conditions any cost decision on output share."

The closest controlled works condition on everything *except* output share: the Bitter Lesson [20] conditions the code-mode-vs-JSON cost crossover on fan-out N ("Token costs cross over at N≈26") while explicitly holding output constant ("Output token counts do not differ across paradigms"); Anthropic's PTC docs [19] condition the benefit on workload shape ("Whether that trade pays off depends on workload shape… Sequential single-call workflows do not benefit"); the verbosity literature [29, 30, 31] only *cuts* output tokens and derives no design choice from output share; CAPC [76] drops the output term before deriving its design rule. **The inverse holds and is stated plainly: every verified source treats output tokens as a cost term; none treats output share as a design variable.** Searched: "when does code mode win cost", "output token share design choice", "output-heavy workload agent design", "verbosity tax agents", "reasoning effort output cost tradeoff design", "cost model output share predictor", "tool calling vs code generation cost comparison output" — hits were pricing arithmetic, fan-out conditioning, or model-choice advice; none condition presentation design on output share.

### E.2 Answer to Question 2 — is there evidence output share does NOT determine relative cost between designs?

**No falsifier found** — nothing tests output share as the scaling variable and finds it wanting. But the counter-direction evidence is one-sided and the paper must engage it: **every design-level cost difference in the fetched literature that is decomposed at all is input-driven.** (i) The one controlled code-vs-JSON cost comparison [20] reports a code-mode penalty that is entirely input-side fixed overhead with outputs equal ("programmatic tool calling carries a fixed input-token overhead relative to JSON tool calling… Output token counts do not differ across paradigms"). (ii) The largest known between-harness cost gap [7] is context accumulation and idle turns — input-side ("Each no-action turn carries a full context window of input tokens"). (iii) Agentic-coding cost structure at model level is input-dominated [66]. (iv) Anthropic's reported PTC savings are billed *input* tokens [19]. The single datum moving in the falsifier direction is Strands [26]: output shrinks *less* than input (−67% vs −78%), so output share *rises* while the code-mode design is cheaper — confounded vendor data (both token counts fall absolutely; no price structure applied; no controlled share manipulation), but it must be cited and answered. Net: output share has never been isolated as an independent variable in any design comparison, in either direction. The mechanism is untested by anyone; the literature's documented design-cost variance sits on the input side, which makes our output-side variable precisely the unoccupied axis — and [20]'s input-only penalty in echo-stub settings is the sharpest existing contrast to our 1.4–2.3× output-volume variation on real coding tasks.

### E.3 The dangling item — what [7]'s 40× actually measures

Resolved by first-hand read of the full text (arxiv.org/html/2607.22585v1); entry [7] was already tightened in pass 2. The figure is **not comparable to our 46%** — it differs on every axis:

- **Quantity:** harness-emitted total of prompt + completion + *cached* tokens, counted at par, unpriced — "tokens_total is the sum the caller is billed for; we do not normalize across providers because the harness-reported number is the deployment-relevant quantity." No dollar model anywhere; the only cost sentence is "∼40× more tokens means ∼40× more API spend, all else equal" — and all else is not equal (cached input is discounted 5–50× (50× on DeepSeek's corrected card), output priced 2–8× input, at every current provider).
- **Construction:** 300 trials (3 harnesses: Goose, OpenCode, OpenHands-SDK × 2 models × 50 Terminal-Bench Pro tasks); "Tokens per solved task is amortized: the cell-wide sum of tokens_total divided by the cell's solved count… Failed and infrastructure-error trials *are* included in the numerator."
- **The 40× is the extreme pair**, OpenCode vs Goose, pooled over both models. The paper's own bootstrap CIs — Goose [21K, 61K], OpenHands [537K, 1.35M], OpenCode [733K, 2.50M] — put the adjacent pair OpenCode/OpenHands at ~1.2–1.9×, the same order as our 46% median spread.
- **Driver:** per-turn context growth plus a 10× idle-turn rate, not turn count ("average turn counts are 21–27 for OpenCode versus 18–25 for Goose… it more likely reflects per-turn context growth, tool serialization, and harness-specific token accounting"); Goose reports totals only, no input/output split ("Per-direction comparisons… are not available for Goose").

So: theirs is an *extreme-pair ratio of unpriced tokens, amortizing failures*; ours is a *median spread of priced dollars at equal solve rate*. Consistent, not contradictory — median vs tail, dollars vs tokens. Incidental color from the same read: [7] relays Terminal-Bench 2.0's own observation of a 65× *input*-token difference between two harnesses for a 5.7-point gain (256.9M vs 3.9M input tokens, Opus 4.5) — more evidence that the field's documented harness-cost variance is input-side (E.2).

### E.4 Addendum entry (third pass; verified 2026-09-29)

[78] Coralogix. "Token Efficiency: Cut LLM Costs Without Losing Quality." Vendor blog, 2026. https://coralogix.com/ai-blog/token-efficiency/
    Theme: cost/token economics
    Claim: Practitioner guidance that conditions the choice of cost lever (caching vs length control) on a workflow's output:input ratio; the only located source that conditions any cost decision on output share.
    Relevance: bounds the novelty phrasing for the new claim — it conditions *lever selection*, not *agent/tool presentation choice*, on the ratio, and measures nothing; cite it so the novelty claim reads "no prior work conditions presentation design on output share" rather than the falsifiable stronger form.
    Quotes: "A 2,000-token prompt driving 200-token answers is input-heavy, so caching offers the larger gain. A 500-token prompt driving 2,000-token answers is output-heavy, so length controls help more. You should track the ratio by workflow because one global average can hide both patterns."

### E.5 Additions to "Sources I could not verify"

- Nothing failed this pass: all assigned URLs resolved and were read (Anthropic PTC docs; arXiv:2608.06370, 2607.22585, 2609.23790, 2607.15516 abs+HTML; Strands docs; arXiv:2412.21187, 2412.18547, 2504.05185, 2501.19393, 2604.22750 HTML; Coralogix). One supporting-direction blog (digitalapplied.com, on a "verbosity tax" erasing a per-token price advantage at *model* level) was seen but is illustrative arithmetic, not cited.
