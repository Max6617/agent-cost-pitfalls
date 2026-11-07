/**
 * The intake HTTP handler, minus the framework.
 *
 * We keep `handle()` framework-free so it can be unit tested: the router gives
 * it a parsed body and it returns a status plus a JSON body.
 */
import { validate } from './validate.js'
import { summarise } from './util.js'

/** Fields the client is allowed to set. Anything else is dropped. */
const ECHOED = ['reference', 'customerEmail', 'quantity', 'unitPrice', 'total', 'expedited', 'code', 'note', 'tags']

/**
 * @param {{ schema?: string, body: unknown }} request
 * @returns {{ status: number, body: object }}
 */
export function handle(request) {
  const schema = request.schema ?? 'order'
  const result = validate(request.body, schema)

  if (!result.valid) {
    return {
      status: 400,
      body: {
        error: 'invalid_request',
        errors: result.errors,
        summary: summarise(result.errors),
      },
    }
  }

  const order = {}
  for (const key of ECHOED) {
    if (result.value[key] !== undefined) order[key] = result.value[key]
  }
  if (result.value.shipping) order.shipping = result.value.shipping
  order.status = 'accepted'

  return { status: 202, body: { order } }
}
