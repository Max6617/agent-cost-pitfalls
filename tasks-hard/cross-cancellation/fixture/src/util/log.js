/**
 * Diagnostics. Not the audit trail - docs/pipeline-policy.md is explicit that
 * the audit record is data, not a log line, and that the audit log is the only
 * place a cancelled run is accounted for.
 */
const SINK = []

export function warn(message, detail) {
  SINK.push({ level: 'warn', message, detail })
}

export function notes() {
  return SINK.slice()
}

export function clearNotes() {
  SINK.length = 0
}
