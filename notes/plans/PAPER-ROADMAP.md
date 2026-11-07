# PAPER ROADMAP — process content moved out of the paper

*Moved out of `PAPER.md` on 2026-10-10 (review item 12). This is project state, not paper content: the
ablated paper states claims, and the record of what is done and what remains lives here and in the
handovers.*

## §7 as it stood before the move

## 7. What remains before submission

| item | state |
|---|---|
| the six-model results | **done**, re-derivable from the artifact |
| `notes/records/STEP2-RECONCILIATION.md` §7 | **done** - the six-model reconciliation |
| mixed-effects analysis (`notes/plans/JOURNAL-PLAN.md` §5) | **done 2026-10-04** - the filed random-intercept model fitted by REML for H1, H3 and H4, reported beside the existing estimates. H1 and H4 put the task variance at the boundary (`s_u` = 0) and their verdicts do not move; H3 keeps its verdict with a real ICC of 0.134 (`notes/records/MIXED-EFFECTS-2026-10-04.md`, `analysis/mixed-effects-6model-2026-10-04.json`) |
| `METHODS.md`, `notes/records/CROSS-HARNESS.md`, `notes/reviews/REVIEW-RESPONSE.md` | **done 2026-10-04** - all three rewritten on the six-model record (`5fddd5d`, `66fd7db`); the three no longer describe a pre-data study |
| F31, F35, F34 in `notes/records/FINDINGS.md` | **done 2026-10-09** — each of the three now opens with a READ THIS FIRST banner naming its six-model correction and what moves, so the stale seven-model numbers cannot be read without it. The figures are not replaced: §6 commits to keeping retractions visible, and the corrections sit beside them as before |
| related work | **drafted 2026-10-09** — §4, ~1,500 words, built from `notes/literature/RELATED-WORK.md` Parts A–E and the adversarial pass in `notes/literature/LITERATURE-2.md`, and rewritten around this paper's current claims rather than the retracted ranking-reversal framing it was first written under. It states explicitly what is *not* novel: per-harness cost and cache measurement at a gateway, scaffold sensitivity, tool-count effects on selection accuracy, and accuracy-side rank-tie statistics are all published |
| literature verification pass | **done 2026-10-09** - `notes/literature/LITERATURE-3.md`. Both unreadable items were read: the MDPI Electronics tool-pool ablation (Zappia et al., 15(14):3175) sweeps 4–24 tools on accuracy and latency only - adjacent to §3.5, no overlap; the "Agent Harness Engineering" survey (OpenReview eONq7FdiHa, under TMLR review) argues the *opposite* of what this row said - harness-over-model - so it is an ally, not an attack. Eight venues confirmed on primary sources (RouteLLM ICLR 2025; FrugalGPT TMLR 2024; Hybrid LLM ICLR 2024; Terminal-Bench ICLR 2026; Prompt Cache MLSys 2024; LongLLMLingua corrected to ACL 2024 main track; CacheBlend settled as EuroSys 2025; Vats et al. is an ICML 2026 *workshop* poster, not main conference); z.ai cache docs captured to `_ev/zai-cache.md`; Cavewoman authorship settled (three authors - Adeyemi independent, Adobe Research correct for Rossi and Dernoncourt only). The forward-citation pass found one concurrent-work anticipation of the cross-pricing experiment (Liu & Han, arXiv:2610.04433), one published billed-cost noise floor (Hu et al., arXiv:2609.30725), and a prior account of the output-verbosity mechanism (Yang et al., arXiv:2607.10569); §4's novelty statement and methodology paragraph are scoped against all three. Nothing found contradicts a current claim |
| ablations | **done 2026-10-09** — §3.9, `analysis/ablations-2026-10-09.json`, `node tools/ablations.mjs`. Arm variant, seed split, model leave-out and arm-restriction on the ranking, and provider leave-out on H3. Three of them changed what the paper says: §3.1a's spread-over-significance reading, §3.4's reliance on the median rho, and §3.8's count of real divergences |
| second task suite (`tasks-b/`) | **complete, valid AND ANALYSED**: the pre-registered replication verdict is **NOT REPLICATED** (R1 0 of 4, R2 fails; §3.8, F51), with the failure decomposed and shown to contain **no divergence robust to scale or arm string** (§3.9 A). `node tools/validate-tasks.mjs --dir tasks-b` reports **40 tasks, 40 valid, 0 invalid** at commit `50ba0eb`. The "21 of 40" carried by three documents was stale — verified on 2026-10-04 under both the old and the corrected validator, so it is not an artefact of that fix |
| the cost defect above | **open**; needs a normaliser test and a reconciliation test, written first |
| the position confound (limitation 8) | **resolved 2026-10-09, and the "factor of two" was never real.** The table that produced it was a rescaling - the estimator passed both arms' records to the function meant to summarise one arm, verified on 62 of 62 blocks - so "every differential roughly halves" was a position-frequency ratio. The corrected paired estimator moves GLM from -20.75% to -8.92% (log) or -17.27% (additive) and moves Qwen *up*, and it agrees with the slot regression on the additive scale (+51.79% against +52.97% for haiku). §3.1 carries both scales; `notes/defects/DEFECT-position-standardisation-artefact-2026-10-09.md` |
| message capture for mechanism P2/P3 | **not collected**; message and tool contents are stored as counts |

