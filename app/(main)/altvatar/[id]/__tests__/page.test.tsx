import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Page, { metadata } from '../page';

// The shell hands `params` down unawaited, so the double is synchronous and
// the promises it received are resolved by the assertions instead.
const received = vi.hoisted(() => ({
  params: null as unknown,
  searchParams: null as unknown,
}));
vi.mock('../AltvatarSpacePage', () => ({
  default: (props: { params: unknown; searchParams: unknown }) => {
    received.params = props.params;
    received.searchParams = props.searchParams;
    return <div data-testid="space" />;
  },
}));

describe('AltvatarSpaceRoute', () => {
  it('UnawaitedParams_ForwardsBothPromisesToTheSpacePage', async () => {
    render(
      <Page
        params={Promise.resolve({ id: 'p1' })}
        searchParams={Promise.resolve({ follow: '1' })}
      />
    );
    expect(screen.getByTestId('space')).toBeInTheDocument();
    await expect(received.params).resolves.toEqual({ id: 'p1' });
    await expect(received.searchParams).resolves.toEqual({ follow: '1' });
  });

  it('Metadata_TitleIsAltvatar', () => {
    expect(metadata.title).toBe('Altvatar');
  });
});
