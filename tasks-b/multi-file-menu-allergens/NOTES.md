# multi-file-menu-allergens

**stratum:** multi-file
**prompt:** "Front-of-house is losing trust in the allergy information we send out. When the kitchen swaps an ingredient out of a dish, the old ingredient's allergens still show up against the dish, the shared-equipment 'may contain' notes are landing on dishes that never go near that equipment, and guests are being refused dishes outright over a mere trace note instead of being offered them with a warning. The kitchen's signed-off rules are in docs/ and the reproductions we managed to write are under test/, but those are not the whole acceptance criteria."

## sub-problems

| file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-substitution` | a substitution replaces the swapped ingredient's allergen set | `src/dishes.js` appends the substitute alongside the original entry instead of replacing it |
| `02-equipment-traces` | traces come only from the stations the dish actually uses; contains wins over traces | `src/equipment.js` unions every row of the matrix, ignoring the dish's own equipment list |
| `03-safety-severity` | a contains allergen excludes, a traces allergen only warns; board shape | `src/menu.js` derives status from contains ∪ traces, so `warning` is unreachable |
| `04-optional-garnish` | an optional extra counts only when the order asks for it | `src/allergens.js` never looks at the `optional` flag |
| `05-menu-board` | all four rules deciding one board | interaction file; no bug of its own |

Four modules have to change (`dishes.js`, `equipment.js`, `menu.js`,
`allergens.js`). The prompt names the substitution, equipment-scope and
severity symptoms; the garnish bug (`allergens.js`) and the
contains-wins-over-traces overlap rule are only discoverable from `docs/` and
the visible tests.

Files `01` and `02` are pure: fixing that one sub-problem greens the whole
file and no other fix moves it. `03`/`04` mix mainline cases with
interactions, and `05` needs everything at once.

## guards (the 4 cases that pass on the untouched fixture)

- *a contains match refuses the dish* (03) — contains-based exclusion works in the fixture; stops a rewrite that flips everything to warnings.
- *a guest with no allergies sees a clean board* (03) — pins the board shape and the every-dish-exactly-once rule.
- *assessing a dish that is not on the menu is an error* (03) — pins the error path.
- *an allergy nothing in the kitchen carries matches nothing* (05) — pins exact-match semantics on an unused allergen id.

## interactions (8)

- *the sesame board warns on the fryer and refuses only the prawn toast* (03) — equipment scope × severity (B×C).
- *the peanut garnish is the only peanut the satay carries when ordered* (04) — substitution × garnish (A×D); also guards a garnish "fix" that drops optionals even when ordered.
- *the default pad thai only warns a peanut guest* (04) — A×C×D on one assess.
- *the peanut board refuses nothing and warns only on the pad thai* (05) — all four bugs.
- *the gluten board refuses the two breaded dishes only* (05) — all four bugs.
- *the shellfish board warns on everything the grill touches* (05) — B×C.
- *without swaps in force the gluten board also refuses the soup and the pad thai* (05) — override-replaces-wholesale × all four.
- *ordering every extra rewrites the peanut board* (05) — includeOptional on the board × B×C; guards against ignoring `includeOptional`.

## measured

| | visible suite | hidden suite |
|---|---|---|
| untouched fixture | 3/10 pass, exit 1 (7 failing) | **4/23 = 17%** |
| reference | 10/10 pass, exit 0 | **23/23 = 100%** |

Reference changes 4 files: `src/{allergens,dishes,equipment,menu}.js`.
Fixture shape: 21 text files, 677 lines. `node tasks-b/_tools/verify-task.mjs
multi-file-menu-allergens` prints `ok`; `node tools/validate-tasks.mjs --dir
tasks-b` PASSes this task.

## where partial credit comes from

Each bug is its own module and its own hidden file, so an agent that finds and
fixes k of the 4 bugs scores roughly the corresponding files: 01 and 02 green
independently, the board cases in 05 need all four. An agent that greens the
visible suite has necessarily touched every bug area; the remaining gradient
lives in the overlap rule (traces exclude anything already in contains), the
override-replaces-wholesale rule, `includeOptional` applied to the board, and
exact alphabetical board contents.
