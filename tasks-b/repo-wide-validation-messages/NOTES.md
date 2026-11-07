# repo-wide-validation-messages

stratum: repo-wide

A small admin app (users, products, orders, invoices, shipments, settings),
each with its own validator. `docs/validation-conventions.md` pins ONE
convention: validators return `[{field, code, message}]`, codes come from the
central registry, paths are dotted (`lines.0.qty`), messages are rendered
from registry templates with `{placeholders}`, and validators never throw
for input errors. Five modules each diverge in their own way; settings is
compliant and is the pattern the others should have followed.

## sub-problems

| hidden file | sub-problem | the bug in the fixture |
|---|---|---|
| 01-users-shape | issues are objects `{field, code, message}` | `users.js` returns plain strings |
| 02-products-no-throw | never throw for input errors; collect all issues | `products.js` throws `TypeError` on the first bad field |
| 03-orders-codes | codes come from the central registry | `orders.js` invents module-local codes (`too-small`, `missing-field`, ...) |
| 04-invoices-paths | dotted paths, array indices included | `invoices.js` emits bracket paths (`lines[0].amount`) |
| 05-shipments-messages | messages rendered from registry templates | `shipments.js` hardcodes its own wording |
| 06-cross-registry | the convention holds across all modules at once | cross-cutting sweep; guards live here |

Reference changes 5 files: `src/{users,products,orders,invoices,shipments}.js`.
`settings.js`, `registry.js`, `util/type.js` are already compliant.

## guards (pass on the untouched fixture)

- `02` *boundary values - zero price, zero stock, five tags - are valid* —
  broken products throws only on invalid input, so this returns `[]` as shipped.
- `06` *settings reports theme, pageSize and nested notifications per the
  convention* — settings is the compliant module; protects it from a rewrite.
- `06` *a fully valid record of every kind validates to no issues* — all six
  validators already return `[]` for valid input as shipped.

3 guards / 23 cases = 13% floor.

## interactions (>= 6)

- 01: nested address path x shape; null-as-missing x shape; one-issue-per-field
  in registry check order across four fields.
- 02: multiple bad fields collected in docs order (throw x collect-all);
  non-object root input (behaviour the visible suite never touches).
- 03: issues across several lines in line order x codes; `min` on the array
  itself (empty lines).
- 04: several lines at once; blank-string-missing on a dotted path; root
  fields preceding line issues in docs order.
- 05: message rendering on a nested path; docs-order x empty-string-missing
  x rendered messages across three fields.
- 06: every-module sweep — three-key issues with registry codes (catches the
  string shape, the throw, and the invented codes in one case).

## measured

Gate (`node tasks-b/_tools/verify-task.mjs repo-wide-validation-messages`):

- untouched fixture: visible 1/10 pass (exit 1, 9 failing), hidden 3/23 = 13%
  (the 3 guards)
- reference: visible 10/10 pass (exit 0), hidden 23/23 = 100%
- fixture shape: 14 text files, 614 lines; reference changes 5 source files
