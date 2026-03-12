export type LocalBudgetCodeAnchorGroupKey =
  | 'income-functional'
  | 'expense-functional'
  | 'expense-economic'

export type LocalBudgetCodeAnchorGroup = {
  readonly key: LocalBudgetCodeAnchorGroupKey
  readonly title: {
    readonly ro: string
    readonly en: string
  }
  readonly description: {
    readonly ro: string
    readonly en: string
  }
  readonly sections: readonly LocalBudgetCodeAnchorSection[]
}

export type LocalBudgetCodeAnchorSection = {
  readonly id: string
  readonly title: {
    readonly ro: string
    readonly en: string
  }
  readonly description: {
    readonly ro: string
    readonly en: string
  }
  readonly nationalSource: 'static' | 'live-all-uats'
  readonly accountCategory: 'vn' | 'ch'
  readonly grouping: 'functional' | 'economic'
  readonly nationalRows?: readonly LocalBudgetNationalDistributionRow[]
  readonly groupedItemsKind: 'income' | 'expense-functional' | 'expense-economic'
  readonly groupedItemsTitle: {
    readonly ro: string
    readonly en: string
  }
  readonly groupedItemsDescription: {
    readonly ro: string
    readonly en: string
  }
}

export type LocalBudgetNationalDistributionRow = {
  readonly code: string
  readonly amount: number
  readonly percentage: number
  readonly explanation: {
    readonly ro: string
    readonly en: string
  }
}

function createNationalRow(
  code: string,
  amount: number,
  percentage: number,
  explanation: LocalBudgetNationalDistributionRow['explanation'],
): LocalBudgetNationalDistributionRow {
  return {
    code,
    amount,
    percentage,
    explanation,
  }
}

