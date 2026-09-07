import { describe, expect, it } from 'vitest';

import {
  mapInsDimensionValueToOption,
  pickDefaultDimensionValue,
  upsertSelectionRecord,
} from './ins-series-editor.utils';

describe('ins-series-editor utils', () => {
  it('keeps source member IDs and source-only Bucharest while canonical options prefer SIRUTA', () => {
    const county = { nom_item_id: 3075, dimension_type: 'TERRITORIAL' as const,
      classification_value: { type_code: 'D2', code: '3075', name_ro: 'Cluj' },
      territory: { code: 'CJ', canonical_siruta_code: '127', name_ro: 'Cluj' },
    };
    expect(mapInsDimensionValueToOption(county, 'territory')?.id).toBe('127');
    expect(mapInsDimensionValueToOption({ ...county, territory: { ...county.territory, siruta_code: 'CJ' } }, 'siruta')).toMatchObject({ id: '127', legacyIds: ['CJ'] });
    expect(mapInsDimensionValueToOption(county, 'source-territory', 'D2')?.id).toBe('3075');
    expect(mapInsDimensionValueToOption({ ...county, territory: { code: 'B', canonical_siruta_code: null } }, 'territory')?.id).toBe('B');
  });

  it('upserts and removes selection keys', () => {
    const updated = upsertSelectionRecord({ SEXE: ['M'], MEDIU: ['TOTAL'] }, 'SEXE', ['F']);
    expect(updated).toEqual({ SEXE: ['F'], MEDIU: ['TOTAL'] });

    const removed = upsertSelectionRecord(updated, 'SEXE', []);
    expect(removed).toEqual({ MEDIU: ['TOTAL'] });

    const cleared = upsertSelectionRecord({ SEXE: ['M'] }, 'SEXE', []);
    expect(cleared).toBeUndefined();
  });

  it('picks RO territory first as default', () => {
    const selected = pickDefaultDimensionValue([
      {
        nom_item_id: 1,
        dimension_type: 'TERRITORIAL',
        territory: { code: 'CJ', name_ro: 'Cluj' },
      },
      {
        nom_item_id: 2,
        dimension_type: 'TERRITORIAL',
        territory: { code: 'RO', name_ro: 'Romania' },
      },
    ]);

    expect(selected?.territory?.code).toBe('RO');
  });

  it('picks total-like values with diacritics-insensitive matching', () => {
    const selected = pickDefaultDimensionValue([
      {
        nom_item_id: 1,
        dimension_type: 'CLASSIFICATION',
        label_ro: 'Bărbați',
      },
      {
        nom_item_id: 2,
        dimension_type: 'CLASSIFICATION',
        label_ro: 'TOTAL GENERAL',
      },
    ]);

    expect(selected?.nom_item_id).toBe(2);
  });

  it('maps dimension values to option labels across kinds', () => {
    const classification = mapInsDimensionValueToOption(
      {
        nom_item_id: 1,
        dimension_type: 'CLASSIFICATION',
        classification_value: {
          type_code: 'SEXE',
          code: 'M',
          name_ro: 'Masculin',
        },
      },
      'classification',
      'SEXE'
    );
    expect(classification).toEqual({ id: 'M', label: 'M - Masculin' });

    const unit = mapInsDimensionValueToOption(
      {
        nom_item_id: 2,
        dimension_type: 'UNIT_OF_MEASURE',
        unit: {
          code: 'PERS',
          name_ro: 'Persoane',
        },
      },
      'unit'
    );
    expect(unit).toEqual({ id: 'PERS', label: 'PERS - Persoane' });

    const territory = mapInsDimensionValueToOption(
      {
        nom_item_id: 3,
        dimension_type: 'TERRITORIAL',
        territory: {
          code: 'CJ',
          name_ro: 'Cluj',
        },
      },
      'territory'
    );
    expect(territory).toEqual({ id: 'CJ', label: 'CJ - Cluj' });

    const siruta = mapInsDimensionValueToOption(
      {
        nom_item_id: 4,
        dimension_type: 'TERRITORIAL',
        territory: {
          siruta_code: '54975',
          code: 'SB',
          name_ro: 'Municipiul Sibiu',
        },
      },
      'siruta'
    );
    expect(siruta).toEqual({
      id: '54975',
      label: '54975 - Municipiul Sibiu (SB)',
    });
  });

  it('prefers english labels when locale is en', () => {
    const classification = mapInsDimensionValueToOption(
      {
        nom_item_id: 1,
        dimension_type: 'CLASSIFICATION',
        classification_value: {
          type_code: 'SEXE',
          code: 'M',
          name_ro: 'Masculin',
          name_en: 'Male',
        },
      },
      'classification',
      'SEXE',
      'en'
    );
    expect(classification).toEqual({ id: 'M', label: 'M - Male' });

    const unit = mapInsDimensionValueToOption(
      {
        nom_item_id: 2,
        dimension_type: 'UNIT_OF_MEASURE',
        unit: {
          code: 'PERS',
          name_ro: 'Persoane',
          name_en: 'Persons',
        },
      },
      'unit',
      undefined,
      'en'
    );
    expect(unit).toEqual({ id: 'PERS', label: 'PERS - Persons' });

    const territory = mapInsDimensionValueToOption(
      {
        nom_item_id: 3,
        dimension_type: 'TERRITORIAL',
        territory: {
          code: 'CJ',
          name_ro: 'Cluj',
          name_en: 'Cluj County',
        },
      },
      'territory',
      undefined,
      'en'
    );
    expect(territory).toEqual({ id: 'CJ', label: 'CJ - Cluj County' });
  });
});
