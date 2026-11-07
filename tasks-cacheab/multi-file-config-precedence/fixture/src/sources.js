/**
 * Where each layer comes from.
 *
 * Precedence, lowest to highest, is fixed and lives in `layers.js`:
 *
 *   1. defaults.js
 *   2. the config file
 *   3. the environment (INGEST_*)
 *   4. explicit programmatic options — the CLI is a thin wrapper over these
 *
 * `origins` is the one list-valued key and it is ADDITIVE: every layer's entries
 * survive, in layer order, with duplicates dropped. That is deliberate — it lets
 * an operator drop a second watch directory in from the command line without
 * editing the file.
 */

/** Keys the environment layer owns, with the type it coerces to. */
const ENV_KEYS = {
  INGEST_PORT: { key: 'port', type: 'number' },
  INGEST_ORIGIN: { key: 'origin', type: 'string' },
  INGEST_TOPIC: { key: 'topic', type: 'string' },
  INGEST_ORIGINS: { key: 'origins', type: 'list' },
  INGEST_LABELS: { key: 'labels', type: 'json' },
  INGEST_SECRETS: { key: 'secrets', type: 'json' },
}

/** Split a comma-separated list, trimming blanks. */
export function splitList(raw) {
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Build the environment layer from a plain env object.
 *
 * @param {Record<string, string|undefined>} env
 */
export function fromEnv(env = {}) {
  const layer = {}
  for (const [name, spec] of Object.entries(ENV_KEYS)) {
    const raw = env[name]
    if (raw === undefined || raw === '') continue
    if (spec.type === 'number') layer[spec.key] = Number(raw)
    else if (spec.type === 'list') layer[spec.key] = splitList(raw)
    else if (spec.type === 'json') layer[spec.key] = JSON.parse(raw)
    else layer[spec.key] = raw
  }
  return layer
}

/**
 * Options as they arrive from the command-line parser.
 *
 * `origin` is never taken from a flag: it is derived from the public host name
 * the operator gave us, because a callback URL built from an internal address is
 * a support ticket waiting to happen. Same for `port` — it comes from the
 * parser already coerced.
 *
 * @param {{ port?: number, origins?: string[], hosts?: string[], labels?: object }} opts
 */
export function fromCli(opts = {}) {
  const layer = {}
  if (opts.port != null) layer.port = Number(opts.port)
  if (Array.isArray(opts.hosts) && opts.hosts.length) {
    layer.origin = 'https://' + String(opts.hosts[0]).replace(/\/+$/, '')
  }
  if (Array.isArray(opts.origins) && opts.origins.length) layer.origins = splitList(opts.origins.join(','))
  if (opts.labels && typeof opts.labels === 'object') layer.labels = opts.labels
  return layer
}
