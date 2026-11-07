#!/usr/bin/env node
/**
 * Print the operator report for this checkout's configuration.
 *
 *   node bin/report.js
 */
import { createService, renderReport } from '../src/index.js'

process.stdout.write(renderReport(createService()) + '\n')
