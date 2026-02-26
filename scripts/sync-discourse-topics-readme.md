# Sync Discourse Topics Script

This document describes `scripts/sync-discourse-topics.ts`.

## Purpose

The script provisions and syncs Discourse topics for learning lessons, then writes topic metadata back to path JSON files:

- `discourseTopicId`
- `discourseTopicSlug`

It is designed for the lesson discussion embed integration and defaults to the pilot path: `budget-basics`.

## What The Script Does

For each lesson in the selected path(s):

1. Builds a canonical embed URL using the English route:
   - `https://<site>/en/learning/<pathId>/<moduleId>/<lessonId>`
2. Checks whether a Discourse topic is already mapped for that embed URL using:
   - `GET /embed/info.json?embed_url=...`
3. Creates a topic when missing:
   - `POST /posts.json` with `title`, `raw`, `category`, `embed_url`
   - `raw` is generated from localized lesson MDX content (`index.<lang>.mdx`)
4. Updates lesson metadata in the corresponding path JSON.

## Requirements

Set these environment variables before running:

- `DISCOURSE_BASE_URL` (required)
- `DISCOURSE_API_KEY` (required)
- `DISCOURSE_API_USERNAME` (required)
- `DISCOURSE_LANG` (optional, `en` or `ro`, default: `en`)
- `DISCOURSE_CATEGORY_ID` (optional, positive integer)
- `VITE_SITE_URL` (optional, defaults to `https://transparenta.eu`)

If `DISCOURSE_CATEGORY_ID` is omitted, the script creates topics without category.
If a configured category is reserved, the script retries without category.
If `DISCOURSE_LANG=ro`, topic title/body and request language headers use Romanian.
`DISCOURSE_API_USERNAME` must be a username that is authorized for the provided API key.
Lesson body text is sourced from `src/content/learning/modules/<contentDir>/index.<lang>.mdx` with fallback to the other locale.

## Usage

```bash
# Show help
yarn discourse:sync-topics --help

# Dry-run (default) on pilot path (budget-basics)
yarn discourse:sync-topics

# Dry-run on explicit path
yarn discourse:sync-topics --path budget-basics --dry-run

# Write changes to path file
yarn discourse:sync-topics --path budget-basics --write

# Preview updates for existing topic title/body
DISCOURSE_LANG=ro yarn discourse:sync-topics --path budget-basics --dry-run --update-existing-content

# Rewrite existing topic title/body in Romanian and persist metadata updates
DISCOURSE_LANG=ro yarn discourse:sync-topics --path budget-basics --write --update-existing-content

# Multiple paths (comma-separated)
yarn discourse:sync-topics --path budget-basics,local-budgets-guide --write
```

## Flags

- `--dry-run`: no file writes (default behavior)
- `--write`: persists metadata updates to path JSON
- `--path <id[,id2]>`: target one or more learning path IDs
- `--update-existing-content`: updates first post body and topic title for already existing topics
- `--help`: prints usage

## Output

The script logs, per lesson:

- topic ID
- whether topic was `existing` or `created`
- whether lesson metadata was `updated` or `unchanged`
- optional existing topic content status when `--update-existing-content` is enabled

Then it prints a summary:

- lessons processed
- lessons updated
- topics created
- existing topic content updates
- path files written

## Safety Notes

- The script is non-destructive by default (`dry-run`).
- It only writes when `--write` is provided.
- It only touches selected path files.
- Re-running is idempotent: unchanged mappings are not rewritten.

## Troubleshooting

### Missing environment variables

Example:

`Discourse topic sync failed: Missing required environment variable: DISCOURSE_BASE_URL`

Fix by exporting the required env vars before running.

### Unauthorized or forbidden responses

Check:

- API key validity
- API username permissions
- category ID access in Discourse

### Topic created but metadata not written

Likely running in dry-run mode. Re-run with `--write`.

## Recommended Post-Run Checks

```bash
yarn typecheck
node --import tsx scripts/validate-learning-content.ts
```
