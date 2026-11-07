/**
 * router-core — the deterministic decision engine.
 *
 * Pure functions. No I/O, no network, no API key, no DSH imports. Everything here
 * is unit-testable offline, which is the point: the decision layer's hard part is
 * the policy, not the plumbing.
 *
 * Design rules encoded below (PLAN.md §4.2, each traceable to a measurement in
 * RESEARCH.md):
 *
 *   1. Deterministic before probabilistic. No model call anywhere in this file.
 *   2. One decision per user input, reused for every step of that input. Enforced
 *      by PolicyCache; per-step switching is what destroys the prompt cache
 *      (measured: 89% -> 78-83% cache hit once a router is introduced).
 *   3. Route on PHASE, not judged difficulty. "What is the agent about to do" is a
 *      free signal; "how hard is this" is answered "hard" almost always inside a
 *      coding loop and costs money every turn. Only 29 of 294 questions in one
 *      study were improvable by routing at all.
 *   4. Escalate on STALLS, an observed fact, not on a predicted difficulty.
 *   5. Never change the tool catalog. A decision may pick a persona band and a
 *      model tier; it may not add or remove tools.
 *   6. On ambiguity, follow an explicit cost mode rather than a coin flip.
 *   7. Gate on input size: routing a one-line question costs more than it saves.
 *
 * The band boundaries come from a measured property of the model: behaviour along
 * the persona axis is not a continuum. It collapses into stable regions separated
 * by phase transitions, and the transition band is unstable and best avoided.
 */

/** Persona bands. The transition region is deliberately not addressable. */
export const BAND = { SPEC: 'spec', WEAK: 'weak', REACT: 'react' }

/** Model tiers. The host maps these to concrete provider/model routes. */
export const TIER = { CHEAP: 'cheap', STANDARD: 'standard', STRONG: 'strong' }

export const DEFAULT_CONFIG = {
  minChars: 24,              // below this, do not route at all (rule 7)
  costMode: 'cost-first',    // 'cost-first' | 'quality-first' (rule 6)
  escalateAfterFailures: 3,  // consecutive failed tool calls (rule 4)
  escalateAfterRepeats: 2,   // identical failing call repeated (rule 4)
}

// --- classification ----------------------------------------------------------
// ASCII keywords carry letter-boundary lookarounds so "fix" does not match
// "prefix" and "build" does not match "rebuilding" by accident. CJK needs no
// boundaries. Deliberately small: a long keyword list is a tuning knob that
// invites overfitting to one's own eval set.

const REACT_RE = /(?<![a-z])(?:build|create|develop|generate|implement|make|add|write|scaffold|port|migrate to|new project|set up|setup)(?![a-z])|(?:开发|创建|写一个|生成|从零|做一个|构建|搭建|实现|新增)/gi

const SPEC_RE = /(?<![a-z])(?:fix|debug|refactor|review|repair|broken|breaks|breaking|regression|why|investigate|diagnose|revert|clean ?up|optimi[sz]e|tidy)(?![a-z])|(?:修复|调试|重构|排查|报错|出错|崩溃|优化|审查|为什么|异常|故障|回归)/gi

const COMPLEX_RE = /(?<![a-z])(?:refactor|architect|redesign|survey|overview|comprehensive|detailed|audit|migration|across the codebase)(?![a-z])|(?:重构|架构|全面|详细|设计|系统|迁移)/i

export function countHits(re, text) {
  if (typeof text !== 'string' || !text) return 0
  re.lastIndex = 0
  return [...text.matchAll(re)].length
}

/**
 * Classify an input into a stable band.
 *
 * Clear keyword evidence picks a stable band. Ambiguity returns WEAK - the band
 * where the model routes itself from the task - rather than guessing a side. That
 * is the single most important choice in this file: a wrong confident route is
 * worse than an honest "you decide".
 */
export function classifyTask(text) {
  const react = countHits(REACT_RE, text)
  const spec = countHits(SPEC_RE, text)
  const evidence = { react, spec, chars: typeof text === 'string' ? text.length : 0 }
  if (react > spec) return { band: BAND.REACT, evidence }
  if (spec > react) return { band: BAND.SPEC, evidence }
  return { band: BAND.WEAK, evidence }
}

export function isComplexTask(text) {
  if (typeof text !== 'string') return false
  return text.length > 120 || COMPLEX_RE.test(text)
}

/** Rule 7: short inputs are not worth a decision. */
export function shouldRoute(text, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const chars = typeof text === 'string' ? text.trim().length : 0
  if (chars < cfg.minChars) return { route: false, reason: 'below-min-chars', chars }
  return { route: true, reason: 'ok', chars }
}

/**
 * Rule 3: tier from the PHASE the agent is entering, not from judged difficulty.
 * 'explore' work is cheap to delegate; 'implement' work is where the strong model
 * pays for itself. Ambiguity follows the declared cost mode (rule 6).
 */
