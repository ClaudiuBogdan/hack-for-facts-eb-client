# DA-009: Direct-purchase rankings name companies through an ungated lookup

**Status:** open, gated · Filed 2026-11-22 (independent review of 967762a5) · **Priority:** P1, and blocks D6 going on. With D6 off, as on
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
