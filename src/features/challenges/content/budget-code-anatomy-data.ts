export type BudgetCodeSegment = {
  readonly code: string
  readonly level: {
    readonly ro: string
    readonly en: string
  }
  readonly label: {
    readonly ro: string
    readonly en: string
  }
}

export type BudgetCodeAnatomyData = {
  readonly fullCode: string
  readonly segments: readonly BudgetCodeSegment[]
}

export const budgetCodeAnatomyData = {
  fullCode: '65.04.02',
  segments: [
    {
      code: '65',
      level: {
        ro: 'Capitol',
        en: 'Chapter',
      },
      label: {
        ro: 'Invatamant',
        en: 'Education',
      },
    },
    {
      code: '65.04',
      level: {
        ro: 'Subcapitol',
        en: 'Subchapter',
      },
      label: {
        ro: 'Invatamant secundar',
        en: 'Secondary education',
      },
    },
    {
      code: '65.04.02',
      level: {
        ro: 'Paragraf',
        en: 'Paragraph',
      },
      label: {
        ro: 'Invatamant secundar inferior',
        en: 'Lower secondary education',
      },
    },
  ],
} as const satisfies BudgetCodeAnatomyData

// --- Hierarchical tree data for the Education chapter example ---

export type BudgetTreeNode = {
  readonly code: string
  readonly label: { readonly ro: string; readonly en: string }
  readonly children?: readonly BudgetTreeNode[]
}

export const educationChapterTree = {
  code: '65',
  label: { ro: 'Invatamant', en: 'Education' },
  children: [
    {
      code: '65.03',
      label: {
        ro: 'Invatamant prescolar si primar',
        en: 'Preschool and primary education',
      },
      children: [
        {
          code: '65.03.01',
          label: { ro: 'Invatamant prescolar', en: 'Preschool education' },
        },
        {
          code: '65.03.02',
          label: { ro: 'Invatamant primar', en: 'Primary education' },
        },
        {
          code: '...',
          label: { ro: '', en: '' },
        },
      ],
    },
    {
      code: '65.04',
      label: { ro: 'Invatamant secundar', en: 'Secondary education' },
    },
    {
      code: '65.05',
      label: {
        ro: 'Invatamant postliceal',
        en: 'Post-secondary education',
      },
    },
    {
      code: '65.06',
      label: { ro: 'Invatamant superior', en: 'Higher education' },
    },
    {
      code: '...',
      label: { ro: '', en: '' },
    },
  ],
} as const satisfies BudgetTreeNode
