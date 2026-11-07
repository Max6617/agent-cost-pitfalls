# JOURNAL-PLAN — raising the standard from preprint to publication

A journal submission changes three things that matter: **the evidence has to survive hostile
review**, **the effect has to generalise**, and **the statistics have to be pre-specified**. Everything
below follows from those, not from a desire for more data.

---

## 1. What peer review will attack, and the answer to each

| attack | why it lands | what we must have |
|---|---|---|
| **"n=1 task"** | the whole result could be one task's quirk | 30–40 tasks, stratified by multi-stepness |
| **"one model, one provider"** | the cache effect may be a DeepSeek artefact | ≥3 models, ideally 2 providers |
| **"you configured your own arm"** | we authored the DSH conditions and work in DSH daily | held-out tasks, pre-registration, no post-hoc tuning, unmodified harnesses, full artifact |
| **"the cache contaminates the design"** | repeated prefixes warm the cache across runs | measured, randomised, and `cost_cold` reported as the cache-insensitive contrast |
| **"p-hacking"** | 6 arms is 15 pairwise tests | pre-registered primary contrast + Holm correction |
| **"prompt-cache hit rate is not a contribution"** | it is a measurement, not a theory | pair it with a **mechanism test** (§4) |
| **"not reproducible"** | alpha software, moving targets | pinned versions, seeds, raw logs, one-command rerun |

The third row is the one that decides the paper, **and the fact is easy to get wrong.**
**The authors did not develop DSH and are unaffiliated with it** (`PRE-REGISTRATION.md` §11,
`METHODS.md` §10); DSH is DeepSeek's open-source harness. What the authors authored is **its study
conditions**, and DSH is their daily working environment.

The risk is therefore not that results were fabricated in DSH's favour. It is **configuration
asymmetry** — the DSH arms may be configured with more care, or more knowledge of the system, than
the third-party arms, and `METHODS.md` says plainly that this "is not eliminated". That is still not
disqualifying, but it makes the artifact release, the pre-registration and the unmodified-harness rule
the answer to the first question a reviewer will ask.

---

## 2. The design

**Factors.** Presentation {native, ptc} × Policy {shipped, optimized} × Harness (DSH + 5 external) ×
Model (3) — blocked by Task.

**Unit.** One headless run of one harness on one task, in a fresh copy of the fixture, graded by a
hidden test suite.

**Sizing.** From `tools/power.mjs`, using the within-cell CV observed at milestone 1 (21.9%):

| effect to detect | task blocks at ρ=0.5 | at ρ=0.8 |
|---|---|---|
| 10% cost difference | 38 | 16 |
| 15% | 17 | 7 |
| 20% | 10 | 4 |

Task-to-task heterogeneity is **not** in that estimate and is normally the larger term, so treat these
as **floors**. Target: **40 tasks**, 5 seeds, 6 harness arms = 1,200 runs per model. At 3 models,
**3,600 runs**.

**Cost.** Milestone 1 ran ~$0.0025 per trivial task. Real tasks will be 10–30× that, so budget
**$100–300**. This remains the cheapest part of the project.

**Wall clock is the real constraint.** ~20 s per run × 3,600 = **20 hours sequential**. Needs the
parallel runner (§5).

---

## 3. Statistics, pre-registered

- **Primary contrast, declared in advance:** `dsh:ptc` vs `dsh:native` on **billed cost per solved
  task**. One test. Everything else is secondary and Holm-corrected.
- **Model:** linear mixed-effects with **task as a random intercept** and harness as a fixed effect.
  A paired t-test ignores task heterogeneity; a mixed model does not.
- **Report:** effect size with a bootstrap 95% CI, not p alone. A journal wants the magnitude.
- **Quality guard, as a gate not a footnote:** if solve rates differ by more than the CI overlap, the
  cost comparison **is not interpretable** and must be reported as such. The analyzer already refuses.
- **Both cost variants always:** `cost_cold` (cache-insensitive, comparable across designs) and
  `cost_billed` (real-world). Milestone 1 is the proof they can disagree in **direction**, so
  reporting one alone is a methodological error.

---

## 4. The mechanism test — what turns a measurement into a contribution

Milestone 1 found PTC at **95.6%** cache hit against native at **86.0%**, consistent across both seeds
and both policy variants. A reviewer will ask *why* a presentation layer changes a cache hit rate. We
need an answer, and we have the data to test it:

**Hypothesis.** The provider cache is a prefix match. In PTC mode the model emits one `run_code` block
whose shape repeats turn after turn; in native mode it emits a sequence of differently-shaped tool
calls. Variation *inside the re-sent history* lands after the cached prefix, so each shape change
forces a re-read of everything downstream.

**Testable predictions, all from logs we already collect:**
1. PTC's per-step prefix grows more monotonically than native's.
2. The cache-miss tokens should concentrate **immediately after** a tool-shape change in native mode.
3. The gap should shrink on tasks with few distinct tools, and widen with tool diversity.

If the mechanism does not hold, that is also a finding — and a more interesting one than the original
number, because it would mean the effect is an artefact of something we have not identified.

**We are not starting from a clean slate:** the routing literature already shows model switching
destroys cache hits (89% → 78–83%), and the research corpus already documents cache-discipline rules.
The novel part is measuring it **per harness, per mode, at the provider**.

---

## 5. What has to be built

| piece | why | status |
|---|---|---|
| **parallel runner** | 3,600 runs cannot be sequential | **building** |
| **multi-model dimension** | one model is not generalisable | **building** |
| **task-suite validator** | 40 unfair or non-discriminating tasks waste the whole budget | **building** |
| **mixed-effects analysis** | paired t-test ignores task heterogeneity | to do |
| **Holm correction** | 15 pairwise tests | to do |
| **mechanism analysis** | §4 | to do |
| **artifact package** | pinned versions, seeds, logs, one-command rerun | to do |
| **related work** | position against routing, caching and harness literature | to do |

---

## 6. What I need from the human

**The 40 tasks.** Nothing else is blocking, and nothing I build can substitute for them.

Each needs: harness-agnostic, objectively gradable by a hidden test suite, stratified across
single-step / multi-file / repo-wide / long-horizon, and **not** used to design any preset. Copy
`tasks/example-fix/`.

Second, eventually: **a second provider** if one is available. A cache effect that replicates on a
provider with different cache semantics is a much stronger claim than one measured entirely on
DeepSeek.

---

## 7. Honest status

- Milestone 1 is **not** a journal result. One task, two seeds, no power.
- The effect is **consistent in direction** across two independent matrices and **unstable in
  magnitude** (26% then 12%), which is exactly what n=2 looks like.
- Everything in §5 that says "building" is being built now, offline, at no API cost.
- The single largest risk is **task quality**, not compute, not money, not tooling.
