import { useEffect, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { ArrowLeft, Clock, ExternalLink, FileQuestion, Info } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HubLoadError, HubPending } from '@/features/statistics/components/hub/hub-chrome'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { useWarmRouteCode } from '@/hooks/use-warm-route-code'
import { CaRecordsOffError, type ContractAwardRead } from '../../api/procurement-contract-award-api'
import { useContractAward } from '../../hooks/use-procurement-contract-award'
import { procurementContractAwardKeys } from '../../lib/contract-award-keys'
import { authorityNameOf, caRecordNotes, type ContractAward } from '../../lib/contract-award-model'
import { caAmountLabel, caAmountText, caKindText, caVatText, fullDayText as fullDay, lotEstimateText, signedLei, winnersUnnamedText } from '../../lib/contract-award-text'
import { categoryOfCode } from '../../lib/home-categories'
import { buildContractAwardDocumentTitle } from '../../lib/procurement-page-titles'
import { CpvLabel } from '../cpv-label'
import { CaPartyName } from './contract-award-party'

/**
 * One contract award served from procurement v3
 * (`/procurement/contract-awards/$id`, PROC-KB0Z step 1): what was awarded,
 * by whom, to whom, for how much and when, its lots, and the portal's notice.
 *
 * The id is build-scoped: an earlier build's id still resolves, and the page
 * moves to the current one. An award from before 2021 exists and is not
 * published yet; an id the API has no award for is not found; the API's
 * switch off is „not available now" — three answers kept apart.
 */

export interface ProcurementContractAwardInitialData {
  /** The direct acquisitions' publication a server render was read under; null: unknown. Absent: not a server render. */
  readonly disclosure?: string | null
  readonly disclosureReadAt?: number
  readonly id: string
  /** Absent: not read on the server (a client-side navigation, or a failed read). */
  readonly read?: ContractAwardRead
  /** The API serves no contract awards now. */
  readonly off?: true
}

export function ProcurementContractAwardPage({ id, initialData }: { readonly id: string; readonly initialData?: ProcurementContractAwardInitialData }) {
  const own = initialData?.id === id ? initialData : undefined
  const query = useContractAward(id, own?.read)
  // A failed read wins over an answer kept from before it: a winner withdrawn since, or the switch turned off, is never
  // shown from an older read.
  const read = query.isError ? undefined : query.data
  const { i18n } = useLingui()
  const award = read?.kind === 'found' ? read.award : null
  useClientDocumentTitle(buildContractAwardDocumentTitle(i18n, { title: award?.title ?? null, authorityName: authorityNameOf(award) }))
  useWarmRouteCode('/procurement/institutions/$cui')
  useCurrentId(id, read)

  if (award) return <AwardSheet award={award} />
  if (read?.kind === 'missing') return <AwardNotice icon={<FileQuestion className="size-6 text-muted-foreground" aria-hidden="true" />} title={t`Contractul nu a fost găsit`} text={t`Nu există un contract atribuit cu identificatorul ${id} în datele publicate.`} />
  if (read?.kind === 'outside') return <AwardNotice icon={<Clock className="size-6 text-muted-foreground" aria-hidden="true" />} title={t`Contractul nu este încă publicat`} text={t`Contractul a fost atribuit înainte de 2021. Contractele atribuite înainte de 2021 nu sunt încă publicate.`} />
  if (query.error instanceof CaRecordsOffError || (own?.off && query.isPending)) {
    return <AwardNotice icon={<Clock className="size-6 text-muted-foreground" aria-hidden="true" />} title={t`Contractul nu este disponibil acum`} text={t`Platforma nu servește acum contractele atribuite. Revino mai târziu.`} />
  }
  return (
    <AwardFrame>
      <div className="mt-8 h-12 w-2/3 animate-pulse bg-muted/70 sm:h-16" aria-hidden="true" />
      {query.isError ? (
        <div className="mt-8">
          <HubLoadError onRetry={() => void query.refetch()} />
        </div>
      ) : (
        <HubPending className="mt-6 max-w-xl" rows={4} />
      )}
    </AwardFrame>
  )
}

