# LITERATURE-2 — prior-art and contradiction pass for claims F29–F39

**Date:** 2026-10-01. **Method:** eight parallel verification agents, one per claim area. Every
source below was fetched live today; every quotation is verbatim from the fetched page. The
earlier pass (`notes/literature/RELATED-WORK.md` et al.) was treated as a lead source only; each lead was
re-fetched before use. No repo files were modified; this is the only file created.
Caveat: Semantic Scholar's API was rate-limited (HTTP 429) throughout, so external
corroboration came from arXiv pages, citing papers, author pages, and search snippets —
a systematic forward-citation sweep was not possible.

---

## 0. Two findings about the previous review itself

These come first because the brief for this pass assumed them, and both reversed.

**0.1 The "2026 citations resolve to nothing" claim does not survive re-checking.**
notes/reviews/CRITICAL-REVIEW.md §5 says the 2026-dated prior art "resolve[s] to nothing outside the repo's
own timeline." All eight agents re-fetched every 2026 arXiv ID in their scope — 2605.23950,
2603.23749, 2607.22585, 2603.23971, 2606.12344, 2604.22750, 2601.06007, 2608.00101,
2605.30613, 2607.15516, 2605.06898, 2609.17394, 2609.23790, 2601.10088, 2601.11868 —
and **every one resolves to the correct paper**, with submission history and independent
external presence (OpenReview copies, ICML/ICLR 2026 pages, public code, third-party
write-ups, citing papers). The §5 sentence should be narrowed to whatever specific entries
actually failed for that reviewer; as a blanket claim it is false for all IDs checked here.
One caution that survives: existence is not peer review, and Vats et al. (2607.22585) in
particular sits unusually close to this study's own topic (Goose/OpenCode/OpenHands token
accounting) with a bibliography heavy in 2026 items — treat it as a low-weight source,
never as independent corroboration of our results.

**0.2 The "fabricated OpenTelemetry quote" is not fabricated.**
notes/reviews/CRITICAL-REVIEW.md §3.3/§5 says no public source contains the metric
`gen_ai.client.inference.usage.cache_read.input_tokens`. The OTel GenAI conventions moved to
a new repository (the old opentelemetry.io page now shows only a "moved" notice — almost
certainly why the reviewer found nothing). The new repo's
`docs/gen-ai/gen-ai-token-metrics.md` defines, verbatim:

> `gen_ai.client.inference.usage.cache_read.input_tokens` | Counter | `{token}` | The number
> of input tokens served from a provider-managed cache.

