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
