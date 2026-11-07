# authd

Refresh-token service: families, rotation, reuse detection, expiry, session
listing. The gateway calls it on every `/refresh`; the admin console renders
its session listing.

```
config/auth.config.json   the policy: absolute TTL, idle window, access-token TTL (ms)
docs/refresh-rules.md     the rules security signed off - treat as the contract
src/                      the implementation
test/                     reproductions; a subset of what the drill checks
```

## Use

```js
import { createService } from './src/index.js'

const svc = createService()                       // policy from this checkout
const drill = createService({ policy: { idleTtlMs: 60_000 } })  // overrides

const login = svc.login({ user: 'ada', device: 'laptop' }, now)
const next = svc.refresh(login.refreshToken, now2) // { status, ... } - see docs
svc.validateAccess(login.accessToken, now3)        // { status, ... }
svc.logout(login.familyId, now4)
svc.sessions('ada', now5)                          // [ { familyId, device, ... } ]
```

`now` is always milliseconds since the epoch and is always supplied by the
caller. The service never reads a clock, a random source, the network or the
environment: replaying the same call sequence reproduces the same tokens.

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it, the
  gateway imports these files directly.
- No dependencies. The service runs inside the gateway container, which has
  no network and no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- Tokens are opaque strings. Nobody outside `src/` parses them; tests compare
  them for equality, never for structure.
