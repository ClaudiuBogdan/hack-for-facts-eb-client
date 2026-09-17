import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

type Props = {
  readonly to: '/ins' | '/ins/seturi'
  readonly children: ReactNode
}

/**
 * The way back out of an INS page: quiet text, not a bordered button.
 *
 * It is the least important control on the page and a filled or outlined
 * button made it the heaviest thing above the title — the same reason
 * parliament's detail pages carry a plain back link (DESIGN.md §Reference
 * Patterns). One implementation for the three pages that need it, so the
 * module cannot drift into three weights of "back".
 */
export function StatisticsBackLink({ to, children }: Props) {
  return (
    <Link
      to={to}
      // `py-1 -ml-1.5 px-1.5` is the target, not the decoration: a 14px line
      // of text is a 20px-tall hit area, under WCAG 2.2 AA's 24px minimum
      // (2.5.8), and the negative margin keeps the text optically flush.
      className="-ml-1.5 inline-flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
    >
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </Link>
  )
}
