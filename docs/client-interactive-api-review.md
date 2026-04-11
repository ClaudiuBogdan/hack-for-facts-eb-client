# Client Interactive Elements Requiring API Review

Approximate audit generated from the client codebase on 2026-04-11.

## Scope

Included:
- User-driven client interactions that trigger an API request directly or through a hook.
- Interactive queries where user-controlled state materially changes request variables.
- Learning and campaign progress interactions that serialize into `/api/v1/learning/progress`.

Excluded:
- Passive route-load fetches with no user-controlled input.
- Purely local-only UI such as clipboard/export/import helpers that do not hit the backend.
- Navigation-only controls.

## Shared Contracts

### Shared learning and campaign progress transport

Many learning and campaign widgets do not call dedicated endpoints. They all sync through:

- `GET /api/v1/learning/progress?since=<cursor?>`
- `PUT /api/v1/learning/progress`

Top-level sync body:

```json
{
  "clientUpdatedAt": "ISO-8601 datetime",
  "events": [
    {
      "eventId": "string",
      "occurredAt": "ISO-8601 datetime",
      "clientId": "string",
      "type": "interactive.updated | progress.reset",
      "payload": {
        "record": {
          "key": "string",
          "interactionId": "string",
          "lessonId": "string",
          "kind": "quiz | url | text-input | custom",
          "scope": { "type": "global" } | { "type": "entity", "entityCui": "string" },
          "completionRule": {
            "type": "outcome | resolved | score-threshold | component-flag"
          },
          "phase": "idle | draft | pending | resolved | failed",
          "value": {
            "kind": "choice | text | url | number | json"
          } | null,
          "result": {
            "outcome": "correct | incorrect | null",
            "score": "number | null",
            "feedbackText": "string | null",
            "response": "object | null",
            "evaluatedAt": "ISO-8601 datetime | null"
          } | null,
          "review": {
            "status": "pending | approved | rejected",
            "reviewedAt": "ISO-8601 datetime | null",
            "feedbackText": "string | null"
          } | null,
          "sourceUrl": "string?",
          "updatedAt": "ISO-8601 datetime",
          "submittedAt": "ISO-8601 datetime | null"
        },
        "auditEvents": []
      }
    }
  ]
}
```

Notes:
- Async-review campaign forms usually send `phase: "pending"` and rely on server-owned `review.status`.
- Immediate widgets usually send `phase: "resolved"` and may include `result.score`.
- Content progression is projected into the same event stream by the client.

### Shared analytics filter contract

Several search, map, table, and budget exploration surfaces send `AnalyticsFilterType` to GraphQL-backed APIs.

Primary schema source:
- `src/schemas/charts.ts`

Important allowed values:
- `account_category`: `ch | vn`
- `report_type`: `Executie bugetara agregata la nivel de ordonator principal | Executie bugetara agregata la nivel de ordonator secundar | Executie bugetara detaliata`
- `report_period.type`: `YEAR | MONTH | QUARTER`
- `normalization`: `total | total_euro | per_capita | per_capita_euro | percent_gdp`
- `currency`: `RON | EUR | USD`
- `expense_types`: `dezvoltare | functionare`

Common filter fields:
- `entity_cuis`, `main_creditor_cui`, `entity_types`, `county_codes`, `regions`, `uat_ids`
- `functional_codes`, `functional_prefixes`, `economic_codes`, `economic_prefixes`
- `funding_source_ids`, `budget_sector_ids`
- `min_population`, `max_population`, `aggregate_min_amount`, `aggregate_max_amount`, `item_min_amount`, `item_max_amount`
- `exclude: { ...same families as above }`

## Inventory

### 1. Notification subscription toggles and notification management

- UI files:
  - `src/features/notifications/components/EntityNotificationBell.tsx`
  - `src/features/notifications/components/NotificationQuickMenu.tsx`
  - `src/features/notifications/components/NotificationCard.tsx`
  - `src/features/notifications/components/NotificationList.tsx`
  - `src/features/campaigns/buget/components/CampaignNotificationPreferencesPage.tsx`
- API files:
  - `src/features/notifications/api/notifications.ts`
  - `src/features/notifications/hooks/useToggleNotification.ts`
