# ERR-002: A root error renders without the document

**Status:** fixed on branch `client-polish-20261126` (26 November 2026), not yet on `dev` (filed 2026-11-25). **Priority:** P2. **Owner:** client-dev-polish, after the page redesign (local branch
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

## Done (26 November 2026)

- `src/routes/__root.tsx`: the document is the root's `shellComponent` (`RootDocument`); `RootComponent` renders only
  `AppShell`. The shell reads the theme from the root's context and falls back to light when the root failed before
  setting it. The language needed nothing: each server request starts from the default language, already loaded
  (`i18n-request-scope.ts`), so the error page's words are words, not ids.
- Shown on a built server with a temporary throw in `beforeLoad` (not committed): a forced root error answers 500 with
  `<html lang="ro" class="light">`, the stylesheet, `<title>Transparenta.eu</title>` and the error page; before the change
  the same request answered the error page's markup alone. In the browser it hydrates without errors, does not reload in a
  loop, and its home button works; normal pages are unchanged in light and dark.
- The test is a server render, not the built-server check this file planned: nothing left makes the root fail on the
  server on purpose (ERR-001 made the search schema lenient, and the server's catalogues are compiled in), and a
  test-only branch in `beforeLoad` would ship. `src/routes/-root-shell.test.tsx` renders a router on the real root with
  one preference read made to fail, checks that this read is the root's error, and asserts the error page inside
  `<html>…<head>…<body>` with the root head's title and description; it fails without the change. The stylesheet's
  address is the build's (empty in the test), so it stays with the built-server evidence above.
- In the browser, a root error already kept the head (React leaves the document's elements in place); it now also keeps
  the title. A natural trigger there is a malformed cookie, filed as ERR-003.

Left as they are (review, 26 November 2026): both happen only when the root itself fails, which nothing triggers on the
server today.
- The browser does not hydrate a failed root's page; it renders it again (React's recoverable error 423, to Sentry with
  consent). TanStack throws the failed match during hydration; the page before this change did the same. A failure before
  the language is activated on `?lang=en` would also switch the page from Romanian to English as it renders again.
- On `/`, the browser recomputes the heads of every matched route, so the landing's title and canonical replace the root's
  while the error page shows.

Seen once, not reproduced (full integration run on 40d12650e, 26 November 2026, load average 18.6):
`statistics-ins-native-outcomes.spec.ts:90` (en 1440) passed on its second retry, after a chunk-recovery `__reload` on
`/ins/teritorii/54975?…&lang=en`. A language switch imports the en catalogue in the root's `beforeLoad`, so a failed chunk
there is a root error; that path, the error page and its recovery reload were the same before this change, which only adds
the document around them. A rerun of the statistics project (retries 0) did not reload; another test failed under the same
load. If CI's integration shards show the reload again, it goes to root before the dev sync.

