import { INS_ROOT_CONTEXTS } from '@/lib/ins/ins-metric-registry';
import type { ExplorerMode, InsUrlState, TemporalSplit } from './ins-stats-view.types';

export const INS_URL_KEYS = {
  dataset: 'insDataset',
  search: 'insSearch',
  root: 'insRoot',
  temporal: 'insTemporal',
  explorer: 'insExplorer',
  series: 'insSeries',
  unit: 'insUnit',
} as const;

export function parseSeriesSelection(value: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const segment of value.split(';')) {
    const [rawTypeCode, ...rawValueParts] = segment.split(':');
    const typeCode = rawTypeCode?.trim();
    const rawValues = rawValueParts.join(':').trim();
    if (!typeCode || !/^[A-Za-z0-9_.-]+$/.test(typeCode)) continue;
    if (!rawValues) continue;

    const values = Array.from(
      new Set(
        rawValues
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean)
      )
    );

    if (values.length === 0) continue;
    result[typeCode] = values;
  }

  return result;
}

export function serializeSeriesSelection(selection: Record<string, string[]>): string {
  return Object.entries(selection)
    .map(([typeCode, rawValues]) => {
      const cleanTypeCode = typeCode.trim();
      const cleanValues = Array.from(
        new Set(
          rawValues
            .map((value) => value.trim())
            .filter(Boolean)
        )
      );

      if (!cleanTypeCode || cleanValues.length === 0) return null;
      return `${cleanTypeCode}:${cleanValues.join(',')}`;
    })
    .filter((entry): entry is string => entry !== null)
    .sort((left, right) => left.localeCompare(right, 'ro'))
    .join(';');
}

export function extractRawSeriesCode(selectionCode: string): string {
  if (selectionCode.startsWith('fallback:')) {
    const payload = selectionCode.slice('fallback:'.length);
    const [rawCode] = payload.split('|');
    return rawCode?.trim() || selectionCode;
  }

  if (selectionCode.startsWith('id:')) {
    return selectionCode;
  }

  return selectionCode;
}

export function normalizeSeriesSelectionForUrl(
  selection: Record<string, string[]>
): Record<string, string[]> {
  const normalizedSelection: Record<string, string[]> = {};

  for (const [typeCode, selectedCodes] of Object.entries(selection)) {
    const cleanedTypeCode = typeCode.trim();
    if (!cleanedTypeCode) continue;

    const cleanedCodes = Array.from(
      new Set(
        selectedCodes
          .map((selectedCode) => extractRawSeriesCode(selectedCode))
          .map((selectedCode) => selectedCode.trim())
          .filter(Boolean)
      )
    );

    if (cleanedCodes.length === 0) continue;
    normalizedSelection[cleanedTypeCode] = cleanedCodes;
  }

  return normalizedSelection;
}

export function parseInsUrlState(searchParams: URLSearchParams): InsUrlState {
  const datasetCodeRaw = searchParams.get(INS_URL_KEYS.dataset)?.trim().toUpperCase() ?? '';
  const datasetCode = /^[A-Z0-9_]+$/.test(datasetCodeRaw) ? datasetCodeRaw : null;

  const search = (searchParams.get(INS_URL_KEYS.search) ?? '').trim();
  const rootCodeRaw = searchParams.get(INS_URL_KEYS.root)?.trim() ?? '';
  const rootCode = INS_ROOT_CONTEXTS.some((root) => root.code === rootCodeRaw) ? rootCodeRaw : '';

  const temporalSplitRaw = searchParams.get(INS_URL_KEYS.temporal)?.trim() ?? '';
  const temporalSplit: TemporalSplit =
    temporalSplitRaw === 'year' || temporalSplitRaw === 'quarter' || temporalSplitRaw === 'month'
      ? temporalSplitRaw
      : 'all';

  const explorerRaw = searchParams.get(INS_URL_KEYS.explorer)?.trim() ?? '';
  const explorerMode: ExplorerMode = explorerRaw === 'expanded' ? 'expanded' : 'collapsed';
  const seriesRaw = searchParams.get(INS_URL_KEYS.series)?.trim() ?? '';
  const seriesSelection = parseSeriesSelection(seriesRaw);
  const unitRaw = searchParams.get(INS_URL_KEYS.unit)?.trim() ?? '';
  const unitKey = unitRaw === '' ? null : unitRaw;

  return {
    datasetCode,
    search,
    rootCode,
    temporalSplit,
    explorerMode,
    seriesSelection,
    unitKey,
  };
}

export function writeInsUrlState(params: {
  datasetCode: string | null;
  search: string;
  rootCode: string;
  temporalSplit: TemporalSplit;
  explorerMode: ExplorerMode;
  seriesSelection: Record<string, string[]>;
  unitKey: string | null;
}) {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  const searchParams = url.searchParams;

  if (params.datasetCode && params.datasetCode.trim() !== '') {
    searchParams.set(INS_URL_KEYS.dataset, params.datasetCode);
  } else {
    searchParams.delete(INS_URL_KEYS.dataset);
  }

  if (params.search.trim() !== '') {
    searchParams.set(INS_URL_KEYS.search, params.search.trim());
  } else {
    searchParams.delete(INS_URL_KEYS.search);
  }

  if (params.rootCode.trim() !== '') {
    searchParams.set(INS_URL_KEYS.root, params.rootCode);
  } else {
    searchParams.delete(INS_URL_KEYS.root);
  }

  if (params.temporalSplit !== 'all') {
    searchParams.set(INS_URL_KEYS.temporal, params.temporalSplit);
  } else {
    searchParams.delete(INS_URL_KEYS.temporal);
  }

  if (params.explorerMode !== 'collapsed') {
    searchParams.set(INS_URL_KEYS.explorer, params.explorerMode);
  } else {
    searchParams.delete(INS_URL_KEYS.explorer);
  }

  const serializedSeriesSelection = serializeSeriesSelection(params.seriesSelection);
  if (serializedSeriesSelection !== '') {
    searchParams.set(INS_URL_KEYS.series, serializedSeriesSelection);
  } else {
    searchParams.delete(INS_URL_KEYS.series);
  }

  if (params.unitKey && params.unitKey.trim() !== '') {
    searchParams.set(INS_URL_KEYS.unit, params.unitKey.trim());
  } else {
    searchParams.delete(INS_URL_KEYS.unit);
  }

  const nextSearch = searchParams.toString();
  const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
  window.history.replaceState(window.history.state, '', nextUrl);
}
