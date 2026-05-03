# PNRR Beneficiary Classification Filters

**Status**: Draft
**Date**: 2026-05-03
**Author**: Codex

## Problem

The `/pnrr` beneficiary filters did not describe an exhaustive classification.
The top-level values shown to users could produce totals where public
institutions plus private beneficiaries did not equal the all-project total.
The main sources of confusion were:

- `national` was exposed as a third top-level entity bucket, even though it is
  better understood as a location or detailed beneficiary concept.
- `private` was interpreted as commercial companies in some places and as
  non-public beneficiaries in others.
- Associations, foundations, religious organizations, and unknown non-public
  beneficiaries were not clearly represented.
- Public companies with legal markers such as `SA` or `SRL` could be classified
  as private if they were not recognized by other public-sector rules.
- Legacy `entityTypes=["national"]` URLs created ambiguity after `national` was
  moved out of the top-level sector model.

## Context

PNRR project records are transformed client-side in
`src/features/pnrr/lib/data-transform.ts` from raw fields such as beneficiary
name, CUI, county, locality, funding source, value, and progress.

The app already had a compact PNRR beneficiary entity directory at
`src/assets/data/pnrr-beneficiary-entity-directory.csv`, keyed by CUI, with
public institution type hints used for UAT, ministries, county councils,
education, health, military, culture, social services, and central agencies.

For public companies, the official 2023 data.gov.ro public companies CSV was
downloaded from:

`https://data.gov.ro/dataset/5c4554c0-3ceb-4fa5-9c6c-a8ce78a170cb/resource/f2a75408-03f5-439d-aa1a-2c86f4386bb2/download/data_2023.csv`

That source has 5,714 rows and 1,259 unique CUIs. To avoid shipping the full
financial dataset in the client bundle, the implementation stores a compact
lookup file with only `cui,name` at
`src/assets/data/public-companies-2023.csv`.

The current PNRR dataset used for verification is:

`public/data/pnrr-projects.json`

## Decision

The top-level PNRR sector classification is now only:

- `public`
- `private`

This sector split is exhaustive. Under the same active filters:

`public total + private total = all total`

`private` means private / non-public, not just commercial companies. It includes
companies, NGOs, foundations, religious organizations, and unknown non-public
beneficiaries.

Detailed beneficiary type remains separate from top-level sector. The detailed
filter includes:

- `public`
- `private`
- `other-private`
- `national`
- `uat`
- `county-council`
- `ministry`
- `central-agency`
- `public-company`
- `education`
- `health`
- `military`
- `company`
- `ngo`
- `religious`
- `culture`
- `social`
- `other-public`

`national` is no longer a top-level entity sector. It is a detailed
beneficiary/location concept for records without a local UAT assignment.

`other-private` was introduced so `beneficiaryTypes=["private"]` can remain the
broad private/non-public sector URL, while residual non-public beneficiaries
also have a precise detailed filter.

`public-company` was introduced as a public-sector detailed beneficiary type.
Public companies are recognized by normalized CUI against the compact official
public companies lookup before private legal markers such as `SA`, `SRL`, or
`PFA` are applied.

Legacy `entityTypes=["national"]` compatibility is intentionally not preserved.
The canonical search schema keeps only `public` and `private` for
`entityTypes`; unsupported values are dropped instead of being rewritten to a
different filter. National records are available through
`beneficiaryTypes=["national"]`, where `national` remains a detailed
beneficiary/location filter.

The UI now:

- Shows only `Public institutions` and `Private / non-public` as top-level
  entity filters.
- Removes `National entities` from the top-level entity filter.
- Keeps `National` in the detailed beneficiary filter.
- Adds `Public companies` as a detailed beneficiary filter.
- Clarifies the classification rules in the PNRR info panel.
- Keeps `Include national projects` as a map/geography scope toggle, not a
  sector category.

## Alternatives Considered

- Keep `national` as a third top-level sector.
  Rejected because it made public/private totals non-exhaustive and blurred
  sector with geography.

