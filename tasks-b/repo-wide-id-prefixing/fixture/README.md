# ledgerline

A small billing directory: users, orders, payments and refunds, plus the
serialisers that turn records into the public API envelopes and back.

```
docs/ids.md      the id convention the whole service agreed to - the contract
src/             the implementation
  idkit.js       the shared id toolkit the convention is implemented with
  users.js       user records
  orders.js      order records (an order belongs to a user, may have a payment)
  payments.js    payment records (a payment settles an order)
  refunds.js     refund records (a refund reverses a payment)
  serializers.js the { type, id, ... } envelopes the API speaks in
  money.js       decimal-string <-> cents helper used by the money fields
  index.js       the public surface
test/            reproductions collected from bug reports - a subset of what
                 the convention in docs/ids.md requires
```

## Use

```js
import { createUser, serializeUser, parseUserId, toDTO, fromDTO } from './src/index.js'

const user = createUser({ id: '9Xv', name: 'Ada', email: 'ada@example.com' })
serializeUser(user)          // the public shape, ids in canonical form
parseUserId('9Xv')           // reading an id off a path, a payload, a dump
```

## Conventions

- ESM only. `package.json` says `"type": "module"`; do not change it.
- No dependencies. The service runs inside the billing container, which has no
  network and no package registry.
- `src/index.js` is the public surface. Everything the API layer and the
  importers use is re-exported there; other files under `src/` are internal and
  may be reorganised, the surface may not.
- Ids follow `docs/ids.md`. Where the code and that document disagree, the
  document is right and the code is a bug.

## Tests

```
npm test
```
