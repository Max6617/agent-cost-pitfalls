/**
 * The documented configuration surface.
 *
 * `defaults.js` holds the values; this holds the shape. Unknown keys in the
 * config file are ignored (operators paste all sorts of things in), but wrong
 * types are a hard error — a string port has bitten us twice.
 */
export const SPEC = {
  port: { type: 'number', default: 8080 },
  origin: { type: 'string', default: 'http://localhost:8080' },
  topic: { type: 'string', default: 'ingest.default' },
  origins: { type: 'array', default: ['file:///var/lib/ingest/drop'] },
  limits: { type: 'object', default: { maxBatchBytes: 8 * 1024 * 1024, maxInflight: 4 } },
  labels: { type: 'object', default: { env: 'local' } },
  secrets: { type: 'object', default: { apiKey: '', signingSecret: '' } },
}

/**
 * Key names that are secret wherever they appear in the tree.
 *
 * `secrets` covers the documented block; the individual names cover the cases
 * where someone stuck credential material somewhere sensible-looking.
 */
export const SECRET_KEYS = new Set(['secrets', 'apiKey', 'signingSecret', 'password', 'token', 'privateKey'])

export const REDACTED = '***'

/**
 * Return a copy of `config` with every secret replaced.
 *
 * Walks the whole tree and replaces a secret key's value outright — a nested
 * per-origin override leaked a key straight into the logs once, and a partial
 * walk is how it happened.
 */
export function redact(config) {
  if (Array.isArray(config)) return config.map(redact)
  if (config === null || typeof config !== 'object') return config

  const out = {}
  for (const [key, value] of Object.entries(config)) {
    if (SECRET_KEYS.has(key)) out[key] = REDACTED
    else if (value !== null && typeof value === 'object') out[key] = redact(value)
    else out[key] = value
  }
  return out
}

/** True when the key holds secret material at any depth. */
export function isSecretKey(key) {
  return SECRET_KEYS.has(key)
}
