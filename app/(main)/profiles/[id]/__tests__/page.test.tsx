/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * The route shell's contract is a `<main>` wrapper carrying specific container
 * classes and no role or accessible name, so `container.querySelector` is the
 * only path to assert the wrapper.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Page from '../page';

// The shell hands `params` down unawaited, so the double is synchronous and
// the promise it received is resolved by the assertion instead.
const received = vi.hoisted(() => ({ params: null as unknown }));
vi.mock('../ProfileSpacePage', () => ({
  default: ({ params }: { params: Promise<{ id: string }> }) => {
    received.params = params;
    return <div data-testid="space" />;
  },
}));

describe('ProfileSpaceRoute', () => {
  it('UnawaitedParams_ForwardsThemIntoProfileSpaceContainerMain', async () => {
    const { container } = render(
      await Page({ params: Promise.resolve({ id: 'p1' }) })
    );
    const main = container.querySelector('main') as HTMLElement;
    expect(main).toHaveClass('container', 'container--profile-space');
    expect(screen.getByTestId('space')).toBeInTheDocument();
    await expect(received.params).resolves.toEqual({ id: 'p1' });
  });
});
