import { useEffect, useState } from 'react'

/** The longest a deferred render waits for an idle moment before it runs anyway. */
const IDLE_TIMEOUT_MS = 2000

/**
 * False on the server and on the first browser render, then true once the
 * browser is idle: for content below the fold that is costly to hydrate or
 * that reads the clock, so it never takes part in hydration. The first render
 * matches the server's, whatever the time zone or the time.
 */
export function useAfterIdle(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(() => setReady(true), {
        timeout: IDLE_TIMEOUT_MS,
      })
      return () => window.cancelIdleCallback(handle)
    }
    const timer = window.setTimeout(() => setReady(true), 0)
    return () => window.clearTimeout(timer)
  }, [])
  return ready
}
