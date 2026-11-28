# LEGAL-001: A hand-typed `?nod=` that looks like a number opens the act without the jump

**Status:** fixed as far as it can be (26 November 2026); what is left is a known limit. **Owner:** client-legislation.
**Priority:** low. **Related:** `src/schemas/legal-search.ts` (`legalReaderSearchSchema`),
`src/lib/router-search-codec.ts`, `src/features/legal/components/reader/legal-reader-page.tsx` (`tocHref`). Found by
the Codex review of the act page's shell; decided by the legislation session.

## What happened

`/legislation/acts/72159?nod=0.1` answered 500. The app's router reads every search value as JSON before the route
validates it, so a bare `0.1`, `1` or `true` arrives as a number or a boolean. The act page's `nod` must be text (a
path in the text's outline), and the validation threw.

Two things could put such an address in front of a reader:

- the act page's own contents links, which wrote `?nod=<path>` bare (new with the redesign of 26 November 2026);
- an address typed or edited by hand.

## What was done

- The contents' links are written by the router's own serializer (`stringifyAppSearch`), which quotes a path that
  would read back as something else: `?nod=%220.1%22`. They keep their jump. A click in the contents always wrote the
  address this way.
- A `nod` that is not text is dropped by the validation: the page answers 200 and opens the text without a jump. A
  `doc` that came with it is kept. A `doc` the page cannot read still takes its `nod` with it, as before.

## The limit that stays

A numeric path typed by hand loses its jump. It cannot be recovered: by the time the route sees it, the router has
already read `1.10` as 1.1, so writing the number back as text could name another provision (`1.1`). Opening the
text at its start is the honest answer. A value the router does not read as a number (`01`, `0.1.1`) is still a path. Paths on legal_v2 start with a letter or carry more than one dot (`r5019`,
`1.r801`), so this touches only older documents whose top-level paths are short numbers.

## Tests

`src/schemas/legal-search.test.ts`: "drops a nod that is not text…", "keeps the path … when the app writes the link…".
`src/features/legal/components/reader/act-reading-shell.test.tsx`: "writes each entry's address as the router reads
it back…". `tests/integration/legislation-act.spec.ts`: "a hand-typed place the router reads as a number opens the
text, without a server error".
