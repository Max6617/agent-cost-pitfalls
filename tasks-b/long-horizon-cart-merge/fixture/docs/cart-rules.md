# Cart rules

The rules storefront and merchandising signed off for the cart service. `src/`
is the implementation; when the two disagree, this document is right and the
code is a bug.

## 1. Carts, lines, and money

A **guest cart** lives behind a session token; an **account cart** lives behind
a customer id. Both hold **lines**: `{ sku, qty, giftWrap, addedAt,
unitPriceCents }`. `addedAt` is an ISO date string supplied by the caller -
nothing in the service reads the clock.

Money is **integer cents**, always. A line's `unitPriceCents` is the price the
line was *shown at*: a snapshot for display, taken from the catalog when the
line entered its cart. The catalog (`src/catalog.js` via the service) is the
only authority on what anything costs.

Dates compare as ISO strings, and every window in this document is **inclusive
of its last day**: a product with `availableUntil: '2026-02-01'`, or a coupon
with `validUntil: '2026-02-01'`, is still good on 2026-02-01 and gone on
2026-02-02.

## 2. Adding to one cart

Within a single cart, adding a plain line for a SKU the cart already holds
combines them into one line. The combined quantity is topped up only as far as
the **cap in force at that moment** (§4): adding more than the cap holds is a
top-up, not an error.

A **gift-wrapped parcel never combines** - not with a plain line, not with
another parcel, not even for the same SKU. Each parcel is its own line, and
parcels sit outside the cap entirely (§4 pins this).

Adds that make no sense are refused without touching the cart:
`unknown-sku` when the catalog has no such SKU, `invalid-quantity` when `qty`
is not a positive integer, `out-of-stock` when the cap is already zero.

## 3. The merge at login

When a customer logs in, the guest cart behind the presented token is merged
into their account cart. The merge is a **repricing and re-capping event for
the whole cart**, not just for what crossed over:

- Every guest line crosses into the account cart: parcels as they are, plain
  lines joining their SKU's plain line. A merged line keeps the **earlier** of
  the two `addedAt` values.
- **Every** line in the merged cart is then re-resolved against the catalog:
  its `unitPriceCents` becomes the catalog's price **at merge time**. A display
  snapshot never survives the merge, whatever cart it came from, and parcels
  reprice like any other line.
- Every plain line is re-capped against the cap in force **at merge time**
  (§4), including lines that never crossed over - stock may have shrunk since
  they were added. A line capped down to nothing is removed.
- Any line whose product is no longer available at merge time is **dropped**,
  whichever cart it came from, and reported in the merge's `droppedSkus` -
  guest lines first, in cart order, then account lines.

## 4. The cap

The cap for a SKU is the **smaller of the stock on hand and the per-customer
maximum**, and it is computed against the stock **of the moment** every time it
is needed - the warehouse reports, the service's stock moves, and yesterday's
cap means nothing today.

The cap governs the **plain** quantity of a SKU. Gift-wrapped parcels were
made up by the gifting service before they reached the cart; they are outside
the cap, and no merge may ever reduce, remove, or combine them.

## 5. Coupons

A coupon looks like
`{ code, percentOff, minSubtotalCents?, requiredSku?, validUntil? }`.

**Attaching** a coupon asks only that the code exists and is within its
validity window: `applied`, else `rejected`. Whether the cart actually *earns*
the coupon is judged when the contents are final - at merge, and again at
checkout - never at attach time.

At merge, an account cart may carry only one coupon. The account's own coupon
**outranks** the guest's; the guest's is discarded. The surviving coupon is
then kept **only if it qualifies for the merged contents**:

- it is within its validity window at the merge's `now`;
- the merged subtotal (at the re-resolved prices, before any discount) reaches
  `minSubtotalCents`, when the coupon names one;
- `requiredSku`, when named, is present in the merged cart, wrapped or not.

A survivor that fails any of these is dropped, and the cart ends with **no**
coupon - losing the account's coupon opens no fallback to the guest's. A cart
view shows its attached coupon optimistically; qualification is a merge-time
(and checkout-time) judgement only.

The discount is `percentOff` of the subtotal, **rounded to the nearest cent,
half up**: a 10% coupon on a 4005-cent subtotal discounts 401 cents.

## 6. A guest cart merges once, ever

A merge **empties the guest cart** and spends its token. From then on, logging
in with that token - to the same account or a different one - is a no-op
reported as `already-merged`: nothing merges twice, and items added to the
guest cart *after* its token was spent never merge anywhere.

Login statuses: `merged` when a guest cart crossed over, `already-merged` for a
spent token, `no-guest-cart` when the token names no cart or an empty one. An
`already-merged` login changes nothing and reports `couponKept: false`.

## 7. The view

`view()` and `guestView()` render a cart: lines ordered by `addedAt`, ties by
SKU, each with `lineTotalCents = qty * unitPriceCents`; then `subtotalCents`,
the `discountCents` of the attached coupon (§5), and `totalCents`. A cart with
nothing in it views as empty lines and zero totals.
