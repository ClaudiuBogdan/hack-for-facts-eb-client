"""Light pixel diff of screens.mjs pairs: python3 -I pxdiff.py <outDir>

For each light.<route>.<width>.base.<kind>.png with a .new. partner, reports the differing pixel count and bounding
boxes (diff regions merged on a 16 px grid) and writes <name>.diff.png highlighting them. Zero output lines with
'DIFF' means light mode did not move.
"""
import sys, glob, os
import numpy as np
from PIL import Image

out = sys.argv[1]
total = 0
for base in sorted(glob.glob(os.path.join(out, 'light.*.base.*.png'))):
    new = base.replace('.base.', '.new.')
    name = os.path.basename(base).replace('.base.', '.')
    if not os.path.exists(new):
        print('MISSING', name)
        continue
    a = np.asarray(Image.open(base).convert('RGB')).astype(int)
    b = np.asarray(Image.open(new).convert('RGB')).astype(int)
    # Full-page shots: compare main only (the app shell is not parliament's).
    stem = base.rsplit('.base.', 1)[0]
    boxes = [os.path.join(out, os.path.basename(f'{stem}.{t}.main.json')) for t in ('base', 'new')]
    if base.endswith('.full.png') and all(os.path.exists(f) for f in boxes):
        import json
        ba, bb = (json.load(open(f)) for f in boxes)
        if ba and bb:
            if (ba['w'], ba['h']) != (bb['w'], bb['h']):
                print('MAINSIZE', name, (ba['w'], ba['h']), (bb['w'], bb['h']))
                total += 1
                continue
            a = a[ba['y']:ba['y'] + ba['h'], ba['x']:ba['x'] + ba['w']]
            b = b[bb['y']:bb['y'] + bb['h'], bb['x']:bb['x'] + bb['w']]
    if a.shape != b.shape:
        print('SIZE', name, a.shape[:2], b.shape[:2])
        total += 1
        continue
    mask = np.abs(a - b).max(axis=2) > 2
    n = int(mask.sum())
    if not n:
        continue
    total += 1
    ys, xs = np.nonzero(mask)
    cells = sorted({(y // 16, x // 16) for y, x in zip(ys, xs)})
    # merge cells into row bands for a short report
    rows = sorted({c[0] for c in cells})
    bands, start, prev = [], rows[0], rows[0]
    for r in rows[1:]:
        if r != prev + 1:
            bands.append((start, prev))
            start = r
        prev = r
    bands.append((start, prev))
    desc = ', '.join(f'y{s*16}-{e*16+16}' for s, e in bands[:8])
    print(f'DIFF {name}: {n} px; bands {desc}{" …" if len(bands) > 8 else ""}')
    hl = b.copy().astype(np.uint8)
    hl[mask] = [255, 0, 255]
    Image.fromarray(hl).save(os.path.join(out, name.replace('.png', '.diff.png')))
print(f'{total} pair(s) differ')
