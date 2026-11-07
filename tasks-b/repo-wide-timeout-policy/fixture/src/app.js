/**
 * Wiring. Builds the one policy instance every client shares, then the
 * clients. `config` is the shape of config/dispatch.config.json; everything
 * is optional and falls back to the documented defaults.
 */
import { createPolicy } from './policy.js'
import { createHttpClient } from './http-client.js'
import { createDb } from './db.js'
import { createQueue } from './queue.js'
import { createCache } from './cache.js'
import { createWebhookDispatcher } from './webhook-dispatcher.js'

export function createApp(config = {}) {
  const policy = createPolicy(config.timeouts?.overrides)
  return {
    policy,
    http: createHttpClient({ policy, baseUrl: config.http?.baseUrl }),
    db: createDb({ policy }),
    queue: createQueue({ policy, batchSize: config.queue?.batchSize }),
    cache: createCache({ policy }),
    webhooks: createWebhookDispatcher({ policy, attempts: config.webhooks?.attempts }),
  }
}
