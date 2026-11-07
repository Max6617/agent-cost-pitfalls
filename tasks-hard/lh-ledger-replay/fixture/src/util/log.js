/**
 * Close-job logging. Text lines, one per event, so the operator can grep a run
 * out of the container logs. Not used by the ledger itself.
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }

export function createLogger({ level = 'info', sink = console } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info
  const emit = (name) => (message, fields) => {
    if (LEVELS[name] < threshold) return
    const tail = fields && Object.keys(fields).length
      ? ' ' + Object.entries(fields).map(([k, v]) => k + '=' + String(v)).join(' ')
      : ''
    sink.log('[' + name + '] ' + message + tail)
  }
  return {
    debug: emit('debug'),
    info: emit('info'),
    warn: emit('warn'),
    error: emit('error'),
  }
}

export const silentLogger = createLogger({ sink: { log() {} } })
