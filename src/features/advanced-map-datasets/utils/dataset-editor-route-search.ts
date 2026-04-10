export type DatasetEditorValuesView = 'table' | 'map';

function readLocationSearchParam(name: string): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const value = new URLSearchParams(window.location.search).get(name);
  if (typeof value !== 'string') {
    return undefined;
  }

  return value;
}

export function readDatasetEditorSearchString(
  rawSearch: unknown,
  key: string
): string | undefined {
  if (typeof rawSearch === 'object' && rawSearch !== null) {
    const rawValue = (rawSearch as Record<string, unknown>)[key];
    if (typeof rawValue === 'string') {
      return rawValue;
    }
  }

  return readLocationSearchParam(key);
}

export function readDatasetEditorValuesView(rawSearch: unknown): DatasetEditorValuesView {
  return readDatasetEditorSearchString(rawSearch, 'valuesView') === 'map'
    ? 'map'
    : 'table';
}
