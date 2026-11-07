/**
 * The chart of accounts.
 *
 * `data/accounts.json` is a tree of nodes; `buildTree` flattens it into a Map
 * from code to node so callers can look a node up without walking the tree.
 * Codes are unique across the chart; the tree is two or three levels deep.
 */
import * as decimal from './decimal.js'

export function buildTree(roots) {
  const tree = new Map()
  const visit = (node, parent) => {
    if (tree.has(node.code)) throw new Error('duplicate account code: ' + node.code)
    tree.set(node.code, {
      code: node.code,
      name: node.name ?? node.code,
      internal: node.internal === true,
      parent: parent ?? null,
      children: (node.children ?? []).map((c) => c.code),
    })
    for (const child of node.children ?? []) visit(child, node.code)
  }
  for (const root of roots ?? []) visit(root, null)
  return tree
}

export function rootCodes(roots) {
  return (roots ?? []).map((r) => r.code)
}

export function accountName(tree, code) {
  return tree.get(code)?.name ?? code
}

/** Is this account an intercompany one? */
export function isInternal(tree, code) {
  return tree.get(code)?.internal === true
}

/** The account's own balance, exactly as posted. */
export function ownBalance(balances, code) {
  return balances.get(code) ?? '0'
}

/** An account's balance: its own, plus everything below it. */
export function rollup(tree, balances, code) {
  let total = ownBalance(balances, code)
  for (const child of tree.get(code)?.children ?? []) {
    total = decimal.add(total, ownBalance(balances, child))
  }
  return total
}

/** The part of a subtree that is intercompany clearing. */
export function internalBalance(tree, balances, code) {
  let total = isInternal(tree, code) ? ownBalance(balances, code) : '0'
  for (const child of tree.get(code)?.children ?? []) {
    if (isInternal(tree, child)) total = decimal.add(total, ownBalance(balances, child))
  }
  return total
}
