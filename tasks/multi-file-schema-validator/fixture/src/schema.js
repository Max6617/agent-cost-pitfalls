/**
 * Schema description.
 *
 * A field is described by its type and a few flags. The types deliberately
 * mirror what an HTML form can send us — everything off the wire is a string or
 * a list of strings, so the coercion layer in `coerce.js` is what turns a
 * submission into something the order pipeline can use.
 *
 * Flags:
 *   required  the key must be present AND non-empty
 *   enum      allowed values, compared case-insensitively
 *   min/max   numeric range, inclusive
 *   maxLength longest accepted string, inclusive
 *
 * `type` is the type we want AFTER coercion. What arrived is irrelevant.
 */

export const ORDER_FORM = {
  reference: { type: 'string', required: true },
  customerEmail: { type: 'string', required: true },
  quantity: { type: 'integer', required: true, min: 1, max: 99 },
  unitPrice: { type: 'number', required: true, min: 0.01 },
  total: { type: 'number' },
  expedited: { type: 'boolean' },
  code: { type: 'string', enum: ['standard', 'exp', 'collect'] },
  note: { type: 'string', maxLength: 280 },
  tags: { type: 'array' },
  shipping: {
    type: 'object',
    required: true,
    fields: {
      line1: { type: 'string', required: true },
      postcode: { type: 'string', required: true },
      country: { type: 'string', enum: ['us', 'gb', 'de'], required: true },
    },
  },
}

export const SCHEMAS = { order: ORDER_FORM }

/** Look a schema up by name; unknown names are a programming error, not a 400. */
export function schemaFor(name) {
  const schema = SCHEMAS[name]
  if (!schema) throw new Error('no schema named ' + name)
  return schema
}

/** Human-readable label for diagnostics. */
export function describeField(name, field) {
  return name + ' (' + field.type + (field.required ? ', required' : '') + ')'
}
