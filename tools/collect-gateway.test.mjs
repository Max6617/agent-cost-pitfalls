/**
 * collect-gateway.test.mjs - pin the treatment.
 *
 * The gateway flags are the one part of this pipeline that can silently change what is being
 * measured, and until now nothing checked them. On 2026-10-02 the GLM matrix stopped at
 * preflight because collect.mjs's zai entry had lost `--max-tokens-ceiling 32768`.
 *
 * The reference for the assertion below is not memory. data/milestone-4/gateway.jsonl is a
 * surviving, complete, batch-1-shaped GLM matrix (310 runs, 100% solved) and its gateway records
 * every deviation applied:
 *
 *   2544 x 200  model deepseek-flash=>glm-5.3-flash | reasoning_effort null=>high | max_tokens 256000=>32768
 *    248 x 400  max_tokens 64, no tools - DSH's auxiliary request, which failed in the good matrix
 *               too and never cost a run
 *
 * Run: node --test tools/collect-gateway.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GATEWAY } from './collect-gateway.mjs'

const val = (flags, name) => {
  const i = flags.indexOf(name)
  return i >= 0 ? flags[i + 1] : undefined
}

test('zai caps max_tokens at the value batch 1 used', () => {
  // Without this, DSH sends max_tokens=256000 and z.ai's Messages endpoint answers
  //   400 [1210] The max_tokens parameter is illegal. range [1,131072]
  // to all 24 of preflight's DSH requests while the other four harnesses pass.
  assert.equal(val(GATEWAY.zai.flags, '--max-tokens-ceiling'), '32768',
    'batch 1 capped DSH max_tokens 256000 -> 32768 (data/milestone-4/gateway.jsonl, 2544 records)')
})

/**
 * THE CEILING IS PER PROVIDER, AND THESE THREE ASSERTIONS ARE THE WHOLE EVIDENCE TABLE.
 *
 * Counting every surviving gateway record by model and harness:
 *
 *   glm-5.3-flash   + dsh   3166 requests   2875 ok, ALL capped 256000->32768, 0 ok uncapped
 *   qwen3.8-flash   + dsh     31 requests     31 ok, ALL capped 256000->32768, 0 ok uncapped
 *   gpt-6-luna      + dsh     26 requests     26 ok, NONE capped,                    26 ok uncapped
 *   deepseek-flash  + dsh   4896 requests   4896 ok, NONE capped (max_tokens 256000 accepted)
 *
 * So the ceiling is required for GLM and Qwen, unnecessary for luna and DeepSeek, and the
 * difference is measured rather than assumed. Getting this wrong is invisible when it is too
 * permissive - the matrix runs and the treatment quietly differs from batch 1.
 */
test('the max_tokens ceiling is set exactly where a surviving record proves it is needed', () => {
  assert.equal(val(GATEWAY.zai.flags, '--max-tokens-ceiling'), '32768', 'GLM: 2875 capped successes, 0 uncapped')
  assert.equal(val(GATEWAY.qwen.flags, '--max-tokens-ceiling'), '32768', 'Qwen: 31 capped successes, 0 uncapped')
  assert.equal(val(GATEWAY.openai.flags, '--max-tokens-ceiling'), undefined,
    'luna: 26 successes with max_tokens uncapped - adding a ceiling here would change the treatment')
  assert.equal(val(GATEWAY.deepseek.flags, '--max-tokens-ceiling'), undefined,
    'DeepSeek accepts max_tokens=256000 (4896/4896 ok) and its matrix is already collected without one')
})

test('every provider forces the model the runner is told to expect', () => {
  for (const [p, g] of Object.entries(GATEWAY)) {
    assert.equal(val(g.flags, '--force-model'), g.model,
      p + ': the gateway must enforce exactly the model the runner passes to run-experiment')
  }
})

test('forced effort is present exactly when the provider declares one', () => {
  for (const [p, g] of Object.entries(GATEWAY)) {
    const forced = val(g.flags, '--force-effort')
    if (g.effort === null) {
      assert.equal(forced, undefined,
        p + ': no effort is forced for this provider, and adding one would change the treatment')
    } else {
      assert.equal(forced, g.effort, p + ': declared effort must reach the gateway')
    }
  }
})

