# NB-009: Two printed GDP shares and the 2008 interest are missing from the served series

**Status:** open, for the scrapper and server. **Found by:** four independent read-only reviewers of the `/national-budget` preview,
forwarded by the owner, 25 November 2026; checked the same day against the dev API (snapshot `e1.fe393d8b…`). **Related:** NB-002 (the
population and GDP tables), the scrapper decision `docs/domains/mfin/decisions/20261007-execution-gap-corrections.md` (BQA-11).

## What is missing

| Period | What the Ministry published | What the API serves |
|---|---|---|
| January–May 2025 | deficit 64,23 mld. lei, **3,39% of GDP** (Ministry statement, Agerpres, 27 June 2025) | the amount; no `GDP_SHARE` |
| 2023 (December bulletin) | **5,68% of GDP** (reviewer, `nota_bgc31122023.pdf`; the Ministry's site reset our own fetch) | the amount (89,90 mld. lei); no `GDP_SHARE` |
| 2008, interest | **3.893,3 mil. lei** consolidated interest (reviewer, `dec2008.pdf`, page 2; our fetch was reset too) | `UNAVAILABLE`, `absent_endpoint_item`: the 2008 correction qualified the three headline totals only |

The 2011 and 2013 interest gaps are right as they are: the December bulletins give those years as estimates, and the executed series keeps
them out until a source establishes actual spending.

## The ask

- Load the two printed shares, each qualified as an archived figure (its source, release date and how it was read), before they are served.
- Backfill 2008's interest from the held 2008 annual table, by the same targeted rule as the headline totals.

## Meanwhile, on the page

The notes say what is true now: the page computes 2023's share from INS's annual GDP (labelled as computed, and as possibly different from
the Ministry's), the year-in-progress line skips May 2025 because the loaded data has no share for it, and the interest chart names why
2008, 2011 and 2013 are empty. A share is the one printed when it was published: the September 2026 bulletin restates January–September 2025
at 5,31% with revised GDP, where the page shows 5,39% as first published (September 2025).
