import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useOptionalUser } from '@/lib/auth'
import { useDatasetRequest } from '../hooks/use-statistics'

type RequestDatasetActionProps = {
  readonly datasetCode: string
  readonly datasetName: string | null
  readonly siruta?: string | null
}

export function RequestDatasetAction({
  datasetCode,
  datasetName,
  siruta,
}: RequestDatasetActionProps) {
  const [open, setOpen] = useState(false)
  const isSignedIn = Boolean(useOptionalUser())
  const [contactEmail, setContactEmail] = useState('')
  const [note, setNote] = useState('')
  const requestMutation = useDatasetRequest()
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      requestMutation.reset()
    }
  }

  const submitRequest = () => {
    requestMutation.mutate({
      datasetCode,
      siruta: siruta ?? undefined,
      // The server discards both for signed-out callers — without a Clerk user
      // id no `user.deleted` event could ever anonymize them — so don't send
      // what we've just told the user we won't store.
      contactEmail: isSignedIn ? contactEmail.trim() || undefined : undefined,
      note: isSignedIn ? note.trim() || undefined : undefined,
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          <Trans>Cere set</Trans>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans>Cere acest set de date</Trans>
          </DialogTitle>
          <DialogDescription>
            {datasetName || datasetCode} ({datasetCode}){' '}
            <Trans>nu are încă observații încărcate în această interfață.</Trans>
          </DialogDescription>
        </DialogHeader>
        {requestMutation.data?.accepted ? (
          <div
            className="rounded-lg border border-border bg-muted/40 p-4 text-sm"
            role="status"
            aria-live="polite"
          >
            {requestMutation.data.message}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/70 px-3 py-2 text-sm text-muted-foreground">
              <Trans>Matrice</Trans>: {datasetCode}
              {siruta ? (
                <>
                  {' '}
                  · <Trans>SIRUTA</Trans>: {siruta}
                </>
              ) : null}
            </div>
            {isSignedIn ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor={`dataset-request-note-${datasetCode}`}>
                    <Trans>De ce ai nevoie de acest set?</Trans>
                  </Label>
                  <Textarea
                    id={`dataset-request-note-${datasetCode}`}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={1000}
                    placeholder={t`Context opțional pentru prioritizare`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`dataset-request-email-${datasetCode}`}>
                    <Trans>Email pentru notificare (opțional)</Trans>
                  </Label>
                  <Input
                    id={`dataset-request-email-${datasetCode}`}
                    type="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder={t`nume@example.ro`}
                  />
                </div>
              </>
            ) : (
              <p className="rounded-lg border border-dashed border-border/70 px-3 py-2 text-sm text-muted-foreground">
                <Trans>
                  Înregistrăm doar cererea, fără date de contact. Autentifică-te
                  dacă vrei să lași un mesaj sau să fii anunțat când setul devine
                  disponibil.
                </Trans>
              </p>
            )}
            {requestMutation.data && !requestMutation.data.accepted ? (
              <p className="text-sm text-destructive" role="status" aria-live="polite">
                {requestMutation.data.message}
              </p>
            ) : null}
            {requestMutation.isError ? (
              <p className="text-sm text-destructive">
                <Trans>Cererea nu a putut fi pregătită. Verifică emailul și încearcă din nou.</Trans>
              </p>
            ) : null}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            <Trans>Închide</Trans>
          </Button>
          {!requestMutation.data?.accepted ? (
            <Button
              onClick={submitRequest}
              disabled={requestMutation.isPending}
            >
              {requestMutation.isPending ? t`Se trimite…` : t`Trimite cererea`}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
