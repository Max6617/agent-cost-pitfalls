# Gateway payload schema — subset v4

The gateway validates the body of a public request before a handler ever sees it.
The schemas are written by the service teams, so this document is the contract:
`src/` is expected to implement exactly what is written here and nothing beyond
it. Where the code and this document disagree, this document is right and the
code is a bug.

The subset is deliberately closed. A schema that uses a keyword from the full
JSON Schema vocabulary but not from this document is **not** an error: unknown
keywords are ignored and never fail an instance. They are annotations the teams
keep for their own documentation.

## 1. The surface

```js
import { validate, SchemaError } from '../src/index.js'

const report = validate(schema, instance)
```

`report` is `{ valid, errors }`:

| field | meaning |
|---|---|
| `valid` | `true` when `errors` is empty |
| `errors` | the failures, in the order described in §10 |

Every entry is `{ path, keyword, message }`:

- `path` — a JSON Pointer to the value the failure is about. `''` is the
  instance itself, `/name` is its `name` property, `/items/2` is the third
  element of `items`. Inside a token, `~` is written `~0` and `/` is written
  `~1`.
- `keyword` — the keyword that failed. A failure inside a subschema is reported
  with the keyword that failed *inside* it, not with the name of the keyword that
  reached it; the collapsing keywords of §9 are the exception.
- `message` — human readable, for the gateway log. Nothing may depend on its
  wording: clients depend on `path` and `keyword`.

`SchemaError` is thrown for a schema that is outside the subset — see §5 and §6.
That is a bug in the gateway's configuration, not in the client's payload.

## 2. Types

`type` names one of seven types:

| name | matches |
|---|---|
| `object` | a plain object. `null` is not an object, and an array is not an object |
| `array` | an array |
| `string` | a string |
| `number` | a number |
| `integer` | a number with no fractional part |
| `boolean` | `true` or `false` |
| `null` | `null`, and only `null` |

**`integer` is a value, not a spelling.** `1.0`, `2.0` and `1e2` are integers
because they have no fractional part; `1.5` is not. The gateway cannot know
whether the client typed `1` or `1.0` — JSON `1.0` arrives as the same number.

`undefined` is not a value of any of the seven types. In particular `undefined`
does **not** satisfy `null`, and a property whose value is `undefined` is still a
property (§3, §4).

A value that fails `type` produces exactly one entry for that schema, with
keyword `type`, and no other keyword of that schema is applied to that value.

### 2.1 Non-finite numbers

JSON has no `NaN` and no `Infinity`. The gateway never forwards one, but
`validate` is a public function and it is still asked about them:

- `NaN`, `Infinity` and `-Infinity` fail every one of the seven type names,
  including `number` and `integer`;
- the report carries exactly one entry for the value, with keyword `type`, at the
  value's own path — even when the schema does not declare a `type` at all;
- none of the schema's other keywords are applied to it. Reporting `maximum` for
  `Infinity` would tell the client it had sent a large number, and it did not
  send a JSON number.

## 3. required

`required` is an array of property names. It applies to objects only.

- An empty array requires nothing.
- A name is satisfied when the instance has that **own property**, whatever its
  value: a property whose value is `undefined` is present and satisfies it.
- Every missing name produces one entry, at the **object's** path — the missing
  property has no path of its own — with keyword `required`. The entries follow
  the order of the names in the array.

## 4. Objects

Everything in this section applies to objects only.

`properties` — for every own property that `properties` also names, the value is
validated against that subschema. Failures are reported at the child's path.
Keys are visited in the order they are written in the `properties` object.

`patternProperties` — an object of regular expressions to subschemas. Every own
key the expression matches is validated against that subschema, failures at the
child's path. The expression is a **search, not a whole-key match**: the pattern
`name` matches the key `userName`, and a key matching two patterns is validated
against both. Write `^` and `$` in the pattern to mean the whole key.

A key can be named in `properties` **and** match a pattern. Both subschemas then
apply to it: it has to satisfy both.

`additionalProperties` — applies to every own key that neither `properties` nor
`patternProperties` matched. As `false`, each such key produces one entry at the
object's path with keyword `additionalProperties`. As a subschema, each such
key's value is validated against it. Absent means `true`: anything is allowed.

`propertyNames` — a subschema applied to every own key, as a string. Every key is
checked, including the ones `properties` names. Each key that fails produces one
entry at the **object's** path with keyword `propertyNames`; the inner failure is
not reported separately, and the offending key is named in the message.

`minProperties` / `maxProperties` — count the own properties. Both boundaries are
inclusive: an object with exactly `maxProperties` properties is fine.

