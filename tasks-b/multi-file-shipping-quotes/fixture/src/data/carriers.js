/**
 * Carrier table, in the order our contracts were signed.
 *
 * Rates are integer cents: a base fee plus a per-kilogram rate charged on the
 * billable weight. `maxKg` is the heaviest parcel the carrier accepts,
 * `zones` the destinations it serves, and `oversize` whether it takes parcels
 * whose longest side is over a metre.
 */
export const CARRIERS = Object.freeze([
  {
    code: 'mercury',
    name: 'Mercury Express',
    maxKg: 20,
    zones: [1, 2, 3, 4],
    oversize: true,
    rates: {
      1: { base: 499, perKg: 116 },
      2: { base: 590, perKg: 136 },
      3: { base: 700, perKg: 170 },
      4: { base: 950, perKg: 226 },
    },
  },
  {
    code: 'pigeon',
    name: 'Pigeon Post',
    maxKg: 5,
    zones: [1, 2],
    oversize: false,
    rates: {
      1: { base: 320, perKg: 140 },
      2: { base: 410, perKg: 156 },
    },
  },
  {
    code: 'atlas',
    name: 'Atlas Freight',
    maxKg: 30,
    zones: [1, 2, 3, 4],
    oversize: true,
    rates: {
      1: { base: 450, perKg: 130 },
      2: { base: 520, perKg: 150 },
      3: { base: 610, perKg: 176 },
      4: { base: 800, perKg: 240 },
    },
  },
  {
    code: 'boreas',
    name: 'Boreas Parcel',
    maxKg: 10,
    zones: [1, 2, 3],
    oversize: false,
    rates: {
      1: { base: 390, perKg: 120 },
      2: { base: 470, perKg: 140 },
      3: { base: 560, perKg: 160 },
    },
  },
])
