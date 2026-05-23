import { Link } from '@tanstack/react-router'
import type { ParliamentMember } from '@/schemas/parliament'
import { getParliamentGroupColorMap } from '../api/parliament-api'
import {
  formatMemberMandatePeriod,
  formatMemberName,
  getMemberChamberRoleLabel,
} from '../lib/formatting'
import {
  memberDetailNoticeClassName,
  memberDetailSectionIntroClassName,
  memberDetailSectionTitleClassName,
  memberDetailSubsectionIntroClassName,
  memberDetailSubsectionTitleClassName,
} from '../lib/member-detail-theme'
import {
  MemberProfileCareerCard,
  MemberProfileChamberBadge,
  MemberProfilePartyBadge,
} from './member-profile-card'

type Props = {
  readonly member: ParliamentMember
}

const groupColors = getParliamentGroupColorMap()

/** Overview tab — UK Parliamentary career layout */
export function MemberOverviewTab({ member }: Props) {
  const memberName = formatMemberName(member.firstName, member.lastName)
  const roleLabel = getMemberChamberRoleLabel(member.chamber)
  const mandatePeriod = formatMemberMandatePeriod(member.mandateStart, member.mandateEnd)
  const groupColor = groupColors[member.groupId] ?? '#505a5f'

  return (
    <div className="space-y-8">
      <div>
        <h2 className={memberDetailSectionTitleClassName}>Carieră parlamentară</h2>
        <p className={memberDetailSectionIntroClassName}>
          Aflați detalii despre cariera parlamentară a {memberName}, inclusiv funcții
          și roluri deținute.
        </p>
      </div>

      <aside className={memberDetailNoticeClassName}>
        <p>
          Circumscripțiile electorale și componența grupurilor parlamentare se pot
          modifica între legislaturi. Pentru context legislativ, consultați{' '}
          <Link
            to="/parlament"
            search={{ tab: 'membri', judet: member.judetSlug }}
            className="font-semibold underline underline-offset-4"
          >
            lista membrilor din {member.judetName}
          </Link>
          .
        </p>
      </aside>

      <section className="space-y-6">
        <div>
          <h3 className={memberDetailSubsectionTitleClassName}>Curent</h3>
          <p className={memberDetailSubsectionIntroClassName}>
            Posturi, roluri, afiliere la grup parlamentar și alte informații
            relevante.
          </p>
        </div>

        <div className="space-y-8">
          <MemberProfileCareerCard
            label="Reprezentare"
            title={member.judetName}
            subtitle={`${roleLabel.charAt(0).toUpperCase()}${roleLabel.slice(1)} ales pentru circumscripția ${member.judetName}`}
            footerLeft={mandatePeriod}
            footerRight={<MemberProfileChamberBadge chamber={member.chamber} />}
            to="/parlament"
            search={{ tab: 'membri', judet: member.judetSlug }}
          />

          <MemberProfileCareerCard
            label="Afiliere la grup parlamentar"
            title={member.groupName}
            subtitle={member.role ?? 'Membru al grupului parlamentar'}
            footerLeft={mandatePeriod}
            footerRight={<MemberProfileChamberBadge chamber={member.chamber} />}
            leading={
              <MemberProfilePartyBadge
                shortName={member.groupName.slice(0, 3).toUpperCase()}
                color={groupColor}
              />
            }
            to="/parlament/grupuri/$groupId"
            params={{ groupId: member.groupId }}
          />
        </div>
      </section>
    </div>
  )
}
