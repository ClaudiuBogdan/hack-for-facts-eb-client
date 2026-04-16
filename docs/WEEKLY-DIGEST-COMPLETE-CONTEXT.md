# Weekly Digest Template - Complete Context & Learnings

**Project**: Transparenta.eu - Civic Budget Platform  
**Feature**: Weekly Progress Digest Email Template  
**Date**: 2026-04-15

---

## Problem Statement

The weekly progress digest email template needs to be implemented on the server side. The current issues are:

1. **Template Preview Error**: `NotFoundError: Template "weekly_progress_digest" is not previewable for this campaign`
   - Root cause: Template not exposed in `/notifications/templates` endpoint
   - Solution: Add to template catalog with proper metadata

2. **Missing Smart Logic**: Template needs to recommend next steps based on user progress
   - No personalized path recommendations
   - Need entity-specific URLs

3. **Romanian Copy**: Must sound natural, not robotic
   - Use informal "tu" form
   - Active verbs, friendly tone

---

## Challenge Structure (CRITICAL)

The platform has **3 modules** with **18 steps total**, in specific order:

### Module 1: civic-campaign (Implicare civică) - Order: 1

**Challenge 1**: civic-intro (Introducere și orientare)

1. `ch-civic-01` → `01-about-this-challenge` → "Despre această provocare"
2. `ch-civic-02` → `02-budget-calendar-and-rights` → "Calendarul bugetar și drepturile tale"

**Challenge 2**: civic-monitor-and-request (Monitorizează și solicită) 3. `ch-civic-03` → `03-budget-status-2026` → "Statusul bugetului pe 2026" 4. `ch-civic-04` → `04-debate-request` → "Cererea de dezbatere publică"

**Challenge 3**: civic-participate-and-act (Participă și acționează) 5. `ch-civic-05` → `05-participation-report` → "Raport de participare" 6. `ch-civic-06` → `06-contestation` → "Contestația bugetului local"

### Module 2: budget-basics (Bazele bugetului local) - Order: 2

**Challenge 1**: understand-budget (Înțelege bugetul) 7. `ch-budget-01` → `01-what-is-the-local-budget` → "Ce este bugetul local?" 8. `ch-budget-02` → `02-draft-approved-execution-rectification` → "Proiect, aprobat, execuție, rectificare"

**Challenge 2**: understand-process (Înțelege procesul) 9. `ch-budget-03` → `03-who-decides-and-when` → "Cine decide și când?" 10. `ch-budget-04` → `04-how-to-read-a-budget-line` → "Cum citești o linie bugetară"

**Challenge 3**: decode-the-numbers (Decodifică numerele) 11. `ch-budget-05` → `05-functional-vs-economic` → "Funcțional vs economic" 12. `ch-budget-06` → `06-functioning-vs-development` → "Funcționare vs dezvoltare"

### Module 3: read-local-execution (Citește execuția locală) - Order: 3

**Challenge 1**: from-total-to-context (De la total la context) 13. `ch-read-01` → `01-why-2025-execution-matters` → "De ce contează execuția din 2025" 14. `ch-read-02` → `02-total-budget-in-context` → "Cât de mare este bugetul primăriei tale"

**Challenge 2**: decode-budget-structure (Cum sunt structurați banii) 15. `ch-read-03` → `03-follow-money-from-total-to-income-and-spending` → "Cum cobori de la total la capitole" 16. `ch-read-04` → `04-functional-and-economic-lenses` → "Funcțional și economic: cele două lentile"

**Challenge 3**: from-platform-to-document (Din platformă în document) 17. `ch-read-05` → `05-read-the-real-execution-table` → "Cum citești tabelul real de execuție" 18. `ch-read-06` → `06-main-creditor-and-2026-questions` → "Primăria ca ordonator principal și ce întrebi pentru 2026"

---

## URL Format (CRITICAL)

All challenge URLs MUST include the entity CUI:

```
https://{domain}/primarie/{cui}/buget/provocari/{moduleSlug}/{challengeSlug}/{stepSlug}
```

**Example**:

```
https://bugetareparticipativa.ro/primarie/12345678/buget/provocari/civic-campaign/civic-intro/01-about-this-challenge
```

**Hub URLs**:

- Challenge hub: `/primarie/{cui}/buget/provocari`
- Entity dashboard: `/primarie/{cui}`

---

## Template Requirements

### DON'T Include:

- User names (no personalized greetings)
- Time durations (no "⏱️ 5 minute")
- Days since last activity calculations

### DO Include:

- Correct entity-specific URLs
- Rich context for each item (link, title, summary)
- Challenge and module context
- Progress indicators (X of Y completed)
- Entity name throughout