- Requests:
  - `GET /api/v1/notifications`
  - `GET /api/v1/notifications/entity/:cui`
  - `POST /api/v1/notifications`
  - `PATCH /api/v1/notifications/:id`
  - `DELETE /api/v1/notifications/:id`
- Mutation payload:

```json
{
  "entityCui": "string | null",
  "notificationType": "notification enum",
  "config": "object?"
}
```

- Patch payload:

```json
{
  "isActive": "boolean?",
  "config": "object?"
}
```

- Allowed `notificationType` values:
  - `newsletter_entity_monthly`
  - `newsletter_entity_quarterly`
  - `newsletter_entity_yearly`
  - `funky:notification:global`
  - `funky:notification:entity_updates`
  - `alert_series_analytics`
  - `alert_series_static`
- User story:
  - A signed-in user subscribes to entity newsletters or campaign updates, disables them later, or deletes the subscription entirely.

### 2. Alert create, edit, activate, deactivate, delete

- UI files:
  - `src/routes/alerts/new.lazy.tsx`
  - `src/routes/alerts/$alertId/index.lazy.tsx`
  - `src/features/notifications/components/alerts/AlertsList.tsx`
- API files:
  - `src/features/alerts/hooks/useAlertsApi.ts`
  - `src/features/notifications/api/notifications.ts`
  - `src/schemas/alerts.ts`
- Transport:
  - Alerts are stored as notification records with `notificationType = alert_series_analytics | alert_series_static`.
- Create/update config payload:

```json
{
  "title": "string? max 200",
  "description": "string? max 1000",
  "conditions": [
    {
      "operator": "gt | gte | lt | lte | eq",
      "threshold": "number",
      "unit": "string"
    }
  ],
  "filter": "AnalyticsFilterType",
  "datasetId": "string?",
  "id": "client id omitted on create"
}
```

- Allowed values:
  - `seriesType`: `analytics | static`
  - `notificationType`: `alert_series_analytics | alert_series_static`
  - `view`: `overview | filters | preview | history`
  - `mode`: `create | edit`
- User story:
  - A user defines a threshold-based alert for an analytics series or static dataset, edits it later, toggles it on or off, or deletes it.

### 3. Public unsubscribe by email token

- UI files:
  - `src/routes/unsubscribe.$token.tsx`
- API files:
  - `src/features/notifications/api/notifications.ts`
  - `src/features/notifications/hooks/useUnsubscribe.ts`
- Request:
  - `GET /api/v1/notifications/unsubscribe/:token`
- Path payload:
  - `token: string`
- User story:
  - An email recipient clicks an unsubscribe link and confirms removal without logging in.

### 4. Short-link generation for share actions

- UI files:
  - `src/components/charts/components/chart-quick-config/components/ShareChart.tsx`
  - `src/components/ui/FloatingQuickNav.tsx`
  - `src/components/mobile/mobile-bottom-dock.tsx`
  - `src/features/advanced-map-analytics/components/map-analytics-quick-actions.tsx`
- API files:
  - `src/lib/api/shortLinks.ts`
- Request:
  - `POST /api/v1/short-links`
- Payload:

```json
{
  "url": "absolute URL string"
}
```

- Response:
  - `{ code: string }`
- User story:
  - A signed-in user copies a shorter shareable link instead of the current long URL.

### 5. Entity search

- UI files:
  - `src/components/entities/EntitySearch/useEntitySearch.ts`
  - `src/components/entities/FloatingEntitySearch.tsx`
  - `src/features/learning/components/interactive/useUATFinder.ts`
- API files:
  - `src/lib/api/entities.ts`
- GraphQL request:
  - `EntitySearch($filter: EntityFilter, $limit: Int)`
- Variables:

```json
{
  "filter": {
    "search": "string",
    "is_uat": "boolean?"
  },
  "limit": "number"
}
```

- Allowed values and constraints:
  - `search` must be non-empty.
  - Global entity search is only enabled after 3 trimmed characters.
  - UAT finder search is enabled after 2 trimmed characters.
  - `is_uat` is optional; when true the request is UAT-only.
  - `excludeCounty` is client-side filtering only, not sent to the API.
- User story:
  - A user searches for an entity or UAT and then navigates to the relevant profile, map, or learning flow.

### 6. Shared analytics and data-discovery filters

