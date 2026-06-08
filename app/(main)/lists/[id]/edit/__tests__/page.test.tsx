import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import EditListPage from '../page';

vi.mock('../EditListBody', () => ({
  default: (props: { params: unknown }) => (
    <div data-testid="edit-body" data-has-params={String(!!props.params)} />
  ),
}));

type El = { type: unknown; props: Record<string, unknown> };

const PROPS = { params: Promise.resolve({ id: 'l1' }) };

describe('EditListPage', () => {
  it('Render_MountsEditListBodyWithForwardedParams', () => {
    render(<EditListPage {...PROPS} />);
    expect(screen.getByTestId('edit-body')).toHaveAttribute(
      'data-has-params',
      'true'
    );
  });

  it('Render_SuspenseFallbackIsFormLoadingIndicator', () => {
    const main = EditListPage(PROPS) as unknown as El;
    // Inspecting the returned RSC element tree (React elements, not DOM nodes).
    // eslint-disable-next-line testing-library/no-node-access
    const suspense = main.props.children as El;
    expect(suspense.type).toBe(Suspense);
    const fallback = suspense.props.fallback as El;
    expect(fallback.type).toBe(LoadingIndicator);
    expect(fallback.props.size).toBe('form');
  });
});
