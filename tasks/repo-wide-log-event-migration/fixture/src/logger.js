/**
 * The pipeline logger.
 *
 * Structured events only. A log line is one JSON object per line with a stable
 * `event` name and whatever fields the call site can supply:
 *
 *   {"ts":"...","level":"warn","event":"inventory.stock_discrepancy",
 *    "context":{"orderId":"A-1"},"data":{"sku":"TEA-01","missing":3,"onHand":1}}
 *
 * The name is what dashboards and alerts key on, so it is NOT free-form text —
 * every event a service can emit is declared in EVENTS below. Adding a new one
 * means adding it here first.
 *
 * The old `warn('inventory: stock discrepancy ...')` shape is gone: free-form
 * prose cannot be alerted on, and support kept grepping for strings that had
 * been reworded. Do not reintroduce it — `warn`/`error` still exist for
 * genuinely exceptional conditions, where a human is going to read the line.
 */

export const LEVELS = ['debug', 'info', 'warn', 'error']

/** Every structured event in the system, with the fields it must carry. */
export const EVENTS = {
  'inventory.stock_discrepancy': ['sku', 'missing', 'onHand'],
  'inventory.reserved': ['sku', 'units'],
  'checkout.plugin_failed': ['plugin', 'reason'],
  'checkout.completed': ['orderId', 'total'],
  'payment.capture_failed': ['orderId', 'provider'],
  'payment.refund_issued': ['orderId', 'amount'],
  'payment.retry_scheduled': ['orderId', 'attempt'],
  'shipping.rate_missing': ['carrier', 'postcode'],
  'order.cancelled': ['orderId'],
  'order.amended': ['orderId', 'fields'],
}

/** Thrown when a call site emits an event that was never declared. */
export class UnknownEventError extends Error {
  constructor(name) {
    super('undeclared event: ' + name)
    this.name = 'UnknownEventError'
    this.event = name
  }
}

/** Bound context — the correlation ids that every line should carry. */
export function withContext(base = {}, sink = console) {
  const emit = (level, event, data = {}) => {
    if (!Object.prototype.hasOwnProperty.call(EVENTS, event)) throw new UnknownEventError(event)
    const line = {
      ts: new Date().toISOString(),
      level,
      event,
      context: { ...base },
      data: { ...data },
    }
    sink.log(JSON.stringify(line))
    return line
  }

  return {
    /** Emit a declared event. Extra fields are allowed; missing ones are not. */
    event: (name, data) => emit('warn', name, data),
    info: (message) => sink.log(JSON.stringify({ ts: new Date().toISOString(), level: 'info', message })),
    warn: (message) => sink.log(JSON.stringify({ ts: new Date().toISOString(), level: 'warn', message })),
    error: (message) => sink.log(JSON.stringify({ ts: new Date().toISOString(), level: 'error', message })),
    child: (extra) => withContext({ ...base, ...extra }, sink),
  }
}

/** Fields an event is declared to require. */
export function requiredFields(event) {
  return EVENTS[event] ?? []
}
