# ERR-003: A malformed cookie turns every page into the error page, in the browser

**Status:** open. **Owner:** client-dev-polish. **Priority:** P2: rare (a cookie the site writes is always encoded), but
the site stays broken for that browser until the cookie goes. **Related:** ERR-002 (found while looking for a root-error
trigger), `src/lib/user-preferences.ts` (`readCookieValue`), `src/lib/i18n.tsx` (`readBrowserLocaleCookie`), the root's
`beforeLoad` in `src/routes/__root.tsx`.

## What happens

In the browser the root's `beforeLoad` reads its cookies from `document.cookie` and decodes each with
`decodeURIComponent`, unguarded. A value that is not valid percent-encoding (`%E0`) throws `URIError: URI malformed`, the
root fails, and the page shows the error page. The server decodes the same cookies safely (cookie-es), so the server HTML
is right and the page breaks as the browser takes over.

Shown on a built server of `dev` (26 November 2026), each cookie set to `%E0`:

| Cookie | What the reader sees |
|---|---|
| `ui-theme` | the error page on every load, after the right page flashes |
| `page-notices-dismissed` | the error page on the first in-app navigation |
| `user-locale` | the page works; two `URI malformed` errors in the console |

A reload does not help; only clearing the cookie does.

## What to do

- Decode once, guarded: `readCookieValue` and `readBrowserLocaleCookie` return the raw value (or null) when
  `decodeURIComponent` throws, so a bad cookie reads as no preference.
- A unit test per reader with `%E0`, and the three cookies above in an integration test of the root (page renders, no
  page error).
