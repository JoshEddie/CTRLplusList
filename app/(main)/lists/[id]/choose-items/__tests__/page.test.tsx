import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import ChooseItemsPage from '../page';

vi.mock('../ChooseItemsBody', () => ({
  default: (props: { params: unknown; searchParams: unknown }) => (
    <div
      data-testid="choose-body"
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

describe('ChooseItemsPage', () => {
  it('Render_MountsChooseItemsBodyWithForwardedPromises', () => {
    render(<ChooseItemsPage {...PROPS} />);
    const body = screen.getByTestId('choose-body');
    expect(body).toHaveAttribute('data-has-params', 'true');
    expect(body).toHaveAttribute('data-has-search-params', 'true');
  });

  it('Render_SuspenseFallbackIsFormLoadingIndicator', () => {
    const main = ChooseItemsPage(PROPS) as unknown as El;
    // Inspecting the returned RSC element tree (React elements, not DOM nodes).
    // eslint-disable-next-line testing-library/no-node-access
    const suspense = main.props.children as El;
    expect(suspense.type).toBe(Suspense);
    const fallback = suspense.props.fallback as El;
    expect(fallback.type).toBe(LoadingIndicator);
    expect(fallback.props.size).toBe('form');
  });
});
