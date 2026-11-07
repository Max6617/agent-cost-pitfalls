// Sub-problem 5: the CSV importer and the job worker.
import test from 'node:test'
import assert from 'node:assert/strict'
import { newContext, domainError, importCsv, runJob, isDomainError } from '../src/index.js'

const ctx = newContext('req-5')
const HEADER = 'id,title,quantity,tags'

test('rows are numbered over the data lines, not over the lines of the file', () => {
  const file = [HEADER, 'r-1,Widget,2,red', '', '   ', 'r-2,Gadget,1,', 'r-3,Doohickey,5,blue'].join('\n')
  const { imported, rows } = importCsv(file, { ctx })

  assert.equal(imported, 3)
  assert.deepEqual(rows.map((row) => row.row), [1, 2, 3])
  assert.deepEqual(rows.map((row) => row.id), ['r-1', 'r-2', 'r-3'])

  const withTrailingNewline = importCsv(HEADER + '\n' + 'r-1,Widget,2,red\n', { ctx })
  assert.equal(withTrailingNewline.imported, 1)
  assert.equal(withTrailingNewline.rows[0].row, 1)
})

test('a row that cannot be read says which row and which field', () => {
  const badQuantity = [HEADER, 'r-1,Widget,2,red', 'r-2,Gadget,0,red'].join('\n')
  assert.throws(
    () => importCsv(badQuantity, { ctx }),
    (error) => {
      assert.ok(isDomainError(error))
      assert.equal(error.code, 'ROW_INVALID')
      assert.deepEqual(error.details, { row: 2, fields: ['quantity'] })
      return true
    },
  )

  const shortRow = [HEADER, 'r-1,Widget,2'].join('\n')
  assert.throws(
    () => importCsv(shortRow, { ctx }),
    (error) => {
      assert.equal(error.code, 'ROW_INVALID')
      assert.deepEqual(error.details, { row: 1, fields: ['row'] })
      return true
    },
  )

  const wrongHeader = ['title,quantity', 'Widget,2'].join('\n')
  assert.throws(
    () => importCsv(wrongHeader, { ctx }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_FAILED')
      assert.deepEqual(error.details, { fields: ['header'] })
      return true
    },
  )
})

test('a job records the failure it hit, in the shape the API would answer with', () => {
  const upstream = () => {
    throw domainError('UPSTREAM_UNAVAILABLE', { ctx, message: 'socket hang up' })
  }
  const retried = runJob({ jobId: 'j-1' }, upstream, { ctx })
  assert.equal(retried.jobId, 'j-1')
  assert.equal(retried.status, 'failed')
  assert.equal(retried.error.code, 'UPSTREAM_UNAVAILABLE')
  assert.equal(retried.error.status, 502)
  assert.equal(retried.error.retryable, true)
  assert.equal(retried.error.correlationId, 'req-5')
  assert.equal(retried.error.message, 'An upstream service is unavailable.')
  assert.equal(retried.willRetry, true)

  const refused = () => {
    throw domainError('VALIDATION_FAILED', { ctx, details: { fields: ['title'] } })
  }
  const notRetried = runJob({ jobId: 'j-2' }, refused, { ctx })
  assert.equal(notRetried.error.code, 'VALIDATION_FAILED')
  assert.equal(notRetried.error.status, 400)
  assert.deepEqual(notRetried.error.details, { fields: ['title'] })
  assert.equal(notRetried.willRetry, false)

  const fine = runJob({ jobId: 'j-3' }, (job) => 'done:' + job.jobId, { ctx })
  assert.equal(fine.status, 'ok')
  assert.equal(fine.value, 'done:j-3')
})

test('a job that cannot be named, and one that crashes for no known reason', () => {
  assert.throws(
    () => runJob({}, () => 'never', { ctx }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_FAILED')
      assert.deepEqual(error.details, { fields: ['jobId'] })
      return true
    },
  )

  let ran = 0
  const crashed = runJob({ jobId: 'j-9' }, () => {
    ran += 1
    throw new Error('undefined is not a function')
  }, { ctx })

  assert.equal(ran, 1)
  assert.equal(crashed.status, 'failed')
  assert.equal(crashed.error.code, 'JOB_FAILED')
  assert.equal(crashed.error.status, 500)
  assert.equal(crashed.error.retryable, false)
  assert.equal(crashed.willRetry, false)
  assert.ok(!crashed.error.message.includes('undefined is not a function'))
})
