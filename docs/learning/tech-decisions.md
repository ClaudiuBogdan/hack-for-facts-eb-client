# Tech Decisions

This document captures the architecture and key implementation decisions for the Learning feature, with emphasis on separation of concerns, type-safe progress persistence, and a verifiable certification workflow.

## Goals

- Deliver a smooth learning experience with fast client-side feedback.
- Persist progress for guests (local) and authenticated users (API) with deterministic merge-on-login.
- Keep the feature modular and testable (pure merge/scoring logic + component-level tests + E2E critical flows).
- Support localized learning content (RO/EN) without introducing inconsistent i18n patterns.
- Enable public certificate verification with reliable metadata (OG tags) and a tamper-resistant eligibility check.

## Non-Goals (for v1)

- Full SSR for the entire learning section.
- Fine-grained “watched/read” analytics that implies comprehension.
- Complex adaptive learning paths or recommendation systems.

---

## 1. Main Building Blocks

We will divide the implementation into four distinct engines to maintain separation of concerns:

1. **Content Engine**
   - Lazy-load MDX modules and resolve locale-specific content.
   - Render the Module Player (MDX + embedded interactive components).
   - Establish a clear convention for i18n:
     - Long-form learning content lives in locale-specific MDX files (e.g. `index.ro.mdx`).
     - UI chrome (buttons, error states, navigation labels) uses Lingui `t` / `<Trans>`.
2. **Progress Engine**
   - The “brain” of the module.
   - Owns the dual-store strategy:
     - Guests: `localStorage` (validated + versioned).
     - Auth users: API-backed store (source of truth after login).
   - Implements deterministic, idempotent **Union Merge** rules when auth state changes.
3. **Assessment Engine**
   - Manages quiz state, scoring logic, and retry mechanisms.
   - Client-side for immediate UX feedback.
   - Important boundary: assessment UX can be client-side, but **certificate eligibility must be verified server-side** (see Certification Engine).
4. **Certification Engine**
   - Handles the “Claim” workflow, eligibility checks, issuance, and the public verification page.
   - Eligibility is evaluated on the server using authoritative rules (at minimum: recompute eligibility from recorded attempts / answers).
   - Public verification page must be shareable and reliably expose OG tags (requires an HTML strategy; see “Routing & SEO/OG”).

---

## 2. Folder Structure

We will follow a **feature-based architecture** (`src/features/learning`) to keep domain logic encapsulated, while using `src/routes` for navigation and `src/content` for the actual MDX files.

```text
src/
├── content/                        # NEW: Repository for MDX content
│   └── learning/
│       ├── paths/                  # JSON definitions of paths (citizen, journalist)
│       └── modules/                # MDX files organized by module ID
│           └── budget-basics/
│               ├── index.en.mdx
│               └── index.ro.mdx
│
├── features/
│   └── learning/                   # NEW: Core Feature Module
│       ├── components/             # Domain-specific UI
│       │   ├── player/             # Module Player, Navigation, Progress Bar
│       │   ├── assessment/         # Quiz, Challenge, FeedbackCard
│       │   ├── certificates/       # CertificateCard, VerificationBadge
│       │   └── interactive/        # Embedded MDX components (Simulators)
│       ├── hooks/                  # Logic & State
│       │   ├── use-learning-progress.ts  # Unified progress API (Guest/Auth abstraction)
│       │   ├── use-module-content.ts     # MDX loader (locale-aware)
│       │   └── use-assessment.ts         # Quiz state machine
│       ├── schemas/                # Zod schemas (localStorage + API payloads)
│       │   └── learning-progress.ts
│       ├── utils/
│       │   ├── progress-merge.ts   # Deterministic merge algorithm
│       │   └── scoring.ts          # Score calculation logic
│       └── types.ts                # Domain types (Module, Progress, etc.)
│
└── routes/
    └── learning/                   # TanStack Router definitions
        ├── index.tsx               # Learning Hub (Path selection)
        ├── $pathId.tsx             # Path Overview
        ├── $pathId.$moduleId.tsx   # Active Module Player
        └── certificates.$id.tsx    # Public Verification Page
```

Notes:

- `schemas/learning-progress.ts` exists to treat localStorage as untrusted input (corruption, old schema, manual edits) and to support safe migrations.
- The Progress Engine should integrate with TanStack Query so UI can use one mental model for async state and caching.

---

## 3. Key Components & Logic

### A. Progress Context (`LearningProgressContext`)

Instead of prop-drilling, we’ll wrap the learning routes in a provider that exposes a unified interface:

- `progress`: the current state (already merged).
- `saveProgress(input)`: writes to the correct store (guest vs auth) and updates the unified view.
- `sync()`: triggered on auth state changes; performs merge-on-login.
Implementation note (recommended):
- Internally, back this with TanStack Query (query + mutation) so:
  - Auth changes naturally invalidate/refetch.
  - Optimistic updates are straightforward.
  - Error/loading states remain consistent.

### B. Progress Data Model (Decision)

The progress model must be stable, versioned, and merge-friendly.
Minimum required fields per module:

- `moduleId: string`
- `status: "not_started" | "in_progress" | "completed" | "passed"`
- `bestScore?: number` (0-100)
- `attemptsCount: number`
- `lastAttemptAt?: string` (ISO)
- `completedAt?: string` (ISO)
- `contentVersion: string` (e.g. module revision; used to detect major quiz/content changes)
- `updatedAt: string` (ISO)
Storage details:
- Guest storage uses a single namespaced key (e.g. `learningProgress:v1`) to make migrations and clearing safe.
- Parse + validate + migrate on read using Zod; never trust raw JSON.

