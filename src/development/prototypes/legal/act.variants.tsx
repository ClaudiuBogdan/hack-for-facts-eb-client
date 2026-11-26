import { useMemo, useState, type ReactNode } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { fetchLegalRender } from '@/features/legal/api/legal-render-api'
import { useLegalAct } from '@/features/legal/hooks/use-legal-act'
import { useLegalOutline } from '@/features/legal/hooks/use-legal-outline'
import { useLegalRender } from '@/features/legal/hooks/use-legal-render'
import { uniqueGazettePublication } from '@/features/legal/lib/act-facts'
import { ActDefaultNotices } from '@/features/legal/components/act-default-notices'
import { ActWarnings } from '@/features/legal/components/act-warnings'
import { defaultReadingOf, findVersion, withServedForm } from '@/features/legal/lib/legal-versions'
import { legalIssuerLabel } from '@/features/legal/lib/legal-vocabulary'
import { splitMasthead } from '@/features/legal/lib/tldf/masthead'
import type { LegalActDetail } from '@/schemas/legal'
import { SPECIMEN_ACT, SPECIMEN_SHOWN_DOCUMENT_ID } from './act.fixture'
import { ActNotice, ActPageView, ActTextLoading, ActTextState, SourceLink } from './act.page'
import { ACT_SPECIMEN } from './act.specimen'

const LINK = 'font-medium text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary'

/* ── the specimen: every element, no read ────────────────────────────────── */

function Shown({ what, children }: { readonly what: string; readonly children: ReactNode }) {
  return (
    <div className="border-t py-5">
      <p className="pb-3 text-xs leading-5 text-muted-foreground">{what}</p>
      {children}
    </div>
  )
}

/** The page's other states side by side, with the sentences the page already says in each. */
function PageStates() {
  return (
    <section aria-labelledby="act-stari" className="mt-20 border-t-2 border-foreground pt-6">
      <h2 id="act-stari" className="text-xl font-semibold tracking-tight">
        Stările paginii
      </h2>
      <p className="pb-5 pt-1 text-sm leading-6 text-muted-foreground">Numai în prototip: ce arată pagina când are ceva de spus despre text sau nu are un text de arătat.</p>
      <Shown what="O formă aleasă din adresă">
        <ActNotice
          title={<Trans>Afișezi o versiune anume a textului.</Trans>}
          action={
            <button type="button" className={`${LINK} inline-flex min-h-11 items-center sm:min-h-10`}>
              <Trans>Revino la forma afișată în mod normal</Trans>
            </button>
          }
        />
      </Shown>
      <Shown what="Cea mai nouă formă nu are text">
        <ActNotice tone="caution" title="Cea mai recentă versiune a actului (formă consolidată neoficială, 1 ianuarie 2024) nu are încă text disponibil.">
          Afișăm versiunea din 28 iulie 2022 (formă consolidată neoficială), care nu este versiunea curentă.
        </ActNotice>
      </Shown>
      <Shown what="O legătură către un fragment care nu mai există">
        <ActNotice tone="blocked" title={<Trans>Nu am găsit fragmentul cerut în acest text.</Trans>} />
      </Shown>
      <Shown what="Textul se încarcă">
        <ActTextLoading />
      </Shown>
      <Shown what="Textul nu este încărcat aici">
        <ActTextState title={t`Textul nu este încă disponibil`} action={<SourceLink href="https://legislatie.just.ro/"><Trans>Vezi textul pe legislatie.just.ro</Trans></SourceLink>}>
          {t`Versiunea există pe Portalul Legislativ, dar textul ei nu este încă încărcat aici.`}
        </ActTextState>
      </Shown>
      <Shown what="Încărcarea a eșuat">
        <ActTextState
          title={t`Nu am putut încărca textul`}
          action={
            <Button variant="outline" className="h-11 sm:h-10">
              <Trans>Încearcă din nou</Trans>
            </Button>
          }
        >
          {t`Eroare de rețea sau de server — existența textului rămâne o întrebare deschisă.`}
        </ActTextState>
      </Shown>
      <Shown what="Un text servit în părți">
        <MoreParts loaded={2} total={5} />
      </Shown>
    </section>
  )
}

