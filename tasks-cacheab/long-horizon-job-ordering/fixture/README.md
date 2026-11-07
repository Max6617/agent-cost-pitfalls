# batch-runner

Builds a plan from a job list and runs it.

## Ordering

A job is `{ name, needs, priority }`. Two rules decide the order:

1. **Dependencies are absolute.** A job never runs before anything in `needs`.
2. **Priority orders the jobs that are allowed to run.** Higher first; equal
   priorities keep the order the operator wrote them in.

Rule 2 only ever chooses between jobs rule 1 has already allowed. A plan that
puts a low-priority job before a high-priority one because the high-priority one
was still blocked is correct, not a bug.

A `needs` entry that names no job is an error and is reported: silently dropping
it runs a job before the data it reads is ready, which is the failure mode this
module exists to prevent.

## Failure

A job that throws stops the batch at that point. Jobs that already ran are
reported as executed, and nothing after the failure is attempted — a later job
almost always reads what the failed one was meant to write.
