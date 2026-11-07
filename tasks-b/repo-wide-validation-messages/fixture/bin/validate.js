#!/usr/bin/env node
// Ad-hoc checker: node bin/validate.js user '{"name":"Al"}'
import {
  validateUser, validateProduct, validateOrder,
  validateInvoice, validateShipment, validateSettings,
} from '../src/index.js'

const validators = {
  user: validateUser,
  product: validateProduct,
  order: validateOrder,
  invoice: validateInvoice,
  shipment: validateShipment,
  settings: validateSettings,
}

const [, , kind, raw] = process.argv
if (!validators[kind] || !raw) {
  console.error('usage: node bin/validate.js <' + Object.keys(validators).join('|') + '> <json>')
  process.exit(2)
}

try {
  const issues = validators[kind](JSON.parse(raw))
  console.log(JSON.stringify(issues, null, 2))
  process.exit(issues.length ? 1 : 0)
} catch (err) {
  console.error(kind + ' validator threw: ' + err.message)
  process.exit(1)
}
