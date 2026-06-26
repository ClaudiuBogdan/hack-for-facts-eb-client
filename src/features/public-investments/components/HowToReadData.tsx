import { BookOpen } from 'lucide-react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

/**
 * The "Cum citesc aceste date" explainer, reachable from every PI page header.
 * Defines the four key glossary terms (contractat, decontat, absorbție, stadiu)
 * for casual users and explains the PI-1 / precision / privacy honesty states.
 */
export function HowToReadData({ className }: { readonly className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className={className}>
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          <span>
            <Trans>Cum citesc aceste date</Trans>
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md flex flex-col">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-base font-semibold">
            <Trans>Cum citesc aceste date</Trans>
          </SheetTitle>
          <SheetDescription className="sr-only">
            <Trans>Glosar și note de onestitate a datelor.</Trans>
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-5 text-sm">
          <Glossary />
          <HonestyNotes />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Glossary() {
  const terms: ReadonlyArray<{ readonly term: string; readonly def: string }> = [
    {
      term: t`Alocat`,
      def: t`Suma alocată din program pentru obiectiv (valoare planificată).`,
    },
    {
      term: t`Contractat`,
      def: t`Valoarea contractată efectiv pentru execuția lucrării.`,
    },
    {
      term: t`Decontat`,
      def: t`Suma rambursată/decontată din valoarea contractată, plătită efectiv.`,
    },
    {
      term: t`Absorbție`,
      def: t`Procentul decontat din contractat (decontat / contractat).`,
    },
    {
      term: t`Stadiu obiectiv`,
      def: t`Stadiul normalizat (Contractat / În execuție / Finalizat / Recepționat / Necunoscut). Textul brut din sursă apare la fiecare cifră.`,
    },
  ]

  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Trans>Glosar</Trans>
      </h2>
      <dl className="flex flex-col gap-3">
        {terms.map((term) => (
          <div key={term.term}>
            <dt className="font-medium text-foreground">{term.term}</dt>
            <dd className="mt-0.5 text-muted-foreground">{term.def}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function HonestyNotes() {
  return (
    <section className="mt-6 border-t border-border pt-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Trans>Note de onestitate</Trans>
      </h2>
      <ul className="flex flex-col gap-2 text-muted-foreground">
        <li>
          <Trans>
            Anumite sume pot fi stocate înmulțite cu 1.000. Acele valori sunt
            afișate ca „valoare în verificare”, nu ca sumă, până la reparcurgere.
          </Trans>
        </li>
        <li>
          <Trans>
            Câteva rânduri au decontat {'>'} contractat în sursă (avertizare de
            precizie). Bara de absorbție se limitează vizual la 100%, textul
            păstrează valoarea reală.
          </Trans>
        </li>
        <li>
          <Trans>
            Numele părților reținute (PFA / în curs de verificare) nu sunt
            afișate. În locul lor apare un aviz de confidențialitate.
          </Trans>
        </li>
        <li>
          <Trans>
            Fiecare cifră are o dovadă: butonul „Vezi dovada” deschide registrul
            sursă, snapshot-ul și extrasul brut.
          </Trans>
        </li>
      </ul>
    </section>
  )
}