- UI files:
  - `src/routes/budget-explorer.lazy.tsx`
  - `src/routes/entity-analytics.lazy.tsx`
  - `src/features/learning/components/interactive/useUATFinder.ts`
  - Several chart/map/table surfaces reusing `AnalyticsFilterType`
- API files:
  - `src/lib/api/entity-analytics.ts`
  - `src/lib/api/dataDiscovery.ts`
  - `src/features/national-budget/national-budget-api.ts`
- Requests:
  - GraphQL `entityAnalytics`
  - GraphQL `aggregatedLineItems`
  - GraphQL `entities`
  - GraphQL `executionLineItems`
  - GraphQL `heatmapUATData`
  - GraphQL `heatmapCountyData`
- Common variables:

```json
{
  "filter": "AnalyticsFilterType or EntityFilter",
  "sort": {
    "by": "field?",
    "order": "asc | desc?"
  },
  "limit": "number?",
  "offset": "number?"
}
```

- Allowed values:
  - See `Shared analytics filter contract` above.
  - Pagination values are integers.
  - UAT detail lookup in learning uses a single-year expenses filter with `entity_cuis=[selectedCui]`.
- User story:
  - A user changes report year, normalization, categories, geography, or other filters and expects the map/table/chart data to refresh against the filtered analytics backend.

### 7. Custom map dataset browse and select

- UI files:
  - `src/features/advanced-map-datasets/components/dataset-list-page.tsx`
  - `src/features/advanced-map-analytics/components/uploaded-map-dataset-dialog.tsx`
  - `src/features/advanced-map-analytics/components/uploaded-map-dataset-browser.tsx`
- API files:
  - `src/features/advanced-map-datasets/api/advanced-map-datasets-api.ts`
  - `src/features/advanced-map-datasets/hooks/use-advanced-map-datasets.ts`
- Requests:
  - `GET /api/v1/advanced-map-datasets?limit=&offset=`
  - `GET /api/v1/advanced-map-datasets/public?limit=&offset=`
  - `GET /api/v1/advanced-map-datasets/:datasetId`
  - `GET /api/v1/advanced-map-datasets/public/:publicId`
- Query params:

```json
{
  "limit": "integer >= 0?",
  "offset": "integer >= 0?"
}
```

- Allowed values:
  - Owner detail uses `datasetId`.
  - Public detail uses `publicId`.
- User story:
  - A user browses their own or shared datasets, previews one, and selects it as a source for map analytics.

### 8. Custom map dataset create and save

- UI files:
  - `src/features/advanced-map-datasets/components/dataset-editor-page.tsx`
- API files:
  - `src/features/advanced-map-datasets/api/advanced-map-datasets-api.ts`
  - `src/features/advanced-map-datasets/utils/draft.ts`
  - `src/features/advanced-map-datasets/api/schemas.ts`
- Requests:
  - `POST /api/v1/advanced-map-datasets/json`
  - `PATCH /api/v1/advanced-map-datasets/:datasetId`
  - `PUT /api/v1/advanced-map-datasets/:datasetId/rows`
- Create payload:

```json
{
  "title": "string, required",
  "description": "string | null",
  "markdown": "string | null",
  "unit": "string | null",
  "visibility": "private | unlisted | public",
  "rows": [
    {
      "sirutaCode": "string, required",
      "valueNumber": "string | null",
      "valueJson": {
        "type": "text | link | markdown",
        "value": {}
      } | null
    }
  ]
}
```

- `valueJson` allowed variants:
  - `text`: `{ "text": "non-empty string" }`
  - `link`: `{ "url": "valid URL", "label": "string | null" }`
  - `markdown`: `{ "markdown": "non-empty string" }`
- Validation constraints:
  - Title required.
  - At least one non-empty row required.
  - No duplicate `sirutaCode`.
  - `valueNumber` must parse as numeric if present.
  - Link payloads must be valid `http` or `https` URLs.
- User story:
  - A user creates a reusable map-ready dataset, edits its metadata and rows, and saves it for later reuse.

### 9. Custom map dataset delete

- UI files:
  - `src/features/advanced-map-datasets/components/dataset-list-page.tsx`
- API files:
  - `src/features/advanced-map-datasets/api/advanced-map-datasets-api.ts`
- Request:
  - `DELETE /api/v1/advanced-map-datasets/:datasetId`
