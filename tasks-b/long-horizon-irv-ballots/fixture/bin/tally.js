#!/usr/bin/env node
/**
 * A small demo count: the city council by-election from the README, tallied
 * from the command line. Run with `node bin/tally.js`.
 */
import { createElection } from '../src/index.js'

const election = createElection({ candidates: ['ada', 'bob', 'cy'] })

election.addBallots([
  { id: 'b-001', ranks: ['ada', 'bob'] },
  { id: 'b-002', ranks: ['ada', 'bob'] },
  { id: 'b-003', ranks: ['ada', 'cy'] },
  { id: 'b-004', ranks: ['bob', 'ada'] },
  { id: 'b-005', ranks: ['bob', 'ada'] },
  { id: 'b-006', ranks: ['cy', 'ada'] },
  { id: 'b-007', ranks: ['cy', 'bob'] },
])

console.log(JSON.stringify(election.tally(), null, 2))
