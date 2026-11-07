# Related work — third pass (short, targeted)

Send into the same session. This is deliberately small: two questions and one dangling item. If the
answer to both is "no prior work found", say exactly that and stop — a short negative is a real result.

---

Your first two passes were strong, and Part D closed nearly everything. One item dangles and our
claim has since changed, so this pass exists to stop the literature review going stale.

## What changed, and why it matters

The claim you tested was:

> rankings of coding agents by cost do not transfer across providers whose **price ratios** differ

The claim now is:

> the cost penalty of code-mode presentation scales with **output's share of the total bill**

That is narrower and more specific, and it emerged from data collected *after* your last pass: two
providers with **near-identical price ratios** (3.14 and 3.33) differ by ~31 percentage points in the
code-mode penalty, which a ratio-only account cannot explain. Output volume per step varies 1.4-2.3x
between arms and between model tiers.

**So the question you searched for is not the question we now have.**

## Question 1 — the new hypothesis

**Has anyone studied output volume, verbosity, or output-token share as a determinant of which agent
or tool design is cheaper — as opposed to merely reporting that output tokens cost money?**

The distinction is the whole point. "Output tokens are expensive" is arithmetic and needs no citation.
What would threaten us is prior work showing, or testing, that **the optimal design choice depends on
how output-heavy the workload is** — a design recommendation conditioned on the output share of cost.

Search for: verbosity control and its cost effects; output-length optimisation in agents; cost models
where output share is a predictor rather than a component; "when does code-mode win" analyses;
tool-calling versus code-generation cost comparisons **that condition on output volume**.

**Also state the inverse plainly if it holds:** if every source treats output as a cost *term* and none
as a design *variable*, say so — that is exactly the gap we occupy.

## Question 2 — a falsifier for output share

**Is there published evidence that output share does NOT determine relative cost between agent designs?**
Something showing a design that is output-heavy yet still cheaper, or output share varying without any
effect on relative cost. We would rather find it now.

## The dangling item

**Entry [7] reports a 40x difference in tokens per solved task between harnesses.** We measure a 46%
cost spread. Establish what that 40x actually measures — total tokens? across how many harnesses? —
and whether it is comparable to our quantity or something different. It is the largest number in the
bibliography and it is currently unexplained.

## Rules, unchanged

- Fetch every URL. Never cite from memory.
- Every entry carries a verbatim quote you actually read.
- If Question 1 or 2 is answered "yes", **lead with it**. Do not soften it.
- "No prior work found", with the list of what you searched, is a complete and valuable answer.

## Output

Append **Part E — Third pass** to `notes/literature/RELATED-WORK.md`. Two answers and the [7] resolution. Keep it under
a page unless you find something that matters.