function MoreParts({ loaded, total, pending = false, onMore }: { readonly loaded: number; readonly total: number; readonly pending?: boolean; readonly onMore?: () => void }) {
  if (loaded >= total) {
    return (
      <p className="pt-8 text-sm text-muted-foreground">
        <Trans>Sfârșitul textului — {total} părți afișate integral.</Trans>
      </p>
    )
  }
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-8">
      <Button variant="outline" className="h-11 sm:h-10" disabled={pending} onClick={onMore}>
        <Trans>Încarcă partea următoare</Trans>
      </Button>
      <p role="status" className="text-sm text-muted-foreground">
        {pending ? (
          <Trans>
            Se încarcă partea {Math.min(loaded + 1, total)} din {total}…
          </Trans>
        ) : (
          <Trans>
            Afișate {loaded} din {total} părți — derulează sau apasă pentru restul.
          </Trans>
        )}
      </p>
    </div>
  )
}

/** The lines of the text's opening that the page head already says, as the live page finds them. */
function mastheadFacts(act: LegalActDetail) {
  const publication = uniqueGazettePublication(act)
  return {
    den: act.canonical?.den ?? null,
    issuerLabel: act.issuerSlug === null ? null : legalIssuerLabel(act.issuerSlug),
    issueNumber: publication?.issueNumber ?? null,
    issueYear: publication?.issueDate ? Number(publication.issueDate.slice(0, 4)) : null,
  }
}

const SPECIMEN_SPLIT = splitMasthead(ACT_SPECIMEN.blocks, mastheadFacts(SPECIMEN_ACT))

export function ActSpecimenPage() {
  const [documentId, setDocumentId] = useState(SPECIMEN_SHOWN_DOCUMENT_ID)
  return (
    <ActPageView
      model={{
        act: SPECIMEN_ACT,
        subject: SPECIMEN_SPLIT.subject,
        shown: findVersion(SPECIMEN_ACT, documentId),
        blocks: SPECIMEN_SPLIT.blocks,
        marks: ACT_SPECIMEN.marks,
        containsNonBmp: false,
        outline: ACT_SPECIMEN.outline,
        mock: true,
        onForm: setDocumentId,
      }}
    >
      <PageStates />
    </ActPageView>
  )
}

/* ── a served act ────────────────────────────────────────────────────────── */

const DEFAULT_ACT = '72159'

function LiveAct({ act }: { readonly act: LegalActDetail }) {
  const reading = defaultReadingOf(act)
  const [picked, setPicked] = useState<string | null>(null)
  const documentId = picked ?? reading.documentId
  return <LiveText key={documentId ?? 'none'} act={act} documentId={documentId} picked={picked !== null && picked !== reading.documentId} reading={reading} onForm={setPicked} />
}

