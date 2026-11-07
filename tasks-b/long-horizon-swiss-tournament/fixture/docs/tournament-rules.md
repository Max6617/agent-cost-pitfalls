# Tournament rules

The rules the league committee agreed for the season. `src/` is the
implementation; when the two disagree, this document is right and the code is
a bug.

## 1. Players and registration

A player is registered with a unique string `id`, a non-empty `name`, and an
integer `rating` from 0 to 4000. `register` answers with a status:

| situation | status |
|---|---|
| accepted | `registered` |
| the id is already taken | `duplicate` |
| missing name, missing id, or a rating outside the range | `invalid` |

A player may register after play has started; see §6.

## 2. Rounds and results

The flow is strict: a round is drawn, every game of it is reported, then the
next round is drawn. `pairRound()` refuses while any game of the open round is
unreported, answering `{ error: 'unreported-games', round }`.

A result is entered with the colours as drawn:

```js
t.report({ white: 'a', black: 'b', result: '1-0' })
t.report({ white: 'c', black: 'd', result: '0-1', forfeit: true })
```

`result` is `'1-0'`, `'0-1'` or `'1/2-1/2'`: a win is 1 point, a draw half a
point, a loss nothing. Statuses:

| situation | status |
|---|---|
| accepted | `recorded` |
| no round has been drawn yet | `no-open-round` |
| either id is not registered | `unknown-player` |
| the result token is unknown, or a draw is entered as a forfeit | `invalid` |
| that exact pairing was not drawn this round | `not-paired` |
| the game was already entered | `already-reported` |

Within one round results may be entered in **any order**. The table is a pure
function of the games on record: two officials entering the same round's
results in different orders must see the same standings, and the order of
entry must never change a ranking.

## 3. The draw

**Field order** ranks every active player: score descending, then rating
descending, then id ascending.

The field is grouped by score. Groups are taken from the top; within a group
players are ordered by rating descending, then id ascending (the **group
order**), and matched from the top: each player in turn takes the highest
player remaining in the group whom they have **not been paired with before**,
in any earlier round, in either colour — whether that earlier game was played
or forfeited.

A player for whom no unmet opponent remains **floats down** into the next
lower group and is matched there by the same rule, as is a player left over
when a group has an odd number. In the lowest group, when no unmet opponent
remains, the rematch is made rather than leaving a player without a game. A
player left over below the lowest group receives the bye (§4).

Within a pair the player higher in **field order** takes white. Boards are
numbered from 1: the pair containing the highest-ranked player in field order
is board 1, and so on.

## 4. The bye

When the number of active players is odd, exactly one player receives a bye
**before** the draw. Among the players who have received the fewest byes this
event — so no one sits out twice while another player has not sat out at all —
the bye goes to the **lowest-ranked** of them in field order. Missed-round
credits (§6) count as byes for this rule.

The bye scores 1 point. It is a bye in every other sense too: the player had
no opponent, so it contributes nothing to their Buchholz (§5).

A player left over below the lowest group (§3) receives the same 1-point bye;
this is the only way a bye arises when the field is even.

## 5. The table

`standings()` returns one row per registered player, withdrawn players
included:

```js
{ rank: 1, id: 'a', name: 'Ada', rating: 2400,
  score: 2.5, buchholz: 4, byes: 1, forfeits: 0, status: 'active' }
```

A player's **Buchholz** is the sum of the scores of the opponents they
actually played, as the record stands when the table is computed. A bye
contributes nothing — there was no opponent. A forfeited game contributes
nothing to **either** player's Buchholz — no game was played (§7).

Rows are ordered by score descending, then Buchholz descending, then rating
descending, then id ascending. Every tie is fully resolved; there are no
shared ranks.

## 6. Late entries

A player who enters after play has started is credited for every **completed**
round they missed with a **half-point bye** (league ruling 2019-4: the
committee rejected both full-point byes, as too generous to the newcomer, and
zeroes, as too harsh). A round that has been drawn but not fully reported does
not count as completed.

Missed-round credits count as byes for the bye rule (§4) and, like any bye,
contribute nothing to Buchholz. The new player is eligible for the next draw.

## 7. Forfeits

A forfeited game is scored exactly as reported — the player who appears gets
the point — and it still counts as a pairing for the no-rematch rule (§3): the
two players were drawn against each other and are not drawn again while an
alternative exists. But no game was played, so it contributes nothing to
either player's Buchholz.

The player who fails to appear receives a **strike**. A player with two
strikes is **withdrawn**: they are not paired again, their results stand, and
they remain on the table with status `withdrawn`.
