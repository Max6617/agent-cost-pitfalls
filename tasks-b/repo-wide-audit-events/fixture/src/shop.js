import { createAuditLog } from './audit.js'
import { createIds } from './ids.js'
import { Accounts } from './accounts.js'
import { Inventory } from './inventory.js'
import { Pricing } from './pricing.js'
import { Orders } from './orders.js'
import { Catalog } from './catalog.js'

/**
 * A shop wired together: one shared audit log, one shared id counter, and the
 * five modules. Every mutation in every module goes through the same log, so
 * shop.audit.events() is the whole story of what happened, oldest first.
 */
export function createShop() {
  const audit = createAuditLog()
  const ids = createIds()
  return {
    audit,
    accounts: new Accounts({ audit, ids }),
    inventory: new Inventory({ audit }),
    pricing: new Pricing({ audit }),
    orders: new Orders({ audit, ids }),
    catalog: new Catalog({ audit }),
  }
}