---

## Email Template Structure

### Header Section

```
Iată ce ai realizat la {entityName}:
```

### Progress Section

Show completed items with rich context:

```
✅ Completat: {stepTitle}
   Provocare: {challengeName}
   Modul: {moduleName}
   Rezumat: {stepSummary}
   Link: {stepUrl}
```

### Next Steps Section

Show 2-3 upcoming items:

```
URMĂTORII PAȘI

{stepTitle}
Context: {stepContext}
{stepUrl}
```

### Alternative Exploration

```
EXPLOREAZĂ MAI MULT

• Vezi toate provocările: {challengeHubUrl}
• Date deschise pentru {entityName}: {entityDashboardUrl}
```

### Footer

```
Primești acest email pentru că urmărești {entityName}.
Dezabonare: {unsubscribeUrl}
```

---

## Step Summaries (Romanian)

Use these summaries for context:

**Module 1 - Civic Campaign**:

1. "Înțelege cum poți participa la dezbaterea bugetului local"
2. "Descoperă calendarul bugetar și drepturile tale ca cetățean"
3. "Verifică dacă bugetul pe 2026 a fost publicat de primărie"
4. "Solicită o dezbatere publică pe bugetul local"
5. "Documentează-ți participarea la dezbaterea bugetului"
6. "Formulează o contestație pe bugetul local"

**Module 2 - Budget Basics**: 7. "Învață ce este bugetul local și cum funcționează" 8. "Înțelege diferențele între proiect, aprobat, execuție și rectificare" 9. "Află cine decide bugetul și în ce perioadă" 10. "Învață să citești o linie bugetară" 11. "Folosește clasificarea funcțională și economică" 12. "Diferențiază cheltuielile curente de cele de dezvoltare"

**Module 3 - Read Local Execution**: 13. "Folosește execuția din 2025 pentru întrebări despre 2026" 14. "Pune bugetul în context (per capita, comparativ)" 15. "Urmează fluxul banilor de la total la capitole" 16. "Aplică cele două lentile de analiză bugetară" 17. "Citește tabelul real de execuție al primăriei" 18. "Formulează întrebări mai bune pentru bugetul 2026"

---

## Logic for Building Context

**Input Data**:

- `entityCui`: string (e.g., "12345678")
- `entityName`: string (e.g., "București")
- `completedStepIds`: string[] (e.g., ["ch-civic-01", "ch-civic-02", "ch-civic-03"])
- `availableStepIds`: string[] (all 18 step IDs in order)

**Algorithm**:

1. For each completed step ID:
   - Look up step data (title, summary, module, challenge)
   - Build URL with entity CUI
   - Create item with: title, summary, url, challengeName, moduleName

2. Find next 2-3 incomplete steps:
   - Scan availableStepIds in order
   - Skip completed IDs
   - Return first 3 uncompleted
   - Add educational context for each

3. Calculate progress:
   - completedCount / totalCount
   - Format as "3/18 pași completați"

4. Build alternative links:
   - Challenge hub URL
   - Entity dashboard URL
   - Unsubscribe URL

---

## Subject Lines (Romanian)

**Template**: `{completedCount}/{totalCount} pași completați în {entityName} - {motivationalPhrase}`

**Examples**:

- "3/18 pași completați în București - ești pe drumul cel bun!"
- "6/18 pași completați în Cluj - jumătate de drum parcurs!"
- "12/18 pași completați în Timișoara - aproape de final!"
- "18/18 pași completați în Iași - ai stăpânit bugetul local!"

**Motivational phrases**:

- 1-5 steps: "începutul este promițător!"
- 6-11 steps: "ești pe drumul cel bun!"
- 12-17 steps: "aproape de final!"
- 18 steps: "ai stăpânit bugetul local!"

---

## Technical Implementation Notes

### Template Registration

Must expose in `/notifications/templates` endpoint:

```typescript
{
  templateId: "weekly_progress_digest",
  name: "Weekly Progress Digest",
  version: "1.0.0",
  description: "Personalized weekly summary of challenge progress",
  requiredFields: [
    { name: "entityCui", type: "string", required: true },
    { name: "entityName", type: "string", required: true },
    { name: "completedStepIds", type: "array", required: true },
    { name: "unsubscribeUrl", type: "string", required: true }
  ]
}
```

### Preview Endpoint

Must return:

- `exampleSubject`: string
- `html`: string (rendered HTML)
- `text`: string (plain text)
- `requiredFields`: array of field descriptors

### Example Data for Preview

