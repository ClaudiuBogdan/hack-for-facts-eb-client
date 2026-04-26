import { describe, expect, it } from 'vitest';
import {
  resolveAdaptiveLabelBudget,
  selectNonOverlappingLabelCandidates,
  selectNonOverlappingLabelCandidatesChunked,
  type LabelCollisionCandidate,
} from './label-collision';

function createCandidate(
  featureId: string,
  overrides: Partial<LabelCollisionCandidate> = {}
): LabelCollisionCandidate {
  return {
    featureId,
    x: 0,
    y: 0,
    width: 40,
    height: 18,
    hasValue: false,
    area: 100,
    valuePriority: 0,
    ...overrides,
  };
}

describe('resolveAdaptiveLabelBudget', () => {
  it('returns low budget below 9.5 zoom', () => {
    expect(resolveAdaptiveLabelBudget(8.5)).toBe(60);
  });

  it('returns mid budget between 9.5 and 11.5 zoom', () => {
    expect(resolveAdaptiveLabelBudget(10.2)).toBe(160);
  });

  it('returns high budget at or above 11.5 zoom', () => {
    expect(resolveAdaptiveLabelBudget(11.5)).toBe(400);
  });
});

describe('selectNonOverlappingLabelCandidates', () => {
  it('prefers candidates with values when overlap occurs', () => {
    const selected = selectNonOverlappingLabelCandidates(
      [
        createCandidate('without-value', { hasValue: false, area: 150 }),
        createCandidate('with-value', { hasValue: true, area: 60 }),
      ],
      10
    );

    expect(selected).toHaveLength(1);
    expect(selected[0]?.featureId).toBe('with-value');
  });

  it('uses feature id for deterministic tie-breaking', () => {
    const selected = selectNonOverlappingLabelCandidates(
      [
        createCandidate('zeta', { hasValue: true, area: 100, valuePriority: 10 }),
        createCandidate('alpha', { hasValue: true, area: 100, valuePriority: 10 }),
      ],
      10
    );

    expect(selected).toHaveLength(1);
    expect(selected[0]?.featureId).toBe('alpha');
  });

  it('prioritizes higher values when overlap occurs', () => {
    const selected = selectNonOverlappingLabelCandidates(
      [
        createCandidate('smaller-value', {
          hasValue: true,
          area: 200,
          valuePriority: 50,
        }),
        createCandidate('higher-value', {
          hasValue: true,
          area: 100,
          valuePriority: 120,
        }),
      ],
      10
    );

    expect(selected).toHaveLength(1);
    expect(selected[0]?.featureId).toBe('higher-value');
  });

  it('enforces zoom-dependent label budget', () => {
    const candidates = Array.from({ length: 500 }, (_, index) =>
      createCandidate(`feature-${index + 1}`, {
        x: index * 120,
        y: 10,
        width: 18,
        hasValue: true,
      })
    );

    const lowZoomSelected = selectNonOverlappingLabelCandidates(candidates, 8.2);
    const midZoomSelected = selectNonOverlappingLabelCandidates(candidates, 10.4);
    const highZoomSelected = selectNonOverlappingLabelCandidates(candidates, 12.1);

    expect(lowZoomSelected).toHaveLength(60);
    expect(midZoomSelected).toHaveLength(160);
    expect(highZoomSelected).toHaveLength(400);
  });

  it('allows abort signals to run between chunks', async () => {
    const candidates = Array.from({ length: 100 }, (_, index) =>
      createCandidate(`feature-${index + 1}`, {
        x: index * 120,
        y: 10,
        width: 18,
        hasValue: true,
      })
    );
    const abortController = new AbortController();

    setTimeout(() => abortController.abort(), 0);

    const selected = await selectNonOverlappingLabelCandidatesChunked(candidates, 10, {
      chunkSize: 1,
      signal: abortController.signal,
    });

    expect(selected.length).toBeLessThan(candidates.length);
  });
});
