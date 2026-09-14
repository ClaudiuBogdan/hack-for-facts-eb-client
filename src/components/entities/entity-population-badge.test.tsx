import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EntityPopulationBadge } from './entity-population-badge';
const entity = { is_territorial_executive: true, uat: { population: 259084 }, annualPopulation: { territoryId: 1138, year: 2021, population: 259084, metadata: { sourceYearMin: 2020, sourceYearMax: 2020, maxCarryAge: 1, carriedCount: 1, provisionalCount: 1, sourceUrl: 'https://example.org/ins.pdf' } } };
describe('entity population badge', () => {
  it('shows applied year, original year, carry age and original source', () => {
    render(<EntityPopulationBadge entity={entity} locale="en" />);
    expect(screen.getByText(/259,084 inhabitants/)).toHaveTextContent('2021');
    expect(screen.getByText(/Population from 2020/)).toHaveTextContent('1 year old');
    expect(screen.getByText(/Provisional/)).toBeInTheDocument();
    expect(screen.getByRole('link', {name:'INS source'})).toHaveAttribute('href', entity.annualPopulation.metadata.sourceUrl);
  });
  it.each([false,true])('does not show a borrowed or absent denominator (%s)', (executive) => {
    const {container} = render(<EntityPopulationBadge entity={{...entity,is_territorial_executive:executive,uat:{population:executive ? null : 259084}}} locale="en" />);
    expect(container).toBeEmptyDOMElement();
  });
});
