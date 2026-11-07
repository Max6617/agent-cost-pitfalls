/**
 * Tiny stderr logger. The worker container collects stderr; nothing here reads
 * the clock, so log lines carry no timestamp of their own.
 */
const LEVELS = ['error', 'warn', 'info', 'debug']
const ORDER = { error: 0, warn: 1, info: 2, debug: 3 }

let threshold = ORDER.warn

export function setLevel(level) {
  if (!(level in ORDER)) throw new RangeError('unknown log level: ' + level)
  threshold = ORDER[level]
}

export function level() {
  for (const name of LEVELS) if (ORDER[name] === threshold) return name
  return 'warn'
}

export function log(name, message) {
  if (!(name in ORDER)) throw new RangeError('unknown log level: ' + name)
  if (ORDER[name] > threshold) return
  process.stderr.write('[' + name + '] ' + message + '\n')
}

export { LEVELS }
