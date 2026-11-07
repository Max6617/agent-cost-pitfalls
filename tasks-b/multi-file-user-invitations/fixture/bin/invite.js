#!/usr/bin/env node
/**
 * invite - tiny admin wrapper around the invitation service.
 *
 *   node bin/invite.js <org> <email> [role]
 *
 * Prints the invite record as JSON. Handy in support sessions; the service
 * itself is the API, this is only a shell. Time is faked at 0 because the
 * token does not depend on it - expiry is computed by the real callers.
 */
import { createService } from '../src/index.js'

const [, , orgId, email, role] = process.argv
if (!orgId || !email) {
  console.error('usage: node bin/invite.js <org> <email> [role]')
  process.exit(2)
}

const service = createService()
service.addOrg({ id: orgId })
const invite = service.invite({ org: orgId, email, role: role ?? null, now: 0 })
console.log(JSON.stringify(invite, null, 2))
