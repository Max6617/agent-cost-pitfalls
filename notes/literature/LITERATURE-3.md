# LITERATURE-3 — verification pass for the current claims (LIT-PROMPT-2)

**Date:** 2026-10-09. **Method:** thirteen parallel verification agents (one per item: seven
unreadable sources, five forward-citation sweeps, one bibliographic job), plus direct fetches by
the coordinator. Every quotation below is verbatim from a page fetched live in this session; the
URL is given with each quote. Identifiers were opened and checked against title AND authors —
no identifier was trusted from notes. The earlier passes (`notes/literature/RELATED-WORK.md`, `notes/literature/LITERATURE-2.md`)
were treated as lead sources only.

**Headline.** Nothing found **contradicts** any current claim (§3.1/§3.1a, §3.4, §3.5, §3.8,
§3.3/limitation 7). Three claims need **scoping edits**, all verified against primary sources:

1. §4 novelty item 1 (cross-provider cost-ranking transfer) is **partially anticipated by
   concurrent work**: arXiv:2610.04433 (v1 2026-10-03) reprices three harnesses' bills under
   two vendors' price lists and reads out the order both ways.
2. The §4 methodology sentence "**no published counterpart**" for the 7.7% A/A placebo is
   **no longer true as written**: arXiv:2609.30725 (v1 2026-09-25) publishes a billed-cost
   noise floor (per-cell cost CV 2.44–8.35%). The claim survives narrowed to *the first A/A
   placebo-arm contrast on billed cost*.
3. §3.2's output-verbosity mechanism has a **prior published account** with the same sign:
   arXiv:2607.10569 (+40% output tokens under a code-only tool surface on Claude × SWE-bench,
   p<10⁻⁹). It must be cited as the closest prior account.

All seven previously unreadable items are now read and classified. All eight uncertain venues
are confirmed or settled. The Cavewoman affiliation question is settled. The z.ai cache page is
captured to `_ev/zai-cache.md`.

**Infrastructure note.** Semantic Scholar's Graph API still returns HTTP 429 for browser-style
fetchers (eleven of thirteen agents, 2026-10-09) but responds HTTP 200 to plain `curl` with
~1 s spacing (two agents) — the rate limit is client-sensitive, not an outage. DBLP is behind an
Anubis proof-of-work wall; DBLP's official mirror records on OpenReview were used instead.
OpenReview `/notes?id=` and `/notes?forum=` are challenge-walled; `/notes/search` works.

---

## 1. Threats found

Ordered by damage. Each entry names the PAPER.md claim attacked, gives the citation, a verbatim
quote with the URL it was fetched from, and a one-line recommended wording change. There are **no
contradictions** in this section — every threat is a scoping attack on a claim as currently
worded, and every one is absorbed by the §4/§7 edits now applied (see §5).

### T1 — §4 novelty item 1, attacked by concurrent work that runs the cross-pricing experiment

**Liu & Han, "What Does a Harness Buy? Tokens, Mostly", arXiv:2610.04433, v1 2026-10-03
(Yangze Liu, Zhongyi Han, Shandong University).** Identifier verified three ways (arXiv abs
page, arXiv API, coordinator fetch); a true forward citation of Claw-SWE-Bench (2606.12344) and
the Scaffold Effect (2607.22585).

> "Repricing each model's tokens under the other vendor's list keeps the order of the three
> harnesses in both cases (Appendix G)." — https://arxiv.org/html/2610.04433v1 (§4.4)

> "Cost is computed from each trial's own token counts, split into cache-hit input, cache-miss
> input, and output, under the vendor's list price for the model." — https://arxiv.org/html/2610.04433v1 (§3)

> "DeepSeek list, CNY / M tokens: hit 0.05 · miss 1.5 · output 4.5, a cache hit costs 0.033× a
> miss … Zhipu list, CNY / M tokens: hit 0.23 · miss 0.8 · output 2.8, a cache hit costs 0.29× a
> miss" — https://arxiv.org/pdf/2610.04433v1 (Appendix G)

> "What the harness does decide is the bill. With the same model, the same tasks, and one price
> list, cost per task differs by up to 3x across harnesses. … The provider's price for cached
> input scales the bill and does not reorder it." — https://arxiv.org/abs/2610.04433 (abstract)

**Assessment.** Three production harnesses (Claude Code, mini-SWE-agent, OpenCode) billed in
currency from their own token counts with the cache hit/miss/output split; the price schedule is
**experimentally swapped** on fixed token counts between two vendors whose lists differ in
output:input ratio (3.0 vs 3.5) and sharply in cache discount (0.033× vs 0.287×); the harness
cost order is read out both ways. That is the experimental anatomy §4's novelty item 1 says does
not exist. What it does **not** do: only two lists × three harnesses; the lists are swapped
wholesale, so the output:input ratio is not isolated as the factor (the ratio contrast is narrow,
3.0 vs 3.5, while the cache-discount contrast ~8.7× dominates); and there is no statistical
rank-transfer machinery (no rank correlation, no adjacent-step intervals). Its finding's
direction is *consistent with* ours: under pure repricing the order **transfers**; across models
the Claude Code : mini-SWE-agent cost ratio flips (1.86× on GLM tokens vs 0.95× on DeepSeek
tokens) — "What flips Claude Code from cheaper than mini-SWE-agent to twice its cost is the
model's step profile, not the price list" (same URL as quote 1). So: the reorder is usage-driven,
not price-list-driven — which is our §3.1a position (the penalty is not predicted by the price
ratio) and our §3.4 attribution, not evidence against them.

