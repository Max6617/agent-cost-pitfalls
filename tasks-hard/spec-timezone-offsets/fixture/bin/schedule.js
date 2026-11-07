#!/usr/bin/env node
/**
 * schedule.js - print what the scheduler thinks a zone is doing.
 *
 *   node bin/schedule.js --zone Europe/Berlin --at 2024-03-31T01:30:00Z
 *   node bin/schedule.js --zone Europe/Berlin --local 2024-03-31T02:30:00
 *   node bin/schedule.js --zone Asia/Kolkata --day 2024-03-31T20:00:00Z
 *
 * Operations use this when a site complains that a job fired at the wrong time;
 * it reads the same table and the same code the worker does.
 */
import {
  offsetAt, instantToLocal, localToInstant,
  startOfLocalDay, endOfLocalDay, formatLocal,
} from '../src/index.js'
import { parseIsoInstant, formatIsoInstant } from '../src/util/iso.js'
import { log, setLevel } from '../src/util/log.js'

function parseArgs(argv) {
  const out = { zone: null, at: null, local: null, day: null, verbose: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--verbose') { out.verbose = true; continue }
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    if (!(key in out)) throw new RangeError('unknown option: ' + arg)
    out[key] = argv[i + 1]
    i += 1
  }
  if (!out.zone) throw new RangeError('--zone is required')
  return out
}

function minutes(offset) {
  const sign = offset < 0 ? '-' : '+'
  const abs = Math.abs(offset)
  return sign + String(Math.floor(abs / 60)).padStart(2, '0') + ':' + String(abs % 60).padStart(2, '0')
}

function main(argv) {
  const args = parseArgs(argv)
  if (args.verbose) setLevel('debug')
  log('info', 'zone ' + args.zone)

  if (args.at) {
    const instant = parseIsoInstant(args.at)
    const local = instantToLocal(args.zone, instant)
    console.log(formatIsoInstant(instant), '->', formatLocal(local), minutes(offsetAt(args.zone, instant)))
  }

  if (args.local) {
    const result = localToInstant(args.zone, args.local)
    console.log(args.local, '->', formatIsoInstant(result.instant), minutes(result.offsetMinutes), result.resolution)
  }

  if (args.day) {
    const instant = parseIsoInstant(args.day)
    const start = startOfLocalDay(args.zone, instant)
    const end = endOfLocalDay(args.zone, instant)
    // the instants as well as the seconds-precision rendering: the end of a day
    // is the last millisecond in it, which the date form cannot show
    console.log('day starts', formatIsoInstant(start), '(' + start + ')')
    console.log('day ends  ', formatIsoInstant(end), '(' + end + ')')
  }

  if (!args.at && !args.local && !args.day) throw new RangeError('nothing to do: pass --at, --local or --day')
}

try {
  main(process.argv.slice(2))
} catch (error) {
  log('error', error.message)
  process.exit(1)
}
