/**
 * The job worker. It runs one job and records what happened: the queue is what
 * decides whether to hand it back, and it decides from the record.
 */
export function runJob(job, handler, { ctx } = {}) {
  try {
    return { jobId: job ? job.jobId : null, status: 'ok', value: handler(job) }
  } catch (error) {
    return {
      jobId: job ? job.jobId : null,
      status: 'failed',
      message: String(error && error.message ? error.message : error),
      willRetry: false,
    }
  }
}
