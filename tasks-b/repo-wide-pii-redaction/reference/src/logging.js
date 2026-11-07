/**
 * logging - the structured log every part of the service writes through.
 * One call is one line: `LEVEL message {json}`, collected in order.
 * The payload crosses a boundary, so it is redacted before it is written.
 */
import { redact } from './redact.js'

export function createLogger() {
  const lines = []
  const write = (level, message, payload) => {
    lines.push(payload === undefined
      ? level + ' ' + message
      : level + ' ' + message + ' ' + JSON.stringify(redact(payload)))
  }
  return {
    lines,
    info: (message, payload) => write('INFO', message, payload),
    warn: (message, payload) => write('WARN', message, payload),
    error: (message, payload) => write('ERROR', message, payload),
  }
}
