# Clerk on demand

Supervised change to `src/lib/auth` (PERF-012 steps 1–2, PERF-015 step 2). Approach chosen by the owner on
2026-11-17: load Clerk only when it is needed.

## Why

Every visitor pays for Clerk today, signed in or not:

- **Our bundle:** `@clerk/clerk-react` and `@clerk/localizations` are a 161 KB start-up chunk (43 KB gzip).
- **After hydration:** about 300 KB of clerk-js from Clerk's servers, plus three Clerk API calls in two round
  trips.
- **Reads that wait:** `getAuthToken()` polls until Clerk is ready, so every browser read that may send a
  token waits for it, anonymous or not. That is +3.6 s for `/procurement` and +2.8 s for `/parlament` on mobile.
- **Discarded server HTML:** when Clerk's ready state reaches a server boundary that is still streaming, React
  drops that boundary's server HTML and re-runs its reads. On `/national-budget` desktop that was 25 calls
  instead of 11.

## Goals, non-goals

- **Goal:** anonymous visitors never load or contact Clerk.
- **Goal:** anonymous reads stop waiting for Clerk.
- **Goal:** no auth state change while the document is still streaming.
- **Goal:** signed-in visitors keep today's behaviour: header menu, notifications, admin pages, token reads,
  sign-out.
- **Non-goal:** reading the session on the server. It needs the secret key in Nitro and per-cookie HTML.
- **Non-goal:** changing which reads send a token (PERF-015 step 1).
- **Non-goal:** the dev-chronos Clerk instance (`pk_test`), which is an infra question.
- **Anti-goal:** a signed-in visitor shown as signed out, or a token read that silently goes out without its
  token.
- **Anti-goal:** remounting the page when Clerk arrives.

## The signal: Clerk's `__client_uat` cookie

Measured on dev-chronos with a test account (2026-11-17):

| state | `__client_uat_<suffix>` |
|---|---|
| first visit, Clerk never loaded | absent |
| anonymous, Clerk loaded once | `0` |
| signed in | Unix time of the session (e.g. `1794919910`) |
| after sign-out | `0` |

- **Readable by the page:** the cookie is not `HttpOnly`, so `document.cookie` sees it.
- **Clerk's own servers** use this cookie the same way, to skip their sign-in handshake when it is absent or
  `0`.
- **Read the instance's own copy.** Clerk writes `__client_uat` on `.transparenta.eu`, so every subdomain and
  every Clerk instance there shares the plain name. A production sign-in would therefore look like a session
  on dev. Clerk also writes a copy suffixed for its instance. The suffix is the first 8 characters of
  base64url(SHA-1(publishable key)), verified as `a3q-LLao` for the dev key. That copy is the one to read.
- **When `crypto.subtle` is missing** (plain `http` on a non-local host), or the digest fails, any
  `__client_uat` cookie holding a session counts, the shared one or any instance's. The error is then towards
  loading Clerk when it is not needed, never the reverse. The shared cookie alone would not do: another
  instance can set it to `0` while this instance's session lives on.

## Design

```
AuthProvider (no value import from @clerk/*)
  AuthContext.Provider value = gate open ? store.value : "enabled, not loaded"
    {store.clerkRequested && <ClerkRuntime/>}   ← lazy chunk, a sibling: never wraps the page
    children                                    ← same position before and after Clerk arrives
```

- **Store.** A module-level store holds:
  - the context value (`isEnabled`, `isLoaded`, `isSignedIn`, `user`, `signOut`);
  - whether Clerk has been requested;
  - whether Clerk has loaded;
  - the Clerk widgets to show.
