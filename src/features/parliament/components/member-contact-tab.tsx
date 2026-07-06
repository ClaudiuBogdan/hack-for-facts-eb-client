import { FileText, Globe, IdCard, Mail, Phone } from 'lucide-react'
import type { ParliamentMember } from '@/schemas/parliament'
import { Button } from '@/components/ui/button'
import {
  formatMemberName,
  formatMemberSalutation,
} from '../lib/formatting'
import {
  memberDetailCardLabelClassName,
  memberDetailContactCardClassName,
  memberDetailNoticeClassName,
  memberDetailSectionIntroClassName,
  memberDetailSectionTitleClassName,
} from '../lib/member-detail-theme'
import { ParliamentCardChevron } from './parliament-card-chevron'

type Props = {
  readonly member: ParliamentMember
}

function getOfficialChamberSite(member: ParliamentMember): {
  readonly label: string
  readonly url: string
} {
  return member.chamber === 'camera'
    ? { label: 'Camera Deputaților', url: 'https://www.cdep.ro' }
    : { label: 'Senatul României', url: 'https://www.senat.ro' }
}

function hasContactDetails(member: ParliamentMember): boolean {
  const contact = member.contact
  return Boolean(
    contact?.address ||
      contact?.phone ||
      contact?.email ||
      contact?.website ||
      contact?.cvUrl,
  )
}

/** Contact tab with UK Parliament-style notices and contact cards. */
export function MemberContactTab({ member }: Props) {
  const contact = member.contact
  const memberName = formatMemberName(member.firstName, member.lastName)
  const officialSite = getOfficialChamberSite(member)

  return (
    <div className="space-y-8">
      <div>
        <h2 className={memberDetailSectionTitleClassName}>Contact {memberName}</h2>
        <p className={memberDetailSectionIntroClassName}>
          Când contactați acest parlamentar, folosiți formula{' '}
          <span className="font-semibold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            {formatMemberSalutation(member)}
          </span>
          .
        </p>
      </div>

      <aside className={memberDetailNoticeClassName}>
        <p>
          Pentru cereri legate de activitatea parlamentară sau de circumscripție,
          verificați și pagina oficială de pe{' '}
          <a
            href={officialSite.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-4"
          >
            {officialSite.label}
          </a>
          .
        </p>
        <p className="mt-3 border-t border-[#512178]/15 pt-3">
          Mesajele transmise ar trebui să rămână clare și respectuoase. Conținutul
          ofensator, amenințător sau abuziv poate fi ignorat sau raportat.
        </p>
      </aside>

      {hasContactDetails(member) ? (
        <div className="space-y-8">
          {contact?.address || contact?.phone || contact?.email ? (
            <div className="space-y-2">
              <h3 className={memberDetailCardLabelClassName}>Birou parlamentar</h3>
              <section className={`${memberDetailContactCardClassName} p-5 sm:p-6`}>
                <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
                  <div className="flex gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f3f0ff] text-[#512178]">
                      <IdCard className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      {contact.address ? (
                        <p className="max-w-xl text-base leading-7 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
                          {contact.address}
                        </p>
                      ) : (
                        <p className="text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                          Adresa biroului parlamentar nu este publicată aici.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 lg:min-w-56 lg:pt-1">
                    {contact.phone ? (
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center gap-2 text-base font-normal text-[#0b0c0c] underline underline-offset-4 hover:text-[#1d70b8] dark:text-[var(--pnrr-fg)]"
                      >
                        <Phone className="h-4 w-4 shrink-0" aria-hidden />
                        {contact.phone}
                      </a>
                    ) : null}
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-2 text-base font-normal text-[#0b0c0c] underline underline-offset-4 hover:text-[#1d70b8] dark:text-[var(--pnrr-fg)]"
                      >
                        <Mail className="h-4 w-4 shrink-0" aria-hidden />
                        {contact.email}
                      </a>
                    ) : null}
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {contact?.website ? (
            <div className="space-y-2">
              <h3 className={memberDetailCardLabelClassName}>Website</h3>
              <a
                href={contact.website}
                target="_blank"
                rel="noopener noreferrer"
                className={`${memberDetailContactCardClassName} flex items-center justify-between gap-4 p-5 transition-colors hover:bg-[#f8f8f8] sm:p-6 dark:hover:bg-[var(--pnrr-hover)]`}
              >
                <span className="flex min-w-0 items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f3f0ff] text-[#512178]">
                    <Globe className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 text-base leading-7 text-[#0b0c0c] underline underline-offset-4 dark:text-[var(--pnrr-fg)]">
                    {contact.website}
                  </span>
                </span>
                <ParliamentCardChevron className="shrink-0" />
              </a>
            </div>
          ) : null}

          {contact?.cvUrl ? (
            <div className="space-y-2">
              <h3 className={memberDetailCardLabelClassName}>CV oficial (PDF)</h3>
              <a
                href={contact.cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${memberDetailContactCardClassName} flex items-center justify-between gap-4 p-5 transition-colors hover:bg-[#f8f8f8] sm:p-6 dark:hover:bg-[var(--pnrr-hover)]`}
              >
                <span className="flex min-w-0 items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f3f0ff] text-[#512178]">
                    <FileText className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 text-base leading-7 text-[#0b0c0c] underline underline-offset-4 dark:text-[var(--pnrr-fg)]">
                    Descarcă CV-ul oficial (PDF)
                  </span>
                </span>
                <ParliamentCardChevron className="shrink-0" />
              </a>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          <h3 className={memberDetailCardLabelClassName}>Date de contact</h3>
          <section className={`${memberDetailContactCardClassName} p-5 sm:p-6`}>
            <p className="max-w-2xl text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              Nu sunt disponibile date directe de contact. Verificați paginile
              oficiale ale Camerei Deputaților și Senatului pentru informații
              actualizate despre parlamentar.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild className="h-10 rounded-none bg-[#1d70b8] px-5 text-base font-normal text-white hover:bg-[#1d70b8]/90">
                <a href="https://www.cdep.ro" target="_blank" rel="noopener noreferrer">
                  Camera Deputaților
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-10 rounded-none border-[#b1b4b6] bg-white px-5 text-base font-normal text-[#0b0c0c] hover:bg-[#f3f2f1]"
              >
                <a href="https://www.senat.ro" target="_blank" rel="noopener noreferrer">
                  Senatul României
                </a>
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
