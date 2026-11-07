# Menu allergen rules

The rules the kitchen signed off for the guest allergy letters and the floor
tablets. `src/` is the implementation; when the two disagree, this document is
right and the code is a bug.

## 1. Ingredients

Every ingredient the kitchen buys is registered in `data/ingredients.json`
with the allergens it inherently carries — its contains set:

```js
{ id: 'peanut-sauce', name: 'Peanut sauce', allergens: ['peanut', 'soy'] }
```

Allergen ids are lowercase tokens (`peanut`, `gluten`, `dairy`, ...) and are
compared exactly. An ingredient with no inherent allergens has an empty list.
Traces an ingredient might pick up from shared equipment are NOT part of its
contains set; that is what the equipment matrix is for (§5).

## 2. Dishes

`data/dishes.json` describes each dish as a list of ingredient entries and the
equipment stations it is prepared on:

```js
{
  id: 'satay',
  name: 'Chicken satay',
  ingredients: [
    { ref: 'chicken' },
    { ref: 'peanut-sauce' },
    { ref: 'crushed-peanuts', optional: true },
  ],
  equipment: ['grill'],
}
```

A dish's **contains** set is the union of the allergens of its effective
ingredient entries — after substitutions (§3) and the optional-extra rule (§4).

## 3. Substitutions

`data/substitutions.json` is the substitution list in force for the day:

```js
{ dish: 'satay', replace: 'peanut-sauce', with: 'sunflower-sauce' }
```

A substitution **replaces**: the `replace` ingredient does not go into the dish
at all, and the `with` ingredient goes in its place. The dish's contains set is
computed from the substituted list, so a swapped-out ingredient's allergens
never appear against the dish, and the substitute's own allergens always do.

Substitutions apply independently: two substitutions on one dish each rewrite
their own entry, and a substitution whose `replace` the dish does not list has
no effect. An entry flagged optional stays optional when it is substituted.

## 4. Optional extras

An entry flagged `optional: true` is an extra the order has to ask for — the
crushed peanuts, the croutons, the walnut crust. The menu board and every
default query reflect the dish **as served by default, without the extras**.
Passing `{ includeOptional: true }` assesses the order as asked: every optional
entry counts, and its allergens join the contains set.

## 5. Shared equipment and traces

`data/equipment.json` is the kitchen's agreed matrix of what each station may
carry **traces** of:

```js
{ fryer: ['gluten', 'sesame'], grill: ['fish', 'shellfish'] }
```

A dish's **traces** set is the union of the matrix rows for the stations the
dish is actually prepared on — its own `equipment` list, nothing else. A
station the dish does not use contributes nothing, and a station the matrix
does not list, or lists with an empty row, carries no traces.

Traces are strictly "may contain". An allergen the dish actually contains is
reported as contains and never as a trace: the traces set excludes anything
already in the contains set.

## 6. Severity and the guest board

For a guest with an allergy set, `assess(dishId, allergies, opts?)` returns:

```js
{
  dish: 'satay',
  status: 'safe' | 'warning' | 'unsafe',
  contains: [...],   // the dish's contains set, alphabetical
  traces: [...],     // the dish's traces set, alphabetical
  matched: [...],    // the guest's allergens found in contains, alphabetical
  warnings: [...],   // the guest's allergens found in traces, alphabetical
}
```

The severity ladder:

| situation | status |
|---|---|
| any of the guest's allergens in **contains** | `unsafe` — the dish is refused |
| none in contains, but any in **traces** | `warning` — served with a may-contain note |
| neither | `safe` |

A trace never refuses a dish on its own.

`safeMenu(allergies, opts?)` runs the ladder over the whole menu and returns
the board:

```js
{ safe: [...], warning: [...], excluded: [...] }
```

Every dish appears in exactly one list and each list is alphabetical by dish
id. A guest with an empty allergy set sees every dish as safe, and an allergy
id nothing in the kitchen carries matches nothing.

## 7. Errors

Assessing a dish id that is not on the menu throws an `Error` with the message
`unknown dish: <id>`. Data that references an unregistered ingredient refuses
to load with `unknown ingredient: <id>`.