- Path payload:
  - `datasetId: string`
- User story:
  - A user removes a dataset they no longer want available in the editor.

### 10. Advanced map analytics create map

- UI files:
  - `src/routes/maps/editor/new.lazy.tsx`
  - `src/features/advanced-map-analytics/components/map-analytics-list-page.tsx`
- API files:
  - `src/features/advanced-map-analytics/api/advanced-map-analytics-api.ts`
  - `src/features/advanced-map-analytics/hooks/use-advanced-map-analytics.ts`
  - `src/schemas/advanced-map-analytics.ts`
- Request:
  - `POST /api/v1/advanced-map-analytics/maps`
- Payload:

```json
{
  "title": "string?",
  "description": "string | null",
  "visibility": "private | public",
  "state": "AdvancedMapAnalyticsUrlState",
  "schemaVersion": 1
}
```

- `AdvancedMapAnalyticsUrlState` top-level fields:
  - `version: 1`
  - `series: MapSupportedSeries[]`
  - `activeSeriesId?: string`
  - `valueFilters`
  - `activeView: map | table | analytics`
  - `analyticsWidgets`
  - `mapName: string`
  - `showCountyBoundaries: boolean`
  - panel collapsed flags
  - `binsPresets`, `activeBinPresetId?`, `tableBinFiltersByPresetId`
  - `mapCenter?: [lat, lng]`
  - `mapZoom?: 1..20`
- Important nested enums:
  - Map visibility: `private | public`
  - Widget keys: `series_coverage | series_totals | distribution | outliers`
  - Uploaded dataset series type: `uploaded-map-dataset`
  - GeoJSON dataset series type: `geojson-dataset-series`
- User story:
  - A signed-in user creates a new saved analysis map, either empty or cloned from an existing configuration.

### 11. Advanced map analytics save snapshot

- UI files:
  - `src/features/advanced-map-analytics/components/map-analytics-editor-page.tsx`
  - `src/features/advanced-map-analytics/components/map-analytics-owner-config-modal.tsx`
- API files:
  - `src/features/advanced-map-analytics/api/advanced-map-analytics-api.ts`
- Request:
  - `POST /api/v1/advanced-map-analytics/maps/:mapId/snapshots`
- Payload:

```json
{
  "state": "AdvancedMapAnalyticsUrlState",
  "title": "string?",
  "description": "string | null?",
  "mapPatch": {
    "title": "string?",
    "description": "string | null?",
    "visibility": "private | public?"
  }?
}
```

- Allowed values:
  - `stateAtSave` in UI maps to `mapPatch.visibility`.
  - Snapshot pagination later uses `page >= 1`, `pageSize >= 1`.
- User story:
  - A user checkpoints the current map state so it can be restored or published later.

### 12. Advanced map analytics visibility toggle

- UI files:
  - `src/features/advanced-map-analytics/components/map-analytics-owner-config-modal.tsx`
- API files:
  - `src/features/advanced-map-analytics/api/advanced-map-analytics-api.ts`
- Request:
  - `PATCH /api/v1/advanced-map-analytics/maps/:mapId`
- Payload:

```json
{
  "title": "string?",
  "description": "string | null?",
  "visibility": "private | public?"
}
```

- Allowed values:
  - `visibility`: `private | public`
- User story:
  - A map owner switches a saved map between private and public visibility.

### 13. Advanced map analytics version restore and delete

- UI files:
  - `src/features/advanced-map-analytics/components/map-analytics-owner-config-modal.tsx`
- API files:
  - `src/features/advanced-map-analytics/api/advanced-map-analytics-api.ts`
- Requests:
  - `GET /api/v1/advanced-map-analytics/maps/:mapId/snapshots?page=&pageSize=`
  - `GET /api/v1/advanced-map-analytics/maps/:mapId/snapshots/:snapshotId`
  - `DELETE /api/v1/advanced-map-analytics/maps/:mapId`
- Query payload:

```json
{
  "page": "integer >= 1?",
  "pageSize": "integer >= 1?"
}
```

- User story:
  - A map owner reviews prior saved versions, restores one into the editor, or deletes the map completely.

### 14. Learning onboarding completion

- UI files:
  - `src/features/learning/components/onboarding/LearningOnboarding.tsx`
- API files:
  - `src/features/learning/hooks/use-learning-progress.tsx`
