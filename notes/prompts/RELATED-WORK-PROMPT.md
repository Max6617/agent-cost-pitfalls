# Related work — research work order

Everything below the "---" line is the prompt. Copy from "You are building" to the end.

---

You are building the related-work foundation for a research paper about what makes coding-agent
harnesses expensive to run, and why their cost rankings do not transfer between model providers.

Your job is to find, verify and organise the prior work — and to be **adversarial about it**, because
the paper's central claim is one a reviewer will want to knock down.

## The paper you are supporting

**One-sentence question:** when different coding-agent harnesses solve the same task with the same
model, why do their costs differ — and why does the ranking change with the provider?

**The claims, in the order they matter:**

**C1 (headline, preliminary).** *The harness cost ranking is provider-dependent.* The same harness
advantage **reverses** between two providers whose output:input price ratios differ. Measured: one
harness is 23% cheaper on a provider pricing output at 2x input, and 5% **more expensive** on a
provider pricing output at 3.33x input. The proposed mechanism — that code-mode presentation emits
more output, so it loses its advantage as output gets relatively pricier — made a falsifiable
prediction that then held across 227 runs. **Consequence we intend to claim: any single-provider
harness benchmark is unsound.**

**C2 (causal).** Tool presentation is *manipulated*, not observed. Presenting 24 tool schemas instead
of 1 raises model request count by **20–34%**, consistently across 408 runs on two providers.

**C3 (negative).** Prompt-cache discipline is **not** the driver. Cache explains **−5%** of the cost
spread; the cheapest arm had the *worst* cache hit rate.

**C4 (methodology).** A gateway between harness and provider captures the provider's own cache
accounting and attributes every request to a run by embedding the run id in the synthetic credential.

**We retract one claim of our own** (a cache effect that "replicated" three times on a single
30-line task) and would rather find work that contradicts us now than after submission.

## Your deliverable

A single file, `notes/literature/RELATED-WORK.md`, in the repository, with three parts.

**Part A — Annotated bibliography**, 40–70 entries, grouped by theme:

```
[N] Author(s). "Title." Venue, year. URL
    Theme: <one of the themes below>
    Claim: <what it argues or measures, in one or two sentences>
    Relevance: <supports / contradicts / precedes / orthogonal to C1-C4, and which>
    Quotes: "<a short verbatim quote that supports your Claim line>"
```

**Part B — Related-work section draft**, 800–1,400 words of prose citing Part A by number, ending
with a **novelty statement** narrow enough to be defensible.

**Part C — Threat list.** The papers a reviewer would cite as *"this has been done."* For each, state
what it covers and what it does **not** cover that we do. This is the most valuable part of the
deliverable.

## Themes — search all of them

1. **Provider/model transferability of agent results.** Does a ranking that holds on one model hold on
   another? Any work on leaderboard instability, benchmark transfer, or model-dependent agent
   performance. **This is the most important theme: it is the direct prior art for C1.**
2. **Tool interface design.** Effects of the **number of tools**, schema size, or tool-name ambiguity
   on agent behaviour. Tool retrieval / RAG-for-tools / dynamic tool selection. Work showing "too many
   tools" degrades performance. **Direct prior art for C2.**
3. **Code-mode / programmatic tool calling.** Anthropic's "code execution with MCP", Cloudflare's
   "Code Mode", and any academic treatment of models writing code to call tools rather than emitting
   structured calls. Any *cost* comparison of the two.
4. **Output verbosity.** Output-length control, verbosity bias, cost of verbosity, prompt effects on
   response length. Whether *harness design* (not just prompting) changes token usage.
5. **Prompt caching in agent loops.** Mechanics; cache-aware scheduling; cache destruction by routing
   or context edits; anything measuring **cache hit rates** in agentic settings. **Prior art for C3.**
6. **Cross-harness / cross-agent cost measurement.** Evaluations comparing multiple coding agents that
   report **tokens or cost**, not only pass rates. Any work instrumenting a *proxy* between agent and
   provider. **Prior art for C4.**
7. **Agent harness architecture.** Scaffold design: ReAct vs plan-execute, context management,
   compaction, tool-result pruning, and how scaffolding affects token use.
