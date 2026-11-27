# SEARCH-002: The search page's sentence promises text search on any engine

**Status:** open, waiting on the launch-engine decision (filed 26 November 2026). **Owner:** client-legislation. **Priority:** low
today; it becomes a release blocker only if launch goes to the Postgres engine. **Related:**
`src/features/legal/components/legislation-shell.tsx` (the sentence under the title),
`src/routes/legislation/search.tsx` (the page description), `src/features/legal/components/legislation-act-finder.tsx`
(the examples before a question). Raised in the review hand-off of the search page's round 2.

## What happens

Since round 2 of `/legislation/search`, three pieces of page-level copy say that words in an act's text can be searched,
before any answer exists:

- the sentence under the title: "Un act după număr, după nume sau după cuvinte din textul lui, cu statutul lui actual.";
- the page description: "Găsește un act normativ după număr (Legea 98/2016), după nume (Codul civil) sau după cuvinte
  din textul lui, cu statutul lui actual.";
- the third column of examples, "După cuvinte din text".

That is true on the OpenSearch engine, which answers on dev today. On the Postgres engine only numbers and names are
searched. Each answer still says which it was: the words beside the count, the notes behind the ⓘ, and the empty-answer
sentences all follow the answering engine. Only the copy above does not.

## Decision

The owner chose to keep "words in its text" (26 November 2026, by the question dialog in the client-legislation session, with the
caveat stated: it holds on OpenSearch, not on the Postgres fallback, and the launch engine is still open). The
legislation session records the review's finding on this as decided.

## What is left

When the launch engine is chosen:

- **OpenSearch:** nothing to change. Close this.
- **Postgres:** the sentence and the description go back to number and name only, and the third examples column goes
  (or keeps its note and says text search is coming). New message ids, so one extract.

A degraded OpenSearch answer needs no change here: the page already says in the open that part of the search did not
run.
