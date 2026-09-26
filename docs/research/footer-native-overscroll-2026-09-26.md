# Chrome footer overscroll: why a visible overlap helps

## Finding

Chrome rendering optimization is a plausible explanation for the observed
behavior. The exact cause is not confirmed by a compositor trace. There is no
evidence that Chrome specifically requires a two-pixel overlap.

The user's macOS Chrome tests found that artwork fully outside the page did not
appear; artwork placed behind the mountain also disappeared during overscroll.
Artwork in front with a two-pixel overlap was reported visible. Image loading
and geometry checks alone had incorrectly been treated as proof of visibility
in earlier experiments.

## What Chromium confirms

- Its picture-layer tests explicitly verify that fully occluded drawing produces
  no drawing quads and that covered tiles are skipped during rasterization.
  See `OccludedTilesSkippedDuringRasterization` and the full-occlusion cases in
  [picture_layer_impl_unittest.cc](https://github.com/chromium/chromium/blob/main/cc/layers/picture_layer_impl_unittest.cc).
- Blink uses cull rectangles and clips to decide which regions need painting.
  See [cull_rect.h](https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/platform/graphics/paint/cull_rect.h).
- Elastic overscroll is applied through the compositor's transform tree. It is
  not simply extra document scroll height. See `ApplyDrawnStretchAmount` and
  `SetStretchAmount` in
  [scroll_elasticity_helper.cc](https://chromium.googlesource.com/chromium/src/+/main/cc/input/scroll_elasticity_helper.cc).

The first two source files were fetched from Chromium main and inspected on
26 September 2026. This establishes the rendering mechanisms, not the particular
code path used by the installed Chrome version during this site's bounce.

## Interpretation and implementation

The small exposed strip may keep the artwork eligible for painting or drawing.
Moving it behind the opaque mountain covers its only normally visible part;
placing it entirely below the footer removes that part altogether. Both cases
fit culling or occlusion behavior, although clipping and compositor-layer
assignment are also possible contributors.

The foreground placement and two-pixel overlap were confirmed by the user.
The latest requested experiment reduces this to one pixel; that smaller overlap
still needs physical trackpad confirmation.
Use a dark soil edge in the new atlas to make this small overlap blend into the
forest. Keep layout containment so the decoration does not add scroll height.
No wheel interception, simulated bounce, or forced GPU promotion is needed for
the currently working experiment. Confirming the precise rendering cause would
require a trace of the installed Chrome during a physical trackpad gesture.

## New artwork

The approved v6 atlas adds earth and tree roots above rock, then transitions into
broader lava flows with basalt crust. Source and optimized preview are under
`output/imagegen/footer-underground-v6/`. The running footer uses its optimized
72 × 216 WebP (4,938 bytes), retaining the foreground placement and 1px overlap.
