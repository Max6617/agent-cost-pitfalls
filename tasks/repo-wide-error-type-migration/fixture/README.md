# storefront-api

| module | responsibility |
|---|---|
| `src/errors.js` | the one error type, its codes and the HTTP mapping |
| `src/validate.js` | request shape and value checks |
| `src/carts.js` | cart state |
| `src/stock.js` | stock levels and reservations |
| `src/payments.js` | provider adapter |
| `src/api.js` | the HTTP layer |

## Failures

Every failure that reaches the HTTP layer is a `StoreError` with a `code` from
`errors.js`. The status comes from the code table; nothing else decides it and
nothing parses a message to work out what went wrong.

A plain `Error` that escapes a module is a bug, and the framework answers it
with a generic 500 — the message is not echoed, because messages carry
connection strings and internal ids more often than anyone expects.

`errors.js` exports `fail(code, message, options)` for the common case. Use it.
