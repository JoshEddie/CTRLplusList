/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * The pile is decorative (`aria-hidden`), so nothing in it carries a role to
 * query by — the discs and the overflow count are reached through their classes.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PurchaseView } from '@/lib/types';
import Facepile from '../Facepile';
import { makeClaim as claim } from './test-helpers';

function mountPile(claims: PurchaseView[]) {
  const { container } = render(<Facepile claims={claims} />);
  return container.querySelector<HTMLElement>('.claim-facepile')!;
}

const discsIn = (pile: HTMLElement) => pile.querySelectorAll('.altvatar-disc');
const overflowIn = (pile: HTMLElement) =>
  pile.querySelector('.claim-facepile-more')?.textContent;

describe('Facepile', () => {
  it('ThreeClaims_DrawsEveryLookAndNoOverflowCount', () => {
    const pile = mountPile([claim('a'), claim('b'), claim('c')]);
    expect(discsIn(pile)).toHaveLength(3);
    expect(overflowIn(pile)).toBeUndefined();
  });

  it('FiveClaims_DrawsThreeLooksAndCountsTheRest', () => {
    const pile = mountPile(['a', 'b', 'c', 'd', 'e'].map((id) => claim(id)));
    expect(discsIn(pile)).toHaveLength(3);
    expect(overflowIn(pile)).toBe('+2');
  });

  it('OneClaim_DrawsThatOneLookAlone', () => {
    const pile = mountPile([claim('a')]);
    expect(discsIn(pile)).toHaveLength(1);
    expect(overflowIn(pile)).toBeUndefined();
  });

  // Whatever the pile shows, the surface carrying it states in words — so it
  // must never reach the accessible name of the control it rides on.
  it('AnyClaims_PileIsHiddenFromAssistiveTech', () => {
    expect(mountPile([claim('a'), claim('b')])).toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });

  // The pile draws each claim through `claimAvatar`, whose own fallback rule is
  // tested in utils; this pins that the resolved look reaches a disc.
  it('FreeTextPurchaser_DrawsInitialsFromTheTypedName', () => {
    const pile = mountPile([claim('a', { name: 'Grandma Jones' })]);
    expect(pile.querySelector('.altvatar-disc-initials')).toHaveTextContent(
      'GJ'
    );
  });
});
