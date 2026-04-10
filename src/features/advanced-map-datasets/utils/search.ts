import type { AdvancedMapDatasetDraftRow } from '@/features/advanced-map-datasets/types';

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeSearchText(value: string): string[] {
  const normalized = normalizeSearchText(value);
  return normalized === '' ? [] : normalized.split(' ');
}

function buildSearchableRowText(row: AdvancedMapDatasetDraftRow): string {
  return [
    row.name,
    row.cui,
    row.sirutaCode,
  ].join(' ');
}

export function matchesAdvancedMapDatasetRowSearch(row: AdvancedMapDatasetDraftRow, searchTerm: string): boolean {
  const searchTokens = tokenizeSearchText(searchTerm);
  if (searchTokens.length === 0) {
    return true;
  }

  const searchableText = normalizeSearchText(buildSearchableRowText(row));
  return searchTokens.every((token) => searchableText.includes(token));
}
