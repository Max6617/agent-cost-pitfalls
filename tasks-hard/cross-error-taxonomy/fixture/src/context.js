/**
 * Correlation ids.
 *
 * The id always comes from outside - from the edge, which took it off the
 * incoming request or minted one there. Nothing in here reads a clock or a
 * random source, so an operation that arrived without an id has `null` and says
 * so, rather than inventing one that correlates with nothing.
 */
export function newContext(correlationId = null) {
  const id = typeof correlationId === 'string' && correlationId !== '' ? correlationId : null
  return Object.freeze({ correlationId: id })
}

/** The correlation id of a context, or `null` when there is no context. */
export function correlationOf(ctx) {
  return ctx && typeof ctx.correlationId === 'string' && ctx.correlationId !== '' ? ctx.correlationId : null
}
