# mailroom

The contact hub: one library behind accounts, invites, the newsletter, the
support desk and billing contacts. Everything identity-related is governed by
`docs/email-rules.md` — treat that document as the contract.

```
docs/email-rules.md   the agreed address rules (canonical form, display, identity)
src/emailkit.js       the shared canonicalisation those rules describe
src/                  the services (accounts, invites, newsletter, support, billing)
test/                 reproductions; a subset of what the acceptance checks cover
```

## Use

```js
import { createAccounts, createNewsletter, createSupportDesk } from './src/index.js'

const accounts = createAccounts()
accounts.register('Dana.White@Gmail.com')     // { status: 'registered', account: { id: 'a-1', ... } }
accounts.lookup('dana.white@gmail.com')       // the same account, matched by identity

const desk = createSupportDesk()
desk.openTicket({ email: 'Dana.White@Gmail.com', subject: 'refund' })
```

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it.
- No dependencies. The hub ships inside the product monorepo, which has no
  package registry access.
- `src/index.js` is the public surface. Everything else under `src/` is
  internal and can be reorganised; the surface cannot.
- Services are created per consumer with their `create*` factory; nothing is
  shared between two instances of the same service.
- `npm test` runs the reproduction suite under `test/`.
