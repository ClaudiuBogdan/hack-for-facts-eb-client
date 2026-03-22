# Plan: Civic Campaign Module UX Redesign

## Context

A thorough UX audit revealed critical issues in the civic-campaign module when viewed from a first-time citizen's perspective. The module has data redundancy across forms, unexplained jargon, a temporal gap between steps 04-05, an oversized ContestationBuilder, and ASCII-only Romanian text (no diacritics). This plan addresses all issues systematically.

## Key Fixes

### 1. Fix data redundancy in Step 03 (CRITICAL)

**Problem**: BudgetStatusReport collects `publishedDate` and `documentUrl` which are ALREADY collected by BudgetPublicationDate and BudgetDocumentLink. Users submit the same data twice.

**Fix**: Simplify BudgetStatusReport to only collect `isPublished` and `budgetStage`. Remove `publishedDate` and `documentUrl` fields from the component and its type. The detailed data is captured by the dedicated components.

Files:
- `src/features/campaigns/buget/components/interactive/types.ts` - Remove `publishedDate` and `documentUrl` from `BudgetStatusReportValue`
- `src/features/campaigns/buget/components/interactive/BudgetStatusReport.tsx` - Remove the conditional date/URL inputs. Simplify to just two pill-style radio groups.

### 2. Remove C14 jargon (HIGH)

**Problem**: "Email contact C14" is unexplained. First-time citizens have no idea what C14 is.

**Fix**: Remove `c14Email` from the DebateRequestForm entirely. The platform CC is already handled in `mailto-utils.ts` (`PLATFORM_CC_EMAIL = 'contact@transparenta.eu'`). The user should not need to know about or provide a CC address. If a specific institutional email is needed, it can be read from PrimarieContactInfo.

Files:
- `src/features/campaigns/buget/components/interactive/types.ts` - Remove `c14Email` from `DebateRequestFormValue`
- `src/features/campaigns/buget/components/interactive/DebateRequestForm.tsx` - Remove c14Email input from Step 1. Adjust mailto to only CC the platform email.
- `src/features/campaigns/buget/components/interactive/mailto-utils.ts` - Simplify `buildDebateRequestMailto` to not take `c14Email` param.

### 3. Restructure Step 03 sections (HIGH)

**Problem**: 7 sections (6 content + MarkComplete) is too many slides. Sections 4 and 5 have only one sentence of context before a form.

**New structure** (5 sections):
1. "De ce trebuie sa verifici statusul?" - context + quiz (KEEP)
2. "Gaseste site-ul primariei" - guidance on finding the website + `<PrimarieWebsiteLink>` (MERGE old sections 2+3: add the search guidance from "Unde gasesti bugetul?" into this section, then the form)
3. "Gaseste documentul de buget" - what a budget document looks like, what "Anexa 3" means + `<BudgetDocumentLink>` (EXPAND old section 4 with proper context)
4. "Data publicarii" - why the date matters for deadlines, where to find it + `<BudgetPublicationDate>` (EXPAND old section 5)
5. "Statusul bugetului" - simplified `<BudgetStatusReport>` (just is_published + stage) + ExpandableHint + MarkComplete

### 4. Add transition guidance after Step 04 (HIGH)

**Problem**: Step 04 ends abruptly. The user sends a debate request but gets no guidance on what happens next.

**Fix**: Add a closing section "Ce urmeaza?" in Step 04 explaining:
- The municipality has a legal obligation to respond
- What to expect (timeline, typical response patterns)
- That Step 05 is for AFTER the debate happens (could be weeks away)
- What to do if there is no response (escalation)

### 5. Convert ContestationBuilder to wizard (HIGH)

**Problem**: 4 textareas + email + preview + 2 action cards in one slide is overwhelming.

**Fix**: Convert ContestationBuilder to a multi-step wizard similar to DebateRequestForm:
- Step 1: "Ce contesti?" - one textarea with guidance
- Step 2: "De ce?" - one textarea with guidance
- Step 3: "Impact si propunere" - two textareas (impact + proposal)
- Step 4: "Previzualizare si trimitere" - preview + email field + action cards

### 6. Add module closing section to Step 06 (MEDIUM)

**Problem**: No wrap-up after completing the civic journey.

**Fix**: Add a final section in Step 06 after the ContestationBuilder: "Felicitari!" - brief summary of what was accomplished, what to expect from the municipality, encouragement to share.

### 7. Add proper Romanian diacritics (MEDIUM)

**Problem**: All MDX files use ASCII-only Romanian. Budget-basics uses proper diacritics.

**Fix**: Add diacritics to all 6 MDX files. Key replacements: a->ă, i->î, s->ș, t->ț where appropriate.

### 8. Improve Step 05 for "debate didn't happen" path (MEDIUM)

**Problem**: If the user selects "Nu" for "A avut loc dezbaterea?", the form collapses to just observations + submit. Too thin.

**Fix**: Add guidance in the MDX content (before the ParticipationReport form) explaining what to do if the debate did not happen: file a complaint, document non-compliance, link to the law.

### 9. Explain "In asteptare" badge (MEDIUM)

**Problem**: Users see an amber "In asteptare" badge after form submission with no explanation.

**Fix**: Add a brief explanation line below the badge in `CampaignChallengeFormShell` submitted state: "Informatia ta a fost inregistrata si este in curs de verificare."

### 10. Minor content fixes

- Step 01 section 4 "Esti pregatit?": Merge into section 3 or make the quiz unique
- Step 02 section 4 "De ce conteaza termenele?": Merge into section 2
- Step 04 section 3 "Ce trebuie sa pregatesti": Remove C14 mention, simplify
- Step 06 ContestationBuilder placeholder: Replace "Capitolul 65 Invatamant" with citizen-friendly example

## Implementation order

1. **Types + BudgetStatusReport simplification** - Remove redundant fields
2. **DebateRequestForm C14 removal** - Clean up jargon
3. **ContestationBuilder wizard conversion** - Better progressive disclosure
4. **CampaignChallengeFormShell** - Add "In asteptare" explanation
5. **All 6 MDX files rewrite** - Diacritics, restructured sections, transitions, closing
6. **Final review + tests**

## Files to modify

### React components:
- `src/features/campaigns/buget/components/interactive/types.ts`
- `src/features/campaigns/buget/components/interactive/BudgetStatusReport.tsx`
- `src/features/campaigns/buget/components/interactive/DebateRequestForm.tsx`
- `src/features/campaigns/buget/components/interactive/ContestationBuilder.tsx`
- `src/features/campaigns/buget/components/interactive/CampaignChallengeFormShell.tsx`
- `src/features/campaigns/buget/components/interactive/mailto-utils.ts`

### MDX content (all 6 steps):
- `src/content/challenges/steps/civic-campaign/01-about-this-challenge/index.ro.mdx`
- `src/content/challenges/steps/civic-campaign/02-budget-calendar-and-rights/index.ro.mdx`
- `src/content/challenges/steps/civic-campaign/03-budget-status-2026/index.ro.mdx`
- `src/content/challenges/steps/civic-campaign/04-debate-request/index.ro.mdx`
- `src/content/challenges/steps/civic-campaign/05-participation-report/index.ro.mdx`
- `src/content/challenges/steps/civic-campaign/06-contestation/index.ro.mdx`

## Verification
1. `yarn typecheck` - zero errors
2. `yarn i18n:extract && yarn i18n:compile`
3. `npx vitest run src/features/challenges src/features/campaigns` - all tests pass
4. Manual: walk through all 6 steps as a first-time citizen
