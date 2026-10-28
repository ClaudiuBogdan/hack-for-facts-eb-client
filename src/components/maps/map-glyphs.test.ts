import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FIRST_FRAME_GLYPH_RANGES, MAPLIBRE_GLYPHS_URL, resolveSelfHostedGlyphPath, selfHostedGlyphPath } from './map-glyphs';

const requestFor = (fontstack: string, range: string) => MAPLIBRE_GLYPHS_URL.replace('{fontstack}', fontstack).replace('{range}', range);

describe('map glyphs', () => {
  it('serves the label font ranges from this site', () => {
    expect(resolveSelfHostedGlyphPath(requestFor('Noto Sans Regular', '0-255'))).toBe('/map-glyphs/noto-sans-regular-2026-10-28/0-255.pbf');
    expect(resolveSelfHostedGlyphPath(requestFor('Noto Sans Regular', '512-767'))).toBe('/map-glyphs/noto-sans-regular-2026-10-28/512-767.pbf');
    expect(resolveSelfHostedGlyphPath(requestFor('Noto%20Sans%20Regular', '8192-8447'))).toBe('/map-glyphs/noto-sans-regular-2026-10-28/8192-8447.pbf');
  });

  it('leaves other ranges, fonts and URLs to their own server', () => {
    expect(resolveSelfHostedGlyphPath(requestFor('Noto Sans Regular', '1024-1279'))).toBeNull();
    expect(resolveSelfHostedGlyphPath(requestFor('Noto Sans Bold', '0-255'))).toBeNull();
    expect(resolveSelfHostedGlyphPath(requestFor('Noto%E0Sans', '0-255'))).toBeNull();
    expect(resolveSelfHostedGlyphPath('https://example.com/font/Noto Sans Regular/0-255.pbf')).toBeNull();
  });

  it('has a file for every preloaded range', () => {
    for (const range of FIRST_FRAME_GLYPH_RANGES) {
      expect(existsSync(`public${selfHostedGlyphPath(range)}`)).toBe(true);
    }
    expect(existsSync('public/map-glyphs/noto-sans-regular-2026-10-28/8192-8447.pbf')).toBe(true);
    expect(existsSync('public/map-glyphs/noto-sans-regular-2026-10-28/OFL.txt')).toBe(true);
  });
});
