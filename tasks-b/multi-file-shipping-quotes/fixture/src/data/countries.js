/**
 * Destination table: ISO 3166-1 alpha-2 country code -> shipping zone.
 *
 * Sales owns this table. Zones are priced per carrier in data/carriers.js;
 * adding a destination means adding a row here, nothing else.
 */
export const COUNTRIES = Object.freeze({
  DE: { name: 'Germany', zone: 1 },
  FR: { name: 'France', zone: 1 },
  PL: { name: 'Poland', zone: 2 },
  IT: { name: 'Italy', zone: 2 },
  SE: { name: 'Sweden', zone: 3 },
  ES: { name: 'Spain', zone: 3 },
  JP: { name: 'Japan', zone: 4 },
  AU: { name: 'Australia', zone: 4 },
})
