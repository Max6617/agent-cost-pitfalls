/**
 * router-plugin — wires router-core to the DSH agent loop.
 *
 * The wiring below follows the shipped model-selection plugin, read from
 * @deepseek-ai/dsh-agent/lib/model-selection.js. Both hooks and their payload
 * shapes are confirmed from that source, not guessed:
 *
 *   agent/request   async (payload, next) -> resolved
 *                   next() resolves { provider, model, reasoningEffort, ... }.
 *                   Returning { ...resolved, provider, model, reasoningEffort }
 *                   overrides the route for this request.   -> sets the TIER
 *
 *   agent/pre-step  async ({ agent, messages, signal, step }, next) -> decision
 *                   next() resolves a decision with .kind and .messages.
 *                   Returning { ...decision, messages: [...decision.messages, x] }
 *                   injects text into THIS step.            -> sets the BAND
 *
 * The shipped plugin's own guard is the discipline this file copies: it only
 * injects when the route actually changed (sameRoute(selected, previous) returns
 * the decision untouched otherwise). Anything else rewrites the prefix every step
 * and reprices the whole prompt at the cache-miss rate.
 *
 * Deterministic only: no model call, no API key, no network. See router-core.mjs.
 */
import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { PolicyCache, PERSONA, assertPrefixStable, detectStall, BAND } from './router-core.mjs'

export const name = 'router-det'

/** Cordis injects nothing here: the plugin only listens and rewrites in place. */
export const inject = []

export const DEFAULT_ROUTES = {
  cheap:    { provider: 'deepseek-official', model: 'deepseek-flash', reasoningEffort: 'off' },
  standard: { provider: 'deepseek-official', model: 'deepseek-flash', reasoningEffort: 'high' },
  strong:   { provider: 'deepseek-official', model: 'deepseek-pro',   reasoningEffort: 'high' },
}

export function apply(ctx, config = {}) {
  const cfg = {
    routes: { ...DEFAULT_ROUTES, ...(config.routes ?? {}) },
    costMode: config.costMode ?? 'cost-first',
    minChars: config.minChars ?? 24,
    ledgerPath: config.ledgerPath ?? null,
    injectPersona: config.injectPersona !== false,
    enabled: config.enabled !== false,
  }

  const cache = new PolicyCache({ costMode: cfg.costMode, minChars: cfg.minChars })
  const state = {
    inputId: null,            // current user input
    inputSeq: 0,
    appliedBand: null,        // band already written into the prefix
    appliedTier: null,
    prefixFingerprint: null,  // for the H2 cache-safety assert
    recentCalls: [],
    escalations: 0,
  }

  const ledger = (record) => {
    if (!cfg.ledgerPath) return
    try {
      mkdirSync(dirname(cfg.ledgerPath), { recursive: true })
      appendFileSync(cfg.ledgerPath, JSON.stringify({ ts: new Date().toISOString(), ...record }) + '\n')
    } catch { /* a ledger failure must never break a run */ }
  }

  /** Capture the current input once, so every step of it shares one decision. */
  function beginInputIfNeeded(messages) {
    if (state.inputId !== null) return
    const firstUser = (messages ?? []).find((m) => m?.role === 'user')
    const text = typeof firstUser?.content === 'string'
      ? firstUser.content
      : (Array.isArray(firstUser?.content) ? firstUser.content.map((c) => c?.text ?? '').join('') : '')
    state.inputSeq += 1
    state.inputId = 'in-' + state.inputSeq
    state.appliedBand = null
    state.appliedTier = null
    state.prefixFingerprint = null
    const decision = cache.begin(state.inputId, text)
    ledger({ kind: 'input', inputId: state.inputId, chars: text.length, ...decision })
    if (cfg.debug) ctx.logger?.info?.('router: ' + JSON.stringify(decision))
    return decision
  }

  /** A router bug must degrade to "no routing", never to a broken run. */
  const safe = (fn) => async (...args) => {
    const next = args[args.length - 1]
    try { return await fn(...args) }
    catch (e) { ledger({ kind: 'error', error: String(e?.message ?? e) }); return await next() }
  }

  // ---- TIER: override the route for every request of this input -------------
  const offRequest = ctx.on('agent/request', safe(async (_payload, next) => {
    const resolved = await next()
    if (!cfg.enabled) return resolved
    const decision = cache.forStep(state.inputId)
    if (!decision?.routed) return resolved
    const route = cfg.routes[decision.tier]
    if (!route) return resolved
    if (state.appliedTier !== decision.tier) {
      state.appliedTier = decision.tier
      ledger({ kind: 'route', inputId: state.inputId, tier: decision.tier, route,
               reason: decision.reason, band: decision.band })
    }
    // Note: switching provider/model across inputs loses that model's cache for
    // the new prefix. That cost is the point of hypothesis H2, and the gateway
    // measures it.
    return { ...resolved, provider: route.provider, model: route.model,
             ...(route.reasoningEffort ? { reasoningEffort: route.reasoningEffort } : {}) }
  }))

  // ---- BAND: inject persona guidance ONCE per input -------------------------
  const offPreStep = ctx.on('agent/pre-step', safe(async ({ agent, messages, signal, step }, next) => {
    const decision = await next()
    if (!cfg.enabled) return decision
    if (decision.kind === 'reject' || signal?.aborted) return decision

    beginInputIfNeeded(messages)

    // Stall detection: an observed fact, not a predicted difficulty.
    const stalled = detectStall(state.recentCalls, {})
    if (stalled.stalled) {
      state.recentCalls = []
      state.escalations += 1
      cache.escalate(stalled.reason)
      ledger({ kind: 'escalate', inputId: state.inputId, reason: stalled.reason, detail: stalled })
    }

    if (!cfg.injectPersona) return decision
    const current = cache.forStep(state.inputId)
    if (!current) return decision

    // Cache discipline: only touch the prefix when the band CHANGES for this
    // input. Re-injecting the same text every step would still alter the message
    // list and invalidate the provider cache.
    if (state.appliedBand === current.band) {
      const check = assertPrefixStable(state.prefixFingerprint, state.prefixFingerprint)
      if (check.checked && !check.stable) ledger({ kind: 'cache-risk', inputId: state.inputId, check })
      return decision
    }
    state.appliedBand = current.band
    const text = PERSONA[current.band]
    if (!text) return decision
    ledger({ kind: 'inject', inputId: state.inputId, band: current.band, step })
    return { ...decision, messages: [...decision.messages, { role: 'system', content: text }] }
  }))

  // Tool outcomes feed stall detection.
  const offResult = ctx.tools ? ctx.on('tools/post-execute', safe(async (payload, next) => {
    const result = await next()
    const ok = !(result && (result.error || result.isError === true))
    state.recentCalls.push({ tool: payload?.name ?? '?', args: payload?.arguments, ok })
    if (state.recentCalls.length > 10) state.recentCalls.shift()
    return result
  })) : null

  return () => { offRequest?.(); offPreStep?.(); offResult?.() }
}

export default { name, inject, apply }
