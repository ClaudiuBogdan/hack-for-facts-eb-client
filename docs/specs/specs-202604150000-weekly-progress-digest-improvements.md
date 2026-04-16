# Weekly Progress Digest Template Improvements

**Status**: Accepted  
**Date**: 2026-04-15  
**Author**: OpenCode Agent

## Problem

The current weekly progress digest email template has several issues:

1. **Template Not Previewable**: The `weekly_progress_digest` template is not exposed by the server's `/notifications/templates` endpoint, resulting in the error: `NotFoundError: Template "weekly_progress_digest" is not previewable for this campaign.`

2. **Generic Content**: The template content is not personalized based on user progress through the challenge modules (Budget Basics, Civic Campaign, Read Local Execution).

3. **Incorrect Challenge Links**: Challenge links in the email don't use the correct entity-specific URL format with the user's selected entity CUI.

4. **Unnatural Romanian Text**: The Romanian copy sounds robotic and doesn't engage users effectively.

5. **No Smart Next Steps**: The template doesn't intelligently suggest the next challenge or step based on user progress, leading to disengagement.

## Context

### Challenge Structure

The platform has three challenge modules with the following hierarchy:

```
Module (e.g., "civic-campaign")
  └── Challenge (e.g., "civic-intro")
        └── Step (e.g., "01-about-this-challenge")
```

**Available Modules**:

1. **civic-campaign** (order: 1, difficulty: intermediate)
   - Title: "Implicare civică" / "Civic Involvement"
   - 3 challenges: civic-intro, civic-monitor-and-request, civic-participate-and-act

2. **budget-basics** (order: 2, difficulty: beginner)
   - Title: "Bazele bugetului local" / "Budget Basics"
   - 3 challenges: understand-budget, understand-process, decode-the-numbers

3. **read-local-execution** (order: 3, difficulty: beginner)
   - Title: "Citește execuția locală" / "Read Local Budget Execution"
   - 3 challenges: from-total-to-context, decode-budget-structure, from-platform-to-document

### URL Structure

Entity-specific challenge URLs follow this pattern:

```
/primarie/{cui}/buget/provocari/{moduleSlug}/{challengeSlug}/{stepSlug}
```

Example:

```
/primarie/12345678/buget/provocari/civic-campaign/civic-intro/01-about-this-challenge
```

### Template System

- Templates are fetched from: `GET /api/v1/admin/campaigns/{campaignKey}/notifications/templates`
- Preview is loaded from: `GET /api/v1/admin/campaigns/{campaignKey}/notifications/templates/{templateId}/preview`
- A template must be listed in the catalog endpoint to be previewable

### User Progress Data Available

The template should receive:

- `userName`: User's display name
- `entityCui`: Selected entity CUI
- `entityName`: Selected entity name
- `completedSteps`: Array of completed step IDs
- `currentModule`: Currently active module slug
- `currentChallenge`: Currently active challenge slug
- `lastActivityAt`: Timestamp of last user activity
- `totalModulesCompleted`: Number of fully completed modules
- `weeklyProgress`: New completions this week

## Decision

### 1. Server-Side Template Registration

**Add `weekly_progress_digest` to the server's template catalog.**

The server must expose this template via the `/notifications/templates` endpoint with:

```typescript
{
  templateId: "weekly_progress_digest",
  name: "Weekly Progress Digest",
  version: "1.0.0",
  description: "Personalized weekly summary of challenge progress with next step recommendations",
  requiredFields: [
    { name: "userName", type: "string", required: true },
    { name: "entityCui", type: "string", required: true },
    { name: "entityName", type: "string", required: true },
    { name: "completedSteps", type: "array", required: true },
    { name: "currentModule", type: "string", required: false },
    { name: "currentChallenge", type: "string", required: false },
    { name: "currentStep", type: "string", required: false },
    { name: "nextStepUrl", type: "string", required: false },
    { name: "weeklyProgress", type: "object", required: false }
  ]
}
```

### 2. Intelligent Next Step Logic

Implement the following logic to determine what to show each user:

```
IF user has no completed steps:
  → Recommend first step of first module (civic-campaign/civic-intro/01-about-this-challenge)
  → Subject: "Începe călătoria ta civică" / "Start your civic journey"

ELSE IF user has started but not completed current challenge:
  → Recommend next incomplete step in current challenge
  → Subject: "Continuă provocarea '{challengeTitle}'" / "Continue the '{challengeTitle}' challenge"

ELSE IF user completed a challenge this week:
  → Celebrate completion + recommend next challenge
  → Subject: "Felicitări! Ai completat '{challengeTitle}'" / "Congratulations! You completed '{challengeTitle}'"

ELSE IF user hasn't been active for 7+ days:
  → Gentle re-engagement with saved progress reminder
  → Subject: "Te așteaptă {N} pași noi" / "{N} new steps await you"

ELSE IF user completed all challenges:
  → Recommend reviewing other entities or advanced content
  → Subject: "Ai explorat toate provocările" / "You've explored all challenges"
```