const nationalIncomeDistributionRows = [
  createNationalRow('04', 40628640865.08, 25.1, {
    ro: 'Arată cât din impozitul pe venit colectat central se redistribuie către bugetele locale.',
    en: 'Shows how much centrally collected personal income tax is redistributed back to local budgets.',
  }),
  createNationalRow('42', 34078480131.16, 21.05, {
    ro: 'Cuprinde subvențiile primite pentru servicii și activități care nu se finanțează integral din venituri proprii.',
    en: 'Covers subsidies received for services and activities that are not fully financed from own revenue.',
  }),
  createNationalRow('11', 24951946328.37, 15.41, {
    ro: 'Reflectă sumele din TVA transferate de la bugetul de stat către UAT-uri.',
    en: 'Reflects VAT amounts transferred from the state budget to local governments.',
  }),
  createNationalRow('33', 18347513113.14, 11.33, {
    ro: 'Include încasări din servicii publice, prestații și alte activități desfășurate de instituții locale.',
    en: 'Includes income from public services, fee-based activities, and other local institutional operations.',
  }),
  createNationalRow('43', 17744023933.11, 10.96, {
    ro: 'Sunt subvenții primite de la alte administrații publice, nu direct din bugetul de stat.',
    en: 'These are subsidies received from other public administrations, not directly from the state budget.',
  }),
  createNationalRow('07', 9202339385.24, 5.69, {
    ro: 'Reprezintă veniturile locale din impozitarea clădirilor, terenurilor și altor bunuri impozabile.',
    en: 'Represents local revenue from taxing buildings, land, and other taxable property.',
  }),
  createNationalRow('45', 5028644958.67, 3.11, {
    ro: 'Cuprinde rambursări și prefinanțări primite de la UE sau alți donatori pentru proiecte aflate în execuție.',
    en: 'Covers reimbursements and prefinancing received from the EU or other donors for projects in execution.',
  }),
  createNationalRow('16', 3301538893.36, 2.04, {
    ro: 'Include taxe pentru folosirea bunurilor publice, autorizații și desfășurarea unor activități economice.',
    en: 'Includes fees for using public assets, permits, and carrying out regulated activities.',
  }),
  createNationalRow('30', 2444684417.92, 1.51, {
    ro: 'Reflectă venituri din chirii, redevențe, dividende și alte drepturi de proprietate.',
    en: 'Reflects income from rents, royalties, dividends, and other property rights.',
  }),
  createNationalRow('36', 2192581615.83, 1.35, {
    ro: 'Adună venituri diverse care nu se încadrează clar în alte capitole fiscale sau nefiscale.',
    en: 'Collects miscellaneous revenue that does not fit neatly into other fiscal or non-fiscal chapters.',
  }),
  createNationalRow('35', 1126772642.56, 0.7, {
    ro: 'Cuprinde amenzi, penalități și confiscări încasate de autorități.',
    en: 'Includes fines, penalties, and confiscations collected by public authorities.',
  }),
  createNationalRow('03', 534505735.96, 0.33, {
    ro: 'Este impozitul pe venit înregistrat ca venit bugetar înainte de mecanismele de repartizare către local.',
    en: 'This is income tax recorded as budget revenue before redistribution mechanisms to local governments.',
  }),
  createNationalRow('39', 525578578.4, 0.32, {
    ro: 'Reprezintă încasări din vânzarea sau valorificarea unor bunuri și active publice.',
    en: 'Represents income from selling or monetizing public assets and goods.',
  }),
  createNationalRow('18', 525331205.11, 0.32, {
    ro: 'Include taxe și impozite fiscale reziduale care nu intră în celelalte categorii majore.',
    en: 'Includes residual fiscal taxes and duties that do not fall under the major categories.',
  }),
  createNationalRow('48', 448338055.82, 0.28, {
    ro: 'Separă fondurile UE și ale donatorilor aferente cadrului financiar 2014-2020.',
    en: 'Separates EU and donor funding related to the 2014-2020 financial framework.',
  }),
  createNationalRow('40', 403598897.09, 0.25, {
    ro: 'Marchează rambursările către buget ale împrumuturilor acordate anterior.',
    en: 'Captures repayments back to the budget for loans granted in earlier years.',
  }),
  createNationalRow('01', 102194695.28, 0.06, {
    ro: 'Reflectă veniturile obținute din impozitarea profitului companiilor.',
    en: 'Reflects revenue collected from taxing corporate profit.',
  }),
  createNationalRow('15', 92039705.25, 0.06, {
    ro: 'Cuprinde taxe aplicate unor servicii și activități reglementate distinct.',
    en: 'Covers taxes applied to specific regulated services and activities.',
  }),
  createNationalRow('37', 84966614, 0.05, {
    ro: 'Include transferuri voluntare și contribuții care nu sunt tratate ca subvenții.',
    en: 'Includes voluntary transfers and contributions that are not treated as subsidies.',
  }),
  createNationalRow('34', 80583488.42, 0.05, {
    ro: 'Sunt taxe administrative pentru avize, autorizații, permise și alte acte emise.',
    en: 'These are administrative fees for notices, permits, licenses, and other issued documents.',
  }),
  createNationalRow('12', 15188423.29, 0.01, {
    ro: 'Capitol rezidual pentru taxe generale pe bunuri și servicii în afara TVA și accizelor.',
    en: 'Residual chapter for general taxes on goods and services outside VAT and excise duties.',
  }),
  createNationalRow('05', 3872450.87, 0, {
    ro: 'Include alte venituri din impozite pe venit, profit și câștiguri din capital, în afara capitolelor principale.',
    en: 'Includes other taxes on income, profit, and capital gains outside the main chapters.',
  }),
  createNationalRow('31', 3676249.94, 0, {
    ro: 'Reflectă dobânzile încasate pentru depozite, disponibilități sau creanțe ale sectorului public.',
    en: 'Reflects interest income earned on deposits, cash balances, or public-sector receivables.',
  }),
  createNationalRow('41', 961286.23, 0, {
    ro: 'Acoperă operațiuni financiare care nu sunt încadrate în celelalte capitole de încasări.',
    en: 'Covers financial operations that are not classified in the other revenue chapters.',
  }),
  createNationalRow('46', 652823.55, 0, {
    ro: 'Include alte sume primite de la UE, raportate separat de fluxurile principale de finanțare externă.',
    en: 'Includes other amounts received from the EU, reported separately from the main external financing flows.',
  }),
  createNationalRow('44', 503526.04, 0, {
    ro: 'Reprezintă donațiile primite din afara țării.',
    en: 'Represents donations received from outside the country.',
  }),
  createNationalRow('47', 0, 0, {
    ro: 'Arată sumele aflate temporar în distribuire între bugete sau destinații.',
    en: 'Shows amounts temporarily pending distribution between budgets or destinations.',
  }),
] as const satisfies readonly LocalBudgetNationalDistributionRow[]

