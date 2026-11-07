import {
  additionalProperties,
  maxProperties,
  minProperties,
  patternProperties,
  properties,
  propertyNames,
} from './keywords/object.js'
import { exclusiveMaximum, exclusiveMinimum, maximum, minimum, multipleOf } from './keywords/number.js'
import { format, maxLength, minLength, pattern } from './keywords/string.js'
import { items, maxItems, minItems, uniqueItems } from './keywords/array.js'
import { constKeyword, enumKeyword } from './keywords/value.js'
import { required } from './keywords/required.js'
import { allOf, anyOf, not, oneOf } from './combinators.js'

/**
 * Every keyword of the subset, and the module that implements it.
 *
 * `type` is not in the table: it is the first thing the walker looks at, because
 * a value of the wrong type is not checked against the rest of the schema.
 *
 * `additionalItems` is not in the table either. It only means anything next to
 * `items`, and `items` owns both of them.
 */
export const KEYWORD_HANDLERS = Object.freeze({
  required,
  properties,
  patternProperties,
  additionalProperties,
  propertyNames,
  minProperties,
  maxProperties,
  minimum,
  maximum,
  exclusiveMinimum,
  exclusiveMaximum,
  multipleOf,
  minLength,
  maxLength,
  pattern,
  format,
  items,
  minItems,
  maxItems,
  uniqueItems,
  enum: enumKeyword,
  const: constKeyword,
  allOf,
  anyOf,
  oneOf,
  not,
})

export function keywords() {
  return Object.keys(KEYWORD_HANDLERS).sort()
}