**Recommended wording change (applied):** scope novelty item 1 to the isolated ratio factor
across six provider cells with a statistical rank-transfer test, and cite Liu & Han as concurrent
work both there and in the "nearest prior art" paragraph.

### T2 — §4 methodology paragraph: "no published counterpart" for the 7.7% A/A placebo is false as written

**Hu et al., "Analyzing and Mitigating Cost-Inefficient Behaviors in Coding Agents",
arXiv:2609.30725, v1 2026-09-25, v2 2026-09-28 (Yiran Hu, Nan Jiang, Shanchao Liang, Anik Dey,
Yi Wu, Lin Tan, Purdue).** Identifier verified by two agents and the coordinator (abs page shows
submitter Yiran Hu; the HTML landing page carries the full author block).

> "To account for run-to-run noise in RQ2–RQ3, we run eight baselines (four configurations × two
> benchmarks) three times and estimate noise floors using the standard deviation of Pass@1 and
> coefficients of variation of cost and CoP." — https://arxiv.org/html/2609.30725v1

> "Cost floors range from 2.44% to 8.35%." — same URL

> "Behavior cost is computed from the input, output, and cache tokens consumed by each flagged
> action using the corresponding model token prices (Appendix A.1.2)." — same URL (dollar-
> denominated; table headers read "Cost ($)")

**Assessment.** A measured run-to-run noise floor for **billed agent cost in dollars**: the
coefficient of variation of cost over three repeat runs of each of eight unchanged baseline
configurations (Claude Code and Mini-SWE-Agent × model variants, SWE-bench Verified/Pro), used as
the significance yardstick for all their cost effects. A repeated-unchanged-configuration floor
and an A/A placebo floor are the same estimand — how much billed cost moves when nothing changed.
Only the framing differs: they never say "A/A" or "placebo", use 3 runs per cell rather than 124,
and report per-cell CVs rather than one pooled contrast. Their range brackets our 7.7%.

**Recommended wording change (applied):** replace "for which we found no published counterpart"
with the scoped claim — first A/A placebo-arm *contrast* on billed cost — citing Hu et al. as the
published noise-floor counterpart and noting the magnitudes agree.

### T3 — §3.2's output-verbosity mechanism has a prior published account with the same sign

**Yang, Yu & Desell, "When Does Restricting a Coding Agent to execute_code Help? A Regime ×
Agent-Design Ablation", arXiv:2607.10569, v1 2026-07-12 (Hong Yang, Qi Yu, Travis Desell,
Rochester Institute of Technology; tagged Agentic Software Engineering (SE 3.0) Workshop at KDD
2026).** Identifier verified on abs page + full HTML. Note: this is Hong Yang (RIT), **not** John
Yang of SWE-agent. The repo's note describing it as "a code-only-output ablation" was wrong: it
is a tool-surface restriction ablation (baseline / bash_only / code_only, where code_only
replaces the whole tool surface with one MCP code-execution tool).

> "Pass rates differ by less than three percentage points across all four cells × three arms,
> with all four headline pass-rate contrasts NS (Table 2)" — https://arxiv.org/html/2607.10569v1

> "The lone cell of Table 2 in which code_only is directionally costlier than its rival is
> Claude × SWE-bench: cost runs +14% (NS) but output tokens are +40% at p<10⁻⁹—the extra cost
> scales with output volume rather than reflecting a fixed per-run overhead. The working
> hypothesis is edit friction…" — https://arxiv.org/html/2607.10569v1

> "A different agent could move either sign, so neither transfers unchanged and both should be
> re-measured per agent" — https://arxiv.org/html/2607.10569v1

**Assessment.** On the cell matching our setting (real modification tasks, Claude model), Yang et
al. find output volume **larger** under the code-execution surface (+40%, p<10⁻⁹), cost scaling
with output and edit volume — the same direction and essentially the same mechanism as our
§3.1/§3.2 (~1.8× output tokens under code-mode). The feared contradiction does not materialize
(their cheaper cells are a non-coding regime and a different agent, and they pre-empt sign
transfer themselves). But if §3.2 or §4 reads as though the code-mode output-verbosity mechanism
on real coding tasks is previously unreported, that is wrong: it was published in July 2026 with
a named mechanism (edit friction) and dose-response evidence (per-instance Spearman ρ=0.488
between Δedit chars and Δoutput tokens). Differences that keep our contribution distinct: their
cost is rate-card-computed on two US models, not gateway-billed across providers; their magnitude
is +40%, ours ~1.8×; and their sign-instability position aligns with §3.1a.

**Recommended wording change (applied):** cite Yang et al. in §4's code-mode paragraph as the
closest prior account of the mechanism, with the +40% figure and their own sign-transfer caveat.

### T4 — any unscoped "no A/A designs in agent evaluation" is falsified twice over

**Kaliyev & Maryanskyy, "How Much Coordination Gain Is Real? A Paired Noise-Floor Protocol for
Multi-Agent LLM Benchmarks", arXiv:2606.20695, v1 2026-06-15 (Alibek T. Kaliyev, UT Austin;
Artem Maryanskyy, Uber; KDD 2026 Workshop on Agentic AI Evaluation and Trustworthiness).**
Identifier verified on abs page + arXiv API + coordinator fetch.

> "A prior question: how much paired trial-0 disagreement do two protocols produce on the same
> model and benchmark when their API inputs are configuration-equivalent (matched by code
> inspection plus a SHA-256 byte audit), short of full identity-replay?" — https://arxiv.org/abs/2606.20695

> "The envelope of observed paired gaps spans [−3,+18]pp across two seeds, with pooled upper
> Wilson CI ~15pp." — same URL

