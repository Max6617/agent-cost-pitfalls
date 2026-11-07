/** Carts. A cart is a list of lines and a status. */

export class Carts {
  constructor() {
    this.byId = new Map()
    this.nextId = 1
  }

  create() {
    const id = 'c' + this.nextId++
    this.byId.set(id, { id, lines: [], checkedOut: false })
    return id
  }

  find(id) {
    const cart = this.byId.get(id)
    if (!cart) throw new Error('cart ' + id + ' not found')
    return cart
  }

  addLine(id, line) {
    const cart = this.find(id)
    cart.lines.push({ ...line })
    return cart
  }

  /** Check out, refusing an empty cart. */
  checkOut(id) {
    const cart = this.find(id)
    if (!cart.lines.length) throw new Error('cart is empty')
    cart.checkedOut = true
    return cart
  }

  total(id) {
    return this.find(id).lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0)
  }
}
