/**
 * Logging for the CLI.
 *
 * The library itself never writes anywhere: a merge that logs is a merge that
 * cannot be used in a request path. `bin/cfgmerge.js` turns this on.
 */

const state = { enabled: false }

export function enable() {
  state.enabled = true
}

export function enabled() {
  return state.enabled
}

export function note(message) {
  if (state.enabled) process.stdout.write(String(message) + '\n')
}
