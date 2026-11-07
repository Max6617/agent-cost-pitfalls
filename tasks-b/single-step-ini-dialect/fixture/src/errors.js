/** The one error type the parser raises; `line` locates the offending line. */
export class IniParseError extends Error {
  constructor(message, line) {
    super(line === undefined ? message : `${message} (line ${line})`)
    this.name = 'IniParseError'
    this.line = line
  }
}
