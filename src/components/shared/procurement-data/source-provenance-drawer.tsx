import { useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { ProvenanceInfo } from '@/schemas/procurement'

type Props = {
  readonly provenance: ProvenanceInfo
  readonly trigger: React.ReactNode
}

/**
 * Sheet/Drawer with source label + link, scraper reference, retrieval /
 * publication dates, and a bulleted parser-caveats list. Focus-managed via
 * Radix Dialog primitives (the underlying `Sheet`).
 */
export function SourceProvenanceDrawer({ provenance, trigger }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="gap-1">
            <Info className="h-4 w-4" aria-hidden />
            <Trans>Proveniență</Trans>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            <Trans>Proveniența datelor</Trans>
          </SheetTitle>
          <SheetDescription>
            <Trans>
              Sursa, referința colectorului, datele de preluare și notele de
              parsare pentru această înregistrare.
            </Trans>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4 text-sm">
          <Section label={t`Sursă`}>
            <p>{provenance.sourceLabel}</p>
            {provenance.sourceUrl ? (
              <a
                href={provenance.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-foreground underline underline-offset-2"
              >
                {provenance.sourceUrl}
              </a>
            ) : (
              <p className="text-muted-foreground">
                <Trans>URL sursă indisponibil</Trans>
              </p>
            )}
          </Section>

          <Section label={t`Referință scraper`}>
            <p className="font-mono text-xs">
              {provenance.scraperRef ?? t`indisponibil`}
            </p>
          </Section>

          <Section label={t`Date`}>
            <dl className="grid grid-cols-1 gap-1">
              <DateRow label={t`Preluat la`} value={provenance.retrievedAt} />
              <DateRow label={t`Publicat la`} value={provenance.publishedAt} />
            </dl>
          </Section>

          <Section label={t`Note de parsare`}>
            {provenance.parserNotes.length > 0 ? (
              <ul className="list-disc space-y-1 pl-4">
                {provenance.parserNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">
                <Trans>Nicio notă de parsare</Trans>
              </p>
            )}
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Section({
  label,
  children,
}: {
  readonly label: string
  readonly children: React.ReactNode
}) {
  return (
    <section className="space-y-1">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h3>
      <div className="space-y-1">{children}</div>
    </section>
  )
}

function DateRow({ label, value }: { readonly label: string; readonly value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value ?? t`indisponibil`}</dd>
    </div>
  )
}
