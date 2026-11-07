# planner

Schema-migration planner for the release train.

It reads the migrations a release declares, checks them, orders them, sizes them
and writes down the plan and the rollback plan. It never opens a database
connection and it never runs a statement — the runner does that, and the runner
follows this plan.

```
config/planner.config.json   the tunables the release process agreed on
data/release-42.json         an example ticket export, for the CLI
docs/planning-rules.md       the rules the release process signed off - treat as the contract
docs/operations.md           the operation catalogue
src/                         the implementation
test/                        reproductions; a subset of what the release train checks
```

## Use

```js
import { planMigrations, applyPlan, resumeFrom, renderPlan } from './src/index.js'

const plan = planMigrations(migrations)          // array of declared migrations
plan.status                                      // 'ok' | 'missing-dependency' | 'cycle' | 'unacknowledged-destructive'
plan.steps.map((step) => step.id)                // the order the runner will use
plan.estimate.totalMs                            // what the release calendar publishes
renderPlan(plan)                                 // the same thing as text, for the ticket

const run = applyPlan(plan, { failAt: 'm-0042' }) // what the runner recorded
const rest = resumeFrom(run, migrations)          // the plan for the work that is left
rest.steps.map((step) => step.id)
```

`planMigrations(migrations, options)` takes `options.config` (configuration
overrides) and `options.acknowledgements` (operation kinds acknowledged for the
whole plan). `resumeFrom(run, migrations, options)` takes the same options.

```powershell
node bin/plan.js data/release-42.json
npm test
```

## Conventions

- ESM only. `package.json` says `"type": "module"`; the release job imports these
  files directly and there is no build step.
- No dependencies. The release container has no network and no package registry.
- Nothing reads a clock and nothing is random: two runs over the same tickets
  produce the same plan, byte for byte. Durations are computed from what the
  tickets declare and from the configuration, never measured.
- `src/index.js` is the public surface. Everything else under `src/` is internal
  and can be reorganised; the names below cannot:

  `planMigrations`, `configFor`, `STATUSES`, `applyPlan`, `resumeFrom`,
  `renderPlan`, `loadConfig`, `DEFAULT_CONFIG`, `repoRoot`, `readJson`,
  `normalizeMigration`, `normalizeAll`, `tableOf`, `orderMigrations`,
  `findCycle`, `missingDependencies`, `isDestructive`, `destructiveFindings`,
  `DESTRUCTIVE_OPERATIONS`, `batchCount`, `batchSizeOf`, `expandBatches`,
  `lockWindowMs`, `lockFindings`, `estimatePlan`, `stepEstimateMs`, `rowsMs`,
  `rollbackPlan`.

- Configuration is read from `config/planner.config.json` relative to this
  checkout, never relative to the current directory, so the planner behaves the
  same from the CLI, from the release job and from a test.
