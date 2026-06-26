import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TierNote } from '../TierNote';

// warn/error tiers are exercised via TitleEditor and PriceCard/Preview; the
// good tier has no other caller, so cover its icon-lookup branch here.
describe('TierNote', () => {
  it('GoodTier_RendersNoteText', () => {
    render(<TierNote tier="good">All set</TierNote>);
    expect(screen.getByText('All set')).toBeInTheDocument();
  });
});
