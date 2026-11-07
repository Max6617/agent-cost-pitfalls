# Tally rules

The rules the returning officers signed off for the ranked-choice service.
`src/` is the implementation; when the two disagree, this document is right
and the code is a bug.

## 1. The election

An election is created with a fixed **field** of candidate ids: unique,
non-empty strings. The field never changes afterwards - candidates cannot
enter or withdraw mid-count.

## 2. Ballots

A ballot is a plain object:

```js
{ id: 'b-0007', ranks: ['ada', 'bob'] }
```

`id` is a non-empty string, stable for the life of the ballot. `ranks` lists
candidate ids, most preferred first. A ballot does not have to rank the whole
field: an unranked candidate is simply never chosen by that ballot.

A ballot is **invalid** - refused with status `invalid` - when any of these
hold:

- `ranks` is empty,
- `ranks` names a candidate who is not in the field,
- `ranks` names the same candidate twice.

An invalid ballot is **skipped entirely**: it is not stored, it counts in no
round, and its id remains free - a later, valid ballot may reuse it.

`addBallot()` returns `{ id, status }` with one of:

| status | meaning |
|---|---|
| `accepted` | the ballot entered the count |
| `invalid` | the ballot broke a rule above; nothing was stored |
| `duplicate` | a ballot with this id was already accepted; the first one stands |

A ballot id is stable, so a second ballot arriving under an id that is
already in the count is that same ballot again: it is refused `duplicate` and
has no effect, whatever its ranks say. `ballotCount()` is the number of
accepted ballots.

## 3. The count

`tally()` runs the count in **rounds**.

- Every ballot counts one preference for the highest-ranked candidate still
  in the race.
- A ballot whose ranked candidates have all been eliminated is **exhausted**:
  it leaves the count - it counts for nobody and is not a continuing ballot.
- `counts` for a round lists every candidate still in the race, even one with
  zero preferences.
- `continuing` is the number of ballots that counted in that round.

### Majority

A candidate wins a round with **strictly more than half of the continuing
ballots** - the ballots still in the count, not the ballots that were cast.
The bar is `floor(continuing / 2) + 1`, and exactly half is not a majority:
with 6 continuing ballots the bar is 4, with 5 it is 3, with 1 it is 1. At
most one candidate can hold a majority in a round. The round reports the bar
as `majority`.

### Elimination

With no winner, the candidate with the **fewest** preferences leaves the
race. A tie is broken, in order:

1. **Fewest transfer count.** A tied candidate's transfer count is the number
   of continuing ballots that rank the candidate strictly below the
   preference the ballot is currently counted for - the support the candidate
   still has coming later in the count. (A ballot currently counting for the
   candidate contributes nothing; the candidate is not below itself.)
2. **Lowest candidate id**, comparing ids as strings in ascending code point
   order.

Once eliminated, a candidate **never returns**: they are not listed in later
rounds' `counts`, later preferences skip over them, and they receive no
transfers.

### Ending

An election with C candidates tallies in at most C rounds - every round
either crowns a winner or strikes one candidate from the field. If a round
would count zero continuing ballots, the tally ends there without recording
that round, and the election has no winner: `winner` is `null`.

## 4. The result

`tally()` returns:

```js
{
  winner: 'ada' | null,
  rounds: [
    {
      round: 1,                    // 1-based
      counts: { ada: 4, bob: 3 },  // every candidate still in the race
      continuing: 7,
      majority: 4,
      eliminated: ['cy'],          // struck at the end of this round
      winner: null,                // or the winner's id on the final round
    },
  ],
}
```

## 5. Tallying is a pure read

`tally()` reports on **every ballot accepted before it is called**, however
many times it has been called before, and calling it never changes the
election: two tallies over the same ballots agree, and the order the ballots
arrived in never changes the outcome. Adding a ballot after a tally and
tallying again counts the new ballot like any other.
