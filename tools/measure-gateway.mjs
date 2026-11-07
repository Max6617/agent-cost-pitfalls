#!/usr/bin/env node
/**
 * measure-gateway — one measurement point for every harness under test.
 *
 * A comparison across different agent harnesses is only fair if every request
 * reaches the provider with the same model configuration. This gateway sits
 * between the harnesses and the DeepSeek API and does four things:
 *
 *   1. ATTRIBUTION. Each harness is given a synthetic key of the form
 *        exp-<harness>-<runId>
 *      The gateway swaps it for the real DEEPSEEK_API_KEY and records which
 *      harness and run produced the request. Works for harnesses that let you
 *      set an API key but no custom headers.
 *
 *   2. ENFORCEMENT. --force-model / --force-effort / --force-temperature rewrite
 *      the outgoing request so a harness cannot quietly use a different model or
 *      reasoning effort. Every rewrite is logged, so any harness that asked for
 *      something else is visible in the results rather than hidden.
 *
 *   3. USAGE CAPTURE. The provider's own usage block, including cache hit/miss,
 *      is logged per request. DSH never persists these; harnesses generally
 *      do not expose them either.
 *
 *   4. NORMALISATION (optional). Endpoints that speak a different dialect can be
 *      bridged. /v1/responses is translated to chat-completions for DeepSeek,
 *      which is what an OpenAI Responses-API client (e.g. Codex CLI) needs.
 *
 *   node tools/measure-gateway.mjs --port 8787 --log results/gateway.jsonl
 *   # then give each harness:  base URL http://127.0.0.1:8787/v1
 *   #                          api key  exp-opencode-run01
 *
 * Read-only with respect to the harnesses: it never writes into their configs.
 */
import { createServer } from 'node:http'
import { appendFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, resolve } from 'node:path'

const argv = process.argv.slice(2)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d }
const has = (n) => argv.includes(n)

const port = Number(opt('--port', 8787))
const upstream = opt('--upstream', 'https://api.deepseek.com').replace(/\/+$/, '')
const logPath = resolve(opt('--log', 'results/gateway.jsonl'))
const realKey = process.env.DEEPSEEK_API_KEY ?? opt('--api-key', null)
const forceModel = opt('--force-model', null)
const forceEffort = opt('--force-effort', null)
const forceTemperature = opt('--force-temperature', null)
// Some providers reject a max_tokens outside a fixed range. DSH asks GLM for
// 256000 on its main call, over GLM's 131072 ceiling, and the request fails with
//   [1210][The max_tokens parameter is illegal.：限制数值范围[1,131072]]
// which reads as a model or auth problem and is neither.
//
// This is a CEILING, not a value: it only ever lowers. DSH also makes small
// internal calls asking for max_tokens 64, and forcing those UP to the ceiling
// changed their meaning and drew a 400. The harness stays unmodified either way,
// which is the point of routing through a gateway.
const maxTokensCeiling = opt('--max-tokens-ceiling', opt('--force-max-tokens', null))
const allowUnauthenticated = has('--allow-unauthenticated')
// Set when the upstream serves the Messages API at its root (Anthropic), rather than
// under an /anthropic segment (DeepSeek) or as the whole path (Z.AI).
const nativeMessages = has('--native-messages')
// Some Anthropic keys are not scoped to a workspace and the API then REQUIRES this
// header, answering 400 with "This API key is not scoped to a workspace...". It is a
// workspace identifier, not a secret, but it is read from the key file so it never
// lands on a command line.
const workspaceId = opt('--workspace-id', process.env.ANTHROPIC_WORKSPACE_ID ?? null)
// Extended-thinking budget when the client enables thinking without specifying one.
// Fixed rather than adaptive so it cannot drift into an uncontrolled variable.
const thinkingBudget = Number(opt('--thinking-budget', 4096))
// Fields the client sends that a given model rejects outright. Haiku 4.5 answers
//   400 This model does not support the effort parameter.
// while Sonnet accepts it, so this is per-model capability, not a protocol error, and
// the fix belongs in configuration rather than in the harness.
const stripFields = (opt('--strip-fields', '') || '').split(',').map((s) => s.trim()).filter(Boolean)
// Inject Anthropic cache_control breakpoints the harness does not send. See the note
// at the injection site; --no-cache-breakpoints turns it off for a controlled comparison.
const cacheBreakpoints = !has('--no-cache-breakpoints')
/**
 * --auto-cache: add the TOP-LEVEL cache_control field Anthropic documents for automatic
 * caching. This is the study's largest open question rather than a convenience flag.
 *
 * The three conditions it separates, all of which now have measured data:
 *
 *   neither flag          no cache_control is sent at all - the harness's own behaviour
 *   (default)             the static system+last-tool breakpoints this gateway injects
 *   --auto-cache          the static prefix AND the top-level field that carries the
 *                         breakpoint forward as the conversation grows
 *
 * Every Anthropic number in this repo before today is the middle condition, and it was never
 * disclosed as one until an external review flagged it. Mechanism is what makes it matter:
 * FINDINGS F31 says the deciding variable across providers is whether the provider caches
 * automatically or makes the client ask. If a single request field moves Haiku from a 10%
 * hit rate to 85%, then the field decides the bill, and any cross-provider cost comparison
 * that holds the field fixed - which every leaderboard does - removes the variable.
 */
const autoCache = has('--auto-cache')
// Set when this gateway's route speaks the OpenAI chat-completions protocol, where
// max_tokens has been renamed for newer models. Read from the flag rather than
// guessed from the URL, so a proxy that happens to contain "openai" cannot trigger it.
const isOpenAiUpstream = has('--upstream-openai') || /api.openai.com/.test(upstream)
// Models that REJECT thinking.type.enabled and want a different mode instead.
// Sonnet 5.5 answers:
//   400 "thinking.type.enabled" is not supported for this model. Use
//       "thinking.type.adaptive" and "output_config.effort" to control thinking behavior.
// Haiku 4.5 accepts enabled + budget_tokens but rejects the effort parameter, so the two
// Anthropic models in this study need OPPOSITE handling of the same request shape.
const modelThinking = {
  'claude-sonnet-5.5': 'adaptive',
}
const modelStrip = {
  'claude-haiku-4.5': ['effort', 'reasoning_effort'],
  // Qwen's Anthropic-compatible endpoint rejects the same client-private fields that
  // Anthropic does. Keyed per model rather than per protocol because DeepSeek and Z.AI
  // tolerate them and stripping there would be an unnecessary intervention.
  'qwen3.8-flash': ['effort', 'reasoning_effort'],
  'qwen3.8-max': ['effort', 'reasoning_effort'],
}
// Canonical study name -> provider API name. Only the wire name changes; everything
// recorded keeps the canonical form so datasets stay comparable.
const MODEL_ALIASES = {
  'claude-haiku-4.5': 'claude-haiku-4-5',
  'claude-sonnet-5.5': 'claude-sonnet-5-5',
}
// Reverse map, so a price lookup succeeds whichever name reaches it.
const ALIAS_TO_CANONICAL = Object.fromEntries(Object.entries(MODEL_ALIASES).map(([k, v]) => [v, k]))

