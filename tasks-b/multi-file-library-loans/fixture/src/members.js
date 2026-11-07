/**
 * The member registry and member classes.
 *
 * Class decides hold-queue priority (docs/loan-rules.md): staff first, then
 * students, then standard members.
 */
export const CLASS_RANK = { staff: 1, student: 2, standard: 3 }

export class Members {
  constructor(members = []) {
    this.members = new Map(members.map((m) => [m.id, m]))
  }

  get(memberId) {
    return this.members.get(memberId) ?? null
  }

  classOf(memberId) {
    return this.get(memberId)?.memberClass ?? null
  }

  rankOf(memberId) {
    return CLASS_RANK[this.classOf(memberId)] ?? CLASS_RANK.standard
  }
}
