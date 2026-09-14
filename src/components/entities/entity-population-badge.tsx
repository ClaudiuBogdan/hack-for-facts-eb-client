import { Plural, Trans } from '@lingui/react/macro';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supportsEntityPopulation } from '@/lib/entity-population';
import type { EntityDetailsData } from '@/lib/api/entities';

/** Same selected-year value as per-capita; source age stays visible when carried. */
export function EntityPopulationBadge({ entity, locale }: {
  readonly entity: Pick<EntityDetailsData, 'uat' | 'is_uat' | 'is_territorial_executive' | 'annualPopulation'>;
  readonly locale: 'en' | 'ro';
}) {
  const annual = entity.annualPopulation;
  if (!supportsEntityPopulation(entity)) return null;
  const value = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ro-RO').format(entity.uat.population);
  const metadata = annual?.metadata;
  const sourceYear = metadata?.sourceYearMin === metadata?.sourceYearMax
    ? metadata?.sourceYearMin
    : `${metadata?.sourceYearMin}–${metadata?.sourceYearMax}`;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <Badge variant="outline" className="gap-1.5 px-3 py-1">
        <Users className="h-3.5 w-3.5" aria-hidden="true" />
        <span><Trans>{value} inhabitants</Trans>{annual ? ` · ${annual.year}` : ''}</span>
      </Badge>
      {metadata && (
        <span className="text-xs text-muted-foreground">
          {metadata.carriedCount > 0 && <><Trans>Population from {sourceYear} · up to <Plural value={metadata.maxCarryAge} one="# year old" other="# years old" /></Trans>{' · '}</>}
          {metadata.provisionalCount > 0 && <><Trans>Provisional</Trans>{' · '}</>}
          {metadata.sourceUrl ? (
            <a href={metadata.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground"><Trans>INS source</Trans></a>
          ) : <Trans>INS · sum of local populations</Trans>}
        </span>
      )}
    </div>
  );
}