// A synthetic key must NEVER reach the provider. Observed live: the gateway
// forwarded "exp-opencode-smoke" upstream and DeepSeek answered
// "Authentication Fails, Your api key ... is invalid". That reads as a harness
// bug when it is a gateway misconfiguration, so fail loudly instead.
const isSynthetic = (k) => !k || k.startsWith('exp-')
const upstreamKey = isSynthetic(realKey) ? null : realKey
const mask = (k) => (!k ? '(none)' : k.length <= 8 ? k[0] + '...' : k.slice(0, 3) + '...' + k.slice(-4))

// A decision model is a *different kind of client* than a harness under test.
// Forcing the study's model onto it would both corrupt its behaviour and make the
// measurement meaningless, so enforcement is per-harness and a decision model can
// be exempted. Its traffic is still attributed, logged and priced.
const optAll = (n) => { const out = []; argv.forEach((a, i) => { if (a === n && argv[i + 1]) out.push(argv[i + 1]) }); return out }
const exempt = new Set(optAll('--exempt').flatMap((s) => s.split(',')).map((s) => s.trim()).filter(Boolean))

// Repeatable: --upstream-for jev=https://api.typesafe.ai
// Lets a decision model live on a different provider while sharing one log.
const upstreamFor = new Map(optAll('--upstream-for').map((s) => {
  const i = s.indexOf('=')
  return [s.slice(0, i).trim(), s.slice(i + 1).trim().replace(/\/+$/, '')]
}))
const upstreamForHarness = (h) => upstreamFor.get(h) ?? upstream

// A provider can expose DIFFERENT endpoints per protocol, and Z.AI does:
//   Messages (Anthropic)  https://api.z.ai/api/anthropic
//   chat/completions      https://api.z.ai/api/coding/paas/v4
// Pointing one upstream at the other yields a 404 "Not Found" that looks like a
// bad model name. DSH speaks Messages and OpenCode speaks chat/completions, so a
// study running both against one provider needs both. The /v1 prefix is dropped
// when this is used, because the Z.AI path already carries its own version.
const upstreamOpenai = opt('--upstream-openai', null)
const openaiBaseFor = (target) => upstreamOpenai ?? target
const isEnforcing = (h) => !exempt.has(h)

mkdirSync(dirname(logPath), { recursive: true })
const log = (r) => appendFileSync(logPath, JSON.stringify(r) + '\n')

// Published rate cards, USD per million tokens. miss = uncached input.
//
// A missing model falls back to DeepSeek Flash pricing, which UNDERSTATES an
// expensive model badly - GLM-5.3 is 9.3x that on cached input. If a new model is
// added, add its price here in the same change.
const PRICES = {
  // CORRECTED 2026-09-30. The previous entry (miss 0.14, hit 0.028, out 0.28) came
  // from a third-party blog and was wrong in every cell: cache-hit 9.3x too high and
  // output 2.1x too low. The repo had the provider's own page captured all along at
  // _ev/deepseek-pricing.html (2026-09-28):
  //   1M INPUT (CACHE HIT)  off-peak $0.003   peak $0.006
  //   1M INPUT (CACHE MISS) off-peak $0.15    peak $0.30
  //   1M OUTPUT             off-peak $0.60    peak $1.20
  // and "Use deepseek-flash as the model name ... billed at the Flash price", so these
  // are exactly the rates that applied. OFF-PEAK column; peak is 2x.
  //
  // The correction MATTERS beyond the absolute figures: it makes output:input 4.00
  // rather than 2.00, so DeepSeek has the HIGHEST output ratio of any provider in the
  // study rather than the lowest, and the cache discount is 50x rather than 5x.
  'deepseek-flash': { miss: 0.15, hit: 0.003, out: 0.60 },
  'deepseek-pro':   { miss: 1.74, hit: 0.145, out: 3.48 },
  // Z.AI GLM, from docs.z.ai/guides/overview/pricing
  'glm-5.3-flash':  { miss: 0.15, hit: 0.03, out: 0.50 },
  'glm-5.3':        { miss: 1.40, hit: 0.26, out: 4.40 },
  'glm-5.2':        { miss: 1.40, hit: 0.26, out: 4.40 },
  // Alibaba Qwen 3.8 generation - these supersede qwen3-coder-next, which is NOT what
  // will be run. Together with DeepSeek and GLM they form a 2D design rather than one
  // axis, which is stronger than we had:
  //
  //   model            output:input   cache discount
  //   deepseek-flash        4.00         50.0x   (CORRECTED - was listed as 2.00 / 5.0x)
  //   qwen3.8-max           3.00          8.0x
  //   qwen3.8-flash         3.13          9.4x
  //   glm-5.3-flash         3.33          5.0x
  //
  // The useful pair is qwen3.8-flash against glm-5.3-flash: nearly the SAME price
  // ratio (3.13 against 3.33) but very different cache discounts (9.4x against 5x).
  // That holds the ratio roughly constant while varying the cache, which is the
  // controlled test of whether cache discipline scales with the discount (F8) - and
  // it has not shown at 5x on either provider so far.
  'qwen3.8-flash':     { miss: 0.15, hit: 0.016, out: 0.47 },
  'qwen3.8-max':       { miss: 2.00, hit: 0.25,  out: 6.00 },
  'qwen3.8-2.4t-a95b': { miss: 2.00, hit: 0.25,  out: 6.00 },

  // ---- ratio 5.0 providers. Every frontier model from both vendors sits at exactly
  // 5.0 output:input, so these supply the decisive high-ratio point in the F3 curve.
  // NOTE the write rate: both vendors charge MORE to write a cache entry than to send
  // the tokens uncached, the opposite of DeepSeek and GLM.
  'claude-haiku-4.5':  { miss: 1.00, hit: 0.10, write: 1.25,  out: 5.00 },
  'claude-sonnet-5.5': { miss: 2.00, hit: 0.20, write: 2.50,  out: 10.00 },
  'gpt-6-luna':        { miss: 0.10, hit: 0.01, write: 0.125, out: 0.50 },
  'gpt-6.1-sol':       { miss: 2.00, hit: 0.10, write: 2.50,  out: 10.00 },
}
const FALLBACK = { miss: 0.15, hit: 0.003, out: 0.60 }   // corrected, see the deepseek-flash entry
/** Resolve the rate card for a model at a given input size. */
function priceFor(m, inputTokens = 0) {
  // RESOLVE THE ALIAS. enforce() renames the model to the provider's API name before the
  // request is forwarded, and the cost is computed from the same parsed body afterwards -
  // so priceFor received "claude-haiku-4-5", found no entry, and silently returned
  // FALLBACK, which is the DeepSeek card. Anthropic was therefore billed in this study at
  // 0.15 miss / 0.60 output instead of 1.00 / 5.00, under-reporting by roughly 6-8x.
  // An unknown model falling back to ANOTHER PROVIDER'S rates is the defect: a missing
  // price must be loud, not plausible.
  const p = PRICES[m] ?? PRICES[ALIAS_TO_CANONICAL[m]]
  if (!p) {
    log({ ts: new Date().toISOString(), error: 'UNPRICED_MODEL', model: m,
          note: 'no price entry; cost will be null rather than another model\'s rates' })
    return null
  }
  if (!p.tiers) return p
  return p.tiers.find((t) => inputTokens <= t.maxInput) ?? p.tiers[p.tiers.length - 1]
}

