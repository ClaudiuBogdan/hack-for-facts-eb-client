import { describe, expect, it } from 'vitest';

import { AdvancedMapAnalyticsUrlStateSchema } from '@/schemas/advanced-map-analytics';
import { getAdvancedMapAnalyticsDraftSizeWarningLength } from './map-analytics-draft-size';

describe('advanced map analytics draft size warning', () => {
  it('ignores viewport-only changes', () => {
    const baseState = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Viewport test',
      mapCenter: [45.9, 24.9],
      mapZoom: 7,
    });
    const movedState = {
      ...baseState,
      mapCenter: [46.5, 25.4] as [number, number],
      mapZoom: 10,
    };

    expect(
      getAdvancedMapAnalyticsDraftSizeWarningLength({
        mapState: movedState,
        mapDescription: 'Same content',
      }),
    ).toBe(
      getAdvancedMapAnalyticsDraftSizeWarningLength({
        mapState: baseState,
        mapDescription: 'Same content',
      }),
    );
  });

  it('still tracks actual draft content changes', () => {
    const baseState = AdvancedMapAnalyticsUrlStateSchema.parse({
      mapName: 'Draft test',
    });
    const renamedState = {
      ...baseState,
      mapName: 'Draft test with longer name',
    };

    expect(
      getAdvancedMapAnalyticsDraftSizeWarningLength({
        mapState: renamedState,
        mapDescription: 'Same content',
      }),
    ).toBeGreaterThan(
      getAdvancedMapAnalyticsDraftSizeWarningLength({
        mapState: baseState,
        mapDescription: 'Same content',
      }),
    );
  });
});
