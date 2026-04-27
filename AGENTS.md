# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Transparenta.eu is a platform for analyzing public budget data, targeting public sector and independent journalists who need an easy and accessible way of finding anomalies in public spending. The platform allows users to explore budget data using an intuitive interface with advanced filters, anomaly detection, and AI-powered query generation.

## Tech Stack

- **Frontend**: React 19 with TypeScript
- **Styling**: Tailwind CSS v4, shadcn UI components (Radix UI primitives)
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: TanStack Router (file-based routing)
- **Build Tool**: Vite
- **Data Visualization**: Recharts, D3-Sankey, Visx, Leaflet/React-Leaflet
- **i18n**: Lingui (PO format, locales: en, ro)
- **Authentication**: Clerk
- **Error Tracking**: Sentry
- **Analytics**: PostHog (with consent management)
- **Testing**: Vitest, Playwright, Testing Library

## Development Commands

### Core Commands

```bash
yarn dev                  # Start development server
yarn build                # Build for production (includes i18n compile and docs)
yarn typecheck            # Type-check without emitting (always run before finishing)
yarn test                 # Run Vitest unit tests
yarn test:watch           # Run tests in watch mode
yarn test:coverage        # Generate test coverage report
yarn preview              # Preview production build locally
```

### Type Checking

**CRITICAL**: Always run `yarn typecheck` before completing any task. Fix all type errors before considering work complete.

### Internationalization (i18n)

```bash
yarn i18n:extract         # Scan code for Lingui message IDs and update .po files
yarn i18n:compile         # Compile translated catalogs into runtime assets
yarn i18n:clean           # Remove obsolete/unused message IDs from catalogs

Don't modify the .po files manually. 
```

**i18n Workflow**:

1. Add messages in code using `t\`text\`` or `<Trans>text</Trans>`
2. Run `yarn i18n:extract` to update .po files in `src/locales/{locale}/messages.po`
3. Translate in .po files
4. Run `yarn i18n:compile` to prepare runtime assets

### E2E Testing

```bash
yarn test:e2e             # Run Playwright E2E tests
yarn test:e2e:ui          # Open Playwright UI mode
yarn test:e2e:debug       # Debug E2E tests
```

### Documentation

```bash
yarn docs:start           # Start Docusaurus dev server
yarn docs:build           # Build documentation site
```

## Architecture

### Directory Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn UI components (Radix primitives + Tailwind)
│   ├── filters/        # Filter components (entity, county, period, etc.)
│   ├── budget-explorer/# Budget visualization components (treemaps, breakdowns)
│   ├── charts/         # Chart components and renderers
│   ├── maps/           # Leaflet map components
│   ├── sidebar/        # App sidebar navigation
│   └── tables/         # Data table components
├── routes/             # TanStack Router file-based routes
│   └── __root.tsx      # Root route with providers (i18n, theme, query, error)
├── features/           # Feature-specific modules (alerts, notifications)
│   └── {feature}/
│       ├── api/        # API calls for feature
│       ├── hooks/      # Feature-specific hooks
│       └── components/ # Feature-specific components
├── hooks/              # Global custom hooks
├── lib/                # Utility libraries and helpers
│   ├── api/           # API client modules (graphql, charts, entities, etc.)
│   ├── hooks/         # Reusable hooks (debounce, persisted state, etc.)
│   ├── logger/        # Structured logging
│   └── errors/        # Error handling utilities
├── contexts/           # React contexts (ErrorContext)
├── schemas/            # Zod schemas for validation
├── types/              # TypeScript type definitions
├── locales/            # i18n catalogs (en, ro)
│   └── {locale}/messages.po
└── config/             # Configuration files
```

### Key Architectural Patterns

#### Data Flow

1. **GraphQL API**: All backend communication uses GraphQL via `src/lib/api/graphql.ts`
   - Simple fetch-based client with Clerk authentication
   - Automatic error handling and logging
   - Token management via `getAuthToken()`

2. **State Management**:
   - **Server State**: TanStack Query (`@tanstack/react-query`)
   - **Local State**: React hooks (`useState`, `useReducer`)
   - **URL State**: TanStack Router search params for filters
   - **Persisted State**: `usePersistedState` hook for localStorage

3. **Filter System**:
   - URL-based filter state (search params)
   - Each filter component in `src/components/filters/` manages its own state
   - Base filter pattern in `src/components/filters/base-filter/`
   - Filter utilities in `src/lib/filterUtils.ts`

#### Classification System

- Functional classifications (budget categories) in `src/lib/classifications.ts`
- Economic classifications in `src/lib/economic-classifications.ts`
- JSON data files in `src/assets/` with i18n support
- Hierarchical structure with parent/child relationships

#### Error Handling

- Centralized error handling via `ErrorContext` (`src/contexts/ErrorContext.tsx`)
- Custom `AppError` class with error types, codes, and severity
- Integration with Sentry for error tracking
- Structured logging via `src/lib/logger/`

#### Analytics & Consent

- PostHog integration via `src/lib/analytics.ts`
- Consent management in `src/lib/consent.ts`
- Analytics only fire if user has granted consent
- Cookie consent banner component

## React Development Standards

### Component Structure

- **Always use functional components** with hooks (never class components)
- **Named exports** (not default exports)
- **TypeScript**: No `any` types, explicit prop types, use `readonly` for immutability
- **File naming**: PascalCase for components (`UserProfile.tsx`), kebab-case for utilities (`chart-utils.ts`)

### Component Template

```typescript
import { useState } from 'react'
import { Button } from '@/components/ui/button'

