import { describe, expect, it } from 'vitest';
import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';
import {
  createMapConfigTransferEnvelope,
  parseMapConfigTransferInput,
} from '@/features/advanced-map-analytics/store/map-config-transfer';

describe('map-config-transfer', () => {
  it('parses wrapped map configuration payloads', () => {
    const mapState = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Wrapped import',
      activeView: 'table',
    });
    const wrappedPayload = createMapConfigTransferEnvelope({
      mapState,
      mapDescription: 'Wrapped description',
    });

    const parsed = parseMapConfigTransferInput(wrappedPayload);

    expect(parsed).toEqual({
      mapState,
      mapDescription: 'Wrapped description',
    });
  });

  it('parses bare map state payloads when they include map keys', () => {
    const parsed = parseMapConfigTransferInput({
      mapName: 'Bare import',
      activeView: 'table',
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.mapState.mapName).toBe('Bare import');
    expect(parsed?.mapState.activeView).toBe('table');
    expect(parsed?.mapDescription).toBe('');
  });

  it('rejects unrelated JSON objects', () => {
    expect(parseMapConfigTransferInput({ foo: 'bar' })).toBeNull();
  });

  it('rejects malformed wrapped payloads', () => {
    expect(
      parseMapConfigTransferInput({
        type: 'advanced-map-analytics-config',
        mapState: { invalid: true },
      })
    ).toBeNull();
  });
});
