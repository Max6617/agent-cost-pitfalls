/**
 * simulate — replay a JSON script of events against a fresh house.
 *
 *   node bin/simulate.js script.json
 *
 * The script is an array of events, applied in order:
 *   { "op": "list",  "id": "lot-1", "startPrice": 50000, "reserve": 61000, "endsAt": 1000 }
 *   { "op": "bid",   "id": "lot-1", "bidder": "amy", "amount": 55000, "max": 60000, "at": 100 }
 *   { "op": "close", "id": "lot-1", "now": 1025 }
 *
 * Each event prints one JSON line with its outcome. The desk uses this to
 * replay a dispute tick by tick.
 */
import { readFileSync } from 'node:fs'
import { createAuctionHouse } from '../src/index.js'

function main() {
  const scriptPath = process.argv[2]
  if (!scriptPath) {
    console.error('usage: node bin/simulate.js script.json')
    process.exit(2)
  }
  const events = JSON.parse(readFileSync(scriptPath, 'utf8'))
  const house = createAuctionHouse()

  events.forEach((event, i) => {
    let outcome
    if (event.op === 'list') outcome = house.list(event)
    else if (event.op === 'bid') outcome = house.placeBid(event.id, event)
    else if (event.op === 'close') outcome = house.close(event.id, event.now)
    else outcome = { status: 'unknown-op' }
    console.log(JSON.stringify({ i, ...outcome }))
  })
}

main()
