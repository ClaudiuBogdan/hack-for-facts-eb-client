import type {
  MemberElectionResult,
  MemberInterestDeclaration,
  MemberSpokenContribution,
  MemberWrittenQuestion,
  ParliamentMember,
  ParliamentMemberProfile,
} from '@/schemas/parliament'
import { ParliamentMemberProfileSchema } from '@/schemas/parliament'

import memberProfilesData from '../mocks/member-profiles.json'

const memberProfilesMap = memberProfilesData as Record<string, unknown>

function synthesizeProfile(member: ParliamentMember): ParliamentMemberProfile {
  const name = `${member.firstName} ${member.lastName}`
  const electionResult: MemberElectionResult = {
    electionDate: member.mandateStart ?? '2024-12-01T00:00:00+03:00',
    electionName: 'Alegerile parlamentare din 2024',
    votesReceived: 12000 + name.length * 137,
    votesSharePercent: 22.5 + (name.length % 8),
    elected: true,
    constituency: member.judetName,
  }

  const spokenContributions: MemberSpokenContribution[] = [
    {
      contributionId: `${member.memberId}-sc-1`,
      heldAt: '2026-05-08T11:00:00+03:00',
      title: 'Dezbaterea bugetului de stat',
      summary: `Intervenție privind prioritățile pentru ${member.judetName}.`,
    },
    {
      contributionId: `${member.memberId}-sc-2`,
      heldAt: '2026-04-15T16:30:00+03:00',
      title: 'Proiect de lege privind serviciile publice digitale',
      summary: 'Solicitare de măsuri pentru acces egal la servicii online.',
    },
  ]

  const writtenQuestions: MemberWrittenQuestion[] = [
    {
      questionId: `${member.memberId}-wq-1`,
      submittedAt: '2026-04-22T09:00:00+03:00',
      title: `Situația investițiilor publice în ${member.judetName}`,
      status: 'raspuns',
      answerSummary: 'Instituțiile responsabile au transmis un calendar de implementare.',
    },
    {
      questionId: `${member.memberId}-wq-2`,
      submittedAt: '2026-05-12T09:00:00+03:00',
      title: 'Măsuri pentru transparența cheltuielilor publice',
      status: 'in_asteptare',
    },
  ]

  const interestDeclarations: MemberInterestDeclaration[] = [
    {
      declarationId: `${member.memberId}-id-1`,
      category: 'Declarație de interese',
      description: `Declarație anuală depusă conform procedurilor ${member.chamber === 'camera' ? 'Camerei Deputaților' : 'Senatului'}.`,
      registeredAt: member.mandateStart ?? '2024-12-15T00:00:00+03:00',
    },
  ]

  return ParliamentMemberProfileSchema.parse({
    memberId: member.memberId,
    spokenContributions,
    writtenQuestions,
    interestDeclarations,
    electionResult,
    officialPortraitUrl: member.photoUrl,
    officialPortraitCaption: member.photoUrl
      ? `Portret oficial — ${member.chamber === 'camera' ? 'Camera Deputaților' : 'Senatul României'}.`
      : undefined,
  })
}

/** Resolve member profile mock data, with synthesis fallback. */
export function resolveParliamentMemberProfile(
  member: ParliamentMember,
): ParliamentMemberProfile {
  const raw = memberProfilesMap[member.memberId]
  if (raw) {
    return ParliamentMemberProfileSchema.parse(raw)
  }
  return synthesizeProfile(member)
}
