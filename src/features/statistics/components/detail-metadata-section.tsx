import { Trans, useLingui } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import type { InsDataset } from '@/schemas/ins'
import { statisticsTheme } from '../lib/statistics-theme'
import { stripSourceMarker } from '../lib/published-text'
import { PublishedText } from './published-text'

type Props = {
  readonly dataset: InsDataset
}

/**
 * What INS publishes ABOUT the matrix on its own TEMPO page, beyond the
 * definition the header already shows: methodology, data sources,
 * observations and series continuity. One closed accordion so the page stays
 * a disclosure ladder; every row's trigger says whether it has something to
 * open.
 *
 * The source's last update is NOT a row here. A date is a fact, not a section,
 * and dressing it as one put a disclosure control over a string already fully
 * visible in its own trigger. It belongs beside the data it dates — see
 * `DetailSourceLine`, at the foot of the series band. Text is served verbatim and rendered
 * through PublishedText (links only for absolute http(s) anchors).
 *
 * Language: the English text when the app runs in English and INS published
 * it, the Romanian text otherwise — the Romanian object is the identity.
 */
export function DetailMetadataSection({ dataset }: Props) {
  const { i18n } = useLingui()
  const english = i18n.locale.toLowerCase().startsWith('en')
  const pick = (ro: string | null | undefined, en: string | null | undefined) =>
    (english ? en : null) ?? ro ?? null

  const methodology = pick(dataset.methodology_ro, dataset.methodology_en)
  const observations = pick(dataset.observations_ro, dataset.observations_en)
  // The structured list (with source types) is the Romanian one; INS publishes
  // English NAMES only, and the two lists are not reliably in the same order
  // (their link numbers differ on 18 matrices), so English shows the English
  // names without a type badge rather than a type guessed by position.
  const romanianSources = dataset.data_sources ?? []
  const englishNames = english
    ? (dataset.data_sources_en ?? '')
        .split('\n')
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
    : []
  const sources: readonly { name: string; type: string | null }[] =
    englishNames.length > 0
      ? englishNames.map((name) => ({ name, type: null }))
      : romanianSources.map((source) => ({
          name: source.name,
          type: source.type,
        }))
  const discontinuedAfter = pick(
    dataset.discontinued_after_ro,
    dataset.discontinued_after_en,
  )
  const successor = dataset.successor_dataset_code ?? null
  const predecessors = dataset.continues_from ?? []
  const hasContinuity =
    discontinuedAfter !== null || successor !== null || predecessors.length > 0

  if (
    methodology === null &&
    observations === null &&
    sources.length === 0 &&
    !hasContinuity
  ) {
    return null
  }

  return (
    <section className="space-y-2" data-testid="dataset-metadata">
      <h2 className={statisticsTheme.sectionLabel}>
        <Trans>Despre acest set de date</Trans>
      </h2>
      <Accordion type="multiple" className={statisticsTheme.band}>
        {methodology !== null ? (
          <AccordionItem value="metodologie" className="px-4 last:border-b-0">
            <AccordionTrigger className="text-sm font-medium">
              <Trans>Metodologie</Trans>
            </AccordionTrigger>
            <AccordionContent>
              <PublishedText text={methodology} />
            </AccordionContent>
          </AccordionItem>
        ) : null}

        {sources.length > 0 ? (
          <AccordionItem value="surse" className="px-4 last:border-b-0">
            <AccordionTrigger className="text-sm font-medium">
              <Trans>Surse de date ({sources.length})</Trans>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2">
                {sources.map((source, index) => (
                  <li
                    key={`${source.name}-${index}`}
                    className="flex flex-wrap items-center gap-2 text-sm"
                  >
                    <span>{stripSourceMarker(source.name)}</span>
                    {source.type ? (
                      <Badge variant="outline" className="text-xs font-normal">
                        {source.type}
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ) : null}

        {observations !== null ? (
          <AccordionItem value="observatii" className="px-4 last:border-b-0">
            <AccordionTrigger className="text-sm font-medium">
              <Trans>Observații INS</Trans>
            </AccordionTrigger>
            <AccordionContent>
              <PublishedText text={observations} />
            </AccordionContent>
          </AccordionItem>
        ) : null}

        {hasContinuity ? (
          <AccordionItem value="continuitate" className="px-4 last:border-b-0">
            <AccordionTrigger className="text-sm font-medium">
              <Trans>Continuitatea seriei</Trans>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm">
              {discontinuedAfter !== null ? (
                <p>
                  <Trans>Seria se încheie cu perioada „{discontinuedAfter}”.</Trans>{' '}
                  {successor !== null ? (
                    <Trans>
                      Continuă în{' '}
                      <Link
                        to="/ins/seturi/$cod"
                        params={{ cod: successor }}
                        className="font-mono underline underline-offset-2"
                      >
                        {successor}
                      </Link>
                      .
                    </Trans>
                  ) : null}
                </p>
              ) : null}
              {predecessors.length > 0 ? (
                <div className="space-y-1">
                  <p>
                    <Trans>Continuă seriile:</Trans>
                  </p>
                  <ul className="list-inside list-disc space-y-1">
                    {predecessors.map((link) => (
                      <li key={link.dataset_code}>
                        <Link
                          to="/ins/seturi/$cod"
                          params={{ cod: link.dataset_code }}
                          className="font-mono underline underline-offset-2"
                        >
                          {link.dataset_code}
                        </Link>{' '}
                        <span className="text-muted-foreground">
                          <Trans>
                            (până la{' '}
                            {pick(link.last_period_ro, link.last_period_en) ??
                              link.last_period_ro}
                            )
                          </Trans>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        ) : null}

      </Accordion>
    </section>
  )
}
