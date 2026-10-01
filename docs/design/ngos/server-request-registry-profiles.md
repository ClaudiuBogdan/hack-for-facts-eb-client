# Server request: NGO profiles without a CUI (2026-10-01)

For the NGO server / data thread. From the client session on branch
`ong-hub-redesign` (client commits up to `53516afe`). Nothing here is
deployed by the client yet; the client work waits on R1 and R2.

## The problem

An NGO's profile (`/ngos/$cui`) needs a CUI. Most NGOs in the registry have
none the client can reach:

| Registry export `955ec3c8…`, captured 2026-09-20, repeats dropped | Entries |
|---|---|
| All entries | 141,226 |
| With `linkedOrganizationCui` on the registry row | 3,879 |
| With a `sourceCui` but no link | 2,469 |
| With no CUI at all | 134,878 |
| Registered (`Inregistrat`) with no CUI at all | 124,082 of 130,258 |

And the link runs one way only: a profile names its registry rows
(`registryRecords`), but a registry row does not name its profile when the
CUI was admitted by another method. Funky Citizens (30339344,
`document_registration_bridge`) and 10008141 (`fiscal_exact_name_county`)
have full profiles, yet their registry rows (`1471/A/2012`, `3667/A/1994`)
carry `linkedOrganizationCui: null`. From the registry page or the search,
the client cannot reach them.

The registry row's `id` (`mj_rnong:…:registry_export:<snapshot>:row:<n>`)
is bound to one export, so links built on it break at the next export.

## The owner's decisions

1. **One organisation, one address.** An NGO with an admitted CUI lives at
   `/ngos/{cui}`. An NGO without one lives at its **registry number**,
   `/ngos/registry/{number}` (`1471/A/2012` written `1471-A-2012`). When a
   later export admits a CUI, the registry-number address answers with a
   301 to `/ngos/{cui}`.
2. **The content comes from the server**: the same profile, read by registry
   number — not a thinner page the client assembles from registry rows.
3. **Search engines index these profiles** from the start.

Registry numbers are stable (given by the court at registration) and almost
unique: 141,206 distinct numbers for 141,226 entries; the 19 shared are, in
the samples seen, repeated rows of one NGO that differ in a field (e.g.
`3117/A/2026` BLANC twice in București). 21 numbers are irregular
(`17121/A/20`).

## Requests

### R1 — The profile by registry number

```graphql
ngoOrganizationProfile(cui: CUI, registryNumber: String): NgoOrganizationProfile
```

Exactly one argument. By `registryNumber`:

- The same `NgoOrganizationProfile` shape, so the client renders one page.
- `cui` is the admitted CUI where the platform has one (any identity
  method), else `null`; `identity` likewise. The client redirects to
  `/ngos/{cui}` whenever it is set.
- `purpose { availability text }` from the registry's „Scop" for that
  registry number — the most valuable section for an NGO without a CUI —
  with the same contract as today (`available` / `not_loaded` /
  `not_released`, text exact, masks kept).
- `registryRecords`, `conflicts`, `snapshot`, `name`/`nameWithheld`,
  `category`, `legalForm`, `county`, `locality`, `sourceRegistryStatus`,
  `sourceRegistrationDate`, `sourceReportsPublicUtility` as for a CUI.
- The CUI-keyed sections (`anafRegistration`, `fiscal`, `financials`, the
  social-service sections) as `not_loaded` with `data: null` — never an
  empty list that reads as „none".
- A number shared by several registry rows: one profile whose
  `registryRecords` lists them all, and `conflicts` names the fields they
  disagree on — as the CUI profile does.
- `null` for a number the current export does not hold. The 21 irregular
  numbers must be accepted as written.

### R2 — The profile's CUI on every registry row

`NgoRegistryRecord.organizationCui: String` — the CUI of the profile that
admits this row, whatever the identity method (today only
`registry_cui`-linked rows say it, through `linkedOrganizationCui`). Keep
`linkedOrganizationCui` as is. With it, every registry row, list and search
result links to the full profile where one exists, and to the
registry-number profile otherwise.

### R3 — The search index

For `searchEntities(docTypes: ["ngo"])`, which the `/ngos` hub search now
uses:

1. **Every registry NGO as a document**, the ones without a CUI included,
   keyed so the client can build its address: `cuis` with the admitted CUI
   where there is one, and the registry number in `identifiers` always.
   Today a CUI-less NGO cannot be found, and a typed registry number
   (`3446/A/2026`) finds nothing.
2. **The registry status.** Every `ngo` document is `isActive: true` today,
   struck-off (13245720), dissolved (53198821) and in-liquidation
   (40320900) ones too. `isActive: false` for any status other than
   `Inregistrat`, or the status as a tag, so the row can say „radiat".
3. **Which documents have a profile.** About 1 hit in 5 has none today
   (Crucea Roșie: 7 of the top 8 — the Red Cross and its branches are not
   in the registry). Either index under `ngo` only organisations with a
   profile (by CUI or, after R1, by registry number), or tag them
   (`ngo_profile`), so a row never leads to „Niciun profil disponibil".

### R4 — For the indexed pages

The client will set the title, description and canonical of each
registry-number profile. It needs nothing beyond R1 for that; noted so the
release keeps `purpose`, `name`/`nameWithheld` and the status in the R1
response, which the head reads.

## What the client will do once R1–R2 are on dev

- `/ngos/registry/{number}` (`-` for `/` in the address; the API given the
  registry's own form) renders the profile page from R1; with `cui` set it
  301s to `/ngos/{cui}`. The CUI-keyed bands are not drawn, and „not
  loaded" is said once, as today. The purpose band leads.
- The current `/ngos/registry/$recordId` pages answer with a 301 to the
  registry-number address of their row, so existing links keep working.
- Registry list rows, the hub's leaders and the search link to
  `/ngos/{organizationCui}` or `/ngos/registry/{number}`.
- Withheld names stay withheld; the status leads the head when it is not
  „Înregistrat".
- Indexed (the owner's choice): canonical per language as the CUI profile.

## Checks the release can run

- `ngoOrganizationProfile(registryNumber: "1471/A/2012")` → `cui:
  "30339344"`, its purpose; `(registryNumber: "4712/A/2002")` → `cui:
  "3151288"`.
- A registered NGO with no CUI → `cui: null`, `purpose` available where the
  registry has a „Scop", CUI sections `not_loaded`.
- `3117/A/2026` → one profile, two `registryRecords`.
- `17121/A/20` (irregular) → its profile; an unknown number → `null`.
- The registry row of 1471/A/2012 → `organizationCui: "30339344"`.
- `searchEntities(q: "3446/A/2026", docTypes: ["ngo"])` → that NGO;
  a struck-off NGO → `isActive: false`.

## Open questions for the server

1. Where do the registry's masks (`<PERSON>`, `<LOCATION>`…) in the purpose
   come from — the Ministry's export, or the platform's own redaction? The
   profile's explanation says „în textul din registru" either way, but
   should name the redaction if it is ours.
2. Are the 19 shared registry numbers one NGO each (as the samples suggest),
   or can two NGOs share a number?
