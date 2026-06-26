# Feature: Explanation audio player

> High-value next · on the Act page (Rezumat tab, within `WhatThisMeansPanel`).
> Reads `docs/design/legal/design.md` (§6 components, §7 data model).

## Feature owner profile

Frontend feature implementer (React 19 + shadcn/ui + Lingui) comfortable with
the native HTML5 `<audio>` element and accessible media controls. No existing
audio component exists in the client (verified), so this is a small net-new
wrapper — keep it lightweight.

## Summary

Surfaces the existing TTS explanation-audio artifacts on the Act page so users
can **listen** to the plain-language explanation instead of (or alongside)
reading it — accessibility and listen-on-the-go. The player appears **only when
an artifact exists** for the act; it never promises coverage.

## Facts / Decisions / Assumptions

- **Fact:** Portal has explanation documents/queues and explanation-audio (TTS)
  artifacts; scripts `portal-legislativ:explanation-*` exist (`legal.md` §5,
  §13 next). Audio is generated from the same explanation/summary content.
- **Decision:** Render the player only when `audio` is present for the current
  act/version; otherwise render nothing (no disabled control, no "coming soon").
  (`legal.md` §15 "audio availability gaps".)
- **Decision:** The player sits inside `WhatThisMeansPanel`, directly tied to the
  plain-language explanation it narrates, and inherits the same
  `AIProvenanceNotice` ("explicație generată de AI / voce sintetizată — nu
  constituie consultanță juridică"). (`design.md` P5.)
- **Decision:** Use the native `<audio>` element wrapped in a small styled
  control (play/pause, seek, time, speed, download). No streaming/HLS, no
  waveform, no third-party player library for v1.
- **Assumption:** the artifact is a single audio file URL (mp3/ogg) with optional
  duration + a transcript reference; the adapter supplies it. If a transcript is
  available it links to the on-page explanation rather than duplicating text.

## Route and URL state

- No route or search param of its own. It lives on `/legislatie/acte/$id`
  (Rezumat). Playback position is ephemeral local state (not URL).

## Data contract and mock states

```ts
type ExplanationAudio = {
  audioUrl: string                // mp3/ogg
  mimeType: string                // "audio/mpeg" | "audio/ogg"
  durationSeconds: number | null
  voice: string | null            // TTS voice/model provenance
  generatedAt: string | null
  transcriptAvailable: boolean    // links to the on-page explanation
  versionId: string | null        // ties audio to a document expression
} | null
```

Mock states: present (with duration), present (duration null → compute on
`loadedmetadata`), absent (`null` → render nothing), load-error (file 404 →
inline notice, no crash).

## UI structure

```
Within WhatThisMeansPanel, above/below the prose:
┌ Ascultă explicația ────────────────────────────────────────┐
│ [▶ Play]  ──────●────────  01:12 / 04:30   [1x ▾]  [↓]       │
│ voce sintetizată · generat de AI            (AIProvenanceNotice inherited) │
└─────────────────────────────────────────────────────────────┘
(absent → component returns null; panel shows text only)
```

## Component reuse and proposed new components

- Reuse: `Button` (play/pause, download), `Slider` (seek), `Select`/
  `dropdown-menu` (speed), `Tooltip`, `Badge` (provenance chip). `AIProvenanceNotice`
  from feature 1.
- New: `ExplanationAudioPlayer` (thin native-`<audio>` wrapper with accessible
  controls). No new dependency.

## Interactions

- Play/pause; seek via slider; speed (0.75x/1x/1.25x/1.5x); download the file;
  keyboard space toggles play when focused. Time updates via the `timeupdate`
  event; duration resolved from `loadedmetadata` when null.
- Pausing/leaving the page stops playback (cleanup on unmount).

## Loading / empty / error / partial / stale states

- **Loading:** control shows a small loading state until `loadedmetadata`.
- **Empty (no artifact):** render nothing (no placeholder).
- **Error (file fails):** inline "Audio indisponibil momentan" notice; the text
  explanation remains fully available; no thrown error.
- **Partial (duration null):** show elapsed time only until metadata loads.
- **Stale:** `generatedAt`/`voice` shown as provenance; if the audio version
  differs from the selected document version, note "explicație pentru versiunea
  {…}".

## Accessibility and i18n

- The `<audio>` has an accessible label; all controls are keyboard reachable with
  `aria-label`s; play state announced; not color-only. A visible transcript link
  points to the on-page explanation (the player augments, never replaces, the
  readable text — meeting WCAG for audio). Lingui macros; locale time formatting.

## Privacy / provenance / source-citation

- Inherits `AIProvenanceNotice` (TTS voice + generation provenance). Only shows
  when a real artifact exists — no fabricated/placeholder audio (P5; `legal.md`
  §15). Tie to the document version it narrates.

## Acceptance checklist

- [ ] Player renders on the Act page only when an audio artifact exists for the
      act; absent → nothing renders.
- [ ] Play/pause/seek/speed/download work via the native `<audio>` element;
      keyboard accessible with labels.
- [ ] Provenance (voice + generated-at + AI notice) is shown; transcript links to
      the on-page explanation.
- [ ] File-load error shows an inline notice and does not crash; text remains
      available.
- [ ] `yarn typecheck` passes; strings use Lingui macros.

## Non-goals

- Generating/queuing TTS; multi-track playlists; waveform visualization;
  background/persistent playback across navigation.

## Open questions (blockers only)

None.
