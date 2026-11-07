# Report query specification

The query language the reporting service agreed on. `src/` is an implementation of
this document; where the two disagree, this document is the specification and the
code is a defect.

A query is a plain document. `runQuery(rows, query)` reads it and returns one
page of results plus the counts a report header needs. Nothing else is involved:
no clock, no randomness, no locale, no I/O.

## 1. Rows, fields and values

A **row** is a plain object; a **field name** is a string and its **value** is the
row's own property of that name. Every value in a row is in exactly one of three
states:

| state | when |
|---|---|
| **present** | the row has the property and its value is neither `undefined` nor `null` |
| **null** | the value is exactly `null` |
| **missing** | the row has no such property, or the value is `undefined` |

Missing is not null. A rule that speaks of a missing field says nothing about an
explicit `null`, and a rule that speaks of `null` says nothing about a missing
field. Nothing in this document ever substitutes one for the other, and nothing
coerces a value into another type.

## 2. The query document

```js
{
  where:    <condition>,      // narrows the rows                 (section 4)
  group:    { by: [...], aggregates: { ... } },                    // (section 5)
  having:   <condition>,      // narrows the rows group produced   (section 6)
  select:   [ <field spec>, ... ],                                 // (section 7)
  order:    [ { field, dir }, ... ],                               // (section 8)
  offset:   <non-negative integer>,                                // (section 9)
  limit:    <non-negative integer> | null,                         // (section 9)
}
```

Every key is optional; `runQuery(rows, {})` returns every row unchanged, in the
order it arrived, with `total` equal to `rows.length`. A key that is not in the
table above is refused (`unknown-key`), and so is a key of the wrong JSON type.

The **stages run in this order**, whatever order the keys are written in:

```
where -> group -> having -> select -> order -> offset/limit
```

`rows` is never modified, and neither is the query document: a result shares no
array or object with its inputs except the row objects themselves.

## 3. Equality and ordering of values

Every present value has a **class**: `number`, `string`, `boolean`, `array` or
`object`. (`undefined` is not a value; a missing field has no class.)

**Equality.** Two values are equal when they have the same class and the same
content:

- numbers compare numerically, strings compare by code unit, booleans by identity;
- two arrays are equal when they have the same length and equal elements in the
  same positions;
- two objects are equal when they have the same own keys, in any order, with
  equal values.

Values of different classes are never equal: `3` is not `'3'`, `true` is not
`'true'`, `0` is not `false`, and nothing but `null` is equal to `null`. A
missing field is equal to nothing at all.

**Ordering.** Numbers are ordered numerically and strings are ordered by **UTF-16
code unit** — that is JavaScript's `<` on two strings, and never
`String.prototype.localeCompare`, which depends on the host's locale data. Two
values of different classes are ordered by class rank:

| class | rank |
|---|---|
| `number` | 0 |
| `string` | 1 |
| `boolean` | 2 |
| `array` | 3 |
| `object` | 4 |

`false` is ordered before `true`. Two arrays, or two objects, are ordered as
equal — only the next ordering key separates them. `null` and a missing field
have no rank: section 8 places them.

## 4. `where`

`where` is a **condition**: either a leaf or a combination of conditions.

A **leaf** is `{ field, op, value? }`. `field` names a field of the row, `op` is
one of the operators below, and `value` is the constant the field is compared
against.

| `op` | `value` | true when |
|---|---|---|
| `eq` | required | the field is present and equal to `value` (section 3) |
| `ne` | required | the field is not equal to `value` — so a **missing** field satisfies `ne` against every value, `null` included |
| `lt` `lte` `gt` `gte` | required | the field is present, `value` is present, and the two are orderable (section 3) and compare so |
| `in` | required, an array | the field is present and equal to one of the elements |
| `notIn` | required, an array | the field is not equal to any of the elements — so a **missing** field satisfies `notIn` against every list |
| `isNull` | forbidden | the field is null (present and `null`) |
| `isMissing` | forbidden | the field is missing |

The four ordering operators are **false whenever the pair is not orderable**:
against a missing field, against `null`, and against a value of a different
class (a number and a string, say). That is not an error and it is not a
coercion — `5 < '6'` is not true here, it is simply not a comparison this
language performs. The negation of such a comparison is `false` too: `not:
{ field: 'qty', op: 'lt', value: 10 }` is true for a row with no `qty`.

A leaf carries a `value` exactly when its operator takes one: writing a `value`
beside `isNull` or `isMissing` is refused (`bad-shape` at the leaf), and leaving
it out beside any other operator is refused too.

`in` and `notIn` use the same equality, so `in: [3]` does not match `'3'`;
`in: [null]` matches an explicit `null` and nothing else.

A **combination** is one of:

| node | true when |
|---|---|
| `{ and: [c, ...] }` | every child is true; `and: []` is true |
| `{ or: [c, ...] }` | at least one child is true; `or: []` is false |
| `{ not: c }` | `c` is false |

