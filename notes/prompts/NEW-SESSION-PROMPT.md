# NEW MAIN SESSION — handover

Paste this into a fresh session. It is self-contained: assume no memory of the previous one.

---

## 1. What this is

A measurement study of what coding-agent harnesses COST when they solve the same tasks with the
same model, and why rankings move between providers. It is intended for an empirical software
engineering journal. Repo: `C:\\Users\\user\\betterharness`.

**The thesis is now METHODOLOGICAL, not mechanistic.** Two mechanism hypotheses were tested and
failed (see §4). What survives is: cross-provider cost comparison is systematically unreliable, the
field's standard methodology removes the variable that decides the ranking, and here is what it takes
to get it right. Read `notes/records/FINDINGS.md` F20 through F27 before anything else.

## 2. State of the data — check this first, it may have finished

Target design per model: **10 arms x 31 tasks x 2 seeds = 620 runs**, five harnesses.
Arm = one experimental condition; six are DSH configurations (native/ptc x shipped/optimized x
default/terse) and four are separate programs (opencode, cline, goose, openhands).

| model | dir | target | note |
|---|---|---|---|
| DeepSeek V4.1 Flash | `results/ds-full` | 620 | COMPLETE |
| Claude Sonnet 5.5 | `results/sonnet-full` | 620 | COMPLETE |
| Claude Haiku 4.5 | `results/haiku-full` | 620 | COMPLETE (654 records, 620 unique cells) |
| Qwen3.8-Flash | `results/qwen-full` | 620 | COMPLETE, provider charged nothing |
| GLM-5.3-Flash | `glm-flash` + `glm-terse` + `glm-harness` | 620 | COMPLETE across three dirs |
| GLM-5.3 | `results/glm53` | **310** (1 seed) | **may still be running** |
| gpt-6-luna | `results/luna-full` | 620 | **may still be running** |

**Check with:** `node tools/coverage.mjs`

## 3. The instrument — how measurement works

`tools/measure-gateway.mjs` sits between every harness and the provider. It swaps a synthetic key
`exp-<harness>-<runId>` for the real one, records per-request provider-reported usage (including
cache hit/miss), enforces the model, and prices each request. **Every claim rests on it.**

- Start a provider gateway: `scripts/start-provider.ps1 -Provider <deepseek|anthropic|zai|qwen|openai> -Port N [-Model M]`
  - **Anthropic and OpenAI keys are in `.keys.json`; the DeepSeek key is NOT** — use `scripts/start-gateway.ps1` for DeepSeek.
  - Anthropic needs `--native-messages` (its Messages API is at the root) and a workspace header.
- **The gateway modifies requests.** Some changes are required for the request to work (model aliasing,
  field stripping, `max_tokens` rename, thinking translation, the OpenAI Responses passthrough). **One
  is not: `cache_control` injection for Anthropic.** That is an intervention, it is live in all
  Anthropic data, and it is documented as a condition rather than a behaviour. `--no-cache-breakpoints`
  turns it off.

## 4. What is established, and what failed

**FAILED — do not revive without new evidence:**
- **H1** (code-mode penalty scales with output share of cost): **contradicted in direction**.
- **H2** (cutting output cuts the penalty): **not supported**, p = 0.4278, CI spans zero.
- **"the ranking inverts"**: false. An artifact of a cost function that omitted the output term.

**ESTABLISHED:**
- **OpenCode is the cheapest arm on all four datasets, under both cost functions.** Most reproducible
  result in the study.
- **Cross-provider cache activation differs enormously and decides the bill.** Measured hit rates:
  DeepSeek 92.7%, Qwen 91.4%, GLM-Flash 89.6%, luna 81.1% — all AUTOMATIC. Anthropic: Sonnet 27%,
  Haiku 12.9%, and **0% without the injected breakpoints**. Anthropic requires the client to ask.
  Haiku's bill was ~$157 where a 93% hit rate would make it ~$29.
- **"Be concise" appended to the task prompt cuts cost 29-32% at identical solve rate** (F22, 31 tasks).
- **F18 — a cheap model solves a hard task the pricier ones almost never do.** DeepSeek 3/7 at $0.073/run;
  Sonnet 1/30 at ~$0.20; Haiku 0/6 at $0.43. Fisher p ~ 0.01. **It is a THRESHOLD effect, not a
  capability gulf** — all score 80-100% of assertions. Label any use of it as such.

