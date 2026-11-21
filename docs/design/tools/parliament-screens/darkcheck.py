"""Dark contrast sweep of screens.mjs samples: python3 -I darkcheck.py <outDir> [--all]

For every text node sampled in dark mode, the background is the median colour of its box in the text-hidden shot
(so tints, glows and overlays count as composited), and the text colour is its computed colour composited with its
opacity chain over that background. Fails below 4.5:1, or 3:1 for large text (>= 24 px, or >= 18.66 px at 700+).
Prints failures grouped by route, then a total.
"""
import sys, glob, os, json
import numpy as np
from PIL import Image

out = sys.argv[1]
show_all = '--all' in sys.argv


def lum(rgb):
    c = np.asarray(rgb, dtype=float) / 255
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def ratio(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)


fails = 0
checked = 0
for jf in sorted(glob.glob(os.path.join(out, 'dark.*.json'))):
    data = json.load(open(jf))
    stem = jf[:-5]
    lines = []
    for shot in data['meta']:
        img = np.asarray(Image.open(f"{stem}.{shot['idx']}.bg.png").convert('RGB')).astype(float)
        H, W = img.shape[:2]
        for r in shot['rects']:
            x0, y0 = max(0, int(r['x'])), max(0, int(r['y']))
            x1, y1 = min(W, int(r['x'] + r['w'])), min(H, int(r['y'] + r['h']))
            if x1 <= x0 or y1 <= y0:
                continue
            bg = np.median(img[y0:y1, x0:x1].reshape(-1, 3), axis=0)
            fr, fg_, fb, fa = r['fg']
            alpha = (fa / 255) * r['op']
            fg = np.array([fr, fg_, fb]) * alpha + bg * (1 - alpha)
            cr = ratio(fg, bg)
            large = r['size'] >= 24 or (r['size'] >= 18.66 and r['weight'] >= 700)
            need = 3 if large else 4.5
            checked += 1
            if cr < need or show_all:
                fails += cr < need
                lines.append(f"  {cr:5.2f} (need {need}) {r['size']:.0f}px \"{r['text']}\" fg={tuple(int(v) for v in fg)} bg={tuple(int(v) for v in bg)} cls={r['cls'][:110]}")
    if lines or data['errors']:
        print(f"{data['route']} @{data['width']}: {len([l for l in lines])} flagged; page errors {len(data['errors'])}")
        for l in lines[:40]:
            print(l)
        for e in data['errors'][:3]:
            print('  ERROR', e)
print(f'{fails} failing text node(s) of {checked} checked')
