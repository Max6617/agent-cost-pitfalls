/**
 * The demo app's route table.
 *
 * Kept here rather than in the app so that `bin/route-lint.js` and the app's
 * own smoke test can both read it. Every entry is [method, pattern, handler
 * name]; the app resolves the name to a function when it builds the router.
 */
export const routes = [
  ['GET', '/', 'home'],
  ['GET', '/users', 'listUsers'],
  ['GET', '/users/:id', 'getUser'],
  ['GET', '/users/:id/posts/{page}', 'getUserPosts'],
  ['POST', '/users', 'createUser'],
  ['GET', '/files/**rest', 'getFile'],
  ['GET', '/health', 'health'],
  ['HEAD', '/health', 'healthHead'],
]

/** The handler names above, resolved to something the router can hold. */
export function handlers() {
  const table = {}
  for (const [, , name] of routes) table[name] = { name }
  return table
}

/** The routes above, wired to handlers, in declaration order. */
export function demoRoutes() {
  const table = handlers()
  return routes.map(([method, pattern, name]) => ({ method, pattern, handler: table[name] }))
}
