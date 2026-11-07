# bookings

A small bookings-and-billing service for a guest house. Everything is integer
day numbers - day 41 is just the day after day 40; there are no dates, no
times of day, no time zones.

```
src/             the implementation
src/index.js     the public surface - everything a caller may import
docs/            the contract the implementation is held to
bin/demo.js      a walkthrough of the surface (node bin/demo.js)
test/            reproductions; a subset of what acceptance checks
```

## Use

```js
import { createBookingCalendar, trialStatus, billableDays } from './src/index.js'

const calendar = createBookingCalendar()
calendar.book({ room: 'ash', guest: 'Ada', start: 3, end: 8 })   // { ok: true, booking }
trialStatus({ start: 1, lengthDays: 14 }, 10)                     // { active, daysLeft, endsOn }
billableDays({ start: 1, end: 32 }, { start: 10, end: 20 })       // 10
```

An interval is always `{ start, end }`. What `start` and `end` mean - which
days are inside, when two intervals clash, how many days lie between them -
is written down once in `docs/interval-convention.md` and applies to every
module. When the code and that document disagree, the document is right.

## Conventions

- ESM only (`"type": "module"`); no dependencies; nothing reads the clock or
  the network.
- `src/index.js` is the stable public surface. Everything else under `src/`
  is internal and can be reorganised; the exported names cannot.
- Run the tests with `node --test`.
