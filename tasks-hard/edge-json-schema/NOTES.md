# edge-json-schema

**stratum:** edge-case-dense
**domain:** a JSON-Schema-subset validator for the API gateway (`validate(schema, instance)` → `{ valid, errors }`, one entry per failure with `path` + `keyword`).
**prompt:** "Request bodies our schemas allow are being rejected — a 19.99 price comes back as \"not a multiple of 0.01\" — while bodies they should reject go through: `additionalProperties: false` stops doing anything the moment the same schema also declares `patternProperties`, and a `oneOf` is satisfied when two of its branches match. A three-emoji label is also counted as six characters and blows a `maxLength: 3`. Make the validator behave the way docs/schema-spec.md describes it; the tests under test/ are the cases we managed to write down, not the whole acceptance criteria."

The contract is `fixture/docs/schema-spec.md` (a deliberately closed subset: 26
keywords plus `type`, ~200 lines). The fixture is a plausible implementation that
agrees with the document on the mainline and disagrees with it on the boundaries.

## Sub-problems (each its own hidden test file)

| file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-types-required` | the seven type names, `required` | `types.js`: `integer` shares the `number` branch (1.5 passes), `number` is `typeof === 'number'` (NaN/Infinity pass), `null` is `== null` (undefined passes); `validator.js` has no non-finite pre-pass; `keywords/required.js` tests `value[name] === undefined` instead of own-property presence |
| `02-object-keywords` | `properties` / `patternProperties` / `additionalProperties` / `propertyNames` / counts | `keywords/object.js`: `additionalProperties` returns early whenever `patternProperties` is declared; `patternProperties` skips keys `properties` already named; it compiles `^(?:p)$`, i.e. a whole-key match instead of a search |
| `03-number-keywords` | bounds and `multipleOf` | `keywords/number.js`: `exclusiveMinimum`/`exclusiveMaximum` accept the boundary value; `multipleOf` is `value % divisor !== 0` (19.99 is not a multiple of 0.01 in binary); a non-positive divisor is silently reported instead of throwing `SchemaError` |
| `04-string-keywords` | code-point lengths, `pattern`, `format` | `keywords/string.js`: `minLength`/`maxLength` use `.length` (UTF-16 units, an emoji counts twice); a pattern that does not compile escapes as `SyntaxError` instead of `SchemaError`; `format` is enforced although the subset calls it an annotation |
| `05-array-keywords` | tuples, `additionalItems`, `uniqueItems` | `keywords/array.js`: the tuple branch loops over `spec` instead of the instance, so a short array is checked against elements it does not have; `schema.additionalItems ?? false` makes absent mean "no extras"; `uniqueItems` fingerprints with `JSON.stringify`, so key order decides equality |
| `06-combinators-report` | `allOf`/`anyOf`/`oneOf`/`not`, the report | `combinators.js`: `oneOf` only rejects zero matches (two matches pass), `anyOf` appends every branch's entries after its own; `validator.js` returns after the first failing keyword of a value (so two failures on one value report one) and `makeReport` sorts the entries by path |

Eight modules have to change: `src/types.js`, `src/validator.js`,
`src/keywords/{required,object,number,string,array}.js`, `src/combinators.js`.
`src/util/equal.js` (the shared equality used by `enum`/`const`) is already
correct — `uniqueItems` simply does not use it.

## Measured

| arm | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 6/10 pass, exit 1 | **3/24 = 12.5%** |
| reference | 10/10 pass, exit 0 | **24/24 = 100%** |
| "green the visible suite and stop" (minimal 4-symptom patch) | 10/10 pass, exit 0 | **6/24 = 25%** |

The third row is a real overlay, not an estimate: the fixture plus exactly four
minimal patches (drop the `patternProperties` early return in
`additionalProperties` and exclude pattern-matched keys; count code points in
`minLength`/`maxLength`; decide `multipleOf` on the decimal values; reject
`matched !== 1` in `oneOf`). Everything else in the fixture is left alone.

25% is below the 40-60% band in AUTHORING.md and that is deliberate here: the
visible suite reproduces the four symptoms in the prompt and nothing else, and
most hidden cases in the same sub-problems are interaction cases, so a solution
that only greens `test/` still has to reason from `docs/schema-spec.md` for
18 of the 24 cases. The gradient is 12.5% (nothing) → 25% (visible only) → 100%
(contract implemented), and the doc is short enough that an agent which reads it
lands well above the visible-only arm.

## Interaction cases (11 of the 24)

| case | sub-problems at once |
|---|---|
| `02.1` additionalProperties next to patternProperties | 02 × 02 — the `false` rule has to exempt the pattern-matched key and still reject the two it did not describe |
| `02.2` a key named in `properties` **and** matched by a pattern | 02 × 02 — both subschemas must apply; the fixture lets the named one win |
| `02.3` `patternProperties` searches the key | 04 × 02 — one search rule, stated once in the document, implemented two ways in the fixture (the string side is already a search) |
| `02.4` `additionalProperties` as a **subschema** + `propertyNames` | 02 × 06 — `propertyNames` reports at the object path, the subschema at the child's, and the short circuit would swallow the second |
| `03.2` `multipleOf: 0.01` on `19.99`, and `0.1 + 0.2` against `0.1` | 03 × float — the exact-multiple rule, both directions |
| `04.1` `maxLength` over a string of emoji | 04 × unicode — code points, and the family emoji is 5 of them, not 1 grapheme |
| `05.1` tuple + `additionalItems` + a short instance | 05 × 05 — the three array rules only agree once the tuple stops describing absent elements |
| `05.2` `uniqueItems` on reordered objects, on `1`/`1.0` and on `0`/`-0` | 05 × 08-equality — a serialisation is not the equality |
| `06.1` `oneOf` where two branches match (`2` matches both `number` and `integer`) | 06 × 01 — the case also needs `integer` to stop accepting 2.5 |
| `06.3` every failure, in walk order | 06 × 06 — collect-all and no-sort at once |
| `06.4` `allOf` branch order | 06 × 06 — the branches' paths sort differently from the walk |

## Guards (pass on the untouched fixture on purpose)

Three, all asserted inside otherwise-broad cases:

- `03.4` `minimum`/`maximum` include the boundary they name.
- `04.2` `minLength`/`maxLength` boundaries are inclusive on ASCII.
- `05.3` `items` as a subschema reaches every element; `minItems`/`maxItems` are inclusive; `additionalItems` is ignored next to a subschema.

They stop a rewrite from turning the walk into something that no longer agrees
with the mainline, and they are the whole 12.5% floor.

## Where the partial credit comes from

Fixing sub-problem 1 as a whole (the type names, the presence rule of `required`
and the non-finite pre-pass) is worth 4 cases; the object keywords alone (`02`)
3 of 4; the report and combinators alone (`06`) 3 of 4. Nothing is
all-or-nothing, and no single edit greens a file: `02.4` needs the object fix
*and* the report fix, `06.1` needs the combinator fix *and* the integer fix.

## Deviations / notes for the study owner

- The visible suite is 10 cases in 3 files, 4 of them failing on the untouched
  fixture (exactly the four symptoms in the prompt) and 6 passing. Every
  sub-problem is touched by one or two of them, at its easiest: no visible case
  covers a boundary, a Unicode string, an unanchored pattern, a reordered object
  or the ordering of the report. The passing cases are contract-conformant, so
  the reference keeps them green.
- `docs/schema-spec.md` fixes the ambiguous corners on purpose: `1.0` **is** an
  integer, `undefined` is not `null`, non-finite numbers report `type` and
  nothing else, `multipleOf` has no tolerance (`0.1 + 0.2` is not a multiple of
  `0.1`), lengths are code points, `format` is an annotation, and a key described
  by both `properties` and `patternProperties` must satisfy both.
- The hidden suite never imports anything but `../src/index.js`; `SchemaError` is
  exported there.
- `bin/`, `config/` and `src/util/text.js` are noise: no test touches them.