That is the exact name and the exact quoted description — the RELATED-WORK quote is genuine
standards text. Two honest disclosures: the metric family was merged **2026-09-22** (PR #374)
and carries **Status: Development** (a sibling span *attribute*
`gen_ai.usage.cache_read.input_tokens` also exists). The paper should cite the new repo URL
and the Development status. The review's conclusion was wrong but explainable; the
fabrication claim must be withdrawn.

---

## 1. Verdict per claim

| claim | verdict | single best citation |
|---|---|---|
| **F30** — cheapest harness changes with provider; cost rankings don't transfer (median Spearman 0.286; 63.6% winner retention) | **PARTIALLY KNOWN** | Zheng et al., **Claw-SWE-Bench**, arXiv:2606.12344 — per-harness billed dollar costs, per-harness cache hit rates, "Accuracy ranking, however, is not cost ranking" — but one pricing regime, no cross-provider transfer statistic. |
| **F37** — one request field decides the bill (hit 11.8%→94.9%, cost 3.1×, solve flat) | **PARTIALLY KNOWN** | Lumer et al., **"Don't Break the Cache: An Evaluation of Prompt Caching for Long-Horizon Agentic Tasks"**, arXiv:2601.06007 — states the provider split in nearly our words and measures 41–80% cost reductions across 500+ agent sessions. |
| **F31** — the output:input price ratio does not predict the harness cost differential (b1 = −0.358 [−0.488, −0.239]) | **APPARENTLY NOVEL** | Nearest: Chen et al., **"The Price Reversal Phenomenon"**, arXiv:2603.23971 (listed prices fail at *model* level, volume-driven). The refuted account exists only as practice (Artificial Analysis's 7:2:1 blend) and as an untested caveat (Singh et al. §VIII, arXiv:2609.23790). Nobody regresses harness cost differentials on output share and reports the sign. |
| **F32** — 15-word "be concise" suffix cuts cost 12–54%, solve rate flat | **PARTIALLY KNOWN** | Renze 2024, **"The Benefits of a Concise Chain of Thought"**, arXiv:2401.05618 — literally appends "Be concise." and measures −48.7% length, −22.67% per-token cost, "negligible impact on problem-solving performance." |
| **F35** — 48 of 63 adjacent cost-rank steps are ties | **PARTIALLY KNOWN** (cost axis apparently novel) | Liu et al. 2026, **"Coding Agents Have Converged: Why the SWE-bench Leaderboard Can No Longer Order Its Top Entries"**, arXiv:2609.17394 — "Exact paired McNemar tests separate none of the 29 adjacent Verified top-thirty pairs at α=0.05." Accuracy-side antecedent, verbatim. |
| **F29** — a 124-run placebo moves 7.7% | **APPARENTLY NOVEL** | No published A/A or placebo noise floor in LLM/agent evaluation found despite targeted search. Nearest measured variance: Bai et al. (arXiv:2604.22750, 30× same-task tokens) and Chen et al. (9.7× same-query thinking tokens — which already owns the phrase "irreducible noise floor"). |
| **F33/F38** — cost per solved task is unsound at unequal solve rates | **ALREADY KNOWN** as a norm; our concrete episodes are new | Kapoor et al. 2024, **"AI Agents That Matter"**, arXiv:2407.01502 (founded joint cost–accuracy evaluation) + Erol et al. 2025, arXiv:2504.13359 (formalized cost-of-pass = per-attempt cost ÷ success probability). |

---

## 2. Contradictions and near-misses, in detail

The most important section. Ordered by damage.

### 2.1 F37's mechanism, provider split, and magnitude are all already published (near-miss that borders on contradiction)

Lumer et al. (arXiv:2601.06007, PwC, Jan 2026, ~18 citations) state, verbatim:

> "OpenAI and Google enable prompt caching automatically for eligible requests, while
> Anthropic requires explicit cache breakpoints in the API request."

They measure cache-on vs cache-off across OpenAI, Anthropic, and Google on DeepResearch-Bench
(500+ sessions): "prompt caching reduces API costs by 41-80%… across providers", with cost
computed from API-response usage fields — the same estimator our gateway uses. Their
self-declared novelty: "To our knowledge, no prior work quantifies these cost savings or
compares caching strategies for multi-turn agentic tasks." Our 3.1× (a 67.7% reduction) sits
inside their 41–80%. **Any phrasing of F37 that claims first measurement of caching's cost
effect in agent loops, or that presents the automatic-vs-declared split as a finding, is
contradicted.** What Lumer lacks, and what survives: coding harnesses (theirs is research
QA), per-arm hit rates, and *solve-rate invariance* (their second metric is TTFT).

First-party docs confirm the split and add two details the paper must absorb:
- Anthropic's docs now advertise a feature literally named **"Automatic caching"** ("Add a
  single `cache_control` field at the top level of your request"). Our dichotomy is
  substantively right (no field → 0.0% hit on 28.8M tokens) but must be phrased as
  "provider-side automatic, no request field" vs "client opt-in, request field required",
  or a reviewer will misfire on the branding.
- Anthropic's minimum cacheable length is **4,096 tokens for Haiku 4.5** (512 for Sonnet
  5.5), and sub-threshold prefixes are silently not cached ("no error is returned"). If any
  arm's cacheable prefix sat under 4,096 tokens, part of the 11.8% baseline could be
  threshold-silence rather than harness behavior. Report per-arm cached-prefix sizes. The
  same asymmetry is a structural reason Haiku's hit rate (10.1%) trails Sonnet's (16.9%) in
  F31's table.
- DeepSeek: "Context Caching on Disk Technology is enabled by default for all users… without
  needing to modify their code." Gemini: "Implicit caching is enabled by default for all
  Gemini 2.5 and newer models… There is nothing you need to do in order to enable this."
  Alibaba (Qwen): "Implicit cache: This automatic mode requires no extra configuration and
  cannot be disabled." The opt-in burden was practitioner knowledge by mid-2025 (Manus:
  "Some model providers… require manual insertion of cache breakpoints").
- "No solve-rate change" is also vendor-asserted: OpenAI FAQ — "No. Prompt caching does not
  change how the model generates output tokens."; Anthropic — "Prompt caching has no effect
  on output token generation."

### 2.2 Per-harness cache hit rates linked to cost already exist — twice in industry, once in a benchmark paper

- **Requesty, "The Economics of Coding Agents" (May 2026)**: 12 months of production gateway
  data, nine coding agents, per-harness hit rates (Claude Code 91.9%, OpenCode 89%, Roo Code
  73.6%, Cline 61.4%, Kilo Code 45.5%): "Every agent with a cache hit rate above 80% has a
  per-call cost below $0.10. Caching is the defining economic lever"; "The difference
  between 92% cache hit rate (Claude Code) and 46% (Kilo Code) translates to roughly 5.4x
  difference in effective input token cost."
