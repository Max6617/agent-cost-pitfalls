# cross-nullability

**stratum:** cross-cutting (one policy, many call sites, easy to half-do)
**prompt:** "Support keeps reopening the same class of ticket. A customer asks us
to take their phone number off the account, and two screens later the old number
is back; a profile update that only mentions a name wipes the fields it never
mentioned; a search for customers with no phone number returns rows that have
one; and the billing export's blank cells mean different things depending on
which row you look at. Make the domain layer behave the way
docs/field-policy.md says it does. The tests under test/ are the reproductions
we managed to write down, not the whole acceptance criteria."

## The policy

`docs/field-policy.md` is the contract: a field is **absent** (no key), **null**
(the key is there and was explicitly cleared) or **empty** (`''`, `[]`, `{}`,
`0`, `false` — a real value). Ten modules read and write the same optional
fields, and each of them has to keep the three apart. The doc states what each
operation does with each state, what the serializer emits for each, and what a
filter answers for `= null`, `!= null`, `is missing`, `is present` and
`no value`.

## Sub-problems (one hidden file each)

| file | sub-problem | the conflation in the fixture |
|---|---|---|
| `01-patch-merge` | a patch that omits a field leaves it alone, `null` clears it, an empty value is a value; a merge's source may be absent or null | `patch.js` writes a patch `null` through as `null` instead of clearing; `changedFields` compares only whether a key is there, so a value edit is never reported |
| `02-serialize` | the wire format carries all three states, and a cleared field comes back cleared | `serialize.js` writes `"phone":null` correctly but `deserialize` skips every null-valued key, so a cleared field comes back missing; `roundTrip` is built on it |
| `03-validate` | an unmentioned field cannot be wrong, a cleared field is not a missing required field, an empty value is validated as itself | `validate.js` computes a field's state with `value == null ? 'absent' : stateOf(value)`, and refuses a `null` typed field as `required` unless the schema asks for it |
| `04-diff` | a key the edit removed is `unset`, a key it set to `null` is `set` with `null`, and the patch reproduces the record | `diff.js` keeps `null` out of `applyDiff`'s writes and has no nested-diff form, so `applyDiff` cannot reproduce a cleared field |
| `05-filter` | `= null` matches only the cleared, `is missing` only the absent, `no value` both, and an empty value is a value | `filter.js` answers `no value` with `!value` (empty values count as no value) and lets `= null` match an absent field |
| `06-csv-audit` | a column exists only when some row has the key; `null` and `''` do not render the same; the audit trail says which side of an edit had no value | `csv.js` renders both `null` and `''` as an empty cell and exports an absent key as `''`; `audit.js` returns `undefined` for a key that was there and null |

Eight source files change: `src/{patch,serialize,validate,diff,filter,csv,audit,profile}.js`.
The profile store's summary view (`getField`-based) goes through the same policy;
it is the sixth call site the hidden filter and export cases read.

## Measured

| | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 4/9 pass, exit 1 | **8/24 = 33%** |
| reference | 9/9 pass, exit 0 | **24/24 = 100%** |

`node tasks-hard/_tools/verify-task.mjs cross-nullability` prints `ok`
(fixture 19 text files / 1,495 lines; 24 authored cases across 6 files).

## Interaction cases (two sub-problems at once)

1. **02c** — a patch carrying `null` must survive `serialize`/`deserialize` as a
   cleared field while a patch carrying `''` survives as an empty one: patch and
   wire format together.
2. **01b** — a nested patch that clears one key and leaves the others alone, plus
   the reported change list: patch and merge together.
3. **04a** — a removed field and a field set to `null` in one diff, and
   `applyDiff` has to reproduce the record: diff and patch application together.
4. **04d** — the description of an edit has to keep "cleared" apart from "was
   never set" across three fields at once: diff and audit semantics together.
5. **05d** — a cleared, an empty and an absent field give three different answers
   to `= null`, `= ''` and `is missing`, and `no value` matches exactly two of
   them: filter and tri-state together.
6. **06b** — a cleared field, an empty string, an empty list and an empty object
   in one export, none of them rendering like another: export encoding and the
   tri-state together.
7. **06d** — an audit entry for a clear, for a removal and for a field that was
   never set, in one edit: audit and diff together.

## Guards (pass on the untouched fixture on purpose)

- a patch cannot reach a field it does not name (01a)
- a merge with no source is not a merge that clears the record (01d)
- a cleared field survives the round trip, and an absent one stays absent (02a, 02b)
- validation says nothing about the fields a patch leaves alone, and requires the
  schema's fields to be there (03a, 03d)
- clearing a field skips the value checks it would otherwise face (03e)
- a search for a value finds only the rows that hold it (05a)

Six guards in all: they stop a rewrite from breaking behaviour that is already
correct, and they set the floor at 33%.

## Where partial credit comes from

Each sub-problem owns its own file, and mutation testing confirms the isolation:
reverting any single fix fails only that file's cases. The scores that follow are
measured by overlaying the reference and then putting one conflation back:

| fix reverted | score |
|---|---|
| none (reference) | 24/24 = 100% |
| patch `null` writes a key | 22/24 = 92% |
| `changedFields` compares presence only | 23/24 = 96% |
| serialize drops null keys | 23/24 = 96% |
| validate: `null` is a missing field | 22/24 = 92% |
| validate: `reportFields` reports the flattering state | 23/24 = 96% |
| diff: `applyDiff` refuses to write `null` | 22/24 = 92% |
| diff: a `null` on the right is a removal | 21/24 = 88% |
| filter: `no value` includes empty | 22/24 = 92% |
| filter: `= null` matches absent too | 21/24 = 88% |
| csv: one blank cell for null and empty alike | 21/24 = 88% |
| csv: an absent key exports as a `null` cell | 22/24 = 92% |
| audit: a missing `from` is reported as `null` | 23/24 = 96% |

A solution that fixes only what the visible suite exercises — the merge/patch
conflation, the diff, the filter and the export — lands near 60%: the visible
cases are deliberately the easy end of each sub-problem and none of them touch
`docs/field-policy.md`'s validation or audit rules.
