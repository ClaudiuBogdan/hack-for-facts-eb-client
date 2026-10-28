import { withDeadline } from '@/lib/ssr/deadline-signal'

/**
 * The parliament hub's first screen is read on the server, and those reads are
 * shared by every render through module memos. A request that stalls must
 * therefore fail at a deadline, at the transport, so the request itself is
 * aborted and its memo entry dropped; the next render asks again. In the
 * browser a read keeps its old behaviour, with no deadline.
 */
export const SERVER_READ_DEADLINE_MS = 5_000

/** A deadline signal on the server; nothing in the browser. */
export function serverReadSignal(): AbortSignal | undefined {
  return typeof window === 'undefined'
    ? withDeadline(undefined, SERVER_READ_DEADLINE_MS)
    : undefined
}
