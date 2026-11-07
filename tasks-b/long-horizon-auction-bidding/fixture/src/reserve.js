/**
 * What a closed auction comes to.
 *
 * The reserve is the least the seller will take; a closing bid that meets it
 * exactly is a sale. Below it the lot goes home with no winner and no price.
 */
export function classifyClose(auction) {
  if (!auction.leader) {
    return { status: 'no-bids', winner: null, price: null }
  }
  if (auction.leader.price >= auction.reserve) {
    return { status: 'sold', winner: auction.leader.bidder, price: auction.leader.price }
  }
  return { status: 'reserve-not-met', winner: null, price: null }
}
