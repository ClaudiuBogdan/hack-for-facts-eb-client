import { AlertTriangle } from 'lucide-react'
import { i18n } from '@lingui/core'

import { Card, CardContent, CardHeader } from '@/components/ui/card'

const WHY_DIFFERENT_COPY = {
  en: {
    title: 'Why numbers can differ',
    points: [
      'Internal transfers can be double-counted when money moves between public institutions.',
      'Accounting reclassifications can move values between categories (for example transfers vs EU-funded project lines).',
      'EU/FEN flows can appear in operational financial accounts and be reallocated in official year-end consolidation.',
    ],
  },
  ro: {
    title: 'De ce pot diferi valorile',
    points: [
      'Transferurile interne pot fi dublu contabilizate când banii circulă între instituții publice.',
      'Reclasificările contabile pot muta valori între categorii (de exemplu transferuri vs linii de proiect finanțate din fonduri UE).',
      'Fluxurile UE/FEN pot apărea în conturi operaționale financiare și pot fi realocate în consolidarea oficială de final de an.',
    ],
  },
} as const

export function NationalBudgetWhyDifferentCard() {
  const locale = (i18n.locale ?? 'en').toLowerCase()
  const copy = locale.startsWith('ro') ? WHY_DIFFERENT_COPY.ro : WHY_DIFFERENT_COPY.en

  return (
    <Card className="border-l-4 border-l-primary/30">
      <CardHeader className="pb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-primary" aria-hidden="true" />
          {copy.title}
        </h2>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
          {copy.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
