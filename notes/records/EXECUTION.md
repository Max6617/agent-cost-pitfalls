# EXECUTION — what was built, what was measured, what is staged

Follow-on to [notes/plans/PLAN.md](../plans/PLAN.md). Everything here was executed **from inside a running
DSH session**, under one hard rule: *touch nothing that can break the session doing the
work.* Concretely that meant:

| zone | effect on the running session | touched? |
|---|---|---|
| `~/.dsh/.agent-presets/*` (new presets) | none — a preset is composed when a session starts, and a session cannot change preset after its first message | ✅ yes |
| `~/.dsh/profiles/web/cordis.patch.yml` | **`patchReload: live` → reloads the host process** | ❌ **staged only** |
| shipped preset install | overwritten on upgrade; the `cordis` preset's own prompt forbids editing it | ❌ never |
| installing plugins / restarting DSH | restarts the host | ❌ staged only |

---

## 1. Correction to the research (found by executing)

**notes/plans/PLAN.md claimed the shipped `standard` preset was missing the spill policy — that was wrong.**

`dsh --profile web --dump-default-config` shows `spill-local` + `spill-policy`
(`maxInlineBytes: 50000`) mounted on the **host plane**, shared by every preset. I had read only
the agent-plane composition and concluded a gap that does not exist. The host/agent split is
explicit in the shipped presets' own header comment — "the host composition keeps everything a
preset must not own" — and spill is one of those things.

**The real preset-owned levers** are the tool catalog, the persona, and the compaction/pruner
thresholds. The host owns spill caps, web-fetch caps, model defaults, retention and the reminder
plugin. That distinction is what the staged patch below is about.

---

## 2. What was built

### Four new presets in `~/.dsh/.agent-presets/`

| preset | base | enabled rows | what it changes |
|---|---|---|---|
| **PTC (optimized)** `ptc-opt` | `ptc` | 22 (was 25) | PTC + economy persona, pruner 8192/4096/1024 → **6000/3000/800**, goal and ralph rows off |
| **Standard (optimized)** `standard-opt` | `standard` | 22 (was 25) | native + economy persona, same pruner tightening, goal and ralph rows off |
| **Research** `research` | `standard` | 21 | read-only investigation: source-grounded claims, per-source subagent fan-out, source budgeting, cited deliverable; workflow, goals and ralph off |
| **Economy** `economy` | `ptc` | **12** | fs, shell, web, compaction only. No skills, subagents, jobs, todos, planning or goals |

They are **copies**, not edits to shipped files, so an upgrade cannot overwrite them and the
built-ins keep working. Round-tripping the shipped presets is untouched.