export function tierFor(band, { complex = false, costMode = 'cost-first' } = {}) {
  // Complexity dominates: a genuinely large task gets the strong model under
  // either cost mode.
  if (complex) return TIER.STRONG

  // The cost mode sets the BASELINE; the band shifts relative to it. The previous
  // version of this function mapped every band to STANDARD under the default
  // cost-first mode, which made the router a no-op for model selection: it
  // injected persona text and never changed the model. A router that never routes
  // would have produced a false negative in the experiment, attributed to the
  // hypothesis rather than to a config bug. test 'tierFor is not degenerate'
  // now guards this.
  const cheapFirst = costMode !== 'quality-first'
  switch (band) {
    // Greenfield generation. Cheap-first bets on the stall detector: the failure
    // mode is visible (it does not run), so escalation is cheap and reliable.
    case BAND.REACT: return cheapFirst ? TIER.CHEAP : TIER.STANDARD
    // Diagnosing an existing system is where a weak model flails, so it gets one
    // step up from the baseline even when being economical.
    case BAND.SPEC: return cheapFirst ? TIER.STANDARD : TIER.STRONG
    // Ambiguity is not the place to gamble on the cheap model.
    case BAND.WEAK: return cheapFirst ? TIER.STANDARD : TIER.STRONG
    default: return TIER.STANDARD
  }
}

/** Persona text per band. Kept short: this text sits in the cached prefix. */
export const PERSONA = {
  [BAND.SPEC]: 'Work read-first: inspect the relevant code and confirm the cause before changing anything. Prefer the smallest correct change.',
  [BAND.REACT]: 'Work directly: write or edit the code, then verify it by reading and running. Keep the loop tight - produce, verify, fix.',
  [BAND.WEAK]: 'Before acting, decide what this task actually is (build or fix) and adopt the matching style. Then act.',
}

/**
 * Produce the decision for one user input.
 * Pure: same input + same config => same decision. That property is what makes
 * the ledger auditable and the experiment reproducible.
 */
export function decide({ text, inputId, config = {}, complex = null } = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const gate = shouldRoute(text, cfg)
  const cls = classifyTask(text)
  const isComplex = complex === null ? isComplexTask(text) : complex
  // Not routed means no tier is applied; the plugin gates on `routed` before
  // touching the route. Reporting null keeps the ledger honest.
  const tier = gate.route ? tierFor(cls.band, { complex: isComplex, costMode: cfg.costMode }) : null
  return {
    inputId: inputId ?? null,
    routed: gate.route,
    band: cls.band,
    tier,
    complex: isComplex,
    costMode: cfg.costMode,
    reason: gate.route ? 'classified' : gate.reason,
    evidence: cls.evidence,
    decidedAt: null,     // set by the caller, keeps this function pure
    cached: false,
  }
}

/** Rule 4: escalation is triggered by observed failure, not predicted difficulty. */
export function detectStall(recent = [], config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  let consecutiveFailures = 0
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i] && recent[i].ok === false) consecutiveFailures++
    else break
  }
  const key = (c) => (c ? c.tool + '|' + JSON.stringify(c.args ?? {}) : '')
  let repeats = 0
  if (recent.length >= 2) {
    const last = recent[recent.length - 1]
    if (last && last.ok === false) {
      for (let i = recent.length - 1; i >= 0 && key(recent[i]) === key(last); i--) repeats++
    }
  }
  if (repeats >= cfg.escalateAfterRepeats) {
    return { stalled: true, reason: 'identical-failing-call-repeated', repeats }
  }
  if (consecutiveFailures >= cfg.escalateAfterFailures) {
    return { stalled: true, reason: 'consecutive-failures', consecutiveFailures }
  }
  return { stalled: false, reason: 'ok', consecutiveFailures, repeats }
}

/**
 * Rule 2, enforced structurally: the decision is made once per input and handed
 * back unchanged for every step of that input.
 */
export class PolicyCache {
  constructor(config = {}) { this.config = config; this.current = null }

  begin(inputId, text, opts = {}) {
    const d = decide({ text, inputId, config: this.config, ...opts })
    d.decidedAt = Date.now()
    this.current = d
    return d
  }

  /** Decision for a subsequent step of the SAME input. Never re-decides. */
  forStep(inputId) {
    if (!this.current || this.current.inputId !== inputId) return null
    return { ...this.current, cached: true }
  }

  escalate(reason) {
    if (!this.current) return null
    this.current = { ...this.current, tier: TIER.STRONG, reason: 'escalated:' + reason, escalated: true }
    return this.current
  }
}

/**
 * Cache-safety guard for hypothesis H2: if the assembled prefix changes between
 * two steps of one input, the provider cache is invalidated and the whole prompt
 * is repriced at the miss rate. Exposed so a caller can assert it, not hope.
 */
export function assertPrefixStable(prevFingerprint, nextFingerprint) {
  if (prevFingerprint == null || nextFingerprint == null) return { checked: false }
  const stable = prevFingerprint === nextFingerprint
  return { checked: true, stable, prev: prevFingerprint, next: nextFingerprint }
}
