# Entity Details E2E Tests

**Route:** `/entities/$cui`
**Test File:** `tests/integration/entity-details.spec.ts`
**Fixtures:** `tests/fixtures/entity-details-flow/`

---

## Test Scenarios

### 1. Page Bootstrap

- [ ] **1.1 Entity details load correctly**
  - Navigate to `/entities/4305857`
  - Verify entity name heading is visible
  - Verify CUI is displayed
  - Verify financial summary or main-info content appears
  - **GraphQL:** `GetEntityDetails`, `GetEntityLineItems`

- [ ] **1.2 Entity page loading state**
  - Mock delayed entity details and line items
  - Navigate to entity page
  - Verify challenge analysis loading shell appears
  - Verify content appears after loading

### 2. View State

- [ ] **2.1 Default main info view**
  - Navigate to entity page without `view`
  - Verify main-info content is visible
  - Verify canonical URL remains `/entities/$cui`

- [ ] **2.2 Legacy view normalization**
  - Navigate to `/entities/4305857?view=expense-trends`
  - Verify page still renders main-info content
  - Verify no old trend-view-only UI is required

- [ ] **2.3 Supported secondary views**
  - Navigate with `view=contracts`, `view=commitments`, `view=ins`, and `view=profile`
  - Verify each supported view renders or shows its section-level empty/unsupported state

### 3. Report Controls

- [ ] **3.1 Select report period**
  - Navigate to entity page
  - Change year, quarter, or month where available
  - Verify URL state updates
  - Verify data requests carry the selected report period

- [ ] **3.2 Select report type**
  - Navigate to a UAT/main-creditor entity
  - Verify aggregated and detailed report labels are entity-appropriate
  - Navigate to a non-main-creditor entity
  - Verify detailed report type is selected by default when no URL type is present

- [ ] **3.3 Select main creditor**
  - Navigate to an entity with multiple main creditors
  - Change main creditor
  - Verify report, line-item, commitments, and subordinate queries keep the selected CUI

### 4. Entity-Type-Specific Controls

- [ ] **4.1 UAT-only controls are available for UAT entities**
  - Navigate to a UAT entity
  - Verify UAT-only normalization and map/INS entry points are available when supported

- [ ] **4.2 UAT-only controls are hidden for non-UAT entities**
  - Navigate to a non-UAT entity
  - Verify per-capita, administrative-expense, INS, and map controls are absent or disabled

### 5. Map Selection

- [ ] **5.1 Map-selected entity keeps entity route**
  - Navigate to a UAT or county-council entity with map support
  - Select another entity from the map preview
  - Confirm the selection
  - Verify navigation goes to `/entities/$cui`

### 6. Reports And Source Data

- [ ] **6.1 Reports teaser loads**
  - Navigate to entity page
  - Verify reports section is visible when reports exist
  - **GraphQL:** `GetEntityReports`

- [ ] **6.2 Reports show metadata**
  - Verify report date, type, main creditor, and download options are shown where present

### 7. Error Handling

- [ ] **7.1 Handle API error gracefully**
  - Mock `GetEntityDetails` with 500
  - Navigate to entity page
  - Verify error message is displayed
  - Verify page does not crash

- [ ] **7.2 Handle partial data**
  - Mock incomplete entity details, reports, relationships, or line items
  - Verify page handles missing sections independently

### 8. Not Found

- [ ] **8.1 Handle non-existent entity**
  - Navigate to `/entities/9999999999`
  - Verify 404 or not-found message
  - **Fixture:** `entity-not-found.json`

- [ ] **8.2 Handle invalid CUI format**
  - Navigate to `/entities/invalid`
  - Verify appropriate error handling

---

## Fixtures Needed

| Fixture | GraphQL Operation | Description |
|---------|-------------------|-------------|
| `entity-details.json` | `GetEntityDetails` | Full entity data |
| `entity-line-items.json` | `GetEntityLineItems` | Budget line items |
| `challenge-entity-relationships.json` | `GetEntityRelationships` | Parent, sibling, or subordinate relationships |
| `entity-reports.json` | `GetEntityReports` | Entity reports teaser/list data |
| `get-reports.json` | `GetReports` | Report file/download metadata |
| `entity-not-found.json` | `GetEntityDetails` | Empty/null response |
| `error-500.json` | - | Server error |

---

## Notes

- CUI 4305857 = MUNICIPIUL CLUJ-NAPOCA.
- Legacy view params should keep saved links working but should not require deleted old tabs.
- Currency and inflation preferences are global unless an accepted legacy URL override is being migrated.
