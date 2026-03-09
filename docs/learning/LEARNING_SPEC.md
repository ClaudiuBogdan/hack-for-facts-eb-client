# Technical Specification: Public Budget Learning Platform

**Version:** 2.2
**Status:** Draft
**Last Updated:** December 2024
**Context:** Civic Education on Romanian Public Budget & Law

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Functional Requirements](#2-functional-requirements)
3. [Data Models](#3-data-models)
4. [Architecture](#4-architecture)
5. [Folder Structure](#5-folder-structure)
6. [Progress & State Management](#6-progress--state-management)
7. [Internationalization](#7-internationalization)
8. [Assessment & Trust Model](#8-assessment--trust-model)
9. [Certification System](#9-certification-system)
10. [Performance & SEO](#10-performance--seo)
11. [Security Considerations](#11-security-considerations)
12. [Testing Requirements](#12-testing-requirements)
13. [Implementation Phases](#13-implementation-phases)
14. [Related Documents](#14-related-documents)

---

## 1. System Overview

### Goal

Build a friction-free, interactive educational platform that demystifies the Romanian public budget. The system prioritizes a **"Frictionless Learning Loop"**: users start learning immediately as guests, engage with interactive content, and are incentivized to register only to save progress and claim certifications.

### Core Principles

1.  **Frictionless Entry**: Zero barriers. No login required to access content.
2.  **Content-First**: Narrative-driven learning (MDX) with embedded React components.
3.  **Progressive Enhancement**: Seamless transition from Guest (localStorage) to Authenticated User (Database).
4.  **Advisory Navigation**: Prerequisites are suggestions, not blockers.

---

## 2. Functional Requirements

### 2.1 Access & Onboarding

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **Frictionless Entry** | Users interact with all content immediately. Progress saved to `localStorage`. | P0 |
| **Role Selection** | Users select persona (Citizen, Journalist, Public Official). | P0 |
| **Auth Sync** | On login, local progress is merged with database progress (Union Merge). | P0 |

### 2.2 Learning Experience

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **Interactive Content** | Simulators, live data, and quizzes embedded directly in MDX. | P0 |
| **Advisory Prerequisites** | Users can jump to any module. UI warns if prerequisites are unmet, but does not block. | P1 |
| **Platform Integration** | Deep links to Budget Explorer and Entity Analytics with pre-configured filters. | P1 |
| **Language Switching** | Full i18n support (en, ro) for UI and Content. | P0 |

### 2.3 Assessment

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **Module Quizzes** | Embedded assessments with multiple question types. | P0 |
| **Mastery Scoring** | 70% score required to mark module as "Passed". | P0 |
| **Infinite Retries** | Focus on learning. No penalties for retries. | P0 |
| **Instant Feedback** | Immediate explanation of correct/incorrect answers. | P0 |

### 2.4 Certification

| Requirement | Description | Priority |
|-------------|-------------|----------|
| **Tiered Certificates** | Bronze (60%), Silver (80%), Gold (100%) based on path completion. | P0 |
| **Public Verification** | Permanent, shareable URL: `/certificates/{uuid}`. | P0 |
| **Social Sharing** | Dynamic OG images for social media previews. | P1 |
| **No Expiration** | Certificates are permanent records of knowledge at the time of issuance. | P1 |

---

## 3. Data Models

All data from `localStorage` and API must be validated using **Zod schemas**. This ensures forward compatibility and handles schema migrations.

### 3.1 Core Entities

```typescript
// Learning Path (Role-based curriculum)
type LearningPath = {
  readonly id: string                    // e.g., "citizen"
  readonly slug: string
  readonly title: TranslatedString
  readonly description: TranslatedString
  readonly modules: ModuleReference[]    // Ordered list
  readonly difficulty: 'beginner' | 'intermediate' | 'advanced'
}

// Module (Atomic learning unit)
type Module = {
  readonly id: string
  readonly slug: string
  readonly title: TranslatedString
  readonly content: string               // MDX file path
  readonly duration: number              // Minutes
  readonly challenges: Challenge[]       // Embedded assessments
  readonly prerequisites: string[]       // Module IDs (Advisory)
}

type Challenge = {
  readonly id: string
  readonly type: 'multiple_choice' | 'multiple_select' | 'fill_blank' | 'interactive'
  readonly question: TranslatedString
  readonly options?: ChallengeOption[]
  readonly correctAnswer: string | string[]
  readonly explanation: TranslatedString
  readonly points: number
}
```

### 3.2 Progress Entities

```typescript
// Module Progress (shared shape for Guest and Auth)
type ModuleProgress = {
  readonly moduleId: string
  readonly status: 'not_started' | 'in_progress' | 'completed' | 'passed'
  readonly score?: number                // Best score (0-100)
  readonly lastAttemptAt: string         // ISO Date - used for merge tie-breaking
  readonly completedAt?: string          // ISO Date
  readonly contentVersion: string        // Git hash or semver at time of completion
}

// User Progress (DB - Authenticated)
type UserProgress = {
  readonly userId: string
  readonly pathId: string
  readonly moduleProgress: ModuleProgress[]
  readonly lastSyncedAt: string          // ISO Date
}

// Guest Progress (localStorage)
// Note: `version` field enables schema migrations
type GuestProgress = {
  readonly version: number               // Schema version (e.g., 1)
  readonly paths: Record<string, {
    readonly modules: Record<string, ModuleProgress>
  }>
  readonly lastUpdated: string           // ISO Date
}
```

### 3.3 Certificate Entities

```typescript
type Certificate = {
  readonly id: string                    // UUID
  readonly userId: string
  readonly pathId: string
  readonly recipientName: string
  readonly tier: 'bronze' | 'silver' | 'gold'
  readonly completionPercentage: number
  readonly issuedAt: string              // ISO Date
  readonly verificationUrl: string
}
```

---

## 4. Architecture

### 4.1 Four Engines

The implementation is divided into four distinct engines:

1.  **Content Engine**: Lazy-loads locale-specific MDX files.
2.  **Progress Engine**: Manages dual-store (localStorage/API) and sync logic.
3.  **Assessment Engine**: Handles quiz state and client-side scoring.
4.  **Certification Engine**: Handles eligibility checks and certificate generation.

### 4.2 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React SPA)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Content    │  │   Progress   │  │   Certification      │   │
│  │   Engine     │  │   Engine     │  │   Engine             │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│         │                 │                    │                 │
│         ▼                 ▼                    ▼                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    State Layer                            │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐  │   │
│  │  │ TanStack   │  │ localStorage│  │   URL State        │  │   │
│  │  │ Query      │  │ (guests)   │  │   (TanStack Router)│  │   │
│  │  └────────────┘  └────────────┘  └────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        CONTENT LAYER (Git)                       │
│  MDX Files are the source of truth for learning content.        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Folder Structure

We follow a **Feature-based architecture**.

```text
src/
├── content/                        # Repository for MDX content
│   └── learning/
│       ├── paths/                  # JSON definitions (citizen.json, journalist.json)
│       └── modules/                # MDX files organized by module ID
│           └── budget-basics/
│               ├── index.en.mdx
│               └── index.ro.mdx
│
├── features/
│   └── learning/                   # Core Feature Module
│       ├── components/             # Domain-specific UI
│       │   ├── player/             # ModulePlayer, PathVisualizer
│       │   ├── assessment/         # Quiz, Challenge, FeedbackCard
│       │   ├── certificates/       # CertificateCard, VerificationBadge
│       │   └── interactive/        # Embedded MDX components (Simulators)
│       ├── hooks/
│       │   ├── use-learning-progress.ts  # Main hook (Guest/Auth abstraction)
│       │   ├── use-module-content.ts     # MDX loader with locale
│       │   └── use-assessment.ts         # Quiz state machine
│       ├── utils/
│       │   ├── progress-merge.ts   # Union Merge algorithm (PURE function)
│       │   └── scoring.ts          # Score calculation logic
│       ├── schemas/                # Zod schemas for data validation
│       │   └── progress.ts
│       └── types.ts                # Domain types
│
├── routes/
│   └── learning/                   # TanStack Router definitions
│       ├── index.tsx               # Learning Hub (Path selection)
│       ├── $pathId.tsx             # Path Overview
│       ├── $pathId.$moduleId.tsx   # Active Module Player
│       └── certificates.$id.tsx    # Public Verification Page
│
└── schemas/                        # Global Zod schemas (if needed)
```

---

## 6. Progress & State Management

### 6.1 Dual-Store Strategy

*   **Guest Users**: Progress is stored in `localStorage` under key `learning_progress`.
*   **Authenticated Users**: Progress is stored in the database via GraphQL API.
*   **Orchestration**: `useLearningProgress()` hook abstracts the underlying store. It uses TanStack Query for data fetching and caching.

### 6.2 Union Merge Algorithm (Guest → Auth)

When a guest user logs in, the merge is performed **once**. The result is sent to the server, and upon successful acknowledgment, the local guest data is cleared.

**Rules (Deterministic & Idempotent):**

1.  **Status Precedence**: `Passed` > `Completed` > `In Progress` > `Not Started`.
2.  **Score Resolution**: If statuses are equal, `max(local.score, remote.score)` wins.
3.  **Tie-Breaker**: If status and score are equal, `max(local.lastAttemptAt, remote.lastAttemptAt)` determines the winner.
4.  **Content Versioning (MVP)**: Ignore `contentVersion` conflicts; assume backward compatibility.

**Flow:**

```
1. User Logs In
2. Fetch RemoteProgress from API
3. Read LocalProgress from localStorage (Validate with Zod)
4. Compute MergedProgress = merge(Remote, Local)  // Pure function
5. POST MergedProgress to API
6. On API Success: Clear localStorage key
```

### 6.3 Completion Criteria

We **reject** "Scroll Depth" as a completion metric due to accessibility and reliability concerns.

**Module Completion Requires Explicit Action:**

*   **For Quiz Modules**: Passing the Quiz (Score >= 70%).
*   **For Content-Only Modules**: User clicks "Mark as Complete" button.

---

## 7. Internationalization

We use a **Hybrid Approach** to separate "Content" from "UI Chrome".

### 7.1 Narrative Content (MDX)

Strict file separation per locale. This is necessary because translating long-form prose via string keys is unmaintainable.

```
src/content/learning/modules/budget-basics/
├── index.en.mdx    # English narrative
└── index.ro.mdx    # Romanian narrative
```

### 7.2 UI Chrome (Lingui)

Buttons, navigation labels, generic feedback ("Correct!", "Try Again") are managed via standard Lingui `.po` files.

### 7.3 Embedded Components in MDX

Components like `<Quiz>` receive their text props *from the MDX file itself*. Since the MDX file is already locale-specific, the content is inherently localized.

```mdx
// In index.ro.mdx
<Quiz question="Ce procent din PIB trece prin bugetele publice?" ... />
```

---

## 8. Assessment & Trust Model

### 8.1 Client-Side Scoring

Quizzes are scored client-side for **immediate feedback** (zero latency). This is a UX priority.

### 8.2 Security Risk

A user can manipulate `localStorage` or use DevTools to fake a score.

### 8.3 Mitigation Strategy (MVP)

Certificates in this context are "soft credentials" for educational encouragement. We accept limited risk:

*   **Rate Limiting**: The "Claim Certificate" API endpoint is strictly rate-limited (e.g., 5 claims/hour/user).
*   **Backend Sanity Check**: Backend verifies that the `completedAt` timestamp is plausible.
*   **Future Enhancement**: For higher-stakes credentials, submit signed quiz answers to the server for re-scoring.

---

## 9. Certification System

### 9.1 Tiers

| Tier | Threshold | Color |
|------|-----------|-------|
| **Bronze** | 60% Path Completion | `#CD7F32` |
| **Silver** | 80% Path Completion | `#C0C0C0` |
| **Gold** | 100% Path Completion | `#FFD700` |

### 9.2 Generation Flow

1.  User clicks "Claim Certificate" (requires authentication).
2.  **Backend Eligibility Check**: Verify completion %.
3.  **Honor Code Modal**: User enters name and accepts disclaimer.
4.  **Generation**: Create UUID record in DB.
5.  **Redirect**: Navigate to `/certificates/:uuid`.

### 9.3 Certificate Immutability

*   Certificates are **immutable** once issued.
*   They do **not expire**.

---

## 10. Performance & SEO

### 10.1 Performance Targets

*   **LCP**: < 2.5s (via lazy-loading modules).
*   **Initial Bundle**: < 100kb (via code-splitting per route).

### 10.2 SEO Strategy for Certificates

**Problem**: An SPA cannot render dynamic OG tags for social media crawlers (`facebookbot`, `twitterbot`).

**Solution**: The `/certificates/:id` route requires special handling.

*   **Option A (Recommended)**: Use an SSR/edge/backend endpoint to serve `index.html` with dynamically injected `<meta og:...>` tags based on the `id` parameter. The React app then hydrates normally.
*   **Option B (Fallback)**: Accept static, generic OG tags if pure SPA hosting is required.

---

## 11. Security Considerations

### 11.1 Data Protection

*   Guest progress is client-side only; no server storage.
*   No Personally Identifiable Information (PII) in analytics events.
*   `localStorage` data is validated with Zod on read (treat as untrusted input).

### 11.2 Certificate Integrity

*   **Rate Limiting**: Strict limit on certificate generation.
*   **Verification**: Public URL validates authenticity against DB.
*   **Immutability**: Issued certificates cannot be modified.

---

## 12. Testing Requirements

Testing is a **hard requirement** for this module. We follow a Testing Pyramid.

### 12.1 Unit Tests (Vitest)

Focus on pure logic and algorithms.

| Test File | Purpose |
|-----------|---------|
| `progress-merge.test.ts` | Exhaustive tests for the merge algorithm. Cover status precedence, score tie-breaks, and idempotency (`merge(merge(a,b), b) === merge(a,b)`). |
| `scoring.test.ts` | Verify score calculation for single/multi-select questions. |
| `schemas/progress.test.ts` | Verify Zod schema parsing and migration from old `version` payloads. |

### 12.2 Integration Tests (Vitest + Testing Library)

Focus on component behavior and hook logic.

| Test File | Purpose |
|-----------|---------|
| `Quiz.test.tsx` | Render quiz, simulate clicks, assert feedback UI, verify `onComplete` callback with correct score. |
| `useLearningProgress.test.tsx` | Mock `localStorage` and API. Verify `saveProgress` writes to the correct store based on auth status. |

### 12.3 E2E Tests (Playwright)

Focus on critical user journeys.

| Test | Description |
|------|-------------|
| **Guest Flow** | Start module as guest -> Complete quiz -> Verify `localStorage` is updated. |
| **Auth Sync Flow** | Complete module as guest -> Login (mocked) -> Verify progress appears in authenticated UI. |
| **Certificate Verification** | Visit a valid certificate URL -> Verify visual rendering. |

---

## 13. Implementation Phases

### Phase 1: Foundation (MVP)

*   [ ] Create folder structure and base types/schemas.
*   [ ] Implement `progress-merge.ts` with unit tests.
*   [ ] Implement `useLearningProgress` hook (localStorage only).
*   [ ] Build `Quiz` component with integration tests.
*   [ ] Build `ModulePlayer` with MDX rendering.
*   [ ] Create Learning Hub and Module routes.

### Phase 2: Auth & Sync

*   [ ] Integrate API for authenticated progress storage.
*   [ ] Implement Guest-to-Auth Merge flow.
*   [ ] Add E2E test for sync flow.

### Phase 3: Certification

*   [ ] Build Certificate generation API endpoint.
*   [ ] Build `/certificates/:id` verification page.
*   [ ] Implement OG tag injection (Edge Function or backend).

### Phase 4: Polish & Interactivity

*   [ ] Add advanced interactive components (BudgetSimulator).
*   [ ] Add Platform CTAs (deep links to Budget Explorer).
*   [ ] Performance tuning and analytics.

---

## 14. Related Documents

*   [Citizen Curriculum Spec](./roles/citizen/citizen-spec.md)
*   [Journalist Curriculum Spec](./roles/journalist/journalist-spec.md)
*   [Public Official Curriculum Spec](./roles/public-official/public-official-spec.md)
*   [Platform CLAUDE.md](/CLAUDE.md)
