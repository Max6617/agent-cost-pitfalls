# multi-file-shipping-quotes

stratum: multi-file

A parcel shipping-quote service: destination zones from a country table,
billable weight (max of actual and dimensional, rounded up to 0.5 kg), carrier
selection by price with eligibility rules, and a discount/surcharge/free-shipping
pipeline pinned by `docs/pricing.md`.

## sub-problems

| hidden file | sub-problem | the bug in the fixture |
|---|---|---|
| `01-dimensional-weight` | dim weight = cm3 / 5000, monotonic in volume | `src/dimweight.js` divides the divisor by the volume instead of the volume by the divisor |
| `02-billable-weight` | billable = max(actual, dim) rounded UP to 0.5 kg | `src/weight.js` rounds to the nearest step (`Math.round`) instead of up (`Math.ceil`) |
| `03-discount-and-surcharges` | discount is pct of the base freight only; surcharges added in full after | `src/pricing.js` computes the discount on the base+surcharges subtotal |
| `04-free-shipping` | threshold on the discounted freight, before surcharges; surcharges still payable | `src/quote.js` compares the pre-discount base against the threshold |
| `05-carrier-selection` | cheapest eligible; ties by lowest carrier code | `src/carriers.js` keeps the first carrier in list order on a price tie |

Bugs live in 5 modules. `zones.js`, `rates.js`, `surcharges.js`,
`util/format.js`, `bin/quote.js` and the data tables are correct as shipped
(noise and pipeline plumbing). The carrier table's file order
(mercury, pigeon, atlas, boreas) is load-bearing for the tie-break bug: list
order disagrees with code order at both pinned ties (zone 1 @ 3.5 kg:
boreas/pigeon at 810c; zone 3 @ 15 kg: atlas/mercury at 3250c).

## guards (pass on the untouched fixture, 4)

- `02` *a weight already on a half kilogram bills as itself* — nearest == up at an exact step
- `04` *freight that discounts to exactly the threshold ships free* — both pipelines agree it is free; pins ">=" and "surcharges still payable on a free quote"
- `05` *a carrier takes a parcel at exactly its maximum weight* — inclusive-boundary rule, no bug on this path
- `05` *only carriers serving the destination are quoted* — zone coverage, correct as shipped

## interactions (7)

- `01` *a light but bulky zone-3 parcel…* — dim weight decides carrier eligibility (24 kg vs 6 kg)
- `01` *a bulky parcel can land on a price tie…* — dim weight lands exactly on the zone-3 tie weight
- `02` *the billed weight decides whether a carrier can take the parcel* — 10.2 kg rounds to 10.5, pushing boreas (max 10) out
- `03` *fragile and oversize stack on the discounted freight* — both surcharges x discount order
- `04` *a fragile parcel just under the threshold…* — discount x threshold x surcharge together
- `04` *surcharges never count toward the free-shipping threshold* — threshold-before-surcharges
- `05` *an oversize tie is still settled by carrier code* — oversize exclusion x tie-break

## measured

- untouched fixture: 4/24 hidden cases (17%); visible suite 3/10 pass (7 failing, exit 1)
- reference: 24/24 hidden cases (100%); visible suite 10/10 pass
- fixture shape: 19 text files, 575 lines
- reference changes 5 source files: `src/{dimweight,weight,pricing,quote,carriers}.js`

Gate: `node tasks-b/_tools/verify-task.mjs multi-file-shipping-quotes` prints `ok`.
