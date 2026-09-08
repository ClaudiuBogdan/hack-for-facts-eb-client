#!/usr/bin/env python3
"""Build the layered art for the landing's people band.

The band is a stack of independently positioned layers rather than one flat
picture per person, so each piece can be animated on its own. This turns the
ten source PNGs into that stack.

    python3 scripts/build-people-art.py --src tmp/people-src

Sources are the generated cut-outs, named on the way in (see the repo's people
band notes for which ChatGPT export is which):

    halo wings shards receipt orbit dashes
    portrait-founder portrait-angel-1 portrait-angel-2 portrait-angel-3

Three edits, in this order:

**Trim to the alpha bounding box.** Most of these arrive on a square or
letterboxed canvas with the payload somewhere inside it — the halo is 1141x404
of content on a 1254x1254 sheet, the dashes start 639px in. Trimming is most of
the optimisation, and it is what lets the composition place a layer by its own
edges instead of by where the generator happened to centre it.

**Correct the portraits, and only the portraits.** They arrive at wildly
different exposures — mean luminance 76, 113, 126 and 143 — and the founder's is
warm rather than neutral. Left alone they read as four photographs from four
places. So: full desaturation, then a linear stretch that maps each portrait's
own 5th/95th percentile onto the founder's, which makes him the reference rather
than an average nobody chose. The props are not touched; they *are* the colour.

**Cut the bottom form.** Two of the four busts run to the canvas edge as a flat
slab — the last opaque row is 100% and 99% filled — and the other two stop just
short. On a cut-out with nothing behind it that edge reads as a ruler line. The
fix is the same for all four so the set matches: fade the alpha out over the
last stretch of the bust. The founder's old composite hid this behind shard
shapes that sat *in front*; layered, the shards are behind him and cannot.

Then encode webp + avif from the processed pixels — same crop, same dimensions,
per `DESIGN.md` §Delivery — each sized at 2x the widest slot it is ever drawn
in, and never upscaled.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

ALPHA_FLOOR = 8
"""Below this an 'opaque' pixel is generator noise, not art."""

BOTTOM_FADE = 0.10
"""Fraction of the trimmed bust height dissolved to transparent at the foot."""

WEBP_QUALITY = 82
AVIF_QUALITY = 62
AVIF_ALPHA_QUALITY = 90
"""§Delivery: on a cut-out the alpha channel *is* the silhouette, so it is kept
at 90. Dropping it to 80 saves about 10KB and doubles the silhouette error."""


@dataclass(frozen=True)
class Target:
    name: str
    width: int
    """Output width in pixels: twice the widest slot the layer is drawn in."""
    portrait: bool = False


TARGETS: tuple[Target, ...] = (
    # The founder is drawn in a 380px box, so his layers are built for 760.
    Target("portrait-founder", 760, portrait=True),
    Target("shards", 760),
    Target("receipt", 380),
    Target("orbit", 520),
    Target("dashes", 420),
    # The angels are drawn in a 254px box; 520 covers it at 2x with room for the
    # slot to grow a little before anything is upscaled.
    Target("portrait-angel-1", 520, portrait=True),
    Target("portrait-angel-2", 520, portrait=True),
    Target("portrait-angel-3", 520, portrait=True),
    # The wings run wider than the portrait they sit behind.
    Target("wings", 620),
    Target("halo", 340),
)

REFERENCE_PORTRAIT = "portrait-founder"


def load(path: Path) -> np.ndarray:
    return np.array(Image.open(path).convert("RGBA"))


def trim(rgba: np.ndarray) -> np.ndarray:
    ys, xs = np.nonzero(rgba[..., 3] > ALPHA_FLOOR)
    if len(ys) == 0:
        raise ValueError("asset is entirely transparent")
    return rgba[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]


def luminance_range(rgba: np.ndarray) -> tuple[float, float]:
    """The 5th and 95th percentile of luminance over the opaque pixels.

    Opaque only: the transparent margin is undefined colour in most encoders and
    would drag the percentiles toward whatever the generator left there.
    """
    solid = rgba[..., 3] > 128
    grey = rgba[..., :3].astype(np.float32).mean(axis=2)[solid]
    return float(np.percentile(grey, 5)), float(np.percentile(grey, 95))


def desaturate(rgba: np.ndarray) -> np.ndarray:
    out = rgba.copy()
    grey = (
        0.299 * rgba[..., 0].astype(np.float32)
        + 0.587 * rgba[..., 1].astype(np.float32)
        + 0.114 * rgba[..., 2].astype(np.float32)
    )
    for channel in range(3):
        out[..., channel] = np.clip(grey, 0, 255).astype(np.uint8)
    return out


def match_levels(rgba: np.ndarray, reference: tuple[float, float]) -> np.ndarray:
    """Map this portrait's own 5/95 onto the reference's, linearly."""
    low, high = luminance_range(rgba)
    ref_low, ref_high = reference
    if high - low < 1:
        return rgba
    scale = (ref_high - ref_low) / (high - low)
    out = rgba.copy()
    grey = rgba[..., 0].astype(np.float32)
    adjusted = np.clip((grey - low) * scale + ref_low, 0, 255).astype(np.uint8)
    for channel in range(3):
        out[..., channel] = adjusted
    return out


def fade_bottom(rgba: np.ndarray, fraction: float = BOTTOM_FADE) -> np.ndarray:
    """Dissolve the foot of the bust so it does not end on a straight edge."""
    height = rgba.shape[0]
    band = max(1, int(round(height * fraction)))
    ramp = np.linspace(1.0, 0.0, band, dtype=np.float32)
    out = rgba.copy()
    tail = out[height - band :, :, 3].astype(np.float32)
    out[height - band :, :, 3] = (tail * ramp[:, None]).astype(np.uint8)
    return out


def resize(rgba: np.ndarray, width: int) -> np.ndarray:
    image = Image.fromarray(rgba, "RGBA")
    if image.width <= width:
        # Never upscale: `DESIGN.md` §Imagery caps rendered scale at 1:1, and
        # chunky source pixels next to crisp type read as a broken asset.
        return rgba
    height = round(image.height * width / image.width)
    return np.array(image.resize((width, height), Image.LANCZOS))


def encode(rgba: np.ndarray, out_dir: Path, name: str, work: Path) -> tuple[int, int]:
    source = work / f"{name}.png"
    Image.fromarray(rgba, "RGBA").save(source)
    webp = out_dir / f"{name}.webp"
    avif = out_dir / f"{name}.avif"
    subprocess.run(
        ["cwebp", "-q", str(WEBP_QUALITY), "-alpha_q", "100", "-m", "6",
         str(source), "-o", str(webp)],
        check=True, capture_output=True,
    )
    subprocess.run(
        ["avifenc", "-q", str(AVIF_QUALITY), "--qalpha", str(AVIF_ALPHA_QUALITY),
         "-s", "4", str(source), str(avif)],
        check=True, capture_output=True,
    )
    return webp.stat().st_size, avif.stat().st_size


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--src", type=Path, default=Path("tmp/people-src"))
    parser.add_argument("--out", type=Path, default=Path("src/assets/images/people"))
    parser.add_argument("--work", type=Path, default=Path("tmp/people-build"))
    args = parser.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    args.work.mkdir(parents=True, exist_ok=True)

    trimmed: dict[str, np.ndarray] = {}
    for target in TARGETS:
        path = args.src / f"{target.name}.png"
        if not path.exists():
            print(f"missing: {path}", file=sys.stderr)
            return 1
        trimmed[target.name] = trim(load(path))

    # The founder sets the exposure every other portrait is matched to, so his
    # own range is read before anything is altered.
    reference = luminance_range(desaturate(trimmed[REFERENCE_PORTRAIT]))
    print(f"reference exposure (5/95): {reference[0]:.1f} .. {reference[1]:.1f}")

    for target in TARGETS:
        art = trimmed[target.name]
        before = art.shape
        if target.portrait:
            art = desaturate(art)
            art = match_levels(art, reference)
            art = fade_bottom(art)
        art = resize(art, target.width)
        webp_bytes, avif_bytes = encode(art, args.out, target.name, args.work)
        ratio = art.shape[1] / art.shape[0]
        print(
            f"{target.name:18s} {before[1]}x{before[0]} -> {art.shape[1]}x{art.shape[0]} "
            f"ratio={ratio:.3f}  webp={webp_bytes / 1024:6.1f}KB  avif={avif_bytes / 1024:6.1f}KB"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