const nationalExpenseFunctionalDistributionRows = [
  createNationalRow('66', 35098445562.77, 20.66, {
    ro: 'Cuprinde cheltuieli pentru spitale, servicii medicale, sănătate publică și programe sanitare.',
    en: 'Covers spending on hospitals, medical services, public health, and health programs.',
  }),
  createNationalRow('84', 24836422750.28, 14.62, {
    ro: 'Include transport public, drumuri, mobilitate și infrastructură de transport.',
    en: 'Includes public transport, roads, mobility, and transport infrastructure.',
  }),
  createNationalRow('68', 22436267821.09, 13.21, {
    ro: 'Reflectă prestații și servicii sociale pentru protecția persoanelor vulnerabile.',
    en: 'Reflects benefits and social services for protecting vulnerable people.',
  }),
  createNationalRow('70', 17631142537.39, 10.38, {
    ro: 'Aduce împreună utilități, servicii locale, dezvoltare urbană și investiții în locuire.',
    en: 'Brings together utilities, local services, urban development, and housing-related investment.',
  }),
  createNationalRow('65', 17610510951.72, 10.37, {
    ro: 'Reunește finanțarea pentru școli, servicii educaționale și infrastructura de învățământ.',
    en: 'Brings together funding for schools, education services, and learning infrastructure.',
  }),
  createNationalRow('51', 17388811359.47, 10.24, {
    ro: 'Acoperă administrația publică locală și centrală, aparatul instituțional și acțiunile externe.',
    en: 'Covers public administration, institutional apparatus, and external actions.',
  }),
  createNationalRow('67', 13536939122.48, 7.97, {
    ro: 'Include instituții culturale, sport, agrement și activități religioase.',
    en: 'Includes cultural institutions, sports, recreation, and religious activities.',
  }),
  createNationalRow('74', 10934841498.32, 6.44, {
    ro: 'Reunește salubritate, gestiunea deșeurilor și alte servicii de protecție a mediului.',
    en: 'Brings together sanitation, waste management, and other environmental services.',
  }),
  createNationalRow('81', 3325048901.33, 1.96, {
    ro: 'Reflectă cheltuieli pentru energie, termoficare și alte servicii legate de combustibili.',
    en: 'Reflects spending on energy, district heating, and other fuel-related services.',
  }),
  createNationalRow('61', 2623744886.46, 1.54, {
    ro: 'Cuprinde ordine publică, intervenții de urgență și servicii de siguranță.',
    en: 'Covers public order, emergency response, and safety services.',
  }),
  createNationalRow('55', 1797916002.48, 1.06, {
    ro: 'Reprezintă costurile legate de datoria publică și operațiunile de împrumut.',
    en: 'Represents costs related to public debt and borrowing operations.',
  }),
  createNationalRow('54', 1382197623.67, 0.81, {
    ro: 'Include servicii publice generale care nu se încadrează în celelalte capitole administrative.',
    en: 'Includes general public services that do not fit the other administrative chapters.',
  }),
  createNationalRow('80', 539676562.95, 0.32, {
    ro: 'Grupează politici economice generale, sprijin pentru muncă și alte acțiuni economice de bază.',
    en: 'Groups general economic policy, labor support, and other baseline economic actions.',
  }),
  createNationalRow('87', 400446598.69, 0.24, {
    ro: 'Este capitolul rezidual pentru programe economice care nu intră în celelalte grupe mari.',
    en: 'This is the residual chapter for economic programs outside the main groups.',
  }),
  createNationalRow('83', 261497941.12, 0.15, {
    ro: 'Include agricultură, silvicultură, piscicultură și alte activități de sprijin rural.',
    en: 'Includes agriculture, forestry, fisheries, and other rural support activities.',
  }),
  createNationalRow('60', 36132638.88, 0.02, {
    ro: 'Reflectă cheltuielile legate de apărare.',
    en: 'Reflects defense-related spending.',
  }),
  createNationalRow('56', 12800697.61, 0.01, {
    ro: 'Arată transferurile generale dintre nivelurile administrației publice.',
    en: 'Shows general transfers between levels of public administration.',
  }),
] as const satisfies readonly LocalBudgetNationalDistributionRow[]

