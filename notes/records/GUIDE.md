# GUIDE — from here to a measured result

> **SUPERSEDED 2026-10-10 — this is the week-one guide to the router and host patch (2026-09-28).**
> The commands still work; the "current state" it starts from does not. For the current state see
> `notes/handovers/HANDOVER-2026-10-10-B.md`; for what the project produced, `PAPER.md` and `ARTIFACT.md`.

Ordered, executable steps. Each says what to run, what you should see, and what to do if it fails.
Nothing here needs an API key until **Step 7**, and nothing touches a running session until **Step 5**.

Current state, verified: git repo tagged `v0-baseline` (54 files), five presets installed and
validated, 13/13 router unit tests passing offline, gateway self-test 10/10.

---

## Part A — freeze the baseline (already done; repeat for checkpoints)

**Step 1. Tag the current state.**

```powershell
cd C:\Users\user\betterharness
node tools/snapshot-state.mjs --label v0-baseline   # records DSH-side state + hashes
git add -A; git commit -m "checkpoint"
git tag v0-checkpoint-$(Get-Date -Format yyyyMMdd)
```

The workspace repo alone is not enough — the presets live in `$DSH_HOME` and the host tuning lives
in the profile patch file. `snapshot-state.mjs` captures both, so a version can be restored and two
versions diffed:

```powershell
node tools/snapshot-state.mjs --label v1-router --diff v0-baseline
```

**You should see** a table of file hashes and a diff against the baseline. Right now the diff should
show only the new `ptc-router` preset.

---

## Part B — verify the decision layer offline (no API key, no session)

**Step 2. Run the unit tests.**

```powershell
node --test router/router-core.test.mjs
```

**You should see** `pass 13 / fail 0`. These tests pin the design rules: one decision per input,
ambiguity routes to "weak" instead of guessing, word boundaries, stall detection, and a structural
test asserting the core has **no imports and makes no network calls** — the proof it cannot need a key.

**If it fails:** the classification regexes are the fragile part. Fix the regex, not the test.

**Step 3. Watch it decide, without running an agent.**

```powershell
node -e "import('./router/router-core.mjs').then(m => {
  for (const t of ['Build a CLI that generates reports',
                   'Fix the crash when the config file is missing',
                   'Thoughts on the auth module?',
                   'hi'])
    console.log(JSON.stringify({ input: t, ...m.decide({ text: t }) }))
})"
```

Look for: build → `react`, fix → `spec`, "thoughts?" → `weak` (honest ambiguity),
"hi" → `routed:false` (too short to be worth deciding).

---

## Part C — smoke-test it in a real session

**Step 4. Turn the ledger on.** The preset ships with `ledgerPath: null`, so it writes nothing by
default. Without the ledger you cannot write up hypothesis H2, so set it now:

```powershell
$f = "$env:DSH_HOME\.agent-presets\ptc-router\agent.cordis.yml"
(Get-Content $f -Raw) -replace 'ledgerPath: null', "ledgerPath: $env:USERPROFILE/router-ledger.jsonl" |
  Set-Content $f -Encoding UTF8
node tools/validate-presets.mjs "$env:DSH_HOME\.agent-presets"   # must still resolve everything
```

**Step 5. Start a NEW session and pick the `PTC + router` preset.**

A running session **cannot** change preset — that is enforced by DSH, not a limitation of this setup.
So open a new session, choose `PTC + router` in the picker, and give it a real task.

**Step 6. Check that it actually routed.**

```powershell
Get-Content "$env:USERPROFILE\router-ledger.jsonl"          # one line per decision
node tools/dsh-audit.mjs                                    # newest session: route + composition
```

**You should see** ledger lines of kind `input`, `inject` and `route`, and the audit showing a
`route:` line that matches what the router chose.

- Ledger **empty** → the preset did not mount. Check the preset picker for a broken row with a reason;
  DSH lists broken presets rather than hiding them.
- `input` but no `route` → the input was below `minChars`, or the tier matched the default.
  That is correct behaviour, not a bug.
- `kind: error` → the plugin threw and degraded to no-routing, by design. The error text is in the ledger.

---

## Part D — measure the decision layer

**Step 7. Start the measurement gateway.** *First step that needs a key.*

