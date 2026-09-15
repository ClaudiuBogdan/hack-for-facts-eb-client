# TanStack Router (v1, @tanstack/router-core 1.

<!--
@web-flow begin
kind: prompt
id: prompt-20260915082713286
timestamp: "2026-09-15T08:27:13.286Z"
schema: web-flow/research/v1
version: 1
-->
TanStack Router (v1, @tanstack/router-core 1.171.x) with SSR / TanStack Start.

Problem, measured, not guessed: with `scrollRestoration: true` on `createRouter`, the router scrolls the window back to the top AFTER hydration, undoing any scroll the reader did while the page was still loading.

Mechanism I traced in `node_modules/@tanstack/router-core/dist/esm/scroll-restoration.js`:
- `Router._scroll` initialises to `{ next: true }`.
- `setupScrollRestoration()` subscribes to the router's `onRendered` event.
- On the very first (hydration) render, `shouldResetScroll = scroll.next` is therefore `true`.
- There is no cached scroll entry for a fresh load, so `windowRestored` stays `false`, and the handler calls `scrollTo({ top: 0, left: 0, behavior })` unconditionally.
- This is redundant: the SSR inline script (`tsr-scroll-restoration-v1`) already restored-or-zeroed the scroll at parse time, before first paint. The post-hydration repeat lands ~1.1-1.5s later in dev, by which point the reader has already scrolled — and yanks them to the top.

I verified `setupScrollRestoration` is byte-identical between 1.171.15 and 1.171.30, so this is not something a version bump fixes.

Questions — please search the TanStack Router GitHub issues/PRs/discussions, the official docs, and recent community posts, and answer with citations and dates:

1. Is this a known, reported issue in TanStack Router / TanStack Start? Link the specific issues, PRs or discussions. Has a fix landed, or is one proposed/merged in any version (including betas, v2, or the `main` branch)?
2. What is the OFFICIAL or idiomatic TanStack way to prevent the hydration render from resetting scroll, while keeping (a) scroll-to-top on client-side link navigation and (b) back/forward scroll restoration?
   - Is the function form `scrollRestoration: ({ location }) => boolean` intended for this, or is it meant for something else (e.g. opting whole routes out)?
   - Is there a documented per-navigation `resetScroll: false` option, a `getScrollRestorationKey` trick, a `defaultPreload`/`_scroll` API, or a route-level `scrollRestoration` setting that is the sanctioned answer?
   - Does TanStack Start expose anything specific here?
3. What do the TanStack maintainers (Tanner Linsley and core team) say about this in issues/Discord/docs? Quote them if you find it.
4. Are there any known gotchas with the function form of `scrollRestoration` — e.g. it still renders the deprecated `<ScrollRestoration>` component server-side because a function is truthy, or it interacts badly with hash navigation?
5. If there is no official fix, what is the most widely used community workaround, and what are its downsides?

Be precise about version numbers and dates. If you cannot find a specific issue, say so explicitly rather than guessing.
<!-- @web-flow end id=prompt-20260915082713286 -->

<!--
@web-flow begin
kind: response
status: completed
provider: chatgpt
url: "https://chatgpt.com/c/6aa90172-1c74-83eb-9216-ba565e0c8955"
id: response-20260915082818179-chatgpt
prompt_id: prompt-20260915082713286
timestamp: "2026-09-15T08:35:50.450Z"
schema: web-flow/research/v1
version: 1
-->
## Bottom line

Your diagnosis matches the current implementation. As of **September 15, 2026**, I could not find an upstream issue that describes the *exact* fresh-load race in your wording — “SSR script restores/zeros correctly, user scrolls before hydration finishes, then the first `onRendered` consumes the initial `scroll.next === true` and forces `window.scrollTo(0, 0)`.” However, there are several closely related reports, and current `main` still contains the exact control flow that produces it. There is **no documented TanStack API specifically for skipping the first hydration scroll pass**. ([GitHub][1])

The closest current upstream issue is **#7815, opened July 14, 2026**, which independently traces scroll reset/restoration through `onRendered` and demonstrates that it can happen after the relevant paint. It covers forward navigation plus refresh/back restoration rather than your exact “reader scrolls during hydration” case. The issue is now marked **closed**, but its architectural problem has not disappeared from `main`. ([GitHub][2])

