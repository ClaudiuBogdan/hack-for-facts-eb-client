import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { ParliamentMember } from '@/schemas/parliament'
import { formatMemberName } from '../lib/formatting'
import { useParliamentMemberInitiatives } from '../hooks/use-parliament-data'
import { memberDetailNoticeClassName } from '../lib/member-detail-theme'
import { MemberProfileActivityRow } from './member-profile-activity-row'
import { MemberProfileSectionHeader } from './member-profile-section-header'
import { ParliamentInlineLoadError } from './parliament-load-error-page'
import { VotesListPagination } from './votes-list-pagination'

type Props = {
  readonly member: ParliamentMember
}

const PAGE_SIZE = 10

function formatActivityDate(isoDate: string): string {
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(isoDate))
}

/**
 * Legislative-initiatives tab — the bills the member authored/initiated. The
 * server returns these registration-date DESC (latest-first); we render in that
 * order (no client sort) with offset pagination.
 */
export function MemberInitiativeTab({ member }: Props) {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch } = useParliamentMemberInitiatives(
    member.memberId,
    page,
    PAGE_SIZE,
  )
  const memberName = formatMemberName(member.firstName, member.lastName)

  if (isLoading && !data) {
    return <Skeleton className="h-48 w-full rounded-none" />
  }

  // A failed read is not an empty legislative record. Guarded on `!data` so a
  // failed background refetch keeps the page already on screen.
  if (isError && !data) {
    return (
      <MemberProfileSectionHeader
        title={t`Inițiative legislative`}
        intro={t`Propunerile și proiectele de lege inițiate de ${memberName}, cele mai recente primele.`}
      >
        <ParliamentInlineLoadError
          title={t`Inițiativele legislative nu au putut fi încărcate`}
          description={t`O eroare de citire nu înseamnă că acest parlamentar nu a inițiat proiecte de lege. Reîncercați; dacă problema persistă, sursa poate fi temporar indisponibilă.`}
          onRetry={() => void refetch()}
        />
      </MemberProfileSectionHeader>
    )
  }

  const initiatives = data?.initiatives ?? []

  return (
    <MemberProfileSectionHeader
      title={t`Inițiative legislative`}
      intro={t`Propunerile și proiectele de lege inițiate de ${memberName}, cele mai recente primele.`}
    >
      <aside className={memberDetailNoticeClassName}>
        <p>
          Lista include titlul inițiativei, data înregistrării și stadiul curent.
          Faceți clic pe „Vezi proiectul” pentru parcursul legislativ complet.
        </p>
      </aside>

      {data && data.total > 0 ? (
        <VotesListPagination
          page={data.page}
          totalPages={data.totalPages}
          total={data.total}
          onPageChange={setPage}
        />
      ) : null}

      <div className="space-y-4">
        {initiatives.length > 0 ? (
          initiatives.map((entry) => {
            const law =
              entry.promulgatedLawNumber && entry.promulgatedLawYear
                ? `Lege ${entry.promulgatedLawNumber}/${entry.promulgatedLawYear}`
                : null
            const metaParts = [
              entry.registeredAt
                ? `Înregistrată ${formatActivityDate(entry.registeredAt)}`
                : null,
              law ?? entry.status,
            ].filter((p): p is string => Boolean(p))
            return (
              <MemberProfileActivityRow
                key={entry.initiativeId}
                title={entry.title}
                meta={metaParts.join(' · ')}
                trailing={
                  <div className="flex items-center gap-2">
                    {entry.status ? (
                      <Badge variant={law ? 'default' : 'secondary'}>
                        {law ?? entry.status}
                      </Badge>
                    ) : null}
                    {entry.billId ? (
                      <Link
                        to="/parlament/proiecte/$billId"
                        params={{ billId: entry.billId }}
                        className="text-sm font-semibold text-[#1d70b8] underline underline-offset-4"
                      >
                        Vezi proiectul
                      </Link>
                    ) : null}
                  </div>
                }
              />
            )
          })
        ) : (
          <p className="text-base leading-7 text-[#505a5f]">
            <Trans>
              Nu există inițiative legislative publicate pentru acest
              parlamentar.
            </Trans>
          </p>
        )}
      </div>
    </MemberProfileSectionHeader>
  )
}
