# INCIDENT — haiku's matrix was truncated by Anthropic's MONTHLY ACCOUNT LIMIT, not by anything in the study

**2026-10-09.** Five of six providers are complete and signed off. haiku is complete in cells, but 447
of its 800 runs measured nothing, because the account refused every request from 02:18Z onward.

## The provider said so, in the gateway log

    status=429  upstreamError={"error":{"code":"rate_limit_error","message":"You have reached your API
                usage limits: your organization has crossed its monthly API usage threshold, set based
                on your organization's API tier."}}

Every request of every affected run. This is the ORGANIZATION'S MONTHLY SPEND CEILING, a separate
control from the credit balance - the credits were never the binding constraint. A handful of runs
also carry the known goose `anthropic-version: header is required` 400s.

## The data is valid, and nothing needs re-running

`tools/cost-panel.mjs` passes each run's GATEWAY REQUESTS into `exclusionVerdict`, so
`classifyByStatus` files an all-429 run as `all-requests-failed` - infrastructure, rule 9 - rather
than as a model failure. The shipped analysis confirms it:

    batchb-haiku | rows 800 | cells 353 | excluded 312 | statusExcluded 135

353 analysable cells, 447 excluded as infrastructure losses, every arm keeping 34-36 of its 80 cells,
so the PTC-versus-native contrast stays paired and comparable. **The six-provider analysis is
therefore computable and already computed** (`analysis/panel-analysis-batchb-2026-10-09.json`).

## The one real defect this exposed

The collector and the analysis disagree about the same runs. The analysis consults the gateway status;
the collector's verify stage checks only `runs.filter(no usage && no error record)` and calls those 444
runs an unexplained zero-cost problem, so it REFUSED the sign-off for a matrix whose losses are fully
documented. Two layers, one dataset, opposite verdicts - the same records-versus-cells family this
pipeline has now produced four times.

Consequence: haiku is the one matrix without a sign-off block. Completing it needs a working provider
(preflight and the pilot talk to the API), so it waits for the monthly limit to be raised; it costs
about a dollar and re-runs no cells. The DATA and the ANALYSIS do not depend on it.

## Cost, measured rather than assumed

haiku's 356 valid cells billed **$144.21 = $0.4051/cell**. Projected across the missing 444:

    mix-adjusted from haiku's own per-arm means ....... $183.40
    at the valid average .............................. $179.85
    at the SMOKE rate ($0.2403/cell) .................. $106.69

The smoke under-priced a ten-arm matrix by 69% because it measured only the two DSH arms. On Haiku the
external harnesses cost far more: openhands **$1.17/cell**, cline $0.67, goose $0.50, opencode $0.38,
against $0.10-0.30 for every DSH arm. A two-arm smoke is a biased estimator of a ten-arm matrix on
Anthropic models - record it before deriving the next Anthropic ceiling that way.

## Decision

Re-running the 444 costs ~$183 against a remaining credit of **$125.63**, and would raise haiku's
coverage from 353 to 800 cells without changing any conclusion the analysis can already draw. The
money is worth more unspent. Coverage is disclosed wherever haiku's row appears: 353 of 800 cells.
