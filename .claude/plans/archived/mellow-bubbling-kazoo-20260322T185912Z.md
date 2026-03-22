# Plan: Interactive Elements for Grade 1 Campaign Challenges

## Context

The Transparenta.eu campaign "Provocarea civica Bugete Locale 2026" has 13 campaign challenges defined as JSON + MDX content. The MDX content currently contains only placeholder text with `QuickLinks` and `Sources` components. We need to design and build the **interactive elements** (React components) for the 4 Grade 1 challenges, which are the most time-sensitive due to Romania's legal budget debate calendar.

The rendering pipeline already exists: MDX content is loaded via `useCampaignChallengeContent()`, and interactive components are injected via the `campaignInteractiveComponents` registry. The challenges reuse the same module/step infrastructure as learning content.

## Scope: 4 Grade 1 Challenges

| # | Challenge Slug | Interactive Element | Verification |
|---|---------------|-------------------|-------------|
| 1 | `trimite-cerere-dezbatere-buget` | Debate request form + dual send options | manual -> `pending_review` |
| 2 | `participa-la-dezbaterea-bugetului-local` | Structured participation report | manual -> `pending_review` |
| 3 | `ce-buget-are-primaria-ta-pentru-2026` | Budget status + calendar report | automatic -> `completed` |
| 4 | `formuleaza-o-contestatie-pentru-bugetul-local` | Contestation builder + send/download | manual -> `pending_review` |

---

## Interactive Element Design

### Record Key & Scope Convention

All interactive elements use entity-scoped records stored via `useCustomInteraction`. The record key is built by `buildInteractiveRecordKey()` as `{interactionId}::entity:{cui}`.

| Challenge | `interactionId` | Scope | `completionRule` |
|-----------|-----------------|-------|-----------------|
| Debate Request | `campaign:debate-request` | `entity` | `{ type: 'resolved' }` |
| Participation Report | `campaign:participation-report` | `entity` | `{ type: 'resolved' }` |
| Budget Status | `campaign:budget-2026-status` | `entity` | `{ type: 'resolved' }` |
| Contestation | `campaign:budget-contestation` | `entity` | `{ type: 'resolved' }` |

All records use:
- `kind: 'custom'`
- `value.kind: 'json'`
- `lessonId`: the challenge's `contentDir` slug (e.g. `'trimite-cerere-dezbatere-buget'`)
- `scopePolicy: 'entity'`
- `phase` flow: `idle` -> `draft` (auto-saved on input) -> `resolved` (on submit)

The `campaign:` prefix in interactionId distinguishes these from learning interactions and allows the backend to identify campaign-related records for custom logic (e.g., cron-triggered email dispatch).

---

### Element 1: `DebateRequestForm`

**Purpose**: Collect primaria email + C14 contact email, organization details, and offer two send paths.

**Data shape** (`DebateRequestFormValue`):
```typescript
type DebateRequestFormValue = {
  readonly primariaEmail: string
  readonly c14Email: string
  readonly isNgo: boolean
  readonly organizationName: string | null
  readonly submissionPath: 'send_yourself' | 'request_platform' | null
  readonly submittedAt: string | null // ISO timestamp
}
```

**UI layout** (within MDX content):
```
Card container
  Section: "Contact Information"
    Input: "Email-ul primariei" (required, email validation)
    Input: "Email contact C14" (required, email validation)

  Section: "Organizatie"
    Switch: "Esti parte dintr-un ONG?"
    [if yes] Input: "Numele organizatiei"

  Section: "Trimite cererea" (two side-by-side cards)
    Card A: "Trimite singur (ONG)"
      - Description text
      - mailto: button (TO: primariaEmail, CC: platform email,
        subject + body from template)
      - Disabled with tooltip when isNgo=false
      - On click: submit with submissionPath='send_yourself'

    Card B: "Solicita-ne sa trimitem"
      - Description text
      - Submit button
      - On click: submit with submissionPath='request_platform'

  [if submitted] Success state with status badge
```

**Mailto construction**: Pure utility function `buildDebateRequestMailto()` in `mailto-utils.ts`. Template text is in Romanian (legal document). Parameters: `{ primariaEmail, ccEmail, organizationName, year }`.

**Challenge status**: On either card action -> `markInteractionPendingReview()` via adapter.

---

### Element 2: `ParticipationReport`

**Purpose**: Structured survey about debate participation quality.

