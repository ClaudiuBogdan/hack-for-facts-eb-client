import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ParliamentBillDetail } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import { formatBillDate, getChamberLabel } from '../lib/formatting'
import { billDetailCardClassName, billDetailSectionTitleClassName } from '../lib/bill-detail-theme'

type Props = {
  readonly bill: ParliamentBillDetail
}

/** Documente tab — bill document versions */
export function BillDocumentsTab({ bill }: Props) {
  if (bill.documents.length === 0) {
    return (
      <p className="text-base text-[#505a5f] dark:text-[var(--pnrr-muted)]">
        Nu există documente publicate pentru acest proiect.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className={billDetailSectionTitleClassName}>Documente</h2>
      <div className="space-y-4">
        {bill.documents.map((document) => (
          <div
            key={document.documentId}
            className={cn(
              billDetailCardClassName,
              'flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between',
            )}
          >
            <div>
              <p className="text-base font-bold text-[#512178]">{document.label}</p>
              {/*
                The date is OPTIONAL: `bill_documents` has no date column, so a
                shown date would be the bill's latest-event date copied onto
                every document. Omit the line rather than invent it.
              */}
              {document.publishedAt || document.chamber ? (
                <p className="mt-1 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                  {[
                    document.publishedAt ? formatBillDate(document.publishedAt) : null,
                    document.chamber ? getChamberLabel(document.chamber) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              ) : null}
              {document.versionLabel ? (
                <p className="mt-1 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                  {document.versionLabel}
                </p>
              ) : null}
            </div>
            <Button
              asChild
              variant="outline"
              className="rounded-none border-2 border-[#1d70b8] text-[#1d70b8] hover:bg-[#1d70b8]/5"
            >
              <a href={document.url} target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Descarcă
              </a>
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
