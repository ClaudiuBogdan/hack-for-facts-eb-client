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

/**
 * The best official link we have FOR THIS MEMBER.
 *
 * `contact.website` is `members.attrs.profile_url` — the member's own cdep.ro /
 * senat.ro profile page. Prefer it: sending a reader to the chamber HOMEPAGE to
 * look up a specific parliamentarian is a dead end when we already hold the deep
 * link. The chamber root stays the fallback when no profile URL is recorded.
 */
function getOfficialChamberSite(member: ParliamentMember): {
  readonly label: string
  readonly url: string
  readonly isMemberSpecific: boolean
} {
  const chamber =
    member.chamber === 'camera'
      ? { label: 'Camera Deputaților', url: 'https://www.cdep.ro' }
      : { label: 'Senatul României', url: 'https://www.senat.ro' }
  const profileUrl = member.contact?.website
  return profileUrl
    ? { label: `pagina oficială de pe ${chamber.label}`, url: profileUrl, isMemberSpecific: true }
    : { ...chamber, isMemberSpecific: false }
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
          <span className="font-semibold text-parliament-fg">
            {formatMemberSalutation(member)}
          </span>
          .
        </p>
      </div>

      <aside className={memberDetailNoticeClassName}>
        <p>
          Pentru cereri legate de activitatea parlamentară sau de circumscripție,
          verificați și{' '}
          {officialSite.isMemberSpecific ? null : 'pagina oficială de pe '}
          <a
            href={officialSite.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-4"
          >
            {officialSite.isMemberSpecific
              ? `${officialSite.label} a lui ${memberName}`
              : officialSite.label}
          </a>
          .
        </p>
        <p className="mt-3 border-t border-parliament-resource/15 pt-3">
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
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-parliament-resource/10 text-parliament-resource">
                      <IdCard className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      {contact.address ? (
                        <p className="max-w-xl text-base leading-7 text-parliament-fg">
                          {contact.address}
                        </p>
                      ) : (
                        <p className="text-sm leading-6 text-parliament-muted">
                          Adresa biroului parlamentar nu este publicată aici.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 lg:min-w-56 lg:pt-1">
                    {contact.phone ? (
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center gap-2 text-base font-normal text-parliament-fg underline underline-offset-4 hover:text-parliament-link"
                      >
                        <Phone className="h-4 w-4 shrink-0" aria-hidden />
                        {contact.phone}
                      </a>
                    ) : null}
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-2 text-base font-normal text-parliament-fg underline underline-offset-4 hover:text-parliament-link"
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
                className={`${memberDetailContactCardClassName} flex items-center justify-between gap-4 p-5 transition-colors hover:bg-parliament-hover sm:p-6`}
              >
                <span className="flex min-w-0 items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-parliament-resource/10 text-parliament-resource">
                    <Globe className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 text-base leading-7 text-parliament-fg underline underline-offset-4">
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
                className={`${memberDetailContactCardClassName} flex items-center justify-between gap-4 p-5 transition-colors hover:bg-parliament-hover sm:p-6`}
              >
                <span className="flex min-w-0 items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-parliament-resource/10 text-parliament-resource">
                    <FileText className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 text-base leading-7 text-parliament-fg underline underline-offset-4">
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
            <p className="max-w-2xl text-base leading-7 text-parliament-muted">
              Nu sunt disponibile date directe de contact. Verificați paginile
              oficiale ale Camerei Deputaților și Senatului pentru informații
              actualizate despre parlamentar.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild className="h-10 rounded-none bg-parliament-action px-5 text-base font-normal text-white hover:bg-parliament-action/90">
                <a href="https://www.cdep.ro" target="_blank" rel="noopener noreferrer">
                  Camera Deputaților
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-10 rounded-none border-parliament-border bg-parliament-card px-5 text-base font-normal text-parliament-fg hover:bg-parliament-surface"
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