**Data shape** (`ParticipationReportValue`):
```typescript
type ParticipationReportValue = {
  readonly debateTookPlace: 'yes' | 'no' | 'dont_know' | null
  readonly approximateAttendees: number | null
  readonly citizensAllowedToSpeak: 'yes' | 'no' | 'partially' | null
  readonly citizenInputsRecorded: 'yes' | 'no' | 'dont_know' | null
  readonly observations: string | null
  readonly submittedAt: string | null
}
```

**UI layout**:
```
Card container
  RadioGroup: "A avut loc dezbaterea?" (yes / no / dont_know)

  [if debateTookPlace === 'yes']
    NumberInput: "Numar aproximativ de participanti"
    RadioGroup: "Au putut cetatenii sa ia cuvantul?" (yes / no / partially)
    RadioGroup: "Au fost inregistrate contributiile?" (yes / no / dont_know)

  Textarea: "Observatii" (optional, max 2000 chars)

  Submit button (disabled until debateTookPlace is answered)
  [if submitted] Success state
```

**Challenge status**: On submit -> `markInteractionPendingReview()`.

---

### Element 3: `BudgetStatusReport`

**Purpose**: Crowdsource budget publication status per entity.

**Data shape** (`BudgetStatusReportValue`):
```typescript
type BudgetStatusReportValue = {
  readonly isPublished: 'yes' | 'no' | 'dont_know' | null
  readonly budgetStage: 'draft' | 'approved' | null
  readonly publishedDate: string | null // ISO date (YYYY-MM-DD)
  readonly documentUrl: string | null
  readonly submittedAt: string | null
}
```

**UI layout**:
```
Card container
  RadioGroup: "A fost publicat bugetul pe 2026?" (yes / no / dont_know)

  [if isPublished === 'yes']
    RadioGroup: "In ce stadiu este?" (draft / approved)
    DateInput: "Data publicarii"
    URLInput: "Link catre documentul oficial"

  Submit button (disabled until isPublished is answered)
  [if submitted] Success state
```

**Challenge status**: On submit -> `markInteractionCompleted()` (automatic verification).

---

### Element 4: `ContestationBuilder`

**Purpose**: Structured contestation form with send/download options.

**Data shape** (`ContestationBuilderValue`):
```typescript
type ContestationBuilderValue = {
  readonly contestedItem: string
  readonly reasoning: string
  readonly impact: string
  readonly proposedChange: string
  readonly submissionPath: 'send_email' | 'download_text' | null
  readonly primariaEmail: string | null // reused from debate request if available
  readonly submittedAt: string | null
}
```

**UI layout**:
```
Card container
  Textarea: "Ce contesti?" (required, budget line/category)
  Textarea: "De ce? Argumente si dovezi" (required)
  Textarea: "Ce impact are?" (required)
  Textarea: "Ce schimbare propui?" (required)

  Section: "Trimite contestatia" (two side-by-side cards)
    Card A: "Trimite pe email"
      - mailto: button (generated from form data + template)
      - TO: primariaEmail (from debate request record or manual input)
      - CC: platform email
      - On click: submit with submissionPath='send_email'

    Card B: "Descarca ca text"
      - Download button (Blob + anchor trick)
      - On click: submit with submissionPath='download_text'

  [if submitted] Success state
```

**Cross-challenge data reuse**: Reads `campaign:debate-request::entity:{cui}` via a read-only `useCustomInteraction` call to pre-fill `primariaEmail`. If not available, shows an email input field.

**Challenge status**: On either action -> `markInteractionPendingReview()`.

---

## Implementation

### Phase 0: Shared infrastructure

**New files:**

1. `src/features/campaigns/buget/components/interactive/types.ts`
   - All 4 data shape types
   - Shared props type: `{ readonly challengeSlug: string }`
   - Entity CUI comes from `useCampaignProgress()` context, not props

2. `src/features/campaigns/buget/components/interactive/use-campaign-challenge-form.ts`
   - Shared hook composing `useCustomInteraction` + `useChallengeInteractionAdapter`
   - Input: `{ challengeSlug, interactionId, entityCui, completionAction: 'complete' | 'pending_review' }`
   - Returns: `{ savedValue, phase, isSubmitted, saveDraft, submit, reset, challengeStatus }`
   - On `saveDraft()`: calls `customInteraction.saveDraft()` + `adapter.markInteractionStarted()`
   - On `submit()`: calls `customInteraction.complete()` + adapter method based on `completionAction`

3. `src/features/campaigns/buget/components/interactive/CampaignChallengeFormShell.tsx`
   - Shared wrapper: Card with consistent styling
   - Handles submitted/completed display state (success message + optional reset)
   - Provides form footer with submit button + disabled logic

