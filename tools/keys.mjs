import { readFileSync, existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Merge both key files; later write wins; a PASTE_ placeholder counts as absent.
 *
 * THE PLACEHOLDER RULE IS LOAD-BEARING. FILL-IN-KEYS.json is a TEMPLATE that ships with
 * PASTE_..._HERE in every slot. It is newer than .keys.json, so "later write wins" alone would
 * hand a placeholder to a gateway. And a merge that ignores mtime and simply spreads one file
 * over the other - which is what tools/collect.mjs used to do - puts the template ON TOP of the
 * real keys: every provider resolves to nothing and the pipeline refuses to start.
 */
export function loadKeys (dir = process.cwd()) {
  const files = ['.keys.json', 'FILL-IN-KEYS.json'].map((f) => join(dir, f)).filter(existsSync)
    .sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs)
  const out = {}
  for (const f of files) {
    let j
    try { j = JSON.parse(readFileSync(f, 'utf8')) } catch { continue }
    for (const [k, v] of Object.entries(j)) {
      if (typeof v === 'string' && v.length > 15 && !/^PASTE_/.test(v)) out[k] = v
    }
  }
  return out
}

/**
 * The upstream key for a provider.
 *
 * THREE STORES, because the study really has three and only one of them holds everything:
 *   - the child's environment (DEEPSEEK_API_KEY and friends) - how a CI or a one-off overrides
 *   - .keys.json / FILL-IN-KEYS.json   via loadKeys()  -> zai, anthropic, qwen, openai
 *   - ~/.dsh/.credentials.yaml (refs:)                 -> DEEPSEEK_API_KEY, which is the one
 *     scripts/start-gateway.ps1 reads and the only one absent from .keys.json
 *
 * This lives here, not in collect.mjs, because collect.mjs having its own copy of the merge is
 * exactly how the two stores came to disagree - and the copy was the broken one.
 *
 * Returns null when nothing usable is found. Callers must treat null as fatal: a gateway with no
 * upstream key 503s every run, which then reads as a harness failure.
 *
 * `repo` is where the key FILES live; `dshHome` is the .dsh DIRECTORY holding .credentials.yaml
 * (the same thing DSH_HOME names). Both are injectable so this is testable without touching the
 * real stores.
 */
/**
 * Provider entries that share an account, and therefore a key.
 *
 * 'anthropic-sonnet' exists only so Sonnet's matrix gets its own dataset directory; the KEY is the
 * Anthropic account's. Without this alias resolveUpstreamKey looks for a key named
 * "anthropic-sonnet" - and for an env var ANTHROPIC-SONNET_API_KEY, which is not even a legal name
 * - finds nothing, and returns null. A null key is FATAL by design: a gateway with no upstream key
 * 503s every run, and that reads as a harness failure rather than as a missing key.
 */
const KEY_ALIASES = { 'anthropic-sonnet': 'anthropic' }

export function resolveUpstreamKey (p, { repo = process.cwd(), dshHome = null } = {}) {
  const keyName = KEY_ALIASES[p] ?? p
  const envName = keyName.toUpperCase() + '_API_KEY'
  if (process.env[envName]) return process.env[envName]
  try {
    const v = loadKeys(repo)[keyName]
    if (typeof v === 'string' && v.length > 15 && !/^PASTE_/.test(v)) return v
  } catch {}
  try {
    // dshHome IS the .dsh directory, matching what DSH_HOME means everywhere else.
    const base = dshHome ?? process.env.DSH_HOME ?? join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.dsh')
    const cred = join(base, '.credentials.yaml')
    if (existsSync(cred)) {
      const m = new RegExp('^\\s*' + envName + ':\\s*["\']?([^"\'\\s]+)', 'm').exec(readFileSync(cred, 'utf8'))
      if (m && m[1].length > 15) return m[1]
    }
  } catch {}
  return null
}

/** Never returns a value, only a shape. */
export function describe (keys) {
  return ['zai', 'anthropic', 'qwen', 'openai']
    .map((p) => '  ' + p.padEnd(12) + (keys[p] ? 'SET (' + keys[p].length + ' chars)' : 'NOT SET'))
    .join('\n')
}

// NO top-level output. This module is imported by scripts that capture stdout to
// obtain a key, and a stray console.log silently corrupts it: the launcher assigned
// "summary text + key" to DEEPSEEK_API_KEY, and the gateway then returned 401
// "invalid x-api-key" while a direct call with the same key authenticated fine.
// Print only when run as a program, never when imported.
if (process.argv[1] && process.argv[1].endsWith('keys.mjs')) {
  console.log(describe(loadKeys()))
}