/**
 * An id from an earlier build that the API resolved to the current one: the
 * URL becomes the current id, the history entry replaced, and the old key
 * keeps nothing.
 */
function useCurrentId(id: string, read: ContractAwardRead | undefined) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const target = read?.kind === 'found' && read.award.recordId !== id ? read.award.recordId : null
  useEffect(() => {
    if (!target) return
    void navigate({ to: '/procurement/contract-awards/$id', params: { id: target }, replace: true }).then(() =>
      queryClient.removeQueries({ queryKey: procurementContractAwardKeys.award(id), exact: true }),
    )
  }, [target, id, navigate, queryClient])
}

function AwardFrame({ back, children }: { readonly back?: ReactNode; readonly children: ReactNode }) {
  return (
    <div className="bg-background">
      <section className="relative border-b">
        <TwoLayerLattice idPrefix="contract-award" />
        <RuledFrame className="relative py-10 sm:py-14">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {back ?? (
              <Link to="/procurement" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground sm:min-h-0">
                <ArrowLeft className="size-4" aria-hidden="true" />
                <Trans>Achiziții publice</Trans>
              </Link>
            )}
          </div>
          {children}
        </RuledFrame>
      </section>
    </div>
  )
}

function AwardNotice({ icon, title, text }: { readonly icon: ReactNode; readonly title: string; readonly text: string }) {
  return (
    <AwardFrame>
      <div role="status" className="mt-8 max-w-[60ch]">
        {icon}
        <p className="mt-3 text-lg font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
    </AwardFrame>
  )
}

function Fact({ term, children }: { readonly term: ReactNode; readonly children: ReactNode }) {
  return (
    <div className="border-t py-3 sm:grid sm:grid-cols-12 sm:gap-6">
      <dt className="text-sm text-muted-foreground sm:col-span-4">{term}</dt>
      <dd className="mt-1 min-w-0 text-sm text-foreground sm:col-span-8 sm:mt-0">{children}</dd>
    </div>
  )
}