- Treat public companies only through name keywords such as `COMPANIA NATIONALA`
  or `REGIA AUTONOMA`.
  Rejected because it misses public companies whose names use ordinary company
  legal markers and creates false private classifications.

- Store the full official public companies CSV in the client.
  Rejected because the PNRR classifier only needs CUI membership and display
  name. Keeping the full source would add unused financial columns and more
  bundle weight.

- Use `beneficiaryTypes=["private"]` for both the broad private sector and the
  residual private subgroup.
  Rejected because it makes subgroup links ambiguous and prevents accurate
  drill-down URLs.

- Preserve compatibility for old `entityTypes=["national"]` URLs.
  Rejected because old national entity semantics no longer match the new
  detailed beneficiary classification, and silently rewriting the filter can
  undercount national public companies, ministries, agencies, and military
  records.

## Consequences

**Positive**

- Public/private totals now add up to the all-project total.
- Public companies can be analyzed separately while remaining in the public
  sector.
- Private/non-public filtering now includes all non-public groups, not only
  commercial companies.
- Detailed filters can support clearer public breakdowns such as UAT,
  ministries, county councils, central agencies, public companies, education,
  health, and social services.
- National detailed filtering is explicit via `beneficiaryTypes=["national"]`.

**Negative**

- The public/private split depends partly on heuristic name matching for records
  without a known CUI or directory entry.
- The public company lookup is a snapshot from the official 2023 dataset and
  should be regenerated when the source is updated.
- Some public-company beneficiaries may also fit other categories such as
  central agencies or national records; `public-company` intentionally takes
  precedence for CUIs found in the official public-company list.
- Old shared URLs that use `entityTypes=["national"]` no longer apply a filter
  and should be replaced with `beneficiaryTypes=["national"]` when that
  detailed national filter is intended.
- Lingui catalogs were refreshed for the new labels and explanatory copy.

## Verification Notes

Focused tests were added or updated for:

- National public institutions remaining public.
- UAT, county council, education, health, ministry, central agency, military,
  culture, social, and other public classifications.
- SRL/SA/PFA companies classifying as private companies unless the CUI is in the
  official public-company lookup.
- Associations/foundations and religious beneficiaries classifying as
  private/non-public detailed groups.
- Unknown non-public-looking beneficiaries falling back to `other-private`.
- Public/private aggregate totals adding up to the all-project total.
- `beneficiaryTypes=["national"]` detailed filtering.
- `entityTypes=["national"]` being dropped as an unsupported entity filter.
- `beneficiaryTypes=["public-company"]` filtering official public companies.

Current dataset checks against `public/data/pnrr-projects.json`:

- All projects: 24,885 rows, 20.826B EUR raw value, 20.052B EUR deduplicated.
- Public: 16,977 rows, 18.244B EUR raw value, 17.510B EUR deduplicated.
- Private / non-public: 7,908 rows, 2.582B EUR raw value, 2.542B EUR deduplicated.
- Public companies: 74 rows, 4.709B EUR raw value, 4.304B EUR deduplicated.
- Official public-company lookup: 1,259 unique CUIs.
- PNRR public-company CUI hits: 27 unique CUIs.

Commands run during verification:

- `yarn test src/features/pnrr/lib/data-transform.test.ts src/schemas/pnrr.test.ts`
- `yarn run check`

## References

- `src/schemas/pnrr.ts`
- `src/schemas/pnrr.test.ts`
- `src/features/pnrr/lib/data-transform.ts`
- `src/features/pnrr/lib/data-transform.test.ts`
- `src/features/pnrr/lib/filter-constants.ts`
- `src/features/pnrr/lib/pnrr-uat-assignment.ts`
- `src/features/pnrr/components/filters/PnrrInfoSheet.tsx`
- `src/assets/data/pnrr-beneficiary-entity-directory.csv`
- `src/assets/data/public-companies-2023.csv`
