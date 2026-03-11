import { describe, expect, it } from 'vitest'
import {
  parseSectionedChallengeStep,
  transformSectionedChallengeStepSource,
} from './sectioned-step-markdown'

describe('parseSectionedChallengeStep', () => {
  it('splits sectioned content by top-level h2 headings and preserves intro content', () => {
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

## Final section

Last body.
`,
    })

    expect(parsed.frontmatter.stepType).toBe('sectioned')
    expect(parsed.sections).toHaveLength(3)
    expect(parsed.sections[0]?.id).toBe('intro')
    expect(parsed.sections[0]?.title).toBe('Test step')
    expect(parsed.sections[0]?.bodySource).toContain('Intro paragraph.')
    expect(parsed.sections[1]?.title).toBe('First section')
    expect(parsed.sections[1]?.interactive).toMatchObject({
      kind: 'quiz',
      id: 'quiz-1',
    })
    expect(parsed.sections[2]?.title).toBe('Final section')
  })

  it('keeps only the first supported interactive per section', () => {
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
  question="Should be ignored"
  options={[
    { id: "a", text: "A", isCorrect: true }
  ]}
  explanation="Ignored"
/>
`,
    })

    expect(parsed.sections).toHaveLength(1)
    expect(parsed.sections[0]?.interactive).toMatchObject({
      kind: 'quiz',
      id: 'quiz-1',
    })
    expect(parsed.sections[0]?.bodySource).toContain('id="quiz-1"')
    expect(parsed.sections[0]?.bodySource).not.toContain('id="quiz-2"')
  })

  it('injects a challengeSections export for sectioned steps', () => {
    const transformed = transformSectionedChallengeStepSource(`---
title: Exported step
stepType: sectioned
---

# Exported step

Intro paragraph.

## First section

Body.
`)

    expect(transformed.didTransform).toBe(true)
    expect(transformed.sections).toHaveLength(2)
    expect(transformed.source).toContain('export const challengeSections =')
    expect(transformed.source).toContain('stepType: sectioned')
    expect(transformed.source).toContain('"id": "intro"')
    expect(transformed.source).toContain('"title": "First section"')
  })
})
