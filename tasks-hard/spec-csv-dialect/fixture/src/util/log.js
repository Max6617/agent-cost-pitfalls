/**
 * Diagnostics for the import run. Off unless the operator asks for it, because
 * the loader pipes stderr into the supplier report.
 */
const enabled = () => process.env.DSV_DEBUG === '1' || process.env.DSV_DEBUG === 'true'

export function warn(scope, message) {
  if (enabled()) process.stderr.write('[dsv:' + scope + '] ' + message + '\n')
}

export function note(scope, message) {
  if (enabled()) process.stdout.write('[dsv:' + scope + '] ' + message + '\n')
}
