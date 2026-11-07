/**
 * A very small leveled logger. The runner runs one planning pass per tick in a
 * process that also does other work, so the planner stays quiet unless asked.
 */
const LEVELS = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 }

export function createLog(level = 'warn') {
  const threshold = LEVELS[level] ?? LEVELS.warn
  const write = (name) => (...args) => {
    if (LEVELS[name] <= threshold) console.error('[' + name + ']', ...args)
  }
  return {
    level,
    error: write('error'),
    warn: write('warn'),
    info: write('info'),
    debug: write('debug'),
  }
}
