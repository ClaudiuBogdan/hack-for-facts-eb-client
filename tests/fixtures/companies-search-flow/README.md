# companies-search-flow fixtures

Browser GraphQL answers for `tests/integration/companies-search.spec.ts`. The directory first pins the registry scope of its own `CompanyRegistry` read. It then reads the list (`CompaniesSearch`), the county options (`CompanyGroupProfile`) and the name suggestions (`CompanyResolveResult`, NAME) only under that scope, and refuses any answer under another. Every answer here therefore carries **one** registry scope.

## What was authored, and what is curated

**Authored test data**, written for these tests on 10 July 2026 (client commits `ab6f8b64` and `d024b800`) and kept as it was:
- the list rows: CUIs, org ids, names, legal forms, headline status code and label, county strings, fiscal flags, recorded dates, cursors, page info and totals;
- the county options: keys, labels, counts and the denominator. In July these were described as production figures of that time; nothing here observes them again;
- the resolver's DANTE hit: dim, value, label, CUI and confidence.

These are UI scenarios. Some are plainly illustrative (`EXEMPLU REGISTRU CULTURAL`, one recorded date for every row). None of them is a September capture or authoritative ONRC, ANAF or production output.

**Curated, synthetic.** Added in October 2026 when the contract grew. None of this is an observation:
- **Registry scope.** The published edition `41` with epochs `3`/`7` (`scopeKey` `onrc:published:41:3:7`). `company-registry.json` is byte for byte the `companies-profile-flow` one, so the company flows share one synthetic scope. The same envelope is on every list page, the county options and both resolver answers.
- **Per-row registry metadata.** Each row has:
  - `registryCuiState: IN_EDITION` and `nameSource: ONRC_EDITION`;
  - `headlineStatus.labelSource: API_NOMENCLATURE` (the authored label `funcțiune` is the API's nomenclature label for `1048`);
  - `hasActiveObservation: true` (the row's status is `1048`);
  - `SINGLE_OBSERVATION` as the status, county and recorded-date basis, consistent with the one authored value of each.
- **County options.** `groupBy: COUNTY`, and `basis: null` on every bucket, since each is a selectable county consensus.
- **Name suggestions.** The `companyResolveResult` envelope (`degraded: false`, `ambiguous` = more than one hit, the scope). The NAME hit adds a null `revision` and `key` (NAME hits have none) and `labelSource: onrc_edition`, matching the rows' `nameSource`. `resolve.json` is a "no match" under the same scope; the spec registers it only for NAME reads under that scope.

## Deliberately kept in the older shape

- **County keys.** The county option keys are county *names* (`CLUJ`, `BUCUREŞTI`, …) with null labels. The current server keys a county bucket by its *code*, with a canonical name as the label. The tests select and assert Cluj by name: the sheet's checkbox `/CLUJ/`, the chip `county:CLUJ`, and the list filter `{county:{eq:"CLUJ"}}`. The server also matches a county filter by name. So the scenario stays coherent for the page, but it is not the current server's facet shape.
- **Row county strings** (`CLUJ`, `MUNICIPIUL BUCUREŞTI`, `IAŞI`) are the authored ones, not the server's canonical spellings.

## Removed

- **`coverage` on the county profile.** The current `CompanyGroupProfile` selection no longer asks for it. Its authored values (territory matched 1,046,512, unmatched 677,879, and the note) remain in the history of `d024b800`.
- **The retired `companyResolve` arrays.** They are now the `hits` of `companyResolveResult`.

The changes come from one task-owned generator, which reads the originals at client commit `2d7d9d70`. They are test data, so every assertion they enable stays a statement about the page, not about any company or edition.
