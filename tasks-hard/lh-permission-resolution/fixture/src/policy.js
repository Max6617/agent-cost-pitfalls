/**
 * Where the policy of record lives.
 *
 * Paths are resolved against this module rather than the working directory: the
 * gateway is started from wherever the supervisor happens to be, and the
 * container mounts the checkout read-only.
 */
import { readFileSync } from 'node:fs'

const CONFIG_URL = new URL('../config/authz.config.json', import.meta.url)
const POLICY_URL = new URL('../data/policy.json', import.meta.url)

export function loadConfig(url = CONFIG_URL) {
  try {
    return JSON.parse(readFileSync(url, 'utf8'))
  } catch {
    return {}
  }
}

export function loadPolicy(url = POLICY_URL) {
  return JSON.parse(readFileSync(url, 'utf8'))
}