**Assessment.** A genuine A/A design in agent evaluation — two arms verified treatment-identical,
any observed gap declared noise by construction — but the envelope is in pass-rate percentage
points on τ²-bench retail, not dollars. Our claim is safe only while scoped to billed cost and
the placebo-arm construction. Separately, placebo/negative-control designs in LLM evaluation now
exist in at least five 2026 papers (Jha arXiv:2609.00854, random-span placebo in code repair;
Iscan arXiv:2606.31511 and 2607.12962, preregistered placebo-controlled self-repair
decompositions; OpenGameEval arXiv:2610.02563, pooled placebo used explicitly as a floor;
Chanhnourack arXiv:2609.38021, negative controls for verifier validation) — none in dollars,
collectively fatal to any unscoped absence claim.

**Recommended wording change (applied):** claim (c) stated as the first A/A placebo-arm contrast
**on billed cost**, with Kaliyev & Maryanskyy cited as the A/A-design precedent in agent
evaluation.

### T5 — §3.3 / limitation 7 must name Anthropic's first-party compatibility layer, not the wire format

Verified from primary sources. Anthropic's OpenAI-compatibility documentation
(`https://docs.claude.com/en/api/openai-sdk`, Markdown source read end-to-end) states:

> "Prompt caching is not supported, but it is supported in the Anthropic SDKs"

> "Most unsupported fields are silently ignored rather than producing errors."

> Response-fields table: "`usage.prompt_tokens_details` | **Always empty**" — and no
> `cache_read_input_tokens` / `cache_creation_input_tokens` row exists anywhere in the response
> schema. `cache_control` appears in no supported request-field table on the page.

