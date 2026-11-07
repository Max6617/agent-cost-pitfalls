# Timeout policy

Agreed by the service owners before herald was written. Every blocking call
this library plans — HTTP request, database statement, queue poll or publish,
cache read or write, webhook delivery — runs with a timeout resolved by the
policy module. No client picks its own number, keeps its own constant, or
invents its own clamp. When a client and this document disagree, the client
is wrong.

## 1. Operations and classes

Every operation has a dotted name: `class.operation`. The class is the text
before the first dot. The operations herald performs:

| operation | class | default (ms) |
|---|---|---|
| `http.fetch` | `http` | 2,000 |
| `db.query`, `db.exec` | `db` | 1,000 |
| `queue.poll`, `queue.publish` | `queue` | 5,000 |
| `cache.get`, `cache.set` | `cache` | 250 |
| `webhook.deliver` | `webhook` | 10,000 |

Callers resolve the **full operation name** they are performing —
`policy.resolve('queue.poll', requested)` — never the bare class. An override
names a full operation, so resolving the bare class can never match one.

## 2. The resolution rule

```
resolve(operation, requested):

  floor   = override for `operation`, if one is configured, else the class default
  ceiling = 30,000 ms   — the hard ceiling, the same for every operation

  requested === undefined        -> floor
  requested <= 0, not finite,
    or not a number              -> RangeError
  otherwise                      -> requested clamped into [floor, ceiling]
```

A caller that wants the default asks for nothing. A requested timeout of zero
or less is a **caller error** and is rejected with a `RangeError`; zero does
not mean "no timeout", and there is no "no timeout" — every call ends, and no
call runs past the ceiling.

The clamp works in both directions: a request below the floor is raised to the
floor, a request above the ceiling is capped to the ceiling.

## 3. Overrides

Overrides are configured when the app is built:

```js
createApp({ timeouts: { overrides: { 'db.query': 400, 'webhook.deliver': 15000 } } })
```

An override:

- names **one full operation** and affects exactly that operation —
  `'db.query'` says nothing about `db.exec`;
- replaces the default for that operation, both as the value a caller gets
  when it asks for nothing and as the floor its requests are clamped up to;
- must name an operation in a class herald knows, and must be a positive
  finite number of milliseconds — anything else is a `RangeError` at build
  time;
- is capped at the hard ceiling when the policy is built, so the floor never
  exceeds the ceiling.

## 4. What the clients do with the result

Each client puts the resolved value on the plan it returns, as `timeoutMs`,
and nothing else decides it. A client that never asked the policy, asked for
the wrong operation, or adjusted the answer afterwards is a bug, however
reasonable the number looks.