- Transport:
  - `PUT /api/v1/learning/progress`
- User-authored payload inside `events[*].payload.record.value`:

```json
{
  "kind": "json",
  "json": {
    "value": {
      "pathId": "string | null",
      "relatedPaths": ["string"],
      "completedAt": "ISO-8601 datetime | null"
    }
  }
}
```

- User story:
  - A learner finishes the onboarding questionnaire and receives a recommended path.

### 15. Learning active-path selection

- UI files:
  - `src/routes/$lang/learning/index.lazy.tsx`
  - `src/features/learning/components/layout/LearningLayout.tsx`
- API files:
  - `src/features/learning/hooks/use-learning-progress.tsx`
- Transport:
  - `PUT /api/v1/learning/progress`
- User payload:

```json
{
  "kind": "json",
  "json": {
    "value": {
      "pathId": "string | null"
    }
  }
}
```

- User story:
  - A learner switches the active learning path or resumes a different one.

### 16. Lesson completion button

- UI files:
  - `src/features/learning/components/player/MarkComplete.tsx`
- API files:
  - `src/features/learning/hooks/use-learning-progress.tsx`
  - `src/features/learning/hooks/interactions/use-lesson-completion.ts`
- Transport:
  - `PUT /api/v1/learning/progress`
- Projected content payload:

```json
{
  "contentId": "string",
  "status": "not_started | in_progress | completed | passed",
  "score": "number?",
  "contentVersion": "string?"
}
```

- User story:
  - A learner explicitly marks a lesson step complete so progress is saved remotely.

### 17. Quiz answers

- UI files:
  - `src/features/learning/components/assessment/Quiz.tsx`
- API files:
  - `src/features/learning/hooks/use-learning-progress.tsx`
  - `src/features/learning/hooks/interactions/use-quiz-interaction.ts`
- Progress payload:

```json
{
  "kind": "choice",
  "choice": {
    "selectedId": "string | null"
  }
}
```

- Coupled content projection:
  - `status: in_progress`
  - `score: 0..100`
- User story:
  - A learner answers a quiz question and the result is evaluated immediately.

### 18. Prediction / Promise Tracker reveal

- UI files:
  - `src/features/learning/components/interactive/PromiseTracker.tsx`
- API files:
  - `src/features/learning/hooks/use-learning-progress.tsx`
  - `src/features/learning/hooks/interactions/use-prediction-interaction.ts`
- Progress payload:

```json
{
  "kind": "json",
  "json": {
    "value": {
      "reveals": {
        "<year>": {
          "guess": "number",
          "actualRate": "number",
          "revealedAt": "ISO-8601 datetime"
        }
      }
    }
  }
}
```

- User story:
  - A learner guesses an execution rate and reveals the correct answer.

### 19. Salary calculator interaction

- UI files:
  - `src/features/learning/components/interactive/SalaryTaxCalculator.tsx`
- API files:
  - `src/features/learning/hooks/use-learning-progress.tsx`
  - `src/features/learning/hooks/interactions/use-salary-calculator-interaction.ts`
- Progress payload:

```json
{
  "kind": "json",
  "json": {
    "value": {
      "gross": "number",
      "userGuess": "number",
      "step": "INPUT | GUESS | REVEAL"
    }
  }
}
```

- User story:
  - A learner enters gross salary, guesses the net, and reveals the answer with progress saved.

### 20. Budget allocator game

- UI files:
  - `src/features/learning/components/interactive/BudgetAllocatorGame.tsx`
- API files:
  - `src/features/learning/hooks/use-learning-progress.tsx`
- Progress payload:

```json
{
  "kind": "json",
  "json": {
    "value": {
      "allocations": {
        "<categoryId>": "number"
      },
      "step": "COMPARE"
    }
  }
}
```

- Content side effect:
  - Marks lesson content `completed` with `score: 100`.
- User story:
  - A learner allocates budget across categories and compares their allocation against the reference.

### 21. Budget cycle explorer

- UI files:
  - Budget-cycle lesson components using `useBudgetCycleInteraction`
- API files:
  - `src/features/learning/hooks/use-learning-progress.tsx`
  - `src/features/learning/hooks/interactions/use-budget-cycle-interaction.ts`
- Progress payload:

