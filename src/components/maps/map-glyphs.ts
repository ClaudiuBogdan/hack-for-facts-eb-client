/**
 * The MapLibre map's label font. MapLibre fetches glyphs in ranges of 256 code
 * points from the style's URL template, and only once the worker has laid the
 * boundaries out, so the ranges every label needs are served from this site
 * (`public/map-glyphs/`, Noto Sans under the SIL Open Font License, its notice
 * beside the files) and fetched with the renderer, ahead of that point. Any
 * other range still comes from MapLibre's demo server.
 *
 * The folder is dated: a new rendering of the font goes in a new folder, never
 * over this one, so `nitro.config.ts` lets browsers keep the files for a year.
 */

export const MAP_LABEL_FONTSTACK = 'Noto Sans Regular';

export const MAPLIBRE_GLYPHS_URL = 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf';

const SELF_HOSTED_GLYPHS_PATH = '/map-glyphs/noto-sans-regular-2026-10-28';

/**
 * Basic Latin and Latin-1, Latin Extended-A (ă, ş, ţ) and Latin Extended-B
 * (ș, ț): the ranges a map's first labels ask for.
 */
export const FIRST_FRAME_GLYPH_RANGES = ['0-255', '256-511', '512-767'] as const;

/** Plus General Punctuation (…, –), for a shortened label. */
const SELF_HOSTED_GLYPH_RANGES: ReadonlySet<string> = new Set([...FIRST_FRAME_GLYPH_RANGES, '8192-8447']);

const GLYPHS_URL_PREFIX = MAPLIBRE_GLYPHS_URL.slice(0, MAPLIBRE_GLYPHS_URL.indexOf('{fontstack}'));

export function selfHostedGlyphPath(range: string): string {
  return `${SELF_HOSTED_GLYPHS_PATH}/${range}.pbf`;
}

function decodeFontstack(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/**
 * This site's path for a glyph request MapLibre built from
 * `MAPLIBRE_GLYPHS_URL`, or null when the range is not served here.
 */
export function resolveSelfHostedGlyphPath(url: string): string | null {
  if (!url.startsWith(GLYPHS_URL_PREFIX)) return null;
  const rest = url.slice(GLYPHS_URL_PREFIX.length);
  const slash = rest.lastIndexOf('/');
  if (slash < 0 || !rest.endsWith('.pbf')) return null;
  const fontstack = decodeFontstack(rest.slice(0, slash));
  const range = rest.slice(slash + 1, -'.pbf'.length);
  if (fontstack !== MAP_LABEL_FONTSTACK || !SELF_HOSTED_GLYPH_RANGES.has(range)) return null;
  return selfHostedGlyphPath(range);
}
