# Public ids

The id convention the whole service agreed to when we moved off the legacy
integer keys. `src/` is the implementation; when the two disagree, this
document is right and the code is a bug.

## 1. Shape

A public id is a **typed id**: a prefix, an underscore, and a body.

```
usr_9Xv      ord_41      pay_r7Q2      ref_AB9
```

The four types and their prefixes are fixed:

| type    | prefix |
|---------|--------|
| user    | `usr`  |
| order   | `ord`  |
| payment | `pay`  |
| refund  | `ref`  |

The body is **base62**: one or more characters from `0-9`, `A-Z`, `a-z`, and
nothing else. Bodies are **case-sensitive**: `ref_aB9` and `ref_AB9` are two
different ids. No code path may normalise, fold, or "clean up" the case of a
body; an id that changes case on the way through is a corrupted id.

## 2. Emission — every id that leaves the service

Every id that crosses the public surface is in **canonical form**: the typed
form, exactly once. That covers return values of the `create*` functions, the
serialised DTOs, and the envelopes the API speaks.

- Never bare: `9Xv` is not a public id, `usr_9Xv` is.
- Never doubled: `usr_usr_9Xv` is not a public id either. Serialising a record
  whose id is already canonical returns it unchanged — serialisation is
  idempotent.
- Reference fields are ids too. An order's `userId` and `paymentId`, a
  payment's `orderId`, a refund's `paymentId` follow the same rules, with the
  prefix of the type they reference. A reference that is absent is `null`, on
  the record and in the DTO — `null` is not an id and is never prefixed.

## 3. Ingest — every place an id is read

Anywhere the service reads an id — create payloads, path parameters, webhook
bodies, imported dumps, API envelopes — the same parse rules apply, in this
order:

1. A value that is not a non-empty string is malformed.
2. A value with no underscore is a **legacy bare id** (the pre-migration
   form). If it is base62 it is accepted and canonicalised by prefixing it:
   reading `9Xv` where a user id is expected yields `usr_9Xv`. Legacy bare ids
   are accepted everywhere an id is read, so old dumps and old clients keep
   working. A bare value that is not base62 is malformed.
3. A value with an underscore is a typed id. If its head is not one of the
   four prefixes it is malformed. If its body is not base62 it is malformed —
   and note that a doubled prefix (`usr_usr_9Xv`) lands here, because the body
   `usr_9Xv` is not base62. A parser **rejects** a doubled prefix; it never
   repairs one by stripping.
4. A well-formed typed id whose head is a different type's prefix is rejected
   as **wrong-prefix**: reading `ord_9Xv` where a user id is expected is an
   error, never a silent re-typing.
5. A well-formed typed id with the right prefix is accepted unchanged.

## 4. Errors

Parsing failures raise `IdError` with a `code`:

| situation                                   | code           |
|---------------------------------------------|----------------|
| malformed (empty, non-string, bad alphabet, | `bad-id`       |
| unknown prefix, doubled prefix)             |                |
| well-formed typed id of another type        | `wrong-prefix` |
| a type name outside the four, in idkit      | `bad-type`     |

`wrong-prefix` and `bad-id` are different signals and callers rely on the
distinction: `wrong-prefix` means the value was a real id of something else,
`bad-id` means it was never an id at all.

## 5. The shared toolkit

`src/idkit.js` is the implementation of this document and the only place the
rules live. Every module reads and emits ids through it — that was the point
of writing it. A module that re-implements the rules on its own is a bug
waiting to be reported, and when one is reported, the fix is to put the module
back on the toolkit, not to patch the local copy.
