# Merge rules

The contract for `merge`, `patch`, `diff`, `clone` and `equal`. These rules were
agreed with the teams that ship layered configuration; `src/` is the
implementation, and where the two disagree this document is right and the code is
a bug.

Throughout, an **object** means a *plain object*: a value whose prototype is
`Object.prototype`, such as an object literal or the result of `JSON.parse`.
Arrays, `null`, class instances, dates, maps, sets, regular expressions and
functions are **not** plain objects, however object-like they look. A value
created with `Object.create(null)` is not a plain object either — it has no
prototype at all, and the toolkit will not treat it as a record.

A **key** is an *own enumerable string key*. Symbol keys and non-enumerable
properties are outside the data model: every operation in this document ignores
them completely.

## 1. `merge(target, ...sources)`

The centre of the toolkit: merge layered configuration, later sources winning.

1. **Plain objects merge recursively.** When both sides hold a plain object, the
   result holds their recursive merge.
2. **Everything else is replaced.** If either side is not a plain object, the
   source value wins outright. Arrays do **not** merge element-wise and do not
   concatenate:
   ```js
   merge({ tags: ['a', 'b'] }, { tags: ['c'] })   // { tags: ['c'] }
   merge({ tags: ['a'] },      { tags: [] })      // { tags: [] }
   ```
   `undefined` and `null` are the two values that most often surprise callers
   here; rule 3 and rule 4 pin them down.
3. **A key present with the value `undefined` is not an absent key.** The two are
   distinct at every level, and the distinction survives the merge:
   - `undefined` is not a plain object, so by rule 2 it **overwrites** whatever
     the target held under that key. `merge({ a: 1 }, { a: undefined })` has an
     own key `a` whose value is `undefined`; it does not keep `1`.
   - `merge({ a: 1 }, { a: undefined })` and `merge({ a: 1 }, {})` are therefore
     different objects, and `hasOwn` tells them apart.
   - The key does *not* disappear, and it is not filled in from the target.
4. **`null` is a value.** It is not a plain object, so it overwrites:
   `merge({ a: { x: 1 } }, { a: null })` is `{ a: null }`. `null` never removes a
   key — removal has its own marker (rule 22).
5. **An empty object on the source side is a whole value.** `{}` is a plain
   object, so `merge({ a: { x: 1 } }, { a: {} })` is `{ a: {} }`: the target's
   `x` is gone. `merge({}, {})` is `{}`.
6. **Merging is shallow with respect to non-plain values.** A source value that is
   a date, map, set, regular expression, function or class instance is taken from
   the source; the result refers to the same instance the source does. The toolkit
   never inspects the internals of such a value, never converts one into a plain
   object, and never merges into one: the identity of the source's value is the
   identity the result holds.
7. **Arrays are copied, not shared.** Replacing a value with an array stores a
   fresh, deep copy: the result's array is a different object from the source's
   array, and so is every plain array or plain object inside it. Mutating the
   result, or the source, afterwards cannot be seen by the other.
8. **A merged object always dies with its inputs.** No operation in this document
   mutates the target or any source, at any depth: not assigning to a nested
   object, not sorting or pushing into an array, not deleting a key. Reading a
   frozen input is fine and no operation on frozen data may throw.
9. **The result is always freshly built, and always mutable.** Even when the
   target is frozen, the value returned for a merged position is an ordinary
   mutable plain object or array.
10. **`merge` takes any number of sources**, applied left to right.

## 2. Prototype safety

11. `__proto__`, `constructor` and `prototype` are **ordinary keys**. An override
    file is data, and keys are data:
    - A source key named `__proto__` is written to the result as an own key, and
      `hasOwn(result, '__proto__')` is true.
    - Writing it must not touch any prototype: not the result's, not
      `Object.prototype`, not the target's.
    - This holds at every depth, for a key named `__proto__` inside a nested
      object, inside an array element, or inside a patch.
