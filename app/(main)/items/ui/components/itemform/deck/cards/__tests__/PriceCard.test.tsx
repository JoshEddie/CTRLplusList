import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeItem, mockActions } from '../../__tests__/test-helpers';
import { PriceCard } from '../PriceCard';

function setup(over = {}, productUrl = '') {
  render(
    <PriceCard
      item={makeItem(over)}
      actions={mockActions()}
      productUrl={productUrl}
      onContinue={vi.fn()}
    />
  );
}

describe('PriceCard', () => {
  it('EmptyPrice_ShowsRequiredNote-DisablesContinue', () => {
    setup({ store: { name: 'Lodge', link: 'https://l', price: '' } });
    expect(screen.getByText(/A price is required/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('ValidPrice_HidesRequiredNote-EnablesContinue', () => {
    setup({ store: { name: 'Lodge', link: 'https://l', price: '12.00' } });
    expect(screen.queryByText(/A price is required/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('NoProductUrl_FallsBackToStoreLinkForSourceLink', () => {
    setup({ store: { name: 'Lodge', link: 'https://store.test/p', price: '' } }, '');
    expect(
      screen.getByRole('link', { name: /open the product page/i })
    ).toHaveAttribute('href', 'https://store.test/p');
  });

  it('WithProductUrl_UsesItForSourceLink', () => {
    setup(
      { store: { name: 'Lodge', link: 'https://store.test/p', price: '' } },
      'https://pasted.test/p'
    );
    expect(
      screen.getByRole('link', { name: /open the product page/i })
    ).toHaveAttribute('href', 'https://pasted.test/p');
  });

  it('NoProductUrlAndNoStoreLink_RendersNoSourceLink', () => {
    // The door path: no pasted URL, no store link → no dead link affordance.
    setup({ store: { name: '', link: '', price: '' } }, '');
    expect(
      screen.queryByRole('link', { name: /open the product page/i })
    ).not.toBeInTheDocument();
  });

  it('EmptyLinklessStore_HidesRequiredNote-EnablesContinue', () => {
    // Linkless (name+link empty): an empty price is fine, so no required note
    // and Continue is enabled.
    setup({ store: { name: '', link: '', price: '' } }, 'https://pasted.test/p');
    expect(screen.queryByText(/A price is required/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('LinklessStore_SubtitleSaysPriceCanStayBlank', () => {
    setup({ store: { name: '', link: '', price: '' } }, '');
    expect(screen.getByText(/can stay blank/)).toBeInTheDocument();
    expect(screen.queryByText(/no skipping/)).not.toBeInTheDocument();
  });
});
