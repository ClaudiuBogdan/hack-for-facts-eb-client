# Weekly Digest Template - Implementation Guide

**For**: Server-side / Backend Team  
**Purpose**: Fix template preview error and implement improved weekly digest

---

## Part 1: Fix Template Preview Error

### Problem

The error `NotFoundError: Template "weekly_progress_digest" is not previewable for this campaign` occurs because the template is not exposed via the `/notifications/templates` API endpoint.

### Root Cause

The template preview system works in two steps:

1. **Catalog**: `GET /notifications/templates` returns available templates
2. **Preview**: `GET /notifications/templates/{templateId}/preview` returns example content

If the template is not in the catalog response (step 1), the UI shows "not previewable".

### Solution

Add `weekly_progress_digest` to the server's template catalog response:

```typescript
// In your server template catalog configuration
const PREVIEWABLE_TEMPLATES = [
  // ... existing templates
  {
    templateId: "weekly_progress_digest",
    name: "Weekly Progress Digest",
    version: "1.0.0",
    description:
      "Personalized weekly summary of challenge progress with next step recommendations",
    requiredFields: [
      { name: "userName", type: "string", required: true },
      { name: "entityCui", type: "string", required: true },
      { name: "entityName", type: "string", required: true },
      { name: "completedSteps", type: "array", required: true },
      { name: "currentModule", type: "string", required: false },
      { name: "currentChallenge", type: "string", required: false },
      { name: "currentStep", type: "string", required: false },
      { name: "nextStepUrl", type: "string", required: false },
      { name: "weeklyProgress", type: "object", required: false },
      { name: "unsubscribeUrl", type: "string", required: true },
    ],
  },
];
```

---

## Part 2: URL Construction

### Challenge URL Pattern

All challenge links must use the entity-specific URL format:

```
https://{domain}/primarie/{cui}/buget/provocari/{moduleSlug}/{challengeSlug}/{stepSlug}
```

### URL Components

| Component       | Source                 | Example                    |
| --------------- | ---------------------- | -------------------------- |
| `domain`        | Environment config     | `bugetareparticipativa.ro` |
| `cui`           | User's selected entity | `12345678`                 |
| `moduleSlug`    | Challenge module JSON  | `civic-campaign`           |
| `challengeSlug` | Challenge module JSON  | `civic-intro`              |
| `stepSlug`      | Challenge module JSON  | `01-about-this-challenge`  |

### Helper Function

```typescript
function buildChallengeStepUrl(
  domain: string,
  cui: string,
  moduleSlug: string,
  challengeSlug: string,
  stepSlug: string,
): string {
  return `https://${domain}/primarie/${cui}/buget/provocari/${moduleSlug}/${challengeSlug}/${stepSlug}`;
}

// Challenge hub URL (for browsing all challenges)
function buildChallengeHubUrl(domain: string, cui: string): string {
  return `https://${domain}/primarie/${cui}/buget/provocari`;
}

// Entity dashboard URL
function buildEntityDashboardUrl(domain: string, cui: string): string {
  return `https://${domain}/primarie/${cui}`;
}
```

---

## Part 3: Template Logic Implementation

### Next Step Recommendation Algorithm

```typescript
interface UserProgress {
  completedSteps: string[];
  currentModule?: string;
  currentChallenge?: string;
  currentStep?: string;
  lastActivityAt: Date;
}

interface NextStepRecommendation {
  type:
    | "start"
    | "continue"
    | "next_challenge"
    | "celebrate"
    | "reengage"
    | "completed";
  subject: string;
  stepTitle: string;
  stepDescription: string;
  stepUrl: string;
  message: string;
}