- **AIMultiple A-CODE-CLI Bench (June 2026)**: 11 CLI agents on one model: "The token
  numbers are mostly about caching. Codex, Claude Code, Cline, Opencode, Gemini, and Grok
  cache 86–98% of their input... Junie, Goose, Kiro, Forge, and Aider don't cache, so they
  pay for every token they re-send." Note: **Goose is in their non-caching group** — directly
  relevant to our Goose arm.
- **Claw-SWE-Bench v1 (arXiv:2606.12344v1)** publishes per-harness×model hit-rate cells
  (GLM 5.1: OpenClaw 96.5%, hermes-agent 91.3%, generic 66.8%) with cost from provider
  billing logs, and states the decoupling result nearly in our words: "**Cache hit rate
  explains some cost differences, but not all of them.** DeepSeek-V4 Flash has the highest
  cache hit rate (98.5%) and the lowest cost. Yet Claude Opus 4.7 and GPT 5.5 also have
  cache hit rates near 97%, while their total costs still exceed $1000… Cost is therefore
  jointly affected by model price, input/output tokens, cache policy, and adapter call path."
  Plus: "harness choice can reorder system rankings and reshape accuracy–cost trade-offs."

None is a controlled toggle, and none holds model+price fixed while flipping a ranking via
a request field — F37's exact cell remains empty. But "nobody has linked harness identity
to cache-driven cost" would be false. RELATED-WORK's T8 ("closest prior art to C4 =
LiteLLM") is misranked: **Claw-SWE-Bench is closer because its arms are harnesses.**

**Version hazard:** Claw-SWE-Bench v2 (28 Sep 2026) silently replaced the billing-logs
method with price-table reconstruction ("API costs are calculated from the per-call token
usage recorded by each harness and the fixed unit prices listed in Appendix A.4"). The
billing-logs quote exists only in v1 — pin every citation to v1, and note the field's
retreat from billing-log capture, which validates our harder method.

### 2.3 Ndzomga et al. contradicts any broad reading of F30

arXiv:2603.23749, verified verbatim: "Across eight benchmarks, 33 agent scaffolds, and 70+
model configurations, we find that absolute score prediction degrades under this shift,
while **rank-order prediction remains stable**"; ρ=0.90–0.96; "for every 100 pairwise
comparisons, only 10 are inverted." If F30 is ever phrased as "agent rankings don't
transfer," the published record says the opposite for quality. The defensible juxtaposition:
quality rankings have been shown to transfer (ρ ≥ 0.90) where cost rankings don't (63.6%
winner retention). That contrast is now sourceable on both sides and is stronger than the
unqualified claim. Also verified: accuracy-side instability is published several times over
(Zhang et al. 2605.23950 — "Aggregate HV/MV ratio: 7.80×. Ranking reversal pairs: 6 out of
9"; Han & Sun — harness effects "comparable in size" to LLM effects with comparable
interaction; OpenAI — GPT-4 "varies between 2.7%… and 28.3%" across scaffolds), so no F30
sentence may imply ranking instability per se is new. And Vats et al. cuts the other way on
stability: "the ordering is identical for both models: Goose ≪ OpenHands-SDK << OpenCode" —
a harness token-cost ranking stable across models. F30's surprise is precisely that a
ranking robust across models flips across price structures; do not cite Vats as showing
instability.

### 2.4 Chen et al. is the nearest published "cost ranking flips" — and owns "noise floor"

