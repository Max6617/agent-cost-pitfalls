# customer-domain

The customer and order domain layer: profiles, orders, patches, the JSON wire
format, search, the CSV export and the audit trail.

```
config/fields.json       the profile schema the API validates against
docs/field-policy.md     the absent/null/empty contract - treat it as binding
src/                     the implementation
src/index.js             the public surface; everything else under src/ is internal
test/                    reproductions of the support tickets we could pin down
bin/console.js           the support console, a thin wrapper over the layer
```

## Use

```js
import {
  applyPatch, serialize, deserialize, diffRecords, exportCsv, search,
} from './src/index.js'

applyPatch({ name: 'Ada' }, { phone: null })   // { name: 'Ada' }
serialize({ id: 'p1', phone: null })           // '{"id":"p1","phone":null}'
search(rows, [{ field: 'notes', op: 'no value' }])
```

## Conventions

- ESM only. `package.json` says `"type": "module"`; the API and the importer
  import these files directly, so do not change it.
- No dependencies. This layer runs inside the API container, which has no
  network and no package registry.
- `src/index.js` is the public surface. Everything else under `src/` is internal
  and may be reorganised; the names exported from `index.js` may not.
- No clock, no randomness: the layer is deterministic and stays that way, which
  is why timestamps and ids are passed in by the caller.
- Values cross the public surface as plain JSON data. A field can be absent, it
  can be present and `null`, and it can be present and hold an empty value
  (`''`, `[]`, `{}`, `0`, `false`): `docs/field-policy.md` says what each
  operation does with each of the three, and it is binding.
