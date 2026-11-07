Milestone 1 dataset - the first complete cross-harness matrix.

Collected 2026-09-29 12:33
DSH 0.1.5-alpha.1, model deepseek-flash, reasoningEffort high
5 arms x 1 task (example-fix) x 2 seeds = 10 runs, 10 solved
DeepSeek key stored in the environment at collection time; NOT in these files.

files:
  runs.jsonl     one record per run (arm, mode, patch, exit, duration, test result)
  gateway.jsonl  one record per provider request (usage, cache hit/miss, cost, deviations)

Synthetic API keys (exp-<harness>-<runId>) ARE recorded - they are fake by
construction and are the join key between the two files.
