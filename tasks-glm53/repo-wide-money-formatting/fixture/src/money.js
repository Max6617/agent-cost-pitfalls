/**
 * Facade over the shared money routine.
 *
 * The rendering modules import money from here so that a screen can be tested
 * with a stub renderer: `setRenderer(proc)` replaces the routine for the rest
 * of the process, which is how the screenshot tests pin down spacing without
 * depending on the real rounding rules.
 *
 * Everything the app needs is re-exported, so a screen never reaches past this
 * module — the day someone imported the routine directly, the screenshot tests
 * silently stopped covering one screen.
 */
import * as cents from './cents.js'

let renderer = cents

/** Replace the money routine. Pass null to go back to the real one. */
export function setRenderer(next) {
  renderer = next ?? cents
}

export function format(amount, options) {
  return renderer.format(amount, options)
}

export function sum(amounts, dp) {
  return renderer.sum(amounts, dp)
}

export function split(amount, parts, dp) {
  return renderer.split(amount, parts, dp)
}

export function round(value, dp) {
  return renderer.round(value, dp)
}
