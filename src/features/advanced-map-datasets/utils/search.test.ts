import { describe, expect, it } from 'vitest';
import type { AdvancedMapDatasetDraftRow } from '@/features/advanced-map-datasets/types';
import { matchesAdvancedMapDatasetRowSearch } from './search';

describe('advanced-map-datasets search', () => {
  it('matches only against name, cui, and siruta', () => {
    const row: AdvancedMapDatasetDraftRow = {
      uatId: 'uat-1',
      sirutaCode: '143450',
      cui: '4270740',
      name: 'Sibiu',
      levelName: null,
      countyName: 'Sibiu',
      countyCode: 'SB',
      isCounty: false,
      valueNumber: '',
      valueJson: null,
      value: '',
      rawValue: '',
      valueText: '',
      source: 'manual',
      importedFrom: 'manual',
      isEmpty: true,
      parsedNumericValue: null,
      validationMessage: null,
      validationError: null,
      reference: {
        uatId: 'uat-1',
        id: 'uat-1',
        cui: '4270740',
        sirutaCode: '143450',
        name: 'Sibiu',
        levelName: 'Municipiu resedinta de judet',
        countyName: 'Sibiu',
        countyCode: 'SB',
        isCounty: false,
      },
    };

    expect(matchesAdvancedMapDatasetRowSearch(row, 'sibiu')).toBe(true);
    expect(matchesAdvancedMapDatasetRowSearch(row, '4270740')).toBe(true);
    expect(matchesAdvancedMapDatasetRowSearch(row, '143450')).toBe(true);
    expect(matchesAdvancedMapDatasetRowSearch(row, 'municipiul sibiu')).toBe(false);
    expect(matchesAdvancedMapDatasetRowSearch(row, 'cristian')).toBe(false);
  });
});
