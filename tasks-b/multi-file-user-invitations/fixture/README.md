# invites

Team invitations for multi-org accounts: an org invites a person by email,
the person clicks the token link, and joins with the role the invite named.

```
bin/invite.js              admin CLI wrapper (support sessions)
docs/invitation-rules.md   the agreed rules - treat as the contract
src/                       the implementation
test/                      reproductions; a subset of what the signup flow checks
```

## Use

```js
import { createService } from './src/index.js'

const service = createService()
service.addOrg({ id: 'acme', defaultRole: 'member' })

const invite = service.invite({ org: 'acme', email: 'sam@acme.com', now: 1000 })
// -> { token, org, email, role, createdAt, expiresAt, status }

service.accept({ token: invite.token, email: 'sam@acme.com', now: 2000 })
// -> { status: 'accepted', member: { org, email, role } }
```

Time is always passed in as `now` (a millisecond instant). The service never
reads a clock, so tests and audit replays are reproducible.

## Conventions

- ESM only. `package.json` says `"type": "module"`; the signup flow imports
  these files directly.
- No dependencies. The service runs inside the account container, which has
  no network and no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- Tokens and expiries are a stored contract: other systems keep them, so the
  derivation in `docs/invitation-rules.md` §2-3 does not change.

## Tests

```
npm test
```
