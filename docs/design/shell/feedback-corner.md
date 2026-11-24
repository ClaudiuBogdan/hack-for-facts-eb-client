# Feedback corner

Status: chosen and built (owner, 24 November 2026).

## Why

The desktop corner held two buttons that did the same thing. The lime square
„Feedback” opened the feedback form. The round navy button under it opened a
help menu whose first item was the same form. The lime is PNRR's colour, so
on every other page it read as a stray. In dark mode its text turned light on
lime and became hard to read.

The owner wants feedback easy to see, with its label.

## Versions compared

The prototype is `/development/shell/feedback-corner` (`yarn dev` only); `?v=<key>`
opens one version.

| Key | Version | Decision |
|---|---|---|
| `split-navy` | One navy pill split in two: „Feedback” opens the form, the arrow opens help | **Chosen** |
| `split-lime` | The same pill in the lime | Rejected: keeps PNRR's colour outside PNRR |
| `pair` | A navy „Feedback” pill and a round „?” beside it | Rejected: still two objects |
| `quiet` | A white bordered pill, only the icon coloured | Rejected: feedback stands out less |
| `edge-tab` | A vertical tab mid-right, „?” in the corner | Rejected: two objects, unusual placement |

## What was built

- `src/components/feedback/FeedbackFab.tsx`: one pill, fixed in the bottom-right corner
  (`right-6 bottom-6`), 40px tall, in `primary` and `primary-foreground`, so dark mode
  follows the tokens. It shows from `md` up and is left out of print.
- „Feedback” opens the form in one click, through `useSendFeedback`, which keeps
  the cookie-consent check as before.
- The arrow (named „Ajutor”/„Help”) opens `SupportMenu` above the button. The
  menu has no feedback item (`includeFeedback={false}`), since the button
  already opens it.
- The round button (`ChatFab`) is gone. Phones keep the help menu in the bottom
  dock, with feedback included, as before.
- A shadow is allowed: the button is a genuinely floating layer (DESIGN.md,
  Elevation).