## 5. Numbers

`minimum` and `maximum` are inclusive: the boundary value is accepted.
`exclusiveMinimum` and `exclusiveMaximum` are strict: the boundary value is
rejected.

`multipleOf` — the value must be an exact multiple of the divisor. Exact is about
the value, not about its binary representation: the quotient of the two numbers,
as written in decimal, has to be a whole number.

- `19.99` **is** a multiple of `0.01`. `19.99 % 0.01` is not zero in JavaScript,
  and a `%` test is therefore wrong.
- `0.3` is a multiple of `0.1`.
- `0.1 + 0.2` is `0.30000000000000004`: a different number, with a different
  decimal spelling, and it is **not** a multiple of `0.1`. There is no tolerance
  in this comparison.
- `0` is a multiple of every positive divisor.
- A `multipleOf` that is not a positive number is a schema bug: `validate` throws
  `SchemaError` rather than dividing by zero.

Non-finite numbers are handled by §2.1, before any of this runs.

## 6. Strings

`minLength` / `maxLength` count **Unicode code points**, not UTF-16 units.
`'😀'` has length 1, `'a😀'` has length 2, and `'😀😀😀'` is within `maxLength: 3`.
Code points, not grapheme clusters either: the family emoji `'👨‍👩‍👧'` is five code
points here — three people and two joiners — and it is not one "character".
Both boundaries are inclusive.

`pattern` — a regular expression the string must match. It is a **search, not a
whole-string match**: the pattern `b` accepts `'abc'`, and `^b` does not. A
pattern that is not a valid regular expression is a schema bug: `validate` throws
`SchemaError`, not `SyntaxError`.

`format` — an annotation in this subset. It is accepted, never enforced, and
never produces a failure: the gateway does not police formats, and the service
teams use `format` for documentation.

`minLength`, `maxLength`, `pattern` and `format` apply to strings only.

## 7. Arrays

`items` as a subschema — every element is validated against it.

`items` as an array (a **tuple**) — element *i* is validated against `items[i]`.
It is not an error for the instance to be shorter than the tuple: a tuple
describes the elements that are there, and requiring elements to be present is
`minItems`' job.

`additionalItems` — only meaningful with a tuple. It governs the elements past
the end of the tuple: `false` rejects them, with one entry at the array's path
and keyword `additionalItems`; a subschema validates them, failures at the
element's path. **Absent means `true`**: the extras are allowed, which is the
common case for a tuple that describes a prefix. With `items` as a subschema, or
with no `items` at all, `additionalItems` is ignored.

`minItems` / `maxItems` — inclusive.

`uniqueItems: true` — no two elements may be equal under the equality of §8. One
entry at the array's path with keyword `uniqueItems`, for the first duplicate
found scanning left to right.

## 8. enum, const, and the equality

`enum` is an array of allowed values and `const` is a single allowed value. Both
use the same equality, and it is deep, type-aware and by value:

- objects are equal when they have the same own keys and equal values, whatever
  order the keys are written in;
- arrays are equal when they have the same length and equal elements;
- numbers are equal by value: `1` and `1.0` are the same value, and `0` and `-0`
  are the same value;
- values of different types are never equal: `true` is not `1`, `'1'` is not `1`,
  and `null` is not `undefined` (`undefined` equals only `undefined`).

## 9. Combinators

`allOf` — every branch must pass. `allOf` contributes no entry of its own: the
report carries the branches' own entries, in branch order.

`anyOf` — at least one branch must pass. When none does, the report carries
exactly **one** entry at the instance's path with keyword `anyOf`. The branches
are alternatives, and the reader of the report does not need the reasons each of
them had for declining.

`oneOf` — **exactly one** branch must pass. Zero matching branches produce one
entry with keyword `oneOf`; two or more matching branches produce one entry with
keyword `oneOf` as well — an ambiguous instance is invalid, and it is the
ambiguity that is reported.

`not` — the instance must not match the subschema. When it does match, the report
carries exactly one entry at the instance's path with keyword `not`, and whatever
matched inside the subschema is not reported.

## 10. The report

`validate` collects **every** failure; it never stops at the first one. The
gateway hands the whole list back to the client so a payload can be fixed in one
round trip.

The order is the order of the walk — depth first, in instance order:

- a value's own keywords run in the order they are written in the schema object,
  and each entry is appended as its keyword runs;
- `properties` visits keys in the order they are written in the `properties`
  object, not in the order they happen to appear in the instance;
- array elements are visited in index order;
- `allOf` visits its branches in array order.

The report is never sorted, and two entries for the same path keep the order
their keywords ran in.
