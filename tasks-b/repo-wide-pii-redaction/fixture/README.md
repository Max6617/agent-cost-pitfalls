# surface

Accounts, payments and support behind one small service core, with a single
redaction policy for everything that leaves the process.

```
docs/redaction-policy.md   the policy compliance pinned - treat as the contract
src/                       the implementation
test/                      reproductions; a subset of what CI checks
```

## Use

```js
import {
  createLogger, accountToJson, cardToJson, chargeToJson, ticketToJson,
  toErrorPayload, snapshot, paymentMethodLine, describeCharge,
} from './src/index.js'

const log = createLogger()
log.info('account.updated', { account })   // one line per call, collected in log.lines

accountToJson(account)                      // the API shape of an account
chargeToJson(charge)                        // a charge carries its account and its card
toErrorPayload({ code, message, details })  // -> { error: { code, message, details } }
snapshot({ at, actor, action, kind, entity })
// -> { at, actor, action, kind, entity } - the record as the policy allows it kept

paymentMethodLine(card)     // 'Visa ***1111'
describeCharge(charge)      // 'charge ch_1: USD 1200 on Visa ***1111'
```

Log lines are `LEVEL message {json}` - the level, the message the caller
passed, then the payload as JSON.

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the API
  layer and the workers import these files directly.
- No dependencies. The service container has no network and no package
  registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- Nothing here reads the clock. An audit snapshot's `at` is whatever the
  caller passes, and log lines carry no timestamp.
