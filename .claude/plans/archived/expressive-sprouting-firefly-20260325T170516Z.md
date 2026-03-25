# Plan: Rename campaign title to "Cu ochii pe bugetele locale"

## Context
The comms team decided the campaign title should be **"Cu ochii pe bugetele locale"** (RO) / keep English as appropriate. Currently the title is "Provocarea civică Bugete Locale 2026" / "Local Budgets Civic Challenge 2026". URL paths (`/bugete-locale-2026`) stay unchanged.

## Changes

### 1. Campaign definition (source of truth)
- **`src/content/campaigns/buget/campaign.json`** - Update `title.ro` and `title.en`

### 2. SEO copy
- **`src/features/campaigns/buget/seo/campaign-seo.ts`** - Update all ~14 hardcoded "Bugete Locale 2026" references in `CAMPAIGN_COPY` to use "Cu ochii pe bugetele locale" (RO) and appropriate English equivalent
- **`src/features/campaigns/buget/seo/campaign-share-images.ts`** - Update OG image alt text

### 3. Component text
- **`src/features/campaigns/buget/components/calendar/buget-calendar-page.tsx`** - Update calendar heading
- **`src/features/challenges/components/layout/ChallengesLayout.tsx`** - Update Lingui `t` string for sidebar label
- **`src/routes/bugete-locale-2026.termeni-si-conditii.tsx`** - Update terms page SEO title/description
- **`src/routes/bugete-locale-2026.termeni-si-conditii.lazy.tsx`** - Update visible subtitle

### 4. i18n
- Run `yarn i18n:extract` after code changes to update .po catalogs

### 5. Tests
- **`tests/integration/buget-routing.spec.ts`** - Update expected title strings
- **`src/features/campaigns/buget/seo/campaign-seo.test.ts`** - Update mock title
- **`src/features/campaigns/buget/components/landing/buget-landing-page.test.tsx`** - Update mock title

### Not changed
- URL paths (`/bugete-locale-2026`) remain unchanged
- Route file names stay the same
- Constants in `src/features/campaigns/buget/constants.ts` stay the same
- MDX content already updated in prior edit

## Verification
1. `yarn typecheck`
2. `yarn test` (verify updated tests pass)
3. `yarn i18n:extract && yarn i18n:compile`