function LiveText({ act, documentId, picked, reading, onForm }: { readonly act: LegalActDetail; readonly documentId: string | null; readonly picked: boolean; readonly reading: ReturnType<typeof defaultReadingOf>; readonly onForm: (documentId: string) => void }) {
  const legalV2 = act.dataSource === 'legal_v2'
  const render = useLegalRender(documentId, { legalV2 })
  const outline = useLegalOutline(documentId)
  const [parts, setParts] = useState(1)
  const manifest = render.data?.kind === 'manifest' ? render.data.tldf : null
  const partQueries = useQueries({
    queries:
      manifest === null || documentId === null
        ? []
        : manifest.chunks.slice(0, parts).map((_, index) => ({
            queryKey: ['prototype-act-part', documentId, index + 1],
            queryFn: ({ signal }: { readonly signal: AbortSignal }) => fetchLegalRender(documentId, { chunkIndex: index + 1, signal }),
            staleTime: Number.POSITIVE_INFINITY,
            retry: false,
          })),
  })
  const loadedParts = partQueries.filter((query) => query.data?.kind === 'chunk').length
  const partBlocks = partQueries.flatMap((query) => (query.data?.kind === 'chunk' ? query.data.tldf.blocks : []))
  const served = render.data?.kind === 'envelope' ? render.data.tldf.blocks : partBlocks
  const split = useMemo(() => splitMasthead(served, mastheadFacts(act)), [served, act])
  // A part compiled in another run than the manifest's is never joined to it: the text is read again whole.
  const recompiled = manifest !== null && partQueries.some((query) => query.data !== undefined && query.data.tldf.generation.run_id !== manifest.generation.run_id)
  const failed = render.isError || partQueries.some((query) => query.isError)
  const queryClient = useQueryClient()
  const readAgain = () => {
    queryClient.removeQueries({ queryKey: ['prototype-act-part', documentId] })
    void render.refetch()
  }
  // As on the live page: the form the render says it served wins over the listed one, and the default's caveats are said.
  const shownId = render.data?.servedForm?.documentId ?? render.data?.documentId ?? documentId
  const shown = withServedForm(findVersion(act, shownId), render.data?.servedForm ?? null)
  const waiting = documentId !== null && (render.isPending || (manifest !== null && loadedParts === 0 && !failed))
  const textState =
    documentId === null ? (
      <ActTextState title={t`Nu avem un text servibil pentru acest act`} action={act.officialTextUrl !== null ? <SourceLink href={act.officialTextUrl}><Trans>Vezi textul pe legislatie.just.ro</Trans></SourceLink> : undefined}>
        {t`Metadatele rămân publice; textul se consultă la sursa oficială.`}
      </ActTextState>
    ) : recompiled ? (
      <ActTextState
        title={t`Documentul a fost recompilat între încărcări — se reîncarcă varianta curentă.`}
        action={
          <Button variant="outline" className="h-11 sm:h-10" onClick={readAgain}>
            <Trans>Încearcă din nou</Trans>
          </Button>
        }
      />
    ) : failed && served.length === 0 ? (
      <ActTextState
        title={t`Nu am putut încărca textul`}
        action={
          <Button variant="outline" className="h-11 sm:h-10" onClick={readAgain}>
            <Trans>Încearcă din nou</Trans>
          </Button>
        }
      >
        {t`Eroare de rețea sau de server — existența textului rămâne o întrebare deschisă.`}
      </ActTextState>
    ) : waiting ? (
      <ActTextLoading />
    ) : undefined
  return (
    <ActPageView
      model={{
        act,
        subject: split.subject,
        shown,
        blocks: split.blocks,
        marks: render.data?.kind === 'chunk' ? [] : (render.data?.tldf.marks ?? []),
        containsNonBmp: render.data?.kind === 'chunk' ? false : (render.data?.tldf.contains_non_bmp ?? false),
        outline: outline.data ?? [],
        mock: false,
        onForm,
        // The live page's own notices, unchanged and not yet restyled: what they say matters more here than how they look.
        notices: (
          <>
            <ActDefaultNotices act={act} shown={shown} notCurrentDefault={!picked && reading.basis === 'latest_available'} onlyReadableDefault={!picked && reading.basis === 'only_readable'} />
            <ActWarnings act={act} variant="row" />
          </>
        ),
        textState,
        afterText: manifest !== null && loadedParts > 0 ? <MoreParts loaded={loadedParts} total={manifest.chunks.length} pending={parts > loadedParts && !failed} onMore={() => setParts(loadedParts + 1)} /> : undefined,
      }}
    />
  )
}

/** A served act in the new page: `?act=<id>` in the address picks it. Reads the dev API through the feature's own hooks. */
export function ActLivePage() {
  const search: { readonly act?: unknown } = useSearch({ strict: false })
  const actId = typeof search.act === 'string' || typeof search.act === 'number' ? String(search.act) : DEFAULT_ACT
  const act = useLegalAct(actId)
  if (act.isPending) {
    return (
      <div className="mx-auto max-w-[42rem] px-4 py-16">
        <ActTextLoading />
      </div>
    )
  }
  if (act.data == null) {
    return (
      <div className="mx-auto max-w-[42rem] px-4 py-16">
        <ActTextState title={act.isError ? 'Nu am putut încărca actul' : `Nu avem actul ${actId}`}>Prototipul citește actul din API-ul de dezvoltare; schimbă numărul din adresă (?act=…).</ActTextState>
      </div>
    )
  }
  return <LiveAct key={act.data.actId} act={act.data} />
}
