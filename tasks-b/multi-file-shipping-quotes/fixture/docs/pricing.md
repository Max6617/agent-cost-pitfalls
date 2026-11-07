# Pricing rules

The rules sales and logistics signed off for parcel quotes. `src/` is the
implementation; when the two disagree, this document is right and the code is a
bug.

## 1. Destinations and zones

A request names a destination by ISO 3166-1 alpha-2 country code, matched
case-insensitively. The zone for a quote comes from the country table
(`src/data/countries.js`); nothing else assigns zones. A country that is not in
the table is one we do not serve: the quote is `null`, not an error and not a
guess at a neighbouring zone.

## 2. Dimensional weight

Carriers charge for space as well as mass. A parcel's dimensional weight is its
volume converted to kilograms at **5000 cm3 per kilogram**:

```
dimWeightKg = (length x width x height, in cm) / 5000
```

A 40x30x20 cm parcel is 24000 cm3, so its dimensional weight is **4.8 kg**; a
bigger box always weighs more dimensionally than a smaller one.

## 3. Billable weight

The billable weight is the **greater of actual and dimensional weight**,
**rounded UP to the next 0.5 kg**. Rounding is always upward, never to the
nearest step: 4.2 kg bills as 4.5 kg, and 4.6 kg bills as 5.0 kg. A weight that
already sits exactly on a half kilogram bills as itself.

The smallest billable weight is 0.5 kg.

## 4. Freight

Each carrier prices a zone as a **base fee plus a per-kilogram rate charged on
the billable weight** (`src/data/carriers.js`, integer cents):

```
baseCents = rate.base + rate.perKg x billableWeightKg
```

## 5. Eligibility and carrier selection

A carrier is eligible for a parcel when all of these hold:

- it serves the destination zone,
- the billable weight is **less than or equal to** its `maxKg` — a parcel at
  exactly the maximum is accepted,
- it accepts oversize parcels (see section 6), or the parcel is not oversize.

The quote goes to the **cheapest eligible carrier**. If several carriers tie on
price, the tie is broken by **lowest carrier code** (plain string order:
`atlas` beats `mercury`), never by the order the carriers happen to be listed
in. If no carrier is eligible, the quote is `null`.

## 6. Surcharges

A parcel is **oversize** when its longest side exceeds 100 cm.

Surcharges, applied in this order:

1. **fragile** — 8% of the base freight (the *undiscounted* base), rounded
   half-up to the cent,
2. **oversize** — a flat 1500 cents.

Surcharges are added on top of the discounted freight and are themselves
**never discounted**: the discount below applies to the base freight only.

## 7. Discounts

A request may carry a `discountPct` (loyalty or promo). The discount is that
percentage **of the base freight**, rounded half-up to the cent, and comes off
the freight only — never off surcharges.

## 8. Free shipping

Freight ships free when the **discounted freight** (base minus discount)
reaches the threshold of **6000 cents**. The comparison is made:

- **after** the discount, and
- **before** surcharges — surcharges never count toward the threshold.

Free shipping waives the freight only. **Surcharges remain payable in full**
on a free-shipping quote.

## 9. Totals

```
totalCents = (freeShipping ? 0 : baseCents - discountCents)
           + surcharges.fragileCents
           + surcharges.oversizeCents
```

All money on the public surface is integer cents. Percentages are rounded
half-up to the cent where they produce a fraction.
