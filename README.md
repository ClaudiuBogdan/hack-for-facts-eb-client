## PostHog

Client-side analytics is integrated using `posthog-js` with explicit user consent.

Environment variables (set in Vercel or local `.env`):

```
VITE_POSTHOG_ENABLED=true
VITE_POSTHOG_API_KEY=your_public_project_api_key
VITE_POSTHOG_HOST=https://eu.i.posthog.com
VITE_POSTHOG_PERSON_PROFILES=identified_only
```

Privacy: only custom events + manual `$pageview` are captured (no autocapture, no session recordings). Events only fire if the user opts in to analytics via cookie consent.

## Sentry

Client-side Sentry is integrated using `@sentry/react` with TanStack Router tracing and the user feedback widget.

Environment variables (set in Vercel or local `.env`):

```
VITE_SENTRY_ENABLED=true
VITE_SENTRY_DSN=your_public_dsn
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
VITE_SENTRY_FEEDBACK_ENABLED=true
```

Consent: events and feedback are only sent if analytics consent is granted. The feedback button appears in the footer and can be opened programmatically.

## Discourse Lesson Discussions

Lesson pages can embed a Discourse topic when a lesson has `discourseTopicId` metadata and `VITE_DISCOURSE_BASE_URL` is configured.

Environment variables:

```bash
VITE_DISCOURSE_BASE_URL=https://forum.example.com

# Used only by topic provisioning script
DISCOURSE_BASE_URL=https://forum.example.com
DISCOURSE_API_KEY=your_discourse_api_key
# Must match the user authorized for the API key (usually an admin/mod account)
DISCOURSE_API_USERNAME=your_discourse_username
# Optional: language for topic content sync (en|ro). Default: en
DISCOURSE_LANG=ro
# Optional category id for new topics; if reserved, script retries without category
DISCOURSE_CATEGORY_ID=1
```

Provision topics for a path:

```bash
# Dry-run (default)
yarn discourse:sync-topics --path budget-basics --dry-run

# Persist topic IDs/slugs into path JSON
yarn discourse:sync-topics --path budget-basics --write

# Rewrite already existing topic title/body in Romanian
DISCOURSE_LANG=ro yarn discourse:sync-topics --path budget-basics --write --update-existing-content
```

Thread bodies are generated from lesson MDX content in the selected language (`index.<lang>.mdx`), with fallback to the other locale when missing.

Verification checklist:

1. Open any pilot lesson in `budget-basics` and confirm the discussion block renders.
2. Confirm embedded comments load inline and the fallback forum link is visible.
3. Click `Open discussion on forum` and verify login/reply flow works via Discourse OAuth (Clerk OIDC).

# Transparenta.eu Client

We are building a platform for analyzing public data spending.The target audience is the public sector and independent journalists that need a easy and accessible way of finding anomalies in public spending.

We want to create a anomaly detection features, but also allow the user to explore the data using an intuitive interface. To do that, we want to create a prompt that create interfaces with data, apply advanced filters to query data, etc.

## Tech Stack

- React.js
- Tailwind CSS
- TypeScript
- Shadcn UI
- Tanstack Query
- Tanstack Router
- GraphQL
- Vite

## Getting Started

### Install dependencies

```bash
yarn install
```

### Run the development server

```bash
yarn dev
```

### Build

```bash
yarn build
```

## Internationalization (i18n)

This app uses Lingui for translations. Catalogs live in `src/locales/{locale}/messages.po` and are loaded dynamically via the Vite Lingui plugin.

### Scripts (from `package.json`)

- `yarn i18n:extract`: Scan source files for message IDs and update locale catalogs (adds new keys, keeps obsolete ones).
- `yarn i18n:compile`: Compile translated catalogs into runtime assets used in production.
- `yarn i18n:clean`: Extract and remove obsolete/unused message IDs from catalogs.

Typical workflow:

```bash
# 1) Add or change messages in code
yarn i18n:extract

# 2) Translate .po files in src/locales/{locale}/messages.po

# 3) Optional: validate/prepare runtime assets
yarn i18n:compile
```

### Adding messages in code

Use Lingui macros to mark translatable text:

```tsx
import { t, Trans } from "@lingui/core/macro";

const title = t`Charts`;

export function Example() {
  return <h1><Trans>Welcome to the app</Trans></h1>;
}
```

Run `yarn i18n:extract` after adding messages to update `.po` files.

### Switching locale at runtime

Translations are provided via `I18nAppProvider` and loaded on demand. Call `dynamicActivate(locale)` to switch:

```tsx
import { dynamicActivate } from "@/lib/i18n";

await dynamicActivate("ro"); // e.g., after a user changes language
```

`I18nAppProvider` is already wired in `src/routes/__root.tsx`.

### Adding a new locale

1. Update `locales` in `lingui.config.ts` (e.g., `["en", "ro", "de"]`).
2. Run `yarn i18n:extract` to create `src/locales/{new-locale}/messages.po`.
3. Translate the new `.po` file and run `yarn i18n:compile`.

Notes:

- Vite is configured with `@lingui/vite-plugin` and `@lingui/swc-plugin` (see `vite.config.ts`).
- Source locale is `en`; catalogs are stored in PO format.

## AI Filter Generator

The AI Filter Generator allows users to generate filters using natural language. For example, a user can enter a query like "Show me education spending in Cluj from last year" and the AI will automatically set the appropriate filters.

### Setup

1. Create a `.env.local` file in the client directory and add your API URL:

```
VITE_API_URL=http://localhost:3000
```

2. Create a `.env` file in the server directory and add your OpenAI API key:

```
OPENAI_API_KEY=your-api-key-here
```

3. The API key should have access to the `gpt-4o` model for optimal results.

### How It Works

1. The user enters a natural language query in the search box and clicks the sparkle icon.
2. The query, along with the available filter options (entity types, counties, etc.), is sent to the server.
3. The server uses OpenAI to generate a structured JSON representation of the filters.
4. The filters are validated using Zod and applied to the data discovery page.
5. The filtered data is displayed to the user.

### Server Implementation

The filter generation is implemented on the server side for security and to keep the API key private:

1. The server exposes an endpoint at `/api/filter-generator` that accepts POST requests.
2. The request includes the user prompt, filter schema, and contextual data about available filter options.
3. The server uses OpenAI's API to generate a filter configuration based on the user's prompt.
4. The JSON filter is returned to the client, which then validates and applies it.

### Example Queries

- "Show me education spending in Cluj from last year"
- "What's the budget for healthcare in cities with over 50,000 population?"
- "Compare infrastructure spending between Cluj and Bucharest in 2022"