/**
 * exp-<harness>-<runId> -> { harness, runId }. Anything else is 'unlabelled'.
 *
 * The harness is ALWAYS the first segment and the runId is everything after it, so
 * do only that - the split is unambiguous.
 *
 * An earlier version tried a regex first, /^exp-(.+?)-(r[0-9a-z_.-]+)$/, to
 * special-case legacy keys such as exp-opencode-r001. That regex does not anchor
 * on the harness at all: it takes the SHORTEST harness for which the NEXT segment
 * begins with "r". Any task whose name contains a segment starting with r then
 * split in the wrong place. Measured on fetch-heavy-semver-RANGES:
 *
 *   harness = "opencode-mmumpnnkv-opencode-fetch-heavy-semver"
 *   runId   = "ranges-opencode-s1"
 *
 * That is the worst kind of bug, because nothing fails. The requests return 200,
 * the runs report success, and the usage files under a harness name no experiment
 * queries - so the task measures zero tokens and zero cost, and the resulting
 * "cost comparison" is just the number 0. Every repo-wide-* task was hit the same
 * way by its "repo" segment.
 *
 * exp-opencode-r001 still parses correctly: harness "opencode", runId "r001".
 */
function attribute(authHeader) {
  const raw = String(authHeader ?? '').replace(/^Bearer\s+/i, '').trim()
  if (raw.startsWith('exp-')) {
    const parts = raw.slice(4).split('-')
    return { harness: parts[0] || 'unknown', runId: parts.slice(1).join('-') || 'unset', syntheticKey: raw }
  }
  return { harness: 'unlabelled', runId: 'unset', syntheticKey: raw || null }
}

function normaliseUsage(u) {
  if (!u) return null

  // Anthropic Messages names the same quantities differently, and is EXPLICIT
  // about caching: input_tokens EXCLUDES cached tokens, cache_read_input_tokens
  // is the hit, cache_creation_input_tokens is the write.
  //
  // This branch is load-bearing, not a nicety. DSH 0.1.7 speaks this protocol -
  // its DeepSeek base URL is https://api.deepseek.com/anthropic - so before this
  // existed every DSH request logged usage: null and the whole matrix came out as
  // zeros while OpenCode, which speaks chat/completions, looked fine.
  const isAnthropic = u.input_tokens != null || u.cache_read_input_tokens != null || u.cache_creation_input_tokens != null
  if (isAnthropic) {
    const read = u.cache_read_input_tokens ?? 0
    const created = u.cache_creation_input_tokens ?? 0
    const fresh = u.input_tokens ?? 0
    const inputTokens = fresh + read + created
    return {
      inputTokens,
      outputTokens: u.output_tokens ?? null,
      reasoningTokens: null,
      cacheHitTokens: read,
      // A cache WRITE is NOT a miss. The earlier version set this to fresh + created,
      // which counted every created token TWICE - once here and again as
      // cacheCreationTokens - and then costOf billed the second copy at the write rate.
      // inputTokens stays fresh + read + created because that is the true total; only
      // the miss figure changes.
      cacheMissTokens: fresh,
      cacheCreationTokens: created,
      cacheHitRate: inputTokens > 0 ? read / inputTokens : null,
    }
  }

  const hit = u.prompt_cache_hit_tokens ?? u.prompt_tokens_details?.cached_tokens ?? null
  const miss = u.prompt_cache_miss_tokens
    ?? (u.prompt_tokens != null && hit != null ? u.prompt_tokens - hit : null)
  return {
    inputTokens: u.prompt_tokens ?? null,
    outputTokens: u.completion_tokens ?? null,
    reasoningTokens: u.completion_tokens_details?.reasoning_tokens ?? null,
    cacheHitTokens: hit, cacheMissTokens: miss,
    cacheHitRate: hit != null && (hit + (miss ?? 0)) > 0 ? hit / (hit + (miss ?? 0)) : null,
  }
}
function costOf(model, u) {
  if (!u) return null
  // Tier is chosen by the request's own input size, not the model's.
  const p = priceFor(model, u.inputTokens ?? 0)
  if (!p) return null
  const hit = u.cacheHitTokens ?? 0
  const miss = u.cacheMissTokens ?? Math.max(0, (u.inputTokens ?? 0) - hit)
  const created = u.cacheCreationTokens ?? 0

  // A cache WRITE is not priced as a plain miss. DeepSeek and GLM cache for free, so
  // treating writes as misses was exact for them. Anthropic charges 1.25x the input
  // rate for a 5-minute write and 2x for a one-hour write, and OpenAI charges 1.25x -
  // so on those providers every cached token costs MORE than an uncached one, and
  // pricing writes as misses would understate the bill on exactly the runs that cache
  // most. The write rate defaults to miss, so the DeepSeek and GLM cards stay exact.
  const write = p.write ?? p.miss
  // fresh = miss, NOT max(0, miss - created). The buckets are disjoint: Anthropic reports
  // input/creation/read separately, and the other three providers bill creation at the miss
  // rate so creation is 0 for them. Subtracting creation from miss AND billing it as a write
  // counts those tokens down twice and up once.
  const fresh = miss

  return {
    coldUsd: ((u.inputTokens ?? 0) / 1e6) * p.miss + ((u.outputTokens ?? 0) / 1e6) * p.out,
    billedUsd: (fresh / 1e6) * p.miss + (created / 1e6) * write + (hit / 1e6) * p.hit +
               ((u.outputTokens ?? 0) / 1e6) * p.out,
  }
}

