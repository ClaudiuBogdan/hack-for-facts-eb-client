import { onlineManager, QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const fetchPayload = vi.hoisted(() => vi.fn());
const decode = vi.hoisted(() => vi.fn());
const warm = vi.hoisted(() => vi.fn());
vi.mock('@/features/advanced-map-analytics/api/advanced-map-analytics-transport', () => ({ fetchPublicMapPayload: fetchPayload }));
vi.mock('@/features/advanced-map-analytics/api/advanced-map-analytics-api', () => ({ decodePublicMapPayload: decode }));
vi.mock('@/features/advanced-map-analytics/analytics-map-warmup', () => ({ warmAdvancedAnalyticsMapResources: warm }));
vi.mock('@/lib/auth', () => ({ useOptionalUser: () => null }));

import { advancedMapAnalyticsPublicMapQueryOptions } from './use-advanced-map-analytics';
import { dropPublicMapReads, startPublicMapRead, takePublicMapRead } from './public-map-read';

const mapWith = (countyBoundaries: boolean, title = 'map') => ({ title, lastSnapshot: { config: { mapLayers: { countyBoundaries } } } });
// The app's policy: one retry.
const client = () => new QueryClient({ defaultOptions: { queries: { retry: 1, retryDelay: 0 } } });

beforeEach(() => {
  fetchPayload.mockReset();
  decode.mockReset().mockImplementation((payload: { title?: string }) => mapWith(false, payload?.title));
  warm.mockReset();
  dropPublicMapReads();
});
afterEach(() => {
  vi.useRealTimers();
  onlineManager.setOnline(true);
});

it('makes one request for a visit: the page takes the read the route started', async () => {
  const queryClient = client();
  fetchPayload.mockResolvedValue({ title: 'one' });

  startPublicMapRead(queryClient, 'm1');
  const map = await queryClient.fetchQuery(advancedMapAnalyticsPublicMapQueryOptions('m1'));

  expect(fetchPayload).toHaveBeenCalledTimes(1);
  expect(map).toEqual(mapWith(false, 'one'));
});

it('retries a failed read once, as any query does, and never leaves a rejection unhandled', async () => {
  const queryClient = client();
  fetchPayload.mockRejectedValue(new Error('404'));

  startPublicMapRead(queryClient, 'm2');
  await expect(queryClient.fetchQuery({ ...advancedMapAnalyticsPublicMapQueryOptions('m2'), retry: 1, retryDelay: 0 })).rejects.toThrow('404');

  // The route's read, then the query's one retry.
  expect(fetchPayload).toHaveBeenCalledTimes(2);
});

it('asks the network again when a response could not be decoded', async () => {
  const queryClient = client();
  fetchPayload.mockResolvedValueOnce({ title: 'bad' }).mockResolvedValueOnce({ title: 'good' });
  decode.mockImplementationOnce(() => {
    throw new Error('grouped-series data missing');
  });

  startPublicMapRead(queryClient, 'm3');
  const map = await queryClient.fetchQuery({ ...advancedMapAnalyticsPublicMapQueryOptions('m3'), retry: 1, retryDelay: 0 });

  expect(fetchPayload).toHaveBeenCalledTimes(2);
  expect(map).toEqual(mapWith(false, 'good'));
});

it('starts no read for a map the page already has fresh, and one once it is invalidated', async () => {
  const queryClient = client();
  fetchPayload.mockResolvedValue({ title: 'one' });
  await queryClient.fetchQuery(advancedMapAnalyticsPublicMapQueryOptions('m4'));
  fetchPayload.mockClear();

  startPublicMapRead(queryClient, 'm4');
  expect(fetchPayload).not.toHaveBeenCalled();

  await queryClient.invalidateQueries({ queryKey: ['advanced-map-analytics', 'public', 'm4'], refetchType: 'none' });
  startPublicMapRead(queryClient, 'm4');
  expect(fetchPayload).toHaveBeenCalledTimes(1);
});

it('drops a started read on a save, so the page reads the saved map', async () => {
  const queryClient = client();
  fetchPayload.mockResolvedValueOnce({ title: 'before' }).mockResolvedValueOnce({ title: 'after' });

  startPublicMapRead(queryClient, 'm5');
  dropPublicMapReads(['m5']);
  const map = await queryClient.fetchQuery(advancedMapAnalyticsPublicMapQueryOptions('m5'));

  expect(map).toEqual(mapWith(false, 'after'));
});

it('does not hand over a read older than its window, so freshness counts from the response', async () => {
  vi.useFakeTimers();
  const queryClient = client();
  fetchPayload.mockResolvedValueOnce({ title: 'hover' }).mockResolvedValueOnce({ title: 'visit' });

  startPublicMapRead(queryClient, 'm6');
  vi.advanceTimersByTime(16_000);
  const map = await queryClient.fetchQuery(advancedMapAnalyticsPublicMapQueryOptions('m6'));

  expect(map).toEqual(mapWith(false, 'visit'));
});

it('warms the county boundaries for a map that draws them', async () => {
  const queryClient = client();
  fetchPayload.mockResolvedValue({});
  decode.mockReturnValue(mapWith(true));

  await queryClient.fetchQuery(advancedMapAnalyticsPublicMapQueryOptions('m7'));

  expect(warm).toHaveBeenCalledWith({ queryClient, includeCountyGeoJson: true, preloadInteractiveMap: false });
});

it('aborts and forgets a read nobody takes, so an abandoned hover holds no connection or payload', () => {
  vi.useFakeTimers();
  const queryClient = client();
  fetchPayload.mockImplementation(() => new Promise(() => {}));

  startPublicMapRead(queryClient, 'm8');
  const signal = fetchPayload.mock.calls[0]![1] as AbortSignal;
  expect(signal.aborted).toBe(false);
  vi.advanceTimersByTime(15_001);

  expect(signal.aborted).toBe(true);
  expect(takePublicMapRead('m8')).toBeUndefined();
});

it('starts no read while the page\'s query is already fetching, so a later retry cannot take a failure from before it', async () => {
  const queryClient = client();
  fetchPayload.mockImplementation(() => new Promise(() => {}));
  void queryClient.fetchQuery(advancedMapAnalyticsPublicMapQueryOptions('m9')).catch(() => {});
  await Promise.resolve();
  fetchPayload.mockClear();

  startPublicMapRead(queryClient, 'm9');
  expect(fetchPayload).not.toHaveBeenCalled();
});

it('starts no read offline: the query\'s own pause and retries govern then', () => {
  const queryClient = client();
  onlineManager.setOnline(false);

  startPublicMapRead(queryClient, 'm10');
  expect(fetchPayload).not.toHaveBeenCalled();
});

it('aborts a read a newer one replaces', () => {
  vi.useFakeTimers();
  const queryClient = client();
  fetchPayload.mockImplementation(() => new Promise(() => {}));

  startPublicMapRead(queryClient, 'm11');
  const first = fetchPayload.mock.calls[0]![1] as AbortSignal;
  dropPublicMapReads(['m11']);
  expect(first.aborted).toBe(true);
});

it('aborts an expired read when a newer one for the same map replaces it, and hands over the newer one', () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  const queryClient = client();
  fetchPayload.mockImplementation(() => new Promise(() => {}));

  startPublicMapRead(queryClient, 'm12');
  const first = fetchPayload.mock.calls[0]![1] as AbortSignal;
  vi.setSystemTime(Date.now() + 15_001);
  startPublicMapRead(queryClient, 'm12');

  expect(first.aborted).toBe(true);
  expect(fetchPayload).toHaveBeenCalledTimes(2);
  expect(takePublicMapRead('m12')).toBeDefined();
});
