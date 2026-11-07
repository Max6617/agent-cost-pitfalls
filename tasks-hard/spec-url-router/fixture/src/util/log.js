/**
 * The logger the route-lint CLI uses. Deliberately tiny: the framework writes
 * to the process streams and nothing collects it in a request path.
 */
const LEVELS = { silent: 0, error: 1, info: 2, debug: 3 }

export function createLogger(prefix = 'router', level = process.env.ROUTER_LOG ?? 'info') {
  const threshold = LEVELS[level] ?? LEVELS.info
  const write = (stream, tag, args) => {
    if (threshold < LEVELS[tag === 'error' ? 'error' : tag]) return
    stream.write(`${prefix}: ${args.map(String).join(' ')}\n`)
  }
  return {
    level,
    error: (...args) => write(process.stderr, 'error', args),
    info: (...args) => write(process.stdout, 'info', args),
    debug: (...args) => write(process.stdout, 'debug', args),
  }
}