A node carries exactly one of the forms above: a node with both `field` and
`and`, or with neither, or with two combinators, is refused. The key that does
not belong to the form the node was read as is `unknown-key`; a node that fits
no form at all is `bad-shape`.

## 5. `group`

```js
group: { by: ['region', 'tier'], aggregates: { orders: { op: 'count' }, total: { op: 'sum', field: 'amount' } } }
```

**Grouping.** Every row of the input to this stage belongs to exactly one group,
identified by the tuple of its `by` values under the equality of section 3, with
one addition: a missing field is equal to another missing field, so all the rows
that lack the key form one group. A missing key and an explicit `null` key are
two different groups. `by: []` puts every row in a single group. An empty input
produces **no groups at all**, whatever the aggregates are, `by: []` included.

Groups appear in the order in which each group's **first row** appears in the
input to this stage. `order` (section 8) is what changes that.

**The grouped row** carries one key per `by` field — omitted entirely when that
field is missing in the group's rows, exactly as a missing projected field is
omitted (section 7) — followed by one key per aggregate alias. So a grouped row
is a row like any other, and `having`, `select` and `order` see the `by` fields
and the aliases and nothing else.

**Aggregates.** Each alias maps to `{ op, field? }`, where `op` is one of:

| `op` | operates on | result |
|---|---|---|
| `count` | the group's rows | with no `field`: how many rows. With a `field`: how many rows where that field is present and not `null`, whatever the class |
| `sum` | the `field` | the sum of the operand values; `0` when there are none |
| `min` | the `field` | the smallest operand value; `null` when there are none |
| `max` | the `field` | the largest operand value; `null` when there are none |
| `avg` | the `field` | the sum of the operand values divided by **how many operands there were**; `null` when there are none |

The **operand values** of `sum`, `min`, `max` and `avg` are the values of
`field` in the group's rows with the missing and the `null` ones dropped. Every
operand must be a number: a string, a boolean, an array, an object, `NaN` or an
infinity is refused (`not-a-number`), because a report that silently drops or
coerces such a value is a report nobody can reconcile. Note what that means for
the awkward groups: a group whose rows all have `null` in the field has no
operands, so its `sum` is `0` and its `min`, `max` and `avg` are `null`.

`sum`, `min`, `max` and `avg` require a `field`; `count` accepts one or none.

## 6. `having`

`having` is a condition like `where`, evaluated against the rows the previous
stage produced — the grouped rows when the query groups, the filtered rows when
it does not. It is therefore how a report keeps the groups whose aggregate meets
a threshold, and an alias is a field name like any other to it. A name that is
not there is a missing field, which is not an error.

## 7. `select`

`select` is the projection: an array of field specs, applied in order.

| spec | output |
|---|---|
| `'name'` | the source field `name`, under the same name |
| `{ field: 'name' }` | the same |
| `{ field: 'name', as: 'alias' }` | the source field `name`, under `alias` |
| `{ expr: 'qty * price', as: 'alias' }` | the value of the expression, under `alias`; `as` is required |

**The output row carries one key per spec, in the order the specs are written.**
A spec whose source field is missing contributes **no key at all** — the key is
not present with the value `null` or `undefined`. With no `select`, the rows pass
through as they are. Two specs that would write the same key are refused
(`bad-shape`).

An `expr` is a small arithmetic expression over the row:

```
expression := term (('+' | '-') term)*
term       := factor (('*' | '/') factor)*
factor     := number | name | '(' expression ')' | '-' factor
```

`*` and `/` bind tighter than `+` and `-`; both are left-associative; a `name`
is `[A-Za-z_][A-Za-z0-9_]*` and names a field of the row. A field that is
missing or `null` counts as `0` in an expression — an expression always has a
value — but a present value that is not a number is refused (`not-a-number`),
and a division by zero is refused (`division-by-zero`). The result is a plain
number: fractional values are not rounded.

## 8. `order`

`order` is an array of `{ field, dir }` keys, applied **left to right**: the
first key decides, the second breaks its ties, the third breaks theirs, and so
on. `dir` is `'asc'` by default and may be `'desc'`; anything else is refused
(`bad-direction`).

- An order key names a field of the row **as `select` produced it**. The renamed
  field is ordered by its new name, and a source field the projection did not
  keep is no longer there to order by: it is a missing field, and missing fields
  sort last.
- **`null` and missing values are placed after every present value, in both
  directions.** `desc` reverses the present values only.
- Rows that are equal under **every** key keep the relative order they arrived
  in — for a grouped query, the order of the groups, which is the order of their
  first row (section 5). The sort is stable, and it is the input order, not any
  other order, that settles it. A report built from the same rows in a different
  order is a different report only because its input was different.
- `order: []` orders nothing.

