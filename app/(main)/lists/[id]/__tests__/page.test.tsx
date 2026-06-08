import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import ListPage from '../page';

// page.tsx imports auth + the DAL for its (separately tested) generateMetadata;
// mock both so importing the module never reaches the neon-backed `@/db`.
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/dal', () => ({
  getList: vi.fn(),
  getUserIdByEmail: vi.fn(),
}));

vi.mock('../ListHeroSection', () => ({
  default: (props: { params: unknown; searchParams: unknown }) => (
    <div
      data-testid="hero-section"
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
  it('Render_MountsBothSectionsWithForwardedPromises', () => {
    render(<ListPage {...PROPS} />);
    for (const id of ['hero-section', 'items-section']) {
      const section = screen.getByTestId(id);
      expect(section).toHaveAttribute('data-has-params', 'true');
      expect(section).toHaveAttribute('data-has-search-params', 'true');
    }
  });

  it('Render_HeroFallbackRail-ItemsFallbackPage', () => {
    const main = ListPage(PROPS) as unknown as El;
    // Inspecting the returned RSC element tree (React elements, not DOM nodes).
    // eslint-disable-next-line testing-library/no-node-access
    const suspenses = (main.props.children as El[]).filter(
      (c) => c.type === Suspense
    );
    expect(suspenses).toHaveLength(2);
    const sizes = suspenses.map((s) => (s.props.fallback as El).props.size);
    expect(sizes).toEqual(['rail', 'page']);
    for (const s of suspenses) {
      expect((s.props.fallback as El).type).toBe(LoadingIndicator);
    }
  });
});
