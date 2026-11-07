# repo-wide-id-prefixing

stratum: repo-wide

Domain: a small billing directory (users, orders, payments, refunds) plus the
serialisers for the API envelopes. `docs/ids.md` pins ONE convention — public
ids are typed `<prefix>_<base62>` (`usr_`/`ord_`/`pay_`/`ref_`), emitted
prefixed, parsed accepting legacy bare ids, never doubled, wrong-prefix
rejected with a documented `IdError.code`, bodies case-sensitive — and
`src/idkit.js` implements it correctly. Five modules each diverge in their own
way; the work is sweeping them all onto idkit.

## sub-problems

| hidden file | module with the bug | the divergence |
|---|---|---|
| 01-users-emission | `src/users.js` | emits bare ids: `createUser` strips the prefix off the canonical id, `serializeUser` passes the bare body out (its hand-rolled *parser* is doc-correct) |
| 02-orders-serialisation | `src/orders.js` | double-prefixes on serialisation: `serializeOrder` blindly concatenates `ord_`/`usr_`/`pay_` onto fields ingest already canonicalised |
| 03-payments-prefix | `src/payments.js` | accepts any prefix anywhere: its webhook "coerce" trusts anything containing an underscore — wrong prefix, unknown prefix, even a bad body — and never rejects |
| 04-refunds-case | `src/refunds.js` | uppercases id bodies on the way in ("legacy ledger house style"), corrupting case-sensitive base62, on its own id and on the `paymentId` reference |
| 05-envelopes | `src/serializers.js` | `fromDTO` rejects legacy bare ids outright (and reports a wrong prefix as `bad-id` instead of `wrong-prefix`); `toDTO` passes a bare id through uncanonicalised |

`idkit.js`, `money.js` (noise utility) and `index.js` are correct and unchanged
by the reference; the prompt hints at the first four divergences as symptoms
but never at `serializers.js`.

## guards (pass on the untouched fixture, 4/22 floor)

- `a user read rejects another type id as wrong-prefix` — users' parser is the correct half of that module
- `an order without a payment serialises the reference as null` — the null path in the broken concat serializer
- `an all-caps body parses unchanged` — the uppercaser is a no-op on it
- `an envelope with a typed id round-trips unchanged` — the strict `fromDTO` accepts the typed form

## interaction cases (9)

Two sub-problems at once, or behaviour the visible suite never touches:
emission idempotency on already-typed input (01); reference fields in an order
DTO, incl. a payment ref keeping prefix *and* case (02 x2); wrong-prefix
rejection on a payment's `orderId` *reference* and the `bad-id` vs
`wrong-prefix` code distinction (03 x2); case-exactness of a refund's
`paymentId` reference and wrong-prefix rejection there (04 x2); the error-code
distinction in `fromDTO` and `toDTO` canonicalising emission, which the
visible suite never calls (05 x2).

## measured

- untouched fixture: hidden **4/22 = 18%** (the four guards); visible 1/9 pass, 8 failing
- reference: hidden **22/22 = 100%**; visible 9/9 pass
- reference changes 5 files: `src/{users,orders,payments,refunds,serializers}.js`
- gate: `ok` (`node tasks-b/_tools/verify-task.mjs repo-wide-id-prefixing`)

The visible suite exercises only the mainline of each sub-problem (bare
emission, one double-prefix, one wrong-prefix, one case fold, one rejected
bare envelope). A fix that greens it but hand-rolls per-module copies instead
of routing through idkit still misses the reference-field, code-distinction
and `toDTO` cases.
