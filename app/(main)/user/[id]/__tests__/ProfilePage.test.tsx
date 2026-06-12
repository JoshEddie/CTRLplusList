/* eslint-disable testing-library/no-node-access --
 * The Compose test inspects the React *element* tree returned by the shell
 * (plain `.props.children` / `.props.fallback` objects, not DOM nodes) to
 * assert the static Suspense composition and fallback sizes — the RSC
 * element-tree pattern from lists/[id]/__tests__/page.test.tsx.
 */
import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import ProfilePage from '../ProfilePage';

vi.mock('next/navigation', () => ({ usePathname: () => '/lists' }));
vi.mock('next/link', async () => ({
  default: (await import('@/app/ui/components/__tests__/test-helpers'))
    .MockNextLink,
}));

vi.mock('../ProfileHeaderSection', () => ({
  default: (p: { params: unknown; searchParams: unknown }) => (
    <div
      data-testid="profile-header-section"
      data-has-params={String(!!p.params)}
      data-has-search-params={String(!!p.searchParams)}
    />
  ),
}));
vi.mock('../ProfileListsSection', () => ({
  default: (p: { params: unknown; searchParams?: unknown }) => (
    <div
      data-testid="profile-lists-section"
      data-has-params={String(!!p.params)}
      data-has-search-params={String(!!p.searchParams)}
    />
  ),
}));

type El = { type: unknown; props: Record<string, unknown> };

const PROPS = {
  params: Promise.resolve({ id: 'u1' }),
  searchParams: Promise.resolve({}),
};

describe('ProfilePage', () => {
  it('Render_ForwardsParamsSearchParamsToHeader-OnlyParamsToLists-RealNavAndHeader', () => {
    render(<ProfilePage {...PROPS} />);

    const header = screen.getByTestId('profile-header-section');
    expect(header).toHaveAttribute('data-has-params', 'true');
    expect(header).toHaveAttribute('data-has-search-params', 'true');

    const lists = screen.getByTestId('profile-lists-section');
    expect(lists).toHaveAttribute('data-has-params', 'true');
    expect(lists).toHaveAttribute('data-has-search-params', 'false');

    expect(screen.getByText('Lists')).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'List collections' })
    ).toBeInTheDocument();
  });

  it('Compose_HeaderSuspenseRail-ListsSuspensePage', () => {
    const main = ProfilePage(PROPS) as unknown as El;
    const page = main.props.children as El;
    const children = page.props.children as El[];
    const suspenses = children.filter((c) => c && c.type === Suspense);

    expect(suspenses).toHaveLength(2);
    expect(suspenses.map((s) => (s.props.fallback as El).props.size)).toEqual([
      'rail',
      'page',
    ]);
    for (const s of suspenses) {
      expect((s.props.fallback as El).type).toBe(LoadingIndicator);
    }
  });
});
