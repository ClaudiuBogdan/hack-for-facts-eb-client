# Shared Trust Identity Provenance Module Review

Source report: `/tmp/codex-orchestrator/transparenta-ui-module-reviews/reports/shared-trust-identity-provenance.json`

## Summary

Trust, identity, and provenance UI is implemented as at least five parallel component families (`data-trust`, `identity`, `provenance/source-provenance`, `shared/procurement-data`, plus domain modules in justice, legal, statistics, public-investments). Identical export names (`IdentityConfidenceBadge`, `EvidenceLink`, `SourceProvenanceDrawer`, `DataStatusBadge`, `FreshnessBadge`, `CoverageRibbon`, `PrivacyBoundaryNotice`, `ShareFilteredView`) hide incompatible APIs and semantics. Drawer focus is generally Radix-managed, but copy/share feedback, status vocabulary, and accessibility patterns diverge enough that import mistakes and partial fixes are likely to ship user-visible regressions.

## Findings

| Severity | Location | Issue | Recommendation |
| --- | --- | --- | --- |
| critical | src/components/data-trust/evidence-link.tsx:23 | `EvidenceLink` name collision with opposite behavior (drawer trigger vs external anchor) | Rename to distinct symbols (e.g. `ProvenanceEvidenceChip` and `ExternalEvidenceLink`) and add a thin shared barrel only if a polymorphic wrapper is truly needed. |
| critical | src/components/data-trust/identity-confidence-badge.tsx:8 | Four incompatible `IdentityConfidenceBadge` components share one name | Keep NGO tier logic in `src/components/identity` as canonical; rename domain wrappers (`ElectionIdentityBadge`, `JusticeIdentityBadge`) or compose the shared badge with domain mappers. |
| high | src/components/data-trust/source-provenance-drawer.tsx:120 | Six+ `SourceProvenanceDrawer` implementations with incompatible control models | Extract shared drawer chrome (header, section layout, copy affordance, external-link pattern) and keep domain adapters as thin prop mappers; use one controlled-drawer pattern per surface. |
| high | src/components/provenance/source-provenance.tsx:70 | Monolithic provenance module re-implements the data-trust kit instead of composing it | Split NGO-only pieces (`EvidenceTrail`, `SourceCitationChip`, snapshot drawer body) out of the trust-primitive duplicates; import or extend shared trust primitives. |
| high | src/components/data-trust/data-status-badge.tsx:43 | Same `DataStatus` enum values, divergent user-facing semantics for `blocked` and styling | Centralize status→label/icon/variant mapping in one module keyed by a shared schema type; allow domain tooltip overrides only. |
| high | src/features/elections/components/election-shared.tsx:403 | Election identity messaging bypasses the canonical NGO confidence tier model | Map election candidacy provenance into `IdentityConfidenceInput` or a dedicated election mapper so badge copy/tooltips stay consistent with identity docs. |
| high | src/schemas/elections.ts:16 | Duplicate `DataStatus` schemas encourage silent divergence | Hoist `DataStatus` to a shared schema (e.g. `src/schemas/data-trust.ts`) and import it in domain schemas. |
| medium | src/components/data-trust/freshness-badge.tsx:27 | Multiple `FreshnessBadge` APIs and null-date vocabulary diverge | Define one freshness primitive with explicit `unknownLabel` and optional stale/cadence slots; wrap visually per domain. |
| medium | src/components/data-trust/coverage-ribbon.tsx:15 | `CoverageRibbon` is not one component but three unrelated summaries | Rename to domain-specific components (`ElectionCoverageRibbon`, `ProcurementCoverageRibbon`) or introduce a shared `TrustSummaryStrip` with typed slots. |
| medium | src/components/shared/procurement-data/source-provenance-drawer.tsx:32 | `trigger={null}` does not suppress the default trigger | Use explicit API (`hideTrigger`, separate `SourceProvenancePanel`, or controlled `open` without `SheetTrigger`) instead of nullable trigger. |
| medium | src/components/data-trust/source-provenance-drawer.tsx:22 | Silent clipboard copy with no user feedback and inconsistent pattern vs other modules | Reuse `CopyButton` or the procurement `ShareFilteredView` toast pattern; always surface success/failure. |
| medium | src/components/data-trust/source-provenance-drawer.tsx:81 | Copy control aria-label is hardcoded and not i18n-safe | Replace with `t\`Copiază hash-ul rândului\`` or reuse an accessible `CopyButton` with translated label. |
| medium | src/components/ui/copy-button.tsx:29 | Shared copy control lacks accessible name | Add required `ariaLabel` prop defaulting to translated "Copiază" / "Copiat" state. |
| medium | src/components/shared/procurement-data/share-filtered-view.tsx:19 | Share/copy UX diverges between toast-only and live-region implementations | Unify on one accessible pattern: toast plus aria-live, or a shared hook returning `{copy, status}`. |
| medium | src/components/ui/sheet.tsx:69 | Drawer close control uses hardcoded English accessible name | Localize close label via Lingui or accept `closeLabel` prop on `SheetContent`. |
| medium | src/components/data-trust/evidence-link.tsx:31 | Provenance trigger accessibility relies entirely on child text | Provide computed `aria-label` including metric/entity context from `ProvenanceContext`, not only child label. |
| medium | src/components/data-trust/coverage-ribbon.tsx:74 | Known-gap details exposed only via `title`, not accessible text | Use tooltip/disclosure with keyboard access or inline text for gap summaries. |
| medium | src/components/data-trust/privacy-boundary-notice.tsx:10 | Privacy boundary notices use conflicting visual semantics for the same concept | Create one `PrivacyBoundaryNotice` with `tone` + `variant` props and domain copy injectors. |
| low | src/components/data-trust/related-links-rail.tsx:21 | Default aside label is hardcoded Romanian without Lingui | Use `t\`Legături conexe\`` for default aria-label and visible heading. |
| low | src/components/shared/procurement-data/data-status-badge.tsx:59 | Tooltip wrapper adds focusable span around non-interactive badge | Use `TooltipTrigger asChild` on the `Badge` itself or a `button`/`Button` variant with proper role. |
| low | src/components/provenance/source-provenance.tsx:287 | External links omit explicit `noopener` while other trust links include it | Standardize external link helper with `target="_blank" rel="noopener noreferrer"` and optional sr-only new-tab text. |
| low | src/features/statistics/components:1 | Statistics feature duplicates entire procurement-style trust component set | Migrate statistics to shared trust primitives or a `statistics-trust` adapter layer to reduce fifth duplication lane. |