/** Enforce identical model configuration; report every deviation. */
function enforce(body) {
  const deviations = []
  const want = (field, value) => {
    if (value == null) return
    if (String(body[field]) !== String(value)) deviations.push({ field, from: body[field] ?? null, to: value })
    body[field] = typeof value === 'string' && /^-?[0-9.]+$/.test(value) ? Number(value) : value
  }
  // The study's canonical model name and the provider's API name are not always the
  // same string. Anthropic's API answers 404 for "claude-haiku-4.5" and 200 for
  // "claude-haiku-4-5", while the pricing table - and every dataset already collected -
  // uses the dotted form. Rename on the wire only: logs, cost attribution and analysis
  // all continue to use the canonical name.
  want('model', forceModel)
  if (forceModel && MODEL_ALIASES[forceModel]) body.model = MODEL_ALIASES[forceModel]
  want('reasoning_effort', forceEffort)
  want('temperature', forceTemperature)
  if (maxTokensCeiling != null) {
    const cap = Number(maxTokensCeiling)
    const cur = body.max_tokens
    if (cur != null && Number(cur) > cap) {
      deviations.push({ field: 'max_tokens', from: cur, to: cap })
      body.max_tokens = cap
    }
  }
  return deviations
}

// ---- request/response dialect bridging --------------------------------------
// OpenAI Responses API -> chat completions. Compact and deliberately partial:
// text in, text and tool calls out. Verify against a real client before trusting.
function responsesToChat(body) {
  const messages = []
  if (body.instructions) messages.push({ role: 'system', content: String(body.instructions) })
  const input = body.input
  if (typeof input === 'string') messages.push({ role: 'user', content: input })
  else if (Array.isArray(input)) {
    for (const item of input) {
      if (!item) continue
      if (item.type === 'message' || item.role) {
        const text = typeof item.content === 'string' ? item.content
          : (Array.isArray(item.content) ? item.content.map(c => c?.text ?? '').join('') : '')
        messages.push({ role: item.role ?? 'user', content: text })
      } else if (item.type === 'function_call_output') {
        messages.push({ role: 'tool', tool_call_id: item.call_id, content: String(item.output ?? '') })
      }
    }
  }
  const tools = (body.tools ?? []).filter(t => t?.type === 'function').map(t => ({
    type: 'function', function: { name: t.name, description: t.description ?? '', parameters: t.parameters ?? {} },
  }))
  return {
    model: body.model, messages, stream: false,
    ...(tools.length ? { tools, tool_choice: 'auto' } : {}),
    ...(body.max_output_tokens ? { max_tokens: body.max_output_tokens } : {}),
  }
}
function chatToResponses(chat, model) {
  const choice = chat?.choices?.[0] ?? {}
  const msg = choice.message ?? {}
  const out = []
  if (msg.content) out.push({ type: 'message', role: 'assistant', id: 'msg_0',
    content: [{ type: 'output_text', text: String(msg.content) }] })
  for (const tc of msg.tool_calls ?? []) {
    out.push({ type: 'function_call', id: 'fc_0', call_id: tc.id, name: tc.function?.name,
      arguments: tc.function?.arguments ?? '{}' })
  }
  const u = normaliseUsage(chat?.usage)
  return {
    id: chat?.id ?? 'resp_0', object: 'response', created_at: Math.floor(Date.now() / 1000), model,
    status: 'completed', output: out,
    usage: u ? { input_tokens: u.inputTokens, output_tokens: u.outputTokens,
      input_tokens_details: { cached_tokens: u.cacheHitTokens } } : undefined,
  }
}

function usageFromSse(text) {
  // Merge every usage object in the stream rather than keeping the last one.
  //
  // Anthropic Messages splits usage across events: message_start carries the
  // input side INCLUDING cache_read_input_tokens, and message_delta carries
  // output_tokens. Keeping only the last object would drop the cache numbers and
  // report a 0% hit rate for every DSH run - a silent, plausible-looking zero.
  // Merging is also correct for OpenAI-style streams, where usage appears once.
  let merged = null
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t.startsWith('data:')) continue
    const p = t.slice(5).trim()
    if (!p || p === '[DONE]') continue
    let o = null
    try { o = JSON.parse(p) } catch { continue }
    if (!o) continue
    // Merge field-by-field, keeping any value already seen that the new object does not
    // supply. A plain spread OVERWRITES: message_delta arrives last and carries only
    // output_tokens, and any partial usage object it sends would erase the input and
    // cache numbers that message_start supplied. Anthropic's own console reports 37.7M
    // more input tokens than this gateway counted across the same period, and a merge
    // that can drop an earlier field is the first place to look.
    const absorb = (u) => {
      if (!u) return
      for (const [k, v] of Object.entries(u)) {
        if (v === null || v === undefined) continue
        merged = merged ?? {}
        // Counters accumulate where both events report the same counter; taking the max
        // is right for a running total that a later event may restate lower.
        if (typeof v === 'number' && typeof merged[k] === 'number') merged[k] = Math.max(merged[k], v)
        else merged[k] = v
      }
    }
    absorb(o.usage)
    if (o.type === 'message_start' && o.message?.usage) absorb(o.message.usage)
  }
  return merged
}

const stats = new Map()   // harness -> { requests, inputTokens, cacheHit, cost }

