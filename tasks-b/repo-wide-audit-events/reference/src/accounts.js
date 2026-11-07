import { clone } from './snapshot.js'

/**
 * Staff and customer accounts. A created account starts active; deactivation
 * is a state change, never a delete - the audit trail has to be able to say
 * who an account belonged to after it is gone.
 */
export class Accounts {
  constructor({ audit, ids }) {
    this.audit = audit
    this.ids = ids
    this.byId = new Map()
  }

  require(id) {
    const account = this.byId.get(id)
    if (!account) throw new Error('unknown account: ' + id)
    return account
  }

  create(actor, { name, email, role = 'member', passwordHash }) {
    const account = { id: this.ids('acc'), name, email, role, status: 'active', passwordHash }
    this.byId.set(account.id, account)
    this.audit.emit({
      actor, action: 'account.create', entity: 'account', id: account.id,
      before: null, after: clone(account),
    })
    return account
  }

  update(actor, id, patch) {
    const account = this.require(id)
    const before = clone(account)
    Object.assign(account, patch)
    this.audit.emit({
      actor, action: 'account.update', entity: 'account', id,
      before, after: clone(account),
    })
    return account
  }

  deactivate(actor, id) {
    const account = this.require(id)
    const before = clone(account)
    account.status = 'deactivated'
    this.audit.emit({
      actor, action: 'account.deactivate', entity: 'account', id,
      before, after: clone(account),
    })
    return account
  }

  get(id) {
    return this.require(id)
  }
}