8. **Evaluation methodology.** Variance, seed counts, task selection, multiple comparisons, benchmark
   contamination, replication. We retracted a claim over single-task "replication" and this theme
   bears directly on our credibility.
9. **Cost and token economics of LLM agents.** Token consumption per task, input:output asymmetry,
   cost of long-horizon agents, production telemetry.
10. **Model routing and cascades.** Cost/quality trade-offs; relevant because routing changes cache
    behaviour and because provider choice is the paper's independent variable.

## NON-NEGOTIABLE: no fabricated citations

A hallucinated reference is fatal — it destroys the credibility of everything else, and reviewers
check.

- **Fetch every URL before citing it.** If it does not resolve, or the title or authors do not match,
  drop the entry.
- **Quote verbatim.** Every `Quotes:` line must be text you actually read on the fetched page. If you
  cannot find a supporting quote, you do not understand the source well enough to cite it.
- **Never cite from memory.** Model recall of titles and years is unreliable, especially for recent work.
- **No placeholders.** No entry without a working URL.
- **Prefer primary sources** — the paper or the official engineering blog, not a summary of it.
- **Mark uncertainty.** Write `venue unknown` rather than guessing; say when something is a preprint.

End with a **"Sources I could not verify"** section. Its presence is expected; its absence is
suspicious.

## START HERE — harvest two files that already exist

Do not begin from a blank page. Two research documents were compiled earlier in this project and
already contain **87 distinct cited URLs between them, 22 of them arXiv papers**, gathered for an
overlapping question:

| file | size | what it holds |
|---|---|---|
| `notes/literature/token-efficiency-and-routing-report.md` | 39 KB | **56 URLs, 21 arXiv papers.** Programmatic tool calling / code-mode, token-cost levers, routing models, and Anthropic's published cost and intelligence measurements. Every quantitative claim already carries its source URL and unverifiable claims are marked UNVERIFIED (only 2). |
| `notes/literature/agent-harness-comparison.md` | 26 KB | **31 URLs**, mostly harness repositories, plus a section titled "Prior art / evidence for programmatic tool calling". |

**Your first pass is to harvest these**, then:

1. **Re-verify every citation you reuse.** Fetch the URL. These were compiled 2026-09; titles and venues
   still need checking, and a reused-but-wrong citation is exactly as fatal as an invented one.
2. **Convert what is relevant into Part A entries** with the required Claim, Relevance and Quotes
   fields. These documents carry URLs but not verbatim quotes, so each source still has to be fetched
   and read.
3. **Then search for what is missing.** Their focus was token efficiency and routing, so they will be
   thin on the four themes that matter most now: provider transferability, tool-interface design,
   verbosity, and evaluation methodology. Those need original searching.

Report explicitly which Part A entries came from these files and which you found fresh.

## Where to look

- **arXiv** (cs.SE, cs.AI, cs.CL, cs.LG) — keyword search plus citation chaining from the best hits.
- **Venues**: ICSE, FSE, ASE, NeurIPS, ICLR, ICML, ACL, EMNLP.
- **Engineering blogs**: Anthropic, OpenAI, Cloudflare, DeepSeek, Z.AI, and the harness vendors.
- **GitHub**: repositories, docs, and issues/discussions where token usage or cost is discussed.
- **Citation chaining**: for every strong hit, read what it cites and what cites it.

## The specific prizes

Ranked by how much damage finding them would do to us:

1. **A paper showing that agent cost rankings transfer across providers** — that would falsify C1.
2. **A paper measuring per-harness cache hit rates** — that would undercut C4's novelty.
3. **A paper comparing code-mode against native tool calling on cost** — that would undercut C1 and C2
   together.
4. **A paper showing the number of tools presented does not affect request count** — that would
   falsify C2.

If any of these exist, find them and say so plainly. Do not soften it.

## Output

Write `notes/literature/RELATED-WORK.md` in `C:\Users\user\betterharness\`. Read `notes/records/FINDINGS.md` first — it has the
current status of every claim, including the retraction — and `METHODS.md` for how we measure.

Do not modify any file other than `notes/literature/RELATED-WORK.md`. Report at the end: entry count, the thinnest
themes, **the strongest threat you found**, and anything you could not verify.