4. `src/features/campaigns/buget/components/interactive/mailto-utils.ts`
   - `buildMailtoUrl({ to, cc, subject, body })` - URL-safe mailto construction
   - `buildDebateRequestEmailBody({ organizationName, year })` - Romanian legal template
   - `buildContestationEmailBody({ contestedItem, reasoning, impact, proposedChange })` - Romanian template

**Existing files to modify:**

5. `src/features/campaigns/buget/adapters/learning/interactive-components-registry.tsx`
   - Register 4 new components via `createLazyInteractiveComponent`
   - Add to `campaignInteractiveComponents` export

### Phase 1: BudgetStatusReport (simplest, validates the pattern)

6. `src/features/campaigns/buget/components/interactive/BudgetStatusReport.tsx`
   - Uses `useCampaignChallengeForm` with `completionAction: 'complete'`
   - RadioGroup + conditional fields + Submit
   - Auto-saves draft on field blur

### Phase 2: DebateRequestForm (most complex, email + dual cards)

7. `src/features/campaigns/buget/components/interactive/DebateRequestForm.tsx`
   - Uses `useCampaignChallengeForm` with `completionAction: 'pending_review'`
   - Email inputs + NGO toggle + two side-by-side action cards
   - Mailto link construction via `mailto-utils.ts`

### Phase 3: ParticipationReport (structured survey)

8. `src/features/campaigns/buget/components/interactive/ParticipationReport.tsx`
   - Uses `useCampaignChallengeForm` with `completionAction: 'pending_review'`
   - Conditional fields based on debateTookPlace answer

### Phase 4: ContestationBuilder (form + dual output)

9. `src/features/campaigns/buget/components/interactive/ContestationBuilder.tsx`
   - Uses `useCampaignChallengeForm` with `completionAction: 'pending_review'`
   - Cross-reads debate request record for primariaEmail pre-fill
   - Text download via Blob + anchor

### Phase 5: MDX content updates

10. `src/content/campaigns/buget/challenges/ce-buget-are-primaria-ta-pentru-2026/index.ro.mdx`
    - Add `<BudgetStatusReport challengeSlug="ce-buget-are-primaria-ta-pentru-2026" />`

11. `src/content/campaigns/buget/challenges/trimite-cerere-dezbatere-buget/index.ro.mdx`
    - Add `<DebateRequestForm challengeSlug="trimite-cerere-dezbatere-buget" />`

12. `src/content/campaigns/buget/challenges/participa-la-dezbaterea-bugetului-local/index.ro.mdx`
    - Add `<ParticipationReport challengeSlug="participa-la-dezbaterea-bugetului-local" />`

13. `src/content/campaigns/buget/challenges/formuleaza-o-contestatie-pentru-bugetul-local/index.ro.mdx`
    - Add `<ContestationBuilder challengeSlug="formuleaza-o-contestatie-pentru-bugetul-local" />`

---

## Key Existing Code to Reuse

| What | File Path |
|------|-----------|
| `useCustomInteraction<T>()` | `src/features/learning/hooks/interactions/use-custom-interaction.ts` |
| `useChallengeInteractionAdapter()` | `src/features/campaigns/buget/adapters/learning/challenge-interaction-adapter.ts` |
| `useCampaignProgress()` | `src/features/campaigns/buget/hooks/use-campaign-progress.tsx` |
| `createLazyInteractiveComponent()` | `src/features/campaigns/buget/adapters/learning/interactive-components-registry.tsx` |
| `InteractiveStateRecord` types | `src/features/learning/types.ts` |
| `buildInteractiveRecordKey()` | `src/features/learning/utils/interactive-state.ts` |
| shadcn UI: Card, Input, Button, RadioGroup, Switch, Textarea, Label, Badge | `src/components/ui/` |

---

## Verification

1. **Typecheck**: `yarn typecheck` - must pass with zero errors
2. **i18n**: `yarn i18n:extract && yarn i18n:compile` - all new user-facing strings extracted
3. **Dev server**: `yarn dev` - navigate to a primarie challenge, verify each interactive element renders
4. **Manual test per element**:
   - Fill form fields, verify draft auto-save (check localStorage for learning_progress_events)
   - Submit, verify challenge status changes (check campaign progress context)
   - Reload page, verify saved state persists
   - Test mailto link opens email client with correct template (Debate Request, Contestation)
   - Test text download works (Contestation)
   - Test conditional field visibility (Participation Report: fields hidden when debate didn't take place)
   - Test cross-challenge data reuse (Contestation reads email from Debate Request)
5. **Existing tests**: `yarn test` - verify no regressions