const expenseEconomicExplanations = {
  '10': {
    ro: 'Cheltuieli pentru salarii, contribuții și alte costuri legate direct de personal.',
    en: 'Spending on salaries, contributions, and other costs directly tied to staff.',
  },
  '20': {
    ro: 'Cheltuieli curente pentru bunuri, utilități, servicii și funcționarea de zi cu zi.',
    en: 'Current spending for goods, utilities, services, and day-to-day operations.',
  },
  '30': {
    ro: 'Costul dobânzilor plătite pentru datoria publică și alte obligații financiare.',
    en: 'The cost of interest paid on public debt and other financial obligations.',
  },
  '40': {
    ro: 'Plăți de sprijin către operatori, servicii sau sectoare considerate prioritare.',
    en: 'Support payments to operators, services, or sectors considered priorities.',
  },
  '50': {
    ro: 'Fonduri de rezervă și alte sume păstrate pentru situații speciale.',
    en: 'Reserve funds and other amounts kept for special situations.',
  },
  '51': {
    ro: 'Transferuri între instituții publice; o parte se elimină în analizele consolidate.',
    en: 'Transfers between public institutions; some are removed in consolidated analysis.',
  },
  '55': {
    ro: 'Transferuri care nu intră în categoria principală a relațiilor între administrații.',
    en: 'Transfers that do not fall under the main inter-administration category.',
  },
  '57': {
    ro: 'Asistență socială și plăți directe către beneficiari sau programe sociale.',
    en: 'Social assistance and direct payments to beneficiaries or social programs.',
  },
  '58': {
    ro: 'Cheltuieli pentru proiecte finanțate din fonduri externe nerambursabile.',
    en: 'Spending for projects financed from non-reimbursable external funds.',
  },
  '59': {
    ro: 'Capitol rezidual pentru alte cheltuieli curente care nu se potrivesc altor titluri.',
    en: 'Residual chapter for current expenses that do not fit other titles.',
  },
  '60': {
    ro: 'Componenta grant a cheltuielilor finanțate prin PNRR.',
    en: 'Grant component of spending financed through the Recovery and Resilience Plan.',
  },
  '61': {
    ro: 'Componenta împrumut a cheltuielilor finanțate prin PNRR.',
    en: 'Loan component of spending financed through the Recovery and Resilience Plan.',
  },
  '65': {
    ro: 'Cheltuieli susținute prin programe cu finanțare rambursabilă.',
    en: 'Spending supported through reimbursable financing programs.',
  },
  '70': {
    ro: 'Totalul cheltuielilor de capital, orientate spre investiții și active noi.',
    en: 'Total capital expenditure, aimed at investment and new assets.',
  },
  '71': {
    ro: 'Investiții în active nefinanciare, cum ar fi clădiri, echipamente și infrastructură.',
    en: 'Investment in non-financial assets such as buildings, equipment, and infrastructure.',
  },
  '79': {
    ro: 'Operațiuni financiare care modifică poziția financiară, nu consumul direct de resurse.',
    en: 'Financial operations that change financial position rather than direct resource consumption.',
  },
} as const

const expenseFunctionalSection = {
  id: 'expense-functional-national-and-uat',
  title: {
    ro: 'Cheltuieli pe domenii: distribuția națională a UAT-urilor',
    en: 'Spending by domain: national UAT distribution',
  },
  description: {
    ro: 'Mai întâi vezi cum se împart cheltuielile tuturor UAT-urilor, apoi structura live din UAT-ul selectat.',
    en: 'Start with how spending is split across all UATs, then compare it with the live structure of the selected UAT.',
  },
  nationalSource: 'static',
  accountCategory: 'ch',
  grouping: 'functional',
  nationalRows: nationalExpenseFunctionalDistributionRows,
  groupedItemsKind: 'expense-functional',
  groupedItemsTitle: {
    ro: 'În UAT-ul tău: cheltuieli grupate pe capitole functionale',
    en: 'In your UAT: live grouped spending by functional chapters',
  },
  groupedItemsDescription: {
    ro: 'Mai jos vezi gruparea live a cheltuielilor functionale pe capitole pentru primaria selectata.',
    en: 'Below is the live functional spending grouping by chapters for the selected city hall.',
  },
} as const satisfies LocalBudgetCodeAnchorSection