- **Hydration.** With a key configured, the server and the browser's first render share one value:
  `isEnabled: true`, `isLoaded: false`.
  - This is what the browser's first render already was with Clerk. The server used to render `isEnabled:
    false`, so this also removes that mismatch.
  - It keeps access checks honest: `useChallengeAccess` grants access when auth is disabled, so a disabled
    value must never show while a key is configured.
- **Reading the cookie** happens in the provider's first effect, right after the shell hydrates:
  - **no session:** the store records the anonymous value (`isEnabled: true`, `isLoaded: true`,
    `isSignedIn: false`);
  - **session:** the store records the loading value and Clerk starts loading at once. Token reads wait for
    Clerk, not for the gate.
  - **Rechecks:** when the tab becomes visible or the window regains focus. A session found later switches
    the shown state back to loading until Clerk answers.
- **The gate** decides only what the page shows. The context keeps the hydration value until three things
  hold, or until 10 s after the shell hydrated, whichever comes first:
  - the shell has hydrated (an effect);
  - the document has finished parsing, so the SSR stream has ended;
  - no streamed boundary is pending: no hidden `S:` segment and no `<!--$?-->` marker left.

  The third condition matters because React 19.2 reveals completed boundaries in batches on a timer, so some
  are still pending after `DOMContentLoaded`.
- **Clerk mounts from its own synchronous subscription** (`ClerkRuntimeSlot`), not from the provider's
  transitioned state. Mounting it is safe at any time: it renders beside the page and changes no value the
  page reads. It also must not depend on a page transition: a render in that transition could suspend on a
  read that needs a token, holding back the transition, and so Clerk, while the read waits for Clerk.
- **A component that is hydrating reads the server value.** `useAuth` and `useOptionalUser` read through
  `useSyncExternalStore`, with the live value as the client snapshot and the server value as the server
  snapshot.
  - **Why:** a boundary that completed but still waits for its code or data can hydrate after the gate has
    opened. Its first render must still match the server HTML.
  - **Re-renders:** React re-renders a hydrated component on this read only when the two snapshots differ.
    While the gate is closed they are the same object, so auth adds no synchronous re-render.
  - **Why that matters:** a synchronous re-render discards a nested boundary that is still waiting for its
    code. A plain "hydrated" flag (`false`, then `true`) did that to `ChallengeStepPlayer`'s article.
  - **Remaining case:** a boundary that hydrates after the gate has opened gets the server value, then
    re-renders synchronously with the live one. A boundary nested inside it and still waiting for its code at
    that moment would be rendered again on the client. Without this read, the outer boundary would fail
    hydration instead.
  - **Without a key** (local development, tests), auth is "disabled and loaded" on the server and in the
    browser alike: one shared object, so hydration adds no re-render there either. Its server value used to
    say "not loaded".

- **Updates are transitions.** The provider copies the store into React state inside `startTransition`; it
  does not use `useSyncExternalStore`. The stream's end is not enough on its own:
  - A boundary can still be suspended in hydration after the stream ends, while its streamed data reaches the
    query cache.
  - A synchronous update reaching it makes React render it on the client and discard its server HTML.
  - A transition waits for it to hydrate instead.

  Measured on `/national-budget/analytics` with server reads delayed 2.5 s, before the gate also waited for
  revealed boundaries:
  - **No Clerk key** (control): 5 of 5 streamed server nodes kept.
  - **Gate only, synchronous update:** 2 of 5 kept.
  - **Batch 1 build:** 0 of 5 kept, and the reads ran again in the browser: 8 GraphQL calls instead of 2.

  With the boundary gate: 5 of 5 kept in all 8 loads (4 anonymous, 4 signed in), 2 GraphQL calls each.
- **`ClerkRuntime`** (`clerk-runtime.tsx`, loaded with `React.lazy`) is the only module that imports
  `@clerk/clerk-react` and `@clerk/localizations` as values.
  - It renders `ClerkProvider` with today's props (localization, `signInUrl`, `signUpUrl`).
  - A bridge publishes Clerk's state into the store, mapping it exactly as today's `ClerkAuthBridge` does.
    Before Clerk's first load, an unloaded state is ignored, so an anonymous sign-in page stays usable while
    its form loads. After it, every state is published, including the unloaded one Clerk passes through
    while a session changes (sign-out).
  - It also renders the registered widgets through portals.
- **Widgets.**
  - `AuthSignIn` and `AuthSignUp` render a placeholder node, register it, and request Clerk; a spinner shows
    until Clerk has loaded.
  - `AuthSignOutButton` calls `clerk.signOut({ redirectUrl: '/' })` after the child's own `onClick`, as
    Clerk's `SignOutButton` does.
  - `AuthSignInButton` and `AuthSignUpButton` are unchanged: they navigate to `/sign-in` or `/sign-up`.
- **`getAuthToken()`:**
  - Clerk already loaded: ask Clerk, as today.
  - Cookie says no session: return `null` at once.
  - Otherwise: request Clerk, wait until it has loaded (10 s cap from the call, as today), then ask it.
    Clerk mounts once the provider's first effect has run, so as before, a read issued long before
    hydration can use up part of the cap.
- **Public API unchanged.** `@/lib/auth` keeps every export, so its 39 component callers and 19 API modules
  are untouched. `resolveClerkLocalization` moves to the runtime module, since it imports
  `@clerk/localizations`.
- **Guardrail.** Lint forbids value imports from `@clerk/*` outside `clerk-runtime.tsx`; type imports stay
  allowed.

## Risks

- **Cookie absent while a session exists** (cookie cleared by hand, blocked third-party storage). The person
  looks signed out until they open `/sign-in`. There Clerk loads, finds the session and redirects them back.
- **Clerk blocked** (ad blockers). A signed-in visitor stays in the loading state, as today, and anonymous
  visitors are unaffected. Token reads give up after 10 s, as today.
- **Shorter loading window.** For anonymous visitors, pages that wait on `isLoaded` now settle at
  `DOMContentLoaded` instead of after Clerk's round trips.

## Verification

- Unit tests for the cookie reading, the store, the gate, `getAuthToken`'s three paths and the widget portals.
  Three tests each fail against the code they guard against:
  - Clerk mounting while a transition is suspended;
  - a boundary hydrating late;
  - a nested boundary surviving a consumer's hydration.
- A production build. Start-up graph without `@clerk/*`; an anonymous page load with no request to
  `clerk.accounts.dev`.
- **Signed in with the test account:**
  - the header menu shows the user;
  - `/settings/notifications` loads;
  - a token read carries `Authorization`;
  - sign-out returns to `/` signed out.
- **Signing in:** `/sign-in` shows Clerk's form, and signing in returns to the page.
- **Hydration:** on `/national-budget` the server `h1` is kept.
- An xhigh review of the whole change before commit.
