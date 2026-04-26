import { useCallback, useMemo } from 'react';
import { z } from 'zod';

const SELECTED_SIRUTA_PARAM = 'selectedSiruta';

const PublicMapSelectionSearchSchema = z.object({
  [SELECTED_SIRUTA_PARAM]: z
    .union([z.string(), z.number()])
    .transform((value) => String(value).trim())
    .refine((value) => value.length > 0)
    .optional(),
});

interface UsePublicMapSelectionUrlSyncInput {
  rawSearch: unknown;
  updatePublicMapSearch: (
    searchUpdater: (previousSearch: Record<string, unknown>) => Record<string, unknown>
  ) => void;
}

export interface UsePublicMapSelectionUrlSyncResult {
  /**
   * SIRUTA code currently captured in the URL, if any. The public view
   * uses this to seed (and continuously re-sync) the entity details
   * panel so a shared link reopens to the same UAT.
   */
  selectedSirutaOverride?: string;
  /**
   * Writes the next selected SIRUTA into the URL search. Pass `undefined`
   * to clear the selection (e.g. when the user closes the panel).
   */
  onSelectedSirutaChange: (nextSiruta: string | undefined) => void;
}

/**
 * Two-way binding between the public map's `selectedSiruta` URL search
 * param and the entity-details panel selection. Mirrors the pattern used
 * by `usePublicMapViewportUrlSync` so URL updates stay `replace`-based and
 * silent.
 */
export function usePublicMapSelectionUrlSync({
  rawSearch,
  updatePublicMapSearch,
}: Readonly<UsePublicMapSelectionUrlSyncInput>): UsePublicMapSelectionUrlSyncResult {
  const selectedSirutaOverride = useMemo(() => {
    const record =
      typeof rawSearch === 'object' && rawSearch !== null
        ? (rawSearch as Record<string, unknown>)
        : {};

    const parsed = PublicMapSelectionSearchSchema.safeParse(record);
    return parsed.success ? parsed.data[SELECTED_SIRUTA_PARAM] : undefined;
  }, [rawSearch]);

  const onSelectedSirutaChange = useCallback(
    (nextSiruta: string | undefined) => {
      updatePublicMapSearch((previousSearch) => {
        const trimmedNext =
          typeof nextSiruta === 'string' ? nextSiruta.trim() : '';
        const previousValue =
          typeof previousSearch[SELECTED_SIRUTA_PARAM] === 'string' ||
          typeof previousSearch[SELECTED_SIRUTA_PARAM] === 'number'
            ? String(previousSearch[SELECTED_SIRUTA_PARAM]).trim()
            : '';

        if (trimmedNext.length === 0 && previousValue.length === 0) {
          return previousSearch;
        }
        if (trimmedNext.length > 0 && previousValue === trimmedNext) {
          return previousSearch;
        }

        const nextSearch: Record<string, unknown> = { ...previousSearch };
        if (trimmedNext.length === 0) {
          delete nextSearch[SELECTED_SIRUTA_PARAM];
        } else {
          nextSearch[SELECTED_SIRUTA_PARAM] = trimmedNext;
        }
        return nextSearch;
      });
    },
    [updatePublicMapSearch]
  );

  return {
    selectedSirutaOverride,
    onSelectedSirutaChange,
  };
}
