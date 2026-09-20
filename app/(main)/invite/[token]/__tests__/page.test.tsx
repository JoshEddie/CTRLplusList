import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Page, { metadata } from '../page';

// The shell hands `params` down unawaited, so the double is synchronous and the
// promise it received is resolved by the assertion instead.
const received = vi.hoisted(() => ({ params: null as unknown }));
vi.mock('../InvitePage', () => ({
  default: (props: { params: unknown }) => {
    received.params = props.params;
    return <div data-testid="invite" />;
  },
}));

describe('InviteRoute', () => {
  it('UnawaitedParams_ForwardsThePromiseToTheInvitePage', async () => {
    render(<Page params={Promise.resolve({ token: 'tok-1' })} />);

    expect(screen.getByTestId('invite')).toBeInTheDocument();
    await expect(received.params).resolves.toEqual({ token: 'tok-1' });
  });

  it('Metadata_TitleIsInvite', () => {
    expect(metadata.title).toBe('Invite');
  });
});