## 9. `offset`, `limit` and the result

`offset` is a non-negative integer, `0` when absent. `limit` is a non-negative
integer or `null`, which is the default and means "everything that is left".
Both are refused when they are something else (`bad-integer`): `-1`, `1.5`,
`'10'` and `true` are not a limit.

The two are applied **after** ordering, to the rows the pipeline produced:
`limit: 0` is a page with no rows, and an `offset` at or past the end is an empty
page. Neither changes `total`.

The result is a plain object:

| key | value |
|---|---|
| `rows` | the page: the projected rows, in order |
| `total` | how many rows the pipeline produced **before** `offset` and `limit` — with a `group`, the number of groups |
| `count` | `rows.length` |
| `offset` | the offset that was applied |
| `limit` | the limit that was applied, or `null` |

`total` is the number a report header prints ("37 rows"), and it counts exactly
the rows the query matched, not the page it happened to return. Paging through
the same query by adding `limit` to the offset must visit every row exactly once
and never change `total`.

## 10. Errors

Everything this language refuses is a `QueryError`, exported from the public
surface. It has `name === 'QueryError'`, a `message`, a `code` from the table
below, and a `path`: the location of the offending part of the document, written
as a dotted route from the root, which is called `query`, with array elements
addressed by their zero-based index. `query.where.and.1.op`, `query.order.0.dir`
and `query.limit` are paths.

| `code` | raised when | `path` |
|---|---|---|
| `unknown-key` | an object carries a key this document does not define there | that key, e.g. `query.foo` |
| `bad-shape` | a node is of the wrong type, or carries the wrong combination of keys | the node |
| `unknown-operator` | a condition leaf's `op` is not in the table of section 4 | the `op`, e.g. `query.where.and.1.op` |
| `unknown-aggregate` | an aggregate's `op` is not in the table of section 5 | the `op`, e.g. `query.group.aggregates.n.op` |
| `bad-direction` | an order key's `dir` is neither `'asc'` nor `'desc'` | the `dir`, e.g. `query.order.0.dir` |
| `bad-integer` | `offset` or `limit` is not a non-negative integer, or not `null` where `null` is allowed | `query.offset`, `query.limit` |
| `not-a-number` | an aggregate or an expression meets a present value that is not a number | the aggregate or the spec, e.g. `query.group.aggregates.total`, `query.select.1` |
| `division-by-zero` | an expression divides by zero | the spec, e.g. `query.select.2` |

Eight codes is two kinds of error. The first six are defects **of the document**
— `unknown-key`, `bad-shape`, `unknown-operator`, `unknown-aggregate`,
`bad-direction`, `bad-integer` — and they depend on nothing but the document.
The last two, `not-a-number` and `division-by-zero`, are defects **of the data**
and can only be found once a row is read.

Two rules make the refusals predictable:

1. **The document is validated in full before a single row is read.** A document
   defect raises on `runQuery([], query)` exactly as it does on a full table, and
   it raises before any row-dependent value could be reported. A data defect, by
   contrast, is raised by the first row that has it: a sum over text is not an
   error until a group with text in it is built.
2. **An unknown operator is never a no-op.** A leaf the engine does not
   understand is refused; it must not quietly match everything, match nothing or
   be treated as `eq`. The same holds for an aggregate, a direction and a limit.

When one document holds more than one defect the sections are checked in the
order they appear in this specification — `where`, `group`, `having`, `select`,
`order`, `offset`, `limit` — and within a section from left to right, parents
before children.

## 11. Worked examples

```js
const rows = [
  { region: 'north', qty: 2, amount: 10 },
  { region: 'south', qty: 1, amount: 5 },
  { region: 'north', qty: 3, amount: 7 },
]

runQuery(rows, {
  where: { field: 'qty', op: 'gte', value: 2 },
  group: { by: ['region'], aggregates: { rows: { op: 'count' }, total: { op: 'sum', field: 'amount' } } },
  having: { field: 'rows', op: 'gt', value: 1 },
  select: ['region', { field: 'total', as: 'amount' }],
  order: [{ field: 'amount', dir: 'desc' }],
  offset: 0,
  limit: 10,
})
// {
//   rows: [ { region: 'north', amount: 17 } ],
//   total: 1, count: 1, offset: 0, limit: 10,
// }
```

The `where` dropped the `south` row before the groups were built, so `north`
counts two rows and sums `10 + 7`; `having` kept the one group; the projection
renamed the total before `order` looked for `amount`; and `total` reports the one
group the query produced, not the page.

```js
runQuery([{ a: 1 }, { b: 2 }], { where: { field: 'a', op: 'eq', value: 1 } })
// { rows: [ { a: 1 } ], total: 1, count: 1, offset: 0, limit: null }
```

The row with no `a` is not equal to `1`: it is missing, and a missing field
matches nothing but `isMissing`, `ne` and `notIn`.