## Detailed Evidence

### critical: `EvidenceLink` name collision with opposite behavior (drawer trigger vs external anchor)

- Location: `src/components/data-trust/evidence-link.tsx:23`
- Evidence: data-trust `EvidenceLink` is a `<button>` that calls `openProvenance()`; procurement `EvidenceLink` is an `<a href>` opener. Both are exported as `EvidenceLink` from feature-facing barrels.
- Recommendation: Rename to distinct symbols (e.g. `ProvenanceEvidenceChip` and `ExternalEvidenceLink`) and add a thin shared barrel only if a polymorphic wrapper is truly needed.
- Duplicate of: `src/components/shared/procurement-data/evidence-link.tsx`
- Residual risk: Even after rename, stale imports in feature code or docs can still wire the wrong affordance next to numeric KPIs.

### critical: Four incompatible `IdentityConfidenceBadge` components share one name

- Location: `src/components/data-trust/identity-confidence-badge.tsx:8`
- Evidence: data-trust accepts `status: 'source_only' | 'low' | 'medium' | 'high'`; identity uses `IdentityConfidenceInput` + `resolveConfidenceTier`; justice uses `JusticeConfidence`; elections import the simplified data-trust variant in `election-shared.tsx:403`.
- Recommendation: Keep NGO tier logic in `src/components/identity` as canonical; rename domain wrappers (`ElectionIdentityBadge`, `JusticeIdentityBadge`) or compose the shared badge with domain mappers.
- Duplicate of: `src/components/identity/identity-confidence-badge.tsx`
- Residual risk: Election and NGO surfaces will continue to communicate different confidence models unless tier mapping is explicitly documented and tested.

