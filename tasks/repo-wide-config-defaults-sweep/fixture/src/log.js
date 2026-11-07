/**
 * Logging.
 *
 * The level thresholds are the usual ones: a record is printed when its level
 * is at least the configured level. `includeStack` decides whether a caught
 * error's stack is attached — off in production because stacks are large and
 * the error tracker has them already.
 */
const ORDER = { debug: 10, info: 20, warn: 30, error: 40 }

export function makeLogger({ settings, sink = () => {} }) {
  const level = 'info'

  const write = (recordLevel, message, error) => {
    if (ORDER[recordLevel] < ORDER[level]) return null
    const record = { level: recordLevel, message }
    if (error && settings.get('log.includeStack')) record.stack = String(error?.stack ?? error)
    sink(record)
    return record
  }

  return {
    debug: (message) => write('debug', message),
    info: (message) => write('info', message),
    warn: (message) => write('warn', message),
    error: (message, error) => write('error', message, error),
    level: () => level,
  }
}
