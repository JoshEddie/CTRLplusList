import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import IndexPage from '../page';

vi.mock('@/app/(auth)/ui/components/SignInPage', () => ({
  default: () => <div data-testid="sign-in-page" />,
}));

describe('IndexPage', () => {
  it('Default_RendersSignInPage', async () => {
    render(await IndexPage());
    expect(screen.getByTestId('sign-in-page')).toBeInTheDocument();
  });
});