```json
{
  "kind": "json",
  "json": {
    "value": {
      "exploredPhases": [
        "planning | drafting | approval | execution | reporting | audit"
      ],
      "lastExploredPhase": "phase id"
    }
  }
}
```

- User story:
  - A learner explores the public budget cycle phase by phase until the lesson is complete.

### 22. UAT finder interaction

- UI files:
  - UAT finder lesson components using `useUATFinderInteraction`
- API files:
  - `src/features/learning/hooks/use-learning-progress.tsx`
  - `src/features/learning/hooks/interactions/use-uat-finder-interaction.ts`
- Progress payload:

```json
{
  "kind": "json",
  "json": {
    "value": {
      "step": "SELECTED | EXPLORED",
      "selectedCui": "string",
      "selectedName": "string | null",
      "exploredAction": "view_budget | compare | map | null"
    }
  }
}
```

- User story:
  - A learner searches for a locality, picks one, and then explores it through budget/map/compare actions.

### 23. Challenge lesson widget: entity snapshot checklist

- UI files:
  - `src/features/challenges/components/interactive/challenge-lesson-widgets.tsx`
- API files:
  - Shared learning progress transport
- Payload:

```json
{
  "kind": "json",
  "json": {
    "value": {
      "checkedItems": ["boolean", "boolean", "..."]
    }
  }
}
```

- User story:
  - A learner confirms they inspected the required items in the entity snapshot lesson.

### 24. Challenge lesson widget: execution table excerpt

- UI files:
  - `src/features/challenges/components/interactive/challenge-lesson-widgets.tsx`
- API files:
  - Shared learning progress transport
- Payload:

```json
{
  "kind": "json",
  "json": {
    "value": {
      "selectedRowId": "string | null",
      "rowExplanation": "string"
    }
  }
}
```

- Completion rule:
  - Completed when a row is selected and explanation length is at least 30 characters.
- User story:
  - A learner selects a budget row and explains why it stands out.

### 25. Challenge lesson widget: aggregated vs detailed comparison

- UI files:
  - `src/features/challenges/components/interactive/challenge-lesson-widgets.tsx`
- API files:
  - Shared learning progress transport
- Payload:

```json
{
  "kind": "json",
  "json": {
    "value": {
      "activeReportType": "PRINCIPAL_AGGREGATED | DETAILED",
      "hasViewedDetailed": "boolean"
    }
  }
}
```

- User story:
  - A learner compares aggregated and detailed report scopes and must inspect the detailed view at least once.

### 26. Campaign progress: selected locality, active module, challenge state, registration

- UI files:
  - `src/features/campaigns/buget/components/hub/buget-entity-map-selector-page.tsx`
  - `src/features/challenges/components/hub/ChallengesHubPage.tsx`
  - `src/features/challenges/components/layout/ChallengesLayout.tsx`
  - `src/features/campaigns/buget/hooks/use-campaign-registration.ts`
  - `src/features/campaigns/buget/components/interactive/use-campaign-challenge-form.ts`
- API files:
  - `src/features/campaigns/buget/hooks/use-campaign-progress.tsx`
- Transport:
  - `PUT /api/v1/learning/progress`
- User-authored payload families:
  - Selected entity:

```json
{
  "kind": "json",
  "json": {
    "value": {
      "entityCui": "string | null"
    }
  }
}
```

  - Active module:

```json
{
  "kind": "json",
  "json": {
    "value": {
      "moduleSlug": "string | null"
    }
  }
}
```

  - Terms acceptance:

```json
{
  "kind": "json",
  "json": {
    "value": {
      "entityCui": "string",
      "acceptedTermsAt": "ISO-8601 datetime"
    }
  }
}
```

  - Challenge state:

```json
{
  "kind": "json",
  "json": {
    "value": {
      "challengeSlug": "string",
      "status": "not_started | in_progress | pending_review | completed | locked",
      "attempts": "number"
    }
  }
}
```

- User story:
  - A campaign participant selects a city hall, accepts campaign terms, moves between modules, and progresses through the challenge funnel.

### 27. Campaign civic form: city hall website

- UI files:
  - `src/features/campaigns/buget/components/interactive/PrimarieWebsiteLink.tsx`
- API files:
  - Shared learning progress transport
  - `src/features/campaigns/buget/civic-interaction-definitions.ts`
