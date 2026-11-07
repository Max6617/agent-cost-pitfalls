/**
 * One auction: a lot, the standing bid, and the close.
 *
 * The only time is the `at` each caller passes in. Bids with `at` beyond the
 * current deadline are refused; anything at or before it is a live bid and is
 * settled against the standing bid's ceiling.
 */
import { incrementFor } from './increments.js'
import { notifyOutbid } from './notify.js'
import { settlePrice } from './proxy.js'
import { classifyClose } from './reserve.js'
import { maybeExtend } from './softclose.js'
import { validateBid } from './validate.js'

export class Auction {
  constructor({ id, startPrice, reserve, endsAt, increments, softClose }) {
    this.id = id
    this.startPrice = startPrice
    this.reserve = reserve
    this.endsAt = endsAt
    this.increments = increments
    this.softClose = softClose
    this.leader = null
    this.bids = 0
    this.outbox = []
    this.closed = null
  }

  placeBid({ bidder, amount, max = null, at }) {
    if (this.closed || at > this.endsAt) return this.reply('closed')
    const problem = validateBid({ bidder, amount, max })
    if (problem) return this.reply(problem)
    const ceiling = max ?? amount

    if (!this.leader) {
      if (amount < this.startPrice) return this.reply('too-low')
      this.leader = { bidder, price: amount, max: ceiling, at }
      this.bids += 1
      maybeExtend(this, at, true)
      return this.reply('accepted')
    }

    if (bidder === this.leader.bidder) {
      // the standing bidder raising their ceiling is not a contest
      if (amount < this.leader.price) return this.reply('too-low')
      if (ceiling > this.leader.max) this.leader.max = ceiling
      this.bids += 1
      return this.reply('accepted')
    }

    const needed = this.leader.price + incrementFor(this.leader.price, this.increments)
    if (amount < needed) return this.reply('too-low')

    const standing = this.leader
    const challenger = { bidder, price: amount, max: ceiling, at }
    // the higher ceiling takes the lot
    const winner = challenger.max >= standing.max ? challenger : standing
    const loser = winner === challenger ? standing : challenger
    const price = settlePrice(winner, loser, incrementFor(loser.max, this.increments))

    this.leader = { bidder: winner.bidder, price, max: winner.max, at: winner === challenger ? at : standing.at }
    this.bids += 1
    notifyOutbid(this.outbox, loser.bidder, at)
    maybeExtend(this, at, winner === challenger)
    return this.reply('accepted')
  }

  close(now) {
    if (this.closed) return this.closed
    if (now < this.endsAt) return { status: 'open' }
    this.closed = classifyClose(this)
    return this.closed
  }

  reply(status) {
    return { status, highBid: this.snapshot().highBid, endsAt: this.endsAt }
  }

  snapshot() {
    return {
      id: this.id,
      phase: this.closed ? 'closed' : 'open',
      startPrice: this.startPrice,
      reserve: this.reserve,
      endsAt: this.endsAt,
      highBid: this.leader ? { bidder: this.leader.bidder, amount: this.leader.price } : null,
      bids: this.bids,
      result: this.closed,
    }
  }
}