const server = createServer(async (req, res) => {
  const started = Date.now()
  const url = req.url ?? '/'

  if (url.startsWith('/__stats')) {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({
      upstream, exempt: [...exempt],
      upstreamKeyConfigured: !!upstreamKey,
      upstreamKeyMasked: mask(realKey),
      // The cache condition is part of the treatment, so it is reported by the same endpoint
      // that reports the model. A run whose condition cannot be read off the gateway is a run
      // whose treatment depends on remembering which command line started it.
      enforced: { model: forceModel, reasoning_effort: forceEffort, temperature: forceTemperature, max_tokens_ceiling: maxTokensCeiling,
        cache_static_breakpoints: cacheBreakpoints, cache_automatic_top_level: autoCache },
      upstreamOverrides: Object.fromEntries(upstreamFor),
      upstreamOpenai,
      harnesses: [...stats].map(([harness, s]) => ({ harness, ...s })),
    }, null, 1))
    return
  }

  const chunks = []
  for await (const c of req) chunks.push(c)
  let body = Buffer.concat(chunks)
  const attr = attribute(req.headers.authorization ?? req.headers['x-api-key'])

  if (!upstreamKey) {
    res.writeHead(503, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: { type: 'gateway_misconfigured', message:
      'measure-gateway has no usable upstream DEEPSEEK_API_KEY, so it will not forward the synthetic key "' +
      (attr.syntheticKey ?? '(none)') + '" to the provider. Restart the gateway with a real key.' } }))
    log({ ts: new Date().toISOString(), ...attr, path: url, status: 503,
          error: 'no upstream key; refused to forward a synthetic key' })
    return
  }
  // Set BOTH auth header styles. Anthropic-protocol clients (DSH 0.1.7) send
  // x-api-key; OpenAI-protocol clients send authorization. Whichever the client
  // used held the synthetic key, so both have to be replaced or the synthetic key
  // leaks upstream and the provider rejects it.
  const headers = { ...req.headers, authorization: 'Bearer ' + upstreamKey, 'x-api-key': upstreamKey }
  if (workspaceId) headers['anthropic-workspace-id'] = workspaceId
  delete headers.host; delete headers['content-length']; delete headers['accept-encoding']

  const isResponses = url.includes('/responses')
  // Record the REQUEST'S TOP-LEVEL KEYS. Twice now a provider error named a parameter
  // ("the effort parameter") that could not be found by reading the strip list, because
  // it was not a top-level field at all. Logging the keys turns that guessing into
  // reading, and it costs a few bytes per request.
  const base = { ts: new Date().toISOString(), ...attr, path: url, isResponses }

  // --- Responses API: native passthrough when the upstream speaks it --------
  //
  // The bridge below exists for DeepSeek, which has no Responses API. OpenAI DOES,
  // and bridging it to chat-completions actively breaks the request:
  //   400 Function tools with reasoning_effort are not supported for gpt-6-luna in
  //       /v1/chat/completions. To use function tools, use /v1/responses or set
  //       reasoning_effort to 'none'.
  // The provider is naming the very endpoint the client already used. DSH's pi-ai
  // openai route speaks Responses natively, so the correct behaviour is to forward it
  // untouched and let the protocol survive end to end.
  if (isResponses && isOpenAiUpstream) {
    const targetNative = upstreamForHarness(attr.harness)
    let up2
    try {
      up2 = await fetch(targetNative + url, { method: req.method, headers, body: body.length ? body : undefined })
    } catch (e) {
      log({ ...base, status: 0, latencyMs: Date.now() - started, error: String(e?.message ?? e) })
      res.writeHead(502, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: { message: 'measure-gateway upstream failure: ' + String(e?.message ?? e) } }))
      return
    }
    const outHeaders2 = {}
    up2.headers.forEach((v, k) => { if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(k)) outHeaders2[k] = v })
    res.writeHead(up2.status, outHeaders2)
    // TEE THE STREAM. A native passthrough is correct for the protocol and useless for
    // measurement: the first version forwarded the body and recorded no usage and no
    // model, so the harness would have run, solved tasks, and contributed nothing. That
    // is the exact failure this study excluded Cline for. The Responses API reports
    // usage in its terminal event, so the bytes are captured for parsing while still
    // being relayed unmodified.
    let raw = ''
    if (up2.body) {
      // A STREAM ERROR MUST NOT KILL THE GATEWAY. This loop threw an unhandled
      // UND_ERR_BODY_TIMEOUT from undici, and the process exited - taking the instrument
      // down mid-matrix at 183 of 620 runs, so every subsequent run failed for a reason
      // that had nothing to do with the harness or the provider. A gateway is
      // infrastructure: one bad request may fail one request, never the run.
      try {
      for await (const c of up2.body) {
        res.write(c)
        // Buffer.from() accepts Uint8Array, which is what the fetch body actually yields.
        // Buffer.isBuffer(c) is FALSE for those, so the original fell through to String(c)
        // and produced "101,118,101,110,116" - the byte values of "event" - which parsed
        // as neither JSON nor SSE and left usage null while the request succeeded.
        if (raw.length < 400000) raw += Buffer.from(c).toString('utf8')
      }
      } catch (streamErr) {
        // Whatever arrived before the failure is still parsed for usage, and the request
        // is logged as truncated rather than silently counted as complete.
        console.log('  [stream] body error, request truncated: ' + String(streamErr?.cause?.code ?? streamErr?.code ?? streamErr?.message ?? streamErr))
      }
    }
    try { res.end() } catch {}
    let usage = null, model = null
    // The Responses API may answer as SSE or as one JSON body depending on the stream
    // flag, and the first parser handled only SSE - it captured nothing and reported
    // parsedFromStream false while the request itself succeeded. Try the whole body as
    // JSON first, then fall back to scanning SSE data lines.
    const absorb = (resp) => {
      if (!resp) return
      if (resp.model) model = resp.model
      if (resp.usage) {
        const u = resp.usage
        usage = {
          inputTokens: u.input_tokens ?? 0,
          outputTokens: u.output_tokens ?? 0,
          // The Responses API reports cached input separately; map it to the same
          // fields the Anthropic path uses so cost and analysis code need no branch.
          cacheHitTokens: u.input_tokens_details?.cached_tokens ?? 0,
          cacheMissTokens: Math.max(0, (u.input_tokens ?? 0) - (u.input_tokens_details?.cached_tokens ?? 0)),
          cacheCreationTokens: 0,
          reasoningTokens: u.output_tokens_details?.reasoning_tokens ?? null,
        }
      }
    }
    try { absorb(JSON.parse(raw)) } catch {
      for (const line of raw.split('\n')) {
        const t = line.trim()
        if (!t.startsWith('data:')) continue
        try { const ev = JSON.parse(t.slice(5).trim()); absorb(ev.response ?? ev) } catch {}
      }
    }
    log({ ...base, status: up2.status, latencyMs: Date.now() - started, isResponses: true, native: true,
          rawBytes: raw.length, rawSample: raw.slice(0, 400),
          model: model ?? forceModel ?? null, usage,
          cost: usage ? costOf(model ?? forceModel, usage) : null,
          parsedFromStream: !!usage })
    return
  }

  // --- bridge: Responses API in, chat completions upstream ------------------
  if (isResponses) {
    let inBody = null
    try { inBody = JSON.parse(body.toString('utf8')) } catch {}
    if (!inBody) { res.writeHead(400, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: { message: 'measure-gateway: unparsable Responses request' } })); return }
    const chat = responsesToChat(inBody)
    const enforcing = isEnforcing(attr.harness)
    const deviations = enforcing ? enforce(chat) : []
    // OpenAI renamed max_tokens to max_completion_tokens and rejects the old name:
    //   400 Unsupported parameter: 'max_tokens' is not supported with this model.
    // This MUST be applied on the bridge path as well as the chat passthrough. DSH's
    // pi-ai openai route speaks the RESPONSES API, so every request from the harness
    // takes this branch and the passthrough rename never ran - the first fix looked
    // correct and changed nothing.
    if (isOpenAiUpstream && chat.max_tokens != null) {
      chat.max_completion_tokens = chat.max_tokens
      delete chat.max_tokens
      deviations.push({ field: 'max_tokens', action: 'renamed', to: 'max_completion_tokens' })
    }
    const target = upstreamForHarness(attr.harness)
    const up = await fetch(target + '/v1/chat/completions', {
      method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(chat) })
    const text = await up.text()
    let parsed = null; try { parsed = JSON.parse(text) } catch {}
    if (!up.ok || !parsed) {
      res.writeHead(up.status, { 'content-type': 'application/json' }); res.end(text)
      log({ ...base, status: up.status, latencyMs: Date.now() - started, deviations, error: 'upstream non-JSON' }); return
    }
    const u = normaliseUsage(parsed.usage)
    const rec = { ...base, model: chat.model, status: up.status, latencyMs: Date.now() - started,
      deviations, enforced: enforcing, upstream: target, usage: u, cost: costOf(chat.model, u), requestBytes: body.length }
    log(rec); bump(attr.harness, rec)
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(chatToResponses(parsed, chat.model)))
    return
  }

  // --- default: chat completions passthrough --------------------------------
  let parsedReq = null
  try { parsedReq = JSON.parse(body.toString('utf8')) } catch {}
  // Assigned HERE, not in the base object above: referencing parsedReq before its
  // declaration threw "Cannot access parsedReq before initialization" and killed the
  // gateway on the very first request of a run.
  if (parsedReq) base.bodyKeys = Object.keys(parsedReq)
  const enforcing = isEnforcing(attr.harness)
  let deviations = []
  if (enforcing && parsedReq && (forceModel || forceEffort || forceTemperature)) {
    deviations = enforce(parsedReq)
    body = Buffer.from(JSON.stringify(parsedReq))
  }

  // Extended thinking: Anthropic REQUIRES budget_tokens whenever thinking is enabled,
  // and DSH sends thinking:{type:'enabled'} without it. The provider answers
  //   400 thinking.enabled.budget_tokens: Field required
  // which reads like a malformed request from the harness.
  //
  // Supplying a fixed budget rather than stripping the field is deliberate: thinking is
  // part of what this study MEASURES. It changes output volume, and output volume is the
  // mechanism under test - silently disabling it would remove the very thing being
  // measured. A constant budget also keeps it from becoming an uncontrolled variable.
  if (parsedReq && parsedReq.thinking && parsedReq.thinking.type === 'enabled') {
    const want = modelThinking[forceModel]
    if (want) {
      // This model wants a different thinking mode entirely; budget_tokens must go.
      parsedReq.thinking = { type: want }
      deviations = [...deviations, { field: 'thinking.type', action: 'translated', from: 'enabled', to: want }]
      body = Buffer.from(JSON.stringify(parsedReq))
    } else if (parsedReq.thinking.budget_tokens == null) {
      const cap = parsedReq.max_tokens ?? 32768
      // Anthropic requires budget_tokens >= 1024 and strictly less than max_tokens.
      parsedReq.thinking.budget_tokens = Math.max(1024, Math.min(thinkingBudget, cap - 1024))
      body = Buffer.from(JSON.stringify(parsedReq))
    }
  }

  // EXPLICIT CACHING BREAKPOINTS.
  //
  // DeepSeek and Z.AI cache automatically; Anthropic requires the client to mark cache
  // boundaries with cache_control. DSH does not, so the pilot measured cacheHitTokens=0
  // and every input token billed at the full rate - 3.4x the projected cost.
  //
  // Injecting the breakpoints is the same class of adaptation as the max_tokens ceiling:
  // a transport concern the harness omits, which the provider requires. It also makes the
  // comparison like-for-like, because the other providers are caching whether the harness
  // asks them to or not. Leaving it out would measure a DSH omission rather than the
  // provider's economics - and cross-provider cache semantics are a finding in their own
  // right, recorded in FINDINGS rather than hidden here.
  if (parsedReq && url.includes('/messages') && cacheBreakpoints) {
    // AUTOMATIC CACHING, top-level. Anthropic's own documentation:
    //
    //   "Add a single cache_control field at the TOP LEVEL of your request. The system
    //    automatically applies the cache breakpoint to the LAST CACHEABLE BLOCK and
    //    MOVES IT FORWARD as conversations grow. Best for multi-turn conversations where
    //    the growing message history should be cached automatically."
    //
    // The previous version put cache_control on the system prompt and the last tool - a
    // STATIC prefix that never grows. Measured against Anthropic's own usage export, that
    // left 134.3M of 146M input tokens billed at the FULL rate with only 6 percent
    // cache-read. The cached region was fixed and small while the conversation grew past
    // it on every turn, which is precisely the case automatic caching exists for.
    //
    // Both are kept: the explicit static prefix still helps the first turn of a run, and
    // the top-level field then carries the breakpoint forward from there.
    // NOT ENABLED. Automatic caching (a top-level cache_control field) would cut the
    // bill substantially - Anthropic's own export shows 134.3M of 146M input tokens
    // billed at the full rate with only 6 percent cache-read - but it is NOT the
    // harness's behaviour, and this study measures harnesses.
    //
    // A gateway that improves the request is measuring itself. The same objection
    // applies to the explicit breakpoints below: they were added to match DeepSeek and
    // Z.AI, which cache automatically whether the harness asks or not, and that
    // justification is worth re-examining rather than extending.
    const mark = (o) => { if (o && typeof o === 'object') o.cache_control = { type: 'ephemeral' } }
    const marked = []
    if (Array.isArray(parsedReq.system) && parsedReq.system.length) {
      mark(parsedReq.system[parsedReq.system.length - 1]); marked.push('system')
    }
    if (Array.isArray(parsedReq.tools) && parsedReq.tools.length) {
      mark(parsedReq.tools[parsedReq.tools.length - 1]); marked.push('tools')
    }
    // The top-level field the A/B turns on. Anthropic moves this breakpoint forward as the
    // conversation grows, so the cached region tracks the transcript instead of stopping at
    // the system prompt. Recorded as a deviation like every other request modification, so a
    // run's treatment is recoverable from the log rather than from which launcher started it.
    if (autoCache) {
      parsedReq.cache_control = { type: 'ephemeral' }
      marked.push('top-level')
    }
    if (marked.length) {
      deviations = [...deviations, { field: 'cache_control', action: 'injected', where: marked }]
      body = Buffer.from(JSON.stringify(parsedReq))
    }
  }

  // Harness-private fields. DSH attaches dsh_* metadata that DeepSeek and Z.AI accept
  // and Anthropic rejects outright:
  //   400 dsh_plugin_packages: Extra inputs are not permitted
  // Stripping them is a transport concern, not a behavioural one - the provider never
  // understood them anyway, so removing them cannot change what is being measured.
  if (parsedReq) {
    let stripped = []
    for (const k of Object.keys(parsedReq)) {
      if (/^dsh_/.test(k)) { delete parsedReq[k]; stripped.push(k) }
    }
    // Per-model capability: drop parameters this model documents as unsupported.
    const unsupported = [...stripFields, ...(modelStrip[forceModel] ?? [])]
    for (const k of unsupported) {
      if (k in parsedReq) { delete parsedReq[k]; stripped.push(k) }
    }
    // THE EFFORT PARAMETER IS NESTED. DSH sends output_config:{effort:...} and
    // Anthropic answers 400 "This model does not support the effort parameter" for
    // Haiku. Stripping top-level keys alone never touched it, and the message named a
    // field that appeared nowhere at the top level. bodyKeys logging is what found it.
    if (parsedReq.output_config && typeof parsedReq.output_config === 'object') {
      for (const k of unsupported) {
        if (k in parsedReq.output_config) {
          delete parsedReq.output_config[k]
          stripped.push('output_config.' + k)
        }
      }
      if (!Object.keys(parsedReq.output_config).length) {
        delete parsedReq.output_config
        stripped.push('output_config (emptied)')
      }
    }
    if (stripped.length) {
      deviations = [...deviations, { field: 'harness-private', action: 'stripped', keys: stripped }]
      body = Buffer.from(JSON.stringify(parsedReq))
    }

    // SCOPED BY DESTINATION, NOT BY PROVIDER. The two rewrites below are OpenAI wire-format
    // adaptations. They were guarded on `isOpenAiUpstream`, which is a PROVIDER-level flag set
    // by --upstream-openai - and Qwen and z.ai both set it, because they expose an
    // OpenAI-compatible endpoint for the chat harnesses. But a /v1/messages request from DSH goes
    // to the ANTHROPIC upstream (see the routing below), and it was still being handed
    // max_completion_tokens and reasoning_effort:'none'.
    //
    // z.ai ignores the extra fields. DashScope rejects the whole body:
    //   400 InvalidParameter: Request body format invalid
    // That killed 540 of 540 DSH requests in the hard-task Qwen batch - 132 of 154 runs measured
    // nothing - while every one of opencode's 2,385 chat-completions requests to the same gateway
    // succeeded. qwen-full is unaffected: it was collected before these rewrites existed
    // (0 renames in results/qwen-gateway.jsonl).
    const openAiBound = !url.includes('/messages')

    // OpenAI's newer models renamed max_tokens to max_completion_tokens and reject the
    // old name outright:
    //   400 Unsupported parameter: 'max_tokens' is not supported with this model.
    //       Use 'max_completion_tokens' instead.
    // A rename, not a strip - the value still matters, and dropping it would let the
    // provider choose an output length this study is not controlling.
    if (isOpenAiUpstream && openAiBound && parsedReq.max_tokens != null) {
      parsedReq.max_completion_tokens = parsedReq.max_tokens
      delete parsedReq.max_tokens
      deviations = [...deviations, { field: 'max_tokens', action: 'renamed', to: 'max_completion_tokens' }]
      body = Buffer.from(JSON.stringify(parsedReq))
    }

    // OpenAI refuses reasoning_effort together with function tools on chat-completions:
    //   400 Function tools with reasoning_effort are not supported for gpt-6-luna in
    //       /v1/chat/completions. To use function tools, use /v1/responses or set
    //       reasoning_effort to 'none'.
    // Tools are non-negotiable for a coding agent, so effort is what goes. This is the
    // same incompatibility that forced the Responses passthrough for DSH; cline and
    // opencode speak chat-completions directly and cannot take that route.
    // SET, DO NOT STRIP. The first version deleted reasoning_effort and changed nothing,
    // because cline and opencode never send it - their bodyKeys are
    //   [model, messages, tools, tool_choice, stream, stream_options]
    // The conflict is with the MODEL'S DEFAULT effort, not with a field the client sent.
    // The provider's message names the remedy outright:
    //   To use function tools, use /v1/responses or set reasoning_effort to 'none'.
    // So when tools are present and nothing has been set, set it explicitly. Deleting a
    // field that is absent is a no-op, and it looked like a fix while doing nothing.
    if (isOpenAiUpstream && openAiBound && Array.isArray(parsedReq.tools) && parsedReq.tools.length
        && parsedReq.reasoning_effort == null) {
      parsedReq.reasoning_effort = 'none'
      deviations = [...deviations, { field: 'reasoning_effort', action: 'set',
        to: 'none', reason: 'required alongside function tools on chat-completions' }]
      body = Buffer.from(JSON.stringify(parsedReq))
    }
  }

  const target = upstreamForHarness(attr.harness)
  // Messages lives under /anthropic on DeepSeek: the client posts /v1/messages
  // but the real endpoint is https://api.deepseek.com/anthropic/v1/messages.
  // Forwarding to target + url gave a 404 on all 40 DSH requests.
  // Messages lives under /anthropic on DeepSeek: the client posts /v1/messages but
  // the real endpoint is https://api.deepseek.com/anthropic/v1/messages.
  //
  // Z.AI's upstream ALREADY ends in /anthropic (https://api.z.ai/api/anthropic),
  // so appending again produced .../anthropic/anthropic/v1/messages - a 404 that
  // looks identical to the protocol mismatch that broke DSH 0.1.7.
  //
  // A THIRD case, and the one that bit us: a provider that serves the Messages API at
  // its ROOT. Anthropic itself is https://api.anthropic.com/v1/messages - there is no
  // /anthropic segment at all. Appending one produced 404 on every pilot request, and
  // the failure looked exactly like the protocol mismatch that broke DSH 0.1.7.
  // --native-messages says "this upstream IS the Messages API, do not insert a path".
  const isMessagesReq = url.includes('/messages')
  let forwardUrl
  if (isMessagesReq) {
    const messagesBase = nativeMessages ? target
      : target.endsWith('/anthropic') ? target
      : target + '/anthropic'
    forwardUrl = messagesBase + url
  } else if (upstreamOpenai) {
    forwardUrl = openaiBaseFor(target) + url.replace(/^\/v1/, '')
  } else {
    forwardUrl = target + url
  }
  let up
  try {
    up = await fetch(forwardUrl, { method: req.method, headers, body: body.length ? body : undefined })
  } catch (e) {
    log({ ...base, status: 0, latencyMs: Date.now() - started, error: String(e?.message ?? e) })
    res.writeHead(502, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: { message: 'measure-gateway upstream failure: ' + String(e?.message ?? e) } }))
    return
  }

  // Record WHY an upstream refused, not just that it did. Diagnosing 400s by guessing
  // has cost this project hours twice: once on Anthropic's nested effort parameter and
  // once on Qwen's field rejection. The provider's own message is the fastest evidence
  // there is, and it was being thrown away.
  if (up.status >= 400) {
    try {
      const clone = up.clone()
      const errText = await clone.text()
      log({ ...base, status: up.status, latencyMs: Date.now() - started, deviations,
            upstreamError: errText.slice(0, 600) })
    } catch (e) {
      log({ ...base, status: up.status, latencyMs: Date.now() - started, deviations,
            upstreamError: 'unreadable: ' + String(e?.message ?? e) })
    }
  }

  const outHeaders = {}
  up.headers.forEach((v, k) => { if (!['content-encoding','content-length','transfer-encoding'].includes(k)) outHeaders[k] = v })
  res.writeHead(up.status, outHeaders)

  const isSse = (up.headers.get('content-type') ?? '').includes('text/event-stream')
  let captured = ''
  const MAX = 8 * 1024 * 1024
  if (up.body) {
    const reader = up.body.getReader()
    const dec = new TextDecoder()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(Buffer.from(value))
      if (captured.length < MAX) captured += dec.decode(value, { stream: true })
    }
  }
  res.end()

  let usage = null
  if (isSse) usage = usageFromSse(captured)
  else { try { usage = JSON.parse(captured).usage ?? null } catch {} }
  const u = normaliseUsage(usage)
  const model = parsedReq?.model ?? forceModel ?? 'unknown'

  // WHAT THE PROVIDER SAID IT SERVED, which is not the same as what we asked for.
  //
  // Until 2026-10-02 this record held only the model the gateway SENT. That is a real gap, because
  // 'claude-haiku-4-5' is a FLOATING ALIAS: Anthropic resolves it to a dated snapshot
  // ('claude-haiku-4-5-20251001' as of the live probe that prompted this). If the alias were ever
  // re-pointed, every Anthropic figure in this study would be priced against the wrong card with no
  // trace in the archive. The same applies to 'claude-sonnet-5-5'.
  //
  // Probed live on 2026-10-02: 'claude-haiku-4-5' -> claude-haiku-4-5-20251001 (200);
  // 'claude-haiku-4.5' and 'claude-3-5-haiku-latest' -> 404. So the study is demonstrably on
  // Haiku 4.5 and demonstrably not on 3.5 - but it could only be shown by asking the provider,
  // not by reading the archive. Recorded from here on so it can be read off the archive.
  let servedModel = null
  try {
    if (isSse) {
      for (const line of captured.split('\n')) {
        const t = line.trim()
        if (!t.startsWith('data:')) continue
        try {
          const ev = JSON.parse(t.slice(5).trim())
          if (ev?.message?.model) { servedModel = ev.message.model; break }
          if (ev?.model) { servedModel = ev.model; break }
        } catch {}
      }
    } else {
      servedModel = JSON.parse(captured)?.model ?? null
    }
  } catch {}
  if (servedModel && servedModel !== model) {
    console.log('[gateway] NOTE ' + model + ' was served as ' + servedModel)
  }

  const rec = { ...base, model, servedModel, stream: isSse === true, status: up.status,
    maxTokens: parsedReq?.max_tokens ?? null,
    latencyMs: Date.now() - started, deviations, enforced: enforcing, upstream: target, forwardUrl, usage: u, cost: costOf(model, u),
    messages: Array.isArray(parsedReq?.messages) ? parsedReq.messages.length : null,
    tools: Array.isArray(parsedReq?.tools) ? parsedReq.tools.length : null,
    requestBytes: body.length, requestHash: createHash('sha256').update(body).digest('hex').slice(0, 16) }
  log(rec); bump(attr.harness, rec)
})

