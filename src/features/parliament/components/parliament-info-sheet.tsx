import { ExternalLink } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

type Props = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly lastSyncedAt?: string
  readonly sources?: ReadonlyArray<string>
}

/** Methodology and sources — PNRR-style info panel */
export function ParliamentInfoSheet({
  open,
  onOpenChange,
  lastSyncedAt,
  sources = ['cdep.ro', 'senat.ro'],
}: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Despre date</SheetTitle>
          <SheetDescription>
            Surse, limitări și context pentru secțiunea Parlament.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
          {lastSyncedAt ? (
            <p>
              Ultima sincronizare:{' '}
              <span className="text-foreground">
                {new Intl.DateTimeFormat('ro-RO', {
                  dateStyle: 'long',
                  timeStyle: 'short',
                }).format(new Date(lastSyncedAt))}
              </span>
            </p>
          ) : null}
          <p>
            Date agregate din {sources.join(' și ')}. Verificați informațiile
            critice pe site-urile oficiale ale Camerei Deputaților și Senatului.
          </p>
          <p>
            Voturile individuale pot fi incomplete pentru ședințele cu vot
            secret sau când sursa oficială nu publică nominalizarea.
          </p>
          <ul className="space-y-2 pt-2">
            <li>
              <a
                href="https://www.cdep.ro"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
              >
                Camera Deputaților
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </li>
            <li>
              <a
                href="https://www.senat.ro"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
              >
                Senatul României
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </li>
            <li>
              <a
                href="/buget-national-2026"
                className="text-foreground underline-offset-4 hover:underline"
              >
                Bugetul instituțiilor parlamentare
              </a>
            </li>
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  )
}
