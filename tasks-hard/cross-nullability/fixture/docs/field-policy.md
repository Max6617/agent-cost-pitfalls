/** The field policy the domain layer is meant to follow, as agreed with support. */

# Absent, null and empty

Three things, not two. Every module in this layer reads and writes the same
optional fields, and all of them have to tell these apart:

| name | what it is | example record |
|---|---|---|
| **absent** | the key is not in the object | `{ id: 'p1' }` has no `phone` |
| **null** | the key is there and was explicitly cleared | `{ id: 'p1', phone: null }` |
| **empty** | the key is there and holds a real, empty value | `{ id: 'p1', phone: '' }` |

The empty values are `''`, `[]`, `{}`, `0` and `false`. They are values, not the
absence of one: a customer with `tags: []` has been asked and has no tags, a
customer with no `tags` key has never been asked, and a customer with
`tags: null` asked us to remove the tags they had.

`stateOf(value)` reports the state of a *value*; `fieldState(record, key)`
reports the state of a *field* and is the one call sites should use. A field
whose key is present and whose value is `null` is in state `null`; a field whose
key is absent is in state `absent`.

## What each operation does

**Patch.** A patch is an object of field updates.

- a key the patch does not mention leaves the field exactly as it was;
- a key whose value is `null` clears the field: the key is removed from the
  record, and reading it afterwards yields the state `absent`;
- a key whose value is `''`, `[]`, `{}`, `0` or `false` writes that value.
  Writing `''` over a cleared field leaves the field present and empty.

Patching is not merging: `applyPatch` never uses a patch value of `null` to mean
"no change", and never drops an empty value on the way through.

**Merge.** `mergePatch(base, source)` merges `source` over `base` with the same
per-field rules, plus two whole-source rules:

- `mergePatch(base)` - no source at all - leaves `base` unchanged;
- `mergePatch(base, null)` - the source is explicitly null - clears it: the
  result is `{}`.

So "we received no update" and "we received an update that clears everything"
are different calls, and a merge never removes a field the source did not
mention.

**Validation.** A field the patch does not mention cannot be wrong; validation
reports nothing for it. A field that is `null` has been cleared and is accepted
only where the schema allows clearing (`nullable` is not `false`) - it is never
reported as a missing required field, and it is never silently turned into a
value. An empty value is validated as the value it is: `''` is a string of
length 0 and fails `minLength: 1`, and `[]` is an array of length 0. A field
that is `null` passes no type check at all; the clear is the whole meaning.

**Serialization.** The wire format keeps the three states apart:

| record | text |
|---|---|
| `{ id: 'p1' }` | `{"id":"p1"}` |
| `{ id: 'p1', phone: null }` | `{"id":"p1","phone":null}` |
| `{ id: 'p1', phone: '' }` | `{"id":"p1","phone":""}` |
| `{ id: 'p1', tags: [] }` | `{"id":"p1","tags":[]}` |

Keys are emitted in sorted order. Deserializing the text of a record gives that
record back, field for field and state for state: an absent field must not come
back as `null`, and a `null` field must not come back absent. `deserialize` is
given text that already has the right states in it and preserves them.

**Diff and patch generation.** `diffRecords(left, right)` returns `{ set, unset }`.

- a key that is in `left` and not in `right` goes into `unset`: the field was
  removed;
- a key that is in `right` goes into `set` with its value - including when that
  value is `null`, because "set to null" and "removed" are different edits;
- a key in both with an equal value appears in neither list.

`applyDiff(left, diff)` reproduces `right` exactly, including the difference
between a removed field and a field set to `null`.

**Search.** Filters compare the field, so the state of the field decides the
answer:

| condition | matches a row when |
|---|---|
| `field = null` | the field is present and null |
| `field != null` | the field is present and holds anything else, empty values included |
| `field is missing` | the key is not in the row |
| `field is present` | the key is in the row, whatever it holds - null included |
| `field no value` | the key is not in the row, or is present and null |
| `field = ''` | the field is present and holds the empty string |

An empty value is a value: a row with `notes: ''` matches `notes = ''` and does
not match `notes no value`. A row with `notes: null` is the other way round.

**CSV export.** The columns are the union of the keys the rows actually have, so
a field no row has produces no column - and a column for a field that *is*
present somewhere is exported for every row, with an empty cell wherever that
row does not have the key.

Inside a cell the three states stay readable:

| state | cell |
|---|---|
| absent | empty cell - and no column at all when no row has the key |
| null | `null` |
| `''` | `""` |
| `[]` | `[]` |
| `{}` | `{}` |
| `0` | `0` |
| `false` | `false` |

A blank cell therefore always means "this row does not have the field", never
"the field was cleared", and a value that merely looks like the null token is
quoted on the way out.

**Audit.** The trail records one entry per field the edit changed, with `from`
and `to` holding the value on each side. A field that had no value on one side
of the edit is recorded as `null` on that side, **or** as `undefined` when the
key was not there at all - the entry keeps which of the two it was, because
"never filled in" and "cleared" are the two different histories support is
asking about. `formatEntry` renders an absent side as `unset`, a cleared side as
`null`, and an empty string as `""`.

## Invariants

These hold across the whole layer and are what the conformance checks look for:

1. A patch that omits a field never changes that field.
2. Round-tripping a record through `serialize`/`deserialize` preserves its key
   set and every value, `null` fields included.
3. `applyDiff(left, diffRecords(left, right))` deep-equals `right`.
4. A field that has been cleared reads as absent everywhere: `fieldState`,
   `hasField`, `profileSummary`, the export and the filter agree about it.
5. A field that is present and empty is present everywhere: same four call sites.