- Interaction id:
  - `funky:interaction:city_hall_website`
- Payload value:

```json
{
  "websiteUrl": "string",
  "submittedAt": "ISO-8601 datetime | null"
}
```

- Lifecycle:
  - `async_review`
- User story:
  - A participant submits the official city hall website so others can verify budget information.

### 28. Campaign civic form: budget document link

- UI files:
  - `src/features/campaigns/buget/components/interactive/BudgetDocumentLink.tsx`
- API files:
  - Shared learning progress transport
- Interaction id:
  - `funky:interaction:budget_document`
- Payload value:

```json
{
  "documentUrl": "string",
  "documentTypes": [
    "pdf | word | excel | webpage | graphics | other"
  ],
  "submittedAt": "ISO-8601 datetime | null"
}
```

- Lifecycle:
  - `async_review`
- User story:
  - A participant submits a link to the budget document and describes the document format.

### 29. Campaign civic form: budget publication date

- UI files:
  - `src/features/campaigns/buget/components/interactive/BudgetPublicationDate.tsx`
- API files:
  - Shared learning progress transport
- Interaction id:
  - `funky:interaction:budget_publication_date`
- Payload value:

```json
{
  "publicationDate": "YYYY-MM-DD | null",
  "sources": [
    {
      "type": "website | press | social_media | other",
      "url": "string | null"
    }
  ],
  "submittedAt": "ISO-8601 datetime | null"
}
```

- Lifecycle:
  - `async_review`
- User story:
  - A participant reports when the draft budget was published and where that evidence was found.

### 30. Campaign civic form: budget status report

- UI files:
  - `src/features/campaigns/buget/components/interactive/BudgetStatusReport.tsx`
- API files:
  - Shared learning progress transport
- Interaction id:
  - `funky:interaction:budget_status`
- Payload value:

```json
{
  "isPublished": "yes | no | dont_know | null",
  "budgetStage": "draft | approved | null",
  "submittedAt": "ISO-8601 datetime | null"
}
```

- Lifecycle:
  - `async_review`
- User story:
  - A participant reports whether the local budget is published and whether it is still draft or already approved.

### 31. Campaign civic form: city hall contact info

- UI files:
  - `src/features/campaigns/buget/components/interactive/PrimarieContactInfo.tsx`
- API files:
  - Shared learning progress transport
- Interaction id:
  - `funky:interaction:city_hall_contact`
- Payload value:

```json
{
  "email": "string | null",
  "phone": "string | null",
  "submittedAt": "ISO-8601 datetime | null"
}
```

- Lifecycle:
  - `async_review`
- User story:
  - A participant records the email and optional phone contact for the city hall for later outreach.

### 32. Campaign civic form: public debate request

- UI files:
  - `src/features/campaigns/buget/components/interactive/DebateRequestForm.tsx`
- API files:
  - Shared learning progress transport
- Interaction id:
  - `funky:interaction:public_debate_request`
- Payload value:

```json
{
  "primariaEmail": "string",
  "isNgo": "boolean",
  "organizationName": "string | null",
  "organizationLegalAddress": "string | null",
  "organizationRegistrationNumber": "string | null",
  "organizationFiscalCode": "string | null",
  "legalRepresentativeName": "string | null",
  "legalRepresentativeRole": "string | null",
  "ngoSenderEmail": "string | null",
  "preparedSubject": "string | null",
  "threadKey": "string | null",
  "submissionPath": "send_yourself | request_platform | null",
  "submittedAt": "ISO-8601 datetime | null"
}
```

- Lifecycle:
  - `async_review`
- User story:
  - A participant prepares or sends a formal public debate request and captures how it was sent.

### 33. Campaign civic form: participation report

- UI files:
  - `src/features/campaigns/buget/components/interactive/ParticipationReport.tsx`
- API files:
  - Shared learning progress transport
- Interaction id:
  - `funky:interaction:funky_participation`
- Payload value:

```json
{
  "debateTookPlace": "yes | no | dont_know | null",
  "approximateAttendees": "number | null",
  "citizensAllowedToSpeak": "yes | no | partially | null",
  "citizenInputsRecorded": "yes | no | dont_know | null",
  "observations": "string | null",
  "submittedAt": "ISO-8601 datetime | null"
}
```

