import { DEFAULTS } from './defaults.js'

/**
 * The layer stack, defined in exactly one place.
 *
 * Everything that needs to know "what wins over what" — the loader, the
 * `config --explain` report, the CLI — reads this. Changing precedence here
 * changes it everywhere, which is the point: two copies of this list is how the
 * environment layer ended up losing to the config file.
 *
 * Layers are listed lowest precedence first.
 */
export const LAYER_NAMES = ['defaults', 'file', 'env', 'cli']

/** Keys whose values accumulate across layers instead of being replaced. */
export const ADDITIVE_KEYS = new Set(['origins'])
