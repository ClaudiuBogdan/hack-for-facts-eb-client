import type {
  MemberVoteChoice,
  ParliamentGroup,
  ParliamentGroupVoteBreakdown,
  ParliamentMember,
  ParliamentMemberVoteRecord,
  ParliamentVoteDetail,
  ParliamentVoteSummary,
  VoteOutcome,
} from '@/schemas/parliament'

function toJudetSlug(judetName: string): string {
  return judetName
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const SYNTHETIC_CAMERA_MEMBERS: ReadonlyArray<{
  readonly firstName: string
  readonly lastName: string
  readonly groupId: string
  readonly judetName: string
}> = [
  { firstName: 'Adela', lastName: 'Nord', groupId: 'psd-camera', judetName: 'Iași' },
  { firstName: 'Matei', lastName: 'Luncă', groupId: 'psd-camera', judetName: 'Vaslui' },
  { firstName: 'Bianca', lastName: 'Vale', groupId: 'psd-camera', judetName: 'Teleorman' },
  { firstName: 'Darius', lastName: 'Pajiște', groupId: 'psd-camera', judetName: 'Dolj' },
  { firstName: 'Carmen', lastName: 'Dumbravă', groupId: 'psd-camera', judetName: 'Galați' },
  { firstName: 'Toma', lastName: 'Izvor', groupId: 'pnl-camera', judetName: 'Sibiu' },
  { firstName: 'Livia', lastName: 'Mesteacăn', groupId: 'pnl-camera', judetName: 'Argeș' },
  { firstName: 'Radu', lastName: 'Culme', groupId: 'pnl-camera', judetName: 'Brașov' },
  { firstName: 'Nora', lastName: 'Faleză', groupId: 'pnl-camera', judetName: 'Constanța' },
  { firstName: 'Ovidiu', lastName: 'Lan', groupId: 'usr-camera', judetName: 'Timiș' },
  { firstName: 'Mara', lastName: 'Runc', groupId: 'usr-camera', judetName: 'Arad' },
  { firstName: 'Silviu', lastName: 'Prund', groupId: 'usr-camera', judetName: 'Mureș' },
  { firstName: 'Dalia', lastName: 'Zori', groupId: 'aur-camera', judetName: 'Prahova' },
  { firstName: 'Rareș', lastName: 'Codru', groupId: 'aur-camera', judetName: 'Bacău' },
  { firstName: 'Ilinca', lastName: 'Poiană', groupId: 'aur-camera', judetName: 'Suceava' },
  { firstName: 'Erik', lastName: 'Arbor', groupId: 'udmr-camera', judetName: 'Covasna' },
  { firstName: 'Lilla', lastName: 'Meadow', groupId: 'udmr-camera', judetName: 'Mureș' },
  { firstName: 'Nandor', lastName: 'Hill', groupId: 'udmr-camera', judetName: 'Bihor' },
  { firstName: 'Petra', lastName: 'Fag', groupId: 'psd-camera', judetName: 'Hunedoara' },
  { firstName: 'Dorin', lastName: 'Pârâu', groupId: 'pnl-camera', judetName: 'Ilfov' },
  { firstName: 'Sanda', lastName: 'Nuc', groupId: 'usr-camera', judetName: 'Brașov' },
  { firstName: 'Vlad', lastName: 'Răsărit', groupId: 'aur-camera', judetName: 'Dâmbovița' },
  { firstName: 'Iulia', lastName: 'Câmp', groupId: 'psd-camera', judetName: 'Neamț' },
  { firstName: 'Marius', lastName: 'Deal', groupId: 'pnl-camera', judetName: 'Alba' },
]

const SYNTHETIC_SENAT_MEMBERS: ReadonlyArray<{
  readonly firstName: string
  readonly lastName: string
  readonly groupId: string
  readonly judetName: string
}> = [
  { firstName: 'Anca', lastName: 'Salcie', groupId: 'psd-senat', judetName: 'Gorj' },
  { firstName: 'Mirel', lastName: 'Plop', groupId: 'pnl-senat', judetName: 'București' },
  { firstName: 'Diana', lastName: 'Tei', groupId: 'usr-senat', judetName: 'București' },
  { firstName: 'Sergiu', lastName: 'Carpen', groupId: 'aur-senat', judetName: 'Buzău' },
  { firstName: 'Klara', lastName: 'Ridge', groupId: 'udmr-senat', judetName: 'Harghita' },
  { firstName: 'Gabriela', lastName: 'Brumă', groupId: 'psd-senat', judetName: 'Giurgiu' },
  { firstName: 'Roxana', lastName: 'Frunză', groupId: 'psd-senat', judetName: 'Brăila' },
  { firstName: 'Virgil', lastName: 'Livadă', groupId: 'pnl-senat', judetName: 'Mehedinți' },
  { firstName: 'Dragoș', lastName: 'Pietriș', groupId: 'usr-senat', judetName: 'București' },
  { firstName: 'Nicoleta', lastName: 'Amurg', groupId: 'aur-senat', judetName: 'București' },
]

/** Extend mock roster with synthetic members for vote detail demos */
export function extendParliamentMembers(
  baseMembers: ReadonlyArray<ParliamentMember>,
  groups: ReadonlyArray<ParliamentGroup>,
): ParliamentMember[] {
  const existingIds = new Set(baseMembers.map((member) => member.memberId))
  const groupById = new Map(groups.map((group) => [group.groupId, group]))
  const extras: ParliamentMember[] = []

  const addSynthetic = (
    chamber: 'camera' | 'senat',
    templates: ReadonlyArray<{
      readonly firstName: string
      readonly lastName: string
      readonly groupId: string
      readonly judetName: string
    }>,
  ) => {
    templates.forEach((template, index) => {
      const memberId = `${chamber === 'camera' ? 'dep' : 'sen'}-syn-${String(index + 1).padStart(3, '0')}`
      if (existingIds.has(memberId)) return
      const group = groupById.get(template.groupId)
      if (!group) return
      extras.push({
        memberId,
        firstName: template.firstName,
        lastName: template.lastName,
        chamber,
        groupId: template.groupId,
        groupName: group.shortName ?? group.name,
        judetSlug: toJudetSlug(template.judetName),
        judetName: template.judetName,
        mandateStart: '2024-12-01',
      })
    })
  }

  addSynthetic('camera', SYNTHETIC_CAMERA_MEMBERS)
  addSynthetic('senat', SYNTHETIC_SENAT_MEMBERS)

  return [...baseMembers, ...extras]
}

function distributeCount(total: number, weights: ReadonlyArray<number>): number[] {
  if (total <= 0 || weights.length === 0) {
    return weights.map(() => 0)
  }

  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
  if (weightSum <= 0) {
    const even = Math.floor(total / weights.length)
    const result = weights.map(() => even)
    result[result.length - 1] = total - even * (weights.length - 1)
    return result
  }

  const raw = weights.map((weight) => (total * weight) / weightSum)
  const floored = raw.map((value) => Math.floor(value))
  let remainder = total - floored.reduce((sum, value) => sum + value, 0)

  const order = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)

  const result = [...floored]
  for (const item of order) {
    if (remainder <= 0) break
    result[item.index] = (result[item.index] ?? 0) + 1
    remainder -= 1
  }

  return result
}

