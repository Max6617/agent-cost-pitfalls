# edge-deep-merge

**stratum:** edge-case-dense
**prompt:** "Configuration merges are going wrong in ways that are hard to see. An override file that was supposed to extend a list silently empties it instead, a patch from the service wipes settings it never mentioned, one team's config ended up as a key on Object.prototype, and the diff keeps reporting a change where nothing changed at all. Please make the toolkit behave the way docs/merge-rules.md says it does - the tests under test/ are the reproductions we managed to write down, not the whole acceptance criteria."

The fixture is a plausible implementation: `merge`/`patch`/`diff`/`clone`/`deepEqual` over
layered JSON config, 22 files, ~945 lines, pure ESM, no dependencies. `docs/merge-rules.md`
is the contract (28 numbered rules) and the code disagrees with it in six places.

## Sub-problems (each its own hidden file)

| file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-merge-shape` | nested merge; arrays are values; sources applied left to right | `merge.js` runs a two-pass copy whose second pass writes the source's array positions over the target's, so a list is merged element-wise instead of replaced |
| `02-undefined-null-empty` | a key present as `undefined` is not an absent key; `null` is a value | both passes `continue` on `value === undefined`, so an override that names a key as undefined drops it and keeps the old value |
| `03-prototype-safety` | `__proto__`, `constructor`, `prototype` are data and reach no prototype | pass 2 writes with `out[key] = ...`; for `__proto__` that goes through the accessor, so the key becomes a prototype instead of a value (pass 1 does not write it at all) |
| `04-exotic-values` | dates, maps, class instances, functions, `NaN`, `-0`, `Infinity` | `clone.js` recurses into anything object-like, so a `Date` becomes `{}` and an instance loses its prototype |
| `05-cycles-immutability` | a cycle in the input is a cycle in the result; no input is touched | `merge.js` re-enters `clone` per source value instead of memoising source to result, so a self-referential source is rebuilt rather than re-pointed; `readKey` is not used, so a key with an accessor reads the wrong value |
| `06-diff` | what counts as added / removed / changed | `diff.js` marks a removed key with `null`, which rule 4 forbids because `null` is a value; the fixture exports `REMOVED` for this and never consumes it |

`REMOVED` is the one piece of the public surface a solver has to notice rather than invent: it
is exported from `src/index.js`, declared in `symbols.js`, named in rules 22/23, and used by
`test/diff.test.js`, but nothing under `src/` reads it.

## Measured

| arm | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 8/12 pass, exit 1 | **8/23 = 35%** |
| reference (`reference/`) | 12/12 pass, exit 0 | **23/23 = 100%** |
| "green the visible suite and stop" | 12/12 pass, exit 0 | **18/23 = 78%** |

The third arm is the measured number and it is **above the 40-60% band**. The symptoms the
prompt names are one small edit apart (behave on `undefined`, write dangerous keys with a
descriptor, honour `REMOVED`), and that edit also satisfies the undefined cases and the
top-level prototype cases, because they are the same code path. What holds the arm below 100%
is the interactions: the cyclic source, the nested dangerous key, the `__proto__` that rides
along a cycle, and the removal marker. No visible case can reproduce those without pointing
straight at the fix. Removing visible cases does not move the arm (18/23 with 12 visible cases
and with 10), because the residual failures are code the visible suite never exercises.

Reference changes **3 source files**: `src/merge.js`, `src/diff.js`, `src/clone.js`.

## Interaction cases (seven)

1. **a cyclic source that also carries a `__proto__` key** - `05`: cycle preservation and
   prototype safety in one input.
2. **a `__proto__` key inside a nested object, through diff and patch** - `03`: prototype
   safety, the removal marker, and `hasOwn`-versus-accessor reads.
3. **a nested array replaces and the copy does not alias the config it came from** - `01`:
   array semantics and immutability.
4. **a non-plain value inside a replaced array** - `04`: exotic values, array replacement, and a
   copy that does not alias.
5. **a diff over an array of objects holding `NaN` and dates** - `06`: equality, "arrays are
   values", and exotic values.
6. **in one source, a dangerous key and an `undefined` key** - `03`: prototype safety and the
   undefined distinction.
7. **`diff({a: undefined}, {})`** - `02`: the undefined distinction and the removal path.

## Guards (4, pass on the untouched fixture on purpose)

- `an empty array on the source side clears the list, an empty object empties the record`
- `a nested array next to other keys still replaces, and is not shared afterwards`
- `merging does not mutate either input, at any depth`
- `a diff over two arrays with the same contents is not a change, a different one is`

Measured floor with these four: 8/23 = 35%, just inside the hard ceiling. The suite is 23 cases
across 6 files, so a solution that fixes one sub-problem moves that file and no other.

## Fixture notes

- The bugs sit in three modules (`merge.js`, `diff.js`, `clone.js`), plus an export nobody
  consumes; no single edit greens the suite.
- `src/util/keys.js`, `src/symbols.js`, `src/view.js`, `src/config.js` and `bin/cfgmerge.js` are
  correct on purpose: they make the contract readable and show what "own key" and "guarded
  write" are supposed to mean.
- Nothing reads the clock, a random source or the environment. `bin/cfgmerge.js` is the only
  thing that touches the filesystem and no hidden case runs it.

## Unsure / deviations

- The visible-only arm measures 78%, above the checklist's band. Recorded rather than hidden;
  the enforced ceiling (untouched ≤ 35%) holds, at exactly 35%.
- Rule 12 of the contract ("only own keys are read") grades as a guard, not a discriminator: a
  value whose prototype is not `Object.prototype` is not a plain object to this toolkit at all,
  so an inherited key cannot reach the merge through the public surface.
- `deepEqual` is reached both directly and through `diff`; the visible suite exercises it only
  for cycles, so its `Object.is` semantics (`NaN`, `-0`) are hidden-only.
