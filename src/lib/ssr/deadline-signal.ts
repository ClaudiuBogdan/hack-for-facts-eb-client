/**
 * A deadline as an `AbortSignal`.
 *
 * The signal aborts with a `TimeoutError` once `ms` have passed, or with the
 * parent's own reason as soon as the parent aborts. A read stack that tells
 * the two apart treats the deadline as a failure of that read — the page
 * renders what it has and the browser reads again — while an abort stays
 * what it is: the caller gave up, and nothing is wrong.
 *
 * Server loaders use it because TanStack Start sends no HTML until every
 * loader resolves, and the API's own timeout (undici's, about five minutes)
 * is no deadline for a page.
 */
export function withDeadline(
  signal: AbortSignal | undefined,
  ms: number | undefined,
): AbortSignal | undefined {
  if (ms === undefined || !Number.isFinite(ms) || ms <= 0) return signal
  if (signal?.aborted) return signal

  const controller = new AbortController()
  const timer = setTimeout(() => {
    signal?.removeEventListener('abort', forward)
    controller.abort(new DOMException(`Deadline of ${ms} ms passed`, 'TimeoutError'))
  }, ms)
  // A timer must not keep the server process alive for a response already sent.
  if (typeof timer === 'object' && 'unref' in timer) timer.unref()
  const forward = () => {
    clearTimeout(timer)
    controller.abort(signal?.reason)
  }
  signal?.addEventListener('abort', forward, { once: true })
  return controller.signal
}

/**
 * The name an error or abort reason carries. Read by name, not by class:
 * a `DOMException` raised in one realm (jsdom, a worker) is no `Error` of
 * another, and the name is what the platform promises.
 */
export function errorName(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null
  const name = (error as { readonly name?: unknown }).name
  return typeof name === 'string' ? name : null
}

/** Whether an abort reason (or a thrown error) is a deadline, not a caller giving up. */
export function isTimeoutReason(reason: unknown): boolean {
  return errorName(reason) === 'TimeoutError'
}

/**
 * Throws when the caller gave up, and only then: a signal that fired on its
 * deadline lets the read go on to its own failure handling.
 */
export function throwIfCancelled(signal: AbortSignal | undefined): void {
  if (signal?.aborted && !isTimeoutReason(signal.reason)) signal.throwIfAborted()
}