arXiv:2603.23971 (full title: "The Price Reversal Phenomenon: When Cheaper Reasoning Models
Cost More"; v1 says 21.8% of pairs, v2 says 32% — cite v2): "in 32% of model-pair
comparisons, the model with a lower listed price actually incurs a higher total cost, with
reversal magnitude reaching up to 28x"; "repeated runs of the same query yield thinking
token variation up to 9.7x, establishing an irreducible noise floor for any predictor."
A reviewer will ask "isn't this F30/F31?" The distinction holds but must be stated: theirs
is listed-price vs realized-cost reversal across *models* (mechanism: token volume); ours
is the same *harness arm* re-priced under two providers' price structures. For F29: they
already coined "irreducible noise floor" — differentiate ours as the first *placebo (A/A)
arm-level billed-cost* noise floor, not the first measured cost variance.

### 2.5 F32's magnitude in agents is in tension with the only independent agent-side measurement

JetBrains ran a paired A/B of the "Caveman" conciseness skill on Claude Code (86 coding
tasks, ~240 trials, ~$106): **~8.5% output-token savings, ~10% cost, no quality change
(sign test p = 0.82)** — reported mechanism: "an agent's bill is mostly reading, not
writing", and "code, diffs, and tool calls dominate agent output". F32 claims 12–54% cost /
23–62% output. Same direction, but the published agent-side number is at or below our *low*
end, and its mechanism argues agent savings should be structurally smaller than QA savings.
The paper must explain why its design yields 3–5× the JetBrains effect (plausible: very
small tasks, chattier GLM/Qwen models, prose-heavy shipped prompts) — and cite it.

Further contradictions of naive versions, all verified:
- A 55-experiment practitioner series measured the bare phrase "be concise" at **+1.3%
  tokens** on Claude: "Vague brevity instructions don't move the needle." Our 15-word
  suffix is more specific ("prefer the smallest correct change") — but the paper must not
  claim any short conciseness phrase works.
- "No solve-rate change" is not universal: Renze 2024 reports GPT-3.5+CCoT "incurs a
  performance penalty of 27.69%" on math; Cavewoman (arXiv:2606.24083) preserves accuracy
  only on high-parse cells; Time's Up! (arXiv:2504.14350) shows length budgets change
  accuracy. Keep the F22 caveat ("on harder tasks terseness may cost correctness") in the
  paper.
- The Sonnet null has three published mechanisms, none of them ours alone: Anthropic's docs
  say latest Claude models are already terse in agent loops ("May skip verbal summaries
  after tool calls"); Cavewoman's GPT-5.4 exception is hidden-reasoning-token-driven ("the
  exception is GPT-5.4, whose billed output is dominated by hidden reasoning tokens… cheaper
  on only two of its five benchmarks"); ours is cache decoupling. Cite all three as
  convergent rather than presenting the null as unexplained.
- Cavewoman also warns the input-side version backfires: "Input compression… raises net cost
  through compensatory output expansion… a strict lose-lose."

Effect-size envelope: Cavewoman measures 1.4–2.4× cost cuts on 17 of 20 (model, dataset)
cells (≈29–58% reduction) — our 12–54% sits inside that envelope; Renze's −22.67% likewise.
Direction is nowhere contradicted; the tensions are magnitude-in-agents and
universality-across-models.

### 2.6 Cost-of-pass attribution: the repo credits the wrong paper

The repo attributes the cost-of-pass metric to Wang et al., "Efficient Agents"
(arXiv:2508.02694, v1 24 Jul 2025). Erol et al. (arXiv:2504.13359, v1 17 Apr 2025)
formalized it three months earlier — "We formalize cost-of-pass: the expected monetary cost
of generating a correct solution" — and Efficient Agents' own abstract says "*Using* the
cost-of-pass metric". Reword to "cost-of-pass (Erol et al. 2025), applied to agent
frameworks by Wang et al. (2025)." Related: Irregular (industry evaluator, Dec 2025)
published "Expected Cost per Success… the total cost of all attempts divided by the number
of successes" with F38's logic nearly verbatim ("a success would likely cost $100-$200… the
challenge should be treated as practically solved"). F33/F38's *norm* is already known;
what is ours is the concrete failure episodes (see §4).

### 2.7 Prior art splits on F33's exclusion rule — and one of our own citations does the opposite

METR excludes instrument failures (HCAST, arXiv:2503.17354: "These runs are considered
invalid, and are excluded from our agent results plots"; time-horizons, arXiv:2503.14499:
"a small number of runs failed due to internal infrastructure issues"). But Vats et al.
2026 does the reverse, verbatim: "Infrastructure failures (sandbox quota, image build) are
classified as ERROR and counted in the denominator of the cell (n=50) but not as solved."
F33's rule 9 is a choice with precedent on both sides — the paper cannot claim prior art
uniformly excludes infra failures. Its justification must stand on the magnitude of what
the choice changed (luna 79% → 96.5%), which no published work demonstrates.

### 2.8 The norm's founder warns against ranking models by dollars

Kapoor et al. §4: for *model* evaluation, "it makes sense to stay away from dollar costs,
because… measurements don't change over time (whereas costs tend to come down)." Erol et
al. report cost "roughly halved every few months." F30 ranks *harnesses* (defensible:
downstream/procurement comparison), but any model-level cost table must carry the
price-snapshot caveat. F38's retraction arc is exactly this trap springing.

### 2.9 Liu et al. anticipates F35 on accuracy — and explicitly limits the generalization

arXiv:2609.17394 (full title: "Coding Agents Have Converged: …"; public code at
github.com/Adkid-Zephyr/resolution-audit): "Exact paired McNemar tests separate none of the
29 adjacent Verified top-thirty pairs at α=0.05, while the larger Test split separates 14 of
23"; "observed within-model scaffold ranges reach 29.8 percentage points, compared with the
8.8-point spread of the top thirty." Crucially, they bound their own claim:
"irresolvability is a property of a converged comparison set, not of the benchmark family."
SWE-bench issue #621 adds: "#1 first becomes significant at rank 9" and anticipates F29's
logic — "Run-to-run variance is additional noise on top of this, so it would only make more
ranks tie, never fewer" — without measuring it. F35 survives as the cost-side, repeated-run
version; any generalized "cost leaderboards are mostly noise" wording overreaches even the
accuracy-side literature. Kotawala 2026 (arXiv:2605.30315) and Neuhof & Benjamini
(arXiv:2606.08679) are further adjacent-tie antecedents to cite.

### 2.10 Smaller contradictions of convenience

- **OpenAI's cache discount is quoted inconsistently across our own sources**: CacheProbe
  says 90% on the GPT-5 family; tianpan says 50%; CAPC writes β=0.5; a Sep 2026 rate card
  lists 90%. Never quote a single figure — parameterize by model and date or drop it.
- **Practitioner literature contradicts a broad reading of our negative cache result**:
  tianpan — "Cache hit rate is the most impactful cost lever in an LLM stack"; Requesty's
  "defining economic lever" above. Our claim must stay scoped: cache hit rate does not drive
  the *cross-harness billed-cost spread on these tasks/providers*, and the cache *regime*
  decides the cross-provider comparison — not "cache discipline doesn't matter."
- **Atil et al. is mischaracterized in the repo**: their §8.1 says serving optimizations
  "*might* lead to non-deterministic behavior… we can only speculate", with one deterministic
  local control run. The repo's "cause traced to serving optimizations" overstates; soften.
- **Gema et al. (2406.04127) is about ground-truth errors** ("6.49% of MMLU questions
  contain errors"), not "error bars / prompt sensitivity" as the repo parenthetical says.
- **LiteLLM [35]**: the cheapest arm's hit rate is 93% **tied** with Sonnet-only — "the
  HIGHEST hit rate" should read "joint-highest".
- **Pei et al. (2604.22750)**: "runs on the same task can differ by up to 30x in total
  tokens" is run-to-run stochasticity, not the repo's "per-model token usage varies up to
  30x".
- **notes/records/FINDINGS.md says the suffix is "eleven words"**; the string in `conditions/arms.mjs:37`
  is 15 words. Fix one.
- **Anthropic's 37% is not "total tokens"**: the exact sentence is "Average usage dropped
  from 43,588 to 27,297 tokens, a 37% reduction on complex research tasks" (mechanism:
  keeping tool results out of context), and the companion docs number is explicitly
  input-side ("reduced billed input tokens by roughly 38%"). FINDINGS' stated tension —
  "Anthropic reports code-mode CUTS total tokens by 37%; we find code-mode emits MORE output
  per step" — dissolves: theirs is an input/context-dominated usage figure, ours is output.
  Present our result as complementing, not contradicting, Anthropic's, and quote exactly.

---

## 3. Sources that should change our wording

1. **F37**: delete any "first to measure caching cost in agents" — cite Lumer et al. and
   present the provider split as documented background (Lumer §3.2 + five vendor doc pages).
   Our contribution: the controlled toggle on coding harnesses reporting hit rate + billed
   cost + solve-rate jointly, and the ranking-decided-by-a-provider-default framing. Use the
   full title "Don't Break the Cache: …".
2. **F30**: scope past Ndzomga (quality ranks transfer, ρ=0.90–0.96) and past the published
   accuracy-side instability; cite Claw-SWE-Bench in the C1/F30 threats, not only under C4;
   keep "does not transfer", never "reverses" (per the repo's own rule). Chen et al. full
   title is "The Price Reversal Phenomenon: …" — use it.
3. **F31**: keep the refuted account scoped to "output's share of the bill / the provider's
   output:input price ratio predicts the code-mode penalty across providers". Practitioner
   mix accounts (Coralogix, amnic) concern cost *levels* and are not refuted; the accounting
   identity stands (F1/F2). Phrase the provider dichotomy as "provider-side automatic, no
   request field" vs "client opt-in, request field required" (Anthropic now brands an
   "Automatic caching" feature). Present Singh et al. §VIII as the assumption's clearest
   published statement — verified verbatim — and F31 as its first empirical test.
4. **F32**: never imply the lever is new — cite Renze 2024 (identical "Be concise."
   instruction, −22.67% cost), Cavewoman, and the JetBrains/Caveman agent-side test.
   Attribute the Sonnet null to the three published mechanisms. Keep accuracy scoping.
5. **F35**: not the first "adjacent entries are inseparable" result — cite Liu et al.,
   Kotawala, issue #621, Neuhof & Benjamini; adopt Liu's scope limit (ties are a property of
   a converged comparison set at a given design). Claim novelty only for the *cost* axis
   with repeated runs and paired intervals.
6. **F29**: drop any "first measured run-to-run cost variance" (Bai 30×, Chen 9.7×); claim
   the first placebo (A/A) arm-level billed-cost noise floor, and differentiate from Chen's
   per-query "irreducible noise floor" — they own that phrase.
7. **F33/F38**: cost-of-pass → Erol et al. 2025; joint cost+accuracy norm → Kapoor 2024
   (founded) and HAL (arXiv:2510.11977, institutionalized); infra-exclusion → precedent on
   both sides (METR excludes; Vats counts-as-unsolved). Our contribution is the concrete
   failure-mode demonstrations, not the norm.
8. **OTel [47]**: cite the new `open-telemetry/semantic-conventions-genai` repo URL, quote
   metric and attribute, note "Status: Development".
9. **Terminal-Bench [3]**: the "chosen to maximize performance" sentence is the *paper's
   Figure 1 caption*, not leaderboard copy; date-stamp v2.0 (a 2.1 fixing 28 of 89 tasks
   exists).
10. **Cloudflare [23]**: 1.17M→1,000 is a tiktoken input-token estimate, not billed usage.
11. **Hugging Face [25]**: 42.3%/51.3% are trace-level correlations; "21.3%" is a relative
    gap; the blog lists with-errors first.
12. **Vats et al. [7]**: now has an ICML 2026 virtual page — "preprint with no peer venue"
    (T1) is stale. Their benchmark is Terminal-Bench **Pro**, and their cost ordering is
    stable across models — cite precisely.

---

## 4. Where our result is stronger than the prior art

Measured here and, per this pass, measured nowhere else:

1. **A placebo arm-level cost contrast (F29).** A treated arm known to be untreated,
  differing 7.7% at n=62/arm with one CI excluding zero. No A/A or placebo noise floor
  exists in the LLM/agent evaluation literature in any unit; the nearest numbers (Bai 30×
  tokens, Chen 9.7× tokens, Liu 5.4pp resubmission median, Atil 15% accuracy) are different
  quantities. This is the study's cleanest novelty: it is the number that lets anyone read
  anyone else's harness cost comparison.
2. **A pre-registered regression test of the price-ratio account, refuted with a confidence
  interval (F31).** The ratio/mix account exists only as untested practice (AA's 7:2:1,
  verified verbatim: "a blended price assuming a 7:2:1 ratio of cache hit, input, and output
  tokens") and an untested caveat (TCA §VIII). Nobody has regressed a harness cost penalty
  on output share and reported the opposite sign with leave-one-provider-out robustness.
3. **The controlled cache-field toggle with the triple readout (F37).** Hit rate + billed
  cost + solve-rate invariance, same model, same tasks, concurrent conditions. Lumer has
  cost+TTFT on research QA; Requesty/AIMultiple are observational; the controlled toggle on
  coding harnesses, and the demonstration that a provider-specific default *decides a cost
  ranking* while the standard methodology holds it constant, is unfilled.
4. **Rank-transfer statistics for cost across providers (F30).** Median Spearman 0.286,
  permutation p=0.012, 63.6% winner retention, 54.0% within-DSH — no published analog; all
  prior transfer work is accuracy, and all prior harness cost work is single-regime.
5. **Cost-side adjacent-rank inseparability with repeated runs (F35).** The accuracy
  version exists (Liu et al.); the cost version with paired cluster bootstrap does not.
6. **The concrete reclassification episodes (F33/F38).** No published case of a headline
  benchmark number materially changing after instrument failures were reclassified (luna
  79→96.5%, GLM-5.3 97.5→100%), no published mixed-denominator exact-test error report, and
  no published retraction of a cost/capability inversion because the cheap model failed too.
  Present these as case studies, not as discovery of the cost/solve-rate coupling.
7. **Per-run attribution embedded in the credential (C4 residue).** Still nobody found:
  run identity in the synthetic credential with provider-reported per-request cache split.
  CAPC's RUN_NONCE is the closest published idea and is request-*content* for isolation, not
  credential for billing attribution — the repo's distinction is accurate.

---

## 5. Citations to add, with the reason each is needed

| citation | why it is needed |
|---|---|
| **Lumer et al., arXiv:2601.06007** ("Don't Break the Cache", full title) | F37's nearest antecedent; pre-empts mechanism novelty; bounds magnitude (41–80%). Without it F37 is attackable as ignorant of the field. |
| **Zheng et al., Claw-SWE-Bench, arXiv:2606.12344 — pinned to v1** | Closest prior art to both F30 (per-harness billed cost rankings, "Accuracy ranking, however, is not cost ranking") and the cache-decoupling negative (§5.2). Re-file from C4 into C1/F30 threats. v2 changed the method — v1 only. |
| **Requesty, "The Economics of Coding Agents" (requesty.ai/coding-agent-economy + data page)** | Published per-harness hit rates linked to per-call cost across nine agents; our F37 framing must differentiate controlled toggle from this observational linkage. |
| **AIMultiple A-CODE-CLI Bench** | Second independent per-harness cache/cost measurement; names Goose as non-caching — speaks directly to one of our arms. |
| **Weinberger et al., arXiv:2608.01347** ("Prompt-Induced Waste in Coding Agents… A Preregistered Benchmark with Harness Extensions") | Preregistered, documents automatic caching cutting ~61% of the would-be bill, probabilistic hits, a zero-cache provider-route anomaly — and **uses DeepSeek Harness (dsh) 0.1.0rc7 itself**. Must-cite for F31/F37 and a provenance item for Methods. |
| **TwinRouterBench, arXiv:2605.18859** | Measured cache-aware routing economics (realized OpenRouter cost, cache_write/cache_read grader with Anthropic's 5-min TTL); belongs in the routing section and the C4 threat table. |
| **Artificial Analysis — Coding Agent Index methodology + blended-price methodology** | Per-agent cached-token telemetry tied to a public cost metric ("we treat cached input separately from uncached input… include cache-write charges") and the 7:2:1 blend that instantiates the account F31 refutes. Both halves needed. |
| **Renze 2024, arXiv:2401.05618 (CCoT)** | The identical "Be concise." instruction with −22.67% cost measured. Without it F32 reads as novel when the lever is two years old. |
| **Cavewoman, arXiv:2606.24083** | Output-compression cost A/B (1.4–2.4×, 17/20 cells) with a strong-model exception — supplies both the effect-size envelope and a published mechanism for the Sonnet null. |
| **Caveman + JetBrains A/B (The New Stack / daily.dev write-ups)** | The only independent agent-harness measurement of a conciseness instruction (~10% cost, quality flat, p=0.82) — the magnitude tension F32 must answer. |
| **Erol et al. 2025, arXiv:2504.13359** | True founder of cost-of-pass; fixes the attribution error (§2.6). |
| **Irregular, "Expected Cost per Success" (Dec 2025)** | F38's amortized construction in print with numbers; cite when presenting F38's denominator discussion. |
| **Liu et al., arXiv:2609.17394 + Kotawala 2605.30315 + SWE-bench issue #621 + Neuhof & Benjamini 2606.08679** | F35's accuracy-side antecedents and scope limits; reviewers will cite them if we don't. |
| **METR HCAST (2503.17354) and Measuring Long Tasks (2503.14499)** | Precedent for rule 9's exclusion of instrument-failure runs — paired with Vats et al. for the counter-practice (§2.7). |
| **Vendor caching docs, first-party**: DeepSeek kv_cache guide; Gemini caching; Alibaba Model Studio context-cache; z.ai cache docs | The automatic-camping half of F31/F37's provider split from primary sources. Note z.ai's ~50% read discount vs 0.1× elsewhere — discount depth is a third axis the paper should name once. |
| **Bonatti, Bergemann, Smolin et al., arXiv:2502.07736** | Provider-side price-setting theory; observes "input tokens are priced lower than output tokens with the price ratio being constant across all regimes" — one economics citation if wanted. |
| **Kapoor et al. 2024 §4 + Erol et al. (price decay)** | The caveat that dollar costs halve every few months — required wherever the paper prints model-level dollars (§2.8). |

Not to cite: arXiv:2508.10032 ("The Cost of Thinking") — confirmed a jailbreak-safety paper,
off-theme (repo already handles this correctly); Chen et al. 2021 Codex for anything about
cost (pass@k carries no cost analysis).

---

## 6. Artefact risks — is the effect one provider's pricing UI?

Evidence found that could make the effect a billing artefact rather than a mechanism,
with the mitigation the paper needs:

1. **Billed cost = usage fields × list price.** That is the same estimator Lumer uses, not
   invoices. Braintrust (our own citation) warns platform-reconstructed cost diverges via
   "missing cached-token fields, stale registry prices, batch discounts". The paper needs a
   per-provider console/invoice reconciliation — CAPC demonstrates the template ("billing
   total reported by Anthropic matched our mechanical calculation… within 1%"), and the
   repo's own F27 ($308.16 vs $191.31, 1.611×) shows what happens without one. Note the
   repo currently has two unreconciled Anthropic correction factors (7.43× and 1.611× —
   CRITICAL-REVIEW §3.3); every Anthropic dollar inherits that cloud until resolved.
2. **DeepSeek peak/off-peak pricing (since 2026-08-16)**: billed cost depends on time of
   day; the three meters moved independently (cache-hit input 6.1×). F37's A/B ran
   concurrently — good; the main matrices need the same run-time-interleaving disclosure.
3. **Access-path dependence**: cache passthrough varies by route (a July 2026 OpenRouter
   test found GLM-5 billed −75% on repeat while DeepSeek/Kimi/GPT-4o/Claude/Qwen got zero
   cached tokens routed, vs 98% native on DeepSeek). The paper must state all traffic went
   direct through its own logging gateway. Related: a documented meter artefact in the wild
   (DeepSeek V4 Flash cached tokens billed at ~357× the published rate on one hosted
   surface, Aug 2026).
4. **Shared-credential cache merging** (CacheProbe, verified): on shared-credential gateways
   the prompt cache merges across all tenants — cache state observed through such a gateway
   can be polluted. Our synthetic-key design shares one real key upstream *by construction*;
   the paper must show runs were time-isolated or the hit rates are attackable as
   cross-run/cross-tenant artefacts.
5. **TTL pacing**: the 5-minute TTL makes hit rates cadence-sensitive (Not Diamond's 10–20×
   on expiry). Report inter-turn timing parity across arms/conditions.
6. **Haiku's 4,096-token cacheable minimum** (§2.1): could explain part of the Anthropic
   baseline independent of harness behavior. Report per-arm cached-prefix sizes.
7. **Internal carry-overs**: F30's cross-provider statistics must not inherit the two
   documented internal pricing defects (the model-alias bug that priced Anthropic records
   at DeepSeek rates, and the flat-1.611× generalization of one provider's reconciliation).
   Also: two of the "providers" in the ratio pair are two *models* on one provider (z.ai) —
   the "5 providers / 21 model pairs" phrasing must disclose intra-provider pairs or the
   provider count shrinks.
8. **F29 specifically**: a 7.7% placebo gap could partly encode billing granularity
   (per-request rounding, cache-state differences between the duplicated arms) rather than
   usage noise. State which provider the placebo ran on, whether the arms differed in cache
   state, and ideally re-run the placebo against tokens (not dollars) to separate billing
   artefact from usage noise.

Nothing found suggests the *direction* of any measured effect is a dashboard artefact —
all vendors expose the token-type accounting in API responses, and two independent gateway
operators (Requesty, AIMultiple-via-LiteLLM) reproduce cache-driven cost spreads from
response telemetry. The risks are about attribution and reconciliation, not existence.

---

## 7. What could not be verified

- **z.ai's official caching docs**: one agent's URL 404'd; another fetched
  `docs.z.ai/guides/capabilities/cache` successfully (the ~50% read discount). Single-fetch
  confirmation only; capture the page into `_ev/` before relying on it.
- **Anthropic Economic Index June 2026, Chapter 2 body**: fetch truncated after Chapter 1 +
  previews; only the preview sentence ("tokens… rise with the estimated value of the work")
  is verified.
- **Cavewoman's affiliation**: "Adobe Research" is asserted only by the Caveman README; the
  arXiv page shows author Morayo Adeyemi with no visible affiliation. Verify before writing
  the affiliation in the paper.
- **Semantic Scholar citation counts** for all 2026 IDs (HTTP 429 throughout); corroboration
  used arXiv, citing papers, author pages, and search snippets instead.
- **Han & Sun OpenReview API venue strings** (challenge-walled); venue verified from the
  PDF footer, as before.
- **The live tbench.ai leaderboard** (client-side rendered; empty table on fetch) — the
  scaffold sentence was verified in the paper's Figure 1 caption instead.
- **Claw-SWE-Bench's "claws"**: quotes verified from v1/v2 HTML, but the harness identities
  behind the claw names were not independently established.
- **The "Confucius Code Agent" lead (arXiv:2512.10398)** — surfaced as same-model
  cross-scaffold controlled experiments; unpursued this pass.
- **Terminal-Bench 2.1** (reported to fix 28 of 89 tasks): existence noted via a Snorkel
  leaderboard description; not fetched.
- **Any cost-side run-count guidance** in the literature (how many seeds for a cost
  comparison): confirmed absent — which is what positions F29's 7.7% as the first such
  number, but also means there is no external check on it.

---

*Prepared by an 8-agent verification swarm, 2026-10-01. Every quotation above was fetched
live today from the cited URL. Repository otherwise unmodified.*
