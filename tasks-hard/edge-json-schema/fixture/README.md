# gateway-payload-schema

Payload validation for the public API gateway. A service registers a schema from
the closed subset in `docs/schema-spec.md`; the gateway runs every request body
through `validate` and returns the report to the client when the body is
rejected.

Zero dependencies, Node ESM, no I/O in the validator itself.

```powershell
node --test                      # the suite in test/
node bin/gateway-check.js config/example.schema.json payload.json
```

## Public surface

`src/index.js` is the only supported entry point and it is stable — every other
module is an implementation detail that may be rearranged at any time.

```js
import { validate, SchemaError, TYPE_NAMES, keywords, knownFormats, SUBSET_VERSION } from '../src/index.js'
```

| export | what it is |
|---|---|
| `validate(schema, instance)` | the validator; returns `{ valid, errors }` |
| `SchemaError` | thrown for a schema outside the subset |
| `SUBSET_VERSION` | the version of `docs/schema-spec.md` this build implements |
| `TYPE_NAMES` | the type names the subset accepts |
| `keywords()` | the keyword names this build implements, sorted |
| `knownFormats()` | the format names the lint command recognises |

An entry of `report.errors` is `{ path, keyword, message }`. `path` is a JSON
Pointer into the instance, `keyword` is the keyword that failed, and `message` is
for humans — clients are expected to switch on `path` and `keyword` only.

## Layout

```
src/index.js            the public surface
src/validator.js        the walker: type first, then the keyword handlers
src/registry.js         keyword name -> handler
src/types.js            the seven type names
src/errors.js           report entries and SchemaError
src/pointer.js          JSON Pointer escaping
src/keywords/*.js       one module per group of keywords
src/combinators.js      allOf / anyOf / oneOf / not
src/util/               equality and small text helpers
docs/schema-spec.md     the contract, agreed with the service teams
config/                 the gateway's own configuration
bin/gateway-check.js    run one payload against one schema, for debugging
test/                   the cases we wrote down while reporting the bugs
```

## Conventions

- `docs/schema-spec.md` is the contract. The service teams write schemas against
  it, so a disagreement between it and `src/` is a bug in `src/`.
- The suite in `test/` is a reproduction set, not an acceptance suite: it holds
  the cases someone took the time to write down.
- A validator run is pure: same schema and same instance, same report. No clock,
  no randomness, no filesystem, no network.
