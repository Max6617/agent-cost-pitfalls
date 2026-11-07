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
import { PolicyCache, PERSONA, assertPrefixStable, BAND } from './router-core.mjs'

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
  }

  const ledger = (record) => {
    if (!cfg.ledgerPath) return
    try {
      mkdirSync(dirname(cfg.ledgerPath), { recursive: true })
      appendFileSync(cfg.ledgerPath, JSON.stringify({ ts: new Date().toISOString(), ...record }) + '\n')
    } catch { /* a ledger failure must never break a run */ }
  }

  const textOf = (m) => (typeof m?.content === 'string'
    ? m.content
    : (Array.isArray(m?.content) ? m.content.map((c) => c?.text ?? '').join('') : ''))

  /**
   * Start a new input when a new turn begins.
   *
   * The agent loop restarts `step` at 1 for every turn, so step === 1 marks a new
   * user input. The first version of this function only ever ran ONCE per session
   * (it returned early whenever an input was already set), which meant the router
   * decided the band and tier for the first message and then reused them for the
   * entire session - a router that routes once and then never again. That is
   * another silent false negative: it would have looked like "routing has no
   * effect" rather than "routing stopped after turn one".
   *
   * A step-1 continuation with no user text keeps the current decision.
   */
  function beginInput(messages, step) {
    const user = (messages ?? []).find((m) => m?.role === 'user')
    const text = textOf(user)
    if (step !== 1 || !text) return
    state.inputSeq += 1
    state.inputId = 'in-' + state.inputSeq
    state.appliedBand = null
    state.appliedTier = null
    state.prefixFingerprint = null
    const decision = cache.begin(state.inputId, text)
    ledger({ kind: 'input', inputId: state.inputId, chars: text.length, ...decision })
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

    beginInput(messages, step)

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

  // Stall detection is implemented and unit-tested in router-core.mjs, but it is
  // NOT wired here. The obvious hook, 'tools/post-execute', is a WATERFALL whose
  // handler receives an execution record and must return a PostToolDecision
  // ('accept'/'block') - not the (payload, next) shape assumed when this was
  // first written. A waterfall handler that returns the wrong thing can corrupt
  // tool results, which is a far worse failure than losing escalation.
  //
  // So v1 ships band + tier only. Wiring escalation is a separate change, once
  // the handler contract is confirmed against a real tool dispatch.
  //
  // Note also: reading ctx.tools here (even as `ctx.tools ? ...`) threw
  //   cannot get property "tools" without inject
  // and refused the whole preset at mount. Any service access must be declared
  // in `inject` or read through ctx.get(). accessCount is asserted in the tests.

  return () => { offRequest?.(); offPreStep?.() }
}

export default { name, inject, apply }