[TanStack Router issue #7815](https://github.com/TanStack/router/issues/7815?utm_source=chatgpt.com)

---

## 1. What is known upstream, and is it fixed?

There is a useful timeline:

| Date            | Issue / PR       | Relevance                                                                                                   | Status                                 |
| --------------- | ---------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Oct 20–27, 2024 | #2601 → PR #2645 | Scroll restoration happening too late and visibly flashing; PR moved restoration to a pre-route-mount phase | Fixed/merged                           |
| Mar 25, 2026    | #7040 → #7042    | Separate scroll-cache race during navigation                                                                | Fixed; released in router-core 1.168.5 |
| Jun 24, 2026    | #7687 → PR #7807 | Nested element restoration could be clobbered; included hydration-specific protection                       | Fixed in router-core **1.171.15**      |
| Jul 7, 2026     | #7749            | Pending UI remains at previous scroll offset until eventual reset                                           | Open                                   |
| Jul 14, 2026    | #7815            | `onRendered` scroll work happens too late; `history.scrollRestoration='manual'` hurts native restoration    | Closed, but core architecture remains  |
| Aug 5, 2026     | #7956            | Follow-up explicitly says #7815 was closed while `main` still has the problematic behavior                  | **Open**                               |
| Aug 10, 2026    | #8028            | `resetScroll` stored in shared `_scroll.next` slot can be overwritten                                       | **Open**                               |
| Sep 10, 2026    | PR #8347         | Stops forcing `history.scrollRestoration='manual'`                                                          | **Open, not merged**                   |

The old **#2601** is especially relevant historically. It reported that `<ScrollRestoration />` restored after DOM paint and visibly flickered. PR **#2645** was merged October 27, 2024 specifically to restore before the route became visible. ([GitHub][3])

[Issue #2601](https://github.com/TanStack/router/issues/2601?utm_source=chatgpt.com)
[PR #2645](https://github.com/TanStack/router/pull/2645?utm_source=chatgpt.com)

The recent **#7815** effectively says the same timing class has reappeared in the newer architecture. It traces:

`route mount → Transitioner → resolvedLocation → OnRendered → scroll-restoration subscriber → scrollTo()`

and concludes that the reset trails the DOM swap by at least one React commit and, in the reproducer, a browser paint. ([GitHub][2])

### The 1.171.15 fix does not fix your case

There *was* a hydration-related scroll fix in **`@tanstack/router-core 1.171.15`**, PR #7807. Its changelog explicitly says:

> “This also prevents client hydration from undoing nested positions restored by the SSR script.”

But that fix is specifically about **nested scroll targets / `scrollToTopSelectors`**, originating from #7687. The issue's reproducer involves an element scroll container being successfully restored and then reset to zero by the fallback. ([GitHub][4])

Your window case survives it. The current changelog head is **1.171.30**, and there is no subsequent scroll-restoration fix between 1.171.15 and 1.171.30. ([GitHub][4])

### Current `main` still has exactly the important pieces

As crawled today, `main` still does all of the following:

```ts
const shouldResetScroll = scroll.next

scroll.next = true

if (
  typeof router.options.scrollRestoration === 'function' &&
  !router.options.scrollRestoration({ location: router.latestLocation })
) {
  return
}
```

and later:

```ts
if (!windowRestored) {
  scrollTo({
    top: 0,
    left: 0,
    behavior,
  })
}
```

([GitHub][1])

So the core of your trace is still present on `main`.

It also still executes:

```ts
history.scrollRestoration = 'manual'
```

during setup. ([GitHub][1])

### PR #8347 is not the fix for your exact bug

**#7956, opened August 5, 2026**, explicitly notes that #7815 had been closed as completed even though `main` continued forcing `'manual'`. ([GitHub][5])

[Issue #7956](https://github.com/TanStack/router/issues/7956?utm_source=chatgpt.com)

PR **#8347**, opened September 10, removes only that assignment:

```diff
-history.scrollRestoration = 'manual'
```

It is currently **open and unmerged**. Its own description acknowledges:

> “The router's own restore runs post-paint in the `onRendered` subscriber”

and leaves that machinery unchanged. ([GitHub][6])

[PR #8347](https://github.com/TanStack/router/pull/8347?utm_source=chatgpt.com)

Therefore even if #8347 merges, it does **not** directly fix your “first hydration `onRendered` resets a reader who has already scrolled” case. It improves native reload/BACK/FORWARD restoration.

I found **no citable v2/beta fix** for your specific behavior. The public current docs remain v1, and `main` itself still has the relevant `onRendered` fallback. I would therefore not expect a prerelease/version bump to solve this unless a new patch lands after #8347.

---

# 2. What is the official TanStack way to disable this?

There is currently **no official hydration-only switch**.

The officially documented controls are:

* `scrollRestoration: true` globally.
* `getScrollRestorationKey` to control cache identity.
* `resetScroll: false` on `<Link>`, `navigate()`, or `redirect()` for a **particular navigation**.
* `useElementScrollRestoration` for manually managed elements/virtualized content. ([TanStack][7])

The docs explicitly define `resetScroll: false` this way: for the *next navigation*, don't restore an existing history entry or reset a new one to top. ([TanStack][7])

So this is sanctioned:

```tsx
<Link to="/foo" resetScroll={false} />
```

and:

```ts
navigate({
  to: '/foo',
  resetScroll: false,
})
```

The API docs confirm its default is `true`. ([TanStack][8])

But **initial hydration is not a navigation on which you can attach `resetScroll:false`**. Therefore this public API does not solve your case.

## `scrollRestoration: ({ location }) => boolean`

This is a real public type:

```ts
scrollRestoration?:
  | boolean
  | ((opts: { location: ParsedLocation }) => boolean)
```

([GitHub][9])

However, there are two important qualifications.

First, the current Scroll Restoration guide doesn't document the function form at all. It only demonstrates:

```ts
scrollRestoration: true
```

and documents `resetScroll` for opt-outs. ([TanStack][7])

Second, its implementation strongly indicates that it is a **location predicate**, not a hydration lifecycle API. It receives only:

```ts
{ location: router.latestLocation }
```

There is no `isHydrating`, navigation action, `fromLocation`, or “initial render” parameter. Returning false simply exits the entire `onRendered` scroll handler for that render. ([GitHub][1])

A December 13, 2025 community answer uses it exactly as a route opt-out:

```ts
scrollRestoration: ({ location }) => {
  return location.pathname !== '/apidocs'
}
```

([GitHub][10])

So I would characterize it as:

**Public and typed, but poorly/undocumented; designed naturally for location-based enable/disable behavior, not specifically for distinguishing SSR hydration from ordinary navigation.**

Using mutable state around it to skip invocation #1 can solve your problem, but that becomes a userland lifecycle hack rather than documented TanStack behavior.

---

## `getScrollRestorationKey` is not a solution

Officially, this controls which cache entry corresponds to a location. The docs give examples such as using `pathname` rather than `location.state.__TSR_key`. ([TanStack][7])

For your case:

1. first hydration has no applicable cached window entry;
2. `windowRestored` remains false;
3. fallback calls `scrollTo(0, 0)`.

Changing the key does not alter step 3. ([GitHub][1])

So there is no meaningful `getScrollRestorationKey` trick here.

## `defaultPreload`

Unrelated. It affects route preloading, not scroll reset/restoration.

## `_scroll`

Not a public API. Current open issue #8028 itself describes navigation intent being stored internally as:

```ts
this._scroll.next = next.resetScroll ?? true
```

and reports races caused by that shared slot. ([GitHub][11])

I would not build application logic around `router._scroll`.

## Route-level option

I found **no `scrollRestoration` route option** equivalent to:

```ts
createFileRoute('/foo')({
  scrollRestoration: false,
})
```

The option exists on `RouterOptions`, not route configuration. There is even a January 20, 2026 discussion requesting a per-route/window opt-out; core maintainer Manuel Schiller asked for a complete example, but no sanctioned route-level setting was provided. ([GitHub][12])

[Discussion #6431 — per-route opt-out](https://github.com/TanStack/router/discussions/6431?utm_source=chatgpt.com)

The global function predicate can effectively approximate one now.

---

# 3. Does TanStack Start add anything?

No additional Start-specific scroll-restoration control showed up in the current official docs.

The Start routing guide simply creates the normal TanStack Router and sets:

```ts
export function getRouter() {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
  })

  return router
}
```

([TanStack][13])

So Start's SSR integration supplies the SSR/hydration environment and restoration machinery, but configuration remains Router configuration. I found no Start-specific equivalent of “skip hydration scroll reset.”

---

# 4. What maintainers have said

I found **no Tanner Linsley or core-team response on #7815 or #7956 addressing this exact current bug**. There is also no maintainer review yet on #8347 in the material currently visible; the PR remains open. I also did not find a publicly citable Discord discussion specifically about this 2026 hydration reset, so I would not invent one.

There are relevant older maintainer statements.

In the original scroll-behavior discussion, Tanner Linsley said on **November 22, 2022**:

> “Yeah we need this. We should probably do something similar to Remix’s scroll hook, but agnostic.”

And when a user noted in August 2023 that “scroll restoration” also implicitly resets the page to top on forward navigation, Tanner replied:

> “Yeah true. I’ll add that to the docs.”

([GitHub][14])

[Discussion #299](https://github.com/TanStack/router/discussions/299?utm_source=chatgpt.com)

More importantly, the team accepted PR #2645 in 2024 specifically to move restoration earlier to avoid visible flashes. Core maintainer Manuel Schiller reviewed it and then wrote:

> “this looks good, can we merge?”

before merging it on October 27, 2024. ([GitHub][15])

That makes the current documentation particularly interesting: it still claims TanStack Router restores positions:

> “after successful navigations before DOM paint”

while #7815 and current source demonstrate that the current `onRendered` pathway can be post-paint. ([TanStack][7])

So there is presently a real mismatch between the stated timing guarantee and observed/current implementation.

---

# 5. Function-form gotchas

There are several.

### A. Yes, a function is truthy in the server-side `<ScrollRestoration>` check

Current React `Match.tsx` contains:

```tsx
{(isServer ?? router.isServer) &&
  route.parentRoute?.id === rootRouteId &&
  router.options.scrollRestoration ? (
    <ScrollRestoration />
  ) : null}
```

A function-valued `scrollRestoration` therefore passes that truthiness test without the predicate being evaluated. ([GitHub][16])

So your observation is valid.

There is one nuance: in current source, the deprecated component itself does only:

```ts
setupScrollRestoration(router, true)
return null
```

and `setupScrollRestoration()` exits on the server. ([GitHub][17])

Therefore I would say **“the deprecated component is instantiated server-side because the function is truthy”**, but I would not say that this component itself necessarily emits the current inline restoration script. The current source no longer supports that stronger inference. The project nevertheless clearly has SSR pre-paint restoration machinery: both the 1.171.15 changelog and #7956 explicitly refer to the SSR inline restoration script. ([GitHub][4])

### B. Returning `false` disables more than “cache restoration”

The predicate check happens *before* cache restoration, reset-to-top, and hash handling:

```ts
if (
  typeof scrollRestoration === 'function' &&
  !scrollRestoration(...)
) {
  return
}
```

([GitHub][1])

Later in that same handler is the router's hash logic:

```ts
document.getElementById(hash)?.scrollIntoView(...)
```

([GitHub][1])

Therefore `false` means effectively:

**skip TanStack's entire scroll handling for this `onRendered` event**, including:

* cached position restoration;
* default scroll-to-top;
* `scrollToTopSelectors`;
* router-driven hash `scrollIntoView`.

That matters if you use it as a per-route opt-out.

### C. A function still enables global scroll-restoration setup

This is subtle.

At setup time:

```ts
const shouldSetupScrollRestoration =
  force ?? router.options.scrollRestoration

if (shouldSetupScrollRestoration) {
  scroll.restoring = true
}
```

A function is truthy, so listeners/cache machinery are enabled and current `main` still sets:

```ts
history.scrollRestoration = 'manual'
```

before the per-render predicate ever gets called. ([GitHub][1])

Thus a predicate returning `false` for `/foo` does **not** mean scroll restoration was never globally initialized.

### D. Hash behavior has already had several recent regressions

This area has been actively changing:

* **1.171.4:** fixed hash navigation being overridden by stale restoration entries.
* **1.171.5:** fixed hash scrolling with `resetScroll={false}`.
* **1.171.15:** changed hash precedence again as part of #7807. ([GitHub][4])

So any hydration predicate workaround should explicitly test direct loads such as `/page#section`.

---

# 6. What workaround should you actually use?

I did **not** find enough evidence to call any workaround “the widely accepted community solution” for your *exact* first-hydration race. The community reports mostly address adjacent problems. I would distinguish three workarounds.

### A. `history.scrollRestoration = 'auto'` — good, but does not fully solve your exact race

This is the most clearly documented recent production workaround. #7815 says the reporter re-enables browser-native `'auto'` while leaving TanStack restoration active. #7956 says that arrangement has been running in production without observed downside. ([GitHub][2])

It improves:

* refresh restoration;
* browser back/forward;
* iOS swipe-back;
* bfcache/cross-document behavior.

But for your specific sequence:

1. initial page is already rendered correctly;
2. user manually moves to `scrollY > 0`;
3. hydration later emits first `onRendered`;
4. TanStack calls `scrollTo(0,0)` because no cache entry exists.

Leaving browser restoration on `'auto'` does **not prevent step 4**.

So I would adopt #8347's behavior independently because it is sensible, but **not consider it the fix for this bug**.

### B. One-shot function predicate — smallest public-API workaround for your exact case

Given the current implementation, the least invasive way to suppress precisely the first client `onRendered` is roughly:

```ts
export function getRouter() {
  let firstScrollPass = true

  return createRouter({
    routeTree,

    scrollRestoration: () => {
      if (firstScrollPass) {
        firstScrollPass = false
        return false
      }

      return true
    },
  })
}
```

This gives you:

* hydration: skip the redundant second scroll operation;
* later client navigations: normal scroll-to-top;
* later BACK/FORWARD: normal TanStack restoration.

It relies only on a public typed Router option, not `_scroll`.

But I would treat this as an **implementation-aware workaround, not sanctioned guidance**, because the callback has no documented “first hydration” semantic. And you must test direct hash URLs because returning false skips the router's hash handling on that first pass. ([GitHub][1])

Start's requirement that `getRouter()` create a fresh router instance each time is helpful here: keep the one-shot flag inside that router factory rather than at module-global scope. ([TanStack][13])

### C. Patch `router-core` — most precise if you want production certainty

If this is an important UX issue, a small `patch-package`/pnpm patch is arguably cleaner semantically: suppress the first **redundant hydration** reset rather than overloading a location predicate.

Conceptually, TanStack should distinguish:

```text
initial client onRendered after SSR
```

from:

```text
successful client navigation that should reset
```

and avoid consuming an initial `next:true` as though hydration were a forward navigation.

The downside is obvious: you now maintain a source patch and need to rebase it when scroll-restoration internals change. Given how many related changes landed between 1.168.x and 1.171.x, that maintenance cost is nonzero.

I would **not** directly mutate:

```ts
router._scroll.next = false
```

even though that would target the symptom exactly. `_scroll` is internal and already implicated in the separate #8028 race. ([GitHub][11])

---

## My conclusion for 1.171.30

For your requirements:

* **fresh SSR load:** preserve whatever position exists after the pre-paint SSR script; don't touch it at hydration completion;
* **client `<Link>` PUSH:** top of new page;
* **BACK/FORWARD:** restore old position;

there is currently **no documented TanStack configuration that expresses those three semantics directly**.

The closest clean userland setup today is:

```ts
// public API, but the "first invocation == hydration" use is a workaround
let firstClientScrollPass = true

scrollRestoration: () => {
  if (firstClientScrollPass) {
    firstClientScrollPass = false
    return false
  }
  return true
}
```

plus, separately, consider restoring:

```ts
window.history.scrollRestoration = 'auto'
```

after Router initialization to get the #7815/#7956 native restoration benefits until #8347 or an equivalent lands.

I would test that combination specifically against **fresh load, reload at nonzero Y, browser back, browser forward, iOS swipe-back, direct `#hash` load, client hash navigation, and navigation with `resetScroll:false`**. The first-hydration predicate solves your measured yank; `'auto'` addresses the separate browser-native restoration regression. Neither should be confused with the 1.171.15 nested-element fix. ([GitHub][4])

The most important upstream gap is therefore quite narrow and reportable: **the SSR pre-paint scroll pass and first client `onRendered` are both acting on the same initial location, and the latter defaults to `next:true` rather than recognizing that initial scroll disposition has already been handled.** I did not find an existing issue stating that exact bug.

[1]: https://github.com/TanStack/router/blob/main/packages/router-core/src/scroll-restoration.ts "router/packages/router-core/src/scroll-restoration.ts at main · TanStack/router · GitHub"
[2]: https://github.com/TanStack/router/issues/7815 "Forward-navigation scroll reset runs one paint too late; forcing `history.scrollRestoration = 'manual'` breaks native restoration (iOS swipe-back, Chrome hard refresh) · Issue #7815 · TanStack/router · GitHub"
[3]: https://github.com/TanStack/router/issues/2601?utm_source=chatgpt.com "`<ScrollRestoration />` does not restore the scroll positions before DOM paint · Issue #2601 · TanStack/router · GitHub"
[4]: https://github.com/TanStack/router/blob/main/packages/router-core/CHANGELOG.md "router/packages/router-core/CHANGELOG.md at main · TanStack/router · GitHub"
[5]: https://github.com/TanStack/router/issues/7956 "history.scrollRestoration should never be changed from 'auto' — 'manual' regresses iOS Safari swipe-back and Chrome refresh (follow-up to #7815) · Issue #7956 · TanStack/router · GitHub"
[6]: https://github.com/TanStack/router/pull/8347 "fix(router-core): stop forcing history.scrollRestoration to 'manual' by Ishkirat-Singh · Pull Request #8347 · TanStack/router · GitHub"
[7]: https://tanstack.com/router/latest/docs/guide/scroll-restoration "Scroll Restoration | TanStack Router Docs"
[8]: https://tanstack.com/router/latest/docs/api/router/NavigateOptionsType?utm_source=chatgpt.com "NavigateOptions type | TanStack Router Docs"
[9]: https://github.com/TanStack/router/blob/main/packages/router-core/src/router.ts?utm_source=chatgpt.com "router/packages/router-core/src/router.ts at main · TanStack/router · GitHub"
[10]: https://github.com/TanStack/router/discussions/1155?utm_source=chatgpt.com "Opt out of scrolling on hash change · TanStack router · Discussion #1155 · GitHub"
[11]: https://github.com/tanstack/router/issues/8028?utm_source=chatgpt.com "resetScroll from a navigation is lost when the destination navigates while it is still settling · Issue #8028 · TanStack/router · GitHub"
[12]: https://github.com/TanStack/router/discussions/6431?utm_source=chatgpt.com "Opt out of window scroll restoration for a specific route · TanStack router · Discussion #6431 · GitHub"
[13]: https://tanstack.com/start/latest/docs/framework/react/guide/routing?utm_source=chatgpt.com "Routing | TanStack Start React Docs"
[14]: https://github.com/TanStack/router/discussions/299?utm_source=chatgpt.com "Scroll Behavior on page change · TanStack router · Discussion #299 · GitHub"
[15]: https://github.com/TanStack/router/pull/2645 "fix(react-router): remove flashes caused by `<ScrollRestoration />` by xiaohai-huang · Pull Request #2645 · TanStack/router · GitHub"
[16]: https://github.com/TanStack/router/blob/main/packages/react-router/src/Match.tsx "router/packages/react-router/src/Match.tsx at main · TanStack/router · GitHub"
[17]: https://github.com/TanStack/router/blob/main/packages/react-router/src/ScrollRestoration.tsx "router/packages/react-router/src/ScrollRestoration.tsx at main · TanStack/router · GitHub"

<!-- @web-flow end id=response-20260915082818179-chatgpt -->
