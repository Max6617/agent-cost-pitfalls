# order-intake

Accepts order forms from the storefront, validates them against the schema in
`src/schema.js` and hands the coerced object to the pricing pipeline.

## Contract

`POST /orders` with a JSON body. Everything the browser sends arrives as a
string; the coercion layer is responsible for turning it into the declared type.

| field | type | notes |
|---|---|---|
| `reference` | string, required | the storefront's own id |
| `customerEmail` | string, required | |
| `quantity` | integer, required | 1–99, checked after coercion |
| `unitPrice` | number, required | ≥ 0.01, money syntax accepted |
| `total` | number | optional |
| `expedited` | boolean | checkbox words accepted |
| `code` | enum | `standard`, `exp`, `collect` — compared case-insensitively |
| `note` | string | ≤ 280 characters |
| `tags` | array | comma-separated or JSON |
| `shipping` | object, required | `line1`, `postcode`, `country` |

A 400 response lists **every** problem, not the first one, and names the field
with a dot path for nested objects.
