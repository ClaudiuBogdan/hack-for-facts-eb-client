# Landing Page E2E Tests

**Route:** `/`
**Test File:** `tests/integration/landing-page.spec.ts` (mocked API) · consent flows in `tests/integration/cookie-consent.spec.ts`
**Fixtures:** `tests/fixtures/landing-page-flow/`

---

## Test Scenarios

### 1. Hero search

- [x] **1.1 Search by entity name**
  - Navigate to `/`
  - Type "Cluj" in the `combobox`
  - Verify result rows appear as links to `/entities/{cui}`
  - **API:** universal search (`searchEntitiesLive`)

- [ ] **1.2 Search with no results**
  - Type "xyznonexistent123"
  - Verify the empty state names the term and suggests the full name or CUI

- [ ] **1.3 Scope chip**
  - Type "firma dedeman"
  - Verify a "Firme" suggestion row appears above the results
  - Accept it; verify "firma" left the text and became a chip; Backspace on an empty field removes it

- [ ] **1.4 Two-stage Escape**
  - With results open, press Escape: the list closes and the text stays
  - Press Escape again: the field and its chips clear

- [ ] **1.5 Search error handling**
  - Mock search with 500; verify the error line appears

### 2. Ways in

- [x] **2.1 Shortcuts** — `navigation` "Scurtături" links to `/procurement`, `/budget-explorer`, `/legislation`
- [x] **2.2 Entity panel** — the first six predefined entities link to their entity pages
- [x] **2.3 Index** — every visible surface is a link inside a labelled `region`; gated surfaces are absent
- [ ] **2.4 Window lights (desktop)** — red closes the panel and focuses the search; amber minimises to an icon that restores it; green links to `/entity-analytics`

### 3. Page load

- [x] **3.1 Landing page loads** — `h1` "Date publice, decizii informate", search reachable
- [x] **3.2 Footer** — one `navigation` "Navigare footer" with privacy, terms, cookie policy, cookie settings (with `redirect`), GitHub and status links
- [ ] **3.3 Provenance** — the institution count appears only after the API answers; the other coverage figures render immediately
- [ ] **3.4 Reduced motion** — with `prefers-reduced-motion: reduce`, no `data-reveal="pending"` is ever set

### 4. Consent

- [x] **4.1 Card asks once** — with no stored decision, the non-modal `dialog` appears after hydration
- [x] **4.2 Decisions persist** — "Acceptă tot" stores analytics+sentry true; "Doar esențiale" stores both false; `×` stores nothing
- [x] **4.3 Settings page** — drafts persist only on "Salvează alegerea"; `?redirect=` is followed after a decision

---

## Fixtures Needed

| Fixture | Operation | Description |
|---------|-----------|-------------|
| `entity-search.json` | universal search | Search results with entities |
| `entity-search-empty.json` | universal search | Empty search results |
| `error-500.json` | - | Server error response |

---

## Notes

- The search is a Base UI Autocomplete: the options are anchors with `role="option"`, so Cmd-click opens a tab.
- The consent card is a `dialog` with `aria-modal="false"`; it never renders on the server or on `/cookies`.
- The window lights and the tilted panel exist only from the `lg` breakpoint.
