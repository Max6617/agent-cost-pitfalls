# quota

Per-key API quota accounting: a daily allowance plus a sliding one-hour burst
window, with a capped facility to borrow against tomorrow.

```
config/quota.config.json   dailyLimit / hourlyLimit / borrowLimit defaults
docs/quota-rules.md        the rules agreed with the API team - the contract
src/                       the implementation
bin/quotad.js              replay a JSON-lines event capture against the service
test/                      reproductions; a subset of what the gateway checks
```

## Use

```js
import { createQuotaService } from './src/index.js'

const quota = createQuotaService()                       // config from this checkout
const sandbox = createQuotaService({ dailyLimit: 5 })    // overrides, for tests

quota.admit({ id: 'r-1', key: 'acme', at: 1700000000 })  // { id, status, reason? }
quota.admitAll(batch)                                    // one result per event
quota.statusOf('r-1')                                    // 'admitted' | 'rejected' | null
quota.usage('acme')                                      // the section 7 report
quota.log('acme')                                        // events in canonical order
```

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the
  gateway and the reconciler import these files directly.
- No dependencies. The service runs inside the gateway container, which has
  no network and no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- There is no clock. Timestamps are whole seconds since the epoch and arrive
  on the events; nothing in `src/` may ask the system for the current time.
- When the code and `docs/quota-rules.md` disagree, the doc is right.
