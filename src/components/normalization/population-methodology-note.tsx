import { useLingui } from '@lingui/react';
import { POPULATION_METHODOLOGY, POPULATION_SOURCE_URL } from '@/lib/population-methodology';

export function PopulationMethodologyNote() {
  const { i18n } = useLingui();
  return <p className="my-2 text-xs text-muted-foreground" role="note">
    {i18n._(POPULATION_METHODOLOGY)}{' '}
    <a className="underline" href={POPULATION_SOURCE_URL} target="_blank" rel="noopener noreferrer">INS</a>
  </p>;
}
