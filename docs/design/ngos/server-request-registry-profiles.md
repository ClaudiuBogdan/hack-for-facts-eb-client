# Server request: NGO profiles without a CUI (2026-10-01)

For the NGO server / data thread, from the client session on branch
`ong-hub-redesign`. R1–R4 **shipped** to Chronos dev on 2026-10-01 (API image
`cad05e5d…`, pin `df71ace3…`) and were checked from the client against the
public GraphQL endpoint. R5 **shipped** the same day (server commit
`8c71bd0e…`, pin `b169ee2a…`) and is checked the same way.

## The problem

An NGO's profile (`/ngos/$cui`) needs a CUI. In the registry export
`955ec3c8…` (captured 2026-09-20) there are 141,206 registry groups; 71,853
have an admitted CUI — 3,879 written in the registry, 67,858 from a reviewed
name/county match, 115 corroborated, 1 through a registration document —
and 69,353 have none. A registry row did not name the profile an inferred
CUI gives it (Funky Citizens, `1471/A/2012`, carried
`linkedOrganizationCui: null`), and its `id` is bound to one export.

## The owner's decisions

1. **One organisation, one address.** `/ngos/{cui}` where a CUI is
   admitted, else `/ngos/registry/{number}` (`/` written `-`), which 301s to
   the CUI address once one is admitted. The old row-id pages
   (`/ngos/registry/$recordId`) were never deployed and get no redirects.
2. **The content comes from the server**: the same profile, read by registry
   number.
3. **Every profile is indexed**, withheld-name ones included.
4. **„Cu CUI" counts every admitted CUI**, whatever the method.
5. **Non-registry „NGOs" are plain organisations in the site-wide search**
   (R5).

## What shipped

**R1 — the profile by registry number.**
`ngoRegistryProfile(registryNumber: String!)` → `null` for a literal the
current export does not hold, else `{ status, profiles }`: `resolved` with one
profile, or `ambiguous` with every candidate (the client never picks the
first). Each profile has the CUI profile's fields with nullable `cui` /
`identity`, plus `nameWithheld`, `purpose`, `snapshot`, every observation and
`conflicts`. Without an admitted CUI the ANAF, fiscal, financial and
social-service sections are `not_loaded`, with empty years and statements;
with one, the full enrichment. A valid number shared by several rows is one
group (`3117/A/2026`: rows 392 and 393, `conflicts: ["court"]`). Irregular
literals are accepted as written (`1/A/122`). The current snapshot has no
ambiguous literal and no number containing `-`; keep the URL encoding
reversible for future ones. MCP: `get_ngo_registry_profile`.

**R2 — the profile's CUI on every registry row.**
`NgoRegistryRecord.organizationCui` and `organizationIdentityMethod`, for any
admitted method (`1471/A/2012` → `30339344`, `document_registration_bridge`;
`3667/A/1994` → `10008141`, `fiscal_exact_name_county`). `sourceCui` and
`linkedOrganizationCui` keep their meanings.

**R3 — the registry in the search index.**
`searchEntities(entityTags: ["source::rnong"])` is the registry population:
one document per registry group. A group with an admitted CUI is that CUI's
document, enriched; a group without one gets its own (`docKey:
"registry:{number}"`, `cuis: []`, `isActive: null`). Every such hit carries
`ngoRegistryNumber`, `ngoRegistryStatus`, `ngoIdentityMethod`,
`ngoSourceSnapshotId`. The client routes by `cuis[0]`, else
`ngoRegistryNumber`, and shows the status when it is not `Inregistrat`. A
group whose observations disagree on the name has no search document; its
profile remains.

**R4 — the head.** R1 returns `name`/`nameWithheld`, `purpose` and the status
the head reads.

The masks in the purpose (`<PERSON>`, `<LOCATION>`…) are in the Ministry's
text, not the platform's redaction.

## R5 — Non-registry organisations are not labelled NGOs (shipped)

The site-wide search makes any `core.organizations.kind = 'ngo'` CUI an `ngo`
document with role `ngo` (scrapper `src/search/palette-contract.ts`,
`PALETTE_CUI_DOCS_SQL`). That kind was set by the legacy sector loader
(`src/sources/ngos/load-prod.ts`, `upsertCoreOrganizations`) for every new
CUI in RUEIS, the social-service providers and licences and the
accreditations — 4,103 CUIs, Penitenciarul Aiud among them
(`NGO_SOURCE_MAPPING_INVESTIGATION_2026-09-19.md`). Many have no profile: the
Red Cross Cluj branch (`10860991`, created by its own law, not in the
registry) is an `ngo` hit whose profile is `null`.

**Request:** in the palette, give the `ngo` doc type and role only to
documents in the registry population (`source::rnong`). A `kind = 'ngo'` CUI
outside it is indexed under a neutral doc type of its own (e.g.
`organization_unclassified`), until a checked nonprofit classification
replaces `kind`. No document is removed. Not `company`: `/companies/10860991`
and `/companies/4331341` are 404s, so a company hit would open nothing.
Not `organization` either: that type routes to the public-entity page.

The client shows such a hit as an organisation without a profile page (no
link, the CUI and county), not as an NGO.

With it, one small fix: a registry-only search hit still carries `url:
/ong-uri/registru/{row id}`, a path the client has removed (it routes by
`ngoRegistryNumber`, never by `url`). Write `/ngos/registry/{number}` with
`/` as `-` (a literal `-` as `~-`, a `~` as `~~`), or leave `url` null.

**Check:** `searchEntities(q: "cruce rosie", docTypes: ["ngo"])` returns no
hit without `source::rnong`; `10860991` is still found, under the neutral
type.

**What shipped (checked from the client, 2026-10-01).** Only the registry's
documents (`source::rnong`, 140,718: 71,853 admitted CUIs and 68,865
registry-only) carry the `ngo` type and role. 1,188 former `ngo` hits outside
the registry are `organization_unclassified` (type and role), still found by
name, CUI and county: `10860991` is one, with no tag and a null profile. The
1,647 public entities among the old `ngo` population (`4331341`,
Penitenciarul Aiud) stay `organization` and lose the `ngo` role. No document
was removed and no id changed, so some neutral results keep an `ngo_` id
prefix: the client classifies by `docType`, `cuis` and `ngoRegistryNumber`,
never by id. Registry-only hits have `url: null`.

The client names `organization_unclassified` „Organizație" and draws it as a
plain row with its CUI and county and „fără profil pe platformă", with no
link: in the site's search box a disabled option that Enter passes by, on the
search page an inert row. Remaining, not blocking: some neutral hits carry
the county as their source wrote it („JUD. SATU MARE").
