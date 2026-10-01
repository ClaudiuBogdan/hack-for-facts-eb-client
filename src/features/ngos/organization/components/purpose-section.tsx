import { useId, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Info, X } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { Close as PopoverClose } from '@radix-ui/react-popover'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatNgoDate } from '@/features/ngos/hub/ngo-format'
import { HomeBand } from '@/features/procurement/components/home/home-section-nav'
import { HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import type { NgoOrganization } from '../api'
import { purposeSegments, type MaskKind } from '../words'

/** Where a purpose runs past this, its first lines show and the rest is a click away. */
const PURPOSE_SHOWN = 600

function maskLabel(kind: MaskKind): string {
  switch (kind) {
    case 'person':
      return t`persoană`
    case 'location':
      // Its own context: „loc" is also a ranking's place elsewhere.
      return t({ message: 'loc', context: 'date ascunse de registru' })
    case 'organization':
      return t`organizație`
    case 'facility':
      return t`clădire`
    case 'other':
      return t`date ascunse`
  }
}

/**
 * Where the registry's text hides words as personal data: a badge naming
 * the kind the mark claims, never the bare „<PERSON>", and what it means a
 * click away — the mark quoted, and no more claimed than is known: it
 * stands for one or more words hidden, sometimes ordinary ones („drepturilor
 * <PERSON>"). Out of the Tab order while the text around it is clipped.
 */
function MaskedData({ kind, token, focusable }: { readonly kind: MaskKind; readonly token: string; readonly focusable: boolean }) {
  const label = maskLabel(kind)
  const id = useId()
  return (
    <Popover>
      <PopoverTrigger
        tabIndex={focusable ? undefined : -1}
        aria-label={t`Ascuns în registru: ${label}. De ce?`}
        className="mx-0.5 inline-flex items-center gap-1 rounded-sm border border-dashed border-muted-foreground/45 bg-muted/50 px-1.5 align-baseline font-mono text-[0.8em] leading-snug text-muted-foreground transition-colors hover:border-foreground/50 hover:text-foreground"
      >
        {label}
        <Info className="size-3 shrink-0" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`} className="w-[min(92vw,22rem)] space-y-2 text-sm leading-relaxed">
        <div className="flex items-start justify-between gap-3">
          <p id={`${id}-title`} className="pt-1.5 font-medium text-foreground">
            <Trans>Text ascuns în registru</Trans>
          </p>
          <PopoverClose aria-label={t`Închide`} className="-mr-2 -mt-1 inline-flex size-9 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="size-4" aria-hidden="true" />
          </PopoverClose>
        </div>
        <p id={`${id}-body`} className="text-muted-foreground">
          <Trans>
            În textul din registru, semnul <code className="font-mono text-xs text-foreground">{token}</code> ține locul unuia sau mai multor cuvinte, ascunse ca
            date personale. Semnul nu spune ce a înlocuit: uneori e un cuvânt obișnuit. Textul ascuns nu se poate citi pe platformă.
          </Trans>
        </p>
      </PopoverContent>
    </Popover>
  )
}

/** The purpose's text as the registry published it — line breaks kept — its masks as badges. */
function PurposeText({ text, id, clamped }: { readonly text: string; readonly id: string; readonly clamped: boolean }) {
  return (
    // pre-wrap: the registry's line breaks and indents, exactly as published.
    <p id={id} className={cn('whitespace-pre-wrap text-lg leading-relaxed text-foreground', clamped && 'line-clamp-[8]')}>
      {purposeSegments(text).map((segment, index) =>
        'text' in segment ? (
          <span key={index}>{segment.text}</span>
        ) : (
          // A badge the clamp hides is no Tab stop: focusing it would scroll the clipped text to its end.
          <MaskedData key={index} kind={segment.mask} token={segment.token} focusable={!clamped} />
        ),
      )}
    </p>
  )
}

/**
 * The profile's first band: what the organisation says it is for, the
 * registry's „Scop", exactly as published, dated by the registry export it
 * was read from. Shown only where the registry's observations agree on a
 * text (`purposeText`).
 */
export function PurposeSection({ organization, text, index }: { readonly organization: NgoOrganization; readonly text: string; readonly index: string }) {
  const [open, setOpen] = useState(false)
  const long = text.length > PURPOSE_SHOWN || text.split('\n').length > 8
  const captured = formatNgoDate(organization.snapshot.capturedAt.slice(0, 10))
  const url = organization.snapshot.sourceUrl
  return (
    <HomeBand id="scop" labelledBy="ngo-profile-purpose-title">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <HubSectionHead titleId="ngo-profile-purpose-title" index={index} title={<Trans>Ce își propune</Trans>} />
          <MonoLabel className="mt-4 block leading-relaxed text-muted-foreground" data-reveal>
            <Trans>
              Scopul din{' '}
              <a href={url} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
                Registrul național ONG
              </a>
              , citit la {captured}
            </Trans>
          </MonoLabel>
        </div>
        <div className="min-w-0 max-w-[65ch] lg:col-span-8" data-reveal>
          <PurposeText text={text} id="ngo-profile-purpose" clamped={long && !open} />
          {long ? (
            <button
              type="button"
              aria-expanded={open}
              aria-controls="ngo-profile-purpose"
              onClick={() => setOpen((value) => !value)}
              className="mt-3 inline-flex min-h-10 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              {open ? <Trans>Arată mai puține</Trans> : <Trans>Arată mai multe</Trans>}
            </button>
          ) : null}
        </div>
      </div>
    </HomeBand>
  )
}
