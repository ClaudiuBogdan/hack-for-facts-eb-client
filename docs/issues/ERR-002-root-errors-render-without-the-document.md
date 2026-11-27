# ERR-002: A root error renders without the document

**Status:** open (filed 2026-11-25). **Priority:** P2. **Owner:** client-dev-polish, after the page redesign (local branch
`errors-pages`). **Related:** ERR-001 (found there), `src/routes/__root.tsx`, `src/components/errors/GlobalErrorPage.tsx`.

## What happens

The root route renders the document (`<html>`, `<head>` with the stylesheet, `<body>`) in its own `component`. When the root
itself fails (its `validateSearch` or `beforeLoad` throws), the root's `errorComponent` renders *instead of* that component, so the
response is the error page's bare markup: no `<html>`, no `<head>`, no styles. Shown on the built server (a build of `dev` at
ed499aec4): `GET /?currency=XYZ` answered 500 with the error page's `<main>` and nothing around it.

ERR-001 removed the triggers seen (the root's search schema now drops unknown values). What can still throw at the root is
`beforeLoad`: the locale, theme, preference and notice cookie reads, and the catalogue load in `dynamicActivate`. On the client, a
catalogue chunk missing after a deploy is the likely one.

## The fix

Move the document into the root's `shellComponent`. `@tanstack/react-router` renders it around the root's catch boundary
(`dist/esm/Match.js`), so a root error renders inside the page, with its styles. What it needs:
- The shell can't rely on the root's `beforeLoad` context (theme class, locale, preferences), since that is what failed. It
  falls back to the defaults (light, `ro`), and activates the default locale if none is active, so the error page's words
  aren't ids (ERR-001 §3).
- It touches the head, the SSR stream and `scripts/check-built-cookie-render.mjs`, so it ships with that check and a
  built-server test of a forced root error: 500, `<html lang>`, the stylesheet, the error page's title.
