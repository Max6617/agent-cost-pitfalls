/**
 * logging - the structured log every part of the service writes through.
 * One call is one line: `LEVEL message {json}`, collected in order.
 */
export function createLogger() {
  const lines = []
  const write = (level, message, payload) => {
    lines.push(payload === undefined
      ? level + ' ' + message
      : level + ' ' + message + ' ' + JSON.stringify(payload))
  }
  return {
    lines,
    info: (message, payload) => write('INFO', message, payload),
    warn: (message, payload) => write('WARN', message, payload),
    error: (message, payload) => write('ERROR', message, payload),
  }
}
