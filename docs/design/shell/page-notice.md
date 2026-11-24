# Page notice: data being verified

Status: chosen and built (owner, 24 November 2026).

## Why

Some pages go live while their data is still being checked. Visitors should
know that figures may change, be able to report a mistake, and be able to put
the notice away once they've read it. The owner asked for something like
GOV.UK's banners: a band at the top that clears when you acknowledge it, and
is remembered for the session.

## Versions compared

The prototype is `/development/shell/page-notice` (`yarn dev` only). Each
round's versions stay in the prototype.

- **Round 1** (A–E): phase strip, notice box, notice box with a confirmation
  step, amber band, quiet line. The owner asked for a cleaner design, closer
  to the GOV.UK cookie banner.
- **Round 2** (F–H): a full-width band with a title, two sentences and actions;
  grey, faint navy, and grey with a tag.
- **Round 3** (I–L): F with polished copy in four type treatments, all in Inter
  (DESIGN.md: one typeface).
- **Chosen:** G (`band-tint`): a faint navy band with two buttons, using round
  3's copy. `?v=live` renders the built component.

## Where it shows

Owner, 24 November 2026: on every page for now, except the landing page.

- **Placement.** One `PageNotice` sits in the root layout (`src/components/app/app-shell.tsx`),
  above every page's content, in a centred `max-w-6xl` column. Pages differ in
  width, so it lines up with most titles, not all.
- **One notice per section.** `pageNoticeScope` (`src/components/data-trust/page-notice-scope.ts`)
  uses the path's first segment as the id, so dismissing it on `/procurement`
  also hides it on `/procurement/…`. Other sections still show it. A language
  prefix (`/ro/…`, `/en/…`) is skipped.
- **Not shown on** pages with no data to verify:
  - the landing page `/`
  - legal, account and utility pages: `/privacy`, `/terms`, `/cookie-policy`,
    `/cookies`, `/sign-in`, `/sign-up`, `/settings`, `/unsubscribe`,
    `/alerts`, `/share`
  - `/admin`, `/development` and `/test-error`
- **Once the data is verified,** drop the section's id from the shell: return
  null for it in `pageNoticeScope`. A page can also render its own
  `PageNotice` with its own words.

## The component

`PageNotice` in `src/components/data-trust/page-notice.tsx`, exported from
`@/components/data-trust`.

```tsx
import { PageNotice } from '@/components/data-trust'

// First thing in the page, outside the page's padded container:
<PageNotice id="public-enterprises" contentClassName="mx-auto max-w-6xl px-4 md:px-6" />

// With the page's own words:
<PageNotice id="ngos" title={<Trans>…</Trans>}>
  <p><Trans>…</Trans></p>
</PageNotice>
```

- **`id`** names the notice; lowercase words joined by hyphens. Dismissing it
  hides every notice with that id until the browser closes, so pages that
  share one id share one dismissal.
- **`contentClassName`** is the inner column. Set it to the page's own
  container, so the text lines up with the page title. The default is the
  reading width, `mx-auto max-w-5xl px-6`.
- **`title`** and **`children`** replace the default copy:
  - Title: „Lucrăm încă la această pagină”.
  - Text: „Verificăm datele, așa că unele cifre se pot schimba până terminăm.”
    and „Ai găsit ceva greșit? Spune-ne și ne ajuți să verificăm mai repede.”
- **Actions.** „Am înțeles” (primary) hides it at once and remembers it.
  „Trimite feedback” (outline) opens the feedback form, with the usual
  cookie-consent check, and leaves the notice in place.
- **Look.**
  - The band is full width: `bg-primary/5` with a `border-primary/15` bottom
    rule, 24–28px of vertical padding.
  - The title is `text-lg font-semibold`; the text is `text-base`, capped at
    `max-w-2xl`.
  - The buttons are 40px tall.
  - It is a `section` labelled by its `h2`, and it is left out of print.
- **No motion.** It disappears on acknowledge; nothing animates.

## Remembering the dismissal

Owner's choice: a session cookie, not session storage.

- **The cookie.** `page-notices-dismissed` holds the dismissed ids,
  comma-separated, at most 30 (the oldest drops first). It has no expiry, so
  the browser deletes it when it closes. It is `Path=/` and `SameSite=Lax`,
  plus `Secure` on https.
- **Reading it.** The root route reads it in `beforeLoad`: from the request
  on the server, from `document.cookie` in the browser on each navigation. It
  passes the list on as `dismissedNotices` in the router context.
- **Why a cookie.** The server knows, so a dismissed notice is never
  rendered. There is no flash and no jump, as session storage would cause.
  The cookie also holds across tabs.
- **Pages the browser caches.** The HTML of `/` and a few others can be kept by
  the browser for an hour, and may predate a dismissal. After it loads, the
  component re-reads the cookie and hides a notice dismissed since. In that
  case only, the notice shows for a moment. A shared HTML cache (the
  Cloudflare rule proposed in `docs/performance/2026-10-27-main-pages/FIXES.md`)
  must skip these pages or key on this cookie, since Cloudflare ignores
  `Vary: Cookie`.
- **Code.** The parsing and writing live in
  `src/components/data-trust/page-notice-cookie.ts`.

## Checked

- **Unit tests.** Parsing, bounds and the session cookie; rendering, custom
  copy, dismissed and not, acknowledge, feedback.
- **Browser.** On the prototype route:
  - The server HTML includes the notice without the cookie and leaves it out
    with it.
  - Acknowledging survives a reload, a new tab and back navigation.
  - A fresh browser shows it again.
  - Light, dark and phone all hold up, with no console errors.
