/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * The route shell's contract is a `<main>` wrapper with specific container
 * classes and no role or accessible name; classed `container.querySelector` is
 * the only path to assert the wrapper.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Page, { metadata } from '../page';

vi.mock('../FollowingPage', () => ({
  default: () => <div data-testid="following-page" />,
}));

describe('FollowingPageRoute', () => {
  it('Render_WrapsFollowingPageInListContainerMain', () => {
    const { container } = render(<Page />);
    const main = container.querySelector('main') as HTMLElement;
    expect(main).toHaveClass('container', 'container--list-collections');
    expect(main).toContainElement(screen.getByTestId('following-page'));
  });

  it('Metadata_TitleFollowing', () => {
    expect(metadata.title).toBe('Following');
  });
});
