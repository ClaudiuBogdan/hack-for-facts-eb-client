import type { QueryClient } from '@tanstack/react-query';
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
 * its own retries, freshness and invalidation exactly, with one request for a
 * visit.
 */
const HANDOFF_MS = 15_000;

/** The decoded map's query key (`advancedMapAnalyticsKeys.public`), here so the route can read it without the hooks. */
export function publicMapQueryKey(publicId: string) {
  return ['advanced-map-analytics', 'public', publicId] as const;
}

/** How long a decoded public map stays fresh (its query's `staleTime`). */
export const PUBLIC_MAP_STALE_MS = 60_000;

const reads = new Map<string, { readonly payload: Promise<unknown>; readonly startedAt: number }>();

/** Start the map's read, unless the page already has a fresh map or a read is under way. */
export function startPublicMapRead(queryClient: QueryClient, publicId: string): void {
  const now = Date.now();
  const state = queryClient.getQueryState(publicMapQueryKey(publicId));
  if (state?.data !== undefined && !state.isInvalidated && now - state.dataUpdatedAt < PUBLIC_MAP_STALE_MS) return;
  const pending = reads.get(publicId);
  if (pending && now - pending.startedAt < HANDOFF_MS) return;
  const payload = fetchPublicMapPayload(publicId);
  // A rejection is the page query's to report, if it takes this read.
  payload.catch(() => {});
  reads.set(publicId, { payload, startedAt: now });
}

/** The read the route started for this map, at most once and while it is young; otherwise none. */
export function takePublicMapRead(publicId: string): Promise<unknown> | undefined {
  const read = reads.get(publicId);
  reads.delete(publicId);
  return read && Date.now() - read.startedAt < HANDOFF_MS ? read.payload : undefined;
}

/** Forget started reads (all, or one map's): a save or a removal makes them out of date. */
export function dropPublicMapReads(publicIds?: readonly string[]): void {
  if (!publicIds || publicIds.length === 0) reads.clear();
  else for (const publicId of publicIds) reads.delete(publicId);
}