```powershell
cd C:\Users\user\betterharness
$env:DEEPSEEK_API_KEY = 'sk-...'      # you supply this; nothing so far has needed it
node tools/measure-gateway.mjs --port 8787 --log results/gateway.jsonl --force-model deepseek-flash --force-effort high
```

Leave it running. Check `http://127.0.0.1:8787/__stats` — empty harness stats, no error.

**Step 8. Add the router arm to the comparison.**

```powershell
Copy-Item conditions\ptc-opt.yml conditions\ptc-router.yml
(Get-Content conditions\ptc-router.yml -Raw) -replace 'ptc-opt', 'ptc-router' | Set-Content conditions\ptc-router.yml
Get-ChildItem conditions          # should now list 5
```

**Step 9. Pilot before spending real money.**

```powershell
node tools/run-experiment.mjs --dry-run --seeds 2          # check the plan first
node tools/run-experiment.mjs --profile exp --seeds 2 --timeout-ms 900000
node tools/analyze-results.mjs
```

The pilot answers one question: **is the effect big enough to justify 450 runs?** If the router arms
sit within noise of the control, stop and report that — a clean negative result about deterministic
routing is legitimate, useful, and cheap here.

**Step 10. The measurement that settles H2.**

The headline is the decomposition: **tier saving vs cache-repricing cost vs net.** A router that
switches models mid-session loses that model's cached prefix; the gateway logs
`cacheHitTokens`/`cacheMissTokens` per request, so both sides can be priced.

---

## Part D2 — adding a decision model (Jev, or a small classifier)

A decision model is a **different kind of client** from a harness under test. Two things follow, and
both are easy to get wrong.

**Step 10a. Decide which integration point you actually want.** They answer different questions:

| integration | who initiates | use for |
|---|---|---|
| **as an agent tool** (`jev_decide`) | the agent, mid-task | judgements *inside* a task — triage these tickets, is this answer grounded, which of these drafts is better |
| **inside the decision layer** | the harness, at D1/D4 | routing and gating — the band, the tier, whether to escalate |

The community plugins implement the first (`dsh-jev-decide`, `dsh-jev-plugin`, and
`dsh-jev-adapter` for any OpenAI-compatible endpoint). **Evaluate those before building anything** —
reuse is the point of the plugin ecosystem. The second is what `router/` was designed to accept:
swap `decide()` in `router-core.mjs` for a call to your decision model, and the ledger and the
cache-safety guard keep working unchanged.

**Step 10b. Route the decision model through the gateway as an EXEMPT client.**

This is the trap. The gateway enforces one model across the study so no harness can quietly run
something else — but applying that to a decision model would **rewrite the decision model's own model
and destroy the measurement**. Exempt it, and give it its own upstream if it lives elsewhere:

```powershell
node tools/measure-gateway.mjs --port 8787 --log results/gateway.jsonl `
  --force-model deepseek-flash --force-effort high `
  --exempt jev `
  --upstream-for jev=https://api.typesafe.ai
