type MailtoParams = {
  readonly to: string
  readonly cc?: string
  readonly subject: string
  readonly body: string
}

export function buildMailtoUrl(params: MailtoParams): string {
  const queryParts: string[] = []

  if (params.cc) {
    queryParts.push(`cc=${encodeURIComponent(params.cc)}`)
  }
  queryParts.push(`subject=${encodeURIComponent(params.subject)}`)
  queryParts.push(`body=${encodeURIComponent(params.body)}`)

  return `mailto:${encodeURIComponent(params.to)}?${queryParts.join('&')}`
}

const PLATFORM_CC_EMAIL = 'contact@transparenta.eu'

export function buildDebateRequestMailto(params: {
  readonly primariaEmail: string
  readonly organizationName: string | null
  readonly year: number
}): string {
  const sender = params.organizationName
    ? params.organizationName
    : 'un cetatean'

  const body = [
    'Stimate Domn Primar / Stimata Doamna Primar,',
    '',
    `Subsemnatul/Subsemnata, ${sender}, va solicit prin prezenta organizarea unei dezbateri publice pe tema proiectului de buget local pentru anul ${params.year}, in conformitate cu prevederile Legii nr. 52/2003 privind transparenta decizionala in administratia publica.`,
    '',
    `Potrivit art. 6 si art. 7 din Legea nr. 52/2003, autoritatile administratiei publice locale au obligatia de a supune dezbaterii publice proiectele de acte normative, inclusiv proiectul de buget local, si de a organiza dezbateri publice la cererea unei asociatii legal constituite sau a altei autoritati publice.`,
    '',
    'Solicit ca dezbaterea publica sa fie organizata intr-un termen rezonabil, cu respectarea procedurilor legale de informare a cetatenilor, si sa permita participarea activa a tuturor celor interesati.',
    '',
    'Va rugam sa ne comunicati data, ora si locatia stabilite pentru aceasta dezbatere publica.',
    '',
    'Cu stima,',
    sender,
    '',
    '---',
    'Aceasta solicitare a fost generata cu ajutorul platformei Transparenta.eu',
  ].join('\n')

  return buildMailtoUrl({
    to: params.primariaEmail,
    cc: PLATFORM_CC_EMAIL,
    subject: `Solicitare organizare dezbatere publica - bugetul local ${params.year}`,
    body,
  })
}

export function buildContestationEmailBody(params: {
  readonly contestedItem: string
  readonly reasoning: string
  readonly impact: string
  readonly proposedChange: string
  readonly senderName: string
}): string {
  return [
    'Stimate Domn Primar / Stimata Doamna Primar,',
    '',
    'In temeiul art. 39 alin. (3) din Legea nr. 273/2006 privind finantele publice locale, formulez urmatoarea contestatie la proiectul de buget local:',
    '',
    '1. CE CONTEST:',
    params.contestedItem,
    '',
    '2. DE CE (argumente si dovezi):',
    params.reasoning,
    '',
    '3. IMPACT:',
    params.impact,
    '',
    '4. SCHIMBARE PROPUSA:',
    params.proposedChange,
    '',
    'Solicit analizarea acestei contestatii si comunicarea unui raspuns in termenul legal.',
    '',
    'Cu stima,',
    params.senderName,
    '',
    '---',
    'Aceasta contestatie a fost generata cu ajutorul platformei Transparenta.eu',
  ].join('\n')
}

export function buildContestationMailto(params: {
  readonly primariaEmail: string
  readonly contestedItem: string
  readonly reasoning: string
  readonly impact: string
  readonly proposedChange: string
  readonly senderName: string
  readonly year: number
}): string {
  return buildMailtoUrl({
    to: params.primariaEmail,
    cc: PLATFORM_CC_EMAIL,
    subject: `Contestatie proiect buget local ${params.year}`,
    body: buildContestationEmailBody({
      contestedItem: params.contestedItem,
      reasoning: params.reasoning,
      impact: params.impact,
      proposedChange: params.proposedChange,
      senderName: params.senderName,
    }),
  })
}
