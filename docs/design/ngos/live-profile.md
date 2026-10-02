# Live NGO profile

> **Superseded** by `design.md` §14: the profile now carries the MFP financial
> statements (charts and tables by year). What follows describes the first live
> profile, before them.

The CUI route uses current accepted RNONG links from the live API. It shows all
registry observations, source dates and coverage, followed by a dated ANAF fiscal
observation when available. Registry detail links navigate here rather than to a
company page. No core identity reclassification or name matching is implied.

True, false and null display as Yes, No and Not provided. Unavailable fiscal data
is distinct from an absent current profile and from a failed request. Query date
and capture time have separate labels. Fiscal inactivity is not legal dissolution.
The ANAF source-service link opens documentation, not the archived response.

Financials, services, accreditations and funding remain explicitly unreleased.
There are no count cards, zeros, mock fallbacks or inferred legal-activity labels.
The historical mock aggregate was removed on 2026-10-02 with the mock services
and sources pages (`design.md` §16); this route never called it.

Privacy remains structural: source-withheld names stay withheld; private addresses,
raw payloads and fingerprints do not enter the DTO. All text uses Lingui, and
source values retain their original casing. The loader supports server rendering
and provides separate not-found and read-error states.