12. **Only own keys are read.** A source that inherits an enumerable property
    (from a prototype, a class, or `Object.create(proto)`) contributes nothing for
    that property. Rules 1-11 apply to own keys.
13. **The result of merging plain objects is an ordinary plain object** — its
    prototype is `Object.prototype` — carrying the merged keys, including any
    dangerous-looking ones.

## 3. `clone(value)`

14. `clone` is `merge`'s deep-copy rule, on its own. A plain object or array is
    copied recursively, key by key and index by index, into fresh containers.
15. A value that is not a plain object and not an array — a date, map, set, class
    instance, function, regular expression, `NaN`, `Infinity`, `-0`, a string, a
    number, `null` — is returned **as it is**, by reference. `Object.is(clone(v),
    v)` is true for all of them.
16. Cyclic input is copied without hanging: a value reachable by two paths in the
    input is reachable by two paths in the copy, and a cycle in the input is a
    cycle in the copy. `clone` never returns one of its own inputs.

## 4. `deepEqual(a, b)`

17. Two values are equal when:
    - both are the same primitive, compared with `Object.is`, so `NaN` equals
      `NaN`, and `-0` does **not** equal `0`;
    - both are plain objects with the same own keys for which `deepEqual` holds
      pairwise;
    - both are arrays of the same length whose elements are `deepEqual`
      pairwise;
    - both are dates with the same time value;
    - otherwise they are the same reference.
18. Two distinct class instances, maps, sets or functions are therefore equal only
    when they are the same reference. Their contents are not compared.
19. `deepEqual` terminates on cyclic input. Two cycles that describe the same
    structure are equal; a cyclic structure never equals an acyclic one.

## 5. `diff(target, source)`

20. `diff` reports what `merge` would have to do to turn `target` into `source`.
    The result is the smallest patch that does it, or `null` when there is nothing
    to do — nothing to report is not the same as an empty patch, and callers
    branch on `null`.
21. `applyPatch(base, diff(base, other))` is `deepEqual` to `other`, for every
    `base` and `other` in the data model.
22. The patch is built with the same vocabulary as the merge:
    - a key in `source` but not in `target` is **added**, with the source's value;
    - a key in `target` but not in `source` is **removed**, and the patch marks it
      with the exported `REMOVED` token. `null` cannot be the marker, because
      `null` is a value (rule 4) and an override file that sets a key to `null`
      means it. A source value of `REMOVED` is the one value that **deletes** the
      key instead of writing it, at any depth;
    - a key in both whose values are not `deepEqual` is **changed** to the
      source's value;
    - plain objects on both sides produce a nested patch, and a nested patch is
      empty only when nothing below it changed, in which case that key does not
      appear in the patch at all.
23. **`undefined` versus absent is preserved by `diff`** exactly as rule 3
    preserves it through `merge`. `diff({}, { a: undefined })` is `{ a: undefined }`
    — a key to add, present with the value `undefined` — while
    `diff({ a: undefined }, {})` is `{ a: null }`, a key to remove. A patch key
    whose value is `undefined` is never dropped.
24. **Arrays are values, not collections.** An array that differs from the other
    side appears in the patch whole; differing elements are not addressed
    individually, and two arrays that are `deepEqual` are not a change at all —
    even when they are different array objects with the same contents.
25. Dates are compared by their time value (rule 17): two dates one millisecond
    apart are a change, two dates at the same instant are not.
26. `diff` terminates on cyclic input, and a difference deep inside a cycle is
    reported like any other.

## 6. `patch(base, ...overrides)`

27. `patch` is `merge` under the name the override workflow uses, and follows every
    rule above — including prototype safety, immutability and the `undefined`
    distinction. It exists so that an override file that sets a key to `undefined`
    is distinguishable from one that never mentioned the key.

## 7. Scope

28. No operation reads the clock, a random source, the environment or the
    filesystem. The same inputs always produce the same output, and an input is
    never changed by being passed in.
