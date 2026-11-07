/**
 * Public surface of the customer/order domain layer.
 *
 * Everything the API, the importer and the console import comes through this
 * file. The modules behind it are internal and may be reorganised; the names
 * exported here may not.
 */
export { CORE_VERSION, ABSENT, NULL, EMPTY, VALUE, stateOf, fieldState, getField, hasField, cloneRecord, cloneValue, isPlainObject, deepEqual, sortedKeys, formatJson } from './core.js'

export { applyPatch, mergePatch, mergeOmit, changedFields, without } from './patch.js'

export { serialize, deserialize, roundTrip } from './serialize.js'

export { createProfile, readProfile, updateProfile, replaceProfile, deleteProfile, listProfiles, resetProfiles, profileSummary } from './profile.js'

export { ORDER_STATUS, createOrder, applyCustomer, applyCustomerEdit, addItem, setDiscount, computeTotals, placeOrder, cancelOrder, contactFrom, shippingFrom } from './order.js'

export { validatePatch, validateRecord, reportFields } from './validate.js'

export { diffRecords, isEmptyDiff, applyDiff, describeDiff, touchedKeys } from './diff.js'

export { makeCondition, compileFilter, parseFilter, search } from './filter.js'

export { encodeCell, exportColumns, exportCsv, parseCsvLine, decodeCell, importCsv, columnFill } from './csv.js'

export { AUDIT_VERSION, auditValue, auditEntries, formatEntry } from './audit.js'
