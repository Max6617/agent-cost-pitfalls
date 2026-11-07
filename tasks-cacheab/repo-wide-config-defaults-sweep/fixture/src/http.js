/**
 * The HTTP client.
 *
 * Both limits come from settings: a client that picks its own timeout cannot be
 * tuned during an incident without a deploy.
 */
export function makeClient({ settings, fetchImpl, sleep = () => {} }) {
  return {
    /**
     * Fetch with retries.
     *
     * A 5xx is retried; a 4xx is not, because the request will be refused the
     * same way every time.
     */
    async get(url) {
      let last

      for (let attempt = 0; attempt <= 5; attempt++) {
        const response = await fetchImpl(url)
        if (response.status < 500) return response
        last = response
        if (attempt < 5) await sleep(200)
      }
      return last
    },

    timeoutFor() {
      return settings.get('http.timeoutMs')
    },

    redirectsFor() {
      return settings.get('http.maxRedirects')
    },
  }
}

/** A settings reader bound to a store. */
export function settingsFrom(store) {
  return { get: (key) => store[key] }
}
