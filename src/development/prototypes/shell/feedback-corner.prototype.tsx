import type { PrototypeDefinition } from '@/development/harness/entry'
import { Current, EdgeTab, Pair, Quiet, SplitLime, SplitNavy } from './feedback-corner.variants'

export const prototype = {
  title: 'Feedback corner',
  spec: 'src/components/feedback/FeedbackFab.tsx + src/components/footer/ChatFab.tsx (desktop only; phones use the bottom dock)',
  variants: {
    current: { title: 'Today', component: Current, note: 'lime square + round navy menu, stacked' },
    'split-navy': { title: 'A · Split pill, navy', component: SplitNavy, note: 'Feedback in one click, arrow opens help' },
    'split-lime': { title: 'B · Split pill, lime', component: SplitLime, note: 'keeps the lime, dark text in both themes' },
    pair: { title: 'C · Pill + help button', component: Pair, note: 'two matched buttons in one row' },
    quiet: { title: 'D · Quiet pill', component: Quiet, note: 'bordered, page-coloured, icon carries the colour' },
    'edge-tab': { title: 'E · Edge tab', component: EdgeTab, note: 'vertical tab mid-right, help in the corner' },
  },
  compare: ['current', 'split-navy', 'split-lime', 'pair', 'quiet', 'edge-tab'],
} satisfies PrototypeDefinition
