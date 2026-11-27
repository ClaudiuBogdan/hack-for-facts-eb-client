# ERR-001: The error page renders a blank title and text, and a root error renders without the document

**Status:** fixed on `dev` with CACHE-002 (filed and fixed 2026-11-25); the structural part is ERR-002. **Priority:** P2: every reader who reaches the error page sees no explanation, and an
error at the root shows an unstyled fragment with a raw validation dump. **Owner:** client-dev-polish. **Related:**
`src/components/errors/GlobalErrorPage.tsx`, `src/lib/errors-utils.ts`, `src/routes/__root.tsx`; the page redesign (local
branch `errors-pages`, bbf7323cc, not pushed).

## 1. Blank title and text

`GlobalErrorPage` renders `classifiedError.title.message` and `classifiedError.friendlyMessage.message`, the raw `message`
of `defineMessage` descriptors in `src/lib/errors-utils.ts`. In a production build Lingui's macro strips `message` and keeps
only the id. The built chunk (`.output/public/assets/chunk-recovery-*.js`, a build of `dev` at ed499aec4) reads:

```
pageRenderErrorTitle:{id:`error.pageRenderErrorTitle`},genericError:{id:`error.genericError`}
```

So `.message` is `undefined`, and the page renders an empty `<h1>` and an empty `<p>`. In `vite dev` the macro keeps
`message`, so the text shows there, in English, untranslated.

**Shown on the built server.** `node .output/server/index.mjs` (the same build), `GET /?currency=XYZ`:
- status 500;
- `<h1 id="error-title" class="text-3xl font-bold tracking-tight"></h1><p class="mt-4 text-lg text-muted-foreground"></p>`.

**Fix:** the page renders the descriptors through Lingui's global `i18n` (`i18n._(descriptor)`); the catalogues already
translate the `error.*` ids in both languages. Global rather than `useLingui`, since a root error renders outside the app's
`I18nProvider`. `GlobalErrorPage.ids.test.tsx` renders the page with `{id}`-only descriptors, as production builds them, and
fails if the title or any paragraph is empty: it failed on the old page and passes on the fix.

## 2. A root error renders without `<html>`, `<head>` or the stylesheet

The same response has no `<html>`, no `<head>` and no stylesheet link: the body is the bare `<main>` of the error page.
The root route renders the document (`<html>`, `<head>`, `<body>`) in its `component`. When the root itself fails (its
`validateSearch` or `beforeLoad` throws), the root's `errorComponent` renders *instead of* that component, so there is no
document around it. The reader gets an unstyled fragment, and it still shows the technical details: here a zod dump
of `currency`'s allowed values.

Triggers seen: an invalid global search value (`?currency=XYZ`, `?inflation_adjusted=maybe`), since
`globalSearchSchema` rejects rather than drops it. Possible but not seen: a failing `beforeLoad` read (locale, theme or
notice cookies, the catalogue load in `dynamicActivate`).

**Fix (root's decision, 25 November 2026):**
- **Lenient root search, done here.** The schema moved to `src/lib/global-search-schema.ts`, with `.catch(undefined)` on each
  field: a bad value is dropped (`global-search-schema.test.ts`). On the built server `/?currency=XYZ` and
  `/?inflation_adjusted=maybe` now answer 307 to the address without the bad value (`/national-budget?currency=XYZ&an=2024` to
  `/national-budget?an=2024`), which answers 200 with the default, instead of a bare 500. That removes both triggers seen.
  The error page itself, reached by a failing page (`/parlament/voturi/cdep/1`), now shows its title and text in Romanian.
- **A root `shellComponent`, ERR-002.** The router renders the root's `shellComponent` around the root's error boundary
  (`@tanstack/react-router` `Match.js`), so moving the document into it puts every root error inside the page. The shell
  then can't rely on the root's `beforeLoad` context (theme class, locale), since that is what failed. It touches SSR, the
  head and the cookie-render checks: its own change, after the page redesign.

## 3. Residual: ids before the locale is active

If the root's `beforeLoad` fails before `dynamicActivate` has activated a locale, Lingui has no locale. Any `t` on the
error page would then print message ids, the redesign's included. This is the same narrow case as §2's `beforeLoad`
trigger; ERR-002's shell would have to activate a default locale itself. Not chased further.
