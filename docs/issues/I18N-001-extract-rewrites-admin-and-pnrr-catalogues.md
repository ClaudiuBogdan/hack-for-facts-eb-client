# I18N-001: A plain extract rewrites the admin and PNRR catalogues

**Status:** open (filed 26 November 2026). **Owner:** not assigned; root's to place. **Priority:** low. No translation is lost, but
every catalogue commit carries a risk of noise. **Related:** `lingui.config.ts`, `src/locales/{en,ro}/admin.po`,
`src/locales/{en,ro}/pnrr.po`. Raised by client-legislation while translating `/legislation/search`; filed at root's
request.

## What happens

`yarn i18n:extract` writes all three catalogues, whichever feature the session worked on. On a clean copy of `dev`
(`9189c1252`, 26 November 2026), with no source change, it leaves these diffs:

| Catalogue | Diff per locale | What changes |
|---|---|---|
| `messages.po` | none | Nothing. This catalogue is in step with the code. |
| `admin.po` | 2,256 lines (1,128 in, 1,128 out) | Only origin lines (`#: file:line`). No `msgid` or `msgstr` changes. |
| `pnrr.po` | 1,052 lines | Origin lines, the order of four entries, and three entries marked obsolete. |

Measured by message id, not by diff line: no id is added in any catalogue, and none that the code uses is removed.

In `pnrr.po`:

- The four explicit ids `pnrr.header.title.plan`, `.national`, `.recovery` and `.resilience` sit at the top of the
  file on `dev`. Extract moves them into alphabetical order and keeps their translations. In a diff this reads as a
  deletion at the top, which is how it was first misreported.
- Three messages that the code no longer uses become obsolete entries (`#~`), translations kept: "Back to PNRR
  beneficiaries", "MIPE file set {PNRR_FILESET_ID}" and "Please try again in a moment. The established MIPE dashboard
  remains available from the link above."

Compiled from `dev`'s catalogues (`yarn i18n:compile`, output read and not committed), `pnrr.js` holds all four
explicit ids in `en` and `ro`. They are still there when compiled after an extract.

## Why it matters

- A session that commits its extract as it comes adds about 3,300 changed lines per locale to two catalogues it does
  not own. A real change in those files would be hard to see in that diff.
- Two sessions that each commit the churn conflict with each other on merge, in files neither meant to touch.
- The cause is ordinary: the admin and PNRR code moved after their catalogues were last extracted, so every origin
  line is stale.

## Rule until it is fixed (root, 26 November 2026)

Changes that extract makes to `admin.po` and `pnrr.po` are never committed by a session working elsewhere. After an
extract, restore the four files (`git checkout -- src/locales/en/admin.po src/locales/ro/admin.po
src/locales/en/pnrr.po src/locales/ro/pnrr.po`) and commit only the catalogue you own.

## Fix (suggested, not started)

1. **One clean extract of the two catalogues, committed on its own** by whoever owns them, on `dev`. After it, a plain
   extract with no source change is a no-op again, as it already is for `messages.po`.
2. **Decide the three obsolete PNRR messages** in that commit: keep them as `#~` entries, or drop them with
   `yarn i18n:clean` if nothing will bring them back.
3. **Optional: stop the churn at its source.** Origin lines carry line numbers, so any edit above a message rewrites
   them. Lingui's PO formatter can write origins without line numbers (`lineNumbers: false`). That is a one-time rewrite
   of every catalogue, so it needs its own commit and a quiet moment on `dev`.
4. **Optional: a check.** A CI step that runs extract and fails when a catalogue changes would catch a stale catalogue
   on the commit that caused it. It should come after step 1, or it fails at once.