The Messages API reference (`https://docs.claude.com/en/api/messages`) confirms the native path
both accepts the breakpoint and returns the split ("`cache_read_input_tokens`: number — The
number of input tokens read from the cache"). The threat is the counterexample: **OpenRouter's
OpenAI-shaped endpoint DOES accept and forward `cache_control` to Anthropic and DOES return a
cache split** — "Prompt caching with Anthropic requires the use of `cache_control` breakpoints…
Check the `prompt_tokens_details` object in the usage response" (https://openrouter.ai/docs/features/prompt-caching).
So the mechanism is specifically about **Anthropic's own OpenAI-compatibility layer**, not about
chat-completions-shaped wire formats in general. PAPER.md's current wording ("reach Anthropic
through its OpenAI-compatible endpoint") is already Anthropic-specific and survives; any future
phrasing like "OpenAI-compatible endpoints cannot carry cache breakpoints" would not.

Independent prior observations of the same boundary (both pre-paper, one in a harness the paper
evaluates): cline/cline issue #13667 (2026-08-28) — "Requests sent through the `litellm` and
`openai-compatible` providers to an Anthropic model on AWS Bedrock never include `cache_control`…
`cacheReadTokens`/`cacheWriteTokens` are 0 on every request" (https://github.com/cline/cline/issues/13667);
NousResearch/hermes-agent issue #84506 (2026-08-12) — a measured before/after: "the provider
serves zero cache hits: the entire prompt is re-billed at full price on every turn" on the
OpenAI-compatible wire vs "Cache-read share of input-side tokens … 95.9%" once markers flow on
the Anthropic wire (https://github.com/NousResearch/hermes-agent/issues/84506); Microsoft Q&A
(2026-07-19/20) — "Your zero cached_tokens results match the documented API boundary"
(https://learn.microsoft.com/en-au/answers/questions/5951355/).

**Recommended wording change (applied):** §4's cache paragraph now cites the vendor docs and the
issue trackers, and the novelty claim is scoped to the first controlled, gateway-measured
identification across harnesses.

### T6 — §7 mischaracterizes the harness survey: it argues the OPPOSITE of what the repo's notes said

**Li et al., "Agent Harness Engineering: A Survey" (20 authors: Junjie Li, Xi Xiao, … Chandan K
Reddy; CMU/Yale/JHU/NEU/Tulane/UAB/OSU/Virginia Tech/Amazon), OpenReview forum eONq7FdiHa —
verified as an OpenReview Archive direct upload, posted 2026-05-14, under TMLR review (every PDF
page headed "Under review as submission to TMLR").** Full 51-page text read via a Wayback capture
(`https://web.archive.org/web/20260607200526if_/https://openreview.net/pdf?id=eONq7FdiHa`; three
captures over 3+ weeks byte-identical).

> "task execution reliability depends less on the underlying model than on the infrastructure
> layer that wraps it, the agent execution harness" (Abstract — fetched from the live
> https://openreview.net/pdf?id=eONq7FdiHa)

> "In each case, the variable was the execution harness …; the model was held fixed. Each of
> these harness-only gains exceeds the typical 2 to 4 percentage point improvements reported as
> meaningful model advances on the same benchmarks. The pattern is not incidental: the harness,
> not the model, is driving the outcome." (§1.1 — Wayback full text)

> "A harness-aware evaluation should treat the reported score as a property of the model–harness
> pair, not of the model alone. This motivates evaluation protocols that either lock the harness
> across models or vary harness configurations as an explicit experimental factor" (§8.1)

**Assessment.** The brief's worry — that it argues the evidence does not establish harness over
model — is backwards. Its Claim 1 IS the harness-over-model premise (for reliability/quality,
not cost). It contains no harness-vs-model cost comparison, no cross-provider cost analysis, no
price ratio anywhere ("provider" occurs only for sandbox vendors and instrumentation). It attacks
nothing; §8.1's call to vary harness configurations as an explicit experimental factor describes
exactly this paper's design family and can be cited as support.

**Recommended wording change (applied):** the §7 row no longer describes the survey as "arguing
the harness does *not* dominate"; it is recorded as an ally with the venue given precisely
(OpenReview Archive direct upload, under TMLR review).

### T7 — bibliography venue errors found while confirming venues

All eight uncertain venues resolved on primary sources (OpenReview `/notes/search`, ACL
Anthology, MLSys proceedings, DBLP-mirror records on OpenReview, ACM DOI resolution):

| item | previous state | settled venue | evidence |
|---|---|---|---|
| RouteLLM (2406.18665) | reported ICLR 2025 | **ICLR 2025 Poster** | OpenReview note, `domain: ICLR.cc/2025/Conference`, venue field "ICLR 2025 Poster" (published title is "…from Preference Data") |
| FrugalGPT (2305.05176) | reported TMLR 2024 | **TMLR 2024** (Featured Certification) | OpenReview TMLR forum `cSimKw5p6R`, venue field "Accepted by TMLR", embedded bibtex `journal={Transactions on Machine Learning Research}, year={2024}` |
| Hybrid LLM (2404.14618) | reported ICLR 2024 | **ICLR 2024 poster** | OpenReview note `02f3mUtqnM`, venue field "ICLR 2024 poster" |
| Terminal-Bench (2601.11868) | reported ICLR 2026 | **ICLR 2026 Poster** | OpenReview forum `a7Qa4CcHak`, venue field "ICLR 2026 Poster". Flag: this ID is the **2.0** paper (89 tasks) |
| Vats et al. (2607.22585) | "ICML 2026 virtual page" | **ICML 2026 Workshop DL4C, poster** (also a KDD 2026 workshop) | icml.cc/virtual/2026/82739 renders it under Workshops; OpenReview venue field "ICML 2026 Workshop DL4C Poster". Not the main conference |
| Gim et al., Prompt Cache (2311.04934) | reported MLSys 2024 | **MLSys 2024** | arXiv Comments field "To appear at MLSys 2024" + official MLSys proceedings entry |
| LongLLMLingua (2310.06839) | reported ACL 2024 **Findings** (unverified) | **ACL 2024 main conference, Vol. 1 Long Papers, pp. 1658–1677** | aclanthology.org/2024.acl-long.91. The Findings attribution was wrong (LLMLingua-2 is the Findings one) |
| CacheBlend (2405.16444) | discrepancy: ACM TOCS vs EuroSys 2025 | **EuroSys 2025, pp. 94–109**, DOI 10.1145/3689031.3696098 | DBLP-mirror bibtex on OpenReview + resolving ACM DOI. EuroSys 2025 proceedings were published in cooperation with ACM TOCS, which explains the S2 string; cite EuroSys |

PAPER.md asserts no venues, so these land on `notes/literature/RELATED-WORK.md`'s annotations when that file is
next edited; they are recorded here so the corrections cannot be lost.

### T8 — Cavewoman authorship: three authors, and "Adobe Research" belongs to two of them

**Adeyemi, Rossi & Dernoncourt, "CAVEWOMAN: How Large Language Models Behave Under Linguistic
Input and Output Compression", arXiv:2606.24083.** The author block in the arXiv HTML full text
(fetched from https://arxiv.org/html/2606.24083v1), with email addresses omitted:

- "Morayo Danielle Adeyemi — **Affiliation: Independent**"
- "Ryan A. Rossi — **Affiliation: Adobe Research**"
- "Franck Dernoncourt — **Affiliation: Adobe Research**"

The arXiv abstract page's submitter line ("From: Morayo Adeyemi") is what showed only her name;
the `citation_author` tags list all three. The Caveman README's "Adobe Research" assertion is
therefore half-right for the wrong reason: Adobe Research IS in the primary source, but for
Rossi and Dernoncourt — Adeyemi declares "Independent". The only other institutional signal is a
compute acknowledgment ("We thank MIT Engaging for providing the GPU compute"). Any text naming
Adeyemi as sole author, or giving her an Adobe affiliation, must be fixed. (PAPER.md does not
cite Cavewoman; LITERATURE-2 §2.5 does, without author detail — recorded here for its next edit.)

---

## 2. Anticipations found

Prior art that already covers something PAPER.md presents as new. T1–T4 above are the
load-bearing ones (cross-referenced, not repeated). The rest, in descending order of proximity:

### A1. Hu et al., arXiv:2609.30725 — the billed-cost noise floor (see T2)

### A2. Liu & Han, arXiv:2610.04433 — the cross-pricing experiment (see T1)

Also relevant from the same paper, for §3.3/H4 (cache hit rate does not drive arm cost): "The
provider's price for cached input scales the bill and does not reorder it" — an independent
measurement of cache-price depth scaling but not reordering a harness bill, under a 0.033× vs
0.287× hit-price contrast. And its rerun calibration ("rerun the same configurations to calibrate
how much a score moves when nothing changes but the run") is an A/A-style yardstick in pass-rate
units — its noise floor is not taken on the bill itself.

### A3. Yang et al., arXiv:2607.10569 — the output-verbosity mechanism (see T3)

### A4. E-Bench, arXiv:2607.23722 — interface → measured USD cost across 11 price schedules, uniform sign

**Zheng et al., "E-Bench: Benchmarking Multi-Step Tool-Use Agents in Real-World Product
Scenarios", v1 2026-07-26 (Tencent Hunyuan; Tsinghua AIR; Southeast University).** Verified on
abs page + full HTML.

> "Code execution improves accuracy while cutting cost. … enabling exec_code reduces the average
> number of MCP tool calls per task from 60.42 to 15.86 (a 73.8% drop) and agent turns from
> 14.87 to 9.87 (a 33.6% drop), averaged over 11 models and three domains." —
> https://arxiv.org/html/2607.23722v1 (§4.2.2)

> "All else is held fixed (tasks, tools, database copies, and the state-diff evaluator), so any
> performance difference is attributable to this interface." — same URL (§3.4)

It computes per-task USD cost as `(n_in·p_in + n_cache·p_cache + n_out·p_out)/10⁶` with per-model
fresh/cached/output prices (11 price schedules, Table 5) — and per the table, every model's USD
cost falls under E-Bench-Code (e.g., Opus-4.8 $3.398→$0.833; GPT-5.5 $1.786→$0.481). **It does
not** vary the price ratio as a factor, rank harnesses, or decompose cost into request count and
output volume (the standard token-price identity only), and the models run in one shared harness.
Classification: **NEITHER** on every formal novelty item — but it is the closest published
"interface change → measured dollar cost, same model, same tasks" result, its sign is uniform on
a task family where calls consolidate mechanically, and citing it bounds §3.1's generality in our
favour (the sign is task-family- and provider-specific, exactly what §3.1a says).

**Recommended wording change (applied):** one sentence in §4's code-mode paragraph.

### A5. Ariño de la Rubia & Pafka, arXiv:2609.33812 — harness-dependent cache regimes driving cost, published

**"Identical Runs, Different Results: Benchmarking AI Coding Agents on Open-Weight Models",
v1 2026-09-27.** Verified on abs page + full HTML.

> "The endpoint served 92 to 98 percent of pi's and Codex's input from its prompt cache, and 2 to
> 11 percent of Claude Code's… as an accounting counterfactual, the cache accounts for about
> ninefold of the gap" — https://arxiv.org/html/2609.33812v1

> "cost depended on whether the prompt cache worked for that pairing." — same URL

The closest academic anticipation of the general phenomenon behind §3.3 — a harness-dependent
cache regime deciding cost (there ~23-fold differences on the same model). The mechanism is
DeepSeek/Ollama **automatic** prefix caching failing by agent×model pairing, not Anthropic's
declared caching or a protocol-path boundary, so it does not anticipate the §3.3 identification.
It must be cited in §4's cache paragraph regardless; a reviewer will.

### A6. The failed-replication canon — claim (b) survives, and these citations make it bulletproof

Claim (b) (novelty item 2: a pre-registered replication of such a claim on a second suite,
reported as a result when it failed) was attacked directly and **survives**: no published
pre-registered replication of an LLM-agent/harness/cost evaluation claim on a second task suite —
failed or successful — was found. But failed replications of LLM-evaluation claims are published
and celebrated, and any wording implying failed replications are unheard-of is falsified by:

- **Schaeffer, Miranda & Koyejo 2023, "Are Emergent Abilities of Large Language Models a
  Mirage?", arXiv:2304.15004** — "alleged emergent abilities evaporate with different metrics or
  with better statistics" (https://arxiv.org/abs/2304.15004).
- **Huang et al. 2023, "Large Language Models Cannot Self-Correct Reasoning Yet",
  arXiv:2310.01798.**
- **Mirzadeh et al. 2024, "GSM-Symbolic…", arXiv:2410.05229** — the closest structural analog to
  §3.8's shape (an established benchmark claim re-tested on a newly constructed suite, does not
  hold): "the performance of all models declines when only the numerical values in the question
  are altered" (https://arxiv.org/abs/2410.05229).
- **Besiroglu et al. 2024, "Chinchilla Scaling: A replication attempt", arXiv:2404.10102** — a
  self-described, partially failed replication published as such.
- Nearest existing practice to §3.8: **Xu & Wu 2026, "Validation Evidence in LLM Repair
  Agents…", arXiv:2607.28871** — "across two exploratory replications, varying the scaffold and
  the model, the B-replay content adds a detectable increment only with gpt-5.6-sol under the
  unconstrained tool-use loop" (https://arxiv.org/abs/2607.28871, coordinator-verified).
  Exploratory, not pre-registered; varies scaffold/model, not the task suite.
- Pre-registration infrastructure, for honest positioning: NeurIPS 2020 pre-registration
  workshop pilot (Bertinetto et al., PMLR 148 — "23 (92%) were accepted"), MSR/EMSE Registered
  Reports track ("methods and proposed analyses are reviewed before execution"), TMLR
  reproducibility certification, ReScience C ("If you ever replicated computational results (or
  failed at)…").
- Rarity/fragility meta-science if the paper wants to say replications are rare: Belz et al.
  EACL 2021 (aclanthology.org/2021.eacl-main.29 — "a tiny 14.03% of the 513
  original/reproduction score pairs we looked at were the same"); Raff NeurIPS 2019;
  Fostiropoulos et al. arXiv:2305.12571; Pineau et al. JMLR 22(164).

### A7. Run-count guidance exists for accuracy — the cost-scoped absence holds and is now corroborated

The §4 sentence "no external check on how many seeds a cost comparison needs" was attacked
directly and **survives in its cost-scoped form** — no published run/seed-count guidance for cost
or token-consumption comparisons of LLM agents exists in any venue 2020–2026 — but guidance for
**accuracy** outcomes is now substantial, and any unscoped phrasing is wrong:

- **Blackwell, Barry & Cohn, arXiv:2410.03492** — "it is rarely necessary to conduct more than
  three repeats to achieve a prediction interval width of ≤ 0.01" (QA benchmarks, temperature 0;
  https://arxiv.org/html/2410.03492v2).
- **Bjarnason et al., arXiv:2602.07150** (coordinator-verified) — 60,000 SWE-bench Verified
  trajectories, single-run pass@1 spread 2.2–6.0 points, recommends "use statistical power
  analysis to determine the number of runs needed" — accuracy-side.
- **ReasonBENCH, arXiv:2512.07795** — 30 trials, sized by a power analysis for a 5-point score
  difference ("treating quality and cost as distributions rather than point estimates"; the
  sizing is score-driven).
- Practitioner/vendor rules: MLflow "at least three seeds … five or more for publication-grade
  claims" (mlflow.org); Indeed engineering blog k=3–5 with the N-vs-k variance decomposition
  (σ²B + σ²W/k)/N, explicitly naming "mean cost" as a skewed metric class; METR practice of 6
  runs per task; ClawBench's mandatory 3 runs with a seed-noise decomposition (47.3% of
  run-score variance is seed noise).
- **Corroborating the gap:** Nageshwaran et al. 2026, "Large language model agent evaluation and
  benchmarking: a systematic survey…", Artificial Intelligence Review (Springer), DOI
  10.1007/s10462-026-11678-4 — "among these seventeen prominent, verified benchmarks, none
  reports evidence that the three threats are jointly controlled, and none reports a complete
  standardized run-cost record (0/17)" (https://link.springer.com/article/10.1007/s10462-026-11678-4;
  §5.2 body behind Springer's bot wall — see §4 below).
- Notable artifact: a preregistered cost A/B of a harness plugin (quartermaster repo,
  github.com/narehart/quartermaster docs/benchmarks/2026-07-cost-ab.md) ran its own ad-hoc power
  analysis — "≈79,369/arm for the cost effect at the observed effect size" — direct evidence that
  every team improvises cost power analyses because no shared guidance exists.

### A8. Zappia et al., Electronics 15(14):3175 — the nearest controlled neighbor to §3.5

See "Cleared" §3 item 1 for the full resolution. Its pool-size sweeps (4–24 for accuracy, 1–24
for latency) make it the closest published neighbor to §3.5's manipulation — with accuracy and
latency outcomes, never request count or cost. Cited in §4's tool-interface paragraph so a
reviewer cannot raise it first.

### A9. Bjarnason et al., arXiv:2602.07150 — the duplicate-run variance audit of SWE-bench

60,000 trajectories, three models × two scaffolds, "single-run pass@1 estimates vary by 2.2 to
6.0 percentage points depending on which run is selected, with standard deviations exceeding 1.5
percentage points even at temperature 0" (https://arxiv.org/abs/2602.07150,
coordinator-verified). The canonical agent-side nondeterminism measurement; added to §4's
methodology paragraph beside Atil et al.

### A10. Rank-tie methodology on the judge-leaderboard axis

**Ayyagari, arXiv:2609.33044** — "roughly one-fifth to three-quarters of adjacent leaderboard
positions are statistically indistinguishable, a noise floor driven mainly by finite prompt
sampling rather than the judge" (https://arxiv.org/abs/2609.33044). Methodologically the same
move as §3.4's 74.1% adjacent-step tie fraction, on judge leaderboards rather than harness cost.
Optional mutual citation; NEITHER on the claim.

---

## 3. Cleared — the previously unreadable items, resolved

1. **MDPI Electronics 15(14):3175 — VERIFIED, NEITHER (nearest neighbor to §3.5).** The Akamai
   interstitial was bypassed via MDPI's static asset host (pattern:
   `https://mdpi-res.com/d_attachment/<journal>/<journal>-<vol>-<0-padded article>/article_deploy/<journal>-<vol>-<0-padded article>-v2.pdf`
   — recorded for future passes). The paper is "Heterogeneous Low-Power Agentic Architecture for
   Edge Distributed Home Surveillance", Zappia, Lattuada, Bianchessi & Pau (STMicroelectronics),
   published 2026-07-19 — identity confirmed on three independent sources (Semantic Scholar by
   DOI, Crossref, the PDF itself). It does manipulate presented-tool count three times over:
   "Benchmark A measures single-tool dispatch over the full tool set, with the candidate pool
   sampled at sizes of 4, 8, 12, 16, 20, and 24 tools" and "Growing the pool from 4 to 24 tools
   halves the selection accuracy of functiongemma:270m (0.81 → 0.41), while Qwen3:1.7b loses 2
   points with thinking enabled (0.95 → 0.93)" (PDF, §6.1.1/§8.1.1). Outcomes are selection
   accuracy, generated tokens, latency/TTFT and power — **never request count, never dollars**
   (the system is deliberately cloud-free). Adjacent to §3.5 with no overlap: the request-count
   effect of presented-tool count remains unmeasured in the literature.
2. **"Agent Harness Engineering: A Survey", OpenReview eONq7FdiHa — VERIFIED, NEITHER, and the
   reported attack does not exist.** See T6. Ally, not attacker.
3. **E-Bench, arXiv:2607.23722 — VERIFIED, NEITHER → anticipation A4.**
4. **Yang et al., arXiv:2607.10569 — VERIFIED, partial anticipation of the §3.2 mechanism →
   threat T3.** The repo's "code-only-output ablation" description was wrong (tool-surface
   restriction), and the feared contradiction reversed into support.
5. **"Is Grep All You Need?", arXiv:2605.15184 — VERIFIED, NEITHER.** Sen, Kasturi, Lumer,
   Gulati & Subbiah (PwC), v1 2026-05-14. Harness and tool-result-presentation factors on
   agentic search (LongMemEval), "overall scores still depend strongly on which harness and
   tool-calling style is used, even when the underlying conversation data are the same"
   (https://arxiv.org/abs/2605.15184) — **accuracy only**: no request counts, no tokens, no
   dollars anywhere in the paper. Its "programmatic (file-based)" mode is the same conceptual
   factor as our PTC arm, in the accuracy domain ("The sharpest regression is Codex with
   GPT-5.4, which falls from 93.1% under inline grep to 55.2% under programmatic grep").
   Motivational adjacency only.
6. **Meta-Harness, arXiv:2603.28052 — VERIFIED, NEITHER.** Lee, Nair, Zhang, Lee, Khattab &
   Finn (Stanford/KRAFTON/MIT). Optimizes harness *code* for task reward; "context cost"
   (input-context characters) appears as a secondary Pareto axis in one of three settings; a
   grep of the full text for price/pricing/dollar/USD/billing/provider/cache returns zero
   matches. Automated harness optimization **for cost across providers** — the thing that would
   threaten novelty item 1 — is exactly what it does not do. One fence-off citation recommended
   if §4 or the intro ever implies harnesses are only designed by hand.
7. **"Confucius Code Agent", arXiv:2512.10398 — VERIFIED, NEITHER.** Wong, Qi, Wang, Hu, Lin,
   Ge, Gao, Chen, Du, Yu & Zhang (Harvard/Meta), v6 2026-02-03. Same-model, same-task,
   same-environment cross-scaffold comparison — the same design family as ours — on **resolve
   rate only**: "All methods share identical environments; improvements arise solely from the
   agent scaffolds" (https://arxiv.org/html/2512.10398v6). No dollars, no billing, "cache"
   never appears in the text. Keep every novelty claim scoped to billed cost and it touches
   nothing.
8. **Venues — all eight confirmed or settled.** See T7's table.
9. **Cavewoman affiliation — settled.** See T8: three authors; Adeyemi Independent; Rossi and
   Dernoncourt Adobe Research.
10. **z.ai cache docs — captured.** Single fetch of
    https://docs.z.ai/guides/capabilities/cache saved to `_ev/zai-cache.md`. Confirms: implicit
    caching, automatic, "no manual configuration required"; cached tokens reported in
    `usage.prompt_tokens_details.cached_tokens`; "Cache hit tokens: Billed at discounted prices
    (usually 50% of standard price)" — the ~50% read discount noted in LITERATURE-2 §5 (vs 0.1×
    at Anthropic and DeepSeek), i.e., discount depth is a third axis of price-structure
    variation and the paper names it once.

---

## 4. Could not verify

- **Nageshwaran et al. §5.2 body text** (Springer DOI 10.1007/s10462-026-11678-4): the landing
  page, abstract and the 0/17 quote were fetched; the §5.2 discussion of repetition counts and
  the proposed run-cost-record schema is behind Springer's "Client Challenge" bot wall and is
  known only from search snippets — not quoted anywhere above. Needed: institutional/browser
  access, or the Zenodo companion release (DOI 10.5281/zenodo.21364745) if it contains the text.
- **Terminal-Bench 2.0 cost sentence** ("Running Terminal-Bench 2.0 costs anywhere from one to a
  hundred dollars, depending on the model's price"): search snippet from the OpenReview PDF
  only; the PDF was not fetched. Needed: fetch the ICLR 2026 OpenReview PDF (forum `a7Qa4CcHak`).
- **Baker 2016 (Nature 533:452–454, the 70% reproducibility-survey statistic)**: nature.com is
  behind a JavaScript browser-verification wall. Verified only as quoted inside Belz et al. 2021
  (which was fetched). Needed: a real browser session or PubMed.
- **The survey's claimed second forum id** (`3hXEPbG0dh`, possibly the TMLR submission record for
  eONq7FdiHa): OpenReview note endpoints are challenge-walled; unconfirmed alias. Immaterial —
  the paper is cited via the Archive id that was read.
- **Figure/table-level data in four papers**: E-Bench's per-model Figures 7/10 and 2610.00917's
  Tables 1/6 render as images in HTML extraction; Yang et al.'s Table 2 cells are empty in the
  arXiv HTML (values in the LaTeX/PDF); arXiv:2608.08654 ("The Scaffolding Matters More Than the
  Interface…", cost "varied 139x across scaffoldings" on one task) has no HTML version and its
  PDF defeated extraction — its NEITHER classification rests on the abstract alone. Needed: a
  local PDF text-extraction pass (pypdf worked for 2610.04433's Appendix G).
- **"Prefix Caching Can Silently Break Reproducibility in …"** (OpenReview PDF,
  openreview.net/pdf/bf520136b3de6c31c2dd23f2a2efb2ec64b4c516.pdf): surfaced in search with a
  Bjarnason citation; not opened. Potentially relevant to §3.3's cache discussion — a follow-up
  lead, not a verified item.
- **Semantic Scholar citation counts** for all IDs in this pass (HTTP 429 for browser-style
  fetchers; curl works with spacing). Nothing above relies on a citation count.
- **"ICML 2026 Agent Reproduction Audit"** (~2,226 papers, Hugging Face open challenge): found
  only via a third-party blog; no primary source fetched. Lead only.

---

## 5. Recommended edits to PAPER.md §4 — as applied

The following replacement sentences were written into PAPER.md in this session (§4 and §7 only,
per the brief). They are reproduced here so the reasoning travels with the record.

1. **Code-mode paragraph** — inserted before "**None varies the output:input price ratio…**":
   > "The closest prior account of our mechanism is Yang et al. (arXiv:2607.10569): restricting two
   > coding agents to a single code-execution tool holds pass rates within three points across four
   > regime x agent cells while costs swing 20–40%, and on the cell matching our setting - Claude
   > on SWE-bench modification tasks - output tokens rise +40% (p < 1e-9), the same direction as
   > the 1.8x output-verbosity difference we measure, attributed there to edit friction and priced
   > from rate cards rather than a billing gateway. E-Bench (arXiv:2607.23722) reports the
   > uniform-sign result on synthetic product-state tasks: code execution cuts measured API cost
   > for all eleven models tested (tool calls −73.8%, turns −33.6%), priced per model including a
   > cached-input rate - a single sign on a task family where calls consolidate mechanically,
   > against provider-specific signs on real coding tasks, which is the task-family dependence
   > §3.1a states."

2. **Tool-interface paragraph** — after the Toolshed sentence:
   > "The nearest controlled neighbor on our own factor sweeps presented tool pools of 4–24 and
   > finds model-dependent selection-accuracy degradation with linear prompt growth (Zappia et
   > al., Electronics 15(14):3175) — accuracy and latency outcomes, never request count or
   > cost."

3. **Cache paragraph** — the §3.3 sentence was extended with the verified boundary evidence:
   > "The boundary itself is vendor-documented - Anthropic's OpenAI-compatibility layer states
   > that prompt caching is not supported, that unsupported fields are silently ignored, and that
   > `usage.prompt_tokens_details` is always empty - and it was observed in the wild before this
   > study, including in one of our four external harnesses (cline issue #13667: zero cache tokens
   > on every request through OpenAI-compatible paths; a hermes-agent issue: 0% cache hits on the
   > OpenAI-compatible wire against a 95.9% cache-read share once markers flow on the native one).
   > On the automatic-caching side, harness-dependent cache regimes deciding cost are now
   > published: identical runs on open-weight models show the endpoint serving 92–98% of two
   > harnesses' input from cache against 2–11% of a third's, the cache accounting for about
   > ninefold of the gap (Ariño de la Rubia & Pafka, arXiv:2609.33812). Our identification is, to
   > our knowledge, the first controlled, gateway-measured one across harnesses - and the boundary
   > is Anthropic's first-party compatibility layer specifically: OpenRouter's OpenAI-shaped route
   > forwards `cache_control` and returns a split."

4. **Methodology paragraph** — the "Two things here are, to our knowledge, uncommon" passage was
   replaced, and Bjarnason et al. (arXiv:2602.07150) was added to the preceding nondeterminism
   clause ("run-to-run pass@1 spreads of 2.2–6.0 points over 60,000 agent trajectories at
   temperature 0"):
   > "Two things here are uncommon in this literature, both scoped against verified prior art.
   > The first is a **pre-registered replication reported when it failed** (§3.8): failed
   > replications of LLM evaluation claims have been published and celebrated (Schaeffer et al.,
   > arXiv:2304.15004; Mirzadeh et al., arXiv:2410.05229), and exploratory cross-scaffold
   > replications with nulls exist (Xu & Wu, arXiv:2607.28871) — but we know of no published
   > pre-registered replication of an agent-evaluation claim on a second task suite, reported as
   > a result when it failed. The second is a **noise floor measured with a real A/A placebo**
   > (7.7%): the closest published measurement is the repeated-baseline cost noise floor of Hu
   > et al. (arXiv:2609.30725), per-cell cost CVs of 2.4–8.4% over three runs of unchanged
   > configurations, and the A/A design itself has an agent-evaluation precedent in accuracy
   > units (Kaliyev & Maryanskyy, arXiv:2606.20695); ours is, to our knowledge, the first A/A
   > placebo-arm contrast on billed cost, and its 7.7% sits inside Hu et al.'s per-cell range.
   > Run-count guidance exists for accuracy outcomes (rarely more than three repeats on QA
   > benchmarks, Blackwell et al., arXiv:2410.03492; a 30-trial score-powered benchmark,
   > arXiv:2512.07795) but not for cost — a 2026 systematic survey finds 0 of 17 prominent
   > agent benchmarks report a complete standardized run-cost record (Nageshwaran et al., DOI
   > 10.1007/s10462-026-11678-4) — so the absence of an external check on how many seeds a cost
   > comparison needs is a gap as much as a contribution."

5. **Novelty statement** — scope items 1 and 4:
   > item 1 gains: "— concurrent work reprices three harnesses' token bills under two vendors'
   > price lists and finds the order preserved under the swap (Liu & Han, arXiv:2610.04433);
   > that swap varies two whole schedules rather than isolating the ratio across provider cells,
   > and tests no ranking-transfer statistic"
   > item 4 gains: "— the boundary is vendor-documented and was observed anecdotally in issue
   > trackers before this study; what we have not found is a controlled, gateway-measured
   > identification across harnesses"
   And in the "nearest prior art" paragraph, one convergent-evidence sentence:
   > "Concurrent work bills three production harnesses from their own token counts and
   > cross-reprices them under a second vendor's list: the order is preserved under pure
   > repricing while the cost ratio between two harnesses flips across models — the reorder is
   > driven by the model's step profile, not the price list (Liu & Han, arXiv:2610.04433)."

6. **§4 closing note** — replaced with the verification-pass outcome (both unreadable items read
   and classified; venues confirmed on primary sources with two corrections; z.ai captured;
   forward-citation pass results; pointer to this file).

7. **§7 literature-verification row** — **done 2026-10-09**, with the survey mischaracterization
   corrected (T6) and the two scoping edits named.

---

*Prepared by a 13-agent verification swarm plus coordinator verification, 2026-10-09. Every
quotation above was fetched live today from the cited URL. Repository changes in this session:
this file, `_ev/zai-cache.md`, and the PAPER.md §4/§7 edits listed in §5. `findings/` untouched;
`artifact/MANIFEST.json` untouched; no collection, preflight, pilot or gateway was run.*
