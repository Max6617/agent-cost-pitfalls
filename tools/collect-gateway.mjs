/**
 * collect-gateway.mjs - THE GATEWAY FLAGS ARE THE TREATMENT.
 *
 * They live in their own module for one reason: so they can be tested. On 2026-10-02 the GLM
 * matrix stopped at preflight with all 24 DSH requests rejected, because collect.mjs's zai entry
 * was missing `--max-tokens-ceiling 32768`. DSH sends max_tokens=256000; z.ai's Messages
 * endpoint accepts [1,131072]; batch 1 had capped it. The flag list is the one thing in this
 * pipeline that can silently change what is being measured, and it had no test.
 *
 * THE EVIDENCE FOR EACH FLAG IS THE SURVIVING MATRIX, NOT MEMORY. data/milestone-4/gateway.jsonl
 * holds 3,363 records from a complete GLM batch-1-shaped matrix (310 runs, 100% solved), and the
 * gateway records every deviation it applied:
 *
 *   2544 x status 200  ->  model deepseek-flash=>glm-5.3-flash, reasoning_effort null=>high,
 *                          max_tokens 256000=>32768
 *    248 x status 400  ->  max_tokens 64, no tools (DSH's auxiliary request). These failed in the
 *                          GOOD matrix too and were never fatal; 310/310 runs solved.
 *
 * So the ceiling is not a new intervention, it is the removal of one: without it the treatment
 * differs from batch 1 AND DSH cannot reach the provider at all.
 */
import { PROVIDERS } from './credit-plan.mjs'

export const GATEWAY = {
  deepseek: {
    upstream: 'https://api.deepseek.com', model: 'deepseek-flash',
    flags: ['--force-model', 'deepseek-flash', '--force-effort', 'high', '--no-cache-breakpoints'],
    cacheMode: 'NONE (provider caches automatically; batch 1 injected nothing)',
    effort: 'high', costPerRun: PROVIDERS.deepseek.costPerRunBatch1,
  },
  zai: {
    upstream: 'https://api.z.ai/api/anthropic', model: 'glm-5.3-flash',
    // --max-tokens-ceiling 32768 is LOAD-BEARING and was missing. See the header: without it DSH
    // sends max_tokens=256000, z.ai rejects the range, and every DSH request 400s.
    flags: ['--force-model', 'glm-5.3-flash', '--force-effort', 'high', '--max-tokens-ceiling', '32768',
      '--no-cache-breakpoints', '--upstream-openai', 'https://api.z.ai/api/coding/paas/v4'],
    cacheMode: 'NONE (provider caches automatically; batch 1 injected nothing)',
    effort: 'high', costPerRun: PROVIDERS.zai.costPerRunBatch1,
  },
  qwen: {
    upstream: 'https://dashscope-intl.aliyuncs.com/apps/anthropic', model: 'qwen3.8-flash',
    // The SAME ceiling as GLM, on the same standard of evidence. Every surviving DSH->Qwen
    // request that succeeded carried it: results/hardbatch-qwen-fixed-gateway.jsonl is 31/31
    // capped 256000->32768, 31/31 status 200, and ZERO successes without a cap. Not adding it
    // would either 400 the whole DSH arm (if DashScope rejects 256000) or silently measure a
    // different max_tokens than the only Qwen measurement this study still has.
    flags: ['--force-model', 'qwen3.8-flash', '--max-tokens-ceiling', '32768', '--native-messages',
      '--upstream-openai', 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1'],
    // NOT a typo and NOT the same as the others: Qwen's batch-1 matrix ran with cache
    // breakpoints ON. Copying DeepSeek's flag list here would silently change a treatment.
    cacheMode: 'STATIC breakpoints ON - this is how qwen3.8-flash batch 1 was collected',
    effort: null, costPerRun: PROVIDERS.qwen.costPerRunBatch1,
  },
  openai: {
    upstream: 'https://api.openai.com', model: 'gpt-6-luna',
    // NO ceiling, and that is a decision with evidence behind it rather than an omission:
    // results/openai-gateway-2.jsonl holds 26 DSH -> gpt-6-luna requests that all returned 200
    // with max_tokens UNCAPPED (and 29 more from openhands). Unlike GLM and Qwen, luna does not
    // need one, and adding one would change the treatment.
    flags: ['--force-model', 'gpt-6-luna', '--upstream-openai', 'https://api.openai.com/v1'],
    cacheMode: 'STATIC breakpoints (study default)',
    // No forced effort: the gateway sets reasoning_effort: none on the OpenAI path, and forcing
    // it was never part of this matrix.
    effort: null, costPerRun: PROVIDERS.openai.costPerRunBatch1,
  },
  // The same account as 'anthropic', one model over. Separate entry so the matrix lands in
  // results/sonnet-full; the TREATMENT is identical to Haiku's, because a difference between the
  // two Anthropic models would be a difference in the comparison rather than in the model.
  'anthropic-sonnet': {
    upstream: 'https://api.anthropic.com', model: 'claude-sonnet-5.5', needsWorkspaceId: true,
    flags: ['--force-model', 'claude-sonnet-5.5', '--max-tokens-ceiling', '32768', '--native-messages', '--auto-cache'],
    cacheMode: 'STATIC breakpoints PLUS the top-level field, identical to the Haiku condition',
    effort: null, costPerRun: PROVIDERS['anthropic-sonnet'].costPerRunBatch1,
  },
  anthropic: {
    upstream: 'https://api.anthropic.com', model: 'claude-haiku-4.5', needsWorkspaceId: true,
    // --auto-cache ADDS Anthropic's top-level cache_control, which moves the breakpoint forward
    // with the conversation. The static breakpoints ALONE are asymmetric: they mark the LAST TOOL,
    // so a 24-tool condition caches and a 1-tool condition does not - PTC's prefix falls under
    // Haiku's 4,096-token minimum and was never cached at all (0 hit tokens in 869 requests).
    // Measured A/B on the same tasks and arms, one variable changed: PTC hit rate 0.0% -> 99.9%,
    // 62 runs $34.96 -> $10.42. Only the Anthropic Messages path is touched, so no existing
    // matrix changes. See _ev/anthropic-pilot-2026-10-03.md and collect-gateway.test.mjs.
    flags: ['--force-model', 'claude-haiku-4.5', '--max-tokens-ceiling', '32768', '--native-messages', '--auto-cache'],
    cacheMode: 'STATIC breakpoints PLUS the top-level field: every arm caches, as it does on the four automatic-caching providers',
    effort: null, costPerRun: PROVIDERS.anthropic.costPerRunBatch1 / 2,
  },
}
