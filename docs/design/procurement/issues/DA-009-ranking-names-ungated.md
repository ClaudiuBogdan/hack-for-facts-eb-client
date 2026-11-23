# DA-009: Direct-purchase rankings name companies through an ungated lookup

**Status:** fixed in the client (22 November 2026), against server b468474b · Filed 2026-11-22 (independent review of 967762a5) · **Priority:** P1, and blocked D6 going on. With D6 off, as on
Chronos dev now, no DA supplier bucket is a company, so nothing is named.

- **What:** the front door (`procurement-home-api.ts`), the institution page (`procurement-buyer-queries.ts`) and
  analytics (`procurement-analytics-api.ts`, `nameKeys`) take a DA supplier bucket served `displayKind: company`
  and look its name up in `organizationLabels`, the identity spine's general lookup.
- **Why it matters:** since server 98cee9ab (22 November 2026) the DA API names a supplier only from
  `party_public_names`, where `supplier_name_public` holds (`supplierNamesByCode`, `da-v3-sql.ts`). A company's code
  can be public while its name is not. `organizationLabels` reads the spine and doesn't apply that flag, so the page
  could show a name the DA API withholds. A no-store render (§24.5) doesn't help, because each fresh read gets the
  name again.
- **Fix:** name DA buckets only from a DA-gated source:
  - the API serves the gated name on DA breakdown buckets (preferred: one read, the API decides); or
  - the client looks names up through a DA surface that applies the gate.

- **Ruling (root, 22 November 2026):** option (3), with (1) as a hard gate.
  - The gap is accepted while D6 is off on every environment: no bucket is then a company, so nothing is named.
  - **Gate:** before D6 goes on anywhere, the API serves the D6-gated name on DA breakdown buckets, and the client
    names DA buckets from it instead of `organizationLabels`. procurement-da-api carries the gate on its D6-enable
    checklist.
- **Not affected:** a purchase's own supplier (release and legacy detail) and DA records name the supplier from the
  DA answer itself.
- **The API's side (procurement-da-api, PROC-B51G, 22 November 2026):** a hard gate for D6, its own change after
  PROC-C4HN. The planned field is `displayName: String` on `ProcurementBreakdownBucket`, on both the v3 DA source
  and the ClickHouse D6 path. It is the public registry name, set only when `displayKind` is `company` and the name
  is public (`supplier_name_public`). It is null for `natural_person`, other or unknown buckets, and every non-DA
  grain. It is looked up per answer and never cached.
  - The client selects the field only once it is in the deployed SDL: GraphQL refuses a document that asks for an
    unknown field.
  - Whether a disclosed code can have its name withheld is procurement-prod's data rule. The API treats the two
    separately, so the client assumes it can happen.

## Fixed (client, 22 November 2026)

Every DA supplier ranking now names a company only from its bucket's `displayName`. No DA supplier code is sent to
`organizationLabels` or the party-names read any more.

- **Where:**
  - the front door's direct sellers (`procurement-home-api.ts`);
  - the institution and public-enterprise pages. Each view is named by its own ranking's buckets: a ranking row and
    the sentence on the largest seller by the row's `displayName` (`daRowName`), the sellers' years by their own
    ranking's (`BuyerProfile.daNames`, `daSupplierName`). One ranking never names another's row, since each is read
    on its own;
  - analytics rankings (`nameKeys`, `analytics-view.ts`). A supplier the address names (a drill-down from a row) is
    never named. No read serves one supplier's gated name: a supplier breakdown over a supplier scope is refused by
    the API, and the legacy records' names are gated by code alone. Its latest record (`readNames`) says only
    whether the API serves it as a company. If it does, the chip and headline read „Firma cu CUI …" and the share
    link keeps the filter; if not, „Furnizor" and the link drops it, as before;
  - the entity and company slices (`mapPartyBucket`, `procurement-api.live.ts`);
  - the `vite dev`-only analytics prototype (`src/development/prototypes/procurement/`). It has no gated names. For
    direct purchases it looks no supplier up, and it drops every supplier position's code from its names on each
    render, names kept from the previous view included. A direct-purchase supplier then shows by its code.
- **A company without a name** (a disclosed code with no public registry name) reads
  „CUI … (denumire indisponibilă în registrul firmelor)". It is never worded as private.
- **procurement-prod's data (prod, 22 November 2026, 14:01Z):**
  - 343 of 145,790 disclosed codes have no `core.organizations` row, so they have no name.
  - `supplier_name_public` is never false for a disclosed code.
  - A registry privacy change or a merge can remove a name between releases.
  - Sole traders are never disclosed.
- **Contract suppliers** keep the spine's names: they are not under D6 (DA-002).
- **On Chronos dev** the field is null (V3 and D6 off), and no bucket is a company.
- A name read that a publish overtakes is refused as a retryable `SERVICE_UNAVAILABLE`, which the pages already
  treat as a failed read.

