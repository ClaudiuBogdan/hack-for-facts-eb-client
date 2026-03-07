import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ChallengeLocale } from '../../types'
import { getChallengeEntityFaqContent } from './challenge-entity-faq-content'

type ChallengeEntityFaqSectionProps = {
  readonly locale: ChallengeLocale
  readonly inflationAdjusted: boolean
}

export function ChallengeEntityFaqSection({
  locale,
  inflationAdjusted,
}: ChallengeEntityFaqSectionProps) {
  const content = getChallengeEntityFaqContent(locale, {
    inflationAdjusted,
  })

  return (
    <Card className="rounded-[28px] border-border/50 shadow-sm">
      <CardHeader className="space-y-2 pb-4">
        <CardTitle className="text-xl font-black tracking-tight">
          {content.title}
        </CardTitle>
        {content.description ? (
          <p className="text-sm text-muted-foreground sm:max-w-2xl">
            {content.description}
          </p>
        ) : null}
      </CardHeader>

      <CardContent className="pt-0">
        {content.items.length > 0 ? (
          <Accordion type="single" collapsible className="border-t border-border/40">
            {content.items.map((item) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className="border-border/40"
              >
                <AccordionTrigger className="gap-3 py-5 text-sm font-semibold tracking-tight text-foreground hover:no-underline sm:gap-6 sm:text-base">
                  <span className="text-left">{item.question}</span>
                </AccordionTrigger>
                <AccordionContent className="pb-5">
                  <div className="space-y-3 pr-0 text-sm leading-6 text-muted-foreground sm:max-w-3xl sm:pr-8">
                    {item.answerParagraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="border-t border-border/40 pt-5 text-sm text-muted-foreground">
            {content.description}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
