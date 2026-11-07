# records-api

The service layer behind the records API: request validation, auth, the record
repository and its store, the read-through cache, the outbound client, the job
publisher, the CSV importer, the job worker, and the error mapper and response
builder the HTTP edge calls.

```
docs/error-policy.md     the failure contract - binding, and this README defers to it
src/index.js             the public surface; everything else under src/ is internal
src/catalogue.js         the closed list of codes the service may report
src/errors.js            the failure type, wrapping and the cause chain
src/context.js           correlation ids
src/limits.js            field limits shared by the API and the importer
src/validate.js          request body validation
src/auth.js              token and scope checks
src/repository.js        records over an injected store
src/store.js             the in-memory store used by the dev server and by tests
src/cache.js             the read-through cache over an injected backing store
src/outbound.js          the HTTP client over an injected transport
src/queue.js             the job publisher over an injected broker
src/importer.js          the CSV importer
src/worker.js            the job worker
src/mapper.js            failure -> response fields
src/http.js              response building
src/service.js           the use cases that compose the above
src/util/text.js         small text helpers
test/                    reproductions of the tickets we could pin down
bin/serve.js             the dev server, a thin wrapper over the service
```

## Use

```js
import {
  newContext, createMemoryStore, createMemoryCache,
  createRepository, createCache, createService, mapError, buildErrorResponse,
} from './src/index.js'

const ctx = newContext('req-1')
const service = createService({
  repository: createRepository(createMemoryStore()),
  cache: createCache(createMemoryCache()),
})

service.createRecord({ token, body: { id: 'r-1', title: 'Widget', quantity: 2 } }, { ctx, now })
service.getRecord('r-1', { token }, { ctx, now })
```

## Public surface

Everything the rest of the platform imports. These names and shapes are stable;
what is under them is not.

| export | shape |
|---|---|
| `newContext(correlationId?)` | `{ correlationId }` |
| `CATALOGUE`, `CODES`, `catalogEntry(code)` | the code table, its sorted keys, one entry or `undefined` |
| `DomainError`, `domainError(code, opts)`, `wrap(cause, code, opts)`, `isDomainError(x)`, `chainOf(error)` | the failure type and its helpers |
| `validateRequest(body, { ctx })` | the normalised body, or a `VALIDATION_FAILED` |
| `checkAuth(token, { ctx, now, requiredScope })` | `{ subject, scopes }`, or `UNAUTHENTICATED` / `FORBIDDEN` |
| `createRepository(store)` | `findById(id, { ctx })`, `insert(record, { ctx })`, `update(id, patch, { ctx, expectedVersion })` |
| `createMemoryStore(seed?)` | a store: `read(id)`, `write(record)`, `list()` |
| `createCache(backing)` | `lookup(key, loader, { ctx })` |
| `createMemoryCache()` | a backing store: `get(key)`, `set(key, value)` |
| `createOutbound(transport)` | `send(request, { ctx, idempotent })` |
| `createPublisher(broker)` | `publish(topic, payload, { ctx, idempotent })` |
| `importCsv(text, { ctx })` | `{ imported, rows }`, or a domain error |
| `runJob(job, handler, { ctx })` | the job record |
| `mapError(error, { ctx })` | `{ code, status, retryable, message, correlationId, details? }` |
| `buildSuccess(value, { ctx })`, `buildErrorResponse(error, { ctx })` | `{ status, headers, body }` |
| `createService({ repository, cache })` | `createRecord(request, { ctx, now })` → `{ ok, created, record }`; `getRecord(id, request, { ctx, now })` → `{ ok, record, hit }`; `importRecords(text, request, { ctx, now })` → `{ ok, imported, records }` |

A "*request*" is `{ token, body }`; a *token* is
`{ value, subject, scopes, expiresAt }` where `expiresAt` is a millisecond
instant and `now` is passed in by the caller — the service never reads a clock.

## Conventions

- ESM only, `"type": "module"`. The API, the worker and the dev server import
  these files directly; do not change it.
- No dependencies. This code runs inside a container with no network and no
  package registry, and everything it talks to is injected: the store, the cache
  backing, the outbound transport and the broker are all function-carrying
  objects handed in by the caller.
- No clock and no randomness. `now` is an argument, the correlation id comes
  from the caller, ids come from the request. Two runs over the same input do the
  same thing.
- The store exposes `read(id)`, `write(record)` and `list()`, and the repository
  uses nothing else. The cache backing exposes `get(key)` and `set(key, value)`,
  and the cache uses nothing else. Both are allowed to throw: that is how the
  service exercises its dependency-failure paths.
- Failures: see `docs/error-policy.md`. If a module raises something that is not
  in the catalogue, that is a bug even when the happy path works.
