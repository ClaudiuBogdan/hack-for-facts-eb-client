import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { budgetCodeAnatomyData } from '@/features/challenges/content/budget-code-anatomy-data'
import { getUserLocale } from '@/lib/utils'

/**
 * SVG connector lines from compact centered code to spread-out descriptions.
 *
 * Coordinate math (viewBox 0-300 maps to container width):
 *   "65.04.02" = 8 monospace chars, centered. Each group is 2 chars wide.
 *   "65" center = container midpoint - 3 ch  →  ~112 in viewBox
 *   "04" center = container midpoint          →  150
 *   "02" center = container midpoint + 3 ch  →  ~188
 *
 * Descriptions sit in a grid-cols-3 below, so column centers = 50, 150, 250.
 *
 * Left  path: vertical from 112 down to bend, horizontal left  to 50, vertical to bottom.
 * Right path: vertical from 188 down to bend, horizontal right to 250, vertical to bottom.
 * Center:     straight vertical at 150.
 */
function Connectors() {
  return (
    <svg
      viewBox="0 0 300 48"
      preserveAspectRatio="none"
      className="mx-auto h-12 w-full text-muted-foreground/50"
      fill="none"
      aria-hidden="true"
    >
      {/* Left: from "65" center, down then left to col-1 center */}
      <path
        d="M 112 0 V 18 H 50 V 42"
        stroke="currentColor"
        strokeWidth={1.5}
      />
      <polygon points="47,38 50,44 53,38" fill="currentColor" />

      {/* Center: straight down from "04" center */}
      <path d="M 150 0 V 42" stroke="currentColor" strokeWidth={1.5} />
      <polygon points="147,38 150,44 153,38" fill="currentColor" />

      {/* Right: from "02" center, down then right to col-3 center */}
      <path
        d="M 188 0 V 18 H 250 V 42"
        stroke="currentColor"
        strokeWidth={1.5}
      />
      <polygon points="247,38 250,44 253,38" fill="currentColor" />
    </svg>
  )
}

export function BudgetCodeAnatomy() {
  const locale = getUserLocale()
  const data = budgetCodeAnatomyData

  return (
    <Card className="not-prose my-8 border-border/60 bg-muted/[0.12] shadow-none">
      <CardContent className="space-y-6 pt-6">
        {/* Desktop schematic */}
        <div className="hidden sm:block">
          <div className="mx-auto max-w-md">
            {/* Compact code (single line, no JSX whitespace) */}
            <p className="text-center font-mono text-3xl font-black md:text-4xl">{'65'}<span className="text-muted-foreground/30">{'.'}</span>{'04'}<span className="text-muted-foreground/30">{'.'}</span>{'02'}</p>

            {/* L-shaped connectors */}
            <Connectors />

            {/* Descriptions: left / center / right */}
            <div className="grid grid-cols-3 gap-x-3">
              {data.segments.map((segment) => (
                <div
                  key={segment.code}
                  className="flex flex-col items-center gap-0.5"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {segment.level[locale]}
                  </span>
                  <span className="text-center text-sm font-medium leading-tight text-foreground">
                    {segment.label[locale]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile schematic: stacked */}
        <div className="flex flex-col items-center gap-4 sm:hidden">
          <p className="font-mono text-3xl font-black tracking-[0.15em]">
            {data.fullCode}
          </p>

          <div className="flex w-full flex-col gap-2">
            {data.segments.map((segment, index) => (
              <div
                key={segment.code}
                className="flex items-center gap-3"
                style={{ paddingLeft: `${index * 1.25}rem` }}
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {segment.level[locale]}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {segment.label[locale]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Table summary */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">
                {locale === 'en' ? 'Code' : 'Cod'}
              </TableHead>
              <TableHead className="w-28">
                {locale === 'en' ? 'Level' : 'Nivel'}
              </TableHead>
              <TableHead>
                {locale === 'en' ? 'Description' : 'Descriere'}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.segments.map((segment) => (
              <TableRow key={segment.code}>
                <TableCell className="font-mono font-semibold">
                  {segment.code}
                </TableCell>
                <TableCell className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {segment.level[locale]}
                </TableCell>
                <TableCell>
                  {segment.label[locale]}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

      </CardContent>
    </Card>
  )
}
