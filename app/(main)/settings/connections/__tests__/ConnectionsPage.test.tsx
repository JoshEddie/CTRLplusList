/* eslint-disable testing-library/no-node-access --
 * The Compose test inspects the React *element* tree returned by the shell
 * (plain `.props.children` / `.props.fallback` objects, not DOM nodes) to
 * assert the static Suspense composition order and fallback sizes — the RSC
 * element-tree pattern from lists/[id]/__tests__/page.test.tsx.
 */
import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import ConnectionsPage from '../ConnectionsPage';
import FollowingSection from '../FollowingSection';
import FollowersSection from '../FollowersSection';
import BlockedSection from '../BlockedSection';

vi.mock('../FollowingSection', () => ({
  default: () => <div data-testid="following-section" />,
}));
vi.mock('../FollowersSection', () => ({
  default: () => <div data-testid="followers-section" />,
}));
vi.mock('../BlockedSection', () => ({
  default: () => <div data-testid="blocked-section" />,
}));

type El = { type: unknown; props: Record<string, unknown> };

describe('ConnectionsPage', () => {
  it('Render_RendersHeader-ThreeSections-TwoSeparators', () => {
    render(<ConnectionsPage />);
    expect(screen.getByText('Connections')).toBeInTheDocument();
    expect(screen.getByTestId('following-section')).toBeInTheDocument();
    expect(screen.getByTestId('followers-section')).toBeInTheDocument();
    expect(screen.getByTestId('blocked-section')).toBeInTheDocument();
    expect(screen.getAllByRole('separator')).toHaveLength(2);
  });

  it('Compose_SuspendsFollowingFollowersBlocked-LoadingIndicatorRailFallbacks', () => {
    const main = ConnectionsPage() as unknown as El;
    const page = main.props.children as El;
    const children = page.props.children as El[];
    const suspenses = children.filter((c) => c && c.type === Suspense);

    expect(suspenses.map((s) => (s.props.children as El).type)).toEqual([
      FollowingSection,
      FollowersSection,
      BlockedSection,
    ]);
    for (const s of suspenses) {
      const fallback = s.props.fallback as El;
      expect(fallback.type).toBe(LoadingIndicator);
      expect(fallback.props.size).toBe('rail');
    }
  });
});