type Props = {
  readonly title: string
  readonly onClick: () => void
}

export function MyComponent({ title, onClick }: Props) {
  const [state, setState] = useState(false)

  return <Button onClick={onClick}>{title}</Button>
}
```

### Performance

- Minimize `useEffect` and `useState` usage
- Use `React.memo` sparingly (React 19 compiler handles most optimization)
- Use `React.lazy` for code-splitting heavy components
- Prefer server-side data fetching with TanStack Query

### UI Components

1. **Always check shadcn UI first** before creating custom components
2. Use Tailwind utility classes exclusively (no custom CSS)
3. Mobile-first responsive design
4. Leverage Radix UI primitives via shadcn for accessibility

### Naming Conventions

- **Variables/Functions**: camelCase (`getUserData`)
- **Components**: PascalCase (`UserProfile`)
- **Files**: kebab-case (`user-profile.tsx`)
- **Constants**: UPPER_CASE (`MAX_ITEMS`)
- **Directories**: kebab-case (`budget-explorer/`)

## AI Filter Generator

The platform includes natural language filter generation:

- Users enter queries like "Show me education spending in Cluj from last year"
- Server-side OpenAI integration generates structured filter JSON
- Filters validated with Zod and applied to data discovery
- Implementation in `src/lib/api/` and filter components

## Environment Variables

```bash
# API
VITE_API_URL=http://localhost:3000

# Sentry
VITE_SENTRY_ENABLED=true
VITE_SENTRY_DSN=your_public_dsn
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
VITE_SENTRY_FEEDBACK_ENABLED=true

# HTTPS (optional, run ./ssl.sh to generate certs)
HTTPS_ENABLED=true
```

## Important Notes

1. Always run `yarn check` when you are done with all the changes
2. **i18n**: Mark all user-facing text for translation with Lingui macros
3. **Accessibility**: Use semantic HTML and Radix UI primitives for keyboard navigation and ARIA
4. **Error Boundaries**: All major routes should handle errors gracefully
5. **Consent**: Check analytics consent before firing PostHog events
6. **Authentication**: Use Clerk for auth, tokens managed automatically
7. **Manual Testing Preferred**: Focus on manual testing over automated tests unless specified

## Common Patterns

### API Calls

```typescript
import { graphqlRequest } from '@/lib/api/graphql'

const query = `query GetData { ... }`
const data = await graphqlRequest<ResponseType>(query, variables)
```

### TanStack Query Hook

```typescript
import { useQuery } from '@tanstack/react-query'

export function useEntityData(cui: string) {
  return useQuery({
    queryKey: ['entity', cui],
    queryFn: () => fetchEntityData(cui),
  })
}
```

### Error Handling

```typescript
import { useErrorHandler } from '@/contexts/ErrorContext'

const { handleError } = useErrorHandler()

try {
  // operation
} catch (error) {
  handleError(error as Error, 'feature-name')
}
```

### Toast Notifications

```typescript
import { toast } from 'sonner'

toast.success('Operation successful')
toast.error('Something went wrong')
toast.warning('Please check your input')
```

## Budget Explorer Components

The budget explorer (treemaps, breakdowns) is in `src/components/budget-explorer/`:

- `BudgetTreemap.tsx`: Interactive hierarchical budget visualization
- `SpendingBreakdown.tsx`: Spending analysis by category
- `RevenueBreakdown.tsx`: Revenue analysis by category
- `budget-transform.ts`: Data transformation utilities
- Uses economic classifications (ec) and functional classifications (fn)
- Supports normalization (per capita, total, euro)