## 5. THE MOST IMPORTANT THING: two hostile reviews, only skimmed

**`critical-review.md` and `notes/reviews/REVIEW-FINDINGS.md` are independent audits of every paper-bound document.**
**They have only been read at heading level. Reading them properly is the first task.**

The most serious items, in the order I would address them:

1. **`critical-review.md` §2.1 — a timestamp inversion, unexplained.** Commits assert exact statistics
   for runs whose archived timestamps are LATER than the commit. `edae1b5` claims F21's p-value 64
   minutes before the first of its 124 runs began. The innocent explanation (archive re-runs) is
   argued against in the review. **This is an integrity finding and needs an evidential answer.**
2. **`critical-review.md` §2.5 — "the terse arms that were not terse."** NOT YET READ. Bears directly
   on F22, which is one of the surviving findings.
3. **Both confirmatory verdicts bent the pre-registered rules** — H1's regression was never computed;
   H2's rule says "inconclusive", not "NOT SUPPORTED", and the pre-registered test was substituted.
4. **The retracted DeepSeek price card (0.14/0.028/0.28) is still printed as fact in ~15 files**
   while F20 in the same repo calls it wrong in every cell. Real card: 0.15/0.003/0.60.
5. **F14's retraction is followed by the retracted claim**, verbatim, in the same file.

**Do not write a single paragraph of paper until 1 and 2 are answered.**

## 6. Rules this project learned the hard way

- **A non-zero exit is not evidence until its cause is known.** Three claims were written from
  infrastructure failures (F4, F14, and a 258-run DeepSeek credit exhaustion).
- **Never price from a summary.** The DeepSeek card came from a blog; the provider's own captured page
  disagreed in every cell and inverted the ratio. **Reconcile against the provider console:**
  `node tools/reconcile.mjs --model <name> --console-total <figure>`. Anthropic's console showed
  $308.16 where the log said $191.31 — a 1.611x under-report. **Every per-run figure scales by 1.61.**
- **A harness that runs, solves and measures nothing is worse than one that is absent.** luna ran a
  134-record matrix where 6 of 8 arms never reached the provider. Only per-arm solve rates exposed it.
- **Deleting an absent field is a no-op that looks like a fix.**
- **Never start a matrix without confirming the balance with the user.** Anthropic exposes no balance
  endpoint. Ignoring this cost ~$117 once.
- **Do not apply an optimisation to a running matrix.** It is the confound the review flagged as FATAL.

## 7. Useful commands

```
node tools/coverage.mjs                 # what data exists, per model
node tools/run-experiment.mjs --resume ...   # RESUME, never delete the output dir
node tools/run-watch.mjs                # watchdog: credit, RAM, gateways, stalls
node tools/rederive.mjs                 # re-price from tokens under a given card
node tools/reconcile.mjs                # check the instrument against the provider console
node tools/run-experiment.mjs --arms a,b   # subset of arms
node tools/run-experiment.mjs --no-cache-breakpoints   # Anthropic without the intervention
```

## 8. Suggested order of work

1. `node tools/coverage.mjs` — did the two running matrices finish?
2. **Read `critical-review.md` §2.5 and §2.1.** Answer them.
3. Read `notes/reviews/REVIEW-FINDINGS.md` in full. Its §I has a prioritised fix list.
4. Fix the document layer (stale price card, F14 restatement, pre-registration §12).
5. **F18 reproducibility, ~$21** — the same task, more seeds, DeepSeek + Haiku + Sonnet + luna +
   one of GLM-5.3/Qwen. This is the only remaining experiment that could raise the paper's ceiling.
6. **The Anthropic automatic-caching A/B, ~$35-45** — see `notes/plans/PLANNED-cache-ab.md`. One top-level field;
   prediction is hit rate 13% -> 80-90% and cost down ~5x.
7. Write, with F18 marked preliminary until step 5 replicates it.

## 9. Files that matter

`notes/records/FINDINGS.md` (the claim register) · `PRE-REGISTRATION.md` (v4, frozen at tag `prereg-v4`) ·
`METHODS.md` · `notes/literature/RELATED-WORK.md` · `critical-review.md` · `notes/reviews/REVIEW-FINDINGS.md` · `notes/plans/PLANNED-cache-ab.md` ·
`notes/status/SESSION-STATE.md` · `notes/plans/RUN-PLAN.md` · `tasks-hard/` (24 hard tasks, partial-credit grading).