- Lifecycle:
  - `immediate`
- User story:
  - A participant reports what happened during a local budget debate and how participatory it was.

### 34. Campaign civic form: contestation builder

- UI files:
  - `src/features/campaigns/buget/components/interactive/ContestationBuilder.tsx`
- API files:
  - Shared learning progress transport
- Interaction id:
  - `funky:interaction:budget_contestation`
- Payload value:

```json
{
  "contestedItem": "string",
  "reasoning": "string",
  "impact": "string",
  "proposedChange": "string",
  "senderName": "string | null",
  "submissionPath": "send_email | download_text | null",
  "primariaEmail": "string | null",
  "submittedAt": "ISO-8601 datetime | null"
}
```

- Lifecycle:
  - `async_review`
- User story:
  - A participant drafts a contestation against a budget item and either sends it by email or downloads the generated text.

### 35. Campaign admin review queue filters

- UI files:
  - `src/features/campaigns/buget/admin/components/CampaignAdminUserInteractionsToolbar.tsx`
  - `src/features/campaigns/buget/admin/components/CampaignAdminUserInteractionsPage.tsx`
- API files:
  - `src/features/campaigns/buget/admin/api/campaign-admin-user-interactions.ts`
  - `src/features/campaigns/buget/admin/schemas/search-schema.ts`
- Request:
  - `GET /api/v1/admin/campaigns/:campaignKey/user-interactions`
- Query payload:

```json
{
  "phase": "idle | draft | pending | resolved | failed?",
  "reviewStatus": "pending | approved | rejected?",
  "interactionId": "string?",
  "lessonId": "string?",
  "entityCui": "string?",
  "scopeType": "global | entity?",
  "payloadKind": "choice | text | url | number | json?",
  "submissionPath": "request_platform | send_yourself?",
  "userId": "string?",
  "recordKey": "string?",
  "recordKeyPrefix": "string length >= 16?",
  "submittedAtFrom": "ISO-8601 datetime?",
  "submittedAtTo": "ISO-8601 datetime?",
  "updatedAtFrom": "ISO-8601 datetime?",
  "updatedAtTo": "ISO-8601 datetime?",
  "hasInstitutionThread": "boolean?",
  "threadPhase": "sending | awaiting_reply | reply_received_unreviewed | manual_follow_up_needed | resolved_positive | resolved_negative | closed_no_response | failed?",
  "cursor": "string?",
  "limit": "1..100"
}
```

- Fixed campaign key in current code:
  - `funky`
- User story:
  - An admin filters the review queue down to the exact subset of user interactions that need review.

### 36. Campaign admin review submit

- UI files:
  - `src/features/campaigns/buget/admin/components/CampaignAdminReviewSheet.tsx`
  - `src/features/campaigns/buget/admin/components/CampaignAdminBulkReviewDialog.tsx`
  - `src/features/campaigns/buget/admin/components/CampaignAdminUserInteractionsPage.tsx`
- API files:
  - `src/features/campaigns/buget/admin/api/campaign-admin-user-interactions.ts`
  - `src/features/campaigns/buget/admin/schemas/api-schemas.ts`
- Request:
  - `POST /api/v1/admin/campaigns/:campaignKey/user-interactions/reviews`
- Payload:

```json
{
  "items": [
    {
      "userId": "string",
      "recordKey": "string",
      "expectedUpdatedAt": "ISO-8601 datetime",
      "status": "approved",
      "feedbackText": "string?"
    },
    {
      "userId": "string",
      "recordKey": "string",
      "expectedUpdatedAt": "ISO-8601 datetime",
      "status": "rejected",
      "feedbackText": "non-empty string"
    }
  ]
}
```

- Constraints:
  - `items.length` must be between 1 and 100.
  - Rejections require non-empty `feedbackText`.
- User story:
  - An admin approves or rejects one or many campaign submissions and attaches reviewer feedback when needed.

## Likely Review Priorities

Highest backend/API review value:
- Shared `/api/v1/learning/progress` event contract, because it carries most learning and campaign submissions.
- Notification and alert payloads, because alerts are stored as notification config blobs.
- Advanced map dataset and advanced map analytics save payloads, because they serialize large client-authored state trees.
- Campaign admin queue filter and review payloads, because they are safety-critical moderation surfaces.
