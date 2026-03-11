import { describe, expect, it } from 'vitest'
import {
  createChallengeStepContentIndex,
  resolveChallengeStepContent,
  type ChallengeStepMdxModule,
} from './challenge-step-content-resolver'

function ArticleComponent() {
  return null
}

function IntroSectionComponent() {
  return null
}

function FallbackSectionComponent() {
  return null
}

describe('challenge-step-content-resolver', () => {
  it('returns precompiled section components without runtime hydration', () => {
    const modules: Record<string, ChallengeStepMdxModule> = {
      '/src/content/challenges/steps/test-step/index.en.mdx': {
        default: ArticleComponent,
        frontmatter: { stepType: 'sectioned' },
        challengeSections: [
          {
            id: 'intro',
            title: 'Intro',
            interactive: null,
            Component: IntroSectionComponent,
          },
        ],
      },
    }

    const result = resolveChallengeStepContent({
      contentDir: 'test-step',
      locale: 'en',
      contentIndex: createChallengeStepContentIndex(modules),
    })

    expect(result.error).toBeNull()
    expect(result.content?.kind).toBe('sectioned')
    expect(result.content?.sections).toHaveLength(1)
    expect(result.content?.sections[0]?.Component).toBe(IntroSectionComponent)
  })

  it('falls back to the default locale when the requested locale is missing', () => {
    const modules: Record<string, ChallengeStepMdxModule> = {
      '/src/content/challenges/steps/test-step/index.en.mdx': {
        default: ArticleComponent,
        frontmatter: {},
      },
    }

    const result = resolveChallengeStepContent({
      contentDir: 'test-step',
      locale: 'ro',
      contentIndex: createChallengeStepContentIndex(modules),
    })

    expect(result.error).toBeNull()
    expect(result.content?.kind).toBe('article')
    expect(result.content?.Component).toBe(ArticleComponent)
  })

  it('falls back to the default locale for sectioned steps without losing sections', () => {
    const modules: Record<string, ChallengeStepMdxModule> = {
      '/src/content/challenges/steps/test-step/index.en.mdx': {
        default: ArticleComponent,
        frontmatter: { stepType: 'sectioned' },
        challengeSections: [
          {
            id: 'intro',
            title: 'Intro',
            interactive: null,
            Component: FallbackSectionComponent,
          },
        ],
      },
    }

    const result = resolveChallengeStepContent({
      contentDir: 'test-step',
      locale: 'ro',
      contentIndex: createChallengeStepContentIndex(modules),
    })

    expect(result.error).toBeNull()
    expect(result.content?.kind).toBe('sectioned')
    expect(result.content?.Component).toBe(ArticleComponent)
    expect(result.content?.sections).toHaveLength(1)
    expect(result.content?.sections[0]?.Component).toBe(FallbackSectionComponent)
  })

  it('reports missing section exports for sectioned steps', () => {
    const modules: Record<string, ChallengeStepMdxModule> = {
      '/src/content/challenges/steps/test-step/index.en.mdx': {
        default: ArticleComponent,
        frontmatter: { stepType: 'sectioned' },
      },
    }

    const result = resolveChallengeStepContent({
      contentDir: 'test-step',
      locale: 'en',
      contentIndex: createChallengeStepContentIndex(modules),
    })

    expect(result.content).toBeNull()
    expect(result.error).toContain('Missing sectioned step content export')
  })
})
