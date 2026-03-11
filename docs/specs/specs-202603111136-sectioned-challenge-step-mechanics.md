# Sectioned Challenge Step Mechanics

**Status:** Draft
**Date:** 2026-03-11
**Author:** Codex

## Problem

Challenge steps currently assume a long-form article layout: one MDX document is rendered as one page with inline interactions. That does not support the intended Duolingo-style flow where:

- one MDX step is split into multiple UI sections
- the UI shows one section at a time
- the footer owns `Check`, `Skip`, `Try again`, `Next`, and `Finish`
- section completion is derived from the section's interactive element

The first implementation direction also proved fragile because it depended on runtime raw-MDX loading. In dev, that path was unreliable enough to fall back to the normal article renderer or fail to find the raw source entirely.

## Context

- Challenge content already uses MDX and frontmatter through the Vite MDX pipeline.
- `remark-frontmatter` and `remark-mdx-frontmatter` are already enabled in the app build.
- Challenge steps need to preserve the existing article flow for most content while adding a second presentation mode for `sectioned`.
- The sectioned flow only needs one completion-driving interactive per section in v1.
- The first supported section completion types are:
  - `Quiz`
  - `TextInput`
- The step player already has:
  - challenge access gating
  - adjacent-step navigation
  - learning progress hooks for quiz-style interactions

## Decision

### 1. `sectioned` is a frontmatter-driven presentation mode

Challenge MDX keeps the current authoring style and only adds:

```yaml
stepType: sectioned
```

If `stepType` is absent, the step remains a normal article.

### 2. Section structure is exported at compile time

For `sectioned` challenge MDX files, a Vite pre-transform parses the MDX AST before the normal MDX compiler runs and injects:

```ts
export const challengeSections = [...]
```

Each section export contains:

- `id`
- `title`
- `bodySource`
- `interactive`

Section boundaries are top-level `##` headings. Content before the first `##` becomes the `intro` section.

This makes the compiled MDX module the single source of truth:

- `frontmatter`
- `default`
- `challengeSections`

No runtime `?raw` loading is used.

### 3. Runtime only hydrates exported section bodies

The runtime loader reads `challengeSections` from the compiled MDX module and turns each section's `bodySource` into a cached MDX component with `evaluateSync`.

This keeps the runtime logic small:

- no second file-loading path
- no dependence on raw import behavior in Vite
- no custom section registry

### 4. Footer-owned action flow for sectioned steps

The sectioned player shows one section at a time and makes the footer the main control surface:

- `Check` for unanswered interactive sections
- `Try again` after an incorrect answer
- `Skip` for non-final sections
- `Next` after a correct answer or non-interactive section
- `Finish` on the final completable section

The main content only renders the section body and passive interaction controls.

### 5. One completion-driving interactive per section in v1

The parser extracts the first supported interactive in a section and uses it as the completion source.

Supported in v1:

- `Quiz`
- `TextInput`

Extra supported interactives in the same section are ignored for both rendering payload and completion metadata.

### 6. `TextInput` is added as a minimal persisted interaction

`TextInput` stores:

- submitted value
- correctness
- submission timestamp

It is used in two modes:

- sectioned step mode: passive input, footer owns submit/advance
- article mode: inline submit button, so the shared MDX component contract remains functional outside the sectioned player too

## Alternatives Considered

### Runtime raw-MDX loading

Rejected because it created a second content-loading path and proved unreliable with Vite + MDX in dev.

Trade-off:

- simpler to prototype
- harder to make reliable

### Runtime section challenge registry

Rejected for v1 because it added extra mechanics beyond what the content model needed.

Trade-off:

- more extensible for many interactives per section
- too much runtime coordination for a one-interactive-per-section design

### Compile-time MDX rewrite into wrapper components

Rejected because it couples section structure to generated JSX wrappers and makes the content harder to inspect/debug.

Trade-off:

- avoids runtime hydration
- more invasive to the authored MDX source shape

## Consequences

**Positive**

- Sectioned steps no longer depend on fragile raw-file imports.
- The compiled MDX module is the only content source the runtime needs.
- The UI can stay Duolingo-like without inventing a generic section-completion registry.
- The section parser is deterministic and testable.
- `TextInput` is now a real challenge MDX component rather than a section-only special case.

**Negative**

- Section bodies still need runtime MDX hydration from `bodySource`.
- The transform assumes sectioned steps do not rely on custom top-level MDX imports/exports inside the authored body.
- v1 only supports one completion-driving interactive per section.
- The section parser has to evaluate static JSX attribute expressions for props such as quiz options.

## Working Plan

1. Keep the current mechanics stable:
   - verify `sectioned` steps always export `challengeSections`
   - keep the footer-owned action flow as the default UX
2. Add one direct loader regression test:
   - assert a compiled sectioned module resolves through `challengeSections` without any raw import dependency
3. Expand supported section interactives incrementally:
   - add one type at a time
   - keep the one-interactive-per-section rule until a concrete multi-interactive use case appears
4. Revisit runtime hydration only if performance becomes an issue:
   - keep compile-time section export
   - optimize the `bodySource -> Component` step separately if needed

## References

- `vite.config.ts`
- `src/features/challenges/utils/sectioned-step-markdown.ts`
- `src/features/challenges/hooks/use-challenge-step-content.ts`
- `src/features/challenges/components/player/ChallengeStepPlayer.tsx`
- `src/features/challenges/components/player/sectioned-step-interactives.tsx`
- `src/features/learning/hooks/interactions/use-text-input-interaction.ts`
- `src/content/challenges/steps/budget-basics/01-what-is-the-local-budget/index.en.mdx`
- `src/content/challenges/steps/budget-basics/01-what-is-the-local-budget/index.ro.mdx`
