/** Customer endpoints. */
import { toWire } from './wire.js'

export function customerPayload(row) {
  return toWire({
    id: row.id,
    email_address: row.email_address,
    display_name: row.display_name,
    lifetime_spend: row.lifetime_spend,
    created_at: row.created_at,
    default_address: row.default_address
      ? {
          line_one: row.default_address.line_one,
          post_code: row.default_address.post_code,
          country_code: row.default_address.country_code,
        }
      : null,
  })
}

export function customerSummary(row) {
  return toWire({ id: row.id, display_name: row.display_name, lifetime_spend: row.lifetime_spend })
}

/** The autocomplete list: three fields and no more. */
export function customerOption(row) {
  return toWire({ id: row.id, display_name: row.display_name, email_address: row.email_address })
}