```

The exempt client is still **attributed, logged and priced** — it just is not rewritten. That is what
makes the decision layer's own cost measurable, which is the whole point: the literature puts
classifier spend at **$0.05–0.34 against $4–20** of model spend, and nobody has checked that on their
own traffic.

`node tools/test-gateway.mjs` covers this: 15 checks including "exempt harness is NOT
model-rewritten" and "still attributed and priced".

**Step 10b-ii. Pick your decision model — and check your hardware first.** Two candidates, both
System One (state + candidate actions → probability per candidate, no text generation), and because
CLM speaks TypeSafe's wire format they are **swappable behind one interface**:

- **Jev** (TypeSafe) — hosted, commercial, per-call cost, more accurate (99.2% vs 95.2% on BFCL v4 tool calling).
- **CLM-8B** (Stanford + NVIDIA, Apache 2.0) — a **75 MB head** over a frozen **Qwen3-8B** encoder. Zero marginal cost once served, 1.6–4× faster on most rows (the "up to 9×" is one game row).

**Hardware blocker, measured on this machine:** CLM's reference setup needs `vllm serve`, and
vLLM requires CUDA. This laptop has an i7-1260P, **15.7 GB RAM** and Intel Iris Xe with **1 GB** — no
CUDA. The README's in-process `Engine(emb_url=...)` accepts any OpenAI-compatible
`/v1/embeddings` server, so a CPU backend is *plausible* (Qwen3-8B at 4-bit ≈ 5 GB fits in RAM),
but expect **1–10 s per decision instead of 16.5–80 ms**, and the pooling convention needs verifying
first. Full comparison and the three options — rent a GPU, run on CPU, or skip it — are in
[DECISION-LAYER.md](DECISION-LAYER.md) §5.

**Step 10c. If you use an OpenAI-compatible channel, say so in the paper.** On that path the returned
probabilities are the model's **self-reported estimates, not calibrated** ones. Only a real
decision-model API gives calibrated output. The adapter's README also warns that without an explicit
instruction to spread probability when uncertain, **confidence saturates at 1.0 and the routing signal
is lost** — a mandatory prompt detail, not a nicety.

**Step 10d. The hypothesis worth testing.** The deterministic core already gets
**87% of frontier quality at 56% cost with no classifier call at all**. So the honest question is not
"is a decision model better" but:

> Does a calibrated decision model beat keyword heuristics **on the ambiguous band only** — the inputs
> the deterministic router sends to `weak` — by enough to pay for its own latency and tokens?

That is a narrow, cheap, falsifiable experiment, and a negative result is as publishable as a positive
one. Arms: `ptc-router` (deterministic) vs `ptc-router+jev` (same, with the `weak` band delegated to
the decision model) vs `ptc-opt` (no decision layer).

---

## Part E — the cross-harness comparison

**Step 11. Install and smoke-test ONE external harness before installing five.**

This is the step most likely to fail, so do it once, cheaply, with OpenCode:

```powershell
# install per tools/harnesses.mjs, then point it at the gateway:
#   base URL  http://127.0.0.1:8787/v1
#   api key   exp-opencode-r001
# run one trivial task, then confirm the gateway saw it:
Get-Content results\gateway.jsonl | Select-String 'opencode'
```

**If the gateway log shows it** → that entry in `tools/harnesses.mjs` is now verified; update its
`verified` flag and repeat for Cline, OpenHands, Goose, Aider.

**If it does not** → the harness is not in the study. Better to learn that in an hour than after a
week of setup. Record it in `notes/records/CROSS-HARNESS.md` §2 with the reason.

**Step 12. Only then run the full matrix.** 6 arms × ~15 tasks × 5 seeds, randomised within blocks.

---

## Part F — writing it up

**Step 13. Start from the corpus study.** `notes/records/EXECUTION.md` §3 already holds a complete descriptive
result over 356 sessions and 27M tokens of tool output at **zero API cost**. Write that up first: it
is publishable on its own and it de-risks everything above it.

**Step 14. Decide what the paper claims**, using the ladder in `notes/records/CROSS-HARNESS.md` §8. The difference
between a good and a great paper here is one thing — explaining the variance rather than reporting the
ranking. The decomposition (fixed prefix / context growth / tool surface / cache hit rate) plus a
regression of cost-per-solved-task on those features is the contribution.

---

## What would make me stop

Three honest off-ramps, most likely first:

1. **The router shows no effect.** Report it. Deterministic routing is widely assumed to help; showing
   it does not, on repo-level tasks, with a clean design, is a real result.
2. **The external harnesses will not run headlessly against a custom endpoint.** Then the paper becomes
   the DSH study plus a documented negative on cross-harness comparability — itself worth writing,
   because everyone attempting this hits it.
3. **Budget or time runs out.** Stage 0 (the corpus study) is already done and already defensible.

## Current state at a glance

| piece | status |
|---|---|
| decision engine (`router/router-core.mjs`) | built, 13/13 tests pass, no key, no network |
| plugin adapter (`router/router-plugin.mjs`) | built against confirmed event signatures; defensive — cannot break a run |
| `PTC + router` preset | installed and validated (order 9) |
| gateway | built, 10/10 self-test pass |
| experiment runner / analyzer | built, dry-run verified |
| 5 external harnesses | **not installed** — Step 11 |
| end-to-end run with a real key | **not done** — Steps 7-9 |
