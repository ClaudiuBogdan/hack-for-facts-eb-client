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

export const PLATFORM_CC_EMAILS = ['contact@transparenta.eu']

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
    cc: PLATFORM_CC_EMAILS.join(','),
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

export function buildPublicDebateEmailBody(params: {
  readonly organizationName: string
  readonly cityName: string
  readonly year: number
}): string {
  const { organizationName, cityName, year } = params

  return [
    'Domnule Primar,',
    '',
    `${organizationName} isi manifesta prin prezenta solicitare interesul fata de procedura de consultare publica cu privire la Proiectul de buget al ${cityName} pe anul ${year}. Ne dorim o administratie publica deschisa si transparenta, care sa mizeze pe implicarea cetatenilor si care sa demonstreze constant responsabilitatea fata de comunitate. Consideram ca Primaria ${cityName} adera la aceleasi principii, de unde si initiativa de a solicita organizarea de evenimente publice, deschise cetatenilor si societatii civile, pentru a dezbate proiecte cu impact asupra comunitatii.`,
    '',
    `Proiectul de buget al ${cityName} a fost publicat pe site-ul primariei si cetatenii au posibilitatea de a trimite sesizarile, observatiile si punctele de vedere, insa credem ca o dezbatere publica ar fi benefica pe acest subiect. Tinand cont de faptul ca bugetul este fundamental pentru functionarea orasului nostru, gasim extrem de important ca un proces cat mai amplu de deliberare, cu concursul a cat mai multi factori sociali, sa aiba loc.`,
    '',
    `Avand in vedere cele expuse anterior, in temeiul articolului 8 b) din Legea 273/2006 privind finantele publice locale privind obligativitatea dezbaterii publice a proiectului de buget local, cu prilejul aprobarii acestuia, dar si in baza art. 39 (3) al aceleiasi legi ("locuitorii unitatii administrativ-teritoriale pot depune contestatii privind proiectul de buget in termen de 15 zile de la data publicarii sau afisarii acestuia"), precum si in temeiul art. 7 alin. 9 din Legea 52/2003 privind transparenta decizionala in administratia publica, solicitam organizarea unei dezbateri publice asupra proiectului de buget al ${cityName} pentru anul ${year}.`,
    '',
    'Consideram ca accesibilitatea este o prioritate, astfel incat credem ca un astfel de eveniment ar trebui organizat intr-un mod care permite participarea fizica, dar si online, a celor interesati.',
    '',
    'Va rugam asadar sa comunicati public data, locul si ora la care urmeaza a fi organizata dezbaterea, impreuna cu detaliile pentru participarea online.',
    '',
    '',
    'Cu stima,',
    `Echipa ${organizationName}`,
  ].join('\n')
}

export function buildPublicDebateMailto(params: {
  readonly primariaEmail: string
  readonly organizationName: string
  readonly cityName: string
  readonly year: number
}): string {
  return buildMailtoUrl({
    to: params.primariaEmail,
    cc: PLATFORM_CC_EMAILS.join(','),
    subject: `Cerere organizare dezbatere publica - buget local ${params.year}`,
    body: buildPublicDebateEmailBody({
      organizationName: params.organizationName,
      cityName: params.cityName,
      year: params.year,
    }),
  })
}