### high: Six+ `SourceProvenanceDrawer` implementations with incompatible control models

- Location: `src/components/data-trust/source-provenance-drawer.tsx:120`
- Evidence: data-trust drawer is context-controlled (`useProvenance`, no trigger); procurement drawer is self-contained with `SheetTrigger`; NGO drawer in `provenance/source-provenance.tsx:243` takes `snapshot` + `open/onOpenChange`; statistics and public-investments add domain-specific async/INS variants.
- Recommendation: Extract shared drawer chrome (header, section layout, copy affordance, external-link pattern) and keep domain adapters as thin prop mappers; use one controlled-drawer pattern per surface.
- Duplicate of: `src/components/shared/procurement-data/source-provenance-drawer.tsx`
- Residual risk: Focus return and escape behavior will stay inconsistent across controlled vs trigger-based drawers until patterns converge.

### high: Monolithic provenance module re-implements the data-trust kit instead of composing it

- Location: `src/components/provenance/source-provenance.tsx:70`
- Evidence: Same file defines `DataStatusBadge`, `FreshnessBadge`, `PrivacyBoundaryNotice`, and `SourceProvenanceDrawer` with different props/copy than `src/components/data-trust/*` (e.g. extra `name_only` status, `blocked` mapped to `destructive`).
- Recommendation: Split NGO-only pieces (`EvidenceTrail`, `SourceCitationChip`, snapshot drawer body) out of the trust-primitive duplicates; import or extend shared trust primitives.
- Duplicate of: `src/components/data-trust/index.ts`
- Residual risk: NGO trust copy and colors can drift from elections/procurement without any type error.

### high: Same `DataStatus` enum values, divergent user-facing semantics for `blocked` and styling

- Location: `src/components/data-trust/data-status-badge.tsx:43`
- Evidence: Elections/data-trust: `blocked` → `<Trans>Sursă blocată</Trans>` with `warning` variant. Procurement: `blocked` → `Indisponibil în v1` with rose styling. Legal: `blocked` → `Blocat` with red styling. Provenance NGO: `blocked` → `destructive` badge.
- Recommendation: Centralize status→label/icon/variant mapping in one module keyed by a shared schema type; allow domain tooltip overrides only.
- Duplicate of: `src/components/shared/procurement-data/data-status-badge.tsx`
- Residual risk: Users may infer different legal meaning for the same backend status depending on route.

### high: Election identity messaging bypasses the canonical NGO confidence tier model

- Location: `src/features/elections/components/election-shared.tsx:403`
- Evidence: List header hardcodes `<IdentityConfidenceBadge status="source_only" />` plus separate explanatory text, while NGO/evidence tables use tiered `identity/IdentityConfidenceBadge` driven by `resolveConfidenceTier`.
- Recommendation: Map election candidacy provenance into `IdentityConfidenceInput` or a dedicated election mapper so badge copy/tooltips stay consistent with identity docs.
- Duplicate of: `src/components/identity/resolve-confidence-tier.ts`
- Residual risk: Journalists comparing election and NGO identity badges may read incompatible confidence semantics on the same platform.

### high: Duplicate `DataStatus` schemas encourage silent divergence

- Location: `src/schemas/elections.ts:16`
- Evidence: `elections.ts` and `procurement.ts` both define identical `dataStatusSchema` enums but as separate exported types consumed by different badge components.
- Recommendation: Hoist `DataStatus` to a shared schema (e.g. `src/schemas/data-trust.ts`) and import it in domain schemas.
- Duplicate of: `src/schemas/procurement.ts`
- Residual risk: Future status values may be added to one domain schema only, breaking cross-feature dashboards.

### medium: Multiple `FreshnessBadge` APIs and null-date vocabulary diverge

- Location: `src/components/data-trust/freshness-badge.tsx:27`
- Evidence: data-trust: `asOf` + `kind`, null → `Actualizat: necunoscut`, plain `<span>`. procurement: `kind/date/cadence/stale`, null → `indisponibil`, wrapped in `Badge` with `aria-label`. provenance NGO and justice add further variants.
- Recommendation: Define one freshness primitive with explicit `unknownLabel` and optional stale/cadence slots; wrap visually per domain.
- Duplicate of: `src/components/shared/procurement-data/freshness-badge.tsx`
- Residual risk: Coverage ribbons on adjacent pages will still look related but mean different things for missing dates.

