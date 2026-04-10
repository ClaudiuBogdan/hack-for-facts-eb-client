import { describe, expect, it } from 'vitest';
import { shouldBlockAdvancedMapDatasetNavigation } from './advanced-map-dataset-unsaved-changes';

describe('advanced-map-dataset-unsaved-changes', () => {
  it('blocks only dirty navigations that change pathname', () => {
    expect(
      shouldBlockAdvancedMapDatasetNavigation({
        isDirty: true,
        isSaving: false,
        currentPathname: '/maps/datasets/new',
        nextPathname: '/maps/datasets/123',
      })
    ).toBe(true);

    expect(
      shouldBlockAdvancedMapDatasetNavigation({
        isDirty: true,
        isSaving: true,
        currentPathname: '/maps/datasets/new',
        nextPathname: '/maps/datasets/123',
      })
    ).toBe(false);

    expect(
      shouldBlockAdvancedMapDatasetNavigation({
        isDirty: false,
        currentPathname: '/maps/datasets/new',
        nextPathname: '/maps/datasets/123',
      })
    ).toBe(false);
  });

  it('does not block query-only transitions', () => {
    expect(
      shouldBlockAdvancedMapDatasetNavigation({
        isDirty: true,
        currentPathname: '/maps/datasets/123',
        nextPathname: '/maps/datasets/123',
      })
    ).toBe(false);
  });
});

