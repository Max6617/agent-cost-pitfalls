Milestone 4 - GLM-5.3-Flash, full 30-task suite.

Second provider. Collected 2026-09-29/30 on DSH 0.1.7-rc.2.
31 tasks x 5 arms x 2 seeds = 310 runs, 310 solved (100%), 163.7 minutes, $2.49.

Arms: dsh:native, dsh:ptc, dsh:native-opt, dsh:ptc-opt, opencode.
Model glm-5.3-flash served via https://api.z.ai/api/anthropic (Messages protocol).

THE RESULT THIS DATASET EXISTS FOR: the PTC cost advantage does not transfer.
  DeepSeek V4.1 Flash   ptc $0.01178  native $0.01526   PTC cheaper by 22.8%
  GLM-5.3-Flash         ptc $0.00839  native $0.00830   native cheaper by  1.1%
The 1.1% is inside noise at n=62, so read it as "large on one provider, absent on
the other" - NOT as a reversal.

opencode is cheapest on BOTH providers, so its advantage transfers while PTC's does not.
Cache is refuted a third time: every GLM arm sits at 87-91% hit rate and the cheapest
arm has the LOWEST rate.

Caveat: GLM runs are 2 seeds not 3, because GLM is 5-10x slower per run than DeepSeek.
Do not pool with milestones 1-3 (DeepSeek, and 1-2 are DSH 0.1.5-alpha.1).
