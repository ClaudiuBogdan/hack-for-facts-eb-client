import type { ComponentType, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { evaluateSync } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import * as jsxRuntime from 'react/jsx-runtime'
import { describe, expect, it } from 'vitest'
import {
  buildChallengeStepSectionMetadataManifest,
  buildChallengeStepSectionRequestId,
  parseSectionedChallengeStep,
  transformSectionedChallengeStepSource,
} from './sectioned-step-markdown.build'
import { resolveChallengeStepTrackedInteractions } from './sectioned-step-markdown'

function renderSectionMarkup(bodySource: string) {
  const renderedModule = evaluateSync(bodySource, {
    ...jsxRuntime,
    remarkPlugins: [remarkGfm],
  }) as {
    readonly default: ComponentType<{
      readonly components?: Record<string, unknown>
    }>
  }

  const SectionComponent = renderedModule.default

  return renderToStaticMarkup(
    <SectionComponent
      components={{
        Quiz: ({
          id,
          question,
        }: {
          readonly id: string
          readonly question: string
        }) => <div data-quiz-id={id}>{question}</div>,
        ExpandableHint: ({
          children,
        }: {
          readonly children?: ReactNode
        }) => <aside>{children}</aside>,
      }}
    />,
  )
}

describe('parseSectionedChallengeStep', () => {
  it('splits inline quizzes into standalone quiz sections while preserving surrounding content', () => {
    const parsed = parseSectionedChallengeStep({
      source: `---
title: Test step
stepType: sectioned
---

# Test step

Intro paragraph.

## First section

First body.

<Quiz
  id="quiz-1"
  question="Question?"
  options={[
    { id: "a", text: "Wrong", isCorrect: false },
    { id: "b", text: "Right", isCorrect: true }
]}
  explanation="Because"
/>

After quiz.

## Final section

Last body.
`,
    })

    expect(parsed.frontmatter.stepType).toBe('sectioned')
    expect(parsed.sections).toHaveLength(5)
    expect(parsed.sections[0]?.id).toBe('intro')
    expect(parsed.sections[0]?.title).toBe('Test step')
    expect(parsed.sections[0]?.bodySource).toContain('Intro paragraph.')
    expect(parsed.sections[1]?.title).toBe('First section')
    expect(parsed.sections[1]?.interactive).toBeNull()
    expect(parsed.sections[1]?.bodySource).toContain('First body.')
    expect(parsed.sections[2]?.id).toBe('quiz-1')
    expect(parsed.sections[2]?.title).toBe('')
    expect(parsed.sections[2]?.interactive).toMatchObject({
      kind: 'quiz',
      id: 'quiz-1',
    })
    expect(parsed.sections[2]?.bodySource).toContain('id="quiz-1"')
    expect(parsed.sections[3]?.title).toBe('First section')
    expect(parsed.sections[3]?.interactive).toBeNull()
    expect(parsed.sections[3]?.bodySource).toContain('After quiz.')
    expect(parsed.sections[4]?.title).toBe('Final section')
  })

  it('server-renders split section bodies without leaking neighboring markdown', () => {
    const parsed = parseSectionedChallengeStep({
      source: `---
title: SSR step
stepType: sectioned
---

# SSR step

Intro paragraph.

## First section

First body.

<Quiz
  id="quiz-1"
  question="Question?"
  options={[
    { id: "a", text: "Wrong", isCorrect: false },
    { id: "b", text: "Right", isCorrect: true }
  ]}
  explanation="Because"
/>

After quiz.

- Bullet after quiz

<ExpandableHint>
Helpful note.
</ExpandableHint>
`,
    })

    const renderedMarkup = parsed.sections.map((section) =>
      renderSectionMarkup(section.bodySource),
    )

    expect(renderedMarkup).toHaveLength(4)
    expect(renderedMarkup[0]).toContain('<p>Intro paragraph.</p>')
    expect(renderedMarkup[0]).not.toContain('SSR step')
    expect(renderedMarkup[1]).toContain('<p>First body.</p>')
    expect(renderedMarkup[1]).not.toContain('data-quiz-id=')
    expect(renderedMarkup[2]).toContain('data-quiz-id="quiz-1"')
    expect(renderedMarkup[2]).toContain('Question?')
    expect(renderedMarkup[2]).not.toContain('First body.')
    expect(renderedMarkup[2]).not.toContain('After quiz.')
    expect(renderedMarkup[3]).toContain('<p>After quiz.</p>')
    expect(renderedMarkup[3]).toContain('<li>Bullet after quiz</li>')
    expect(renderedMarkup[3]).toContain('<aside><p>Helpful note.</p></aside>')
    expect(renderedMarkup[3]).not.toContain('data-quiz-id=')
  })

  it('does not create an empty trailing section for a MarkComplete after the last quiz', () => {
    const parsed = parseSectionedChallengeStep({
      source: `---
title: Final CTA step
stepType: sectioned
---

# Final CTA step

## Useful question

Short explanation.

<Quiz
  id="quiz-1"
  question="Question?"
  options={[
    { id: "a", text: "Right", isCorrect: true },
    { id: "b", text: "Wrong", isCorrect: false }
  ]}
  explanation="Because"
/>

<MarkComplete label="Finish" />
`,
    })

    expect(parsed.sections).toHaveLength(2)
    expect(parsed.sections[0]?.title).toBe('Useful question')
    expect(parsed.sections[0]?.interactive).toBeNull()
    expect(parsed.sections[0]?.bodySource).toContain('Short explanation.')
    expect(parsed.sections[1]?.id).toBe('quiz-1')
    expect(parsed.sections[1]?.interactive).toMatchObject({
      kind: 'quiz',
      id: 'quiz-1',
    })
  })

  it('creates one standalone section for each inline quiz in order', () => {
    const parsed = parseSectionedChallengeStep({
      source: `---
title: Multi interactive
stepType: sectioned
---

## Answer

<Quiz
  id="quiz-1"
  question="First quiz"
  options={[
    { id: "a", text: "A", isCorrect: true }
]}
  explanation="Keep this"
/>

<Quiz
  id="quiz-2"
  question="Keep this too"
  options={[
    { id: "a", text: "A", isCorrect: true }
  ]}
  explanation="Also keep this"
/>
`,
    })

    expect(parsed.sections).toHaveLength(2)
    expect(parsed.sections[0]?.interactive).toMatchObject({
      kind: 'quiz',
      id: 'quiz-1',
    })
    expect(parsed.sections[0]?.title).toBe('')
    expect(parsed.sections[0]?.bodySource).toContain('id="quiz-1"')
    expect(parsed.sections[1]?.interactive).toMatchObject({
      kind: 'quiz',
      id: 'quiz-2',
    })
    expect(parsed.sections[1]?.title).toBe('')
    expect(parsed.sections[1]?.bodySource).toContain('id="quiz-2"')
  })

  it('sets hideSectionTitle for sections containing a LessonBudgetContextFlow quiz stage', () => {
    const parsed = parseSectionedChallengeStep({
      source: `---
title: Budget context
stepType: sectioned
---

# Budget context

## Estimate total expenses

<LessonBudgetContextFlow stage="expenses-quiz" />

## Per capita overview

<LessonBudgetContextFlow stage="per-capita" />

## Regular section

Some regular content.
`,
    })

    expect(parsed.sections).toHaveLength(3)
    expect(parsed.sections[0]?.title).toBe('Estimate total expenses')
    expect(parsed.sections[0]?.hideSectionTitle).toBe(true)
    expect(parsed.sections[1]?.title).toBe('Per capita overview')
    expect(parsed.sections[1]?.hideSectionTitle).toBeUndefined()
    expect(parsed.sections[2]?.title).toBe('Regular section')
    expect(parsed.sections[2]?.hideSectionTitle).toBeUndefined()
  })

  it('extracts stable section keys from heading markers', () => {
    const parsed = parseSectionedChallengeStep({
      source: `---
title: Stable keys
stepType: sectioned
---

# Stable keys

## Overview [section-key:overview]

Intro copy.

<Quiz
  id="quiz-1"
  question="Question?"
  options={[
    { id: "a", text: "Right", isCorrect: true }
  ]}
  explanation="Because"
/>

## Summary [section-key:summary]

Wrap-up copy.
`,
    })

    expect(parsed.sections[0]?.sectionKey).toBe('overview')
    expect(parsed.sections[1]?.sectionKey).toBe('quiz-1')
    expect(parsed.sections[2]?.sectionKey).toBe('summary')
  })

  it('extracts lesson challenge descriptors for lesson widgets', () => {
    const parsed = parseSectionedChallengeStep({
      source: `---
title: Lesson widgets
stepType: sectioned
---

# Lesson widgets

## Compare views

<LessonAggregateDetailedCompare />

## Answer the follow-up

<LessonAggregateDetailedQuiz />
`,
    })

    expect(parsed.sections[0]?.lessonChallengeDescriptors).toEqual([
      {
        kind: 'step',
        prefix: 'lesson-aggregate-detailed-compare',
        interactionKind: 'custom',
        scopePolicy: 'entity',
      },
    ])
    expect(parsed.sections[1]?.lessonChallengeDescriptors).toEqual([
      {
        kind: 'step',
        prefix: 'lesson-aggregate-detailed-interpretation',
        interactionKind: 'quiz',
        scopePolicy: 'entity',
      },
    ])
  })

  it('resolves step widget descriptors with runtime interaction IDs', () => {
    expect(
      resolveChallengeStepTrackedInteractions({
        stepId: '05-read-the-real-execution-table',
        descriptors: [
          {
            kind: 'step',
            prefix: 'lesson-execution-table-excerpt',
            interactionKind: 'custom',
            scopePolicy: 'entity',
          },
        ],
      }),
    ).toEqual([
      {
        interactionId:
          'funky:lesson:05_read_the_real_execution_table_lesson_execution_table_excerpt',
        lessonChallengeId:
          'funky:lesson:05_read_the_real_execution_table_lesson_execution_table_excerpt',
        interactionKind: 'custom',
        scopePolicy: 'entity',
      },
    ])
  })

  it('extracts lesson challenge descriptors for civic campaign forms', () => {
    const parsed = parseSectionedChallengeStep({
      source: `---
title: Civic forms
stepType: sectioned
---

# Civic forms

## Website

<PrimarieWebsiteLink ownerChallengeSlug="civic-monitor-and-request" />

## Contact

<PrimarieContactInfo ownerChallengeSlug="civic-monitor-and-request" />

## Contestation

<ContestationBuilder ownerChallengeSlug="civic-participate-and-act" />
`,
    })

    expect(parsed.sections[0]?.lessonChallengeDescriptors).toEqual([
      {
        kind: 'fixed',
        interactionId: 'funky:interaction:city_hall_website',
        interactionKind: 'custom',
        scopePolicy: 'entity',
      },
    ])
    expect(parsed.sections[1]?.lessonChallengeDescriptors).toEqual([
      {
        kind: 'fixed',
        interactionId: 'funky:interaction:city_hall_contact',
        interactionKind: 'custom',
        scopePolicy: 'entity',
      },
    ])
    expect(parsed.sections[2]?.lessonChallengeDescriptors).toEqual([
      {
        kind: 'fixed',
        interactionId: 'funky:interaction:budget_contestation',
        interactionKind: 'custom',
        scopePolicy: 'entity',
      },
    ])
  })

  it('includes hideSectionTitle in the transformed export for dynamic quiz sections', () => {
    const filePath = '/src/content/challenges/steps/test-step/index.en.mdx'
    const transformed = transformSectionedChallengeStepSource({
      filePath,
      source: `---
title: Budget context
stepType: sectioned
---

# Budget context

## Estimate expenses

<LessonBudgetContextFlow stage="expenses-quiz" />
`,
    })

    expect(transformed.didTransform).toBe(true)
    expect(transformed.source).toContain('hideSectionTitle: true')
  })

  it('includes sectionKey in transformed exports when headings declare one', () => {
    const filePath = '/src/content/challenges/steps/test-step/index.en.mdx'
    const transformed = transformSectionedChallengeStepSource({
      filePath,
      source: `---
title: Stable keys
stepType: sectioned
---

## Overview [section-key:overview]

Body.
`,
    })

    expect(transformed.didTransform).toBe(true)
    expect(transformed.source).toContain('sectionKey: "overview"')
  })

  it('includes lesson challenge descriptors in the transformed export', () => {
    const filePath = '/src/content/challenges/steps/test-step/index.en.mdx'
    const transformed = transformSectionedChallengeStepSource({
      filePath,
      source: `---
title: Lesson widgets
stepType: sectioned
---

# Lesson widgets

## Compare views

<LessonAggregateDetailedCompare />
`,
    })

    expect(transformed.didTransform).toBe(true)
    expect(transformed.source).toContain('lessonChallengeDescriptors')
    expect(transformed.source).toContain('lesson-aggregate-detailed-compare')
  })

  it('injects a challengeSections export for sectioned steps', () => {
    const filePath = '/src/content/challenges/steps/test-step/index.en.mdx'
    const transformed = transformSectionedChallengeStepSource({
      filePath,
      source: `---
title: Exported step
stepType: sectioned
---

# Exported step

Intro paragraph.

## First section

Body.
`,
    })

    expect(transformed.didTransform).toBe(true)
    expect(transformed.sections).toHaveLength(2)
    expect(transformed.source).toContain(
      `import ChallengeStepSection0 from "${buildChallengeStepSectionRequestId(filePath, 0)}"`,
    )
    expect(transformed.source).toContain('export const challengeSections =')
    expect(transformed.source).toContain('stepType: sectioned')
    expect(transformed.source).toContain('Component: ChallengeStepSection0')
    expect(transformed.source).not.toContain('"bodySource"')
  })

  it('builds a metadata-only manifest for sectioned challenge steps', () => {
    const manifest = buildChallengeStepSectionMetadataManifest({
      files: [
        {
          filePath: '/src/content/challenges/steps/test-step/index.en.mdx',
          source: `---
title: Exported step
stepType: sectioned
---

# Exported step

## First section

<LessonAggregateDetailedCompare />
`,
        },
      ],
    })

    expect(manifest['test-step']?.en).toEqual([
      {
        id: 'first-section',
        title: 'First section',
        lessonChallengeDescriptors: [
          {
            kind: 'step',
            prefix: 'lesson-aggregate-detailed-compare',
            interactionKind: 'custom',
            scopePolicy: 'entity',
          },
        ],
        interactive: null,
      },
    ])
    expect(manifest['test-step']?.en?.[0]).not.toHaveProperty('bodySource')
    expect(manifest['test-step']?.en?.[0]).not.toHaveProperty('Component')
  })
})
