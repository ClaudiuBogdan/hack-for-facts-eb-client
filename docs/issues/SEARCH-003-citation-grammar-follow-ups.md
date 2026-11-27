# SEARCH-003: Two places where the search page's citation reading can drift

**Status:** open (filed 26 November 2026). **Owner:** client-legislation. **Priority:** low; nothing waits on it.
**Related:** `src/features/legal/lib/legal-citation.ts` (`parseExactCitation`, `parseLegalCitationShape`),
`src/features/legal/components/legislation-act-finder.tsx` (the empty state), SEARCH-001 (a number in the address
loses its spelling on the first load, `?q=1.10`: recorded there, not repeated here). Raised by the legislation session
when it cleared the search page's review fixes for dev.

## 1. The empty state's heading still reads the loose shape

`/legislation/search` reads a question as a citation in two ways. `parseExactCitation` is the strict grammar, the one
the server uses to look an act up; the page uses it to wait for the act and to say "Poate cauți acest act".
`parseLegalCitationShape` is the older, looser shape.

When a search finds nothing, the heading „Niciun act găsit pentru citarea …" is still chosen by the loose shape
(`legislation-act-finder.tsx`, the empty state). A question the loose shape accepts and the strict grammar refuses is
then called a citation in the heading although the page never looked an act up for it.

**Fix (suggested, not started):** choose the heading by `parseExactCitation`, as the rest of the page does, and add a
test with a question the two readings disagree on.

## 2. `parseExactCitation` is a copy of a server function that is not on the server's dev branch yet

The client's `parseExactCitation` is a port of the server's (`src/modules/legal/core/citation.ts`). It was taken from
the server's review worktree at commit `392dbc88`, which had not reached the server's dev branch when this was filed.
The two were compared in full on 26 November 2026 and were the same.

Nothing keeps them the same. If the server's grammar changes before or after it lands, the page will wait for an act
the server does not look up, or miss one it does.

**Fix (suggested, not started):** when the server's function lands on its dev branch, compare again and record the
server commit in the client function's comment. A shared set of cases (questions and what each reads as), run by both
repos' tests, would keep them from drifting.
