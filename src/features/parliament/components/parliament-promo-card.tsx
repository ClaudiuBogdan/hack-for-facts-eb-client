import { Link } from '@tanstack/react-router'
import { isMockDataEnabled } from '@/lib/scraper-references'
import { cn } from '@/lib/utils'

type Props = {
  readonly className?: string
}

/** Dashboard entry card for the Parlament section */
export function ParliamentPromoCard({ className }: Props) {
  if (!isMockDataEnabled('political-parliament')) {
    return null
  }

  return (
    <Link
      to="/parlament"
      className={cn(
        'group block border-2 border-border bg-background p-6 transition-colors hover:bg-muted/30',
        className,
      )}
    >
      <h3 className="text-lg font-black group-hover:underline">
        Parlamentul României
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Membri, grupuri și voturi legislative.
      </p>
    </Link>
  )
}
