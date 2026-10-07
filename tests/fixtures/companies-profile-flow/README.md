# companies-profile-flow fixtures

Browser GraphQL answers for `tests/integration/companies-profile.spec.ts`. The page renders first on the server from the dev API. It then pins the registry scope of its own `CompanyRegistry` read and shows the browser's `CompanyProfile` answer only under that scope. Every answer here therefore shares **one** registry scope.

## What was recorded, and what is curated

**Recorded** from the dev API on 24 September 2026 and kept byte for byte:
- `abc-aggregates`, `abc-authority-names`, `abc-records`, `abc-supplier-name`, `cpv-divisions`;
- `ideatica-aggregates`, `ideatica-records`, `ideatica-supplier-name`;
- `abc-litigation`, `ideatica-litigation`: the judicial API's company-litigation summary, recorded on 7 October 2026 (no link published: `caseCount` 0, `coverage` 0, so the page shows no litigation band);
- in the two `*-profile.json`, every company value: CUI, organisation id, name, legal form, registration code and recorded date, headline status code and label, territory, fiscal record, CAEN rows, public money and as-of dates;
- every financial statement value of ABC's 18 years (turnover, profit, loss, employees and the balance-sheet summary), and the trajectory deltas.

**Curated, synthetic.** Added in October 2026 when the contract grew. None of this is an observation of the September recording, and none of it is ONRC, ANAF or MFP authority:
- **Registry scope.** One published edition, `41` with epochs `3`/`7` (`scopeKey` `onrc:published:41:3:7`). It uses the server's real version names, and its publication date is the recorded `asOf.onrc` (2026-07-18). It appears in `company-registry.json`, in each profile's `registry` and in each `*-registration-diff.json`.
- **Registry evidence** for each CUI. It is `IN_EDITION`, with one identifier (the recorded registration code), one identity row and one status row (the recorded headline code). There is one CAEN row per recorded ONRC CAEN activity. Each value has single-observation bases, and coverage is complete. Provenance row hashes are synthetic digests, and source URLs are null.
- **Registration diffs.** The server's first-edition answer (`NOT_COMPARABLE`, `first_edition`), since the capabilities list one edition.
- **Contract fields** the recording predates:
  - `nameSource: ONRC_EDITION`;
  - `headlineStatus.labelSource: API_NOMENCLATURE` (the recorded labels are the API's nomenclature);
  - CAEN `labelSource` (`current_db_catalog` beside a labelled known revision);
  - trajectory delta reasons (null).
- **Statement `sourceSystem` and `source`.** `sourceSystem` follows the server's CHECK-enforced seam: `anaf` from FY2019, `mfp` for FY2008–2018. `source` carries a null URL and profile hash ("not recorded", never guessed) and a synthetic metric-rule version.
- **Statement `qualification`.** It is consistent with each statement's own values, under one synthetic admission policy (`companies-profile-flow-synthetic-admission-v1`, release `fixture-1`) with the real evaluator id `sql-v1`:
  - a present value is `REPORTED`, and `"0"` is a reported zero;
  - an absent one (`null`) is `MISSING`, never zero;
  - the net result is profit − loss as exact decimal text, an absent side counted as 0.

**Removed** because the current selection no longer asks for it: the deprecated `statusFlags`. `address.locality` is now null, as the compatibility shape serves.

ABC's recording also flagged status `1139` ("este sub incidența Legii nr. 85/2014") beside its headline `1107`. Under the current contract, two distinct status codes in an edition mean no consensus, so the headline would be null. The curated evidence therefore carries the recorded headline `1107` as the company's single status row, and drops `1139`.

The curated parts come from one task-owned generator, which reads the recorded originals at client commit `50501617`. They are test data, so every assertion they enable stays a statement about the page, not about the companies.