function bump(harness, rec) {
  const s = stats.get(harness) ?? { requests: 0, inputTokens: 0, cacheHitTokens: 0, outputTokens: 0, billedUsd: 0, deviations: 0 }
  s.requests++
  s.inputTokens += rec.usage?.inputTokens ?? 0
  s.cacheHitTokens += rec.usage?.cacheHitTokens ?? 0
  s.outputTokens += rec.usage?.outputTokens ?? 0
  s.billedUsd += rec.cost?.billedUsd ?? 0
  s.deviations += (rec.deviations?.length ?? 0) > 0 ? 1 : 0
  stats.set(harness, s)
}

if (!upstreamKey) {
  console.error('measure-gateway: no usable upstream key.')
  console.error('  DEEPSEEK_API_KEY is: ' + mask(realKey))
  console.error('  Harnesses send synthetic keys (exp-<harness>-<runId>); the gateway replaces')
  console.error('  them with this one. A synthetic key is never forwarded to the provider.')
  console.error('  Set a real key and restart:  $env:DEEPSEEK_API_KEY = "sk-..."')
  if (!allowUnauthenticated) process.exit(1)
  console.error('  --allow-unauthenticated given: starting, but every request returns 503.')
}

server.listen(port, '127.0.0.1', () => {
  // The gateway is the measuring instrument for the whole study. A stray rejection or an
// uncaught synchronous throw anywhere in one request's handling must degrade that request,
// not terminate the process. This ran without a net until a body timeout exited the
// process mid-matrix.
process.on('uncaughtException', (e) => {
  console.log('  [uncaught] ' + String(e?.stack ?? e).split('\n').slice(0, 3).join(' | '))
})
process.on('unhandledRejection', (e) => {
  console.log('  [unhandled] ' + String(e?.stack ?? e).split('\n').slice(0, 3).join(' | '))
})

console.log('measure-gateway listening on http://127.0.0.1:' + port)
  console.log('  base URL   : http://127.0.0.1:' + port + '/v1')
  console.log('  upstream   : ' + upstream + (nativeMessages ? '   (native messages: no /anthropic inserted)' : ''))
  console.log('  log        : ' + logPath)
  console.log('  enforced   : model=' + (forceModel ?? '-') + ' effort=' + (forceEffort ?? '-') + ' temperature=' + (forceTemperature ?? '-'))
  console.log('  upstream key: ' + mask(realKey) +
    (upstreamKey ? '   (synthetic exp-* keys are replaced with this)' : '   ** NOT USABLE - every request returns 503 **'))
  console.log('  exempt     : ' + (exempt.size ? [...exempt].join(', ') + '   (attributed and priced, but never rewritten)' : 'none'))
  for (const [h, u] of upstreamFor) console.log('  route      : ' + h + ' -> ' + u)
  console.log('  give each harness the key:  exp-<harness>-<runId>')
  console.log('  live stats : http://127.0.0.1:' + port + '/__stats')
})
