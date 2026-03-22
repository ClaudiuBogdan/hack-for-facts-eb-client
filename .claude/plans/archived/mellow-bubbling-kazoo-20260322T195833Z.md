# Plan: Redesign Civic Campaign Module with Quality Content

## Context

The interactive components (`BudgetStatusReport`, `DebateRequestForm`, `ParticipationReport`, `ContestationBuilder`) and shared infrastructure (`use-campaign-challenge-form.ts`, `mailto-utils.ts`, `CampaignChallengeFormShell.tsx`, `types.ts`) are already implemented and registered in both the campaign registry and the challenge step MDX pipeline.

The problem: the civic-campaign module JSON and MDX step content were created as minimal stubs. Each challenge had only 1 step with 30 lines of placeholder content. The existing modules (budget-basics, read-local-execution) set a much higher quality bar:
- `stepType: "sectioned"` with 4-5 `## ` sections per step
- One quiz per section for comprehension
- `<ExpandableHint>` for legal references
- Rich pedagogical writing: one concept per section, conversational tone, practical examples
- 80-110 lines per step MDX file

Additionally, the module is missing an **introduction challenge** that orients users, explains the campaign, and links to the other learning modules.

## What to change

### 1. Redesign `civic-campaign.json` module structure

The module should have **3 challenges** (groups of steps), structured to mirror the real civic journey:

**Challenge 1: "Introducere si orientare" (Introduction)** - 2 steps
- Step 1: "Despre aceasta provocare" - What the campaign is, why it matters, the legal timeline, how the module works. Links to budget-basics and read-local-execution modules. No interactive component, just orientation text + quiz.
- Step 2: "Calendarul bugetar si drepturile tale" - The legal budget calendar (Legea 273/2006 deadlines), citizen rights (Legea 52/2003 transparency), what actions are time-sensitive. Quiz to verify understanding.

**Challenge 2: "Monitorizeaza si solicita" (Monitor and Request)** - 2 steps
- Step 1: "Statusul bugetului pe 2026" - Guide user to find the budget, explain draft vs approved, then embed `<BudgetStatusReport>`. Sections: context, where to look, what stages exist, the form, MarkComplete.
- Step 2: "Cererea de dezbatere publica" - Explain the legal right to request debate (Legea 52/2003), what the email should contain, the two paths (NGO vs platform), then embed `<DebateRequestForm>`. Sections: legal basis, what to prepare, the form, MarkComplete.

**Challenge 3: "Participa si actioneaza" (Participate and Act)** - 2 steps
- Step 1: "Raport de participare la dezbatere" - What to observe during a debate, what makes a good debate, then embed `<ParticipationReport>`. Sections: preparation, what to observe, the report form, MarkComplete.
- Step 2: "Contestatia bugetului local" - When and how to contest, the legal framework (art. 39 Legea 273/2006), structure of a good contestation, then embed `<ContestationBuilder>`. Sections: legal right, how to structure, the form, MarkComplete.

### 2. Rewrite all step MDX files

Every step must follow the established quality conventions:
- Frontmatter: `title` + `stepType: "sectioned"`
- 4-5 `## ` sections, each introducing one concept
- At least 1 `<Quiz>` per step (intro steps: 2-3 quizzes; action steps: 1 quiz + interactive form)
- `<ExpandableHint>` for legal references
- Conversational Romanian writing, short paragraphs, no jargon
- 80-110 lines per file
- `<MarkComplete>` as the final element

### 3. Files to modify

**Rewrite** (module JSON):
- `src/content/challenges/modules/civic-campaign.json`

**Rewrite** (step MDX content - all 6 steps):
- `src/content/challenges/steps/civic-campaign/01-about-this-challenge/index.ro.mdx` (new)
- `src/content/challenges/steps/civic-campaign/02-budget-calendar-and-rights/index.ro.mdx` (new)
- `src/content/challenges/steps/civic-campaign/03-budget-status-2026/index.ro.mdx` (replaces 01-budget-status)
- `src/content/challenges/steps/civic-campaign/04-debate-request/index.ro.mdx` (replaces 02-debate-request)
- `src/content/challenges/steps/civic-campaign/05-participation-report/index.ro.mdx` (replaces 03-participation)
- `src/content/challenges/steps/civic-campaign/06-contestation/index.ro.mdx` (replaces 04-contestation)

**Delete** (old stub directories):
- `src/content/challenges/steps/civic-campaign/01-budget-status/`
- `src/content/challenges/steps/civic-campaign/02-debate-request/`
- `src/content/challenges/steps/civic-campaign/03-participation/`
- `src/content/challenges/steps/civic-campaign/04-contestation/`

**No changes needed** to React components, hooks, or registries (those are already done correctly).

## Step content outlines

### Step 1: "Despre aceasta provocare"
```
## De ce conteaza bugetul local?
  - Bugetul local nu e un document abstract. E planul prin care primaria ta decide ce se repara, ce se construieste, ce se amana.
  - Quiz: ce este bugetul local (recall from budget-basics)

## Ce este provocarea civica?
  - Campania Bugete Locale 2026 te ghideaza sa citesti, sa intrebi si sa actionezi
  - Calendarul: bugetele se discuta in primele luni ale anului
  - Quiz: ce poti face ca cetatean in perioada de consultare

## Cum te descurci in acest modul?
  - 3 provocari: monitorizare, solicitare, participare si actiune
  - Poti naviga inainte si inapoi. Daca vrei sa intelegi mai bine bugetul, incearca "Bazele bugetului local" sau "Citeste executia locala"
  - ExpandableHint: ce legi te protejeaza (Legea 52/2003, Legea 273/2006, Legea 544/2001)

## Esti pregatit?
  - Recapitulare: ce vei face in modulul acesta
  - Quiz: care este primul pas pe care il poti face
  - MarkComplete
```

### Step 2: "Calendarul bugetar si drepturile tale"
```
## Ciclul bugetar in Romania
  - Bugetul national se aproba -> primarii au 15 zile -> proiectul de buget local
  - Quiz: cine propune bugetul local

## Termenele legale
  - 15 zile: publicare proiect
  - 15 zile: perioada de contestatii
  - 5 zile: depunere spre aprobare
  - 10 zile: adoptare
  - Quiz: cat dureaza intregul proces

## Drepturile tale ca cetatean
  - Legea 52/2003: dreptul la informare si consultare
  - Legea 273/2006: dreptul de a contesta bugetul
  - Orice ONG poate solicita organizarea dezbaterii publice
  - ExpandableHint: articolele relevante din legi
  - Quiz: ce se intampla daca un ONG solicita dezbatere

## De ce conteaza termenele?
  - Actiunile civice sunt legate de calendar
  - Dupa termenele legale, nu mai poti contesta
  - MarkComplete
```

### Steps 3-6: same pattern but with the interactive form as the central section
Each action step has:
- 2-3 context/educational sections with quizzes
- 1 section with the interactive form component
- 1 closing section with ExpandableHint + MarkComplete

## Verification

1. `yarn typecheck` - zero errors
2. `yarn i18n:extract && yarn i18n:compile` - extract new strings
3. `npx vitest run src/features/challenges src/features/campaigns` - all tests pass
4. `yarn dev` - navigate to `/primarie/{cui}/buget/provocari` and verify:
   - Civic Campaign module appears first
   - 3 challenges visible (intro, monitor+request, participate+act)
   - Each step renders as sectioned (paginated sections)
   - Quizzes work, MarkComplete works
   - Interactive forms render and function within their steps
