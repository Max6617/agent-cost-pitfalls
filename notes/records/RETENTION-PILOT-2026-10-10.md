# RETENTION-PILOT-2026-10-10 — external-harness prefix retention on Anthropic, route (b)

**Filed before any collection. Pre-declared 2026-10-10. Model: Claude Haiku 4.5 (study name
`claude-haiku-4.5`; the gateway maps it to the API id `claude-haiku-4-5`, and `GET /v1/models` on the
new key returns `claude-haiku-4-5-20251001` as active). Hard cost cap **$25**. Smoke before the matrix.
One collector at a time; no OpenRouter; no third party; the Anthropic key stays in `.keys.json`.**

## Why this exists

PAPER.md §3.3 and limitation 7: the four external harnesses reach Anthropic through the
OpenAI-compatible path, which reports no cache split, so **no external harness's retention is measured
on Anthropic** (`notes/defects/DEFECT-anthropic-external-costs.md:155`: 6,772 unknown-cache requests). The published
0.560/0.451 "external harness" retention was a pooling artefact and is withdrawn. What the study does
measure is the DSH arms on Anthropic: **0.994–1.000** (PAPER.md §3.3).

## The route, and what it changes

Route **(b)** of `notes/plans/RETENTION-PILOT-SCOPE.md`: point each harness at the study's own gateway on its
Anthropic-native path (`/v1/messages`), where `tools/measure-gateway.mjs` already injects
`cache_control` and logs cache read/creation tokens for the DSH arms. No new vendor, no new account.

**Disclosed treatment change.** The study's matrices ran these harnesses on the OpenAI-compatible path.
This pilot measures them on the native Messages path. It therefore measures **retention when the
harness is given declared caching**, and it is *not* a measurement of the OpenAI-compatible
configuration, which remains unmeasurable and stays an open defect. The paper must say so.

**Harnesses: opencode and cline only.** Both have documented custom base URLs; goose and openhands are
out of scope for this pilot (unverified native configuration).

## Design

- **Harnesses (new ids, so no existing matrix changes):** `opencode-anthropic`, `cline-anthropic`.
- **Cells:** 2 harnesses × 10 tasks × 1 seed = **20**. Retention is a per-run aggregate over
  continuations, so the cluster that matters is the task; 10 tasks give a 10-cluster bootstrap.
- **Tasks (two per stratum, chosen alphabetically before the first request):**
  `fetch-heavy-content-negotiation`, `fetch-heavy-duration-parse`,
  `long-horizon-billing-tiers`, `long-horizon-job-ordering`,
  `multi-file-cache-invalidation`, `multi-file-config-precedence`,
  `repo-wide-config-defaults-sweep`, `repo-wide-error-type-migration`,
  `single-step-csv-quoting`, `single-step-date-month-end`.
- **Matrix:** a new dataset only (`results/retentionpilot-*/`); never an existing directory.
- **Gateway flags:** the Anthropic provider entry's own (`--native-messages --auto-cache`, forced model
  `claude-haiku-4.5`), unchanged.
- **Metric:** exactly `tools/prefix-retention.mjs`'s — a continuation carries ≥50% of the largest prompt
  so far; retention = cacheHit(i) / largest prompt before i, clamped [0,1].

## Acceptance gate (before the 20-cell matrix)

1. Smoke: **1 cell per harness** plus **1 `dsh:native` control cell** on `example-fix`, through the same
   gateway and model. Total ≤ 3 cells, well inside the cap.
2. Every smoked record carries a **non-null** cache split, and at least one carries
   **`cacheCreationTokens > 0`**.