### medium: `CoverageRibbon` is not one component but three unrelated summaries

- Location: `src/components/data-trust/coverage-ribbon.tsx:15`
- Evidence: data-trust consumes `CoverageMeta` (authorities, year range, inaccessible count). procurement consumes metric thresholds + collapsible progress bars. justice/legal ribbons are note/status panels with unrelated props.
- Recommendation: Rename to domain-specific components (`ElectionCoverageRibbon`, `ProcurementCoverageRibbon`) or introduce a shared `TrustSummaryStrip` with typed slots.
- Duplicate of: `src/components/shared/procurement-data/coverage-ribbon.tsx`
- Residual risk: Engineers may pass the wrong coverage object shape and only discover at runtime.

### medium: `trigger={null}` does not suppress the default trigger

- Location: `src/components/shared/procurement-data/source-provenance-drawer.tsx:32`
- Evidence: Implementation uses `trigger ?? defaultButton`; `null` is nullish, so `procurement-record-detail.tsx:140` still renders the default Proveniență button. Test passes because it expects that default button.
- Recommendation: Use explicit API (`hideTrigger`, separate `SourceProvenancePanel`, or controlled `open` without `SheetTrigger`) instead of nullable trigger.
- Residual risk: Future callers assuming `null` hides the trigger will accidentally duplicate drawer entry points.

### medium: Silent clipboard copy with no user feedback and inconsistent pattern vs other modules

- Location: `src/components/data-trust/source-provenance-drawer.tsx:22`
- Evidence: `copyText()` calls `navigator.clipboard?.writeText` with no toast, no error handling, and no success state; NGO provenance uses `CopyButton`, procurement/statistics share flows use toast or aria-live.
- Recommendation: Reuse `CopyButton` or the procurement `ShareFilteredView` toast pattern; always surface success/failure.
- Duplicate of: `src/components/ui/copy-button.tsx`
- Residual risk: Users may believe hash copy succeeded when permission was denied or clipboard API is unavailable.

### medium: Copy control aria-label is hardcoded and not i18n-safe

- Location: `src/components/data-trust/source-provenance-drawer.tsx:81`
- Evidence: `aria-label="Copiaza hash-ul randului"` is a raw string (also missing diacritics) while surrounding UI uses Lingui `<Trans>` macros.
- Recommendation: Replace with `t\`Copiază hash-ul rândului\`` or reuse an accessible `CopyButton` with translated label.
- Residual risk: Screen reader language will not track locale switches on elections provenance flows.

### medium: Shared copy control lacks accessible name

- Location: `src/components/ui/copy-button.tsx:29`
- Evidence: `CopyButton` renders an icon-only `Button` with no `aria-label` or visible text; used for SHA-256 copy in NGO provenance drawer.
- Recommendation: Add required `ariaLabel` prop defaulting to translated "Copiază" / "Copiat" state.
- Residual risk: Icon-only copy buttons remain indistinguishable to assistive tech across provenance drawers.

### medium: Share/copy UX diverges between toast-only and live-region implementations

- Location: `src/components/shared/procurement-data/share-filtered-view.tsx:19`
- Evidence: procurement `ShareFilteredView` uses Sonner toast on success/error; statistics feature copy uses local state plus `role="status" aria-live="polite"` (`statistics/components/share-filtered-view.tsx:49`) and no toast.
- Recommendation: Unify on one accessible pattern: toast plus aria-live, or a shared hook returning `{copy, status}`.
- Duplicate of: `src/features/statistics/components/share-filtered-view.tsx`
- Residual risk: Screen reader users on procurement pages may miss copy confirmation that statistics users receive.

### medium: Drawer close control uses hardcoded English accessible name

- Location: `src/components/ui/sheet.tsx:69`
- Evidence: All provenance drawers inherit `<span className="sr-only">Close</span>` from shared `SheetContent`, affecting elections, procurement, NGO, statistics, and public-investments sheets.
- Recommendation: Localize close label via Lingui or accept `closeLabel` prop on `SheetContent`.
- Residual risk: Romanian UI routes will announce an English close action to assistive tech regardless of drawer content quality.

