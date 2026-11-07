/**
 * The waitlist: one FIFO queue of requests that could not be placed yet.
 *
 * Requests join at the back. When a cancellation frees a room, the queue is
 * walked for that room and requests that can be placed are confirmed
 * (docs/booking-rules.md, section 6).
 */
export function createWaitlist() {
  const queue = []

  return {
    add(request) {
      queue.push({ ...request })
      return { status: 'waitlisted', id: request.id }
    },

    /** Every queued request, oldest first. */
    entries() {
      return queue.map((request) => ({ ...request }))
    },

    /** The queued requests for one room, oldest first. */
    forRoom(roomId) {
      return queue.filter((request) => request.room === roomId).map((request) => ({ ...request }))
    },

    /**
     * Offer a freed room to the waiting requests. `canPlace` answers whether a
     * request can be confirmed right now; `onPlace` confirms it. Returns the
     * promoted requests' ids, in the order they were promoted.
     */
    promote(roomId, canPlace, onPlace) {
      const promoted = []
      for (const request of queue.filter((entry) => entry.room === roomId)) {
        if (!canPlace(request)) continue
        queue.splice(queue.indexOf(request), 1)
        onPlace(request)
        promoted.push(request.id)
      }
      return promoted
    },
  }
}
