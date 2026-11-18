import { beforeEach, expect, it, vi } from 'vitest';

const warm = vi.hoisted(() => vi.fn());
const decode = vi.hoisted(() => vi.fn());
vi.mock('@/features/advanced-map-analytics/analytics-map-warmup', () => ({ warmAdvancedAnalyticsMapResources: warm }));
vi.mock('@/features/advanced-map-analytics/api/advanced-map-analytics-api', () => ({ decodePublicMapPayload: decode }));
vi.mock('@/lib/auth', () => ({ useOptionalUser: () => null }));

import { advancedMapAnalyticsPublicMapQueryOptions } from './use-advanced-map-analytics';

const mapWith = (countyBoundaries: boolean) => ({ lastSnapshot: { config: { mapLayers: { countyBoundaries } } } });

beforeEach(() => {
  warm.mockReset();
  decode.mockReset();
});

it('decodes the payload the route started, with one request, and warms the county boundaries the map draws', async () => {
  const payload = { raw: true };
  decode.mockReturnValue(mapWith(true));
  const client = { fetchQuery: vi.fn().mockResolvedValue(payload) };
  const options = advancedMapAnalyticsPublicMapQueryOptions('m1');

  const result = await (options.queryFn as (context: { client: unknown }) => Promise<unknown>)({ client });

  expect(client.fetchQuery).toHaveBeenCalledTimes(1);
  expect(client.fetchQuery.mock.calls[0]![0].queryKey).toEqual(['advanced-map-analytics', 'public', 'm1', 'payload']);
  expect(decode).toHaveBeenCalledWith(payload);
  expect(result).toEqual(mapWith(true));
  expect(warm).toHaveBeenCalledWith({ queryClient: client, includeCountyGeoJson: true, preloadInteractiveMap: false });
});

it('leaves the county boundaries alone for a map that does not draw them', async () => {
  decode.mockReturnValue(mapWith(false));
  const client = { fetchQuery: vi.fn().mockResolvedValue({}) };
  await (advancedMapAnalyticsPublicMapQueryOptions('m2').queryFn as (context: { client: unknown }) => Promise<unknown>)({ client });
  expect(warm).not.toHaveBeenCalled();
});

it('keeps the payload under the decoded query\'s key, so invalidating a public map covers both', () => {
  expect(advancedMapAnalyticsPublicMapQueryOptions('m3').queryKey).toEqual(['advanced-map-analytics', 'public', 'm3']);
});
