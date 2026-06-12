/* eslint-disable testing-library/no-node-access --
 * The Suspense-fallback test inspects the React element tree returned by
 * `Page()` (element `.props.children` / `.props.fallback`), not rendered DOM
 * nodes — asserting the fallback's element type + `size` prop without
 * rendering an async server component. The lint rule cannot tell React-element
 * prop access from DOM-node access here.
 */
import { render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { describe, expect, it, vi } from 'vitest';

import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import Page from '../page';

vi.mock('../HomePage', () => ({
  default: () => <div data-testid="home-stub" />,
}));

describe('Page', () => {
  it('Default_RendersMainContainerWrappingHomePage', () => {
    render(<Page />);
    const main = screen.getByRole('main');
    expect(main).toHaveClass('container');
    expect(main).toContainElement(screen.getByTestId('home-stub'));
  });

  it('Suspense_FallbackIsPageLoadingIndicator', () => {
    const tree = Page() as {
      props: { children: { type: unknown; props: { fallback: { type: unknown; props: { size: string } } } } };
    };
    const suspense = tree.props.children;
    expect(suspense.type).toBe(Suspense);
    expect(suspense.props.fallback.type).toBe(LoadingIndicator);
    expect(suspense.props.fallback.props.size).toBe('page');
  });
});
