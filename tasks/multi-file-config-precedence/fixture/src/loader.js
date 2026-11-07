import { DEFAULTS } from './defaults.js'
import { SPEC, redact } from './schema.js'
import { merge, mergeAll, concatUnique } from './merge.js'
import { fromEnv, fromCli } from './sources.js'
import { LAYER_NAMES, ADDITIVE_KEYS } from './layers.js'

/**
 * Read the config file if it is there. A missing file is not an error; a
 * malformed one is.
 *
 * @param {string|null|undefined} path
 */
export function readConfigFile(fs, path) {
  if (!path) return null
  if (!fs.existsSync(path)) return null
  const text = fs.readFileSync(path, 'utf8')
  return JSON.parse(text)
}

/**
 * Fold the additive keys of every layer into one list.
 *
 * @param {{ key: string, value: unknown }[]} contributions lowest layer first
 */
export function accumulate(contributions) {
  return contributions.reduce((acc, { key, value }) => {
    if (!ADDITIVE_KEYS.has(key)) return acc
    if (!Array.isArray(value)) return acc
    return { ...acc, [key]: concatUnique(acc[key] ?? [], value) }
  }, {})
}

/**
 * Type-check the merged result against SPEC.
 *
 * @param {object} config
 * @returns {string[]} one message per offending key
 */
export function validate(config) {
  const errors = []
  for (const [key, rule] of Object.entries(SPEC)) {
    const value = config[key]
    if (value === undefined) {
      errors.push(key + ' is missing')
      continue
    }
    const actual = Array.isArray(value) ? 'array' : typeof value
    if (actual !== rule.type) errors.push(key + ' should be ' + rule.type + ', got ' + actual)
  }
  return errors
}

/** Assemble the raw layers, lowest precedence first, skipping empty ones. */
function stack(input) {
  const raw = {
    defaults: DEFAULTS,
    file: readConfigFile(input.fs, input.path),
    env: fromEnv(input.env),
    cli: fromCli(input.opts),
  }
  return LAYER_NAMES.map((name) => [name, raw[name]]).filter(([, layer]) => layer != null)
}

/**
 * Resolve the effective configuration.
 *
 * @param {{ fs: { existsSync(p: string): boolean, readFileSync(p: string, enc: string): string },
 *           path?: string|null, env?: Record<string,string|undefined>, opts?: object }} input
 */
export function resolve(input) {
  const layers = stack(input)
  const ordered = layers.slice().reverse()
  const config = mergeAll(ordered.map(([, layer]) => layer))
  const errors = validate(config)
  if (errors.length) {
    const err = new Error('invalid configuration: ' + errors.join('; '))
    err.errors = errors
    throw err
  }
  return config
}

/**
 * Same as resolve(), but also says which layer supplied each top-level key.
 * Used by `ingest config --explain` and by the support runbook.
 *
 * Precedence for this report is identical to resolve(): the highest layer that
 * actually set the key owns it.
 *
 * @returns {{ config: object, origins: Record<string, 'defaults'|'file'|'env'|'cli'> }}
 */
export function resolveWithOrigins(input) {
  const layers = stack(input)
  const ordered = layers.slice().reverse()

  const config = mergeAll(ordered.map(([, layer]) => layer))
  const errors = validate(config)
  if (errors.length) {
    const err = new Error('invalid configuration: ' + errors.join('; '))
    err.errors = errors
    throw err
  }

  const origins = {}
  for (const [name, layer] of layers) {
    for (const key of Object.keys(layer)) if (layer[key] !== undefined) origins[key] = name
  }

  return { config, origins }
}

/** The config as it is safe to log. */
export function publicConfig(config) {
  return redact(merge({}, config))
}
