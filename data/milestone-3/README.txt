Milestone 3 - first data on DSH 0.1.7-rc.2, after the Anthropic Messages fix.

DSH 0.1.7-rc.2, deepseek-flash, reasoningEffort high. 30 runs, 1 task, all solved.
opencode n=10 (it passed in both matrices), each DSH arm n=5.

Why this dataset exists: 0.1.7 moved the harness to the Anthropic Messages
protocol (/v1/messages under https://api.deepseek.com/anthropic). The gateway did
not speak it and answered 404 to all 40 DSH requests, which first appeared as
20 runs at 0 solved / 0 tokens. Those failures are NOT in this dataset.

Cache hit rate by arm, across three independent datasets and two DSH versions:
                    ms-1 (0.1.5)  ms-2 (0.1.5)  ms-3 (0.1.7)
  dsh:ptc               95.6%         95.6%        94.9%
  dsh:ptc-opt           95.6%         95.7%        95.0%
  dsh:native            86.0%         85.8%        87.2%
  dsh:native-opt        86.9%         84.1%        82.9%
  opencode              85.2%         82.6%        82.7%

The ~10-point PTC/native separation holds across all three. Do not pool this with
milestone-1 or milestone-2: different DSH version.
