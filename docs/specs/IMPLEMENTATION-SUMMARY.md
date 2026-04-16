# Weekly Digest Implementation Summary

**Date**: 2026-04-15  
**Status**: Client-side implementation complete, server-side specification provided

---

## What Was Implemented

### 1. Client-Side Utilities (`src/features/challenges/utils/weekly-digest.ts`)

Created a comprehensive utility module for weekly digest functionality:

#### URL Builders

- `buildChallengeStepUrl()` - Creates entity-specific challenge URLs
  - Pattern: `/primarie/{cui}/buget/provocari/{moduleSlug}/{challengeSlug}/{stepSlug}`
- `buildChallengeHubUrl()` - Challenge browsing URL for an entity
- `buildEntityDashboardUrl()` - Entity dashboard URL

#### Next Step Recommendation Logic

- `getNextStepRecommendation()` - Determines what to recommend based on user progress
  - **Start**: For new users with no completions
  - **Continue**: For users with in-progress steps
  - **Celebrate**: For users who completed something this week
  - **Reengage**: For inactive users (7+ days)
  - **Completed**: For users who finished all challenges

#### Natural Romanian Copy

- `getWeeklyDigestSubject()` - Context-aware subject lines
- `getWeeklyDigestGreeting()` - Friendly greeting messages
- `getWeeklyDigestCta()` - Call-to-action button text

#### Progress Calculations

- `calculateWeeklyProgress()` - Weekly statistics for email content

### 2. Notification Type Registration

Added weekly digest to the notification system:

**File**: `src/features/notifications/campaign-notification-keys.ts`

- Added `FUNKY_NOTIFICATION_WEEKLY_DIGEST` constant

**File**: `src/features/notifications/types.ts`

- Added to `NotificationType` union
- Added configuration with label and description

**Translations** (`src/locales/ro/messages.po`):

- "Weekly Progress Digest" → "Rezumat săptămânal al progresului"
- Description translated to natural Romanian

### 3. Test Coverage

**File**: `src/features/challenges/utils/weekly-digest.test.ts`

- 18 test cases covering all scenarios
- Tests for URL builders, recommendation logic, and copy generation
- All tests passing

---

## Specifications Created

### 1. Main Specification

**File**: `/docs/specs/specs-202604150000-weekly-progress-digest-improvements.md`

Contains:

- Problem definition (template preview error, generic content, unnatural Romanian)
- Context (challenge structure, URL patterns, template system)
- Decision on intelligent next-step logic
- Natural Romanian text guidelines
- Consequences and trade-offs

### 2. Implementation Guide

**File**: `/docs/specs/weekly-digest-implementation-guide.md`

Contains server-side guidance:

- Fix for template preview error (add to catalog endpoint)
- TypeScript URL construction helpers
- Complete next-step recommendation algorithm
- HTML and plain text email templates
- Romanian copy reference with all subject lines and body templates
- Testing checklist

---

## Key Design Decisions

### 1. Challenge URL Format

All challenge links use entity-specific URLs:

```
/primarie/{cui}/buget/provocari/{moduleSlug}/{challengeSlug}/{stepSlug}
```

This ensures users are taken directly to their selected entity's content.

### 2. Smart Next Step Recommendations

The system considers:

- Completion status (none, partial, complete)
- Activity recency (days since last activity)
- Current progress (which step they're on)
- Weekly achievements (what they completed this week)

### 3. Natural Romanian Tone

- Informal "tu" form instead of formal "dumneavoastră"
- Active verbs: "Exploră", "Descoperă", "Continuă"
- Friendly emojis: 🎉, 👋
- Specific references to entity names

### 4. Subject Line Variations

| Type      | Example (Romanian)                                |
| --------- | ------------------------------------------------- |
| Start     | "Începe călătoria ta civică în București"         |
| Continue  | "Continuă provocarea ta la Cluj"                  |
| Celebrate | "Felicitări! Ai terminat 'Provocarea Civică' 🎉"  |
| Reengage  | "Te așteptăm înapoi la Timișoara"                 |
| Completed | "Ai stăpânit bugetul local din Iași. Ce urmează?" |

---

## Server-Side Requirements

To complete the implementation, the server team needs to:

### 1. Fix Template Preview Error

Add `weekly_progress_digest` to the `/notifications/templates` endpoint response:

```typescript
{
  templateId: "weekly_progress_digest",
  name: "Weekly Progress Digest",
  version: "1.0.0",
  description: "Personalized weekly summary...",
  requiredFields: [
    { name: "userName", type: "string", required: true },
    { name: "entityCui", type: "string", required: true },
    { name: "entityName", type: "string", required: true },
    { name: "completedSteps", type: "array", required: true },
    // ... etc
  ]
}
```

### 2. Implement Template Logic

- Use the next-step recommendation algorithm from the spec
- Generate correct entity-specific URLs
- Calculate weekly progress statistics
- Render HTML and text email versions

### 3. Configure Triggers

Set up weekly batch job to send digests to subscribed users.

---

## Verification

### Type Checking

```bash
✅ pnpm typecheck - No errors
```

### Linting

```bash
✅ pnpm lint - All new files pass
```

### Testing

```bash
✅ pnpm vitest run weekly-digest.test.ts
   Test Files  1 passed (1)
   Tests       18 passed (18)
```

### i18n Compilation

```bash
✅ pnpm i18n:compile - Translations compiled successfully
```

---

## Files Modified/Created

### New Files

1. `/src/features/challenges/utils/weekly-digest.ts` - Utility functions
2. `/src/features/challenges/utils/weekly-digest.test.ts` - Test suite
3. `/docs/specs/specs-202604150000-weekly-progress-digest-improvements.md` - Specification
4. `/docs/specs/weekly-digest-implementation-guide.md` - Implementation guide

### Modified Files

1. `/src/features/notifications/campaign-notification-keys.ts` - Added weekly digest key
2. `/src/features/notifications/types.ts` - Added notification type and config
3. `/src/locales/ro/messages.po` - Added Romanian translations
4. `/src/locales/en/messages.po` - Added English source strings (auto-generated)

---

## Next Steps

1. **Server Team**: Implement template catalog endpoint fix and email generation
2. **QA**: Test email rendering across email clients
3. **Design Team**: Review email HTML templates for brand consistency
4. **Product Team**: Configure send schedule and user segmentation

---

## References

- Challenge modules: `/src/content/challenges/modules/*.json`
- Notification API: `/src/features/campaigns/buget/admin/api/campaign-admin-notifications.ts`
- Challenge routes: `/src/routes/primarie/$cui/buget/provocari/`
- Full spec: `/docs/specs/specs-202604150000-weekly-progress-digest-improvements.md`
- Implementation guide: `/docs/specs/weekly-digest-implementation-guide.md`