### C. Union Merge Rules (`progress-merge.ts`) (Decision)

Merge must be:

- **Deterministic**: the same inputs always produce the same output.
- **Idempotent**: merging multiple times does not change results after the first successful merge.
Recommended precedence rules:

1. **Content version compatibility**
   - If `contentVersion` differs and indicates a breaking content/quiz change, the merge strategy must be explicit:
     - Either preserve completion but reset score, or
     - Reset status to `in_progress` and require retake.
   - For v1: prefer preserving completion signals, but do not blindly carry forward scores across incompatible versions.
2. **Status precedence**
   - `passed` > `completed` > `in_progress` > `not_started`.
3. **Score merge**
   - Keep `max(bestScore)` when versions are compatible.
4. **Timestamps / recency**
   - Use `updatedAt` to resolve ties for fields that are not covered by precedence rules.
5. **Auth transition (guest → auth)**
   - On first login after guest activity:
     - Merge guest progress into server progress.
     - Only clear guest localStorage after the server confirms persistence.

### D. Record Identity and Validation Constraints (Decision)

Two implementation constraints are easy to miss and must be treated as hard rules:

1. **Interactive record identity is `interactionId + scope`**
   - `lessonId` is payload metadata and does not participate in storage identity.
   - Runtime-generated interactions must therefore be globally unique before scope is applied.
   - For challenge/runtime interactions, the recommended pattern is to namespace ids by `stepId`.
   - `entityCui` only separates records across entities; it does not prevent collisions between two different step interactions inside the same entity.

2. **Nested wire-schema unions must be safe under Fastify/AJV validation**
   - The learning-progress API validates request bodies through Fastify/AJV.
   - Inner `Type.Union([...])` branches that each use `additionalProperties: false` can be unsafe under `removeAdditional` behavior.
   - In practice, valid payloads can fail if AJV strips branch-specific fields like `entityCui`, `json`, `phase`, or `result` while testing the wrong branch first.
   - Keep outer request objects strict, but design nested union branches so validation does not mutate otherwise valid payloads during branch selection.

### E. The Module Player (`ModulePlayer.tsx`)

A wrapper component that:

1. Suspends while loading MDX.
2. Provides `MDXProvider` with custom embedded components (e.g. `<Quiz />`, `<Simulator />`).
3. Emits progress signals at explicit milestones.
Important UX decision:

- Avoid treating scroll depth as “read/completed”.
- Prefer explicit milestones:
  - “Continue” / “Mark section complete”, or
  - Completion tied to the module quiz / checkpoint.

### F. Quiz Component (`Quiz.tsx`)

A controlled component that takes a `questions` array prop.

- **State**: `currentQuestionIndex`, `answers`, `feedbackStatus`.
- **Output**: calls `onComplete(score)` when finished.
Rules:
- Provide immediate feedback client-side.
- Track attempts and allow retry mechanisms (as specified by module design).

### G. Certification: Trust Boundary (Decision)

Certificates must not rely on client-submitted scores as authoritative truth.

- Client can compute score for immediate feedback.
- Server must verify eligibility for certificate issuance:
  - Either recompute from submitted answers, or
  - Use server-recorded attempt events.

---

## 4. Routing & SEO / OG Metadata (Hard Requirement)

The public certificate verification page must be shareable and expose correct OG tags.
Constraint:

- In a pure SPA, OG tags are not reliably parsed by crawlers/social previews.
Decision (recommended for v1):
- Provide a server/edge-served HTML response for certificate URLs that injects OG metadata.
  - Option A: Backend serves `text/html` for `/learning/certificates/:id` with OG tags and boots the SPA.
  - Option B: A dedicated `/api/certificates/:id/preview` HTML endpoint used for sharing.
The Playwright test should validate the chosen strategy (meta tags present in initial HTML response).

---

## 5. Testing Strategy (Hard Requirement)

We will implement a “Testing Pyramid” strategy.

### Unit Tests (`vitest`)

Focus: pure logic and algorithms.

1. **`progress-merge.test.ts`**
   - Guest has `passed` Module A, Auth has `not_started` → result `passed`.
   - Guest score 50, Auth score 80 (compatible versions) → score 80.
   - Idempotency: `merge(merge(a, b), b)` equals `merge(a, b)`.
   - Version mismatch behavior: verify explicit rule (preserve completion, reset score, etc.).
2. **`scoring.test.ts`**
   - Verify score calculation for mixed question types (single vs multi-select).
   - Verify edge cases: unanswered questions, partial multi-select.
3. **`learning-progress-schema.test.ts`**
   - Parse valid payloads.
   - Reject invalid payloads safely.
   - Migrate old schema versions (if/when introduced).

### Integration Tests (`vitest` + `testing-library`)

Focus: component interaction and hooks.

1. **`Quiz.test.tsx`**
   - Render quiz.
   - Simulate option selection.
   - Assert immediate feedback.
   - Assert `onComplete` score.
2. **`use-learning-progress.test.tsx`**
   - Mock `localStorage` and API.
   - Verify `saveProgress` writes to correct store based on auth status.
   - Verify merge-on-login behavior (guest data is merged then cleared only after success).

### E2E Tests (`playwright`)

Focus: critical user journeys.

1. **The “Guest to Hero” Flow**
   - Start a module as a guest.
   - Complete quiz/checkpoint.
   - Verify `localStorage` is updated.
   - (Mock) Login.
   - Verify merged progress appears in authenticated UI.
2. **Certificate Verification**
   - Visit a valid certificate URL.
   - Verify OG tags are present in the initial HTML response.
   - Verify visual rendering and key facts (name, module/path, issued date).
