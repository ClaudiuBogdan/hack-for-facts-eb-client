import type { ComponentType, RefObject } from 'react'
import { t } from '@lingui/core/macro'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { MdxContentProps } from './challenge-step-player.shared'
import { SECTIONED_STEP_PROSE_CLASS_NAME } from './challenge-step-player.utils'

type SectionedStepViewportProps = {
  readonly stepTitle: string
  readonly headerTitle: string | null
  readonly hasPreviousSection: boolean
  readonly hasNextSection: boolean
  readonly onGoToPreviousSection: () => void
  readonly onGoToNextSection: () => void
  readonly CurrentSectionComponent: ComponentType<MdxContentProps>
  readonly mdxComponents: MdxContentProps['components']
  readonly scrollAreaRef: RefObject<HTMLDivElement | null>
}

export function SectionedStepViewport({
  stepTitle,
  headerTitle,
  hasPreviousSection,
  hasNextSection,
  onGoToPreviousSection,
  onGoToNextSection,
  CurrentSectionComponent,
  mdxComponents,
  scrollAreaRef,
}: SectionedStepViewportProps) {
  return (
    <div className="flex-1 overflow-visible lg:overflow-hidden">
      <div className="mx-auto flex h-full max-w-2xl flex-col px-4 sm:px-6 lg:px-0">
        <div
          ref={scrollAreaRef}
          data-testid="sectioned-step-scroll-area"
          className="flex-1 overflow-visible lg:overflow-y-auto"
        >
          <div className="space-y-6 py-8 pb-32 lg:pb-12">
            <div className="group/title relative mx-auto w-full max-w-2xl">
              {hasPreviousSection ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onGoToPreviousSection}
                  aria-label={t`Go to previous section`}
                  className="pointer-events-auto absolute left-0 top-0 hidden h-12 w-12 rounded-full border-border/70 bg-background/95 opacity-0 shadow-sm transition-all duration-200 group-hover/title:opacity-100 hover:bg-background lg:inline-flex"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              ) : null}

              <div className="mx-auto max-w-xl space-y-2 text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  {stepTitle}
                </div>
                {headerTitle ? (
                  <h2 className="text-3xl font-black tracking-tight text-foreground">{headerTitle}</h2>
                ) : null}
              </div>

              {hasNextSection ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onGoToNextSection}
                  aria-label={t`Go to next section`}
                  className="pointer-events-auto absolute right-0 top-0 hidden h-12 w-12 rounded-full border-border/70 bg-background/95 opacity-0 shadow-sm transition-all duration-200 group-hover/title:opacity-100 hover:bg-background lg:inline-flex"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            <div className={SECTIONED_STEP_PROSE_CLASS_NAME}>
              <CurrentSectionComponent components={mdxComponents} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