function buildGroupBreakdown(
  summary: ParliamentVoteSummary,
  chamberGroups: ReadonlyArray<ParliamentGroup>,
): ParliamentGroupVoteBreakdown[] {
  const weights = chamberGroups.map((group) => group.memberCount)
  const pentruCounts = distributeCount(summary.tally.pentru, weights)
  const impotrivaCounts = distributeCount(summary.tally.impotriva, weights)
  const abtinereCounts = distributeCount(summary.tally.abtinere ?? 0, weights)

  return chamberGroups.map((group, index) => ({
    groupId: group.groupId,
    groupName: group.shortName ?? group.name,
    pentru: pentruCounts[index] ?? 0,
    impotriva: impotrivaCounts[index] ?? 0,
    abtinere: (abtinereCounts[index] ?? 0) > 0 ? abtinereCounts[index] : undefined,
  }))
}

function defaultChoiceForGroup(outcome: VoteOutcome, groupShortName: string): MemberVoteChoice {
  const oppositionGroups = new Set(['AUR'])
  const isOpposition = oppositionGroups.has(groupShortName)

  if (outcome === 'adoptat') {
    return isOpposition ? 'impotriva' : 'pentru'
  }
  if (outcome === 'respins') {
    return isOpposition ? 'pentru' : 'impotriva'
  }
  return 'abtinere'
}

function buildMemberVotes(
  summary: ParliamentVoteSummary,
  chamberMembers: ReadonlyArray<ParliamentMember>,
  groupBreakdown: ReadonlyArray<ParliamentGroupVoteBreakdown>,
): ParliamentMemberVoteRecord[] {
  const votes: ParliamentMemberVoteRecord[] = []

  for (const breakdown of groupBreakdown) {
    const groupMembers = chamberMembers.filter(
      (member) => member.groupId === breakdown.groupId,
    )
    if (groupMembers.length === 0) continue

    const choices: MemberVoteChoice[] = [
      ...Array.from({ length: breakdown.pentru }, () => 'pentru' as const),
      ...Array.from({ length: breakdown.impotriva }, () => 'impotriva' as const),
      ...Array.from({ length: breakdown.abtinere ?? 0 }, () => 'abtinere' as const),
    ]

    groupMembers.forEach((member, index) => {
      const choice =
        choices[index] ??
        defaultChoiceForGroup(summary.outcome, member.groupName)

      votes.push({
        memberId: member.memberId,
        memberName: `${member.firstName} ${member.lastName}`,
        groupId: member.groupId,
        groupName: member.groupName,
        choice,
      })
    })
  }

  const nuAVotatTarget = Math.min(
    summary.tally.nuAVotat ?? 0,
    Math.max(1, Math.ceil(chamberMembers.length * 0.08)),
  )
  if (nuAVotatTarget > 0 && votes.length > nuAVotatTarget) {
    const reassigned = votes.slice(-nuAVotatTarget).map((vote) => ({
      ...vote,
      choice: 'nu_a_votat' as const,
    }))
    return [...votes.slice(0, votes.length - nuAVotatTarget), ...reassigned]
  }

  return votes
}

/** Build vote detail with group + member breakdown when mock detail is missing */
export function synthesizeVoteDetail(
  summary: ParliamentVoteSummary,
  allMembers: ReadonlyArray<ParliamentMember>,
  allGroups: ReadonlyArray<ParliamentGroup>,
): ParliamentVoteDetail {
  const chamberGroups = allGroups.filter((group) => group.chamber === summary.chamber)
  const chamberMembers = allMembers.filter((member) => member.chamber === summary.chamber)
  const groupBreakdown = buildGroupBreakdown(summary, chamberGroups)
  const memberVotes = buildMemberVotes(summary, chamberMembers, groupBreakdown)

  return {
    ...summary,
    description: `Rezultatul divizării pentru ${summary.title.toLowerCase()}.`,
    groupBreakdown,
    memberVotes,
  }
}
