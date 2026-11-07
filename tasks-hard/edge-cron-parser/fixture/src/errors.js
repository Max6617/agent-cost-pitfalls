/**
 * A rejection the planner made on purpose, as opposed to a bug. `code` says
 * what was wrong with the input; the message is written for whoever typed the
 * expression.
 */
export class ScheduleError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ScheduleError'
    this.code = code
  }
}
