import { onlineManager, type QueryClient } from '@tanstack/react-query';
import { fetchPublicMapPayload } from '@/features/advanced-map-analytics/api/advanced-map-analytics-transport';

/**
 * A public map's read started by its route at the click (or a hover), handed
 * to the page's query, which decodes it with code that arrives with the page:
 * the route, which every page evaluates, carries no decoder
 * (docs/route-contracts.md).
 *
 * It is a handoff, not a cache: the page's query takes a read once, and only
 * one younger than `HANDOFF_MS`; any other fetch of the query (a retry, a
 * refetch, a read after a save) asks the network itself. So the query keeps
 * its own retries, freshness and invalidation, with one request for a visit.
 * A read nobody takes is aborted and forgotten after `HANDOFF_MS`, so an
 * abandoned hover holds neither a connection nor a payload. Freshness counts
 * from the take, so a handed-over map can stay fresh up to `HANDOFF_MS` longer
 * than its response's age.
 */
const HANDOFF_MS = 15_000;

/** The decoded map's query key (`advancedMapAnalyticsKeys.public`), here so the route can read it without the hooks. */
export function publicMapQueryKey(publicId: string) {
  return ['advanced-map-analytics', 'public', publicId] as const;
}

/** How long a decoded public map stays fresh (its query's `staleTime`). */
export const PUBLIC_MAP_STALE_MS = 60_000;

type Read = { readonly payload: Promise<unknown>; readonly startedAt: number; readonly abort: AbortController; readonly timer: ReturnType<typeof setTimeout> };

const reads = new Map<string, Read>();

function discard(publicId: string, read: Read): void {
  clearTimeout(read.timer);
  read.abort.abort();
  if (reads.get(publicId) === read) reads.delete(publicId);
}

/**
 * Start the map's read, unless the page has the map fresh, its query is already
 * fetching or waiting to (a read started now could be taken by a later retry,
 * after it had failed), the browser is offline (the query's own pause and
 * retries govern then), or a read is under way.
 */
export function startPublicMapRead(queryClient: QueryClient, publicId: string): void {
  if (!onlineManager.isOnline()) return;
  const now = Date.now();
  const state = queryClient.getQueryState(publicMapQueryKey(publicId));
  if (state?.fetchStatus && state.fetchStatus !== 'idle') return;
  if (state?.data !== undefined && !state.isInvalidated && now - state.dataUpdatedAt < PUBLIC_MAP_STALE_MS) return;
  const pending = reads.get(publicId);
  if (pending && now - pending.startedAt < HANDOFF_MS) return;
  if (pending) discard(publicId, pending);
  const abort = new AbortController();
  const payload = fetchPublicMapPayload(publicId, abort.signal);
  // A rejection is the page query's to report, if it takes this read.
  payload.catch(() => {});
  const read: Read = { payload, startedAt: now, abort, timer: setTimeout(() => discard(publicId, read), HANDOFF_MS) };
  reads.set(publicId, read);
}

/** The read the route started for this map, at most once and while it is young; otherwise none. */
export function takePublicMapRead(publicId: string): Promise<unknown> | undefined {
  const read = reads.get(publicId);
  if (!read) return undefined;
  reads.delete(publicId);
  clearTimeout(read.timer);
  if (Date.now() - read.startedAt < HANDOFF_MS) return read.payload;
  read.abort.abort();
  return undefined;
}

/** Forget started reads (all, or one map's): a save or a removal makes them out of date. */
export function dropPublicMapReads(publicIds?: readonly string[]): void {
  const ids = !publicIds || publicIds.length === 0 ? [...reads.keys()] : publicIds;
  for (const publicId of ids) {
    const read = reads.get(publicId);
    if (read) discard(publicId, read);
  }
}
