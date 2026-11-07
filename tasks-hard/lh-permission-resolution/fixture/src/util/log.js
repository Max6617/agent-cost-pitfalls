/**
 * A logger, not a library.
 *
 * The gateway captures stdout, so a refused decision is worth one line and a
 * granted one is not worth any: at peak the service answers a few thousand
 * questions a second and the log is read by humans.
 */
const LEVELS = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 }

export function createLogger(level) {
  const threshold = LEVELS[level ?? process.env.AUTHZ_LOG ?? 'error'] ?? LEVELS.error
  const emit = (name) => (...args) => {
    if (LEVELS[name] <= threshold) console.error('[authz] ' + name + ':', ...args)
  }
  return { error: emit('error'), warn: emit('warn'), info: emit('info'), debug: emit('debug') }
}

export const log = createLogger()
