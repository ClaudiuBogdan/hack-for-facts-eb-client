# DA-001: Direct acquisitions release 1, client follow-ups left after the third review

Status: open (follow-ups moved to DA-003 to DA-006) · Filed 2026-11-18 · Branch `feat/procurement-da-release-20261118` · Accepted as follow-ups by root
under the review round cap (after the third review, only a D6 leak blocks the release). None of these is a leak.

## Summary

Three non-leak findings from the second independent review (gpt-6.2-sol, xhigh) were left open when release 1's
client shipped. Each now has its own issue, with where it lives and a suggested fix.

## Follow-ups, one issue each (2026-11-20)

1. A release purchase is kept under its legacy key until the page mounts: [DA-003](DA-003-release-purchase-under-legacy-key.md).
2. Exact line amounts go through `Number`: [DA-004](DA-004-line-amounts-through-number.md).
3. Two refused figures are left out rather than said in the D6-only window: [DA-005](DA-005-refused-figures-left-out.md).

## Third review (18 November 2026)

The third review's non-leak findings match items 1–3 above. Its point that the purchase's own row among the
neighbours took „lei" when uncounted is fixed: the row carries its value's basis, as the neighbours' do. Items 1–3
remain open, as DA-003 to DA-005.

## Release note (visible change, not a defect)

Analytics no longer offers title search or a firm's place for direct purchases: „Achizițiile directe nu mai pot fi
căutate după titlu în analize: titlurile lor sunt ascunse până la verificare."

For direct purchases, analytics picks a supplier by CUI only: no firm is searched for or offered by name („La
achizițiile directe, firma se alege după CUI.").

## Release note (information for the owner)

When a publish withholds a supplier, the name can stay visible for at most `DA_DISCLOSURE_CHANGE_BOUND_SECONDS`
(660 s) plus a server render's own time: a release status up to 60 s old, plus 600 s of CDN cache (`lib/disclosure-cache.ts`, design §24.4). An
open tab is held to the same 660 s. It drops the name at its next successful status poll, a minute apart. If the
status can't be read for 660 s, the tab removes what it shows and asks nothing more until a poll succeeds, with a
notice that the data isn't shown. Withdrawing a single name sooner takes a CDN purge, which is the owner's account
action.

## Residual risk with D6 on (for the owner, with the enablement decision; root, 19 November 2026)

After seventeen independent reviews (gpt-6.2-sol, xhigh; 13–17 on telemetry) the client keeps these, each accepted by root; the owner accepted them on 2026-11-20; details in design §24.4 and `docs/issues/TEL-001-party-codes-in-telemetry.md`.

1. **The bound.** A withheld supplier can stay visible up to 660 s plus render time (worst measured 3.2 s on dev): 60 s of status, 600 s of CDN. Sooner takes a CDN purge (the owner's).
2. **Render time.** A render that read under one publication and finishes after the next is published is cached 600 s from then.
3. **Clock skew.** An open tab's bound runs on the browser's clock against the server's stamp; a browser running slow extends it by its lag. The CDN bound and the API's own checks don't depend on it.
4. **The reader's own address (P3).** A code typed into the URL comes back in that URL's HTML (router ids, query keys), only to whoever asked. Lookups send the code; the API decides. The page prints no unnamed supplier's code.
5. **Telemetry** (TEL-001, a change of its own, shipped first): no party code reaches PostHog or Sentry, scrubbed at each SDK's request layer; session replay is off site-wide, tracing off on procurement and company pages. Left at P3: a feedback screenshot the reader attaches, PostHog's copy of the reader's URL in their own browser storage, and PostHog's operator-only toolbar. An institution's code on its budget page is public, not a D6 leak.
6. **Every direct-purchase read is dated** (API doc 10, live on dev 19 November 2026): the release purchase, the legacy detail and lists and the supplier-records connection now carry `meta.disclosureKey`, which the client selects and the transport checks; no purchase is read while the privacy publication is unreadable.
7. **What a tab already shows** stays until its purge runs: an untagged seed when the first key arrives, a suspended tab before its timer, a ranking's names as placeholder, a link copied mid-purge (P2/P3).
8. **Follow-up lookups** guard on the key as it was when they started; a retry re-samples it, and the browser names lookup has no such guard (P2, [DA-006](DA-006-browser-names-lookup-unguarded.md)). The API's final check still applies.
9. **D6 incident.** While the privacy publication is unreadable, DA pages fail closed and show a notice.
10. **Scope.** Contracts and organisation labels aren't under D6. Decided by the owner on 2026-11-20 (keep it simple; document the gap): [DA-002](DA-002-d6-scope-contracts-and-labels.md). The company page's public money is under D6.
