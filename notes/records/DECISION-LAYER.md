# DECISION-LAYER — status, and what a comparison would take

## 1. Status: there is no decision model. None was built, and none is running.

Verified by audit of everything in this repository, not by recollection:

| check | result |
|---|---|
| routing / classification / decision logic in any file written here | **none.** The single match for "route" is a *print label* in \`tools/dsh-audit.mjs\` that reports the model route it read from a session log. It reads, it does not decide. |
| any tool that originates a model call to make a decision | **none.** The only LLM-endpoint \`fetch\` calls are in \`measure-gateway.mjs\`, which *forwards* what a caller sends and never originates a request, and in the two self-tests, which talk to a **fake local upstream**. |
| plugins installed into the profile | **none** — \`~/.dsh/profiles/web/package.json\` has \`"dependencies": {}\`. So \`dsh-auto-model-router\`, \`dsh-delegate-router\` and the \`jev_decide\` family are **not installed**. |
| host patch applied | **no** — \`cordis.patch.yml\` is still \`[]\`. |
| local model server running | **no** — the only listening local port is DSH itself on 3080. No Ollama (11434), vLLM (8000) or LM Studio (1234). |

**The user's reasoning is exactly right.** No decision model exists, no API key was ever given to
this work, and nothing local was running to stand in for one.

What *does* exist is the **design** for one (notes/plans/PLAN.md §4: D1–D5 decision points, deterministic-first
rules, reference architecture) and an **evaluation** of the community plugins that implement pieces
of it (notes/literature/RESEARCH.md §6). Both are documents. Neither executes.

### Why it was deferred rather than built

Not an oversight — the measurements said to. Across the research, routing was consistently the
*last* lever, not the first:

- savings collapse on this workload: **81% on GSM8K but only 21% on SWE-bench Lite**
- routing costs cache: fixed-model arms ran **89% cache-hit**, router arms **78–83%**
- no small model in a pre-registered study met a **≥0.85 accuracy / ≤2 s** viability bar
- orchestration paid off in only **two** measured situations

So the plan sequenced it last, after the presets and the caps. That sequencing still looks right.

---

## 2. The key question: most of a decision layer needs **no API key at all**

This is the part worth correcting. An API key is needed for the *agent runs*, not for the decision
mechanism — and the recommended design is the key-free one.

| decision mechanism | needs a key? | why |
|---|---|---|
| Heuristic lock / keyword scoring | **No** | in-process text scoring |
| Persona banding (spec / react / weak) | **No** | regex classification |
| **Phase map keyed on the pending tool call** | **No** | reads the tool call the agent is about to make — *this is the design notes/plans/PLAN.md §4.2 recommends* |
| Escalate-on-stall | **No** | observes a failing command or a repeat |
| LLM classifier on ambiguity | **Yes** | one small call per ambiguous input, only on the ambiguous branch |
| Real calibrated decision model (TypeSafe Jev) | **Yes** | a TypeSafe key, or a local model |

So "we can't have a decision model without a key" is false for roughly 80% of the design. The
deterministic layer is a small plugin over text and event data, and it would run with no credentials
whatsoever.

**What the key is actually needed for** is different: the **experiment's agent runs**. Six harnesses
must reach \`api.deepseek.com\`, and \`measure-gateway.mjs\` needs \`DEEPSEEK_API_KEY\` set to forward
their traffic. That key already exists — the running DSH session is using it — it just has to be
exported to the gateway when the experiment runs. That is a one-line environment variable, not a
blocker.

---

## 3. Can we compare it? Yes — and the gateway is what makes it measurable

The decision-layer question is currently answered only by **vendor benchmarks** (LiteLLM's, Not
Diamond's). It has never been settled on one's own traffic. This setup can settle it, because the
gateway is the single egress point: **every request the decision layer causes, and every cache hit it
destroys, lands in one log.**

### Comparison arms

| arm | what it is | key needed |
|---|---|---|
| \`ptc-opt\` | the optimized preset, no router — the control | — |
| \`dsh-route-det\` | + deterministic phase map / keyword scoring | **none** |
| \`dsh-route-llm\` | + LLM classifier on the ambiguous branch only | yes (the gateway captures its cost) |
| \`standard-opt\` | native presentation, no router — isolates presentation from routing | — |

### Hypotheses worth pre-registering

- **H1.** Deterministic routing lowers cost-per-solved-task on **short, chat-shaped** inputs and has
  no effect on repo-level tasks. *(The literature predicts exactly this split: 81% vs 21%.)*
- **H2.** Any router that changes model or persona mid-session **reduces** cache-hit rate, and the
  resulting repricing can exceed the tier saving. *(LiteLLM measured 89% → 78–83%.)*
- **H3.** The decision layer's own cost is small in absolute terms (the research suggests
  $0.05–0.34 against $4–20 of model spend) but is **only recovered when the tier gap is large and the
  context is short**.

H2 is the interesting one, and it is the one no vendor publishes honestly, because it argues against
selling routers.

### The measurement that settles it

Per arm, from \`results/gateway.jsonl\`:

- requests caused by the decision layer (count of classifier calls)
- **cache-hit rate before vs after the router engages**
- billed input tokens, split hit/miss
- cost per solved task, with the quality guard

The headline figure would be: *"routing saved X% on tier price and cost Y% in cache repricing, for a
net Z%."* Nobody has published that decomposition. That, not another leaderboard entry, is what makes
this worth writing up.

---

## 4. What is needed, in order

1. **Export a DeepSeek key to the gateway** when running the experiment. Required for any agent runs
   at all — decision layer or not.
2. **Build the deterministic router** as a small Cordis plugin (notes/plans/PLAN.md §4.2 rules). No key, no
   external service, fully testable offline — it can be unit-tested against synthetic transcripts
   with the same self-test discipline used for \`measure-gateway.mjs\`.
3. **Add the arms** to \`conditions/\` and run the existing matrix.
4. **Only if H1/H2 leave the key-free design looking insufficient**, add the LLM classifier branch and
   let the gateway price it.

Step 2 is the honest gap: the plan designed a decision layer and the work never built one. It is
roughly a day of work, it needs no credentials, and it is the only way to answer the question with
data instead of citing LiteLLM.

---

## 5. The two decision models, and whether your laptop can run either

Both are **System One** models: you give a state and a closed set of candidate actions, and they
return a probability per candidate. Neither generates text. Because CLM's server speaks TypeSafe's
wire format, **they are swappable behind one interface** — which makes them two arms with zero
integration difference.

| | **Jev** (TypeSafe AI) | **CLM-8B** (Stanford + NVIDIA Research) |
|---|---|---|
| released | 15 Sept 2026 | 23 Sept 2026 |
| licence | commercial, hosted | **Apache 2.0** |
| shape | hosted API | **75 MB head** over a frozen **Qwen3-8B** encoder + 20M trainable projection params |
| cost | per call | **zero marginal cost** once served |
| latency (reported) | 125–225 ms | **16.5–80 ms on a GPU** |
| accuracy vs the other | better | **not better on any published row** — ties on games, trails by 4 pts on BFCL v4 tool calling (95.2% vs 99.2%) |

**Read the "up to 9×" claim carefully.** It comes from ONE row — the T-Rex game, 16.5 ms vs 149.8 ms.
The other three rows are **1.6×–4×**. And that T-Rex number measures a *combined system*: a physics
planner labels each action in the prompt and a safety shield replaces unsafe answers. The README says
so plainly.

**The number that matters for this project:** CLM's DeepSWE 81.6% is **31 of 38 tasks**, and on **25 of
those 38 the verifier's choice could not change the result**. So a decision model's marginal
contribution is on roughly a third of decisions — which independently reproduces the finding in
notes/literature/RESEARCH.md §8.4 that only **29 of 294** questions were improvable by routing at all. Two unrelated
sources agree: **decision models only matter on a minority of decisions.** That is the paper's
framing, and it is why the deterministic router gates on ambiguity rather than routing everything.

### Can your laptop run CLM?

The reference setup needs a GPU:

```bash
vllm serve Qwen/Qwen3-8B --served-model-name qwen3-8b --runner pooling --max-model-len 2048 --port 8090 &
clm-serve          # downloads the 75 MB head on first run
```

**vLLM requires CUDA. Your machine has none.** Measured here: Intel i7-1260P, **15.7 GB RAM**, Intel
Iris Xe integrated graphics with **1 GB** shared VRAM, no CUDA runtime.

There is an escape hatch in the README itself — the in-process engine takes an arbitrary embeddings URL:

```python
from clm import Engine
engine = Engine(emb_url="http://127.0.0.1:PORT/v1/embeddings")
engine.rank(state, [candidate1, candidate2, ...])
```

So the encoder can be any OpenAI-compatible `/v1/embeddings` server, not only vLLM. Qwen3-8B at
4-bit is ~5 GB and fits in 15.7 GB of RAM, so a CPU backend (Ollama or llama.cpp with embeddings
enabled) is plausible. **Two honest caveats:** CLM expects the encoder run in *pooling* mode with a
specific pooling convention, and whether a CPU server reproduces it exactly is untested — that is a
30-minute experiment, not a guarantee.

**Realistic expectation on this laptop:** states are short and action embeddings are cached, so each
decision is one forward pass over the state. On a 12-core mobile CPU that is roughly **1–10 seconds**,
against 16.5–80 ms on an RTX 4090. That is **usable for once-per-user-input routing** — exactly the
design rule in `router-core.mjs` — and unusable per step. It will feel sluggish at the start of
each input.

### The three honest options

| option | cost | verdict |
|---|---|---|
| **Rent a GPU** (RunPod / Vast / Colab) for the experiment | small, hourly | **best.** vLLM + `clm-serve` as documented, expose over a tunnel, point the gateway at it: `--exempt clm --upstream-for clm=<url>` |
| **CPU via Ollama / llama.cpp** | free | possible but seconds per decision, and the pooling convention needs verifying first |
| **Skip both, for now** | free | the deterministic router already gets **87% of frontier quality at 56% cost with no classifier**. Prove the `weak` band is where your errors live *before* buying hardware for it |

### Why a local model is methodologically *better* for the paper

With CLM served locally, the decision layer's marginal cost is **zero**, so
"does the decision layer pay for itself?" stops being a dollars question and becomes a clean
**latency + accuracy** question. That is a sharper experiment than Jev, where per-call cost muddies
which side of the ledger you are on.

The catch: latency then depends on the serving substrate, and **CPU-only timings will not generalise**.
The paper must state the substrate and, ideally, report both.

### Wiring it in

```powershell
# decision model on its own upstream, exempt from the study's model enforcement
node tools/measure-gateway.mjs --port 8787 --log results/gateway.jsonl `
  --force-model deepseek-flash --force-effort high `
  --exempt clm `
  --upstream-for clm=http://127.0.0.1:8700
```

Then swap `decide()` in `router/router-core.mjs` for a call to `engine.rank()` or
`client.system_one()` **on the `weak` band only**. The ledger and the cache-safety guard keep
working unchanged, and `node tools/test-gateway.mjs` already proves an exempt client is attributed
and priced but never rewritten.

**Not verified:** CLM has not been installed or run here. Everything above is from the project README
and one critical third-party write-up. Treat the CPU path as an experiment, not a plan.