3. The `dsh:native` control shows retention **≈0.99** (the study's DSH field is 0.994–1.000). If it
   does not, the new org's cache semantics differ from the study account's and the pilot **STOPS**; the
   finding is reported and no matrix is run.
4. No record implies more than **$1.50/cell**. If it does, stop and report.

**Stop rules:** abort on a null split on any analysed record, on zero write tokens anywhere, on an
error storm, or on any gate above failing. No re-run without a new dated declaration.

## Analysis rule (filed before the data)

Per-harness mean retention with a **task-cluster percentile bootstrap** over the 10 tasks
(`tools/stats.mjs` `bootstrapTaskMean`), the same estimator §3.2 uses. Reported against the filed DSH
field 0.994–1.000 and against each other, with cache-write share and per-cell cost. **Descriptive: no
hypothesis test, no threshold invented after seeing the data.** What would change the paper's reading:
a harness whose interval lies wholly below the DSH field establishes that its retention does not track
the DSH arms' — the comparison §3.3 cannot currently make; overlapping intervals leave the DSH-only
statement standing.

**If the split does not appear** — null cache fields on any analysed record, or no write tokens
anywhere — the pilot is reported as **failed**, with the route, the smoke evidence and the cost, and
§3.3's open defect remains open.

## Cost

External-arm rate $0.37–$1.21/cell (PAPER.md §3.3; `notes/defects/DEFECT-anthropic-external-costs.md:117-118`).
20 cells: **$7.40–$24.20**; smoke ≤ 3 cells. **Hard ceiling `--max-cost 25`.** The spend is reported
from the ledger, not estimated.


---

# AMENDMENT 1 — filed 2026-10-10, before any matrix cell

**Status: the 20-cell matrix has NOT run. No cell of the pre-declared sample has been collected.**
Everything below happened in smoke and diagnostic cells only, and every number is evidence, not
estimate.

## What the smoke found

1. **cline is structurally blocked on this build.** `cline auth -p anthropic -k <key> -m <model> -b
   <gateway>` exits 1 with:

   > `error: base URL is only supported for OpenAI and OpenAI-compatible providers`

   Both the pinned 3.0.65 and the PATH's 3.0.70 reject it. cline's Anthropic provider therefore
   **cannot be pointed at the study gateway at all**, so route (b) is impossible for cline and the
   filed two-harness design cannot run as written. The opencode half can.
   *Note against the scope doc:* `notes/plans/RETENTION-PILOT-SCOPE.md` cited cline's documented optional
   `base-url` for its Anthropic provider; on the CLI that field does not exist, and the citation does
   not hold for the configuration path available here.

2. **A dashed harness id silently re-attributes every request.** The study's synthetic key is
   `exp-<harness>-<runId>` and `tools/attribute.mjs` splits it on the first dash, so
   `opencode-anthropic` logged as harness `opencode` with a mangled runId
   (`anthropic-<matrix>-…`) — the study's own harness name. Fixed by flat ids:
   **`opencodeanthropic`**, **`clineanthropic`** (the latter kept on the record as blocked). No
   existing matrix is affected.

3. **opencode's base URL must end in `/v1` even for the Anthropic SDK provider.** opencode passes
   `options.baseURL` straight through and the SDK appends only `/messages`, so the gateway ROOT
   produced `http://127.0.0.1:8791/messages` and a 404. With `/v1` the request lands on
   `/v1/messages`, the same path the DSH arms use.

4. **The preflight ran the study's five harnesses, not the plan's.** It cost $0.51 of Anthropic spend
   for no evidence about the pilot; `tools/collect.mjs` now passes the plan's harness set.

## The gate, item by item

| gate | result |
|---|---|
| requests hit the native path | **yes** — 8/8 opencodeanthropic records on `/v1/messages`, status 200 |
| cache split logged | **yes** — `cacheHitTokens` 5,706 and `cacheCreationTokens` 2,463 on the real turns; the two probe turns carry 0/0, not null |
| at least one record with `cacheCreationTokens > 0` | **yes** — 2,463 |
| `dsh:native` control on the same model/task | **0.9991**, inside the study's DSH field 0.994–1.000 — the new org's cache semantics match |
| opencode cell retention | **1.0000** on one task (no interval: one cluster); indicative, not a result |

## Amended design (open for the parent's approval)

- **Harness:** `opencodeanthropic` only. **10 pre-declared tasks × 1 harness × 1 seed = 10 cells.**
- cline is reported as **unconfigurable on this build**, which is itself a finding for §3.3.
- Everything else in this declaration stands unchanged: the model, the tasks, the metric, the
  estimator, the descriptive rule, and the `--max-cost 25` ceiling.
- Estimated cost at the study's external-arm rate: **$3.70–$12.10** for 10 cells.

**Spend to date: $1.0744** in total across the control run and the three smoke runs (all Anthropic,
all logged in `results/*-anthropic-gateway.jsonl`).


---

# AMENDMENT 2 — filed 2026-10-10, before any analysable matrix data exists

**The 10-cell matrix ran on the Amendment-1 design and produced NOTHING analysable: 10/10 cells,
0 solved, 9 of 10 with exit 1, $0.0882 spent.** The cause is a treatment collision, not a harness
fault, and the fix below is verified on single cells.

## The failure, verbatim

Anthropic rejected the requests:

> `{"type":"error","error":{"type":"invalid_request_error","message":"A maximum of 4 blocks with
> cache_control may be provided. Found 5."}}`

**30 of 30 non-200 records carry the gateway's own injection deviation**
(`{field: cache_control, action: injected, where: [system, tools, top-level]}`). opencode on the
native path (the Anthropic SDK) **declares its own `cache_control` breakpoints**; the study
condition adds up to three more, so the total exceeds Anthropic's limit of four and every real turn
400s. The DSH arms never meet this because DSH declares none — the gateway's injection is their only
source. The wire-protocol change is what exposed it.

## The fix, verified before filing this amendment

Run the pilot with the gateway's own static+automatic injection turned OFF for this condition:

`--native-messages --auto-cache --extra-gateway-flag --no-cache-breakpoints`

The gateway then records **zero request modifications** (`deviations: none`), opencode's own
declaration is the caching under measurement, and the split still arrives. Verified twice on
`example-fix`, one cell each:

| variant | result | records | statuses | cache hit | cache created |
|---|---|---|---|---|---|
| no injection (`--no-cache-breakpoints`, no `--auto-cache`) | exit 0, **solved**, 24s | 7 | 7×200 | 51,201 | 4,431 |
| auto-cache only (`--auto-cache --no-cache-breakpoints`) | exit 0, **solved**, 25s | 8 | 8×200 | 61,116 | 4,744 |

## Amended design (Amendment 2, open for approval)

- The pilot measures **retention under the harness's own declared caching** on Anthropic's native
  Messages path; the study gateway modifies nothing. This must be said in the paper: it is not the
  study's injected-caching condition, because that condition cannot coexist with an SDK client that
  already declares breakpoints.
- The flag is the only change: `--extra-gateway-flag --no-cache-breakpoints`, provider `anthropic`,
  model, tasks, metric, estimator, descriptive rule and `--max-cost 25` ceiling all unchanged.
- Observed per-cell cost on the two working cells: **$0.017–$0.019**, so 10 cells ≈ **$0.20**; the
  ceiling is unchanged and now very loose.

**Spend to date: $1.1979** across the control, the three smoke runs, the failed matrix and the two
single-cell verifications (all Anthropic, all in `results/*-anthropic-gateway.jsonl` and
`results/_scratch/gw-*.jsonl`).


## The defect this exposes for the study (methods finding, independent of the retention number)

The study's Anthropic condition injects up to three `cache_control` breakpoints (system, tools and —
with `--auto-cache` — the top-level field). **Any client that already declares its own breakpoints
gets a request Anthropic rejects**, because the total exceeds the documented limit of four:

> "A maximum of 4 blocks with cache_control may be provided. Found 5."

DSH never surfaced this because DSH declares none, so the gateway's injection was always the only
source and never exceeded three. The condition is therefore **not portable to SDK clients that
implement prompt caching themselves**, which is precisely the class of client this pilot exists to
measure. That is a defect in the study's Anthropic treatment and its documentation — PAPER.md §3.3 /
limitation 7 — not merely an obstacle to this pilot: the injected-caching condition and a
harness-declared-caching client cannot be run together at all, and any future Anthropic measurement
of an external harness must either drop the injection or cap it. The pilot therefore measures the
harness's own declaration with the gateway modifying nothing (see above).
