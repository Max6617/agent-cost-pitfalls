# admin-seed

Input validation for the back-office records: users, products, orders,
invoices, shipments and the settings blob. Every record is checked by its
validator before it is stored, and the issues come back to the form that
sent it.

```
docs/validation-conventions.md   the convention every validator follows - the contract
src/registry.js                  the central code registry and message templates
src/*.js                         one validator per record type
bin/validate.js                  ad-hoc CLI: node bin/validate.js user '{"name":"Al"}'
test/                            reproductions; a subset of what support is hitting
```

## Use

```js
import { validateUser, CODES, messageFor } from './src/index.js'

validateUser({ name: 'Al', email: 'not-an-email' })
// => [{ field: 'name', code: 'min-length', message: 'must be at least 2 characters' }, ...]
```

## Conventions

- ESM only (`"type": "module"` in package.json). No dependencies: this runs
  inside the admin container, which has no network and no package registry.
- `src/index.js` is the public surface: every validator, plus `CODES` and
  `messageFor` from the registry. Everything else under `src/` is internal
  and can be reorganised; the surface cannot.
- All validators follow `docs/validation-conventions.md`. Read it before
  touching any of them.
- Run the reproductions with `npm test`.
