import type { UatProperties } from '@/components/maps/interfaces';
import { t } from '@lingui/core/macro';

/**
 * Reads the entity CUI off a UAT GeoJSON feature, accommodating the different
 * naming conventions used by the upstream geometry/datasets.
 */
export function getEntityCuiFromUatProperties(
  properties: UatProperties | undefined
): string | undefined {
  if (!properties) {
    return undefined;
  }

  const rawCandidates = [
    properties.cui,
    properties.uat_code,
    properties.uatCode,
    properties.entity_cui,
    properties.entityCui,
  ];

  for (const candidate of rawCandidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }

    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return String(candidate);
    }
  }

  return undefined;
}

/**
 * Strips diacritic-stripped legalese suffixes from the natLevName property
 * (e.g., "altul decat resedinta de judet"), returning the canonical level
 * prefix used in tooltips/titles.
 */
export function normalizeNatLevelPrefix(rawNatLevelName: unknown): string {
  if (typeof rawNatLevelName !== 'string') {
    return '';
  }

  const normalized = rawNatLevelName
    .replace(/\s*,?\s*altul decat resedinta de judet/gi, '')
    .replace(/\s*,?\s*resedinta de judet/gi, '')
    .replace(/\s*,?\s*sectoarele municipiului Bucuresti/gi, '')
    .trim()
    .replace(/\s+/g, ' ');

  return normalized;
}

/**
 * Builds the display title for a UAT, prefixing the level (e.g. "Municipiul")
 * when available and falling back to a localized "Selected UAT" label.
 */
export function resolveUatDisplayTitle(
  properties: UatProperties | undefined,
  fallbackName?: string
): string {
  const rawName =
    typeof properties?.name === 'string' && properties.name.trim().length > 0
      ? properties.name.trim()
      : fallbackName?.trim() || t`Selected UAT`;
  const natLevelPrefix = normalizeNatLevelPrefix(properties?.natLevName);

  return natLevelPrefix.length > 0 ? `${natLevelPrefix} ${rawName}`.trim() : rawName;
}

/**
 * Escapes a value before it is interpolated into HTML. Used when assembling
 * tooltip strings that are passed to Leaflet bindings.
 */
export function escapeHtmlValue(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