### medium: Provenance trigger accessibility relies entirely on child text

- Location: `src/components/data-trust/evidence-link.tsx:31`
- Evidence: Button sets `aria-haspopup="dialog"` but no `aria-label`; accessible name comes from children (often lowercase `sursa`). Tests query `{ name: 'sursa' }`.
- Recommendation: Provide computed `aria-label` including metric/entity context from `ProvenanceContext`, not only child label.
- Residual risk: Numeric tables with many identical "sursă" chips remain indistinguishable in screen reader rotor lists.

### medium: Known-gap details exposed only via `title`, not accessible text

- Location: `src/components/data-trust/coverage-ribbon.tsx:74`
- Evidence: Gap chip renders count with `title={coverage.knownGaps.join(' · ')}` but no expandable description or aria-describedby.
- Recommendation: Use tooltip/disclosure with keyboard access or inline text for gap summaries.
- Residual risk: Keyboard and screen reader users see gap counts without the explanatory gap list.

### medium: Privacy boundary notices use conflicting visual semantics for the same concept

- Location: `src/components/data-trust/privacy-boundary-notice.tsx:10`
- Evidence: data-trust notice is neutral muted box about election candidate labels; provenance NGO notice is amber `Alert`; justice notices are emerald privacy-positive boxes with variant-specific legal copy.
- Recommendation: Create one `PrivacyBoundaryNotice` with `tone` + `variant` props and domain copy injectors.
- Duplicate of: `src/features/justice/components/data-trust.tsx`
- Residual risk: Users may interpret amber vs emerald boundaries as different legal guarantees.

### low: Default aside label is hardcoded Romanian without Lingui

- Location: `src/components/data-trust/related-links-rail.tsx:21`
- Evidence: `aria-label={title ?? 'Legaturi conexe'}` bypasses `<Trans>`/ `t` macros used elsewhere in trust components.
- Recommendation: Use `t\`Legături conexe\`` for default aria-label and visible heading.
- Duplicate of: `src/features/statistics/components/related-links-rail.tsx`
- Residual risk: Minor i18n inconsistency if English locale is enabled on elections pages.

### low: Tooltip wrapper adds focusable span around non-interactive badge

- Location: `src/components/shared/procurement-data/data-status-badge.tsx:59`
- Evidence: When `tooltip` is set, badge is wrapped in `<span tabIndex={0}>` solely to satisfy TooltipTrigger, creating an extra tab stop without button semantics.
- Recommendation: Use `TooltipTrigger asChild` on the `Badge` itself or a `button`/`Button` variant with proper role.
- Residual risk: Keyboard users encounter unexplained extra stops on procurement KPI headers.

### low: External links omit explicit `noopener` while other trust links include it

- Location: `src/components/provenance/source-provenance.tsx:287`
- Evidence: NGO snapshot URL uses `rel="noreferrer"`; procurement/data-trust evidence links use `rel="noopener noreferrer"`.
- Recommendation: Standardize external link helper with `target="_blank" rel="noopener noreferrer"` and optional sr-only new-tab text.
- Duplicate of: `src/components/shared/procurement-data/evidence-link.tsx`
- Residual risk: Low immediate exploit risk, but inconsistent security posture across provenance surfaces.

### low: Statistics feature duplicates entire procurement-style trust component set

- Location: `src/features/statistics/components:1`
- Evidence: Feature-local `data-status-badge.tsx`, `freshness-badge.tsx`, `coverage-ribbon.tsx`, `related-links-rail.tsx`, `share-filtered-view.tsx`, `request-dataset-action.tsx`, and `source-provenance-drawer.tsx` parallel shared modules with different APIs and behavior.
- Recommendation: Migrate statistics to shared trust primitives or a `statistics-trust` adapter layer to reduce fifth duplication lane.
- Duplicate of: `src/components/shared/procurement-data/index.ts`
- Residual risk: Statistics trust UX will keep diverging unless explicitly included in consolidation work.

