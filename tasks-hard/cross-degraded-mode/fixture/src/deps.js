/**
 * The dependency registry.
 *
 * One declaration per external thing the service talks to: which class it is,
 * where its transport lives, what it falls back to, and how its breaker is
 * tuned. `Dependency` is where a call actually happens — the call sites in
 * read.js and write.js only decide *whether* it happens.
 */
import { loadConfig } from './config.js'

export class Dependency {
  constructor(name, spec = {}, { transport = null, clock } = {}) {
    this.name = name
    this.class = spec.class ?? 'read'
    this.failureThreshold = spec.failureThreshold ?? 3
    this.failureWindow = spec.failureWindow ?? 5
    this.openMs = spec.openMs ?? 30000
    this.degradedCode = spec.degradedCode ?? `${name}-degraded`
    this.fallback = spec.fallback ?? []
    this.transport = transport
    this.clock = clock
  }

  /** True when the transport is not available at all: no wire, no call. */
  get unwired() { return typeof this.transport !== 'function' }

  /** The call itself. One attempt, no retry. */
  hit(payload) {
    return this.transport(payload)
  }
}

/** Build the registry from the configuration and the injected transports. */
export function buildRegistry(config, transports = {}, clock) {
  const deps = new Map()
  for (const [name, spec] of Object.entries(config.dependencies ?? {})) {
    deps.set(name, new Dependency(name, spec, { transport: transports[name] ?? null, clock }))
  }
  return deps
}

/** The registry for this checkout's configuration. */
export function registryFor(transports = {}, clock, overrides = {}) {
  const config = overrides.config ?? loadConfig()
  return buildRegistry(config, transports, clock)
}