const expenseEconomicSection = {
  id: 'expense-economic-national-and-uat',
  title: {
    ro: 'Cheltuieli pe tipuri: distribuția națională a UAT-urilor',
    en: 'Spending by type: national UAT distribution',
  },
  description: {
    ro: 'Tabelul național folosește toate UAT-urile agregate, iar dedesubt vezi gruparea economică live din UAT-ul selectat.',
    en: 'The national table uses all UATs aggregated, then shows the live economic grouping for the selected UAT.',
  },
  nationalSource: 'live-all-uats',
  accountCategory: 'ch',
  grouping: 'economic',
  groupedItemsKind: 'expense-economic',
  groupedItemsTitle: {
    ro: 'În UAT-ul tău: cheltuieli grupate pe tipuri economice',
    en: 'In your UAT: live grouped spending by economic types',
  },
  groupedItemsDescription: {
    ro: 'Mai jos vezi titlurile economice dominante în datele live ale UAT-ului selectat.',
    en: 'Below are the dominant economic titles in the live data of the selected UAT.',
  },
} as const satisfies LocalBudgetCodeAnchorSection

const incomeAndExpenseSection = {
  id: 'income-functional-national-and-uat',
  title: {
    ro: 'Venituri: distribuția națională a UAT-urilor',
    en: 'Income: national UAT distribution',
  },
  description: {
    ro: 'Vezi mai întâi imaginea agregată pentru toate UAT-urile, apoi gruparea live a veniturilor din UAT-ul selectat.',
    en: 'Start with the aggregate picture across all UATs, then see the selected UAT live income grouping.',
  },
  nationalSource: 'static',
  accountCategory: 'vn',
  grouping: 'functional',
  nationalRows: nationalIncomeDistributionRows,
  groupedItemsKind: 'income',
  groupedItemsTitle: {
    ro: 'În UAT-ul tău: venituri grupate pe capitole functionale',
    en: 'In your UAT: live grouped income by functional chapters',
  },
  groupedItemsDescription: {
    ro: 'Mai jos vezi structura live a veniturilor pe capitole functionale pentru primaria selectata.',
    en: 'Below is the live income structure by chapters for the selected city hall.',
  },
} as const satisfies LocalBudgetCodeAnchorSection

export function getExpenseEconomicExplanation(
  code: string,
  locale: 'ro' | 'en',
  fallbackLabel?: string,
): string {
  const explanation = expenseEconomicExplanations[code as keyof typeof expenseEconomicExplanations]
  if (explanation) {
    return explanation[locale]
  }

  if (locale === 'en') {
    return fallbackLabel
      ? `${fallbackLabel} is one of the main economic spending titles in local budgets.`
      : 'This is one of the main economic spending titles in local budgets.'
  }

  return fallbackLabel
    ? `${fallbackLabel} este unul dintre titlurile economice importante din bugetele locale.`
    : 'Acesta este unul dintre titlurile economice importante din bugetele locale.'
}

export const localBudgetCodeAnchorGroups = {
  'income-functional': {
    key: 'income-functional',
    title: {
      ro: 'Distribuția principalelor capitole pentru toate UAT-urile și pentru UAT-ul tău',
      en: 'Distribution of the main chapters across all UATs and in your UAT',
    },
    description: {
      ro: 'Începi cu distribuția națională agregată și continui cu gruparea live din primăria selectată, fără să părăsești lecția.',
      en: 'You start with the aggregated national distribution and continue with the selected city hall live grouping without leaving the lesson.',
    },
    sections: [
      incomeAndExpenseSection,
      expenseFunctionalSection,
    ],
  },
  'expense-functional': {
    key: 'expense-functional',
    title: {
      ro: 'Distribuția cheltuielilor pe domenii: național și în UAT-ul tău',
      en: 'Spending distribution by domain: national and in your UAT',
    },
    description: {
      ro: 'Clasificația funcțională răspunde la întrebarea: pentru ce domeniu public merg banii?',
      en: 'The functional classification answers: which public domain receives the money?',
    },
    sections: [expenseFunctionalSection],
  },
  'expense-economic': {
    key: 'expense-economic',
    title: {
      ro: 'Distribuția cheltuielilor pe tipuri: național și în UAT-ul tău',
      en: 'Spending distribution by type: national and in your UAT',
    },
    description: {
      ro: 'Clasificația economică răspunde la întrebarea: ce fel de cheltuială este?',
      en: 'The economic classification answers: what type of spending is it?',
    },
    sections: [expenseEconomicSection],
  },
} as const satisfies Record<LocalBudgetCodeAnchorGroupKey, LocalBudgetCodeAnchorGroup>
