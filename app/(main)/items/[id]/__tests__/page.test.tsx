import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import EditItemPage from '../page';

vi.mock('../ItemFormBody', () => ({
  default: (props: { params: unknown; searchParams: unknown }) => (
    <div
      data-testid="item-form-body"
      data-has-params={String(!!props.params)}
      data-has-search-params={String(!!props.searchParams)}
    />
  ),
}));

type El = { type: unknown; props: Record<string, unknown> };

const PROPS = {
  params: Promise.resolve({ id: 'i1' }),
  searchParams: Promise.resolve({}),
};

describe('EditItemPage', () => {
  it('Render_MountsItemFormBody-ShowsEditItemHeader', () => {
    render(<EditItemPage {...PROPS} />);
    const body = screen.getByTestId('item-form-body');
    expect(body).toHaveAttribute('data-has-params', 'true');
    expect(body).toHaveAttribute('data-has-search-params', 'true');
    expect(screen.getByText('Edit Item')).toBeInTheDocument();
  });

  it('Render_SuspenseFallbackIsFormLoadingIndicator', () => {
    const main = EditItemPage(PROPS) as unknown as El;
    // Inspecting the returned RSC element tree (React elements, not DOM nodes).
    // eslint-disable-next-line testing-library/no-node-access
    const children = main.props.children as El[];
    const suspense = children.find((c) => c.type === Suspense) as El;
    expect(suspense).toBeDefined();
    const fallback = suspense.props.fallback as El;
    expect(fallback.type).toBe(LoadingIndicator);
    expect(fallback.props.size).toBe('form');
  });
});
