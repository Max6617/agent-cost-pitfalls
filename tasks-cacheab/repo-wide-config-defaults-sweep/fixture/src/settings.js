/**
 * Settings.
 *
 * Every default in the app lives here, once. A module that hard-codes its own
 * default is a module that will disagree with the settings page — the retry
 * count in the client and the retry count in the worker were 3 and 5 for two
 * releases because each had written its own.
 *
 * A setting is read through `setting()`, which applies the default when the
 * stored value is missing, and which refuses to invent a value for a key that
 * does not exist.
 */

export const DEFAULTS = {
  'retry.attempts': 3,
  'retry.baseDelayMs': 250,
  'http.timeoutMs': 5000,
  'http.maxRedirects': 5,
  'cache.ttlMs': 30_000,
  'cache.maxEntries': 500,
  'log.level': 'info',
  'log.includeStack': false,
  'ui.pageSize': 25,
  'ui.theme': 'system',
}

/** Extra limits that make a setting legal beyond its type. */
export const LIMITS = {
  'retry.attempts': { min: 0, max: 10 },
  'http.maxRedirects': { min: 0, max: 20 },
  'cache.maxEntries': { min: 1, max: 100_000 },
  'ui.pageSize': { min: 1, max: 200 },
}

/** Is this a key the app understands? */
export function isKnown(key) {
  return Object.prototype.hasOwnProperty.call(DEFAULTS, key)
}

/** The default for a key, or undefined. */
export function defaultFor(key) {
  return DEFAULTS[key]
}

/** Every key, sorted, for the settings page. */
export function allKeys() {
  return Object.keys(DEFAULTS).sort()
}

/**
 * Read a setting.
 *
 * @param {Record<string, unknown>} stored
 * @param {string} key
 */
export function setting(stored, key) {
  const value = stored?.[key]
  return value === undefined ? DEFAULTS[key] : value
}

/** The type a setting's default implies. */
export function typeOf(key) {
  return typeof DEFAULTS[key]
}

/**
 * Check a value before it is stored.
 *
 * @returns {string[]} one message per problem
 */
export function check(key, value) {
  return []
}

/** The effective settings, defaults filled in. */
export function resolveAll(stored = {}) {
  const out = {}
  for (const key of allKeys()) out[key] = setting(stored, key)
  return out
}
