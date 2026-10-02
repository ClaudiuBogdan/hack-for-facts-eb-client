# Server request: the registry by registry-number year (2026-10-02)

For the NGO server / data thread, from the client session on branch
`ong-hub-redesign`. **Requested, not shipped.**

## The problem

The NGO hub's county map has a „Noi în 2025" layer: each county's new
entries of the year, per 100,000 residents, counted by the year in the
registry number (`310/A/2025` → 2025), as every annual figure on the hub is.
A county opens the registry on that county — but `ngoRegistryRecords` has no
year filter (its six: `name.contains`, `county.eq`, `category.eq`,
`status.eq`, `registryNumber.eq`, `publicUtility.eq`), so the page opens
**every** entry of the county: Cluj shows 8,476 entries, not its 310 of 2025
(audit, 2026-10-02).

Until the filter exists the link says what it opens: „Toate înregistrările
din județ, din toți anii", in the county's accessible name, the hover tooltip
and the held tooltip's link (client, 2026-10-02).

## The request

**Y1 — a registry-number year filter on `ngoRegistryRecords`.**
`filter: { registryYear: { eq: 2025 } }`, the year the client already reads
from the number (`numberYear` in `src/features/ngos/registry/model.ts`, and
`scripts/count-ngo-registry.mjs`): the four digits that end the trimmed
`registryNumber` after a `/` (`53/B/2026` → 2026), between 1990 and the
export's year. A number with no such year (irregular literals) matches no
year. It combines with the other six filters like them (AND), keeps the
export's order and the cursor paging.

- `in: [2024, 2025]` is not needed; `eq` only.
- No count is asked for: the client counts a selection from its counts cube
  (`scripts/count-ngo-registry.mjs`), which then gains the year axis it
  already holds per row.

## What the client does with it

The registry page gets a `year` address key (the route's own, beside
`county`, `status`…), a filter chip and a phrase in the question („…
înregistrate în 2025"); the „Pe ani" breakdown's rows narrow to their year as
the county rows narrow to theirs; the hub's „Noi în 2025" county link carries
`year=2025` and drops its label.
