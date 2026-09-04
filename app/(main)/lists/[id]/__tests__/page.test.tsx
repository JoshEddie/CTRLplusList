import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import ListPage from '../page';

// page.tsx imports auth + the DAL for its (separately tested) generateMetadata;
// mock both so importing the module never reaches the neon-backed `@/db`.
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/data/list', () => ({ getList: vi.fn() }));
vi.mock('@/lib/data/user', () => ({ getUserIdByEmail: vi.fn() }));
vi.mock('@/lib/data/profile', () => ({ getUserIdentity: vi.fn() }));

vi.mock('../ListHeroSection', () => ({
  default: (props: { params: unknown; searchParams: unknown }) => (
    <div
      data-testid="hero-section"
      data-has-params={String(!!props.params)}
      data-has-search-params={String(!!props.searchParams)}
    />
  ),
}));
vi.mock('../ListEditSection', () => ({
  default: (props: { params: unknown; searchParams: unknown }) => (
    <div
      data-testid="edit-section"
      data-has-params={String(!!props.params)}
      data-has-search-params={String(!!props.searchParams)}
    />
  ),
}));
vi.mock('../ListItemsSection', () => ({
  default: (props: { params: unknown; searchParams: unknown }) => (
    <div
      data-testid="items-section"
      data-has-params={String(!!props.params)}
      data-has-search-params={String(!!props.searchParams)}
    />
  ),
}));

type El = { type: unknown; props: Record<string, unknown> };

const PROPS = {
  params: Promise.resolve({ id: 'l1' }),
  searchParams: Promise.resolve({}),
};

describe('ListPage', () => {
  it('Render_MountsEverySectionWithForwardedPromises', () => {
    render(<ListPage {...PROPS} />);
    for (const id of ['hero-section', 'items-section', 'edit-section']) {
      const section = screen.getByTestId(id);
      expect(section).toHaveAttribute('data-has-params', 'true');
      expect(section).toHaveAttribute('data-has-search-params', 'true');
    }
  });

  it('Render_HeroFallbackRail-ItemsFallbackPage-EditFallbackNull', () => {
    const main = ListPage(PROPS) as unknown as El;
    // Inspecting the returned RSC element tree (React elements, not DOM nodes).
    // eslint-disable-next-line testing-library/no-node-access
    const suspenses = (main.props.children as El[]).filter(
      (c) => c.type === Suspense
    );
    expect(suspenses).toHaveLength(3);
    const fallbacks = suspenses.map((s) => s.props.fallback as El | null);
    expect(fallbacks.map((f) => f?.props.size)).toEqual([
      'rail',
      'page',
      undefined,
    ]);
    // The edit section replaces the two above it, so its own boundary shows
    // nothing rather than stacking a third spinner over their fallbacks.
    expect(fallbacks[2]).toBeNull();
    for (const f of fallbacks.slice(0, 2)) {
      expect(f!.type).toBe(LoadingIndicator);
    }
  });
});
