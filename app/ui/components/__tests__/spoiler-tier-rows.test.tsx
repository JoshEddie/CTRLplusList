import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SpoilerTier } from '@/lib/types';
import {
  LIBRARY_TIER_ROWS,
  SPOILER_TIER_ROWS,
  SpoilerRowIcon,
  tierRowFor,
} from '../spoiler-tier-rows';

describe('tierRowFor', () => {
  it('KnownTier_ReturnsItsRow', () => {
    expect(tierRowFor('claims').label).toBe('Claims shown');
  });

  it('UnknownStoredValue_FallsBackToTheProtectedRow', () => {
    expect(tierRowFor('bogus' as SpoilerTier).value).toBe('surprise');
  });
});

describe('LIBRARY_TIER_ROWS', () => {
  it('Default_OmitsProgress', () => {
    expect(LIBRARY_TIER_ROWS.map((r) => r.value)).toEqual([
      'surprise',
      'claims',
    ]);
  });
});

describe('SpoilerRowIcon', () => {
  it('Default_RendersTintedDotWithGlyph', () => {
    const { container } = render(<SpoilerRowIcon row={SPOILER_TIER_ROWS[0]} />);
    // eslint-disable-next-line testing-library/no-node-access, testing-library/no-container -- aria-hidden dot has no role
    const dot = container.querySelector('.spoiler-dot') as HTMLElement;
    expect(dot).toHaveStyle({ background: 'var(--spoiler-tint-surprise)' });
    // eslint-disable-next-line testing-library/no-node-access -- glyph is an aria-hidden svg
    expect(dot.querySelector('svg')).not.toBeNull();
  });
});
