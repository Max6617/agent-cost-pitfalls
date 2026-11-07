/**
 * box office - public surface.
 *
 * Everything the kiosks, the batch jobs and the tests are allowed to import.
 * Modules under src/ that are not re-exported here are internal and may be
 * reorganised freely; the names below may not.
 */
export { seatLabel, parseSeat } from './labels.js'
export { createVenue, makeRow, seatAt, rowIndex, venueCenter2, areAdjacent, isContiguous } from './venue.js'
export { createHoldStore } from './holds.js'
export { blockKey, compareKeys, rankBlocks } from './scoring.js'
export { candidateBlocks, allocate } from './allocator.js'
export { createBoxOffice } from './boxoffice.js'
