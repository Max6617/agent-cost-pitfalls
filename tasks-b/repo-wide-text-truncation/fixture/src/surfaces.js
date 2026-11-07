import { LIMITS } from './policy.js'

/**
 * The user-facing surfaces, in the order the admin grid and the preview tool
 * list them. Every surface here shortens its text with truncate() and its
 * limit from src/policy.js - see docs/truncation-policy.md.
 */
export const SURFACES = Object.freeze([
  { id: 'sms', label: 'SMS message', limit: LIMITS.sms },
  { id: 'push', label: 'Push notification title', limit: LIMITS.push },
  { id: 'email', label: 'Email subject line', limit: LIMITS.emailSubject },
  { id: 'log', label: 'Log line', limit: LIMITS.logLine },
  { id: 'table', label: 'Admin table cell', limit: LIMITS.tableCell },
])
