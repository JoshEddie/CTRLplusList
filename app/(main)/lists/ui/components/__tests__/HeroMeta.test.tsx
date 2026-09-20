/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * The meta line is a non-interactive wrapper; its structure (class names,
 * child order) is the observable output, queried by container.querySelector.
 */
import { PROTECTED_TIER } from '@/lib/spoilers';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HeroMeta from '../HeroMeta';

type Props = Parameters<typeof HeroMeta>[0];

const baseProps: Props = {
  tier: PROTECTED_TIER,
  itemCount: 3,
  updatedAt: new Date(),
};

function meta(container: HTMLElement) {
  return container.querySelector('.list-hero-meta') as HTMLElement;
}

describe('HeroMeta', () => {
  describe('Footer', () => {
    it('MultipleItems_ShowsPluralCountAndUpdated', () => {
      const { container } = render(
        <HeroMeta {...baseProps} itemCount={12} updatedAt={new Date()} />
      );
      expect(meta(container).textContent).toMatch(/^12 items · updated /);
    });

    it('SingleItem_ShowsSingularItem', () => {
      const { container } = render(
        <HeroMeta {...baseProps} itemCount={1} updatedAt={new Date()} />
      );
      expect(meta(container).textContent).toMatch(/^1 item · updated /);
    });

    it('ZeroItems_StillRenders', () => {
      const { container } = render(
        <HeroMeta {...baseProps} itemCount={0} updatedAt={new Date()} />
      );
      expect(meta(container).textContent).toMatch(/^0 items · updated /);
    });

    it('NoUpdatedAt_OmitsUpdatedTail', () => {
      const { container } = render(
        <HeroMeta
          {...baseProps}
          itemCount={5}
          updatedAt={null as unknown as Date}
        />
      );
      expect(meta(container).textContent).toBe('5 items');
    });

    describe('TimeAgoBuckets', () => {
      const fixedNow = new Date('2030-06-15T12:00:00Z');

      beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(fixedNow);
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      const cases: [string, number, string][] = [
        ['JustNow', 30, 'just now'],
        ['Minutes', 5 * 60, '5 minutes ago'],
        ['Hours', 2 * 3600, '2 hours ago'],
        ['Days', 2 * 86400, '2 days ago'],
        ['Weeks', 3 * 604800, '3 weeks ago'],
        ['Months', 2 * 2592000, '2 months ago'],
        ['Years', 2 * 31536000, '2 years ago'],
      ];

      it.each(cases)(
        'Bucket%s_ShowsUpdatedAgo',
        (_label, deltaSeconds, expected) => {
          const updatedAt = new Date(fixedNow.getTime() - deltaSeconds * 1000);
          const { container } = render(
            <HeroMeta {...baseProps} itemCount={4} updatedAt={updatedAt} />
          );
          expect(meta(container).textContent).toBe(
            `4 items · updated ${expected}`
          );
        }
      );
    });
  });

  describe('FooterProgress', () => {
    it('SurpriseTier_CarriesItemCountAndTimeAlone-NoProgress', () => {
      const { container } = render(<HeroMeta {...baseProps} />);
      const line = meta(container);

      expect(line).toHaveTextContent('3 items');
      expect(line).not.toHaveTextContent('claimed');
      expect(line.querySelector('.list-hero-progress-track')).toBeNull();
    });

    it('ProgressTier_RendersClaimProgressAgainstTheTotal', () => {
      const { container } = render(
        <HeroMeta
          {...baseProps}
          tier="progress"
          claimedCount={4}
          itemCount={10}
        />
      );
      const line = meta(container);

      expect(line).toHaveTextContent('4 / 10 claimed');
      expect(line).toHaveTextContent(/updated /);
      expect(line).not.toHaveTextContent('10 items');
      expect(line.querySelector('.list-hero-progress-track')).not.toBeNull();
    });

    it('ClaimsTier_StillRendersClaimProgress', () => {
      const { container } = render(
        <HeroMeta
          {...baseProps}
          tier="claims"
          claimedCount={6}
          itemCount={10}
        />
      );
      const line = meta(container);

      expect(line).toHaveTextContent('6 / 10 claimed');
      expect(line).toHaveTextContent(/updated /);
      expect(line).not.toHaveTextContent('10 items');
    });

    it('ProgressTierNoClaimedCount_OmitsProgress', () => {
      const { container } = render(
        <HeroMeta {...baseProps} tier="progress" claimedCount={undefined} />
      );
      const line = meta(container);

      expect(line).toHaveTextContent('3 items');
      expect(line.querySelector('.list-hero-progress-track')).toBeNull();
    });
  });
});
