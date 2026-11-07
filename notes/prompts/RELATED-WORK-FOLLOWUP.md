# Related work — follow-up pass

Send this into the same session that produced `notes/literature/RELATED-WORK.md`. It has that context; this is a
targeted second pass, not a new survey.

---

You produced `notes/literature/RELATED-WORK.md` — 70 verified entries, three of which are close enough that we had to
narrow our claim. Good work, and the threat list in particular.

This pass is **not** about more entries. It is about two questions that decide whether our paper
exists, plus three confirmations. A short, precise answer is worth more than another 40 entries.

## What our claim now is

Narrowed after your pass:

> Rankings of coding agents by **cost** do not transfer across **providers whose output:input price
> ratios differ**, and the mechanism is the ratio itself rather than a property of the harness.

We have measured two providers: DeepSeek V4.1 Flash (ratio **4.00** — corrected 2026-09-30; the 2.0
printed here came from the retracted card, and the 22.8% figure was computed under it and has not
been re-derived here — see `notes/records/FINDINGS.md` F20), and GLM-5.3-Flash (ratio 3.33), where the advantage is
**absent**. We plan a third and fourth at
higher ratios. **Your job is to try to kill this claim.**

## Question 1 — the survival question

**Has anyone measured the cost of coding agents across PROVIDERS whose PRICING differs — not across
models, not across harnesses, but varying the provider's price structure?**

Existing work we know of varies:
- the **harness**, measuring **accuracy** (Zhang et al. — model-rank reversals)
- the **scaffold**, measuring **quality rank stability** (Ndzomga et al. — contradicts us)
- the **harness and model**, measuring **accuracy** (Han and Sun)

**None of them varies provider pricing and none measures cost.** If you find one that does, say so
loudly and precisely — that is the paper.

Search hard for: cost-aware agent evaluation, price-aware routing benchmarks, provider comparison
studies that report dollars, "cost per solved task" across providers, token-economics papers with a
provider dimension.

## Question 2 — the methodology question

**Has anyone captured the provider's own cache hit/miss accounting per request and attributed it to a
specific agent run?** Our gateway does this by embedding a run id in the synthetic credential.

If someone has published this technique, our methodological novelty (C4) weakens. Search for:
LLM proxy instrumentation, request-level usage attribution, cache telemetry for agents, gateway/proxy
based measurement of agent traffic.

## Confirmations

1. **Entry [8], Han and Sun, "How good is your harness?"** — the OpenReview PDF sits behind a bot
   check, so we could not verify it. Confirm it exists, get the correct venue and the full author
   list, and if it does not exist, **say so and remove it**. An unverifiable entry is a liability.
2. **Did you address all four of the "specific prizes" the first brief named?** The third and fourth
   were: a paper comparing code-mode against native tool calling **on cost**, and a paper showing the
   number of tools presented **does not** affect request count. If either exists, it matters.
3. **The 40x token figure in entry [7].** We measure a 46% cost spread; that entry reports a **40x**
   difference in tokens per solved task. Establish what that number actually measures and why it is so
   much larger. Either it is a different quantity or we are understating our own effect.

## One new angle

**Does the provider's PRICE STRUCTURE appear as an independent variable anywhere in the agent
literature?** Not caching as a feature — pricing *shape* (input:output ratio, tiered rates, cache
discount depth) as something that changes which system design is optimal. This is the gap our
mechanism sits in, and if someone has staked it out we need to know.

Related: work on **cost-aware system design** — where the economics of a provider change the optimal
architecture rather than merely the bill.

## Rules — unchanged, and they still matter

- **Fetch every URL before citing it.** No exceptions.
- **Every entry carries a verbatim quote you actually read.** If you cannot quote it, you do not know
  it well enough to cite it.
- **Never cite from memory.**
- **If the answer to Question 1 or 2 is "yes, someone has", lead with that.** Do not bury it, and do
  not soften it. We would much rather learn it now than from a reviewer.
- **"No" is a valuable answer.** `No prior work found` with a list of what you searched is a real
  result, and better than a padded section.

## Output

Append a **Part D — Follow-up** section to `notes/literature/RELATED-WORK.md`. Keep it tight: the answers to Questions
1 and 2 first, then the confirmations, then the new angle.

Do not modify any other file. Report: the answer to each question, what you searched, and anything you
could not verify.
