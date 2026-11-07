# long-horizon-cart-merge

stratum: long-horizon

A shopping-cart service: guest carts per session token, account carts per
customer, and the merge that joins them at login. Time is injected everywhere
(`now` parameters); money is integer cents; the written contract is
`fixture/docs/cart-rules.md`.

## sub-problems

| hidden file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-quantity-cap` | same-SKU quantities summed, capped at min(stock at merge time, per-customer max), for the whole merged cart | `src/limits.js` `combineQuantities` caps each cart's quantity separately and sums the capped values |
| `02-pricing` | every line re-resolved against the catalog at merge time; snapshots never survive | `src/merge.js` folds guest lines and stops - it never re-resolves prices (or re-caps) |
| `03-coupons` | a coupon survives a merge only if it qualifies for the merged contents | `src/coupons.js` `qualifies` checks only the validity window; the schema's `minSubtotalCents`/`requiredSku` were never wired in |
| `04-idempotency` | a guest cart merges once, ever; the token is spent | `src/service.js` leaves the guest cart intact and keeps no record, so a second login merges it again |
| `05-expiry-and-parcels` | the pinned behaviours that are already right (expiry drop, parcel separation) and how they compose | no bug here by design - guards + composition cases |

Expiry (`availableUntil`, inclusive) and parcel separation are implemented
correctly in the fixture; they exist as guards and as interaction material.

## guards (pass on the untouched fixture)

- `01` *a merge that lands exactly on the cap keeps the full quantity* (boundary: 3+3 = cap 6)
- `03` *a coupon past its validity window is dropped at merge* (the window half of `qualifies` works)
- `05` *an expired guest line is dropped at merge and reported*
- `05` *a parcel is never combined, even for a SKU both carts hold*

## interactions (11)

- `01` expired guest line x cap; parcels x cap
- `02` parcel x repricing; totals x repricing
- `03` coupon x expiry (required SKU dropped); coupon precedence x qualification (no fallback); coupon x repricing + half-up rounding
- `04` repeated login x cap; spent token x later guest adds
- `05` availableUntil boundary x repricing; the whole-rules end-to-end merge

## measured

- untouched fixture: visible 3/10 pass (exit 1), hidden **4/24 = 17%**
- reference: visible 10/10 pass (exit 0), hidden **24/24 = 100%**
- reference changes 4 files: `src/{limits,merge,coupons,service}.js`
- fixture: 15 text files, 672 lines

Gate: `node tasks-b/_tools/verify-task.mjs long-horizon-cart-merge` prints `ok`.

A solution that greens the visible suite by patching only the four visible
symptoms still misses: account-side repricing, parcel repricing, stock-shrink
re-capping of account-only lines, the precedence/no-fallback coupon rule,
half-up discount rounding, and the spent-token rules - the hidden floor is 4/24.
