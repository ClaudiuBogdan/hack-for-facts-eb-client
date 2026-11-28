import { t } from '@lingui/core/macro'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CruxMarks } from '@/features/landing/components/hero-chrome'
import { useFormat } from '../shared/parts'
import { useElectionEvents } from './data'
import { PROTOTYPE_MARKER, WayHome } from './parts'

/**
 * The details pages' head (an election, a race, a place): legislation's slim shell without its sibling row — the
 * way home, the title, one sentence, the source line. The live pages keep their bodies; only the head changes.
 * Shown on the 2024 parliamentary election, read live.
 */
export function DetailsHead() {
  const events = useElectionEvents()
  const format = useFormat()
  const event = events.data?.find((item) => item.eventKey === 'ro:parliamentary:2024')
  const day = event?.occurrences[0]
  const chamber = day?.offices.find((office) => office.office === 'chamber')?.contests
  const senate = day?.offices.find((office) => office.office === 'senate')?.contests
  return (
    <div className="relative w-full overflow-x-clip bg-background [font-feature-settings:'ss03']" data-dev-marker={PROTOTYPE_MARKER}>
      <header className="relative border-b">
        <RuledFrame className="py-8 sm:py-10">
          <WayHome trail={[{ label: t`Alegeri`, href: '/development/elections/pagini?v=principal' }, { label: t`Parlamentare 2024` }]} />
          <h1 className="mt-3 text-3xl font-extrabold leading-[1.02] tracking-tighter text-foreground sm:mt-4 sm:text-5xl">{t`Parlamentare 2024`}</h1>
          <p className="mt-3 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
            {day && chamber && senate
              ? t`Camera Deputaților și Senatul, ${format.day(day.ballotDate)}: ${chamber} curse pentru Cameră și ${senate} pentru Senat, pe județe și în străinătate.`
              : t`Camera Deputaților și Senatul.`}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {event?.publication ? t`Surse: rezultatele oficiale, publicate în platformă pe ${format.day(event.publication.activatedAt)}.` : t`Surse: rezultatele oficiale.`}
          </p>
          <span className="absolute inset-x-0 top-full z-30 mt-px" aria-hidden="true">
            <CruxMarks />
          </span>
        </RuledFrame>
      </header>
      <RuledFrame className="py-10 text-sm text-muted-foreground">
        <p className="max-w-[60ch]">
          {t`Corpul paginii rămâne cel de azi (cursele pe funcții, județe și pagini).`}{' '}
          <a href="/alegeri/ro%3Aparliamentary%3A2024" className="font-medium text-foreground underline underline-offset-4">
            {t`Pagina de azi`}
          </a>
        </p>
      </RuledFrame>
    </div>
  )
}
