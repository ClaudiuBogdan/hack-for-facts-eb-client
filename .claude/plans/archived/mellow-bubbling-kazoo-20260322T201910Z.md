# Plan: New Interactive Elements for Civic Campaign

## Context

The civic-campaign module has 4 interactive form components (BudgetStatusReport, DebateRequestForm, ParticipationReport, ContestationBuilder). We need to add 3 new categories of interactive elements and improve the existing send-model UX:

1. **BudgetPublicationDate**: Entity-scoped date picker for when the local budget was published. Feeds into the timeline calendar, replacing hardcoded dates (admin overrides take priority).
2. **Three separate info-collection components**: PrimarieWebsiteLink, BudgetDocumentLink, PrimarieContactInfo. Each stored independently, embeddable in different MDX steps.
3. **DebateRequestForm & ContestationBuilder redesign**: Better UX with step-by-step flow, clearer visual hierarchy, and better feedback states.

## Interactive Element Designs

### Element 1: `BudgetPublicationDate`

**Purpose**: User reports the date when their primarie published the 2026 budget project. This date feeds into the timeline computation to replace estimated worst-case dates.

**Interaction ID**: `campaign:budget-publication-date`
**Scope**: `entity:{cui}`
**Completion action**: `complete` (automatic)

**Data shape**:
```typescript
type BudgetPublicationDateValue = {
  readonly publicationDate: string | null   // ISO date YYYY-MM-DD
  readonly source: 'website' | 'press' | 'social_media' | 'other' | null
  readonly sourceUrl: string | null         // optional URL backing the date
  readonly submittedAt: string | null
}
```

**UI**: A compact Card with:
- Date picker input: "Cand a fost publicat proiectul de buget?"
- RadioGroup: "Unde ai gasit informatia?" (website / press / social media / other)
- Optional URL input: "Link catre sursa" (shown when source is selected)
- Submit button
- Submitted state: green card showing the reported date

**Calendar integration**: The existing `useCampaignTimeline(uatOverride?)` hook accepts a `CampaignUatCalendarOverride` object. Currently `getCampaignUatOverrideForCui(cui)` reads from the static JSON. We will modify the calendar page to also check the user's `BudgetPublicationDate` interactive record. Priority: admin JSON override > user-submitted date > worst-case estimate.

**Files to modify for integration**:
- `src/features/campaigns/buget/components/calendar/buget-calendar-page.tsx`: Read user-submitted date from learning progress and merge with admin overrides
- `src/features/challenges/components/hub/BudgetTimelineStrip.tsx`: Same - pass user-submitted date as override

### Element 2: `PrimarieWebsiteLink`

**Purpose**: User submits the URL of their primarie's official website.

**Interaction ID**: `campaign:primarie-website-url`
**Scope**: `entity:{cui}`
**Completion action**: `complete`

**Data shape**:
```typescript
type PrimarieWebsiteLinkValue = {
  readonly websiteUrl: string
  readonly submittedAt: string | null
}
```

**UI**: Minimal Card with:
- URL input: "Link catre site-ul oficial al primariei"
- Submit button
- Submitted state: green card with the saved URL as a clickable link

### Element 3: `BudgetDocumentLink`

**Purpose**: User submits the URL to the official budget document (PDF, webpage).

**Interaction ID**: `campaign:budget-document-url`
**Scope**: `entity:{cui}`
**Completion action**: `complete`

**Data shape**:
```typescript
type BudgetDocumentLinkValue = {
  readonly documentUrl: string
  readonly documentType: 'pdf' | 'webpage' | 'other' | null
  readonly submittedAt: string | null
}
```

**UI**: Compact Card with:
- URL input: "Link catre documentul de buget"
- RadioGroup (inline/horizontal): "Tip document" (PDF / Pagina web / Altul)
- Submit button
- Submitted state: green card with clickable link + document type badge

### Element 4: `PrimarieContactInfo`

**Purpose**: User submits contact information for the primarie (email, phone).

**Interaction ID**: `campaign:primarie-contact-info`
**Scope**: `entity:{cui}`
**Completion action**: `complete`

**Data shape**:
```typescript
type PrimarieContactInfoValue = {
  readonly email: string | null
  readonly phone: string | null
  readonly submittedAt: string | null
}
```

**UI**: Compact Card with:
- Email input: "Email-ul primariei"
- Phone input: "Telefon primarie" (optional)
- Submit button (disabled until at least email is filled)
- Submitted state: green card with saved contact info
- Cross-element benefit: DebateRequestForm and ContestationBuilder can read this to pre-fill primariaEmail

### Element 5: `DebateRequestForm` Redesign

**Current problems**: The form is one big Card with all fields visible at once. The two send paths (NGO vs platform) are at the bottom but their context isn't clear until you scroll.

