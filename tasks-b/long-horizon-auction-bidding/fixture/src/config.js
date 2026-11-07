/**
 * The deployment's auction defaults, shipped as data so the desk can retune
 * the increment table and the soft-close window without a release.
 */
import { readFileSync } from 'node:fs'

export function configUrl() {
  return new URL('../config/auction.config.json', import.meta.url)
}

export function loadConfig() {
  return JSON.parse(readFileSync(configUrl(), 'utf8'))
}
