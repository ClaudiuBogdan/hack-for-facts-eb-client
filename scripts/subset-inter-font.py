#!/usr/bin/env python3
"""
Subset Inter to the Latin core the app is written in (`src/styles/fonts.css`).

    python3 -m venv /tmp/fonttools && /tmp/fonttools/bin/pip install fonttools==4.60.1 brotli==1.1.0
    /tmp/fonttools/bin/python scripts/subset-inter-font.py public/fonts/Inter src/assets/fonts

Writes `inter-latin.woff2` and `inter-italic-latin.woff2`, keeping both variable axes (weight, optical
size), every OpenType feature (tabular figures, case forms, ...) and the hinting, so the core renders
exactly as the full font does. The source's timestamp is kept: the same input gives the same bytes, so a
rerun changes no hashed URL.

Prints the two `unicode-range` values for `fonts.css`: the core's, and the full font's — the characters
Inter has outside the core, exactly. The full face must not claim characters Inter lacks: a page that
prints one (the language menu's flag emoji) would download the whole font only to find no glyph in it.
"""
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

CORE = [(0x0000, 0x017F), (0x0218, 0x021B), (0x02C6, 0x02C7), (0x02D8, 0x02DD), (0x0394, 0x0394), (0x03A3, 0x03A3), (0x03BB, 0x03BB),
        (0x2000, 0x206F), (0x2070, 0x209F), (0x20AC, 0x20AC), (0x2116, 0x2116), (0x2122, 0x2122), (0x2190, 0x21FF),
        (0x2205, 0x2205), (0x2212, 0x2212), (0x221A, 0x221A), (0x221E, 0x221E), (0x2248, 0x2248), (0x2260, 0x2260), (0x2264, 0x2265),
        (0x2318, 0x2318), (0x25B2, 0x25B2), (0x25BC, 0x25BC), (0x2713, 0x2713), (0xFEFF, 0xFEFF), (0xFFFD, 0xFFFD)]
FONTS = {'Inter-VariableFont_opsz,wght.woff2': 'inter-latin.woff2', 'Inter-Italic-VariableFont_opsz,wght.woff2': 'inter-italic-latin.woff2'}


def runs(codepoints):
    out = []
    for c in sorted(codepoints):
        if out and c == out[-1][1] + 1:
            out[-1][1] = c
        else:
            out.append([c, c])
    return out


def fmt(ranges):
    return ', '.join(f'U+{a:04X}' if a == b else f'U+{a:04X}-{b:04X}' for a, b in ranges)


def main(source_dir, target_dir):
    core = {u for a, b in CORE for u in range(a, b + 1)}
    outside = set()
    for source, target in FONTS.items():
        font = TTFont(Path(source_dir) / source, recalcTimestamp=False)
        cmap = set(font.getBestCmap())
        outside |= cmap - core
        options = subset.Options()
        options.flavor = 'woff2'
        options.layout_features = ['*']
        options.name_IDs = ['*']
        options.name_languages = ['*']
        options.notdef_outline = True
        options.hinting = True
        subsetter = subset.Subsetter(options)
        subsetter.populate(unicodes=sorted(cmap & core))
        subsetter.subset(font)
        subset.save_font(font, Path(target_dir) / target, options)
        print(f'{target}: {len(cmap & core)} of {len(cmap)} characters, {(Path(target_dir) / target).stat().st_size} bytes', file=sys.stderr)
    print('CORE', fmt(CORE))
    print('FULL', fmt(runs(outside)))


if __name__ == '__main__':
    main(*sys.argv[1:3])