test('cache breakpoint treatment is per provider and is not copied between them', () => {
  // Qwen's batch-1 matrix ran with cache breakpoints ON; DeepSeek's and GLM's ran with them OFF.
  // That difference is a treatment, not a preference, and copying one flag list onto another
  // provider is how it would be lost.
  assert.ok(GATEWAY.zai.flags.includes('--no-cache-breakpoints'), 'GLM batch 1 injected nothing')
  assert.ok(GATEWAY.deepseek.flags.includes('--no-cache-breakpoints'), 'DeepSeek batch 1 injected nothing')
  assert.ok(!GATEWAY.qwen.flags.includes('--no-cache-breakpoints'),
    'Qwen batch 1 ran with static breakpoints ON - this flag would silently change it')
})

test('every provider has a reachable-looking upstream and a positive per-run cost', () => {
  for (const [p, g] of Object.entries(GATEWAY)) {
    assert.match(g.upstream, /^https:\/\//, p + ': upstream must be an absolute https URL')
    assert.ok(g.costPerRun > 0, p + ': a zero per-run cost would make the ceiling meaningless')
    assert.ok(g.cacheMode && g.cacheMode.length > 10, p + ': the cache mode must be recorded, not implied')
  }
})

test('zai declares both of its endpoints, because DSH and opencode speak different protocols', () => {
  // DSH speaks Messages and goes to .../api/anthropic; opencode speaks chat/completions and goes
  // to .../api/coding/paas/v4. Pointing one at the other is a 404 that reads like a bad model name.
  assert.equal(GATEWAY.zai.upstream, 'https://api.z.ai/api/anthropic')
  assert.equal(val(GATEWAY.zai.flags, '--upstream-openai'), 'https://api.z.ai/api/coding/paas/v4')
})

/**
 * THE ANTHROPIC CACHE TREATMENT IS PINNED, BECAUSE THE OLD ONE MEASURED THE GATEWAY.
 *
 * The static breakpoints mark the LAST TOOL. dsh:ptc presents 1 tool; dsh:native presents 24. On
 * Haiku the minimum cacheable prefix is 4,096 tokens, so PTC's cacheable prefix (system + 1 tool)
 * fell under it and was NEVER cached - 0 hit tokens across 869 requests, against 27.6% for native.
 * Measured A/B, same 31 tasks, same arms, same seed, ONE variable changed:
 *
 *   static only     PTC hit  0.0%   PTC $0.74186/run   native $0.38580/run   62 runs $34.96
 *   + --auto-cache  PTC hit 99.9%   PTC $0.21593/run   native $0.12026/run   62 runs $10.42
 *
 * The four surviving providers cache automatically for every arm (87-91% hit rates), so the
 * static-only condition also failed the like-for-like test this gateway's own comment sets out:
 * breakingpoints were injected precisely because the other providers cache whether asked or not,
 * and a treatment that caches for the 24-tool arm but not the 1-tool arm does not achieve that.
 * The top-level field applies only on the Anthropic Messages path, so NO existing matrix is
 * affected by this flag. See _ev/anthropic-pilot-2026-10-03.md.
 */
test('Anthropic declares the top-level cache field, so no arm is left uncached', () => {
  assert.ok(GATEWAY.anthropic.flags.includes('--auto-cache'),
    'static breakpoints alone leave the 1-tool PTC arm uncached on Haiku: 0 hit tokens in 869 requests')
})

/**
 * A SECOND ENTRY FOR THE SAME API MUST INHERIT THE SAME PROTOCOL REQUIREMENTS.
 *
 * 'anthropic-sonnet' was added so Sonnet's matrix gets its own dataset directory, and the
 * workspace-header rule was written as `if (p === 'anthropic')` in collect.mjs - so it silently
 * did not apply. Preflight then failed every harness with:
 *
 *   invalid_request_error: "This API key is not scoped to a workspace, so this request must
 *   include the anthropic-workspace-id header with the ID of the workspace"
 *
 * It cost nothing (48 requests, all 400, and a 4xx bills nothing) and the pipeline refused to
 * start the matrix, which is the guard working. But the rule belongs to the ENTRY, not to the
 * provider's name: any entry pointed at the Anthropic API needs that header.
 */
test('every provider pointed at the Anthropic API declares that it needs the workspace header', () => {
  const anthro = Object.entries(GATEWAY).filter(([, g]) => g.upstream === 'https://api.anthropic.com')
  assert.ok(anthro.length >= 2, 'both Anthropic models should be wired')
  for (const [p, g] of anthro) {
    assert.equal(g.needsWorkspaceId, true,
      p + ' points at the Anthropic API, so its requests need the anthropic-workspace-id header')
  }
})
