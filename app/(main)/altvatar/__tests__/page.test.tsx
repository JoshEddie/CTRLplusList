/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * The route shell's contract is a `<main>` wrapper carrying specific container
 * classes and no role or accessible name, so `container.querySelector` is the
 * only path to assert the wrapper.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Page from '../page';

vi.mock('../ProfilesPage', () => ({
  default: () => <div data-testid="profiles-page" />,
}));

describe('ProfilesPageRoute', () => {
  it('Render_WrapsProfilesPageInProfilesContainerMain', () => {
    const { container } = render(<Page />);
    const main = container.querySelector('main') as HTMLElement;
    expect(main).toHaveClass('container', 'container--profiles');
    expect(main).toContainElement(screen.getByTestId('profiles-page'));
  });
});