### 3. Improved Subject Lines (Romanian)

| Scenario            | Current                  | Improved                                        |
| ------------------- | ------------------------ | ----------------------------------------------- |
| New user            | "Weekly Progress Update" | "Începe călătoria ta civică în {entityName}"    |
| In-progress         | "Your Weekly Digest"     | "Continuă provocarea ta la {entityName}"        |
| Completed challenge | "Weekly Summary"         | "Felicitări! Ai terminat '{challengeTitle}' 🎉" |
| Re-engagement       | "We miss you"            | "Te așteptăm înapoi la {entityName}"            |
| All complete        | "No new content"         | "Ai stăpânit bugetul local. Ce urmează?"        |

### 4. Email Content Structure

#### Header Section

```html
<h1>Hei, {userName}! 👋</h1>
<p>Iată ce ai realizat săptămâna aceasta la {entityName}:</p>
```

#### Progress Summary

```html
<div class="progress-summary">
  <h2>Progresul tău</h2>
  <ul>
    <li>✅ {completedThisWeek} pași finalizați</li>
    <li>📚 {totalCompleted} pași total</li>
    <li>⏱️ {totalMinutes} minute de învățare</li>
  </ul>
</div>
```

#### Next Step Recommendation (Smart)

```html
<div class="next-step">
  <h2>Următorul pas recomandat</h2>
  <div class="step-card">
    <h3>{nextStepTitle}</h3>
    <p>{nextStepDescription}</p>
    <p class="duration">⏱️ {durationMinutes} minute</p>
    <a href="{nextStepUrl}" class="cta-button"> Continuă aici → </a>
  </div>
</div>
```

#### Alternative Options (if applicable)

```html
<div class="alternatives">
  <p>Sau explorează:</p>
  <ul>
    <li><a href="{challengeHubUrl}">Alte provocări disponibile</a></li>
    <li><a href="{entityDashboardUrl}">Datele deschise ale {entityName}</a></li>
  </ul>
</div>
```

#### Footer

```html
<div class="footer">
  <p>
    Primești acest email pentru că ești abonat la actualizări pentru
    {entityName}.
  </p>
  <p>
    <a href="{unsubscribeUrl}">Dezabonare</a> |
    <a href="{preferencesUrl}">Preferințe</a>
  </p>
</div>
```

### 5. Natural Romanian Copy Guidelines

**Tone**: Friendly, encouraging, civic-minded but not preachy.

**DO**:

- Use "tu" form (informal) to create connection
- Use active verbs: "Exploră", "Descoperă", "Continuă"
- Be specific about achievements
- Reference the entity name frequently to maintain context

**DON'T**:

- Use bureaucratic language
- Be overly formal with "dumneavoastră"
- Use passive voice
- Be vague about progress

**Example Transformations**:

| Robotic                           | Natural                      |
| --------------------------------- | ---------------------------- |
| "Utilizatorul a finalizat 3 pași" | "Ai parcurs 3 pași"          |
| "Vă rugăm să continuați"          | "Hai să continuăm"           |
| "Progresul săptămânal"            | "Ce-am făcut săptămâna asta" |
| "Nu există pași disponibili"      | "Ai explorat tot! Bravo! 🎉" |

## Alternatives Considered

### 1. Client-Side Template Generation

**Rejected**: Email templates must be generated server-side for deliverability, tracking, and unsubscribe handling. Client-side generation would require exposing email infrastructure credentials.

### 2. Static Weekly Template for All Users

**Rejected**: A one-size-fits-all template leads to poor engagement. Users at different stages need different messaging.

### 3. Daily Instead of Weekly Digest

**Rejected**: Daily emails would be too frequent and lead to fatigue. Weekly cadence strikes the right balance for learning progress.

### 4. Separate Templates for Each Module

**Rejected**: Would create maintenance overhead. Instead, use a single template with conditional logic based on `currentModule`.

## Consequences

**Positive**

- Higher email engagement through personalization
- Clear next steps reduce decision fatigue for users
- Natural Romanian tone builds trust and connection
- Correct entity-specific URLs ensure seamless user experience
- Template preview availability enables testing before deployment

**Negative**

- Server-side changes required to expose template
- More complex template logic requires careful testing
- Additional data fields needed in notification payload
- Ongoing maintenance as challenge structure evolves

## References

- Challenge module definitions:
  - `/src/content/challenges/modules/civic-campaign.json`
  - `/src/content/challenges/modules/budget-basics.json`
  - `/src/content/challenges/modules/read-local-execution.json`
- Challenge route structure: `/src/routes/primarie/$cui/buget/provocari/`
- Notification API: `/src/features/campaigns/buget/admin/api/campaign-admin-notifications.ts`
- Template preview component: `/src/features/campaigns/buget/admin/components/CampaignAdminTemplatePreviewDialog.tsx`
- Template types: `/src/features/campaigns/buget/admin/types.ts` (lines 792-809)
- Romanian locale file: `/src/locales/ro/messages.po`
