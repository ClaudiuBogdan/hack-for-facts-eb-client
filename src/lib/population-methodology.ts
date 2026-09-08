import { i18n } from '@lingui/core';
import { msg } from '@lingui/core/macro';

/** Dataset-level methodology, not a claim about an individual result's inputs. */
export const POPULATION_SOURCE_URL = 'https://bucuresti.insse.ro/wp-content/uploads/2020/07/POPULATIA-DUPA-DOMICILIU-LA-1-IANUARIE_2020.pdf';
export const POPULATION_METHODOLOGY = msg`Population methodology: Bucharest sector figures for 2020 are provisional INS data (January 1 domicile population). Bucharest city uses a separate series. Years without verified data remain unavailable.`;

/** One source reference per exported artifact; no changes to numeric data rows. */
export function populationMethodologyReference(): string {
  return `${i18n._(POPULATION_METHODOLOGY)} ${POPULATION_SOURCE_URL}`;
}
