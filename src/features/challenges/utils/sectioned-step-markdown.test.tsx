import type { ComponentType, ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { evaluateSync } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import * as jsxRuntime from 'react/jsx-runtime'
import { describe, expect, it } from 'vitest'
import {
  buildChallengeStepSectionRequestId,
  parseSectionedChallengeStep,
  transformSectionedChallengeStepSource,
} from './sectioned-step-markdown.build'

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
})
