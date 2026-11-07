Milestone 2 - 5 seeds per arm, parallel runner.

Collected 2026-09-29 12:36
DSH 0.1.5-alpha.1, deepseek-flash, reasoningEffort high
5 arms x 1 task (example-fix) x 5 seeds = 25 runs, 25 solved, 1.6 min at 6-way parallelism.

Purpose: a first honest variance estimate. With n=2 the within-cell CV was 21.9%;
with n=5 it is 10.8%, which halves the required task count.

Cache hit rates replicate across both milestone datasets:
  dsh:ptc 95.6% both times   dsh:native 86.0% then 85.8%   opencode 85.2% then 82.6%

NOTE: collected on DSH 0.1.5-alpha.1, BEFORE the 0.1.7-rc.2 upgrade.
Do not pool with post-upgrade runs.