**The persona changes are the prompt-audit lever** — the cheapest win in the research (§9.4:
re-tuning prompts for the current model moved a run from "36% more per ticket" to "14% cheaper
*and* more accurate"). Each new preset states its economy rules explicitly: batch into one program,
return the smallest sufficient result, narrow searches over whole-file reads, no environment
checks, no unrequested scaffolding.

### Three tools in `tools/`

| tool | what it does |
|---|---|
| `dsh-audit.mjs` | reads the durable session logs (concatenated-zstd JSONL), reports context composition per category, PTC batching and containment, and scans the stable prefix for cache-breaking content |
| `validate-presets.mjs` | parses every preset composition (with Cordis' `!!js` tag) and resolves every plugin row against the installed modules — catches a broken preset before a session does |
| `preset-catalog.mjs` | prints the enabled-row comparison table across all eight presets |

---

## 3. What was measured (real data, not estimates from the literature)

From `node tools/dsh-audit.mjs` on 356 local sessions.

### PTC containment — 69.5%

In the session that produced this plan: **813,062 characters stayed inside `run_code` programs**
while **356,556 characters of tool results entered the conversation**. Two thirds of the intermediate
work never touched the context window. That is the PTC lever measured on live traffic rather than
quoted from a vendor.

### PTC batching — 1.73 sub-calls per model tool call

94 model tool calls dispatched **163 tool sub-calls** — roughly **69 round trips avoided** in one
session. Sub-call mix: `pwsh×52, edit×24, web_fetch×23, write×19, read×15, list_agents×10`.

### Tool schemas: 25 → 1 (but the fixed prefix grows slightly)

| | declared tools | tool-schema tokens | system-prompt tokens | **fixed prefix** |
|---|---|---|---|---|
| native sessions (older, preset unrecorded) | ~21 | ~5,545 | ~3,164 | **~8,709** |
| `ptc` sessions | **1** | **236** | ~9,434 | **~9,670** |

PTC collapses 25 tool schemas into one `run_code` schema — a **96% cut in schema tokens** — but the
generated TypeScript SDK moves into the system prompt, so the *fixed prefix* is actually **~11%
larger**, not smaller. Since the prefix is cached (~2–10% of input price on DeepSeek), that ~961
extra tokens costs approximately nothing, while the round trips it removes are real. The honest
summary: **PTC is a round-trip lever, not a prompt-size lever** — exactly what the research
predicted, now confirmed locally.

### Where the context actually goes (this session, ~233k estimated tokens)

| category | share |
|---|---|
| tool results | **40.0%** |
| tool-call arguments (the TypeScript programs themselves) | **26.3%** |
| assistant text | 23.0% |
| user messages | 7.0% |
| system prompt | 3.6% |
| tool schemas | **0.1%** |

Tool results are the largest single consumer, which is what the pruner tightening targets. Note the
second row: in PTC mode the *program text the model writes* is itself a quarter of the context — a
cost the "PTC saves tokens" framing usually omits, and the reason the new personas say "return the
smallest sufficient result" rather than just "use PTC".

### Cache-risk scan

Clean, apart from one "relative time wording" hit that is almost certainly a false positive from
researched page text. The request header and system prompt carry no timestamps, clocks or counters —
DSH's plan-mode comment ("the tool catalog stays the same across modes for request-cache stability")
is borne out in practice.

> **Honest limitation:** DSH does not log per-request provider usage, so a true provider cache-hit
> rate is **not derivable** from the session logs. The composition numbers above are estimates from
> character counts (CJK-aware) and are sound for ranking and share, not for billing. Treat the
> "median 84% cache reads / target ≥94%" figures in notes/plans/PLAN.md as the target to verify in the provider
> dashboard, not something this tool can confirm.

---

## 4. What is staged, and why

`scripts/host-optimizations.patch.yml` — four host-plane changes, **not applied**:

| row | change | reasoning |
|---|---|---|
| `spill-policy` | `maxInlineBytes` 50000 → **32000** | shrink the inline copy of oversized results; the full text stays on disk |
| `web-fetch-http` | `maxBodyChars` **100000 → 40000** | a single fetch can currently inject ~25k tokens; fetches are the second-largest measured consumer |
| `repeat-tool-reminder` | 3 thresholds → 2, preview 500 → **200** | reminder text is injected into the conversation |
| `session-title-llm` | `maxInputBytes` 4096 → **2048** | one LLM call per session; keep it small |

Each entry carries the row's **full** config, so it is correct whether the loader merges or replaces.
Apply it yourself — the file's header has the exact commands, including
`dsh --profile web --dump-config`, which composes and verifies the tree **without booting anything**.

---

## 5. How to use this — `scripts/harness.ps1`

One script drives everything. It targets **Windows PowerShell 5.1** (no PowerShell 7 needed) and has
a `.cmd` wrapper for cmd.exe or double-clicking.

```powershell
scripts/harness.ps1 check        # safe: validate presets, show the catalog, patch status, context report
scripts/harness.ps1 apply -DryRun # show exactly what would change; writes nothing
scripts/harness.ps1 apply        # merge the host patch, verify, auto-rollback on failure
scripts/harness.ps1 rollback     # restore the newest patch backup
scripts/harness.ps1 audit        # full context audit across every session
scripts/harness.ps1 presets      # dry-run regeneration of the four presets (-Force to overwrite)
```

`check` is the default, so running `scripts/harness.cmd` with no arguments is harmless.

### Why `apply` is safe to hand you

It refuses to run while a DSH host is listening on 3080 (this profile is `patchReload: live`, so
applying would reload it mid-session) unless you pass `-Force`. When it does run it:

1. copies the patch file to `cordis.patch.yml.bak.<timestamp>`,
2. merges the four staged entries **by id** (idempotent — re-running replaces rather than duplicates),
3. composes the tree with `dsh --profile web --dump-config` and asserts all four values landed,
4. **restores the backup automatically** if the composition fails or any value is missing.

The merger refuses to rewrite a patch file whose body uses `!!js`, because re-emitting YAML would
flatten that expression into a string — it tells you to merge by hand instead.

### What each piece is

| file | role |
|---|---|
| `scripts/harness.ps1` / `scripts/harness.cmd` | the entry point (above) |
| `tools/preset-spec.mjs` | the declarative definition of the four presets — bases, edits, metadata |
| `tools/personas/*.txt` | the persona text for each preset, kept as plain files |
| `tools/make-presets.mjs` | copies a shipped preset and applies the spec; every edit asserts exactly one match, so upstream drift fails loudly |
| `tools/patch-yaml.mjs` | id-keyed merge into a Cordis patch file |
| `tools/dsh-audit.mjs` | session-log audit (composition, PTC batching/containment, cache-risk) |
| `tools/validate-presets.mjs` | parses a preset composition and resolves every plugin row |
| `tools/preset-catalog.mjs` | enabled-row comparison across presets |

`make-presets.mjs --dry-run` was run against the shipped originals and reproduced the four installed
presets **byte-for-byte** (13529 / 14718 / 13923 / 14778 bytes), so the spec is a faithful record of
what is on disk rather than an approximation of it.

### After applying

Start a **new** session and pick a mode: `PTC (optimized)` for multi-step work,
`Standard (optimized)` for single-step or interactive work, `Research` for investigation,
`Economy` for cheap bulk edits. A running session cannot change preset, so the new modes apply to
sessions started after the change.

---

## 6. Recommended next steps

1. **Apply the staged patch** when no session is mid-turn, then verify with `--dump-config`.
2. **Baseline before/after** with `dsh-audit.mjs`: run the same three tasks on `ptc` and
   `ptc-opt`, compare the tool-results share and total estimated tokens.
3. **Check the provider dashboard** for the real cache-hit rate — the one number this tooling
   cannot measure, and per the research the single best predictor of the bill.
4. **Only then** consider the decision layer (notes/plans/PLAN.md §4). The measured evidence says routing is the
   last lever, and the four presets plus the patch capture most of the available win with no router
   at all.

---

## 7. How much more efficient is it? (modelled, not yet measured end-to-end)

**Short answer: the four presets are worth roughly 3–5% on a coding session. The big wins are
structural, and two of them are still on the table.**

No session has run the new presets yet (a running session cannot change preset), so these are models
over real logged content — `tools/estimate-gain.mjs`, `tools/audit-tool-volume.mjs`,
`tools/audit-fetch-caps.mjs` — not an end-to-end before/after.

| lever | measured basis | effect | confidence |
|---|---|---|---|
| **PTC containment** (mode choice, already available) | 896k of 1.28M tool-traffic chars stayed inside `run_code` programs | **~70% of intermediate tool traffic never enters context** | **measured** |
| **Research fan-out** (the `research` preset's policy) | `web_fetch` is **76.1%** of all tool-result volume across 328 native sessions (20.5M of 27.0M tokens) | potentially **the largest remaining lever** — a subagent returns a report instead of the pages | **unmeasured** |
| Result folding (pruner 8192/4096/1024 → 6000/3000/800) | modelled over **6,163 results**: retained content 12,965,003 → 11,047,277 chars, **14.8% less** | **~5.9%** of total context (at a ~40% tool-result share) | modelled |
| Tool catalog trims (goals + ralph) | 746 schema tokens measured from a native header; minus ~169 tokens of added persona | **~0.2–0.5%** — cached, so paid once per session | modelled |
| Staged spill cap 50000 → 32000 | 9,983 fetches; median **5,126 chars**, p90 20,431 | **6.0% of fetch volume ≈ 1.8%** of total context | modelled |
| Staged `maxBodyChars` 100000 → 40000 | only 3% of fetches exceed 40,000 chars | **~0.8%** — small, the volume is many moderate pages, not a few huge ones | modelled |

**Total for a coding session on `ptc-opt` vs `ptc`: ~7–8%** (folding ~5.9%, catalog ~0.3%, caps ~1.8%
once applied).

> **Correction.** An earlier version of this table reported the folding lever at **8.1%** over 3,401
> results. That number came from a filter that read the preset from `session.data.agentPreset` when
> `agentPreset` is actually a **top-level** field on the session header, so it silently selected the
> wrong sessions. With the filter fixed the figure is **14.8% over 6,163 results**. The direction was
> right and the magnitude was wrong by nearly half — worth recording, because the same bug ran through
> `audit-tool-volume` and `audit-fetch-caps`.

### What this reveals

**Capping fetch size does almost nothing; containing fetch *content* does a lot.** `web_fetch` is
three quarters of all tool-result volume, but the volume comes from **9,983 moderate pages**, not a
few enormous ones — the median is only 1,282 tokens. Lowering the cap to 16,000 chars would still
only save 21.9%, while ruining the tail. The lever that actually works is never putting the page in
the main context: fetch inside a `run_code` program (PTC containment) or inside a subagent that
returns a summary. That is exactly what the `research` preset's fan-out rule asks for, and it is
the one thing here I have **not** been able to put a number on.

Which also means the honest ordering of this whole project is: **mode choice ≫ prompt/policy ≫ the
trims I made.** PTC containment at 70% and research fan-out are worth multiples of the ~3–5% the
presets add.

### How to actually measure it

```powershell
scripts/harness.ps1 check
node tools/estimate-gain.mjs ptc
node tools/audit-tool-volume.mjs
node tools/audit-fetch-caps.mjs
```

Run one representative task on `ptc` and the same on `ptc-opt`, then compare the
tool-results share and total in `scripts/harness.ps1 check`. Two caveats worth remembering: the provider
cache-hit rate is the number that actually predicts the bill and **DSH does not log it**, and these
composition figures are CJK-aware character estimates — good for ranking, not for billing.

