# spec-query-engine

**stratum:** spec-implementation
**prompt:** "The reporting service is coming back with numbers nobody will sign off. Sort a report by two keys and the rows come back in an order the spec does not describe, filters on a column half the export leaves empty keep everything, and the row count in the header does not match the rows in the table. Paging is the worst of it: a row that belongs on the first page turns up on the second, so the same rows keep reappearing as we page through a report. Make the engine behave the way docs/query-spec.md says it does; the reproductions under test/ are the ones we managed to write down, not the whole acceptance criteria."

The contract is `fixture/docs/query-spec.md` (~350 lines): the query document, the
three states a field can be in, equality and ordering rules, the operator table,
grouping and the five aggregates, the projection and its expression grammar, the
ordering rules, the page and its counts, and a code/path table for every refusal.
The fixture is an engine that deviates from it in eight modules, with no comment
anywhere naming a defect.

## Sub-problems (one hidden file each)

| file | cases | sub-problem | the deviation in the fixture |
|---|---|---|---|
| `01-filtering` | 4 | present / null / missing, `in`/`notIn`, no coercion, combinators | `condition.js` returns `true` for any leaf whose field is missing (and for any operator it does not know, via `default`), so a filter on an unfilled column keeps every row; `values.js` `valuesEqual` compares through `String()` and treats missing and null as the same empty cell |
| `02-ordering` | 4 | several keys, where null/missing go, code-unit strings, stability | `order.js` runs one sort pass per key from first to last (so the **last** key dominates and the earlier ones only break its ties) and settles ties on `JSON.stringify(row)` instead of arrival order; `values.js` `compareValues` reads an empty cell as `0` and compares text with `localeCompare` |
| `03-grouping` | 4 | what a group is, the grouped row, the five aggregates, `where` vs `having` | `aggregates.js` reads every cell through `Number` (a `null` becomes an operand worth 0, text is dropped silently), `sum` over no operands is `null`, `count` of a field counts rows, `avg` divides by the rows rather than by the operands; `group.js` sorts the groups by key (destroying first-appearance order) and writes `null` for a missing group key |
| `04-projection` | 3 | renames, computed fields, a missing source | `project.js` writes every key a spec names even when the source field is missing (`undefined` rather than no key at all) and its expression parser gives `+ - * /` one precedence level, so `qty + price * 2` is `(qty + price) * 2` |
| `05-pagination` | 6 | `total`, `limit 0`, paging against the order, group boundaries | `engine.js` takes the page window **before** grouping, ordering and projection, reports `total` as the size of the page it printed, and `paginate` treats a falsy limit (0) as "no limit"; the group stage reads the whole export rather than the filtered rows |
| `06-errors` | 3 | the grammar, the codes, the paths | `validate.js` checks only the shape of a condition tree: unknown keys, operators, aggregates, directions and limits are never refused, and the unknown operator silently matches everything |

Eight source files change in the reference:
`src/{values,condition,aggregates,group,order,project,engine,validate}.js`.
No single edit fixes more than one file's cases, and no hidden case is fixed by
more than one of them being right (measured below).

## Measured

| | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 6/13 pass, exit 1 (7 fail) | **4/24 = 17%** |
| reference | 13/13 pass, exit 0 | **24/24 = 100%** |

Which file each hidden case needs, measured by reverting one reference file at a
time out of an otherwise correct tree (proxies, not solutions):

| reverted | hidden cases that move |
|---|---|
| `engine.js` | 8 — every grouped page, every total, `limit 0`, both paging walks |
| `order.js` | 3 — multi-key precedence, null/missing placement, stability |
| `values.js` | 3 — `ne`/`notIn` over text, no coercion for `eq`/`in`, code-unit strings |
| `condition.js` | 2 — a missing field matching nothing, ordering ops that are not comparable |
| `project.js` | 2 — the expression grammar, a missing projected source |
| `validate.js` | 2 — the unknown operator, the rest of the grammar |
| `aggregates.js` | 1 — the all-null group |
| `group.js` | 1 — the missing group key and the group order |

The other direction — fixing one file out of the untouched fixture — measures
5/24 (`aggregates`, `condition`, `group`) to 11/24 (`engine`), so the sub-problems
are independent but very unequal in size.

Partial credit: a tree that greens the visible suite with the four files it
exercises (`condition`, `aggregates`, `order`, `engine`) measures **16/24 = 67%**;
the same plus `values` measures **19/24 = 79%**. Everything the visible suite
cannot see — code-unit comparison, the all-null group, the group order and the
missing group key, the expression grammar, the projected missing key, the whole
error table — is where the last quarter of the suite lives.

## Interaction cases (7 of 24)

Each needs two sub-problems right at the same time:

- `02` a missing sort key must go last **and** the limit must keep the rows that
  have one — the page is wrong if either the placement or the window is wrong.
- `03` `where` narrows the rows the aggregates see while `having` filters the
  groups they produced: the fixture groups the unfiltered export, so the
  aggregate and the surviving group both change.
- `03` a group whose operands are all `null` needs the missing/null rule (null is
  not an operand) and the aggregate identities (`sum` 0, `min`/`max`/`avg` null,
  `count` of a field 0).
- `04` an order key that names a **renamed** field needs projection and ordering
  to agree on when the rename happens; ordering the source rows instead leaves
  every row missing that key.
- `05` an offset that lands exactly on a group boundary needs grouping, ordering
  and the window to be in the documented order.
- `05` an aggregate over a group that a `limit` truncates: the group is built
  before the page, so its `count` and `sum` are the whole group's.
- `06` the unknown operator is refused at `query.having.op` on a **grouped**
  query — the document is validated before any row (or group) exists.

## Guards (pass on the untouched fixture, on purpose)

- `01` combinators: `and: []` is true, `or: []` is false, `not` negates.
- `03` `count` and `sum` over a group with no empty cells.
- `05` an offset past the end is an empty page.
- `06` a query the language accepts runs without complaint, and `QueryError` is
  an `Error`.

Four guards, a 17% floor. Nothing else passes by accident on the untouched
fixture.

## Deviations from the brief, and why

- **Six files, 24 cases, not five and 20.** `05-pagination` carries six because
  the engine holds three separate deviations (the window before the pipeline, the
  total as the page, a falsy limit) and two of the six are the group-boundary and
  aggregate-before-limit interactions.
- **`total` counts rows, a `count` aggregate counts rows.** They are different
  things in the document (`total` is the pipeline's row count; `count` is a
  per-group cell) and the fixture gets both wrong in different modules.
- **Documented but untested rules**: the class-rank table for ordering two values
  of different classes, deep equality for array and object values, `by: []` over
  a non-empty input, `division-by-zero` and `not-a-number` as *data* errors (the
  suite tests neither), duplicate output names, and the check order when one
  document holds two defects. They are in the spec so the implementation has one
  story; the suite does not spend a case on each.
- **The fixture keeps `src/util/format.js`, the CLI and the example export** as
  noise. Nothing in `src/` reads a clock, a random source, the locale's collation
  or the working directory, and every hidden case builds its own rows, so the
  six files can run in any order.