---

## §7 of PAPER.md — "Tiering, honestly" (moved out of the paper, 2026-10-10)

*This section was paper content until 2026-10-10. It is project strategy — claim strengths, venue tiering, and what is blocking — not part of the submission. The paper now ends at §6, and the claims it states are already in the abstract and §3.1a/§3.7. NB: the venue paragraph is why the move happened: the owner asked why the paper talked about where to submit it.*

## 7. Tiering, honestly

**This is an evaluation-critique paper, and its venue follows from that.** The study measured a
cross-provider cost effect carefully; what survives is the measurement, and the strongest single result
in it is a failure.

| claim | strength | where |
|---|---|---|
| the penalty is large and model-specific (haiku +53.84% [+31.25, +76.73], GLM -20.75%, a 75.1-point adjusted spread) | **strong** | §3.1, §3.1a |
| the price ratio does not predict it — three models at ratio 5.00 differ by 59.5 adjusted points, 79.2% of the spread (70.6% raw, assumption-free) | **strong** | §3.1a |
| harness rankings do not transfer — median rho 0.238; half of the cross-harness adjacent steps cannot be ordered on either suite | **moderate** | §3.4 |
| the pre-registered replication of the headline pattern failed (R1 0 of 4, R2 fails), stably over 20 seeds | **strong** | §3.8 |
| tool surface costs requests (H3) — a direction, 1.010 to 9.642 across drops, null without luna on batch-1 | **weak** | §3.5, §3.9 D |

**What the paper no longer claims, and will not get back.** (i) There is no cross-harness retention
mechanism: §3.3's claim that the external harnesses retain less is a pooling artefact of the arm-name
bucket, and the section is restated as a withdrawn claim plus an open defect. (ii) There is no sign
result: GLM, the only significantly negative row, is null on both adjusted scales, and the
pre-registered replication of the sign pattern failed. (iii) There is no robust divergence count in the
replication: the two interval separations are knife-edge (0.6pp and 0.7pp on the log scale, 0.1pp and
0.5pp raw), vanish on the additive scale, and none survives the variant arm pair (§3.8, §3.9 A). (iv)
There is no robust confirmatory magnitude: H3's estimate runs 1.010 to 9.642 across suites and drops,
and is null on batch-1 once luna is dropped (§3.9 D). (v) The noise floor is no longer missing: a
corrected A/A gives a **±9.5%** floor at 31 paired tasks, wider than the withdrawn 7.7% and wider than
the two smallest effects reported here (limitation 9).

**Where this is publishable.** As a measurement and evaluation-critique contribution: a controlled
cross-provider cost measurement with a failed pre-registered replication reported as a result, a
rank-transfer negative, and evidence that the two summaries practitioners actually use — the price
ratio and a single provider's ranking — do not carry. That fits evaluation and measurement venues and
empirical-software-engineering venues that publish studies of agent tooling, and evaluation workshops
at ML conferences. **It is not a positive-result paper and should not be submitted to a top ML venue as
one.**

**What is blocking is writing, not money or data.** Nothing here needs another paid matrix: the
replication suite is collected, validated and analysed, the mixed-effects model is done, and the
ablations are done.
