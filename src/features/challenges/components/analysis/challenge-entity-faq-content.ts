import { z } from 'zod'
import faqContentFile from './challenge-entity-faq-content.json'
import type { ChallengeLocale } from '../../types'

export type ChallengeEntityFaqItem = {
  readonly id: string
  readonly question: string
  readonly answerParagraphs: readonly string[]
  readonly requiresInflationAdjusted?: boolean
}

export type ChallengeEntityFaqContent = {
  readonly title: string
  readonly description?: string
  readonly items: readonly ChallengeEntityFaqItem[]
}

const ChallengeEntityFaqItemSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  answerParagraphs: z.array(z.string().min(1)).min(1),
  requiresInflationAdjusted: z.boolean().optional(),
})

const ChallengeEntityFaqContentSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  items: z.array(ChallengeEntityFaqItemSchema),
})

const ChallengeEntityFaqFileSchema = z.object({
  ro: ChallengeEntityFaqContentSchema,
  en: ChallengeEntityFaqContentSchema,
})

const FALLBACK_FAQ_CONTENT: Record<ChallengeLocale, ChallengeEntityFaqContent> = {
  ro: {
    title: 'Întrebări frecvente',
    description: 'Nu am putut încărca întrebările frecvente momentan.',
    items: [],
  },
  en: {
    title: 'Frequently asked questions',
    description: 'We could not load the frequently asked questions right now.',
    items: [],
  },
}

export function parseChallengeEntityFaqContent(
  rawContent: unknown,
  locale: ChallengeLocale,
  options: {
    readonly inflationAdjusted: boolean
  },
): ChallengeEntityFaqContent {
  const parsedContent = ChallengeEntityFaqFileSchema.safeParse(rawContent)

  if (!parsedContent.success) {
    return FALLBACK_FAQ_CONTENT[locale]
  }

  const localizedContent = parsedContent.data[locale]

  return {
    ...localizedContent,
    items: localizedContent.items.filter(
      (item) =>
        !item.requiresInflationAdjusted || options.inflationAdjusted,
    ),
  }
}

export function getChallengeEntityFaqContent(
  locale: ChallengeLocale,
  options: {
    readonly inflationAdjusted: boolean
  },
): ChallengeEntityFaqContent {
  return parseChallengeEntityFaqContent(faqContentFile, locale, options)
}