function getNextStepRecommendation(
  progress: UserProgress,
  entityCui: string,
  entityName: string,
  domain: string,
): NextStepRecommendation {
  const allSteps = getAllChallengeSteps(); // From challenge module JSONs
  const completedCount = progress.completedSteps.length;
  const daysSinceActivity = daysSince(progress.lastActivityAt);

  // Scenario 1: New user, no completions
  if (completedCount === 0) {
    const firstStep = allSteps[0];
    return {
      type: "start",
      subject: `Începe călătoria ta civică în ${entityName}`,
      stepTitle: firstStep.title.ro,
      stepDescription: firstStep.description.ro,
      stepUrl: buildChallengeStepUrl(
        domain,
        entityCui,
        firstStep.moduleSlug,
        firstStep.challengeSlug,
        firstStep.stepSlug,
      ),
      message: `Bun venit! Ești la un pas să înțelegi bugetul local al ${entityName}. Începe cu primul pas:`,
    };
  }

  // Scenario 2: Completed something this week - celebrate + next
  const completedThisWeek = getCompletedThisWeek(progress.completedSteps);
  if (completedThisWeek.length > 0) {
    const lastCompleted = completedThisWeek[completedThisWeek.length - 1];
    const nextStep = findNextStep(allSteps, lastCompleted);

    if (nextStep) {
      return {
        type: "celebrate",
        subject: `Felicitări! Ai terminat ${lastCompleted.challengeTitle} 🎉`,
        stepTitle: nextStep.title.ro,
        stepDescription: nextStep.description.ro,
        stepUrl: buildChallengeStepUrl(
          domain,
          entityCui,
          nextStep.moduleSlug,
          nextStep.challengeSlug,
          nextStep.stepSlug,
        ),
        message: `Bravo! Ai finalizat ${lastCompleted.challengeTitle}. Continuă cu:`,
      };
    }
  }

  // Scenario 3: Has current step in progress
  if (
    progress.currentStep &&
    !progress.completedSteps.includes(progress.currentStep)
  ) {
    const currentStepInfo = findStepById(allSteps, progress.currentStep);
    if (currentStepInfo) {
      return {
        type: "continue",
        subject: `Continuă provocarea ta la ${entityName}`,
        stepTitle: currentStepInfo.title.ro,
        stepDescription: currentStepInfo.description.ro,
        stepUrl: buildChallengeStepUrl(
          domain,
          entityCui,
          currentStepInfo.moduleSlug,
          currentStepInfo.challengeSlug,
          currentStepInfo.stepSlug,
        ),
        message: `Te așteptăm să termini pasul la care ai rămas:`,
      };
    }
  }

  // Scenario 4: Inactive for 7+ days
  if (daysSinceActivity >= 7) {
    const nextIncomplete = findNextIncompleteStep(
      allSteps,
      progress.completedSteps,
    );
    if (nextIncomplete) {
      return {
        type: "reengage",
        subject: `Te așteptăm înapoi la ${entityName}`,
        stepTitle: nextIncomplete.title.ro,
        stepDescription: nextIncomplete.description.ro,
        stepUrl: buildChallengeStepUrl(
          domain,
          entityCui,
          nextIncomplete.moduleSlug,
          nextIncomplete.challengeSlug,
          nextIncomplete.stepSlug,
        ),
        message: `Ne-am uitat și ți-am salvat progresul. Hai să continuăm împreună:`,
      };
    }
  }

  // Scenario 5: All challenges completed
  if (completedCount >= allSteps.length) {
    return {
      type: "completed",
      subject: `Ai stăpânit bugetul local. Ce urmează?`,
      stepTitle: "Explorează alte primării",
      stepDescription: "Vezi datele deschise ale altor entități",
      stepUrl: buildChallengeHubUrl(domain, entityCui),
      message: `Felicitări! Ai explorat toate provocările pentru ${entityName}. Poți:`,
    };
  }

  // Default: Find next incomplete step
  const nextStep = findNextIncompleteStep(allSteps, progress.completedSteps);
  return {
    type: "continue",
    subject: `Progresul tău săptămânal la ${entityName}`,
    stepTitle: nextStep.title.ro,
    stepDescription: nextStep.description.ro,
    stepUrl: buildChallengeStepUrl(
      domain,
      entityCui,
      nextStep.moduleSlug,
      nextStep.challengeSlug,
      nextStep.stepSlug,
    ),
    message: `Iată ce poți continua săptămâna aceasta:`,
  };
}
```

---

## Part 4: Email Template (HTML + Text)

### HTML Template Structure

```html
<!DOCTYPE html>
<html lang="ro">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{subject}}</title>
    <style>
      body {
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        background: #f8f9fa;
        padding: 30px;
        border-radius: 12px;
        margin-bottom: 30px;
      }
      .header h1 {
        margin: 0 0 10px 0;
        color: #2c3e50;
      }
      .progress-summary {
        background: #e8f5e9;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 30px;
      }
      .progress-summary h2 {
        margin-top: 0;
        color: #2e7d32;
      }
      .step-card {
        border: 2px solid #1976d2;
        border-radius: 12px;
        padding: 25px;
        margin-bottom: 30px;
      }
      .step-card h3 {
        margin-top: 0;
        color: #1976d2;
      }
      .duration {
        color: #666;
        font-size: 14px;
      }
      .cta-button {
        display: inline-block;
        background: #1976d2;
        color: white;
        padding: 15px 30px;
        text-decoration: none;
        border-radius: 8px;
        font-weight: bold;
        margin-top: 15px;
      }
      .alternatives {
        background: #f5f5f5;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 30px;
      }
      .footer {
        font-size: 12px;
        color: #999;
        text-align: center;
        border-top: 1px solid #eee;
        padding-top: 20px;
      }
      .footer a {
        color: #666;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>Hei, {{userName}}! 👋</h1>
      <p>{{headerMessage}}</p>
    </div>

    {{#if weeklyProgress}}
    <div class="progress-summary">
      <h2>Progresul tău săptămânal</h2>
      <ul>
        <li>✅ {{weeklyProgress.completedCount}} pași finalizați</li>
        <li>⏱️ {{weeklyProgress.totalMinutes}} minute de învățare</li>
        <li>📊 {{totalProgress.completedCount}} pași total</li>
      </ul>
    </div>
    {{/if}}

    <div class="step-card">
      <h2>
        {{recommendation.type === 'celebrate' ? 'Felicitări! 🎉' : 'Următorul
        pas'}}
      </h2>
      <h3>{{nextStepTitle}}</h3>
      <p>{{nextStepDescription}}</p>
      <p class="duration">⏱️ {{durationMinutes}} minute</p>
      <a href="{{nextStepUrl}}" class="cta-button">
        {{recommendation.type === 'start' ? 'Începe aici' : 'Continuă aici'}} →
      </a>
    </div>

    {{#if alternatives}}
    <div class="alternatives">
      <p><strong>Sau explorează:</strong></p>
      <ul>
        <li><a href="{{challengeHubUrl}}">Toate provocările disponibile</a></li>
        <li>
          <a href="{{entityDashboardUrl}}"
            >Datele deschise ale {{entityName}}</a
          >
        </li>
      </ul>
    </div>
    {{/if}}

    <div class="footer">
      <p>
        Primești acest email pentru că ești abonat la actualizări pentru
        {{entityName}}.
      </p>
      <p>
        <a href="{{unsubscribeUrl}}">Dezabonare</a> |
        <a href="{{preferencesUrl}}">Preferințe</a>
      </p>
    </div>
  </body>
</html>
```

### Plain Text Template

```
Hei, {{userName}}! 👋

{{headerMessage}}

---
PROGRESUL TĂU SĂPTĂMÂNAL
---
✅ {{weeklyProgress.completedCount}} pași finalizați
⏱️ {{weeklyProgress.totalMinutes}} minute de învățare
📊 {{totalProgress.completedCount}} pași total

---
{{recommendation.type === 'celebrate' ? 'FELICITĂRI! 🎉' : 'URMĂTORUL PAS'}}
---
{{nextStepTitle}}

{{nextStepDescription}}

⏱️ {{durationMinutes}} minute

→ {{recommendation.type === 'start' ? 'Începe aici' : 'Continuă aici'}}: {{nextStepUrl}}

---
SAU EXPLOREAZĂ
---
• Toate provocările: {{challengeHubUrl}}
• Datele {{entityName}}: {{entityDashboardUrl}}

---
Primești acest email pentru că ești abonat la actualizări pentru {{entityName}}.
Dezabonare: {{unsubscribeUrl}}
Preferințe: {{preferencesUrl}}
```

---

## Part 5: Romanian Copy Reference

### Subject Lines by Scenario

```typescript
const SUBJECT_TEMPLATES = {
  newUser: (entityName: string) =>
    `Începe călătoria ta civică în ${entityName}`,

  continue: (entityName: string, challengeTitle: string) =>
    `Continuă provocarea "${challengeTitle}" la ${entityName}`,

  celebrate: (challengeTitle: string) =>
    `Felicitări! Ai terminat "${challengeTitle}" 🎉`,

  reengage: (entityName: string, daysInactive: number) =>
    `Te așteptăm înapoi la ${entityName}`,

  completed: (entityName: string) =>
    `Ai stăpânit bugetul local din ${entityName}. Ce urmează?`,

  weeklySummary: (entityName: string, completedCount: number) =>
    `${completedCount} pași completați săptămâna aceasta la ${entityName}`,
};
```

### Body Copy Templates

```typescript
const BODY_TEMPLATES = {
  greeting: (userName: string, entityName: string) =>
    `Hei, ${userName}! 👋\n\nIată ce-ai făcut săptămâna aceasta la ${entityName}:`,

  newUserGreeting: (userName: string, entityName: string) =>
    `Bun venit, ${userName}! 🎉\n\nEști gata să descoperi cum funcționează bugetul local în ${entityName}?`,

  celebrateMessage: (challengeTitle: string) =>
    `Bravo! Ai finalizat "${challengeTitle}". Felicitări pentru dedicare!`,

  reengageMessage: (daysInactive: number) =>
    `Ne-am uitat și ți-am salvat tot progresul. Hai să continuăm împreună!`,

  continueMessage: (stepTitle: string) =>
    `Te așteptăm să termini pasul "${stepTitle}". Ești aproape!`,

  completedAllMessage: (entityName: string) =>
    `Felicitări! Ai explorat toate provocările pentru ${entityName}. Ești un expert în buget local!`,

  ctaContinue: "Continuă aici →",
  ctaStart: "Începe aici →",
  ctaExplore: "Explorează mai mult",
};
```

---

## Part 6: Testing Checklist

Before deploying the template:

- [ ] Template appears in `/notifications/templates` catalog response
- [ ] Preview endpoint returns valid HTML and text versions
- [ ] All required fields are documented
- [ ] URL construction includes correct entity CUI
- [ ] Romanian text sounds natural (have a native speaker review)
- [ ] All challenge links route correctly in the app
- [ ] Unsubscribe link works
- [ ] Mobile rendering looks good
- [ ] Dark mode is readable (if supported)
- [ ] Test with each user scenario (new, in-progress, completed, re-engage)

---

## References

- Full specification: `./specs-202604150000-weekly-progress-digest-improvements.md`
- Challenge modules: `/src/content/challenges/modules/*.json`
- Client notification API: `/src/features/campaigns/buget/admin/api/campaign-admin-notifications.ts`
- URL routes: `/src/routes/primarie/$cui/buget/provocari/`
