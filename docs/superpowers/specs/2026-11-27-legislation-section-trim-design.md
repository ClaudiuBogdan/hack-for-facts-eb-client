# Legislation section: the search lists acts by filter; Acte, Monitorul Oficial and Ghid retire

**Date:** 27 November 2026. **Owner's decisions:** in the client-legislation session, the same day. **Size:** a small
change, one push.

## Why

The owner asked why the legislation section still keeps the four pages that were tabs (Acte, Modificări, Monitorul
Oficial, Ghid), and to keep only what real users need. After a review of what each page does that nothing else does:

- **Acte** is part of the search. Its only unique jobs are listing acts with no search term and ordering them by
  citations. Owner: add that to the search "only if there is an active filter".
- **Monitorul Oficial**: the owner chose to drop the page (over a "what was published" feed and an issue browser).
  The act pages keep their link to the issue's official PDF. Publication counts by type and issuer go to the
  analysis page later, as a separate piece.
- **Ghid**: dropped. "We decide later if we need a guide." Its notes are not moved elsewhere now; the text stays in
  git history.
- **Modificări** stays its own page (its rows are changes, not acts, and only it shows upcoming changes). Its
  redesign is the next piece, out of scope here.

## Goals

1. `/legislation/search` with no term and at least one filter lists the matching acts, most cited first.
2. `/legislation/acts`, `/legislation/gazette` and `/legislation/guide` stop being pages; their addresses forward, so
   shared links and the server's tool links keep working.
3. The section's bar and the hub stop pointing at the retired pages.

**Non-goals:** the Modificări redesign; the publication counts on the analysis page; any guide content; server changes.
**Anti-goals:** a list that ignores a filter the reader set, and silently shows more than they asked for; a shared link that ends
on an error page; a second page doing the search's job.

## Approaches

- **Chosen: the client asks the act list (`legalActs`) when there is no term.** It takes the same filter input as the
  search (`LegalActsFilter`: type, status, year range, domain, category, penalties; checked on the dev API on
  27 November 2026), it is ordered by citations by default (`IN_DEGREE`), and it returns a total and a cursor.
  Client only.
- Rejected: the server's search accepting an empty term. That is a server change for what `legalActs` already does.
- Rejected: keeping `/legislation/acts` as a second copy of the search page. Two pages would do one job.

## Design

### The search with no term

| Term | Filters | Shows |
|---|---|---|
| typed | any | as today: results by relevance |
| none | at least one (`isSearchFiltered`) | **new:** the act list for those filters, most cited first |
| none | none | as today: the empty state with examples |

- The rows are the search's own act rows (status mark, title, citation, identifier); the list adds no new row look.
- Above the rows, one line gives the total and the order, e.g. „1.555 acte, cele mai citate întâi".
- More rows come with „Încarcă mai multe" (`legalActs` is cursor-paged; 223k acts, so no numbered pages).
- Every filter the search offers is passed through `searchArgs` to `legalActs`. With no status chosen, the list
  follows the search's own default: it shows what the search shows without "include istorice". **Builder:** read the
  exact status set from the server's search (its `includeHistorical: false` rule). Do not guess it.
- Loading, failure and "no act matches these filters" states follow the search page's existing ones.
- The page's address stays the search's (`?tip=…&stare=…&an=…&domeniu=…&categorie=…&sanctiuni=true&historical=true`);
  the list is server-rendered like the search's results, if the search's results are.

### Forwarding (permanent, 301, in the route's `beforeLoad`, like `acts/$actId_/text`)

- `/legislation/acts?actType=&status=&year=&domain=` → `/legislation/search` with:
  - `actType` → `tip`;
  - `year` → `an`;
  - `domain` → `domeniu`;
  - `status` → `stare` (`status=toate` → `historical=true`).
  - An absent `status` was the old page's default „în vigoare", so it becomes `stare=in-vigoare`. Unreadable values drop.
- `/legislation/gazette?…` and `/legislation/guide` → `/legislation`.
- `/legislation/acts/$actId` (the act page) is untouched.

### The bar and the hub

- The slim head's bar on the legislation pages becomes Caută · Analiză · Modificări.
- The hub: the Monitorul Oficial section (band) goes; „Sau mergi direct la" keeps Acte (now
  `/legislation/search?stare=in-vigoare`), Analiză and Modificări, and loses Monitorul Oficial. The sources line
  („Surse: Portalul Legislativ, Monitorul Oficial") stays: it names where the data comes from.
- Anything else on the hub that reads the gazette only for the removed band goes with it. What another part still
  uses (e.g. the freshness of the newest issue) stays.

### Removal

- The Acte, Monitorul Oficial and Ghid page components, their API adapters, mocks and tests are deleted where nothing
  else uses them. Their catalogue ids drop at the extract.
- The /development prototypes stay (the owner keeps prototypes); their links to the retired pages point at the new
  places.

## Constraints

- Client only; data from the dev API.
- `src/routeTree.gen.ts` is regenerated, never hand-edited.
- Catalogues: run the extract on this branch; commit only `src/locales/{ro,en}/messages.po`; fill en and ro by hand.
  Root is told before the catalogue change.
- Review: two Codex rounds (gpt-6.2-astra, max, read-only, code-only brief); the legislation session reads the
  round-2 fixes. Push: the owner's word, the legislation session's review, root's OK on a pre-push note.
- The server's MCP tools link to client legislation pages; the redirects keep those links working. The legislation
  session is told that gazette links now land on the hub.

## Left to the builder

- The exact component split inside the search page for the no-term list.
- The copy of the total line, in the search page's voice, en and ro.
- Tests: the three-row table above, each forwarding map (including `status=toate` and an absent status), and the bar's
  three entries.