function AwardSheet({ award }: { readonly award: ContractAward }) {
  const { i18n } = useLingui()
  const year = award.awardDay ? Number(award.awardDay.slice(0, 4)) : undefined
  const title = award.title ?? (award.cpvCode ? i18n._(categoryOfCode(award.cpvCode).label) : t`Contract atribuit`)
  const notes = award.winnersUnnamed ? [winnersUnnamedText(), ...caRecordNotes(award)] : caRecordNotes(award)
  const buyer = award.buyer
  const back =
    buyer && buyer.kind === 'company' && buyer.authority && buyer.code ? (
      <Link
        to="/procurement/institutions/$cui"
        params={{ cui: buyer.code }}
        search={year === undefined ? {} : { year }}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground sm:min-h-0"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        <Trans>Instituția</Trans>
      </Link>
    ) : undefined
  return (
    <>
      <AwardFrame back={back}>
        <MonoLabel className="mt-8 block text-muted-foreground">
          {caKindText(award.contractKind)}
          {award.underReview ? <> · {t`în verificare`}</> : null}
        </MonoLabel>
        <h1 className="mt-3 max-w-[30ch] text-2xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">{title}</h1>
        <p className="mt-4 text-3xl font-semibold tabular-nums text-foreground sm:text-4xl">{caAmountText(award, true)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {caAmountLabel(award)}
          {award.amountLei !== null ? <> · {caVatText(award.vatBasis)}</> : null}
        </p>
      </AwardFrame>
      <RuledFrame className="py-10 sm:py-14">
        <dl className="max-w-4xl border-b">
          <Fact term={<Trans>Cumpărător</Trans>}>{buyer ? <CaPartyName shown={buyer} role="buyer" year={year} /> : <span className="text-muted-foreground">{t`Necunoscut`}</span>}</Fact>
          <Fact term={award.winners.length > 1 ? <Trans>Câștigători</Trans> : <Trans>Câștigător</Trans>}>
            {award.winners.length === 0 ? (
              <span className="text-muted-foreground">{t`Niciun câștigător publicat`}</span>
            ) : (
              <ul className="space-y-1">
                {award.winners.map((winner, index) => (
                  <li key={`${winner.order ?? 'x'}-${index}`}>
                    <CaPartyName shown={winner.shown} role="winner" year={year} />
                  </li>
                ))}
              </ul>
            )}
          </Fact>
          <Fact term={<Trans>Data atribuirii</Trans>}>{award.awardDay ? fullDay(award.awardDay) : <span className="text-muted-foreground">{t`nepublicată`}</span>}</Fact>
          {award.publicationDay ? <Fact term={<Trans>Data publicării</Trans>}>{fullDay(award.publicationDay)}</Fact> : null}
          <Fact term={<Trans>Categoria (CPV)</Trans>}>
            <CpvLabel code={award.cpvCode} />
          </Fact>
          {award.noticeNo ? <Fact term={<Trans>Anunțul de atribuire</Trans>}>{award.noticeNo}</Fact> : null}
          {award.changeLei !== null ? (
            <Fact term={<Trans>Modificare de preț</Trans>}>
              {award.changeDay ? (
                <Trans>
                  {signedLei(award.changeLei)}, publicată pe {fullDay(award.changeDay)}: ultima modificare raportată, neadunată la valoare.
                </Trans>
              ) : (
                <Trans>{signedLei(award.changeLei)}: ultima modificare raportată, neadunată la valoare.</Trans>
              )}
            </Fact>
          ) : null}
          {award.sourceUrl ? (
            <Fact term={<Trans>Sursa</Trans>}>
              <a href={award.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium underline underline-offset-4">
                <Trans>Anunțul în SEAP</Trans>
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </Fact>
          ) : null}
        </dl>
        {notes.length > 0 ? (
          <ul className="mt-6 max-w-[70ch] space-y-2 text-sm text-muted-foreground">
            {notes.map((note) => (
              <li key={note} className="flex gap-2">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {award.lots.length > 0 ? <AwardLots award={award} /> : null}
        <p className="mt-10 max-w-[80ch] text-xs leading-relaxed text-muted-foreground">
          {award.ceiling ? (
            <Trans>Sursa: SEAP și e-licitatie.ro. Valoarea e cea maximă a acordului-cadru, nu o plată. Contractele atribuite înainte de 2021 nu sunt încă publicate.</Trans>
          ) : (
            <Trans>Sursa: SEAP și e-licitatie.ro. Valoarea e cea atribuită, nu o plată. Contractele atribuite înainte de 2021 nu sunt încă publicate.</Trans>
          )}
        </p>
      </RuledFrame>
    </>
  )
}

function AwardLots({ award }: { readonly award: ContractAward }) {
  return (
    <section className="mt-12" aria-labelledby="award-lots-title">
      <h2 id="award-lots-title" className="text-lg font-semibold tracking-tight text-foreground">
        {award.lots.length === 1 ? <Trans>Lotul</Trans> : <Trans>Loturile</Trans>}
      </h2>
      <p className="mt-1 max-w-[70ch] text-xs text-muted-foreground">
        <Trans>Valoarea unui lot e cea estimată în anunț, nu cea atribuită; loturile nu se adună.</Trans>
      </p>
      <ol className="mt-4 border-b">
        {award.lots.map((lot) => (
          <li key={lot.order} className="border-t py-3 text-sm">
            <p className="font-medium text-foreground">
              {lot.number ? <span className="text-muted-foreground">{t`Lotul ${lot.number}`} · </span> : null}
              {lot.title ?? <CpvLabel code={lot.cpvCode} variant="compact" />}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {[lotEstimateText(lot), lot.euFunded ? t`fonduri europene` : null, lot.cancelled ? t`anulat` : null]
                .filter((part): part is string => part !== null)
                .join(' · ')}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
