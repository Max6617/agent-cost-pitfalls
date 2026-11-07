# RUN PLAN — tomorrow

Everything here is prepared. The only thing missing is API keys.

---

## Step 0 — load credit

| provider | amount | why |
|---|---|---|
| **Anthropic** | **$25** | pilot + ratio-5.0 runs. The pilot decides whether this is $11 or $36. |
| **OpenAI** | **$10** | luna is $0.73 per full suite; sol ~$25 |
| **Alibaba (Qwen)** | **$10** | full suite is $3.33 |
| **z.ai** | top-up | GLM-5.3 needs $33 more to reach 540 runs |

Total ~$75 to commit, comfortably inside the $200 budget.

## Step 1 — pilot FIRST (it is worth $300)

**Question: does DSH set Anthropic/OpenAI cache breakpoints?** Both vendors use *explicit*
caching. If DSH does not set them there is no cache at all and the bill is **3.4x higher** —
$167 or $560 for the full grid.

Start the gateway (note there is no line-continuation backtick here; keep each command on one line):

    node tools/measure-gateway.mjs --port 8789 --upstream https://api.anthropic.com --upstream-openai https://api.anthropic.com --log results/anthropic-gateway.jsonl --force-model claude-haiku-4.5 --max-tokens-ceiling 32768

Then one run:

    node tools/run-experiment.mjs --only example-fix --seeds 1 --jobs 1 --harness dsh --gateway http://127.0.0.1:8789 --model claude-haiku-4.5 --out results/pilot

Read results/anthropic-gateway.jsonl:

- **cacheReadTokens > 0** -> caching works, full grid ~$167
- **all zero** -> no caching, full grid ~$560. Stop and rethink before buying.

## Step 2 — the terseness ablation (~$8, highest value per dollar)

The causal test of the mechanism. Cells: {native, ptc} x {default, terse}.

    node tools/run-experiment.mjs --seeds 1 --jobs 4 --harness dsh --gateway http://127.0.0.1:8788 --model glm-5.3-flash --out results/ablation

Six arms are registered: the four originals plus dsh:native-terse and dsh:ptc-terse.

**Prediction: under terse, the PTC penalty shrinks or disappears.** If it does, the mechanism
is causal. If it does not, the penalty is a property of code-mode itself and the paper says so.

## Step 3 — ratio 5.0 (the headline test)

Run haiku, then restart the gateway with --force-model claude-sonnet-5.5 and a new log. Same for
OpenAI with gpt-6-luna and gpt-6.1-sol.

**OPENAI IS NOT READY.** DSH speaks Anthropic Messages; OpenAI speaks chat-completions. Two
options, in order:

1. **dsh-llm-pi-ai** — DSH is own multi-provider adapter takes a per-route baseURL, so it can
   speak OpenAI natively from configuration. Needs a conditions/openai.yml insert patch and
   verification. **Not built yet.**
2. **Run OpenAI on the non-DSH arms only** (opencode, cline) and note the asymmetry.

Until (1) is built and verified, do NOT promise OpenAI results.

## Step 4 — the rest

| model | notes |
|---|---|
| glm-5.3 | top up from 75 to 540 runs, ~$33 |
| qwen3.8-flash | full suite $3.33 |
| harder tasks | **needs authoring first**, see notes/prompts/HARD-TASKS-PROMPT.md |

---

## Prepared vs not prepared

**Ready:** fractional scoring (passRate per run) · terseness ablation arms (6 registered) ·
preflight script · gateway pricing for all four ratio-5.0 models including 1.25x cache writes ·
Qwen pricing with its input-size tiers · budget calculator.

**Not ready:**

- **OpenAI via DSH** — needs the pi-ai patch, unverified
- **Cline in the matrix** — solves tasks but made ZERO gateway requests. **Do not run it until
  that is resolved.** A harness that works and measures nothing is worse than one fewer arm.
- **Goose** — not an npm package, needs its own installer
- **SWE-agent** — install fails on a Python version constraint
- **Harder tasks** — need authoring; the brief is written

## The three things most likely to go wrong

1. **No caching on Anthropic/OpenAI.** The pilot answers it in one run. Do the pilot.
2. **A new model is far more verbose than GLM-Flash**, which is what the projection assumes.
   GLM-5.3 was 61% more verbose and the estimate missed by 42%. Re-measure after ~20 runs of any
   new model rather than trusting the projection.
3. **Spending exactly to the line.** A run killed mid-matrix wastes everything already spent on
   it. Keep a 15% buffer.


---

## What the Anthropic pilot cost, and what it taught (added after the fact)

The pilot ran for **about 13 cents** and found five bugs before any real money was committed.

### Provider-specific facts that must be honoured

| provider | Messages endpoint | needs |
|---|---|---|
| DeepSeek | `<root>/anthropic/v1/messages` | nothing special |
| Z.AI | upstream already ends `/anthropic` | `--upstream-openai` for chat |
| **Anthropic** | **`<root>/v1/messages`** | **`--native-messages`** |
| Qwen | root-level | `--native-messages` + `--upstream-openai` |

### Three things DSH sends that Anthropic rejects

1. `dsh_*` private fields — `400 Extra inputs are not permitted`
2. `effort` **nested inside `output_config`** — `400 does not support the effort parameter`.
   Stripping top-level `effort` does nothing; the field is not top-level. Found only by
   logging `bodyKeys`.
3. `thinking:{type:'enabled'}` without `budget_tokens` — required by Anthropic.
   The gateway supplies a fixed budget rather than disabling thinking, because thinking
   changes output volume and output volume is the mechanism under test.

### Caching — the answer that mattered

**Anthropic uses EXPLICIT caching and DSH sends no breakpoints, so there was no cache at
all: cacheHitTokens = 0, every input token at the full rate, 3.4x the projection.**

The gateway now injects `cache_control:{type:'ephemeral'}` on the system prompt and last
tool. Measured on the same six runs: hit rate **0.0% -> 26.7%**, cost **$0.0703 -> $0.0637**.

**Still unmeasured at scale.** 27% is a cold-cache figure and cache writes cost 1.25x.
The real rate needs 372 runs before any budget is committed.

### Operational rules learned the hard way

- **Verify credit before starting a matrix.** Two providers ran dry mid-matrix this session;
  one produced 258 runs that looked like failures and were not.
- **The gateway key must be read inside the launcher script**, never passed on a command
  line, or it appears in process listings and job labels.
- A module that prints on import **silently corrupts** any value captured from its stdout.
- **A success message must describe the effect, not the intent.** The launcher printed
  "workspace id: supplied" while the flag never reached the gateway.