```json
{
  "entityCui": "12345678",
  "entityName": "București",
  "completedStepIds": ["ch-civic-01", "ch-civic-02", "ch-civic-03"],
  "unsubscribeUrl": "https://example.com/unsubscribe"
}
```

---

## Romanian Copy Guidelines

### DO:

- Use "tu" form (informal): "Ai realizat", "Continuă"
- Active verbs: "Explorează", "Descoperă", "Vezi"
- Be specific: "3 pași completați" not "ai făcut progrese"
- Include entity name frequently

### DON'T:

- Use "dumneavoastră" (too formal)
- Use passive voice: "A fost completat" → "Ai completat"
- Be vague: "Progres bun" → "3/18 pași"
- Use time references: "Săptămâna aceasta" not needed

---

## Reference Files

These files exist in the client repo and contain specifications:

1. `/Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-client/docs/specs/specs-202604150000-weekly-progress-digest-improvements.md` - Main ADR spec
2. `/Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-client/docs/specs/weekly-digest-implementation-guide.md` - Server implementation guide
3. `/Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-client/docs/specs/ROMANIAN-COPY-REFERENCE.md` - Romanian copy reference
4. `/Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-client/src/content/challenges/modules/civic-campaign.json` - Challenge data
5. `/Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-client/src/content/challenges/modules/budget-basics.json` - Challenge data
6. `/Users/claudiuconstantinbogdan/projects/devostack/hack-for-facts-eb-client/src/content/challenges/modules/read-local-execution.json` - Challenge data

---

## Success Criteria

- [ ] Template appears in `/notifications/templates` catalog
- [ ] Preview endpoint returns valid HTML and text
- [ ] All URLs include correct entity CUI
- [ ] Step order is correct (1-18 sequence)
- [ ] Romanian text is natural and correct
- [ ] Progress shows completed/total count
- [ ] Each item has: title, summary, link, context
- [ ] No user names or personalized greetings
- [ ] No time durations in output

---

## Example Complete Output

**Subject**: 3/18 pași completați în București - ești pe drumul cel bun!

**HTML Body**:

```html
<h1>Iată ce ai realizat la București:</h1>

<h2>Pași completați (3/18)</h2>
<div>
  <p>
    ✅
    <a href="https://.../civic-campaign/civic-intro/01-about-this-challenge"
      >Despre această provocare</a
    >
  </p>
  <p>Provocare: Introducere și orientare | Modul: Implicare civică</p>
  <p>Rezumat: Înțelege cum poți participa la dezbaterea bugetului local</p>
</div>
<div>
  <p>
    ✅
    <a
      href="https://.../civic-campaign/civic-intro/02-budget-calendar-and-rights"
      >Calendarul bugetar și drepturile tale</a
    >
  </p>
  <p>Provocare: Introducere și orientare | Modul: Implicare civică</p>
  <p>Rezumat: Descoperă calendarul bugetar și drepturile tale ca cetățean</p>
</div>
<div>
  <p>
    ✅
    <a
      href="https://.../civic-campaign/civic-monitor-and-request/03-budget-status-2026"
      >Statusul bugetului pe 2026</a
    >
  </p>
  <p>Provocare: Monitorizează și solicită | Modul: Implicare civică</p>
  <p>Rezumat: Verifică dacă bugetul pe 2026 a fost publicat de primărie</p>
</div>

<h2>Următorii pași recomandați</h2>
<div>
  <p>
    <a
      href="https://.../civic-campaign/civic-monitor-and-request/04-debate-request"
      >Cererea de dezbatere publică</a
    >
  </p>
  <p>
    Context: Învață cum să soliciti oficial o dezbatere pe buget la primărie
  </p>
</div>
<div>
  <p>
    <a
      href="https://.../civic-campaign/civic-participate-and-act/05-participation-report"
      >Raport de participare</a
    >
  </p>
  <p>Context: Documentează cum ai participat la dezbaterea bugetului local</p>
</div>
<div>
  <p>
    <a
      href="https://.../civic-campaign/civic-participate-and-act/06-contestation"
      >Contestația bugetului local</a
    >
  </p>
  <p>Context: Descoperă cum să formulezi o contestație pe buget</p>
</div>

<h2>Explorează mai mult</h2>
<ul>
  <li>
    <a href="https://.../primarie/12345678/buget/provocari"
      >Vezi toate provocările</a
    >
  </li>
  <li>
    <a href="https://.../primarie/12345678">Date deschise pentru București</a>
  </li>
</ul>

<footer>
  <p>Primești acest email pentru că urmărești București.</p>
  <p><a href="https://.../unsubscribe">Dezabonare</a></p>
</footer>
```