**Redesigned UX** (step-by-step flow within the Card):
- **Step 1 - Contact info**: Pre-fill from PrimarieContactInfo if available. Show email fields with validation feedback. "Continua" button.
- **Step 2 - Identity**: NGO toggle + org name. Brief explanation of why NGOs have more legal weight. "Continua" button.
- **Step 3 - Choose path**: Two side-by-side cards with clear visual distinction. Each card shows a preview of what will happen. The active/selected card has a border highlight.
- **Submitted state**: Success card with clear status badge and next steps guidance.

Keep the same interaction ID (`campaign:debate-request`) and data shape. The change is purely visual/UX.

### Element 6: `ContestationBuilder` Redesign

**Current problems**: Four textareas in a row with no guidance. The download/email cards at the bottom feel disconnected.

**Redesigned UX** (guided sections):
- **Section 1 - What**: Textarea with a contextual hint above it explaining what to write. Character counter.
- **Section 2 - Why**: Same pattern. Hint references data from the entity analysis page.
- **Section 3 - Impact**: Same pattern. Hint suggests thinking about community effects.
- **Section 4 - Proposal**: Same pattern. Hint reminds to be specific and realistic.
- **Preview**: A formatted preview of the full contestation text before the action cards.
- **Action cards**: Same dual-path (email/download) but with the preview clearly visible above.

Keep the same interaction ID (`campaign:budget-contestation`) and data shape. Purely visual/UX change.

## Files Summary

### New files to create:
1. `src/features/campaigns/buget/components/interactive/BudgetPublicationDate.tsx`
2. `src/features/campaigns/buget/components/interactive/PrimarieWebsiteLink.tsx`
3. `src/features/campaigns/buget/components/interactive/BudgetDocumentLink.tsx`
4. `src/features/campaigns/buget/components/interactive/PrimarieContactInfo.tsx`

### Files to modify:
5. `src/features/campaigns/buget/components/interactive/types.ts` - Add 4 new value types
6. `src/features/campaigns/buget/components/interactive/DebateRequestForm.tsx` - Redesign UX with step flow + PrimarieContactInfo pre-fill
7. `src/features/campaigns/buget/components/interactive/ContestationBuilder.tsx` - Redesign UX with guided sections + preview
8. `src/features/campaigns/buget/adapters/learning/interactive-components-registry.tsx` - Register 4 new components
9. `src/features/challenges/components/player/challenge-mdx-components.tsx` - Register 4 new components for step player
10. `src/features/campaigns/buget/components/calendar/buget-calendar-page.tsx` - Read user-submitted publication date
11. `src/features/challenges/components/hub/BudgetTimelineStrip.tsx` - Read user-submitted publication date
12. MDX step content files - Embed new components in appropriate steps

### Cross-element data flow:
- `PrimarieContactInfo` -> pre-fills `DebateRequestForm.primariaEmail` and `ContestationBuilder.primariaEmail`
- `BudgetPublicationDate` -> feeds into `useCampaignTimeline()` via override merge
- `BudgetStatusReport` already collects `publishedDate` and `documentUrl`. The new `BudgetPublicationDate` replaces the date part, and `BudgetDocumentLink` replaces the URL part. Consider simplifying `BudgetStatusReport` to just the `isPublished`/`budgetStage` radio questions.

## Implementation Workflow

Each interactive element is implemented by a **dedicated subagent**, then reviewed by a **code-reviewer subagent**, then a final review by the main agent with fixes until clean.

### Round 1: New Components (4 subagents in parallel)
- **Subagent A**: Implement `BudgetPublicationDate` + types + registration
- **Subagent B**: Implement `PrimarieWebsiteLink` + types + registration
- **Subagent C**: Implement `BudgetDocumentLink` + types + registration
- **Subagent D**: Implement `PrimarieContactInfo` + types + registration

### Round 2: Redesigns (2 subagents in parallel)
- **Subagent E**: Redesign `DebateRequestForm` with step flow + PrimarieContactInfo pre-fill
- **Subagent F**: Redesign `ContestationBuilder` with guided sections + preview

### Round 3: Calendar Integration (1 subagent)
- **Subagent G**: Integrate `BudgetPublicationDate` into calendar page and timeline strip

### Round 4: Code Review
- **Review subagent**: Review all changes for correctness, type safety, pattern consistency

### Round 5: MDX Content
- Update step MDX files to embed new components in appropriate steps

## Verification
1. `yarn typecheck` - zero errors
2. `yarn i18n:extract && yarn i18n:compile` - new strings extracted
3. `npx vitest run src/features/challenges src/features/campaigns` - all tests pass
4. Manual: verify each new component renders, saves drafts, submits, shows submitted state
5. Manual: verify calendar page shows user-submitted publication date when no admin override exists
